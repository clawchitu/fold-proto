// Solve every level by brute force: node tools/check.js
// Reports the fewest fold changes needed and which postures are essential.
const L = require('../logic.js');
const LEVELS = require('../levels.js');

function solve(level, modes = ['open', 'pop', 'fold']) {
  const base = L.create(level);
  const stamped = L.create(level); L.stamp(stamped);
  const grids = [base.grid, stamped.grid];
  const start = { c: base.char.c, r: base.char.r, m: 'open', st: 0 };
  const key = (s) => [s.c, s.r, s.m, s.st].join();
  const seen = new Map([[key(start), null]]);  // state -> previous state
  const dist = new Map([[key(start), 0]]);
  const dq = [[start, 0]];                     // 0-1 BFS: posture changes cost 1, steps cost 0
  while (dq.length) {
    const [s, cost] = dq.shift();
    if (cost > dist.get(key(s))) continue;
    const world = { grid: grids[s.st], h: base.h, w: base.w, char: { c: s.c, r: s.r } };
    if (L.isWin(world, s.m)) {
      const steps = []; let k = key(s);
      while (k) { const [c, r, m] = k.split(','); steps.unshift(`${m}@${c},${r}`); k = seen.get(k); }
      return { cost, steps: steps.filter((x, i, a) => i === 0 || x.split('@')[0] !== a[i - 1].split('@')[0] || i === a.length - 1) };
    }
    const next = [];
    for (const m of modes) if (m !== s.m) next.push([{ ...s, m, st: m === 'fold' ? 1 : s.st }, 1]);
    for (const n of L.neighbours(world, world.char, s.m)) next.push([{ ...s, c: n.c, r: n.r }, 0]);
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
  const noFold = solve(lv, ['open', 'pop']);
  const noPop = solve(lv, ['open', 'fold']);
  const without = (ch) => solve({ map: lv.map.map((row) => row.replace(ch, '.')) });
  if (!full) ok = false;
  console.log(`${i + 1} ${lv.name}: ${full ? 'changes=' + full.cost : 'UNSOLVABLE'}` +
    `  needsFold=${!noFold} needsPop=${!noPop}` +
    (lv.map.join('').includes('k') ? `  needsKey=${!without('k')}` : '') +
    (lv.map.join('').includes('i') ? `  needsInk=${!without('i')}` : ''));
  if (full) console.log('   ' + full.steps.join(' → '));
});
process.exit(ok ? 0 : 1);
