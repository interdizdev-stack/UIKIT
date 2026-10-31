# Базовые компоненты

Статичные карточки, списки, теги, размеры аватаров, шапки и подвалы используют
Bootstrap CSS, tokens.css и ui-kit.css. Подключите Bootstrap Bundle, Lucide и ui-kit.js
для стандартных действий, иконок, tooltip и popover. Для загрузки аватаров, групп
фильтров и управляемых панелей дополнительно подключите ui-kit-components.js.
Для переключателя light/dark/system нужен ui-kit-theme.js.

Автономная страница: [examples/components.html](../examples/components.html).
Она работает через file:// и сервер, без catalog.css/catalog.js. Демонстрационные
действия из examples/components.js показывают локальный результат; обработчики
приложения подключаются отдельно. В каталоге добавлены разделы cards, lists,
identity и site-navigation с HTML и копированием разметки.

## Карточки

`article.brand-card` содержит изображение `.brand-card-media`, тело
`.brand-card-body`, заголовок `.brand-card-title`, описание, метаданные и
`.brand-card-actions`. В теле карточки действия выравниваются по нижнему краю.

```html
<article class="brand-card">
  <img class="brand-card-media" src="/images/project.webp"
       alt="Экран личного кабинета" loading="lazy">
  <div class="brand-card-body">
    <p class="brand-card-meta">Кейс · Веб</p>
    <h3 class="brand-card-title"><a href="/project/">Личный кабинет</a></h3>
    <p class="brand-card-description">Описание задачи и результата.</p>
    <div class="brand-card-actions">
      <a class="btn btn-secondary btn-sm" href="/project/">Подробнее</a>
    </div>
  </div>
</article>
```

Контентная карточка ведёт на материал; сервисная показывает услугу и CTA; товарная
содержит `.brand-card-price`; кейс объясняет задачу и ведёт к результату. Примеры
содержат все четыре варианта. `.brand-card--featured` выделяет карточку границей,
`.brand-card--horizontal` размещает изображение сбоку и возвращает его наверх до 600 px.
Высоту контента не фиксируйте. В сетке используйте `.brand-grid--2/3/4`.
Изображения примеров являются локальными иллюстрациями из исходных референсов.

Оставляйте настоящие ссылки и кнопки с ясным действием. Заголовок и действие могут
быть отдельными ссылками; не вкладывайте кнопку в ссылку и не делайте весь article
кнопкой, если внутри есть другие действия. Уровень h2/h3 определяется структурой страницы.

## Списки

`ul.brand-list` содержит `li.brand-list-item`. Внутри `.brand-list-main` располагаются
`.brand-list-icon` и `.brand-list-copy` с `.brand-list-title` и
`.brand-list-description`. Статичная строка использует div, переход — a, действие —
button с type="button". Вторичное действие `.brand-list-action` находится рядом
с основной ссылкой/кнопкой и имеет собственное доступное имя.

```html
<ul class="brand-list">
  <li class="brand-list-item">
    <a class="brand-list-main" href="/team/">
      <span class="brand-list-icon"><i data-lucide="users"></i></span>
      <span class="brand-list-copy">
        <strong class="brand-list-title">Команда</strong>
        <span class="brand-list-description">Участники проекта</span>
      </span>
    </a>
    <button class="btn btn-ghost btn-icon brand-list-action" type="button"
            aria-label="Настройки команды"><i data-lucide="settings"></i></button>
  </li>
</ul>
```

Длинные подписи переносятся; вторичное действие сохраняет размер. Не полагайтесь
на одну иконку для смысла строки. Управление содержимым и маршрутом принадлежит приложению.

## Аватары

`.brand-avatar` по умолчанию имеет 36 px; модификаторы --sm/--lg/--xl дают 24/48/64 px.
Размеры заданы токенами `--ui-control-avatar-*`. Для статичных инициалов достаточно
span. Для изображения и fallback используйте:

