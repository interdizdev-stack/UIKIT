// Optional second-engine smoke: UIKIT_FIREFOX=/usr/bin/firefox node tests/firefox.mjs
// The profile lives in ignored test-results: Firefox Snap has its own /tmp namespace.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile,writeFile,mkdir,mkdtemp,rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve,extname,join } from 'node:path';
import { root,sleep } from './runtime.mjs';
const check=(name,value)=>{assert.ok(value,name);console.log('PASS '+name);};
await mkdir(join(root,'test-results'),{recursive:true});
const profile=await mkdtemp(join(root,'test-results/ff-profile-'));
const server=createServer(async(req,res)=>{try{const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const child=spawn(process.env.UIKIT_FIREFOX||'/usr/bin/firefox',['--headless','--no-remote','--profile',profile,'--remote-debugging-port=0','about:blank'],{stdio:['ignore','ignore','pipe']});
let log='',socket;child.stderr.on('data',d=>{log+=d});
try{
  let address;for(let i=0;i<150;i++){address=log.match(/WebDriver BiDi listening on (ws:\/\/[^\s]+)/)?.[1];if(address)break;await sleep(100);}
  if(!address)throw Error('Firefox BiDi did not start: '+log.slice(-2000));
  socket=new WebSocket(address+'/session');await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  const pending=new Map(),errors=[];let sequence=0;
  socket.addEventListener('message',({data})=>{const msg=JSON.parse(data);if(msg.id){const item=pending.get(msg.id);if(!item)return;pending.delete(msg.id);clearTimeout(item.timeout);if(msg.type==='error')item.reject(Error(JSON.stringify(msg)));else item.resolve(msg.result);}else if(msg.method==='log.entryAdded'&&msg.params.type==='javascript'&&msg.params.level==='error')errors.push(msg.params);});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timeout=setTimeout(()=>{pending.delete(id);reject(Error('BiDi timeout '+method));},15000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}));});
  const session=await call('session.new',{capabilities:{alwaysMatch:{}}});console.log('Firefox '+session.capabilities.browserVersion);
  await call('session.subscribe',{events:['log.entryAdded']});
  const context=(await call('browsingContext.getTree')).contexts[0].context;
  async function evaluate(expression){const result=await call('script.evaluate',{expression:'(async()=>JSON.stringify(await ('+expression+')))()',target:{context},awaitPromise:true});if(result.type!=='success')throw Error(JSON.stringify(result));return JSON.parse(result.result.value??'null');}
  async function navigate(path){await call('browsingContext.navigate',{context,url:origin+'/'+path,wait:'complete'});await evaluate('document.fonts.ready.then(()=>true)');await sleep(80);}
  for(const width of [320,390,768,1440]){
    await call('browsingContext.setViewport',{context,viewport:{width,height:900},devicePixelRatio:1});await navigate('examples/mobile.html');
    for(const theme of ['light','dark'])for(const density of ['default','compact']){
      await evaluate(`(()=>{document.documentElement.dataset.bsTheme='${theme}';document.documentElement.dataset.uiDensity='${density}';return true})()`);
      check(`Firefox mobile ${width} ${theme} ${density}`,await evaluate(`document.documentElement.scrollWidth<=document.documentElement.clientWidth+1&&BrandUI.table.get(document.querySelector('[data-mobile-table]')).getState().view===${width<768?"'list'":"'table'"}`));
    }
    await sleep(220);
    check('Firefox button theme '+width,await evaluate(`(()=>{const b=document.querySelector('.btn-secondary'),s=getComputedStyle(b),probe=document.createElement('span');probe.style.backgroundColor='var(--ui-field)';document.body.append(probe);const ok=s.backgroundColor===getComputedStyle(probe).backgroundColor;probe.remove();return ok})()`));
    const shot=await call('browsingContext.captureScreenshot',{context});await writeFile(join(root,'test-results/firefox-mobile-'+width+'.png'),Buffer.from(shot.data,'base64'));
  }
  check('Firefox shared selection and chip disclosure',await evaluate(`(()=>{const c=BrandUI.table.get(document.querySelector('[data-mobile-table]'));c.select(['PRJ-1001']);c.setLayout('list');const s=document.querySelector('[data-brand-choice]');s.nextElementSibling.querySelector('[data-choice-expand]').click();return c.getState().selected[0]==='PRJ-1001'&&document.querySelector('[data-table-row]').checked&&new FormData(s.form).getAll('people').length===6&&s.nextElementSibling.querySelectorAll('[data-choice-remove]').length===6})()`));
  await navigate('examples/patterns.html');
  check('Firefox short filters share a row without stretching',await evaluate(`(()=>{const row=document.querySelector('.brand-filter-fields'),items=[...row.children].map(e=>e.getBoundingClientRect());return items.every(r=>Math.abs(r.bottom-items[0].bottom)<1&&r.width<row.clientWidth/2)})()`));
  check('Firefox summary server errors retain entered values',await evaluate(`(()=>{const f=document.querySelector('[data-pattern-form]');f.elements.name.value='Проект';BrandUI.forms.get(f).setErrors({email:'Адрес занят'});return f.elements.name.value==='Проект'&&!f.querySelector('[data-form-errors]').hidden&&f.elements.email.validity.customError})()`));
  check('Firefox scoped cleanup',await evaluate(`(async()=>{const host=document.querySelector('[data-pattern-host]');await BrandUI.destroy(host);return !host.querySelector('.brand-select')&&!BrandUI.filters.get(host.querySelector('[data-pattern-filters]'))})()`));
  for(const width of [320,390,768,1440]){
    await call('browsingContext.setViewport',{context,viewport:{width,height:900},devicePixelRatio:1});await navigate('index.html#buttons');
    for(const density of ['default','compact']){
      await evaluate(`document.documentElement.dataset.uiDensity='${density}'`);
      check(`Firefox preview row ${width} ${density}`,await evaluate(`(()=>{const row=document.querySelector('.catalog-example-controls'),box=row.getBoundingClientRect(),gap=parseFloat(getComputedStyle(row).columnGap),items=[...row.children].map(e=>e.getBoundingClientRect());return document.documentElement.scrollWidth<=innerWidth+1&&items.every((r,i)=>r.left>=box.left-1&&r.right<=box.right+1&&(!i||Math.abs(r.bottom-items[i-1].bottom)<1||items[i-1].right+gap+r.width>box.right-1))&&(innerWidth!==1440||items.every(r=>Math.abs(r.bottom-items[0].bottom)<1))})()`));
    }
  }
  for(const page of ['workspace','access','content'])for(const width of [320,390,768,1440]){
    await call('browsingContext.setViewport',{context,viewport:{width,height:900},devicePixelRatio:1});await navigate('examples/'+page+'.html');
    for(const theme of ['light','dark'])for(const density of ['default','compact']){
      await evaluate(`(()=>{document.documentElement.dataset.bsTheme='${theme}';document.documentElement.dataset.uiDensity='${density}';return true})()`);
      check(`Firefox page ${page} ${width} ${theme} ${density}`,await evaluate(`document.documentElement.scrollWidth<=document.documentElement.clientWidth+1&&!!document.querySelector('h1')`));
    }
    if([320,1440].includes(width)){await sleep(220);const shot=await call('browsingContext.captureScreenshot',{context});await writeFile(join(root,'test-results/firefox-page-'+page+'-'+width+'.png'),Buffer.from(shot.data,'base64'));}
  }
  await navigate('examples/workspace.html');
  check('Firefox page save error and retry keep draft',await evaluate(`(async()=>{const root=document.querySelector('[data-page-example]'),c=BrandUIPageExamples.get(root);root.querySelector('[data-page-create]').click();const f=root.querySelector('[data-page-edit-form]');f.elements.name.value='Проверка Firefox';f.elements.name.dispatchEvent(new Event('input',{bubbles:true}));c.configure({onSave:async()=>({errors:{name:'Название занято'}})});f.requestSubmit();await new Promise(r=>setTimeout(r,10));const failed=f.elements.name.value==='Проверка Firefox'&&BrandUI.forms.get(f).getState()==='invalid'&&c.getState().dirty;f.elements.name.value='Другая запись';f.elements.name.dispatchEvent(new Event('input',{bubbles:true}));c.configure({onSave:async()=>({})});f.requestSubmit();await new Promise(r=>setTimeout(r,10));return failed&&BrandUI.forms.get(f).getState()==='success'&&!c.getState().dirty})()`));
  check('Firefox no JavaScript exceptions',!errors.length);
  await writeFile(join(root,'test-results/firefox-environment.json'),JSON.stringify({browser:session.capabilities.browserVersion,platform:session.capabilities.platformName,scope:'mobile patterns and three page recipes: 64 theme/density/viewport combinations; 8 preview density/viewport combinations and content-sized filters; state, save, errors and cleanup smoke; programmatic actions; no screen reader or trusted keyboard'},null,2)+'\n');
  await call('session.end');
}finally{socket?.close();child.kill('SIGTERM');server.close();await new Promise(r=>{if(child.exitCode!==null)r();else {child.once('exit',r);setTimeout(r,2000);}});await rm(profile,{recursive:true,force:true}).catch(()=>{});}
