(function () {
  'use strict';
  function markup() {
    return '<section class="brand-stack" data-table-example><div class="brand-cluster"><button class="btn btn-secondary btn-sm" type="button" data-demo-table-state="loading">Загрузка</button><button class="btn btn-secondary btn-sm" type="button" data-demo-table-state="error">Ошибка / retry</button><button class="btn btn-secondary btn-sm" type="button" data-demo-table-state="ready">Данные</button></div><div class="brand-surface"><div data-example-table></div></div><p data-example-table-status role="status" hidden></p></section>';
  }
  function setup(container) {
    container.querySelectorAll('[data-table-example]').forEach(function (example) {
      const host = example.querySelector('[data-example-table]'); if (BrandUI.table.get(host)) return;
      const rows = Array.from({ length: 12 }, function (_, index) { return { id: index + 1, name: 'Проект ' + (index + 1), status: index % 2 ? 'В работе' : 'Опубликован', owner: index % 2 ? 'Мария Иванова' : 'Алексей Петров' }; });
      const controller = BrandUI.table.init(host, {
        rows: rows, label: 'Проекты',
        columns: [{ key: 'name', label: 'Проект' }, { key: 'status', label: 'Статус' }, { key: 'owner', label: 'Ответственный', format: function (value) {
          const owner = document.createElement('span'); owner.className = 'brand-table-owner';
          const avatar = document.createElement('span'); avatar.className = 'brand-avatar'; avatar.setAttribute('aria-hidden', 'true'); avatar.textContent = value.split(' ').map(function (word) { return word[0]; }).join('');
          owner.append(avatar, document.createTextNode(value)); return owner;
        } }],
        filters: [{ value: 'published', label: 'Опубликован', test: row => row.status === 'Опубликован' }, { value: 'progress', label: 'В работе', test: row => row.status === 'В работе' }],
        bulkActions: [{ id: 'export', label: 'Экспорт выбранных', onAction: function (args) {
          const text = '\uFEFFПроект;Статус;Ответственный\n' + args.rows.map(row => [row.name, row.status, row.owner].map(value => '"' + value.replace(/"/g, '""') + '"').join(';')).join('\n');
          const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })), link = document.createElement('a'); link.href = url; link.download = 'projects.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          return 'Экспортировано строк: ' + args.selected.length;
        } }],
        onRetry: function (args) { return new Promise(function (resolve) { const timer = setTimeout(() => resolve(rows), 350); args.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true }); }); }
      });
      host.addEventListener('brand:table-action', function (event) { const result = example.querySelector('[data-example-table-status]'); result.textContent = 'Выбран: ' + event.detail.row.name; result.hidden = false; });
      example.addEventListener('click', function (event) { const button = event.target.closest('[data-demo-table-state]'); if (button) controller.setState(button.dataset.demoTableState, button.dataset.demoTableState === 'error' ? 'Демонстрационная ошибка. Retry вернёт локальные данные.' : ''); });
    });
  }
  window.BrandUITableExamples = { markup: markup, setup: setup };
  setup(document);
})();
