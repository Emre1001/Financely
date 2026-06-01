/* ═══════════════════════════════════════
   SAVINGS GOALS
═══════════════════════════════════════ */
function goalCardHTML(g) {
  const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
  const remaining = Math.max(0, g.target - g.saved);
  const done = pct >= 100;
  return `
  <div class="goal-card">
    <div class="goal-header">
      <div style="display:flex; align-items:center; min-width:0;">
        <span class="goal-emoji">${escapeHtml(g.emoji)}</span>
        <div style="min-width:0;">
          <div class="goal-title">${escapeHtml(g.name)}</div>
          <span class="pill ${done ? 'pill-green' : 'pill-purple'}" style="margin-top:4px;">${done ? '✅ ' + t('goal_done') : pct + '%'}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-act="goalEdit" data-id="${g.id}" aria-label="${t('btn_edit')}">✏️</button>
        <button class="icon-btn danger" data-act="goalDelete" data-id="${g.id}" aria-label="${t('btn_delete')}">🗑</button>
      </div>
    </div>
    <div class="goal-amounts">
      <span>${t('goal_saved')}: <strong>${fmtCur(g.saved)}</strong></span>
      <span>${t('goal_remaining')}: <strong>${fmtCur(remaining)}</strong></span>
      <span>${t('goal_target')}: <strong>${fmtCur(g.target)}</strong></span>
    </div>
    <div class="progress-bar"><div class="progress-fill ${done ? '' : ''}" style="width:${pct}%"></div></div>
    <div class="goal-actions">
      <input type="text" inputmode="decimal" class="no-prefix" id="deposit-${g.id}" placeholder="${t('ph_deposit')}" style="flex:1; padding:9px 12px; font-size:14px;">
      <button class="btn btn-primary btn-sm" data-act="goalDeposit" data-id="${g.id}">💰 ${t('btn_deposit')}</button>
    </div>
  </div>`;
}

function renderGoals() {
  const list = el('goals-list');
  const empty = el('goals-empty');
  if (!list) return;
  const totalSaved = state.goals.reduce((s, g) => s + (g.saved || 0), 0);
  const totalTarget = state.goals.reduce((s, g) => s + g.target, 0);
  const sub = el('savings-subtitle');
  if (sub) sub.textContent = state.goals.length ? `${fmtCur(totalSaved)} / ${fmtCur(totalTarget)}` : t('sub_goals');

  if (state.goals.length === 0) { list.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';
  list.innerHTML = state.goals.map(goalCardHTML).join('');
}

function openGoalModal(id) {
  const g = id ? state.goals.find(x => x.id === id) : null;
  openModal(`
    <div class="modal-title">${g ? t('title_edit_goal') : t('title_new_goal')}</div>
    <input type="hidden" id="goal-id" value="${g ? g.id : ''}">
    <div class="row-2">
      <div class="input-group" style="flex:3;">
        <label class="input-label" for="goal-name">🎯 <span>${t('label_goal_name')}</span></label>
        <input type="text" id="goal-name" class="no-prefix" data-t-ph="ph_goal_name" value="${g ? escapeHtml(g.name) : ''}">
      </div>
      <div class="input-group" style="flex:1;">
        <label class="input-label" for="goal-emoji">😀</label>
        <input type="text" id="goal-emoji" class="no-prefix" maxlength="2" placeholder="💻" value="${g ? escapeHtml(g.emoji) : ''}">
      </div>
    </div>
    <div class="input-group">
      <label class="input-label" for="goal-target">💰 <span>${t('label_goal_target')}</span></label>
      <div class="input-wrap"><span class="input-prefix">${state.currency}</span>
        <input type="text" id="goal-target" inputmode="decimal" placeholder="1000" value="${g ? g.target : ''}"></div>
    </div>
    <button class="btn btn-primary mt-8" data-act="goalSave">${t('btn_add')}</button>
  `);
}

function saveGoal() {
  const id = el('goal-id').value;
  const name = el('goal-name').value.trim();
  const emoji = (el('goal-emoji').value.trim() || '🎯').slice(0, 4);
  const target = round2(Math.abs(toNumber(el('goal-target').value)));
  if (!name || target <= 0) { showToast(t('err_name_amount'), 'error'); return; }

  if (id) {
    const g = state.goals.find(x => x.id === id);
    if (g) { g.name = name; g.emoji = emoji; g.target = target; g.saved = Math.min(g.saved, target); }
    showToast(t('toast_goal_updated'), 'success');
  } else {
    state.goals.push({ id: uid(), name, emoji, target, saved: 0 });
    showToast(t('toast_goal_added'), 'success');
  }
  save(); closeModal(); rerender(); haptic();
}

function depositGoal(id) {
  const inp = el('deposit-' + id);
  const amount = round2(Math.abs(toNumber(inp ? inp.value : 0)));
  if (amount <= 0) return;
  const g = state.goals.find(x => x.id === id);
  if (!g) return;
  g.saved = Math.min(g.target, round2(g.saved + amount));
  save(); rerender(); showToast(t('toast_deposited', { amount: fmtCur(amount) }), 'success'); haptic();
}

function deleteGoal(id) {
  confirmDialog(t('confirm_delete_goal'), { danger: true, okLabel: t('btn_delete') }).then(ok => {
    if (!ok) return;
    state.goals = state.goals.filter(g => g.id !== id);
    save(); rerender(); showToast(t('toast_goal_deleted')); haptic(12);
  });
}

registerActions({
  goalAdd: () => openGoalModal(),
  goalEdit: (el) => openGoalModal(el.getAttribute('data-id')),
  goalDelete: (el) => deleteGoal(el.getAttribute('data-id')),
  goalSave: () => saveGoal(),
  goalDeposit: (el) => depositGoal(el.getAttribute('data-id'))
});
