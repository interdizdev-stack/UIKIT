(function () {
  'use strict';
  const instances = new Map();
  let sequence = 0;
  function init(host, options) {
    if (!(host instanceof HTMLElement)) throw new TypeError('Expected a table container');
    if (instances.has(host)) return instances.get(host);
    const config = Object.assign({ rows: [], columns: [], rowKey: 'id', pageSize: 5, pageSizes: [5, 10, 20], selectable: true, actions: true, filters: [], bulkActions: [], label: 'Таблица данных', layout: 'table', breakpoint: 600, minWidth: 620, stickyHeader: false, pinFirstColumn: false, compactPagination: false }, options);
    function checkRows(value) {
      if (!Array.isArray(value) || value.some(row => !row || row[config.rowKey] == null)) throw new TypeError('Every row needs an ID');
      if (new Set(value.map(row => String(row[config.rowKey]))).size !== value.length) throw new TypeError('Duplicate table row IDs');
    }
    function checkPageSize(value) { if (!Number.isInteger(value) || value < 1) throw new TypeError('pageSize must be a positive integer'); }
    checkRows(config.rows); checkPageSize(config.pageSize);
    if (!Array.isArray(config.columns) || !config.columns.length || config.columns.some(c => !c.key || !c.label) || new Set(config.columns.map(c => c.key)).size !== config.columns.length) throw new TypeError('Unique column keys and labels are required');
    if (!Array.isArray(config.pageSizes)) throw new TypeError('pageSizes must be an array');
    config.pageSizes.forEach(checkPageSize);
    if (!Array.isArray(config.bulkActions) || config.bulkActions.some(a => !a.id || !a.label) || new Set(config.bulkActions.map(a => String(a.id))).size !== config.bulkActions.length) throw new TypeError('Unique bulk action IDs and labels are required');
    function checkLayout(value){if(!['table','list','auto'].includes(value))throw new TypeError('Unknown table layout');}
    function checkColumns(keys){if(!Array.isArray(keys)||!keys.length||new Set(keys).size!==keys.length||keys.some(key=>!config.columns.some(column=>column.key===key)))throw new TypeError('Visible columns must be unique known keys');}
    checkLayout(config.layout);
    if(!Number.isFinite(config.breakpoint)||config.breakpoint<240||!Number.isFinite(config.minWidth)||config.minWidth<0)throw new TypeError('Invalid table dimensions');
    let layout=config.layout,visibleKeys=config.visibleColumns||config.columns.filter(column=>column.hidden!==true).map(column=>column.key),headerDirty=true;
    checkColumns(visibleKeys);visibleKeys=visibleKeys.slice();
    let rows = config.rows.slice(), query = '', filter = '', page = 1, pageSize = config.pageSize;
    let sort = null, ascending = true, destroyed = false, status = 'ready', message = '', request = null, bulkBusy = false;
    const selected = new Set(), original = document.createDocumentFragment();
    original.append(...host.childNodes);
    function node(tag, className, text) { const e = document.createElement(tag); if (className) e.className = className; if (text !== undefined) e.textContent = text; return e; }
    const root = node('section', 'brand-table'), prefix = 'brand-table-' + (++sequence);
    root.innerHTML = '<div class="brand-table-toolbar"><label class="visually-hidden" for="' + prefix + '-search">Поиск по таблице</label><input class="form-control" type="search" id="' + prefix + '-search" placeholder="Поиск" data-table-search><label class="visually-hidden" for="' + prefix + '-filter">Фильтр таблицы</label><select class="form-select" id="' + prefix + '-filter" data-table-filter><option value="">Все строки</option></select></div><div class="brand-table-bulk" hidden><span data-table-selected></span><div class="brand-cluster" data-table-bulk-actions></div><button class="btn btn-ghost btn-sm" type="button" data-table-select-filtered>Выбрать все найденные</button><button class="btn btn-ghost btn-sm" type="button" data-table-clear>Снять выбор</button><p data-table-bulk-result role="status" hidden></p></div><div class="brand-state brand-table-state" hidden><span class="brand-loader" aria-hidden="true"></span><h3 class="brand-h3" data-table-state-title tabindex="-1"></h3><p data-table-state-message role="status"></p><button class="btn btn-secondary" type="button" data-table-retry>Повторить</button></div><div class="table-responsive brand-table-scroll" tabindex="0" role="region"><table class="table table-hover"><caption class="visually-hidden"></caption><thead><tr></tr></thead><tbody></tbody></table></div><div class="brand-table-footer"><span data-table-count role="status"></span><label class="brand-table-page-size">Строк на странице<select class="form-select" data-table-page-size></select></label><nav aria-label="Страницы таблицы"><ul class="pagination"></ul></nav></div>';
    const search = root.querySelector('[data-table-search]'), filterControl = root.querySelector('[data-table-filter]'), sizeControl = root.querySelector('[data-table-page-size]');
    const header = root.querySelector('thead tr'), body = root.querySelector('tbody'), pager = root.querySelector('.pagination');
    const bulk = root.querySelector('.brand-table-bulk'), bulkResult = root.querySelector('[data-table-bulk-result]'), panel = root.querySelector('.brand-table-state'), retry = root.querySelector('[data-table-retry]');
    const records=node('ul','brand-record-list');records.setAttribute('aria-label',config.label);root.querySelector('.brand-table-scroll').after(records);
    const sortLabel=node('label','visually-hidden','Сортировка записей'),sortControl=node('select','form-select');sortControl.id=prefix+'-sort';sortControl.dataset.tableSortSelect='';sortLabel.htmlFor=sortControl.id;root.querySelector('.brand-table-toolbar').append(sortLabel,sortControl);
    const listSelect=node('label','brand-table-list-select'),listAll=node('input','form-check-input');listAll.type='checkbox';listAll.dataset.tableAllList='';listAll.dataset.tableFocus='all';listSelect.append(listAll,document.createTextNode('Выбрать на странице'));root.querySelector('.brand-table-toolbar').append(listSelect);
    root.classList.toggle('brand-table--sticky',Boolean(config.stickyHeader));root.classList.toggle('brand-table--pinned',Boolean(config.pinFirstColumn));root.classList.toggle('brand-table--selectable',Boolean(config.selectable));root.style.setProperty('--brand-table-min-width',config.minWidth+'px');
    config.filters.forEach(item => { const option = node('option', '', item.label); option.value = item.value; filterControl.append(option); });
    filterControl.hidden = !config.filters.length;
    sizeControl.parentElement.hidden = !config.pageSizes.length;
    root.querySelector('caption').textContent = config.label;
    root.querySelector('.brand-table-scroll').setAttribute('aria-label', config.label + ': горизонтальная прокрутка');
    config.bulkActions.forEach(action => { const button = node('button', 'btn btn-secondary btn-sm', action.label); button.type = 'button'; button.dataset.tableBulk = action.id; bulk.querySelector('[data-table-bulk-actions]').append(button); });
    let selectAll;
    function columns(){return config.columns.filter(column=>visibleKeys.includes(column.key));}
    function narrow(){return host.clientWidth>0&&host.clientWidth<config.breakpoint;}
    function view(){return layout==='auto'?(narrow()?'list':'table'):layout;}
    function renderHeader(){
    header.replaceChildren();sortControl.replaceChildren(new Option('По умолчанию',''));
    if (config.selectable) {
      const th = node('th'); th.scope = 'col'; selectAll = node('input', 'form-check-input'); selectAll.type = 'checkbox'; selectAll.dataset.tableAll = '';selectAll.dataset.tableFocus='all'; selectAll.setAttribute('aria-label', 'Выбрать строки на этой странице'); const target=node('label','brand-table-select');target.append(selectAll);th.append(target); header.append(th);
    }
    columns().forEach((column) => {
      const index=config.columns.indexOf(column);
      const th = node('th'); th.scope = 'col';
      if (column.sortable !== false) { const button = node('button', 'btn btn-ghost btn-sm brand-table-sort-button', column.label); button.type = 'button'; button.dataset.tableSort = index;button.dataset.tableFocus='sort:'+column.key; const marker = node('span', 'brand-table-sort', '↕'); marker.setAttribute('aria-hidden', 'true'); button.append(marker); th.append(button);sortControl.append(new Option(column.label+': по возрастанию',index+':asc'),new Option(column.label+': по убыванию',index+':desc')); }
      else th.textContent = column.label;
      header.append(th);
    });
    if (config.actions) { const th = node('th'); th.scope = 'col'; th.append(node('span', 'visually-hidden', 'Действия')); header.append(th); }
    headerDirty=false;
    }
    host.append(root);
    function id(row) { return String(row[config.rowKey]); }
    function filtered() {
      const needle = query.trim().toLocaleLowerCase(), rule = config.filters.find(item => String(item.value) === filter);
      const result = rows.filter(row => (!needle || config.columns.some(c => String(row[c.key] ?? '').toLocaleLowerCase().includes(needle))) && (!rule || rule.test(row)));
      if (sort !== null) {
        const column = config.columns[sort];
        result.sort((a, b) => { const first = a[column.key], second = b[column.key]; return (typeof first === 'number' && typeof second === 'number' ? first - second : String(first ?? '').localeCompare(String(second ?? ''), undefined, { numeric: true })) * (ascending ? 1 : -1); });
      }
      return result;
    }
    function state() { return { query, filter, page, pageSize, sort: sort === null ? null : config.columns[sort].key, ascending, selected: Array.from(selected), total: filtered().length, status, message, bulkBusy, layout, view:view(), visibleColumns:visibleKeys.slice() }; }
    function emit(name, detail, cancelable) { return host.dispatchEvent(new CustomEvent('brand:table-' + name, { bubbles: true, cancelable: Boolean(cancelable), detail: Object.assign({ controller }, detail) })); }
    function cancelRequest() { if (request) request.abort(); request = null; bulkBusy = false; }
    function render() {
      if (destroyed) return;
      const active = document.activeElement, focusKey = root.contains(active) ? active.getAttribute('data-table-focus') : null;
      if(headerDirty)renderHeader();
      const listMode=view()==='list',shown=columns();root.dataset.tableLayout=listMode?'list':'table';sortControl.hidden=sortLabel.hidden=!listMode;listSelect.hidden=!listMode||!config.selectable;
      lastView=listMode?'list':'table';lastNarrow=narrow();
      sortControl.value=sort===null?'':sort+':'+(ascending?'asc':'desc');
      const result = filtered(), pages = Math.max(1, Math.ceil(result.length / pageSize)); page = Math.min(page, pages);
      const visible = result.slice((page - 1) * pageSize, page * pageSize), blocked = bulkBusy || status !== 'ready';
      body.replaceChildren();records.replaceChildren();
      visible.forEach(row => {
        if(listMode){
          const item=node('li','brand-record'),main=node('div','brand-record-main');
          if(config.selectable){const label=node('label','brand-record-select'),box=node('input','form-check-input');box.type='checkbox';box.dataset.tableRow=id(row);box.dataset.tableFocus='row:'+id(row);box.checked=selected.has(id(row));box.setAttribute('aria-label','Выбрать '+String(row[shown[0].key]));label.append(box);item.append(label);}
          const title=node('strong','brand-record-title'),details=node('dl','brand-data-list');
          shown.forEach((column,index)=>{const value=typeof column.format==='function'?column.format(row[column.key],row):row[column.key],target=index===0?title:node('dd');if(value instanceof Node)target.append(value);else target.textContent=value==null?'':String(value);if(index){const pair=node('div');pair.append(node('dt','',column.label),target);details.append(pair);}});
          main.append(title,details);
          if(config.actions){const button=node('button','btn btn-secondary btn-sm','Открыть');button.type='button';button.dataset.tableAction=id(row);button.dataset.tableFocus='action:'+id(row);button.setAttribute('aria-label','Открыть '+String(row[shown[0].key]));main.append(button);}
          item.append(main);records.append(item);return;
        }
        const tr = node('tr');
        if (config.selectable) { const td = node('td'), box = node('input', 'form-check-input'); box.type = 'checkbox'; box.dataset.tableRow = id(row); box.dataset.tableFocus = 'row:' + id(row); box.checked = selected.has(id(row)); box.setAttribute('aria-label', 'Выбрать строку ' + String(row[config.columns[0].key])); const target=node('label','brand-table-select');target.append(box);td.append(target); tr.append(td); }
        shown.forEach(column => { const td = node('td'), value = typeof column.format === 'function' ? column.format(row[column.key], row) : row[column.key]; if (value instanceof Node) td.append(value); else td.textContent = value == null ? '' : String(value); tr.append(td); });
        if (config.actions) { const td = node('td'), button = node('button', 'btn btn-secondary btn-sm', 'Открыть'); button.type = 'button'; button.dataset.tableAction = id(row); button.dataset.tableFocus = 'action:' + id(row); button.setAttribute('aria-label', 'Открыть ' + String(row[config.columns[0].key])); td.append(button); tr.append(td); }
        body.append(tr);
      });
      if (!visible.length) { const text=rows.length?'Строки не найдены':'Данных пока нет';if(listMode)records.append(node('li','brand-table-empty',text));else{const tr=node('tr'),td=node('td','brand-table-empty',text);td.colSpan=shown.length+Number(config.selectable)+Number(config.actions);tr.append(td);body.append(tr);} }
      header.querySelectorAll('[data-table-sort]').forEach(button => { const current = Number(button.dataset.tableSort) === sort; if (current) button.parentElement.setAttribute('aria-sort', ascending ? 'ascending' : 'descending'); else button.parentElement.removeAttribute('aria-sort'); button.querySelector('.brand-table-sort').textContent = current ? (ascending ? '↑' : '↓') : '↕'; });
      root.querySelector('[data-table-count]').textContent = 'Всего: ' + result.length + (selected.size ? '. Выбрано: ' + selected.size : '');
      bulk.hidden = !config.selectable || !selected.size || status !== 'ready';
      bulk.querySelector('[data-table-selected]').textContent = 'Выбрано строк: ' + selected.size;
      const sizes = [...new Set(config.pageSizes.concat(pageSize))].sort((a, b) => a - b);
      if (Array.from(sizeControl.options).map(o => Number(o.value)).join() !== sizes.join()) { sizeControl.replaceChildren(...sizes.map(value => { const option = node('option', '', value); option.value = value; return option; })); }
      sizeControl.value = pageSize;
      pager.replaceChildren();
      function pageButton(number, label, disabled, current) { const li = node('li', 'page-item' + (current ? ' active' : '')), button = node('button', 'page-link', label); button.type = 'button'; button.dataset.tablePage = number; button.dataset.tableFocus = 'page:' + label; button.disabled = disabled || blocked; if (current) button.setAttribute('aria-current', 'page'); li.append(button); pager.append(li); }
      pageButton(page - 1, 'Назад', page === 1, false);
      if(config.compactPagination&&narrow()){const item=node('li','brand-page-counter',page+' из '+pages);item.setAttribute('aria-current','page');pager.append(item);}else{
      const from = Math.max(1, Math.min(page - 3, pages - 6));
      for (let number = from; number <= Math.min(pages, from + 6); number++) pageButton(number, String(number), false, number === page);
      }
      pageButton(page + 1, 'Далее', page === pages, false);
      root.querySelectorAll('.brand-table-toolbar input,.brand-table-toolbar select,thead button,tbody input,tbody button,.brand-record-list input,.brand-record-list button,.brand-table-bulk button,[data-table-page-size]').forEach(control => { control.disabled = blocked; });
      for(const box of [selectAll,listAll].filter(Boolean)){box.checked=Boolean(visible.length&&visible.every(row=>selected.has(id(row))));box.indeterminate=!box.checked&&visible.some(row=>selected.has(id(row)));box.disabled=blocked||!visible.length;}
      root.setAttribute('aria-busy', String(status === 'loading' || bulkBusy));
      panel.hidden = status === 'ready';
      root.querySelector('.brand-table-scroll').hidden=status!=='ready'||listMode;records.hidden=status!=='ready'||!listMode;root.querySelector('.brand-table-footer').hidden=status!=='ready';
      panel.querySelector('.brand-loader').hidden = status !== 'loading';
      panel.querySelector('[data-table-state-title]').textContent = status === 'loading' ? 'Загрузка данных' : 'Не удалось загрузить данные';
      const stateMessage = panel.querySelector('[data-table-state-message]'); stateMessage.textContent = message; stateMessage.setAttribute('role', status === 'error' ? 'alert' : 'status'); retry.hidden = status !== 'error'; retry.disabled = status === 'loading';
      if (focusKey && !blocked) { const replacement = Array.from(root.querySelectorAll('[data-table-focus]')).find(e => e.dataset.tableFocus === focusKey&&!e.closest('[hidden]')); (replacement || pager.querySelector('button[aria-current]') || search)?.focus({ preventScroll: true }); }
      BrandUI.init(root);if(!blocked&&root.contains(document.activeElement)&&!document.activeElement.getClientRects().length)search.focus({preventScroll:true}); emit('change', state());
    }
    function selection() { render(); emit('selection', { selected: Array.from(selected) }); }
    function select(ids, options) { if (destroyed) return; if (!Array.isArray(ids)) throw new TypeError('Selection must be an array of IDs'); if (options?.replace) selected.clear(); const valid = new Set(rows.map(id)); ids.forEach(key => { key = String(key); if (valid.has(key)) selected.add(key); }); selection(); }
    function clearSelection() { if (destroyed) return; const focused = bulk.contains(document.activeElement); selected.clear(); selection(); if (focused) search.focus({ preventScroll: true }); }
    async function run(action, button) {
      if (destroyed || request || (action && !selected.size)) return;
      const abort = new AbortController(), focused = document.activeElement === button;
      const args = { selected: Array.from(selected), rows: rows.filter(row => selected.has(id(row))), signal: abort.signal, action: action?.id };
      if (!emit(action ? 'bulk' : 'retry', args, true)) { abort.abort(); return; }
      const callback = action ? action.onAction : config.onRetry;
      if (typeof callback !== 'function') { abort.abort(); return; }
      request = abort;
      if (action) { bulkBusy = true; bulkResult.hidden = false; bulkResult.setAttribute('role', 'status'); bulkResult.textContent = 'Выполняется действие…'; }
      else { status = 'loading'; message = ''; }
      render();
      try {
        const value = await callback(args);
        if (destroyed || abort.signal.aborted || request !== abort) return;
        request = null; bulkBusy = false;
        if (action) { bulkResult.setAttribute('role', 'status'); bulkResult.textContent = typeof value === 'string' ? value : 'Действие выполнено'; }
        else { if (Array.isArray(value)) { checkRows(value); rows = value.slice(); const valid = new Set(rows.map(id)); selected.forEach(key => { if (!valid.has(key)) selected.delete(key); }); } status = 'ready'; message = ''; }
      } catch (error) {
        if (destroyed || abort.signal.aborted || (request && request !== abort)) return;
        request = null; bulkBusy = false;
        if (action) { bulkResult.setAttribute('role', 'alert'); bulkResult.textContent = 'Действие не выполнено. Повторите попытку.'; }
        else { status = 'error'; message = 'Повторите попытку или проверьте соединение.'; }
      }
      render();
      if (focused && (document.activeElement === document.body || root.contains(document.activeElement))) (action ? button : status === 'error' ? retry : search).focus({ preventScroll: true });
    }
    function click(event) {
      const button = event.target.closest('button'); if (!button || !root.contains(button) || button.disabled) return;
      if (button.hasAttribute('data-table-retry')) { run(null, button); return; }
      if (status !== 'ready' || bulkBusy) return;
      if (button.hasAttribute('data-table-sort')) { const next = Number(button.dataset.tableSort); ascending = sort === next ? !ascending : true; sort = next; render(); }
      if (button.hasAttribute('data-table-page')) { page = Number(button.dataset.tablePage); render(); }
      if (button.hasAttribute('data-table-action')) { const row = rows.find(item => id(item) === button.dataset.tableAction); if (row) emit('action', { id: id(row), row }); }
      if (button.hasAttribute('data-table-bulk')) run(config.bulkActions.find(a => String(a.id) === button.dataset.tableBulk), button);
      if (button.hasAttribute('data-table-clear')) clearSelection();
      if (button.hasAttribute('data-table-select-filtered')) select(filtered().map(id));
    }
    function input(event) { if (event.target === search && status === 'ready' && !bulkBusy) { query = search.value; page = 1; render(); } }
    function change(event) {
      const field = event.target; if (status !== 'ready' || bulkBusy) return;
      if (field === filterControl) { filter = field.value; page = 1; render(); }
      if (field === sizeControl) { pageSize = Number(field.value); page = 1; render(); }
      if(field===sortControl){const [index,direction]=field.value.split(':');sort=field.value?Number(index):null;ascending=direction!=='desc';render();}
      if (field.hasAttribute('data-table-row') || field === selectAll || field===listAll) { const ids = field === selectAll||field===listAll ? filtered().slice((page - 1) * pageSize, page * pageSize).map(id) : [field.dataset.tableRow]; ids.forEach(key => { if (field.checked) selected.add(key); else selected.delete(key); }); selection(); }
    }
    function update(patch) {
      if (destroyed) return;
      if (Array.isArray(patch)) patch = { rows: patch };
      if (!patch || typeof patch !== 'object') throw new TypeError('Expected table update');
      if (patch.rows !== undefined) checkRows(patch.rows);
      if (patch.pageSize !== undefined) checkPageSize(patch.pageSize);
      if(patch.layout!==undefined)checkLayout(patch.layout);
      if(patch.visibleColumns!==undefined)checkColumns(patch.visibleColumns);
      const before = Array.from(selected).join();
      cancelRequest();
      if(patch.layout!==undefined)layout=patch.layout;
      if(patch.visibleColumns!==undefined){visibleKeys=patch.visibleColumns.slice();headerDirty=true;if(sort!==null&&!visibleKeys.includes(config.columns[sort].key))sort=null;}
      if (patch.rows !== undefined) { rows = patch.rows.slice(); const ids = new Set(rows.map(id)); selected.forEach(key => { if (!ids.has(key)) selected.delete(key); }); }
      if (patch.pageSize !== undefined) { pageSize = patch.pageSize; page = 1; }
      if (patch.query !== undefined) { query = String(patch.query); search.value = query; page = 1; }
      if (patch.filter !== undefined) { filter = String(patch.filter); filterControl.value = filter; page = 1; }
      if (patch.page !== undefined) page = Math.max(1, Math.floor(Number(patch.page) || 1));
      render(); if (before !== Array.from(selected).join()) emit('selection', { selected: Array.from(selected) });
    }
    function setState(value, text) { if (!['ready', 'loading', 'error'].includes(value)) throw new TypeError('Unknown table state'); if (destroyed) return; cancelRequest(); status = value; message = text == null ? '' : String(text); const focused = root.contains(document.activeElement); render(); if (focused && value !== 'ready') panel.querySelector('[data-table-state-title]').focus({ preventScroll: true }); }
    function destroy() { if (destroyed) return; destroyed = true; resizeObserver?.disconnect();window.removeEventListener('resize',resize);cancelRequest(); instances.delete(host); root.removeEventListener('click', click); root.removeEventListener('input', input); root.removeEventListener('change', change); return BrandUI.destroy(root).then(() => { root.remove(); host.append(original); }); }
    let lastView,lastNarrow;function resize(){if(destroyed)return;const next=view(),small=narrow();if(next!==lastView||(config.compactPagination&&small!==lastNarrow)){lastView=next;lastNarrow=small;render();}}
    const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
    function setLayout(value){if(destroyed)return;checkLayout(value);layout=value;render();}
    function setColumns(keys){if(destroyed)return;checkColumns(keys);visibleKeys=keys.slice();headerDirty=true;if(sort!==null&&!visibleKeys.includes(config.columns[sort].key))sort=null;render();}
    const controller = { update, destroy, getState: state, select, clearSelection, setState, setLayout, setColumns };
    instances.set(host, controller); root.addEventListener('click', click); root.addEventListener('input', input); root.addEventListener('change', change);
    render();lastView=view();lastNarrow=narrow();if(resizeObserver)resizeObserver.observe(host);else window.addEventListener('resize',resize);return controller;
  }
  function destroyAll(container) { return Promise.all(Array.from(instances, entry => { if (container === document || container === entry[0] || container.contains(entry[0]) || !entry[0].isConnected) return entry[1].destroy(); })); }
  BrandUI.table = { init, get: host => instances.get(host) };
  BrandUI.registerModule('table', { init: function () {}, destroy: destroyAll });
})();
