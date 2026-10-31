import assert from 'node:assert/strict';
import { browser,sleep } from './runtime.mjs';
const check=(name,value)=>{assert.ok(value,name);console.log('PASS '+name);};
await browser(async({navigate,evaluate,viewport,key,call,screenshot})=>{
  await viewport(1440);await navigate('#tables/mobile-data');
  check('registry has four layers and preserves first examples',await evaluate(`(()=>{const r=BrandUICatalogExamples;return new Set(r.entries().map(e=>e.category)).size===4&&r.entries('buttons')[0].id==='button'&&r.entries('forms')[0].id==='consultation'&&r.entries('tables')[0].id==='table'&&['avatar','chips-remove','tabs','drawer','toast','control-radio'].every(id=>r.get(id))})()`));
  let frameSequence=0;
  async function frame(id,options={},width=320){
    const token=String(++frameSequence);
    await evaluate(`(()=>{const f=document.querySelector('[data-example-frame]');f.style.width='${width}px';f.srcdoc=BrandUICatalogExamples.source(${JSON.stringify(id)},Object.assign({base:new URL('.',location.href).href},${JSON.stringify(options)})).replace('data-example-id=', 'data-test-token="${token}" data-example-id=');})()`);
    let ready=false;for(let n=0;n<150;n++){await sleep(20);if(await evaluate(`(()=>{const d=document.querySelector('[data-example-frame]').contentDocument;return d?.documentElement.dataset.exampleId===${JSON.stringify(id)}&&d.documentElement.dataset.previewReady==='true'&&d.documentElement.dataset.testToken==='${token}'})()`)){ready=true;break;}}
    if(!ready)throw Error('Preview did not initialize '+id+' '+JSON.stringify(options));
    await evaluate(`document.querySelector('[data-example-frame]').contentDocument.fonts.ready.then(()=>true)`);
  }
  const fits=`(()=>{const d=document.querySelector('[data-example-frame]').contentDocument,ids=[...d.querySelectorAll('[id]')].map(e=>e.id);return d.documentElement.scrollWidth<=d.documentElement.clientWidth+1&&new Set(ids).size===ids.length})()`;
  const representatives=['control-text','control-select','chips-remove','card-content','pattern-header','pattern-choices','pattern-filters','mobile-data','mobile-controls','page-app','page-access','page-content'];
  for(const width of [320,390,768,1440])for(const theme of ['light','dark'])for(const density of ['default','compact'])for(const id of representatives){
    await frame(id,{theme,density},width);check(`system matrix ${id} ${width} ${theme} ${density}`,await evaluate(fits));
  }
  for(const theme of ['light','dark'])for(const density of ['default','compact'])for(const id of ['card-content','pattern-header','pattern-choices','pattern-filters','mobile-data','control-text','chips-remove'])for(const container of [240,320]){
    await frame(id,{theme,density,container,long:true},1440);
    const contained=await evaluate(`(()=>{const d=document.querySelector('[data-example-frame]').contentDocument,c=d.querySelector('[data-example-container]'),b=c.getBoundingClientRect();return b.width===${container}&&[...c.querySelectorAll('*')].every(e=>{if(e.closest('.brand-table-scroll,.brand-mobile-tabs,.offcanvas,.modal')||!e.getClientRects().length||getComputedStyle(e).opacity==='0'||getComputedStyle(e).visibility==='hidden')return true;const r=e.getBoundingClientRect();return r.right<=b.right+2&&r.left>=b.left-2})})()`);
    check(`narrow long container ${id} ${container} ${theme} ${density}`,contained&&await evaluate(fits));
  }
  const variants=await evaluate(`BrandUICatalogExamples.entries().filter(e=>e.previewStates.length>1).flatMap(e=>e.previewStates.filter(s=>s!=='default').map(state=>({id:e.id,state})))`);
  for(const {id,state} of variants){
    await frame(id,{state,density:'compact',theme:'dark'},390);
    const meaningful=await evaluate(`(()=>{const f=document.querySelector('[data-example-frame]'),d=f.contentDocument,w=f.contentWindow,s=${JSON.stringify(state)},id=${JSON.stringify(id)},h=d.querySelector('[data-example-table],[data-mobile-table],[data-page-table]'),t=h&&w.BrandUI.table?.get(h),app=d.querySelector('[data-page-example="app"]'),access=d.querySelector('[data-page-example="access"]');if(access)return !d.querySelector('[data-access-panel="'+s+'"]').hidden;if(t&&['loading','error','empty','selected'].includes(s)){const v=t.getState();return s==='empty'?v.total===0:s==='selected'?v.selected.length>0:v.status===s;}if(app&&s==='dirty')return w.BrandUIPageExamples.get(app).getState().dirty;if(app&&s==='saved')return w.BrandUI.forms.get(app.querySelector('[data-page-edit-form]')).getState()==='success';if(s==='invalid'||s==='server-error'){const form=[...d.forms].find(f=>f.getClientRects().length);return w.BrandUI.forms.get(form).getState()==='invalid'&&(s!=='server-error'||[...form.elements].some(e=>e.validity?.customError));}if(s==='readonly')return [...d.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]),textarea')].every(e=>e.readOnly);if(s==='disabled')return [...d.querySelectorAll('input,select,textarea,button')].every(e=>e.disabled);if(s==='loading')return !!d.querySelector('button[aria-busy="true"]:disabled');return false;})()`);
    check('preview state changes behavior '+id+' '+state,meaningful&&await evaluate(fits));
  }
  await navigate('#tables/mobile-data');await sleep(120);
  await evaluate(`for(const [name,value] of [['density','compact'],['container','320'],['state','selected']]){const field=document.querySelector('[data-example-'+name+']');field.value=value;field.dispatchEvent(new Event('change',{bubbles:true}));}`);await sleep(150);
  check('inspector exports the chosen density container state and collapses technical detail',await evaluate(`(()=>{const code=document.querySelector('#completeExampleCode').textContent,d=document.querySelector('[data-example-frame]').contentDocument;return code.includes('data-ui-density="compact"')&&code.includes('max-width:320px')&&code.includes('data-preview-state="selected"')&&d.documentElement.dataset.uiDensity==='compact'&&!document.querySelector('.catalog-example-technical').open})()`));
  await navigate('#pages/page-app');await sleep(120);
  check('page preview offers applicable states and explains viewport sizing',await evaluate(`document.querySelector('[data-example-container]').disabled&&[...document.querySelector('[data-example-state]').options].some(o=>o.value==='dirty')&&!document.querySelector('[data-example-state] [value=readonly]')&&document.querySelector('[data-example-category]').textContent==='Страница'`));
  for(const width of [320,1440])for(const density of ['default','compact']){
    await viewport(width);await navigate('examples/workspace.html');await evaluate(`document.querySelector('[data-page-example]').dataset.uiDensity='${density}';document.querySelector('main').focus()`);
    let named=true;for(let i=0;i<16;i++){await key('Tab');const object=await call('Runtime.evaluate',{expression:'document.activeElement'}),node=await call('DOM.describeNode',{objectId:object.result.objectId}),tree=await call('Accessibility.getPartialAXTree',{backendNodeId:node.node.backendNodeId,fetchRelatives:false});named&&=!!tree.nodes[0]?.name?.value?.trim()&&await evaluate(`document.activeElement.getClientRects().length>0`);}
    check(`workspace real keyboard names ${width} ${density}`,named);
  }
  for(const page of ['workspace','access','content','mobile'])for(const density of ['default','compact']){
    await viewport(320);await navigate('examples/'+page+'.html');await evaluate(`document.documentElement.dataset.uiDensity='${density}';const style=document.createElement('style');style.textContent='*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}';document.head.append(style)`);
    check(`text spacing ${page} ${density}`,await evaluate(`document.documentElement.scrollWidth<=document.documentElement.clientWidth+1`));
  }
  for(const page of ['workspace','access','content']){
    await navigate('examples/'+page+'.html');await call('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'},{name:'prefers-reduced-motion',value:'reduce'}]});
    check('system modes '+page,await evaluate(`(()=>{const e=[...document.querySelectorAll('input,button,a')].find(e=>e.getClientRects().length&&!e.disabled);e.focus();const s=getComputedStyle(e);return matchMedia('(forced-colors:active)').matches&&matchMedia('(prefers-reduced-motion:reduce)').matches&&s.outlineStyle!=='none'&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+1})()`));
    await call('Emulation.setEmulatedMedia',{features:[]});
  }
  for(const width of [320,390,768,1440])for(const theme of ['light','dark'])for(const density of ['default','compact']){
    await viewport(width);await navigate('examples/workspace.html');await evaluate(`const app=document.querySelector('[data-page-example]');app.dataset.bsTheme='${theme}';app.dataset.uiDensity='${density}'`);await sleep(200);await screenshot('system-app-'+width+'-'+theme+'-'+density+'.png');
  }
});
