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
//
// Pages (vol. 2 ch. 6 「翻页」, docs/design-ch6.md): a map row is 8 columns (left page | right page) or 12 columns
// (left page | right page | third page). The third page is the back of the right leaf. Turning the closed book over and
// opening it again shows the left page with the third page facing it instead (s.face = 1); turn it over again and the
// right page is back. Whichever page faces the left page is read through columns N..2N-1 (at / put), so every rule
// below — stacks, stamps, shadows, crushing — applies to the facing page without knowing which face it is.
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
    // pages: 2 (left | right) or 3 (left | right | third, the back of the right leaf). The start is on the first spread.
    return { grid, h: grid.length, w: 2 * N, pages: grid[0].length / N, face: 0, char: { ...start }, start, init: level.map };
  }

  // Back to how the level began: the grids as drawn, the right page facing the left page again, the figure on the start.
  // A crush by the turn (flip) does this — the face it turned to stays put otherwise, and on a board whose start lies
  // under a third-page stone (6-3) the next opening would crush her again, and again.
  function restart(s) {
    s.grid = s.init.map((row) => row.split('')); s.face = 0; s.char = { ...s.start };
  }

  // The grid column behind a visible column: the facing page's columns N..2N-1 read from the third page when turned.
  const colOf = (s, c) => (s.face && c >= N ? c + N : c);
  const at = (s, c, r) => (r >= 0 && r < s.h && c >= 0 && c < s.w ? s.grid[r][colOf(s, c)] : '-');
  const put = (s, c, r, t) => { s.grid[r][colOf(s, c)] = t; };

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

  // Why the book crushed you (for the on-screen / spoken reason): 'glue' when you stood on glue and it pulled the
  // stone below up onto your square, 'stone' when a right-page stone came down on you, null when you are safe.
  const crushCause = (s, from, a) => (!crushed(s, from, a) ? null : isRight(from.c) ? 'glue' : 'stone');

  // Why a cell cannot be entered, in the given mode (c is the actual column; folded, its stack is used):
  // 'edge' | 'stone' | 'card' (a paper card lying on a stone: folded, the stack is blocked) | 'door' | 'gap' | null.
  function cellBlock(s, c, r, mode, sh) {
    if (r < 0 || r >= s.h || c < 0 || c >= s.w) return 'edge';
    if (mode === 'fold') {
      const q = proj(c), L = at(s, q, r), R = at(s, mirror(q), r);
      if (foldOpen(s, q, r)) return null;
      if (R === 'x' || (L === 'x' && !isFloor(R))) return 'stone';
      if (L === 'x') return 'card';
      if (L === 'D' || R === 'D') return 'door';
      return 'gap';
    }
    const t = at(s, c, r);
    if (t === 'x') return 'stone';
    if (t === 'D') return 'door';
    if (isFloor(t) || (sh && sh.has(c + ',' + r))) return null;
    return 'gap';
  }

  // Why one step (dc, dr) from the character is refused, or null if it is allowed. Folded, dc moves along the stack.
  // Returns { why, c, r } with c the actual column (folded: the left-page column of the stack).
  function stepBlock(s, from, dc, dr, mode, sh) {
    const col = (p) => (mode === 'fold' ? proj(p.c) : p.c);
    if (neighbours(s, from, mode, sh).some((n) => col(n) === col(from) + dc && n.r === from.r + dr)) return null;
    const c = col(from) + dc, r = from.r + dr;
    if (r < 0 || r >= s.h || c < 0 || c >= (mode === 'fold' ? N : s.w)) return { why: 'edge', c, r };
    if (mode !== 'fold' && ((from.c === N - 1 && dc === 1) || (from.c === N && dc === -1))) return { why: 'crease', c, r };
    return { why: cellBlock(s, c, r, mode, sh) || 'gap', c, r };
  }

  // Why the character cannot walk to target: the target itself, or else the blocker on the edge of where you can
  // reach that lies closest to the target (stones, cards and doors before gaps on a tie). null if a path exists.
  function pathBlock(s, target, mode, sh) {
    if (findPath(s, target, mode, sh)) return null;
    const fold = mode === 'fold', col = (c) => (fold ? proj(c) : c);
    const own = cellBlock(s, target.c, target.r, mode, sh);
    if (own) return { why: own, c: col(target.c), r: target.r };
    const key = (p) => col(p.c) + ',' + p.r;
    const seen = new Set([key(s.char)]), queue = [s.char], cands = [];
    while (queue.length) {
      const cur = queue.shift();
      for (const n of neighbours(s, cur, mode, sh)) if (!seen.has(key(n))) { seen.add(key(n)); queue.push(n); }
      for (const [dc, dr] of DIRS) {
        const b = stepBlock(s, cur, dc, dr, mode, sh);
        if (b && b.why !== 'edge') cands.push(b);
      }
    }
    const rank = { door: 0, card: 1, stone: 2, crease: 3, gap: 4 };
    const dist = (b) => Math.abs(b.c - col(target.c)) + Math.abs(b.r - target.r);
    cands.sort((a, b) => dist(a) - dist(b) || rank[a.why] - rank[b.why]);
    return cands[0] || { why: 'gap', c: col(target.c), r: target.r };
  }

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
          const A = at(s, a, r), B = at(s, b, r);
          if (A === 'k' && B === 'D') {
            put(s, a, r, '.'); put(s, b, r, 'o');
            events.push({ type: 'door', cells: [{ c: a, r }, { c: b, r }] });
          } else if (A === 'i' && B === '-') {
            put(s, b, r, 'i');
            events.push({ type: 'ink', cells: [{ c: a, r }, { c: b, r }] });
          } else if (A === 'g' && B === 'x') {
            put(s, a, r, 'x'); put(s, b, r, '.');
            events.push({ type: 'glue', cells: [{ c: b, r }, { c: a, r }] });
          }
        }
      }
    }
    return events;
  }

  // Turning the page (vol. 2 ch. 6): only a closed book can be turned over, and only by someone standing on the page
  // that stays — the left page. The leaf under your feet cannot be turned. Why not, or null when allowed:
  // 'single' (this book has no third page) | 'open' (the book is not closed) | 'leaf' (you stand on the right leaf).
  function flipBlock(s, a) {
    if (s.pages < 3) return 'single';
    if (a < FOLD_MIN) return 'open';
    if (isRight(s.char.c)) return 'leaf';
    return null;
  }

  // Turn the closed book over: the other face of the right leaf now presses on the left page. Pressing stamps as a
  // close does (keys, ink, glue — between the left page and the page now facing it). Returns { events, crush }:
  // crush is what the new facing page did to you the moment it came down ('stone' | 'glue' | null), judged before the
  // stamp, exactly as a close is. A crush stamps nothing: the caller sends everything back with restart (the grids, the
  // face as at the start of the level, the figure on the start), once the stone has been seen coming down.
  function flip(s) {
    s.face ^= 1;
    const crush = crushCause(s, s.char, FOLD_MIN);
    const events = crush ? [] : stamp(s);
    return { events, crush };
  }

  function isWin(s, mode) {
    const { c, r } = s.char;
    if (at(s, c, r) === 'G') return true;
    return mode === 'fold' && at(s, mirror(c), r) === 'G';
  }

  const api = { N, FOLD_MIN, POP_MIN, POP_MAX, SHADE_MIN, mirror, proj, isRight, modeOf, isFloor, isBlock,
    isOpaque, shadowColumn, shadows, crushed, crushCause, cellBlock, stepBlock, pathBlock, ride, create, restart, at, colOf, neighbours, findPath, stamp,
    flipBlock, flip, isWin };
  if (typeof module !== 'undefined') module.exports = api; else root.FoldLogic = api;
})(this);
