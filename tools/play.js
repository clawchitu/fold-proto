// Text-mode Letterfold for blind playtests (docs/playtest-ch6.md): replays a list of actions on one level and prints
// only what the game itself shows — the visible board, your position, the hinge angle, which face is turned, shadows,
// the level's line and the 「?」 ladder. No solver output, no third page until you turn to it.
//
//   node tools/play.js <id>                          show the level
//   node tools/play.js <id> "fold 135" "walk 1,3" "flip" "undo" "hint"
//
// Actions: fold <physical angle 0–180, 0 = closed, 180 = flat>  ·  walk <col>,<row> (1-based, as the screen reads)
//          step <left|right|up|down>  ·  flip (turn the closed book over)  ·  undo  ·  hint
//          flap <physical angle 0–180> (ch. 12 trifold: the third page's own crease, 180 = flat, 0 = folded onto the right
//          page; only while the book lies flat). Columns are always the MAP's: 1–4 left | 5–8 right | 9–12 third page.
// Angles: the game folds in 5° steps from the current angle, so standing on a shadow you ride it (or fall) on the way.
'use strict';
const L = require('../logic.js');
const LEVELS = require('../levels.js');
global.window = global; global.localStorage = { getItem: () => null, setItem() {} }; Object.defineProperty(global, "navigator", { value: { language: "en" }, configurable: true });
global.document = { documentElement: { lang: '' }, querySelectorAll: () => [] };
require('../i18n.js');
const I = window.I18N; I.setLang && I.setLang('en');

const [, , id, ...actions] = process.argv;
const lv = id && id.includes(',') ? { id: 'draft', map: id.replace(/^tri:/, '').split(','), ...(id.startsWith('tri:') ? { trifold: true } : {}) } : LEVELS.find((l) => l.id === id);   // a draft board: 'row,row' (or 'tri:row,row' for a trifold)
if (!lv) { console.log('no level ' + id); process.exit(1); }
let text; try { text = I.level(lv.id); } catch (e) { text = { name: lv.id, line: '', hint: '(this level has no hint text yet)', hint1: null }; }   // a candidate not yet in i18n.js
if (lv.text) text = { ...text, ...lv.text };   // a candidate may carry its draft name / line / hint / hint1 on the level itself
const s = L.create(lv);
const TRI = L.trifold(s);
let flapA = 180;                                      // ch. 12: the second crease, physical (180 = flat, 0 = folded onto the right page)
let angle = 180, rung = 0, hintsUsed = 0, log = [], undo = [], won = false, turns = 0, steps = 0;
const fold = () => 180 - (s.face === 2 ? flapA : angle);   // logic.js angle: 0 flat … 180 closed (face 2: the flap's crease)
// ch. 12: a visible column ↔ the map column behind it (1-based for print), and the map column a player names → visible
const mapCol = (c, r) => (c < 0 ? c + L.N : L.colOf(s, c, r));
const visOf = (c) => (!TRI ? c : s.face === 2 ? c - L.N : s.face === 3 && c >= 2 * L.N ? 4 * L.N - 1 - c : c);
const pageOf = (c, r) => { const m = mapCol(c, r); return m < L.N ? 'left page' : m < 2 * L.N ? (s.face === 1 ? 'third page' : 'right page') : 'third page'; };
const mode = () => L.modeOf(fold());
const shade = () => L.shadows(s, fold());
const say = (m) => log.push(m);

