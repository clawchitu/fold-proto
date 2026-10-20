// Fold — pure game logic (no DOM). Shared by the game and tools/check.js.
//
// The sheet is W = 2N columns wide; the hinge sits between column N-1 and N.
// Folding the right half onto the left maps column c -> mirror(c) = W-1-c.
// Angle a: 0 = flat, 90 = standing (L-shape), 180 = closed.
//
// Tiles:  -  empty      .  paper      S start    G goal
//         x  stone      k  key        D door     o opened door
//         i  ink blot   p  pop-up tab (pairs across the hinge)
//         g  glue (vol. 2): walkable; when the book closes it pulls the stone facing it onto itself (one use)
(function (root) {
  const N = 4;
  const FOLD_MIN = 155;              // folded: stacked tiles connect
  const POP_MIN = 60, POP_MAX = 120; // pop-up tabs stand and bridge the crease
  const SHADE_MIN = 91;              // leaning page casts shadows onto the flat page until it folds

  const mirror = (c) => 2 * N - 1 - c;
  const proj = (c) => (c < N ? c : mirror(c));
  const isRight = (c) => c >= N;

  function modeOf(a) {
    if (a >= FOLD_MIN) return 'fold';
    if (a >= POP_MIN && a <= POP_MAX) return 'pop';
    return 'open';
  }

  const isFloor = (t) => '.SGkiopg'.includes(t);
  const isBlock = (t) => t === 'x' || t === 'D';
  const isOpaque = (t) => t === 'x';   // stones block the light; paper and ink let it through

  // Shadows: a stone d cells from the hinge on the leaning right page shades the left cell
  // round(d * -cos a) from the hinge. Flat (<=90) nothing; folded, the stone itself lands there.
  const shadowOffset = (d, a) => Math.round(d * -Math.cos((a * Math.PI) / 180));
  const shadowColumn = (c, a) => { const e = shadowOffset(c - N + 1, a); return e < 1 ? -1 : N - e; };
  function shadows(s, a) {
    const out = new Map();                       // 'q,r' on the left page -> source column
    if (a < SHADE_MIN || a >= FOLD_MIN) return out;
    for (let r = 0; r < s.h; r++) for (let c = N; c < 2 * N; c++) {
      if (!isOpaque(at(s, c, r))) continue;
      const q = shadowColumn(c, a);
      if (q >= 0 && !out.has(q + ',' + r)) out.set(q + ',' + r, c);
    }
    return out;
  }

  function create(level) {
    const grid = level.map.map((row) => row.split(''));
    let start = null;
    grid.forEach((row, r) => row.forEach((t, c) => { if (t === 'S') start = { c, r }; }));
    return { grid, h: grid.length, w: 2 * N, char: { ...start }, start };
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
  function openNeighbours(s, c, r, mode, sh) {
    const out = [];
    for (const [dc, dr] of DIRS) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= s.w || nr < 0 || nr >= s.h) continue;
      const crosses = (c === N - 1 && nc === N) || (c === N && nc === N - 1);
      if (crosses) {
        if (mode === 'pop' && at(s, c, r) === 'p' && at(s, nc, nr) === 'p') out.push({ c: nc, r: nr });
        continue;
      }
      const t = at(s, nc, nr);
      if (isFloor(t) || (sh && sh.has(nc + ',' + nr) && !isBlock(t))) out.push({ c: nc, r: nr });
    }
    return out;
  }

  // Closing drops the right page's stones onto their mirror cells: a character on the left page under one
  // is crushed (design-review-ch3 §2). A ridden shadow ends in that same cell, so the two readings agree.
  // Stones on the left page never move, so standing on the right page above one only blocks, never crushes —
  // unless you stand on glue: then the stone below is pulled up onto your square (design-v2c1.md §1).
  const crushed = (s, from, a) => a >= FOLD_MIN && isOpaque(at(s, mirror(from.c), from.r)) &&
    (!isRight(from.c) || at(s, from.c, from.r) === 'g');

  // Standing on nothing but a shadow? Then the shadow carries the character when the angle changes.
  // Returns the cell the character ends up on, or null when it falls (or is crushed).
  function ride(s, from, src, a) {
    if (crushed(s, from, a)) return null;
    if (isFloor(at(s, from.c, from.r))) return from;
    if (src == null) return null;
    const q = shadowColumn(src, a);
    if (q < 0 || a >= FOLD_MIN || isBlock(at(s, q, from.r))) return null;
    return { c: q, r: from.r };
  }

  // One step of movement from the current character cell, in the given mode (sh = shadows(s, angle)).
  function neighbours(s, from, mode, sh) {
    if (mode !== 'fold') return openNeighbours(s, from.c, from.r, mode, sh);
    const q = proj(from.c), out = [];
    for (const [dq, dr] of DIRS) {
      const nq = q + dq, nr = from.r + dr;
      if (nq < 0 || nq >= N || nr < 0 || nr >= s.h) continue;
      if (foldOpen(s, nq, nr)) out.push(land(s, from.c, nq, nr));
    }
    return out;
  }

  // BFS from the character to a target cell. When folded, the target is matched by stack (q, r).
  function findPath(s, target, mode, sh) {
    const key = (p) => (mode === 'fold' ? proj(p.c) : p.c) + ',' + p.r;
    const goal = key(target);
    const startK = key(s.char);
    if (startK === goal) return [];
    const prev = new Map([[startK, null]]);
    const cell = new Map([[startK, s.char]]);
    const queue = [s.char];
    while (queue.length) {
      const cur = queue.shift();
      for (const n of neighbours(s, cur, mode, sh)) {
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

  // Pressing the pages together: keys open the door they touch, ink prints onto bare paper,
  // glue pulls the stone it touches onto itself (the stone changes page; the glue is used up).
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
          } else if (A === 'g' && B === 'x') {
            s.grid[r][a] = 'x'; s.grid[r][b] = '.';
            events.push({ type: 'glue', cells: [{ c: b, r }, { c: a, r }] });
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

  const api = { N, FOLD_MIN, POP_MIN, POP_MAX, SHADE_MIN, mirror, proj, isRight, modeOf, isFloor, isBlock,
    isOpaque, shadowColumn, shadows, crushed, ride, create, at, neighbours, findPath, stamp, isWin };
  if (typeof module !== 'undefined') module.exports = api; else root.FoldLogic = api;
})(this);
