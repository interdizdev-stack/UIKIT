# API и переносимость

Библиотека работает без сервера и сборщика в браузере. Подключение: Bootstrap CSS,
tokens.css, ui-kit.css; затем bootstrap.bundle.min.js, lucide.min.js и ui-kit.js.
Дополнительные модули подключаются после ui-kit.js. Они не выполняют сетевых запросов.

| Модуль | Файл | Зависимости и назначение |
|---|---|---|
| Ядро | ui-kit.js | Токены/CSS; Lucide для иконок; Bootstrap для tooltip/popover/lightbox |
| Формы | ui-kit-forms.js | Ядро; HTML Constraint Validation и FormData |
| Темы | ui-kit-theme.js | Ядро, токены; matchMedia, необязательный localStorage |
| Таблица | ui-kit-table.js | Ядро и CSS; Bootstrap для окружающих компонентов |
| Компоненты | ui-kit-components.js | Ядро/CSS; avatar и chips; Bootstrap Offcanvas для drawer |
| Поля | ui-kit-inputs.js | Ядро/CSS; input group, пароль, number, choice/autocomplete, upload; формы для stepper |
| Обратная связь | ui-kit-feedback.js | Ядро/CSS; очередь toast, alerts/banners и состояния retry |
| Композиции | ui-kit-patterns.js | Ядро/CSS; copy и draft/apply фильтров; статичные композиции работают на CSS |
| Cookie | cookie-consent.js | Ядро, CSS и Bootstrap Modal |

## Инициализация и очистка

`BrandUI.init(container = document)` включает библиотеку в контейнере, включая сам
контейнер, если он подходит под селектор. Повторный вызов обновляет select и иконки,
сохраняя существующие контроллеры модулей. Иконки вне контейнера не изменяются.
Добавленные через AJAX телефонные поля и ссылки lightbox работают через делегирование
в активной области; select, формы, темы, avatar, chips, drawer и подсказки требуют вызова init.

`await BrandUI.destroy(container = document)` возвращает нативные select и исходные
иконки, отключает наблюдателей, формы, темы, таблицы, компоненты и cookie, созданные библиотекой.
При полной очистке снимает глобальные обработчики ядра. Телефон и делегированные
ссылки внутри очищенной области выключаются. Следующий init области или её родителя
снова включает их. Инициализация очищает записи отключённых DOM-элементов.

Очистка ожидает закрытия созданных библиотекой модальных окон и drawer, включая окно, которое
ещё открывается. До удаления или замены контейнера дождитесь Promise:

```js
await BrandUI.destroy(host);
host.innerHTML = responseHTML;
BrandUI.init(host);
```

Ядро управляет своими tooltip/popover; существующие экземпляры приложения оставляет
приложению. Модуль компонентов управляет Offcanvas с `data-brand-drawer`, если экземпляр
создан библиотекой. Обычные Bootstrap Modal/Offcanvas/Dropdown, обработчики проекта и исходная
разметка страницы принадлежат подключающему проекту. Их закрытие/очистка выполняется
стандартным Bootstrap API. `BrandUI.lightbox.destroy()` очищает только общий просмотрщик.

`BrandUI.icons.init(container)` преобразует локальные `[data-lucide]` в SVG. Иконка с
`aria-label` или `aria-labelledby` сохраняет доступное имя; декоративные получают
`aria-hidden="true"`. Уже созданные SVG не заменяются повторно.

## Формы

Для необязательных сводки ошибок и server errors используйте data-form-errors,
controller.setErrors и документированный результат onSubmit — [композиции](patterns.md).

Добавьте `data-brand-form` к форме и подключите ui-kit-forms.js. Без обработчика
валидная форма вызывает событие `brand:form-submit` и переходит в состояние `ready`.
Библиотека перехватывает submit такой формы и сама данные не отправляет. Обычные формы
без атрибута продолжают работать нативно, пока явно не переданы в `forms.init`.

```js
const form = document.getElementById('application');
const controller = BrandUI.forms.init(form, {
  onSubmit: async ({ formData, signal }) => {
    const response = await fetch('/application', {
      method: 'POST', body: formData, signal
    });
    if (!response.ok) throw new Error('Request failed');
    return 'Заявка отправлена.';
  },
  errorMessage: 'Не удалось отправить заявку. Попробуйте ещё раз.'
});
```

Пример интеграции fetch выше относится к приложению; автономные примеры используют
локальные демонстрационные обработчики. В обработчик входят `form`, `formData`,
`submitter`, `signal` и `controller`. Именованная кнопка отправки включена в FormData.
`signal` отменяется при reset, новом запросе или destroy. Сам обработчик должен
передать signal своему сетевому клиенту. Поздний результат не меняет уничтоженную форму.

Методы: `validate(focus = true)`, `setState(state, message?)`, `getState()`,
`configure(options)`, `reset()` (сброс состояния и ошибок), `destroy()`.
Нативный `form.reset()` дополнительно сбрасывает значения. `BrandUI.forms.get(form)`
возвращает существующий контроллер. Повторный init обновляет настройки.

Состояния: idle, invalid, ready, loading, success, error. Loading задаёт aria-busy и
блокирует повторную отправку; исходный disabled кнопок возвращается после завершения.
Ошибки полей используют aria-invalid и связанные HTML-сообщения invalid-feedback.
Первый ошибочный select фокусирует доступную кнопку вместо скрытого поля.
Общее сообщение помещается в `[data-form-status]` либо создаётся автоматически.

