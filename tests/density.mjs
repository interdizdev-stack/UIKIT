import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { browser, sleep, root } from './runtime.mjs';

const check = (name, value) => { assert.ok(value, name); console.log('PASS ' + name); };
const fixtures = ['sm', 'md', 'lg'].map(size => {
  const suffix = size === 'md' ? '' : '-' + size;
  return `<section data-size="${size}" class="brand-stack">
    <div class="brand-cluster"><button class="btn btn-primary${suffix ? ' btn' + suffix : ''}" type="button">Действие</button><button class="btn btn-primary brand-cta${suffix ? ' btn' + suffix : ''}" type="button">Продолжить</button><button class="btn btn-secondary btn-icon${suffix ? ' btn' + suffix : ''}" type="button" aria-label="Добавить">+</button></div>
    <label>Поле<input class="form-control${suffix ? ' form-control' + suffix : ''}" value="Текст"></label>
    <label>Пароль<input type="password" class="form-control${suffix ? ' form-control' + suffix : ''}" aria-label="Пароль"></label><label>Число<input type="number" class="form-control${suffix ? ' form-control' + suffix : ''}" aria-label="Число"></label><label>Дата<input type="date" class="form-control${suffix ? ' form-control' + suffix : ''}" aria-label="Дата"></label><label>Время<input type="time" class="form-control${suffix ? ' form-control' + suffix : ''}" aria-label="Время"></label><label>Файл<input type="file" class="form-control${suffix ? ' form-control' + suffix : ''}" aria-label="Файл"></label>
    <label>Нативный<select class="form-select${suffix ? ' form-select' + suffix : ''}" data-native-select><option>Первый</option><option>Второй</option></select></label>
    <label>Обычный<select class="form-select${suffix ? ' form-select' + suffix : ''}" aria-label="Обычный ${size}" data-size-select><option value="a">Первый</option><option value="b">Второй</option></select></label>
    <label>С поиском<select class="form-select${suffix ? ' form-select' + suffix : ''}" aria-label="С поиском ${size}" data-brand-choice><option value="a">Первый</option><option value="b">Второй</option></select></label>
    <div class="input-group${suffix ? ' input-group' + suffix : ''}" data-brand-field><span class="input-group-text">https://</span><input class="form-control" value="example" aria-label="Адрес"><button class="btn btn-secondary" type="button" data-field-clear aria-label="Очистить">×</button></div>
  </section>`;
}).join('');

