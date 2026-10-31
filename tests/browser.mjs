import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = { routes: [], interactions: [], exceptions: [], requests: [] };
const fixture = `<!doctype html><html lang="ru" data-bs-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/vendor/bootstrap.min.css"><link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/ui-kit.css"></head><body><main style="padding:20px"><form id="testForm"><label for="auditSelect">Тест</label><select id="auditSelect" class="form-select" name="selection" required><option value="">Выберите</option><option value="a">Альфа</option><option value="b" disabled>Бета</option><optgroup label="Группа"><option value="c">Гамма</option></optgroup></select><div class="invalid-feedback">Выберите значение</div><input id="auditPhone" class="form-control" type="tel"><button type="reset" id="auditReset">Сбросить</button></form><div style="height:20px;overflow:hidden" id="clipping"><select id="clippedSelect" class="form-select"><option>A</option><option>B</option><option>C</option></select></div><p><a href="/assets/gallery/01-form.webp" data-lightbox data-lightbox-group="audit" data-lightbox-caption="Первое">Первое</a><a href="/assets/gallery/03-journey.webp" data-lightbox data-lightbox-group="audit" data-lightbox-caption="Второе">Второе</a><a href="/missing-image.jpg" data-lightbox data-lightbox-group="audit" data-lightbox-caption="Ошибка">Ошибка</a></p><div id="cookieHost"></div><div class="card"><div class="card-header">Карточка</div><div class="card-body">Текст</div></div><div class="offcanvas offcanvas-start" tabindex="-1" id="testOffcanvas"><div class="offcanvas-body">Drawer</div></div><div id="testPopover" data-bs-toggle="popover" title="Подсказка" data-bs-content="Текст">Подсказка</div></main><script src="/vendor/bootstrap.bundle.min.js"></script><script src="/vendor/lucide.min.js"></script><script src="/ui-kit.js"></script><script src="/ui-kit-forms.js"></script><script src="/ui-kit-components.js"></script><script src="/ui-kit-theme.js"></script><script src="/ui-kit-table.js"></script><script src="/cookie-consent.js"></script></body></html>`;
const server = createServer(async (req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  try {
    if (pathname === '/audit-fixture') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(fixture); }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + '/')) { res.writeHead(403); return res.end(); }
    const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2'};
    const bytes=await readFile(file); res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(bytes);
  } catch { res.writeHead(404);res.end(); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin = 'http://127.0.0.1:' + server.address().port;
const profile = await mkdtemp(join(tmpdir(),'uikit-audit-profile-'));
const chrome = spawn(process.env.UIKIT_CHROME || '/usr/bin/google-chrome', ['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--disable-default-apps','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let ws;
try {
  let targets;
  for(let n=0;n<100;n++){try{const port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];targets=await(await fetch('http://127.0.0.1:'+port+'/json')).json();if(targets.length)break;}catch{}await sleep(100);}
  if(!targets)throw new Error('Chrome did not start');
  ws = new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
  let next=0;const pending=new Map();
  ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p?.reject(m.error);else p?.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown'){report.exceptions.push(m.params.exceptionDetails);}else if(m.method==='Network.responseReceived' && m.params.response.status>=400){report.requests.push({url:m.params.response.url,status:m.params.response.status});}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const viewport=width=>call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  const navigate=async path=>{await call('Page.navigate',{url:path.startsWith('file:')?path:origin+'/'+path});for(let i=0;i<100;i++){await sleep(30);if(await evaluate('document.readyState === "complete" && Boolean(window.BrandUI)'))break;}await evaluate('document.fonts.ready.then(()=>true)');};
  const interaction=(name,result)=>{report.interactions.push({name,...result});};
  await mkdir(join(root,'test-results'),{recursive:true});
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');
  await viewport(1440);await navigate('');
  const routes=['buttons','forms','navigation','feedback','tables','cookies','modals','lightbox','cards','lists','identity','site-navigation','advanced-forms','site-blocks','colors','typography','references','icons','pages','compositions','integration'];
  for(const width of [1440,768,390,320]){
    await viewport(width);
    for(const theme of ['dark','light']){
      await evaluate(`document.querySelector('[data-theme="${theme}"]').click()`);
      for(const route of routes){
        await evaluate(`location.hash='${route}'`);await sleep(50);
        report.routes.push(await evaluate(`(()=>{const d=document;const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);const visible=e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden';return {route:'${route}',theme:'${theme}',width:${width},viewport:innerWidth,clientWidth:d.documentElement.clientWidth,scroll:d.documentElement.scrollWidth,viewPresent:!!d.querySelector('#view')?.children.length,duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),overflow:[...d.querySelectorAll('#view *')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2||r.left< -2;}).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.trim().slice(0,30)}))};})()`));
      }
    }
    console.log('routes inspected',width);
  }
  await viewport(1440);await navigate('#tables');
  interaction('table filter/search/sort/pagination', await evaluate(`(()=>{const count=()=>document.querySelectorAll('#projectTable tbody tr').length;const initial=count();document.querySelector('#projectTable [data-table-page="2"]').click();const page2=count();document.querySelector('#projectSearch').value='несуществующий проект';document.querySelector('#projectSearch').dispatchEvent(new Event('input',{bubbles:true}));const empty=document.querySelector('.brand-table-empty')?.textContent;document.querySelector('#projectSearch').value='';document.querySelector('#projectSearch').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#projectFilter').value='published';document.querySelector('#projectFilter').dispatchEvent(new Event('change',{bubbles:true}));return {initial,page2,empty,filtered:count(),total:BrandUI.table.get(document.querySelector('#projectTable')).getState().total};})()`));
  await navigate('#navigation');
  interaction('tabs',await evaluate(`(()=>{document.querySelector('#projectsTab').click();return {active:document.querySelector('#projectsPanel').classList.contains('active'),selected:document.querySelector('#projectsTab').getAttribute('aria-selected')};})()`));
  await navigate('audit-fixture');
  interaction('select and telephone', await evaluate(`(async()=>{const s=document.querySelector('#auditSelect'),t=s.nextElementSibling.querySelector('button');const key=k=>t.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));key('ArrowDown');key('ArrowDown');key('Enter');const chosen=s.value;const formData=[...new FormData(document.querySelector('#testForm'))];document.querySelector('#auditReset').click();await Promise.resolve();const reset={value:s.value,label:t.textContent};s.disabled=true;await Promise.resolve();const disabled=t.disabled;s.disabled=false;const tel=document.querySelector('#auditPhone');tel.value='9001234567';tel.dispatchEvent(new Event('input',{bubbles:true}));const phone=tel.value;document.querySelector('#testForm').classList.add('was-validated');await Promise.resolve();const invalid={nativeValid:s.validity.valid,aria:t.getAttribute('aria-invalid')};return {chosen,formData,reset,disabled,phone,invalid};})()`));
  interaction('select popup clipping', await evaluate(`(()=>{const s=document.querySelector('#clippedSelect'),t=s.nextElementSibling.querySelector('button');t.click();const menu=document.getElementById(t.getAttribute('aria-controls')),rect=menu.getBoundingClientRect(),parent=document.querySelector('#clipping').getBoundingClientRect();return {menuHidden:menu.hidden,menuBottom:rect.bottom,clippingBottom:parent.bottom,clipped:!menu.contains(document.elementFromPoint(rect.left+20,rect.top+20))};})()`));
  await evaluate(`(()=>{const host=document.querySelector('#cookieHost');host.innerHTML=BrandUI.cookies.markup({id:'auditCookie',storageKey:'audit-cookie'});window.auditCookie=BrandUI.cookies.init(host.firstElementChild,{persist:false});host.querySelector('[data-cookie-action="reject"]').click();})()`);
  interaction('cookie reject and accept', await evaluate(`(()=>{const rejected=window.auditCookie.getConsent();document.querySelector('#cookieHost [data-cookie-action="accept"]').click();return {rejected,accepted:window.auditCookie.getConsent()};})()`));
  interaction('popover initialization', await evaluate(`({instanceCreated:!!bootstrap.Popover.getInstance(document.querySelector('#testPopover'))})`));
  await evaluate(`BrandUI.lightbox.open(document.querySelector('a[data-lightbox]'))`);await sleep(450);
  interaction('lightbox image',await evaluate(`({modalOpen:document.querySelector('.brand-lightbox').classList.contains('show'),loaded:document.querySelector('.brand-lightbox-image').naturalWidth,counter:document.querySelector('.brand-lightbox-counter').textContent})`));
  await evaluate(`document.querySelector('.brand-lightbox-next').click()`);await sleep(350);
  interaction('lightbox next image',await evaluate(`({loaded:document.querySelector('.brand-lightbox-image').naturalWidth,counter:document.querySelector('.brand-lightbox-counter').textContent})`));
  await evaluate(`document.querySelector('.brand-lightbox-next').click()`);await sleep(350);
  interaction('lightbox failed image',await evaluate(`({errorVisible:!document.querySelector('.brand-lightbox-error').hidden,previousImageVisible:!document.querySelector('.brand-lightbox-image').hidden,previousAlt:document.querySelector('.brand-lightbox-image').alt,caption:document.querySelector('.brand-lightbox-caption').textContent})`));
  await evaluate(`BrandUI.lightbox.close()`);await sleep(400);
  await navigate('examples/overlays.html');
  await evaluate(`document.querySelector('[data-bs-target="#exampleFormModal"]').click()`);await sleep(400);
  interaction('modal form validation', await evaluate(`(()=>{const form=document.querySelector('[data-demo-modal-form]');form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return {validated:form.classList.contains('was-validated'),invalid:form.querySelectorAll('[aria-invalid="true"]').length,active:document.activeElement.id};})()`));
  await viewport(320);await navigate('examples/form.html');
  interaction('standalone form mobile',await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,formPresent:!!document.querySelector('#consultation')})`));
  await navigate('#tables');
  interaction('mobile table overflow source',await evaluate(`(()=>{return [...document.querySelectorAll('.page-heading,.table-toolbar,.table-filter,.field-icon,.brand-select,.table-area,.table-responsive,.table')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {cls:e.className,left:r.left,right:r.right,width:r.width,overflow:s.overflow,minWidth:s.minWidth,display:s.display,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth};});})()`));
  const mobileImage=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/table-mobile.png'),Buffer.from(mobileImage.data,'base64'));
  await evaluate(`(()=>{const s=document.querySelector('#sortProjects');s.focus();s.click();})()`);
  interaction('table keyboard focus after sorting',await evaluate(`({activeTag:document.activeElement.tagName,activeId:document.activeElement.id})`));
  await navigate('#typography');
  interaction('mobile typography heading',await evaluate(`(()=>{return [...document.querySelectorAll('.page-heading,.page-heading>*,#pageTitle,.page-meta')].map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,cls:e.className,left:r.left,right:r.right,width:r.width,text:e.textContent};});})()`));
  await viewport(1440);await navigate('audit-fixture');
  interaction('custom select form validation aria synchronization',await evaluate(`(()=>{const s=document.querySelector('#auditSelect'),t=s.nextElementSibling.querySelector('button');const before=t.getAttribute('aria-invalid');s.setAttribute('aria-invalid','false');document.querySelector('#testForm').classList.add('was-validated');return Promise.resolve().then(()=>({before,after:t.getAttribute('aria-invalid'),nativeValid:s.validity.valid}));})()`));
  interaction('custom select dynamically disabled enhancement',await evaluate(`(async()=>{const s=document.querySelector('#auditSelect');s.multiple=true;BrandUI.init();await Promise.resolve();return {multiple:s.multiple,nativeHidden:s.getAttribute('aria-hidden'),nativeTabIndex:s.tabIndex,customTriggerVisible:!!s.nextElementSibling?.getClientRects().length};})()`));
  interaction('bootstrap semantic colors and theme inheritance',await evaluate(`(()=>{const e=document.createElement('div');e.innerHTML='<div class="card bg-success"><div class="card-body">Текст</div></div><div data-bs-theme="dark" id="nested"><span class="text-primary">Акцентный текст</span><span class="text-danger">Ошибка</span><a href="#">Ссылка</a></div>';document.body.append(e);const c=getComputedStyle(e.querySelector('.bg-success')),t=getComputedStyle(e.querySelector('.text-danger')),a=getComputedStyle(e.querySelector('a')),p=getComputedStyle(e.querySelector('.text-primary'));return {bgSuccess:c.backgroundColor,tokenSuccess:c.getPropertyValue('--ui-success'),danger:t.color,tokenDanger:t.getPropertyValue('--ui-danger'),link:a.color,tokenLink:a.getPropertyValue('--ui-accent-text'),primaryText:p.color,darkBackground:p.getPropertyValue('--ui-bg')};})()`));
  await evaluate(`(()=>{const e=document.createElement('div');e.innerHTML='<label for="basicInput">Текст</label><input class="form-control" id="basicInput" placeholder="Пример">';document.body.append(e);})()`);
  interaction('field colors',await evaluate(`(()=>{const i=document.querySelector('#basicInput'),s=getComputedStyle(i),p=getComputedStyle(i,'::placeholder');return {border:s.borderColor,field:s.backgroundColor,text:s.color,placeholder:p.color,placeholderOpacity:p.opacity,contrast:(()=>{const channels=c=>c.match(/[0-9.]+/g).slice(0,3).map(Number);const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);const bg=channels(s.backgroundColor),fg=channels(p.color).map((v,i)=>v*Number(p.opacity)+bg[i]*(1-Number(p.opacity)));const a=luminance(bg),b=luminance(fg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);})()};})()`));
  await navigate('audit-fixture');
  interaction('native select flags and re-enhancement',await evaluate(`(async()=>{const s=document.querySelector('#auditSelect');const result=[];for(const mode of ['multiple','size','data-native-select']){const staleTrigger=s.nextElementSibling.querySelector('button');if(mode==='multiple')s.multiple=true;else if(mode==='size')s.size=3;else s.setAttribute(mode,'');staleTrigger.click();await Promise.resolve();result.push(s.getAttribute('aria-hidden')===null&&!s.classList.contains('brand-select-native'));if(mode==='multiple')s.multiple=false;else if(mode==='size')s.size=0;else s.removeAttribute(mode);BrandUI.init();result.push(s.nextElementSibling.classList.contains('brand-select'));}return {passed:result.every(Boolean),results:result};})()`));
  await navigate('examples/overlays.html');
  await evaluate(`document.querySelector('[data-bs-target="#exampleFormModal"]').click()`);await sleep(400);
  interaction('select popup inside modal',await evaluate(`(()=>{const s=document.querySelector('#exampleFormModalTime'),t=s.nextElementSibling.querySelector('button');t.click();const m=document.getElementById(t.getAttribute('aria-controls')),r=m.getBoundingClientRect();return {visible:m.contains(document.elementFromPoint(r.left+20,r.top+20)),theme:getComputedStyle(m).backgroundColor};})()`));
  await viewport(1440);await navigate('audit-fixture');
  interaction('tokens affect real controls',await evaluate(`(()=>{const input=document.createElement('input');input.className='form-control';document.body.append(input);const before=getComputedStyle(input).paddingTop;document.documentElement.style.setProperty('--ui-density-control-padding-x','25px');document.documentElement.style.setProperty('--ui-density-control-font-size','19px');document.documentElement.style.setProperty('--ui-density-control-height','72px');const after={padding:getComputedStyle(input).paddingLeft,font:getComputedStyle(input).fontSize,height:input.getBoundingClientRect().height};document.documentElement.style.removeProperty('--ui-density-control-padding-x');document.documentElement.style.removeProperty('--ui-density-control-font-size');document.documentElement.style.removeProperty('--ui-density-control-height');return {before,after};})()`));
  interaction('field boundaries in both themes',await evaluate(`(()=>{const lum=color=>color.match(/[0-9.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);const ratio=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);const input=document.querySelector('#auditPhone');return {themes:['light','dark'].map(theme=>{document.documentElement.dataset.bsTheme=theme;const s=getComputedStyle(input);return {theme,contrast:ratio(lum(s.borderColor),lum(s.backgroundColor))};})};})()`));
  interaction('light primary text',await evaluate(`(()=>{document.documentElement.dataset.bsTheme='light';const e=document.createElement('span');e.className='text-primary';document.body.append(e);return {color:getComputedStyle(e).color};})()`));
  for(const width of [1440,768,390,320]) {await viewport(width);await navigate('examples/foundations.html');interaction('foundations '+width,await evaluate(`({width:innerWidth,clientWidth:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,catalogCSS:[...document.styleSheets].some(s=>s.href?.includes('catalog.css')),gridColumns:getComputedStyle(document.querySelector('.brand-grid')).gridTemplateColumns,headingFont:getComputedStyle(document.querySelector('.brand-h1')).fontFamily})`));}
  const foundationsMobile=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/foundations-mobile.png'),Buffer.from(foundationsMobile.data,'base64'));
  await viewport(1440);await navigate('examples/foundations.html');
  const foundationsDesktop=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/foundations-desktop.png'),Buffer.from(foundationsDesktop.data,'base64'));
  await navigate('audit-fixture');
  interaction('disabled semantic buttons',await evaluate(`(()=>{const host=document.createElement('div');host.innerHTML=['secondary','success','warning','info','danger','outline-success','outline-warning','outline-info','outline-danger'].map(v=>'<button class="btn btn-'+v+'" disabled>Действие</button>').join('');document.body.append(host);const buttons=[...host.querySelectorAll('button')];buttons.forEach(e=>e.style.transition='none');return {themes:['light','dark'].map(theme=>{document.documentElement.dataset.bsTheme=theme;const probe=document.createElement('div');probe.style.background='var(--ui-subtle)';host.append(probe);const expected=getComputedStyle(probe).backgroundColor;const variants=buttons.map(e=>({variant:e.className,background:getComputedStyle(e).backgroundColor}));return {theme,expected,variants,passed:variants.every(e=>e.background===expected)};})};})()`));
  await navigate('audit-fixture');
  interaction('scoped lifecycle', await evaluate(`(async()=>{
    await BrandUI.destroy();
    const host=document.createElement('div');
    host.innerHTML='<input type="tel" id="scopedPhone"><label for="scopedSelect">Вариант</label><select id="scopedSelect" class="form-select" tabindex="3" aria-hidden="false"><option>A</option><option>B</option></select><button data-bs-toggle="tooltip" title="Тест"><i data-lucide="check"></i></button>';
    document.body.append(host);
    BrandUI.init(host);const icon=host.querySelector('svg');BrandUI.init(host);
    const inside=host.querySelector('input'),outside=document.querySelector('#auditPhone');
    inside.value=outside.value='9001234567';inside.dispatchEvent(new Event('input',{bubbles:true}));outside.dispatchEvent(new Event('input',{bubbles:true}));
    const result={isolated:inside.value==='+7 (900) 123-45-67'&&outside.value==='9001234567',idempotent:host.querySelectorAll('.brand-select').length===1&&host.querySelector('svg')===icon};
    const select=host.querySelector('select');host.querySelector('.brand-select-trigger').click();
    await BrandUI.destroy(host);
    result.restored=select.tabIndex===3&&select.getAttribute('aria-hidden')==='false'&&!host.querySelector('label').hasAttribute('id')&&!host.querySelector('.brand-select')&&!document.querySelector('.brand-select-menu')&&host.querySelector('i[data-lucide]')!==null&&bootstrap.Tooltip.getInstance(host.querySelector('button'))===null;
    select.append(new Option('C'));await Promise.resolve();result.observerStopped=!host.querySelector('.brand-select');
    inside.value='9001234567';inside.dispatchEvent(new Event('input',{bubbles:true}));result.phoneStopped=inside.value==='9001234567';
    BrandUI.init();return result;
  })()`));
  interaction('repeated lifecycle',await evaluate(`(async()=>{for(let i=0;i<8;i++){await BrandUI.destroy();BrandUI.init();}return {count:document.querySelectorAll('.brand-select').length,selects:document.querySelectorAll('select.form-select').length};})()`));
  interaction('phone settings',await evaluate(`(()=>{const host=document.createElement('div');host.innerHTML='<input type="tel" data-phone-format="none"><input type="tel" data-phone-format="international">';document.body.append(host);const inputs=host.querySelectorAll('input');inputs[0].value='ext. 123';inputs[1].value='9 (123) 456-789012';BrandUI.phone.configure({maxDigits:10});BrandUI.init(host);const result={optOut:inputs[0].value,international:inputs[1].value};BrandUI.phone.configure({format:'ru',maxDigits:16});return result;})()`));
  interaction('shared forms',await evaluate(`(async()=>{
    const form=document.createElement('form');form.innerHTML='<input name="name" required><button type="submit" name="action" value="save">OK</button><button type="submit" disabled>Disabled</button>';document.body.append(form);
    let calls=0,finish,submitted;const controller=BrandUI.forms.init(form,{onSubmit:detail=>{calls++;submitted=detail.formData;return new Promise(resolve=>finish=resolve);}});
    form.requestSubmit();const invalid=controller.getState()==='invalid'&&document.activeElement===form.elements.name&&form.elements.name.getAttribute('aria-invalid')==='true';
    form.elements.name.value='Имя';form.elements.name.dispatchEvent(new Event('input',{bubbles:true}));
    form.requestSubmit(form.querySelector('button'));form.requestSubmit();const loading=calls===1&&controller.getState()==='loading'&&form.getAttribute('aria-busy')==='true'&&form.querySelector('button').disabled&&submitted.getAll('action').join()==='save';
    finish('Готово');await Promise.resolve();await Promise.resolve();const success=controller.getState()==='success'&&!form.querySelector('button').disabled&&form.querySelectorAll('button')[1].disabled;
    controller.configure({onSubmit:()=>Promise.reject(new Error('Failure'))});form.requestSubmit();await Promise.resolve();await Promise.resolve();const error=controller.getState()==='error';
    controller.configure({onSubmit:()=> 'Повтор выполнен'});form.requestSubmit();await Promise.resolve();await Promise.resolve();const retry=controller.getState()==='success';
    let signal;controller.configure({onSubmit:detail=>{signal=detail.signal;return new Promise(resolve=>finish=resolve);}});form.requestSubmit();controller.destroy();finish('Поздний результат');await Promise.resolve();await Promise.resolve();
    const cleanup=signal.aborted&&!form.querySelector('[data-form-status]')&&!form.hasAttribute('aria-busy')&&!form.noValidate&&form.elements.name.getAttribute('aria-invalid')===null;
    return {invalid,loading,success,error,retry,cleanup};
  })()`));
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
  interaction('nested themes',await evaluate(`(()=>{
    const outer=document.createElement('div');outer.dataset.brandTheme='system';outer.innerHTML='<button data-theme-mode="light">Light</button><button data-theme-mode="system">System</button><div data-brand-theme="dark"><button data-theme-mode="light">Nested light</button><button data-theme-mode="dark">Nested dark</button></div>';document.body.append(outer);BrandUI.init(outer);
    const nested=outer.querySelector('div'),controller=BrandUI.theme.get(outer);nested.querySelector('button').click();
    window.themeProbe={outer,nested,controller};return {outer:outer.dataset.bsTheme,nested:nested.dataset.bsTheme,mode:controller.getMode()};
  })()`));
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await sleep(50);
  interaction('system theme update',await evaluate(`({outer:themeProbe.outer.dataset.bsTheme,nested:themeProbe.nested.dataset.bsTheme})`));
  await evaluate(`BrandUI.destroy(themeProbe.outer)`);
  await call('Emulation.setEmulatedMedia',{features:[]});
  await navigate('audit-fixture');
  interaction('lightbox lifecycle',await evaluate(`(async()=>{const link=document.querySelector('[data-lightbox]');BrandUI.lightbox.open(link);await BrandUI.destroy();const clean=!document.querySelector('.brand-lightbox')&&!document.querySelector('.modal-backdrop')&&!document.body.classList.contains('modal-open');BrandUI.init();return {clean};})()`));
  interaction('cookie lifecycle',await evaluate(`(async()=>{const host=document.querySelector('#cookieHost');host.innerHTML=BrandUI.cookies.markup({id:'destroyCookie',variant:'corner'});const root=host.firstElementChild;BrandUI.cookies.init(root,{persist:false});root.querySelector('[data-cookie-action="settings"]').click();await BrandUI.destroy(host);root.querySelector('[data-cookie-action="accept"]').click();return {clean:bootstrap.Modal.getInstance(root.querySelector('[data-cookie-settings]'))===null&&!document.querySelector('.modal-backdrop')};})()`));
  for(const width of [1440,768,390,320]) {
    await viewport(width);await navigate('examples/table.html');
    for(const theme of ['light','dark']) {
      await evaluate(`BrandUI.theme.get().setMode('${theme}')`);
      interaction('portable table '+width+' '+theme,await evaluate(`({clientWidth:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,catalogCSS:[...document.styleSheets].some(s=>s.href?.includes('catalog.css')),rows:document.querySelectorAll('tbody tr').length})`));
    }
  }
  await sleep(250);
  const tableMobile=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/table-mobile.png'),Buffer.from(tableMobile.data,'base64'));
  await viewport(1440);await navigate('examples/table.html');
  await sleep(250);
  const tableDesktop=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/table-desktop.png'),Buffer.from(tableDesktop.data,'base64'));
  interaction('portable table behavior',await evaluate(`(async()=>{
    const host=document.querySelector('#projects'),controller=BrandUI.table.get(host);const checkbox=host.querySelector('[data-table-row]');const first=checkbox.dataset.tableRow;checkbox.click();
    host.querySelector('[data-table-page="2"]').click();const selection=controller.getState().selected.includes(first)&&host.querySelectorAll('tbody tr').length===5;
    const search=host.querySelector('[data-table-search]');search.focus();search.value='Проект 12';search.dispatchEvent(new Event('input',{bubbles:true}));const searched=host.querySelectorAll('tbody tr').length===1&&document.activeElement===search;
    let action;host.addEventListener('brand:table-action',event=>action=event.detail.id,{once:true});host.querySelector('[data-table-action]').click();
    controller.update({query:'',filter:'published'});const filtered=controller.getState().total===6;
    const sort=host.querySelector('[data-table-sort]');sort.focus();sort.click();const focused=document.activeElement===sort&&sort.parentElement.getAttribute('aria-sort')==='ascending';
    controller.update({rows:[{id:99,name:'<img src=x onerror=alert(1)>',status:'Опубликован',owner:'Тест'}]});const safe=host.querySelector('tbody').textContent.includes('<img')&&!host.querySelector('tbody img');
    let rejected=false;try{controller.update({rows:[],pageSize:0});}catch{rejected=true;}const atomic=rejected&&controller.getState().total===1;
    await controller.destroy();const clean=!host.querySelector('.brand-table')&&!BrandUI.table.get(host);
    return {selection,searched,action,filtered,focused,safe,atomic,clean};
  })()`));
  await navigate('#lightbox');
  await evaluate(`document.querySelector('#view [data-lightbox]').click();location.hash='forms';setTimeout(()=>location.hash='tables',10)`);
  await sleep(800);
  interaction('catalog lifecycle during navigation',await evaluate(`({table:!!document.querySelector('#projectTable'),backdrop:!!document.querySelector('.modal-backdrop'),viewer:!!document.querySelector('.brand-lightbox'),title:document.title})`));
  await navigate(pathToFileURL(join(root,'examples/table.html')).href);
  interaction('offline table',await evaluate(`({file:location.protocol==='file:',rows:document.querySelectorAll('tbody tr').length,ready:!!BrandUI.table.get(document.querySelector('#projects'))})`));
  await navigate(pathToFileURL(join(root,'examples/form.html')).href);
  interaction('offline form',await evaluate(`(()=>{const form=document.querySelector('form');form.requestSubmit();return {file:location.protocol==='file:',state:BrandUI.forms.get(form).getState(),focused:document.activeElement===form.elements.name};})()`));
  for(const width of [1440,768,390,320]) {
    await viewport(width);await navigate('examples/components.html');
    for(const theme of ['light','dark']) {
      await evaluate(`BrandUI.theme.get().setMode('${theme}')`);
      interaction('basic components '+width+' '+theme,await evaluate(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return {scroll:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,catalogCSS:[...document.styleSheets].some(s=>s.href?.includes('catalog.css')),duplicates:ids.filter((id,i)=>ids.indexOf(id)!==i),cards:document.querySelectorAll('.brand-card').length,nestedControls:document.querySelectorAll('button button, a a, a button, button a').length};})()`));
    }
  }
  await viewport(1440);await navigate('examples/components.html');await evaluate(`BrandUI.theme.get().setMode('light')`);await sleep(250);
  const basicDesktop=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/components-desktop.png'),Buffer.from(basicDesktop.data,'base64'));
  interaction('card images',await evaluate(`(async()=>{const images=[...document.querySelectorAll('.brand-card-media')];await Promise.all(images.map(image=>{image.loading='eager';return image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});});}));return {loaded:images.every(image=>image.naturalWidth>0)};})()`));
  await evaluate(`document.querySelector('#lists [data-component-demo]').focus()`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  interaction('list secondary keyboard action',await evaluate(`({status:document.querySelector('#lists [data-components-status]').textContent,hash:location.hash})`));
  interaction('avatar image fallback and cleanup',await evaluate(`(async()=>{
    const roots=[...document.querySelectorAll('#identity .brand-cluster [data-brand-avatar]')],avatar=roots.at(-1),image=avatar.querySelector('img'),fallback=avatar.querySelector('[data-avatar-fallback]'),controller=BrandUI.avatar.get(avatar);
    if(!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});});
    const sizes=roots.map(e=>getComputedStyle(e).width).join();const loaded=controller.getState()==='image'&&!image.hidden&&fallback.hidden;
    const source=image.src;await new Promise(resolve=>{image.addEventListener('error',resolve,{once:true});image.src='data:image/png;base64,AA==';});await Promise.resolve();const failed=controller.getState()==='fallback'&&image.hidden&&!fallback.hidden;
    await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});image.src=source;});await Promise.resolve();const recovered=controller.getState()==='image';
    await BrandUI.destroy(avatar);const clean=image.hidden&&!fallback.hidden&&!avatar.hasAttribute('data-avatar-state')&&!BrandUI.avatar.get(avatar);BrandUI.init(avatar);
    return {sizes,loaded,failed,recovered,clean};
  })()`));
  await evaluate(`document.querySelector('#identity [data-chip-value="web"]').focus()`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  interaction('single chips keyboard',await evaluate(`({values:BrandUI.chips.get(document.querySelector('[data-chip-selection="single"]')).getSelection()})`));
  interaction('multiple chips behavior',await evaluate(`(()=>{
    const root=document.querySelector('[data-chip-selection="multiple"]'),controller=BrandUI.chips.get(root);root.querySelector('[data-chip-value="development"] [data-chip-toggle]').click();const multiple=controller.getSelection().length===2;
    const disabled=!controller.select('disabled',true)&&!controller.getSelection().includes('disabled');
    root.addEventListener('brand:chip-remove',event=>event.preventDefault(),{once:true});const cancelled=!controller.remove('design')&&!!root.querySelector('[data-chip-value="design"]');
    const remove=root.querySelector('[data-chip-value="design"] [data-chip-remove]');remove.focus();remove.click();const removed=!root.querySelector('[data-chip-value="design"]')&&!controller.getSelection().includes('design')&&document.activeElement===root.querySelector('[data-chip-value="development"] [data-chip-toggle]');
    const next=document.createElement('button');next.className='brand-chip';next.type='button';next.dataset.chipToggle='';next.dataset.chipValue='new';next.textContent='Новый';root.append(next);BrandUI.init(root);next.click();const dynamic=controller.getSelection().includes('new');
    controller.destroy();next.click();const clean=!next.hasAttribute('aria-pressed')&&!BrandUI.chips.get(root);BrandUI.init(root);return {multiple,disabled,cancelled,removed,dynamic,clean};
  })()`));
  interaction('chips invalid initialization recovery',await evaluate(`(()=>{const host=document.createElement('div');host.dataset.brandChips='';host.innerHTML='<button type="button" data-chip-toggle data-chip-value="duplicate">Первый</button><button type="button" data-chip-toggle data-chip-value="duplicate">Второй</button>';document.body.append(host);let rejected=false,changes=0;try{BrandUI.chips.init(host);}catch(error){rejected=error instanceof TypeError;}const clean=!BrandUI.chips.get(host)&&!host.querySelector('[aria-pressed]');host.lastElementChild.dataset.chipValue='second';const controller=BrandUI.chips.init(host);host.addEventListener('brand:chips-change',()=>changes++);host.lastElementChild.click();const recovered=controller.getSelection().join()==='second'&&changes===1;controller.destroy();return {rejected,clean,recovered};})()`));
  interaction('last chip focus and empty state',await evaluate(`(()=>{
    const root=document.createElement('div');root.dataset.brandChips='';root.setAttribute('role','group');root.setAttribute('aria-label','Фильтры');root.innerHTML='<span class="brand-chip" data-chip-value="one"><span>Один</span><button type="button" data-chip-remove>Удалить</button></span><p data-chips-empty hidden>Пусто</p>';document.body.append(root);BrandUI.init(root);root.querySelector('button').focus();root.querySelector('button').click();const focused=document.activeElement===root&&!root.querySelector('[data-chips-empty]').hidden;BrandUI.chips.get(root).destroy();return {focused,restored:!root.hasAttribute('tabindex')};
  })()`));
  await viewport(320);await navigate('examples/components.html');await evaluate(`BrandUI.theme.get().setMode('light')`);await sleep(250);
  const basicMobile=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/components-mobile.png'),Buffer.from(basicMobile.data,'base64'));
  await evaluate(`document.documentElement.style.scrollBehavior='auto';document.querySelector('#identity').scrollIntoView({behavior:'instant'})`);
  const identityMobile=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/identity-mobile.png'),Buffer.from(identityMobile.data,'base64'));
  await evaluate(`const navButton=document.querySelector('.brand-navbar-toggle');navButton.scrollIntoView();navButton.focus();navButton.click()`);await sleep(350);
  const navbarMobile=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/navbar-mobile.png'),Buffer.from(navbarMobile.data,'base64'));
  interaction('mobile navbar opens',await evaluate(`({open:document.querySelector('#componentsMenu').classList.contains('show'),expanded:document.querySelector('.brand-navbar-toggle').getAttribute('aria-expanded'),focusInside:document.querySelector('#componentsMenu').contains(document.activeElement)})`));
  for(let i=0;i<6;i++){await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});}
  interaction('navbar focus trap',await evaluate(`({inside:document.querySelector('#componentsMenu').contains(document.activeElement)})`));
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(350);
  interaction('navbar Escape restores focus',await evaluate(`({closed:!document.querySelector('#componentsMenu').classList.contains('show'),focus:document.activeElement===document.querySelector('.brand-navbar-toggle'),expanded:document.querySelector('.brand-navbar-toggle').getAttribute('aria-expanded')})`));
  await evaluate(`document.querySelector('.brand-navbar-toggle').click()`);await sleep(350);await evaluate(`document.querySelector('#componentsMenu a[href="#cards"]').click()`);await sleep(350);
  interaction('navbar link closes menu',await evaluate(`({closed:!document.querySelector('#componentsMenu').classList.contains('show'),hash:location.hash})`));
  await evaluate(`const drawerButton=document.querySelector('[data-bs-target="#componentsDrawer"]');drawerButton.scrollIntoView();drawerButton.focus();drawerButton.click()`);await sleep(350);
  const drawerMobile=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/drawer-mobile.png'),Buffer.from(drawerMobile.data,'base64'));
  interaction('standalone drawer and select',await evaluate(`(()=>{const root=document.querySelector('#componentsDrawer'),trigger=root.querySelector('.brand-select-trigger');trigger.focus();trigger.click();const menu=document.getElementById(trigger.getAttribute('aria-controls')),r=menu.getBoundingClientRect();return {open:root.classList.contains('show'),visible:menu.contains(document.elementFromPoint(r.left+20,r.top+20))};})()`));
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  interaction('select Escape leaves drawer open',await evaluate(`({open:document.querySelector('#componentsDrawer').classList.contains('show'),popup:!!document.querySelector('.brand-select-menu:not([hidden])')})`));
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(350);
  interaction('drawer Escape restores focus',await evaluate(`({closed:!document.querySelector('#componentsDrawer').classList.contains('show'),focus:document.activeElement===document.querySelector('[data-bs-target="#componentsDrawer"]')})`));
  interaction('drawer destroy during opening',await evaluate(`(async()=>{const root=document.querySelector('#componentsDrawer');BrandUI.drawer.get(root).show(document.querySelector('[data-bs-target="#componentsDrawer"]'));await BrandUI.destroy(root);const clean=!document.querySelector('.offcanvas-backdrop')&&!root.classList.contains('show')&&bootstrap.Offcanvas.getInstance(root)===null&&!document.body.style.overflow&&!root.querySelector('.brand-select');BrandUI.init(root);return {clean};})()`));
  await evaluate(`document.querySelector('[data-bs-theme="dark"] [data-bs-toggle="popover"]').scrollIntoView();document.querySelector('[data-bs-theme="dark"] [data-bs-toggle="popover"]').focus()`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await sleep(50);
  const popoverMobile=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'test-results/popover-mobile.png'),Buffer.from(popoverMobile.data,'base64'));
  interaction('popover nested theme',await evaluate(`(()=>{const tip=document.querySelector('.popover');return {visible:!!tip,background:tip?getComputedStyle(tip).backgroundColor:'',color:tip?getComputedStyle(tip.querySelector('.popover-body')).color:'',expanded:document.activeElement.getAttribute('aria-expanded')};})()`));
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  interaction('popover Escape',await evaluate(`({closed:!document.querySelector('.popover'),focused:document.activeElement.matches('[data-bs-toggle="popover"]'),expanded:document.activeElement.getAttribute('aria-expanded')})`));
  interaction('popover outside and cleanup',await evaluate(`(async()=>{const host=document.createElement('div');host.dataset.bsTheme='dark';host.innerHTML='<span id="popoverHelp">Помощь</span><button data-bs-toggle="popover" title="Заголовок" data-bs-content="&lt;img src=x&gt;" aria-describedby="popoverHelp">Подробнее</button>';document.body.append(host);BrandUI.init(host);const button=host.querySelector('button');button.click();await new Promise(resolve=>setTimeout(resolve,30));const described=button.getAttribute('aria-describedby').includes('popoverHelp')&&!!document.querySelector('.popover-body')?.textContent.includes('<img')&&!document.querySelector('.popover img');document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));const outside=!document.querySelector('.popover');button.click();await BrandUI.destroy(host);return {described,outside,clean:!document.querySelector('.popover')&&bootstrap.Popover.getInstance(button)===null&&button.getAttribute('aria-describedby')==='popoverHelp'&&!button.hasAttribute('aria-expanded')&&button.getAttribute('title')==='Заголовок'&&!button.hasAttribute('data-bs-original-title')&&!button.hasAttribute('aria-label')};})()`));
  await evaluate(`document.querySelector('#site-navigation [data-bs-toggle="tooltip"]').scrollIntoView();document.querySelector('#site-navigation [data-bs-toggle="tooltip"]').focus()`);await sleep(50);
  interaction('tooltip keyboard',await evaluate(`({visible:!!document.querySelector('.tooltip'),description:!!document.activeElement.getAttribute('aria-describedby')})`));
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  interaction('tooltip Escape',await evaluate(`({closed:!document.querySelector('.tooltip')})`));
  await viewport(1440);await navigate('#site-navigation');await evaluate(`document.querySelector('[data-components-code]').click()`);
  interaction('components catalog source',await evaluate(`({visible:!document.querySelector('#componentsCode').hidden,source:document.querySelector('#componentsCode').textContent.includes('data-brand-drawer'),expanded:document.querySelector('[data-components-code]').getAttribute('aria-expanded')})`));
  await viewport(390);await evaluate(`document.querySelector('#view [data-bs-target="#catalogComponentsDrawer"]').click();setTimeout(()=>location.hash='cards',10)`);await sleep(800);
  interaction('catalog drawer cleanup',await evaluate(`({cards:document.querySelectorAll('#view .brand-card').length,clean:!document.querySelector('.offcanvas-backdrop')&&!document.body.style.overflow})`));
  await navigate(pathToFileURL(join(root,'examples/components.html')).href);
  interaction('offline basic components',await evaluate(`({file:location.protocol==='file:',cards:document.querySelectorAll('.brand-card').length,avatar:!!BrandUI.avatar.get(document.querySelector('[data-brand-avatar]')),drawer:!!BrandUI.drawer.get(document.querySelector('[data-brand-drawer]'))})`));
  const failures=report.routes.filter(r=>!r.viewPresent||r.scroll>r.clientWidth+2||r.duplicateIds.length);
  console.log('SUMMARY',JSON.stringify({routeChecks:report.routes.length,layoutFailures:failures,exceptions:report.exceptions,requests:report.requests}));
  const byName = name => report.interactions.find(t=>t.name===name);
  const checks = [
    ['All catalog routes fit the viewport', failures.length===0],
    ['No JavaScript exceptions', report.exceptions.length===0],
    ['Catalog table search, filtering and pagination', byName('table filter/search/sort/pagination').initial===5&&byName('table filter/search/sort/pagination').page2===5&&byName('table filter/search/sort/pagination').filtered===5&&byName('table filter/search/sort/pagination').total===6&&byName('table filter/search/sort/pagination').empty==='Строки не найдены'],
    ['Table sorting keeps keyboard focus', byName('table keyboard focus after sorting').activeId==='sortProjects'],
    ['Select popup stays visible inside modal', byName('select popup inside modal').visible===true],
    ['All native-select flags can be toggled', byName('native select flags and re-enhancement').passed===true],
    ['Select popup escapes clipping parent', byName('select popup clipping').clipped===false],
    ['Select follows form validation', byName('custom select form validation aria synchronization').after==='true'],
    ['Multiple select restores native control', byName('custom select dynamically disabled enhancement').nativeHidden===null && byName('custom select dynamically disabled enhancement').nativeTabIndex===0],
    ['Lightbox hides previous image on error', byName('lightbox failed image').previousImageVisible===false],
    ['Select keyboard skips disabled options', byName('select and telephone').chosen==='c'],
    ['Select resets its visible label', byName('select and telephone').reset.value==='' && byName('select and telephone').reset.label==='Выберите'],
    ['Telephone mask is preserved', byName('select and telephone').phone==='+7 (900) 123-45-67'],
    ['Cookie reject/accept preserves user choice', byName('cookie reject and accept').rejected.metrica===false && byName('cookie reject and accept').accepted.metrica===true],
    ['Modal validates and focuses first error', byName('modal form validation').invalid===4 && byName('modal form validation').active==='exampleFormModalName'],
    ['Semantic colors follow nested theme', byName('bootstrap semantic colors and theme inheritance').danger==='rgb(255, 136, 142)' && byName('bootstrap semantic colors and theme inheritance').link==='rgb(193, 240, 0)'],
    ['Placeholder text contrast meets 4.5:1', byName('field colors').contrast>=4.5],
    ['Density token overrides update actual control styles', byName('tokens affect real controls').after.padding==='25px' && byName('tokens affect real controls').after.font==='19px' && byName('tokens affect real controls').after.height===72],
    ['Field boundaries have at least 3:1 contrast', byName('field boundaries in both themes').themes.every(t=>t.contrast>=3)],
    ['Primary text uses readable light accent', byName('light primary text').color==='rgb(78, 104, 0)'],
    ['Disabled semantic buttons follow both themes', byName('disabled semantic buttons').themes.every(t=>t.passed)],
    ['Foundations work at all widths without catalog CSS', [1440,768,390,320].every(w=>{const r=byName('foundations '+w);return r.scroll<=r.clientWidth+2 && !r.catalogCSS})],
    ['Scoped init/destroy isolates and restores controls', Object.values(byName('scoped lifecycle')).filter(v=>typeof v==='boolean').every(Boolean)],
    ['Repeated lifecycle creates one control per select', byName('repeated lifecycle').count===byName('repeated lifecycle').selects],
    ['Phone configuration and opt-out work', byName('phone settings').optOut==='ext. 123'&&byName('phone settings').international==='+9123456789'],
    ['Shared forms validate, lock, recover and cancel', Object.values(byName('shared forms')).filter(v=>typeof v==='boolean').every(Boolean)],
    ['Nested themes remain independent', byName('nested themes').outer==='light'&&byName('nested themes').nested==='light'&&byName('nested themes').mode==='system'],
    ['System theme reacts to browser preference', byName('system theme update').outer==='dark'&&byName('system theme update').nested==='light'],
    ['Destroy closes transitioning lightbox', byName('lightbox lifecycle').clean],
    ['Destroy closes transitioning cookie settings', byName('cookie lifecycle').clean],
    ['Portable table fits all widths and both themes', [1440,768,390,320].every(w=>['light','dark'].every(t=>{const r=byName('portable table '+w+' '+t);return r.scroll<=r.clientWidth+2&&!r.catalogCSS&&r.rows===5;}))],
    ['Portable table behavior and safe content', byName('portable table behavior').action==='12'&&Object.values(byName('portable table behavior')).filter(v=>typeof v==='boolean').every(Boolean)],
    ['Catalog waits for cleanup and keeps latest route', byName('catalog lifecycle during navigation').table&&!byName('catalog lifecycle during navigation').backdrop&&!byName('catalog lifecycle during navigation').viewer],
    ['Standalone table and form work over file://', byName('offline table').file&&byName('offline table').ready&&byName('offline table').rows===5&&byName('offline form').file&&byName('offline form').state==='invalid'&&byName('offline form').focused],
    ['Basic components fit both themes at every width', [1440,768,390,320].every(w=>['light','dark'].every(t=>{const r=byName('basic components '+w+' '+t);return r.scroll<=r.clientWidth+2&&!r.catalogCSS&&!r.duplicates.length&&r.cards===4&&r.nestedControls===0;}))],
    ['Card images load locally', byName('card images').loaded],
    ['List secondary action works by keyboard', byName('list secondary keyboard action').status.includes('избранное')&&byName('list secondary keyboard action').hash===''],
    ['Avatar sizes, error, recovery and cleanup', byName('avatar image fallback and cleanup').sizes==='24px,36px,48px,64px'&&Object.values(byName('avatar image fallback and cleanup')).filter(v=>typeof v==='boolean').every(Boolean)],
    ['Single chip selection works by keyboard', byName('single chips keyboard').values.join()==='web'],
    ['Chips select, cancel removal, keep focus and clean up', Object.values(byName('multiple chips behavior')).filter(v=>typeof v==='boolean').every(Boolean)],
    ['Chips reject invalid markup and recover without duplicate handlers', Object.values(byName('chips invalid initialization recovery')).filter(v=>typeof v==='boolean').every(Boolean)],
    ['Last chip exposes empty state and keeps focus', byName('last chip focus and empty state').focused&&byName('last chip focus and empty state').restored],
    ['Mobile navbar opens with focus and state', byName('mobile navbar opens').open&&byName('mobile navbar opens').focusInside&&byName('mobile navbar opens').expanded==='true'],
    ['Navbar traps focus and Escape returns it', byName('navbar focus trap').inside&&byName('navbar Escape restores focus').closed&&byName('navbar Escape restores focus').focus&&byName('navbar Escape restores focus').expanded==='false'],
    ['Navbar closes after following a link', byName('navbar link closes menu').closed&&byName('navbar link closes menu').hash==='#cards'],
    ['Drawer select stays visible and Escape closes in order', byName('standalone drawer and select').open&&byName('standalone drawer and select').visible&&byName('select Escape leaves drawer open').open&&!byName('select Escape leaves drawer open').popup&&byName('drawer Escape restores focus').closed&&byName('drawer Escape restores focus').focus],
    ['Drawer destroy waits for opening and restores controls', byName('drawer destroy during opening').clean],
    ['Popover inherits nested theme', byName('popover initialization').instanceCreated&&byName('popover nested theme').visible&&byName('popover nested theme').background==='rgb(23, 25, 25)'&&byName('popover nested theme').color==='rgb(245, 246, 245)'&&byName('popover nested theme').expanded==='true'],
    ['Popover closes by Escape and outside; restores descriptions', byName('popover Escape').closed&&byName('popover Escape').focused&&byName('popover Escape').expanded==='false'&&Object.values(byName('popover outside and cleanup')).filter(v=>typeof v==='boolean').every(Boolean)],
    ['Tooltip shows on keyboard focus and closes by Escape', byName('tooltip keyboard').visible&&byName('tooltip keyboard').description&&byName('tooltip Escape').closed],
    ['New catalog sections expose HTML and clean open drawer', byName('components catalog source').visible&&byName('components catalog source').source&&byName('components catalog source').expanded==='true'&&byName('catalog drawer cleanup').cards===4&&byName('catalog drawer cleanup').clean],
    ['Basic components work over file://', byName('offline basic components').file&&byName('offline basic components').cards===4&&byName('offline basic components').avatar&&byName('offline basic components').drawer]
  ];
  report.checks=checks.map(([name,passed])=>({name,passed}));
  await writeFile(join(root,'test-results/browser.json'),JSON.stringify(report,null,2));
  for(const check of report.checks) console.log((check.passed?'PASS ':'FAIL ')+check.name);
  if(report.checks.some(c=>!c.passed)) process.exitCode=1;
} finally { ws?.close();chrome.kill('SIGTERM');server.close(); }
