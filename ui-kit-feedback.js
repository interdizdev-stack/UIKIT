(function () {
  'use strict';
  const toastHosts = new Map(), alerts = new Map(), states = new Map();
  let defaultHost = null, sequence = 0;
  function attr(element, name, value) { if (value === null) element.removeAttribute(name); else element.setAttribute(name, value); }
  function emit(root, name, detail, cancelable) { return root.dispatchEvent(new CustomEvent('brand:' + name, { bubbles: true, cancelable: Boolean(cancelable), detail: detail })); }
  function elements(root, selector) { const list = Array.from(root.querySelectorAll(selector)); if (root instanceof Element && root.matches(selector)) list.unshift(root); return list; }
  function returnFocus(element, fallback) { if (element?.isConnected && element.getClientRects().length && !element.matches(':disabled')) element.focus({ preventScroll: true }); else if (fallback?.isConnected) fallback.focus({ preventScroll: true }); }

  function initToasts(host, options) {
    let owned = false;
    if (!host) { if (defaultHost && toastHosts.has(defaultHost)) return toastHosts.get(defaultHost); host = document.createElement('div'); host.dataset.brandToasts = ''; document.body.append(host); defaultHost = host; owned = true; }
    if (toastHosts.has(host)) return toastHosts.get(host);
    const config = Object.assign({ maxVisible: 3, duration: 5000 }, options);
    if (!Number.isInteger(config.maxVisible) || config.maxVisible < 1 || !Number.isFinite(config.duration) || config.duration < 0) { if (owned) { host.remove(); defaultHost = null; } throw new TypeError('Invalid toast configuration'); }
    const original = { className: host.classList.contains('brand-toasts'), role: host.getAttribute('role'), label: host.getAttribute('aria-label') };
    host.classList.add('brand-toasts'); host.setAttribute('role', 'region'); if (!original.label) host.setAttribute('aria-label', 'Уведомления');
    const originalReserved=host.style.getPropertyValue('--brand-toast-bottom-reserved');
    const layoutObserver=typeof ResizeObserver==='function'?new ResizeObserver(updateLayout):null;
    const observedBottom=new Set();
    function updateLayout(){
      if(destroyed)return;
      for(const element of observedBottom)if(!element.isConnected){layoutObserver?.unobserve(element);observedBottom.delete(element);}
      let reserved=Math.max(0,innerHeight-((window.visualViewport?.offsetTop||0)+(window.visualViewport?.height||innerHeight)));
      document.querySelectorAll('.brand-cookie--bar,.brand-cookie--corner,[data-ui-fixed-bottom]').forEach(element=>{
        if(!observedBottom.has(element)){observedBottom.add(element);layoutObserver?.observe(element);}
        const rect=element.getBoundingClientRect(),position=getComputedStyle(element).position;
        if(rect.height>0&&rect.width>0&&(position==='fixed'||position==='sticky'&&Math.abs(rect.bottom-innerHeight)<2)&&rect.bottom<=innerHeight+1)reserved=Math.max(reserved,innerHeight-rect.top);
      });
      const value=reserved+'px';if(host.style.getPropertyValue('--brand-toast-bottom-reserved')!==value)host.style.setProperty('--brand-toast-bottom-reserved',value);
    }
    window.addEventListener('resize',updateLayout);window.visualViewport?.addEventListener('resize',updateLayout);window.visualViewport?.addEventListener('scroll',updateLayout);
    const records = new Map(), queue = [], visible = new Set(); let destroyed = false, clearing = false;
    updateLayout();
    function pause(record, reason, paused) {
      if (paused) record.paused.add(reason); else record.paused.delete(reason);
      if (record.timer) { clearTimeout(record.timer); record.timer = null; record.remaining = Math.max(0, record.remaining - (performance.now() - record.started)); }
      if (record.remaining > 0 && !record.paused.size && visible.has(record) && !destroyed) { record.started = performance.now(); record.timer = setTimeout(() => close(record, 'timeout'), record.remaining); }
    }
    function render(record) {
      const node = document.createElement('div'); node.className = 'brand-toast brand-alert ' + ({ error: 'danger' }[record.variant] || record.variant); node.setAttribute('role', ['error', 'warning'].includes(record.variant) ? 'alert' : 'status'); node.setAttribute('aria-atomic', 'true');
      const body = document.createElement('div'); body.className = 'brand-toast-content';
      if (record.title) { const title = document.createElement('strong'); title.textContent = record.title; body.append(title); }
      const text = document.createElement('p'); text.textContent = record.message; body.append(text);
      if (record.action) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary btn-sm'; button.textContent = record.action.label;
        button.addEventListener('click', async () => {
          if (record.request || destroyed) return;
          const request = new AbortController(); record.request = request;
          if (!emit(host, 'toast-action', { id: record.id, signal: request.signal, controller: controller }, true)) { request.abort(); record.request = null; return; }
          pause(record, 'action', true); button.disabled = true; node.setAttribute('aria-busy', 'true');
          try {
            if (typeof record.action.handler === 'function') await record.action.handler({ signal: request.signal, close: () => close(record, 'action'), controller: controller });
            if (!destroyed && !request.signal.aborted && records.has(record.id)) close(record, 'action');
          } catch {
            if (!destroyed && !request.signal.aborted && records.has(record.id)) { text.textContent = record.action.errorMessage || 'Действие не выполнено. Повторите попытку.'; node.classList.remove(record.variant); node.classList.add('danger'); node.setAttribute('role', 'alert'); button.disabled = false; node.removeAttribute('aria-busy'); record.request = null; }
          }
        }); body.append(button);
      }
      const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.className = 'btn btn-ghost btn-icon'; dismiss.textContent = '×'; dismiss.setAttribute('aria-label', 'Закрыть уведомление'); dismiss.addEventListener('click', () => close(record, 'dismiss'));
      node.append(body, dismiss); record.node = node;
      node.addEventListener('pointerenter', () => pause(record, 'pointer', true)); node.addEventListener('pointerleave', () => pause(record, 'pointer', false));
      node.addEventListener('focusin', () => pause(record, 'focus', true)); node.addEventListener('focusout', () => queueMicrotask(() => { if (!node.contains(document.activeElement)) pause(record, 'focus', false); }));
      host.append(node); pause(record, 'hidden', document.hidden); emit(host, 'toast-show', { id: record.id, controller: controller });
    }
    function drain() { if (destroyed || clearing) return; while (queue.length && visible.size < config.maxVisible) { const record = queue.shift(); visible.add(record); render(record); } }
    function close(record, reason) {
      if (!record || !records.has(record.id)) return false;
      const focused = record.node?.contains(document.activeElement); record.request?.abort(); clearTimeout(record.timer); record.timer = null;
      records.delete(record.id); visible.delete(record); const index = queue.indexOf(record); if (index >= 0) queue.splice(index, 1); record.node?.remove(); record.node = null;
      emit(host, 'toast-close', { id: record.id, reason: reason || 'api', controller: controller }); drain();
      if (focused) returnFocus(host.querySelector('button:not(:disabled)'), record.opener);
      return true;
    }
    function push(options) {
      if (destroyed) return null;
      updateLayout();
      const item = Object.assign({ variant: 'info', title: '' }, options);
      if (!['success', 'error', 'warning', 'info'].includes(item.variant) || item.message === undefined || (item.action && !item.action.label)) throw new TypeError('Invalid toast content');
      const duration = item.duration ?? (item.action ? 0 : config.duration);
      if (!Number.isFinite(duration) || duration < 0) throw new TypeError('Invalid toast duration');
      const record = { id: ++sequence, variant: item.variant, title: String(item.title), message: String(item.message), action: item.action, remaining: duration, paused: new Set(), opener: document.activeElement, request: null, timer: null };
      records.set(record.id, record); queue.push(record); drain();
      return { id: record.id, close: () => close(record, 'api'), getElement: () => record.node || null };
    }
    function clear(reason) { clearing = true; Array.from(records.values()).forEach(record => close(record, reason || 'clear')); clearing = false; drain(); }
    function visibility() { visible.forEach(record => pause(record, 'hidden', document.hidden)); }
    function destroy() { if (destroyed) return; destroyed = true;layoutObserver?.disconnect();observedBottom.clear();window.removeEventListener('resize',updateLayout);window.visualViewport?.removeEventListener('resize',updateLayout);window.visualViewport?.removeEventListener('scroll',updateLayout);if(originalReserved)host.style.setProperty('--brand-toast-bottom-reserved',originalReserved);else host.style.removeProperty('--brand-toast-bottom-reserved'); clear('destroy'); document.removeEventListener('visibilitychange', visibility); toastHosts.delete(host); if (defaultHost === host) defaultHost = null; if (owned) host.remove(); else { host.classList.toggle('brand-toasts', original.className); attr(host, 'role', original.role); attr(host, 'aria-label', original.label); } }
    const controller = { push: push, clear: () => clear('clear'), destroy: destroy, getState: () => ({ visible: Array.from(visible).map(record => record.id), queued: queue.map(record => record.id) }) };
    toastHosts.set(host, controller); document.addEventListener('visibilitychange', visibility); return controller;
  }

  function initAlert(root) {
    if (alerts.has(root)) return alerts.get(root);
    const original = { hidden: root.hidden, role: root.getAttribute('role') }; let destroyed = false;
    const kind = root.dataset.alertKind || (root.classList.contains('danger') ? 'error' : 'info');
    root.setAttribute('role', ['error', 'warning'].includes(kind) ? 'alert' : 'status');
    function dismiss() {
      if (destroyed || !emit(root, 'alert-dismiss', { controller: controller }, true)) return false;
      const focused = root.contains(document.activeElement), controls = Array.from(document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')), index = controls.indexOf(document.activeElement);
      root.hidden = true;
      if (focused) {
        const available = element => !root.contains(element) && !element.matches(':disabled') && element.tabIndex >= 0 && element.getClientRects().length;
        const explicit = root.dataset.alertFocus ? document.getElementById(root.dataset.alertFocus) : null;
        const target = explicit?.getClientRects().length && !explicit.matches(':disabled') ? explicit : controls.slice(index + 1).find(available) || controls.slice(0, index).reverse().find(available);
        returnFocus(target);
      }
      return true;
    }
    function clicked(event) { if (event.target.closest('[data-alert-dismiss]')) dismiss(); }
    function destroy() { if (destroyed) return; destroyed = true; root.removeEventListener('click', clicked); root.hidden = original.hidden; attr(root, 'role', original.role); alerts.delete(root); }
    const controller = { dismiss: dismiss, show: () => { if (!destroyed) root.hidden = false; }, destroy: destroy };
    alerts.set(root, controller); root.addEventListener('click', clicked); return controller;
  }

  function initState(root, options) {
    if (states.has(root)) { states.get(root).configure(options); return states.get(root); }
    const title = root.querySelector('[data-state-title]'), message = root.querySelector('[data-state-message]'), button = root.querySelector('[data-state-retry]');
    if (!title || !message) throw new TypeError('State requires title and message');
    if (!['empty', 'no-results', 'error', 'loading', 'ready'].includes(root.dataset.state || 'empty')) throw new TypeError('Unknown content state');
    const original = { title: title.textContent, message: message.textContent, role: message.getAttribute('role'), titleTabIndex: title.getAttribute('tabindex'), busy: root.getAttribute('aria-busy'), state: root.getAttribute('data-state'), hidden: button?.hidden, disabled: button?.disabled };
    let config = Object.assign({}, options), state = root.dataset.state || 'empty', destroyed = false, request = null, retryFocus = false;
    const defaults = { empty: ['Пока пусто', 'Добавьте первый элемент.'], 'no-results': ['Ничего не найдено', 'Измените запрос или фильтры.'], error: ['Не удалось загрузить данные', 'Повторите попытку.'], loading: ['Загрузка', 'Выполняется…'], ready: ['Готово', 'Данные получены.'] };
    function setState(next, content) {
      if (destroyed) return;
      if (!defaults[next]) throw new TypeError('Unknown content state');
      if (next !== 'loading') { request?.abort(); request = null; }
      state = next; root.dataset.state = next; root.setAttribute('aria-busy', String(next === 'loading'));
      title.textContent = content?.title ?? defaults[next][0]; message.textContent = content?.message ?? defaults[next][1]; message.setAttribute('role', next === 'error' ? 'alert' : 'status');
      if (button) {
        const focused = button.contains(document.activeElement), retained = retryFocus && (document.activeElement === document.body || root.contains(document.activeElement));
        button.disabled = original.disabled || next === 'loading'; button.hidden = next === 'ready';
        if ((focused || retained) && button.hidden) { title.tabIndex = -1; returnFocus(title); }
        else if (retained && next === 'error') returnFocus(button);
      }
      if (next !== 'loading') retryFocus = false;
      emit(root, 'state-change', { state: state, controller: controller });
    }
    async function retry() {
      if (destroyed || request || button?.disabled) return;
      const current = new AbortController();
      if (!emit(root, 'state-retry', { controller: controller, signal: current.signal }, true) || typeof config.onRetry !== 'function') { current.abort(); return; }
      retryFocus = Boolean(button?.contains(document.activeElement)); request = current; setState('loading');
      try {
        const result = await config.onRetry({ signal: current.signal, controller: controller });
        if (!destroyed && !current.signal.aborted) setState(result?.state || 'ready', typeof result === 'string' ? { message: result } : result);
      } catch {
        if (!destroyed && !current.signal.aborted) setState('error', { message: config.errorMessage || 'Не удалось получить данные. Повторите попытку.' });
      }
    }
    function click(event) { if (event.target.closest('[data-state-retry]')) retry(); }
    function destroy() { if (destroyed) return; destroyed = true; request?.abort(); request = null; root.removeEventListener('click', click); title.textContent = original.title; message.textContent = original.message; attr(title, 'tabindex', original.titleTabIndex); attr(message, 'role', original.role); attr(root, 'aria-busy', original.busy); attr(root, 'data-state', original.state); if (button) { button.hidden = original.hidden; button.disabled = original.disabled; } states.delete(root); }
    const controller = { setState: setState, getState: () => state, retry: retry, configure: next => { config = Object.assign(config, next); }, destroy: destroy };
    states.set(root, controller); root.addEventListener('click', click); setState(state, { title: original.title, message: original.message }); return controller;
  }
  BrandUI.toasts = { init: initToasts, get: host => toastHosts.get(host || defaultHost), push: (options, host) => initToasts(host).push(options) };
  BrandUI.alerts = { init: initAlert, get: root => alerts.get(root) };
  BrandUI.states = { init: initState, get: root => states.get(root) };
  const instances = [toastHosts, alerts, states];
  BrandUI.registerModule('feedback', {
    init: container => { instances.forEach(map => map.forEach((controller, root) => { if (!root.isConnected) controller.destroy(); })); elements(container, '[data-brand-toasts]').forEach(root => initToasts(root)); elements(container, '[data-brand-alert]').forEach(initAlert); elements(container, '[data-brand-state]').forEach(root => initState(root)); },
    destroy: container => instances.forEach(map => map.forEach((controller, root) => { if (container === document || container === root || container.contains(root) || !root.isConnected) controller.destroy(); }))
  });
})();
