/* ═══════════════════════════════════════
   EXPENSES — CRUD, search, filter, sort, recurring
═══════════════════════════════════════ */
let expFilter = 'all';
let expSearch = '';
let expSort = 'date';

/* category <option> list, reused by subs & budgets too */
function catOptions(selected, onlyKeys) {
  return getCategories()
    .filter(c => !onlyKeys || onlyKeys.includes(c.key))
    .map(c => `<option value="${c.key}" ${c.key === selected ? 'selected' : ''}>${c.emoji} ${escapeHtml(getCategoryLabel(c.key))}</option>`)
    .join('');
}

function renderFilter() {
  const wrap = el('cat-filter');
  if (!wrap) return;
  const cats = ['all', ...getCategories().map(c => c.key)];
  wrap.innerHTML = cats.map(c => {
    const label = c === 'all' ? t('filter_all') : (getCategoryEmoji(c) + ' ' + getCategoryLabel(c));
    return `<button class="cat-btn ${expFilter === c ? 'active' : ''}" data-act="expFilter" data-cat="${c}">${escapeHtml(label)}</button>`;
  }).join('');
}

function expenseItemHTML(e, showActions) {
  const cat = getCategory(e.category);
  const dateStr = new Date(e.date).toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short' });
  const note = e.note ? ' · ' + escapeHtml(e.note) : '';
  return `
  <div class="list-item">
    <div class="item-icon" style="background:${cat.color}22; color:${cat.color}">${cat.emoji}</div>
    <div class="item-info">
      <div class="item-name">${escapeHtml(e.name)}${e.recurring ? ' 🔁' : ''}</div>
      <div class="item-cat">${escapeHtml(getCategoryLabel(e.category))}${note}</div>
    </div>
    <div class="item-right">
      <div class="item-amount text-rose">−${fmtCur(e.amount)}</div>
      <div class="item-date">${dateStr}</div>
    </div>
    ${showActions === false ? '' : `<div class="item-actions">
      <button class="icon-btn" data-act="expEdit" data-id="${e.id}" aria-label="${t('btn_edit')}">✏️</button>
      <button class="icon-btn danger" data-act="expDelete" data-id="${e.id}" aria-label="${t('btn_delete')}">🗑</button>
    </div>`}
  </div>`;
}

