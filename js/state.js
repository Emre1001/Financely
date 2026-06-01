/* ═══════════════════════════════════════
   STATE — model, migration, persistence, helpers
═══════════════════════════════════════ */
const SCHEMA = 3;
const STORAGE_KEY = 'financely_v3';
const LEGACY_KEY  = 'financely_v2';

const CURRENCIES = {
  '€':   { code:'EUR', label:'€ (EUR)',  doner: 8   },
  '$':   { code:'USD', label:'$ (USD)',  doner: 12  },
  '£':   { code:'GBP', label:'£ (GBP)',  doner: 9   },
  'CHF': { code:'CHF', label:'CHF',      doner: 12  },
  '₺':   { code:'TRY', label:'₺ (TRY)',  doner: 200 },
};

const DEFAULT_CATEGORIES = [
  { key:'food',          emoji:'🍔', color:'#ffa801' },
  { key:'transport',     emoji:'🚆', color:'#00d8d6' },
  { key:'shopping',      emoji:'🛍️', color:'#ef5777' },
  { key:'housing',       emoji:'🏠', color:'#575fcf' },
  { key:'leisure',       emoji:'🎮', color:'#ffd32a' },
  { key:'health',        emoji:'💊', color:'#ff3f34' },
  { key:'subscriptions', emoji:'🔁', color:'#be2edd' },
  { key:'other',         emoji:'📦', color:'#8888aa' },
];
const DEFAULT_CAT_KEYS = DEFAULT_CATEGORIES.map(c => c.key);

/* old German category names → stable keys (verlustfreie Migration) */
const LEGACY_CAT_MAP = {
  'Essen':'food', 'Transport':'transport', 'Shopping':'shopping', 'Wohnen':'housing',
  'Freizeit':'leisure', 'Gesundheit':'health', 'Fixkosten':'subscriptions', 'Sonstiges':'other'
};

const defaultState = {
  schemaVersion: SCHEMA,
  incomes: [],
  hourlyWage: 15,
  currency: '€',
  donerPrice: 8,
  calcMode: 'time',
  lang: 'de',
  theme: 'dark',
  salaryVisible: false,
  installedHint: false,
  expenses: [],
  goals: [],
  subscriptions: [],
  budgets: {},
  categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
};

