/* ═══════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════ */
function lastMonthsTotals(n) {
  const arr = [], now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString(currentLocale(), { month: 'short' }), total: monthTotal(d.getFullYear(), d.getMonth()) });
  }
  return arr;
}

function deltaHTML(cur, prev) {
  if (prev <= 0) return '';
  const diff = cur - prev;
  if (Math.abs(diff) < 0.005) return `<span class="delta delta-flat">0%</span>`;
  const pct = Math.round((Math.abs(diff) / prev) * 100);
  const up = diff > 0;
  return `<span class="delta ${up ? 'delta-up' : 'delta-down'}">${up ? '▲' : '▼'} ${pct}%</span>`;
}

function setGreeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'greet_morning' : h < 18 ? 'greet_day' : 'greet_evening';
  const gv = el('greeting'); if (gv) gv.textContent = t(g);
}

function renderIncomeCard() {
  const v = el('income-val'), eye = el('income-eye');
  if (!v) return;
  const income = getMonthlyIncome();
  v.textContent = income > 0 ? fmtCur(income, 0) : '—';
  if (state.salaryVisible) { v.classList.remove('blurred'); if (eye) eye.textContent = '🙈'; }
  else { v.classList.add('blurred'); if (eye) eye.textContent = '👁️'; }
}
function toggleIncomeVisibility() { state.salaryVisible = !state.salaryVisible; save(); renderIncomeCard(); }

function renderDashboard() {
  setGreeting();
  renderIncomeCard();

  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const subsTotal = getSubsTotal();
  const expTotal = monthTotal(y, m);
  const spent = expTotal + subsTotal;
  const income = getMonthlyIncome();
  const avail = income - spent;

  const spentEl = el('dash-spent'); if (spentEl) spentEl.textContent = fmtCur(spent, 0);
  const availEl = el('dash-avail');
  if (availEl) {
    availEl.textContent = fmtCur(avail, 0);
    availEl.style.color = avail >= 0 ? 'var(--green)' : 'var(--rose)';
  }
  const availSub = el('dash-avail-sub'); if (availSub) availSub.textContent = avail >= 0 ? t('sub_remaining') : t('sub_overspent');

  /* ── donut (no overflow: denominator = max(income, spent)) ── */
  const cats = { ...spentByCategory(y, m) };
  if (subsTotal > 0) cats['subscriptions'] = (cats['subscriptions'] || 0) + subsTotal;
  const entries = Object.entries(cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const spentSum = entries.reduce((s, [, v]) => s + v, 0);
  const total = Math.max(income, spentSum, 1);
  const segments = entries.map(([k, v]) => ({ value: v, color: getCategoryColor(k) }));
  const freeVal = Math.max(0, income - spentSum);
  if (freeVal > 0) segments.push({ value: freeVal, color: '#2ecc71' });

  const mount = el('donut-mount');
  if (mount) mount.innerHTML = Charts.donut(segments, { total });
  const pct = income > 0 ? Math.round((spentSum / income) * 100) : 0;
  const pctEl = el('donut-pct');
  if (pctEl) { pctEl.textContent = income > 0 ? pct + '%' : '—'; pctEl.style.color = pct > 100 ? 'var(--rose)' : ''; }

  const legend = el('donut-legend');
  if (legend) {
    const parts = entries.map(([k, v]) => legendItem(getCategoryColor(k), getCategoryLabel(k), v));
    if (freeVal > 0) parts.push(legendItem('#2ecc71', t('legend_free'), freeVal));
    if (spentSum > income && income > 0) parts.push(legendItem('var(--rose)', t('legend_over'), spentSum - income));
    legend.innerHTML = parts.join('') || `<div class="empty-state" style="padding:16px;"><p>${t('no_data')}</p></div>`;
  }

  /* ── budgets mini ── */
  const bSection = el('dash-budgets-section'), bList = el('dash-budgets');
  const bKeys = Object.keys(state.budgets).filter(k => getCategories().some(c => c.key === k));
  if (bSection && bList) {
    if (bKeys.length === 0) { bSection.style.display = 'none'; bList.innerHTML = ''; }
    else {
      bSection.style.display = '';
      bKeys.sort((a, b) => (categorySpent(b) / state.budgets[b]) - (categorySpent(a) / state.budgets[a]));
      bList.innerHTML = bKeys.slice(0, 3).map(budgetRowHTML).join('');
    }
  }

  /* ── trend ── */
  const series = lastMonthsTotals(6);
  const spark = el('dash-trend-spark');
  if (spark) spark.innerHTML = Charts.sparkline(series.map(s => s.total));
  const cur = series[series.length - 1].total, prev = series.length > 1 ? series[series.length - 2].total : 0;
  const delta = el('dash-trend-delta'); if (delta) delta.innerHTML = deltaHTML(cur, prev);
  const trendVal = el('dash-trend-val'); if (trendVal) trendVal.textContent = fmtCur(cur, 0);

  /* ── recent ── */
  const recent = state.expenses.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const list = el('dash-recent-list');
  if (list) {
    list.innerHTML = recent.length
      ? recent.map(e => expenseItemHTML(e)).join('')
      : `<div class="empty-state"><div class="icon">💸</div><p>${t('empty_expenses')}</p></div>`;
  }
}

function legendItem(color, label, val) {
  return `<div class="donut-leg-item">
    <span class="donut-leg-dot" style="background:${color}"></span>
    <span class="donut-leg-label">${escapeHtml(label)}</span>
    <span class="donut-leg-val">${fmtCur(val, 0)}</span>
  </div>`;
}

registerActions({
  dashEye: () => toggleIncomeVisibility()
});
