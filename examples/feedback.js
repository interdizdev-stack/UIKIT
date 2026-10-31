(function () {
  'use strict';
  function icon(name) { return '<i data-lucide="' + name + '"></i>'; }
  function markup(options) {
    const prefix = options?.prefix || 'feedback';
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(prefix)) throw new TypeError('Invalid example prefix');
    const id = name => prefix + '-' + name;
    const kinds = [['success', 'circle-check', 'Изменения сохранены', 'Данные успешно обновлены.'], ['info', 'info', 'Новая версия', 'Доступно обновление проекта.'], ['warning', 'triangle-alert', 'Проверьте данные', 'Есть поля, требующие внимания.'], ['error', 'circle-x', 'Не удалось сохранить', 'Проверьте соединение и повторите попытку.']];
    let html = '<div class="brand-stack" data-feedback-example><section class="brand-surface brand-stack"><h2 class="brand-h2">Уведомления</h2><div class="brand-cluster">';
    for (const kind of kinds) html += '<button class="btn btn-secondary btn-sm" type="button" data-demo-toast="' + kind[0] + '">' + kind[2] + '</button>';
    html += '<button class="btn btn-primary btn-sm" type="button" data-demo-toast="action">Уведомление с действием</button><button class="btn btn-secondary btn-sm" type="button" data-demo-toast="queue">Очередь из 5</button><button class="btn btn-ghost btn-sm" type="button" data-demo-toast="clear">Закрыть все</button></div><p class="brand-field-helper">Очередь показывает до трёх сообщений. Уведомление с действием остаётся до закрытия.</p><p class="brand-small" data-feedback-status id="' + id('status') + '" tabindex="-1" role="status">Здесь появится результат действия.</p><div data-brand-toasts></div></section>' +
      '<section class="brand-stack"><h2 class="brand-h2">Закрываемые сообщения</h2><div class="brand-grid brand-grid--2">';
    for (const kind of kinds) html += '<div class="brand-alert ' + (kind[0] === 'error' ? 'danger' : kind[0]) + '" data-brand-alert data-alert-kind="' + kind[0] + '" data-alert-focus="' + id('status') + '">' + icon(kind[1]) + '<div><strong>' + kind[2] + '</strong><p>' + kind[3] + '</p></div><button class="btn btn-ghost btn-icon" type="button" data-alert-dismiss aria-label="Закрыть сообщение">' + icon('x') + '</button></div>';
    html += '</div><div class="brand-alert brand-banner info" data-brand-alert data-alert-focus="' + id('status') + '">' + icon('info') + '<div><strong>Обновление интерфейса</strong><p>Ознакомьтесь с новыми компонентами в каталоге.</p></div><button class="btn btn-ghost btn-icon" type="button" data-alert-dismiss aria-label="Закрыть баннер">' + icon('x') + '</button></div></section>' +
      '<section class="brand-surface brand-stack"><h2 class="brand-h2">Загрузка</h2><div class="brand-cluster" role="status"><span class="brand-loader" aria-hidden="true"></span><span class="brand-small">Получаем данные…</span></div><div class="brand-progress" role="progressbar" aria-label="Загрузка данных" aria-valuetext="Выполняется"><span aria-hidden="true"></span></div><p class="brand-field-helper">Неопределённый progress используется, когда объём работы неизвестен.</p></section>' +
      '<section class="brand-stack" aria-busy="true"><h2 class="brand-h2">Skeleton</h2><span class="visually-hidden" role="status">Загружаются примеры карточки, списка и таблицы.</span><div class="brand-grid brand-grid--3"><div class="brand-surface brand-stack" aria-hidden="true"><div class="brand-skeleton brand-skeleton--media"></div><div class="brand-skeleton"></div><div class="brand-skeleton brand-skeleton--short"></div></div><div class="brand-surface brand-stack" aria-hidden="true">';
    for (let index = 0; index < 3; index++) html += '<div class="brand-skeleton-row"><div class="brand-skeleton brand-skeleton--avatar"></div><div class="brand-stack"><div class="brand-skeleton"></div><div class="brand-skeleton brand-skeleton--short"></div></div></div>';
    html += '</div><div class="brand-surface brand-skeleton-table" aria-hidden="true">' + Array.from({ length: 12 }, () => '<div class="brand-skeleton"></div>').join('') + '</div></div></section>' +
      '<section class="brand-stack"><h2 class="brand-h2">Пусто, нет результатов и ошибка</h2><div class="brand-grid brand-grid--3"><div class="brand-state" data-brand-state data-state="empty"><span class="brand-state-icon">' + icon('folder') + '</span><h3 class="brand-h3" data-state-title>Пока нет проектов</h3><p data-state-message>Добавьте первый проект, чтобы начать работу.</p></div><div class="brand-state" data-brand-state data-state="no-results" data-demo-retry="reset"><span class="brand-state-icon">' + icon('search') + '</span><h3 class="brand-h3" data-state-title>Ничего не найдено</h3><p data-state-message>Попробуйте другой запрос или сбросьте фильтры.</p><button class="btn btn-secondary btn-sm" type="button" data-state-retry>Сбросить фильтры</button></div><div class="brand-state" data-brand-state data-state="error" data-demo-retry="error"><span class="brand-state-icon">' + icon('cloud-download') + '</span><h3 class="brand-h3" data-state-title>Не удалось загрузить</h3><p data-state-message>Повторите попытку. Данные формы сохраняются.</p><button class="btn btn-primary btn-sm" type="button" data-state-retry>Повторить</button></div></div></section></div>';
    return html;
  }
  function delay(signal) { return new Promise((resolve, reject) => { const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 350); function abort() { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); } signal.addEventListener('abort', abort, { once: true }); }); }
  function setup(host) {
    host.querySelectorAll('[data-demo-retry]').forEach(root => {
      let attempts = 0;
      BrandUI.states.init(root, { onRetry: async ({ signal }) => { await delay(signal); if (root.dataset.demoRetry === 'error' && attempts++ === 0) throw new Error('Demo failure'); return { state: 'ready', title: root.dataset.demoRetry === 'reset' ? 'Фильтры сброшены' : 'Данные получены', message: 'Пример завершён.' }; } });
    });
  }
  window.BrandUIFeedbackExamples = { markup: markup, setup: setup };
  document.querySelectorAll('[data-feedback-host]').forEach(host => { host.innerHTML = markup(); BrandUI.init(host); setup(host); });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-demo-toast]'); if (!button) return;
    const root = button.closest('[data-feedback-example]'), toasts = BrandUI.toasts.get(root.querySelector('[data-brand-toasts]')), status = root.querySelector('[data-feedback-status]');
    const kind = button.dataset.demoToast;
    if (kind === 'clear') { toasts.clear(); return; }
    if (kind === 'queue') { for (let index = 1; index <= 5; index++) toasts.push({ message: 'Сообщение ' + index + ' из 5', duration: 0 }); return; }
    if (kind === 'action') { toasts.push({ variant: 'success', title: 'Изменения сохранены', message: 'Можно отменить последнее изменение.', action: { label: 'Отменить', handler: () => { status.textContent = 'Изменение отменено в примере.'; } } }); return; }
    toasts.push({ variant: kind, title: { success: 'Сохранено', error: 'Ошибка', warning: 'Проверьте данные', info: 'Информация' }[kind], message: 'Пример уведомления.' });
  });
})();
