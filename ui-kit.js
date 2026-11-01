(function () {
  'use strict';
  const phoneSelector = 'input[type="tel"], input[data-tel-input]';
  const lifecycle = new WeakMap();
  const scopes = new Set();
  const modules = new Map();
  const icons = new Set();
  const tooltips = new Map();
  const popovers = new Map();
  const overlayRecords = new Map();
  const listeners = [];
  let listening = false;
  let phoneConfig = { format: 'ru', maxDigits: 16 };

  function within(container, element) { return container === document || container === element || container.contains(element); }
  function elements(container, selector) {
    const result = Array.from(container.querySelectorAll(selector));
    if (container instanceof Element && container.matches(selector)) result.unshift(container);
    return result;
  }
  function managed(element) {
    for (let node = element; node; node = node.parentNode) {
      if (lifecycle.has(node)) return lifecycle.get(node);
    }
    return false;
  }
  function listen(target, type, handler, capture) { listeners.push([target, type, handler, Boolean(capture)]); }
  function attachListeners() {
    if (listening) return;
    listeners.forEach(function (args) { args[0].addEventListener(args[1], args[2], args[3]); });
    listening = true;
  }
  function detachListeners() {
    listeners.forEach(function (args) { args[0].removeEventListener(args[1], args[2], args[3]); });
    listening = false;
  }
  function phoneOptions(input) {
    return { format: input.dataset.phoneFormat || phoneConfig.format, maxDigits: phoneConfig.maxDigits };
  }

  function getInputNumbersValue(value) {
    return value.replace(/\D/g, '');
  }

  function formatPhoneValue(numbers) {
    if (!numbers) return '';
    if (!/^[789]/.test(numbers)) return '+' + numbers.slice(0, 16);
    if (numbers[0] === '9') numbers = '7' + numbers;
    numbers = numbers.slice(0, 11);
    let formatted = (numbers[0] === '8' ? '8' : '+7') + ' ';
    if (numbers.length > 1) formatted += '(' + numbers.slice(1, 4);
    if (numbers.length >= 5) formatted += ') ' + numbers.slice(4, 7);
    if (numbers.length >= 8) formatted += '-' + numbers.slice(7, 9);
    if (numbers.length >= 10) formatted += '-' + numbers.slice(9, 11);
    return formatted;
  }

  function getCaretPosition(value, digitCount) {
    if (!digitCount) return 0;
    for (let index = 0; index < value.length; index += 1) {
      if (/\d/.test(value[index]) && --digitCount === 0) return index + 1;
    }
    return value.length;
  }

  function formatPhoneInput(input) {
    const config = phoneOptions(input);
    if (!managed(input) || config.format === 'none') return;
    const value = input.value;
    const numbers = getInputNumbersValue(value);
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const formatted = config.format === 'international' ? (numbers ? '+' + numbers.slice(0, config.maxDigits) : '') : formatPhoneValue(numbers);
    if (value === formatted) return;
    const prefixDigits = config.format === 'ru' && numbers[0] === '9' ? 1 : 0;
    input.value = formatted;
    if (start !== null && end !== null) {
      const caret = function (position) {
        if (position === value.length) return formatted.length;
        return getCaretPosition(formatted, getInputNumbersValue(value.slice(0, position)).length + (position > 0 ? prefixDigits : 0));
      };
      input.setSelectionRange(caret(start), caret(end));
    }
  }

  function isPhoneInput(input) {
    return input instanceof HTMLInputElement && input.matches(phoneSelector) && managed(input) && phoneOptions(input).format !== 'none';
  }

  function dispatchPhoneInput(input, inputType, data) {
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: inputType, data: data }));
  }

  function onPhoneInput(event) {
    if (isPhoneInput(event.target) && !event.isComposing) formatPhoneInput(event.target);
  }

  function onPhonePaste(event) {
    const input = event.target;
    if (!isPhoneInput(input) || input.readOnly || input.disabled || !event.clipboardData) return;
    // Strip the pasted text before insertion, preserving unselected digits.
    const numbers = getInputNumbersValue(event.clipboardData.getData('text'));
    event.preventDefault();
    if (!numbers) return;
    input.setRangeText(numbers, input.selectionStart, input.selectionEnd, 'end');
    dispatchPhoneInput(input, 'insertFromPaste', numbers);
  }

  function deletePhoneDigit(event, backwards) {
    const input = event.target;
    if (!isPhoneInput(input) || input.readOnly || input.disabled || input.selectionStart === null || input.selectionStart !== input.selectionEnd) return;
    // Skip mask separators so Backspace/Delete always remove a digit.
    let index = input.selectionStart + (backwards ? -1 : 0);
    while (index >= 0 && index < input.value.length && /\D/.test(input.value[index])) index += backwards ? -1 : 1;
    if (index < 0 || index >= input.value.length) return;
    event.preventDefault();
    if (getInputNumbersValue(input.value).length === 1) input.value = '';
    else input.setRangeText('', index, index + 1, 'end');
    dispatchPhoneInput(input, backwards ? 'deleteContentBackward' : 'deleteContentForward', null);
  }

  function onPhoneKeyDown(event) {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'Backspace' || event.key === 'Delete') deletePhoneDigit(event, event.key === 'Backspace');
  }

  function onPhoneBeforeInput(event) {
    if (!event.cancelable || event.isComposing) return;
    if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward') deletePhoneDigit(event, event.inputType === 'deleteContentBackward');
  }

  // Delegation also covers AJAX forms and fields switched to type="tel".
  // Capture formats the value before form validation input listeners run.
  listen(document, 'input', onPhoneInput, true);
  listen(document, 'compositionend', onPhoneInput, true);
  listen(document, 'focusin', onPhoneInput, true);
  listen(document, 'paste', onPhonePaste, true);
  listen(document, 'keydown', onPhoneKeyDown, true);
  listen(document, 'beforeinput', onPhoneBeforeInput, true);

  // Keep native selects for form values and validation; use one themed popup.
  const selectInstances = new WeakMap();
  const selects = new Set();
  let openSelect = null;
  let selectSequence = 0;

  function closeSelect() {
    if (!openSelect) return;
    openSelect.menu.hidden = true;
    openSelect.root.classList.remove('is-open');
    openSelect.trigger.setAttribute('aria-expanded', 'false');
    openSelect.trigger.removeAttribute('aria-activedescendant');
    openSelect.root.append(openSelect.menu);
    ['position', 'inset', 'left', 'top', 'width', 'min-width', 'max-width'].forEach(function (property) { openSelect.menu.style.removeProperty(property); });
    openSelect = null;
  }

  function needsNativeSelect(select) {
    return select.multiple || select.size > 1 || select.hasAttribute('data-native-select') || select.hasAttribute('data-brand-choice');
  }

  function destroySelect(select) {
    const instance = selectInstances.get(select);
    if (instance) instance.destroy();
  }

  function initSelect(select) {
    const existing = selectInstances.get(select);
    if (needsNativeSelect(select)) { destroySelect(select); return; }
    if (existing) {
      if (select.nextElementSibling !== existing.root) select.after(existing.root);
      existing.refresh();
      return;
    }
    const id = 'brand-select-' + (++selectSequence);
    const root = document.createElement('div');
    root.className = 'brand-select';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = id;
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', id + '-list');
    const value = document.createElement('span');
    value.id = id + '-value';
    value.className = 'brand-select-value';
    trigger.append(value);
    const menu = document.createElement('div');
    menu.id = id + '-list';
    menu.className = 'brand-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    root.append(trigger, menu);
    select.after(root);
    const tabIndex = select.tabIndex;
    const originalTabIndex = select.getAttribute('tabindex');
    const originalAriaHidden = select.getAttribute('aria-hidden');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.classList.add('brand-select-native');
    let activeIndex = select.selectedIndex;
    let search = '';
    let searchTime = 0;
    let items = [];
    let destroyed = false;
    const generatedLabels = new Map();

    function enabled(index) {
      const option = select.options[index];
      return option && !option.disabled && !option.hidden && !(option.parentElement.tagName === 'OPTGROUP' && (option.parentElement.disabled || option.parentElement.hidden));
    }

    function highlight(index) {
      activeIndex = index;
      items.forEach(function (item) { item.element.classList.toggle('is-active', item.index === index); });
      const active = items.find(function (item) { return item.index === index; });
      if (!menu.hidden && active) {
        trigger.setAttribute('aria-activedescendant', active.element.id);
        const top = active.element.offsetTop;
        if (top < menu.scrollTop) menu.scrollTop = top;
        else if (top + active.element.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = top + active.element.offsetHeight - menu.clientHeight;
      } else if (!menu.hidden) trigger.removeAttribute('aria-activedescendant');
    }

    function refresh() {
      if (destroyed) return;
      if (needsNativeSelect(select)) { destroySelect(select); return; }
      root.hidden = select.hidden;
      if (select.hasAttribute('data-ui-density')) root.setAttribute('data-ui-density', select.getAttribute('data-ui-density')); else root.removeAttribute('data-ui-density');
      trigger.className = select.className.replace(/\bbrand-select-native\b/g, '').trim() + ' brand-select-trigger';
      trigger.disabled = select.matches(':disabled');
      trigger.tabIndex = tabIndex;
      value.textContent = select.selectedOptions[0] ? select.selectedOptions[0].label : '';
      trigger.setAttribute('aria-required', String(select.required));
      trigger.setAttribute('aria-invalid', String(select.getAttribute('aria-invalid') === 'true' || select.classList.contains('is-invalid') || Boolean(select.closest('.was-validated') && !select.validity.valid)));
      const descriptions = select.getAttribute('aria-describedby');
      if (descriptions) trigger.setAttribute('aria-describedby', descriptions); else trigger.removeAttribute('aria-describedby');
      let labels = select.getAttribute('aria-labelledby');
      if (!labels && !select.hasAttribute('aria-label')) labels = Array.from(select.labels || []).map(function (label, index) {
        if (!label.id) { label.id = id + '-label-' + index; generatedLabels.set(label, label.id); }
        return label.id;
      }).join(' ');
      if (labels) {
        trigger.setAttribute('aria-labelledby', labels + ' ' + value.id);
        trigger.removeAttribute('aria-label');
        menu.setAttribute('aria-labelledby', labels);
      } else {
        trigger.removeAttribute('aria-labelledby');
        trigger.setAttribute('aria-label', (select.getAttribute('aria-label') || select.name || 'Выберите значение') + ': ' + value.textContent);
        menu.setAttribute('aria-label', select.getAttribute('aria-label') || select.name || 'Выберите значение');
      }
      menu.replaceChildren();
      items = [];
      let lastGroup = null;
      Array.from(select.options).forEach(function (option, index) {
        if (option.hidden || option.parentElement.hidden) return;
        const group = option.parentElement.tagName === 'OPTGROUP' ? option.parentElement : null;
        if (group && group !== lastGroup) {
          const heading = document.createElement('div');
          heading.className = 'brand-select-group';
          heading.setAttribute('role', 'presentation');
          heading.textContent = group.label;
          menu.append(heading);
        }
        lastGroup = group;
        const item = document.createElement('div');
        item.id = id + '-option-' + index;
        item.className = 'brand-select-option';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(index === select.selectedIndex));
        item.setAttribute('aria-disabled', String(!enabled(index)));
        item.textContent = option.label;
        item.addEventListener('pointermove', function () { if (enabled(index)) highlight(index); });
        item.addEventListener('click', function () { if (enabled(index)) { highlight(index); choose(true); } });
        menu.append(item);
        items.push({ index: index, element: item });
      });
      if (openSelect === instance && trigger.disabled) closeSelect();
      highlight(enabled(activeIndex) ? activeIndex : select.selectedIndex);
    }

    function open() {
      if (select.matches(':disabled')) return;
      closeSelect();
      refresh();
      if (destroyed) return;
      openSelect = instance;
      search = '';
      searchTime = 0;
      menu.style.maxHeight = '260px';
      // Portal the list out of clipping parents while keeping combobox focus.
      const styles = getComputedStyle(select);
      for (const property of styles) {
        if (property.startsWith('--ui-') || property.startsWith('--bs-')) menu.style.setProperty(property, styles.getPropertyValue(property));
      }
      document.body.append(menu);
      menu.style.position = 'fixed';
      menu.style.inset = 'auto';
      menu.hidden = false;
      position();
      root.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      highlight(select.selectedIndex);
    }

    function position() {
      const bounds = trigger.getBoundingClientRect();
      const topLimit=(window.visualViewport?.offsetTop||0)+8,bottomLimit=(window.visualViewport?.offsetTop||0)+(window.visualViewport?.height||innerHeight)-8;
      const viewportWidth=window.visualViewport?.width||document.documentElement.clientWidth,leftLimit=(window.visualViewport?.offsetLeft||0)+8;
      // Include option padding/checkmarks, not just the compact trigger's width.
      // Resolve width before height so wrapping also informs upwards placement.
      menu.style.width = 'max-content';
      menu.style.minWidth = Math.min(bounds.width, Math.max(0, viewportWidth - 16)) + 'px';
      menu.style.maxWidth = Math.max(0, viewportWidth - 16) + 'px';
      const width = menu.getBoundingClientRect().width;
      const below = bottomLimit - bounds.bottom - 6;
      const above = bounds.top - topLimit - 6;
      const upwards = below < Math.min(menu.scrollHeight + 2, 260) && above > below;
      root.classList.toggle('opens-up', upwards);
      menu.style.maxHeight = Math.max(40, Math.min(260, upwards ? above : below)) + 'px';
      menu.style.left = Math.max(leftLimit, Math.min(bounds.left,leftLimit+viewportWidth-width-16))+'px';
      menu.style.top = Math.max(topLimit,Math.min(upwards?bounds.top-menu.getBoundingClientRect().height-6:bounds.bottom+6,bottomLimit-menu.getBoundingClientRect().height))+'px';
    }

    function choose(focus) {
      if (!enabled(activeIndex) || select.matches(':disabled')) { closeSelect(); return; }
      const changed = select.selectedIndex !== activeIndex;
      select.selectedIndex = activeIndex;
      closeSelect();
      refresh();
      if (focus) trigger.focus();
      if (changed) {
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    function move(direction) {
      for (let index = activeIndex + direction; index >= 0 && index < select.options.length; index += direction) {
        if (enabled(index)) { highlight(index); break; }
      }
    }

    trigger.addEventListener('click', function () { if (openSelect === instance) closeSelect(); else open(); });
    trigger.addEventListener('keydown', function (event) {
      if (event.isComposing || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Tab') { if (openSelect === instance) choose(false); return; }
      if (event.key === 'Escape') { if (openSelect === instance) { event.preventDefault(); event.stopPropagation(); closeSelect(); } return; }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (openSelect === instance) choose(true); else open();
        return;
      }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (event.altKey && event.key === 'ArrowUp') { if (openSelect === instance) choose(true); return; }
        if (openSelect !== instance) open();
        if (event.altKey) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') move(event.key === 'ArrowDown' ? 1 : -1);
        else {
          const available = items.filter(function (item) { return enabled(item.index); });
          const item = event.key === 'Home' ? available[0] : available[available.length - 1];
          if (item) highlight(item.index);
        }
        return;
      }
      if (event.key.length === 1 && !event.altKey) {
        event.preventDefault();
        if (openSelect !== instance) open();
        const now = Date.now();
        const letter = event.key.toLocaleLowerCase();
        search = now - searchTime > 750 || search === letter ? letter : search + letter;
        searchTime = now;
        for (let offset = 1; offset <= select.options.length; offset += 1) {
          const index = (activeIndex + offset) % select.options.length;
          if (enabled(index) && select.options[index].label.toLocaleLowerCase().startsWith(search)) { highlight(index); break; }
        }
      }
    });
    menu.addEventListener('pointerdown', function (event) { event.preventDefault(); });
    function onFocus() { trigger.focus(); }
    function onClick(event) { event.preventDefault(); trigger.focus(); }
    select.addEventListener('focus', onFocus);
    select.addEventListener('click', onClick);
    select.addEventListener('input', refresh);
    select.addEventListener('change', refresh);
    const observer = new MutationObserver(refresh);
    observer.observe(select, { attributes: true, childList: true, subtree: true, characterData: true });
    for (let parent = select.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'FIELDSET') observer.observe(parent, { attributes: true, attributeFilter: ['disabled'] });
      if (parent.tagName === 'FORM') observer.observe(parent, { attributes: true, attributeFilter: ['class'] });
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      const restoreFocus = document.activeElement === trigger;
      if (openSelect === instance) closeSelect();
      observer.disconnect();
      select.removeEventListener('focus', onFocus);
      select.removeEventListener('click', onClick);
      select.removeEventListener('input', refresh);
      select.removeEventListener('change', refresh);
      select.classList.remove('brand-select-native');
      if (originalTabIndex === null) select.removeAttribute('tabindex'); else select.setAttribute('tabindex', originalTabIndex);
      if (originalAriaHidden === null) select.removeAttribute('aria-hidden'); else select.setAttribute('aria-hidden', originalAriaHidden);
      root.remove();
      menu.remove();
      selectInstances.delete(select);
      selects.delete(select);
      generatedLabels.forEach(function (labelId, label) { if (label.id === labelId) label.removeAttribute('id'); });
      if (restoreFocus) select.focus({ preventScroll: true });
    }
    const instance = { select: select, root: root, trigger: trigger, menu: menu, refresh: refresh, position: position, observer: observer, destroy: destroy };
    selectInstances.set(select, instance);
    selects.add(select);
    refresh();
  }

  listen(document, 'pointerdown', function (event) {
    if (openSelect && !openSelect.root.contains(event.target) && !openSelect.menu.contains(event.target)) closeSelect();
  });
  listen(document, 'focusin', function (event) {
    if (openSelect && event.target !== openSelect.select && !openSelect.root.contains(event.target)) closeSelect();
  });
  listen(document, 'reset', function (event) {
    const form = event.target;
    queueMicrotask(function () {
      form.querySelectorAll('select.form-select').forEach(function (select) { selectInstances.get(select)?.refresh(); });
    });
    closeSelect();
  });
  listen(window, 'resize', closeSelect);
  if(window.visualViewport){const reposition=()=>openSelect?.position();listen(window.visualViewport,'resize',reposition);listen(window.visualViewport,'scroll',reposition);}
  listen(document, 'brand:theme-change', function () { closeSelect(); tooltips.forEach(function (instance) { instance.hide(); }); popovers.forEach(function (instance) { instance.hide(); }); });
  listen(document, 'pointerdown', function (event) {
    popovers.forEach(function (instance, element) {
      const tip = overlayTip(element, 'popover');
      if (tip && !element.contains(event.target) && !tip.contains(event.target)) instance.hide();
    });
  });
  listen(document, 'keydown', function (event) {
    if (event.key !== 'Escape') return;
    let hidden = false;
    [popovers, tooltips].forEach(function (instances) { instances.forEach(function (instance, element) {
      if (overlayTip(element, overlayRecords.get(element)?.type) && (element === event.target || element.contains(event.target) || instances === popovers)) { instance.hide(); hidden = true; }
    }); });
    if (hidden) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  listen(window, 'scroll', function (event) {
    if (openSelect && !openSelect.menu.contains(event.target)) closeSelect();
  }, true);

  let lightbox = null;
  let lightboxItems = [];
  let lightboxIndex = 0;
  let lightboxTrigger = null;
  let lightboxDefaults = { zoom: false, fullscreen: false, thumbnails: false, gestures: false, maxZoom: 4 };

  function createLightbox() {
    if (lightbox) return lightbox.destroying ? null : lightbox;
    if (!window.bootstrap || !window.bootstrap.Modal) return null;
    const dialog = document.createElement('div');
    dialog.className = 'modal fade brand-lightbox';
    dialog.tabIndex = -1;
    const titleId = 'brand-lightbox-title-' + (++selectSequence);
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('aria-hidden', 'true');
    dialog.innerHTML = '<div class="modal-dialog modal-xl modal-dialog-centered"><div class="modal-content">' +
      '<div class="modal-header"><h2 class="modal-title" id="' + titleId + '">Просмотр изображения</h2><div class="brand-lightbox-tools" hidden><button class="btn btn-secondary btn-sm" type="button" data-lightbox-command="out" aria-label="Уменьшить изображение">−</button><button class="btn btn-ghost btn-sm" type="button" data-lightbox-command="reset" aria-label="Сбросить масштаб">100%</button><button class="btn btn-secondary btn-sm" type="button" data-lightbox-command="in" aria-label="Увеличить изображение">+</button><button class="btn btn-secondary btn-sm" type="button" data-lightbox-command="fullscreen" aria-label="Полный экран" aria-pressed="false"><i data-lucide="maximize"></i></button></div><button class="btn btn-ghost btn-icon" type="button" data-bs-dismiss="modal" aria-label="Закрыть просмотр"><i data-lucide="x"></i></button></div>' +
      '<div class="modal-body brand-lightbox-stage"><img class="brand-lightbox-image" alt="" hidden><p class="brand-lightbox-loading" role="status">Загрузка изображения…</p><p class="brand-lightbox-error" role="alert" hidden>Не удалось загрузить изображение.</p>' +
      '<button class="btn btn-icon brand-lightbox-control brand-lightbox-prev" type="button" aria-label="Предыдущее изображение"><i data-lucide="chevron-left"></i></button><button class="btn btn-icon brand-lightbox-control brand-lightbox-next" type="button" aria-label="Следующее изображение"><i data-lucide="chevron-right"></i></button></div>' +
      '<nav class="brand-lightbox-thumbnails" aria-label="Миниатюры галереи" hidden></nav><p class="brand-lightbox-notice" role="status" hidden></p><div class="modal-footer brand-lightbox-footer"><p class="brand-lightbox-caption" aria-live="polite" aria-atomic="true"></p><span class="brand-lightbox-counter" aria-label="Номер изображения"></span><a class="btn btn-secondary btn-sm brand-lightbox-original" target="_blank" rel="noopener">Открыть оригинал<i data-lucide="external-link"></i></a></div></div></div>';
    document.body.append(dialog);
    const viewer = {
      dialog: dialog,
      stage: dialog.querySelector('.brand-lightbox-stage'),
      image: dialog.querySelector('.brand-lightbox-image'),
      caption: dialog.querySelector('.brand-lightbox-caption'),
      counter: dialog.querySelector('.brand-lightbox-counter'),
      original: dialog.querySelector('.brand-lightbox-original'),
      loading: dialog.querySelector('.brand-lightbox-loading'),
      error: dialog.querySelector('.brand-lightbox-error'),
      previous: dialog.querySelector('.brand-lightbox-prev'),
      next: dialog.querySelector('.brand-lightbox-next'),
      modal: window.bootstrap.Modal.getOrCreateInstance(dialog),
      request: 0,
      pending: null,
      outgoing: null,
      animations: []
    };
    viewer.phase = 'closed';
    setupLightboxFeatures(viewer);
    dialog.addEventListener('show.bs.modal', function () { viewer.phase = 'opening'; });
    dialog.addEventListener('shown.bs.modal', function () { viewer.phase = 'open'; if (viewer.destroying) viewer.modal.hide(); });
    viewer.previous.addEventListener('click', function () { showLightboxImage(lightboxIndex - 1, -1); });
    viewer.next.addEventListener('click', function () { showLightboxImage(lightboxIndex + 1, 1); });
    dialog.addEventListener('keydown', function (event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || lightboxItems.length < 2) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        showLightboxImage(lightboxIndex + direction, direction);
      }
    });
    dialog.addEventListener('hide.bs.modal', function () {
      viewer.phase = 'closing';
      exitLightboxFullscreen(viewer);
      setLightboxZoom(viewer, 1);
      cancelLightboxLoad(viewer);
      clearLightboxMotion(viewer);
    });
    dialog.addEventListener('hidden.bs.modal', function () {
      viewer.phase = 'closed';
      viewer.image.onload = null;
      viewer.image.onerror = null;
      viewer.image.removeAttribute('src');
      lightboxItems = [];
      viewer.thumbnails.replaceChildren();
      viewer.pointers.clear();
      if (lightboxTrigger && lightboxTrigger.isConnected) lightboxTrigger.focus();
      lightboxTrigger = null;
    });
    initIcons(dialog);
    lightbox = viewer;
    return viewer;
  }

  function cancelLightboxLoad(viewer) {
    viewer.request += 1;
    if (!viewer.pending) return;
    viewer.pending.onload = null;
    viewer.pending.onerror = null;
    viewer.pending.removeAttribute('src');
    viewer.pending = null;
  }

  function clearLightboxMotion(viewer) {
    viewer.animations.forEach(function (animation) { animation.cancel(); });
    viewer.animations = [];
    if (viewer.outgoing) viewer.outgoing.remove();
    viewer.outgoing = null;
    viewer.stage.style.height = '';
  }

  function revealLightboxImage(viewer, incoming, direction) {
    const previous = viewer.image;
    const oldHeight = viewer.stage.getBoundingClientRect().height;
    const motion = getComputedStyle(viewer.dialog).getPropertyValue('--ui-motion-normal').trim();
    const time = parseFloat(motion);
    const duration = Number.isFinite(time) ? Math.max(0, time * (motion.endsWith('ms') ? 1 : motion.endsWith('s') ? 1000 : 1)) : 180;
    const animate = duration > 0 && !previous.hidden && previous.hasAttribute('src') && previous.src !== incoming.src && viewer.dialog.classList.contains('show') && typeof incoming.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    clearLightboxMotion(viewer);
    previous.onload = previous.onerror = null;
    incoming.onload = incoming.onerror = null;
    viewer.stage.replaceChild(incoming, previous);
    viewer.image = incoming;
    viewer.pending = null;
    viewer.loading.hidden = true;
    viewer.error.hidden = true;
    viewer.ready = true;
    updateLightboxFeatures(viewer);
    if (!animate) return;

    // Keep the decoded previous frame visible while the new frame fades in.
    previous.classList.add('brand-lightbox-outgoing');
    previous.setAttribute('aria-hidden', 'true');
    previous.alt = '';
    viewer.stage.append(previous);
    viewer.outgoing = previous;
    const newHeight = Math.max(160, incoming.getBoundingClientRect().height);
    viewer.stage.style.height = newHeight + 'px';
    const easing = getComputedStyle(viewer.dialog).getPropertyValue('--ui-ease-standard').trim() || 'cubic-bezier(.2, .7, .2, 1)';
    const options = { duration: duration, easing: easing };
    const distance = (direction || 0) * 16;
    const enter = incoming.animate([{ opacity: 0, transform: 'translateX(' + distance + 'px)' }, { opacity: 1, transform: 'translateX(0)' }], options);
    const leave = previous.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(' + (-distance) + 'px)' }], options);
    const resize = viewer.stage.animate([{ height: oldHeight + 'px' }, { height: newHeight + 'px' }], options);
    viewer.animations = [enter, leave, resize];
    enter.onfinish = function () {
      if (viewer.image === incoming) clearLightboxMotion(viewer);
    };
  }

  function showLightboxImage(index, direction) {
    if (!lightbox || !lightboxItems.length) return;
    const viewer = lightbox;
    cancelLightboxLoad(viewer);
    const request = viewer.request;
    clearLightboxMotion(viewer);
    setLightboxZoom(viewer, 1);
    viewer.ready = false;
    viewer.pointers.clear();
    lightboxIndex = (index + lightboxItems.length) % lightboxItems.length;
    const link = lightboxItems[lightboxIndex];
    const caption = link.dataset.lightboxCaption || link.querySelector('img')?.alt || 'Изображение';
    const source = link.href;
    lightbox.caption.textContent = caption;
    lightbox.counter.textContent = (lightboxIndex + 1) + ' / ' + lightboxItems.length;
    lightbox.loading.hidden = false;
    lightbox.error.hidden = true;
    lightbox.original.href = source;
    lightbox.previous.hidden = lightbox.next.hidden = lightboxItems.length < 2;
    updateLightboxFeatures(viewer);
    viewer.dialog.dispatchEvent(new CustomEvent('brand:lightbox-change', { bubbles: true, detail: lightboxState() }));
    const incoming = new Image();
    incoming.className = 'brand-lightbox-image';
    incoming.alt = caption;
    viewer.pending = incoming;
    incoming.onload = function () {
      const ready = function () {
        if (viewer.request === request) revealLightboxImage(viewer, incoming, direction);
      };
      if (typeof incoming.decode === 'function') incoming.decode().then(ready, ready);
      else ready();
    };
    incoming.onerror = function () {
      if (viewer.request !== request) return;
      incoming.onload = incoming.onerror = null;
      viewer.pending = null;
      viewer.loading.hidden = true;
      viewer.error.hidden = false;
      clearLightboxMotion(viewer);
      viewer.image.hidden = true;
      viewer.image.removeAttribute('src');
      updateLightboxFeatures(viewer);
    };
    incoming.src = source;
  }

  function lightboxState() {
    return { index: lightboxIndex, total: lightboxItems.length, zoom: lightbox?.zoom || 1, fullscreen: Boolean(lightbox && document.fullscreenElement === lightbox.dialog), open: lightbox?.phase === 'open' };
  }

  function updateLightboxFeatures(viewer) {
    const options = viewer.options || lightboxDefaults;
    viewer.tools.hidden = !options.zoom && !options.fullscreen;
    viewer.dialog.classList.toggle('brand-lightbox-rich', Boolean(options.zoom || options.thumbnails));
    viewer.tools.querySelectorAll('[data-lightbox-command]').forEach(function (button) {
      const command = button.dataset.lightboxCommand;
      button.hidden = command === 'fullscreen' ? !options.fullscreen : !options.zoom;
      button.disabled = command !== 'fullscreen' && (!viewer.ready || (command === 'out' && viewer.zoom <= 1) || (command === 'in' && viewer.zoom >= options.maxZoom));
      if (command === 'reset') button.textContent = Math.round(viewer.zoom * 100) + '%';
      if (command === 'fullscreen') { button.disabled = !viewer.dialog.requestFullscreen || !document.fullscreenEnabled; button.setAttribute('aria-pressed', String(document.fullscreenElement === viewer.dialog)); }
    });
    viewer.thumbnails.hidden = !options.thumbnails || lightboxItems.length < 2;
    viewer.thumbnails.querySelectorAll('button').forEach(function (button, index) { button.tabIndex = index === lightboxIndex ? 0 : -1; if (index === lightboxIndex) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current'); });
    viewer.stage.tabIndex = options.zoom ? 0 : -1;
    viewer.stage.setAttribute('aria-label', options.zoom ? 'Изображение. Плюс и минус меняют масштаб, 0 сбрасывает. Стрелки перемещают увеличенное изображение.' : 'Изображение');
    viewer.stage.style.touchAction = viewer.zoom > 1 && options.gestures ? 'none' : 'pan-y pinch-zoom';
    viewer.stage.classList.toggle('is-zoomed', viewer.zoom > 1);
  }

  function setLightboxZoom(viewer, value, x, y) {
    clearLightboxMotion(viewer);
    viewer.zoom = Math.max(1, Math.min(viewer.options?.maxZoom || 4, value));
    const maxX = Math.max(0, (viewer.image.offsetWidth * viewer.zoom - viewer.stage.clientWidth) / 2);
    const maxY = Math.max(0, (viewer.image.offsetHeight * viewer.zoom - viewer.stage.clientHeight) / 2);
    viewer.panX = viewer.zoom === 1 ? 0 : Math.max(-maxX, Math.min(maxX, x ?? viewer.panX ?? 0));
    viewer.panY = viewer.zoom === 1 ? 0 : Math.max(-maxY, Math.min(maxY, y ?? viewer.panY ?? 0));
    viewer.image.style.transform = viewer.zoom === 1 ? '' : 'translate(' + viewer.panX + 'px,' + viewer.panY + 'px) scale(' + viewer.zoom + ')';
    updateLightboxFeatures(viewer);
    viewer.dialog.dispatchEvent(new CustomEvent('brand:lightbox-zoom', { bubbles: true, detail: lightboxState() }));
  }

  async function exitLightboxFullscreen(viewer) {
    if (document.fullscreenElement === viewer.dialog && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch (_) { /* Closing remains available if the browser rejects fullscreen exit. */ }
    }
  }

  function buildLightboxThumbnails(viewer) {
    viewer.thumbnails.replaceChildren();
    if (!viewer.options.thumbnails) return;
    lightboxItems.forEach(function (link, index) {
      const button = document.createElement('button'), image = document.createElement('img');
      button.type = 'button'; button.dataset.lightboxThumbnail = index;
      button.setAttribute('aria-label', 'Изображение ' + (index + 1) + ': ' + (link.dataset.lightboxCaption || link.querySelector('img')?.alt || 'Изображение'));
      image.src = link.querySelector('img')?.src || link.href; image.alt = ''; image.loading = 'lazy';
      button.append(image); viewer.thumbnails.append(button);
    });
  }

  function setupLightboxFeatures(viewer) {
    viewer.options = Object.assign({}, lightboxDefaults); viewer.zoom = 1; viewer.panX = viewer.panY = 0; viewer.ready = false;
    viewer.tools = viewer.dialog.querySelector('.brand-lightbox-tools'); viewer.thumbnails = viewer.dialog.querySelector('.brand-lightbox-thumbnails');
    viewer.notice = viewer.dialog.querySelector('.brand-lightbox-notice'); viewer.pointers = new Map();
    viewer.tools.addEventListener('click', async function (event) {
      const button = event.target.closest('[data-lightbox-command]'); if (!button || button.disabled) return;
      const command = button.dataset.lightboxCommand;
      if (command === 'fullscreen') {
        try { if (document.fullscreenElement === viewer.dialog) await document.exitFullscreen(); else await viewer.dialog.requestFullscreen(); viewer.notice.hidden = true; if (viewer.destroying || viewer.phase === 'closing' || viewer.phase === 'closed') await exitLightboxFullscreen(viewer); }
        catch (_) { viewer.notice.textContent = 'Браузер не разрешил полноэкранный режим.'; viewer.notice.hidden = false; }
      } else setLightboxZoom(viewer, command === 'reset' ? 1 : viewer.zoom + (command === 'in' ? .5 : -.5));
    });
    function choose(index, focus) {
      showLightboxImage(index, index < lightboxIndex ? -1 : 1);
      const button = viewer.thumbnails.querySelector('[data-lightbox-thumbnail="' + lightboxIndex + '"]');
      if (focus) button?.focus({ preventScroll: true });
      if (button) { const left = button.offsetLeft, right = left + button.offsetWidth; if (left < viewer.thumbnails.scrollLeft) viewer.thumbnails.scrollLeft = left; else if (right > viewer.thumbnails.scrollLeft + viewer.thumbnails.clientWidth) viewer.thumbnails.scrollLeft = right - viewer.thumbnails.clientWidth; }
    }
    viewer.thumbnails.addEventListener('click', function (event) { const button = event.target.closest('button'); if (button) choose(Number(button.dataset.lightboxThumbnail), true); });
    viewer.thumbnails.addEventListener('keydown', function (event) {
      const directions = { ArrowLeft: -1, ArrowRight: 1 };
      if (event.key in directions || event.key === 'Home' || event.key === 'End') { event.preventDefault(); event.stopPropagation(); choose(event.key === 'Home' ? 0 : event.key === 'End' ? lightboxItems.length - 1 : lightboxIndex + directions[event.key], true); }
    });
    viewer.stage.addEventListener('keydown', function (event) {
      if (event.target !== viewer.stage || !viewer.options.zoom || !viewer.ready || event.altKey || event.ctrlKey || event.metaKey) return;
      if (['+', '=', '-', '0'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); setLightboxZoom(viewer, event.key === '0' ? 1 : viewer.zoom + (event.key === '-' ? -.5 : .5)); }
      else if (viewer.zoom > 1 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); setLightboxZoom(viewer, viewer.zoom, viewer.panX + (event.key === 'ArrowLeft' ? 40 : event.key === 'ArrowRight' ? -40 : 0), viewer.panY + (event.key === 'ArrowUp' ? 40 : event.key === 'ArrowDown' ? -40 : 0)); }
    });
    viewer.stage.addEventListener('pointerdown', function (event) {
      if (!viewer.options.gestures || !viewer.ready || event.target.closest('button') || (viewer.zoom === 1 && event.pointerType === 'mouse')) return;
      viewer.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, multi: false });
      if (viewer.pointers.size > 1) viewer.pointers.forEach(function (pointer) { pointer.multi = true; });
      if (viewer.zoom > 1) { try { viewer.stage.setPointerCapture(event.pointerId); } catch (_) {} }
    });
    viewer.stage.addEventListener('pointermove', function (event) {
      const pointer = viewer.pointers.get(event.pointerId); if (!pointer || viewer.zoom === 1) return;
      if (viewer.pointers.size === 1) setLightboxZoom(viewer, viewer.zoom, viewer.panX + event.clientX - pointer.lastX, viewer.panY + event.clientY - pointer.lastY);
      pointer.lastX = event.clientX; pointer.lastY = event.clientY;
    });
    function endPointer(event) {
      const pointer = viewer.pointers.get(event.pointerId), multi = viewer.pointers.size > 1; viewer.pointers.delete(event.pointerId);
      if (!pointer || pointer.multi || multi || event.type === 'pointercancel' || viewer.zoom > 1) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) showLightboxImage(lightboxIndex + (dx > 0 ? -1 : 1), dx > 0 ? -1 : 1);
    }
    viewer.stage.addEventListener('pointerup', endPointer); viewer.stage.addEventListener('pointercancel', endPointer);
    viewer.fullscreenChange = function () { if (!viewer.destroying) { setLightboxZoom(viewer, viewer.zoom); viewer.dialog.dispatchEvent(new CustomEvent('brand:lightbox-fullscreen', { bubbles: true, detail: lightboxState() })); } };
    viewer.resize = function () { if (viewer.phase !== 'closed' && !viewer.destroying) setLightboxZoom(viewer, viewer.zoom); };
    document.addEventListener('fullscreenchange', viewer.fullscreenChange); window.addEventListener('resize', viewer.resize);
  }

  function openLightbox(link, options) {
    if (!(link instanceof HTMLAnchorElement) || !link.hasAttribute('href')) return false;
    const viewer = createLightbox();
    if (!viewer) return false;
    viewer.options = Object.assign({}, lightboxDefaults);
    ['zoom', 'fullscreen', 'thumbnails', 'gestures'].forEach(function (key) { const value = link.getAttribute('data-lightbox-' + key); if (value !== null) viewer.options[key] = value === '' || value === 'true'; });
    Object.assign(viewer.options, options || {});
    viewer.options.maxZoom = Math.max(1, Math.min(8, Number(viewer.options.maxZoom) || 4));
    const styles = getComputedStyle(link);
    for (const property of styles) { if (property.startsWith('--ui-') || property.startsWith('--bs-')) viewer.dialog.style.setProperty(property, styles.getPropertyValue(property)); }
    viewer.dialog.setAttribute('data-bs-theme', link.closest('[data-bs-theme]')?.getAttribute('data-bs-theme') || document.documentElement.getAttribute('data-bs-theme') || 'light');
    const group = link.dataset.lightboxGroup;
    lightboxItems = group ? Array.from(document.querySelectorAll('a[data-lightbox][href]')).filter(function (item) { return item.dataset.lightboxGroup === group; }) : [link];
    if (!lightboxItems.includes(link)) lightboxItems = [link];
    if (!viewer.dialog.classList.contains('show')) lightboxTrigger = link;
    buildLightboxThumbnails(viewer);
    showLightboxImage(lightboxItems.indexOf(link));
    viewer.modal.show();
    return true;
  }

  function closeLightbox() {
    if (lightbox) lightbox.modal.hide();
  }

  listen(document, 'click', function (event) {
    const link = event.target.closest('a[data-lightbox]');
    if (!link || !managed(link) || event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (openLightbox(link)) event.preventDefault();
  });

  function initIcons(container) {
    if (!window.lucide) return;
    elements(container, '[data-lucide]').forEach(function (source) {
      if (source.namespaceURI === 'http://www.w3.org/2000/svg') return;
      const name = source.dataset.lucide;
      const key = name.replace(/(^|[-_ ])([a-z])/g, function (_, separator, letter) { return letter.toUpperCase(); });
      const definition = window.lucide.icons[key];
      if (!definition) return;
      const attrs = Object.assign({}, definition[1]);
      Array.from(source.attributes).forEach(function (attr) { attrs[attr.name] = attr.value; });
      attrs.class = 'lucide lucide-' + name + ' ' + (attrs.class || '');
      if (!source.hasAttribute('aria-label') && !source.hasAttribute('aria-labelledby')) attrs['aria-hidden'] = 'true';
      attrs.focusable = 'false';
      const element = window.lucide.createElement([definition[0], attrs, definition[2]]);
      source.replaceWith(element);
      icons.add({ source: source, element: element });
    });
  }

  function overlayTip(element, type) {
    return (element.getAttribute('aria-describedby') || '').split(/\s+/).map(function (id) { return document.getElementById(id); }).find(function (tip) { return tip?.classList.contains(type); });
  }

  function initOverlay(element, type) {
    const Component = window.bootstrap[type === 'popover' ? 'Popover' : 'Tooltip'];
    if (!Component || Component.getInstance(element)) return;
    const original = { describedby: element.getAttribute('aria-describedby'), expanded: element.getAttribute('aria-expanded'), controls: element.getAttribute('aria-controls'), title: element.getAttribute('title'), label: element.getAttribute('aria-label'), originalTitle: element.getAttribute('data-bs-original-title') };
    const instance = new Component(element, { container: document.body, trigger: type === 'popover' ? 'click' : 'hover focus', animation: false, html: false, sanitize: true });
    function restore(name, value) { if (value === null) element.removeAttribute(name); else element.setAttribute(name, value); }
    function inserted() {
      const tip = overlayTip(element, type);
      if (!tip) return;
      const styles = getComputedStyle(element);
      for (const property of styles) { if (property.startsWith('--ui-') || property.startsWith('--bs-')) tip.style.setProperty(property, styles.getPropertyValue(property)); }
      element.setAttribute('aria-describedby', [original.describedby, tip.id].filter(Boolean).join(' '));
      if (type === 'popover') { element.setAttribute('aria-controls', tip.id); element.setAttribute('aria-expanded', 'true'); }
    }
    function hidden() { restore('aria-describedby', original.describedby); if (type === 'popover') { restore('aria-controls', original.controls); element.setAttribute('aria-expanded', 'false'); } }
    const events = { ['inserted.bs.' + type]: inserted, ['hidden.bs.' + type]: hidden };
    Object.entries(events).forEach(function (entry) { element.addEventListener(entry[0], entry[1]); });
    if (type === 'popover') element.setAttribute('aria-expanded', 'false');
    overlayRecords.set(element, { type: type, events: events, original: original });
    (type === 'popover' ? popovers : tooltips).set(element, instance);
  }

  function disposeOverlay(element, instance) {
    const record = overlayRecords.get(element);
    if (record) Object.entries(record.events).forEach(function (entry) { element.removeEventListener(entry[0], entry[1]); });
    instance.dispose();
    if (record) {
      const attrs = { 'aria-describedby': record.original.describedby, title: record.original.title, 'aria-label': record.original.label, 'data-bs-original-title': record.original.originalTitle };
      if (record.type === 'popover') { attrs['aria-expanded'] = record.original.expanded; attrs['aria-controls'] = record.original.controls; }
      Object.entries(attrs).forEach(function (entry) { if (entry[1] === null) element.removeAttribute(entry[0]); else element.setAttribute(entry[0], entry[1]); });
      overlayRecords.delete(element);
    }
  }

  function destroyIcons(container) {
    icons.forEach(function (record) {
      if (within(container, record.element) || !record.element.isConnected) {
        if (record.element.parentNode) record.element.replaceWith(record.source);
        icons.delete(record);
      }
    });
  }

  function destroyLightbox() {
    if (!lightbox) return Promise.resolve();
    const viewer = lightbox;
    if (viewer.destroyPromise) return viewer.destroyPromise;
    viewer.destroying = true;
    cancelLightboxLoad(viewer);
    clearLightboxMotion(viewer);
    viewer.destroyPromise = new Promise(function (resolve) {
      async function finish() {
        await exitLightboxFullscreen(viewer);
        document.removeEventListener('fullscreenchange', viewer.fullscreenChange);
        window.removeEventListener('resize', viewer.resize);
        destroyIcons(viewer.dialog);
        viewer.modal.dispose();
        viewer.dialog.remove();
        if (lightbox === viewer) lightbox = null;
        resolve();
      }
      if (viewer.phase === 'closed') finish();
      else {
        viewer.dialog.addEventListener('hidden.bs.modal', finish, { once: true });
        if (viewer.phase === 'open') viewer.modal.hide();
      }
    });
    return viewer.destroyPromise;
  }

  function init(container) {
    container = container || document;
    if (!container.querySelectorAll) throw new TypeError('BrandUI.init expects a DOM container');
    scopes.forEach(function (scope) {
      if (within(container, scope) || (scope !== document && !scope.isConnected)) { lifecycle.delete(scope); scopes.delete(scope); }
    });
    lifecycle.set(container, true); scopes.add(container);
    attachListeners();
    selects.forEach(function (select) { if (!select.isConnected) destroySelect(select); });
    [tooltips, popovers].forEach(function (instances) { instances.forEach(function (instance, element) { if (!element.isConnected) { disposeOverlay(element, instance); instances.delete(element); } }); });
    icons.forEach(function (record) { if (!record.element.isConnected) icons.delete(record); });
    elements(container, phoneSelector).filter(managed).forEach(formatPhoneInput);
    elements(container, 'select.form-select').filter(managed).forEach(initSelect);
    initIcons(container);
    if (window.bootstrap) ['tooltip', 'popover'].forEach(function (type) { elements(container, '[data-bs-toggle="' + type + '"]').filter(managed).forEach(function (element) { initOverlay(element, type); }); });
    modules.forEach(function (module) { module.init(container); });
    return window.BrandUI;
  }

  function destroy(container) {
    container = container || document;
    if (!container.querySelectorAll) throw new TypeError('BrandUI.destroy expects a DOM container');
    scopes.forEach(function (scope) {
      if (within(container, scope) || (scope !== document && !scope.isConnected)) { lifecycle.delete(scope); scopes.delete(scope); }
    });
    lifecycle.set(container, false); scopes.add(container);
    selects.forEach(function (select) { if (within(container, select) || !select.isConnected) destroySelect(select); });
    [tooltips, popovers].forEach(function (instances) { instances.forEach(function (instance, element) {
      if (within(container, element) || !element.isConnected) { disposeOverlay(element, instance); instances.delete(element); }
    }); });
    destroyIcons(container);
    const pending = [];
    modules.forEach(function (module) { pending.push(module.destroy(container)); });
    if (container === document || (lightboxTrigger && within(container, lightboxTrigger))) pending.push(destroyLightbox());
    if (container === document) detachListeners();
    return Promise.all(pending).then(function () {});
  }

  window.BrandUI = Object.assign(window.BrandUI || {}, {
    init: init,
    destroy: destroy,
    icons: { init: initIcons },
    lightbox: { open: openLightbox, close: closeLightbox, destroy: destroyLightbox, configure: function (options) { lightboxDefaults = Object.assign({}, lightboxDefaults, options); }, getState: lightboxState },
    phone: { configure: function (options) {
      const next = Object.assign({}, phoneConfig, options);
      if (!['ru', 'international', 'none'].includes(next.format) || !Number.isInteger(next.maxDigits) || next.maxDigits < 1 || next.maxDigits > 16) throw new TypeError('Invalid phone format or maxDigits');
      phoneConfig = next;
      return Object.assign({}, phoneConfig);
    } },
    registerModule: function (name, module) {
      if (modules.has(name)) throw new Error('Module already registered: ' + name);
      modules.set(name, module);
      if (document.readyState !== 'loading' && managed(document)) module.init(document);
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { if (lifecycle.get(document) !== false) init(); }, { once: true });
  else init();
})();
