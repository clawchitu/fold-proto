// Text-mode Letterfold for blind playtests (docs/playtest-ch6.md): replays a list of actions on one level and prints
// only what the game itself shows — the visible board, your position, the hinge angle, which face is turned, shadows,
// the level's line and the 「?」 ladder. No solver output, no third page until you turn to it.
//
//   node tools/play.js <id>                          show the level
//   node tools/play.js <id> "fold 135" "walk 1,3" "flip" "undo" "hint"
//
// Actions: fold <physical angle 0–180, 0 = closed, 180 = flat>  ·  walk <col>,<row> (1-based, as the screen reads)
//          step <left|right|up|down>  ·  flip (turn the closed book over)  ·  undo  ·  hint
// Angles: the game folds in 5° steps from the current angle, so standing on a shadow you ride it (or fall) on the way.
'use strict';
const L = require('../logic.js');
const LEVELS = require('../levels.js');
global.window = global; global.localStorage = { getItem: () => null, setItem() {} }; Object.defineProperty(global, "navigator", { value: { language: "en" }, configurable: true });
global.document = { documentElement: { lang: '' }, querySelectorAll: () => [] };
require('../i18n.js');
const I = window.I18N; I.setLang && I.setLang('en');

const [, , id, ...actions] = process.argv;
const lv = LEVELS.find((l) => l.id === id);
if (!lv) { console.log('no level ' + id); process.exit(1); }
const text = I.level(lv.id);
const s = L.create(lv);
let angle = 180, rung = 0, hintsUsed = 0, log = [], undo = [], won = false, turns = 0, steps = 0;
const fold = () => 180 - angle;                       // logic.js angle: 0 flat … 180 closed
const mode = () => L.modeOf(fold());
const shade = () => L.shadows(s, fold());
const say = (m) => log.push(m);

