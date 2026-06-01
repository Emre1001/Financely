/* ═══════════════════════════════════════
   UI — event delegation, modal, toast, confirm, nav, a11y
═══════════════════════════════════════ */
const Actions = {};
function registerActions(map) { Object.assign(Actions, map); }

function el(id) { return document.getElementById(id); }
function haptic(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms || 8); } catch (e) {} } }

/* ── event delegation (replaces inline onclick / oninput) ── */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el) { const a = el.getAttribute('data-act'); if (Actions[a]) { e.preventDefault(); Actions[a](el, e); } }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-oninput]');
  if (el) { const a = el.getAttribute('data-oninput'); if (Actions[a]) Actions[a](el, e); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-onchange]');
  if (el) { const a = el.getAttribute('data-onchange'); if (Actions[a]) Actions[a](el, e); }
});
document.addEventListener('submit', e => {
  const form = e.target.closest('form[data-onsubmit]');
  if (form) { e.preventDefault(); const a = form.getAttribute('data-onsubmit'); if (Actions[a]) Actions[a](form, e); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { const ov = el('modal-overlay'); if (ov && ov.classList.contains('open')) closeModal(); }
  else if (e.key === 'Tab') trapFocus(e);
});

/* ── toast ── */
let _toastTimer;
function showToast(msg, type) {
  const t = el('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = '';
  if (type) t.classList.add('t-' + type);
  // force reflow so re-trigger animates
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ── modal ── */
let _lastFocus = null;
function openModal(html) {
  const ov = el('modal-overlay');
  el('modal-content').innerHTML = html;
  _lastFocus = document.activeElement;
  ov.classList.add('open');
  applyTranslations(el('modal'));
  setTimeout(() => {
    const f = ov.querySelector('input:not([type=hidden]), select, textarea, button');
    if (f && f.tagName === 'INPUT') f.focus();
  }, 280);
}
function closeModal() {
  const ov = el('modal-overlay');
  if (ov) ov.classList.remove('open');
  _resolveConfirm(false);
  if (_lastFocus && _lastFocus.focus) { try { _lastFocus.focus(); } catch (e) {} }
}
function trapFocus(e) {
  const ov = el('modal-overlay');
  if (!ov || !ov.classList.contains('open')) return;
  const f = ov.querySelectorAll('button, input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ── themed confirm dialog (Promise) ── */
let _confirmResolve = null;
function _resolveConfirm(v) { if (_confirmResolve) { const r = _confirmResolve; _confirmResolve = null; r(v); } }
function confirmDialog(message, opts) {
  opts = opts || {};
  return new Promise(resolve => {
    _confirmResolve = resolve;
    openModal(`
      <div class="modal-title">${escapeHtml(opts.title || t('btn_confirm'))}</div>
      <div class="confirm-msg">${escapeHtml(message)}</div>
      <div class="confirm-actions">
        <button class="btn btn-outline" data-act="confirmCancel">${escapeHtml(t('btn_cancel'))}</button>
        <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-act="confirmOk">${escapeHtml(opts.okLabel || t('btn_confirm'))}</button>
      </div>`);
  });
}

/* ── navigation ── */
const NAV_PARENT = { goals:'more', subscriptions:'more', budgets:'more', income:'more', settings:'more' };
function navTo(view) {
  const target = el('view-' + view);
  if (!target) return;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  target.classList.add('active');
  const navKey = NAV_PARENT[view] || view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === navKey));
  const sa = el('scroll-area'); if (sa) sa.scrollTo(0, 0);
  renderView(view);
  haptic(6);
}
function renderView(view) {
  const map = {
    dashboard: 'renderDashboard', stats: 'renderStats', expenses: 'renderExpenses',
    subscriptions: 'renderSubs', goals: 'renderGoals', budgets: 'renderBudgets',
    income: 'renderIncome', more: 'renderMore', calc: 'renderCalc'
  };
  const fn = map[view];
  if (fn && typeof window[fn] === 'function') window[fn]();
}

/* ── reusable switch toggle ── */
function toggleHTML(id, on) {
  return `<div class="toggle ${on ? 'on' : ''}" id="${id}" data-act="toggleSwitch" role="switch" aria-checked="${on ? 'true' : 'false'}" tabindex="0"></div>`;
}
function readToggle(id) { const e = el(id); return !!(e && e.classList.contains('on')); }

registerActions({
  nav: (el) => navTo(el.getAttribute('data-view')),
  closeModal: () => closeModal(),
  confirmOk: () => { _resolveConfirm(true); closeModal(); },
  confirmCancel: () => { _resolveConfirm(false); closeModal(); },
  toggleSwitch: (el) => { el.classList.toggle('on'); el.setAttribute('aria-checked', el.classList.contains('on') ? 'true' : 'false'); haptic(); }
});
