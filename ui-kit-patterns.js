(function () {
  'use strict';
  const copies = new Map(), filters = new Map();
  function elements(root, selector) { const list=Array.from(root.querySelectorAll(selector)); if(root instanceof Element&&root.matches(selector))list.unshift(root);return list; }
  function attr(node,name,value){if(value===null)node.removeAttribute(name);else node.setAttribute(name,value);}
  function emit(node,name,detail){node.dispatchEvent(new CustomEvent('brand:'+name,{bubbles:true,detail}));}

  function initCopy(button) {
    if(!(button instanceof HTMLButtonElement))throw new TypeError('Expected a copy button');
    if(copies.has(button))return copies.get(button);
    let destroyed=false,busy=false;
    const original={disabled:button.disabled,busy:button.getAttribute('aria-busy'),state:button.getAttribute('data-copy-state')};
    const status=document.createElement('span');status.className='brand-copy-status';status.setAttribute('role','status');button.after(status);
    async function copy(){
      if(destroyed||busy||button.disabled)return false;
      busy=true;button.disabled=true;button.setAttribute('aria-busy','true');button.dataset.copyState='pending';status.textContent='';
      let text='';
      try{
        const target=button.dataset.copyTarget?document.querySelector(button.dataset.copyTarget):null;
        if(button.dataset.copyTarget&&!target)throw Error('Copy target not found');
        text=target?('value' in target?target.value:target.textContent):button.dataset.brandCopy;
        if(typeof text!=='string')throw Error('Copy text missing');
        if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
        else{
          const active=document.activeElement,field=document.createElement('textarea');field.value=text;field.style.cssText='position:fixed;opacity:0';field.setAttribute('aria-hidden','true');document.body.append(field);
          let ok;try{field.select();ok=document.execCommand('copy');}finally{field.remove();if(active?.isConnected)active.focus({preventScroll:true});}
          if(!ok)throw Error('Clipboard unavailable');
        }
        if(destroyed)return false;
        button.dataset.copyState='success';status.textContent='Скопировано';emit(button,'copy',{ok:true,text,controller});return true;
      }catch(error){if(!destroyed){button.dataset.copyState='error';status.textContent='Не удалось скопировать. Выделите текст вручную.';emit(button,'copy',{ok:false,error,controller});}return false;}
      finally{busy=false;if(!destroyed){button.disabled=original.disabled;attr(button,'aria-busy',original.busy);}}
    }
    function destroy(){if(destroyed)return;destroyed=true;button.removeEventListener('click',copy);button.disabled=original.disabled;attr(button,'aria-busy',original.busy);attr(button,'data-copy-state',original.state);status.remove();copies.delete(button);}
    const controller={copy,destroy};copies.set(button,controller);button.addEventListener('click',copy);return controller;
  }

  function initFilters(form,options){
    if(!(form instanceof HTMLFormElement))throw new TypeError('Expected a filter form');
    if(filters.has(form))return filters.get(form);
    const config=Object.assign({},options),active=form.querySelector('[data-filter-active]'),count=form.querySelector('[data-filter-count]'),dirty=form.querySelector('[data-filter-dirty]');
    const original={nodes:active?Array.from(active.childNodes):[],count:count?.textContent,dirty:dirty?.hidden};
    let destroyed=false;
    function read(){const values=Object.create(null);for(const [name,value]of new FormData(form)){if(typeof value==='string'&&value.trim())(values[name]||(values[name]=[])).push(value);}return values;}
    let applied=read();
    function state(){return {values:structuredClone(applied),draft:read(),activeCount:Object.keys(applied).length,dirty:JSON.stringify(read())!==JSON.stringify(applied)};}
    function fields(name){return Array.from(form.elements).filter(e=>e.name===name&&'value'in e);}
    function restore(values){
      Array.from(form.elements).filter(e=>e.name&&(e instanceof HTMLInputElement||e instanceof HTMLSelectElement||e instanceof HTMLTextAreaElement)&&!e.matches(':disabled')&&!e.readOnly&&!['file','submit','reset','button','image'].includes(e.type)).forEach(field=>{
        const selected=values[field.name]||[];
        if(['checkbox','radio'].includes(field.type))field.checked=selected.includes(field.value);
        else if(field instanceof HTMLSelectElement)Array.from(field.options).forEach(option=>{option.selected=selected.includes(option.value);});
        else if(field.type!=='file')field.value=selected[0]||'';
      });BrandUI.init(form);
    }
    function label(name){const field=fields(name)[0];return field?.labels?.[0]?.textContent.trim()||field?.getAttribute('aria-label')||name;}
    function render(){
      if(destroyed)return;
      if(count)count.textContent=String(Object.keys(applied).length);
      if(dirty)dirty.hidden=!state().dirty;
      if(active){active.replaceChildren();Object.entries(applied).forEach(([name,values])=>{
        const chip=document.createElement('button');chip.type='button';chip.className='brand-chip';chip.dataset.filterRemove=name;
        const text=values.map(value=>{const option=fields(name).flatMap(field=>field instanceof HTMLSelectElement?Array.from(field.options):[]).find(option=>option.value===value);return option?.label||value;}).join(', ');
        chip.textContent=label(name)+': '+text+' ×';chip.setAttribute('aria-label','Удалить фильтр '+label(name));chip.disabled=fields(name).every(field=>field.matches(':disabled')||field.readOnly);active.append(chip);
      });}
    }
    function apply(options){if(destroyed)return;applied=read();render();const detail=Object.assign({controller},state());if(!options?.silent){emit(form,'filters-change',detail);if(typeof config.onChange==='function')config.onChange(detail);}return state();}
    function cancel(){if(destroyed)return;restore(applied);render();}
    function clear(){if(destroyed)return;restore(Object.create(null));return apply();}
    function submit(event){event.preventDefault();apply();}
    function click(event){const button=event.target.closest('button');if(!button||!form.contains(button))return;
      if(button.hasAttribute('data-filter-cancel'))cancel();
      if(button.hasAttribute('data-filter-reset'))clear();
      if(button.hasAttribute('data-filter-remove')){const next=structuredClone(applied);delete next[button.dataset.filterRemove];restore(next);apply();form.querySelector('[data-filter-submit]')?.focus();}
    }
    function reset(){queueMicrotask(()=>{if(!destroyed)apply();});}
    function destroy(){if(destroyed)return;destroyed=true;for(const [name,handler]of events)form.removeEventListener(name,handler);if(active)active.replaceChildren(...original.nodes);if(count)count.textContent=original.count;if(dirty)dirty.hidden=original.dirty;filters.delete(form);}
    const controller={apply,cancel,clear,update:render,getState:state,destroy};
    const events=[['submit',submit],['input',render],['change',render],['click',click],['reset',reset]];
    events.forEach(([name,handler])=>form.addEventListener(name,handler));filters.set(form,controller);render();return controller;
  }
  BrandUI.copy={init:initCopy,get:button=>copies.get(button)};
  BrandUI.filters={init:initFilters,get:form=>filters.get(form)};
  BrandUI.registerModule('patterns',{
    init(root){for(const map of [copies,filters])map.forEach((controller,node)=>{if(!node.isConnected)controller.destroy();});elements(root,'button[data-brand-copy]').forEach(initCopy);elements(root,'form[data-brand-filters]').forEach(form=>initFilters(form));},
    destroy(root){for(const map of [copies,filters])map.forEach((controller,node)=>{if(root===document||root===node||root.contains(node)||!node.isConnected)controller.destroy();});}
  });
})();
