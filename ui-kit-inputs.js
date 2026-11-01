(function () {
  'use strict';
  const fields = new Map(), choices = new Map(), autocompletes = new Map(), uploads = new Map(), steppers = new Map();
  let sequence = 0;
  function attr(element, name, value) { if (value === null) element.removeAttribute(name); else element.setAttribute(name, value); }
  function elements(root, selector) { const list = Array.from(root.querySelectorAll(selector)); if (root instanceof Element && root.matches(selector)) list.unshift(root); return list; }
  function emit(root, name, detail) { root.dispatchEvent(new CustomEvent('brand:' + name, { bubbles: true, detail: detail })); }
  function inputEvents(input) { input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }
  function observer(root, update, attributes, children) { const instance = new MutationObserver(update); instance.observe(root, { attributes: true, subtree: true, childList: Boolean(children), attributeFilter: attributes }); return instance; }
  function ancestors(instance, source, forms) { for (let parent = source.parentElement; parent; parent = parent.parentElement) { if (parent.tagName === 'FIELDSET') instance.observe(parent, { attributes: true, attributeFilter: ['disabled'] }); if (forms && parent.tagName === 'FORM') instance.observe(parent, { attributes: true, attributeFilter: ['class'] }); } }

  function initField(root) {
    if (fields.has(root)) { fields.get(root).update(); return fields.get(root); }
    const input = root.querySelector('input, textarea');
    if (!input) throw new TypeError('Field requires an input or textarea');
    const buttons = Array.from(root.querySelectorAll('[data-field-clear], [data-field-reveal], [data-number-step]'));
    const originalButtons = buttons.map(button => ({ button: button, disabled: button.disabled, pressed: button.getAttribute('aria-pressed') }));
    const type = input.getAttribute('type');
    const counter = root.querySelector('[data-field-count]'), counterText = counter?.textContent;
    const reveal = root.querySelector('[data-field-reveal-label]'), revealText = reveal?.textContent;
    const rules = Array.from(root.querySelectorAll('[data-password-rule]')).map(rule => ({ element: rule, text: rule.textContent, state: rule.getAttribute('data-rule-valid') }));
    let destroyed = false;
    function update() {
      if (destroyed) return;
      const disabled = input.matches(':disabled');
      buttons.forEach(button => {
        const original = originalButtons.find(item => item.button === button);
        let unavailable = original.disabled || disabled || (input.readOnly && !button.hasAttribute('data-field-reveal'));
        if (button.hasAttribute('data-field-clear')) unavailable ||= !input.value;
        if (button.hasAttribute('data-number-step')) {
          const number = input.valueAsNumber, direction = Number(button.dataset.numberStep);
          unavailable ||= input.step === 'any' || (Number.isFinite(number) && ((direction > 0 && input.max !== '' && number >= Number(input.max)) || (direction < 0 && input.min !== '' && number <= Number(input.min))));
        }
        if (button.disabled !== unavailable) button.disabled = unavailable;
        if (button.hasAttribute('data-field-reveal')) button.setAttribute('aria-pressed', String(input.type === 'text'));
      });
      if (reveal) reveal.textContent = input.type === 'text' ? 'Скрыть' : 'Показать';
      if (counter) counter.textContent = input.value.length + (input.maxLength >= 0 ? ' / ' + input.maxLength : '') + ' символов';
      const tests = { length: value => value.length >= Math.max(1, input.minLength), lower: value => /[a-zа-яё]/.test(value), upper: value => /[A-ZА-ЯЁ]/.test(value), number: value => /\d/.test(value) };
      rules.forEach(rule => {
        const valid = Boolean(tests[rule.element.dataset.passwordRule]?.(input.value));
        rule.element.dataset.ruleValid = String(valid);
        rule.element.textContent = (valid ? 'Выполнено: ' : 'Требуется: ') + rule.text;
      });
    }
    function click(event) {
      const button = event.target.closest('button');
      if (!buttons.includes(button) || button.disabled || input.matches(':disabled')) return;
      if (button.hasAttribute('data-field-clear')) { input.value = ''; input.focus(); inputEvents(input); }
      else if (button.hasAttribute('data-field-reveal')) {
        const start = input.selectionStart, end = input.selectionEnd;
        input.type = input.type === 'password' ? 'text' : 'password'; input.focus();
        if (start !== null) input.setSelectionRange(start, end);
      } else {
        const before = input.value;
        try { if (Number(button.dataset.numberStep) > 0) input.stepUp(); else input.stepDown(); } catch { return; }
        if (before !== input.value) inputEvents(input);
      }
      update();
    }
    const observed = observer(input, update, ['disabled', 'readonly', 'min', 'max', 'step', 'maxlength', 'minlength', 'type']); ancestors(observed, input);
    function reset() { queueMicrotask(update); }
    const form = input.form;
    function destroy() {
      if (destroyed) return; destroyed = true; observed.disconnect();
      root.removeEventListener('click', click); input.removeEventListener('input', update); input.removeEventListener('change', update); form?.removeEventListener('reset', reset);
      attr(input, 'type', type); originalButtons.forEach(item => { item.button.disabled = item.disabled; attr(item.button, 'aria-pressed', item.pressed); });
      if (counter) counter.textContent = counterText; if (reveal) reveal.textContent = revealText;
      rules.forEach(rule => { rule.element.textContent = rule.text; attr(rule.element, 'data-rule-valid', rule.state); }); fields.delete(root);
    }
    const controller = { update: update, destroy: destroy };
    fields.set(root, controller); root.addEventListener('click', click); input.addEventListener('input', update); input.addEventListener('change', update); form?.addEventListener('reset', reset); update(); return controller;
  }

  function combo(source, options, nativeSelect) {
    if (nativeSelect ? !(source instanceof HTMLSelectElement) : !(source instanceof HTMLInputElement)) throw new TypeError('Expected select or text input');
    const instances = nativeSelect ? choices : autocompletes;
    if (instances.has(source)) { instances.get(source).update(); return instances.get(source); }
    let config = Object.assign({}, options), destroyed = false, state = 'ready', message = '', opened = false, active = -1, candidates = [], filtering = false, selecting = false;
    function normalize(items) {
      if (!Array.isArray(items)) throw new TypeError('Options must be an array');
      return items.map(item => { if (typeof item === 'string') return { value: item, label: item }; if (!item || item.value === undefined) throw new TypeError('Option requires a value'); return { value: String(item.value), label: String(item.label ?? item.value), disabled: Boolean(item.disabled) }; });
    }
    let suggestions = nativeSelect ? [] : normalize(config.options || JSON.parse(source.dataset.autocompleteOptions || '[]'));
    let expandedTags=false,maxVisibleTags=Number(source.dataset.choiceMaxTags??config.maxTags??3);
    if(!Number.isInteger(maxVisibleTags)||maxVisibleTags<0)throw new TypeError('maxTags must be a nonnegative integer');
    const originalAttributes = new Map(['role', 'aria-autocomplete', 'aria-haspopup', 'aria-busy', 'aria-expanded', 'aria-controls', 'aria-activedescendant', 'autocomplete', 'tabindex', 'aria-hidden'].map(name => [name, source.getAttribute(name)]));
    const originalClass = source.classList.contains('brand-select-native');
    const originalArrowClass = source.classList.contains('form-select');
    const id = 'brand-choice-' + (++sequence), root = document.createElement('div'); root.className = 'brand-choice';
    const input = nativeSelect ? document.createElement('input') : source;
    const tags = document.createElement('div'); tags.className = 'brand-chip-group brand-choice-tags';tags.id=id+'-tags';
    const menu = document.createElement('div'); menu.className = 'brand-select-menu brand-choice-menu'; menu.id = id + '-list'; menu.setAttribute('role', 'listbox'); menu.setAttribute('aria-label', nativeSelect ? 'Варианты' : 'Подсказки'); menu.hidden = true;
    const status = document.createElement('span'); status.className = 'visually-hidden'; status.setAttribute('role', 'status');
    const generatedLabels = new Map();
    if (nativeSelect) {
      source.after(root); root.append(tags, input, menu, status); input.type = 'text'; input.className = 'form-control form-select'; input.id = id;
      source.classList.add('brand-select-native'); source.tabIndex = -1; source.setAttribute('aria-hidden', 'true');
    } else { source.before(root); root.append(input, menu, status); input.classList.add('form-select'); }
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-haspopup', 'listbox'); input.setAttribute('aria-controls', menu.id); input.setAttribute('aria-expanded', 'false'); input.autocomplete = 'off';
    function multiple() { return nativeSelect && source.multiple; }
    function data() {
      if (!nativeSelect) return suggestions;
      return Array.from(source.options).filter(option => !option.hidden && !option.parentElement.hidden && option.value !== '').map(option => ({ value: option.value, label: option.label, disabled: option.disabled || (option.parentElement.tagName === 'OPTGROUP' && option.parentElement.disabled), option: option }));
    }
    function syncInput() {
      if (!nativeSelect || filtering) return;
      input.value = multiple() ? '' : source.value ? (source.selectedOptions[0]?.label || '') : '';
    }
    function position() {
      const styles = getComputedStyle(source);
      for (const property of styles) if (property.startsWith('--ui-') || property.startsWith('--bs-')) menu.style.setProperty(property, styles.getPropertyValue(property));
      const rect = input.getBoundingClientRect(),viewportWidth=window.visualViewport?.width||document.documentElement.clientWidth,leftLimit=(window.visualViewport?.offsetLeft||0)+8;
      menu.style.position = 'fixed'; menu.style.inset = 'auto';
      menu.style.width = 'max-content';
      menu.style.minWidth = Math.min(rect.width, Math.max(0, viewportWidth - 16)) + 'px';
      menu.style.maxWidth = Math.max(0, viewportWidth - 16) + 'px';
      const width = menu.getBoundingClientRect().width;
      menu.style.left = Math.max(leftLimit, Math.min(rect.left, leftLimit+viewportWidth-width-16)) + 'px';
      menu.style.maxHeight = '260px';
      const topLimit=(window.visualViewport?.offsetTop||0)+8,bottomLimit=(window.visualViewport?.offsetTop||0)+(window.visualViewport?.height||innerHeight)-8;
      const below = bottomLimit - rect.bottom - 6, above = rect.top - topLimit - 6;
      const upwards = below < Math.min(menu.scrollHeight + 2, 260) && above > below;
      menu.style.maxHeight = Math.max(40, Math.min(260, upwards ? above : below)) + 'px';
      menu.style.top = Math.max(topLimit,Math.min(upwards?rect.top-menu.getBoundingClientRect().height-6:rect.bottom+6,bottomLimit-menu.getBoundingClientRect().height))+'px';
    }
    function highlight(index) {
      active = index; menu.querySelectorAll('[role="option"]').forEach((element, i) => { element.classList.toggle('is-active', i === active); });
      const element = menu.querySelectorAll('[role="option"]')[active];
      if (element) { input.setAttribute('aria-activedescendant', element.id); element.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }
      else input.removeAttribute('aria-activedescendant');
    }
    function renderMenu() {
      const query = filtering ? input.value.trim().toLocaleLowerCase() : '';
      candidates = state === 'ready' ? data().filter(item => item.label.toLocaleLowerCase().includes(query)) : [];
      menu.replaceChildren(); active = -1; input.removeAttribute('aria-activedescendant');
      if (!candidates.length) {
        const empty = document.createElement('p'); empty.className = 'brand-choice-message'; empty.textContent = message || ({ loading: 'Загрузка…', error: 'Не удалось получить варианты.' }[state] || 'Ничего не найдено.'); menu.append(empty); status.textContent = empty.textContent;
      } else {
        candidates.forEach((item, index) => {
          const element = document.createElement('div'); element.className = 'brand-select-option'; element.id = id + '-option-' + index; element.setAttribute('role', 'option'); element.setAttribute('aria-disabled', String(item.disabled)); element.setAttribute('aria-selected', String(nativeSelect ? item.option.selected : item.value === input.value)); element.textContent = item.label;
          element.addEventListener('pointermove', () => { if (!item.disabled) highlight(index); });
          element.addEventListener('click', () => choose(index)); menu.append(element);
        }); status.textContent = 'Найдено вариантов: ' + candidates.length;
      }
      menu.setAttribute('aria-multiselectable', String(Boolean(multiple()))); menu.setAttribute('aria-busy', String(state === 'loading'));
      input.setAttribute('aria-busy', String(state === 'loading'));
      if (opened) position();
    }
    function close() { if (!opened) return; opened = false; filtering = false; menu.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); root.insertBefore(menu, status); syncInput(); }
    function open(filter) {
      if (destroyed || source.matches(':disabled') || source.readOnly) return;
      if (filter !== undefined) filtering = filter;
      opened = true; document.body.append(menu); menu.hidden = false; input.setAttribute('aria-expanded', 'true'); renderMenu();
    }
    function selectChanged() { update(); selecting = true; try { inputEvents(source); } finally { selecting = false; } emit(source, nativeSelect ? 'choice-change' : 'autocomplete-select', { values: nativeSelect ? Array.from(source.selectedOptions).map(option => option.value) : [source.value], controller: controller }); }
    function choose(index) {
      const item = candidates[index];
      if (!item || item.disabled || source.matches(':disabled') || state !== 'ready') return;
      if (nativeSelect) {
        if (multiple()) { item.option.selected = !item.option.selected; input.value = ''; filtering = false; }
        else { source.value = item.value; close(); }
      } else { source.value = item.value; close(); }
      selectChanged(); if (multiple()) renderMenu(); input.focus({ preventScroll: true });
    }
    function update() {
      if (destroyed) return;
      root.hidden = source.hidden;
      if (nativeSelect) {
        for (const size of ['sm', 'lg']) input.classList.toggle('form-control-' + size, source.classList.contains('form-select-' + size) || source.classList.contains('form-control-' + size));
        for (const state of ['is-valid', 'is-invalid']) input.classList.toggle(state, source.classList.contains(state));
        attr(root, 'data-ui-density', source.getAttribute('data-ui-density'));
        input.disabled = source.matches(':disabled'); input.setAttribute('aria-required', String(source.required)); input.placeholder = config.placeholder || source.options[0]?.label || 'Выберите значение';
        input.setAttribute('aria-invalid', String(source.getAttribute('aria-invalid') === 'true' || source.classList.contains('is-invalid') || Boolean(source.closest('.was-validated') && !source.validity.valid)));
        const descriptions = source.getAttribute('aria-describedby'); attr(input, 'aria-describedby', descriptions);
        let labels = source.getAttribute('aria-labelledby');
        if (!labels && !source.hasAttribute('aria-label')) labels = Array.from(source.labels || []).map((label, index) => { if (!label.id) { label.id = id + '-label-' + index; generatedLabels.set(label, label.id); } return label.id; }).join(' ');
        attr(input, 'aria-labelledby', labels || null); attr(input, 'aria-label', labels ? null : source.getAttribute('aria-label') || source.name || 'Выберите значение'); attr(menu, 'aria-labelledby', labels || null);
        if (!labels) menu.setAttribute('aria-label', source.getAttribute('aria-label') || source.name || 'Варианты');
        const focusedTag = document.activeElement?.dataset.choiceRemove;
        tags.replaceChildren(); tags.hidden = !multiple();
        const selected=Array.from(source.selectedOptions).filter(option=>option.value!=='');
        const requestedTags=Number(source.dataset.choiceMaxTags??config.maxTags??3);if(Number.isInteger(requestedTags)&&requestedTags>=0)maxVisibleTags=requestedTags;
        const maxTags=maxVisibleTags;
        if (multiple()) selected.slice(0,expandedTags||maxTags===0?undefined:maxTags).forEach(option => {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'brand-chip'; button.textContent = option.label + ' ×'; button.dataset.choiceRemove = option.value; button.setAttribute('aria-label', 'Удалить ' + option.label); button.disabled = input.disabled || option.disabled || (option.parentElement.tagName === 'OPTGROUP' && option.parentElement.disabled);
          button.addEventListener('click', () => { option.selected = false; update(); inputEvents(source); emit(source, 'choice-change', { values: Array.from(source.selectedOptions).map(item => item.value), controller: controller }); input.focus(); }); tags.append(button);
        });
        if(multiple()&&maxTags>0&&selected.length>maxTags){const toggle=document.createElement('button');toggle.type='button';toggle.className='brand-chip';toggle.dataset.choiceExpand='';toggle.textContent=expandedTags?'Свернуть':'Ещё '+(selected.length-maxTags);toggle.setAttribute('aria-expanded',String(expandedTags));toggle.setAttribute('aria-controls',tags.id);toggle.disabled=input.disabled;toggle.addEventListener('click',()=>{expandedTags=!expandedTags;update();tags.querySelector('[data-choice-expand]')?.focus();});tags.append(toggle);}
        if (focusedTag) (Array.from(tags.children).find(button => button.dataset.choiceRemove === focusedTag) || input).focus();
        syncInput();
      }
      if (source.matches(':disabled') || source.readOnly) close();
      if (opened) renderMenu();
    }
    function typed(event) { if (!selecting && !event.isComposing) { filtering = true; open(true); } }
    function key(event) {
      if (event.isComposing) return;
      if (event.key === 'Escape' && opened) { event.preventDefault(); event.stopPropagation(); close(); }
      else if (event.key === 'Tab') close();
      else if (event.key === 'Enter' && opened) { event.preventDefault(); if (active >= 0) choose(active); else if (!nativeSelect) close(); }
      else if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault(); if (!opened) open(false);
        const enabled = candidates.map((item, index) => item.disabled ? -1 : index).filter(index => index >= 0);
        const index = enabled.indexOf(active), direction = event.key === 'ArrowDown' ? 1 : -1;
        const next = index < 0 ? (direction > 0 ? enabled[0] : enabled.at(-1)) : enabled[Math.max(0, Math.min(enabled.length - 1, index + direction))];
        highlight(next ?? -1);
      }
    }
    function focus() { open(false); }
    function blurred() { queueMicrotask(() => { if (!root.contains(document.activeElement)) close(); }); }
    function outside(event) { if (!root.contains(event.target) && !menu.contains(event.target)) close(); }
    function scroll(event) { if (opened && !menu.contains(event.target)) { if (document.activeElement === input) position(); else close(); } }
    function resize() { if (opened) position(); }
    function focusSource() { if (nativeSelect) input.focus(); }
    function preventBlur(event) { event.preventDefault(); }
    function reset() { queueMicrotask(() => { expandedTags=false;close(); update(); }); }
    const observed = observer(source, update, ['disabled', 'required', 'hidden', 'aria-invalid', 'aria-describedby', 'aria-label', 'aria-labelledby', 'selected', 'label', 'multiple', 'readonly', 'class', 'data-ui-density', 'data-choice-max-tags'], true);
    ancestors(observed, source, true);
    const form = source.form;
    const events = [[input, 'input', typed], [input, 'compositionend', typed], [input, 'keydown', key], [input, 'focus', focus], [input, 'blur', blurred], [source, 'change', update], [source, 'focus', focusSource], [menu, 'pointerdown', preventBlur], [document, 'pointerdown', outside], [window, 'resize', resize], [window, 'scroll', scroll, true]];
    if (form) events.push([form, 'reset', reset]); events.forEach(event => event[0].addEventListener(event[1], event[2], Boolean(event[3])));
    if(window.visualViewport)for(const name of ['resize','scroll']){window.visualViewport.addEventListener(name,resize);events.push([window.visualViewport,name,resize]);}
    function destroy() {
      if (destroyed) return; close(); destroyed = true; observed.disconnect(); events.forEach(event => event[0].removeEventListener(event[1], event[2], Boolean(event[3])));
      if (nativeSelect) root.remove(); else root.replaceWith(source);
      originalAttributes.forEach((value, name) => attr(source, name, value)); if (nativeSelect) source.classList.toggle('brand-select-native', originalClass);
      else source.classList.toggle('form-select', originalArrowClass);
      generatedLabels.forEach((value, label) => { if (label.id === value) label.removeAttribute('id'); }); instances.delete(source);
    }
    const controller = { open: open, close: close, update: update, destroy: destroy, getState: () => state, setState: (next, text) => { if (destroyed) return; if (!['ready', 'loading', 'error'].includes(next)) throw new TypeError('Unknown choice state'); state = next; message = text || ''; update(); }, setOptions: items => {
      if (destroyed) return;
      const normalized = normalize(items);
      if (nativeSelect) {
        if (new Set(normalized.map(item => item.value)).size !== normalized.length) throw new TypeError('Duplicate choice values');
        const selected = new Set(Array.from(source.selectedOptions).map(option => option.value)); source.replaceChildren(...normalized.map(item => { const option = new Option(item.label, item.value, false, selected.has(item.value)); option.disabled = item.disabled; return option; }));
      } else suggestions = normalized;
      update();
    } };
    instances.set(source, controller); update(); return controller;
  }

  function initUpload(root) {
    if (uploads.has(root)) return uploads.get(root);
    const input = root.querySelector('input[type="file"]'), list = root.querySelector('[data-upload-list]'), status = root.querySelector('[data-upload-status]');
    if (!input || !list || !status) throw new TypeError('Upload requires file input, list and status');
    let destroyed = false, files = Array.from(input.files), urls = [], depth = 0;
    const originalList = Array.from(list.childNodes), originalStatus = { text: status.textContent, role: status.getAttribute('role') }, originalDrag = root.classList.contains('is-dragging');
    function accepts(file) { const accept = input.accept.split(',').map(value => value.trim().toLowerCase()).filter(Boolean); return !accept.length || accept.some(rule => rule.startsWith('.') ? file.name.toLowerCase().endsWith(rule) : rule.endsWith('/*') ? file.type.toLowerCase().startsWith(rule.slice(0, -1)) : file.type.toLowerCase() === rule); }
    function error(text) { status.textContent = text; status.setAttribute('role', 'alert'); }
    function render() {
      urls.forEach(URL.revokeObjectURL); urls = []; list.replaceChildren();
      files.forEach((file, index) => {
        const item = document.createElement('li'); item.className = 'brand-upload-file';
        if (/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type)) { item.classList.add('has-preview'); const image = document.createElement('img'); image.src = URL.createObjectURL(file); urls.push(image.src); image.alt = ''; item.append(image); }
        const label = document.createElement('span'); label.textContent = file.name + ' · ' + Math.ceil(file.size / 1024) + ' КБ';
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-ghost btn-sm'; button.textContent = 'Удалить'; button.setAttribute('aria-label', 'Удалить файл ' + file.name); button.disabled = input.matches(':disabled'); button.addEventListener('click', () => { if (commit(files.filter((_, i) => i !== index))) { (list.querySelectorAll('button')[index] || list.querySelectorAll('button')[index - 1] || input).focus(); } }); item.append(label, button); list.append(item);
      });
    }
    function commit(next) {
      if (destroyed || input.matches(':disabled')) return false;
      try { const transfer = new DataTransfer(); next.forEach(file => transfer.items.add(file)); input.files = transfer.files; }
      catch { error('Этот браузер не поддерживает изменение списка файлов. Выберите файлы заново.'); return false; }
      files = next; render(); status.textContent = files.length ? 'Выбрано файлов: ' + files.length : 'Файлы не выбраны.'; status.setAttribute('role', 'status');
      const previous = changing; changing = true; try { inputEvents(input); } finally { changing = previous; }
      emit(input, 'files-change', { files: files.slice(), controller: controller }); return true;
    }
    function add(incoming, replace) {
      if (destroyed || input.matches(':disabled')) return false;
      const next = replace ? [] : files.slice(), errors = [], maxSize = Number(root.dataset.uploadMaxSize) || Infinity, maxFiles = input.multiple ? Number(root.dataset.uploadMaxFiles) || Infinity : 1;
      Array.from(incoming).forEach(file => {
        if (!accepts(file)) errors.push(file.name + ': неподдерживаемый формат.');
        else if (file.size > maxSize) errors.push(file.name + ': превышен размер файла.');
        else if (next.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) return;
        else if (next.length >= maxFiles) errors.push('Допустимо файлов: ' + maxFiles + '.');
        else next.push(file);
      });
      const changed = commit(next); if (errors.length) error(errors.join(' ')); return changed;
    }
    let changing = false;
    function changed() { if (changing) return; changing = true; try { add(input.files, true); } finally { changing = false; } }
    function drag(event) {
      event.preventDefault();
      if (event.type === 'dragenter') depth++;
      if (event.type === 'dragleave') depth = Math.max(0, depth - 1);
      if (event.type === 'drop') { depth = 0; if (!input.matches(':disabled')) add(event.dataTransfer.files, !input.multiple); }
      root.classList.toggle('is-dragging', depth > 0 && !input.matches(':disabled'));
    }
    function reset() { queueMicrotask(() => { files = Array.from(input.files); render(); status.textContent = 'Файлы не выбраны.'; status.setAttribute('role', 'status'); }); }
    const form = input.form, observed = observer(input, render, ['disabled']);
    ancestors(observed, input);
    function destroy() { if (destroyed) return; destroyed = true; observed.disconnect(); urls.forEach(URL.revokeObjectURL); input.removeEventListener('change', changed); ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => root.removeEventListener(name, drag)); form?.removeEventListener('reset', reset); list.replaceChildren(...originalList); status.textContent = originalStatus.text; attr(status, 'role', originalStatus.role); root.classList.toggle('is-dragging', originalDrag); uploads.delete(root); }
    const controller = { add: files => { changing = true; try { return add(files, false); } finally { changing = false; } }, remove: index => { if (!Number.isInteger(index) || index < 0 || index >= files.length) return false; changing = true; try { return commit(files.filter((_, i) => i !== index)); } finally { changing = false; } }, clear: () => { changing = true; try { return commit([]); } finally { changing = false; } }, getFiles: () => files.slice(), destroy: destroy };
    uploads.set(root, controller); input.addEventListener('change', changed); ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => root.addEventListener(name, drag)); form?.addEventListener('reset', reset); render(); return controller;
  }

  function initStepper(form) {
    if (steppers.has(form)) return steppers.get(form);
    if (!BrandUI.forms) throw new TypeError('Stepper requires ui-kit-forms.js');
    BrandUI.forms.init(form);
    const panels = Array.from(form.querySelectorAll('[data-step-panel]')), indicators = Array.from(form.querySelectorAll('[data-step-indicator]'));
    if (!panels.length) throw new TypeError('Stepper requires panels');
    const fields = new Map(), originalInvalid = new Map(), originals = panels.map(panel => ({ panel: panel, hidden: panel.hidden, inert: panel.inert }));
    const indicatorStates = indicators.map(indicator => indicator.getAttribute('aria-current'));
    const buttons = Array.from(form.querySelectorAll('[data-step-prev], [data-step-next], [data-step-submit]')).map(button => ({ button: button, hidden: button.hidden, disabled: button.disabled }));
    const summary = form.querySelector('[data-step-summary]'), summaryNodes = summary ? Array.from(summary.childNodes) : [];
    let current = 0, destroyed = false;
    function controls(panel) { return Array.from(panel.querySelectorAll('input, select, textarea, button')); }
    function remember() { panels.forEach(panel => controls(panel).forEach(field => { if (!fields.has(field)) { fields.set(field, field.disabled); originalInvalid.set(field, field.getAttribute('aria-invalid')); } })); }
    remember();
    function valid(panel) {
      form.classList.add('was-validated');
      let first = null;
      controls(panel).filter(field => !fields.get(field) && !['button', 'submit', 'reset'].includes(field.type)).forEach(field => {
        const disabled = field.disabled; field.disabled = false;
        const isValid = field.checkValidity(); field.setAttribute('aria-invalid', String(!isValid)); if (!isValid && !first) first = field; field.disabled = disabled;
      });
      if (first) { first.focus(); BrandUI.forms.get(form).setState('invalid'); return false; } return true;
    }
    function renderSummary() {
      if (!summary) return; summary.replaceChildren();
      const data = new FormData(form);
      const privateNames = new Set(Array.from(form.elements).filter(field => field.matches('[type="password"], [type="hidden"], [data-step-private]') || field.closest('[data-brand-field]')?.querySelector('[data-field-reveal]')).map(field => field.name));
      for (const [key, value] of data) { if (privateNames.has(key)) continue; const item = document.createElement('div'); item.textContent = key + ': ' + (value instanceof File ? value.name || 'Файл не выбран' : value); summary.append(item); }
    }
    function update(focus) {
      remember(); panels.forEach((panel, index) => { panel.hidden = index !== current; panel.inert = index !== current; controls(panel).forEach(field => { field.disabled = fields.get(field) || (current !== panels.length - 1 && index !== current); }); });
      indicators.forEach((indicator, index) => { if (index === current) indicator.setAttribute('aria-current', 'step'); else indicator.removeAttribute('aria-current'); });
      buttons.forEach(item => { item.button.hidden = item.button.hasAttribute('data-step-prev') ? current === 0 : item.button.hasAttribute('data-step-next') ? current === panels.length - 1 : current !== panels.length - 1; });
      if (current === panels.length - 1) renderSummary(); BrandUI.init(panels[current]);
      if (focus) { const heading = panels[current].querySelector('[data-step-heading]'); (heading || controls(panels[current]).find(field => !field.disabled))?.focus(); }
      emit(form, 'step-change', { index: current, total: panels.length, controller: controller });
    }
    function go(index) {
      if (destroyed || !Number.isInteger(index) || index < 0 || index >= panels.length || BrandUI.forms.get(form).getState() === 'loading') return false;
      if (index > current) for (let i = current; i < index; i++) if (!valid(panels[i])) { current = i; update(true); valid(panels[i]); return false; }
      current = index; BrandUI.forms.get(form).setState('idle'); update(true); return true;
    }
    function click(event) { const button = event.target.closest('button'); if (button?.hasAttribute('data-step-next')) go(current + 1); if (button?.hasAttribute('data-step-prev')) go(current - 1); }
    function submit(event) {
      if (current < panels.length - 1) { event.preventDefault(); event.stopImmediatePropagation(); go(current + 1); }
      else for (let i = 0; i < panels.length; i++) if (!valid(panels[i])) { event.preventDefault(); event.stopImmediatePropagation(); current = i; update(true); valid(panels[i]); break; }
    }
    function reset() { queueMicrotask(() => { if (!destroyed) { current = 0; update(false); } }); }
    function formState(event) { if (event.target === form) buttons.filter(item => !item.button.hasAttribute('data-step-submit')).forEach(item => { item.button.disabled = item.disabled || event.detail.state === 'loading'; }); }
    function destroy() { if (destroyed) return; destroyed = true; form.removeEventListener('click', click); form.removeEventListener('submit', submit, true); form.removeEventListener('reset', reset); form.removeEventListener('brand:form-state', formState); originals.forEach(item => { item.panel.hidden = item.hidden; item.panel.inert = item.inert; }); fields.forEach((disabled, field) => { field.disabled = disabled; }); originalInvalid.forEach((value, field) => attr(field, 'aria-invalid', value)); indicators.forEach((indicator, index) => attr(indicator, 'aria-current', indicatorStates[index])); buttons.forEach(item => { item.button.hidden = item.hidden; if (!item.button.hasAttribute('data-step-submit')) item.button.disabled = item.disabled; }); if (summary) summary.replaceChildren(...summaryNodes); steppers.delete(form); }
    const controller = { go: go, next: () => go(current + 1), previous: () => go(current - 1), update: () => update(false), getState: () => ({ index: current, total: panels.length }), destroy: destroy };
    steppers.set(form, controller); form.addEventListener('click', click); form.addEventListener('submit', submit, true); form.addEventListener('reset', reset); form.addEventListener('brand:form-state', formState); update(false); return controller;
  }

  BrandUI.fields = { init: initField, get: root => fields.get(root) };
  BrandUI.choice = { init: (source, options) => combo(source, options, true), get: source => choices.get(source) };
  BrandUI.autocomplete = { init: (source, options) => combo(source, options, false), get: source => autocompletes.get(source) };
  BrandUI.upload = { init: initUpload, get: root => uploads.get(root) };
  BrandUI.stepper = { init: initStepper, get: form => steppers.get(form) };
  const instances = [fields, choices, autocompletes, uploads, steppers];
  BrandUI.registerModule('inputs', {
    init: container => {
      instances.forEach(map => map.forEach((controller, root) => { if (!root.isConnected) controller.destroy(); }));
      elements(container, '[data-brand-field]').forEach(initField);
      elements(container, 'select[data-brand-choice]').forEach(source => combo(source, undefined, true));
      elements(container, 'input[data-brand-autocomplete]').forEach(source => combo(source, undefined, false));
      elements(container, '[data-brand-upload]').forEach(initUpload);
      elements(container, 'form[data-brand-stepper]').forEach(initStepper);
    },
    destroy: container => instances.forEach(map => map.forEach((controller, root) => { if (container === document || container === root || container.contains(root) || !root.isConnected) controller.destroy(); }))
  });
})();
