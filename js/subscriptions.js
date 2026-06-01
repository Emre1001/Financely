/* ═══════════════════════════════════════
   SUBSCRIPTIONS (ABOS)
═══════════════════════════════════════ */
function nextBilling(day) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  let ty = y, tm = m;
  if (Math.min(day, daysInMonth(y, m)) < today) { tm = (m + 1) % 12; ty = m === 11 ? y + 1 : y; }
  const dd = Math.min(day, daysInMonth(ty, tm));
  return new Date(ty, tm, dd);
}
function nextBillingStr(day) { return nextBilling(day).toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short' }); }

function subItemHTML(s) {
  const cat = getCategory(s.category);
  const active = s.active !== false;
  const sub = active ? t('next_billing', { date: nextBillingStr(s.billingDay) }) : t('paused');
  return `
  <div class="list-item" style="${active ? '' : 'opacity:.55'}">
    <div class="item-icon" style="background:${cat.color}22; color:${cat.color}">${cat.emoji}</div>
    <div class="item-info">
      <div class="item-name">${escapeHtml(s.name)}</div>
      <div class="item-cat">${escapeHtml(sub)}</div>
    </div>
    <div class="item-right"><div class="item-amount text-rose">−${fmtCur(s.amount)}</div></div>
    <div class="item-actions">
      <div class="toggle ${active ? 'on' : ''}" data-act="subToggle" data-id="${s.id}" role="switch" aria-checked="${active}" aria-label="${t('label_active')}" tabindex="0"></div>
      <button class="icon-btn" data-act="subEdit" data-id="${s.id}" aria-label="${t('btn_edit')}">✏️</button>
      <button class="icon-btn danger" data-act="subDelete" data-id="${s.id}" aria-label="${t('btn_delete')}">🗑</button>
    </div>
  </div>`;
}

function renderSubs() {
  const list = el('subs-list');
  const empty = el('subs-empty');
  const totalEl = el('subs-total-val');
  if (!list) return;
  const subs = state.subscriptions || [];
  if (totalEl) totalEl.textContent = fmtCur(getSubsTotal());
  const totalWrap = el('subs-total');
  if (totalWrap) totalWrap.style.display = subs.length ? 'flex' : 'none';

  if (subs.length === 0) { list.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  list.innerHTML = subs.map(subItemHTML).join('');
}

function openSubModal(id) {
  const s = id ? state.subscriptions.find(x => x.id === id) : null;
  openModal(`
    <div class="modal-title">${s ? t('title_edit_sub') : t('title_new_sub')}</div>
    <input type="hidden" id="sub-id" value="${s ? s.id : ''}">
    <div class="input-group">
      <label class="input-label" for="sub-name">📝 <span>${t('label_name')}</span></label>
      <input type="text" id="sub-name" class="no-prefix" data-t-ph="ph_sub_name" value="${s ? escapeHtml(s.name) : ''}">
    </div>
    <div class="row-2">
      <div class="input-group">
        <label class="input-label" for="sub-amount">💰 <span>${t('label_monthly_amount')}</span></label>
        <div class="input-wrap"><span class="input-prefix">${state.currency}</span>
          <input type="text" id="sub-amount" inputmode="decimal" placeholder="9,99" value="${s ? s.amount : ''}"></div>
      </div>
      <div class="input-group">
        <label class="input-label" for="sub-day">📅 <span>${t('label_billing_day')}</span></label>
        <input type="number" id="sub-day" class="no-prefix" inputmode="numeric" min="1" max="31" value="${s ? s.billingDay : 1}">
      </div>
    </div>
    <div class="input-group">
      <label class="input-label" for="sub-cat">🏷️ <span>${t('label_category')}</span></label>
      <select id="sub-cat">${catOptions(s ? s.category : 'subscriptions')}</select>
    </div>
    <div class="toggle-row">
      <div class="toggle-label">✅ ${t('label_active')}</div>
      ${toggleHTML('sub-active', s ? s.active !== false : true)}
    </div>
    <button class="btn btn-primary mt-8" data-act="subSave">${t('btn_save')}</button>
  `);
}

function saveSub() {
  const id = el('sub-id').value;
  const name = el('sub-name').value.trim();
  const amount = round2(Math.abs(toNumber(el('sub-amount').value)));
  const category = el('sub-cat').value;
  const billingDay = Math.min(31, Math.max(1, parseInt(el('sub-day').value, 10) || 1));
  const active = readToggle('sub-active');
  if (!name || amount <= 0) { showToast(t('err_name_amount'), 'error'); return; }

  if (id) {
    const s = state.subscriptions.find(x => x.id === id);
    if (s) Object.assign(s, { name, amount, category, billingDay, active });
    showToast(t('toast_sub_updated'), 'success');
  } else {
    state.subscriptions.push({ id: uid(), name, amount, category, billingDay, active });
    showToast(t('toast_sub_added'), 'success');
  }
  save(); closeModal(); rerender(); haptic();
}

function deleteSub(id) {
  confirmDialog(t('confirm_delete_sub'), { danger: true, okLabel: t('btn_delete') }).then(ok => {
    if (!ok) return;
    state.subscriptions = state.subscriptions.filter(s => s.id !== id);
    save(); rerender(); showToast(t('toast_sub_deleted')); haptic(12);
  });
}

function toggleSub(id) {
  const s = state.subscriptions.find(x => x.id === id);
  if (!s) return;
  s.active = s.active === false;
  save(); rerender(); haptic();
}

registerActions({
  subAdd: () => openSubModal(),
  subEdit: (el) => openSubModal(el.getAttribute('data-id')),
  subDelete: (el) => deleteSub(el.getAttribute('data-id')),
  subSave: () => saveSub(),
  subToggle: (el) => toggleSub(el.getAttribute('data-id'))
});
