// Read-only visual inventory for maintainers. Results are written only to test-results.
import { browser, sleep, root } from '../tests/runtime.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const output = join(root, 'test-results', 'ux-audit');
await mkdir(output, { recursive: true });
const report = { generatedAt: new Date().toISOString(), routes: [], measures: {}, captures: [] };
await browser(async ({call, evaluate, navigate, viewport, screenshot}) => {
  report.environment = await call('Browser.getVersion');
  for (const width of [1440, 768, 390, 320]) {
    await viewport(width);
    for (const route of ['buttons','forms','navigation','tables','cards','lists','identity','site-navigation','advanced-forms','feedback','site-blocks']) {
      await navigate('index.html#' + route);
      await sleep(200);
      const data = await evaluate(`(() => {
        const visible = e => { const r=e.getBoundingClientRect(); const s=getComputedStyle(e);return r.width>1&&r.height>1&&s.visibility!=='hidden'&&s.display!=='none'; };
        const measure = e => {const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:(e.getAttribute('aria-label')||e.textContent||e.getAttribute('placeholder')||'').trim().slice(0,60),class:e.className,width:+r.width.toFixed(1),height:+r.height.toFixed(1),fontSize:s.fontSize,lineHeight:s.lineHeight};};
        const view=document.querySelector('#view');
        return {route:location.hash,width:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,heading:document.querySelector('h1')?.textContent,examples:window.BrandUICatalogExamples?.entries().map(e=>({id:e.id,route:e.route,title:e.title,states:e.states})),headings:[...view.querySelectorAll('h2,h3')].map(e=>e.textContent.trim()),smallText:[...view.querySelectorAll('label,p,button,a,span')].filter(visible).filter(e=>parseFloat(getComputedStyle(e).fontSize)<12).slice(0,25).map(measure),controls:[...view.querySelectorAll('button,input,select,[role=combobox]')].filter(visible).slice(0,35).map(measure),table:view.querySelector('table')?{width:view.querySelector('table').getBoundingClientRect().width,rowHeights:[...view.querySelectorAll('table tr')].map(e=>+e.getBoundingClientRect().height.toFixed(1))}:null};
      })()`);
      report.routes.push(data);
      if ((width===1440&&['buttons','forms','tables','cards','site-navigation'].includes(route))||(width===390&&['forms','tables','lists','identity','advanced-forms','site-blocks'].includes(route))) {
        for (const theme of ['light','dark']) {
          await evaluate(`document.documentElement.dataset.bsTheme='${theme}';scrollTo({top:0,behavior:'instant'})`);
          await sleep(220);
          const name=`ux-audit/${route}-${width}-${theme}.png`;
          await screenshot(name);report.captures.push(name);
        }
      }
    }
  }
  await viewport(1440);
  await navigate('index.html#forms');
  report.measures.consultation = await evaluate(`(async () => {
    let copied;
    for(let attempt=0;attempt<100;attempt++) {
      copied=document.querySelector('[data-example-frame]')?.contentDocument;
      if(copied?.querySelector('.form-field input')&&copied.readyState==='complete') break;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    if(!copied?.querySelector('.form-field input')) throw Error('Copied consultation did not load');
    const measure=(doc,root)=>{const view=doc.defaultView,form=root.querySelector('form'),fields=[...form.querySelectorAll('.form-field')],button=form.querySelector('[type=submit]');return {fieldMargins:fields.map(e=>view.getComputedStyle(e).marginBottom),fieldGaps:fields.slice(1).map((e,i)=>e.getBoundingClientRect().top-fields[i].getBoundingClientRect().bottom),submitWidth:button.getBoundingClientRect().width,formWidth:form.getBoundingClientRect().width,catalogCSS:[...doc.styleSheets].some(s=>s.href?.includes('catalog.css'))};};
    return {catalog:measure(document,document.querySelector('.consultation-tool')),copied:measure(copied,copied)};
  })()`);
  await navigate('examples/foundations.html');
  report.measures.sizes = await evaluate(`(() => {
    const probe=document.createElement('section');probe.className='brand-surface';probe.innerHTML='<h2>Size audit</h2><div class="brand-cluster"><button class="btn btn-primary btn-sm">Small</button><button class="btn btn-primary">Default</button><button class="btn btn-primary btn-lg">Large</button><button class="btn btn-primary btn-icon">+</button><button class="btn btn-primary btn-sm btn-icon">+</button><button class="btn btn-primary btn-lg btn-icon">+</button></div>'+['form-control-sm','','form-control-lg'].map(c=>'<label>'+c+'<input class="form-control '+c+'" placeholder="Text"></label>').join('')+['form-select-sm','','form-select-lg'].map(c=>'<label>'+c+'<select class="form-select '+c+'"><option>Option</option></select></label>').join('');document.body.append(probe);BrandUI.init(probe);
    return [...probe.querySelectorAll('button,input,select')].filter(e=>e.getBoundingClientRect().height>1).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {class:e.className,width:+r.width.toFixed(1),height:+r.height.toFixed(1),font:s.fontSize,lineHeight:s.lineHeight,padding:s.padding};});
  })()`);
  await evaluate(`scrollTo({top:document.body.scrollHeight,behavior:'instant'})`);
  await screenshot('ux-audit/size-probe-1440.png');
  report.captures.push('ux-audit/size-probe-1440.png');
  report.measures.cta = await evaluate(`(() => {
    const host=document.createElement('div');host.innerHTML=['btn-sm','','btn-lg'].map(c=>'<button class="btn btn-primary brand-cta '+c+'">Отправить заявку</button>').join('');document.body.append(host);
    return [...host.children].map(e=>({class:e.className,height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize}));
  })()`);
  await navigate('examples/table.html');
  report.measures.standaloneTable = await evaluate(`({width:document.querySelector('table').getBoundingClientRect().width,rowHeights:[...document.querySelectorAll('table tr')].map(e=>e.getBoundingClientRect().height),checkbox:getComputedStyle(document.querySelector('table input')).width,headingFont:getComputedStyle(document.querySelector('table th')).fontSize,catalogCSS:[...document.styleSheets].some(s=>s.href?.includes('catalog.css'))})`);
  await navigate('examples/components.html');
  report.measures.container = await evaluate(`(() => {const grid=document.querySelector('.brand-grid');grid.style.width='320px';const r=grid.getBoundingClientRect();return {viewport:innerWidth,width:r.width,columns:getComputedStyle(grid).gridTemplateColumns,cardWidths:[...grid.children].map(e=>e.getBoundingClientRect().width)};})()`);
  await screenshot('ux-audit/container-probe-1440.png');
  report.captures.push('ux-audit/container-probe-1440.png');
  await viewport(390);
  await navigate('index.html#advanced-forms');
  await evaluate(`document.documentElement.dataset.bsTheme='light';const target=[...document.querySelectorAll('#view h2')].find(e=>e.textContent.includes('Поиск и выбор'));target?.scrollIntoView({block:'start',behavior:'instant'});`);
  await sleep(200);
  await evaluate(`const auditChoice=document.querySelector('#view select[data-brand-choice]');BrandUI.choice.get(auditChoice).open();`);
  await screenshot('ux-audit/choice-open-390-light.png');
  report.captures.push('ux-audit/choice-open-390-light.png');
  report.measures.mobileChoice = await evaluate(`({viewport:{width:innerWidth,height:innerHeight},menu:[...document.querySelectorAll('[role=listbox]')].filter(e=>!e.hidden).map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))})`);
});
await writeFile(output+'/measurements.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({routes:report.routes.length,overflow:report.routes.filter(r=>r.scrollWidth>r.clientWidth+1).map(r=>[r.route,r.width,r.scrollWidth]),measures:report.measures,captures:report.captures.length},null,2));
