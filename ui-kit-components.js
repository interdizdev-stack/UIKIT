(function () {
  'use strict';
  const avatars = new Map(), chipGroups = new Map(), drawers = new Map();
  function elements(container, selector) {
    const result = Array.from(container.querySelectorAll(selector));
    if (container instanceof Element && container.matches(selector)) result.unshift(container);
    return result;
  }
  function restoreAttribute(element, name, value) { if (value === null) element.removeAttribute(name); else element.setAttribute(name, value); }
  function event(root, name, detail, cancelable) { return root.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: Boolean(cancelable), detail: detail })); }

  function initAvatar(root) {
    if (avatars.has(root)) { avatars.get(root).update(); return avatars.get(root); }
    let image = null, destroyed = false, state = 'fallback';
    const hidden = new Map();
    const original = { busy: root.getAttribute('aria-busy'), state: root.getAttribute('data-avatar-state') };
    function update() {
      if (destroyed) return;
      const next = root.querySelector('[data-avatar-image]');
      if (next !== image) {
        if (image) { image.removeEventListener('load', update); image.removeEventListener('error', update); }
        image = next;
        if (image) { image.addEventListener('load', update); image.addEventListener('error', update); }
      }
      const fallback = root.querySelector('[data-avatar-fallback]');
      [image, fallback].filter(Boolean).forEach(function (element) { if (!hidden.has(element)) hidden.set(element, element.hidden); });
      const loaded = Boolean(image && image.complete && image.naturalWidth > 0);
      state = loaded ? 'image' : image && (image.currentSrc || image.getAttribute('src') || image.getAttribute('srcset')) && !image.complete ? 'loading' : 'fallback';
      if (image) image.hidden = !loaded;
      if (fallback) fallback.hidden = loaded;
      root.dataset.avatarState = state;
      if (state === 'loading') root.setAttribute('aria-busy', 'true'); else restoreAttribute(root, 'aria-busy', original.busy);
    }
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
    function destroy() {
      if (destroyed) return; destroyed = true; observer.disconnect();
      if (image) { image.removeEventListener('load', update); image.removeEventListener('error', update); }
      hidden.forEach(function (value, element) { element.hidden = value; });
      restoreAttribute(root, 'aria-busy', original.busy); restoreAttribute(root, 'data-avatar-state', original.state);
      avatars.delete(root);
    }
    const controller = { update: update, destroy: destroy, getState: function () { return state; } };
    avatars.set(root, controller); update(); return controller;
  }

  function initChips(root) {
    if (chipGroups.has(root)) { chipGroups.get(root).update(); return chipGroups.get(root); }
    let destroyed = false;
    const originalButtons = new Map(), originalChips = new Map();
    const originalTabIndex = root.getAttribute('tabindex');
    function own(element) { return element.closest('[data-brand-chips]') === root; }
    function buttons() { return Array.from(root.querySelectorAll('button[data-chip-toggle]')).filter(own); }
    function chip(button) { return button.closest('[data-chip-value]'); }
    function value(button) { return chip(button)?.dataset.chipValue; }
    function getSelection() { return buttons().filter(function (button) { return button.getAttribute('aria-pressed') === 'true'; }).map(value); }
    function mode() { return root.dataset.chipSelection || 'multiple'; }
    function update() {
      if (destroyed) return;
      if (!['single', 'multiple'].includes(mode())) throw new TypeError('Unknown chip selection mode');
      const values = buttons().map(value);
      if (values.some(function (item) { return item === undefined; }) || new Set(values).size !== values.length) throw new TypeError('Chips require unique data-chip-value values');
      let selected = false;
      buttons().forEach(function (button) {
        if (!originalButtons.has(button)) originalButtons.set(button, button.getAttribute('aria-pressed'));
        const item = chip(button);
        if (!originalChips.has(item)) originalChips.set(item, item.classList.contains('is-selected'));
        let pressed = button.getAttribute('aria-pressed') === 'true';
        if (mode() === 'single' && pressed) { pressed = !selected; selected = true; }
        button.setAttribute('aria-pressed', String(pressed)); item.classList.toggle('is-selected', pressed);
      });
      const empty = root.querySelector('[data-chips-empty]');
      if (empty) empty.hidden = Array.from(root.querySelectorAll('[data-chip-value]')).filter(own).length > 0;
    }
    function emitChange() { event(root, 'brand:chips-change', { values: getSelection(), controller: controller }); }
    function select(key, pressed) {
      if (destroyed) return false;
      const button = buttons().find(function (item) { return value(item) === String(key); });
      if (!button || button.disabled) return false;
      const before = getSelection().join('\u0000');
      if (mode() === 'single' && pressed) buttons().forEach(function (item) { item.setAttribute('aria-pressed', 'false'); });
      button.setAttribute('aria-pressed', String(Boolean(pressed))); update();
      if (before !== getSelection().join('\u0000')) emitChange();
      return true;
    }
    function remove(key) {
      if (destroyed) return false;
      const item = Array.from(root.querySelectorAll('[data-chip-value]')).filter(own).find(function (element) { return element.dataset.chipValue === String(key); });
      if (!item) return false;
      const detail = { value: String(key), label: item.textContent.trim(), controller: controller };
      if (!event(root, 'brand:chip-remove', detail, true)) return false;
      const controls = Array.from(root.querySelectorAll('button:not(:disabled)')).filter(own);
      const index = controls.findIndex(function (button) { return item === button || item.contains(button); });
      const following = controls.slice(index + 1).find(function (button) { return !item.contains(button); });
      const previous = controls.slice(0, index).reverse().find(function (button) { return !item.contains(button); });
      const focused = item === document.activeElement || item.contains(document.activeElement);
      item.remove(); update(); emitChange();
      if (focused) {
        if (following || previous) (following || previous).focus();
        else { root.tabIndex = -1; root.focus(); }
      }
      return true;
    }
    function clicked(click) {
      const button = click.target.closest('button');
      if (!button || !own(button) || button.disabled) return;
      if (button.hasAttribute('data-chip-remove')) remove(value(button));
      else if (button.hasAttribute('data-chip-toggle')) select(value(button), button.getAttribute('aria-pressed') !== 'true');
    }
    function destroy() {
      if (destroyed) return; destroyed = true; root.removeEventListener('click', clicked);
      originalButtons.forEach(function (pressed, button) { restoreAttribute(button, 'aria-pressed', pressed); });
      originalChips.forEach(function (selected, item) { item.classList.toggle('is-selected', selected); });
      restoreAttribute(root, 'tabindex', originalTabIndex); chipGroups.delete(root);
    }
    const controller = { update: update, getSelection: getSelection, select: select, remove: remove, destroy: destroy };
    update(); chipGroups.set(root, controller); root.addEventListener('click', clicked); return controller;
  }

  function initDrawer(root, options) {
    if (drawers.has(root)) return drawers.get(root);
    if (!window.bootstrap?.Offcanvas) return null;
    const existing = bootstrap.Offcanvas.getInstance(root);
    const instance = existing || new bootstrap.Offcanvas(root, options);
    const owned = !existing;
    let phase = root.classList.contains('show') ? 'open' : 'closed', trigger = null, destroyed = false, destroyPromise = null;
    const original = { role: root.getAttribute('role'), modal: root.getAttribute('aria-modal') };
    const triggerStates = new Map();
    function updateTriggers(expanded) {
      document.querySelectorAll('[data-bs-toggle="offcanvas"]').forEach(function (button) {
        if (!root.id || (button.getAttribute('data-bs-target') !== '#' + root.id && button.getAttribute('href') !== '#' + root.id)) return;
        if (!triggerStates.has(button)) triggerStates.set(button, button.getAttribute('aria-expanded'));
        button.setAttribute('aria-expanded', String(expanded));
      });
    }
    function show(event) {
      phase = 'opening';
      if (event.relatedTarget instanceof HTMLElement) trigger = event.relatedTarget;
      else if (!root.contains(document.activeElement)) trigger = document.activeElement;
      updateTriggers(true);
    }
    function shown() { phase = 'open'; if (destroyed && owned) instance.hide(); }
    function hiding() { phase = 'closing'; updateTriggers(false); }
    function hidden() {
      phase = 'closed';
      if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true });
      trigger = null;
    }
    function clicked(click) {
      if (destroyed || click.defaultPrevented) return;
      const link = click.target.closest('a[href], [data-drawer-close]');
      if (link && root.contains(link) && root.classList.contains('show')) instance.hide();
    }
    const events = { 'show.bs.offcanvas': show, 'shown.bs.offcanvas': shown, 'hide.bs.offcanvas': hiding, 'hidden.bs.offcanvas': hidden, click: clicked };
    Object.entries(events).forEach(function (entry) { root.addEventListener(entry[0], entry[1]); });
    function destroy() {
      if (destroyPromise) return destroyPromise;
      destroyed = true;
      destroyPromise = new Promise(function (resolve) {
        function finish() {
          Object.entries(events).forEach(function (entry) { root.removeEventListener(entry[0], entry[1]); });
          if (owned) { instance.dispose(); restoreAttribute(root, 'role', original.role); restoreAttribute(root, 'aria-modal', original.modal); }
          triggerStates.forEach(function (expanded, button) { restoreAttribute(button, 'aria-expanded', expanded); });
          drawers.delete(root); resolve();
        }
        if (!owned || phase === 'closed') finish();
        else { root.addEventListener('hidden.bs.offcanvas', finish, { once: true }); if (phase === 'open') instance.hide(); }
      });
      return destroyPromise;
    }
    const controller = { show: function (opener) { if (!destroyed) instance.show(opener); }, hide: function () { if (!destroyed) instance.hide(); }, getState: function () { return phase; }, destroy: destroy };
    drawers.set(root, controller); updateTriggers(phase !== 'closed'); return controller;
  }

  function initAll(container) {
    [avatars, chipGroups, drawers].forEach(function (instances) { instances.forEach(function (controller, root) { if (!root.isConnected) controller.destroy(); }); });
    elements(container, '[data-brand-avatar]').forEach(initAvatar);
    elements(container, '[data-brand-chips]').forEach(initChips);
    elements(container, '[data-brand-drawer]').forEach(function (root) { initDrawer(root); });
  }
  function destroyAll(container) {
    const pending = [];
    [avatars, chipGroups, drawers].forEach(function (instances) {
      instances.forEach(function (controller, root) { if (container === document || container === root || container.contains(root) || !root.isConnected) pending.push(controller.destroy()); });
    });
    return Promise.all(pending);
  }
  BrandUI.avatar = { init: initAvatar, get: function (root) { return avatars.get(root); } };
  BrandUI.chips = { init: initChips, get: function (root) { return chipGroups.get(root); } };
  BrandUI.drawer = { init: initDrawer, get: function (root) { return drawers.get(root); } };
  BrandUI.registerModule('components', { init: initAll, destroy: destroyAll });
})();
