// Export the shared level data for the native app: node tools/export.js <out-dir>
// Writes levels.json (maps + the JS solver's verdicts, which the Swift tests must match)
// and strings.json (every UI / level / accessibility string in zh, en, ja, ko from i18n.js).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const LEVELS = require('../levels.js');
const { report } = require('./check.js');
const L = require('../logic.js');

const out = process.argv[2] || path.join(__dirname, '..', 'export');
fs.mkdirSync(out, { recursive: true });

const levels = {
  version: 1,
  columnsPerPage: L.N,
  thresholds: { foldMin: L.FOLD_MIN, popMin: L.POP_MIN, popMax: L.POP_MAX, shadeMin: L.SHADE_MIN },
  levels: LEVELS.map((lv) => ({ id: lv.id, map: lv.map, expect: report(lv) })),
};
fs.writeFileSync(path.join(out, 'levels.json'), JSON.stringify(levels, null, 2) + '\n');

// i18n.js is a browser script: run it against a tiny fake window and read its tables.
const ctx = { window: {}, localStorage: { getItem: () => null }, navigator: { languages: ['en'] } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'i18n.js'), 'utf8'), ctx);
const { strings, levelTexts } = ctx.window.I18N;
fs.writeFileSync(path.join(out, 'strings.json'), JSON.stringify({ strings, levelTexts }, null, 2) + '\n');
console.log(`exported ${LEVELS.length} levels and ${Object.keys(strings.en).length} strings to ${out}`);
