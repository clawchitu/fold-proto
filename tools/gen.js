// Level generator + search over the exact rules in logic.js (docs/difficulty-postmortem.md §3).
//
//   node tools/gen.js stats                      quantify every level in levels.js (board, elements, solution length,
//                                                decoys, irrelevant cells, wrong turns, dead fraction, v2 score)
//   node tools/gen.js show '-S------,-.------'   full metrics + solution for one map (rows comma-separated)
//   node tools/gen.js search [options]           evolutionary search; prints the best boards as levels.js snippets
//       --rows 5        board height                       --iters 4000     mutations per restart
//       --restarts 12   random restarts                    --seed 1         RNG seed
//       --par 4         max posture changes                --closes 2       max full closes
//       --minpar 3      reject boards below this par       --tiles '.-xg'   tile palette (plus S and G)
//       --need glue     the mechanics that must be essential: glue | shade | pop | key | ink, joined with '+'
//       --from id       start every restart from this levels.js id (or a comma-separated map) instead of a random board
//       --top 8         how many boards to print           --elements 9     element budget (x k D i p g)
//       --polish        strip irrelevant cells / noise elements from the winners before ranking
//       vol. 1 retune (postmortem §6): --nodead (no dead state), --noride (the solution never rides), --leftx (stones on the
//       left page only), --maxvoid 0.6 (penalise boards with more gap than that), --minlen 12 / --maxlen 14 (penalise solutions outside the band);
//       --matched (every door has a key facing it, every key a door, every ink a gap); --need also takes fold | ride | made
//
// What the search optimises (fitness(), §3 of the postmortem):
//   long minimal solutions (par, steps), many plausible-but-wrong hinge moves at each decision point (wrong),
//   irreversible traps (deadEnds, before), element reuse (made, reuse), a small rule surface (few elements),
//   one line of play (narrow). The expensive pass then subtracts decoys (noise) and irrelevant cells.
'use strict';
const L = require('../logic.js');
const C = require('./check.js');
const LEVELS = require('../levels.js');

const ANGLES = C.ANGLES, STEPPED = C.STEPPED;
const posture = C.posture;
const ELEMENTS = 'xkDipg';

// ---------- one level, prepared: both grids, memoised shadows ----------
function prep(level) {
  const base = L.create(level);
  const stamped = L.create(level);
  const events = L.stamp(stamped);
  const G = [base.grid, stamped.grid];
  const memo = [new Map(), new Map()];
  const world = (st) => ({ grid: G[st], h: base.h, w: base.w, start: base.start });
  const shadowsAt = (st, a) => {
    let m = memo[st].get(a);
    if (!m) { m = L.shadows(world(st), a); memo[st].set(a, m); }
    return m;
  };
  let goal = null;
  for (let r = 0; r < base.h; r++) for (let c = 0; c < base.w; c++) if (base.grid[r][c] === 'G') goal = { c, r };
  return { level, base, G, h: base.h, w: base.w, world, shadowsAt, goal, events,
    start: base.start ? { c: base.start.c, r: base.start.r, a: 0, st: 0 } : null };
}

// Turn the hinge from s.a to a1 in 5° steps, riding shadows; the landing cell or null (fell / crushed).
function turn(B, s, a1) {
  let cur = { c: s.c, r: s.r }, src = null;
  const w = B.world(s.st);
  const step = a1 > s.a ? 5 : -5;
  for (let a = s.a + step; step > 0 ? a <= a1 : a >= a1; a += step) {
    const onShadow = !L.isRight(cur.c) && !L.isFloor(L.at(w, cur.c, cur.r));
    if (onShadow) { if (src == null) src = B.shadowsAt(s.st, a - step).get(cur.c + ',' + cur.r) ?? null; } else src = null;
    const to = L.ride(w, cur, src, a);
    if (!to) return null;
    cur = to;
  }
  return cur;
}

