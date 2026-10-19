// Solve every level by brute force: node tools/check.js
// Reports the fewest angle changes needed, which postures / objects are essential, and a difficulty score
// (docs/design-difficulty.md §2) that every level's declared tier must meet.
// The hinge is sampled at a few angles; moving between two samples walks the angle in 5° steps
// so a character standing on a shadow rides it (or falls) exactly as in the game.
const L = require('../logic.js');
const LEVELS = require('../levels.js');

const ANGLES = [0, 90, 100, 110, 120, 125, 130, 140, 150, 180];
const SHADE = ANGLES.filter((a) => a >= L.SHADE_MIN && a < L.FOLD_MIN);
const STEPPED = [...Array(13).keys()].map((k) => k * 15);   // keyboard / big-button steps

// Difficulty tiers (design-difficulty.md §2): score ranges and the solve time they aim for.
const TIERS = { teach: [0, 2], easy: [3, 4], mid: [5, 6], hard: [7, 8], final: [8, 8] };

function turn(world, from, a0, a1) {
  // returns the character cell after turning the hinge from a0 to a1, or null if it falls
  let cur = { ...from }, src = null;
  const step = a1 > a0 ? 5 : -5;
  for (let a = a0 + step; step > 0 ? a <= a1 : a >= a1; a += step) {
    const w = { ...world, char: cur };
    const onShadow = !L.isRight(cur.c) && !L.isFloor(L.at(w, cur.c, cur.r));
    if (onShadow) { if (src == null) src = L.shadows(w, a - step).get(cur.c + ',' + cur.r) ?? null; } else src = null;
    const to = L.ride(w, cur, src, a);   // rides, falls, or is crushed when the book closes on a stone
    if (!to) return null;
    cur = to;
  }
  return cur;
}

function grids(level) {
  const base = L.create(level);
  const stamped = L.create(level); L.stamp(stamped);
  return { base, grids: [base.grid, stamped.grid] };
}
const keyOf = (s) => [s.c, s.r, s.a, s.st].join();

function solve(level, angles = ANGLES) {
  const { base, grids: G } = grids(level);
  const start = { c: base.char.c, r: base.char.r, a: 0, st: 0 };
  const seen = new Map([[keyOf(start), null]]);
  const dist = new Map([[keyOf(start), 0]]);
  const dq = [[start, 0]];                     // 0-1 BFS: angle changes cost 1, steps cost 0
  while (dq.length) {
    const [s, cost] = dq.shift();
    if (cost > dist.get(keyOf(s))) continue;
    const mode = L.modeOf(s.a);
    const world = { grid: G[s.st], h: base.h, w: base.w, char: { c: s.c, r: s.r }, start: base.start };
    if (L.isWin(world, mode)) {
      const steps = [], cells = new Set(); let k = keyOf(s), raw = 0;
      while (k) { const [c, r, a] = k.split(','); steps.unshift(`${L.modeOf(+a)}${a}@${c},${r}`); cells.add(c + ',' + r); k = seen.get(k); raw++; }
      return { cost, walk: raw - 1 - cost, cells,
        steps: steps.filter((x, i, arr) => i === 0 || x.split('@')[0] !== arr[i - 1].split('@')[0] || i === arr.length - 1) };
    }
    const next = [];
    for (const a of angles) {
      if (a === s.a) continue;
      const to = turn(world, world.char, s.a, a);
      if (to) next.push([{ c: to.c, r: to.r, a, st: a >= L.FOLD_MIN ? 1 : s.st }, 1]);
    }
    const sh = L.shadows(world, s.a);
    for (const n of L.neighbours(world, world.char, mode, sh)) next.push([{ ...s, c: n.c, r: n.r }, 0]);
    for (const [n, w] of next) {
      const k = keyOf(n);
      if (dist.has(k) && dist.get(k) <= cost + w) continue;
      dist.set(k, cost + w); seen.set(k, keyOf(s));
      w ? dq.push([n, cost + w]) : dq.unshift([n, cost]);
    }
  }
  return null;
}

// Posture label for a sampled angle: what the player feels they did, not the exact degree.
const posture = (a) => (a >= L.FOLD_MIN ? 'fold' : a >= L.SHADE_MIN ? 'lean' : a >= L.POP_MIN ? 'pop' : 'open');

