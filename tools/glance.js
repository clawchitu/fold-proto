// Glance test (docs/difficulty-v3.md §3): can a fresh reader state the solution from one look at the board?
//
// tools/play.js feeds a sampler the board one action at a time, so it reads the level the way a text adventure is read.
// A human does not: they see the whole spread at once, lean the page for two seconds and watch every shadow slide,
// close and undo to see what the press does, turn the book and undo to see the third page. All of that is free in the
// game (undo is one tap), so all of it is part of the "glance". This tool prints exactly that: every view of the board
// a player can reach in the first ten seconds without committing to anything — as ASCII a model reads the way a human
// reads the screen. A level whose route can be written down from this sheet in one shot is eyeball-able.
//
//   node tools/glance.js <id>                      the glance sheet for one level
//   node tools/glance.js --prompt <id>             the full one-shot prompt for a fresh model (rules + sheet + answer format)
//   node tools/glance.js --verify <id> "fold 0" "walk 2,5" …   replay a candidate route through tools/play.js: SOLVED or not
//   node tools/glance.js --all [--chapter 5,6]     sheets for every level (or the given chapters; 暗信 count as chapter 5)
//
// Angles are physical (180 flat · 90 standing · 0 closed), columns and rows 1-based, as the screen and play.js read them.
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('../logic.js');
const LEVELS = require('../levels.js');
const C = require('./check.js');
global.window = global; global.localStorage = { getItem: () => null, setItem() {} }; Object.defineProperty(global, 'navigator', { value: { language: 'en' }, configurable: true });
global.document = { documentElement: { lang: '', style: { setProperty() {} } }, title: '', querySelectorAll: () => [] };
require('../i18n.js');
const I = window.I18N;

// physical lean angles a player sweeps through (the solver's sampled shade angles, fold = 180 − physical)
const LEANS = C.SHADE.map((a) => 180 - a);   // 80 70 60 55 50 40 30
const phys = (fold) => 180 - fold;

const text = (id) => { const out = {}; for (const lang of ['zh', 'en']) { I.setLang(lang); try { out[lang] = I.level(id) || {}; } catch (e) { out[lang] = {}; } } return out; };   // a candidate not yet in i18n.js has no text
function levelNumber(i) {
  const starts = [0, 5, 13, 19, 25, 36];   // first index of chapters 1–6 (levels.js; 暗信 at 32–34 are skipped in the count)
  const lv = LEVELS[i];
  if (lv.optional) return `暗${['一', '二', '三', '四'][LEVELS.filter((l, j) => l.optional && j < i).length]}`;
  const ch = lv.chapter || starts.filter((s) => s <= i).length;
  const first = lv.chapter ? LEVELS.findIndex((l) => l.chapter === lv.chapter) : starts[ch - 1];
  const n = LEVELS.slice(first, i + 1).filter((l) => !l.optional).length;
  return `${ch}-${n}`;
}

const worldOf = (B, g, face) => ({ grid: B.grids[g], h: B.base.h, w: B.base.w, pages: B.pages, face, start: B.base.start, char: { ...B.base.start }, lamp: B.base.lamp });
const tile = (t) => (t === 'S' ? '@' : t);
const pageName = (w) => (L.trifold(w) ? (w.face === 3 ? 'folded leaf (third page on top, right page through its holes)' : w.face === 2 ? 'third page' : 'right page') : w.face ? 'THIRD page' : 'right page');
// ch. 12: the MAP column (0–11) behind a visible column — trifold sheets always print map columns
const mcol = (w, c, r) => (!L.trifold(w) ? c : w.face === 2 ? c + L.N : L.colOf(w, c, r));

function flat(w, title) {
  const rows = [title];
  rows.push('        ' + [1, 2, 3, 4].map((c) => c + ' ').join('') + '| ' + [5, 6, 7, 8].map((c) => c + ' ').join('') + `   (cols 1–4 left page | cols 5–8 ${pageName(w)})`);
  for (let r = 0; r < w.h; r++) {
    let line = `row ${r + 1}   `;
    for (let c = 0; c < w.w; c++) line += tile(L.at(w, c, r)) + ' ' + (c === 3 ? '| ' : '');
    rows.push(line);
  }
  return rows;
}

