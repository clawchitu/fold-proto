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
};
const G_posture = C.posture;
const t = T[name]; if (!t) throw new Error('name');
const opts = { ...t, iters: 1e9, restarts: 1, seed: seedN, nodead: false, noride: false, leftx: false, maxvoid: 0.62, maxlen: 0, matched: false, goalT: false, minflips: 0, configs: 0, switches: 0, mincloses: 0 };
const mk = (map) => (t.lamp ? { map, lamp: t.lamp } : { map });
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