// Difficulty metric. Explores every reachable state (cell, angle, stamped) and measures:
//   explore – cells × postures you can reach at all (how much board there is to wander; stamps count twice)
//   dead  – reachable states from which the goal is unreachable without undo (always 0 under the current rules:
//           stamps only add floor and shadows run both ways; kept so a future rule that breaks this is noticed)
//   kills – (state, hinge move) pairs that drop or crush the character
//   trap  – a crush is possible from solid paper on the optimal route (falls from shadows are expected, not traps)
//   forks – distinct minimal posture sequences that win (1 = exactly one idea works)
//   walk  – cells walked in the optimal solution
//   window – how many sampled lean angles work for the lean the solution needs (≤ 2 = precision, or a ride)
//   combo – how many mechanics (fold / pop / shade / ride / key / ink) the level cannot be solved without
//   score – par + [forks = 1] + [walk ≥ 8] + [trap] + [window ≤ 2] + [combo ≥ 3]   (0–8)
function analyse(level) {
  const best = solve(level);
  if (!best) return null;
  const { base, grids: G } = grids(level);
  const world = (s) => ({ grid: G[s.st], h: base.h, w: base.w, char: { c: s.c, r: s.r }, start: base.start });
  const start = { c: base.char.c, r: base.char.r, a: 0, st: 0 };
  const nodes = new Map([[keyOf(start), start]]), rev = new Map(), wins = new Set(), traps = new Set();
  let kills = 0;
  const queue = [start];
  while (queue.length) {
    const s = queue.shift(), k = keyOf(s), w = world(s), mode = L.modeOf(s.a);
    if (L.isWin(w, mode)) { wins.add(k); continue; }
    const out = [];
    for (const a of ANGLES) {
      if (a === s.a) continue;
      const to = turn(w, w.char, s.a, a);
      if (!to) { kills++; if (L.isFloor(L.at(w, s.c, s.r))) traps.add(k); continue; }   // a kill from solid paper = a crush
      out.push({ c: to.c, r: to.r, a, st: a >= L.FOLD_MIN ? 1 : s.st });
    }
    for (const n of L.neighbours(w, w.char, mode, L.shadows(w, s.a))) out.push({ ...s, c: n.c, r: n.r });
    for (const n of out) {
      const nk = keyOf(n);
      if (!rev.has(nk)) rev.set(nk, []);
      rev.get(nk).push(k);
      if (!nodes.has(nk)) { nodes.set(nk, n); queue.push(n); }
    }
  }
  const alive = new Set(wins), q2 = [...wins];
  while (q2.length) { const k = q2.shift(); for (const p of rev.get(k) || []) if (!alive.has(p)) { alive.add(p); q2.push(p); } }
  // collapse angles to postures so a wide lean window does not count as many dead ends
  const collapse = (s) => [s.c, s.r, posture(s.a), s.st].join();
  const aliveC = new Set([...alive].map((k) => collapse(nodes.get(k))));
  const deadC = new Set([...nodes.keys()].filter((k) => !alive.has(k)).map((k) => collapse(nodes.get(k))).filter((c) => !aliveC.has(c)));
  // distinct minimal posture sequences
  const seqs = new Set();
  const closure = (s) => {
    const seen = new Map([[keyOf(s), s]]), q = [s];
    while (q.length) {
      const x = q.shift(), w = world(x);
      for (const n of L.neighbours(w, w.char, L.modeOf(x.a), L.shadows(w, x.a))) {
        const ns = { ...x, c: n.c, r: n.r }, nk = keyOf(ns);
        if (!seen.has(nk)) { seen.set(nk, ns); q.push(ns); }
      }
    }
    return [...seen.values()];
  };
  const trap = [...traps].some((k) => { const s = nodes.get(k); return best.cells.has(s.c + ',' + s.r); });
  // what a hinge move feels like: closing or opening further while shadows are in play reads as one idea ("keep going")
  const label = (a0, a) => { const p = posture(a), p0 = posture(a0); if (p === 'lean' || (p0 === 'lean' && p !== 'fold')) return a > a0 ? 'lean+' : 'lean−'; return p; };
  (function rec(s, depth, labels) {
    const cl = closure(s);
    if (cl.some((x) => L.isWin(world(x), L.modeOf(x.a)))) { seqs.add(labels.join(' → ')); return; }
    if (depth === 0) return;
    for (const a of ANGLES) {
      if (a === s.a || posture(a) === posture(s.a) && posture(a) !== 'lean') continue;
      const nexts = new Map();
      for (const x of cl) {
        const to = turn(world(x), { c: x.c, r: x.r }, x.a, a);
        if (to) { const n = { c: to.c, r: to.r, a, st: a >= L.FOLD_MIN ? 1 : x.st }; nexts.set(keyOf(n), n); }
      }
      for (const n of nexts.values()) rec(n, depth - 1, [...labels, label(s.a, a)]);
    }
  })(start, best.cost, []);
  const dead = deadC.size, forks = seqs.size;
  const explore = new Set([...nodes.values()].map(collapse)).size;   // how much board × posture there is to wander
  // precision: how many sampled lean angles can stand in for the lean the optimal solution uses (0 = it needs a ride)
  const usesLean = best.steps.some((x) => posture(+x.match(/\d+/)[0]) === 'lean');
  const window = usesLean ? SHADE.filter((keep) => { const s = solve(level, ANGLES.filter((a) => !SHADE.includes(a) || a === keep)); return s && s.cost === best.cost; }).length : SHADE.length;
  // combination: how many of the game's mechanics this level cannot be solved without
  const flags = report(level, false), combo = ['needsFold', 'needsPop', 'needsShade', 'needsRide', 'needsKey', 'needsInk'].filter((k) => flags[k]).length;
  const score = best.cost + (forks === 1 ? 1 : 0) + (best.walk >= 8 ? 1 : 0) + (trap ? 1 : 0)
    + (window <= 2 ? 1 : 0) + (combo >= 3 ? 1 : 0);
  const tier = Object.keys(TIERS).find((t) => score >= TIERS[t][0] && score <= TIERS[t][1]);   // lowest tier the score fits
  return { par: best.cost, walk: best.walk, states: nodes.size, explore, dead, kills, forks, trap, window, combo, score, tier, solutions: [...seqs] };
}

