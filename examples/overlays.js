(function () {
  'use strict';
  const ids = { message: 'exampleMessageModal', confirm: 'exampleConfirmModal', form: 'exampleFormModal' };
  const titles = { message: 'Информационное окно', confirm: 'Подтверждение действия', form: 'Форма в модальном окне' };

  function modalMarkup(kind) {
    const id = ids[kind];
    const header = '<div class="modal-header"><h2 class="modal-title" id="' + id + 'Title">' + titles[kind] + '</h2><button class="btn btn-ghost btn-icon" type="button" data-bs-dismiss="modal" aria-label="Закрыть окно"><i data-lucide="x"></i></button></div>';
    let content;
    if (kind === 'message') {
      content = '<div class="modal-body"><p class="mb-0">Модальное окно помогает показать важную информацию, сохранив текущую страницу.</p></div><div class="modal-footer"><button class="btn btn-primary" type="button" data-bs-dismiss="modal">Понятно<i data-lucide="check"></i></button></div>';
    } else if (kind === 'confirm') {
      content = '<div class="modal-body"><p class="mb-0">Сохранить изменения? Вы можете подтвердить действие или вернуться к редактированию.</p></div><div class="modal-footer"><button class="btn btn-secondary" type="button" data-bs-dismiss="modal">Отмена</button><button class="btn btn-primary" type="button" data-bs-dismiss="modal" data-demo-modal-confirm>Подтвердить<i data-lucide="check"></i></button></div>';
    } else {
      content = '<form class="brand-modal-form" data-demo-modal-form data-brand-form novalidate><div class="modal-body">' +
        '<div class="form-field"><label class="form-label" for="' + id + 'Name">Имя</label><input class="form-control" id="' + id + 'Name" name="name" autocomplete="given-name" placeholder="Ваше имя" minlength="2" required aria-describedby="' + id + 'NameError"><div class="invalid-feedback" id="' + id + 'NameError">Укажите имя, минимум 2 символа.</div></div>' +
        '<div class="form-field"><label class="form-label" for="' + id + 'Phone">Телефон</label><input class="form-control" type="tel" data-tel-input inputmode="tel" id="' + id + 'Phone" name="phone" autocomplete="tel" placeholder="+7 (900) 000-00-00" required pattern="(?:\\+7|8) \\([0-9]{3}\\) [0-9]{3}-[0-9]{2}-[0-9]{2}|\\+[0-9]{7,16}" aria-describedby="' + id + 'PhoneError"><div class="invalid-feedback" id="' + id + 'PhoneError">Укажите корректный номер телефона.</div></div>' +
        '<div class="form-field"><label class="form-label" for="' + id + 'Time">Удобное время</label><select class="form-select" id="' + id + 'Time" name="time" required aria-describedby="' + id + 'TimeError"><option value="">Выберите время</option><option>10:00–12:00</option><option>12:00–15:00</option><option>15:00–18:00</option></select><div class="invalid-feedback" id="' + id + 'TimeError">Выберите удобное время.</div></div>' +
        '<div class="form-check"><input class="form-check-input" type="checkbox" id="' + id + 'Consent" name="consent" required aria-describedby="' + id + 'ConsentError"><label class="form-check-label" for="' + id + 'Consent">Согласен на обработку данных</label><div class="invalid-feedback" id="' + id + 'ConsentError">Подтвердите согласие.</div></div>' +
        '<p class="brand-alert success mt-3 mb-0" data-demo-modal-result role="status" hidden>Проверка пройдена. Это образец формы, данные никуда не отправлены.</p></div>' +
        '<div class="modal-footer"><button class="btn btn-secondary" type="button" data-bs-dismiss="modal">Отмена</button><button class="btn btn-primary brand-cta" type="submit">Отправить заявку<i data-lucide="arrow-right"></i></button></div></form>';
    }
    return '<div class="modal fade" id="' + id + '" tabindex="-1" aria-labelledby="' + id + 'Title" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">' + header + content + '</div></div></div>';
  }

  function modalCode(kind) {
    return '<button class="btn btn-primary" type="button" data-bs-toggle="modal" data-bs-target="#' + ids[kind] + '">Открыть окно</button>\n\n' + modalMarkup(kind).replace(/></g, '>\n<');
  }

  function galleryMarkup(prefix, group) {
    return '<div class="brand-gallery">' + [['01-form.webp', 'Акцент и форма'], ['03-journey.webp', 'Тёмная тема и этапы'], ['06-signs.webp', 'Графика и характер']].map(function (item) {
      return '<figure><a href="' + prefix + item[0] + '" data-lightbox data-lightbox-zoom="true" data-lightbox-fullscreen="true" data-lightbox-thumbnails="true" data-lightbox-gestures="true" data-lightbox-group="' + group + '" data-lightbox-caption="' + item[1] + '" aria-label="Увеличить: ' + item[1] + '"><img src="' + prefix + item[0] + '" alt="' + item[1] + '" loading="lazy"></a><figcaption>' + item[1] + '</figcaption></figure>';
    }).join('') + '</div>';
  }

  window.BrandUIExamples = { modalMarkup: modalMarkup, modalCode: modalCode, galleryMarkup: galleryMarkup };
  const host = document.getElementById('modalExamplesRoot');
  if (host) {
    host.innerHTML = ['message', 'confirm', 'form'].map(modalMarkup).join('');
    BrandUI.init();
  }
  const gallery = document.getElementById('standaloneGallery');
  if (gallery) gallery.innerHTML = galleryMarkup('../assets/gallery/', 'standalone');

  document.addEventListener('click', function (event) {
    if (!event.target.closest('[data-demo-modal-confirm]')) return;
    const status = document.getElementById('overlayExampleStatus');
    if (status) { status.hidden = false; status.textContent = 'Действие подтверждено. Это демонстрационный пример.'; }
  });
  function initModalForms(container) {
    container.querySelectorAll('[data-demo-modal-form]').forEach(function (form) {
      BrandUI.forms.init(form, { onSubmit: function () {
        form.querySelector('[data-demo-modal-result]').hidden = false;
        return 'Проверка пройдена. Данные никуда не отправлены.';
      } });
      form.addEventListener('input', function () { form.querySelector('[data-demo-modal-result]').hidden = true; });
    });
  }
  window.BrandUIExamples.initModalForms = initModalForms;
  if (host) { BrandUI.init(host); initModalForms(host); }
})();
