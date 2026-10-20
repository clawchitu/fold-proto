// Solve every level by brute force: node tools/check.js
// Reports the fewest angle changes needed, which postures / objects are essential, and a difficulty score
// (docs/design-difficulty.md §2, metric v2) that every level's declared tier must meet.
// The hinge is sampled at a few angles; moving between two samples walks the angle in 5° steps
// so a character standing on a shadow rides it (or falls) exactly as in the game.
const L = require('../logic.js');
const LEVELS = require('../levels.js');

const ANGLES = [0, 90, 100, 110, 120, 125, 130, 140, 150, 180];
const SHADE = ANGLES.filter((a) => a >= L.SHADE_MIN && a < L.FOLD_MIN);
const STEPPED = [...Array(13).keys()].map((k) => k * 15);   // keyboard / big-button steps

// Difficulty tiers (design-difficulty.md §2, v2): score ranges. Calibrated so that every level of
// vol. 1 「两岸」 (the owner: "still a bit easy") lands at mid or below; vol. 2 starts where it ends.
const TIERS = { teach: [0, 2], easy: [3, 4], mid: [5, 7], hard: [8, 10], final: [11, 99] };
const MECHANICS = ['needsFold', 'needsPop', 'needsShade', 'needsRide', 'needsKey', 'needsInk', 'needsGlue'];

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
const worldOf = (base, G, s) => ({ grid: G[s.st], h: base.h, w: base.w, char: { c: s.c, r: s.r }, start: base.start });
const after = (s, a) => (a >= L.FOLD_MIN ? 1 : s.st);
function goalOf(base) { for (let r = 0; r < base.h; r++) for (let c = 0; c < base.w; c++) if (base.grid[r][c] === 'G') return { c, r }; return null; }

// 0-1 BFS from `from` (default: the level start): angle changes cost 1, steps cost 0.
function solve(level, angles = ANGLES, from = null) {
  const { base, grids: G } = grids(level);
  const start = from || { c: base.char.c, r: base.char.r, a: 0, st: 0 };
  const seen = new Map([[keyOf(start), null]]);
  const node = new Map([[keyOf(start), start]]);
  const dist = new Map([[keyOf(start), 0]]);
  const dq = [[start, 0]];
  while (dq.length) {
    const [s, cost] = dq.shift();
    if (cost > dist.get(keyOf(s))) continue;
    const mode = L.modeOf(s.a);
    const world = worldOf(base, G, s);
    if (L.isWin(world, mode)) {
      const steps = [], cells = new Set(), path = []; let k = keyOf(s), raw = 0;
      while (k) { const [c, r, a] = k.split(','); steps.unshift(`${L.modeOf(+a)}${a}@${c},${r}`); cells.add(c + ',' + r); path.unshift(node.get(k)); k = seen.get(k); raw++; }
      return { cost, walk: raw - 1 - cost, cells, path,
        steps: steps.filter((x, i, arr) => i === 0 || x.split('@')[0] !== arr[i - 1].split('@')[0] || i === arr.length - 1) };
    }
    const next = [];
    for (const a of angles) {
      if (a === s.a) continue;
      const to = turn(world, world.char, s.a, a);
      if (to) next.push([{ c: to.c, r: to.r, a, st: after(s, a) }, 1]);
    }
    const sh = L.shadows(world, s.a);
    for (const n of L.neighbours(world, world.char, mode, sh)) next.push([{ ...s, c: n.c, r: n.r }, 0]);
    for (const [n, w] of next) {
      const k = keyOf(n);
      if (dist.has(k) && dist.get(k) <= cost + w) continue;
      dist.set(k, cost + w); seen.set(k, keyOf(s)); node.set(k, n);
      w ? dq.push([n, cost + w]) : dq.unshift([n, cost]);
    }
  }
  return null;
}

// Posture label for a sampled angle: what the player feels they did, not the exact degree.
const posture = (a) => (a >= L.FOLD_MIN ? 'fold' : a >= L.SHADE_MIN ? 'lean' : a >= L.POP_MIN ? 'pop' : 'open');

