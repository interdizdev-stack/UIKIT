# Шрифты и иконки

Готовые файлы работают без runtime build и внешнего CDN. Исходные TTF, полный Lucide
и лицензии сохранены. Числа ниже относятся к размерам файлов на диске, до HTTP-сжатия.

| Ресурс | Исходный | Оптимизированный | Снижение |
|---|---:|---:|---:|
| Manrope | 164 700 B TTF | 53 892 B WOFF2 | 67.3% |
| Oswald | 172 088 B TTF | 72 104 B WOFF2 | 58.1% |
| Оба шрифта | 336 788 B | 125 996 B | 62.6% |
| Lucide | 357 796 B | 41 422 B, 108 иконок | 88.4% |

WOFF2 стоит первым в @font-face, TTF остаётся fallback формата. Кодировки, глифы,
метрики, name/fvar/gvar и координаты контуров проверены после декодирования WOFF2.
Кириллица и ось weight сохранены. Chrome фактически загружает два WOFF2 и не запрашивает
TTF в этих сценариях. SHA-256 исходников, выходов и OFL записан в assets/fonts/manifest.json.
Конвертация выполняется [FontTools WOFF2](https://fonttools.readthedocs.io/en/latest/ttLib/woff2.html).

Для повторной конвертации maintainer использует Python с зависимостями из
scripts/requirements-fonts.txt: FontTools 4.66.1 и Brotli 1.2.0. Например, в отдельном
окружении с uv:

```sh
uv run --with fonttools==4.66.1 --with brotli==1.2.0 python scripts/build-fonts.py
uv run --with fonttools==4.66.1 --with brotli==1.2.0 python scripts/build-fonts.py --check
```

Это необязательный инструмент разработки. Обычные verify/release используют уже готовые
файлы и проверяют их хеши; FontTools/Brotli не нужны проекту или браузеру.

`vendor/lucide-core.min.js` содержит определения статично используемых иконок и API
icons/createElement, нужные BrandUI.init. Он не заменяет полный публичный API Lucide.
Подключайте один вариант: subset для известных иконок или lucide.min.js для произвольных
иконок/других функций Lucide. Каталог и раздел иконок используют полный набор;
автономные стандартные примеры — subset. Полный HTML выбранной произвольной иконки
также подключает полный Lucide. Добавив собственное имя иконки, используйте полный файл
либо пересоберите subset с новым литералом в шаблоне.

```sh
node scripts/build-icons.mjs
node scripts/build-icons.mjs --check
```

Генератор читает vendored 0.468.0 и имена из JS/HTML библиотеки и examples; зависимости
npm не нужны. vendor/lucide-core.json содержит список, размеры и SHA-256. ISC-файл
Lucide остаётся рядом. Оптимизация не исключает оригинальный файл из ZIP: экономия
относится к загрузке страницы, а не к сумме всех файлов архива. Шрифты используют
font-display:swap; изображения имеют размеры/lazy, где применимо. Сеть самого проекта,
кэширование/сжатие и реальные Core Web Vitals нужно измерять на его страницах.