function render() {
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
  rows.push('legend: @ you  . paper  - gap  ░ shadow over a gap (walkable while it lasts; it carries you when the hinge moves)  ▒ shadow over paper (a shadow over paper is just paper: it does not carry you)  x stone  k key  D locked door  o open door  i ink  p tab  g glue  G the letter');
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
function push() { undo.push({ grid: s.grid.map((r) => r.slice()), char: { ...s.char }, angle, face: s.face }); }
function die(why) { say(why + ` Back to the start (col ${s.start.c + 1}, row ${s.start.r + 1}; the book stays as it is${s.face ? ', third page still turned towards the left page' : ''}).`); s.char = { ...s.start }; }
function setAngle(target) {
  target = Math.max(0, Math.min(180, Math.round(target / 5) * 5));
  const a0 = fold(), a1 = 180 - target, step = a1 > a0 ? 5 : -5;
  let src = null, prevMode = mode(), carriedFrom = null;
  for (let a = a0 + step; step > 0 ? a <= a1 : a >= a1; a += step) {
    const onShadow = !L.isRight(s.char.c) && !L.isFloor(L.at(s, s.char.c, s.char.r));
    if (onShadow) { if (src == null) src = L.shadows(s, a - step).get(s.char.c + ',' + s.char.r) ?? null; } else src = null;
    const cause = L.crushCause(s, s.char, a);
    const to = L.ride(s, s.char, src, a);
    angle = 180 - a;
    if (!to) { die(cause === 'glue' ? 'You stood on glue: closing pulled the stone opposite onto your square.' : cause ? 'A stone on the closing page came down on you.' : 'The shadow slid away and you fell.'); break; }
    if (to.c !== s.char.c) { if (!carriedFrom) carriedFrom = { ...s.char }; s.char = to; }
  }
  if (carriedFrom) say(`the shadow carried you from col ${carriedFrom.c + 1} to col ${s.char.c + 1}, row ${s.char.r + 1} (you are there now)`);
  const before = reach().size;
  if (mode() === 'fold' && prevMode !== 'fold') {
    const ev = L.stamp(s);
    say('book closed' + (ev.length ? ': ' + ev.map((e) => ({ door: 'the key opened the door', ink: 'the ink printed onto the facing page', glue: 'the glue pulled a stone across' })[e.type]).join(', ') : ''));
  } else say(`book at ${angle}°`);
  if (L.isWin(s, mode())) won = true;
}
for (const act of actions) {
  if (won) break;
  const [verb, arg] = act.trim().split(/\s+/);
  if (verb === 'fold') { push(); turns++; setAngle(+arg); }
  else if (verb === 'flip') {
    const why = L.flipBlock(s, fold());
    if (why) say({ open: 'Close the book first, then turn it over.', leaf: 'You are standing on the leaf you would turn.', single: 'This letter has only two pages.' }[why]);
    else {
      push(); turns++;
      const { events, crush } = L.flip(s);
      say((s.face ? 'Turned over: the left page now faces the third page' : 'Turned back: the left page faces the right page again') +
        (events.length ? '; ' + events.map((e) => ({ door: 'the key opened the door', ink: 'the ink printed', glue: 'the glue pulled a stone across' })[e.type]).join(', ') : ''));
      if (crush) { L.restart(s); say('The page you turned to has a stone over your square. Back to the start, the book turned back as the level began.'); }
      else if (L.isWin(s, mode())) won = true;
    }
  } else if (verb === 'walk' || verb === 'step') {
    let target;
    if (verb === 'walk') { const [c, r] = arg.split(',').map((v) => +v - 1); target = { c, r }; }
    else { const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[arg]; const col = (p) => (mode() === 'fold' ? L.proj(p.c) : p.c); const n = L.neighbours(s, s.char, mode(), shade()).find((n) => col(n) === col(s.char) + d[0] && n.r === s.char.r + d[1]); target = n || { c: col(s.char) + d[0], r: s.char.r + d[1] }; }
    const path = L.findPath(s, target, mode(), shade());
    if (!path) { const b = L.pathBlock(s, target, mode(), shade()) || { why: 'gap' }; const closed = mode() === 'fold'; say(`cannot get to ${closed ? 'stack' : 'col'} ${(closed ? L.proj(target.c) : target.c) + 1}, row ${target.r + 1} (from ${closed ? 'stack' : 'col'} ${(closed ? L.proj(s.char.c) : s.char.c) + 1}, row ${s.char.r + 1}): ${({ stone: closed ? `a stone on the upper (${s.face ? 'third' : 'right'}) page covers that stack` : 'a stone blocks the way', card: 'a left-page stone lies under the paper of that stack: blocked', door: 'a locked door', gap: closed ? 'neither side of that stack is paper' : 'a gap', edge: 'the edge of the book', crease: 'the crease (pages only join when closed, or on standing tabs)' })[b.why]} at ${closed ? 'stack' : 'col'} ${b.c + 1}, row ${b.r + 1}`); }
    else { push(); for (const p of path) { s.char = p; steps++; if (L.isWin(s, mode())) { won = true; break; } } const closed = mode() === 'fold'; say(closed ? `arrived at stack ${L.proj(s.char.c) + 1}, row ${s.char.r + 1}, on the ${L.isRight(s.char.c) ? (s.face ? 'THIRD (upper)' : 'RIGHT (upper)') : 'LEFT (under)'} page` : `arrived at col ${s.char.c + 1}, row ${s.char.r + 1}`); }
  } else if (verb === 'undo') { const u = undo.pop(); if (!u) say('nothing to undo'); else { s.grid = u.grid; s.char = u.char; angle = u.angle; s.face = u.face; say('undone'); } }
  else if (verb === 'hint') { hintsUsed++; say('? ' + (text.hint1 && rung++ === 0 ? text.hint1 : text.hint)); }
  else say('unknown action: ' + act);
}
console.log(`LEVEL ${lv.id} — ${text.name}\n「${text.line}」\n`);
console.log(render());
console.log('\n' + (log.length ? log.map((m, i) => `${i + 1}. ${m}`).join('\n') : '(no actions yet)'));
console.log(won ? `\n*** SOLVED *** hinge/turn moves ${turns}, steps ${steps}, hints used ${hintsUsed}` : `\nnot solved yet · hinge/turn moves ${turns}, steps ${steps}, hints used ${hintsUsed}`);