События всплывают из формы: `brand:form-validate` (`valid`), `brand:form-state`
(`state`, `message`), `brand:form-submit` (`formData`, `submitter`, `signal`),
`brand:form-success` (`result`), `brand:form-error` (`error`). Все содержат `controller`.
Submit отменяемый: вызов preventDefault в слушателе передаёт управление приложению,
которое само вызывает setState. Reset/destroy возвращают исходные aria/novalidate.

## Телефон

По умолчанию сохраняется российская маска. `data-phone-format="none"` выключает
маску конкретного поля; `data-phone-format="international"` оставляет плюс и цифры.
Глобальные настройки: `BrandUI.phone.configure({ format: 'ru', maxDigits: 16 })`.
Варианты format: ru, international, none; maxDigits: целое 1–16 для international.
После изменения настроек вызовите init нужного контейнера для уже заполненных полей.
В российской маске длина остаётся 11 цифр; значение и серверная нормализация описаны в README.

## Темы

Подключите ui-kit-theme.js. `data-brand-theme="system"` включает контроллер контейнера;
`data-theme-storage="project-theme"` необязательно сохраняет выбор. Кнопки внутри него
используют `data-theme-mode="light|dark|system"`. Их aria-pressed обновляется автоматически.

```js
const theme = BrandUI.theme.init(document.documentElement, {
  mode: 'system', storageKey: 'project-theme'
});
theme.setMode('dark');
```

`getMode()` возвращает выбранный режим, `destroy()` снимает слушатели и восстанавливает
исходный data-bs-theme. `BrandUI.theme.get(target = document.documentElement)` возвращает
контроллер. Режим system реагирует на изменение системного предпочтения. Вложенные
`data-brand-theme` и обычные `data-bs-theme` сохраняют свою тему. Для внешней группы кнопок
передайте DOM-контейнер через `controls`. Событие `brand:theme-change` содержит `mode`
и фактически установленный `resolved`; открытый select закрывается при смене темы.
Открытые tooltip/popover также закрываются; при следующем открытии получают токены
темы исходного элемента, даже когда подсказка размещается в body.

## Таблица

Подключите ui-kit-table.js и инициализируйте пустой host:

```js
const table = BrandUI.table.init(host, {
  label: 'Проекты', pageSize: 5,
  rows: [{ id: 1, name: 'Сайт', owner: 'Анна' }],
  columns: [
    { key: 'name', label: 'Проект' },
    { key: 'owner', label: 'Ответственный', sortable: false }
  ]
});
table.update({ rows: nextRows, page: 1 });
```

Каждая строка имеет уникальный ID (`rowKey: 'id'` по умолчанию). Ключи колонок уникальны.
`format(value, row)` возвращает текст или DOM-узел; строки вставляются как текст,
HTML автоматически не исполняется. `selectable` и `actions` включены по умолчанию.
Фильтры: `filters: [{ value, label, test(row) }]`. Toolbar, avatar в примере и пагинация
входят в общую библиотеку; catalog.css/catalog.js не нужны.

`update(rows)` либо `update({ rows, query, filter, page, pageSize })` обновляет данные.
`getState()` возвращает query/filter/page/pageSize/sort/ascending/selected/total.
Выбранные ID сохраняются между фильтрами и страницами; исчезнувшие данные убираются
из выбора. `await destroy()` возвращает исходное содержимое host.
`BrandUI.table.get(host)` возвращает контроллер.

События: `brand:table-change` (состояние), `brand:table-selection` (`selected`),
`brand:table-action` (`id`, `row`). Все содержат controller и всплывают из host.
Таблица сортирует локальные данные; запросы к серверу выполняет проект.
На мобильном прокручивается подписанная область таблицы, доступная с клавиатуры.
Автономный пример: examples/table.html. [Расширенная таблица](table.md) описывает
bulkActions, select/clearSelection, pageSizes и loading/error/retry.
[Галерея](gallery.md) описывает zoom/fullscreen/миниатюры/жесты и их ограничения.

## Карточки, списки и навигация

Разметка, зависимости и API avatar/chips/drawer описаны в
[components.md](components.md). Для поведения подключите ui-kit-components.js после
ядра; `BrandUI.init(container)` включает `[data-brand-avatar]`, `[data-brand-chips]`
и `[data-brand-drawer]`. Статичные карточки, списки, теги и footer требуют только CSS.
Автономная страница: [examples/components.html](../examples/components.html).

## Дополнительные точки продолжения

Уведомления, состояния и их API: [feedback.md](feedback.md), автономные примеры —
[feedback.html](../examples/feedback.html). Отмена/очистка останавливает таймеры и
передаёт AbortSignal обработчикам действий/retry; сетевую работу подключает приложение.

Расширенные поля и их API: [inputs.md](inputs.md), автономные примеры —
[advanced-forms.html](../examples/advanced-forms.html). Модуль поддерживает общие init/destroy,
нативные input/change/FormData, disabled/readonly/reset и сохраняет введённые значения при очистке UI.

`BrandUI.registerModule(name, { init(container), destroy(container) })` подключает
модуль к общему жизненному циклу; уникальное имя обязательно. Destroy может возвращать
Promise. Модуль обязан самостоятельно сохранять экземпляры и делать init повторяемым.
Эта функция используется поставляемыми модулями форм, тем, таблицы, компонентов, полей, обратной связи и cookie.

API cookie и lightbox, их атрибуты и ограничения описаны в README. Примеры используют
только локальные ресурсы и демонстрируют API без публикации данных.

## Блоки сайтов

Статичные секции, FAQ и графика: [правила и зависимости](site-blocks.md).
Фабрика примеров BrandUISiteExamples не является обязательной зависимостью сайта.

Мобильная адаптация, setLayout/setColumns, chips и панели: [mobile.md](mobile.md).

Рабочие страницы и callbacks приложения — [pages.md](pages.md).
