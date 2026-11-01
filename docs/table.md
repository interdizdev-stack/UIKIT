# Таблица данных

Подключение: Bootstrap CSS, tokens.css, ui-kit.css, ui-kit.js и ui-kit-table.js.
Lucide нужен, если переданные DOM-форматтеры используют иконки. Bootstrap JS нужен
для окружающих компонентов страницы, сама таблица не вызывает его API.
[Автономный пример](../examples/table.html) работает через HTTP и file://.

```js
const table = BrandUI.table.init(document.getElementById('projects'), {
  label: 'Проекты',
  rows: [{ id: 1, name: 'Сайт', budget: 100 }],
  columns: [
    { key: 'name', label: 'Название' },
    { key: 'budget', label: 'Бюджет' }
  ],
  pageSize: 5, pageSizes: [5, 10, 20],
  bulkActions: [{
    id: 'publish', label: 'Опубликовать',
    async onAction({ rows, selected, signal }) {
      // Приложение выполняет действие; соблюдайте signal при асинхронной работе.
      return 'Обработано строк: ' + selected.length;
    }
  }],
  async onRetry({ signal }) {
    // Верните массив новых строк; undefined сохраняет текущие данные.
    return [{ id: 1, name: 'Сайт', budget: 100 }];
  }
});
table.select([1]);
table.update({ pageSize: 10 });
table.setState('error', 'Сервис недоступен. Попробуйте ещё раз.');
```

| Свойство | Поведение |
|---|---|
| rows / rowKey | Уникальные ID; rowKey по умолчанию id |
| columns | Уникальные key, label, sortable:false отключает сортировку |
| format(value, row) | Текст или DOM-узел; строки не интерпретируются как HTML |
| filters | Массив {value, label, test(row)} |
| pageSize / pageSizes | Положительные целые; пустой pageSizes скрывает выбор размера |
| selectable / actions | По умолчанию true; checkbox и событие открытия строки |
| bulkActions | Массив уникальных {id, label, onAction}; действия видны при выборе |
| onRetry | Асинхронное восстановление данных с AbortSignal |

Сортировка локальная: числа сравниваются численно, текст — localeCompare с numeric:true.
Поиск просматривает исходные значения колонок. Выбор хранится по ID и сохраняется при
поиске, фильтрах, сортировке, смене страницы и размера. Checkbox заголовка выбирает
только текущую страницу; отдельная кнопка выбирает все найденные строки. Обновление
данных удаляет из выбора только исчезнувшие ID, с событием selection. Пустой набор
показывает «Данных пока нет», пустая выборка поиска — «Строки не найдены».

`getState()` возвращает query, filter, page, pageSize, sort (key или null), ascending,
selected (строковые ID), total (найденные строки), status, message, bulkBusy.
`update(rows)` либо `update({rows, query, filter, page, pageSize})` валидирует вход до
изменения данных. `select(ids, {replace:true})` заменяет выбор, без replace дополняет.
`clearSelection()` снимает выбор. `setState('ready'|'loading'|'error', message)` сохраняет
кэш строк; загрузка и ошибка показываются вместо таблицы. `await destroy()` отменяет
запрос и возвращает исходное содержимое host. Scoped BrandUI.destroy(container) делает то же.

События всплывают из host и содержат controller: brand:table-change (всё состояние),
brand:table-selection (selected), brand:table-action (id, row). Отменяемые
brand:table-bulk (action, selected, rows, signal) и brand:table-retry (selected, rows, signal)
предшествуют callback. preventDefault отменяет callback. Если callback не задан,
уведомление не запускает loading: приложение управляет состоянием через API.
Callback получает снимок выбора; повторное нажатие блокируется. Ошибка bulk показывает
alert и сохраняет выбор для повторного запуска. Обновление, setState и destroy отменяют
незавершённую работу; поздний результат игнорируется. Модуль сам не отправляет запросы.

В режиме по умолчанию на мобильном сохраняется семантическая таблица. Подписанная область role=region имеет
Tab-фокус и горизонтальную прокрутку, документ остаётся в границах экрана. Toolbar,
массовые действия и footer переносятся. Для небольших независимых записей выбирайте
[список или карточки](../examples/components.html); не дублируйте таблицу скрытой копией
карточек с теми же ID. Клавиатура: Tab к действиям, Space к checkbox, Enter к сортировке,
страницам и retry. При перерисовке сохраняется фокус строки/страницы; снятие выбора
возвращает фокус к поиску. После async retry фокус возвращается, если пользователь
оставался в компоненте; переход к внешнему control не перехватывается.

Дополнительные layout table/list/auto, видимость колонок, sticky/pin и компактная
пагинация описаны в [мобильных сценариях](mobile.md). Пример демонстрирует общий
выбор, фильтры и просмотр записи при смене ширины контейнера.

Пустая таблица показывает сообщение по ширине видимого контейнера и скрывает
строку заголовков. Для чтения «Данных пока нет» или «Строки не найдены»
горизонтальная прокрутка не требуется; фильтры, счётчик и пагинация сохраняются.
