// Comprehensive rendered inventory. Uses only the isolated local browser from the test suite.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { browser, sleep, root } from '../tests/runtime.mjs';
const capture=process.argv.includes('--capture');
const stress=process.argv.includes('--stress');
const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)||(stress?'stress':process.argv.includes('--before')?'before':'after');
const folder=join(root,'test-results','visual-audit',label);
await mkdir(folder,{recursive:true});
const report={label,cases:[],menus:[],screenshots:[]};
await browser(async({navigate,evaluate,viewport,call,origin})=>{
 await viewport(1440);await navigate('#buttons');
 let entries=await evaluate(`BrandUICatalogExamples.entries().map(e=>({id:e.id,container:e.container,states:e.previewStates}))`);
 if(stress)entries=entries.flatMap(e=>[...e.states.filter(state=>state!=='default').map(state=>({id:e.id,key:e.id+'--'+state,options:{state}})),...(e.container?[240,320].map(container=>({id:e.id,key:e.id+'--long-'+container,options:{container,long:true}})):[])]);
 else entries=entries.map(e=>({...e,key:e.id,options:{}}));
 const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
 if(only)entries=entries.filter(e=>only.includes(e.id));
 const docs=await evaluate(`(${JSON.stringify(entries)}).flatMap(e=>['light','dark'].map(theme=>({key:e.key+'-'+theme,html:BrandUICatalogExamples.source(e.id,Object.assign({base:${JSON.stringify(origin+'/')}},e.options,{theme}))})))`);
 for(const d of docs)await writeFile(join(folder,d.key+'.html'),d.html);
 const geometry=`(()=>{
  const host=document.querySelector('[data-example-container]')||document.querySelector('main')||document.body,b=host.getBoundingClientRect(),issues=[];
  for(const e of host.querySelectorAll('*')){
   const s=getComputedStyle(e),r=e.getBoundingClientRect();let fixed=false;for(let p=e;p&&p!==document.body;p=p.parentElement)if(getComputedStyle(p).position==='fixed'){fixed=true;break;}const boundary=fixed?{left:0,right:document.documentElement.clientWidth}:b;if(!e.getClientRects().length||s.visibility==='hidden'||s.opacity==='0'||e.closest('.visually-hidden,.brand-select-native,.offcanvas,.modal,.brand-table-scroll,.brand-mobile-tabs,.brand-tabs-scroll,.brand-graphic,.brand-sidebar,.brand-lightbox'))continue;
   // An explicitly scrollable ancestor is an intentional viewport, not document overflow.
   let scroll=false;for(let p=e.parentElement;p&&p!==host;p=p.parentElement){if(['auto','scroll','hidden','clip'].includes(getComputedStyle(p).overflowX)){scroll=true;break;}}
   if(!scroll&&!['auto','scroll','hidden','clip'].includes(s.overflowX))for(const node of e.childNodes){if(node.nodeType!==Node.TEXT_NODE||!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);if([...range.getClientRects()].some(t=>t.left<boundary.left-2||t.right>boundary.right+2))issues.push({kind:'text-bounds',tag:e.tagName,cls:e.className,text:node.textContent.trim().slice(0,90),host:[boundary.left,boundary.right]});}
   if(!scroll&&(r.left<boundary.left-2||r.right>boundary.right+2))issues.push({kind:'bounds',tag:e.tagName,cls:e.className,text:e.textContent.trim().slice(0,90),left:r.left,right:r.right,host:[boundary.left,boundary.right]});
   if(e.matches('.brand-select-value')&&e.scrollWidth>e.clientWidth+1)issues.push({kind:'value-clipped',text:e.textContent,client:e.clientWidth,scroll:e.scrollWidth});
   if(e.matches('button,.btn')&&e.scrollHeight>e.clientHeight+2&&s.overflowY!=='auto')issues.push({kind:'control-clipped',text:e.textContent,client:e.clientHeight,scroll:e.scrollHeight});
  }
  return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,issues:issues.slice(0,30),height:document.documentElement.scrollHeight};
 })()`;
 for(const entry of entries){
  for(const width of (entry.options.container?[1440]:[320,390,768,1440]))for(const theme of ['light','dark'])for(const density of ['default','compact']){
   await viewport(width);await navigate('test-results/visual-audit/'+label+'/'+entry.key+'-'+theme+'.html');
   await evaluate(`document.documentElement.dataset.bsTheme='${theme}';document.documentElement.dataset.uiDensity='${density}';document.documentElement.style.scrollBehavior='auto';document.querySelectorAll('img').forEach(i=>i.loading='eager');document.querySelector('[data-page-example]')?.setAttribute('data-ui-density','${density}');`);
   await evaluate(`Promise.all([...document.images].map(i=>i.complete?true:new Promise(r=>{i.onload=i.onerror=r}))).then(()=>true)`);
   const result=await evaluate(geometry);report.cases.push({id:entry.id,key:entry.key,width,theme,density,...result});
   if(capture||result.overflow||result.issues.length){
    await sleep(350);
    const name=entry.key+'-'+width+'-'+theme+'-'+density+'.png';
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.min(result.height,18000),scale:1}});
    await writeFile(join(folder,name),Buffer.from(shot.data,'base64'));report.screenshots.push(name);
   }
   const menus=await evaluate(`(()=>{const issues=[];for(const t of document.querySelectorAll('.brand-select-trigger:not(:disabled),.brand-choice>input:not(:disabled):not([readonly])')){if(!t.getClientRects().length)continue;t.scrollIntoView({behavior:'instant',block:'center'});t.focus({preventScroll:true});if(t.getAttribute('aria-expanded')!=='true')t.click();const m=document.getElementById(t.getAttribute('aria-controls'));if(!m||m.hidden)continue;const r=m.getBoundingClientRect();for(const e of m.querySelectorAll('[role=option]')){const range=document.createRange();range.selectNodeContents(e);const lines=[...range.getClientRects()];if(lines.length>1){const s=getComputedStyle(e),c=document.createElement('canvas').getContext('2d');c.font=s.font;const text=c.measureText(e.textContent).width,padding=parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)+16;if(text+padding<document.documentElement.clientWidth-16)issues.push({text:e.textContent,lines:lines.length,menu:r.width,trigger:t.getBoundingClientRect().width});}}t.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));}return issues})()`);
   if(menus.length)report.menus.push({id:entry.id,key:entry.key,width,theme,density,issues:menus});
  }
  await writeFile(join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('AUDITED '+entry.key);
 }
 await writeFile(join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
});
console.log(JSON.stringify({cases:report.cases.length,overflow:report.cases.filter(c=>c.overflow).length,bounds:report.cases.filter(c=>c.issues.length).length,menus:report.menus.length,screenshots:report.screenshots.length}));