// ---------- the whole state graph ----------
// nodes: key -> state; fwd: key -> [[key, hinge]]; kills: key -> {n, paper}; wins: Set
function explore(B, angles = ANGLES, from = B.start) {
  const key = (s) => [s.c, s.r, s.a, s.st].join();
  const nodes = new Map([[key(from), from]]), fwd = new Map(), kills = new Map(), wins = new Set();
  const queue = [from];
  while (queue.length) {
    const s = queue.shift(), k = key(s), mode = L.modeOf(s.a);
    const w = { ...B.world(s.st), char: { c: s.c, r: s.r } };
    const out = []; fwd.set(k, out);
    if (L.isWin(w, mode)) { wins.add(k); continue; }
    for (const a of angles) {
      if (a === s.a) continue;
      const to = turn(B, s, a);
      if (!to) { const kk = kills.get(k) || { n: 0, paper: 0 }; kk.n++; if (L.isFloor(L.at(w, s.c, s.r))) kk.paper++; kills.set(k, kk); continue; }
      const n = { c: to.c, r: to.r, a, st: a >= L.FOLD_MIN ? 1 : s.st }, nk = key(n);
      out.push([nk, 1]);
      if (!nodes.has(nk)) { nodes.set(nk, n); queue.push(n); }
    }
    for (const nb of L.neighbours(w, w.char, mode, B.shadowsAt(s.st, s.a))) {
      const n = { c: nb.c, r: nb.r, a: s.a, st: s.st }, nk = key(n);
      out.push([nk, 0]);
      if (!nodes.has(nk)) { nodes.set(nk, n); queue.push(n); }
    }
  }
  return { key, nodes, fwd, kills, wins, start: key(from) };
}

// min hinge moves from every node to a win (reverse 0-1 BFS); undefined = dead
function distToWin(g) {
  const rev = new Map();
  for (const [k, out] of g.fwd) for (const [nk, h] of out) { if (!rev.has(nk)) rev.set(nk, []); rev.get(nk).push([k, h]); }
  const d = new Map(); const dq = [];
  for (const w of g.wins) { d.set(w, 0); dq.push(w); }
  while (dq.length) {
    const k = dq.shift(), dk = d.get(k);
    for (const [p, h] of rev.get(k) || []) {
      const nd = dk + h;
      if (!d.has(p) || d.get(p) > nd) { d.set(p, nd); h ? dq.push(p) : dq.unshift(p); }
    }
  }
  return { d, rev };
}

// cheapest path start -> win, cost = 1000 * hinge + 1 * step (fewest postures, then fewest steps)
function bestPath(g) {
  const dist = new Map([[g.start, 0]]), prev = new Map();
  const heap = [[0, g.start]];
  const push = (x) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [cost, k] = pop();
    if (cost > dist.get(k)) continue;
    if (g.wins.has(k)) {
      const path = []; for (let p = k; p != null; p = prev.get(p)) path.unshift(p);
      return { path, par: Math.floor(cost / 1000), steps: cost % 1000 };
    }
    for (const [nk, h] of g.fwd.get(k) || []) {
      const nc = cost + (h ? 1000 : 1);
      if (!dist.has(nk) || dist.get(nk) > nc) { dist.set(nk, nc); prev.set(nk, k); push([nc, nk]); }
    }
  }
  return null;
}

const solvableFrom = (B, from, angles = ANGLES) => { if (!from) return false; const g = explore(B, angles, from); return g.wins.size > 0; };
const collapse = (s) => [s.c, s.r, posture(s.a), s.st].join();

// walking closure of a node (same angle, same st)
function closure(g, k) {
  const seen = new Set([k]), q = [k];
  while (q.length) { const x = q.shift(); for (const [nk, h] of g.fwd.get(x) || []) if (!h && !seen.has(nk)) { seen.add(nk); q.push(nk); } }
  return [...seen];
}

