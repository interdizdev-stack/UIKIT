# Базовые композиции

[Автономный пример](../examples/patterns.html) показывает page header/toolbar,
группы действий, segmented control, карточки выбора, сводку ошибок, description list,
copy и filter bar. Статичная разметка требует Bootstrap CSS, tokens.css и ui-kit.css.
Dropdown использует Bootstrap Bundle; иконки — локальный Lucide и ядро.
Поведение copy/filters подключается опциональным ui-kit-patterns.js после ui-kit.js.
Validation/summary/server errors предоставляет существующий ui-kit-forms.js.

## Заголовки и действия

`brand-page-header` содержит `brand-page-header-copy` и `brand-page-actions`.
Для рабочего заголовка используйте `brand-page-title`, для панели — `brand-panel-title`.
Toolbar группирует controls через `brand-toolbar`; `brand-toolbar-spacer` отводит
вторичные действия к краю. На узком экране группы переносятся.
Короткие controls занимают ширину содержимого и остаются в строке, пока помещаются;
toolbar не растягивает их автоматически. Для подписанных настроек используйте
`brand-control-row`; свободный текст получает ширину по ожидаемым данным.

Обычный `btn-group` имеет role=group и доступную подпись. Split action состоит из
основной кнопки и отдельной подписанной кнопки Dropdown. Segmented использует
fieldset/legend и radio одной группы: нативные Arrow keys, Space и FormData сохраняются.
Он меняет одно значение. Для переключения страниц/панелей берите tabs или ссылки.

## Группы выбора

`brand-fieldset` объединяет controls через legend. `brand-choice-card` — настоящий
label с checkbox/radio и `brand-choice-card-copy`; подпись, описание, disabled,
checked и focus остаются нативными. Для radio задавайте один name и разные value.
Карточка выбора не должна содержать вторую ссылку или кнопку внутри label.

## Сводка и серверные ошибки

```html
<form data-brand-form novalidate>
  <div class="brand-error-summary" data-form-errors hidden></div>
  <label class="form-label" for="email">Email</label>
  <input class="form-control" id="email" name="email" type="email" required>
  <button class="btn btn-primary" type="submit">Сохранить</button>
</form>
```

После неудачной проверки summary получает фокус и ссылки на ошибочные controls.
Переход по ссылке фокусирует нативное поле или его enhanced trigger. Без summary
сохраняется прежний переход к первому ошибочному полю. При редактировании summary
обновляется без захвата фокуса. Цвет ошибки дополняется текстом.

`BrandUI.forms.get(form).setErrors({email:'Адрес уже используется.'}, message?)`
добавляет custom validity и inline feedback, сохраняя значения. Ключи — имена
активных валидируемых полей; неизвестный ключ/нестроковое сообщение отклоняется
до изменения формы. Редактирование поля снимает его серверную ошибку и возвращает
исходный client feedback. `setErrors({})` снимает серверные ошибки.

Асинхронный onSubmit может вернуть `{errors:{email:'...'},message:'Проверьте поля'}`.
Непустой errors переводит форму в invalid вместо success. Пустой объект errors
обрабатывается как обычный успешный результат. Callback получает прежние FormData
и AbortSignal; поздний результат после отмены/cleanup игнорируется.
Destroy восстанавливает исходные feedback/ARIA, снимает собственный custom validity
и удаляет сгенерированные ID; пользовательские значения остаются.

## Просмотр данных и статусы

`dl.brand-data-list` содержит div с dt/dd. Значение может включать
`brand-data-value`, ссылку, `brand-code`, статус или copy button. Длинные значения
переносятся; пустое необязательное значение обозначайте словами по смыслу.

Badge обозначает статус, tag — статичную категорию, chip — выбираемый/удаляемый
фильтр. `brand-count` — нейтральный счётчик; при сокращении числа задайте полное
значение через доступную подпись. Статусы должны иметь понятный текст.

## Копирование

```html
<code id="recordId">PRJ-2048</code>
<button class="btn btn-secondary" type="button" data-brand-copy
        data-copy-target="#recordId">Копировать ID</button>
```

Либо `data-brand-copy="текст"` задаёт строку напрямую. API:
`BrandUI.copy.init(button)`, `get(button)`, `controller.copy()` → Promise<boolean>,
`destroy()`. Появляется inline status; `data-copy-state` имеет pending/success/error.
Повторный запуск блокируется до результата. Событие `brand:copy` содержит ok,
text при успехе или error, controller. При отказе Clipboard источник остаётся
доступным для ручного выделения. Fallback использует execCommand только без
Clipboard API. Destroy восстанавливает disabled/busy/state и игнорирует поздний ответ.

## Фильтры

`form.brand-filter-bar[data-brand-filters]` содержит именованные controls,
submit, необязательные data-filter-count, data-filter-active и data-filter-dirty.
Для очищаемого single select оставляйте option с пустым value.
`brand-filter-fields` располагает группы «подпись + поле» по содержимому, с переносом
по доступной ширине контейнера. Равные широкие колонки для коротких фильтров не нужны.

- Изменение поля меняет draft; Apply (submit) фиксирует values и вызывает
  `brand:filters-change`. Приложение обновляет данные и их loading/error/empty.
- `data-filter-cancel` возвращает применённые значения без события изменения.
- `data-filter-reset` очищает фильтры и применяет пустой набор. Нативный reset
  возвращает defaultValue/defaultChecked и применяет этот набор после reset.
- Удаление активного chip очищает соответствующий фильтр и применяет результат.

API: `BrandUI.filters.init(form,{onChange?})`, `get(form)`, `apply()`, `cancel()`,
`clear()`, `update()`, `getState()`, `destroy()`. Состояние содержит values/draft
(объекты массивов строк), activeCount (число непустых имён) и dirty. Пустые и
состоящие из пробелов значения не применяются. File-поля не являются фильтрами.
Очистка не меняет disabled/readonly controls; применённый readonly-фильтр нельзя
снять chip-кнопкой. В form размещаются только поля фильтров, без служебных hidden данных.
Event/callback содержит состояние и controller. Сеть и URL модуль не меняет.
Не совмещайте data-brand-filters и data-brand-form на одной форме.

Scoped init/destroy поддерживается через BrandUI. Повторная инициализация не
создаёт второй controller или status. Cleanup сохраняет введённые значения и
восстанавливает исходные count/chips/dirty. Смотрите также [API](api.md),
[плотность](foundations.md) и [проверки](testing.md).

`filters.apply({silent:true})` обновляет снимок применённых значений без события
и callback; используется для синхронизации повторно открытой панели с моделью данных.