// How far the goal looks from here, to a player who reads the board and not the rules: Manhattan distance,
// in stacked columns when the book is closed, plus two for "it is on the other page" when it is open.
function hOf(s, g) {
  if (!g) return 0;
  if (L.modeOf(s.a) === 'fold') return Math.abs(L.proj(s.c) - L.proj(g.c)) + Math.abs(s.r - g.r);
  return Math.abs(s.c - g.c) + Math.abs(s.r - g.r) + (L.isRight(s.c) !== L.isRight(g.c) ? 2 : 0);
}

// A naive player: best-first search that always expands the state that looks closest to the goal
// (hOf), preferring fewer hinge moves on ties. Returns how many states it visits before winning —
// small when the board can be read straight, large when the obvious reading is wrong.
function greedy(level) {
  const { base, grids: G } = grids(level), g = goalOf(base);
  const start = { c: base.char.c, r: base.char.r, a: 0, st: 0 };
  const seen = new Set([keyOf(start)]), visited = new Set();
  let open = [[hOf(start, g), 0, start]];
  while (open.length) {
    open.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const [, hc, s] = open.shift(); visited.add([s.c, s.r, posture(s.a), s.st].join());
    const w = worldOf(base, G, s), mode = L.modeOf(s.a);
    if (L.isWin(w, mode)) return visited.size;
    const push = (n, cost) => { const k = keyOf(n); if (!seen.has(k)) { seen.add(k); open.push([hOf(n, g), cost, n]); } };
    for (const n of L.neighbours(w, w.char, mode, L.shadows(w, s.a))) push({ ...s, c: n.c, r: n.r }, hc);
    for (const a of ANGLES) { if (a === s.a) continue; const to = turn(w, w.char, s.a, a); if (to) push({ c: to.c, r: to.r, a, st: after(s, a) }, hc + 1); }
  }
  return visited.size;
}

// Every state reachable by walking alone from s (no hinge move).
function closure(base, G, s) {
  const seen = new Map([[keyOf(s), s]]), q = [s];
  while (q.length) {
    const x = q.shift(), w = worldOf(base, G, x);
    for (const n of L.neighbours(w, w.char, L.modeOf(x.a), L.shadows(w, x.a))) {
      const ns = { ...x, c: n.c, r: n.r }, nk = keyOf(ns);
      if (!seen.has(nk)) { seen.set(nk, ns); q.push(ns); }
    }
  }
  return [...seen.values()];
}