// ---------- cheap metrics (one graph) ----------
function measure(level) {
  const B = prep(level);
  const out = { rows: B.h, cols: B.w, solvable: false };
  const all = level.map.join('');
  out.elements = [...all].filter((t) => ELEMENTS.includes(t)).length;
  out.voids = [...all].filter((t) => t === '-').length;
  out.paper = [...all].filter((t) => '.Sg'.includes(t)).length;
  out.counts = Object.fromEntries([...ELEMENTS].map((t) => [t, [...all].filter((x) => x === t).length]));
  // elements that never fire: a door with no key facing it (a wall in disguise), a key facing no door, ink facing paper
  out.unmatched = 0;
  for (const row of level.map) for (let q = 0; q < L.N; q++) {
    const a = row[q], b = row[L.mirror(q)];
    for (const [x, y] of [[a, b], [b, a]]) { if ((x === 'D' && y !== 'k') || (x === 'k' && y !== 'D') || (x === 'i' && y !== '-')) out.unmatched++; }
  }
  if (!B.start || !B.goal) return out;
  const g = explore(B);
  out.states = g.nodes.size;
  const bp = bestPath(g);
  if (!bp) return out;
  out.solvable = true;
  out.par = bp.par; out.steps = bp.steps; out.len = bp.par + bp.steps;
  const states = bp.path.map((k) => g.nodes.get(k));
  out.closes = states.filter((s, i) => i > 0 && posture(s.a) === 'fold' && posture(states[i - 1].a) !== 'fold').length;
  out.solution = states.filter((s, i) => i === 0 || s.a !== states[i - 1].a || i === states.length - 1 || states[i + 1].a !== s.a)
    .map((s) => `${posture(s.a)}${s.a}@${s.c},${s.r}`).filter((x, i, arr) => x !== arr[i - 1]).join(' → ');
  const { d } = distToWin(g);
  // dead states (collapsed), dead basins ≥ 3
  const aliveC = new Set(), deadC = new Set();
  for (const [k, s] of g.nodes) (d.has(k) ? aliveC : deadC).add(collapse(s));
  for (const c of aliveC) deadC.delete(c);
  out.dead = deadC.size; out.deadFrac = +(deadC.size / (aliveC.size + deadC.size)).toFixed(2);
  const deadKeys = [...g.nodes.keys()].filter((k) => !d.has(k)), seen = new Set(); let basins = 0;
  const und = new Map();
  for (const [k, outs] of g.fwd) for (const [nk] of outs) { if (!und.has(k)) und.set(k, []); if (!und.has(nk)) und.set(nk, []); und.get(k).push(nk); und.get(nk).push(k); }
  for (const k0 of deadKeys) {
    if (seen.has(k0)) continue; seen.add(k0);
    const comp = new Set(), q = [k0];
    while (q.length) { const k = q.shift(); const c = collapse(g.nodes.get(k)); if (!aliveC.has(c)) comp.add(c); for (const n of und.get(k) || []) if (!d.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } }
    if (comp.size >= 3) basins++;
  }
  out.deadEnds = basins;
  // decision points: before each hinge move of the solution, what else could the hinge have done?
  let wrong = 0, narrow = 0, fatal = 0, firstWrong = 0, good = [];
  for (let i = 1; i < bp.path.length; i++) {
    const a0 = g.nodes.get(bp.path[i - 1]), a1 = g.nodes.get(bp.path[i]);
    if (a0.a === a1.a) continue;
    const dmin = d.get(bp.path[i - 1]);
    const opts = new Map();   // collapsed landing -> class
    let kill = 0;
    const here = closure(g, bp.path[i - 1]);
    const hereCells = new Set(here.map((k) => { const s = g.nodes.get(k); return s.c + ',' + s.r; }));
    // a hinge move only counts as a plausible alternative when it does something: reaches a cell you could not
    // walk to already, or fires the stamp. Idle leans and a close that lands you where you stood are not moves.
    const doesSomething = (nk) => { const n = g.nodes.get(nk); if (n.st !== a0.st) return true; return closure(g, nk).some((k) => { const s = g.nodes.get(k); return !hereCells.has(s.c + ',' + s.r); }); };
    for (const x of here) {
      const kk = g.kills.get(x); if (kk) kill += kk.paper;
      for (const [nk, h] of g.fwd.get(x) || []) {
        if (!h) continue;
        const n = g.nodes.get(nk), cls = !d.has(nk) ? 'dead' : d.get(nk) === dmin - 1 ? 'good' : doesSomething(nk) ? 'wrong' : 'idle';
        // one idea = one option: "close while standing here" per landing stack; "lean" / "stand" regardless of angle
        const cc = posture(n.a) === 'fold' ? `fold,${L.proj(n.c)},${n.r},${n.st}` : `${posture(n.a)},${n.st}`;
        if (!opts.has(cc) || cls === 'good') opts.set(cc, cls);
      }
    }
    for (const [cc, v] of opts) if (v === 'idle') opts.delete(cc);
    const nGood = [...opts.values()].filter((v) => v === 'good').length, nBad = opts.size - nGood;
    good.push(nGood); wrong += nBad; if (kill) fatal++;
    if (good.length === 1) firstWrong = nBad;
    if (nGood === 1) narrow++;
  }
  out.wrong = wrong; out.firstWrong = firstWrong; out.narrow = narrow; out.fatal = fatal; out.goodPerDecision = good.join('/');
  // the chapter's twists
  out.before = !solvableFrom(B, { ...B.start, st: 1 });
  out.made = states.some((s) => {
    if (s.st !== 1 || posture(s.a) !== 'lean' || L.isRight(s.c) || L.isFloor(L.at(B.world(1), s.c, s.r))) return false;
    const src = B.shadowsAt(1, s.a).get(s.c + ',' + s.r);
    return src != null && B.base.grid[s.r][src] !== 'x';
  });
  out.ride = states.some((s, i) => i > 0 && s.a !== states[i - 1].a && !L.isRight(s.c) && !L.isFloor(L.at(B.world(s.st), s.c, s.r)));
  out.glueFires = B.events.some((e) => e.type === 'glue');
  out.needsGlue = all.includes('g') && !solvableFrom(prep({ map: level.map.map((r) => r.split('g').join('.')) }), B.start);
  out.stepped15 = solvableFrom(B, B.start, STEPPED);
  out.needsPop = !solvableFrom(B, B.start, ANGLES.filter((a) => a < L.POP_MIN || a > L.POP_MAX));
  out.needsFold = !solvableFrom(B, B.start, ANGLES.filter((a) => a < L.FOLD_MIN));
  out.needsShade = !solvableFrom(B, B.start, ANGLES.filter((a) => a < L.SHADE_MIN || a >= L.FOLD_MIN));
  out.needsKey = all.includes('k') && !solvableFrom(prep({ map: level.map.map((r) => r.split('k').join('.')) }), B.start);
  out.needsInk = all.includes('i') && !solvableFrom(prep({ map: level.map.map((r) => r.split('i').join('.')) }), B.start);
  // which page switches: the solution lands on the other page after an open (land() chose the far page)
  out.pageSwitches = states.filter((s, i) => i > 0 && L.isRight(s.c) !== L.isRight(states[i - 1].c) && posture(states[i - 1].a) !== 'fold' && posture(s.a) !== 'fold').length;
  return out;
}