// a page at every lean angle, side by side. Right-bank lamp: the left page, shadows slide outward (towards column 1) as
// the book closes. Left-bank lamp (ch. 8): the lifted page, shadows slide outward (towards column 8). Two lamps: both.
// Open angle gates print as 'o'.
function leansPage(w, c0) {
  const rows = [];
  const cells = (a) => { const sh = L.shadows(w, 180 - a); const out = []; for (let r = 0; r < w.h; r++) { let s = ''; for (let c = c0; c < c0 + L.N; c++) { const t = L.at(w, c, r); const k = c + ',' + r; s += (t === 'x' ? 'x' : t === 'A' ? (sh.has(k) ? 'o' : 'A') : sh.has(k) ? (L.isFloor(t) ? '▒' : '░') : tile(t)) + ' '; } out.push(s); } return out; };
  const cols = LEANS.map((a) => ({ a, rows: cells(a) }));
  rows.push('         ' + cols.map(({ a }) => `${String(a).padStart(3)}°     `).join(''));
  rows.push('         ' + cols.map(() => [1, 2, 3, 4].map((k) => k + c0).join(' ') + '   ').join(''));
  for (let r = 0; r < w.h; r++) rows.push(`row ${r + 1}    ` + cols.map(({ rows: rr }) => rr[r] + '  ').join(''));
  return rows;
}
function leans(w, title) {
  const lamp = L.lampOf(w), rows = [title];
  const stonesOn = (c0) => { const out = []; for (let r = 0; r < w.h; r++) for (let c = c0; c < c0 + L.N; c++) if (L.at(w, c, r) === 'x') out.push(`${c + 1},${r + 1}`); return out; };
  if (lamp.includes('R')) {
    const st = stonesOn(L.N);
    rows.push(`-- the LEFT page (lamp on the right bank: the ${pageName(w)}'s stones shade it) --`, ...leansPage(w, 0));
    rows.push(st.length ? `(stones on the ${pageName(w)} at col,row ${st.join(' · ')} cast these; a shadow over a gap ░ is walkable and carries you when the hinge moves; a shadow over paper ▒ is just paper)` : `(no stone on the ${pageName(w)}: no shadow on the left page at any angle)`);
  }
  if (lamp.includes('L')) {
    const st = stonesOn(0);
    rows.push(`-- the LIFTED ${pageName(w)} (lamp on the LEFT bank: the flat left page's stones throw their shadows up onto it) --`, ...leansPage(w, L.N));
    rows.push(st.length ? `(stones on the left page at col,row ${st.join(' · ')} cast these onto the lifted page; they slide towards column 8 as the book closes; ░ walkable, ▒ just paper)` : '(no stone on the left page: no shadow on the lifted page at any angle)');
  }
  const gates = []; for (let r = 0; r < w.h; r++) for (let c = 0; c < w.w; c++) if (L.at(w, c, r) === 'A') gates.push(`${c + 1},${r + 1}`);
  if (gates.length) rows.push(`(angle gates at col,row ${gates.join(' · ')} stand open = floor (o) at every lean angle shown; flat or closed they are gaps)`);
  return rows;
}

function pressEvents(w) {
  const s = { ...w, grid: w.grid.map((r) => r.slice()) };
  const at = (p) => `col ${mcol(w, p.c, p.r) + 1},row ${p.r + 1}`;   // ch. 12: map columns, read on the board before the press
  const ev = L.stamp(s);
  return ev.map((e) => e.type === 'bleed' ? `the wet ink bleeds one ring: ${e.cells.map(at).join(', ')} become wet ink (walkable; glue under it is spoiled)` : e.type === 'door' ? `the key at ${at(e.cells[0])} opens the door at ${at(e.cells[1])} (both squares become paper / open door)`
    : e.type === 'ink' ? `the ${e.wet ? 'WET ' : ''}ink at ${at(e.cells[0])} prints onto the gap at ${at(e.cells[1])}: that gap becomes ${e.wet ? 'wet ink (walkable, and it will bleed at the next press)' : 'paper (ink)'}`
    : e.type === 'crane' ? (e.inked ? `the crane at ${at(e.cells[0])} faces wet ink: it is SOAKED — it stays where it is as wet ink and never flies again` : e.glued ? `the crane at ${at(e.cells[0])} flies onto the glue at ${at(e.cells[1])} and is STUCK: whoever stood on it is carried there, both squares are plain paper now` : `the crane at ${at(e.cells[0])} flies to ${at(e.cells[1])} on the other page (its old square is paper; whoever stood on it is carried there — same stack while closed, the other page when you open)`)
    : `the glue at ${at(e.cells[1])} pulls the stone from ${at(e.cells[0])} onto itself: the stone now stands on the glue square, and ${at(e.cells[0])} is paper`);
}

