# Расширенные поля и формы

Подключите Bootstrap CSS, tokens.css и ui-kit.css; затем Bootstrap Bundle, Lucide,
ui-kit.js, ui-kit-forms.js и ui-kit-inputs.js. Поля работают без сборщика и сервера.
`BrandUI.init(container)` включает компоненты по атрибутам; перед заменой HTML
вызовите `await BrandUI.destroy(container)`. Без JS остаются нативные поля и select.
Автономный пример: [advanced-forms.html](../examples/advanced-forms.html), включая file://.

## Составное поле, пароль и число

Обёртка `[data-brand-field]` содержит один input/textarea. Bootstrap `.input-group`
поддерживает `.input-group-text` для префикса/суффикса; подпись связывается через for/id,
helper и счётчик — через aria-describedby. Управляющие кнопки имеют type="button".

```html
<div data-brand-field>
  <label class="form-label" for="project">Адрес проекта</label>
  <div class="input-group">
    <span class="input-group-text">https://</span>
    <input class="form-control" id="project" name="project" maxlength="32"
           aria-describedby="projectHelp projectCount">
    <button class="btn btn-secondary" type="button" data-field-clear
            aria-label="Очистить адрес">Очистить</button>
  </div>
  <p class="brand-field-helper" id="projectHelp">Название без протокола</p>
  <output class="brand-field-helper" id="projectCount" for="project" data-field-count></output>
</div>
```

`[data-field-clear]` очищает значение, вызывает input/change и возвращает фокус.
`[data-field-count]` показывает длину в UTF-16 единицах, согласованную с maxlength,
и предел, если он указан. Для программного изменения value вызовите update или input.
Readonly/disabled запрещают изменения. На reset обновляется исходное значение.

Кнопка `[data-field-reveal]` меняет password/text, сохраняет выделение и задаёт aria-pressed.
Внутри используйте `<span data-field-reveal-label>Показать</span>`; aria-controls ведёт к input.
Условия пароля обозначаются `[data-password-rule="length|lower|upper|number"]`:
проверка length использует minlength, буквы — латиницу/кириллицу, number — цифры.
Правила показываются словами «Требуется/Выполнено». Обязательность задают required,
minlength и pattern самого input; сервер проверяет пароль отдельно. Для собственных
правил проект добавляет helper и HTML pattern/обработчик, согласованные с его политикой.
Пример допускает латинские/кириллические буквы; согласуйте условия с политикой своего проекта.

Кнопки `[data-number-step="-1"]` и `[data-number-step="1"]` вызывают нативные stepDown/stepUp.
min/max/step, дробные значения и проверка браузера сохраняются. Кнопки блокируются у
границ и при readonly/disabled; для step="any" они выключены, значение вводится напрямую.
Обе кнопки имеют отдельные доступные подписи.

API: `BrandUI.fields.init(wrapper)`, `get(wrapper)`, `controller.update()`, `destroy()`.
Очистка снимает наблюдателей/события и возвращает исходные type, состояния кнопок,
aria-pressed, helper/rules. Введённое значение не отменяется.

## Date/time

Начните с нативных `input[type="date"]` и `[type="time"]`, `.form-control`, label и
min/max/step. Их picker и язык зависят от браузера/ОС. Date передаёт YYYY-MM-DD,
time — HH:mm (либо секунды при подходящем step), без часового пояса. Локализацию,
часовой пояс, серверные ограничения и значения по умолчанию определяет приложение.
Readonly/disabled/required используют нативное поведение. Отдельный кастомный picker
не входит в этот этап и добавляется только при необходимости проекта.

## Searchable select и multiselect

```html
<label class="form-label" for="city">Город</label>
<select class="form-select" id="city" name="city" data-brand-choice required>
  <option value="">Найдите город</option>
  <option value="moscow">Москва</option>
  <option value="kazan">Казань</option>
</select>
```

Добавление multiple включает несколько значений и удаляемые chips. Исходный select
хранит выбранные options, участвует в FormData/required/reset. При multiple FormData
содержит повторяющийся name; используйте `getAll(name)`. Placeholder — option с пустым
значением, которая не появляется среди вариантов. Disabled options/optgroup и disabled
select/fieldset запрещают выбор/удаление. Нативный select не поддерживает readonly.

Обычный select, поиск, multiselect и autocomplete используют одну стрелку и общий
вид меню: фон темы, одинаковые отступы, акцентный текст/галочка у выбранных пунктов,
тонкая акцентная рамка и фон при наведении или клавиатурном фокусе. Disabled пункты
не получают рамку и не выбираются. Наведение и стрелки обновляют aria-activedescendant,
сохраняя aria-selected и нативное значение до click/Enter. У autocomplete галочка
показывает совпадение с текущим значением, а не непроверенную подсказку.

Ввод фильтрует подписи, ArrowDown/Up выделяют доступные варианты, Enter выбирает,
Escape закрывает, Tab продолжает обычный порядок фокуса. Редактирование текста,
Home/End, выделение и IME сохраняют поведение input. Незавершённый запрос не меняет
значение select; при закрытии возвращается выбранная подпись. Удаление chip возвращает
фокус в поиск. Меню располагается в body, сохраняет токены источника, позицию при
прокрутке сфокусированного поля и выходит из overflow-контейнеров.

API: `BrandUI.choice.init(select, { placeholder? })`, `get(select)`;
`open()`, `close()`, `update()`, `setState('ready|loading|error', message?)`, `getState()`,
`setOptions([{ value, label, disabled? }])`, `destroy()`. Значения вариантов уникальны.
setOptions сохраняет совпавший выбор; если выбранное значение исчезло, действует нативный
выбор select. Для required single оставляйте option с пустым значением в новом наборе.
После программного изменения value/selected вызовите update или отправьте change.
После изменения данных приложения может потребоваться input/change; setOptions их не генерирует.