// ---------- expensive metrics: what each element and cell is for ----------
function roles(level, m) {
  const base = m || measure(level);
  if (!base.solvable) return { noise: 0, blockers: 0, loadBearing: 0, irrelevant: 0, reuse: 0, decoys: [] };
  const rows = level.map.map((r) => r.split(''));
  const variant = (edits) => { const g = rows.map((r) => [...r]); for (const [c, r, t] of edits) g[r][c] = t; return { map: g.map((r) => r.join('')) }; };
  const same = (v) => { const x = measure(v); return x.solvable ? (x.par === base.par ? (x.steps === base.steps ? 'same' : x.steps < base.steps ? 'shorter' : 'longer') : x.par < base.par ? 'shorter' : 'longer') : 'broken'; };
  let noise = 0, blockers = 0, loadBearing = 0; const decoys = [];
  const seenP = new Set();
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    const t = rows[r][c];
    if (!ELEMENTS.includes(t)) continue;
    let edits = [[c, r, '.']];
    if (t === 'p') { if (seenP.has(r)) continue; seenP.add(r); edits = [[L.N - 1, r, '.'], [L.N, r, '.']]; }
    const v = same(variant(edits));
    if (v === 'broken' || v === 'longer') loadBearing++;
    else if (v === 'shorter') blockers++;
    else { noise++; decoys.push(`${t}@${c},${r}`); }
  }
  // cells that carry nothing: turning them into a void changes neither the solution's length nor its existence
  let irrelevant = 0;
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    const t = rows[r][c];
    if ('-SG'.includes(t)) continue;
    if (t === 'p') continue;   // counted above
    if (same(variant([[c, r, '-']])) === 'same') irrelevant++;
  }
  // stones that play two roles in the solution: a shadow you walk + a wall / crush / glued stone
  const B = prep(level), g = explore(B), bp = bestPath(g), states = bp.path.map((k) => g.nodes.get(k));
  const stoneRoles = new Map();
  const add = (c, r, role) => { const k = c + ',' + r; if (!stoneRoles.has(k)) stoneRoles.set(k, new Set()); stoneRoles.get(k).add(role); };
  for (const e of B.events) if (e.type === 'glue') { add(e.cells[0].c, e.cells[0].r, 'moved'); }
  for (let i = 0; i < states.length; i++) {
    const s = states[i], w = B.world(s.st);
    if (posture(s.a) === 'lean' && !L.isRight(s.c) && !L.isFloor(L.at(w, s.c, s.r))) {
      const src = B.shadowsAt(s.st, s.a).get(s.c + ',' + s.r);
      if (src != null) { const orig = B.base.grid[s.r][src] === 'x' ? src : L.mirror(src); add(orig, s.r, 'shadow'); }
    }
    if (posture(s.a) === 'fold') {   // stones in the stack beside the path are walls
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = L.proj(s.c) + dc, r = s.r + dr;
        if (q < 0 || q >= L.N || r < 0 || r >= B.h) continue;
        for (const cc of [q, L.mirror(q)]) if (L.isOpaque(L.at(w, cc, r))) add(B.base.grid[r][cc] === 'x' ? cc : L.mirror(cc), r, 'wall');
      }
    }
    if (!L.isRight(s.c) && posture(s.a) !== 'fold' && L.isOpaque(L.at(w, L.mirror(s.c), s.r))) add(B.base.grid[s.r][L.mirror(s.c)] === 'x' ? L.mirror(s.c) : s.c, s.r, 'crush');
  }
  const reuse = [...stoneRoles.values()].filter((v) => v.size >= 2).length;
  return { noise, blockers, loadBearing, irrelevant, reuse, decoys, stoneRoles: Object.fromEntries([...stoneRoles].map(([k, v]) => [k, [...v].join('+')])) };
}

