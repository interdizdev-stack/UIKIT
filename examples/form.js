(function () {
  'use strict';
  const form = document.getElementById('consultation');
  const result = document.getElementById('result');
  BrandUI.forms.init(form, { onSubmit: function () {
    result.hidden = false;
    return 'Проверка пройдена. Данные никуда не отправлены.';
  } });
  form.addEventListener('input', function () { result.hidden = true; });
  form.addEventListener('reset', function () { result.hidden = true; });
})();