```html
<span class="brand-avatar brand-avatar--lg" data-brand-avatar role="img"
      aria-label="Анна, в сети">
  <span data-avatar-fallback aria-hidden="true">АА</span>
  <img data-avatar-image src="/images/anna.webp" alt="" hidden>
  <span class="brand-avatar-status is-online" aria-hidden="true"></span>
</span>
```

После успешной загрузки показывается изображение; до загрузки и при ошибке — инициалы.
Изменения src/srcset и замена вложенного изображения отслеживаются. Варианты статуса:
is-online, is-away, is-busy; статус выражен в доступной подписи, а цвет его дополняет.
Если имя и статус уже написаны рядом, аватар можно сделать декоративным через aria-hidden.
`.brand-avatar-group` объединяет несколько аватаров; задайте группе aria-label,
а дополнительному счётчику доступную подпись «Ещё N участников».
Аватар внутри ссылки не должен заменять семантику этой ссылки ролью img.

API: `BrandUI.avatar.init(element)`, `BrandUI.avatar.get(element)`,
`controller.update()`, `getState()` (loading/image/fallback), `destroy()`.
Очистка снимает слушатели/наблюдатель и возвращает исходные hidden/aria-busy/state.
Инициалы остаются видны при отключённом модуле. Локальный SVG примера — условная
иллюстрация профиля, а не фотография или утверждённый фирменный знак.

## Теги и фильтры

`.brand-tag` — статичная подпись, `.brand-tag--accent` — акцентная. Для выбираемого
фильтра используйте настоящую кнопку `.brand-chip` с data-chip-toggle и уникальным
data-chip-value. Группа data-brand-chips имеет role="group" и aria-label.
`data-chip-selection="single"` допускает не более одного выбранного фильтра;
`multiple` (по умолчанию) — несколько. Повторный выбор снимает фильтр.

```html
<div class="brand-chip-group" data-brand-chips data-chip-selection="multiple"
     role="group" aria-label="Направления">
  <button class="brand-chip" type="button" data-chip-toggle data-chip-value="web"
          aria-pressed="true">Сайты</button>
  <span class="brand-chip" data-chip-value="design">
    <button type="button" data-chip-toggle>Дизайн</button>
    <button type="button" data-chip-remove aria-label="Удалить фильтр Дизайн">
      <i data-lucide="x"></i>
    </button>
  </span>
</div>
```

Начальный выбор задаёт aria-pressed="true". Остальные кнопки получают false при init.
Нативный disabled запрещает пользовательский выбор. Enter/Space работают нативно.
При удалении фокус переходит к следующей доступной кнопке, затем предыдущей, затем
к группе. Необязательный `[data-chips-empty]` показывает отсутствие фильтров.
Удаление является изменением данных пользователя и не отменяется при destroy.

API: `BrandUI.chips.init(group)`, `get(group)`; `getSelection()` возвращает массив
строковых значений. `select(value, boolean)` изменяет доступный фильтр;
`remove(value)` удаляет его; `update()` обновляет динамические кнопки;
`destroy()` снимает делегированный обработчик и возвращает исходные aria/class/tabindex.
Повторный `BrandUI.init(group)` вызывает update.
Неизвестный режим выбора, отсутствующее или повторяющееся значение вызывает TypeError
до подключения обработчика. Исправьте разметку и повторите init.

Событие `brand:chips-change` содержит `detail.values` и `detail.controller`.
Отменяемое `brand:chip-remove` содержит value/label/controller; preventDefault
сохраняет элемент. Фильтрацию данных выполняет слушатель приложения.

## Шапка и подвал

`.brand-navbar` содержит `.brand-container.brand-navbar-inner`, ссылку-логотип,
мобильную кнопку `.brand-navbar-toggle`, `.offcanvas-lg.brand-navbar-menu`
и необязательное действие `.brand-navbar-action`. В меню — `.brand-navbar-links`.
В примере мобильное меню открывается до 992 px; на широком экране ссылки видны в шапке.
Кнопка задаёт data-bs-target, aria-controls и доступное имя; панель — уникальный id,
tabindex="-1" и aria-labelledby. Для работы и очистки добавьте к панели data-brand-drawer.
Текущее направление обозначайте aria-current="page" либо "location" для якоря.
Приложение обновляет aria-current при смене маршрута.

