/* ═══════════════════════════════════════
   INCOME — multiple sources
═══════════════════════════════════════ */
function incomeItemHTML(i) {
  const active = i.active !== false;
  const sub = active ? t('label_payday') + ': ' + i.day + '.' : t('paused');
  return `
  <div class="list-item" style="${active ? '' : 'opacity:.55'}">
    <div class="item-icon" style="background:var(--green-glow); color:var(--green)">💼</div>
    <div class="item-info">
      <div class="item-name">${escapeHtml(i.name)}</div>
      <div class="item-cat">${escapeHtml(sub)}</div>
    </div>
    <div class="item-right"><div class="item-amount text-green">+${fmtCur(i.amount)}</div></div>
    <div class="item-actions">
      <div class="toggle ${active ? 'on' : ''}" data-act="incToggle" data-id="${i.id}" role="switch" aria-checked="${active}" aria-label="${t('label_active')}" tabindex="0"></div>
      <button class="icon-btn" data-act="incEdit" data-id="${i.id}" aria-label="${t('btn_edit')}">✏️</button>
      <button class="icon-btn danger" data-act="incDelete" data-id="${i.id}" aria-label="${t('btn_delete')}">🗑</button>
    </div>
  </div>`;
}

function renderIncome() {
  const list = el('income-list');
  const empty = el('income-empty');
  const totalEl = el('income-total-val');
  if (!list) return;
  const incomes = state.incomes || [];
  if (totalEl) totalEl.textContent = fmtCur(getMonthlyIncome());
  const wrap = el('income-total');
  if (wrap) wrap.style.display = incomes.length ? 'flex' : 'none';

  if (incomes.length === 0) { list.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  list.innerHTML = incomes.map(incomeItemHTML).join('');
}

function openIncomeModal(id) {
  const i = id ? state.incomes.find(x => x.id === id) : null;
  openModal(`
    <div class="modal-title">${i ? t('title_edit_income') : t('title_new_income')}</div>
    <input type="hidden" id="inc-id" value="${i ? i.id : ''}">
    <div class="input-group">
      <label class="input-label" for="inc-name">📝 <span>${t('label_name')}</span></label>
      <input type="text" id="inc-name" class="no-prefix" data-t-ph="ph_income_name" value="${i ? escapeHtml(i.name) : ''}">
    </div>
    <div class="row-2">
      <div class="input-group">
        <label class="input-label" for="inc-amount">💰 <span>${t('label_income_amount')}</span></label>
        <div class="input-wrap"><span class="input-prefix">${state.currency}</span>
          <input type="text" id="inc-amount" inputmode="decimal" placeholder="2500" value="${i ? i.amount : ''}"></div>
      </div>
      <div class="input-group">
        <label class="input-label" for="inc-day">📅 <span>${t('label_payday')}</span></label>
        <input type="number" id="inc-day" class="no-prefix" inputmode="numeric" min="1" max="31" value="${i ? i.day : 1}">
      </div>
    </div>
    <div class="toggle-row">
      <div class="toggle-label">✅ ${t('label_active')}</div>
      ${toggleHTML('inc-active', i ? i.active !== false : true)}
    </div>
    <button class="btn btn-primary mt-8" data-act="incSave">${t('btn_save')}</button>
  `);
}

function saveIncome() {
  const id = el('inc-id').value;
  const name = el('inc-name').value.trim();
  const amount = round2(Math.abs(toNumber(el('inc-amount').value)));
  const day = Math.min(31, Math.max(1, parseInt(el('inc-day').value, 10) || 1));
  const active = readToggle('inc-active');
  if (!name || amount <= 0) { showToast(t('err_name_amount'), 'error'); return; }

  if (id) {
    const i = state.incomes.find(x => x.id === id);
    if (i) Object.assign(i, { name, amount, day, active });
    showToast(t('toast_income_updated'), 'success');
  } else {
    state.incomes.push({ id: uid(), name, amount, day, active });
    showToast(t('toast_income_added'), 'success');
  }
  save(); closeModal(); rerender(); haptic();
}

function deleteIncome(id) {
  confirmDialog(t('confirm_delete_income'), { danger: true, okLabel: t('btn_delete') }).then(ok => {
    if (!ok) return;
    state.incomes = state.incomes.filter(i => i.id !== id);
    save(); rerender(); showToast(t('toast_income_deleted')); haptic(12);
  });
}

function toggleIncome(id) {
  const i = state.incomes.find(x => x.id === id);
  if (!i) return;
  i.active = i.active === false;
  save(); rerender(); haptic();
}

registerActions({
  incAdd: () => openIncomeModal(),
  incEdit: (el) => openIncomeModal(el.getAttribute('data-id')),
  incDelete: (el) => deleteIncome(el.getAttribute('data-id')),
  incSave: () => saveIncome(),
  incToggle: (el) => toggleIncome(el.getAttribute('data-id'))
});
