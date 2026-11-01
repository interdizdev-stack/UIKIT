(function () {
  'use strict';
  const registry=new Map(),mounts=new WeakMap();
  const labels={foundations:'Основы',components:'Компонент',compositions:'Композиция',pages:'Страница'};
  const stateLabels={default:'Обычное',disabled:'Недоступно',loading:'Загрузка',readonly:'Только чтение',invalid:'Ошибки полей','server-error':'Серверная ошибка',empty:'Нет данных',error:'Ошибка / retry',selected:'Есть выбор',dirty:'Изменённая форма',saved:'Сохранено',recovery:'Восстановление','403':'Нет доступа','404':'Не найдено',offline:'Нет соединения'};
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function register(id,entry){
    if(!/^[a-z][a-z0-9-]*$/.test(id)||registry.has(id))throw new TypeError('Invalid example ID');
    const category=entry.category||(entry.page?'pages':['colors','typography','icons','references'].includes(entry.route)?'foundations':/^(pattern-|mobile-|site-)/.test(id)||id==='consultation'?'compositions':'components');
    let previewStates=['default'];
    if(/^button/.test(id))previewStates.push('disabled','loading');
    if(['consultation','pattern-choices'].includes(id))previewStates.push('invalid','server-error','disabled','readonly');
    if(['table','mobile-data','page-app'].includes(id))previewStates.push('loading','error','empty','selected');
    if(id==='page-app')previewStates.push('dirty','invalid','saved');
    if(id==='page-access')previewStates=['default','recovery','403','404','error','offline'];
    const container=!entry.page&&!['site-navigation','navbar','navigation','modal-message','modal-confirm','modal-form','gallery','cookie-bar','cookie-corner','cookie-modal'].includes(id);
    registry.set(id,Object.assign({id,modules:[],examples:[],states:['Обычное','Hover / focus'],properties:[],docs:'docs/api.md',category,previewStates,container,usage:category==='pages'?'Готовый путь с локальными данными. Подключите callbacks приложения.':category==='compositions'?'Сочетание общих компонентов для законченной задачи.':'Используйте исходный HTML и сохраняйте нативную семантику.'},entry));
  }
  const entries=route=>Array.from(registry.values()).filter(entry=>!route||entry.route===route);
  const get=id=>registry.get(id);
  function options(entry,value){const cfg=Object.assign({theme:'light',density:'default',state:'default',container:0,long:false},value);cfg.theme=cfg.theme==='dark'?'dark':'light';cfg.density=cfg.density==='compact'?'compact':'default';cfg.state=entry.previewStates.includes(cfg.state)?cfg.state:'default';cfg.container=entry.container&&[240,320,480].includes(Number(cfg.container))?Number(cfg.container):0;cfg.long=Boolean(cfg.long);return cfg;}
  function source(id,value){
    const entry=get(id);if(!entry)throw new TypeError('Unknown example');const cfg=options(entry,value);
    const base=cfg.base?'<base href="'+escape(cfg.base)+'">\n':'';
    const scripts=['vendor/bootstrap.bundle.min.js',id==='icon'?'vendor/lucide.min.js':'vendor/lucide-core.min.js','ui-kit.js',...entry.modules,...entry.examples,'examples/catalog-demo.js'];
    let content=entry.markup(cfg);if(cfg.container)content='<div data-example-container style="width:100%;max-width:'+cfg.container+'px;margin-inline:auto" class="brand-responsive">'+content+'</div>';
    if(entry.page==='content')content='<div class="brand-container">'+content+'</div>';
    else if(entry.page!=='app')content='<main class="brand-container brand-section brand-stack">'+(entry.page?'':'<h1 class="brand-page-title">'+escape(entry.title)+'</h1>')+content+'</main>';
    return '<!doctype html>\n<html lang="ru" data-example-id="'+id+'" data-bs-theme="'+cfg.theme+'" data-ui-density="'+cfg.density+'" data-preview-state="'+cfg.state+'" data-preview-long="'+cfg.long+'">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>'+escape(entry.title)+'</title>\n<link rel="icon" href="data:,">\n'+base+['vendor/bootstrap.min.css','tokens.css','ui-kit.css'].map(path=>'<link rel="stylesheet" href="'+path+'">').join('\n')+'\n</head>\n<body>\n'+content+'\n'+[...new Set(scripts)].map(path=>'<script src="'+path+'"></script>').join('\n')+'\n<script>BrandUIDemo.setup(document);</script>\n</body>\n</html>\n';
  }
  function inspector(route,selectedId){
    const list=entries(route);if(!list.length)return '';
    const select=(name,title,values)=>'<label>'+title+'<select class="form-select" data-example-'+name+'>'+values.map(pair=>'<option value="'+pair[0]+'">'+pair[1]+'</option>').join('')+'</select></label>';
    return '<section class="catalog-example-inspector brand-surface brand-stack" id="exampleInspector" aria-labelledby="exampleInspectorTitle"><header class="brand-page-header"><h2 class="brand-panel-title" id="exampleInspectorTitle">Пример и подключение</h2><span class="brand-tag" data-example-category></span></header><div class="catalog-example-controls brand-control-row">'+select('select','Пример',list.map(entry=>[entry.id,escape(entry.title)]))+select('theme','Тема preview',[['light','Light'],['dark','Dark']])+select('density','Плотность',[['default','Обычная'],['compact','Компактная']])+select('width','Ширина viewport',[[320,'320 px'],[390,'390 px'],[768,'768 px'],[1440,'1440 px']])+select('container','Контейнер',[[0,'На всю ширину'],[240,'240 px'],[320,'320 px'],[480,'480 px']])+select('state','Состояние',[['default','Обычное']])+'</div><label class="brand-check"><input class="form-check-input" type="checkbox" data-example-long> Длинный текст</label><p class="brand-small text-body-secondary" data-example-usage></p><div class="brand-cluster"><button class="btn btn-secondary btn-sm" type="button" data-example-copy>Копировать полный HTML</button><button class="btn btn-secondary btn-sm" type="button" data-example-download>Скачать HTML</button><button class="btn btn-ghost btn-sm" type="button" data-example-code aria-expanded="false" aria-controls="completeExampleCode">Показать HTML</button><a class="brand-small" data-example-link>Прямая ссылка</a><a class="brand-small" data-example-docs>API и применение</a></div><div class="catalog-iframe-scroll" tabindex="0" role="region" aria-label="Область адаптивного примера: горизонтальная прокрутка"><iframe title="Адаптивный пример компонента" data-example-frame height="600" allowfullscreen></iframe></div><details class="catalog-example-technical"><summary>Свойства, состояния и зависимости</summary><div data-example-details></div></details><pre class="code-preview" id="completeExampleCode" hidden></pre></section>';
  }
  function mount(host,selectedId){
    const panel=host.querySelector('#exampleInspector');if(!panel)return;const select=panel.querySelector('[data-example-select]');
    if(get(selectedId)&&Array.from(select.options).some(option=>option.value===selectedId))select.value=selectedId;
    if(mounts.has(panel)){mounts.get(panel)();return;}
    let previous,entryId;
    function read(){return {theme:panel.querySelector('[data-example-theme]').value,density:panel.querySelector('[data-example-density]').value,state:panel.querySelector('[data-example-state]').value,container:Number(panel.querySelector('[data-example-container]').value),long:panel.querySelector('[data-example-long]').checked};}
    function update(){
      const entry=get(select.value),state=panel.querySelector('[data-example-state]'),container=panel.querySelector('[data-example-container]');
      if(entryId!==entry.id){entryId=entry.id;state.replaceChildren(...entry.previewStates.map(value=>new Option(stateLabels[value]||value,value)));container.disabled=!entry.container;if(container.disabled)container.value='0';}
      const cfg=read(),width=Number(panel.querySelector('[data-example-width]').value);
      panel.querySelector('[data-example-category]').textContent=labels[entry.category];
      panel.querySelector('[data-example-usage]').textContent=entry.usage+(entry.container?' Контейнер ограничивает содержимое внутри выбранного viewport.':' Для этой страницы или навигации меняйте ширину viewport.');
      panel.querySelector('[data-example-link]').href='#'+entry.route+'/'+entry.id;panel.querySelector('[data-example-docs]').href=entry.docs;
      panel.querySelector('[data-example-details]').innerHTML='<div class="brand-grid brand-grid--2"><div><h3 class="brand-panel-title">Свойства</h3><dl class="catalog-property-list">'+entry.properties.map(pair=>'<div><dt>'+escape(pair[0])+'</dt><dd>'+escape(pair[1])+'</dd></div>').join('')+'</dl></div><div><h3 class="brand-panel-title">Применимые состояния</h3><p class="brand-small">'+entry.states.map(escape).join(' · ')+'</p><p class="brand-small">Hover/focus и открытие overlays проверяются действиями и клавиатурой. Остальные доступные состояния включаются сверху.</p><code class="catalog-dependencies">'+['vendor/bootstrap.min.css','tokens.css','ui-kit.css','vendor/bootstrap.bundle.min.js',entry.id==='icon'?'vendor/lucide.min.js':'vendor/lucide-core.min.js','ui-kit.js',...entry.modules,...entry.examples,'examples/catalog-demo.js'].map(escape).join('\n')+'</code></div></div>';
      const code=source(entry.id,cfg);panel.querySelector('#completeExampleCode').textContent=code;const frame=panel.querySelector('[data-example-frame]');frame.style.width=width+'px';
      if(code!==previous){frame.srcdoc=source(entry.id,Object.assign({base:new URL('.',location.href).href},cfg));previous=code;}
      BrandUI.init(panel);
    }
    mounts.set(panel,update);panel.addEventListener('change',event=>{if(event.target===select){const entry=get(select.value);history.replaceState(null,'','#'+entry.route+'/'+entry.id);}update();});update();
    panel.addEventListener('click',async event=>{const button=event.target.closest('button');if(!button)return;const entry=get(select.value),code=source(entry.id,read());if(button.hasAttribute('data-example-code')){const pre=panel.querySelector('#completeExampleCode');pre.hidden=!pre.hidden;button.setAttribute('aria-expanded',String(!pre.hidden));}if(button.hasAttribute('data-example-copy'))await copy(code);if(button.hasAttribute('data-example-download')){const url=URL.createObjectURL(new Blob([code],{type:'text/html;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=entry.id+'.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}});
  }
  async function copy(text){const active=document.activeElement;try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else{const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();const ok=document.execCommand('copy');field.remove();if(active?.isConnected)active.focus({preventScroll:true});if(!ok)throw Error('Copy failed');}BrandUI.toasts.push({message:'Скопирован полный HTML',duration:2500});}catch{BrandUI.toasts.push({message:'Буфер обмена недоступен. Используйте «Скачать HTML».',duration:4000});}}
  window.BrandUICatalogExamples={register,entries,get,source,inspector,mount,copy};
})();