await browser(async ({ navigate, evaluate, viewport, call, screenshot, key }) => {
  for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
    await viewport(width); await navigate('examples/density.html');
    await evaluate(`BrandUI.theme.get().setMode('${theme}'); document.documentElement.style.scrollBehavior='auto'`);
    for (const density of ['default', 'compact']) {
      const sizes = await evaluate(`(async () => {
        const previous=document.querySelector('#sizeFixture');if(previous){await BrandUI.destroy(previous);previous.remove();}
        const host=document.createElement('div');host.id='sizeFixture';host.className='brand-surface brand-stack';host.dataset.uiDensity='${density}';host.innerHTML=${JSON.stringify(fixtures)};document.querySelector('main').append(host);BrandUI.init(host);
        return [...host.querySelectorAll('[data-size]')].map(row=>({size:row.dataset.size,controls:[...row.querySelectorAll('input,select,button,.input-group-text')].filter(e=>!e.classList.contains('brand-select-native')).map(e=>({class:e.className,height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width,font:getComputedStyle(e).fontSize}))}));
      })()`);
      check(`aligned controls ${width} ${theme} ${density}`, sizes.every(row => row.controls.every(control => Math.abs(control.height - (row.size === 'lg' ? 52 : row.size === 'sm' || density === 'compact' ? 36 : 44)) < 1)));
      check(`contained layout ${width} ${theme} ${density}`, await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'));
    }
  }

  await viewport(1440); await navigate('examples/density.html');
  check('density preserves text size and nested default resets dimensions', await evaluate(`(() => {
    const sections=[...document.querySelectorAll('[data-density-host] > div > section')];
    return sections.every(e=>getComputedStyle(e.querySelector('.form-control')).fontSize==='14px')&&sections[0].querySelector('.form-control').getBoundingClientRect().height===44&&sections[1].querySelector('.form-control').getBoundingClientRect().height===36&&sections[1].querySelector('[data-ui-density=default] button').getBoundingClientRect().height===44&&getComputedStyle(sections[1]).padding==='16px';
  })()`));
  check('data rows and skeleton avatars follow density', await evaluate(`(() => {
    const sections=[...document.querySelectorAll('[data-density-host] > div > section')];
    return sections.every((e,i)=>[...e.querySelectorAll('tr')].every(r=>Math.abs(r.getBoundingClientRect().height-(i?40:48))<1)&&e.querySelector('.brand-skeleton--avatar').getBoundingClientRect().width===(i?24:32));
  })()`));
  await evaluate(`(() => {const section=document.querySelector('[data-density-host] > div > [data-ui-density=compact]');const trigger=section.querySelector('select').nextElementSibling.querySelector('button');trigger.focus({preventScroll:true});trigger.click();})()`);
  check('ordinary popup carries compact density into body', await evaluate(`(() => {const m=document.querySelector('body > .brand-select-menu:not([hidden])');return m&&getComputedStyle(m).getPropertyValue('--ui-density-control-height').trim()==='36px'&&Math.abs(m.querySelector('[role=option]').getBoundingClientRect().height-36)<1;})()`));
  await key('ArrowDown'); await key('Enter');
  check('ordinary popup retains keyboard and native value', await evaluate(`document.querySelector('[data-density-host] > div > [data-ui-density=compact] select').value==='ready'`));
  await evaluate(`(() => {const s=document.querySelector('[data-density-host] > div > [data-ui-density=compact] select[data-brand-choice]');s.nextElementSibling.querySelector('input').focus({preventScroll:true});BrandUI.choice.get(s).open();})()`);
  check('search popup carries compact density into body', await evaluate(`(() => {const m=document.querySelector('body > .brand-choice-menu:not([hidden])');return m&&Math.abs(m.querySelector('[role=option]').getBoundingClientRect().height-36)<1;})()`));
  await key('Escape');
  await evaluate(`(() => {const s=document.querySelector('select[data-brand-choice]');s.classList.add('form-select-lg');s.dataset.uiDensity='compact';})()`); await sleep(40);
  check('choice mirrors local size and density updates', await evaluate(`(() => {const s=document.querySelector('select[data-brand-choice]');return s.nextElementSibling.dataset.uiDensity==='compact'&&s.nextElementSibling.querySelector('input').getBoundingClientRect().height===52;})()`));

  await navigate('index.html#forms'); await sleep(150);
  check('copied form preserves portable field rhythm', await evaluate(`(async () => {
    let doc;for(let i=0;i<100;i++){doc=document.querySelector('[data-example-frame]')?.contentDocument;if(doc?.querySelector('.form-field'))break;await new Promise(r=>setTimeout(r,20));}
    const a=document.querySelector('.consultation-tool .form-field'),b=doc.querySelector('.form-field');
    return getComputedStyle(a).marginBottom===doc.defaultView.getComputedStyle(b).marginBottom&&getComputedStyle(a).marginBottom==='20px';
  })()`));
  await navigate('index.html#tables'); await sleep(150);
  check('table geometry matches copied document without catalog styles', await evaluate(`(async () => {
    let doc;for(let i=0;i<100;i++){doc=document.querySelector('[data-example-frame]')?.contentDocument;if(doc?.querySelector('tbody tr'))break;await new Promise(r=>setTimeout(r,20));}
    const metrics=d=>({rows:[...d.querySelectorAll('table tr')].map(e=>e.getBoundingClientRect().height),checkbox:d.defaultView.getComputedStyle(d.querySelector('table input')).width,header:d.defaultView.getComputedStyle(d.querySelector('table th')).fontSize});
    const a=metrics(document),b=metrics(doc);return JSON.stringify(a)===JSON.stringify(b);
  })()`));

  await navigate('examples/density.html'); await viewport(320);
  check('long labels and larger text can increase control height', await evaluate(`(() => {
    const button=document.createElement('button');button.className='btn btn-primary btn-sm';button.style.cssText='width:150px;font-size:28px';button.textContent='Сохранить все изменения проекта';document.querySelector('main').append(button);const r=button.getBoundingClientRect();return r.height>36&&button.scrollHeight<=button.clientHeight+1&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+1;
  })()`));
  await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  check('coarse pointer keeps compact buttons and fields at 44px', await evaluate(`(() => {
    const section=document.querySelector('[data-density-host] > div > [data-ui-density=compact]');return matchMedia('(pointer:coarse)').matches&&section.querySelector('.form-control').getBoundingClientRect().height>=44&&section.querySelector('.btn-icon').getBoundingClientRect().width>=44;
  })()`));
  await call('Emulation.setTouchEmulationEnabled', { enabled: false });
  for (const width of [320,1440]) for (const theme of ['light','dark']) {
    await viewport(width); await navigate('examples/density.html'); await evaluate(`BrandUI.theme.get().setMode('${theme}')`);
    await screenshot('density-'+width+'-'+theme+'.png');
    await evaluate(`document.querySelector('[data-density-host] > div > [data-ui-density=compact]').scrollIntoView({block:'start',behavior:'instant'})`);
    await screenshot('density-compact-'+width+'-'+theme+'.png');
  }
  await navigate(pathToFileURL(join(root,'examples/density.html')).href);
  check('density example works offline without catalog dependencies', await evaluate(`document.querySelectorAll('[data-density-host] .brand-select').length===2&&document.querySelectorAll('[data-density-host] .brand-choice').length===2&&![...document.styleSheets].some(s=>s.href?.includes('catalog.css'))`));
});
