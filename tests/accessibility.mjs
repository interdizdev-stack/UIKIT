import assert from 'node:assert/strict';
import { browser,sleep } from './runtime.mjs';
const check=(name,value)=>{assert.ok(value,name);console.log('PASS '+name);};
await browser(async({evaluate,navigate,viewport,key,call,screenshot})=>{
 await viewport(320);await navigate('examples/advanced-forms.html');
 check('WOFF2 fonts load as primary resources with Cyrillic',await evaluate(`(async()=>{await document.fonts.ready;return document.fonts.check('500 18px Manrope','Тест кириллицы')&&document.fonts.check('500 24px Oswald','ПРОВЕРКА')&&performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.woff2')).length===2&&!performance.getEntriesByType('resource').some(e=>e.name.endsWith('.ttf'))})()`));
 check('optional icon subset initializes all standard sample icons',await evaluate(`performance.getEntriesByType('resource').some(e=>e.name.includes('lucide-core.min.js'))&&document.querySelectorAll('i[data-lucide]').length===0&&document.querySelectorAll('svg.lucide').length>0`));
 await evaluate(`document.querySelector('main').focus()`);
 const names=[];
 for(let n=0;n<20;n++){
  await key('Tab');const object=await call('Runtime.evaluate',{expression:'document.activeElement',returnByValue:false});const node=await call('DOM.describeNode',{objectId:object.result.objectId});const tree=await call('Accessibility.getPartialAXTree',{backendNodeId:node.node.backendNodeId,fetchRelatives:false});const ax=tree.nodes[0];
  names.push(Boolean(ax&&!ax.ignored&&ax.name?.value?.trim())&&await evaluate(`(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'})()`));
 }
 check('20 actual Tab stops have visible controls and accessibility names',names.every(Boolean));
 const pages=['examples/advanced-forms.html','examples/table.html','examples/feedback.html','examples/site-blocks.html'];
 for(const zoom of [2,4])for(const page of pages){
  await call('Emulation.setDeviceMetricsOverride',{width:1280/zoom,height:900/zoom,deviceScaleFactor:zoom,mobile:false});await navigate(page);
  check('reflow equivalent to '+(zoom*100)+'% '+page,await evaluate(`document.documentElement.scrollWidth<=document.documentElement.clientWidth+2&&innerWidth===${1280/zoom}&&devicePixelRatio===${zoom}`));
 }
 await viewport(320);
 for(const page of pages){
  await navigate(page);await evaluate(`(()=>{const s=document.createElement('style');s.textContent='*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}';document.head.append(s)})()`);
  check('text spacing '+page,await evaluate(`document.documentElement.scrollWidth<=document.documentElement.clientWidth+2`));
  if(page==='examples/site-blocks.html')await screenshot('accessibility-spacing-mobile.png');
 }
 for(const page of ['examples/advanced-forms.html','examples/feedback.html']){
  await navigate(page);await evaluate(`(()=>{const elements=[...document.querySelectorAll('button,label,p,h1,h2,h3,input,textarea,select')];const sizes=elements.map(e=>getComputedStyle(e).fontSize);elements.forEach((e,i)=>e.style.fontSize=(parseFloat(sizes[i])*2)+'px')})()`);
  check('200% text '+page,await evaluate(`document.documentElement.scrollWidth<=document.documentElement.clientWidth+2`));
 }
 await navigate('examples/advanced-forms.html');await call('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});await evaluate(`document.querySelector('input.form-control').focus()`);
 check('forced colors retain visible control borders and focus',await evaluate(`(()=>{const e=document.activeElement,s=getComputedStyle(e);return matchMedia('(forced-colors:active)').matches&&s.borderStyle!=='none'&&s.outlineStyle!=='none'&&s.forcedColorAdjust==='auto'})()`));
 await screenshot('accessibility-forced-colors.png');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await navigate('examples/feedback.html');
 check('reduced motion disables feedback animation',await evaluate(`[...document.querySelectorAll('.brand-loader,.brand-skeleton,.brand-progress>span')].every(e=>getComputedStyle(e).animationName==='none')`));
 await call('Emulation.setEmulatedMedia',{features:[]});
});
