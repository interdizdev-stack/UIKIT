# Обратная связь и состояния

Модуль ui-kit-feedback.js подключается после ui-kit.js. Стили: Bootstrap CSS,
tokens.css и ui-kit.css; Lucide нужен для иконок примеров. Дополнительные runtime
зависимости модулю не требуются. Пример с двумя темами:
[feedback.html](../examples/feedback.html), работает через сервер и file://.

`BrandUI.init(container)` включает data-brand-toasts, data-brand-alert и data-brand-state.
`await BrandUI.destroy(container)` очищает экземпляры, таймеры и обработчики,
отменяет активные callbacks и восстанавливает исходную разметку/атрибуты.

## Toast: очередь и действия

```js
const notifications = BrandUI.toasts.init(host, { maxVisible: 3, duration: 5000 });
const notification = notifications.push({
  variant: 'success', title: 'Сохранено', message: 'Изменения применены.',
  action: {
    label: 'Отменить',
    handler: async ({ signal }) => {
      await applicationUndo({ signal });
    },
    errorMessage: 'Не удалось отменить изменение. Попробуйте ещё раз.'
  }
});
```

host — пустой HTMLElement, обычно `<div data-brand-toasts></div>`. Опции задаются
при первом init; повторный init возвращает тот же экземпляр. Без host создаётся
общий контейнер в body; `BrandUI.toasts.push(options, host?)` использует этот API напрямую.
Локальный host внутри AJAX-области очищается вместе с областью; общий — при полной
очистке или явном destroy. Вложенная тема host распространяется на уведомления.

Варианты success/error/warning/info; message обязателен. Title/message вставляются
текстом. Error/warning имеют role=alert, success/info — role=status. Фокус при
появлении не меняется. Кнопка закрытия имеет доступную подпись.

Очередь FIFO показывает до maxVisible сообщений (по умолчанию 3). Duration указан
в миллисекундах; 0 оставляет сообщение до закрытия. Уведомление с action по умолчанию
постоянное. Таймер сохраняет остаток при pointer hover, фокусе внутри сообщения и
скрытой вкладке. Для существенных инструкций используйте постоянное сообщение или
inline alert, чтобы они оставались доступными независимо от таймера.

Во время action кнопка блокируется, callback получает AbortSignal. После успеха
сообщение закрывается; ошибка оставляет действие для повтора. Закрытие/destroy
отменяет сигнал, поздний результат игнорируется. Приложение передаёт signal своим
запросам. При закрытии сфокусированного сообщения фокус переходит к следующей
доступной кнопке toast либо возвращается к элементу, с которого сообщение создано.

Методы: `push(options)` → handle { id, close(), getElement() }, `clear()`, `destroy()`,
`getState()` → { visible: [ids], queued: [ids] }. GetElement возвращает null до показа
и после закрытия. `BrandUI.toasts.get(host?)` возвращает существующий экземпляр.
События host: brand:toast-show (id), brand:toast-close (id/reason), отменяемое
brand:toast-action (id/signal). Все содержат controller. Отмена события запрещает callback;
обработчик, которому нужна асинхронная работа, задаётся через action.handler.

## Inline alert и banner

Добавьте data-brand-alert к `.brand-alert.success|info|warning|danger` и
data-alert-kind="success|info|warning|error". `.brand-banner` даёт рамку баннера.
Рядом с содержимым разместите button[type=button][data-alert-dismiss] с aria-label.
Роли выбираются по варианту; предупреждение/ошибка объявляются как alert.
Скрытие сохраняет элемент для повторного показа. Если закрывалась сфокусированная
кнопка, модуль ищет следующий доступный control, затем предыдущий. Необязательный
data-alert-focus задаёт id предпочтительного видимого элемента, например main
с tabindex="-1". При отсутствии подходящего элемента проект задаёт цель фокуса явно.

API: `BrandUI.alerts.init(element)`, `get(element)`, `dismiss()`, `show()`, `destroy()`.
`brand:alert-dismiss` отменяется preventDefault и содержит controller.
Destroy возвращает исходные hidden/role.

## Loader, progress и skeleton

`.brand-loader` показывает кольцо. Добавьте aria-hidden к самому декоративному кольцу,
а рядом — видимый текст в контейнере role=status. `.brand-progress` с одним span
показывает неопределённый прогресс: role=progressbar, aria-label и aria-valuetext,
без aria-valuenow. Известный прогресс использует стандартный Bootstrap `.progress`
и актуальные aria-valuenow/min/max. Одного движения для объяснения загрузки недостаточно.

`.brand-skeleton` — строка, --short — короткая, --media — изображение, --avatar — круг.
`.brand-skeleton-row` задаёт строку списка, `.brand-skeleton-table` — три колонки.
Пример содержит карточку, список и таблицу. Поместите декоративные элементы в
aria-hidden, область данных отметьте aria-busy=true и добавьте краткий status.
После загрузки замените skeleton содержимым и снимите aria-busy. При reduced motion
кольцо, progress и shimmer остаются статичными; текстовое сообщение сохраняется.

## Empty, no-results, error и retry

`.brand-state[data-brand-state]` содержит заголовок data-state-title и сообщение
data-state-message; необязательная кнопка data-state-retry имеет type=button.
Начальное data-state: empty/no-results/error/loading/ready. Пустое состояние объясняет
следующее действие; no-results предлагает изменить запрос; ошибка предлагает повтор.
Иконка декоративная, смысл выражен текстом.

```js
const state = BrandUI.states.init(host, {
  onRetry: async ({ signal }) => {
    const result = await applicationLoad({ signal });
    updateApplicationRows(result);
    return { state: 'ready', title: 'Данные получены', message: 'Список обновлён.' };
  },
  errorMessage: 'Не удалось получить список. Повторите попытку.'
});
```

Loading задаёт aria-busy и блокирует повтор; успешный callback выбирает ready, ошибка
возвращает error. Если кнопка имела фокус, после ошибки он возвращается к ней,
после ready — к заголовку. Переход фокуса учитывает, остался ли пользователь в области;
фокус на другом control не перехватывается. Кнопка скрывается в ready.
Destroy и внешняя смена состояния отменяют pending callback; поздний ответ не меняет UI.
Текст состояния не затрагивает значения окружающей формы.

Методы: `setState(kind, { title?, message? })`, `getState()`, `retry()`,
`configure(options)`, `destroy()`; `BrandUI.states.get(element)` возвращает экземпляр.
События: brand:state-change (state), отменяемое brand:state-retry (signal), оба с controller.
Без onRetry событие уведомляет приложение, состояние остаётся прежним. Signal в
необработанном/отменённом событии завершается сразу; для асинхронной работы используйте onRetry.
Имена состояний проверяются до инициализации. Восстанавливаются тексты, роли,
busy/state, tabindex заголовка и состояния кнопки.

Примеры работают локально, сетевые запросы выполняются приложением. Поведение,
таймеры, клавиатура, reduced motion и обе темы проверяются в Chrome. Другие браузеры,
физические устройства и screen reader пока не отмечены проверенными.

Toast учитывает safe-area, visualViewport и закреплённые нижние блоки;
настройка и ограничения — [mobile.md](mobile.md).