function renderTri() {
  const sh = shade(), rows = [], here = (c, r) => s.char.c === c && s.char.r === r;
  const glyph = (c, r) => { let t = L.at(s, c, r); if (here(c, r)) return '@'; if (t === '-' && sh.has(c + ',' + r)) return '░'; if (L.isFloor(t) && sh.has(c + ',' + r)) return '▒'; return t === 'S' ? '.' : t; };
  const posture = (a) => (L.modeOf(a) === 'fold' ? 'closed' : L.modeOf(a) === 'pop' ? 'standing' : a >= L.SHADE_MIN ? 'leaning' : 'open');
  const you = `you: map col ${mapCol(s.char.c, s.char.r) + 1}, row ${s.char.r + 1} (${pageOf(s.char.c, s.char.r)})`;
  if (s.face === 0) {
    rows.push(`TRIFOLD. book ${angle}° (${posture(180 - angle)}), third page lying FLAT beside the right page (one stiff leaf with it)  ${you}`);
    rows.push('     ' + [1, 2, 3, 4].map((c) => ' ' + c).join('') + ' |' + [5, 6, 7, 8].map((c) => ' ' + c).join('') + ' ‖' + [9, 10, 11, 12].map((c) => (c < 10 ? ' ' : '') + c).join(''));
    for (let r = 0; r < s.h; r++) { let line = `row ${r + 1} `; for (let c = 0; c < 12; c++) line += ' ' + glyph(c, r) + (c === 3 ? ' |' : c === 7 ? ' ‖' : ''); rows.push(line); }
    rows.push('| = the book\'s crease (cols 4|5)  ‖ = the third page\'s own crease (cols 8|9). The book can close only with the third page flat (it swings out past the left page, onto the table) or folded onto the right page.');
  } else if (s.face === 2) {
    rows.push(`TRIFOLD. book lying flat; the THIRD page is being turned on its own crease: ${flapA}° (${posture(180 - flapA)})  ${you}`);
    rows.push('     ' + [5, 6, 7, 8].map((c) => ' ' + c).join('') + ' ‖' + [9, 10, 11, 12].map((c) => (c < 10 ? ' ' : '') + c).join('') + '   (left page lies flat to the side, out of reach)');
    for (let r = 0; r < s.h; r++) { let line = `row ${r + 1} `; for (let c = 0; c < 8; c++) line += ' ' + glyph(c, r) + (c === 3 ? ' ‖' : ''); rows.push(line); }
    rows.push('Now the right page is the flat page and the third page the lifted one: its loose stones roll towards cols 8|9, its stones shade the right page; folded down, third col c meets right col 17 − c (1-based).');
  } else {
    rows.push(`TRIFOLD. third page FOLDED onto the right page; book ${angle}° (${posture(180 - angle)})  ${you}`);
    rows.push('     ' + [1, 2, 3, 4].map((c) => ' ' + c).join('') + ' |' + [5, 6, 7, 8].map((c) => ' ' + c).join('') + '   (the right leaf now has two layers: what you see on top)');
    for (let r = 0; r < s.h; r++) { let line = `row ${r + 1} `; for (let c = 0; c < 8; c++) line += ' ' + glyph(c, r) + (c === 3 ? ' |' : ''); rows.push(line); }
    rows.push('layers of the right leaf (T = the third page\'s square on top: map col 17 − c; R = the right page seen through a HOLE in the third page; X = a stone in either layer):');
    for (let r = 0; r < s.h; r++) { let line = `row ${r + 1} `; for (let c = 4; c < 8; c++) { const m = L.colOf(s, c, r); line += ' ' + (L.isBlock(L.at(s, c, r)) ? 'X' : m >= 8 ? 'T' : 'R') + (m >= 8 ? '' + (m + 1) : '' + (m + 1)).padEnd(3); } rows.push(line); }
  }
  if (mode() === 'fold' && s.face !== 2) {
    rows.push(`closed: the ${s.face === 3 ? 'folded leaf (third page on top, right page through its holes)' : 'right page'} lies ON TOP of the left page. Stacks (walk by STACK column 1–4; cell = upper / left):`);
    for (let r = 0; r < s.h; r++) { let line = `row ${r + 1} `; for (let q = 0; q < L.N; q++) { const top = L.at(s, L.mirror(q), r), under = L.at(s, q, r), on = s.char.r === r && L.proj(s.char.c) === q; const cell = `${top === 'S' ? '.' : top}/${under === 'S' ? '.' : under}`; line += ' ' + (on ? `[${cell}]` : ` ${cell} `) + ' '; } rows.push(line); }
  }
  if (mode() === 'fold' && s.face === 2) rows.push('the third page lies folded on the right page (it presses at this moment).');
  return rows.join('\n');
}
function render() {
  if (TRI) return renderTri();
  const sh = shade(), rows = [];
  rows.push(`angle ${angle}° (${mode() === 'fold' ? 'closed' : mode() === 'pop' ? 'standing' : fold() >= L.SHADE_MIN ? 'leaning' : 'open'})  face: ${s.face ? 'THIRD page is turned towards the left page' : 'right page'}  you: col ${s.char.c + 1}, row ${s.char.r + 1} (${L.isRight(s.char.c) ? (s.face ? 'third page' : 'right page') : 'left page'})`);
  rows.push('     ' + [1, 2, 3, 4].map((c) => ' ' + c).join('') + ' |' + [5, 6, 7, 8].map((c) => ' ' + c).join(''));
  for (let r = 0; r < s.h; r++) {
    let line = `row ${r + 1} `;
    for (let c = 0; c < s.w; c++) {
      let t = L.at(s, c, r);
      if (s.char.c === c && s.char.r === r) t = '@';
      else if (t === 'x' && sh.has(c + ',' + r)) t = 'x';   // a stone under a shadow still prints as the stone
      else if (t === '-' && sh.has(c + ',' + r)) t = '░';
      else if (L.isFloor(t) && sh.has(c + ',' + r)) t = '▒';
      else if (t === 'S') t = '.';
      line += ' ' + t + (c === 3 ? ' |' : '');
    }
    rows.push(line);
  }
  rows.push('legend: @ you  . paper  - gap  ░ shadow over a gap (walkable while it lasts; it carries you when the hinge moves)  ▒ shadow over paper (a shadow over paper is just paper: it does not carry you)  x stone  r LOOSE stone (rolls one square towards the crease each time the lifted page passes upright; into a gap it drops and fills it)  k key  D locked door  o open door  i ink  p tab  g glue  G the letter');
  if (mode() === 'fold') {
    rows.push(`closed: the ${s.face ? 'third' : 'right'} page lies ON TOP of the left page (the 8-column print above is only the unfolded map). Stacks (walk and step by STACK column 1–4; each cell = upper page / left page):`);
    rows.push('        1       2       3       4');
    for (let r = 0; r < s.h; r++) {
      let line = `row ${r + 1} `;
      for (let q = 0; q < L.N; q++) {
        const top = L.at(s, L.mirror(q), r), under = L.at(s, q, r), here = s.char.r === r && L.proj(s.char.c) === q;
        const cell = `${top === 'S' ? '.' : top}/${under === 'S' ? '.' : under}`;
        line += ' ' + (here ? `[${cell}]` : ` ${cell} `) + ' ';
      }
      rows.push(line);
    }
    rows.push(`you are on the ${L.isRight(s.char.c) ? (s.face ? 'THIRD (upper)' : 'RIGHT (upper)') : 'LEFT (under)'} page of stack ${L.proj(s.char.c) + 1}. Rule: where both are paper you stay on your page; you change page only in a stack where exactly one side is paper. A stack is blocked if either side is a stone or a locked door.`);
  }
  return rows.join('\n');
}
function reach() { const set = new Set(); const q = [s.char]; const key = (p) => p.c + ',' + p.r; set.add(key(s.char)); while (q.length) { const x = q.shift(); for (const n of L.neighbours({ ...s, char: x }, x, mode(), shade())) if (!set.has(key(n))) { set.add(key(n)); q.push(n); } } return set; }
function push() { undo.push({ grid: s.grid.map((r) => r.slice()), char: { ...s.char }, angle, flapA, face: s.face }); }
function die(why) {
  if (TRI) { say(why + ' Back to the start: the letter laid out flat again as the level began.'); L.restart(s); angle = 180; flapA = 180; return; } say(why + ` Back to the start (col ${s.start.c + 1}, row ${s.start.r + 1}; the book stays as it is${s.face ? ', third page still turned towards the left page' : ''}).`); s.char = { ...s.start }; }