// closing (or turning onto this face): where it crushes you, and what the closed stacks look like after the press
function closed(wBefore, wAfter, verb) {
  const rows = [];
  const crush = [];
  for (let r = 0; r < wBefore.h; r++) for (let c = 0; c < wBefore.w; c++) if (L.isFloor(L.at(wBefore, c, r)) && L.crushed(wBefore, { c, r }, L.FOLD_MIN)) crush.push(`${mcol(wBefore, c, r) + 1},${r + 1}`);
  rows.push(crush.length ? `${verb} while standing on col,row ${crush.join(' · ')} = crushed, back to the start (a ${pageName(wBefore)} stone comes down on that ${L.trifold(wBefore) && wBefore.face === 2 ? 'right' : 'left'}-page square; on glue, the stone opposite is pulled up onto you)` : `${verb} crushes you nowhere`);
  const ev = pressEvents(wBefore);
  rows.push(ev.length ? `the press does (wherever you stand): ${ev.join('; ')}` : 'the press changes nothing on the board');
  const stay = [];   // cranes that do not fly at this press, and why (ch. 10)
  for (let r = 0; r < wBefore.h; r++) for (let c = 0; c < wBefore.w; c++) if (L.at(wBefore, c, r) === 'h' && L.at(wAfter, c, r) === 'h') stay.push(`${c + 1},${r + 1} (its landing ${L.mirror(c) + 1},${r + 1} is ${({ x: 'a stone', r: 'a loose stone', D: 'a door', A: 'a gate', k: 'a key', i: 'ink', G: 'her square', S: 'the start', h: 'another crane', p: 'a tab', o: 'a door' })[L.at(wAfter, L.mirror(c), r)] || 'taken'})`);
  if (stay.length) rows.push(`cranes that do NOT fly at this press: col,row ${stay.join(' · ')} — standing on a left-page crane under a stone, you are crushed like on any paper`);
  rows.push(`closed stacks (walk by STACK column 1–4; each cell = ${pageName(wAfter)} square / left-page square; # = stack blocked by a stone or locked door; you can enter a stack if either side is paper; where both are paper you stay on your page, where one is paper you switch to it):`);
  rows.push('           1        2        3        4');
  for (let r = 0; r < wAfter.h; r++) {
    let line = `row ${r + 1}    `;
    for (let q = 0; q < L.N; q++) {
      const top = tile(L.at(wAfter, L.mirror(q), r)), under = tile(L.at(wAfter, q, r));
      const open = L.cellBlock(wAfter, q, r, 'fold', null) === null;
      line += (open ? ' ' : '#') + `${top}/${under}` + (open ? ' ' : '#') + '    ';
    }
    rows.push(line);
  }
  return rows;
}

