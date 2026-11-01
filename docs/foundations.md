# Основы и токены UI KIT

`tokens.json` — источник палитры, тем, типографики, отступов и размеров. Из него
генерируются `tokens.css` и `tokens.js`. Библиотека и каталог используют эти переменные;
их значения меняются в JSON, после чего запускается генератор.

```sh
node scripts/build-tokens.mjs
node scripts/build-tokens.mjs --check
node tests/tokens.mjs
```

`--check` проверяет структуру токенов и актуальность обоих сгенерированных файлов,
не перезаписывая их. Проверяются цветовые значения, одинаковый набор ключей тем,
размеры с единицами, веса и ссылки типографических ролей, opacity, z-index и duration.

## Группы токенов

| JSON | CSS | Назначение |
|---|---|---|
| colors | --ui-color-* | Фирменная палитра и цвет заливки опасного действия |
| themes.light / dark | --ui-* | Фон, поверхность, поле, текст, границы и семантические статусы |
| typography.sizes | --ui-font-size-* | Размеры шрифтов |
| typography.weights | --ui-font-weight-* | Веса |
| typography.lineHeights | --ui-line-height-* | Межстрочный интервал |
| typography.letterSpacing | --ui-letter-spacing-* | Межбуквенный интервал |
| typography.presets | --ui-type-role-* | Роли, связывающие семейство, размер, вес и интервалы |
| spacing | --ui-space-* | Шкала отступов; compact сохраняет существующие 20 px |
| radius / borders | --ui-radius-* / --ui-border-* | Скругления, ширина границы и фокуса |
| shadows / layers | --ui-shadow-* / --ui-z-* | Тени и порядок наложения |
| controls / icons | --ui-control-* / --ui-icon-* | Высоты контролов и размеры иконок |
| density.default / compact | --ui-density-* | Согласованная плотность controls, строк, меню, отступов и skeleton |
| motion / easing | --ui-motion-* / --ui-ease-* | Длительности и функция анимации |
| opacity | --ui-opacity-* | Прозрачность состояний |
| layout | --ui-layout-* | Контейнер, ширина чтения, gutters и отступы секций |

Размеры micro/meta/note и catalog-* предназначены для плотного каталога. Основной
текст сайта использует роль body, подпись — caption. Служебные размеры не должны
заменять основной текст страницы.

## Типографика

Готовые классы: `brand-display`, `brand-h1` … `brand-h6`, `brand-body`, `brand-small`,
`brand-ui`, `brand-caption`, `brand-page-title`, `brand-panel-title`, `brand-number`,
`brand-code`. Page/panel используют Manrope, number — tabular figures, code — системный
моноширинный шрифт. Первые три роли адаптивны: их размер меняется через clamp
между minSize и size из preset. Класс не меняет семантику HTML: используйте настоящий
`h1` для главного заголовка, `h2` для раздела и правильный порядок остальных уровней.

`brand-heading` сохраняется для прежних шаблонов с прописными заголовками.
Типографические образцы каталога берут значения из тех же presets.

## Компоновка

```html
<main class="brand-container brand-section">
  <h1 class="brand-h1">Заголовок страницы</h1>
  <div class="brand-grid brand-grid--3">
    <section class="brand-surface brand-stack">...</section>
    <section class="brand-surface brand-stack">...</section>
    <section class="brand-surface brand-stack">...</section>
  </div>
</main>
```

- `brand-container`: центрированный контейнер 1200 px с боковыми отступами.
- `brand-reading`: ограничение длинной строки 720 px.
- `brand-section`: отступы секции 64 px, на мобильных 32 px.
- `brand-grid--2/3/4`: равные колонки; на мобильных одна, у четырёх колонок на планшете две.
- `brand-stack`: вертикальный поток с отступом и без дополнительных внешних margin у детей.
- `brand-cluster`: строка элементов с переносом.
- `brand-control-row`: подписанные короткие controls по ширине содержимого в строку;
  элементы выровнены по нижнему краю и переносятся только при нехватке места.
- `brand-surface`: поверхность с границей, скруглением и padding по плотности; тень не обязательна.

Связанные короткие настройки, фильтры, действия и метаданные должны оставаться в одной
строке, пока их естественные ширины и интервалы помещаются. Не назначайте коротким
selects равные `1fr`/Bootstrap-колонки или `width:100%` на всю строку. При переносе
сохраняйте порядок и целую пару «подпись + control». Размер текста, высота controls и
touch targets остаются прежними. Ширину текстового ввода выбирайте по ожидаемым данным;
растяжение поиска или длинного поля включайте только когда оно нужно задаче.

```html
<div class="brand-control-row">
  <label>Тема
    <select class="form-select" name="theme">
      <option value="light">Light</option><option value="dark">Dark</option>
    </select>
  </label>
  <label>Плотность
    <select class="form-select" name="density">
      <option value="default">Обычная</option><option value="compact">Компактная</option>
    </select>
  </label>
</div>
```

Не задавайте фиксированное число полей в строке по viewport: проверяйте ширину самого
контейнера, включая узкую панель на широком экране. `brand-filter-fields` использует
тот же поток для групп с отдельными label/полем. Toolbar не растягивает поля автоматически;
`brand-toolbar-spacer` по-прежнему отводит действия к краю.

