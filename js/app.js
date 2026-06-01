/* ═══════════════════════════════════════
   APP — init, PWA install/update, wiring
═══════════════════════════════════════ */
let deferredPrompt = null;

/* capture install prompt early (often fires before load) */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (!state.installedHint) { const b = el('install-banner'); if (b) b.classList.remove('hidden'); }
});
window.addEventListener('appinstalled', () => { state.installedHint = true; save(); const b = el('install-banner'); if (b) b.classList.add('hidden'); });

/* re-render every data-driven view (cheap; all views live in the DOM) */
function rerender() {
  renderDashboard();
  renderExpenses();
  renderSubs();
  renderGoals();
  renderBudgets();
  renderIncome();
}

let _inited = false;
function initApp() {
  if (_inited) return; _inited = true;

  applyTheme();
  applyTranslations(document);
  updateCurrencyPrefixes();
  processRecurring();
  rerender();
  renderCalc();
  detectInstall();
  registerSW();

  // backdrop click closes modal
  const ov = el('modal-overlay');
  if (ov) ov.addEventListener('click', e => { if (e.target.id === 'modal-overlay') closeModal(); });

  // deep-link via #hash (PWA shortcuts)
  const h = (location.hash || '').replace('#', '');
  if (h && el('view-' + h)) navTo(h);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();

/* ── PWA install ── */
function detectInstall() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone || state.installedHint) return;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) { const b = el('ios-install'); if (b) b.classList.remove('hidden'); }
}

/* ── service worker + update flow ── */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          const b = el('update-banner'); if (b) b.classList.remove('hidden');
        }
      });
    });
  }).catch(() => {});
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return; refreshing = true; location.reload();
  });
}

registerActions({
  installPWA: () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(r => { if (r.outcome === 'accepted') { const b = el('install-banner'); if (b) b.classList.add('hidden'); state.installedHint = true; save(); } });
  },
  dismissInstall: () => { const b = el('install-banner'); if (b) b.classList.add('hidden'); state.installedHint = true; save(); },
  dismissIos: () => { const b = el('ios-install'); if (b) b.classList.add('hidden'); },
  applyUpdate: () => {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      else location.reload();
    });
  }
});