// ---------- ch. 12 「三折」: the trifold sheet (docs/design-ch12.md §1) ----------
// Every view of a two-crease letter a player reaches in the first seconds: the book with the third page flat (one rigid
// leaf), the third page on its own crease with the book flat, the third page folded down, and the book closed on it.
// Columns are MAP columns throughout: 1–4 left | 5–8 right | 9–12 third page.
function triPrint(w, title) {
  const rows = [title], T = (c, r) => tile(L.at(w, c, r));
  if (w.face === 0) {
    rows.push('        1 2 3 4 | 5 6 7 8 ‖ 9 10 11 12   (| the book\'s crease · ‖ the third page\'s own crease)');
    for (let r = 0; r < w.h; r++) { let line = `row ${r + 1}   `; for (let c = 0; c < 12; c++) line += T(c, r) + (c >= 8 ? '  ' : ' ') + (c === 3 ? '| ' : c === 7 ? '‖ ' : ''); rows.push(line); }
  } else if (w.face === 2) {
    rows.push('        5 6 7 8 ‖ 9 10 11 12   (book flat; right page = the flat page, third page = the lifted page; the left page lies aside, out of reach)');
    for (let r = 0; r < w.h; r++) { let line = `row ${r + 1}   `; for (let c = 0; c < 8; c++) line += T(c, r) + (c >= 4 ? '  ' : ' ') + (c === 3 ? '‖ ' : ''); rows.push(line); }
  } else {
    rows.push('        1 2 3 4 | 5 6 7 8   (third page folded onto the right page: cols 5–8 are the two-layer leaf as seen from above)');
    for (let r = 0; r < w.h; r++) { let line = `row ${r + 1}   `; for (let c = 0; c < 8; c++) line += T(c, r) + ' ' + (c === 3 ? '| ' : ''); rows.push(line); }
    rows.push('layers of cols 5–8 (Tn = the third page\'s col n on top · Rn = the right page\'s col n through a HOLE in the third page · X = a stone in either layer):');
    for (let r = 0; r < w.h; r++) { let line = `row ${r + 1}   `; for (let c = 4; c < 8; c++) { const m = L.colOf(w, c, r); line += (L.isBlock(L.at(w, c, r)) ? 'X' : m >= 8 ? 'T' : 'R') + String(m + 1).padEnd(3); } rows.push(line); }
  }
  return rows;
}
function triLeans(w, title) {   // shadows on the flat page (right-bank lamp) at each lean
  const rows = [title], flatCols = w.face === 2 ? [0, 1, 2, 3] : [0, 1, 2, 3];
  rows.push('         ' + LEANS.map((a) => `${String(a).padStart(3)}°     `).join(''));
  for (let r = 0; r < w.h; r++) rows.push(`row ${r + 1}    ` + LEANS.map((a) => { const sh = L.shadows(w, 180 - a); return flatCols.map((c) => { const t = L.at(w, c, r), k = c + ',' + r; return t === 'x' || t === 'r' ? t : sh.has(k) ? (L.isFloor(t) ? '▒' : '░') : tile(t); }).join('') + '      '; }).join(''));
  rows.push(`(cols ${w.face === 2 ? '5–8, the right page' : '1–4, the left page'}; ░ shadow over a gap = walkable, carries you when the hinge moves · ▒ shadow over paper = just paper)`);
  return rows;
}
function triSheet(lv) {
  const B = C.grids(lv), t = text(lv.id), i = LEVELS.indexOf(lv), out = [];
  const W = (g, face) => worldOf(B, g, face);
  const loose = lv.map.join('').includes('r'), sig = (g) => B.grids[g].flat().join('');
  out.push(`LEVEL ${i >= 0 ? levelNumber(i) : '?'} · ${lv.id} · 「${t.zh.name || ''}」 / ${t.en.name || ''} · tier ${lv.tier || '?'}`);
  out.push(`line shown under the title: 「${t.zh.line || ''}」 / “${t.en.line || ''}”`);
  out.push(`board ${B.base.h} rows × 12 columns: a TRIFOLD letter — left page | right page | third page, the third page on its OWN crease at the right page's outer edge.`);
  out.push('legend: @ you (start, paper)  . paper  - gap  x stone  r LOOSE stone  h PAPER CRANE  k key  D locked door  i ink  I WET ink  g glue  G her (the letter)');
  out.push('');
  out.push(...triPrint(W(0, 0), '== VIEW 1 · as the level opens: everything flat (book 180°, third page 180°) =='));
  out.push('');
  // A · the book with the third page flat: one rigid leaf
  let gA = 0;
  if (loose) { gA = B.roll(0, 0, null); if (gA !== 0) { out.push(...triPrint(W(gA, 0), '== VIEW A1 · lifting the BOOK past upright with the third page flat (one stiff leaf: right + third page lift together; every loose stone on it rolls one square towards the BOOK\'s crease, across the flat second crease) ==')); out.push(''); } }
  out.push(...triLeans(W(gA, 0), '== VIEW A2 · leaning the BOOK, third page flat: right- AND third-page stones shade the left page =='));
  out.push('');
  const w0 = W(gA, 0), off = [];
  for (let r = 0; r < w0.h; r++) for (let c = 8; c < 12; c++) if (L.isFloor(L.at(w0, c, r))) off.push(`${c + 1},${r + 1}`);
  out.push('== VIEW A3 · CLOSING the book with the third page flat: the third page swings out past the left page and lies on the table ==');
  if (off.length) out.push(`standing on the third page (any of col,row ${off.slice(0, 6).join(' · ')}${off.length > 6 ? ' …' : ''}) when the book closes = off the book: back to the start`);
  const gA1 = B.press(gA, 0);
  out.push(...closed(w0, W(gA1, 0), 'closing'));
  out.push('');
  // F · the third page on its own crease, the book flat
  let gF = 0;
  if (loose) { gF = B.roll(0, 2, null); if (gF !== 0) { out.push(...triPrint(W(gF, 2), '== VIEW F1 · lifting the THIRD PAGE past upright (book flat): its loose stones roll one square towards ITS crease (cols 8|9) ==')); out.push(''); } }
  out.push(...triLeans(W(gF, 2), '== VIEW F2 · leaning the THIRD PAGE (book flat): its stones shade the RIGHT page =='));
  out.push('');
  const wF = W(gF, 2), squeeze = [];
  for (let r = 0; r < wF.h; r++) for (let c = 4; c < 8; c++) if (L.isFloor(L.at(wF, c, r)) && L.flapBlock(wF, { c, r })) squeeze.push(`${c + 5},${r + 1}`);
  out.push('== VIEW F3 · FOLDING the third page down onto the right page (book flat) — this is a press: right page against third page ==');
  if (squeeze.length) out.push(`standing on the third page at col,row ${squeeze.join(' · ')} the fold is REFUSED (a right-page stone is right under you) — not a death, it just will not go down`);
  const gF1 = B.press(gF, 2);
  out.push(...closed(wF, W(gF1, 2), 'folding the third page').slice(0, 3));
  out.push('');
  const wFold = W(gF1, 3);
  out.push(...triPrint(wFold, '== VIEW F4 · the third page lies folded on the right page; book flat (third col n lies on right col 17 − n; a stone in either layer is a stone; a hole in the third page shows the right page) =='));
  out.push('');
  // B · the book closed with the third page folded
  let gB = gF1;
  if (loose) { const n = B.roll(gF1, 3, null); if (n !== gF1) { gB = n; out.push(...triPrint(W(gB, 3), '== VIEW B1 · lifting the BOOK past upright with the third page folded on: the folded leaf\'s loose stones roll towards the BOOK\'s crease — on the third page that is AWAY from its own crease ==')); out.push(''); } }
  out.push(...triLeans(W(gB, 3), '== VIEW B2 · leaning the BOOK with the third page folded: the folded leaf\'s stones shade the left page =='));
  out.push('');
  const gB1 = B.press(gB, 3);
  out.push('== VIEW B3 · CLOSING the book on the folded third page: the left page meets the folded leaf (left col q meets third col q + 8 where the third page has paper — two mirrors bring a column home — or right col 8 − q through its holes) ==');
  out.push(...closed(W(gB, 3), W(gB1, 3), 'closing'));
  out.push('');
  if (sig(gB1) !== sig(gB)) { out.push(...triPrint(W(B.roll(gB1, 3, null), 3), '== VIEW B4 · opened flat again after that close (third page still folded) ==')); out.push(''); }
  if (sig(gA1) !== sig(gA)) { out.push(...triPrint(W(B.roll(gA1, 0, null), 0), '== VIEW A4 · opened flat again after closing with the third page flat ==')); out.push(''); }
  return out.join('\n');
}

