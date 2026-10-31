import assert from 'node:assert/strict';
import { access, mkdtemp, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { browser, sleep, root } from './runtime.mjs';
const check=(name,value)=>{assert.ok(value,name);console.log('PASS '+name);};
await browser(async({evaluate,navigate,viewport,key,screenshot,call})=>{
  for(const width of [320,390,768,1440])for(const theme of ['light','dark'])for(const density of ['default','compact']){
    await viewport(width);await navigate('#buttons');
    await evaluate(`document.documentElement.dataset.bsTheme='${theme}';document.documentElement.dataset.uiDensity='${density}';document.querySelector('[data-example-density]').value='compact';BrandUI.init(document.querySelector('#exampleInspector'))`);
    check(`preview controls pack without premature wraps ${width} ${theme} ${density}`,await evaluate(`(()=>{
      const row=document.querySelector('.catalog-example-controls'),box=row.getBoundingClientRect(),gap=parseFloat(getComputedStyle(row).columnGap),items=[...row.children].map(e=>e.getBoundingClientRect());
      return document.documentElement.scrollWidth<=innerWidth+1&&items.every((r,i)=>r.left>=box.left-1&&r.right<=box.right+1&&(!i||Math.abs(r.bottom-items[i-1].bottom)<1||items[i-1].right+gap+r.width>box.right-1))&&
        (innerWidth!==1440||items.every(r=>Math.abs(r.bottom-items[0].bottom)<1))&&[...row.querySelectorAll('.brand-select-trigger')].every(b=>b.getBoundingClientRect().height>=${density==='compact'?36:44}-1&&parseFloat(getComputedStyle(b).fontSize)>=14)&&[...row.querySelectorAll('.brand-select-value')].every(v=>v.scrollWidth<=v.clientWidth+1);
    })()`));
  }
  await viewport(1440);await navigate('#buttons');
  await evaluate(`document.documentElement.dataset.uiDensity='default'`);
  for(const native of [false,true]){
    await evaluate(`(()=>{const p=document.querySelector('#exampleInspector');for(const s of p.querySelectorAll('select'))s.toggleAttribute('data-native-select',${native});BrandUI.init(p)})()`);
    for(const width of [240,320,660,1000]){
      await evaluate(`document.querySelector('.catalog-example-controls').style.width='${width}px'`);
      check(`preview controls fit own container ${width} native=${native}`,await evaluate(`(()=>{const row=document.querySelector('.catalog-example-controls'),box=row.getBoundingClientRect(),items=[...row.children].map(e=>e.getBoundingClientRect()),gap=parseFloat(getComputedStyle(row).columnGap),required=items.reduce((sum,r)=>sum+r.width,0)+gap*(items.length-1);return items.every((r,i)=>r.left>=box.left-1&&r.right<=box.right+1&&(!i||Math.abs(r.bottom-items[i-1].bottom)<1||items[i-1].right+gap+r.width>box.right-1))&&(required>box.width||items.every(r=>Math.abs(r.bottom-items[0].bottom)<1))})()`));
    }
  }
  check('long labels and values wrap within a narrow control row',await evaluate(`(()=>{const row=document.querySelector('.catalog-example-controls');row.style.width='240px';const s=row.querySelector('select');s.prepend(new Option('Длинное название параметра для проверки узкой панели','long',true,true));s.parentElement.prepend('ПодписьОченьДлинногоПараметраБезПробелов'.repeat(3)+' ');s.removeAttribute('data-native-select');BrandUI.init(row);const box=row.getBoundingClientRect(),label=s.parentElement.getBoundingClientRect(),b=s.nextElementSibling.querySelector('button').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(s.parentElement.firstChild);return label.left>=box.left&&label.right<=box.right+1&&[...range.getClientRects()].every(r=>r.right<=box.right+1)&&b.right<=box.right+1&&b.height>=44&&document.documentElement.scrollWidth<=innerWidth+1})()`));
  // Reload the document to remove the narrow-container fixture before screenshots/copies.
  await navigate('index.html#buttons');
  await evaluate(`document.documentElement.style.scrollBehavior='auto';document.querySelector('#exampleInspector').scrollIntoView({block:'start',behavior:'instant'})`);
  await screenshot('catalog-controls-desktop.png');
  await viewport(390);await evaluate(`document.querySelector('#exampleInspector').scrollIntoView({block:'start',behavior:'instant'})`);await screenshot('catalog-controls-mobile.png');
  await navigate('#buttons');
  const copies=await evaluate(`BrandUICatalogExamples.entries().map(e=>({id:e.id,title:e.title,modules:e.modules,html:BrandUICatalogExamples.source(e.id)}))`);
  assert.equal(copies.length,86);
  for(const entry of copies){
    for(const match of entry.html.matchAll(/(?:src|href)="([^"]+)"/g)){const url=match[1];if(!url.includes(':')&&!url.startsWith('#'))await access(resolve(root,url.split('#')[0]));}
    await evaluate(`(()=>{const frame=document.querySelector('[data-example-frame]');frame.srcdoc=BrandUICatalogExamples.source(${JSON.stringify(entry.id)},{base:new URL('.',location.href).href});})()`);
    let ready=false;
    for(let n=0;n<100;n++){await sleep(30);if(await evaluate(`(()=>{const f=document.querySelector('iframe'),d=f.contentDocument,w=f.contentWindow;return d?.documentElement.dataset.exampleId===${JSON.stringify(entry.id)}&&d.readyState==='complete'&&!!w.BrandUIDemo&&!!w.BrandUI})()`)){ready=true;break;}}
    check('copied document initializes '+entry.id,ready&&await evaluate(`(()=>{const d=document.querySelector('iframe').contentDocument,w=document.querySelector('iframe').contentWindow,ids=[...d.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length&&![...d.styleSheets].some(s=>s.href?.includes('catalog.css'))&&!d.querySelector('script[src="catalog.js"]')&&d.querySelector('h1')&&d.documentElement.scrollWidth<=d.documentElement.clientWidth+2})()`));
    if(entry.id==='consultation') check('copied form includes contact mode and submit handlers',await evaluate(`(async()=>{const f=document.querySelector('iframe'),d=f.contentDocument,w=f.contentWindow,form=d.querySelector('form'),method=form.querySelector('[data-contact-method]');method.value='phone';method.dispatchEvent(new w.Event('change',{bubbles:true}));const changed=form.elements.contact.type==='tel'&&form.querySelector('[data-contact-label]').textContent==='Телефон';method.value='email';method.dispatchEvent(new w.Event('change',{bubbles:true}));form.elements.name.value='Анна';form.elements.contact.value='test@example.com';form.elements.time.selectedIndex=1;form.elements.consent.checked=true;form.requestSubmit();await new Promise(r=>setTimeout(r,20));return changed&&w.BrandUI.forms.get(form).getState()==='success'})()`));
    if(entry.id==='navigation') check('copied navigation tabs and pagination handlers work',await evaluate(`(()=>{const d=document.querySelector('iframe').contentDocument;d.querySelector('#projectsTab').click();d.querySelector('[data-nav-page="2"]').click();return d.querySelector('#projectsPanel').classList.contains('active')&&d.querySelector('#navigationPageStatus').textContent.includes('2 из 3')})()`));
    if(entry.id==='feedback') check('copied feedback has queue and retry callbacks',await evaluate(`(async()=>{const d=document.querySelector('iframe').contentDocument,w=document.querySelector('iframe').contentWindow;d.querySelector('[data-demo-toast="queue"]').click();const queue=d.querySelectorAll('.brand-toast').length===3;const r=d.querySelector('[data-demo-retry="reset"]');r.querySelector('button').click();await new Promise(resolve=>setTimeout(resolve,400));return queue&&w.BrandUI.states.get(r).getState()==='ready'})()`));
    if(entry.id==='table') check('copied table selection and retry callbacks work',await evaluate(`(async()=>{const d=document.querySelector('iframe').contentDocument,w=document.querySelector('iframe').contentWindow,h=d.querySelector('[data-example-table]'),c=w.BrandUI.table.get(h);h.querySelector('[data-table-row]').click();const chosen=c.getState().selected.length===1;c.setState('error');h.querySelector('[data-table-retry]').click();await new Promise(r=>setTimeout(r,400));return chosen&&c.getState().status==='ready'})()`));
    if(entry.id==='modal-form') check('copied modal form has validation and success callback',await evaluate(`(async()=>{const d=document.querySelector('iframe').contentDocument,w=document.querySelector('iframe').contentWindow,f=d.querySelector('form');for(const e of f.elements){if(e.name==='name')e.value='Анна';if(e.type==='tel')e.value='+7 (900) 123-45-67';if(e.tagName==='SELECT')e.selectedIndex=1;if(e.type==='checkbox')e.checked=true}f.requestSubmit();await new Promise(r=>setTimeout(r,20));return w.BrandUI.forms.get(f).getState()==='success'&&!f.querySelector('[data-demo-modal-result]').hidden})()`));
    if(entry.id==='site-contact') check('copied contact forms have explicit demo results',await evaluate(`(()=>{const d=document.querySelector('iframe').contentDocument,f=d.querySelector('[data-site-demo-form]');f.elements.name.value='Анна';f.elements.email.value='test@example.com';f.requestSubmit();return !f.querySelector('[data-site-form-result]').hidden})()`));

  }
  await viewport(320);await navigate('#site-blocks/site-hero');await sleep(250);
  check('deep link chooses matching example and mobile search remains visible',await evaluate(`document.querySelector('[data-example-select]').value==='site-hero'&&getComputedStyle(document.querySelector('.catalog-search')).display!=='none'&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+2`));
  await evaluate(`document.querySelector('[data-example-width]').value='390';document.querySelector('[data-example-width]').dispatchEvent(new Event('change',{bubbles:true}))`);await sleep(100);
  check('iframe viewport is independent from parent width',await evaluate(`document.querySelector('iframe').contentWindow.innerWidth===390&&document.querySelector('.catalog-iframe-scroll').scrollWidth>document.querySelector('.catalog-iframe-scroll').clientWidth&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+2`));
  await evaluate(`document.querySelector('[data-example-theme]').value='dark';document.querySelector('[data-example-theme]').dispatchEvent(new Event('change',{bubbles:true}))`);await sleep(250);
  check('preview uses an independent dark document and properties/dependencies',await evaluate(`document.querySelector('iframe').contentDocument.documentElement.dataset.bsTheme==='dark'&&document.querySelector('[data-example-details]').textContent.includes('ui-kit-forms.js')&&document.querySelector('[data-example-details]').textContent.includes('prefix')`));
  await evaluate(`document.documentElement.style.scrollBehavior='auto';document.querySelector('.catalog-iframe-scroll').scrollIntoView()`);await sleep(50);
  await screenshot('catalog-preview-mobile.png');
  await evaluate(`const s=document.querySelector('#catalogSearch');s.value='загрузка';s.dispatchEvent(new Event('input',{bubbles:true}));s.focus()`);await key('ArrowDown');
  check('search finds examples and supports keyboard focus',await evaluate(`document.activeElement.matches('#searchResults a')&&document.querySelector('#searchResults a[href*="/"]')!==null&&document.querySelector('#catalogSearch').getAttribute('aria-expanded')==='true'`));
  await key('Escape');
  check('search Escape hides results and restores focus',await evaluate(`document.querySelector('#searchResults').hidden&&document.activeElement===document.querySelector('#catalogSearch')&&document.querySelector('#catalogSearch').getAttribute('aria-expanded')==='false'`));
  await navigate('#icons');await sleep(150);
  check('icons page renders bounded local results',await evaluate(`document.querySelectorAll('[data-icon-name]').length===48&&document.querySelectorAll('[data-icon-name] svg').length===48&&document.querySelector('#iconCount').textContent.includes('Найдено')`));
  await evaluate(`document.querySelector('#iconSearch').value='User';document.querySelector('#iconSearch').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-icon-name]').focus()`);await key('Enter');
  await evaluate(`document.querySelector('#iconSize').value=48;document.querySelector('#iconSize').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#iconLabel').value='<b>Пользователь</b>';document.querySelector('#iconLabel').dispatchEvent(new Event('input',{bubbles:true}))`);
  check('icon selection, accessible label and requested size survive export',await evaluate(`(()=>{const svg=document.querySelector('#selectedIcon svg'),code=document.querySelector('#selectedIconCode').textContent;return getComputedStyle(svg).width==='48px'&&svg.getAttribute('role')==='img'&&svg.getAttribute('aria-label')==='<b>Пользователь</b>'&&!svg.hasAttribute('aria-hidden')&&code.includes('&lt;b&gt;')&&BrandUICatalogExamples.source('icon').includes('width:48px')})()`));
  await evaluate(`document.querySelector('#iconDecorative').checked=true;document.querySelector('#iconDecorative').dispatchEvent(new Event('change',{bubbles:true}))`);
  check('decorative icon exports aria-hidden without label',await evaluate(`document.querySelector('#selectedIcon svg').getAttribute('aria-hidden')==='true'&&!document.querySelector('#selectedIcon svg').hasAttribute('aria-label')`));
  await screenshot('catalog-icons-mobile.png');
  check('full HTML copy passes exact source to clipboard',await evaluate(`(async()=>{const original=navigator.clipboard.writeText;let copied='';navigator.clipboard.writeText=async text=>{copied=text};document.querySelector('[data-example-copy]').click();await new Promise(r=>setTimeout(r,30));navigator.clipboard.writeText=original;return copied===BrandUICatalogExamples.source('icon',{theme:'light'})&&copied.includes('BrandUIDemo.setup(document)')})()`));
  await navigate('#integration');
  check('integration exposes both ZIPs and all module documentation',await evaluate(`document.querySelector('#view a[href="ui-kit-catalog.zip"]')&&document.querySelectorAll('#view tbody tr').length===8&&document.querySelector('#view a[href="docs/api.md"]')`));
  const folder=await mkdtemp(join(tmpdir(),'uikit-export-'));
  await promisify(execFile)('python3',['-m','zipfile','-e',join(root,'ui-kit-catalog.zip'),folder]);
  const table=copies.find(e=>e.id==='table');await writeFile(join(folder,'copied-table.html'),table.html);
  await navigate(pathToFileURL(join(root,'index.html')).href+'#tables/table');await sleep(250);
  check('offline catalog initializes its real iframe',await evaluate(`location.protocol==='file:'&&document.querySelector('iframe').contentDocument.documentElement.dataset.exampleId==='table'&&!!document.querySelector('iframe').contentWindow.BrandUI.table.get(document.querySelector('iframe').contentDocument.querySelector('[data-example-table]'))`));
  await navigate(pathToFileURL(join(folder,'copied-table.html')).href);
  check('copied complete HTML works offline from extracted release',await evaluate(`location.protocol==='file:'&&document.querySelectorAll('tbody tr').length===5&&!!BrandUI.table.get(document.querySelector('[data-example-table]'))&&!document.querySelector('script[src="catalog.js"]')`));
});