function full(level, withV2 = true) {
  const m = measure(level);
  const r = m.solvable ? roles(level, m) : {};
  let v2 = null;
  if (withV2) try { const a = C.analyse(level); if (a) v2 = { score: a.score, tier: a.tier, greedy: a.greedy, forks: a.forks }; } catch (e) { v2 = null; }
  return { ...m, ...r, v2 };
}

// ---------- fitness ----------
function fitness(level, opts, m) {
  m = m || measure(level);
  if (!m.solvable) return -1000 + (m.states || 0) * 0.05;
  const needOne = (n) => n === 'glue' ? m.glueFires || m.needsGlue : n === 'shade' ? m.needsShade : n === 'ride' ? m.ride : n === 'made' ? m.made
    : n === 'pop' ? m.needsPop : n === 'key' ? m.needsKey : n === 'ink' ? m.needsInk : n === 'fold' ? m.needsFold : true;
  const need = String(opts.need).split('+').every(needOne);
  // vol. 1 constraints (postmortem §6): --nodead no dead state anywhere; --noride the minimal solution never rides a shadow
  // (3-3 comes before the ride is taught); --minlen reject short boards early
  const vol1 = (opts.nodead && m.dead > 0) || (opts.noride && m.ride) || (opts.matched && m.unmatched > 0);
  if (m.par > opts.par || m.closes > opts.closes || !m.stepped15 || !need || m.par < opts.minpar || vol1) return -500 + m.par * 10 + Math.min(m.steps, 10);
  let f = 12 * m.par + 2 * Math.min(m.steps, 14) - 1.5 * Math.max(0, m.steps - 16);
  f += 4 * Math.min(m.wrong, 10) + 3 * Math.min(m.firstWrong, 4);
  f += 6 * Math.min(m.deadEnds, 2) + 6 * (m.deadFrac >= 0.15 && m.deadFrac <= 0.7 ? 1 : 0);
  f += 8 * (m.before ? 1 : 0) + 6 * (m.made ? 1 : 0) + 3 * (m.ride ? 1 : 0) + 3 * Math.min(m.fatal, 2) + 3 * Math.min(m.pageSwitches, 2);
  f += 4 * m.narrow;
  f -= 3 * Math.max(0, m.elements - opts.elements) + 0.6 * m.elements + 0.3 * Math.max(0, m.paper - 12);
  if (opts.maxvoid) f -= 60 * Math.max(0, m.voids / (m.rows * m.cols) - opts.maxvoid);   // a board that is mostly gap reads in a glance (§1.1)
  if (opts.minlen) f -= 5 * Math.max(0, opts.minlen - m.len);   // soft: the tier's solution-length floor
  if (opts.maxlen) f -= 5 * Math.max(0, m.len - opts.maxlen);   // soft: an easy level must stay easy
  f -= 8 * m.unmatched;   // a locked door with no key is a wall pretending to be a puzzle
  return f;
}