События: нативные input/change и `brand:choice-change` с detail.values/controller.
Обработчик приложения может использовать AbortController для загрузки вариантов,
вызвать setState('loading'), затем setOptions и setState('ready'). Сеть компонент сам
не использует. Проверяйте актуальность ответа при нескольких запросах и отменяйте
собственную работу при destroy. Ошибка и отсутствие совпадений показываются текстом.

## Autocomplete

Добавьте `[data-brand-autocomplete]` к обычному input. Набор задаётся JSON-атрибутом
data-autocomplete-options либо API; допускаются строки и `{ value, label, disabled? }`.
Пример: `data-autocomplete-options='["HTML","CSS","PHP"]'`.
Можно выбрать подсказку или оставить собственный текст. FormData содержит значение input.
Клавиатура, IME, popup и loading/error совпадают с choice; Escape сохраняет введённый текст.

API: `BrandUI.autocomplete.init(input, { options })`, `get(input)` и те же методы, что у choice.
Событие `brand:autocomplete-select` содержит values/controller; возникают input/change.
Содержимое вариантов вставляется текстом. Обязательность, pattern и длину задаёт input.
Компонент не добавляет ограничение «только из списка» к свободному текстовому полю.

## Файлы

`[data-brand-upload]` содержит доступный нативный input[type=file], ul[data-upload-list]
и элемент `[data-upload-status]`. Используйте `.brand-upload`, `.brand-upload-list`, label
и aria-describedby. Drop дополняет выбор multiple либо заменяет одиночный файл.
accept ограничивает типы/расширения, data-upload-max-size — размер одного файла в байтах,
data-upload-max-files — количество; отсутствующее ограничение не задаёт предел.
Одинаковые name/size/lastModified не дублируются. Отклонённые файлы перечисляются текстом.

Выбор хранится в input.files и попадает в FormData. Список показывает имя, размер и
удаление; PNG/JPEG/WebP/GIF/AVIF имеют локальный preview через object URL. SVG/HTML
не встраиваются. Удаление/перерисовка/destroy отзывают URL. Кнопки доступны с клавиатуры,
после удаления фокус переходит к следующей кнопке, предыдущей или input.
Disabled input/fieldset запрещает добавление и удаление; reset очищает выбор.

API: `BrandUI.upload.init(wrapper)`, `get(wrapper)`, `getFiles()` (копия массива),
`add(files)` (добавить), `remove(index)`, `clear()`, `destroy()`.
События: input/change и `brand:files-change` с detail.files/controller. Компонент не
отправляет файлы и не читает текст их содержимого. Приложение выполняет загрузку,
индикаторы прогресса и обязательную серверную проверку формата/размера/содержимого.
При отсутствии DataTransfer изменение списка недоступно; сообщение просит выбрать
файлы заново нативным picker. Очистка UI сохраняет текущий выбор input.files.

## Пошаговая форма

Добавьте к form атрибуты data-brand-form, data-brand-stepper и novalidate; подключите
ui-kit-forms.js перед ui-kit-inputs.js. Шаги — `[data-step-panel]`, их подписи —
`[data-step-indicator]`; текущая получает aria-current="step". У каждого шага
`[data-step-heading]` имеет tabindex="-1" для фокуса после перехода.
Кнопки `[data-step-prev]` и `[data-step-next]` имеют type="button"; итоговая
`[data-step-submit]` — type="submit". Неактивные панели hidden/inert, их поля временно
disabled. На итоговом шаге все исходно доступные поля включены для полного FormData.
Предыдущие шаги должны быть заполнены; поле с ошибкой получает фокус. Enter на
промежуточном шаге ведёт дальше. Reset возвращает первый шаг и исходные значения.
Назад сохраняет ввод; при loading переходы блокируются.

Необязательная `[data-step-summary]` показывает значения FormData текстом, исключая
password/hidden, поля с кнопкой раскрытия пароля и `[data-step-private]`. Такие поля
продолжают входить в FormData отправки. Для собственного итога используйте блок без
этого атрибута. Файлы показываются только по имени.
Обработчик отправки подключается через общий BrandUI.forms API; демонстрация завершает
проверку локально. Перед реальной отправкой validate проверяет все шаги.

API: `BrandUI.stepper.init(form)`, `get(form)`, `go(index)` (индекс от нуля), `next()`,
`previous()`, `update()`, `getState()` ({ index, total }), `destroy()`.
`brand:step-change` содержит index/total/controller. Для AJAX-полей вызовите update;
новые панели требуют destroy/init. Очистка возвращает исходные hidden/inert/disabled,
aria-invalid, подписи текущего шага и состояние кнопок.

## Состояния и проверка

Пример содержит default/valid/invalid/disabled для input/select/checkbox/radio/switch/range,
readonly текст и нативные focus/hover/checked. Bootstrap классы is-valid/is-invalid
дополняются aria-invalid и видимым текстом ошибки; для рабочих форм связывайте сообщение
через aria-describedby. Required проверяется общим модулем форм. Не полагайтесь только
на цвет; disabled исключает поле из FormData, readonly сохраняет его значение.
Нативный range всегда ограничен min/max; внешняя ошибка обозначается aria-invalid/helper.

Клавиатура и семантика опираются на [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/),
работа с файлами — на [MDN: input file](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file).
Это не заменяет фактические проверки с assistive technology. Chrome проверяется
автоматически; Firefox/Safari/реальные устройства/screen reader пока не подтверждены.

Multiselect ограничивает видимые теги тремя; `data-choice-max-tags`/`maxTags`
задаёт предел (0 — все), FormData сохраняет весь выбор. Native select,
visualViewport и touch-контракт — [mobile.md](mobile.md).
