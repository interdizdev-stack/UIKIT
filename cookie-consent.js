(function () {
  'use strict';

  const instances = new WeakMap();
  const roots = new Set();
  const variants = ['bar', 'corner', 'modal'];
  function escape(value) { return String(value).replace(/[&<>"']/g, function (char) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]; }); }
  function icon(name) { return '<i data-lucide="' + name + '"></i>'; }
  function markup(options) {
    const settings = Object.assign({ id: 'cookieConsent', variant: 'bar', policyUrl: '/privacy/cookies/', storageKey: 'brand-cookie-consent' }, options);
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(settings.id)) throw new Error('Invalid cookie component ID');
    if (!variants.includes(settings.variant)) throw new Error('Unknown cookie notice variant');
    if (!/^(https?:\/\/|\/(?!\/)|\.\.?\/|#)/i.test(settings.policyUrl)) throw new Error('Invalid cookie policy URL');
    const id = settings.id;
    const link = '<a href="' + escape(settings.policyUrl) + '">Политика cookie</a>';
    const copy = '<p class="brand-cookie-copy">Необходимые cookie обеспечивают работу сайта. С вашего согласия Яндекс Метрика использует cookie и данные о посещениях для анализа работы сайта. ' + link + '</p>';
    const actions = '<div class="brand-cookie-actions"><button class="btn btn-secondary" type="button" data-cookie-action="reject">Только необходимые</button><button class="btn btn-primary" type="button" data-cookie-action="accept">Принять все' + icon('check') + '</button><button class="btn btn-ghost" type="button" data-cookie-action="settings">' + icon('sliders-horizontal') + 'Настроить</button></div>';
    const title = '<h2 class="brand-cookie-title" id="' + id + 'Title">Cookie и Яндекс Метрика</h2>';
    const notice = settings.variant === 'modal'
      ? '<div class="modal fade" data-cookie-notice tabindex="-1" aria-labelledby="' + id + 'Title" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header">' + title + '<button class="btn btn-ghost btn-icon" type="button" data-bs-dismiss="modal" aria-label="Закрыть уведомление">' + icon('x') + '</button></div><div class="modal-body">' + copy + actions + '</div></div></div></div>'
      : '<section class="brand-cookie brand-cookie--' + settings.variant + '" data-cookie-notice aria-labelledby="' + id + 'Title"><div class="brand-cookie-intro"><span class="brand-cookie-icon" aria-hidden="true">' + icon('cookie') + '</span><div>' + title + copy + '</div></div>' + actions + '</section>';
    const preferences = '<div class="modal fade" data-cookie-settings tabindex="-1" aria-labelledby="' + id + 'SettingsTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"><div class="modal-header"><h2 class="modal-title" id="' + id + 'SettingsTitle">Настройки cookie</h2><button class="btn btn-ghost btn-icon" type="button" data-bs-dismiss="modal" aria-label="Закрыть настройки cookie">' + icon('x') + '</button></div><div class="modal-body"><p class="brand-cookie-copy">Выберите, какие данные разрешить использовать. ' + link + '</p><div class="brand-cookie-category"><div><label for="' + id + 'Necessary">Необходимые cookie</label><p id="' + id + 'NecessaryText">Работа сайта и сохранение вашего выбора.</p></div><div class="form-check form-switch"><input class="form-check-input" id="' + id + 'Necessary" type="checkbox" role="switch" checked disabled aria-describedby="' + id + 'NecessaryText"></div></div><div class="brand-cookie-category"><div><label for="' + id + 'Metrica">Яндекс Метрика</label><p id="' + id + 'MetricaText">Статистика посещений и действий на сайте. Вы можете отказаться от аналитики.</p></div><div class="form-check form-switch"><input class="form-check-input" id="' + id + 'Metrica" data-cookie-metrica type="checkbox" role="switch" aria-describedby="' + id + 'MetricaText"></div></div></div><div class="modal-footer brand-cookie-actions"><button class="btn btn-secondary" type="button" data-cookie-action="reject">Только необходимые</button><button class="btn btn-primary" type="button" data-cookie-action="save">Сохранить выбор' + icon('check') + '</button></div></div></div></div>';
    return '<div data-cookie-consent data-cookie-key="' + escape(settings.storageKey) + '">\n' + notice + '\n' + preferences + '\n</div>';
  }

  function read(key, maxAgeDays) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      const age = Date.now() - Date.parse(value && value.savedAt);
      if (value && value.version === 1 && value.necessary === true && typeof value.metrica === 'boolean' && age >= 0 && age < maxAgeDays * 86400000) return value;
    } catch {}
    return null;
  }

  function init(root, options) {
    if (instances.has(root)) return instances.get(root);
    const config = Object.assign({ persist: true, inline: false, maxAgeDays: 180 }, options);
    const key = config.storageKey || root.dataset.cookieKey || 'brand-cookie-consent';
    const notice = root.querySelector('[data-cookie-notice]');
    const settings = root.querySelector('[data-cookie-settings]');
    const toggle = root.querySelector('[data-cookie-metrica]');
    if (!notice || !settings || !toggle) throw new Error('Incomplete cookie component');
    const isModal = notice.classList.contains('modal') && !config.inline;
    let consent = config.persist ? read(key, config.maxAgeDays) : null;
    let trigger = null;
    let destroyed = false;
    let storageAvailable = true;
    const modalStates = new Map();

    function disposeModal(element, state) {
      Object.entries(state.events).forEach(function (entry) { element.removeEventListener(entry[0], entry[1]); });
      state.instance.dispose();
      modalStates.delete(element);
      if (!root.isConnected && element.parentElement === document.body) element.remove();
      if (state.resolve) state.resolve();
    }
    function modalFor(element) {
      if (!modalStates.has(element)) {
        const state = { instance: bootstrap.Modal.getOrCreateInstance(element), phase: 'closed' };
        state.events = {
          'show.bs.modal': function () { state.phase = 'opening'; },
          'shown.bs.modal': function () { state.phase = 'open'; if (destroyed) state.instance.hide(); },
          'hide.bs.modal': function () { state.phase = 'closing'; },
          'hidden.bs.modal': function () { state.phase = 'closed'; if (destroyed) disposeModal(element, state); }
        };
        Object.entries(state.events).forEach(function (entry) { element.addEventListener(entry[0], entry[1]); });
        modalStates.set(element, state);
      }
      return modalStates.get(element).instance;
    }

    function show() {
      if (destroyed) return;
      if (isModal) modalFor(notice).show();
      else notice.hidden = false;
    }
    function hide() {
      if (isModal) modalStates.get(notice)?.instance.hide();
      else notice.hidden = true;
    }
    function emit() {
      const detail = { consent: Object.assign({}, consent), storageAvailable: storageAvailable };
      root.dispatchEvent(new CustomEvent('brand:cookie-consent', { bubbles: true, detail: detail }));
      if (typeof config.onChange === 'function') config.onChange(detail.consent, detail);
    }
    function choose(metrica) {
      consent = { version: 1, necessary: true, metrica: Boolean(metrica), savedAt: new Date().toISOString() };
      storageAvailable = true;
      if (config.persist) {
        try { localStorage.setItem(key, JSON.stringify(consent)); } catch { storageAvailable = false; }
      }
      hide();
      modalStates.get(settings)?.instance.hide();
      emit();
    }
    function openSettings() {
      if (destroyed) return;
      trigger = document.activeElement;
      toggle.checked = consent ? consent.metrica : false;
      if (isModal && notice.classList.contains('show')) {
        notice.addEventListener('hidden.bs.modal', function () {
          if (!destroyed) modalFor(settings).show();
        }, { once: true });
        hide();
      } else modalFor(settings).show();
    }
    function settingsClosed() {
      if (destroyed) return;
      if (!consent && isModal) show();
      else if (trigger && trigger.isConnected && !trigger.closest('[hidden]')) trigger.focus();
    }
    function clicked(event) {
      const button = event.target.closest('[data-cookie-action]');
      if (!button || !root.contains(button)) return;
      if (button.dataset.cookieAction === 'accept') choose(true);
      if (button.dataset.cookieAction === 'reject') choose(false);
      if (button.dataset.cookieAction === 'save') choose(toggle.checked);
      if (button.dataset.cookieAction === 'settings') openSettings();
    }
    function destroy() {
      if (destroyed) return controller.destroyPromise;
      destroyed = true;
      root.removeEventListener('click', clicked);
      settings.removeEventListener('hidden.bs.modal', settingsClosed);
      // Bootstrap must finish opening or closing before an instance is disposed.
      controller.destroyPromise = Promise.all(Array.from(modalStates, function (entry) {
        const element = entry[0], state = entry[1];
        return new Promise(function (resolve) {
          state.resolve = resolve;
          if (state.phase === 'open') state.instance.hide();
          else if (state.phase === 'closed') disposeModal(element, state);
        });
      })).then(function () { instances.delete(root); roots.delete(root); });
      return controller.destroyPromise;
    }
    const controller = { show: show, settings: openSettings, getConsent: function () { return consent ? Object.assign({}, consent) : null; }, destroy: destroy };
    instances.set(root, controller);
    roots.add(root);
    root.addEventListener('click', clicked);
    settings.addEventListener('hidden.bs.modal', settingsClosed);
    if (consent) { hide(); emit(); } else show();
    return controller;
  }

  function initAll(container) {
    container = container || document;
    const selector = '[data-cookie-consent]:not([data-cookie-demo])';
    if (container instanceof Element && container.matches(selector)) init(container);
    container.querySelectorAll(selector).forEach(function (root) { init(root); });
  }
  function destroyAll(container) {
    container = container || document;
    return Promise.all(Array.from(roots).filter(function (root) { return container === document || root === container || container.contains(root) || !root.isConnected; }).map(function (root) { return instances.get(root).destroy(); }));
  }
  window.BrandUI.cookies = { markup: markup, init: init, initAll: initAll, destroyAll: destroyAll, read: function (key) { return read(key || 'brand-cookie-consent', 180); } };
  window.BrandUI.registerModule('cookies', { init: initAll, destroy: destroyAll });
})();
