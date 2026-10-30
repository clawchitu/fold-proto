// Reversal hunt (design-ch7.md §8): hill-climb from a hand seed with gen.js fitness PLUS a structural predicate that states the level's expectation reversal (e.g. the turn fires a glue that takes a left stone; a glue becomes a stone before the ink ring reaches it). Boards that fail the predicate never enter the archive; the final ranking drops noise > 1. node tools/hunt.js <name> <seconds> <seed>
'use strict';
const P = require('path').join(__dirname, '..') + '/';   // run from anywhere: node tools/hunt.js <pocket|through|taken|twolamps|jump|hold|late|order|settle> <seconds> <seed>
const L = require(P + 'logic.js'), C = require(P + 'tools/check.js'), G = require(P + 'tools/gen.js');
const [name, secs, seedN] = [process.argv[2], +process.argv[3] || 300, +process.argv[4] || 1];
const T = {
  pocket: { rows: 5, pages: 2, lamp: null, tiles: '.-xgI', par: 4, closes: 2, minpar: 3, need: 'wet', elements: 9, minlen: 15, phases: 2, backs: 1,
    seed: ['G.-..--.', '-x-.--..', '.g-I..x.', '--.--.S-', '..-.--..'],
    pred: (m, X) => { // 7-4 taught "ink spoils glue": here the ink is two squares from the glue, so the glue fires FIRST (press 1) and the ring is stopped by the stone it became (press 2). The player's 7-4 reading — glue dead, stone stays — has its own, shorter route (the variant with the glue as paper is solvable), which the real board does not allow (the real solution differs).
      const b = X.B.base.grid, g1 = X.B.G[X.B.press(0, 0)]; let fired = false, stopped = false, imagined = false, differs = false;
      for (let r = 0; r < b.length; r++) for (let c = 0; c < 8; c++) if (b[r][c] === 'g' && g1[r][c] === 'x') { fired = true;
        const v = b.map((row) => row.join('')); const mc = L.mirror(c); v[r] = v[r].slice(0, mc) + '.' + v[r].slice(mc + 1);
        const Bv = G.prep({ map: v }); const v2 = Bv.G[Bv.press(Bv.press(0, 0), 0)]; if (v2[r][c] === 'I') stopped = true;
        const w = b.map((row) => row.join('')); w[r] = w[r].slice(0, c) + '.' + w[r].slice(c + 1);
        const mw = G.measure({ map: w }); if (mw.solvable && mw.len <= m.len) { imagined = true; if (mw.solution !== m.solution) differs = true; } }
      return [fired, stopped, imagined, differs, m.closes >= 2, m.backs >= 1, m.phases >= 2, m.needsWet]; } },
  through: { rows: 4, pages: 3, lamp: null, tiles: '.-xI', par: 5, closes: 3, minpar: 4, need: 'flip+wet', elements: 8, minlen: 18, phases: 3, backs: 0,
    seed: ['G--.----..x.', '-.-I-.---..-', '..x---.Sx---', '---.-----.I-'],
    pred: (m, X) => [m.goalFace !== 1, m.needsFlip, (m.flips || 0) >= 2, m.phases >= 3, m.needsWet, m.closes >= 1] },
  taken: { rows: 5, pages: 2, lamp: 'LR', tiles: '.-xgI', par: 4, closes: 2, minpar: 3, need: 'lamp+ride', elements: 9, minlen: 15, phases: 1, backs: 0,
    seed: ['-.-..-x-', 'g-x.-..x', '.-S.-x.-', 'x--.g--.', '.----G--'],
    pred: (m, X) => { // the solution rides a shadow on the LIFTED page cast by a stone glue moved there; the first close also prints wet ink onto the lifted page
      const st = X.states; let madeR = false;
      for (const s of st) { if (G_posture(s.a) !== 'lean' || !L.isRight(s.c) || L.isFloor(L.at(X.B.world(s.g, s.face), s.c, s.r))) continue;
        const src = X.B.shadowsAt(s.g, s.face, s.a).get(s.c + ',' + s.r); if (src != null && src !== 'A' && X.B.base.grid[s.r][src] !== 'x') madeR = true; }
      return [madeR, m.glueFires, m.needsLamp, m.ride, m.needsWet, m.closes >= 1]; } },
  twolamps: { rows: 4, pages: 3, lamp: 'LR', tiles: '.-xgIA', par: 5, closes: 3, minpar: 4, need: 'lamp+flip+glue', elements: 10, minlen: 18, phases: 2, backs: 0,
    seed: ['.x.gx.-.G---', '.x-.--g.--.-', '.-A--...-I--', '--I..S...---'],
    pred: (m, X) => { // the turn itself fires a glue that takes a LEFT-page stone away (its shadow on the third page goes with it)
      const st = X.states; let turnGlue = false, rideT = false;
      for (let i = 1; i < st.length; i++) { if (st[i].face === st[i - 1].face) continue; const a = X.B.G[st[i - 1].g], b = X.B.G[st[i].g];
        for (let r = 0; r < a.length; r++) for (let c = 0; c < 4; c++) if (a[r][c] === 'x' && b[r][c] !== 'x') turnGlue = true; }
      for (const s of st) if (s.face === 1 && G_posture(s.a) === 'lean' && !L.isFloor(L.at(X.B.world(s.g, s.face), s.c, s.r))) rideT = true;
      return [turnGlue, rideT, m.needsFlip, m.needsLamp, m.needsGlue, m.phases >= 2, m.closes >= 1]; } },
  // ---- vol. 3 ch. 9 「滚」 (docs/design-ch9.md): one predicate per reversal ----
  jump: { rows: 4, pages: 2, lamp: null, tiles: '.-xr', par: 3, closes: 1, minpar: 2, need: 'roll+shade', elements: 6, minlen: 11, phases: 0, backs: 0,
    seed: ['-----G.-', '-.-S.--.', '.--..---', '-.-....r'],
    pred: (m, X) => { // the solution walks or rides a shadow that the DRAWN board does not cast at that angle: the stone rolled a column before the shadow appeared
      let jump = false; for (const s of X.states) { if (G_posture(s.a) !== 'lean' || L.isFloor(L.at(X.B.world(s.g, s.face), s.c, s.r))) continue;
        const src = X.B.shadowsAt(s.g, s.face, s.a).get(s.c + ',' + s.r); if (src == null || src === 'A') continue;
        if (!L.shadows(X.B.world(0, s.face), s.a).has(s.c + ',' + s.r)) jump = true; }
      return [jump, m.needsRoll, m.needsShade, m.closes <= 1]; } },
  hold: { rows: 4, pages: 2, lamp: null, tiles: '.-xr', par: 3, closes: 1, minpar: 2, need: 'roll', elements: 6, minlen: 11, phases: 0, backs: 0,
    seed: ['----..r-', '..-...r-', '----S-.G', '-.-.----'],
    pred: (m, X) => { // at some pass of the solution the figure stands crease-side of a loose stone and holds it: the roll with her there differs from the roll without her
      let held = false; const st = X.states; for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (p.face !== s.face || p.a === s.a || !L.passes(p.a, s.a) || !L.isRight(p.c)) continue;
        if (X.B.roll(p.g, p.face, { c: p.c, r: p.r }) !== X.B.roll(p.g, p.face, null)) held = true; }
      return [held, m.needsRoll, (m.rolls || 0) >= 2]; } },
  late: { rows: 5, pages: 2, lamp: null, tiles: '.-xr', par: 4, closes: 2, minpar: 3, need: 'roll', elements: 8, minlen: 15, phases: 0, backs: 1,
    seed: ['----S-r-', '.--..xx-', 'x---...r', '.x--r-.-', '---G----'],
    pred: (m, X) => { // the solution closes from a square the DRAWN board marks as crushed (a loose stone over it): the roll of the same sweep moves the stone off it first
      let late = false; const st = X.states; for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (s.face !== p.face || G_posture(s.a) !== 'fold' || !L.passes(p.a, s.a)) continue;   // a close from FLAT: the roll comes first
        const w0 = { ...X.B.world(p.g, p.face), char: { c: p.c, r: p.r } }; if (L.isFloor(L.at(w0, p.c, p.r)) && L.crushed(w0, { c: p.c, r: p.r }, L.FOLD_MIN)) late = true; }   // standing on paper the drawn board marks crushed
      return [late, m.needsRoll, m.closes >= 1, (m.rolls || 0) >= 2]; } },
  order: { rows: 5, pages: 2, lamp: null, tiles: '.-xrg', par: 4, closes: 2, minpar: 3, need: 'roll+glue', elements: 8, minlen: 15, phases: 1, backs: 0,
    seed: ['Sg-x-.rr', 'x.-.---.', '----.r..', '--.--x--', '--G-----'],
    pred: (m, X) => { // a glue that faces NOTHING on the board you close from takes a stone at the press: the roll of the same sweep put one in front of it (roll comes before glue)
      let late = false; const st = X.states; for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (s.face !== p.face || G_posture(s.a) !== 'fold' || G_posture(p.a) === 'fold') continue;
        const g0 = X.B.G[p.g], g1 = X.B.G[s.g]; for (let r = 0; r < g0.length; r++) for (let c = 0; c < 4; c++) if (g0[r][c] === 'g' && !L.isOpaque(g0[r][L.mirror(c)]) && g1[r][c] === 'x') late = true; }
      return [late, m.needsRoll, m.needsGlue, m.closes >= 1]; } },
  settle: { rows: 5, pages: 2, lamp: null, tiles: '.-xrg', par: 5, closes: 2, minpar: 4, need: 'roll', elements: 9, minlen: 18, phases: 1, backs: 1,
    seed: ['.x.-...-', '..-..xr-', 'rx--S-gG', 'gr----.r', '.--.-.--'],
    pred: (m, X) => { // the pass you do not see: a lean that comes back (two passes, no press) is on the solution, or the opening after a close rolls a stone the closed walk relied on
      const st = X.states, hinge = []; for (let i = 1; i < st.length; i++) if (st[i].a !== st[i - 1].a && st[i].face === st[i - 1].face) hinge.push(i);
      let fro = false, openRoll = false;
      for (let k = 0; k < hinge.length; k++) { const i = hinge[k], p = st[i - 1], s = st[i];
        if (L.passes(p.a, s.a) && G_posture(p.a) === 'fold' && X.B.roll(p.g, p.face, { c: p.c, r: p.r }) !== p.g) openRoll = true;
        const j = hinge[k + 1]; if (j == null) continue; const q = st[j - 1], t = st[j];
        if (L.passes(p.a, s.a) && L.passes(q.a, t.a) && G_posture(s.a) !== 'fold' && G_posture(p.a) !== 'fold' && G_posture(t.a) !== 'fold') fro = true; }
      return [fro || openRoll, m.needsRoll, (m.rolls || 0) >= 2, (m.fills || 0) >= 1, m.before, m.closes >= 1]; } },
  // ---- vol. 3 ch. 10 「鹤」 (docs/design-ch10.md): the crane flies at every press, whether you want it to or not ----
  shuttle: { rows: 5, pages: 2, lamp: null, tiles: '.-xgh', par: 4, closes: 2, minpar: 3, need: 'crane', elements: 8, minlen: 15, phases: 0, backs: 0, carries: 1,
    seed: ['S.h.-...', '..--..x.', '-.x..g.-', '...-..-.', '--.-...G'],
    pred: (m, X) => { // the solution is carried once, and later presses again from a square that is NOT the crane's while a crane on its page flies (standing on it again would carry you back)
      const st = X.states; let off = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (s.face !== p.face || G_posture(s.a) !== 'fold' || G_posture(p.a) === 'fold') continue;
        const wb = X.B.world(p.g, p.face), wa = X.B.world(s.g, s.face); if (L.at(wb, p.c, p.r) === 'h' || L.isRight(s.c) !== L.isRight(p.c)) continue;
        const c0 = L.isRight(p.c) ? 4 : 0; for (let r = 0; r < X.B.h; r++) for (let c = c0; c < c0 + 4; c++) if (L.at(wb, c, r) === 'h' && L.at(wa, c, r) !== 'h') off = true; }
      return [(m.carries || 0) >= 1, off, m.needsCrane, m.closes >= 2]; } },
  ground: { rows: 5, pages: 2, lamp: null, tiles: '.-xrh', par: 4, closes: 2, minpar: 3, need: 'roll+crane', elements: 8, minlen: 15, phases: 0, backs: 0, carries: 1,
    seed: ['-.h...r-', 'S.----..', '.x-.--..', 'x.-.--.G', '--------'],   // the hand seed meets the predicate (len 12): the climb starts feasible
    pred: (m, X) => { // the drawn board shows a left-page crane's landing free with a loose stone one square outward of it: a close from flat rolls the stone onto the landing FIRST and the crane stays (with you on it, the stone comes down on you). The solution's FIRST close rides THAT crane (after passes that rolled the stone past the landing)
      const b = X.B.base.grid, st = X.states; let set = false, grounded = false, n = 0; const g1 = X.B.G[X.B.press(X.B.roll(0, 0, null), 0)];
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (s.face !== p.face || G_posture(s.a) !== 'fold' || G_posture(p.a) === 'fold') continue; n++;
        if (n === 1 && !L.isRight(p.c) && L.isRight(s.c) && b[p.r][p.c] === 'h' && b[p.r][7 - p.c] === '.' && b[p.r][8 - p.c] === 'r') { set = true; if (g1[p.r][p.c] === 'h') grounded = true; } }
      return [set, grounded, m.needsRoll, m.needsCrane, (m.rolls || 0) >= 1, m.closes >= 1]; } },
  soak: { rows: 5, pages: 2, lamp: null, tiles: '.-xIh', par: 4, closes: 2, minpar: 3, need: 'wet+crane', elements: 8, minlen: 15, phases: 2, backs: 0,
    seed: ['S.h.-...', '-.--.I..', '..--..-G', '-.x..-..', '.--.-...'],
    pred: (m, X) => { // the crane's landing is a gap beside wet ink: the bleed of the same press soaks the crane before it flies; it is wet ink on YOUR page now and the next press spreads a ring from it — a square of that ring is on the solution
      const b = X.B.base.grid, g1 = X.B.G[X.B.press(0, 0)], g2 = X.B.G[X.B.press(X.B.press(0, 0), 0)]; let soaked = false, road = false;
      for (let r = 0; r < b.length; r++) for (let c = 0; c < 8; c++) if (b[r][c] === 'h' && g1[r][c] === 'I') { soaked = true;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (nc < 0 || nc >= 8 || nr < 0 || nr >= b.length || L.isRight(nc) !== L.isRight(c)) continue;
          if (b[nr][nc] === '-' && g2[nr][nc] === 'I' && X.states.some((s) => s.c === nc && s.r === nr && X.B.G[s.g][nr][nc] === 'I')) road = true; } }
      return [soaked, road, m.needsWet, m.needsCrane, m.closes >= 2, m.phases >= 2]; } },
  ferry: { rows: 5, pages: 2, lamp: null, tiles: '.-xrh', par: 5, closes: 2, minpar: 4, need: 'roll+crane', elements: 8, minlen: 15, phases: 0, backs: 0, carries: 2,
    seed: ['S.h.....', '-.--.r-.', '.G-..r..', 'x---.-..', '..-..-r.'],
    pred: (m, X) => { // the crane flies back and forth at every close: the solution rides it OVER and BACK (carried twice), and between the two it stands on the right page holding a loose stone through a pass (9-4) — you crossed only to hold the stone
      let held = false; const st = X.states; for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (p.face !== s.face || p.a === s.a || !L.passes(p.a, s.a) || !L.isRight(p.c)) continue;
        if (X.B.roll(p.g, p.face, { c: p.c, r: p.r }) !== X.B.roll(p.g, p.face, null)) held = true; }
      return [(m.carries || 0) >= 2, held, m.needsRoll, m.needsCrane, m.closes >= 2]; } },
  over: { rows: 4, pages: 3, lamp: null, tiles: '.-xh', par: 5, closes: 3, minpar: 4, need: 'flip+crane', elements: 8, minlen: 18, phases: 0, backs: 0,
    seed: ['S.h.....-..-', '.-.-.x..-.-.', '--.......-G.', '.x-.-...-.-.'],
    pred: (m, X) => { // the turn is a press too: a flip in the solution carries the figure, standing on a left-page crane, to the THIRD page
      const st = X.states; let flipCarry = false; for (let i = 1; i < st.length; i++) if (st[i].face !== st[i - 1].face && L.isRight(st[i].c) !== L.isRight(st[i - 1].c)) flipCarry = true;
      return [flipCarry, m.needsFlip, m.needsCrane, m.closes >= 1]; } },
  // ---- vol. 3 ch. 11 「来回」 (docs/design-ch11.md): a lean that comes back rolled everything twice and pressed nothing ----
  still: { rows: 4, pages: 2, lamp: 'L', tiles: '.-xr', par: 3, closes: 1, minpar: 2, need: 'roll+lamp', elements: 7, minlen: 11, phases: 0, backs: 0, fros: 1,
    seed: ['x---S.r-', '.---.-.G', '-x--..r.', '----.---'],
    pred: (m, X) => { // between the two passes of a lean that comes back, the figure stands on the LIFTED page on a left-lamp shadow — floor the rolls do not move (the stone that casts it is on the flat page)
      let onL = false; for (const s of X.states) { if (G_posture(s.a) !== 'lean' || !L.isRight(s.c) || L.isFloor(L.at(X.B.world(s.g, s.face), s.c, s.r))) continue;
        const src = X.B.shadowsAt(s.g, s.face, s.a).get(s.c + ',' + s.r); if (src != null && src !== 'A' && !L.isRight(src)) onL = true; }
      return [(m.fros || 0) >= 1, onL, m.needsLamp, m.needsRoll, m.needsFro]; } },
  stay: { rows: 4, pages: 2, lamp: null, tiles: '.-xrh', par: 3, closes: 1, minpar: 3, need: 'roll+crane', elements: 8, minlen: 11, phases: 0, backs: 0, fros: 1, carries: 1,
    seed: ['S.h.....', '-.--..r-', '..--.-.G', 'x---..r.'],
    pred: (m, X) => { // the crane carries you over (one close); on the far page you buy two more passes WITHOUT closing (a second close would fly the crane — and you with it if you stood on it)
      const st = X.states; let carryAt = -1; for (let i = 1; i < st.length; i++) if (G_posture(st[i].a) === 'fold' && G_posture(st[i - 1].a) !== 'fold' && L.isRight(st[i].c) !== L.isRight(st[i - 1].c)) { carryAt = i; break; }
      const fr = frosOf(st); return [carryAt > 0, fr.some(([i]) => i > carryAt), m.needsCrane, m.needsRoll, m.needsFro, m.closes <= 1]; } },
  gatefro: { rows: 5, pages: 2, lamp: null, tiles: '.-xrA', par: 5, closes: 2, minpar: 4, need: 'roll+gate', elements: 9, minlen: 15, phases: 0, backs: 0, fros: 1,
    seed: ['S.-..A.r', '.x--.-..', '--.-..r.', '.--x.-.G', '-.-.----'],
    pred: (m, X) => { // the gate stands only while the lean lasts and a loose stone never rolls INTO it: between the two passes of a lean that comes back the figure walks through the gate; somewhere on the way a loose stone is stopped by a gate
      const st = X.states; let through = false, stopped = false; for (const s of st) { const w = X.B.world(s.g, s.face); if (G_posture(s.a) === 'lean' && L.at(w, s.c, s.r) === 'A') through = true;
        for (let r = 0; r < X.B.h; r++) for (let c = 5; c < 8; c++) if (L.at(w, c, r) === 'r' && L.at(w, c - 1, r) === 'A') stopped = true; }
      return [(m.fros || 0) >= 1, through, stopped, m.needsGate, m.needsRoll, m.needsFro]; } },
  turn: { rows: 4, pages: 3, lamp: null, tiles: '.-xr', par: 6, closes: 3, minpar: 5, need: 'roll+flip', elements: 10, minlen: 18, phases: 0, backs: 0, fros: 1,
    seed: ['S..-...r-.r-', '.x-..-..-.-.', '---.-..-..-G', '.-.--..r--.-'],
    pred: (m, X) => { // after the turn the lifted page is the THIRD page: a pass on the turned book rolls its stones while a loose stone on the right page (the back of the leaf) stays where you left it
      const st = X.states; let third = false; for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (p.face !== 1 || s.face !== 1 || p.a === s.a || !L.passes(p.a, s.a)) continue;
        if (X.B.roll(p.g, 1, { c: p.c, r: p.r }) === p.g) continue; const g = X.B.G[p.g]; for (let r = 0; r < X.B.h; r++) for (let c = 4; c < 8; c++) if (g[r][c] === 'r') third = true; }
      return [third, (m.fros || 0) >= 1, m.needsFlip, m.needsRoll, m.needsFro]; } },
  hover: { rows: 5, pages: 2, lamp: null, tiles: '.-xrh', par: 5, closes: 2, minpar: 4, need: 'roll+crane', elements: 9, minlen: 15, phases: 0, backs: 0, carries: 2,
    seed: ['S.h.-..r', '.x--.-..', '..-..r..', '-.-x....', '---.-..G'],
    pred: (m, X) => { // two presses with NO pass between (closed → a lean → closed again): the crane carries you over and back while the loose stones keep still — open flat between the closes (the chapter 9/10 habit) and they roll twice
      return [hoversOf(X.states).length >= 1, m.needsHover, (m.carries || 0) >= 2, m.needsCrane, m.needsRoll]; } },
  inkhover: { rows: 5, pages: 2, lamp: null, tiles: '.-xrI', par: 5, closes: 2, minpar: 4, need: 'roll+wet', elements: 9, minlen: 15, phases: 2, backs: 0,
    seed: ['S.-I-..r', '.x--.-..', '..-..r..', '-.-x....', '---.-..G'],
    pred: (m, X) => { // two presses, one pass: the wet ink bleeds twice while the loose stones roll once
      return [hoversOf(X.states).length >= 1, m.needsHover, m.needsWet, m.needsRoll, m.phases >= 2]; } },
  frog: { rows: 4, pages: 2, lamp: null, tiles: '.-xrg', par: 4, closes: 1, minpar: 3, need: 'roll+glue', elements: 8, minlen: 12, phases: 0, backs: 0, fros: 1,
    seed: ['S.g.-.r.', '.x--..-.', '..-..r..', '-.-x...G'],
    pred: (m, X) => { // a lean that comes back is the solution's way past a glue: the same two passes bought with a close and an opening let the glue take the stone at its first stop
      return [(m.fros || 0) >= 1, m.needsFro, m.needsRoll, m.needsGlue || /g/.test(X.B.base.grid.map((r) => r.join('')).join(''))]; } },
  // ---- vol. 3 ch. 12 「三折」 (docs/design-ch12.md): the third page on its own crease. Predicates read MAP columns (mc / pg below) ----
  home: { rows: 3, trifold: true, lamp: null, tiles: '.-x', par: 2, closes: 1, minpar: 2, need: 'trifold', elements: 4, minlen: 6, phases: 0, backs: 0,
    seed: ['S..-..-.-...', '.-.-.x-.-G-.', '...-....-...'],
    pred: (m, X) => { // the letter is on the third page; the solution folds the flap, closes the book, and walks a stack from the left page straight onto the third page (two mirrors: the same column)
      const st = X.states, gC = X.B.base.grid.findIndex((row) => row.includes('G')) >= 0 && X.B.base.grid.some((row) => row.indexOf('G') >= 8); let home = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (p.face === 3 && s.face === 3 && p.a === s.a && G_posture(s.a) === 'fold' && pg(X, p) === 0 && pg(X, s) === 2) home = true; }
      return [gC, home, m.needsTrifold]; } },
  rigid: { rows: 3, trifold: true, lamp: null, tiles: '.-xr', par: 3, closes: 1, minpar: 2, need: 'roll', elements: 5, minlen: 7, phases: 0, backs: 0,
    seed: ['S.-..-.-r...', '-.-..-.-..-.', '..-...-G.-..'],
    pred: (m, X) => { // lying flat the third page is one stiff leaf with the right page: lifted with the book, its loose stone rolls OVER the second crease onto the right page — the solution has that roll, and needs it
      const st = X.states; let over = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (p.face !== 0 || s.face !== 0 || p.a === s.a || !L.passes(p.a, s.a)) continue;
        const g0 = X.B.G[p.g], g1 = X.B.G[X.B.roll(p.g, 0, L.isRight(p.c) ? { c: p.c, r: p.r } : null)]; for (let r = 0; r < X.B.h; r++) if (g0[r][8] === 'r' && g1[r][8] !== 'r') over = true; }
      return [over, m.needsRoll]; } },
  leaf: { rows: 3, trifold: true, lamp: null, tiles: '.-xr', par: 3, closes: 1, minpar: 3, need: 'trifold+roll', elements: 5, minlen: 11, phases: 0, backs: 0,
    seed: ['-....--x.r.G', '--------S--.', '.--..--..r.-'],   // 12-2 from rigid seed 1 #1, lengthened (mid needs len ≥ 11)
    pred: (m, X) => { const st = X.states; let over = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (p.face !== 0 || s.face !== 0 || p.a === s.a || !L.passes(p.a, s.a)) continue;
        const g0 = X.B.G[p.g], g1 = X.B.G[X.B.roll(p.g, 0, L.isRight(p.c) ? { c: p.c, r: p.r } : null)]; for (let r = 0; r < X.B.h; r++) if (g0[r][8] === 'r' && g1[r][8] !== 'r') over = true; }
      return [over, m.needsRoll, m.needsTrifold, m.len >= 11]; } },
  rigid2: { rows: 3, trifold: true, lamp: null, tiles: '.-xr', par: 3, closes: 1, minpar: 3, need: 'trifold+roll', elements: 5, minlen: 8, phases: 0, backs: 0,
    seed: ['S.-..-..r.-.', '-.-..-.-.-G.', '..-...-..-..'],
    pred: (m, X) => { // as rigid, but the letter is on the third page: the solution first lifts the book with the third page LYING FLAT (its stone rolls over the second crease onto the right page), and only then folds the third page
      const st = X.states; let over = -1, flap = -1;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (s.face === 3 && p.face !== 3 && flap < 0) flap = i; if (p.face !== 0 || s.face !== 0 || p.a === s.a || !L.passes(p.a, s.a)) continue;
        const g0 = X.B.G[p.g], g1 = X.B.G[X.B.roll(p.g, 0, L.isRight(p.c) ? { c: p.c, r: p.r } : null)]; for (let r = 0; r < X.B.h; r++) if (g0[r][8] === 'r' && g1[r][8] !== 'r' && over < 0) over = i; }
      return [over > 0 && flap > over, X.B.base.grid.some((row) => row.indexOf('G') >= 8), m.needsRoll, m.needsTrifold]; } },
  hole: { rows: 4, trifold: true, lamp: null, tiles: '.-x', par: 3, closes: 1, minpar: 2, need: 'trifold', elements: 6, minlen: 9, phases: 0, backs: 0,
    seed: ['S-..-..G..-.', '.-.x--..-..-', '..-.-.-.-.-.', '.-..-.-..-..'],
    pred: (m, X) => { // the solution stands, closed with the flap folded, on a right-page square seen THROUGH a hole of the third page — filling that hole with paper breaks the level
      const st = X.states; let through = false, needed = false; const cells = new Set();
      for (const s of st) { if (s.face !== 3 || s.c < 4) continue; const c = mc(X, s); if (c < 8) { through = true; cells.add(c + ',' + s.r); } }
      for (const k of cells) { const [c, r] = k.split(',').map(Number); const v = X.B.base.grid.map((row) => row.join('')); const T = 15 - c; if (v[r][T] !== '-') continue; v[r] = v[r].slice(0, T) + '.' + v[r].slice(T + 1); if (!G.measure({ map: v, trifold: true }).solvable) needed = true; }
      return [through, needed, m.needsTrifold]; } },
  away: { rows: 4, trifold: true, lamp: null, tiles: '.-xr', par: 4, closes: 2, minpar: 3, need: 'trifold+roll', elements: 8, minlen: 13, phases: 0, backs: 0,
    seed: ['S..-.--.-.r.', '.x.-..-..-..', '...-.-..r-.-', '.-.-....-.G.'],
    pred: (m, X) => { // with the flap folded and the book lifted, a third-page loose stone rolls AWAY from its own crease (map column up): the solution has such a roll, and needs the rolls
      const st = X.states; let away = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (p.face !== 3 || s.face !== 3 || p.a === s.a || !L.passes(p.a, s.a)) continue;
        const g0 = X.B.G[p.g], g1 = X.B.G[X.B.roll(p.g, 3, L.isRight(p.c) ? { c: p.c, r: p.r } : null)];
        for (let r = 0; r < X.B.h; r++) for (let c = 8; c < 11; c++) if (g0[r][c] === 'r' && g1[r][c] !== 'r' && g1[r][c + 1] === 'r') away = true; }
      return [away, m.needsRoll, m.needsTrifold]; } },
  drop: { rows: 4, trifold: true, lamp: null, tiles: '.-xr', par: 4, closes: 2, minpar: 3, need: 'trifold+roll', elements: 7, minlen: 13, phases: 0, backs: 0,
    seed: ['S..-..-.-...', '.x.-.--..r--', '...-..-.-..G', '.-.-....-...'],
    pred: (m, X) => { // with the third page folded and the book lifted, a third-page loose stone rolls AWAY from its own crease and falls THROUGH one of its holes onto the right page (into a right-page gap: a bridge there) — the solution has that roll and needs it
      const st = X.states; let drop = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (p.face !== 3 || s.face !== 3 || p.a === s.a || !L.passes(p.a, s.a)) continue;
        const g0 = X.B.G[p.g], g1 = X.B.G[X.B.roll(p.g, 3, L.isRight(p.c) ? { c: p.c, r: p.r } : null)];
        for (let r = 0; r < X.B.h; r++) for (let c = 8; c < 12; c++) if (g0[r][c] === 'r' && g1[r][c] !== 'r' && g0[r][14 - c] !== g1[r][14 - c]) drop = true; }
      return [drop, m.needsRoll, m.needsTrifold]; } },
  order2: { rows: 4, trifold: true, lamp: null, tiles: '.-xrh', par: 5, closes: 2, minpar: 4, need: 'trifold+crane+roll', elements: 8, minlen: 18, phases: 0, backs: 0,
    seed: ['S.------.---', '-h----.-.r.G', '------------', '------------'],
    pred: (m, X) => { // fold order decides ground (12-6): a crane carries you left → right at a close with the third page OPEN, and right → third at the press of the third page — not left → third at one close with the third page folded (the 12-1 habit)
      const st = X.states; let lr = false, rt = false, lt = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (!C.pressed(p, s)) continue; const a = pg(X, p), b = pg(X, s);
        if (s.face === 0 && a === 0 && b === 1) lr = true; if (s.face === 3 && p.face !== 3 && a === 1 && b === 2) rt = true; if (s.face === 3 && p.face === 3 && a === 0 && b === 2) lt = true; }
      return [lr, rt, !lt, m.needsCrane, m.needsRoll, m.needsTrifold]; } },
  back: { rows: 5, trifold: true, lamp: null, tiles: '.-xr', par: 4, closes: 2, minpar: 4, need: 'trifold+roll', elements: 5, minlen: 15, phases: 0, backs: 0,
    seed: ['S.------.---', '..------.r.x', '----------.-', '--------G..-', '------------'],   // the hand board: len 11
    pred: (m, X) => { // 12-4 「回」: the stone on your column rolls AWAY and comes BACK. Fold the third page first (12-1) and it rolls to its crease, off your column; close and — with the third page folded the low side is the book's crease — it rolls back onto your column and onto you. The solution instead lifts the book with the third page flat first (12-2: it rolls over the second crease, off the third page), then folds, then closes on that same square
      const st = X.states; let rigid = -1, flap = -1, close = null;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (s.face === 3 && p.face !== 3 && flap < 0) flap = i;
        if (p.face === 3 && s.face === 3 && G_posture(s.a) === 'fold' && G_posture(p.a) !== 'fold' && !close) close = p;
        if (p.face === 0 && s.face === 0 && p.a !== s.a && L.passes(p.a, s.a) && rigid < 0) { const g0 = X.B.G[p.g], g1 = X.B.G[X.B.roll(p.g, 0, null)]; for (let r = 0; r < X.B.h; r++) if (g0[r][8] === 'r' && g1[r][8] !== 'r') rigid = i; } }
      let kill = false; if (close && !L.isRight(close.c)) { const lv = { map: X.B.base.grid.map((r) => r.join('')), trifold: true }, B2 = C.grids(lv); const n1 = C.flapOf(B2, { c: close.c, r: close.r, a: 0, face: 0, g: 0 }, 180); if (n1) kill = C.move(B2, n1, 180) === null; }
      return [rigid > 0 && flap > rigid, kill, m.needsRoll, m.needsTrifold, (m.wrong || 0) >= 6]; } },
  finale: { rows: 5, trifold: true, lamp: null, tiles: '.-xrh', par: 5, closes: 2, minpar: 4, need: 'trifold+roll+crane', elements: 8, minlen: 18, phases: 0, backs: 0,
    seed: ['S.------.---', '-h----.-.r.G', '------------', '------------', '------------'],   // the crane core (len 7)
    pred: (m, X) => { // 12-6: the order of the two folds decides what the left page meets — a crane carries you at a close with the third page OPEN (left meets right), the third page is folded later, and folding it first at the same square kills (the third page's stone comes back, 12-4)
      const st = X.states; let lr = false, flap = -1, close0 = -1, close = null;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (s.face === 3 && p.face !== 3 && flap < 0) flap = i;
        if (p.face === 0 && s.face === 0 && G_posture(s.a) === 'fold' && G_posture(p.a) !== 'fold') { if (close0 < 0) close0 = i; if (pg(X, p) === 0 && pg(X, s) === 1) { lr = true; if (!close) close = p; } } }
      let kill = false; if (close) { const lv = { map: X.B.base.grid.map((r) => r.join('')), trifold: true }, B2 = C.grids(lv); const n1 = C.flapOf(B2, { c: close.c, r: close.r, a: 0, face: 0, g: 0 }, 180); if (n1) kill = C.move(B2, n1, 180) === null; else kill = n1 === null; }
      return [lr, close0 > 0 && flap > close0, kill, m.needsCrane, m.needsRoll, m.needsTrifold, (m.wrong || 0) >= 8]; } },
  flaphover: { rows: 4, trifold: true, lamp: null, tiles: '.-xrh', par: 5, closes: 2, minpar: 4, need: 'trifold+crane+roll', elements: 8, minlen: 15, phases: 0, backs: 0,
    seed: ['S..-..-.-...', '.x.-.h-..r.-', '...-..-.-.G.', '.-.-..-.-...'],
    pred: (m, X) => { // 12-5: the third page hovers — folded, opened only to a lean (no pass), folded again: two presses of the third page on the right page and none of its stones roll; a crane carries you at a press of the third page
      const st = X.states; let hover = false, carry = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (p.face === 3 && s.face === 2 && L.standing(s.a) && s.a < L.FOLD_MIN) { for (let j = i + 1; j < st.length; j++) { if (st[j].face === 3) { hover = true; break; } if (st[j].face !== 2 || !L.standing(st[j].a)) break; } }
        if (s.face === 3 && p.face !== 3 && pg(X, p) !== pg(X, s)) carry = true; }
      return [hover, carry, m.needsCrane, m.needsTrifold]; } },
  crane2: { rows: 4, trifold: true, lamp: null, tiles: '.-xh', par: 4, closes: 2, minpar: 3, need: 'trifold+crane', elements: 7, minlen: 12, phases: 0, backs: 0,
    seed: ['S.h.-..-.-..', '.-.-.x.-.-..', '..-..-..-.G.', '.x--.-.-.-..'],
    pred: (m, X) => { // a crane carries you twice — once at a press of the book, once at the press of the flap onto the right page — and the second carry ends on the third page
      const st = X.states; let book = false, flap = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (pg(X, p) === pg(X, s) || !C.pressed(p, s)) continue;
        if (s.face === 3 && p.face !== 3) { if (pg(X, s) === 2) flap = true; } else if (pg(X, s) !== pg(X, p)) book = true; }
      return [book, flap, m.needsCrane, m.needsTrifold]; } },
  flapfro: { rows: 4, trifold: true, lamp: null, tiles: '.-xr', par: 5, closes: 2, minpar: 4, need: 'trifold+roll', elements: 8, minlen: 14, phases: 0, backs: 0,
    seed: ['S..-.-..-.r.', '.x.-.-..r-..', '...-....-.-.', '.-.-.-..-..G'],
    pred: (m, X) => { // two creases count their own passes: the third page's loose stones roll on the FLAP's crease (a flap lean that comes back, no press) and also on the book's — the solution has a third-page roll from each crease
      const st = X.states; let flapRoll = false, bookRoll = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; const ga = X.B.G[p.g], gb = X.B.G[s.g]; let moved = false;
        for (let r = 0; r < X.B.h; r++) for (let c = 8; c < 12; c++) if ((ga[r][c] === 'r') !== (gb[r][c] === 'r')) moved = true;
        if (!moved) continue; const flap = p.face === 2 || s.face === 2 || (p.face !== s.face); if (flap && !C.pressed(p, s)) flapRoll = true; if (!flap) bookRoll = true; }
      return [flapRoll, bookRoll, m.needsRoll, m.needsTrifold]; } },
  order: { rows: 4, trifold: true, lamp: null, tiles: '.-xrh', par: 6, closes: 3, minpar: 4, need: 'trifold+crane', elements: 9, minlen: 16, phases: 0, backs: 0,
    seed: ['S.h.-..-.-..', '.-.-.r.-.-..', '..-..-..-.G.', '.x--.-.-.r..'],
    pred: (m, X) => { // the order of the folds decides what the left page meets: the solution closes the book once with the third page OPEN (left meets right) and once with it FOLDED (left meets the third page), and a crane flies at each
      const st = X.states; let open = false, folded = false;
      for (let i = 1; i < st.length; i++) { const p = st[i - 1], s = st[i]; if (p.face !== s.face || !C.pressed(p, s)) continue;
        const w0 = X.B.world(p.g, p.face); let crane = false; for (let r = 0; r < X.B.h; r++) for (let c = 0; c < 8; c++) if (L.at(w0, c, r) === 'h' && L.at(X.B.world(s.g, s.face), c, r) !== 'h') crane = true;
        if (crane && s.face === 0) open = true; if (crane && s.face === 3) folded = true; }
      return [open, folded, m.needsCrane, m.needsTrifold]; } },
};
// ch. 12: the MAP column / page (0 left, 1 right, 2 third) of a state on a trifold board — face 2 shifts one page, face 3 reads the top layer
const mc = (X, s) => (s.face === 2 ? s.c + 4 : L.colOf(X.B.world(s.g, s.face), s.c, s.r));
const pg = (X, s) => Math.floor(mc(X, s) / 4);
// ch. 11: the leans that come back on a path — pairs [i, j] of consecutive hinge moves that both pass upright, no press between, neither end closed
function frosOf(st) { const h = []; for (let i = 1; i < st.length; i++) if (st[i].face === st[i - 1].face && st[i].a !== st[i - 1].a) h.push(i);
  const out = []; for (let k = 0; k + 1 < h.length; k++) { const i = h[k], j = h[k + 1]; if (!L.passes(st[i - 1].a, st[i].a) || !L.passes(st[j - 1].a, st[j].a)) continue;
    if ([st[i - 1], st[i], st[j]].some((s) => G_posture(s.a) === 'fold') || st.slice(i, j).some((s, x, arr) => x > 0 && s.face !== arr[x - 1].face)) continue; out.push([i, j]); k++; } return out; }
