/* ═══════════════════════════════════════
   STATS — charts & insights
═══════════════════════════════════════ */
function renderStats() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const subsTotal = getSubsTotal();
  const cats = { ...spentByCategory(y, m) };
  if (subsTotal > 0) cats['subscriptions'] = (cats['subscriptions'] || 0) + subsTotal;
  const entries = Object.entries(cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  const empty = el('stats-empty');
  const content = el('stats-content');
  const hasData = total > 0 || state.expenses.length > 0;
  if (empty) empty.style.display = hasData ? 'none' : 'block';
  if (content) content.style.display = hasData ? 'block' : 'none';
  if (!hasData) return;

  /* summary */
  const daysElapsed = now.getDate();
  const avg = total / Math.max(1, daysElapsed);
  const biggest = entries[0];
  const prevTotal = monthTotal(y, m - 1 < 0 ? 11 : m - 1) + 0;
  const lastM = new Date(y, m - 1, 1);
  const prev = monthTotal(lastM.getFullYear(), lastM.getMonth());

  setText('stat-total', fmtCur(total, 0));
  setText('stat-avg', fmtCur(avg, 0));
  setText('stat-top', biggest ? getCategoryEmoji(biggest[0]) + ' ' + getCategoryLabel(biggest[0]) : '—');
  const deltaEl = el('stat-delta'); if (deltaEl) deltaEl.innerHTML = deltaHTML(total, prev) || '—';

  /* category bars */
  const catMount = el('chart-cat');
  if (catMount) catMount.innerHTML = Charts.bars(
    entries.map(([k, v]) => ({ label: getCategoryEmoji(k), value: v, color: getCategoryColor(k) })),
    { fmt: v => fmtNum(v) }
  );

  /* 6-month trend line */
  const series = lastMonthsTotals(6);
  const trendMount = el('chart-trend');
  if (trendMount) trendMount.innerHTML = Charts.line(series.map(s => ({ label: s.label, value: s.total })));

  /* income vs expense */
  const income = getMonthlyIncome();
  const ieMount = el('chart-ie');
  if (ieMount) ieMount.innerHTML = Charts.multiBars(
    series.map(s => s.label),
    [
      { color: '#34d399', values: series.map(() => income) },
      { color: '#fb7185', values: series.map(s => s.total) }
    ]
  );
}

function setText(id, txt) { const e = el(id); if (e) e.textContent = txt; }
