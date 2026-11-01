(function () {
  'use strict';

  const view = document.getElementById('view');
  const entries = {
    buttons: { title: 'Кнопки', group: 'Компоненты / 01', meta: 'Button', icon: 'mouse-pointer-2' },
    forms: { title: 'Поля и формы', group: 'Компоненты / 02', meta: 'Form', icon: 'text-cursor-input' },
    navigation: { title: 'Навигация', group: 'Компоненты / 03', meta: 'Navigation', icon: 'panel-top' },
    feedback: { title: 'Обратная связь', group: 'Компоненты / 04', meta: 'Feedback', icon: 'bell' },
    tables: { title: 'Таблицы', group: 'Компоненты / 05', meta: 'Table', icon: 'table-2' },
    cookies: { title: 'Cookie и Метрика', group: 'Компоненты / 06', meta: 'Consent', icon: 'cookie' },
    modals: { title: 'Модальные окна', group: 'Компоненты / 07', meta: 'Modal', icon: 'panels-top-left' },
    lightbox: { title: 'Lightbox', group: 'Компоненты / 08', meta: 'Gallery', icon: 'image' },
    cards: { title: 'Карточки', group: 'Компоненты / 09', meta: 'Cards', icon: 'layout-grid' },
    lists: { title: 'Списки', group: 'Компоненты / 10', meta: 'Lists', icon: 'list' },
    identity: { title: 'Аватары и теги', group: 'Компоненты / 11', meta: 'Avatar / Chips', icon: 'users' },
    'site-navigation': { title: 'Шапка, подвал и панели', group: 'Компоненты / 12', meta: 'Navbar / Drawer / Popover', icon: 'panels-top-left' },
    'advanced-forms': { title: 'Расширенные поля и формы', group: 'Компоненты / 13', meta: 'Inputs / Choices / Upload / Stepper', icon: 'list-filter' },
    'site-blocks': { title: 'Блоки сайта', group: 'Композиции', meta: 'Site sections / Graphics', icon: 'blocks' },
    icons: { title: 'Иконки', group: 'Основы / 04', meta: 'Lucide / SVG', icon: 'shapes' },
    compositions:{title:'Композиции',group:'Композиции',meta:'Patterns / Mobile / Site',icon:'layers'},
    pages: {title:'Рабочие страницы',group:'Страницы',meta:'Workspace / Access / Content',icon:'layout-template'},
    integration: { title: 'Подключение и API', group: 'Документация', meta: 'HTML / PHP', icon: 'book-open' },
    colors: { title: 'Цвета и токены', group: 'Основы / 01', meta: 'Tokens', icon: 'palette' },
    typography: { title: 'Типографика', group: 'Основы / 02', meta: 'Typography', icon: 'type' },
    references: { title: 'Фирменный стиль', group: 'Основы / 03', meta: 'References', icon: 'images' }
  };
  const buttonState = { variant: 'primary', size: '', label: 'Отправить заявку', icon: 'arrow-right', disabled: false, loading: false };
  const cookieState = { variant: 'bar', frame: '100%', code: false, policyUrl: '/privacy/cookies/' };
  let cookiePreview = null;
  let cookieLive = null;
  const references = [
    { file: '01-form.png', title: 'Акцент и форма', size: '1200 × 676' },
    { file: '02-consultation.png', title: 'Композиция и поля', size: '1200 × 676' },
    { file: '03-journey.png', title: 'Тёмная тема и этапы', size: '1200 × 676' },
    { file: '04-structure.png', title: 'Светлая тема и структура', size: '1200 × 900' },
    { file: '05-reading.png', title: 'Иерархия и иконки', size: '1200 × 676' },
    { file: '06-signs.png', title: 'Графика и характер', size: '1200 × 800' }
  ];
  let currentView = 'buttons';
  let renderSequence = 0;
  let codeVisible = false;

  function icon(name, extra) { return '<i data-lucide="' + name + '"' + (extra ? ' class="' + extra + '"' : '') + '></i>'; }
  function escape(value) { return String(value).replace(/[&<>"']/g, function (char) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]; }); }
  function heading(title, detail) { return '<div class="section-heading"><h2>' + title + '</h2>' + (detail ? '<span>' + detail + '</span>' : '') + '</div>'; }
  function toast(message) {
    BrandUI.toasts.push({ message: message, variant: 'info', duration: 3000 });
  }
  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const field = document.createElement('textarea');
        field.value = text;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.append(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Copy failed');
      }
      toast('Скопировано');
    } catch { toast('Буфер обмена недоступен'); }
  }
  function showDialog(title, body) {
    const dialog = document.getElementById('demoDialog');
    if (!dialog.classList.contains('show')) {
      const trigger = document.activeElement;
      dialog.addEventListener('hidden.bs.modal', function () {
        if (trigger && trigger.isConnected) trigger.focus();
      }, { once: true });
    }
    document.getElementById('demoDialogTitle').textContent = title;
    document.getElementById('demoDialogBody').innerHTML = body;
    BrandUI.init();
    bootstrap.Modal.getOrCreateInstance(dialog).show();
  }
  function buttonMarkup() {
    const classes = 'btn btn-' + buttonState.variant + (buttonState.size ? ' btn-' + buttonState.size : '') + ' brand-cta';
    const attributes = (buttonState.disabled || buttonState.loading ? ' disabled' : '') + (buttonState.loading ? ' aria-busy="true"' : '');
    const glyph = buttonState.loading ? icon('loader-circle', 'brand-spinner') : buttonState.icon ? icon(buttonState.icon) : '';
    return '<button type="button" class="' + classes + '"' + attributes + '>' + escape(buttonState.label) + glyph + '</button>';
  }
  function buttonCode() {
    const classes = 'btn btn-' + buttonState.variant + (buttonState.size ? ' btn-' + buttonState.size : '') + ' brand-cta';
    return '<button type="button" class="' + classes + '"' + (buttonState.disabled || buttonState.loading ? ' disabled' : '') + (buttonState.loading ? ' aria-busy="true"' : '') + '>\n  ' + escape(buttonState.label) + (buttonState.loading ? '\n  <i data-lucide="loader-circle" class="brand-spinner"></i>' : buttonState.icon ? '\n  <i data-lucide="' + buttonState.icon + '"></i>' : '') + '\n</button>';
  }
  function option(value, label, selected) { return '<option value="' + value + '"' + (selected === value ? ' selected' : '') + '>' + label + '</option>'; }
  function buttonsView() {
    const variants = [['primary', 'Основная', 'Primary'], ['secondary', 'Вторичная', 'Secondary'], ['outline-primary', 'Контурная', 'Outline'], ['ghost', 'Без фона', 'Ghost'], ['danger', 'Удалить', 'Danger']];
    return '<div class="content-grid"><div class="component-content">' +
      '<div class="preview-tool"><div class="preview-toolbar"><div class="preview-toolbar-label">' + icon('square-mouse-pointer') + '<span>Образец компонента</span></div><div class="preview-tools">' +
      '<button class="btn btn-ghost btn-icon active" type="button" data-frame="100%" aria-label="Ширина настольного экрана" aria-pressed="true" data-bs-toggle="tooltip" title="Настольный экран">' + icon('monitor') + '</button>' +
      '<button class="btn btn-ghost btn-icon" type="button" data-frame="768px" aria-label="Ширина планшета" aria-pressed="false" data-bs-toggle="tooltip" title="Планшет">' + icon('tablet') + '</button>' +
      '<button class="btn btn-ghost btn-icon" type="button" data-frame="320px" aria-label="Ширина мобильного экрана" aria-pressed="false" data-bs-toggle="tooltip" title="Мобильный экран">' + icon('smartphone') + '</button>' +
      '<button class="btn btn-ghost btn-icon" type="button" id="toggleCode" aria-label="Показать HTML" aria-pressed="false" data-bs-toggle="tooltip" title="HTML">' + icon('code-2') + '</button></div></div>' +
      '<div class="preview-stage" id="buttonStage"><div class="preview-target" id="buttonTarget">' + buttonMarkup() + '</div></div><pre class="code-preview" id="buttonCode" hidden></pre>' +
      '<div class="preview-caption"><code id="buttonClass">.btn-primary</code><span>Bootstrap / Brand theme</span></div></div>' +
      heading('Варианты', '06') + '<div class="variants-grid">' + variants.map(function (item, index) { return '<div class="variant-example"><button type="button" class="btn btn-' + item[0] + '" data-variant="' + item[0] + '">' + item[1] + (item[0] === 'primary' ? icon('arrow-right') : '') + '</button><div class="example-label"><span>' + item[2] + '</span><span>0' + (index + 1) + '</span></div></div>'; }).join('') +
      '<div class="variant-example"><button type="button" class="btn btn-secondary btn-icon" data-copy="Brand UI" aria-label="Скопировать образец" data-bs-toggle="tooltip" title="Копировать">' + icon('copy') + '</button><div class="example-label"><span>Icon button</span><span>06</span></div></div></div>' +
      heading('Состояния', 'Hover / Focus / Disabled / Loading') + '<div class="states-grid"><div class="state-example"><button type="button" class="btn btn-primary" data-demo-state="hover" data-action="sample">Отправить</button><span>Наведение</span></div><div class="state-example"><button type="button" class="btn btn-primary" data-demo-state="focus" data-action="sample">Отправить</button><span>Фокус</span></div><div class="state-example"><button type="button" class="btn btn-primary" disabled>Отправить</button><span>Недоступна</span></div><div class="state-example"><button type="button" class="btn btn-primary" disabled aria-busy="true">' + icon('loader-circle', 'brand-spinner') + 'Отправка</button><span>Загрузка</span></div></div>' +
      heading('Размеры', '36 / 44 / 52 px') + '<div class="size-row"><div class="size-example"><button type="button" class="btn btn-primary btn-sm" data-size="sm">Продолжить' + icon('arrow-right') + '</button><span>Small / 36 px</span></div><div class="size-example"><button type="button" class="btn btn-primary" data-size="">Продолжить' + icon('arrow-right') + '</button><span>Medium / 44 px</span></div><div class="size-example"><button type="button" class="btn btn-primary btn-lg" data-size="lg">Продолжить' + icon('arrow-right') + '</button><span>Large / 52 px</span></div></div></div>' +
      '<aside class="inspector" aria-label="Свойства кнопки"><div class="inspector-title">Свойства компонента</div><div class="inspector-layout">' +
      '<div class="inspector-field"><label class="form-label" for="buttonVariant">Вариант</label><select class="form-select" id="buttonVariant" data-button-control="variant">' + variants.map(function (v) { return option(v[0], v[1], buttonState.variant); }).join('') + '</select></div>' +
      '<div class="inspector-field"><label class="form-label" for="buttonSize">Размер</label><select class="form-select" id="buttonSize" data-button-control="size">' + option('sm', 'Small / 36 px', buttonState.size) + option('', 'Medium / 44 px', buttonState.size) + option('lg', 'Large / 52 px', buttonState.size) + '</select></div>' +
      '<div class="inspector-field"><label class="form-label" for="buttonLabel">Текст</label><input class="form-control" id="buttonLabel" data-button-control="label" value="' + escape(buttonState.label) + '" maxlength="80"></div>' +
      '<div class="inspector-field"><label class="form-label" for="buttonIcon">Иконка</label><select class="form-select" id="buttonIcon" data-button-control="icon">' + option('arrow-right', 'Стрелка', buttonState.icon) + option('plus', 'Добавить', buttonState.icon) + option('check', 'Готово', buttonState.icon) + option('download', 'Скачать', buttonState.icon) + option('', 'Без иконки', buttonState.icon) + '</select></div></div>' +
      '<div class="form-check form-switch"><label class="form-check-label" for="buttonDisabled">Недоступна</label><input class="form-check-input" type="checkbox" role="switch" id="buttonDisabled" data-button-control="disabled"' + (buttonState.disabled ? ' checked' : '') + '></div>' +
      '<div class="form-check form-switch"><label class="form-check-label" for="buttonLoading">Загрузка</label><input class="form-check-input" type="checkbox" role="switch" id="buttonLoading" data-button-control="loading"' + (buttonState.loading ? ' checked' : '') + '></div><div class="inspector-divider"></div>' +
      '<div class="token-spec"><span>Скругление</span><code>4 px</code></div><div class="token-spec"><span>Переход</span><code>120 ms</code></div><div class="token-spec"><span>Акцент</span><code>#C1F000</code></div><div class="inspector-divider"></div><button type="button" class="btn btn-secondary w-100" id="copyButton">' + icon('copy') + 'Копировать HTML</button><button type="button" class="btn btn-ghost w-100 mt-2" id="resetButton">' + icon('rotate-ccw') + 'Сбросить</button></aside></div>';
  }
  function formMarkup(prefix) {
    return '<form class="brand-form" id="' + prefix + '" data-demo-form data-brand-form novalidate><div class="form-field"><label class="form-label" for="' + prefix + '-name">Имя</label><div class="field-icon">' + icon('user-round') + '<input class="form-control" id="' + prefix + '-name" name="name" placeholder="Ваше имя" autocomplete="given-name" required minlength="2" aria-describedby="' + prefix + '-name-error"><div class="invalid-feedback" id="' + prefix + '-name-error">Укажите имя, минимум 2 символа.</div></div></div>' +
      '<div class="form-field"><label class="form-label" for="' + prefix + '-method">Способ связи</label><div class="field-icon">' + icon('phone') + '<select class="form-select" id="' + prefix + '-method" name="method" data-contact-method><option value="email">Электронная почта</option><option value="phone">Телефон</option><option value="telegram">Telegram</option></select></div></div>' +
      '<div class="form-field"><label class="form-label" for="' + prefix + '-contact" data-contact-label>Email</label><input class="form-control" type="email" id="' + prefix + '-contact" name="contact" placeholder="name@example.com" autocomplete="email" required aria-describedby="' + prefix + '-contact-error"><div class="invalid-feedback" id="' + prefix + '-contact-error" data-contact-error>Укажите корректный email.</div></div>' +
      '<div class="form-field"><label class="form-label" for="' + prefix + '-time">Удобное время</label><div class="field-icon">' + icon('calendar-days') + '<select class="form-select" id="' + prefix + '-time" name="time" required aria-describedby="' + prefix + '-time-error"><option value="">Выберите время</option><option>10:00–12:00</option><option>12:00–15:00</option><option>15:00–18:00</option></select><div class="invalid-feedback" id="' + prefix + '-time-error">Выберите удобное время.</div></div></div>' +
      '<div class="form-check"><input class="form-check-input" type="checkbox" id="' + prefix + '-consent" name="consent" required aria-describedby="' + prefix + '-consent-error"><label class="form-check-label" for="' + prefix + '-consent">Согласен на обработку данных</label><div class="invalid-feedback" id="' + prefix + '-consent-error">Подтвердите согласие.</div></div><button class="btn btn-primary brand-cta" type="submit"><span>Отправить заявку</span>' + icon('arrow-right') + '</button><p class="demo-form-error" role="alert" hidden></p></form>';
  }
  function formsView() {
    return '<div class="two-column"><div>' + heading('Готовая форма', 'Consultation') + '<div class="consultation-tool"><h2 class="brand-heading">Запись на консультацию</h2><div class="brand-divider"></div>' + formMarkup('consultation') + '<div class="form-security">' + icon('lock-keyhole') + '<span>Мы свяжемся с вами и обсудим следующий шаг.</span></div></div></div><div>' + heading('Поля и состояния', 'Input / Select') + '<div class="control-samples"><div><label class="form-label" for="sampleDefault">Обычное поле</label><input class="form-control" id="sampleDefault" placeholder="Введите значение"></div><div><label class="form-label" for="sampleSuccess">Заполнено</label><input class="form-control is-valid" id="sampleSuccess" value="Анна" aria-invalid="false"></div><div><label class="form-label" for="sampleError">Ошибка</label><input class="form-control is-invalid" id="sampleError" type="email" value="mail@" aria-invalid="true" aria-describedby="sampleErrorText"><div class="invalid-feedback" id="sampleErrorText">Проверьте адрес электронной почты.</div></div><div><label class="form-label" for="sampleDisabled">Недоступно</label><input class="form-control" id="sampleDisabled" placeholder="Недоступно" disabled></div><div><label class="form-label" for="sampleText">Комментарий</label><textarea class="form-control" id="sampleText" rows="3" placeholder="Расскажите о задаче"></textarea></div></div>' + heading('Выбор и переключатели', 'Controls') + '<div class="control-samples"><div class="control-row"><div class="form-check"><input class="form-check-input" id="sampleCheck" type="checkbox" checked><label class="form-check-label" for="sampleCheck">Выбрано</label></div><div class="form-check"><input class="form-check-input" id="sampleCheck2" type="checkbox"><label class="form-check-label" for="sampleCheck2">Не выбрано</label></div></div><div class="control-row"><div class="form-check"><input class="form-check-input" id="sampleRadio" name="sampleRadio" type="radio" checked><label class="form-check-label" for="sampleRadio">Вариант 1</label></div><div class="form-check"><input class="form-check-input" id="sampleRadio2" name="sampleRadio" type="radio"><label class="form-check-label" for="sampleRadio2">Вариант 2</label></div><div class="form-check form-switch"><input class="form-check-input" id="sampleSwitch" type="checkbox" role="switch" checked><label class="form-check-label" for="sampleSwitch">Уведомления</label></div></div><div><div class="range-value"><label for="sampleRange">Значение</label><output id="sampleRangeValue" for="sampleRange">60%</output></div><input class="form-range" id="sampleRange" type="range" min="0" max="100" step="5" value="60"></div></div></div></div>';
  }
  function navigationView() {
    return heading('Вкладки', 'Tabs') + '<ul class="nav nav-tabs" role="tablist"><li class="nav-item" role="presentation"><button class="nav-link active" id="overviewTab" data-bs-toggle="tab" data-bs-target="#overviewPanel" type="button" role="tab" aria-controls="overviewPanel" aria-selected="true">Обзор</button></li><li class="nav-item" role="presentation"><button class="nav-link" id="projectsTab" data-bs-toggle="tab" data-bs-target="#projectsPanel" type="button" role="tab" aria-controls="projectsPanel" aria-selected="false">Проекты</button></li><li class="nav-item" role="presentation"><button class="nav-link" id="settingsTab" data-bs-toggle="tab" data-bs-target="#settingsPanel" type="button" role="tab" aria-controls="settingsPanel" aria-selected="false">Настройки</button></li></ul><div class="tab-content tabs-preview"><div class="tab-pane active" id="overviewPanel" role="tabpanel" aria-labelledby="overviewTab" tabindex="0"><div class="tab-statistics"><div><strong>08</strong><span>Проектов</span></div><div><strong>03</strong><span>Опубликовано</span></div><div><strong>03</strong><span>В работе</span></div></div></div><div class="tab-pane" id="projectsPanel" role="tabpanel" aria-labelledby="projectsTab" tabindex="0"><div class="d-flex align-items-center justify-content-between gap-3"><span>Все проекты</span><a class="btn btn-primary btn-sm" href="#tables">Открыть таблицу' + icon('arrow-right') + '</a></div></div><div class="tab-pane" id="settingsPanel" role="tabpanel" aria-labelledby="settingsTab" tabindex="0"><div class="form-check form-switch"><input class="form-check-input" id="navNotify" type="checkbox" role="switch" checked><label class="form-check-label" for="navNotify">Уведомления о проектах</label></div></div></div>' +
      '<div class="sample-band"><h3>Хлебные крошки</h3><nav aria-label="Пример хлебных крошек"><ol class="breadcrumb"><li class="breadcrumb-item"><a href="#buttons">Библиотека</a></li><li class="breadcrumb-item"><a href="#forms">Компоненты</a></li><li class="breadcrumb-item active" aria-current="page">Навигация</li></ol></nav></div>' +
      '<div class="sample-band"><h3>Меню и действия</h3><div class="control-row"><div class="dropdown"><button class="btn btn-secondary" type="button" data-bs-toggle="dropdown" aria-expanded="false">Действия' + icon('chevron-down') + '</button><ul class="dropdown-menu"><li><button class="dropdown-item" type="button" data-action="dialog">' + icon('square-pen') + 'Открыть диалог</button></li><li><button class="dropdown-item" type="button" data-copy="Brand UI">' + icon('copy') + 'Копировать название</button></li><li><a class="dropdown-item" href="tokens.json" download>' + icon('download') + 'Скачать токены</a></li></ul></div><button class="btn btn-ghost btn-icon" type="button" data-copy="Brand UI" aria-label="Копировать" data-bs-toggle="tooltip" title="Копировать">' + icon('copy') + '</button><button class="btn btn-ghost btn-icon" type="button" data-action="toast" aria-label="Уведомление" data-bs-toggle="tooltip" title="Уведомление">' + icon('bell') + '</button><a class="btn btn-ghost btn-icon" href="tokens.json" download aria-label="Скачать токены" data-bs-toggle="tooltip" title="Скачать токены">' + icon('download') + '</a></div></div>' +
      '<div class="sample-band"><h3>Пагинация</h3><nav aria-label="Пример пагинации"><ul class="pagination" id="navigationPages">' + [1, 2, 3].map(function (number) { return '<li class="page-item' + (number === 1 ? ' active' : '') + '"><button class="page-link" type="button" data-nav-page="' + number + '"' + (number === 1 ? ' aria-current="page"' : '') + '>' + number + '</button></li>'; }).join('') + '</ul></nav><p class="small text-body-secondary" id="navigationPageStatus" aria-live="polite">Страница 1 из 3</p></div>';
  }
  function componentsCode(kind) {
    if (kind === 'feedback') return BrandUIFeedbackExamples.markup({ prefix: 'siteFeedback' }).replace(/></g, '>\n<');
    if (kind === 'advanced-forms') return BrandUIAdvancedExamples.markup({ prefix: 'siteAdvanced' }).replace(/></g, '>\n<');
    return BrandUIComponentsExamples.markup(kind, { prefix: 'siteComponents', assetBase: 'assets/' }).replace(/></g, '>\n<');
  }
  function componentsView(kind) {
    const behavior = ['identity', 'site-navigation'].includes(kind) ? 'ui-kit-components.js' : 'CSS; JS для подсказок и демонстрационных действий';
    return '<div class="sample-band"><p class="brand-small text-body-secondary">Подключение: Bootstrap, tokens.css, ui-kit.css и ui-kit.js. Поведение: ' + behavior + '.</p><div class="brand-cluster mb-4"><a class="btn btn-secondary btn-sm" href="examples/components.html#' + kind + '">Автономный пример' + icon('external-link') + '</a><button class="btn btn-secondary btn-sm" type="button" data-components-code="' + kind + '" aria-expanded="false" aria-controls="componentsCode">HTML' + icon('code') + '</button><button class="btn btn-secondary btn-sm" type="button" data-components-copy="' + kind + '">Копировать HTML' + icon('copy') + '</button><a class="brand-small" href="docs/components.md">Правила и API</a></div><pre class="code-preview" id="componentsCode" hidden></pre></div>' + BrandUIComponentsExamples.markup(kind, { prefix: 'catalogComponents', assetBase: 'assets/' });
  }
  function advancedView() {
    return '<div class="sample-band"><p class="brand-small text-body-secondary">Подключение: Bootstrap, tokens.css, ui-kit.css, ui-kit.js, ui-kit-forms.js и ui-kit-inputs.js.</p><div class="brand-cluster mb-4"><a class="btn btn-secondary btn-sm" href="examples/advanced-forms.html">Автономный пример</a><button class="btn btn-secondary btn-sm" type="button" data-components-code="advanced-forms" aria-expanded="false" aria-controls="componentsCode">HTML</button><button class="btn btn-secondary btn-sm" type="button" data-components-copy="advanced-forms">Копировать HTML</button><a href="docs/inputs.md" class="brand-small">Правила и API</a></div><pre class="code-preview" id="componentsCode" hidden></pre></div>' + BrandUIAdvancedExamples.markup({ prefix: 'catalogAdvanced' });
  }
  function feedbackView() {
    return '<div class="sample-band"><p class="brand-small text-body-secondary">Подключение: Bootstrap CSS, tokens.css, ui-kit.css, ui-kit.js и ui-kit-feedback.js.</p><div class="brand-cluster mb-4"><a class="btn btn-secondary btn-sm" href="examples/feedback.html">Автономный пример</a><button class="btn btn-secondary btn-sm" type="button" data-components-code="feedback" aria-expanded="false" aria-controls="componentsCode">HTML</button><button class="btn btn-secondary btn-sm" type="button" data-components-copy="feedback">Копировать HTML</button><a href="docs/feedback.md" class="brand-small">Правила и API</a></div><pre class="code-preview" id="componentsCode" hidden></pre></div>' + BrandUIFeedbackExamples.markup({ prefix: 'catalogFeedback' }) +
      '<div class="sample-band mt-4"><h3>Статусы</h3><div class="badge-row"><span class="brand-badge success">Опубликован</span><span class="brand-badge warning">В работе</span><span class="brand-badge info">На проверке</span><span class="brand-badge danger">Ошибка</span><span class="brand-badge">Черновик</span></div></div>' +
      '<div class="two-column"><div class="sample-band"><h3>Уведомления и диалоги</h3><div class="control-row"><button class="btn btn-secondary" type="button" data-action="toast">' + icon('bell') + 'Уведомление</button><button class="btn btn-primary" type="button" data-action="dialog">Открыть диалог' + icon('arrow-up-right') + '</button></div></div><div class="sample-band"><h3>Прогресс</h3><div class="range-value"><label for="progressRange">Выполнение</label><output id="progressValue" for="progressRange">65%</output></div><div class="progress mb-4" role="progressbar" aria-label="Выполнение" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100" id="sampleProgress"><div class="progress-bar" style="width:65%"></div></div><input type="range" class="form-range" id="progressRange" min="0" max="100" value="65"></div></div>' +
      heading('Раскрывающиеся блоки', 'Accordion') + '<div class="accordion" id="sampleAccordion">' + [['Что входит в консультацию?', 'Обсудим задачу, текущие ограничения и следующий шаг.'], ['Когда можно начать?', 'Удобное время выбирается при записи на консультацию.'], ['Как проходит работа?', 'Сначала согласуем задачу и результат, затем приступим к реализации.']].map(function (item, index) { return '<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button' + (index ? ' collapsed' : '') + '" type="button" data-bs-toggle="collapse" data-bs-target="#accordion' + index + '" aria-expanded="' + (!index) + '" aria-controls="accordion' + index + '">' + item[0] + '</button></h3><div id="accordion' + index + '" class="accordion-collapse collapse' + (index ? '' : ' show') + '" data-bs-parent="#sampleAccordion"><div class="accordion-body">' + item[1] + '</div></div></div>'; }).join('') + '</div>';
  }
  function modalsView() {
    const variants = [
      ['message', 'info', 'Информационное окно', 'Сообщение с одной кнопкой закрытия.', 'exampleMessageModal'],
      ['confirm', 'circle-check', 'Подтверждение действия', 'Выбор между подтверждением и отменой.', 'exampleConfirmModal'],
      ['form', 'text-cursor-input', 'Форма в окне', 'Имя, телефон, время и проверка обязательных полей.', 'exampleFormModal']
    ];
    return heading('Рабочие примеры', 'Modal / 03') + '<p class="component-intro">Окна используют общий стиль и открываются поверх текущей страницы.</p>' +
      '<div class="overlay-examples">' + variants.map(function (item) {
        return '<article class="overlay-example"><div class="overlay-example-icon">' + icon(item[1]) + '</div><h3>' + item[2] + '</h3><p>' + item[3] + '</p><button class="btn btn-primary" type="button" data-bs-toggle="modal" data-bs-target="#' + item[4] + '">Открыть окно' + icon('arrow-up-right') + '</button><div class="overlay-example-code"><button class="btn btn-ghost btn-sm" type="button" data-modal-code="' + item[0] + '" aria-controls="modalExampleCode" aria-expanded="false">' + icon('code-2') + 'Показать HTML</button><button class="btn btn-secondary btn-sm" type="button" data-modal-copy="' + item[0] + '">' + icon('copy') + 'Копировать</button></div></article>';
      }).join('') + '</div><p class="brand-alert success mt-3" id="overlayExampleStatus" role="status" hidden></p><pre class="code-preview overlay-code" id="modalExampleCode" hidden></pre>' +
      '<div class="sample-band"><h3>Управление</h3><p class="text-body-secondary">Escape, кнопка закрытия или нажатие на фон закрывают окно. Tab перемещает фокус внутри диалога; после закрытия фокус возвращается к кнопке открытия.</p><a class="btn btn-secondary btn-sm" href="examples/overlays.html" target="_blank" rel="noopener">Автономный пример' + icon('external-link') + '</a></div>';
  }
  function lightboxCode() {
    return BrandUIExamples.galleryMarkup('assets/gallery/', 'gallery').replace(/></g, '>\n<');
  }
  function lightboxView() {
    return heading('Галерея изображений', 'Lightbox / 03') + '<p class="component-intro">Нажмите на изображение, чтобы открыть его в полном размере.</p>' + BrandUIExamples.galleryMarkup('assets/gallery/', 'catalog-gallery') +
      '<div class="lightbox-example-actions"><button class="btn btn-secondary" type="button" id="copyLightbox">' + icon('copy') + 'Копировать HTML</button><button class="btn btn-ghost" type="button" id="toggleLightboxCode" aria-controls="lightboxExampleCode" aria-expanded="false">' + icon('code-2') + 'Показать HTML</button><a class="btn btn-ghost" href="examples/overlays.html" target="_blank" rel="noopener">Автономный пример' + icon('external-link') + '</a></div><pre class="code-preview overlay-code" id="lightboxExampleCode" hidden></pre>' +
      '<div class="sample-band"><h3>Управление</h3><p class="text-body-secondary">Кнопки и стрелки клавиатуры переключают изображения. Escape или нажатие на фон закрывают просмотр. Доступны zoom, миниатюры и полный экран. На увеличенном изображении стрелки перемещают кадр; плюс, минус и 0 управляют масштабом. Горизонтальный swipe переключает кадры; вертикальный жест и масштаб страницы сохраняются при 100%.</p></div>';
  }
  function cookieCode() {
    return BrandUI.cookies.markup({ id: 'siteCookies', variant: cookieState.variant, policyUrl: cookieState.policyUrl });
  }
  function cookiesView() {
    return '<div class="content-grid"><div class="component-content"><div class="preview-tool"><div class="preview-toolbar"><div class="preview-toolbar-label">' + icon('cookie') + '<span>Уведомление cookie</span></div><div class="preview-tools"><button class="btn btn-ghost btn-icon" type="button" data-cookie-frame="100%" aria-label="Настольный экран" data-bs-toggle="tooltip" title="Настольный экран">' + icon('monitor') + '</button><button class="btn btn-ghost btn-icon" type="button" data-cookie-frame="320px" aria-label="Мобильный экран" data-bs-toggle="tooltip" title="Мобильный экран">' + icon('smartphone') + '</button><button class="btn btn-ghost btn-icon" id="toggleCookieCode" type="button" aria-label="Показать HTML" aria-pressed="false" data-bs-toggle="tooltip" title="HTML">' + icon('code-2') + '</button></div></div><div class="cookie-stage" id="cookieStage"><div class="cookie-viewport" id="cookieViewport"><img class="cookie-page-image" src="assets/catalog-preview.png" alt="" aria-hidden="true"><div class="cookie-preview" id="cookiePreviewRoot"></div></div></div><pre class="code-preview cookie-code" id="cookieCode" hidden></pre><div class="preview-caption"><code id="cookieClass"></code><span>Consent / Brand theme</span></div></div>' + heading('Расположение', '03') + '<div class="cookie-variants">' + [['bar', 'panel-bottom', 'Нижняя полоса', '01'], ['corner', 'panel-bottom-dashed', 'Блок в углу', '02'], ['modal', 'square-mouse-pointer', 'Модальное окно', '03']].map(function (item) { return '<button type="button" class="cookie-variant" data-cookie-variant="' + item[0] + '" aria-pressed="false">' + icon(item[1]) + '<span>' + item[2] + '</span><small>' + item[3] + '</small></button>'; }).join('') + '</div>' + heading('Выбор посетителя', 'Cookie / Analytics') + '<div class="cookie-status" role="status" aria-live="polite"><span>' + icon('shield-check') + 'Необходимые cookie<span class="brand-badge success">Включены</span></span><span>' + icon('chart-no-axes-combined') + 'Яндекс Метрика<span class="brand-badge" id="cookieMetricaStatus">Выключена</span></span><span class="cookie-choice-status" id="cookieChoiceStatus">Выбор не сделан</span></div></div><aside class="inspector" aria-label="Свойства уведомления cookie"><div class="inspector-title">Свойства компонента</div><div class="inspector-field"><label class="form-label" for="cookieVariant">Вариант</label><select class="form-select" id="cookieVariant">' + option('bar', 'Нижняя полоса', cookieState.variant) + option('corner', 'Блок в углу', cookieState.variant) + option('modal', 'Модальное окно', cookieState.variant) + '</select></div><div class="inspector-field"><label class="form-label" for="cookiePolicyUrl">Ссылка на политику</label><input class="form-control" id="cookiePolicyUrl" type="text" value="' + escape(cookieState.policyUrl) + '" aria-describedby="cookiePolicyError"><div class="invalid-feedback" id="cookiePolicyError">Укажите путь от / или адрес https://.</div></div><div class="inspector-divider"></div><button class="btn btn-secondary w-100" type="button" id="copyCookie">' + icon('copy') + 'Копировать HTML</button><button class="btn btn-primary w-100 mt-2" type="button" id="launchCookie">' + icon('maximize-2') + 'На весь экран</button><button class="btn btn-secondary w-100 mt-2" type="button" id="cookieSettings">' + icon('sliders-horizontal') + 'Настройки cookie</button><button class="btn btn-ghost w-100 mt-2" type="button" id="resetCookie">' + icon('rotate-ccw') + 'Сбросить выбор</button><div class="inspector-divider"></div><div class="token-spec"><span>Категории</span><code>02</code></div><div class="token-spec"><span>Метрика по умолчанию</span><code>off</code></div></aside></div>';
  }
  function updateCookieStatus(consent) {
    const status = document.getElementById('cookieMetricaStatus');
    if (!status) return;
    status.textContent = consent.metrica ? 'Разрешена' : 'Выключена';
    status.classList.toggle('success', consent.metrica);
    document.getElementById('cookieChoiceStatus').textContent = 'Выбор сделан';
  }
  function disposeCookieLive() {
    if (cookieLive) { cookieLive.destroy(); cookieLive = null; }
    document.getElementById('cookieLiveRoot')?.remove();
  }
  function updateCookie() {
    if (cookiePreview) cookiePreview.destroy();
    const host = document.getElementById('cookiePreviewRoot');
    host.innerHTML = BrandUI.cookies.markup({ id: 'previewCookies', variant: cookieState.variant, policyUrl: './examples/cookies.html#privacy' });
    const root = host.firstElementChild;
    root.dataset.cookieDemo = '';
    root.querySelector('[data-cookie-notice]').removeAttribute('aria-hidden');
    cookiePreview = BrandUI.cookies.init(root, { persist: false, inline: true, onChange: updateCookieStatus });
    document.getElementById('cookieViewport').style.maxWidth = cookieState.frame;
    document.getElementById('cookieStage').hidden = cookieState.code;
    document.getElementById('cookieCode').hidden = !cookieState.code;
    document.getElementById('cookieCode').textContent = cookieCode();
    document.getElementById('cookieClass').textContent = cookieState.variant === 'modal' ? '.modal / cookie' : '.brand-cookie--' + cookieState.variant;
    document.querySelectorAll('[data-cookie-variant]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.cookieVariant === cookieState.variant)); });
    document.querySelectorAll('[data-cookie-frame]').forEach(function (button) { const active = button.dataset.cookieFrame === cookieState.frame; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    const toggleCode = document.getElementById('toggleCookieCode');
    toggleCode.classList.toggle('active', cookieState.code);
    toggleCode.setAttribute('aria-pressed', String(cookieState.code));
    toggleCode.setAttribute('aria-label', cookieState.code ? 'Показать образец' : 'Показать HTML');
    document.getElementById('cookieMetricaStatus').textContent = 'Выключена';
    document.getElementById('cookieMetricaStatus').classList.remove('success');
    document.getElementById('cookieChoiceStatus').textContent = 'Выбор не сделан';
    BrandUI.init();
  }
  function tablesView() {
    return heading('Проекты', 'Table / 07') + BrandUITableExamples.markup() + '<p class="component-intro">Сортировка, выбор и экспорт используют общий модуль. <a href="examples/table.html" target="_blank" rel="noopener">Автономный пример</a> · <a href="docs/table.md">API таблицы</a></p>';
  }
  function luminance(hex) {
    const channels = hex.replace('#', '').match(/.{2}/g).map(function (part) { const value = parseInt(part, 16) / 255; return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4); });
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  }
  function contrast(a, b) { const first = luminance(a), second = luminance(b); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05); }
  function swatch(name, value, token) {
    const foreground = contrast(value, '#090A0A') > contrast(value, '#FFFFFF') ? '#090A0A' : '#FFFFFF';
    return '<div class="swatch"><button class="swatch-color" style="background:' + value + ';color:' + foreground + '" type="button" data-copy="' + value + '" aria-label="Копировать цвет ' + name + ' ' + value + '"><span>Aa</span>' + icon('copy') + '</button><div class="swatch-name"><span>' + name + '</span><code>' + value + '</code></div><code>' + token + '</code></div>';
  }
  function colorsView(options) {
    const tokens = window.BrandTokens;
    const mode = options?.theme || document.documentElement.dataset.bsTheme;
    const theme = tokens.themes[mode];
    const names = { accent: 'Лайм', ink: 'Чёрный', white: 'Белый', graphite: 'Графит' };
    const semantic = { bg: 'Фон', surface: 'Поверхность', field: 'Поле', text: 'Текст', muted: 'Вторичный', border: 'Граница', 'accent-text': 'Акцентный текст', success: 'Успех', warning: 'Внимание', danger: 'Ошибка', info: 'Информация' };
    return heading('Фирменная палитра', 'Brand colors') + '<div class="swatch-grid">' + ['accent', 'ink', 'white', 'graphite'].map(function (name) { return swatch(names[name], tokens.colors[name], '--ui-color-' + name); }).join('') + '</div>' + heading('Семантические цвета', mode === 'dark' ? 'Тёмная тема' : 'Светлая тема') + '<div class="swatch-grid">' + Object.keys(semantic).map(function (key) { return swatch(semantic[key], theme[key], '--ui-' + key); }).join('') + '</div>' +
      '<div class="token-grid sample-band mt-4"><div><h3>Отступы</h3>' + Object.entries(tokens.spacing).map(function (entry) { return '<div class="spacing-sample"><span>space-' + entry[0] + '</span><i style="width:' + entry[1] + '"></i><code>' + entry[1] + '</code></div>'; }).join('') + '</div><div><h3>Скругления</h3><div class="radius-samples">' + Object.entries(tokens.radius).map(function (entry) { return '<div class="radius-sample" style="border-radius:' + entry[1] + '">' + entry[1] + '</div>'; }).join('') + '</div><h3 class="mt-4">Переходы</h3><div class="token-spec"><span>Быстрый</span><code>' + tokens.motion.fast + '</code></div><div class="token-spec"><span>Обычный</span><code>' + tokens.motion.normal + '</code></div></div><div><h3>Контраст текста</h3>' + [['Основной / фон', theme.text, theme.bg], ['CTA / лайм', tokens.colors.ink, tokens.colors.accent], ['Вторичный / фон', theme.muted, theme.bg]].map(function (pair) { const ratio = contrast(pair[1], pair[2]); return '<div class="contrast-row"><span>' + pair[0] + '</span><code>' + ratio.toFixed(1) + ':1</code><span class="brand-badge ' + (ratio >= 4.5 ? 'success' : 'warning') + '">' + (ratio >= 4.5 ? 'AA' : 'Проверить') + '</span></div>'; }).join('') + '</div></div>';
  }
  function typographyView() {
    const phrase = 'Понятный шаг. Сильный результат.';
    const tokens = window.BrandTokens.typography;
    const scales = [['display', 'Заголовок / Display'], ['h1', 'Заголовок / H1'], ['h2', 'Заголовок / H2'], ['body', 'Основной / Body'], ['ui', 'Интерфейс / UI'], ['caption', 'Подпись / Caption']].map(function (item) {
      const preset = tokens.presets[item[0]];
      return [item[1], tokens[preset.family], tokens.sizes[preset.size], tokens.weights[preset.weight], preset.family === 'heading'];
    });
    return '<div class="type-controls"><input class="form-control" id="typePhrase" value="' + phrase + '" maxlength="120" aria-label="Текст образца"><button class="btn btn-ghost btn-icon" type="button" id="resetTypePhrase" aria-label="Сбросить текст" data-bs-toggle="tooltip" title="Сбросить текст">' + icon('rotate-ccw') + '</button></div>' + scales.map(function (scale) { return '<div class="type-specimen"><div class="type-specimen-info"><strong>' + scale[0] + '</strong><span>' + scale[1] + '</span><code>' + scale[2] + ' / ' + scale[3] + '</code></div><div class="type-specimen-text" data-type-sample style="font-family:' + scale[1] + ';font-size:' + scale[2] + ';font-weight:' + scale[3] + ';' + (scale[4] ? 'text-transform:uppercase;' : '') + '">' + phrase + '</div></div>'; }).join('');
  }
  function siteBlocksView() {
    return '<p class="component-intro">Переносимые секции на общей теме. Отзывы, цифры и условия демонстрационные. <a href="examples/site-blocks.html" target="_blank" rel="noopener">Автономный пример</a> · <a href="docs/site-blocks.md">Правила применения</a></p>' + Object.keys(BrandUISiteExamples.titles).map(function (kind) { return '<article class="site-catalog-example"><div class="brand-cluster"><h3 class="brand-h3">' + BrandUISiteExamples.titles[kind] + '</h3><button class="btn btn-secondary btn-sm" type="button" data-site-copy="' + kind + '">Копировать HTML</button><button class="btn btn-ghost btn-sm" type="button" data-site-code="' + kind + '" aria-expanded="false" aria-controls="siteCode-' + kind + '">Показать HTML</button></div><pre class="code-preview" id="siteCode-' + kind + '" hidden></pre>' + BrandUISiteExamples.markup(kind, { prefix: 'catalogSite', assetBase: 'assets/' }) + '</article>'; }).join('');
  }
  function referencesView() {
    return '<div class="reference-signals"><span>' + icon('contrast') + 'Чёрный и белый</span><span>' + icon('zap') + 'Лаймовый акцент</span><span>' + icon('type') + 'Плотные заголовки</span><span>' + icon('brush') + 'Мазки и текстуры</span></div><div class="reference-grid">' + references.map(function (reference, index) { return '<figure class="reference-item"><button type="button" data-reference="' + index + '" aria-label="Открыть референс: ' + reference.title + '"><img src="assets/references/' + reference.file + '" alt="' + reference.title + '" loading="lazy"></button><figcaption>' + reference.title + '<span>0' + (index + 1) + ' / ' + reference.size + '</span></figcaption></figure>'; }).join('') + '</div>';
  }
  const iconState = { name:'ArrowRight', size:24, label:'Стрелка вправо', decorative:false, query:'', page:1 };
  function iconMarkup() { return '<i data-lucide="' + escape(iconState.name) + '" style="width:' + iconState.size + 'px;height:' + iconState.size + 'px"' + (iconState.decorative ? ' aria-hidden="true"' : ' role="img" aria-label="' + escape(iconState.label || iconState.name) + '"') + '></i>'; }
  function iconNames() { return Object.keys(window.lucide.icons).filter(name=>!name.endsWith('Icon')).sort(); }
  function iconsView() {
    return '<p class="component-intro">Локальный Lucide 0.468.0. Иконки не заменяют подпись действия; используйте aria-label для отдельной смысловой иконки.</p><div class="catalog-icon-controls brand-surface brand-stack"><label>Поиск иконки<input class="form-control" type="search" id="iconSearch" value="' + escape(iconState.query) + '" placeholder="Arrow, User, Search…"></label><div class="brand-cluster"><label>Размер<select class="form-select" id="iconSize">' + [16,24,32,48].map(size=>'<option'+(size===iconState.size?' selected':'')+'>'+size+'</option>').join('') + '</select></label><label>Подпись<input class="form-control" id="iconLabel" value="' + escape(iconState.label) + '"></label><label class="form-check"><input class="form-check-input" id="iconDecorative" type="checkbox"'+(iconState.decorative?' checked':'')+'>Декоративная</label><button class="btn btn-secondary" type="button" id="copyIcon">Копировать HTML иконки</button></div><div class="brand-cluster"><span id="selectedIcon"></span><code id="selectedIconCode"></code></div></div><div id="iconGrid" class="catalog-icon-grid"></div><div class="brand-cluster mt-4"><button class="btn btn-secondary btn-sm" type="button" id="iconPrevious">Назад</button><span id="iconCount" role="status"></span><button class="btn btn-secondary btn-sm" type="button" id="iconNext">Далее</button></div>';
  }
  function updateIcons() {
    const host = document.getElementById('iconGrid'); if (!host) return;
    const matched = iconNames().filter(name=>name.toLocaleLowerCase().includes(iconState.query.toLocaleLowerCase().replace(/[\s_-]/g,''))), pages=Math.max(1,Math.ceil(matched.length/48)); iconState.page=Math.max(1,Math.min(iconState.page,pages));
    host.innerHTML = matched.slice((iconState.page-1)*48,iconState.page*48).map(name=>'<button class="catalog-icon-card" type="button" data-icon-name="'+name+'" aria-pressed="'+(name===iconState.name)+'"><i data-lucide="'+name+'"></i><span>'+name+'</span></button>').join('') || '<p class="brand-small">Иконки не найдены.</p>';
    document.getElementById('iconCount').textContent='Найдено: '+matched.length+'. Страница '+iconState.page+' из '+pages;
    document.getElementById('iconPrevious').disabled=iconState.page===1;document.getElementById('iconNext').disabled=iconState.page===pages;
    document.getElementById('selectedIcon').innerHTML=iconMarkup();document.getElementById('selectedIconCode').textContent=iconMarkup();BrandUI.init(host);BrandUI.init(document.getElementById('selectedIcon'));BrandUICatalogExamples.mount(view,'icon');
  }
  function compositionsView(){return '<p class="brand-small text-body-secondary">Композиции собирают готовые элементы вокруг одной задачи.</p><ul class="brand-list">'+BrandUICatalogExamples.entries().filter(entry=>entry.category==='compositions').map(entry=>'<li class="brand-list-item"><a class="brand-list-main" href="#'+entry.route+'/'+entry.id+'"><span class="brand-list-copy"><strong class="brand-list-title">'+escape(entry.title)+'</strong><span class="brand-list-description">'+escape(entries[entry.route].title)+'</span></span></a></li>').join('')+'</ul>';}
  function pagesView() { return '<div class="brand-grid brand-grid--3">'+[['app','Рабочая область','Проекты, детали, создание/редактирование и настройки.','workspace'],['access','Доступ и служебные состояния','Вход, восстановление, 403/404, ошибка и offline.','access'],['content','Контентный сайт','Услуги, материалы, поиск, статья и форма связи.','content']].map(item=>'<article class="brand-card"><div class="brand-card-body"><h2 class="brand-panel-title">'+item[1]+'</h2><p>'+item[2]+'</p><a class="btn btn-secondary" href="examples/'+item[3]+'.html">Открыть страницу</a><a href="#pages/page-'+item[0]+'">Посмотреть и скопировать</a></div></article>').join('')+'</div>'; }
  function integrationView() {
    const modules=[['Ядро','ui-kit.js','BrandUI.init / destroy','docs/api.md'],['Формы','ui-kit-forms.js','forms.init / get','docs/api.md'],['Поля','ui-kit-inputs.js','fields / choice / autocomplete / upload / stepper','docs/inputs.md'],['Состояния','ui-kit-feedback.js','toasts / alerts / states','docs/feedback.md'],['Компоненты','ui-kit-components.js','avatar / chips / drawer','docs/components.md'],['Тема','ui-kit-theme.js','theme.init / get','docs/api.md'],['Таблица','ui-kit-table.js','table.init / get','docs/table.md'],['Cookie','cookie-consent.js','cookies.init / markup','docs/api.md']];
    return '<div class="brand-stack"><div class="brand-surface"><h2 class="brand-h2">Подключение к HTML / PHP</h2><p>Распакуйте веб-библиотеку, подключите CSS по порядку Bootstrap → tokens → ui-kit. Затем Bootstrap bundle, Lucide, ui-kit.js и нужные модули. Сборка на стороне проекта не требуется.</p><div class="brand-cluster"><a class="btn btn-primary" href="ui-kit.zip" download>Библиотека ZIP</a><a class="btn btn-secondary" href="ui-kit-catalog.zip" download>Полный каталог ZIP</a><a href="README.md">README</a><a href="docs/api.md">API и события</a><a href="docs/catalog.md">Работа с каталогом</a></div></div><div class="brand-comparison" tabindex="0" role="region" aria-label="Модули библиотеки"><table class="table"><caption class="visually-hidden">Модули и документация</caption><thead><tr><th scope="col">Модуль</th><th scope="col">Файл</th><th scope="col">API</th></tr></thead><tbody>'+modules.map(row=>'<tr><th scope="row"><a href="'+row[3]+'">'+row[0]+'</a></th><td><code>'+row[1]+'</code></td><td>'+row[2]+'</td></tr>').join('')+'</tbody></table></div><div class="brand-surface"><h2 class="brand-h2">Выбор компонентов</h2><p>Для одной задачи используйте одну основную кнопку. Короткие формы предпочтительны для первого контакта; шаги помогают разделить длинный сценарий. Таблица подходит для сравнения строк, карточки и списки — для самостоятельных записей. Inline error сохраняет контекст, toast подтверждает действие; долгие действия имеют явный loading и отмену.</p><p>Статичные блоки работают с CSS; подключайте поведение по необходимости. Имена, ID, обработку FormData и запросы задаёт проект. Для AJAX вызывайте BrandUI.init(container), перед заменой содержимого ожидайте BrandUI.destroy(container).</p></div><div class="brand-surface"><h2 class="brand-h2">Статус поставки</h2><p>Компоненты реализованы и проверены в изолированном Chrome на 320/390/768/1440 px, в light/dark и file://. Итоговые проверки выпуска записаны в дорожной карте. Firefox, Safari, реальные устройства и screen reader пока не объявлены проверенными.</p><p>Название и знак временные. Лицензию собственного кода утверждает владелец; лицензии Bootstrap/Lucide/шрифтов сохранены в поставке.</p><a href="docs/support.md">Поддержка</a> · <a href="docs/upgrading.md">Обновление</a> · <a href="docs/license-status.md">Лицензии</a> · <a href="ROADMAP.md">Дорожная карта</a> · <a href="CHANGELOG.md">История изменений</a></div></div>';
  }
  function portableMarkup(html) {
    const template = document.createElement('template'); template.innerHTML = html;
    template.content.querySelectorAll('pre,[data-components-code],[data-components-copy],[data-site-code],[data-site-copy],.lightbox-example-actions').forEach(node => node.remove());
    const classes = { 'two-column':'brand-grid brand-grid--2', 'control-samples':'brand-stack', 'control-row':'brand-cluster', 'sample-band':'brand-surface', 'consultation-tool':'brand-surface brand-stack', 'section-heading':'brand-block-heading', 'badge-row':'brand-cluster', 'tabs-preview':'brand-surface mt-3', 'tab-statistics':'brand-cluster', 'range-value':'brand-cluster', 'swatch-grid':'brand-grid brand-grid--4', 'swatch':'brand-surface brand-stack', 'radius-samples':'brand-cluster', 'token-grid':'brand-grid brand-grid--3', 'type-specimen':'brand-surface brand-stack', 'swatch-color':'brand-swatch-color', 'swatch-name':'brand-swatch-name', 'spacing-sample':'brand-spacing-sample', 'radius-sample':'brand-radius-sample', 'token-spec':'brand-token-spec', 'contrast-row':'brand-contrast-row', 'type-controls':'brand-type-controls', 'type-specimen-info':'brand-type-info', 'type-specimen-text':'brand-type-text' };
    template.content.querySelectorAll('h2:not(.modal-title),h3:not(.accordion-header)').forEach(node => { if (!node.className.includes('brand-')) node.classList.add('brand-panel-title'); });
    template.content.querySelectorAll('.tab-statistics > div').forEach(node => { node.classList.add('brand-stack', 'gap-1'); node.querySelector('strong').classList.add('brand-number', 'brand-panel-title'); node.querySelector('span').classList.add('brand-small', 'text-body-secondary'); });
    template.content.querySelectorAll('[class]').forEach(node => Object.entries(classes).forEach(pair => { if (node.classList.contains(pair[0])) { node.classList.remove(pair[0]); node.classList.add(...pair[1].split(' ')); } }));
    template.content.querySelectorAll('a[href^="#"]').forEach(link => {
      const id = link.hash.slice(1); if (!id || template.content.getElementById(id)) return;
      const destinations = { buttons:'examples/foundations.html', forms:'examples/form.html', tables:'examples/table.html', cards:'examples/components.html#cards', lists:'examples/components.html#lists', identity:'examples/components.html#identity', 'site-navigation':'examples/components.html#site-navigation' };
      if (destinations[id]) link.setAttribute('href', destinations[id]);
      else if (/^site-/.test(id)) link.setAttribute('href', 'examples/site-blocks.html#' + id);
    });
    return template.innerHTML;
  }
  function registerExamples() {
    const register = BrandUICatalogExamples.register;
    function add(id, route, title, markup, options) { register(id, Object.assign({route,title,markup:function(options){return portableMarkup(markup(options));}},options)); }
    function part(kind,selections,prefix){const t=document.createElement('template');t.innerHTML=BrandUIComponentsExamples.markup(kind,{prefix,assetBase:'assets/'});const wrapper=document.createElement('div');wrapper.dataset.componentsExample=kind;wrapper.className='brand-stack';selections.forEach(([selector,index])=>{const node=t.content.querySelectorAll(selector.replaceAll('{p}',prefix))[index||0];if(!node)throw new Error('Missing component part '+selector);wrapper.append(node.cloneNode(true));});const status=document.createElement('p');status.dataset.componentsStatus='';status.className='brand-small';status.setAttribute('role','status');status.hidden=true;wrapper.append(status);return wrapper.outerHTML;}
    const formDeps = {modules:['ui-kit-forms.js'], docs:'docs/api.md', states:['Idle','Invalid','Ready','Loading','Success','Error'], properties:[['data-brand-form','Нативные поля, FormData и проверка'],['onSubmit','Callback приложения с AbortSignal'],['init / destroy','Scoped жизненный цикл']]};
    add('button','buttons','Настраиваемая кнопка',buttonMarkup,{properties:[['variant','primary / secondary / outline-primary / ghost / danger'],['size','sm / обычный / lg: 36 / 44 / 52 px'],['label / icon','Текст и декоративная Lucide-иконка'],['disabled / aria-busy','Недоступна / загрузка']],states:['Обычное','Hover','Focus','Disabled','Loading'],docs:'docs/foundations.md'});
    add('button-variants','buttons','Варианты, размеры и состояния кнопок',function(){return '<div class="brand-stack">' + ['primary','secondary','outline-primary','ghost','danger'].map(v=>'<div class="brand-cluster">'+['btn-sm','','btn-lg'].map(size=>'<button type="button" class="btn btn-'+v+' '+size+'">'+v+'</button>').join('')+'</div>').join('') + '<div class="brand-cluster"><button class="btn btn-primary" data-demo-state="hover" type="button">Наведение</button><button class="btn btn-primary" data-demo-state="focus" type="button">Фокус</button><button class="btn btn-primary" disabled>Недоступна</button><button class="btn btn-primary" disabled aria-busy="true"><i data-lucide="loader-circle" class="brand-spinner"></i>Загрузка</button><button class="btn btn-secondary btn-icon" type="button" aria-label="Добавить"><i data-lucide="plus"></i></button></div></div>';},{states:['Default','Hover','Focus','Disabled','Loading'],properties:[['.btn','Обязательный базовый класс'],['.btn-icon','Кнопка с доступным aria-label']],docs:'docs/foundations.md'});
    add('consultation','forms','Форма консультации',()=>'<div class="brand-surface brand-stack">'+formMarkup('copyConsultation')+'</div>',formDeps);
    add('form-states','forms','Input, select, checkbox, radio, switch, range и readonly',()=>{const t=document.createElement('template');t.innerHTML=BrandUIAdvancedExamples.markup({prefix:'copyStates'});return t.content.querySelector('[data-advanced-example]').lastElementChild.outerHTML;},{modules:['ui-kit-forms.js','ui-kit-inputs.js'],examples:['examples/advanced-forms.js'],docs:'docs/inputs.md',states:['Default','Valid','Invalid','Disabled','Readonly'],properties:[['required / readonly / disabled','Нативные атрибуты'],['aria-invalid / aria-describedby','Связь ошибки и поля']]});
    add('navigation','navigation','Вкладки, меню, breadcrumbs и пагинация',()=>navigationView()+BrandUIExamples.modalMarkup('message'),{modules:['ui-kit-forms.js','ui-kit-feedback.js'],examples:['examples/overlays.js'],states:['Active','Inactive','Open','Closed','Focus'],properties:[['data-bs-toggle','tab / dropdown'],['aria-current','Текущая страница'],['role=tabpanel','Панель с привязкой к tab']],docs:'docs/components.md'});
    add('feedback','feedback','Уведомления, загрузка, skeleton и retry',()=>{const t=document.createElement('template');t.innerHTML=feedbackView();t.content.firstElementChild.remove();return t.innerHTML+BrandUIExamples.modalMarkup('message');},{modules:['ui-kit-feedback.js','ui-kit-forms.js'],examples:['examples/feedback.js','examples/overlays.js'],states:['Info','Success','Warning','Error','Loading','Empty','No-results','Ready'],properties:[['toasts','Очередь, duration, actions'],['alerts','Dismiss и focus'],['states','Retry с AbortSignal']],docs:'docs/feedback.md'});
    add('table','tables','Таблица: выбор, сортировка, bulk, страницы и retry',()=>BrandUITableExamples.markup(),{modules:['ui-kit-table.js'],examples:['examples/table.js'],states:['Ready','Empty','No-results','Loading','Error','Selected','Bulk busy'],properties:[['rows / columns','Данные и ключи колонок'],['pageSize / pageSizes','Размер страницы и варианты'],['bulkActions / onRetry','Callbacks с AbortSignal']],docs:'docs/table.md'});
    ['bar','corner','modal'].forEach(variant=>add('cookie-'+variant,'cookies','Cookie: '+variant,()=>'<p id="privacy">Демонстрационная политика. Аналитика в примере не подключена.</p>'+BrandUI.cookies.markup({id:'copyCookie',variant,policyUrl:'#privacy'}).replace('data-cookie-consent','data-cookie-consent data-cookie-demo'),{modules:['cookie-consent.js'],states:['Notice','Settings','Necessary only','All accepted'],properties:[['variant',variant],['persist','false в preview; настройка приложения'],['onChange','Подключение аналитики после выбора']],docs:'docs/api.md'}));
    ['message','confirm','form'].forEach(kind=>add('modal-'+kind,'modals',({message:'Информационное окно',confirm:'Подтверждение',form:'Форма в modal'})[kind],()=>BrandUIExamples.modalCode(kind),{modules:['ui-kit-forms.js'],examples:['examples/overlays.js'],states:['Closed','Open','Focus trap','Invalid / form'],properties:[['data-bs-target','ID modal'],['aria-labelledby','Связь с заголовком'],['Escape / Tab','Закрытие / фокус']],docs:'docs/components.md'}));
    add('gallery','lightbox','Галерея: zoom, fullscreen, thumbnails и swipe',()=>BrandUIExamples.galleryMarkup('assets/gallery/','copyGallery'),{states:['Loading','Ready','Error','Zoom','Fullscreen'],properties:[['data-lightbox-group','Группа'],['data-lightbox-*','Опциональные инструменты'],['maxZoom','1–8 через API']],docs:'docs/gallery.md'});
    ['cards','lists','identity','site-navigation'].forEach(kind=>add(kind,kind,entries[kind].title,()=>BrandUIComponentsExamples.markup(kind,{prefix:'copyComponents',assetBase:'assets/'}),{modules:['ui-kit-components.js'],examples:['examples/components.js'],states:kind==='identity'?['Fallback','Image / error','Selected','Disabled','Removed']:['Default','Hover','Focus','Open / navigation'],properties:[['HTML / tokens','Варианты на общей теме'],['data-brand-*','Поведение и lifecycle']],docs:'docs/components.md'}));
    add('advanced-all','advanced-forms','Все расширенные поля и stepper',()=>BrandUIAdvancedExamples.markup({prefix:'copyAdvanced'}),{modules:['ui-kit-forms.js','ui-kit-inputs.js'],examples:['examples/advanced-forms.js'],states:['Default','Valid','Invalid','Disabled','Readonly','Loading','No-results'],properties:[['data-brand-field / choice','Поля и выбор'],['data-brand-upload','Файлы без сетевой загрузки'],['data-brand-stepper','Шаги, проверка и итог']],docs:'docs/inputs.md'});
    const raw=document.createElement('template');raw.innerHTML=BrandUIAdvancedExamples.markup({prefix:'copyAdvanced'});
    Array.from(raw.content.firstElementChild.children).forEach((section,index)=>add('advanced-'+(index+1),'advanced-forms',section.querySelector('h2')?.textContent||'Поля',()=>'<div data-advanced-example class="brand-stack">'+section.outerHTML+'</div>',{modules:['ui-kit-forms.js','ui-kit-inputs.js'],examples:['examples/advanced-forms.js'],states:['Default','Invalid','Disabled','Readonly','Состояния через действия примера'],properties:[['Нативные поля','Значения и FormData сохраняются'],['Scoped destroy','Очистка обработчиков и порталов']],docs:'docs/inputs.md'}));
    Object.keys(BrandUISiteExamples.titles).forEach(kind=>add('site-'+kind,'site-blocks',BrandUISiteExamples.titles[kind],()=>BrandUISiteExamples.markup(kind,{prefix:'site',assetBase:'assets/'}),{modules:['ui-kit-forms.js'],examples:['examples/site-blocks.js'],states:['Light','Dark','Desktop','Mobile','Focus','Invalid / contact'],properties:[['.brand-block','Отступы секции и тема'],['prefix','Уникальные ID и anchors'],['Данные','Демонстрационные; заменить перед публикацией']],docs:'docs/site-blocks.md'}));
    add('palette','colors','Палитра, отступы, границы и контраст',colorsView,{states:['Light','Dark'],properties:[['tokens.json','Источник'],['--ui-*','Семантические роли темы']],docs:'docs/foundations.md'});
    add('typography','typography','Типографика и роли текста',typographyView,{states:['Light','Dark','Адаптивный display'],properties:[['H1–H6 / body / caption','Семантические роли'],['Oswald / Manrope','Локальные шрифты с OFL']],docs:'docs/foundations.md'});
    add('references','references','Исходные референсы и фирменные приёмы',()=>'<div class="brand-grid brand-grid--2">'+references.map(ref=>'<figure><a href="assets/references/'+ref.file+'" data-lightbox data-lightbox-group="refs"><img src="assets/references/'+ref.file+'" alt="'+escape(ref.title)+'" style="width:100%" loading="lazy"></a><figcaption>'+escape(ref.title)+'</figcaption></figure>').join('')+'</div>',{states:['Light','Dark','Lightbox'],properties:[['assets/references','Входит в полный ZIP каталога'],['Название / знак','Временные до решения владельца']],docs:'docs/site-blocks.md'});
    add('icon','icons','Выбранная иконка',iconMarkup,{states:['Decorative','Meaningful','16 / 24 / 32 / 48 px'],properties:[['data-lucide','Имя из локального Lucide'],['aria-label / aria-hidden','Смысловая / декоративная'],['width / height','Размер SVG']],docs:'docs/catalog.md'});
    for(const [kind,route,title] of [['header','site-navigation','Заголовок и toolbar'],['actions','buttons','Группы действий и segmented control'],['choices','forms','Группы выбора и сводка ошибок'],['record','lists','Данные записи и копирование'],['filters','tables','Поиск, фильтры и результаты']]) add('pattern-'+kind,route,title,()=>BrandUIPatternExamples.markup(kind,'copyPattern-'+kind),{modules:['ui-kit-forms.js','ui-kit-patterns.js'],examples:['examples/patterns.js'],states:['Default','Compact','Focus','Selected','Empty','Invalid / server error'],properties:[['Разметка','Обычные HTML/PHP-композиции'],['Состояние','Нативные поля и события BrandUI'],['Зависимости','CSS; patterns для copy/filters, forms для validation']],docs:'docs/patterns.md'});
    for(const [kind,route,title] of [['data','tables','Таблица, список и мобильные панели'],['controls','advanced-forms','Мобильные поля, вкладки и форма']]) add('mobile-'+kind,route,title,()=>BrandUIMobileExamples.markup(kind,'copyMobile-'+kind),{modules:['ui-kit-components.js','ui-kit-forms.js','ui-kit-inputs.js','ui-kit-patterns.js','ui-kit-table.js'],examples:['examples/mobile.js'],states:['Default','Compact','Table / list / auto','Selected','Open / focus','Native select'],properties:[['Контейнер','Автоматическая адаптация данных'],['Состояние','Общие query, page и selection'],['Панели','Существующая база Bootstrap / drawer']],docs:'docs/mobile.md'});
    for(const [kind,title] of [['app','Рабочая область: проекты и настройки'],['access','Вход, восстановление и служебные страницы'],['content','Контентный сайт с поиском материалов']]) add('page-'+kind,'pages',title,()=>BrandUIPageExamples.markup(kind,'copyPage-'+kind,'assets/'),{page:kind,modules:kind==='app'?['ui-kit-components.js','ui-kit-forms.js','ui-kit-inputs.js','ui-kit-table.js']:kind==='access'?['ui-kit-forms.js','ui-kit-inputs.js']:['ui-kit-forms.js','ui-kit-patterns.js'],examples:kind==='content'?['examples/site-blocks.js','examples/pages.js']:['examples/pages.js'],states:['Default','Compact','Dirty','Loading','Error','Saved / empty'],properties:[['Модель','Локальные данные и callbacks приложения'],['Переносимость','Без catalog.css/catalog.js; file://'],['Lifecycle','Scoped cleanup']],docs:'docs/pages.md'});
    add('density','colors','Размеры и плотность интерфейса',()=>'<div data-density-host>'+BrandUIDensityExamples.markup('copyDensity')+'</div>',{modules:['ui-kit-forms.js','ui-kit-inputs.js'],examples:['examples/density.js'],states:['Default','Compact','Nested default','Small / large','Focus','Long text'],properties:[['data-ui-density','default / compact на контейнере'],['Размеры','sm / обычный / lg: минимумы 36 / 44 / 52 px'],['Touch','Цель controls не меньше 44 px при coarse pointer']],docs:'docs/foundations.md'});
    const parts=[
      ['card-content','cards','Карточка материала',[['.brand-card',0]]],['card-service','cards','Карточка услуги',[['.brand-card',1]]],['card-product','cards','Карточка набора',[['.brand-card',2]]],['card-case','cards','Карточка кейса',[['.brand-card',3]]],
      ['list-content','lists','Список материалов',[['.brand-grid > div',0]]],['list-actions','lists','Список действий',[['.brand-grid > div',1]]],
      ['avatar','identity','Аватар: размеры, изображение и статус',[['.brand-cluster',0]]],['avatar-group','identity','Группа участников',[['.brand-avatar-group',0]]],['tags','identity','Теги и категории',[['.brand-cluster',1]]],['chips-select','identity','Одиночный выбор chips',[['.brand-chip-group',0]]],['chips-remove','identity','Множественный выбор и удаление chips',[['.brand-chip-group',1]]],
      ['navbar','site-navigation','Шапка и мобильное меню',[['.brand-navbar',0]]],['drawer','site-navigation','Самостоятельный drawer',[['[data-bs-target="#{p}Drawer"]',0],['.brand-drawer',0]]],['tooltip','site-navigation','Tooltip с клавиатурой',[['[data-bs-toggle="tooltip"]',0]]],['popover','site-navigation','Popover с пояснением',[['[data-bs-toggle="popover"]',0]]],['footer','site-navigation','Подвал с колонками',[['.brand-footer',0]]],['footer-compact','site-navigation','Компактный подвал',[['.brand-footer',1]]]
    ];
    parts.forEach(([id,kind,title,selections])=>add(id,kind,title,()=>part(kind,selections,'part'+id.replaceAll('-','')),{category:'components',modules:['ui-kit-components.js'],examples:['examples/components.js'],states:['Default','Focus','Long text','Состояния через действия примера'],properties:[['Источник','Тот же исходный шаблон, что и полный раздел'],['Семантика','Доступные подписи и нативные действия']],docs:'docs/components.md'}));
    for(const [id,title,selectors] of [['tabs','Вкладки',[['.nav-tabs'],['.tab-content']]],['breadcrumbs','Хлебные крошки',[['nav[aria-label="Пример хлебных крошек"]']]],['action-menu','Меню действий',[['.control-row']]],['pagination','Пагинация',[['nav[aria-label="Пример пагинации"]'],['#navigationPageStatus']]]])add(id,'navigation',title,()=>{const t=document.createElement('template');t.innerHTML=navigationView();const html=selectors.map(([selector])=>t.content.querySelector(selector).outerHTML).join('');return html+(id==='action-menu'?BrandUIExamples.modalMarkup('message'):'');},{modules:id==='action-menu'?['ui-kit-forms.js','ui-kit-feedback.js']:[],examples:id==='action-menu'?['examples/overlays.js']:[],states:['Default','Active','Focus','Действия с клавиатуры'],properties:[['ARIA','Связанные panels, текущая страница или подпись области']],docs:'docs/components.md'});
    for(const [index,id,title] of [[0,'toast','Очередь уведомлений'],[1,'alert','Inline alert и banner'],[2,'loader','Loader и progress'],[3,'skeleton','Skeleton карточки, списка и таблицы'],[4,'content-state','Empty, no-results и error/retry']])add(id,'feedback',title,()=>{const t=document.createElement('template');t.innerHTML=BrandUIFeedbackExamples.markup({prefix:'partFeedback'});return '<div data-feedback-example class="brand-stack">'+t.content.querySelectorAll('[data-feedback-example] > section')[index].outerHTML+(index!==0?'<p id="partFeedback-status" data-feedback-status class="brand-small" tabindex="-1" role="status" hidden></p>':'')+'</div>';},{modules:['ui-kit-feedback.js'],examples:['examples/feedback.js'],states:['Default','Focus','Состояния через действия примера'],properties:[['Обратная связь','Статус, следующий шаг и cleanup']],docs:'docs/feedback.md'});
    for(const [kind,title] of [['text','Текстовое поле'],['select','Обычный select'],['checkbox','Checkbox'],['radio','Radio'],['switch','Switch'],['range','Range']])add('control-'+kind,'forms',title,()=>{const t=document.createElement('template');t.innerHTML=BrandUIAdvancedExamples.markup({prefix:'partControl'});const states=t.content.querySelectorAll('.brand-form-state-grid > fieldset');return '<div class="brand-grid brand-grid--2">'+Array.from(states,fieldset=>{const input=fieldset.querySelector('[id$="-'+kind+'"]'),label=fieldset.querySelector('[for="'+input.id+'"]');return '<div class="brand-stack"><h2 class="brand-panel-title">'+fieldset.querySelector('legend').textContent+'</h2>'+(input.closest('.form-check')?.outerHTML||label.outerHTML+input.outerHTML)+'</div>';}).join('')+'</div><p class="brand-small text-danger" id="partControl-stateError">Проверьте значение поля с ошибкой.</p>';},{previewStates:kind==='text'?['default','disabled','readonly']:['default','disabled'],states:['Default','Valid','Invalid','Disabled',...(kind==='text'?['Readonly']:[])],properties:[['Контракт','Нативные значения, label/for и состояние поля']],docs:'docs/inputs.md'});
  }
  function updateButton() {
    document.getElementById('buttonTarget').innerHTML = buttonMarkup();
    document.getElementById('buttonCode').textContent = buttonCode();
    document.getElementById('buttonClass').textContent = '.btn-' + buttonState.variant + (buttonState.size ? ' .btn-' + buttonState.size : '');
    BrandUI.init();
  }
  async function render() {
    const sequence = ++renderSequence;
    const parts = location.hash.slice(1).split('/');
    const key = parts[0], exampleId = parts[1];
    const nextView = Object.hasOwn(entries, key) ? key : 'buttons';
    if (cookiePreview) { cookiePreview.destroy(); cookiePreview = null; }
    disposeCookieLive();
    await BrandUI.destroy(view);
    if (sequence !== renderSequence) return;
    currentView = nextView;
    const entry = entries[currentView];
    document.getElementById('pageTitle').textContent = entry.title;
    document.getElementById('pageEyebrow').textContent = entry.group;
    document.getElementById('pageMeta').textContent = entry.meta;
    document.getElementById('breadcrumbCurrent').textContent = entry.title;
    document.title = entry.title + ' / Brand UI';
    document.querySelectorAll('[data-view]').forEach(function (link) {
      const active = link.dataset.view === currentView;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    const renderers = { buttons: buttonsView, forms: formsView, navigation: navigationView, feedback: feedbackView, tables: tablesView, cookies: cookiesView, modals: modalsView, lightbox: lightboxView, cards: function () { return componentsView('cards'); }, lists: function () { return componentsView('lists'); }, identity: function () { return componentsView('identity'); }, 'site-navigation': function () { return componentsView('site-navigation'); }, 'site-blocks': siteBlocksView, 'advanced-forms': advancedView, icons: iconsView, pages:pagesView, compositions:compositionsView, integration: integrationView, colors: colorsView, typography: typographyView, references: referencesView };
    view.innerHTML = BrandUICatalogExamples.inspector(currentView, exampleId) + renderers[currentView]();
    BrandUICatalogExamples.mount(view, exampleId);
    if (currentView === 'icons') updateIcons();
    codeVisible = false;
    if (currentView === 'buttons') updateButton();
    if (currentView === 'tables') { BrandUITableExamples.setup(view); const host=view.querySelector('[data-example-table]'); host.id='projectTable'; [['[data-table-search]','projectSearch'],['[data-table-filter]','projectFilter'],['[data-table-sort]','sortProjects']].forEach(pair=>{const element=host.querySelector(pair[0]), label=host.querySelector('[for="'+element.id+'"]');if(label)label.htmlFor=pair[1];element.id=pair[1];}); }
    if (currentView === 'cookies') updateCookie();
    BrandUI.init(view);
    if (currentView === 'feedback') BrandUIFeedbackExamples.setup(view);
    if (currentView === 'site-blocks') BrandUISiteExamples.setup(view);
    view.querySelectorAll('[data-demo-form]').forEach(function (form) {
      BrandUI.forms.init(form, { onSubmit: async function (submission) {
        await new Promise(function (resolve) { setTimeout(resolve, 450); });
        if (submission.signal.aborted || !form.isConnected) return;
        const body = '<div class="dialog-success">' + icon('circle-check') + '</div><p><strong>' + escape(submission.formData.get('name')) + ', все поля заполнены корректно.</strong></p><p class="mb-0 text-body-secondary">Это образец формы. Данные никуда не отправлены.</p>';
        showDialog('Проверка пройдена', body);
        BrandUI.init();
        return 'Проверка пройдена. Данные никуда не отправлены.';
      } });
    });
    BrandUIExamples.initModalForms(view);
    document.getElementById('searchResults').hidden = true;
    const sidebar = bootstrap.Offcanvas.getInstance(document.getElementById('sidebar'));
    if (sidebar) sidebar.hide();
  }
  function applyTheme(theme) {
    if (!['light', 'dark'].includes(theme)) return;
    document.documentElement.dataset.bsTheme = theme;
    document.documentElement.dispatchEvent(new CustomEvent('brand:theme-change', { bubbles: true, detail: { mode: theme, resolved: theme } }));
    document.querySelectorAll('[data-theme]').forEach(function (button) { const active = button.dataset.theme === theme; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    try { localStorage.setItem('brand-ui-theme', theme); } catch {}
    if (currentView === 'colors') render();
  }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  document.addEventListener('click', function (event) {
    const target = event.target.closest('button, a');
    if (!target) return;
    if (target.id === 'copyIcon') BrandUICatalogExamples.copy(iconMarkup());
    if (target.hasAttribute('data-icon-name')) { iconState.name=target.dataset.iconName; iconState.label=iconState.name; document.getElementById('iconLabel').value=iconState.label; updateIcons(); BrandUICatalogExamples.mount(view,'icon'); }
    if (target.id === 'iconPrevious' || target.id === 'iconNext') { iconState.page += target.id === 'iconNext' ? 1 : -1; updateIcons(); }
    if (target.dataset.theme) applyTheme(target.dataset.theme);
    if (target.hasAttribute('data-copy')) copy(target.dataset.copy);
    if (target.hasAttribute('data-variant')) {
      buttonState.variant = target.dataset.variant;
      document.getElementById('buttonVariant').value = buttonState.variant;
      updateButton();
    }
    if (target.hasAttribute('data-size')) {
      buttonState.size = target.dataset.size;
      document.getElementById('buttonSize').value = buttonState.size;
      updateButton();
    }
    if (target.hasAttribute('data-frame')) {
      document.getElementById('buttonTarget').style.setProperty('--preview-width', target.dataset.frame);
      view.querySelectorAll('[data-frame]').forEach(function (button) { const active = button === target; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    }
    if (target.id === 'toggleCode') {
      codeVisible = !codeVisible;
      document.getElementById('buttonStage').hidden = codeVisible;
      document.getElementById('buttonCode').hidden = !codeVisible;
      target.classList.toggle('active', codeVisible);
      target.setAttribute('aria-pressed', String(codeVisible));
      target.setAttribute('aria-label', codeVisible ? 'Показать образец' : 'Показать HTML');
    }
    if (target.id === 'copyButton') copy(buttonCode());
    if (target.hasAttribute('data-components-copy')) copy(componentsCode(target.dataset.componentsCopy));
    if (target.hasAttribute('data-components-code')) {
      const code = document.getElementById('componentsCode');
      code.textContent = componentsCode(target.dataset.componentsCode); code.hidden = !code.hidden;
      target.setAttribute('aria-expanded', String(!code.hidden));
    }
    if (target.hasAttribute('data-modal-copy')) copy(BrandUIExamples.modalCode(target.dataset.modalCopy));
    if (target.hasAttribute('data-modal-code')) {
      const code = document.getElementById('modalExampleCode');
      const kind = target.dataset.modalCode;
      const expanded = code.hidden || code.dataset.kind !== kind;
      code.dataset.kind = kind;
      code.textContent = BrandUIExamples.modalCode(kind);
      code.hidden = !expanded;
      view.querySelectorAll('[data-modal-code]').forEach(function (button) { button.setAttribute('aria-expanded', String(expanded && button === target)); });
    }
    if (target.hasAttribute('data-site-copy')) copy(BrandUISiteExamples.markup(target.dataset.siteCopy, { prefix: 'site', assetBase: 'assets/' }).replace(/></g, '>\n<'));
    if (target.hasAttribute('data-site-code')) { const code = document.getElementById('siteCode-' + target.dataset.siteCode); code.textContent = BrandUISiteExamples.markup(target.dataset.siteCode, { prefix: 'site', assetBase: 'assets/' }).replace(/></g, '>\n<'); code.hidden = !code.hidden; target.setAttribute('aria-expanded', String(!code.hidden)); }
    if (target.id === 'copyLightbox') copy(lightboxCode());
    if (target.id === 'toggleLightboxCode') {
      const code = document.getElementById('lightboxExampleCode');
      code.textContent = lightboxCode();
      code.hidden = !code.hidden;
      target.setAttribute('aria-expanded', String(!code.hidden));
    }
    if (target.hasAttribute('data-cookie-variant')) { cookieState.variant = target.dataset.cookieVariant; document.getElementById('cookieVariant').value = cookieState.variant; updateCookie(); }
    if (target.hasAttribute('data-cookie-frame')) {
      cookieState.frame = target.dataset.cookieFrame;
      document.getElementById('cookieViewport').style.maxWidth = cookieState.frame;
      document.querySelectorAll('[data-cookie-frame]').forEach(function (button) { const active = button === target; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    }
    if (target.id === 'toggleCookieCode') {
      cookieState.code = !cookieState.code;
      document.getElementById('cookieStage').hidden = cookieState.code;
      document.getElementById('cookieCode').hidden = !cookieState.code;
      target.classList.toggle('active', cookieState.code);
      target.setAttribute('aria-pressed', String(cookieState.code));
      target.setAttribute('aria-label', cookieState.code ? 'Показать образец' : 'Показать HTML');
    }
    if (target.id === 'copyCookie') copy(cookieCode());
    if (target.id === 'resetCookie') { disposeCookieLive(); updateCookie(); }
    if (target.id === 'cookieSettings') (cookieLive || cookiePreview).settings();
    if (target.id === 'launchCookie') {
      disposeCookieLive();
      const host = document.createElement('div');
      host.id = 'cookieLiveRoot';
      host.innerHTML = BrandUI.cookies.markup({ id: 'liveCookies', variant: cookieState.variant, policyUrl: './examples/cookies.html#privacy' });
      const root = host.firstElementChild;
      root.dataset.cookieDemo = '';
      document.body.append(host);
      cookieLive = BrandUI.cookies.init(root, { persist: false, onChange: updateCookieStatus });
      BrandUI.init();
    }
    if (target.id === 'resetButton') { Object.assign(buttonState, { variant: 'primary', size: '', label: 'Отправить заявку', icon: 'arrow-right', disabled: false, loading: false }); render(); }
    if (target.id === 'resetTypePhrase') { document.getElementById('typePhrase').value = 'Понятный шаг. Сильный результат.'; document.getElementById('typePhrase').dispatchEvent(new Event('input', { bubbles: true })); }
    if (target.dataset.action === 'toast') toast('Изменения сохранены');
    if (target.dataset.action === 'sample' || target.closest('#buttonTarget')) toast('Действие выполнено');
    if (target.dataset.action === 'dialog') showDialog('Запись на консультацию', '<p class="mb-4 text-body-secondary">Выберите удобный способ связи.</p><div class="consultation-tool p-0 border-0">' + formMarkup('dialogConsultation') + '</div>');
    if (target.hasAttribute('data-nav-page')) {
      document.querySelectorAll('[data-nav-page]').forEach(function (button) { const active = button === target; button.closest('li').classList.toggle('active', active); if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
      document.getElementById('navigationPageStatus').textContent = 'Страница ' + target.dataset.navPage + ' из 3';
    }
    if (target.hasAttribute('data-reference')) {
      const reference = references[Number(target.dataset.reference)];
      const image = document.getElementById('referenceImage');
      image.src = 'assets/references/' + reference.file;
      image.alt = reference.title;
      document.getElementById('referenceDialogTitle').textContent = reference.title;
      bootstrap.Modal.getOrCreateInstance(document.getElementById('referenceDialog')).show();
    }
  });
  document.addEventListener('input', function (event) {
    const field = event.target;
    if (field.id === 'cookiePolicyUrl') {
      try {
        BrandUI.cookies.markup({ policyUrl: field.value });
        cookieState.policyUrl = field.value;
        field.classList.remove('is-invalid');
        field.setAttribute('aria-invalid', 'false');
        document.getElementById('copyCookie').disabled = false;
        document.getElementById('cookieCode').textContent = cookieCode();
      } catch { field.classList.add('is-invalid'); field.setAttribute('aria-invalid', 'true'); document.getElementById('copyCookie').disabled = true; }
    }
    if (field.dataset.buttonControl === 'label') { buttonState.label = field.value; updateButton(); }
    if (field.id === 'sampleRange') document.getElementById('sampleRangeValue').value = field.value + '%';
    if (field.id === 'progressRange') {
      document.getElementById('progressValue').value = field.value + '%';
      const progress = document.getElementById('sampleProgress');
      progress.setAttribute('aria-valuenow', field.value);
      progress.querySelector('.progress-bar').style.width = field.value + '%';
    }
    if (field.id === 'iconSearch') { iconState.query=field.value; iconState.page=1; updateIcons(); }
    if (field.id === 'iconLabel') { iconState.label=field.value; updateIcons(); }
    if (field.id === 'typePhrase') document.querySelectorAll('[data-type-sample]').forEach(function (sample) { sample.textContent = field.value || 'Понятный шаг. Сильный результат.'; });
    const form = field.closest('[data-demo-form]');
    if (form && form.classList.contains('was-validated') && field.willValidate) field.setAttribute('aria-invalid', String(!field.checkValidity()));
  });
  document.addEventListener('change', function (event) {
    const field = event.target;
    if (field.id === 'iconSize' || field.id === 'iconDecorative') { iconState.size=Number(document.getElementById('iconSize').value);iconState.decorative=document.getElementById('iconDecorative').checked; updateIcons(); }
    if (field.id === 'cookieVariant') { cookieState.variant = field.value; updateCookie(); }
    if (field.hasAttribute('data-button-control') && field.dataset.buttonControl !== 'label') { buttonState[field.dataset.buttonControl] = field.type === 'checkbox' ? field.checked : field.value; updateButton(); }
    if (field.hasAttribute('data-contact-method')) {
      const form = field.closest('form');
      const contact = form.elements.contact;
      const mode = field.value;
      contact.value = '';
      contact.type = mode === 'email' ? 'email' : mode === 'phone' ? 'tel' : 'text';
      contact.autocomplete = mode === 'email' ? 'email' : mode === 'phone' ? 'tel' : 'off';
      contact.placeholder = mode === 'email' ? 'name@example.com' : mode === 'phone' ? '+7 (900) 000-00-00' : '@username';
      if (mode === 'phone') {
        contact.setAttribute('data-tel-input', '');
        contact.inputMode = 'tel';
        contact.pattern = '(?:\\+7|8) \\([0-9]{3}\\) [0-9]{3}-[0-9]{2}-[0-9]{2}|\\+[0-9]{7,16}';
      } else {
        contact.removeAttribute('data-tel-input');
        contact.removeAttribute('inputmode');
        if (mode === 'telegram') contact.pattern = '@?[A-Za-z0-9_]{5,32}'; else contact.removeAttribute('pattern');
      }
      form.querySelector('[data-contact-label]').textContent = mode === 'email' ? 'Email' : mode === 'phone' ? 'Телефон' : 'Telegram';
      form.querySelector('[data-contact-error]').textContent = mode === 'email' ? 'Укажите корректный email.' : mode === 'phone' ? 'Укажите корректный номер телефона.' : 'Укажите имя пользователя Telegram.';
      if (form.classList.contains('was-validated')) contact.setAttribute('aria-invalid', 'true');
    }
  });

  const search = document.getElementById('catalogSearch');
  const results = document.getElementById('searchResults');
  search.setAttribute('aria-controls','searchResults'); search.setAttribute('aria-expanded','false');
  function hideSearch() { results.hidden=true;search.setAttribute('aria-expanded','false'); }
  search.addEventListener('input', function () {
    const query=search.value.trim().toLocaleLowerCase('ru'); if (!query) { hideSearch(); return; }
    const sections=Object.entries(entries).filter(item=>(item[1].title+' '+item[1].meta).toLocaleLowerCase('ru').includes(query)).map(item=>({title:item[1].title,href:'#'+item[0],icon:item[1].icon}));
    const examples=BrandUICatalogExamples.entries().filter(entry=>(entry.title+' '+entry.id+' '+entry.states.join(' ')+' '+entry.properties.flat().join(' ')).toLocaleLowerCase('ru').includes(query)).map(entry=>({title:entry.title,href:'#'+entry.route+'/'+entry.id,icon:'code-2'}));
    const matched=sections.concat(examples).slice(0,30);
    results.innerHTML=matched.length?matched.map(item=>'<a href="'+item.href+'">'+icon(item.icon)+escape(item.title)+'</a>').join(''):'<div class="search-empty" role="status">Ничего не найдено</div>';
    results.hidden=false;search.setAttribute('aria-expanded','true');BrandUI.init(results);
  });
  function searchKey(event) {
    const links=Array.from(results.querySelectorAll('a'));
    if(event.key==='Escape'){event.preventDefault();hideSearch();search.value='';search.focus();return;}
    if(results.hidden || !links.length)return;
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const current=links.indexOf(document.activeElement);const next=event.key==='Home'?0:event.key==='End'?links.length-1:event.key==='ArrowDown'?Math.min(links.length-1,current+1):Math.max(0,current-1);links[next].focus();}
    if(event.key==='Enter' && document.activeElement===search){event.preventDefault();location.hash=links[0].hash;hideSearch();search.value='';}
  }
  search.addEventListener('keydown',searchKey);results.addEventListener('keydown',searchKey);
  results.addEventListener('click',function(event){if(event.target.closest('a')){hideSearch();search.value='';}});
  document.addEventListener('click',function(event){if(!event.target.closest('.catalog-search'))hideSearch();});
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  registerExamples();
  try { applyTheme(localStorage.getItem('brand-ui-theme') || 'dark'); } catch {}
  render();
})();