// ---------- search ----------
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

function randomBoard(R, rows, tiles, opts) {
  const g = [];
  for (let r = 0; r < rows; r++) { g.push([]); for (let c = 0; c < 2 * L.N; c++) g[r].push(R() < 0.4 ? '-' : R() < 0.75 ? '.' : tiles[Math.floor(R() * tiles.length)]); }
  fixPairs(g, R); if (opts && opts.leftx) leftOnly(g);
  const place = (t) => { for (;;) { const c = Math.floor(R() * 2 * L.N), r = Math.floor(R() * rows); if (!'SGp'.includes(g[r][c])) { g[r][c] = t; return; } } };
  place('S'); place('G');
  return { map: g.map((r) => r.join('')) };
}
function fixPairs(g, R) {   // pop-up tabs only as pairs across the crease
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[r].length; c++) if (g[r][c] === 'p' && c !== L.N - 1 && c !== L.N) g[r][c] = '.';
    const a = g[r][L.N - 1] === 'p', b = g[r][L.N] === 'p';
    if (a !== b) { if (R() < 0.5) { g[r][L.N - 1] = 'p'; g[r][L.N] = 'p'; } else { if (a) g[r][L.N - 1] = '.'; if (b) g[r][L.N] = '.'; } }
  }
}
function leftOnly(g) {   // --leftx: stones only on the left page (chapters 1–2: no shadows, no crush before chapter 3 teaches them)
  for (const row of g) for (let c = L.N; c < 2 * L.N; c++) if (row[c] === 'x') row[c] = '.';
}
function mutate(level, R, tiles, opts) {
  const g = level.map.map((r) => r.split(''));
  const rows = g.length, W = 2 * L.N;
  const pick = () => [Math.floor(R() * W), Math.floor(R() * rows)];
  const k = R();
  if (k < 0.6) {           // repaint one cell
    const [c, r] = pick(); if ('SG'.includes(g[r][c])) return mutate(level, R, tiles, opts);
    const u = R(); g[r][c] = u < 0.35 ? '.' : u < 0.6 ? '-' : tiles[Math.floor(R() * tiles.length)];
  } else if (k < 0.8) {    // swap two cells
    const [c1, r1] = pick(), [c2, r2] = pick(); [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
  } else {                 // move S or G
    const t = R() < 0.5 ? 'S' : 'G';
    for (let r = 0; r < rows; r++) for (let c = 0; c < W; c++) if (g[r][c] === t) g[r][c] = '.';
    const [c, r] = pick(); if ('SG'.includes(g[r][c])) return mutate(level, R, tiles, opts); g[r][c] = t;
  }
  fixPairs(g, R); if (opts && opts.leftx) leftOnly(g);
  const flat = g.flat();
  if (flat.filter((t) => t === 'S').length !== 1 || flat.filter((t) => t === 'G').length !== 1) return mutate(level, R, tiles, opts);
  return { map: g.map((r) => r.join('')) };
}

function search(opts) {
  const R = rng(opts.seed);
  const tiles = opts.tiles.split('').filter((t) => !'SG'.includes(t));
  const archive = new Map();
  const seedLevel = opts.from ? (String(opts.from).includes(',') ? { map: String(opts.from).split(',') } : LEVELS.find((l) => l.id === opts.from)) : null;
  if (opts.from && !seedLevel) throw new Error('no level ' + opts.from);
  let evals = 0;
  const t0 = Date.now();
  for (let rs = 0; rs < opts.restarts; rs++) {
    let cur = seedLevel ? { map: [...seedLevel.map] } : randomBoard(R, opts.rows, tiles, opts);
    let curF = fitness(cur, opts); evals++;
    let T = 6;
    for (let it = 0; it < opts.iters; it++) {
      const cand = mutate(cur, R, tiles, opts);
      const m = measure(cand), f = fitness(cand, opts, m); evals++;
      if (f >= curF || R() < Math.exp((f - curF) / T)) { cur = cand; curF = f; }
      if (f > 0) { const sig = cand.map.join('|'); if (!archive.has(sig)) archive.set(sig, { level: cand, f, m }); }
      T = Math.max(0.5, T * 0.9995);
    }
    process.stderr.write(`restart ${rs + 1}/${opts.restarts}: best so far ${[...archive.values()].reduce((b, x) => Math.max(b, x.f), -1e9).toFixed(1)}, ${archive.size} kept, ${evals} evals, ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  }
  // expensive re-rank: decoys and irrelevant cells cost; keep diverse signatures
  const cands = [...archive.values()].sort((a, b) => b.f - a.f).slice(0, opts.top * (opts.polish ? 3 : 6));
  for (const x of cands) {
    if (opts.polish) { const p = polish(x.level, opts); x.level = p.level; x.m = p.m; x.f = p.f; }
    x.r = roles(x.level, x.m); x.F = x.f - 4 * x.r.noise - 0.8 * x.r.irrelevant + 4 * Math.min(x.r.reuse, 2);
  }
  cands.sort((a, b) => b.F - a.F);
  const out = [], seenSig = new Set();
  for (const x of cands) {
    const sig = x.level.map.join('|');
    if (seenSig.has(sig)) continue;
    seenSig.add(sig); out.push(x);
    if (out.length >= opts.top) break;
  }
  return out;
}

// ---------- polish: strip what carries nothing, keep the line of play ----------
// Greedily turns irrelevant paper into void and noise elements into paper while the fitness does not drop
// (so traps that make dead basins stay; clutter that only makes the board busier goes).
function polish(level, opts) {
  let cur = { map: [...level.map] }, m = measure(cur), f = fitness(cur, opts, m);
  const sol = m.solution;
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    const rows = cur.map.map((r) => r.split(''));
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
      const t = rows[r][c];
      if ('-SGp'.includes(t)) continue;
      const g = cur.map.map((x) => x.split(''));
      g[r][c] = ELEMENTS.includes(t) ? '.' : '-';
      const cand = { map: g.map((x) => x.join('')) }, cm = measure(cand);
      if (!cm.solvable || cm.solution !== sol) {
        if (!ELEMENTS.includes(t) || !cm.solvable) continue;
        g[r][c] = '-'; const cand2 = { map: g.map((x) => x.join('')) }, cm2 = measure(cand2);
        if (!cm2.solvable || cm2.solution !== sol) continue;
        const f2 = fitness(cand2, opts, cm2); if (f2 + 0.01 < f) continue;
        cur = cand2; m = cm2; f = f2; changed = true; continue;
      }
      const cf = fitness(cand, opts, cm);
      if (cf + 0.01 < f) continue;   // the cell was doing work (a trap, a wrong turn)
      cur = cand; m = cm; f = cf; changed = true;
    }
    if (!changed) break;
  }
  return { level: cur, m, f };
}

// ---------- printing ----------
function fmt(level, m, r, F) {
  const lines = [];
  lines.push(`  { id: 'TODO', tier: 'TODO', map: [`);
  for (const row of level.map) lines.push(`      '${row}',`);
  lines.push('  ] },');
  lines.push(`  // par ${m.par} steps ${m.steps} len ${m.len} closes ${m.closes} | wrong ${m.wrong} (first ${m.firstWrong}) narrow ${m.narrow}/${m.par} fatal ${m.fatal} | dead ${m.dead} (${m.deadFrac}) basins ${m.deadEnds} | before ${+m.before} made ${+m.made} ride ${+m.ride} pageSwitch ${m.pageSwitches} | elements ${m.elements} voids ${m.voids} needs ${['Fold','Pop','Shade','Key','Ink'].filter((k) => m['needs' + k]).join('+') || '-'}${m.ride ? '+ride' : ''}` +
    (r ? ` | noise ${r.noise} blockers ${r.blockers} load ${r.loadBearing} irrelevant ${r.irrelevant} reuse ${r.reuse}` : '') + (F != null ? ` | F ${F.toFixed(1)}` : ''));
  lines.push(`  // ${m.solution}`);
  if (r && r.decoys.length) lines.push(`  // decoys: ${r.decoys.join(' ')}`);
  if (r && r.stoneRoles) lines.push(`  // stones: ${Object.entries(r.stoneRoles).map(([k, v]) => k + ':' + v).join('  ')}`);
  return lines.join('\n');
}

function stats() {
  console.log('| # | id | rows | elements | voids | irrelevant | decoys | par | steps | len | closes | wrong | first | narrow | dead% | basins | before | made | v2 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const agg = { len: 0, n: 0 };
  LEVELS.forEach((lv, i) => {
    const f = full(lv, !lv.optional && (full.v2 !== false));
    agg.len += f.len; agg.n++;
    console.log(`| ${i + 1} | ${lv.id}${lv.optional ? ' (暗信)' : ''} | ${f.rows} | ${f.elements} | ${f.voids}/${f.rows * 8} | ${f.irrelevant} | ${f.noise} | ${f.par} | ${f.steps} | **${f.len}** | ${f.closes} | ${f.wrong} | ${f.firstWrong} | ${f.narrow}/${f.par} | ${Math.round(f.deadFrac * 100)} | ${f.deadEnds} | ${+f.before} | ${+f.made} | ${f.v2 ? f.v2.score + ' ' + f.v2.tier : '-'} |`);
  });
  console.log(`\nmean solution length (par + steps) over ${agg.n} levels: ${(agg.len / agg.n).toFixed(1)}`);
}

function args() {
  const a = process.argv.slice(2), o = { cmd: a[0] || 'stats', rows: 5, iters: 4000, restarts: 12, seed: 1, par: 4, closes: 2, minpar: 2, tiles: '.-xg', need: 'glue', from: null, top: 8, elements: 9, nodead: false, noride: false, leftx: false, maxvoid: 0, minlen: 0, maxlen: 0, matched: false };
  for (let i = 1; i < a.length; i++) {
    if (a[i].startsWith('--') && !a[i].includes(',')) { const k = a[i].slice(2); const v = a[i + 1]; o[k] = v === undefined || v.startsWith('--') ? true : isNaN(+v) ? v : +v; if (!(v === undefined || v.startsWith('--'))) i++; }
    else o.arg = a[i];
  }
  return o;
}

if (require.main === module) {
  const o = args();
  if (o.cmd === 'stats') stats();
  else if (o.cmd === 'show') {
    const lv = o.arg.includes(',') ? { map: o.arg.split(',') } : LEVELS.find((l) => l.id === o.arg);
    const f = full(lv, !!o.v2);
    console.log(fmt(lv, f, f, null));
    console.log(JSON.stringify({ ...f, solution: undefined, decoys: undefined, stoneRoles: undefined }, null, 0));
  } else if (o.cmd === 'polish') {
    const lv = o.arg.includes(',') ? { map: o.arg.split(',') } : LEVELS.find((l) => l.id === o.arg);
    const p = polish(lv, o), f = full(p.level, false);
    console.log(fmt(p.level, f, f, p.f));
  } else if (o.cmd === 'search') {
    const res = search(o);
    console.log(`// gen.js search rows=${o.rows} par≤${o.par} closes≤${o.closes} tiles=${o.tiles} need=${o.need} seed=${o.seed}${o.from ? ' from=' + o.from : ''}`);
    for (const x of res) console.log(fmt(x.level, x.m, x.r, x.F) + '\n');
  } else console.log('usage: node tools/gen.js stats | show <id|map> | search [--rows --iters --restarts --seed --par --closes --minpar --tiles --need --from --top --elements]');
}

module.exports = { prep, explore, measure, roles, full, fitness, search, polish, bestPath, distToWin };