Bootstrap grid и utilities остаются доступны. Собственные классы задают предсказуемую
компоновку без зависимости от CSS каталога. Границы media queries фиксированы в CSS
(700 и 991 px): CSS-переменные не используются как подстановка условий media query.

## Темы и семантика

`data-bs-theme="light"` или `dark` можно установить на html или отдельный контейнер.
Темы имеют одинаковые ключи, включая отдельную `border-control` для полей.
Стандартные ссылки, текстовые статусы и Bootstrap subtle backgrounds берут цвета
из темы. `text-primary` использует accent-text, а фон primary остаётся ярким лаймом.

```html
<section data-bs-theme="dark" class="brand-surface">
  <p class="text-success">Действие выполнено</p>
  <a href="/details/">Подробнее</a>
</section>
```

## Состояния

| Состояние | Разметка и поведение |
|---|---|
| Default | Обычный control без модификатора состояния |
| Hover / Active | CSS псевдоклассы; не заменяют фокус клавиатуры |
| Focus | :focus-visible и контрастная внешняя граница |
| Disabled | Нативный disabled, недоступность подтверждается семантикой HTML |
| Loading | aria-busy и видимый текст состояния; действие защищено от повторного запуска |
| Selected | checked для checkbox/radio; aria-selected для option/tab |
| Readonly | Нативный readonly; значение остаётся доступно для чтения и копирования |
| Error | aria-invalid, связанный текст ошибки и визуальная граница |
| Success | Видимое сообщение/статус; один зелёный цвет недостаточен для объяснения результата |

Галерея применимых состояний находится в расширенных полях и feedback. Наличие
описанного состояния не означает наличие каждого специализированного компонента.

## Размеры и плотность

```html
<section data-ui-density="compact" class="brand-surface brand-stack">
  <input class="form-control" aria-label="Поиск">
  <button class="btn btn-primary" type="button">Найти</button>
  <section data-ui-density="default"><button class="btn btn-secondary" type="button">Обычная плотность</button></section>
</section>
```

| Элемент | Default | Compact |
|---|---:|---:|
| Control без size-класса | 44 px | 36 px |
| Small / large control | 36 / 52 px | 36 / 52 px |
| Строка таблицы, минимум | 48 px | 40 px |
| Пункт меню, минимум | 40 px | 36 px |
| Padding поверхности | 24 px | 16 px |
| Интервал `.form-field` | 20 px | 12 px |
| Шрифт control | 14 px | 14 px |

Размеры — минимумы. Padding учитывает [текущую строку lh](https://www.w3.org/TR/css-values-4/#lh), поэтому увеличенный
шрифт и перенос текста увеличивают control. Icon button и CTA используют ту же
шкалу. `.input-group-sm/lg` задаёт размер всем частям группы, включая enhanced select;
не смешивайте размеры внутри одной группы. Textarea сохраняет rows и возможность роста.
При coarse pointer минимум controls/icon buttons/menu items — 44 px: эмуляция
проверяет CSS-правило, а не заменяет реальный телефон.

Область задаётся контейнером, отдельному select также можно задать data-ui-density.
Popup в body копирует актуальные density/tokens исходного поля при открытии.
После смены плотности закрывайте и открывайте popup заново. `.form-field` работает
без каталога; `brand-form` также оформляет CTA формы. При использовании `brand-stack`
интервал задаёт stack, а внешние margin его прямых детей сбрасываются.

[Автономный пример](../examples/density.html) содержит две плотности, вложенную
область, явные размеры, список, таблицу и skeleton. Он работает через file://.
Пример доступен в каталоге по `#colors/density` и копируется полным HTML.

Автономный пример основ: `examples/foundations.html`. Он подключает только библиотеку.

## Ползунки и прокрутка

Полосы прокрутки используют `--ui-accent-text` для ползунка и `--ui-surface`
для дорожки. Правило применяется к каждому контейнеру, поэтому вложенная тема,
iframe и меню в body сохраняют свои цвета. Толщина остаётся нативной; select
сохраняет ранее заданный thin. В forced colors действует системный scrollbar-color:auto.

Range использует accent / accent-hover / accent-active для заливки, accent-text
для границы и кольца фокуса, border-control для дорожки. Disabled получает muted
и нейтральную границу. В режиме forced colors клавиатурный фокус получает системный
outline. Стили покрывают WebKit/Blink и Mozilla; фактическая проверка — Chrome.

### Переносимые образцы

Копируемые палитра и типографика используют общие классы `brand-swatch-color`,
`brand-swatch-name`, `brand-spacing-sample`, `brand-radius-sample`, `brand-token-spec`,
`brand-contrast-row`, `brand-type-controls`, `brand-type-info` и `brand-type-text`.
Они входят в ui-kit.css и работают без catalog.css. Семантические цвета палитры
генерируются для выбранной темы preview. Длинное выбранное значение select
переносится по строкам; меню учитывает все пункты и может быть шире кнопки,
сохраняя отступ от краёв viewport и место под галочку.