`.brand-navbar--sticky` необязательно закрепляет шапку. `.brand-skip-link` ведёт к
main с id и tabindex="-1" и появляется при фокусе. Название Brand UI остаётся временным.

`.brand-footer` содержит колонки `.brand-grid`, заголовки `.brand-footer-title`,
списки `.brand-footer-links` и дополнительный текст `.brand-footer-meta`.
`.brand-footer--compact` размещает короткую подпись и ссылки в одну строку с переносом.
Размечайте наборы ссылок через nav с разными aria-label. Для реального сайта замените
демонстрационные названия, ссылки и изображения на материалы проекта.

## Drawer / offcanvas

Используйте `.offcanvas.offcanvas-end.brand-drawer` (либо offcanvas-start),
data-brand-drawer, доступный заголовок, offcanvas-header/body и кнопку закрытия.
Разметка и клавиатура основаны на Bootstrap Offcanvas; ширина — `--ui-layout-drawer`
с ограничением по ширине экрана. Панель удерживает фокус, закрывается по Escape,
backdrop или явному действию и возвращает фокус к кнопке открытия.
Ссылки внутри открытого меню и `[data-drawer-close]` закрывают панель.
Раскрытый select сначала обрабатывает Escape сам; следующий Escape закрывает панель.

API: `BrandUI.drawer.init(element, bootstrapOptions?)`, `get(element)`;
`controller.show(opener?)`, `hide()`, `getState()` (closed/opening/open/closing),
`await destroy()`. События — обычные show/shown/hide/hidden.bs.offcanvas Bootstrap.
`await BrandUI.destroy(container)` ожидает закрытия принадлежащей библиотеке панели,
включая её открытие, и очищает backdrop/фокус/прокрутку. До замены HTML дождитесь Promise.
Если Bootstrap-экземпляр создан самим приложением до init, модуль снимает свои
подписки, а управление и очистка этого экземпляра остаются приложению.

## Tooltip и Popover

```html
<button class="btn btn-secondary" type="button" data-bs-toggle="tooltip"
        title="Короткая подсказка">Навести или сфокусировать</button>
<button class="btn btn-secondary" type="button" data-bs-toggle="popover"
        title="Пояснение" data-bs-content="Дополнительный текст действия.">
  Подробнее
</button>
```

Ядро инициализирует tooltip/popover при BrandUI.init(container), включая динамический
HTML. Tooltip использует hover/focus, popover — click и нативные Enter/Space кнопки.
Escape закрывает подсказку, сохраняя фокус; popover также закрывается при повторном
нажатии и pointerdown за его пределами. При смене темы открытые подсказки закрываются.
Текстовый popover не предназначен для форм и интерактивных вложений; для них используйте
drawer или modal. HTML содержимое отключено. Не помещайте обязательные инструкции
только в tooltip, особенно для disabled-контролов; используйте видимый текст рядом.

Подсказки размещаются в body, выходя из overflow-контейнеров, и получают вычисленные
токены источника, включая вложенную тему. Связь aria-describedby сохраняет исходные
описания и добавляет идентификатор подсказки; popover обновляет aria-expanded/controls.
Программное управление доступно через Bootstrap Tooltip/Popover.getInstance(element).
Ядро очищает свои экземпляры и восстанавливает исходные title, aria-label,
aria-describedby, aria-expanded/controls и data-bs-original-title. Экземпляры,
созданные приложением заранее, остаются под его управлением.

Примеры проверяются в Chrome на 320/390/768/1440 px и в light/dark. Поддержка других
браузеров и screen reader ещё не подтверждена фактическими проверками.
