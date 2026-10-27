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
const pageName = (w) => (w.face ? 'THIRD page' : 'right page');

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
  const ev = L.stamp(s);
  const at = (p) => `col ${p.c + 1},row ${p.r + 1}`;
  return ev.map((e) => e.type === 'bleed' ? `the wet ink bleeds one ring: ${e.cells.map(at).join(', ')} become wet ink (walkable; glue under it is spoiled)` : e.type === 'door' ? `the key at ${at(e.cells[0])} opens the door at ${at(e.cells[1])} (both squares become paper / open door)`
    : e.type === 'ink' ? `the ${e.wet ? 'WET ' : ''}ink at ${at(e.cells[0])} prints onto the gap at ${at(e.cells[1])}: that gap becomes ${e.wet ? 'wet ink (walkable, and it will bleed at the next press)' : 'paper (ink)'}`
    : `the glue at ${at(e.cells[1])} pulls the stone from ${at(e.cells[0])} onto itself: the stone now stands on the glue square, and ${at(e.cells[0])} is paper`);
}

// closing (or turning onto this face): where it crushes you, and what the closed stacks look like after the press
function closed(wBefore, wAfter, verb) {
  const rows = [];
  const crush = [];
  for (let r = 0; r < wBefore.h; r++) for (let c = 0; c < wBefore.w; c++) if (L.isFloor(L.at(wBefore, c, r)) && L.crushed(wBefore, { c, r }, L.FOLD_MIN)) crush.push(`${c + 1},${r + 1}`);
  rows.push(crush.length ? `${verb} while standing on col,row ${crush.join(' · ')} = crushed, back to the start (a ${pageName(wBefore)} stone comes down on that left-page square; on glue, the stone opposite is pulled up onto you)` : `${verb} crushes you nowhere`);
  const ev = pressEvents(wBefore);
  rows.push(ev.length ? `the press does (wherever you stand): ${ev.join('; ')}` : 'the press changes nothing on the board');
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

function sheet(lv) {
  const B = C.grids(lv);
  const t = text(lv.id);
  const i = LEVELS.indexOf(lv);
  const three = B.pages > 2;
  const out = [];
  out.push(`LEVEL ${levelNumber(i)} · ${lv.id} · 「${t.zh.name || ''}」 / ${t.en.name || ''} · tier ${lv.optional ? '暗信 (optional challenge)' : lv.tier}`);
  out.push(`line shown under the title: 「${t.zh.line || ''}」 / “${t.en.line || ''}”`);
  out.push(`board ${B.base.h} rows × 8 visible columns${three ? '. This letter has THREE pages: the third page is the back of the right leaf; it is not visible until you close the book and turn it over (view 5–6 below)' : ' (two pages)'}.`);
  out.push('legend: @ you (start, paper)  . paper  - gap  x stone  k key  D locked door  o open door  i ink  I WET ink (bleeds a ring at every press)  p pop-up tab (stands as a bridge across the crease at 60°–120°)  g glue  A angle gate (floor only while the page leans 26°–89°)  G the letter (goal)');
  const lamp = L.lampOf(B.base);
  out.push(`LAMP: ${lamp === 'LR' ? 'TWO lamps, one on each bank — right-page stones shade the left page AND left-page stones shade the lifted page' : lamp === 'L' ? 'on the LEFT bank — the flat left page\'s stones throw their shadows up onto the lifted page (columns 5–8); no shadow falls on the left page' : 'on the right bank (as in every level so far)'}.`);
  out.push('');
  const w0 = worldOf(B, 0, 0);
  out.push(...flat(w0, '== VIEW 1 · as the level opens: book flat (180°) =='));
  out.push('');
  out.push(...leans(w0, '== VIEW 2 · leaning the right page (the page(s) the lamp shades). Reversible unless you are standing on a shadow or an open gate =='));
  out.push('');
  const g1 = B.press(0, 0), w1 = worldOf(B, g1, 0);
  out.push('== VIEW 3 · closing the book (0°) from this spread ==');
  out.push(...closed(w0, w1, 'closing'));
  out.push('');
  if (g1 !== 0 && w1.grid.flat().join('') !== w0.grid.flat().join('')) {
    out.push(...flat(w1, '== VIEW 4 · opened again after that close: the board as it now is =='));
    out.push('');
    out.push(...leans(w1, '== VIEW 4b · leaning after the close (the stones that moved cast new shadows) =='));
    out.push('');
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
- THREE-PAGE letters only: the third page is the back of the right leaf. With the book CLOSED and you standing on the LEFT page you may TURN the book over: the third page now faces the left page (columns 5–8 show the third page). Turning is a press too (keys/ink/glue between left and third page act; a third-page stone over your square crushes you — then the whole level restarts). Turn again to come back to the right page (another press). The letter may lie on the third page.
- Undo exists in the game, but THIS test is one shot.

ACTIONS (write the route in this grammar, one per line; coordinates are col,row as printed, 1-based; angles are physical):
  fold <angle>        move the hinge to this angle (0 = closed, 180 = flat). The move passes through every 5° in between (rides happen).
  walk <col>,<row>    walk to that square on your current page (the game finds the path if one exists). When closed, <col> is the STACK column 1–4.
  flip                turn the closed book over (closed, standing on the left page).
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
