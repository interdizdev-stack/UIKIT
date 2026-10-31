(function () {
  'use strict';
  const instances = new Map();
  function init(target, options) {
    target = target || document.documentElement;
    if (instances.has(target)) return instances.get(target);
    const config = Object.assign({ mode: 'system', storageKey: null, controls: target }, options);
    const modes = ['light', 'dark', 'system'];
    let mode = config.mode, destroyed = false;
    const original = target.getAttribute('data-bs-theme');
    const media = matchMedia('(prefers-color-scheme: dark)');
    const controls = config.controls;
    function owns(button) {
      const nested = button.closest('[data-brand-theme]');
      return !nested || nested === target || !target.contains(nested);
    }
    const buttonStates = new Map();
    if (config.storageKey) { try { const saved = localStorage.getItem(config.storageKey); if (modes.includes(saved)) mode = saved; } catch {} }
    function apply() {
      const resolved = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
      target.dataset.bsTheme = resolved;
      controls.querySelectorAll('[data-theme-mode]').forEach(function (button) {
        if (!owns(button)) return;
        if (!buttonStates.has(button)) buttonStates.set(button, { pressed: button.getAttribute('aria-pressed'), active: button.classList.contains('active') });
        button.setAttribute('aria-pressed', String(button.dataset.themeMode === mode));
        button.classList.toggle('active', button.dataset.themeMode === mode);
      });
      target.dispatchEvent(new CustomEvent('brand:theme-change', { bubbles: true, detail: { mode: mode, resolved: resolved } }));
    }
    function setMode(next) {
      if (!modes.includes(next)) throw new TypeError('Theme must be light, dark or system');
      if (destroyed) return;
      mode = next;
      if (config.storageKey) { try { localStorage.setItem(config.storageKey, mode); } catch {} }
      apply();
    }
    function click(event) { const button = event.target.closest('[data-theme-mode]'); if (button && controls.contains(button) && owns(button)) setMode(button.dataset.themeMode); }
    function systemChanged() { if (mode === 'system') apply(); }
    function destroy() {
      if (destroyed) return; destroyed = true;
      controls.removeEventListener('click', click); media.removeEventListener('change', systemChanged);
      if (original === null) target.removeAttribute('data-bs-theme'); else target.setAttribute('data-bs-theme', original);
      buttonStates.forEach(function (value, button) { if (value.pressed === null) button.removeAttribute('aria-pressed'); else button.setAttribute('aria-pressed', value.pressed); button.classList.toggle('active', value.active); });
      instances.delete(target);
    }
    const controller = { setMode: setMode, getMode: function () { return mode; }, destroy: destroy };
    if (!modes.includes(mode)) throw new TypeError('Invalid initial theme mode');
    controls.addEventListener('click', click); media.addEventListener('change', systemChanged);
    instances.set(target, controller); apply(); return controller;
  }
  function initAll(container) {
    instances.forEach(function (controller, target) { if (!target.isConnected) controller.destroy(); });
    const targets = Array.from(container.querySelectorAll('[data-brand-theme]'));
    if (container instanceof Element && container.hasAttribute('data-brand-theme')) targets.unshift(container);
    targets.forEach(function (target) { init(target, { mode: target.dataset.brandTheme || 'system', storageKey: target.dataset.themeStorage || null }); });
  }
  function destroyAll(container) { instances.forEach(function (controller, target) { if (container === document || container === target || container.contains(target) || !target.isConnected) controller.destroy(); }); }
  BrandUI.theme = { init: init, get: function (target) { return instances.get(target || document.documentElement); } };
  BrandUI.registerModule('theme', { init: initAll, destroy: destroyAll });
})();