function sheet(lv) {
  if (lv.trifold) return triSheet(lv);   // ch. 12
  const B = C.grids(lv);
  const t = text(lv.id);
  const i = LEVELS.indexOf(lv);
  const three = B.pages > 2;
  const out = [];
  out.push(`LEVEL ${levelNumber(i)} · ${lv.id} · 「${t.zh.name || ''}」 / ${t.en.name || ''} · tier ${lv.optional ? '暗信 (optional challenge)' : lv.tier}`);
  out.push(`line shown under the title: 「${t.zh.line || ''}」 / “${t.en.line || ''}”`);
  out.push(`board ${B.base.h} rows × 8 visible columns${three ? '. This letter has THREE pages: the third page is the back of the right leaf; it is not visible until you close the book and turn it over (view 5–6 below)' : ' (two pages)'}.`);
  out.push('legend: @ you (start, paper)  . paper  - gap  x stone  r LOOSE stone (rolls one square towards the crease each time the lifted page passes upright)  h PAPER CRANE (floor; at every press it flies to its mirror square and carries whoever stands on it)  k key  D locked door  o open door  i ink  I WET ink (bleeds a ring at every press)  p pop-up tab (stands as a bridge across the crease at 60°–120°)  g glue  A angle gate (floor only while the page leans 26°–89°)  G the letter (goal)');
  const lamp = L.lampOf(B.base);
  out.push(`LAMP: ${lamp === 'LR' ? 'TWO lamps, one on each bank — right-page stones shade the left page AND left-page stones shade the lifted page' : lamp === 'L' ? 'on the LEFT bank — the flat left page\'s stones throw their shadows up onto the lifted page (columns 5–8); no shadow falls on the left page' : 'on the right bank (as in every level so far)'}.`);
  out.push('');
  const w0 = worldOf(B, 0, 0);
  out.push(...flat(w0, '== VIEW 1 · as the level opens: book flat (180°) =='));
  out.push('');
  // vol. 3 ch. 9 (docs/design-vol3.md §4 ③): loose stones roll each time the page passes upright, so the board you lean on is
  // the board after one pass, the board you lean on a second time (after flattening) is the board after three, and the
  // board you close on is always the board after an odd number of passes. Print the chain until the stones settle.
  const loose = lv.map.join('').includes('r');
  const chain = [0];
  if (loose) for (let g = 0, k = 1; k <= 5; k++) { const n = B.roll(g, 0, null); if (n === g) break; chain.push(n); g = n; }
  const K = chain.length - 1, sig = (g) => B.grids[g].flat().join('');
  if (loose) {
    out.push(`LOOSE STONES: every time the lifted page passes upright (90°) — on the way to a lean, on the way back flat, on the way to a close, on the way open again — each loose stone on the right page rolls one square towards the hinge: onto paper it rolls, into a gap it drops and the gap is PAPER from then on (the stone is gone), against anything else (a stone, a door, ink, glue, her, the start, YOU standing in front of it) it stays. The views below assume you are in no stone's way; standing on the right page directly hinge-side of a loose stone holds it. The stones settle after ${K} pass${K === 1 ? '' : 'es'}.`);
    out.push('');
    for (let k = 1; k <= K; k++) {
      const wk = worldOf(B, chain[k], 0);
      out.push(...flat(wk, `== VIEW 2·${k} · after the page has passed upright ${k} time${k > 1 ? 's' : ''} (${k % 2 ? 'the page is lifted now' : 'the page is flat again'}) ==`));
      if (k % 2 || k === K) { out.push(''); out.push(...leans(wk, `== VIEW 2·${k}b · leaning on this board (${k % 2 ? `the lean that made pass ${k}` : `the next lean, pass ${k + 1}, rolls nothing more`}) ==`)); }
      out.push('');
    }
  } else {
    out.push(...leans(w0, '== VIEW 2 · leaning the right page (the page(s) the lamp shades). Reversible unless you are standing on a shadow or an open gate =='));
    out.push('');
  }
  // closing: from flat the close is itself a pass (board after 1 pass is pressed); after a lean-and-back it is pass 3, …
  const pressFrom = loose ? chain[Math.min(1, K)] : 0;
  const g1 = B.press(pressFrom, 0), w1 = worldOf(B, g1, 0), wp = worldOf(B, pressFrom, 0);
  out.push(loose ? '== VIEW 3 · closing the book (0°) from flat: the close passes upright first (pass 1), then presses ==' : '== VIEW 3 · closing the book (0°) from this spread ==');
  out.push(...closed(wp, w1, 'closing'));
  out.push('');
  if (loose) {
    const seen = new Set([sig(pressFrom)]);
    for (let k = 3; k <= K + 1; k += 2) {
      const gk = chain[Math.min(k, K)]; if (seen.has(sig(gk))) continue; seen.add(sig(gk));
      const gq = B.press(gk, 0);
      out.push(`== VIEW 3·${k} · closing after the page has passed upright ${k} times (lean, back flat, … then close) ==`);
      out.push(...closed(worldOf(B, gk, 0), worldOf(B, gq, 0), 'closing'));
      out.push('');
    }
  }
  if (g1 !== 0 && w1.grid.flat().join('') !== w0.grid.flat().join('')) {
    if (loose) {
      const go = B.roll(g1, 0, null), wo = worldOf(B, go, 0);
      out.push(...leans(w1, '== VIEW 4a · opened PARTWAY after that close (a lean: no pass, the stones stay where the press left them) =='));
      out.push('');
      out.push(...flat(wo, '== VIEW 4 · opened FLAT after that close: opening passes upright once more, the loose stones roll again =='));
    } else out.push(...flat(w1, '== VIEW 4 · opened again after that close: the board as it now is =='));
    out.push('');
    if (!loose) out.push(...leans(w1, '== VIEW 4b · leaning after the close (the stones that moved cast new shadows) =='));
    if (!loose) out.push('');
    const g1b = B.press(g1, 0);
    // wet ink (ch. 7): every press grows the ink, so print the board after a second and a third close too (the player
    // can close / undo as often as they like); the route between the closes is what the sheet cannot show
    let gk = g1, wk = w1;
    for (let k = 2; k <= 3; k++) {
      const gn = B.press(gk, 0);
      if (B.grids[gn].flat().join('') === B.grids[gk].flat().join('')) break;
      const wn = worldOf(B, gn, 0);
      out.push(`== close no. ${k} from this spread would do: ` + pressEvents(wk).join('; ') + ' ==');
      out.push(...closed(wk, wn, `close no. ${k}`).slice(2));
      out.push(...flat(wn, `== VIEW 4·${k} · opened after ${k} closes (no turn between) ==`));
      out.push(...leans(wn, `== VIEW 4b·${k} · leaning after ${k} closes ==`));
      out.push('');
      gk = gn; wk = wn;
    }
  } else {
    out.push('== VIEW 4 · opened again after that close: the board is unchanged ==');
    out.push('');
  }
  if (three) {
    const w1t = { ...w1, face: 1 };
    const g2 = B.press(g1, 1), w2 = worldOf(B, g2, 1);
    out.push('== VIEW 5 · closed, then TURNED OVER (only possible standing on the left page; the third page now presses on the left page) ==');
    out.push(...closed(w1t, w2, 'turning'));
    out.push('');
    out.push(...flat(w2, '== VIEW 6 · turned and opened: left page | THIRD page (the right page is away, behind the leaf) =='));
    out.push('');
    out.push(...leans(w2, '== VIEW 6b · leaning while turned: the third page’s stones cast the shadows now =='));
    out.push('');
    const g3 = B.press(g2, 0), w3 = worldOf(B, g3, 0);
    if (g3 !== g2 && B.grids[g3].flat().join('') !== w2.grid.flat().join('')) {
      out.push('== VIEW 7 · closed and TURNED BACK (the right page faces the left page again; this press changes the board) ==');
      out.push(...closed({ ...w2, face: 0 }, w3, 'turning back'));
      out.push('');
      out.push(...flat(w3, '== VIEW 8 · turned back and opened: left page | right page, as they now are =='));
      out.push('');
      out.push(...leans(w3, '== VIEW 8b · leaning after turning back =='));
      out.push('');
      const g4 = B.press(g3, 1);
      if (g4 !== g3 && B.grids[g4].flat().join('') !== w3.grid.flat().join('')) { out.push('== turning over a second time would do: ' + pressEvents({ ...w3, face: 1 }).join('; ') + ' =='); out.push(''); }
    } else { out.push('== turning back to the right page changes nothing on the board =='); out.push(''); }
  }
  return out.join('\n');
}

