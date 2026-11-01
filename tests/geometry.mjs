// Text geometry regressions: a menu can be wider than its compact trigger.
import assert from 'node:assert/strict';
import { browser, sleep } from './runtime.mjs';
const check=(name,value)=>{assert.ok(value,name);console.log('PASS '+name);};
await browser(async({navigate,evaluate,viewport,call,key,screenshot})=>{
 for(const width of [320,390,768,1440])for(const theme of ['light','dark'])for(const density of ['default','compact']){
  await viewport(width);await navigate('#buttons');
  await evaluate(`document.documentElement.dataset.bsTheme='${theme}';document.documentElement.dataset.uiDensity='${density}';document.documentElement.style.scrollBehavior='auto'`);
  check(`preview menu labels fit ${width} ${theme} ${density}`,await evaluate(`(()=>{
   return [...document.querySelectorAll('.catalog-example-controls select:not(:disabled)')].every(s=>{
    const t=s.nextElementSibling.querySelector('button');t.scrollIntoView({behavior:'instant',block:'center'});t.focus({preventScroll:true});t.click();
    const m=document.getElementById(t.getAttribute('aria-controls')),b=m.getBoundingClientRect(),ok=!m.hidden&&b.width>=t.getBoundingClientRect().width-1&&b.left>=8&&b.right<=document.documentElement.clientWidth-7&&[...m.querySelectorAll('[role=option]')].every(e=>{const r=document.createRange();r.selectNodeContents(e);const c=document.createElement('canvas').getContext('2d');c.font=getComputedStyle(e).font;return c.measureText(e.textContent).width+58>document.documentElement.clientWidth-16||r.getClientRects().length===1});t.click();return ok;
   });
  })()`));
 }
 await viewport(320);await navigate('examples/advanced-forms.html');
 await evaluate(`(()=>{const f=document.createElement('form');f.id='geometry-form';f.className='brand-control-row';f.style.cssText='justify-content:flex-end;margin:16px';f.innerHTML=${JSON.stringify("<label style=\"width:88px\">Select<select class=\"form-select\" name=\"plain\"><option>Light</option><option>Dark</option><option>Длинный вариант</option></select></label><label style=\"width:88px\">Choice<select class=\"form-select\" name=\"choice\" data-brand-choice><option>Light</option><option>Dark</option><option>Длинный вариант</option></select></label><label style=\"width:88px\">Suggest<input class=\"form-control\" name=\"suggest\" data-brand-autocomplete data-autocomplete-options='[\"Light\",\"Dark\",\"Длинный вариант\"]'></label>")};document.body.prepend(f);BrandUI.init(f);})()`);
 for(const touch of [false,true])for(const density of ['default','compact'])for(const mode of ['plain','choice','suggest']){
  await call('Emulation.setTouchEmulationEnabled',{enabled:touch,maxTouchPoints:1});
  await evaluate(`document.documentElement.dataset.uiDensity='${density}'`);
  check(`intrinsic popup ${mode} ${density} coarse=${touch}`,await evaluate(`(()=>{const s=document.querySelector('#geometry-form [name=${mode}]'),t=${mode==='plain'?"s.nextElementSibling.querySelector('button')":mode==='choice'?"s.nextElementSibling.querySelector('input')":"s"};t.scrollIntoView({behavior:'instant',block:'center'});t.focus({preventScroll:true});if(t.getAttribute('aria-expanded')!=='true')t.click();const m=document.getElementById(t.getAttribute('aria-controls')),b=m.getBoundingClientRect(),ok=!m.hidden&&b.width>t.getBoundingClientRect().width+1&&b.left>=8&&b.right<=document.documentElement.clientWidth-7&&[...m.querySelectorAll('[role=option]')].every(e=>{const r=document.createRange();r.selectNodeContents(e);return r.getClientRects().length===1&&e.getBoundingClientRect().height>=${touch?44:density==='compact'?32:40}});t.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return ok})()`));
 }
 await call('Emulation.setTouchEmulationEnabled',{enabled:false,maxTouchPoints:1});
 for(const mode of ['plain','choice','suggest']){
  await evaluate(`(()=>{const s=document.querySelector('#geometry-form [name=${mode}]');if(s.tagName==='SELECT'){s.replaceChildren(new Option('ОченьДлинноеНазваниеБезПробелов'.repeat(6)));s.dispatchEvent(new Event('change',{bubbles:true}));}else BrandUI.autocomplete.get(s).setOptions(['ОченьДлинноеНазваниеБезПробелов'.repeat(6)]);})()`);
  await sleep(50);
  check('viewport bounds and long text wrap '+mode,await evaluate(`(()=>{const s=document.querySelector('#geometry-form [name=${mode}]'),t=${mode==='plain'?"s.nextElementSibling.querySelector('button')":mode==='choice'?"s.nextElementSibling.querySelector('input')":"s"};t.scrollIntoView({behavior:'instant',block:'center'});t.focus({preventScroll:true});if(t.getAttribute('aria-expanded')!=='true')t.click();const m=document.getElementById(t.getAttribute('aria-controls')),b=m.getBoundingClientRect(),e=m.querySelector('[role=option]'),range=document.createRange();range.selectNodeContents(e);const ok=!m.hidden&&b.left>=8&&b.right<=document.documentElement.clientWidth-7&&m.scrollWidth<=m.clientWidth+1&&b.bottom<=innerHeight-7&&range.getClientRects().length>1;t.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return ok})()`));
 }
 await viewport(1440);await navigate('#buttons');
 await evaluate(`(()=>{const t=document.querySelector('[data-example-theme]').nextElementSibling.querySelector('button');t.scrollIntoView({behavior:'instant',block:'center'});t.focus({preventScroll:true});})()`);await sleep(120);
 await evaluate(`document.querySelector('[data-example-theme]').nextElementSibling.querySelector('button').click()`);await key('End');await key('Enter');
 check('expanded menu still commits selected theme and retains focus',await evaluate(`document.querySelector('[data-example-theme]').value==='dark'&&document.activeElement===document.querySelector('[data-example-theme]').nextElementSibling.querySelector('button')`));
 await evaluate(`document.querySelector('[data-example-theme]').nextElementSibling.querySelector('button').click()`);await sleep(200);await screenshot('geometry-theme-menu.png');
 await viewport(1440);await navigate('#colors');
 let frameSequence=0;
 async function frame(id,options={},width=1440){
  const token=String(++frameSequence);
  await evaluate(`(()=>{const f=document.querySelector('[data-example-frame]');f.style.width='${width}px';f.srcdoc=BrandUICatalogExamples.source(${JSON.stringify(id)},Object.assign({base:new URL('.',location.href).href},${JSON.stringify(options)})).replace('data-example-id=','data-geometry-token="${token}" data-example-id=');})()`);
  for(let n=0;n<120;n++){await sleep(20);if(await evaluate(`(()=>{const d=document.querySelector('[data-example-frame]').contentDocument;return d?.documentElement?.dataset.exampleId===${JSON.stringify(id)}&&d.documentElement.dataset.previewReady==='true'&&d.documentElement.dataset.geometryToken==='${token}'})()`)){await evaluate(`document.querySelector('[data-example-frame]').contentDocument.fonts.ready.then(()=>true)`);return;}}
  throw Error('Frame initialization failed '+id);
 }
 for(const theme of ['light','dark'])for(const density of ['default','compact']){
  for(const id of ['navigation','tabs']){
   await frame(id,{theme,density},320);
   check(`copied tab metrics retain spacing ${id} ${theme} ${density}`,await evaluate(`(()=>{const d=document.querySelector('[data-example-frame]').contentDocument;return [...d.querySelectorAll('#overviewPanel strong')].every(e=>e.nextElementSibling.getBoundingClientRect().top>=e.getBoundingClientRect().bottom-1)})()`));
  }
  await frame('palette',{theme,density});
  check(`copied foundation specimens and palette match theme ${theme} ${density}`,await evaluate(`(()=>{const d=document.querySelector('[data-example-frame]').contentDocument,c=d.querySelector('.brand-swatch-color[data-copy="'+BrandTokens.themes['${theme}'].bg+'"]');return !!c&&[...d.querySelectorAll('.brand-swatch-color')].every(e=>e.getBoundingClientRect().height>=96&&e.getBoundingClientRect().width>=44)&&d.querySelector('.brand-radius-sample').getBoundingClientRect().height>=52&&d.querySelector('.brand-spacing-sample>i').getBoundingClientRect().height===8})()`));
  for(const container of [240,320])for(const id of ['consultation','palette','typography','pattern-actions','site-timeline','site-contact','site-graphics']){
   await frame(id,{theme,density,container,long:true});
   check(`readable narrow content ${id} ${container} ${theme} ${density}`,await evaluate(`(()=>{const f=document.querySelector('[data-example-frame]'),d=f.contentDocument,c=d.querySelector('[data-example-container]'),b=c.getBoundingClientRect();return d.documentElement.scrollWidth<=d.documentElement.clientWidth+1&&[...c.querySelectorAll('*')].every(e=>{if(!e.getClientRects().length||e.closest('.brand-select-native,.modal,.offcanvas,.brand-graphic')||f.contentWindow.getComputedStyle(e).opacity==='0')return true;const r=e.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1&&(!e.matches('.brand-select-value')||e.scrollWidth<=e.clientWidth+1)})})()`));
  }
 }
 await frame('typography',{},320);
 check('copied typography edits and resets the specimen',await evaluate(`(()=>{const f=document.querySelector('[data-example-frame]'),d=f.contentDocument,i=d.querySelector('#typePhrase');i.value='Образец';i.dispatchEvent(new f.contentWindow.Event('input',{bubbles:true}));const edited=[...d.querySelectorAll('[data-type-sample]')].every(e=>e.textContent==='Образец');d.querySelector('#resetTypePhrase').click();return edited&&[...d.querySelectorAll('[data-type-sample]')].every(e=>e.textContent===i.defaultValue)&&d.activeElement===i})()`));

 for(const width of [320,390,768,1440])for(const theme of ['light','dark'])for(const density of ['default','compact']){
  await viewport(width);await navigate('examples/table.html');await evaluate(`document.documentElement.dataset.bsTheme='${theme}';document.documentElement.dataset.uiDensity='${density}';BrandUI.table.get(document.querySelector('#projects')).update({rows:[]});`);
  check(`empty table message stays visible ${width} ${theme} ${density}`,await evaluate(`(()=>{const e=document.querySelector('.brand-table-empty'),b=e.closest('.brand-table-scroll').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);return [...range.getClientRects()].every(r=>r.left>=b.left&&r.right<=b.right)&&e.closest('.brand-table-scroll').scrollWidth<=e.closest('.brand-table-scroll').clientWidth+1})()`));
 }

});
