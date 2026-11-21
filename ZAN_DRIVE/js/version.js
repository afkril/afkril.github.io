// Fuente única de la versión. Para cambiarla usa: python3 tools/bump_version.py 1.1 "descripción"
const APP_INFO = Object.freeze({
  name: 'JER_DRIVE',
  year: 2026,
  version: '1.3.3',
  build: '2026-11-21'
});
const APP_LABEL = APP_INFO.name + ' ' + APP_INFO.year + ' v' + APP_INFO.version;

(function () {
  // Aviso de versión en esquina inferior (todas las páginas)
  var st = document.createElement('style');
  st.textContent = '.app-ver{position:fixed;right:12px;bottom:8px;z-index:5;font:600 11px/1 "Plus Jakarta Sans",system-ui,sans-serif;'
    + 'color:#5b6b8c;background:rgba(255,255,255,.75);border:1px solid #d6e2f5;border-radius:999px;padding:5px 10px;pointer-events:none;user-select:none}';
  document.head.appendChild(st);
  function mount() {
    var els = document.querySelectorAll('[data-app-version]');
    if (!els.length) {
      var d = document.createElement('div');
      d.className = 'app-ver';
      d.setAttribute('data-app-version', '');
      d.title = 'Compilación ' + APP_INFO.build;
      document.body.appendChild(d);
      els = [d];
    }
    Array.prototype.forEach.call(els, function (e) { e.textContent = APP_LABEL; });
    document.documentElement.setAttribute('data-app-version', APP_INFO.version);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  console.info('%c' + APP_LABEL + ' · ' + APP_INFO.build, 'color:#1456d6;font-weight:700');
})();