const RULES = `You are a player of Letterfold (折信), a paper-folding puzzle. You have finished volume 1 and the earlier levels of this chapter, so you know every rule below. Read the board sheet, then write the solution route IN ONE SHOT: you get no feedback, no second try, no tools. Do not hedge or give alternatives.

RULES (everything you know)
- The board is an open book: left page (columns 1–4) and the page facing it (columns 5–8), hinge between columns 4 and 5. Rows are numbered from the top. Tiles: . paper (walkable), - gap (not walkable), x stone (blocks; blocks light), k key, D locked door (blocks), o open door, i ink, I wet ink (walkable), p pop-up tab, g glue (walkable paper), G the letter = goal, @ where you start.
- You can only walk on paper / keys / ink / glue / open doors / shadows-over-gaps, orthogonally, on your own page. You cannot cross the hinge while the book is open (except on a standing pop-up bridge).
- Hinge angle: 180° flat, 90° standing, 0° closed. It moves in 5° steps from the current angle. Three postures matter: OPEN (> 120° or < 60°… see below), STANDING 60°–120°, CLOSED 0°–25°.
- STANDING (60°–120°): pop-up tabs p on both sides of the hinge in the same row stand up and bridge the crease: you can step from one to the other.
- LEANING (the right page tilted towards the lamp, physical 26°–89°): every stone on the facing page casts a shadow onto the left page in the same row. The shadow starts at the hinge-side and slides outward (towards column 1) as the book closes further; at 0° the stone itself lands on its mirror square (col c on the right lands on col 9−c on the left). A shadow over a GAP is walkable floor while it lasts; a shadow over paper is just paper. If you stand on a shadow-over-gap and the hinge moves, the shadow carries you with it (a RIDE) — if it slides onto a stone or off the page you fall; if it reaches 0° the stone lands on you. Opening the book (towards 180°) moves shadows back towards the hinge, so a ride can go either way.
- CLOSED (0°): the facing page lies ON the left page. You walk the stacks (stack columns 1–4): a stack can be entered if either of its two squares is paper and neither is a stone or a locked door. Where both squares are paper you stay on the page you are on; where only one is paper you switch to that page. Opening the book again, you are on whichever page you ended on.
- CLOSING CRUSHES: if you stand on the left page and a stone on the facing page is over your square (its mirror), closing crushes you: back to the start, board unchanged otherwise. Standing on the facing page above a left-page stone is safe (you stand on its back) — and when the book closes you are then INSIDE a stack that the stack map marks blocked: you can walk out of it into neighbouring stacks, but no one can walk into it. (Earlier levels used this.)
- THE PRESS (the moment the book closes, wherever you stand, all at once): a key pressed against a door opens it; ink pressed against a gap prints onto it (that gap becomes paper); glue pressed against a stone pulls the stone onto the glue square (the stone changes page; its old square becomes paper; its shadow and its crushing go with it; the glue is used up). Standing on glue when it pulls a stone = crushed.
- WET INK (I): walkable like ink, but it has not dried. At EVERY press (a close, a turn of the closed book), before anything else, every wet square spreads one ring into the GAP and GLUE squares beside it on its own page (paper, stones, doors, the hinge and the page edge stop it; glue it covers is spoiled and pulls nothing). Then it prints, like ink, onto the gap facing it — and what it prints is wet too. So each close grows the ink one ring on both pages; a gap you were going to cross on a shadow may be paper by then (a shadow over paper carries no one), and the ink never dries or shrinks.
- LAMP POSITION (chapter 8 「灯位」; the sheet says where the lamp is): with the lamp on the LEFT bank the shadows go the other way — every stone on the flat LEFT page throws its shadow UP onto the lifted page (columns 5–8) in its row; the shadow starts beside the hinge and slides OUTWARD towards column 8 as the book closes (at 0° it reaches the stone's mirror square, col 9−c; a stone at col 1 shades col 6 at 60° and col 7 at 45°–30°, a stone at col 4 shades col 5 at 60°–30°), and no shadow falls on the left page. Rides on the lifted page work the same way: a shadow over a gap carries you; when the lean ends (closing past 26°, or opening past 89°) you fall. With TWO lamps both sets of shadows exist at once. A stone that changes page (glue) changes which page its shadow falls on.
- ANGLE GATE (A): a paper flap over a gap. It stands = it is floor ONLY while the page leans (physical 26°–89°, the same window in which shadows exist). Flat (> 89°) or closed it is a gap: you cannot step on it, a closed stack with a gate on one side is open only if the other side is paper, and if you are standing on a gate when the lean ends you fall (back to the start). Ink does not print onto it, wet ink does not bleed into it.
- LOOSE STONE (r, chapter 9 「滚」): a stone that is not glued down. It blocks, shades and crushes like a stone. Every time the lifted (right) page passes upright — the hinge crosses 90° in either direction: leaning from flat is one pass, leaning back flat is another, closing from flat is one, opening flat after a close is one more; opening only partway (to a lean) after a close is none — every loose stone on the right page rolls ONE square towards the hinge (col 8 → 7 → 6 → 5; at col 5 it stops). Onto paper it rolls (its old square is paper). Into a gap it DROPS and fills it: that gap is paper from then on and the stone is gone (a bridge). Against anything else — a stone, a loose stone that cannot move, a door, ink, glue, a key, her square, the start square, or YOU standing on the square in front of it — it stays. The stone nearest the hinge rolls first, so a line of loose stones rolls together. Stones on the flat left page never roll. The roll happens BEFORE anything else in the same hinge move: before the shadows at the new angle are cast, before the press (so a close presses the board AFTER the roll: crushes, stacks and glue are judged on the rolled board), and the shadow a loose stone casts moves with it. Glue that pulls a loose stone holds it: it becomes a fixed stone.
- PAPER CRANE (h, chapter 10 「鹤」): a square of paper folded into a crane — floor you can stand on. At EVERY press (a close, and a turn of the closed book) each crane flies to its MIRROR square on the facing page (col c → col 9−c, same row), and whoever stands on it flies with it: closed you are in the same stack, but when the book opens you are on the OTHER page. Its old square is paper. Landing on paper or on a gap it lands (a gap it sits in is floor as long as it stays — and paper once it leaves). Landing on WET INK it is soaked: it stays where it is as wet ink, never flies again, and bleeds like any wet ink from then on. Landing on GLUE it sticks: it carries you one last time and both squares are plain paper (the glue is used up). Landing on anything else — a stone, a loose stone, a door, a gate, a key, dry ink, her square, the start, another crane — it does NOT fly and stays. ORDER within one press: the roll of the sweep (a loose stone can roll onto the landing first) → the bleed (wet ink can fill the landing first) → keys / ink / glue → the cranes. Next press it flies back (its old square is paper, so the landing is free): the crane goes back and forth, whether you want it to or not. A crane under a stone's mirror is paper, not a stone's back: standing on it on the left page when the book closes, the stone comes down on you.
- THREE-PAGE letters only: the third page is the back of the right leaf. With the book CLOSED and you standing on the LEFT page you may TURN the book over: the third page now faces the left page (columns 5–8 show the third page). Turning is a press too (keys/ink/glue between left and third page act; a third-page stone over your square crushes you — then the whole level restarts). Turn again to come back to the right page (another press). The letter may lie on the third page.
- TRIFOLD letters only (chapter 12 「三折」): 12 columns — left page 1–4 | right page 5–8 | third page 9–12 — and TWO creases: the book's (4|5) and the third page's own (8|9). ONE crease moves at a time: the third page only while the book lies flat (180°); the book only while the third page lies flat or is folded all the way down. You can never cross the second crease on foot. (a) Book moving, third page FLAT: right + third page lift together as one stiff leaf (their loose stones roll towards the book's crease, across the flat second crease; their stones shade the left page); closed, the third page sticks out past the left page onto the table — standing on it then = off the book, back to the start. (b) Third page moving, book flat: an ordinary book of its own — right page flat, third page lifted; its loose stones roll towards cols 8|9, its stones shade the right page, and folding it down is a PRESS (right against third: glue, ink, keys, cranes; third col n meets right col 17 − n). You are frozen on the left page meanwhile. If you stand on the third page right over a right-page stone, the fold is refused (no death). After the fold you stand on the TOP layer of where you stood. (c) Book moving, third page FOLDED: the right leaf has two layers — each square is the third page's (col 17 − c) unless that is a HOLE, then the right page shows through; a stone in either layer is a stone. Its loose stones roll towards the book's crease — on the third page that is away from its own crease. Closed, left col q meets third col q + 8 (two mirrors = the same column) or, through a hole, right col 8 − q.
- Undo exists in the game, but THIS test is one shot.

ACTIONS (write the route in this grammar, one per line; coordinates are col,row as printed, 1-based; angles are physical):
  fold <angle>        move the hinge to this angle (0 = closed, 180 = flat). The move passes through every 5° in between (rides happen).
  walk <col>,<row>    walk to that square on your current page (the game finds the path if one exists). When closed, <col> is the STACK column 1–4.
  flip                turn the closed book over (closed, standing on the left page).
  flap <angle>        (trifold only) move the THIRD page's own crease to this angle (180 = flat, 0 = folded onto the right page); only while the book lies flat. Columns in walk are always map columns 1–12.
`;

