// Fold — pure game logic (no DOM). Shared by the game and tools/check.js.
//
// The sheet is W = 2N columns wide; the hinge sits between column N-1 and N.
// Folding the right half onto the left maps column c -> mirror(c) = W-1-c.
// Angle a: 0 = flat, 90 = standing (L-shape), 180 = closed.
//
// Tiles:  -  empty      .  paper      S start    G goal
//         x  stone      k  key        D door     o opened door
//         i  ink blot   p  pop-up tab (pairs across the hinge)
(function (root) {
  const N = 4;
  const FOLD_MIN = 155;              // folded: stacked tiles connect
  const POP_MIN = 60, POP_MAX = 120; // pop-up tabs stand and bridge the crease

  const mirror = (c) => 2 * N - 1 - c;
  const proj = (c) => (c < N ? c : mirror(c));
  const isRight = (c) => c >= N;

  function modeOf(a) {
    if (a >= FOLD_MIN) return 'fold';
    if (a >= POP_MIN && a <= POP_MAX) return 'pop';
    return 'open';
  }

  const isFloor = (t) => '.SGkiop'.includes(t);
  const isBlock = (t) => t === 'x' || t === 'D';

  function create(level) {
    const grid = level.map.map((row) => row.split(''));
    let start = null;
    grid.forEach((row, r) => row.forEach((t, c) => { if (t === 'S') start = { c, r }; }));
    return { grid, h: grid.length, w: 2 * N, char: start };
  }

  const at = (s, c, r) => (r >= 0 && r < s.h && c >= 0 && c < s.w ? s.grid[r][c] : '-');

  // Walkable stacked position (q in 0..N-1) when folded.
  function foldOpen(s, q, r) {
    const L = at(s, q, r), R = at(s, mirror(q), r);
    if (isBlock(L) || isBlock(R)) return false;
    return isFloor(L) || isFloor(R);
  }

  // Which actual cell the character lands on when entering stacked q,
  // given the page it is on now: stay on this page if possible.
  function land(s, fromC, q, r) {
    const here = isRight(fromC) ? mirror(q) : q;
    if (isFloor(at(s, here, r))) return { c: here, r };
    const other = isRight(fromC) ? q : mirror(q);
    return { c: other, r };
  }

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // Neighbours of an actual cell when the book is open (one page each, no crease crossing,
  // except pop-up tabs that bridge the crease while standing).
  function openNeighbours(s, c, r, mode) {
    const out = [];
    for (const [dc, dr] of DIRS) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= s.w || nr < 0 || nr >= s.h) continue;
      const crosses = (c === N - 1 && nc === N) || (c === N && nc === N - 1);
      if (crosses) {
        if (mode === 'pop' && at(s, c, r) === 'p' && at(s, nc, nr) === 'p') out.push({ c: nc, r: nr });
        continue;
      }
      if (isFloor(at(s, nc, nr))) out.push({ c: nc, r: nr });
    }
    return out;
  }

  // One step of movement from the current character cell, in the given mode.
  function neighbours(s, from, mode) {
    if (mode !== 'fold') return openNeighbours(s, from.c, from.r, mode);
    const q = proj(from.c), out = [];
    for (const [dq, dr] of DIRS) {
      const nq = q + dq, nr = from.r + dr;
      if (nq < 0 || nq >= N || nr < 0 || nr >= s.h) continue;
      if (foldOpen(s, nq, nr)) out.push(land(s, from.c, nq, nr));
    }
    return out;
  }

  // BFS from the character to a target cell. When folded, the target is matched by stack (q, r).
  function findPath(s, target, mode) {
    const key = (p) => (mode === 'fold' ? proj(p.c) : p.c) + ',' + p.r;
    const goal = key(target);
    const startK = key(s.char);
    if (startK === goal) return [];
    const prev = new Map([[startK, null]]);
    const cell = new Map([[startK, s.char]]);
    const queue = [s.char];
    while (queue.length) {
      const cur = queue.shift();
      for (const n of neighbours(s, cur, mode)) {
        const k = key(n);
        if (prev.has(k)) continue;
        prev.set(k, key(cur)); cell.set(k, n);
        if (k === goal) {
          const path = [];
          for (let p = k; p !== startK; p = prev.get(p)) path.unshift(cell.get(p));
          return path;
        }
        queue.push(n);
      }
    }
    return null;
  }

  // Pressing the pages together: keys open the door they touch, ink prints onto bare paper.
  function stamp(s) {
    const events = [];
    for (let r = 0; r < s.h; r++) {
      for (let q = 0; q < N; q++) {
        const m = mirror(q);
        const pair = [[q, m], [m, q]];
        for (const [a, b] of pair) {
          const A = s.grid[r][a], B = s.grid[r][b];
          if (A === 'k' && B === 'D') {
            s.grid[r][a] = '.'; s.grid[r][b] = 'o';
            events.push({ type: 'door', cells: [{ c: a, r }, { c: b, r }] });
          } else if (A === 'i' && B === '-') {
            s.grid[r][b] = 'i';
            events.push({ type: 'ink', cells: [{ c: a, r }, { c: b, r }] });
          }
        }
      }
    }
    return events;
  }

  function isWin(s, mode) {
    const { c, r } = s.char;
    if (at(s, c, r) === 'G') return true;
    return mode === 'fold' && at(s, mirror(c), r) === 'G';
  }

  const api = { N, FOLD_MIN, POP_MIN, POP_MAX, mirror, proj, isRight, modeOf, isFloor, isBlock,
    create, at, neighbours, findPath, stamp, isWin };
  if (typeof module !== 'undefined') module.exports = api; else root.FoldLogic = api;
})(this);
