# Галерея и lightbox

Нужны Bootstrap CSS/JS, Lucide, tokens.css, ui-kit.css и ui-kit.js.
[Автономный пример](../examples/overlays.html) включает дополнительные инструменты.

```html
<a href="images/photo.webp" data-lightbox data-lightbox-group="portfolio"
   data-lightbox-caption="Подпись изображения"
   data-lightbox-zoom="true" data-lightbox-fullscreen="true"
   data-lightbox-thumbnails="true" data-lightbox-gestures="true"
   aria-label="Увеличить: Подпись изображения">
  <img src="images/photo.webp" alt="Подпись изображения">
</a>
```

По умолчанию lightbox показывает изображение, подпись, счётчик, оригинал и переходы.
Атрибуты zoom/fullscreen/thumbnails/gestures опциональны: пустое значение и true
включают возможность, false выключает. Настройки берутся из ссылки открытия для
всей группы. Миниатюра использует src вложенного img, иначе href; группы различаются
data-lightbox-group. Имена группы и подписи передавайте через безопасный DOM/экранирование HTML.

```js
BrandUI.lightbox.configure({ zoom: true, maxZoom: 4 }); // будущие открытия
BrandUI.lightbox.open(anchor, { thumbnails: true }); // override одного открытия
BrandUI.lightbox.getState(); // index (с нуля), total, zoom, fullscreen, open
BrandUI.lightbox.close();
await BrandUI.lightbox.destroy();
```

Масштаб меняется от 100% до maxZoom (ограничен 1–8) с шагом 50%. При смене кадра и
закрытии масштаб сбрасывается. Кнопки имеют подписи; Tab входит в область изображения.
В этой области +/− меняют масштаб, 0 сбрасывает, стрелки перемещают увеличенный кадр.
При 100% стрелки Left/Right переключают кадры. Миниатюры имеют один Tab-stop,
Left/Right/Home/End выбирают кадр и перемещают фокус. Escape закрывает просмотр,
Bootstrap удерживает фокус внутри modal, после закрытия возвращается ссылка открытия.

На 100% touch-action:pan-y pinch-zoom сохраняет вертикальный жест и масштаб страницы.
Горизонтальный свайп от 60 px, преобладающий над вертикальным, переключает кадр.
Мультитач и pointercancel не переключают кадры. При zoom>100% жест перемещает
изображение в ограниченных границах, touch-action:none применяется только к сцене.
Отдельный pinch для увеличения изображения не реализован: используйте доступные
кнопки; native pinch страницы работает при 100%. Мышь перемещает увеличенный кадр.

Полный экран запускается только действием пользователя через Fullscreen API.
Кнопка отключена при отсутствии поддержки/разрешения; отказ отображает сообщение.
Закрытие/destroy выходит из fullscreen. Проверен реальный вход/выход в изолированном
Chrome; Safari/iOS и встроенные webview пока не проверены. Скролл, масштаб, миниатюры
и keyboard доступны независимо от fullscreen.

Загрузка показывает status, ошибка — alert и скрывает предыдущий кадр. Быстрые
переходы игнорируют устаревшую загрузку. Reduced motion отключает анимацию перехода.
Портал копирует токены и тему ссылки открытия, включая вложенную тему.
События brand:lightbox-change, brand:lightbox-zoom и brand:lightbox-fullscreen всплывают
из диалога; detail соответствует getState. Scoped destroy очищает viewer, когда
очищается контейнер ссылки открытия; глобальный destroy также убирает подписки,
backdrop, загрузку и временные кадры.
