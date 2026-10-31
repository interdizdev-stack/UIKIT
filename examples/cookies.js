(function () {
  'use strict';
  const variant = new URLSearchParams(location.search).get('variant');
  const host = document.getElementById('cookieHost');
  host.innerHTML = BrandUI.cookies.markup({ id: 'exampleCookies', variant: ['bar', 'corner', 'modal'].includes(variant) ? variant : 'bar', policyUrl: '#privacy', storageKey: 'brand-cookie-example' });
  const controller = BrandUI.cookies.init(host.firstElementChild, { onChange: function (consent, detail) {
    document.getElementById('consentStatus').textContent = 'Яндекс Метрика: ' + (consent.metrica ? 'разрешена' : 'выключена') + (detail.storageAvailable ? '' : '. Браузер не разрешил сохранить выбор.');
  } });
  document.getElementById('openCookies').addEventListener('click', function () { controller.settings(); });
  BrandUI.init();
})();
