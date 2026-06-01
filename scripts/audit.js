/* Static audit: i18n completeness, action wiring, leftover ${} in HTML, absolute paths. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const jsDir = path.join(ROOT, 'js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).map(f => path.join(jsDir, f));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const allJs = jsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

let errors = 0, warnings = 0;
const err = m => { console.log('❌ ' + m); errors++; };
const warn = m => { console.log('⚠️  ' + m); warnings++; };

/* ── 1. load i18n object via vm ── */
const i18nCode = fs.readFileSync(path.join(jsDir, 'i18n.js'), 'utf8') + '\n; this.__i18n = i18n;';
const ctx = { state: { lang: 'de' }, document: { documentElement: {} }, console };
vm.createContext(ctx);
vm.runInContext(i18nCode, ctx);
const I = ctx.__i18n;
if (!I || !I.de || !I.en || !I.tr) { err('i18n object not loaded'); process.exit(1); }
const langs = ['de', 'en', 'tr'];
const keysDe = Object.keys(I.de);

/* parity across languages */
langs.forEach(l => {
  keysDe.forEach(k => { if (!(k in I[l])) err(`i18n: key "${k}" missing in "${l}"`); });
  Object.keys(I[l]).forEach(k => { if (!(k in I.de)) warn(`i18n: key "${k}" in "${l}" but not in "de"`); });
});

/* ── 2. collect used i18n keys (t('x'), data-t, data-t-ph, data-t-aria) ── */
const used = new Set();
const collect = (src, re, gi) => { let m; while ((m = re.exec(src))) used.add(m[gi]); };
collect(allJs, /\bt\(\s*['"]([a-zA-Z0-9_]+)['"]/g, 1);
[/data-t="([^"]+)"/g, /data-t-ph="([^"]+)"/g, /data-t-aria="([^"]+)"/g].forEach(re => { collect(html, re, 1); collect(allJs, re, 1); });
used.forEach(k => {
  if (k.endsWith('_')) return;            // dynamic prefix e.g. t('cat_' + key)
  if (!(k in I.de)) err(`i18n: used key "${k}" not defined in de`);
});

/* ── 3. action wiring: every data-act / data-on* has a registered handler ── */
const usedActs = new Set();
[/data-act="([^"]+)"/g, /data-oninput="([^"]+)"/g, /data-onchange="([^"]+)"/g, /data-onsubmit="([^"]+)"/g]
  .forEach(re => { collect(html, re, 1); });
[/data-act="([^"]+)"/g, /data-oninput="([^"]+)"/g, /data-onchange="([^"]+)"/g, /getAttribute\('data-act'\)/g]
  .forEach(re => { let m; while ((m = re.exec(allJs))) { if (m[1]) usedActs.add(m[1]); } });
// also collect data-act inside JS template strings
collect(allJs, /data-act="([^"$]+)"/g, 1);
collect(allJs, /data-oninput="([^"$]+)"/g, 1);
collect(allJs, /data-onchange="([^"$]+)"/g, 1);

usedActs.forEach(a => {
  const re = new RegExp('\\b' + a.replace(/[^a-zA-Z0-9_]/g, '') + '\\s*:');
  if (!re.test(allJs)) err(`action "${a}" used but not registered`);
});

/* ── 4. render functions referenced by navTo must exist ── */
['renderDashboard','renderStats','renderExpenses','renderSubs','renderGoals','renderBudgets','renderIncome','renderCalc']
  .forEach(fn => { if (!new RegExp('function\\s+' + fn + '\\s*\\(').test(allJs)) err(`missing function ${fn}()`); });

/* ── 5. leftover ${} in static HTML (outside <script>) ── */
const htmlNoScript = html.replace(/<script[\s\S]*?<\/script>/g, '');
if (/\$\{/.test(htmlNoScript)) err('leftover ${...} template literal in static HTML');

/* ── 6. absolute paths (would break GitHub Pages subpath) ── */
let m;
const absRe = /(href|src)="\/[^/]/g;
while ((m = absRe.exec(html))) err(`absolute path in index.html: ${m[0]} (use ./)`);

/* ── 7. every JS file referenced by index.html exists ── */
collect(html, /<script src="\.\/js\/([^"]+)"><\/script>/g, 1);
const referenced = [];
let mm; const sre = /<script src="\.\/js\/([^"]+)"><\/script>/g;
while ((mm = sre.exec(html))) referenced.push(mm[1]);
referenced.forEach(f => { if (!fs.existsSync(path.join(jsDir, f))) err(`index.html references missing js/${f}`); });

console.log(`\nKeys: ${keysDe.length} · used i18n: ${used.size} · actions: ${usedActs.size}`);
console.log(errors === 0 ? `✅ AUDIT PASSED${warnings ? ' (' + warnings + ' warnings)' : ''}` : `\n💥 ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors === 0 ? 0 : 1);