// Everything the solver knows about one level; tools/export.js ships it to the iOS tests.
function report(lv, withDifficulty = true) {
  const full = solve(lv);
  const noFold = solve(lv, ANGLES.filter((a) => a < L.FOLD_MIN));
  const noPop = solve(lv, ANGLES.filter((a) => a < L.POP_MIN || a > L.POP_MAX));
  const noShade = solve(lv, ANGLES.filter((a) => !SHADE.includes(a)));
  const oneShade = SHADE.some((keep) => solve(lv, ANGLES.filter((a) => !SHADE.includes(a) || a === keep)));
  const without = (ch) => solve({ map: lv.map.map((row) => row.replace(ch, '.')) });
  const all = lv.map.join('');
  const out = { solvable: !!full, changes: full ? full.cost : null, needsFold: !noFold, needsPop: !noPop };
  if (lv.map.some((row) => row.slice(L.N).includes('x'))) { out.needsShade = !noShade; out.needsRide = !oneShade; }
  if (all.includes('k')) out.needsKey = !without('k');
  if (all.includes('i')) out.needsInk = !without('i');
  out.stepped15 = !!solve(lv, STEPPED);
  if (withDifficulty && full) { const d = analyse(lv); out.difficulty = { score: d.score, tier: d.tier, dead: d.dead, forks: d.forks, walk: d.walk, window: d.window, combo: d.combo }; }
  return out;
}

module.exports = { solve, analyse, report, ANGLES, TIERS };
if (require.main !== module) return;

let ok = true;
const fail = (msg) => { ok = false; console.log('   ' + msg); };
LEVELS.forEach((lv, i) => {
  const r = report(lv);
  const full = solve(lv);
  console.log(`${i + 1} ${lv.id}: ${full ? 'changes=' + full.cost : 'UNSOLVABLE'}` +
    `  needsFold=${r.needsFold} needsPop=${r.needsPop}` +
    ('needsShade' in r ? `  needsShade=${r.needsShade} needsRide=${r.needsRide}` : '') +
    ('needsKey' in r ? `  needsKey=${r.needsKey}` : '') +
    ('needsInk' in r ? `  needsInk=${r.needsInk}` : ''));
  if (!full) { fail('UNSOLVABLE'); return; }
  console.log('   ' + full.steps.join(' → '));
  const d = analyse(lv);
  console.log(`   difficulty ${d.score} (${d.tier})  par=${d.par} walk=${d.walk} explore=${d.explore} kills=${d.kills} forks=${d.forks} window=${d.window} combo=${d.combo}${d.trap ? ' trap' : ''}${d.dead ? ' DEAD=' + d.dead : ''}  declared=${lv.tier}`);
  // accessibility: solvable with only the 15° keyboard / big-button steps (no precise slider)
  if (!r.stepped15) fail('NOT solvable with 15° steps');
  // fatigue budget (plan.md §12.3): best solution needs ≤ 3 posture changes, of which ≤ 2 full closes
  const closes = full.steps.filter((x, i, arr) => x.startsWith('fold') && (i === 0 || !arr[i - 1].startsWith('fold'))).length;
  if (full.cost > 3) fail(`OVER PAR: ${full.cost} posture changes (max 3)`);
  if (closes > 2) fail(`OVER PAR: ${closes} full closes (max 2)`);
  // difficulty: the level must land in the tier its designer declared (design-difficulty.md §2)
  if (!TIERS[lv.tier]) fail(`no tier declared (one of ${Object.keys(TIERS).join(' / ')})`);
  else if (d.score < TIERS[lv.tier][0] || d.score > TIERS[lv.tier][1]) fail(`TIER MISMATCH: scored ${d.score} (${d.tier}), declared ${lv.tier} = ${TIERS[lv.tier].join('–')}`);
  // every level must need the chapter's mechanic it was built on
  for (const need of lv.needs || []) if (!r[need]) fail(`does not need ${need}`);
});
console.log(ok ? 'all levels solvable, also with 15° steps only; every tier met' : 'FAIL');
process.exit(ok ? 0 : 1);
