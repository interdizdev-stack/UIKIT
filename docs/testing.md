# Проверки и выпуск

Нужны Node.js 22+, Python 3 и Chrome. Установка npm-пакетов не требуется.
Chrome можно указать через UIKIT_CHROME; используется новый отдельный профиль.
Сервер, браузер, WebSocket и активные запросы завершаются после каждого набора.
Профиль и тестовые артефакты остаются во временных/ignored каталогах; личный профиль не используется.

```sh
python3 scripts/verify.py       # Проверка текущих источников и архивов
python3 scripts/release.py      # Генерация токенов/иконок, ZIP, все проверки
```

`--static-only` запускает проверку/сборку без Chrome и явно сообщает, что браузерные
проверки пропущены. Полный выпуск требует обычного запуска без этого флага.
Отчёты и stdout отдельных проверок сохраняются в test-results (исключён из Git).
Команда не создаёт remote, CI, публикацию или Git-коммит; сохранение этапов — отдельное действие.

| Набор | Что проверяется |
|---|---|
| tokens.mjs | Схема, 20 отрицательных случаев, генерация и CSS-переменные |
| assets.py | SHA шрифтов/иконок/лицензий, metadata, docs, Python syntax, версия |
| static.py | HTML/CSS ресурсы, CRC, текущие байты ZIP и ссылки внутри архивов |
| browser.mjs | 21 маршрута × 2 темы × 4 ширины, общие сценарии и контраст |
| inputs.mjs | Нативные значения/события, выбор, файлы, password, stepper и cleanup |
| dropdowns.mjs | Все select 21 маршрута, hover/ARIA/selected, disabled, chevron, preview/pageSize, меню действий/поиск, темы/ширины и offline |
| geometry.mjs | Геометрия открытых меню, короткий/длинный текст, coarse pointer, узкие контейнеры, переносимые вкладки/палитра/типографика |
| density.mjs | Размеры controls/input groups, две плотности × две темы × четыре ширины, вложенность, popup в body, переносимость формы/таблицы, рост текста, эмуляция coarse pointer и offline |
| patterns.mjs | Композиции в 16 сочетаниях, radio keyboard/FormData, summary/server errors, draft/apply/cancel/reset, copy success/error/late result и scoped cleanup |
| mobile.mjs | 16 сочетаний, контейнер, table/list/focus, panels, columns, chips, coarse pointer, viewport/toast/offline |
| pages.mjs | Оболочка в 16 сочетаниях, list/detail/create/edit/settings, dirty guard, pending/error/retry, auth/service, content search и file:// cleanup |
| feedback.mjs | Очередь/timer/actions, alerts, retry/focus/abort и reduced motion |
| data-gallery.mjs | Bulk/selection/pageSize, states, zoom/thumbnails/gestures/fullscreen |
| site-blocks.mjs | Сетки, anchors, графика, FAQ, формы и offline |
| catalog.mjs | 86 полных документов, callbacks, iframe, search/deep links/icons/offline; заполнение строки controls в двух темах/плотностях, native/enhanced и контейнеры 240/320/660/1000 px; всего 129 assertions |
| accessibility.mjs | WOFF2/subset, Tab/AX names, reflow, text spacing, text size и системные режимы |
| system.mjs | 192 сочетания представителей, 56 узких long-text контейнеров, применимые состояния preview, 64 перехода Tab/AX и системные режимы; всего 305 assertions |
| preview.py | Public adoption/templates и запрет приватных путей/листинга |
| visual.mjs | 16 эталонов foundations/components: 2 темы × 2 плотности × 4 ширины |

Визуальные PNG сохранены в tests/baselines с окружением Chrome/Linux. Сравнение
декодирует PNG средствами Node, считает RGB-различия с допуском 16 на канал и пределом
0.2% пикселей. Оно ловит изменение вида эталонной страницы, но не покрывает все экраны
рабочего проекта. Различия нового браузера/ОС нужно просмотреть, прежде чем обновлять:

```sh
node tests/visual.mjs --update
node tests/visual.mjs
```

Для повторного UX/UI-обзора в checkout или полном ZIP каталога доступен
`node scripts/audit-ui.mjs`. Он использует тот же изолированный Chrome/localhost,
снимает экраны 11 разделов на четырёх ширинах и измеряет размерные классы,
автономную таблицу и узкий контейнер. JSON/PNG записываются только в
`test-results/ux-audit/`; это инструмент наблюдения, отдельный от обязательных
проверок выпуска. Флаг `mobile:false` означает эмуляцию геометрии, а не
проверку настоящего touch-устройства. Результаты на исходной 1.0.5 и план —
в [аудите UX/UI](ux-ui-audit-2026-10-31.md).

Обновление эталона не является успешной проверкой старого эталона. Команда --update
явно переписывает только baseline-файлы. История должна сохранять просмотренный результат.
Ожидаемые 404 browser fixture — намеренно отсутствующая картинка и favicon; другие
JavaScript exceptions или ошибки ресурсов не допускаются в сохранённых сценариях.

Архивы имеют стабильный порядок, timestamp и режимы файлов. Они не включают .git,
служебные файлы, тестовые результаты или чужие браузерные профили. Полный ZIP содержит
тесты/генераторы/эталоны и ui-kit.zip; ссылка его скачивания указывает на отдельный
ui-kit-catalog.zip рядом с index.html, без рекурсивного включения архива в самого себя.
CI добавляется при выборе remote; сейчас репозиторий локальный.

Дополнительный фактический smoke второго движка:

```sh
UIKIT_FIREFOX=/usr/bin/firefox python3 scripts/release.py
```

Firefox использует временный профиль в test-results
(совместимо с Snap), localhost и WebDriver BiDi без стороннего драйвера.
Проверки/границы фиксируются в firefox-environment.json; основной набор остаётся Chrome.

Visual проверяет 16 сочетаний: 320/390/768/1440 px × light/dark × default/compact.
`node tests/visual.mjs --capture` сохраняет текущие снимки без изменения baseline;
после визуального просмотра допустим `--update`. Обновление не заменяет поиск причин diff.

Полный визуальный инвентарь воспроизводится без дополнительных пакетов:

```sh
node scripts/audit-visual.mjs --capture
node scripts/audit-visual.mjs --stress --capture
```

Первый проход проверяет все записи в 16 сочетаниях. Второй проверяет все
применимые состояния в тех же сочетаниях и все поддерживаемые узкие контейнеры
240/320 px с длинным текстом в обеих темах/плотностях. Полные PNG и JSON находятся
в ignored `test-results/visual-audit/`. Без `--capture` сохраняется геометрия;
снимки проблемных случаев делаются автоматически. Проверяются и прямоугольники
элементов, и границы реального текста, читаемость выбранных значений и ширина меню.
Внешние границы viewport применяются к fixed-уведомлениям; подписанные scroll-области
таблиц и вкладок допускают внутреннюю прокрутку. Этот инструмент собирает наблюдения,
а обязательные assertions регрессий входят в geometry.mjs и общий verify.py.
