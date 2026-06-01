/* ═══════════════════════════════════════
   SETTINGS — appearance, money, data, categories
═══════════════════════════════════════ */
const CAT_PALETTE = ['#ffa801','#ff7f50','#ef5777','#fb7185','#be2edd','#7c7ef7','#575fcf','#22d3ee','#00d8d6','#2ecc71','#34d399','#ffd32a','#ff3f34','#8888aa'];

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme || 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', state.theme === 'light' ? '#f3f4fb' : '#08080f');
}
function updateCurrencyPrefixes() {
  document.querySelectorAll('.input-prefix').forEach(e => { e.textContent = state.currency; });
}

function openSettingsModal() {
  openModal(`
    <div class="modal-title">⚙️ ${t('settings_title')}</div>

    <div class="section-title">${t('section_money')}</div>
    <div class="row-2">
      <div class="input-group">
        <label class="input-label" for="set-wage">⏱️ <span>${t('label_hourly_wage')}</span></label>
        <div class="input-wrap"><span class="input-prefix">${state.currency}</span>
          <input type="text" id="set-wage" inputmode="decimal" placeholder="15" value="${state.hourlyWage || ''}"></div>
      </div>
      <div class="input-group">
        <label class="input-label" for="set-doner">🥙 <span>${t('label_doner_price')}</span></label>
        <div class="input-wrap"><span class="input-prefix">${state.currency}</span>
          <input type="text" id="set-doner" inputmode="decimal" value="${donerPrice()}"></div>
      </div>
    </div>
    <div class="input-group">
      <label class="input-label" for="set-currency">🌍 <span>${t('label_currency')}</span></label>
      <select id="set-currency" data-onchange="settingsCurrency">
        ${Object.keys(CURRENCIES).map(c => `<option value="${c}" ${state.currency === c ? 'selected' : ''}>${CURRENCIES[c].label}</option>`).join('')}
      </select>
    </div>

    <div class="section-title">${t('section_appearance')}</div>
    <div class="input-group">
      <label class="input-label" for="set-lang">🗣️ <span>${t('label_lang')}</span></label>
      <select id="set-lang">
        <option value="de" ${state.lang === 'de' ? 'selected' : ''}>Deutsch</option>
        <option value="en" ${state.lang === 'en' ? 'selected' : ''}>English</option>
        <option value="tr" ${state.lang === 'tr' ? 'selected' : ''}>Türkçe</option>
      </select>
    </div>
    <div class="input-group">
      <div class="input-label">🎨 <span>${t('label_theme')}</span></div>
      <div class="seg" id="theme-seg" style="width:100%;">
        <button type="button" class="seg-btn ${state.theme !== 'light' ? 'active' : ''}" data-act="setTheme" data-theme="dark" style="flex:1;">🌙 ${t('theme_dark')}</button>
        <button type="button" class="seg-btn ${state.theme === 'light' ? 'active' : ''}" data-act="setTheme" data-theme="light" style="flex:1;">☀️ ${t('theme_light')}</button>
      </div>
    </div>

    <button class="btn btn-primary" data-act="settingsSave">${t('btn_save')}</button>

    <div class="section-title">${t('section_data')}</div>
    <button class="btn btn-outline mb-8" data-act="exportJson">${t('btn_export_json')}</button>
    <button class="btn btn-outline mb-8" data-act="importJson">${t('btn_import_json')}</button>
    <button class="btn btn-outline mb-8" data-act="exportCsv">${t('btn_export_csv')}</button>
    <button class="btn btn-outline" data-act="manageCats">${t('btn_manage_cats')}</button>

    <div class="divider"></div>
    <button class="btn btn-danger" data-act="resetAll">${t('btn_delete_all')}</button>
  `);
}

function settingsCurrencyPreview() {
  const cur = el('set-currency').value;
  el('modal').querySelectorAll('.input-prefix').forEach(e => { e.textContent = cur; });
  const doner = el('set-doner');
  if (doner && CURRENCIES[cur]) doner.value = CURRENCIES[cur].doner;
}

function setTheme(theme) {
  state.theme = theme; save(); applyTheme();
  const seg = el('theme-seg');
  if (seg) seg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-theme') === theme));
  haptic();
}

function saveSettings() {
  state.hourlyWage = Math.max(0, round2(toNumber(el('set-wage').value))) || 15;
  state.donerPrice = Math.max(0.5, round2(toNumber(el('set-doner').value))) || (CURRENCIES[el('set-currency').value] || {}).doner || 8;
  state.currency = el('set-currency').value;
  state.lang = el('set-lang').value;
  save();
  applyTheme();
  applyTranslations(document);
  updateCurrencyPrefixes();
  closeModal();
  rerender(); renderCalc();
  showToast(t('toast_saved'), 'success'); haptic();
}

/* ── data export / import ── */
function download(filename, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function todayStamp() { return new Date().toISOString().slice(0, 10); }

function exportJson() {
  download('financely-backup-' + todayStamp() + '.json', JSON.stringify(state, null, 2), 'application/json');
  showToast(t('toast_exported'), 'success');
}
function csvCell(v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function exportCsv() {
  const rows = [['date', 'name', 'category', 'amount', 'note']];
  state.expenses.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(e => rows.push([e.date, e.name, getCategoryLabel(e.category), String(e.amount), e.note || '']));
  download('financely-expenses-' + todayStamp() + '.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'), 'text/csv');
  showToast(t('toast_exported'), 'success');
}
function importJson() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        state = migrate(JSON.parse(r.result));
        save(); applyTheme(); applyTranslations(document); updateCurrencyPrefixes();
        closeModal(); rerender(); renderCalc(); navTo('dashboard');
        showToast(t('toast_imported'), 'success');
      } catch (e) { showToast(t('toast_import_error'), 'error'); }
    };
    r.readAsText(f);
  };
  inp.click();
}