function prompt(lv) {
  return RULES + '\nBOARD SHEET (every view you can reach in the first seconds, with undo)\n\n' + sheet(lv) +
    '\n\nANSWER FORMAT (nothing else):\n```route\n<one action per line, at most 14 lines>\n```\ntrick: <one sentence: what the level wants you to notice>\nconfidence: <0–10 that this route solves it>\n';
}

function verify(id, actions) {
  const out = execFileSync('node', [path.join(__dirname, 'play.js'), id, ...actions], { encoding: 'utf8' });
  return { solved: /\*\*\* SOLVED \*\*\*/.test(out), out };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const flag = (f) => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, v && !v.startsWith('--') ? 2 : 1); return v || true; };
  const all = flag('--all'), chapters = flag('--chapter'), wantPrompt = flag('--prompt'), wantVerify = flag('--verify');
  if (all) {
    const want = chapters ? String(chapters).split(',').map(Number) : null;
    const chOf = (lv, i) => lv.chapter || (lv.optional ? 5 : [0, 5, 13, 19, 25].filter((s) => s <= i).length);
    LEVELS.forEach((lv, i) => { if (!want || want.includes(chOf(lv, i))) console.log(sheet(lv) + '\n' + '='.repeat(100) + '\n'); });
  } else if (wantVerify) {
    const lv = LEVELS.find((l) => l.id === wantVerify); if (!lv) { console.log('no level ' + wantVerify); process.exit(1); }
    const { solved, out } = verify(wantVerify, args);
    console.log(out); console.log('\nGLANCE VERIFY: ' + (solved ? 'SOLVED in one shot (eyeball-able route)' : 'not solved'));
  } else {
    const id = wantPrompt || args[0];
    const lv = LEVELS.find((l) => l.id === id); if (!lv) { console.log('no level ' + id); process.exit(1); }
    console.log(wantPrompt ? prompt(lv) : sheet(lv));
  }
}

module.exports = { sheet, prompt, verify, RULES, LEANS };