function setAngle(target, isFlap) {
  target = Math.max(0, Math.min(180, Math.round(target / 5) * 5));
  let a1 = 180 - target;
  const refuse = () => { const why = L.flapBlock(s); if (!why) return false; a1 = L.FOLD_MIN - 5; say(why === 'cover' ? `the third page will not fold down: its paper at map col ${L.mirror(s.char.c) + L.N + 1}, row ${s.char.r + 1} would lie on you (it stops at ${180 - a1}°). Stand under one of its holes, or step off the right page.` : `the third page will not fold down: you stand on it right over the stone at map col ${mapCol(L.mirror(s.char.c), s.char.r) + 1}, row ${s.char.r + 1} on the right page (it stops at ${180 - a1}°). Step off it first.`); return true; };
  if (isFlap && a1 >= L.FOLD_MIN) refuse();
  if (isFlap && a1 >= L.FOLD_MIN) a1 = 180;
  const a0 = fold(), step = a1 > a0 ? 5 : -5;
  const set = (a) => { if (s.face === 2) flapA = 180 - a; else angle = 180 - a; };
  let src = null, prevMode = mode(), carriedFrom = null;
  for (let a = a0 + step; step > 0 ? a <= a1 : a >= a1; a += step) {
    if (L.passes(a - step, a)) { const mc = (c, r) => (TRI ? mapCol(c, r) : c); const pre = L.roll({ ...s, grid: s.grid.map((x) => x.slice()) }).map((e) => [mc(e.cells[0].c, e.cells[0].r), mc(e.cells[1].c, e.cells[1].r)]); L.roll(s).forEach((e, i) => say(`the lifted page passed upright: the loose stone at col ${pre[i][0] + 1}, row ${e.cells[0].r + 1} rolled to col ${pre[i][1] + 1}` + (e.filled ? ' and dropped into the gap there: that square is paper now (the stone is gone)' : ''))); }
    const onShadow = !L.isFloor(L.at(s, s.char.c, s.char.r));
    if (onShadow) { if (src == null) src = L.shadows(s, a - step).get(s.char.c + ',' + s.char.r) ?? null; } else src = null;
    if (isFlap && a >= L.FOLD_MIN && refuse()) { set(a - step); say(`third page at ${flapA}°`); return; }   // judged again on the rolled board
    const cause = L.crushCause(s, s.char, a);
    const to = L.ride(s, s.char, src, a);
    set(a);
    if (!to) { die(cause === 'off' ? 'The book closed with the third page lying open: it swung out past the left page onto the table, and you went with it — off the book.' : cause === 'glue' ? 'You stood on glue: closing pulled the stone opposite onto your square.' : cause ? 'A stone on the closing page came down on you.' : 'The shadow slid away and you fell.'); return; }
    if (to.c !== s.char.c) { if (!carriedFrom) carriedFrom = { ...s.char }; s.char = to; }
  }
  if (carriedFrom) say(`the shadow carried you from col ${carriedFrom.c + 1} to col ${s.char.c + 1}, row ${s.char.r + 1} (you are there now)`);
  const before = reach().size;
  if (mode() === 'fold' && prevMode !== 'fold') {
    const ev = L.stamp(s);
    const was = s.char; s.char = L.carried(ev, s.char);   // ch. 10: the crane under you flew to the other page, with you
    say((s.face === 2 ? 'the third page pressed down onto the right page' : 'book closed') + (ev.length ? ': ' + ev.map((e) => ({ door: 'the key opened the door', ink: 'the ink printed onto the facing page', glue: 'the glue pulled a stone across', bleed: 'the wet ink bled one ring outward (' + e.cells.length + ' squares)',
      crane: e.inked ? `the crane at col ${e.cells[0].c + 1}, row ${e.cells[0].r + 1} faced wet ink: it is soaked and will not fly again` : e.glued ? `the crane at col ${e.cells[0].c + 1}, row ${e.cells[0].r + 1} flew onto the glue at col ${e.cells[1].c + 1}: stuck there, plain paper now` : `the crane at col ${e.cells[0].c + 1}, row ${e.cells[0].r + 1} flew to col ${e.cells[1].c + 1} on the other page` })[e.type]).join(', ') : '') +
      (s.char !== was ? ` — it carried you: you are on col ${s.char.c + 1}, row ${s.char.r + 1} (the other page) now` : ''));
  } else say(s.face === 2 ? `third page at ${flapA}°` : `book at ${angle}°`);
  if (TRI && s.face === 2 && (flapA === 180 || flapA === 0)) {   // the flap reached flat or folded: back to the book's view
    const out = L.flapOut(s, s.char, flapA === 0);
    if (!out) { die('Folded onto a stone under your feet.'); return; }
    s.char = out; s.face = flapA === 0 ? 3 : 0;
    say(flapA === 0 ? 'the third page lies folded on the right page now: the right leaf has two layers (holes in the third page show the right page)' : 'the third page lies flat again beside the right page');
  }
  if (L.isWin(s, mode())) won = true;
}
for (const act of actions) {
  if (won) break;
  const [verb, arg] = act.trim().split(/\s+/);
  if (verb === 'fold') { if (TRI && s.face === 2) { say('The third page is half-way up: lay it flat or fold it all the way onto the right page before you move the book.'); continue; } push(); turns++; setAngle(+arg); }
  else if (verb === 'flap') {
    if (!TRI) { say('This letter has no third page on a crease of its own.'); continue; }
    if (s.face !== 2 && angle !== 180) { say('Open the book flat first: only one crease moves at a time.'); continue; }
    if (s.face !== 2) { const from = s.face === 3 ? 0 : 180; if (+arg === from) { say('the third page is already there'); continue; } s.char = L.flapIn(s, s.char); s.face = 2; flapA = from; }
    push(); turns++; setAngle(+arg, true);
  }
  else if (verb === 'flip') {
    const why = L.flipBlock(s, fold());
    if (why) say({ open: 'Close the book first, then turn it over.', leaf: 'You are standing on the leaf you would turn.', single: 'This letter has only two pages.' }[why]);
    else {
      push(); turns++;
      const { events, crush } = L.flip(s);
      say((s.face ? 'Turned over: the left page now faces the third page' : 'Turned back: the left page faces the right page again') +
        (events.length ? '; ' + events.map((e) => ({ door: 'the key opened the door', ink: 'the ink printed', glue: 'the glue pulled a stone across', bleed: 'the wet ink bled one ring outward (' + e.cells.length + ' squares)' })[e.type]).join(', ') : ''));
      if (crush) { L.restart(s); say('The page you turned to has a stone over your square. Back to the start, the book turned back as the level began.'); }
      else if (L.isWin(s, mode())) won = true;
    }
  } else if (verb === 'walk' || verb === 'step') {
    let target;
    if (verb === 'walk') { const [c, r] = arg.split(',').map((v) => +v - 1); target = { c: visOf(c), r }; }
    else { const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[arg]; const col = (p) => (mode() === 'fold' ? L.proj(p.c) : p.c); const n = L.neighbours(s, s.char, mode(), shade()).find((n) => col(n) === col(s.char) + d[0] && n.r === s.char.r + d[1]); target = n || { c: col(s.char) + d[0], r: s.char.r + d[1] }; }
    const path = L.findPath(s, target, mode(), shade());
    if (!path) { const b = L.pathBlock(s, target, mode(), shade()) || { why: 'gap' }; const closed = mode() === 'fold'; say(`cannot get to ${closed ? 'stack' : 'col'} ${(closed ? L.proj(target.c) : target.c) + 1}, row ${target.r + 1} (from ${closed ? 'stack' : 'col'} ${(closed ? L.proj(s.char.c) : s.char.c) + 1}, row ${s.char.r + 1}): ${({ stone: closed ? `a stone on the upper (${s.face ? 'third' : 'right'}) page covers that stack` : 'a stone blocks the way', card: 'a left-page stone lies under the paper of that stack: blocked', door: 'a locked door', gap: closed ? 'neither side of that stack is paper' : 'a gap', edge: 'the edge of the book', crease: 'the crease (pages only join when closed, or on standing tabs)' })[b.why]} at ${closed ? 'stack' : 'col'} ${b.c + 1}, row ${b.r + 1}`); }
    else { push(); for (const p of path) { s.char = p; steps++; if (L.isWin(s, mode())) { won = true; break; } } const closed = mode() === 'fold'; say(closed ? `arrived at stack ${L.proj(s.char.c) + 1}, row ${s.char.r + 1}, on the ${L.isRight(s.char.c) ? (s.face ? 'THIRD (upper)' : 'RIGHT (upper)') : 'LEFT (under)'} page` : `arrived at col ${(TRI ? mapCol(s.char.c, s.char.r) : s.char.c) + 1}, row ${s.char.r + 1}`); }
  } else if (verb === 'undo') { const u = undo.pop(); if (!u) say('nothing to undo'); else { s.grid = u.grid; s.char = u.char; angle = u.angle; flapA = u.flapA; s.face = u.face; say('undone'); } }
  else if (verb === 'solvable') {   // design check (not a game action): can the level still be won from here? (docs/design-ch12.md: the obvious route must die)
    const C = require('./check.js'), lvNow = { ...lv, map: s.grid.map((row) => row.join('')) }, B = C.grids(lvNow);
    const r = C.solve(lvNow, C.ANGLES, { c: s.char.c, r: s.char.r, a: fold(), face: s.face, g: 0 }, { B });
    say(r ? `[solver] still winnable from here: ${r.cost} more hinge moves (${r.steps.join(' → ')})` : '[solver] DEAD END: no way to win from here (undo / restart)');
  }
  else if (verb === 'hint') { hintsUsed++; say('? ' + (text.hint1 && rung++ === 0 ? text.hint1 : text.hint)); }
  else say('unknown action: ' + act);
}
console.log(`LEVEL ${lv.id} — ${text.name}\n「${text.line}」\n`);
console.log(render());
console.log('\n' + (log.length ? log.map((m, i) => `${i + 1}. ${m}`).join('\n') : '(no actions yet)'));
console.log(won ? `\n*** SOLVED *** hinge/turn moves ${turns}, steps ${steps}, hints used ${hintsUsed}` : `\nnot solved yet · hinge/turn moves ${turns}, steps ${steps}, hints used ${hintsUsed}`);