/* ── tiny utils ── */
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/* Locale-aware number parsing — fixes the "10,50" → 10 bug everywhere. */
function toNumber(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).trim().replace(/[^0-9.,-]/g, '');
  if (!s) return 0;
  if (currentLang() === 'en') {
    s = s.replace(/,/g, '');                       // comma = thousands
  } else {
    s = s.replace(/\./g, '').replace(',', '.');    // dot = thousands, comma = decimal
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function validDate(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const dt = new Date(d);
  if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/* ── currency / formatting ── */
function fmtCur(n, decimals) {
  const d = decimals === undefined ? 2 : decimals;
  const num = (Number(n) || 0).toLocaleString(currentLocale(), { minimumFractionDigits: d, maximumFractionDigits: d });
  return num + ' ' + (state.currency || '€');
}
function fmtNum(n) { return (Number(n) || 0).toLocaleString(currentLocale(), { maximumFractionDigits: 0 }); }
function donerPrice() { return state.donerPrice > 0 ? state.donerPrice : (CURRENCIES[state.currency] || {}).doner || 8; }

/* ── categories ── */
function getCategories() { return state.categories && state.categories.length ? state.categories : DEFAULT_CATEGORIES; }
function getCategory(key) {
  return getCategories().find(c => c.key === key)
      || getCategories().find(c => c.key === 'other')
      || { key:'other', emoji:'📦', color:'#8888aa' };
}
function getCategoryLabel(key) {
  const c = getCategories().find(x => x.key === key);
  if (c && c.label) return c.label;                 // custom category
  if (DEFAULT_CAT_KEYS.includes(key)) return t('cat_' + key);
  return (c && c.key) || key;
}
function getCategoryColor(key) { return getCategory(key).color; }
function getCategoryEmoji(key) { return getCategory(key).emoji; }

function mergeCategories(arr) {
  const out = [];
  const seen = new Set();
  arr.forEach(c => {
    if (!c || !c.key || seen.has(c.key)) return;
    seen.add(c.key);
    const def = DEFAULT_CATEGORIES.find(d => d.key === c.key);
    out.push({
      key: String(c.key),
      emoji: c.emoji || (def && def.emoji) || '📦',
      color: c.color || (def && def.color) || '#8888aa',
      label: c.label ? String(c.label).slice(0, 24) : undefined,
      custom: !def
    });
  });
  // ensure every default exists
  DEFAULT_CATEGORIES.forEach(d => { if (!seen.has(d.key)) out.push({ ...d }); });
  return out;
}

/* ── domain helpers ── */
function getMonthlyIncome() { return (state.incomes || []).filter(i => i.active !== false).reduce((s, i) => s + (i.amount || 0), 0); }
function getSubsTotal() { return (state.subscriptions || []).filter(s => s.active !== false).reduce((s, b) => s + (b.amount || 0), 0); }
function isSameMonth(d, y, m) { const dt = new Date(d); return dt.getFullYear() === y && dt.getMonth() === m; }
function monthExpenses(y, m) { return (state.expenses || []).filter(e => isSameMonth(e.date, y, m)); }
function spentByCategory(y, m) {
  const tot = {};
  monthExpenses(y, m).forEach(e => { tot[e.category] = (tot[e.category] || 0) + e.amount; });
  return tot;
}
function monthTotal(y, m) { return monthExpenses(y, m).reduce((s, e) => s + e.amount, 0); }

/* ── sanitizers (used by migrate + import) ── */
function sanitizeIncome(i) {
  if (!i || typeof i !== 'object') return null;
  const amount = round2(Math.abs(toNumber(i.amount)));
  if (!amount) return null;
  return {
    id: i.id || uid(),
    name: String(i.name || '').slice(0, 40) || '—',
    amount,
    day: Math.min(31, Math.max(1, parseInt(i.day, 10) || 1)),
    active: i.active !== false
  };
}
function sanitizeExpense(e, validKeys) {
  if (!e || typeof e !== 'object') return null;
  const amount = round2(Math.abs(toNumber(e.amount)));
  if (!amount) return null;
  let category = e.category || 'other';
  if (LEGACY_CAT_MAP[category]) category = LEGACY_CAT_MAP[category];
  if (validKeys && !validKeys.has(category)) category = 'other';
  const out = {
    id: e.id || uid(),
    name: String(e.name || '').slice(0, 80) || '—',
    amount,
    category,
    date: validDate(e.date),
    note: e.note ? String(e.note).slice(0, 200) : '',
    recurring: !!e.recurring
  };
  if (e.recurring && e.seriesId) out.seriesId = String(e.seriesId);
  return out;
}
function sanitizeGoal(g) {
  if (!g || typeof g !== 'object') return null;
  const target = round2(Math.abs(toNumber(g.target)));
  if (!target) return null;
  return {
    id: g.id || uid(),
    name: String(g.name || '').slice(0, 40) || '—',
    emoji: String(g.emoji || '🎯').slice(0, 4),
    target,
    saved: Math.min(target, round2(Math.max(0, toNumber(g.saved))))
  };
}
function sanitizeSub(s, validKeys) {
  if (!s || typeof s !== 'object') return null;
  const amount = round2(Math.abs(toNumber(s.amount)));
  if (!amount) return null;
  let category = s.category || 'subscriptions';
  if (LEGACY_CAT_MAP[category]) category = LEGACY_CAT_MAP[category];
  if (validKeys && !validKeys.has(category)) category = 'subscriptions';
  return {
    id: s.id || uid(),
    name: String(s.name || '').slice(0, 40) || '—',
    amount,
    category,
    billingDay: Math.min(31, Math.max(1, parseInt(s.billingDay, 10) || 1)),
    active: s.active !== false
  };
}

/* ── migration: always returns a complete, valid state ── */
function migrate(obj) {
  const s = clone(defaultState);
  if (!obj || typeof obj !== 'object') return s;

  if (typeof obj.hourlyWage === 'number') s.hourlyWage = Math.max(0, obj.hourlyWage);
  if (typeof obj.currency === 'string' && CURRENCIES[obj.currency]) s.currency = obj.currency;
  if (obj.calcMode === 'time' || obj.calcMode === 'doner') s.calcMode = obj.calcMode;
  if (['de','en','tr'].includes(obj.lang)) s.lang = obj.lang;
  if (obj.theme === 'dark' || obj.theme === 'light') s.theme = obj.theme;
  if (typeof obj.salaryVisible === 'boolean') s.salaryVisible = obj.salaryVisible;
  if (typeof obj.installedHint === 'boolean') s.installedHint = obj.installedHint;
  s.donerPrice = (typeof obj.donerPrice === 'number' && obj.donerPrice > 0)
    ? obj.donerPrice : ((CURRENCIES[s.currency] || {}).doner || 8);

  if (Array.isArray(obj.categories) && obj.categories.length) s.categories = mergeCategories(obj.categories);
  const validKeys = new Set(s.categories.map(c => c.key));

  if (Array.isArray(obj.incomes)) {
    s.incomes = obj.incomes.map(sanitizeIncome).filter(Boolean);
  } else if (typeof obj.salary === 'number' && obj.salary > 0) {        // v2 → v3
    const nm = { de:'Gehalt', en:'Salary', tr:'Maaş' }[s.lang] || 'Salary';
    s.incomes = [{ id: uid(), name: nm, amount: round2(obj.salary), day: 1, active: true }];
  }

  if (Array.isArray(obj.expenses)) s.expenses = obj.expenses.map(e => sanitizeExpense(e, validKeys)).filter(Boolean);
  if (Array.isArray(obj.goals)) s.goals = obj.goals.map(sanitizeGoal).filter(Boolean);
  if (Array.isArray(obj.subscriptions)) s.subscriptions = obj.subscriptions.map(x => sanitizeSub(x, validKeys)).filter(Boolean);

  if (obj.budgets && typeof obj.budgets === 'object') {
    for (const k in obj.budgets) {
      const v = round2(toNumber(obj.budgets[k]));
      if (v > 0 && validKeys.has(k)) s.budgets[k] = v;
    }
  }

  s.schemaVersion = SCHEMA;
  return s;
}

/* ── load / save ── */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
    const old = localStorage.getItem(LEGACY_KEY);
    if (old) return migrate(JSON.parse(old));
  } catch (e) { console.warn('Financely: load failed, starting fresh', e); }
  return clone(defaultState);
}

let state = loadState();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Financely: save failed', e); }
}
