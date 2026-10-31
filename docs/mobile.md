# Узкие контейнеры и мобильные сценарии

[Автономный пример](../examples/mobile.html) и копируемые `#tables/mobile-data`,
`#advanced-forms/mobile-controls` работают через HTTP и file://, без обязательного backend.
Используются существующие Bootstrap/drawer, choice, forms, patterns и table.

Сетка `brand-grid--2/3/4` задаёт максимальное число колонок. Реальное число зависит
от ширины самой сетки и `--ui-layout-column-min` (240 px). В панели 320 px она становится
одноколоночной даже при viewport 1440 px. `brand-responsive` создаёт CSS container
для адаптации горизонтальной карточки. Группы действий переносятся через brand-cluster/toolbar.

## Данные

```js
const table = BrandUI.table.init(host, {
  rows, columns, layout: 'auto', breakpoint: 600,
  stickyHeader: true, pinFirstColumn: true, compactPagination: true
});
table.setLayout('list'); // table | list | auto
table.setColumns(['name', 'status']); // хотя бы одна известная уникальная колонка
```

`table` сохраняет семантическую таблицу с собственной прокруткой. `list` подходит
для независимых записей: первая видимая колонка — название, остальные — пары dt/dd.
`auto` переключается по ширине host с ResizeObserver. Поиск, сортировка, выбор,
страница, loading/error и bulk общие. Только активное представление создаёт строки;
форматтеры не вызываются для скрытой копии. `getState()` дополнительно возвращает
layout, view и visibleColumns. Порядок колонок остаётся порядком columns.

`visibleColumns` в config и `columns[].hidden` задают исходную видимость.
`setLayout`/`setColumns` сохраняют незавершённый callback.
`update({layout,visibleColumns})`, как любой update, отменяет незавершённую работу.
Скрытие сортируемой колонки сбрасывает сортировку. `minWidth` (620 px по умолчанию)
задаёт ширину таблицы. Sticky header ограничивает её область 24rem; pin закрепляет
первую колонку данных вместе с checkbox. Используйте эти режимы по задаче.
CompactPagination в узком контейнере показывает «Назад · N из M · Далее».

`brand:table-action` открывает детали в общем drawer; пример возвращает фокус к
действию записи после смены представления, при исчезнувшей записи — к поиску.

## Панели и поля

`offcanvas-bottom brand-drawer brand-sheet` использует общие backdrop, focus trap,
Escape и lifecycle. Содержимое прокручивается, brand-sheet-actions группирует действия.
Фильтры используют общий draft/apply/cancel. При открытии пример синхронизирует
q/status из table и вызывает `filters.apply({silent:true})`: новый снимок без события
и callback. Отмена, Escape и backdrop откатывают черновик. Применение обновляет
общую модель и закрывает панель.

`brand-dialog-responsive` на .modal-dialog при ширине до 600 px заполняет экран;
body формы прокручивается, footer учитывает safe area. Длинные формы проверяйте при
открытой системной клавиатуре на устройствах аудитории.

Multiselect показывает до трёх тегов и кнопку «Ещё N»/«Свернуть».
`data-choice-max-tags="N"` или `choice.init(select,{maxTags:N})` меняет предел,
0 показывает всё. FormData сохраняет весь выбор; reset сворачивает теги.
`data-native-select` оставляет системный select; автоматической подмены по ширине нет.
Popup choice и простого select ограничивается visualViewport; listeners убираются при destroy.

На coarse pointer цели controls, подписи checkbox, range, tabs и close имеют минимум 44 px; редактируемый текст — минимум
16 px. `brand-mobile-tabs` прокручивает длинный tablist в своей области; Bootstrap
сохраняет клавиатуру, aria-selected и связь с tabpanel. Breadcrumb переносится,
длинные названия записей не создают горизонтальную прокрутку документа.

## Закреплённые элементы и проверка

Toast учитывает safe-area, visualViewport и видимые brand-cookie--bar/corner,
а также пользовательские `[data-ui-fixed-bottom]`. ResizeObserver пересчитывает
высоту нижних блоков; новые блоки обнаруживаются при push/resize. При специальных
раскладках задайте `--ui-layout-bottom-offset`. Destroy убирает listeners,
observer и временную CSS-переменную. Добавьте viewport-fit=cover, если страница
использует всю safe area, и проверьте содержимое на целевых устройствах.

`tests/mobile.mjs` проверяет две темы × две плотности × четыре viewport, узкий
контейнер, состояние/focus, columns/pin/sticky, panels, chips, coarse pointer,
уменьшенный viewport, toast и file://. Изолированный Firefox проверяется опциональным
tests/firefox.mjs; точные границы — [support.md](support.md). Эмуляция viewport
и pointer не заменяет реальные телефоны, системную клавиатуру или screen reader.