function renderExpenses() {
  renderFilter();
  const monthEl = el('expenses-month');
  if (monthEl) monthEl.textContent = new Date().toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' });
  const list = el('expenses-list');
  const empty = el('expenses-empty');
  if (!list) return;

  let items = state.expenses.slice();
  if (expFilter !== 'all') items = items.filter(e => e.category === expFilter);
  if (expSearch) items = items.filter(e =>
    e.name.toLowerCase().includes(expSearch) || (e.note && e.note.toLowerCase().includes(expSearch)));
  items.sort((a, b) => expSort === 'amount' ? b.amount - a.amount : new Date(b.date) - new Date(a.date));

  const hasAny = state.expenses.length > 0;
  const sortBtn = el('exp-sort');
  if (sortBtn) sortBtn.textContent = (expSort === 'amount' ? '💰 ' : '🕐 ') + t(expSort === 'amount' ? 'sort_amount' : 'sort_date');

  if (items.length === 0) {
    list.innerHTML = '';
    if (empty) {
      empty.style.display = 'block';
      empty.querySelector('p').textContent = hasAny ? t('empty_search') : t('empty_expenses');
    }
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = items.map(e => expenseItemHTML(e)).join('');
}

function openExpenseModal(id, prefillPrice) {
  const e = id ? state.expenses.find(x => x.id === id) : null;
  const today = new Date().toISOString().slice(0, 10);
  openModal(`
    <div class="modal-title">${e ? t('title_edit_expense') : t('title_new_expense')}</div>
    <input type="hidden" id="exp-id" value="${e ? e.id : ''}">
    <div class="input-group">
      <label class="input-label" for="exp-name">📝 <span>${t('label_name')}</span></label>
      <input type="text" id="exp-name" class="no-prefix" data-t-ph="ph_expense_name" value="${e ? escapeHtml(e.name) : ''}">
    </div>
    <div class="input-group">
      <label class="input-label" for="exp-amount">💰 <span>${t('label_amount')}</span></label>
      <div class="input-wrap"><span class="input-prefix">${state.currency}</span>
        <input type="text" id="exp-amount" inputmode="decimal" placeholder="0,00" value="${e ? e.amount : (prefillPrice || '')}"></div>
    </div>
    <div class="row-2">
      <div class="input-group">
        <label class="input-label" for="exp-cat">🏷️ <span>${t('label_category')}</span></label>
        <select id="exp-cat">${catOptions(e ? e.category : 'food')}</select>
      </div>
      <div class="input-group">
        <label class="input-label" for="exp-date">📅 <span>${t('label_date')}</span></label>
        <input type="date" id="exp-date" class="no-prefix" value="${e ? e.date : today}">
      </div>
    </div>
    <div class="input-group">
      <label class="input-label" for="exp-note">🗒️ <span>${t('label_note')}</span></label>
      <input type="text" id="exp-note" class="no-prefix" data-t-ph="ph_note" value="${e ? escapeHtml(e.note || '') : ''}">
    </div>
    <div class="toggle-row">
      <div><div class="toggle-label">🔁 ${t('label_recurring')}</div></div>
      ${toggleHTML('exp-recurring', e ? !!e.recurring : false)}
    </div>
    <button class="btn btn-primary mt-8" data-act="expSave">${t('btn_save_expense')}</button>
  `);
}

function saveExpense() {
  const id = el('exp-id').value;
  const name = el('exp-name').value.trim();
  const amount = round2(Math.abs(toNumber(el('exp-amount').value)));
  const category = el('exp-cat').value;
  const date = validDate(el('exp-date').value);
  const note = el('exp-note').value.trim();
  const recurring = readToggle('exp-recurring');
  if (!name || amount <= 0) { showToast(t('err_name_amount'), 'error'); return; }

  if (id) {
    const e = state.expenses.find(x => x.id === id);
    if (e) {
      Object.assign(e, { name, amount, category, date, note, recurring });
      if (recurring && !e.seriesId) e.seriesId = uid();
    }
    showToast(t('toast_expense_updated'), 'success');
  } else {
    const exp = { id: uid(), name, amount, category, date, note, recurring };
    if (recurring) exp.seriesId = uid();
    state.expenses.push(exp);
    showToast(t('toast_expense_saved'), 'success');
  }
  save(); closeModal(); rerender(); haptic(); checkBudget(category);
}

function deleteExpense(id) {
  confirmDialog(t('confirm_delete_expense'), { danger: true, okLabel: t('btn_delete') }).then(ok => {
    if (!ok) return;
    state.expenses = state.expenses.filter(e => e.id !== id);
    save(); rerender(); showToast(t('toast_expense_deleted')); haptic(12);
  });
}

/* auto-fill recurring expenses up to the current month */
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function processRecurring() {
  const now = new Date(), cy = now.getFullYear(), cm = now.getMonth();
  const series = {};
  state.expenses.forEach(e => { if (e.recurring && e.seriesId) (series[e.seriesId] = series[e.seriesId] || []).push(e); });
  let added = 0;
  Object.values(series).forEach(list => {
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
    let latest = list[list.length - 1];
    let guard = 0;
    while (guard++ < 36) {
      const d = new Date(latest.date);
      const ny = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
      const nm = (d.getMonth() + 1) % 12;
      if (ny > cy || (ny === cy && nm > cm)) break;
      const day = Math.min(d.getDate(), daysInMonth(ny, nm));
      const ndate = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      latest = { ...latest, id: uid(), date: ndate };
      state.expenses.push(latest); added++;
    }
  });
  if (added) save();
  return added;
}

function newMonth() {
  confirmDialog(t('salary_arrival_confirm'), { okLabel: t('btn_salary_here') }).then(ok => {
    if (!ok) return;
    const now = new Date();
    state.expenses = state.expenses.filter(e => !isSameMonth(e.date, now.getFullYear(), now.getMonth()));
    save(); rerender(); showToast(t('toast_new_month'), 'success'); haptic(20);
  });
}

registerActions({
  expFilter: (el) => { expFilter = el.getAttribute('data-cat'); renderExpenses(); },
  expSearchInput: (el) => { expSearch = el.value.trim().toLowerCase(); renderExpenses(); },
  expToggleSort: () => { expSort = expSort === 'date' ? 'amount' : 'date'; renderExpenses(); },
  expAdd: () => openExpenseModal(),
  expEdit: (el) => openExpenseModal(el.getAttribute('data-id')),
  expDelete: (el) => deleteExpense(el.getAttribute('data-id')),
  expSave: () => saveExpense(),
  newMonth: () => newMonth()
});
