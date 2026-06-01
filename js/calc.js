/* ═══════════════════════════════════════
   LIFE-COST CALCULATOR
═══════════════════════════════════════ */
const QUICK_ITEMS = [
  { key: 'phone',   price: 1149, icon: '📱' },
  { key: 'stream',  price: 180,  icon: '🎬' },
  { key: 'concert', price: 85,   icon: '🎵' },
  { key: 'laptop',  price: 1499, icon: '💻' },
  { key: 'dinner',  price: 25,   icon: '🍕' },
  { key: 'trip',    price: 450,  icon: '✈️' },
];
const QUICK_NAMES = {
  de: { phone:'High-End Smartphone', stream:'Streaming-Abo / Jahr', concert:'Konzert-Ticket', laptop:'Moderner Laptop', dinner:'Auswärts essen', trip:'Städtetrip' },
  en: { phone:'High-End Smartphone', stream:'Streaming / year', concert:'Concert ticket', laptop:'Modern laptop', dinner:'Eating out', trip:'City trip' },
  tr: { phone:'Üst Düzey Telefon', stream:'Streaming / yıl', concert:'Konser bileti', laptop:'Modern laptop', dinner:'Dışarıda yemek', trip:'Şehir gezisi' },
};

function renderCalc() {
  const wage = el('calc-wage'); if (wage && !wage.value) wage.value = state.hourlyWage || 15;
  const hrs = el('calc-hours'); if (hrs && !hrs.dataset.init) { hrs.value = state.calcHours || 40; hrs.dataset.init = '1'; }
  updateCurrencyPrefixes();
  updateModeUI();
  updateHoursLabel();
  calcLifeCost();
  buildQuickItems();
}

function updateHoursLabel() {
  const h = el('calc-hours'); const lbl = el('hours-val');
  if (h && lbl) lbl.textContent = h.value + t('unit_hour_short');
}

function formatDuration(totalHours, dayHours) {
  const d = Math.floor(totalHours / dayHours);
  const h = Math.floor(totalHours % dayHours);
  const m = Math.round((totalHours - Math.floor(totalHours)) * 60);
  const res = [];
  if (d > 0) res.push(d + t('unit_day_short'));
  if (h > 0) res.push(h + t('unit_hour_short'));
  if (m > 0 && d === 0) res.push(m + t('unit_min_short'));
  return res.length ? res.join(' ') : '0' + t('unit_min_short');
}

function calcLifeCost() {
  updateHoursLabel();
  const price = toNumber(el('calc-price').value);
  const wage = toNumber(el('calc-wage').value);
  const hrs = parseFloat(el('calc-hours').value) || 40;

  if (wage > 0 && wage !== state.hourlyWage) { state.hourlyWage = wage; save(); }
  state.calcHours = hrs;

  const result = el('calc-result');
  if (price <= 0 || wage <= 0) { result.style.display = 'none'; return; }
  result.style.display = 'block';

  const hours = price / wage;
  const doner = price / donerPrice();
  const dailyHrs = hrs / 5;
  const days = hours / dailyHrs;
  const weeks = hours / hrs;

  const mainEl = el('result-main');
  if (state.calcMode === 'doner') {
    mainEl.textContent = doner >= 1
      ? `${doner.toFixed(1)} ${t('unit_doner')}`
      : `${doner.toFixed(2)} ${t('doner_bite')}`;
  } else {
    mainEl.textContent = formatDuration(hours, dailyHrs);
  }

  el('r-hours').textContent = hours.toFixed(1);
  el('r-doner').textContent = doner.toFixed(1);
  el('r-days').textContent = days.toFixed(1);
  el('r-weeks').textContent = weeks.toFixed(2);

  let q;
  if (hours < 1) q = t('q_small');
  else if (hours < 8) q = t('q_think');
  else if (days < 5) q = t('q_warning', { days: days.toFixed(1) });
  else q = t('q_critical');
  el('result-question').textContent = q;
}

function setCalcMode(mode) {
  state.calcMode = mode; save();
  updateModeUI(); calcLifeCost(); haptic();
}
function updateModeUI() {
  const tBtn = el('mode-time'), dBtn = el('mode-doner');
  if (!tBtn || !dBtn) return;
  tBtn.classList.toggle('active', state.calcMode !== 'doner');
  dBtn.classList.toggle('active', state.calcMode === 'doner');
}

function buildQuickItems() {
  const grid = el('quick-grid');
  if (!grid) return;
  const names = QUICK_NAMES[currentLang()] || QUICK_NAMES.de;
  grid.innerHTML = QUICK_ITEMS.map(it => `
    <div class="quick-item" data-act="quickItem" data-price="${it.price}" role="button" tabindex="0">
      <div class="quick-item-icon">${it.icon}</div>
      <div class="quick-item-name">${escapeHtml(names[it.key])}</div>
      <div class="quick-item-price">${fmtCur(it.price)}</div>
    </div>`).join('');
}

function loadQuickItem(price) {
  el('calc-price').value = price;
  calcLifeCost();
  const r = el('calc-result'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

registerActions({
  calcRecalc: () => calcLifeCost(),
  calcMode: (el) => setCalcMode(el.getAttribute('data-mode')),
  quickItem: (el) => loadQuickItem(toNumber(el.getAttribute('data-price'))),
  calcAddExpense: () => {
    const price = toNumber(el('calc-price').value);
    if (price > 0) openExpenseModal(null, price);
  }
});