function resetAll() {
  confirmDialog(t('confirm_delete_all'), { danger: true, okLabel: t('btn_delete') }).then(ok => {
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    state = clone(defaultState);
    save(); applyTheme(); applyTranslations(document); updateCurrencyPrefixes();
    closeModal(); rerender(); renderCalc(); navTo('dashboard');
    showToast(t('toast_deleted'));
  });
}

/* ── category manager ── */
function openCategoriesModal() {
  const rows = getCategories().map(c => `
    <div class="cat-edit-row">
      <span class="color-dot" style="background:${c.color}"></span>
      <span style="font-size:18px;">${c.emoji}</span>
      <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(getCategoryLabel(c.key))}</span>
      <button class="icon-btn" data-act="catEdit" data-cat="${c.key}" aria-label="${t('btn_edit')}">✏️</button>
      ${c.custom ? `<button class="icon-btn danger" data-act="catDelete" data-cat="${c.key}" aria-label="${t('btn_delete')}">🗑</button>` : ''}
    </div>`).join('');
  openModal(`
    <div class="modal-title">🏷️ ${t('cats_title')}</div>
    ${rows}
    <button class="btn btn-primary mt-8" data-act="catAdd">${t('btn_add_cat')}</button>
    <button class="btn btn-ghost mt-8" data-act="closeModal">${t('btn_close')}</button>
  `);
}
function openCategoryEditModal(key) {
  const c = key ? getCategories().find(x => x.key === key) : null;
  const isDefault = c && DEFAULT_CAT_KEYS.includes(c.key);
  const color = c ? c.color : CAT_PALETTE[5];
  openModal(`
    <div class="modal-title">${c ? t('btn_edit') : t('btn_add_cat')}</div>
    <input type="hidden" id="cat-key" value="${c ? c.key : ''}">
    <input type="hidden" id="cat-color" value="${color}">
    ${isDefault ? '' : `<div class="input-group">
      <label class="input-label" for="cat-name">${t('label_cat_name')}</label>
      <input type="text" id="cat-name" class="no-prefix" maxlength="24" value="${c && c.label ? escapeHtml(c.label) : ''}"></div>`}
    <div class="input-group">
      <label class="input-label" for="cat-emoji">${t('label_cat_emoji')}</label>
      <input type="text" id="cat-emoji" class="no-prefix" maxlength="2" placeholder="🏷️" value="${c ? escapeHtml(c.emoji) : ''}"></div>
    <div class="input-group">
      <div class="input-label">${t('label_cat_color')}</div>
      <div class="color-swatches">${CAT_PALETTE.map(p => `<div class="swatch ${p === color ? 'sel' : ''}" style="background:${p}" data-act="catSwatch" data-color="${p}" role="button" tabindex="0"></div>`).join('')}</div>
    </div>
    <button class="btn btn-primary mt-8" data-act="catSave">${t('btn_save')}</button>
  `);
}
function catSwatch(elx) {
  el('cat-color').value = elx.getAttribute('data-color');
  el('modal').querySelectorAll('.swatch').forEach(s => s.classList.toggle('sel', s === elx));
}
function saveCategory() {
  const key = el('cat-key').value;
  const color = el('cat-color').value;
  const emoji = ((el('cat-emoji') && el('cat-emoji').value.trim()) || '🏷️').slice(0, 4);
  if (key) {
    const c = getCategories().find(x => x.key === key);
    if (c) { c.emoji = emoji; c.color = color; const ni = el('cat-name'); if (ni && ni.value.trim()) c.label = ni.value.trim().slice(0, 24); }
    showToast(t('toast_saved'), 'success');
  } else {
    const ni = el('cat-name'); const label = ni ? ni.value.trim().slice(0, 24) : '';
    if (!label) { showToast(t('err_fields'), 'error'); return; }
    state.categories.push({ key: 'c_' + uid(), emoji, color, label, custom: true });
    showToast(t('toast_cat_added'), 'success');
  }
  save(); rerender(); openCategoriesModal();
}
function deleteCategory(key) {
  confirmDialog(t('confirm_delete_cat'), { danger: true, okLabel: t('btn_delete') }).then(ok => {
    if (!ok) return;
    state.expenses.forEach(e => { if (e.category === key) e.category = 'other'; });
    state.subscriptions.forEach(s => { if (s.category === key) s.category = 'subscriptions'; });
    delete state.budgets[key];
    state.categories = state.categories.filter(c => c.key !== key);
    save(); rerender(); openCategoriesModal(); showToast(t('toast_cat_deleted'));
  });
}

registerActions({
  openSettings: () => openSettingsModal(),
  settingsSave: () => saveSettings(),
  settingsCurrency: () => settingsCurrencyPreview(),
  setTheme: (el) => setTheme(el.getAttribute('data-theme')),
  exportJson: () => exportJson(),
  exportCsv: () => exportCsv(),
  importJson: () => importJson(),
  resetAll: () => resetAll(),
  manageCats: () => openCategoriesModal(),
  catAdd: () => openCategoryEditModal(),
  catEdit: (el) => openCategoryEditModal(el.getAttribute('data-cat')),
  catSwatch: (el) => catSwatch(el),
  catSave: () => saveCategory(),
  catDelete: (el) => deleteCategory(el.getAttribute('data-cat'))
});
