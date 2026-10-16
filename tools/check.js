// Solve every level by brute force: node tools/check.js
// Reports the fewest angle changes needed and which postures / objects are essential.
// The hinge is sampled at a few angles; moving between two samples walks the angle in 5° steps
// so a character standing on a shadow rides it (or falls) exactly as in the game.
const L = require('../logic.js');
const LEVELS = require('../levels.js');

const ANGLES = [0, 90, 100, 110, 120, 125, 130, 140, 150, 180];
const SHADE = ANGLES.filter((a) => a >= L.SHADE_MIN && a < L.FOLD_MIN);

function turn(world, from, a0, a1) {
  // returns the character cell after turning the hinge from a0 to a1, or null if it falls
  let cur = { ...from }, src = null;
  const step = a1 > a0 ? 5 : -5;
  for (let a = a0 + step; step > 0 ? a <= a1 : a >= a1; a += step) {
    const w = { ...world, char: cur };
    if (!L.isRight(cur.c) && !L.isFloor(L.at(w, cur.c, cur.r))) {
      if (src == null) src = L.shadows(w, a - step).get(cur.c + ',' + cur.r) ?? null;
      const to = L.ride(w, cur, src, a);
      if (!to) return null;
      cur = to;
    } else src = null;
  }
  return cur;
}

function solve(level, angles = ANGLES) {
  const base = L.create(level);
  const stamped = L.create(level); L.stamp(stamped);
  const grids = [base.grid, stamped.grid];
  const start = { c: base.char.c, r: base.char.r, a: 0, st: 0 };
  const key = (s) => [s.c, s.r, s.a, s.st].join();
  const seen = new Map([[key(start), null]]);
  const dist = new Map([[key(start), 0]]);
  const dq = [[start, 0]];                     // 0-1 BFS: angle changes cost 1, steps cost 0
  while (dq.length) {
    const [s, cost] = dq.shift();
    if (cost > dist.get(key(s))) continue;
    const mode = L.modeOf(s.a);
    const world = { grid: grids[s.st], h: base.h, w: base.w, char: { c: s.c, r: s.r }, start: base.start };
    if (L.isWin(world, mode)) {
      const steps = []; let k = key(s);
      while (k) { const [c, r, a] = k.split(','); steps.unshift(`${L.modeOf(+a)}${a}@${c},${r}`); k = seen.get(k); }
      return { cost, steps: steps.filter((x, i, arr) => i === 0 || x.split('@')[0] !== arr[i - 1].split('@')[0] || i === arr.length - 1) };
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
      const k = key(n);
      if (dist.has(k) && dist.get(k) <= cost + w) continue;
      dist.set(k, cost + w); seen.set(k, key(s));
      w ? dq.push([n, cost + w]) : dq.unshift([n, cost]);
    }
  }
  return null;
}

let ok = true;
LEVELS.forEach((lv, i) => {
  const full = solve(lv);
  const noFold = solve(lv, ANGLES.filter((a) => a < L.FOLD_MIN));
  const noPop = solve(lv, ANGLES.filter((a) => a < L.POP_MIN || a > L.POP_MAX));
  const noShade = solve(lv, ANGLES.filter((a) => !SHADE.includes(a)));
  const oneShade = SHADE.some((keep) => solve(lv, ANGLES.filter((a) => !SHADE.includes(a) || a === keep)));
  const without = (ch) => solve({ map: lv.map.map((row) => row.replace(ch, '.')) });
  const hasStoneRight = lv.map.some((row) => row.slice(L.N).includes('x'));
  if (!full) ok = false;
  console.log(`${i + 1} ${lv.name}: ${full ? 'changes=' + full.cost : 'UNSOLVABLE'}` +
    `  needsFold=${!noFold} needsPop=${!noPop}` +
    (hasStoneRight ? `  needsShade=${!noShade} needsRide=${!oneShade}` : '') +
    (lv.map.join('').includes('k') ? `  needsKey=${!without('k')}` : '') +
    (lv.map.join('').includes('i') ? `  needsInk=${!without('i')}` : ''));
  if (full) console.log('   ' + full.steps.join(' → '));
});
process.exit(ok ? 0 : 1);