// ch. 11: re-closes from a lean — [i, j]: st[i] opens a closed book only to a lean (no pass), st[j] closes it again, every state between on the standing side
function hoversOf(st) { const out = []; for (let i = 1; i < st.length; i++) { if (st[i].face !== st[i - 1].face || G_posture(st[i - 1].a) !== 'fold' || G_posture(st[i].a) === 'fold' || !L.standing(st[i].a)) continue;
    for (let j = i + 1; j < st.length; j++) { if (st[j].face !== st[i].face || !L.standing(st[j].a)) break; if (G_posture(st[j].a) === 'fold') { out.push([i, j]); break; } } } return out; }
const G_posture = C.posture;
const t = T[name]; if (!t) throw new Error('name');
const opts = { ...t, iters: 1e9, restarts: 1, seed: seedN, nodead: false, noride: false, leftx: false, maxvoid: 0.62, maxlen: 0, matched: false, goalT: false, minflips: 0, configs: 0, switches: 0, mincloses: 0, fros: t.fros || 0 };
const mk = (map) => ({ map, ...(t.lamp ? { lamp: t.lamp } : {}), ...(t.trifold ? { trifold: true } : {}) });   // ch. 12: trifold boards
function detail(level) { const B = G.prep(level); const g = G.explore(B); const bp = G.bestPath(g); if (!bp) return null; return { B, states: bp.path.map((k) => g.nodes.get(k)) }; }
function score(level) {
  const m = G.measure(level); if (!m.solvable) return { f: -1000 + (m.states || 0) * 0.05, m };
  const X = detail(level); const pr = t.pred(m, X); const met = pr.filter(Boolean).length;
  if (met < pr.length) return { f: -400 + 30 * met + Math.min(m.len, 15), m, pr };
  return { f: G.fitness(level, opts, m) + 40, m, pr };
}
let R = (function (seed) { let s = seed >>> 0; return () => { s += 0x6d2b79f5; let r = Math.imul(s ^ (s >>> 15), 1 | s); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; })(seedN * 7919);
const tiles = t.tiles.split('');
function mutate(map) {
  const g = map.map((r) => r.split('')), rows = g.length, W = g[0].length;
  const pick = (w = W) => [Math.floor(R() * w), Math.floor(R() * rows)];
  for (let tries = 0; tries < 20; tries++) {
    const h = map.map((r) => r.split('')); const k = R();
    if (k < 0.65) { const [c, r] = pick(); if ('SG'.includes(h[r][c])) continue; const u = R(); h[r][c] = u < 0.35 ? '.' : u < 0.6 ? '-' : tiles[Math.floor(R() * tiles.length)]; }
    else if (k < 0.85) { const [c1, r1] = pick(), [c2, r2] = pick(); [h[r1][c1], h[r2][c2]] = [h[r2][c2], h[r1][c1]]; }
    else { const tt = R() < 0.5 ? 'S' : 'G'; for (let r = 0; r < rows; r++) for (let c = 0; c < W; c++) if (h[r][c] === tt) h[r][c] = '.'; const [c, r] = pick(tt === 'S' ? 8 : W); if ('SG'.includes(h[r][c])) continue; h[r][c] = tt; }
    const flat = h.flat(); if (flat.filter((x) => x === 'S').length !== 1 || flat.filter((x) => x === 'G').length !== 1) continue;
    return h.map((r) => r.join(''));
  }
  return map;
}
let cur = t.seed, curS = score(mk(cur)), Temp = 6, n = 0; const archive = new Map(); const t0 = Date.now();
while (Date.now() - t0 < secs * 1000) {
  const cand = mutate(cur), s = score(mk(cand)); n++;
  if (s.f >= curS.f || R() < Math.exp((s.f - curS.f) / Temp)) { cur = cand; curS = s; }
  if (s.f > 0 && !archive.has(cand.join('|'))) archive.set(cand.join('|'), { map: cand, ...s });
  Temp = Math.max(0.5, Temp * 0.9995);
  if (n % 500 === 0) { process.stderr.write(`${name} ${n} evals ${((Date.now() - t0) / 1000) | 0}s cur ${curS.f.toFixed(1)} pred ${JSON.stringify(curS.pr)} kept ${archive.size}\n`); if (n % 4000 === 0 && archive.size === 0) { /* restart from seed */ cur = t.seed; curS = score(mk(cur)); Temp = 6; } }
}
const top = [...archive.values()].sort((a, b) => b.f - a.f).slice(0, 40);
for (const x of top) { const r = G.roles(mk(x.map), x.m); x.F = x.f - 4 * r.noise - 0.8 * r.irrelevant; x.r = r; }
top.sort((a, b) => b.F - a.F); const top2 = top.filter((x) => x.r.noise <= 1); const top3 = top2.length ? top2 : top.filter((x) => x.r.noise <= 2); top.length = 0; top.push(...top3);   // fall back to noise ≤ 2 (a decoy can be stripped by hand)
console.log(`// hunt ${name} seed ${seedN}: ${n} evals, ${archive.size} kept`);
for (const x of top.slice(0, 6)) { console.log(x.map.map((r) => "      '" + r + "',").join('\n')); const m = x.m;
  console.log(`  // par ${m.par} steps ${m.steps} len ${m.len} closes ${m.closes} flips ${m.flips || 0} | wrong ${m.wrong} first ${m.firstWrong} | dead ${m.deadFrac} basins ${m.deadEnds} | before ${+m.before} made ${+m.made} ride ${+m.ride} | phases ${m.phases} backs ${m.backs} switches ${m.stackSwitches} | noise ${x.r.noise} irrelevant ${x.r.irrelevant} decoys ${x.r.decoys.join(' ')} | F ${x.F.toFixed(1)}\n  // ${m.solution}\n`); }
