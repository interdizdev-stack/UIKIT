import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { browser, sleep, root } from './runtime.mjs';
const check = (name, value) => { assert.ok(value, name); console.log('PASS ' + name); };
await browser(async ({ evaluate, navigate, viewport, key, screenshot, call }) => {
  for (const width of [320,390,768,1440]) {
    await viewport(width); await navigate('examples/site-blocks.html');
    for (const theme of ['light','dark']) {
      await evaluate(`BrandUI.theme.get().setMode('${theme}')`);
      check('site sections layout ' + width + ' ' + theme, await evaluate(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return document.documentElement.scrollWidth<=document.documentElement.clientWidth+2&&document.querySelectorAll('[data-site-block]').length===14&&new Set(ids).size===ids.length&&![...document.styleSheets].some(s=>s.href?.includes('catalog.css'))})()`));
    }
  }
  await viewport(320); await navigate('examples/site-blocks.html'); await evaluate(`BrandUI.theme.get().setMode('light')`); await sleep(100); await screenshot('site-hero-mobile.png');
  check('hero and CTA lead to existing sections', await evaluate(`(()=>{const links=[...document.querySelectorAll('.brand-hero a,.brand-promo a,.brand-card a')];return links.length>=6&&links.every(a=>document.getElementById(a.hash.slice(1)))&&document.querySelector('.brand-hero img').naturalWidth>0})()`));
  await evaluate(`Promise.all([...document.querySelectorAll('.brand-hero img,.brand-case img')].map(image=>{image.loading='eager';return image.decode()}))`);
  check('all SVG illustrations load and decorations stay outside accessibility tree', await evaluate(`(()=>{const images=[...document.querySelectorAll('.brand-hero img,.brand-case img')];return images.every(i=>i.complete&&i.naturalWidth>0)&&[...document.querySelectorAll('.brand-graphic')].every(e=>e.getAttribute('aria-hidden')==='true'&&getComputedStyle(e).pointerEvents==='none')&&getComputedStyle(document.querySelector('.brand-graphic--dots')).maskImage.includes('dots.svg')})()`));
  await evaluate(`document.querySelector('.brand-faq summary').focus()`); await key('Enter');
  check('FAQ uses native keyboard disclosure', await evaluate(`document.querySelector('.brand-faq details').open&&document.activeElement.tagName==='SUMMARY'&&document.querySelector('.brand-faq details p').textContent.length>20`));
  await key('Enter');
  check('FAQ toggles closed without focus loss', await evaluate(`!document.querySelector('.brand-faq details').open&&document.activeElement.tagName==='SUMMARY'`));
  check('contact validates fields and demonstrates success without network', await evaluate(`(()=>{const form=document.querySelector('[data-site-demo-form]');form.requestSubmit();const invalid=form.classList.contains('was-validated')&&document.activeElement===form.elements.name;form.elements.name.value='Тест';form.elements.email.value='test@example.com';form.requestSubmit();return invalid&&form.querySelector('[data-site-form-result]').hidden===false&&form.querySelector('[data-site-form-result]').textContent.includes('не отправлено')})()`));
  await evaluate(`document.documentElement.style.scrollBehavior='auto';document.querySelector('#site-contact').scrollIntoView();`);await sleep(50); await screenshot('site-contact-mobile.png');
  check('comparison retains semantic headers and a focused scroll region', await evaluate(`(()=>{const region=document.querySelector('.brand-comparison');region.focus();return document.activeElement===region&&region.scrollWidth>region.clientWidth&&region.querySelectorAll('th[scope="row"]').length===4&&region.querySelector('caption')&&region.getAttribute('aria-label').includes('прокрутка')})()`));
  await call('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
  check('forced colors hide decorations and preserve content', await evaluate(`getComputedStyle(document.querySelector('.brand-graphic')).display==='none'&&document.querySelector('.brand-stats').textContent.includes('03')&&getComputedStyle(document.querySelector('.brand-stats')).display!=='none'`));
  await call('Emulation.setEmulatedMedia',{features:[]});
  await viewport(1440); await navigate('examples/site-blocks.html'); await evaluate(`BrandUI.theme.get().setMode('dark')`); await sleep(100); await screenshot('site-hero-desktop.png');
  await evaluate(`document.documentElement.style.scrollBehavior='auto';document.querySelector('#site-steps').scrollIntoView()`);await sleep(50); await screenshot('site-steps-desktop.png');
  await navigate('#site-blocks'); await sleep(100);
  check('catalog shares every section and exposes exact source', await evaluate(`(()=>{const buttons=[...document.querySelectorAll('[data-site-code]')];buttons[0].click();const code=document.querySelector('#siteCode-hero');return document.querySelectorAll('[data-site-block]').length===14&&buttons.length===14&&!code.hidden&&code.textContent.includes('interface-preview.svg')&&buttons[0].getAttribute('aria-expanded')==='true'&&!!BrandUI.forms.get(document.querySelector('[data-site-demo-form]'))})()`));
  await navigate(pathToFileURL(join(root,'examples/site-blocks.html')).href);
  check('site sections work offline over file://', await evaluate(`location.protocol==='file:'&&document.querySelectorAll('[data-site-block]').length===14&&document.querySelector('.brand-hero img').naturalWidth>0&&!!BrandUI.forms.get(document.querySelector('[data-site-demo-form]'))`));
});
