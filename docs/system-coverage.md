# Покрытие системы и выбор компонентов

UI KIT 1.5.1 закрывает общие сценарии HTML/PHP: основы → компоненты → композиции →
готовые страницы. [Каталог](../index.html) содержит 86 полных документов; отдельные
записи получают исходный HTML из общих шаблонов. Полные групповые примеры и прежние
deep links сохранены. Они показывают сочетание элементов, а не второй API.

## Матрица

Все семейства используют light/dark и наследуемую default/compact. Size и density —
разные оси; small/default/large задают минимумы 36/44/52 px. Coarse pointer сохраняет
controls ≥44 px, editable text ≥16 px. Неприменимые состояния не имитируются.

| Семейство | Применимые состояния и варианты | Узкий экран / выбор |
|---|---|---|
| Кнопки, CTA, icon button | Focus, hover, active, disabled, busy; три размера, groups/split | Перенос текста; подпись icon-only на button |
| Input/textarea | Default, valid, invalid, disabled, readonly; helper, count, prefix/suffix | Нативный ввод, текст растёт; ошибки связаны с полем |
| Select | Native или единый enhanced; required, selected, disabled, invalid | data-native-select по решению проекта; popup в visualViewport |
| Search/multiselect/autocomplete | Query, selected, loading, empty, error; keyboard и chips | Три видимых тега, disclosure, FormData целиком |
| Checkbox/radio/switch/range | Native checked/value, valid/invalid, disabled | Readonly не подменяет disabled; radio остаётся radio |
| Password/number/date/time/file | Reveal, min/max/step, native picker, selection/error/remove | Системный picker и клавиатура проверяются на целевой ОС |
| Формы | Required, summary, server errors, loading/error/retry/success, stepper | Сохранение значений, guard правок в page recipe |
| Карточки/списки | Контент, услуга, набор, кейс; действия и метаданные | Grid по своей ширине; список для независимых записей |
| Avatar/tag/badge/chip/count | Image/fallback/status; выбранный/удалённый chip | Tag — категория, badge — статус, count — число; не делать всё кнопками |
| Table/list/detail | Query/filter/sort/page/selection, bulk, loading/error/empty, columns/sticky/pin | Auto по ширине host; table для сравнения, list для записи, drawer для деталей |
| Навигация | Tabs, breadcrumbs, pagination, action menu, header/footer/sidebar | Сохранение контекста; tablist скроллится отдельно, sidebar/offcanvas по viewport |
| Overlays | Modal/drawer/sheet, popover/tooltip, focus trap/return, Escape | Одна Bootstrap-база; responsive dialog и safe-area |
| Обратная связь | Toast queue/action, inline alert/banner, loader/progress/skeleton, empty/error/retry | Следующий шаг рядом с ошибкой; toast не закрывает нижний fixed-блок |
| Сайт | Hero/services/cases/FAQ/contact и исходная графика | Секции по задаче посетителя, одно главное действие |
| Рабочие страницы | List/detail/create/edit, профиль, доступ/служебные, контент/поиск | Общая модель, independent scroll, callbacks и offline примеры |

Числовые данные для сравнения сохраняйте в таблице с собственной прокруткой. Не
превращайте сложную таблицу автоматически в карточки, если теряется сравнение.
Table/list/auto включается явно. Sticky/pin нужны большим данным, а не каждой таблице.
Фильтры используют draft/apply/cancel, когда изменение дорого или нужно подтвердить
несколько полей; простой поиск может обновлять результат сразу.

Tooltip поясняет короткий control, popover содержит пояснение, drawer удерживает
контекст записи, modal требует решения. Системное сообщение показывается inline,
когда человек должен прочитать или исправить его; toast подходит для короткого
результата вне основного потока. Skeleton повторяет ожидаемую структуру, loader
сообщает о неопределённой работе. Не показывайте busy и success одновременно.

## Preview и проверка

Общий inspector стоит первым. Тема, плотность, viewport, контейнер, применимое
состояние и длинный текст переносятся в полный HTML. Для страниц и Bootstrap-навигации
с viewport-breakpoint контейнер выключен: проверяйте их через viewport. Состояния
table/форм/страниц включают существующие controllers; hover/focus, bulk, открытие
overlays и жесты проверяются реальным действием. Это не обещание всех состояний для
каждого элемента. Свойства/зависимости доступны в свёрнутом блоке под preview.

Приёмка: 12 представителей × 2 темы × 2 плотности × 4 ширины = 192 сочетания;
семь композиций × четыре theme/density × две ширины (240/320) = 56 узких long-text контейнеров при viewport
1440 px. System проверяет также применимые состояния, AX-имена при 64 переходах Tab,
text spacing и системные режимы. Все 86 полных документов проверяются отдельно.
Visual имеет 16 сохранённых и просмотренных эталонов. Firefox проверен фактически:
64 сочетания мобильных композиций и трёх страниц плюс ограниченный smoke поведения.
Подробности запуска — [testing.md](testing.md), границы — [support.md](support.md).

## Закрытие замечаний аудита

| Замечания | Результат |
|---|---|
| UX01–UX04 | Единая шкала controls, CTA/icon, наследуемая density |
| UX05–UX08 | Own-width grid, компактные строки, удалён catalog CSS leak, общий table/list |
| UX09 | Читаемые labels, Manrope для рабочих экранов, спокойные поверхности |
| UX10–UX11 | Категории, отдельные записи, общий inspector и применимые состояния |
| UX12 | Расширены Chrome/Firefox/AX; Safari, реальные iOS/Android и screen reader ещё требуют фактической проверки |
| UX13 | Межполевой ритм переносится общей библиотекой и проверен без catalog.css |

Результаты реализации 14–18 и локальные коммиты фиксирует ROADMAP.md. Исходный аудит
и его измерения не переписываются под новые результаты.

Новые сложные компоненты вводите по задаче проекта: календарь диапазона, tree/grid,
rich text/editor, charting, drag/reorder, локализация/RTL и framework/Figma adapters
не становятся обязательными зависимостями этого набора. Настоящие сеть, авторизация,
политики, условия, бренд и собственная лицензия остаются решениями подключающего проекта.
