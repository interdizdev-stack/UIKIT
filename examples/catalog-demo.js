(function () {
  'use strict';
  const previewed=new WeakSet();
  async function preview(document){
    if(previewed.has(document))return;previewed.add(document);
    const state=document.documentElement.dataset.previewState||'default';
    const appRoot=document.querySelector('[data-page-example="app"]'),access=document.querySelector('[data-page-example="access"]');
    if(access&&state!=='default')BrandUIPageExamples.get(access).setView(state);
    else if(appRoot&&['dirty','invalid','saved'].includes(state)){
      appRoot.querySelector('[data-page-create]').click();const form=appRoot.querySelector('[data-page-edit-form]');
      if(state!=='invalid'){form.elements.name.value='Демонстрационный проект';form.elements.name.dispatchEvent(new Event('input',{bubbles:true}));}
      if(state!=='dirty'){form.requestSubmit();await new Promise(resolve=>setTimeout(resolve,0));}
    }else{
      const host=document.querySelector('[data-example-table],[data-mobile-table],[data-page-table]'),table=host&&BrandUI.table?.get(host);
      if(table&&['loading','error','empty','selected'].includes(state)){
        if(state==='empty')table.update({rows:[]});else if(state==='selected'){const row=host.querySelector('[data-table-row]');if(row)table.select([row.dataset.tableRow]);}else table.setState(state,state==='error'?'Данные не получены. Повторите попытку.':'Получаем данные…');
      }else if(['invalid','server-error','disabled','readonly','loading'].includes(state)){
        const form=Array.from(document.forms).find(form=>form.getClientRects().length);
        if(state==='invalid')form?.requestSubmit();
        if(state==='server-error'&&form){const field=form.elements.email||Array.from(form.elements).find(field=>field.name&&field.willValidate);if(field)BrandUI.forms.get(form)?.setErrors({[field.name]:'Проверьте значение: сервер отклонил данные.'});}
        if(state==='readonly')document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]),textarea').forEach(field=>field.readOnly=true);
        if(state==='disabled')document.querySelectorAll('input,select,textarea,button').forEach(field=>field.disabled=true);
        if(state==='loading'){const button=document.querySelector('button.btn');if(button){button.disabled=true;button.setAttribute('aria-busy','true');const loader=document.createElement('span');loader.className='brand-loader';loader.setAttribute('aria-hidden','true');button.prepend(loader);}}
      }
    }
    if(document.documentElement.dataset.previewLong==='true')Array.from(document.querySelectorAll('h1,h2,h3,.brand-list-title,.form-label,.brand-tag')).filter(element=>element.getClientRects().length).slice(0,8).forEach(element=>element.append(document.createTextNode(' — Длинное название с пояснением и ОченьДлиннымСловомБезПробеловДляПроверкиПереноса')));
    BrandUI.init(document);document.documentElement.dataset.previewReady='true';
  }
  function setup(container) {
    BrandUI.init(container);
    if (window.BrandUIFeedbackExamples) BrandUIFeedbackExamples.setup(container);
    if (window.BrandUITableExamples) BrandUITableExamples.setup(container);
    if (window.BrandUISiteExamples) BrandUISiteExamples.setup(container);
    if (window.BrandUIPageExamples) BrandUIPageExamples.setup(container);
    if (window.BrandUIMobileExamples) BrandUIMobileExamples.setup(container);
    if (window.BrandUIPatternExamples) BrandUIPatternExamples.setup(container);
    if (window.BrandUIExamples?.initModalForms) BrandUIExamples.initModalForms(container);
    if (BrandUI.forms) container.querySelectorAll('form[data-demo-form]').forEach(function (form) { BrandUI.forms.init(form, { onSubmit: function () { return 'Проверка пройдена. Это демонстрация без отправки данных.'; } }); });
    if (BrandUI.cookies) container.querySelectorAll('[data-cookie-consent][data-cookie-demo]').forEach(function (root) { BrandUI.cookies.init(root, { persist: false }); });
    if(container===document)preview(document);
  }
  document.addEventListener('change', function (event) {
    const field = event.target;
    if (!field.hasAttribute('data-contact-method')) return;
    const form = field.closest('form'), contact = form.elements.contact, mode = field.value;
    contact.value = ''; contact.type = mode === 'email' ? 'email' : mode === 'phone' ? 'tel' : 'text'; contact.autocomplete = mode === 'email' ? 'email' : mode === 'phone' ? 'tel' : 'off'; contact.placeholder = mode === 'email' ? 'name@example.com' : mode === 'phone' ? '+7 (900) 000-00-00' : '@username';
    if (mode === 'phone') { contact.dataset.telInput = ''; contact.inputMode = 'tel'; contact.pattern = '(?:\\+7|8) \\([0-9]{3}\\) [0-9]{3}-[0-9]{2}-[0-9]{2}|\\+[0-9]{7,16}'; }
    else { contact.removeAttribute('data-tel-input'); contact.removeAttribute('pattern'); contact.inputMode = mode === 'email' ? 'email' : 'text'; }
    form.querySelector('[data-contact-label]').textContent = mode === 'email' ? 'Email' : mode === 'phone' ? 'Телефон' : 'Telegram';
    form.querySelector('[data-contact-error]').textContent = mode === 'email' ? 'Укажите корректный email.' : mode === 'phone' ? 'Укажите корректный телефон.' : 'Укажите имя пользователя.';
  });
  document.addEventListener('input', function (event) {
    const field = event.target;
    if (field.id === 'typePhrase') document.querySelectorAll('[data-type-sample]').forEach(sample => { sample.textContent = field.value || field.defaultValue; });
    if (field.id === 'sampleRange') document.getElementById('sampleRangeValue').textContent = field.value + '%';
    if (field.id === 'progressRange') { document.getElementById('progressValue').textContent = field.value + '%'; const progress = document.getElementById('sampleProgress'); progress.setAttribute('aria-valuenow', field.value); progress.firstElementChild.style.width = field.value + '%'; }
  });
  document.addEventListener('click', async function (event) {
    const button = event.target.closest('button'); if (!button) return;
    if (button.id === 'resetTypePhrase') { const field = document.getElementById('typePhrase'); field.value = field.defaultValue; field.dispatchEvent(new Event('input', { bubbles: true })); field.focus({ preventScroll: true }); }
    if (button.hasAttribute('data-nav-page')) { document.querySelectorAll('[data-nav-page]').forEach(function (item) { item.closest('li').classList.toggle('active', item === button); if (item === button) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current'); }); document.getElementById('navigationPageStatus').textContent = 'Страница ' + button.dataset.navPage + ' из 3'; }
    if (button.dataset.action === 'dialog') { const dialog = document.querySelector('#exampleMessageModal'); if (dialog) { dialog.addEventListener('hidden.bs.modal',()=>{if(button.isConnected)button.focus();},{once:true}); bootstrap.Modal.getOrCreateInstance(dialog).show(); } }
    if (button.dataset.action === 'toast' && BrandUI.toasts) BrandUI.toasts.push({ message: 'Демонстрационное уведомление', duration: 3000 });
    if (button.hasAttribute('data-copy')) {
      const active = document.activeElement;
      try { if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(button.dataset.copy); else { const field = document.createElement('textarea'); field.value = button.dataset.copy; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select(); const ok = document.execCommand('copy'); field.remove(); if (active?.isConnected) active.focus({ preventScroll: true }); if (!ok) throw Error(); } if (BrandUI.toasts) BrandUI.toasts.push({ message: 'Скопировано' }); }
      catch (_) { if (BrandUI.toasts) BrandUI.toasts.push({ message: 'Буфер обмена недоступен' }); }
    }
  });
  window.BrandUIDemo = { setup: setup };
})();
