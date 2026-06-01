/* ═══════════════════════════════════════
   BUDGETS — per-category limits + alerts
═══════════════════════════════════════ */
function categorySpent(key) {
  const now = new Date();
  const byCat = spentByCategory(now.getFullYear(), now.getMonth());
  let v = byCat[key] || 0;
  if (key === 'subscriptions') v += getSubsTotal();
  return v;
}

function budgetRowHTML(key) {
  const limit = state.budgets[key];
  const spent = categorySpent(key);
  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const cls = pct >= 100 ? 'over' : pct >= 90 ? 'warn' : '';
  const leftTxt = spent <= limit
    ? t('budget_left') + ': ' + fmtCur(limit - spent)
    : t('budget_over') + ' ' + fmtCur(spent - limit);
  return `
  <div class="budget-row">
    <div class="budget-top">
      <div class="budget-name"><span>${getCategoryEmoji(key)}</span> ${escapeHtml(getCategoryLabel(key))}</div>
      <div class="item-actions">
        <button class="icon-btn" data-act="budgetEdit" data-cat="${key}" aria-label="${t('btn_edit')}">✏️</button>
        <button class="icon-btn danger" data-act="budgetRemove" data-cat="${key}" aria-label="${t('btn_delete')}">🗑</button>
      </div>
    </div>
    <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${Math.min(100, pct)}%"></div></div>
    <div class="budget-vals flex-between mt-8">
      <span><strong>${fmtCur(spent)}</strong> ${t('budget_of')} ${fmtCur(limit)}</span>
      <span class="${pct >= 100 ? 'text-rose' : pct >= 90 ? 'text-amber' : 'text-2'}">${escapeHtml(leftTxt)}</span>
    </div>
  </div>`;
}

function renderBudgets() {
  const list = el('budgets-list');
  const empty = el('budgets-empty');
  if (!list) return;
  const keys = Object.keys(state.budgets).filter(k => getCategories().some(c => c.key === k));
  if (keys.length === 0) { list.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  // sort by usage descending
  keys.sort((a, b) => (categorySpent(b) / state.budgets[b]) - (categorySpent(a) / state.budgets[a]));
  list.innerHTML = keys.map(budgetRowHTML).join('');
}

function openBudgetModal(catKey) {
  openModal(`
    <div class="modal-title">${t('title_set_budget')}</div>
    <div class="input-group">
      <label class="input-label" for="budget-cat">🏷️ <span>${t('label_category')}</span></label>
      <select id="budget-cat">${catOptions(catKey || getCategories()[0].key)}</select>
    </div>
    <div class="input-group">
      <label class="input-label" for="budget-limit">📊 <span>${t('label_budget_limit')}</span></label>
      <div class="input-wrap"><span class="input-prefix">${state.currency}</span>
        <input type="text" id="budget-limit" inputmode="decimal" placeholder="300" value="${catKey && state.budgets[catKey] ? state.budgets[catKey] : ''}"></div>
    </div>
    <button class="btn btn-primary mt-8" data-act="budgetSave">${t('btn_save')}</button>
  `);
}

function saveBudget() {
  const cat = el('budget-cat').value;
  const limit = round2(Math.abs(toNumber(el('budget-limit').value)));
  if (limit <= 0) { showToast(t('err_fields'), 'error'); return; }
  state.budgets[cat] = limit;
  save(); closeModal(); rerender(); showToast(t('toast_budget_saved'), 'success'); haptic();
}

function removeBudget(cat) {
  delete state.budgets[cat];
  save(); rerender(); showToast(t('toast_budget_removed')); haptic(12);
}

/* alert after an expense is added */
function checkBudget(category) {
  const limit = state.budgets[category];
  if (!limit) return;
  const spent = categorySpent(category);
  const pct = Math.round((spent / limit) * 100);
  const label = getCategoryLabel(category);
  if (spent > limit) showToast(t('warn_budget_over', { cat: label }), 'error');
  else if (pct >= 90) showToast(t('warn_budget_near', { cat: label, pct }), 'warn');
}

registerActions({
  budgetAdd: () => openBudgetModal(),
  budgetEdit: (el) => openBudgetModal(el.getAttribute('data-cat')),
  budgetRemove: (el) => removeBudget(el.getAttribute('data-cat')),
  budgetSave: () => saveBudget()
});
