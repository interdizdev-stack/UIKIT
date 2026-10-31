(function () {
  'use strict';
  const instances = new Map();
  let sequence = 0;
  const states = ['idle', 'invalid', 'ready', 'loading', 'success', 'error'];
  function init(form, options) {
    if (!(form instanceof HTMLFormElement)) throw new TypeError('Expected a form');
    if (instances.has(form)) { instances.get(form).configure(options); return instances.get(form); }
    let config = Object.assign({}, options);
    let state = 'idle', destroyed = false, request = null;
    const original = { novalidate: form.noValidate, validated: form.classList.contains('was-validated'), busy: form.getAttribute('aria-busy'), state: form.getAttribute('data-form-state') };
    const validity = new Map(), buttons = new Map();
    const serverErrors = new Map(), generatedIds = new Map();
    const summary = form.querySelector('[data-form-errors]');
    const originalSummary = summary ? { hidden: summary.hidden, role: summary.getAttribute('role'), label: summary.getAttribute('aria-label'), tabindex: summary.getAttribute('tabindex'), nodes: Array.from(summary.childNodes) } : null;
    let status = form.querySelector('[data-form-status]');
    const createdStatus = !status;
    if (!status) { status = document.createElement('p'); status.dataset.formStatus = ''; status.className = 'brand-form-status'; status.hidden = true; form.append(status); }
    const originalStatus = { text: status.textContent, hidden: status.hidden, role: status.getAttribute('role') };
    form.noValidate = true;
    function attr(element, name, value) { if (value === null) element.removeAttribute(name); else element.setAttribute(name, value); }
    function emit(name, detail, cancelable) { return form.dispatchEvent(new CustomEvent('brand:form-' + name, { bubbles: true, cancelable: Boolean(cancelable), detail: Object.assign({ controller: controller, state: state }, detail) })); }
    function fields() { return Array.from(form.elements).filter(field => field.willValidate); }
    function renderErrors() {
      if (!summary) return;
      summary.replaceChildren();
      const invalid = fields().filter(field => !field.validity.valid), seen = new Set();
      summary.hidden = !invalid.length;
      if (!invalid.length) return;
      summary.setAttribute('role', 'region'); summary.setAttribute('aria-label', 'Ошибки формы'); summary.tabIndex = -1;
      const title = document.createElement('strong'); title.textContent = 'Проверьте поля';
      const list = document.createElement('ul');
      invalid.forEach(field => {
        if (field.type === 'radio' && seen.has(field.name)) return;
        if (field.type === 'radio') seen.add(field.name);
        if (!field.id) { field.id = 'brand-form-field-' + (++sequence); generatedIds.set(field, field.id); }
        const item = document.createElement('li'), link = document.createElement('a');
        const groupLabel=field.type==='radio'?field.closest('fieldset')?.querySelector('legend')?.textContent.trim():null;
        const labelNode=field.labels?.[0]?.cloneNode(true);
        labelNode?.querySelectorAll('input,select,textarea,button,.brand-select,.brand-choice,.invalid-feedback').forEach(node=>node.remove());
        const label = groupLabel || labelNode?.querySelector('.brand-choice-card-copy > strong')?.textContent.trim() || field.getAttribute('aria-label') || labelNode?.textContent.trim() || field.name || 'Поле';
        const feedback = (field.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)).find(node => node?.classList.contains('invalid-feedback'));
        link.href = '#' + field.id; link.textContent = label + ': ' + (serverErrors.get(field)?.message || feedback?.textContent.trim() || field.validationMessage);
        link.addEventListener('click', event => { event.preventDefault(); field.focus(); }); item.append(link); list.append(item);
      }); summary.append(title, list);
    }
    function clearServerError(field) {
      const error = serverErrors.get(field); if (!error) return;
      field.setCustomValidity(error.original);
      if(error.created){error.feedback.remove();attr(field,'aria-describedby',error.describedby);}else if(error.feedback)error.feedback.replaceChildren(...error.nodes);
      serverErrors.delete(field);
    }
    function setErrors(errors, message) {
      if (destroyed) return;
      if (!errors || typeof errors !== 'object' || Array.isArray(errors)) throw new TypeError('Expected field error messages');
      const entries = Object.entries(errors).map(([name, text]) => {
        const field = fields().find(field => field.name === name);
        if (!field || typeof text !== 'string') throw new TypeError('Unknown form field or invalid error: ' + name);
        return { field, message: text };
      });
      Array.from(serverErrors.keys()).forEach(clearServerError);
      entries.forEach(({ field, message }) => { if (message) {
        const describedby=field.getAttribute('aria-describedby');
        let feedback=(describedby||'').split(/\s+/).map(id=>document.getElementById(id)).find(node=>node?.classList.contains('invalid-feedback'));
        const created=!feedback,nodes=feedback?Array.from(feedback.childNodes):[];
        if(!feedback){feedback=document.createElement('p');feedback.className='invalid-feedback brand-server-error';feedback.id='brand-form-server-'+(++sequence);const control=field.classList.contains('brand-select-native')&&field.nextElementSibling?.matches('.brand-select,.brand-choice')?field.nextElementSibling:field;const anchor=control.closest('.input-group')||control;anchor.after(feedback);field.setAttribute('aria-describedby',[describedby,feedback.id].filter(Boolean).join(' '));}
        serverErrors.set(field, { message, original: field.validity.customError ? field.validationMessage : '', feedback, created, describedby, nodes }); feedback.textContent=message; field.setCustomValidity(message);
      } });
      const valid = validate(false); setState(valid ? 'idle' : 'invalid', message);
      if (!valid) (summary || fields().find(field => !field.validity.valid))?.focus();
    }
    function unlock() {
      buttons.forEach(function (disabled, button) { button.disabled = disabled; }); buttons.clear();
      attr(form, 'aria-busy', original.busy);
    }
    function setState(next, message) {
      if (destroyed) return;
      if (!states.includes(next)) throw new TypeError('Unknown form state');
      if (next !== 'loading') unlock();
      else if (state !== 'loading') {
        Array.from(form.elements).filter(function (field) { return (field instanceof HTMLButtonElement && field.type === 'submit') || (field instanceof HTMLInputElement && ['submit', 'image'].includes(field.type)); }).forEach(function (button) { buttons.set(button, button.disabled); button.disabled = true; });
        form.setAttribute('aria-busy', 'true');
      }
      state = next; form.dataset.formState = state;
      status.textContent = message || ({ loading: 'Выполняется…', invalid: 'Проверьте обязательные поля.', success: 'Готово.', error: 'Не удалось выполнить действие.' }[state] || '');
      status.hidden = !status.textContent;
      status.setAttribute('role', ['invalid', 'error'].includes(state) ? 'alert' : 'status');
      emit('state', { message: status.textContent });
    }
    function validate(focus) {
      form.classList.add('was-validated');
      Array.from(form.elements).filter(function (field) { return field.willValidate; }).forEach(function (field) {
        if (!validity.has(field)) validity.set(field, field.getAttribute('aria-invalid'));
        field.setAttribute('aria-invalid', String(!field.validity.valid));
      });
      const valid = form.checkValidity();
      renderErrors();
      if (!valid && focus !== false) (summary || fields().find(function (field) { return !field.validity.valid; }))?.focus();
      emit('validate', { valid: valid });
      return valid;
    }
    function cancel() { if (request) request.abort(); request = null; }
    function clearValidity() {
      form.classList.toggle('was-validated', original.validated);
      validity.forEach(function (value, field) { attr(field, 'aria-invalid', value); }); validity.clear();
    }
    async function submit(event) {
      event.preventDefault();
      if (state === 'loading') return;
      if (!validate()) { setState('invalid'); return; }
      cancel(); request = new AbortController();
      const current = request;
      const data = event.submitter ? new FormData(form, event.submitter) : new FormData(form);
      setState('ready');
      const detail = { formData: data, submitter: event.submitter, signal: current.signal };
      if (!emit('submit', detail, true) || typeof config.onSubmit !== 'function') return;
      setState('loading');
      try {
        const result = await config.onSubmit(Object.assign({ form: form, controller: controller }, detail));
        if (!destroyed && !current.signal.aborted) { if (result?.errors && Object.keys(result.errors).length) setErrors(result.errors, result.message); else { setState('success', typeof result === 'string' ? result : undefined); emit('success', { result: result }); } }
      } catch (error) {
        if (!destroyed && !current.signal.aborted) { setState('error', config.errorMessage); emit('error', { error: error }); }
      }
    }
    function input(event) {
      clearServerError(event.target);
      if (form.classList.contains('was-validated')) validate(false);
      if (state !== 'loading') setState('idle');
    }
    function reset() { cancel(); Array.from(serverErrors.keys()).forEach(clearServerError); clearValidity(); if(summary){summary.replaceChildren();summary.hidden=true;} setState('idle'); }
    function destroy() {
      if (destroyed) return;
      cancel(); unlock(); Array.from(serverErrors.keys()).forEach(clearServerError); clearValidity(); destroyed = true;
      form.removeEventListener('submit', submit); form.removeEventListener('input', input); form.removeEventListener('change', input); form.removeEventListener('reset', reset);
      form.noValidate = original.novalidate; attr(form, 'data-form-state', original.state);
      if (createdStatus) status.remove(); else { status.textContent = originalStatus.text; status.hidden = originalStatus.hidden; attr(status, 'role', originalStatus.role); }
      if (summary) { summary.replaceChildren(...originalSummary.nodes); summary.hidden=originalSummary.hidden; ['role','tabindex'].forEach(name=>attr(summary,name,originalSummary[name]));attr(summary,'aria-label',originalSummary.label); }
      generatedIds.forEach((id,field)=>{if(field.id===id)field.removeAttribute('id');});
      instances.delete(form);
    }
    const controller = { validate: validate, setErrors: setErrors, setState: setState, reset: reset, destroy: destroy, getState: function () { return state; }, configure: function (next) { config = Object.assign(config, next); } };
    instances.set(form, controller);
    form.addEventListener('submit', submit); form.addEventListener('input', input); form.addEventListener('change', input); form.addEventListener('reset', reset);
    return controller;
  }
  function initAll(container) {
    instances.forEach(function (controller, form) { if (!form.isConnected) controller.destroy(); });
    if (container instanceof HTMLFormElement && container.matches('[data-brand-form]')) init(container);
    container.querySelectorAll('form[data-brand-form]').forEach(function (form) { init(form); });
  }
  function destroyAll(container) { instances.forEach(function (controller, form) { if (container === document || container === form || container.contains(form) || !form.isConnected) controller.destroy(); }); }
  BrandUI.forms = { init: init, get: function (form) { return instances.get(form); } };
  BrandUI.registerModule('forms', { init: initAll, destroy: destroyAll });
})();