// Difficulty metric v2 (design-difficulty.md §2). Explores every reachable state (cell, angle, stamped) and measures
//   structure (v1): par, forks (distinct minimal posture sequences; 1 = one idea), walk, trap (a crush from solid paper
//     on the optimal route), window (sampled lean angles that work; ≤ 2 = precision or a ride), combo (mechanics needed)
//   what the owner actually feels (v2):
//   greedy   – states a naive best-first player (hOf) visits before winning
//   misdirect– the goal-direct first hinge move (closest-looking cell, posture that minimises hOf, ties → close)
//              kills you or leaves you strictly worse off than the start (more changes to go, or none)
//   undo     – hinge moves in the optimal solution immediately followed by another hinge move (no step between):
//              the fold/lean was a tool or a ride, not a way to get somewhere
//   away     – steps in the optimal solution that increase the apparent goal distance (walk away to get there)
//   dead     – collapsed (cell, posture, stamped) states from which the goal cannot be reached without undo
//   deadEnds – dead basins (components of the dead region) with ≥ 3 such states: you can keep playing, lost
//   before   – the level cannot be solved if the book starts already stamped: something must happen BEFORE the first
//              close (the close takes it away) — the first "don't do the obvious thing yet" rule
//   made     – the solution walks a shadow of a stone that was not on the right page at the start: you built the shadow
//   score = par + [forks = 1] + [walk ≥ 8] + [trap] + [window ≤ 2] + [combo ≥ 3]
//         + [greedy ≥ 25] + [greedy ≥ 60] + [misdirect] + [undo ≥ 1] + [away ≥ 3] + [deadEnds ≥ 1] + [dead ≥ 12] + [before] + [made]
function analyse(level) {
  const best = solve(level);
  if (!best) return null;
  const { base, grids: G } = grids(level), g = goalOf(base);
  const world = (s) => worldOf(base, G, s);
  const start = { c: base.char.c, r: base.char.r, a: 0, st: 0 };
  const nodes = new Map([[keyOf(start), start]]), rev = new Map(), fwd = new Map(), wins = new Set(), traps = new Set();
  let kills = 0;
  const queue = [start];
  while (queue.length) {
    const s = queue.shift(), k = keyOf(s), w = world(s), mode = L.modeOf(s.a);
    fwd.set(k, []);
    if (L.isWin(w, mode)) { wins.add(k); continue; }
    const out = [];
    for (const a of ANGLES) {
      if (a === s.a) continue;
      const to = turn(w, w.char, s.a, a);
      if (!to) { kills++; if (L.isFloor(L.at(w, s.c, s.r))) traps.add(k); continue; }   // a kill from solid paper = a crush
      out.push({ c: to.c, r: to.r, a, st: after(s, a) });
    }
    for (const n of L.neighbours(w, w.char, mode, L.shadows(w, s.a))) out.push({ ...s, c: n.c, r: n.r });
    for (const n of out) {
      const nk = keyOf(n);
      if (!rev.has(nk)) rev.set(nk, []);
      rev.get(nk).push(k); fwd.get(k).push(nk);
      if (!nodes.has(nk)) { nodes.set(nk, n); queue.push(n); }
    }
  }
  const alive = new Set(wins), q2 = [...wins];
  while (q2.length) { const k = q2.shift(); for (const p of rev.get(k) || []) if (!alive.has(p)) { alive.add(p); q2.push(p); } }
  // collapse angles to postures so a wide lean window does not count as many dead ends
  const collapse = (s) => [s.c, s.r, posture(s.a), s.st].join();
  const aliveC = new Set([...alive].map((k) => collapse(nodes.get(k))));
  const deadKeys = [...nodes.keys()].filter((k) => !alive.has(k));
  const deadC = new Set(deadKeys.map((k) => collapse(nodes.get(k))).filter((c) => !aliveC.has(c)));
  // dead basins: components of the dead region (undirected over moves), sized in collapsed states
  const seenDead = new Set(); let deadEnds = 0, deadDepth = 0;
  for (const k0 of deadKeys) {
    if (seenDead.has(k0)) continue;
    const comp = new Set(), q = [k0]; seenDead.add(k0);
    while (q.length) {
      const k = q.shift(); comp.add(collapse(nodes.get(k)));
      for (const n of [...(fwd.get(k) || []), ...(rev.get(k) || [])]) if (!alive.has(n) && !seenDead.has(n)) { seenDead.add(n); q.push(n); }
    }
    const size = [...comp].filter((c) => !aliveC.has(c)).length;
    if (size >= 3) deadEnds++;
    deadDepth = Math.max(deadDepth, size);
  }
  // distinct minimal posture sequences
  const seqs = new Set();
  const trap = [...traps].some((k) => { const s = nodes.get(k); return best.cells.has(s.c + ',' + s.r); });
  // what a hinge move feels like: closing or opening further while shadows are in play reads as one idea ("keep going")
  const label = (a0, a) => { const p = posture(a), p0 = posture(a0); if (p === 'lean' || (p0 === 'lean' && p !== 'fold')) return a > a0 ? 'lean+' : 'lean−'; return p; };
  (function rec(s, depth, labels) {
    const cl = closure(base, G, s);
    if (cl.some((x) => L.isWin(world(x), L.modeOf(x.a)))) { seqs.add(labels.join(' → ')); return; }
    if (depth === 0) return;
    for (const a of ANGLES) {
      if (a === s.a || posture(a) === posture(s.a) && posture(a) !== 'lean') continue;
      const nexts = new Map();
      for (const x of cl) {
        const to = turn(world(x), { c: x.c, r: x.r }, x.a, a);
        if (to) { const n = { c: to.c, r: to.r, a, st: after(x, a) }; nexts.set(keyOf(n), n); }
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
  const flags = report(level, false), combo = MECHANICS.filter((k) => flags[k]).length;

  // ---- v2: the naive player ----
  const naive = greedy(level);
  // the goal-direct first move: from wherever you can walk at the start, the hinge move that makes the goal look
  // closest (ties: the fuller close — closing is what a player does first)
  let direct = null;
  for (const x of closure(base, G, start)) for (const a of ANGLES) {
    if (a === 0) continue;
    const imagined = { c: x.c, r: x.r, a, st: after(x, a) }, h = hOf(imagined, g);
    if (!direct || h < direct.h || (h === direct.h && a > direct.a)) direct = { h, a, from: x };
  }
  let misdirect = false;
  if (direct) {
    const to = turn(world(direct.from), { c: direct.from.c, r: direct.from.r }, 0, direct.a);
    if (!to) misdirect = true;                                            // crushed or dropped
    else { const rest = solve(level, ANGLES, { c: to.c, r: to.r, a: direct.a, st: after(direct.from, direct.a) }); misdirect = !rest || rest.cost > best.cost; }
  }
  // insight moves along the optimal path: hinge moves with no step between, and steps away from the goal
  let undo = 0, away = 0;
  for (let i = 1; i < best.path.length; i++) {
    const p = best.path[i - 1], s = best.path[i];
    if (s.a !== p.a) { const n = best.path[i + 1]; if (n && n.a !== s.a) undo++; }
    else if (hOf(s, g) > hOf(p, g)) away++;
  }
  // twist: the mechanic used in a way its teaching level did not show
  const stampedStart = solve(level, ANGLES, { ...start, st: 1 });
  const before = !stampedStart;
  const made = best.path.some((s) => {
    if (s.st !== 1 || posture(s.a) !== 'lean' || L.isRight(s.c) || L.isFloor(L.at(world(s), s.c, s.r))) return false;
    const src = L.shadows(world(s), s.a).get(s.c + ',' + s.r);
    return src != null && base.grid[s.r][src] !== 'x';
  });
  const structure = best.cost + (forks === 1 ? 1 : 0) + (best.walk >= 8 ? 1 : 0) + (trap ? 1 : 0) + (window <= 2 ? 1 : 0) + (combo >= 3 ? 1 : 0);
  const insight = 2 * (misdirect ? 1 : 0) + 2 * (deadEnds >= 1 ? 1 : 0) + (dead >= 12 ? 1 : 0) + 2 * (before ? 1 : 0) + 2 * (made ? 1 : 0)
    + (naive >= 40 ? 1 : 0) + (undo >= 1 ? 1 : 0) + (away >= 3 ? 1 : 0);
  const score = Math.ceil(structure / 2) + insight;
  const tier = Object.keys(TIERS).find((t) => score >= TIERS[t][0] && score <= TIERS[t][1]);   // lowest tier the score fits
  return { par: best.cost, walk: best.walk, states: nodes.size, explore, dead, deadEnds, deadDepth, kills, forks, trap, window, combo,
    greedy: naive, misdirect, undo, away, before, made, structure, insight, score, tier, solutions: [...seqs] };
}

// Everything the solver knows about one level; tools/export.js ships it to the iOS tests.
function report(lv, withDifficulty = true) {
  const full = solve(lv);
  const noFold = solve(lv, ANGLES.filter((a) => a < L.FOLD_MIN));
  const noPop = solve(lv, ANGLES.filter((a) => a < L.POP_MIN || a > L.POP_MAX));
  const noShade = solve(lv, ANGLES.filter((a) => !SHADE.includes(a)));
  const oneShade = SHADE.some((keep) => solve(lv, ANGLES.filter((a) => !SHADE.includes(a) || a === keep)));
  const without = (ch) => solve({ map: lv.map.map((row) => row.split(ch).join('.')) });
  const all = lv.map.join('');
  const out = { solvable: !!full, changes: full ? full.cost : null, needsFold: !noFold, needsPop: !noPop };
  if (lv.map.some((row) => row.slice(L.N).includes('x')) || (all.includes('g') && all.includes('x'))) { out.needsShade = !noShade; out.needsRide = !oneShade; }
  if (all.includes('k')) out.needsKey = !without('k');
  if (all.includes('i')) out.needsInk = !without('i');
  if (all.includes('g')) {
    out.needsGlue = !without('g');                                   // unsolvable with the glue wiped off
    const st = L.create(lv); out.glueFires = L.stamp(st).some((e) => e.type === 'glue');   // a stone really changes page
  }
  out.stepped15 = !!solve(lv, STEPPED);
  if (withDifficulty && full) {
    const d = analyse(lv);
    out.difficulty = { score: d.score, tier: d.tier, dead: d.dead, deadEnds: d.deadEnds, forks: d.forks, walk: d.walk, window: d.window, combo: d.combo,
      greedy: d.greedy, misdirect: d.misdirect, undo: d.undo, away: d.away, before: d.before, made: d.made };
  }
  return out;
}

module.exports = { solve, analyse, report, greedy, turn, grids, goalOf, hOf, posture, ANGLES, STEPPED, SHADE, TIERS };
if (require.main !== module) return;

let ok = true;
const fail = (msg) => { ok = false; console.log('   ' + msg); };
const table = [];
LEVELS.forEach((lv, i) => {
  const r = report(lv);
  const full = solve(lv);
  console.log(`${i + 1} ${lv.id}: ${full ? 'changes=' + full.cost : 'UNSOLVABLE'}` +
    `  needsFold=${r.needsFold} needsPop=${r.needsPop}` +
    ('needsShade' in r ? `  needsShade=${r.needsShade} needsRide=${r.needsRide}` : '') +
    ('needsKey' in r ? `  needsKey=${r.needsKey}` : '') +
    ('needsInk' in r ? `  needsInk=${r.needsInk}` : '') +
    ('needsGlue' in r ? `  needsGlue=${r.needsGlue} glueFires=${r.glueFires}` : ''));
  if (!full) { fail('UNSOLVABLE'); return; }
  console.log('   ' + full.steps.join(' → '));
  const d = analyse(lv);
  console.log(`   difficulty ${d.score} (${d.tier}) = structure ${d.structure}/2 + insight ${d.insight}  par=${d.par} walk=${d.walk} forks=${d.forks} window=${d.window} combo=${d.combo}${d.trap ? ' trap' : ''}` +
    `  | greedy=${d.greedy}${d.misdirect ? ' misdirect' : ''} undo=${d.undo} away=${d.away} dead=${d.dead} deadEnds=${d.deadEnds}${d.before ? ' before' : ''}${d.made ? ' made' : ''}  declared=${lv.tier}`);
  table.push({ n: i + 1, id: lv.id, d, declared: lv.tier });
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
  // vol. 1 has no dead ends by design (design-difficulty.md §1); from vol. 2 on they are a tool, and the game has undo
  if (i < 25 && d.dead) fail(`DEAD ENDS in a vol. 1 level: ${d.dead}`);
});
if (process.argv.includes('--table')) {
  console.log('\n| # | id | par | forks | walk | trap | window | combo | S | greedy | misdirect | undo | away | dead | deadEnds | before | made | I | score | tier |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const { n, id, d } of table) console.log(`| ${n} | ${id} | ${d.par} | ${d.forks} | ${d.walk} | ${d.trap ? 1 : 0} | ${d.window} | ${d.combo} | ${d.structure} | ${d.greedy} | ${d.misdirect ? 1 : 0} | ${d.undo} | ${d.away} | ${d.dead} | ${d.deadEnds} | ${d.before ? 1 : 0} | ${d.made ? 1 : 0} | ${d.insight} | **${d.score}** | ${d.tier} |`);
}
console.log(ok ? 'all levels solvable, also with 15° steps only; every tier met' : 'FAIL');
process.exit(ok ? 0 : 1);
