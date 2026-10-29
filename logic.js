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
//         I  wet ink (vol. 2 ch. 7): ink that bleeds one ring at every press
//         A  angle gate (vol. 2 ch. 8 「灯位」, docs/design-ch8.md): a paper flap that is floor only while the page leans
//            (91°–154°, the lamp window); flat or closed it is a gap. Stand on it when the lean ends and you fall.
//         r  loose stone (vol. 3 ch. 9 「滚」, docs/design-ch9.md): a stone that is not glued down. Blocks, shades and crushes
//            like a stone, but every time the lifted page passes upright (the hinge crosses 90°) it rolls one cell towards
//            the crease — see roll(). Glue that pulls it holds it: it arrives as a stone (x).
//         h  paper crane (vol. 3 ch. 10 「鹤」, docs/design-ch10.md): a square of paper folded into a crane, floor you can stand
//            on. At every press it flies to its mirror cell and carries whoever stands on it — see fly().
//
// Lamp (vol. 2 ch. 8): level.lamp = 'R' (default, vol. 1 ch. 3 on: the lamp on the right bank, the lifted page's stones
// shade the flat left page), 'L' (the lamp on the left bank: the flat left page's stones throw their shadows UP onto the
// lifted page, by the mirror of the same formula) or 'LR' (two lamps: both sets of shadows at once).
//
// Pages (vol. 2 ch. 6 「翻页」, docs/design-ch6.md): a map row is 8 columns (left page | right page) or 12 columns
// (left page | right page | third page). The third page is the back of the right leaf. Turning the closed book over and
// opening it again shows the left page with the third page facing it instead (s.face = 1); turn it over again and the
// right page is back. Whichever page faces the left page is read through columns N..2N-1 (at / put), so every rule
// below — stacks, stamps, shadows, crushing — applies to the facing page without knowing which face it is.
//
// Trifold (vol. 3 ch. 12 「三折」, docs/design-ch12.md §1): level.trifold = true binds the third page to the right page's
// OUTER edge instead (a second crease between columns 7 and 8; s.w = 12 marks it). Two creases, one moving at a time — the
// book only while the flap is flat or folded onto the right page, the flap only while the book lies flat. s.face says
// which two sheets are the flat page and the lifted page, and at / put read them through the same visible columns:
//   face 0  the book, flap flat: left | right + third as ONE rigid leaf (visible 0–11; the third page's loose stones roll
//           to crease 1 too, across the flat second crease; closed, the third page sticks out past the left page's edge)
//   face 2  the flap, book flat: right | third — an ordinary book whose flat page is the right page (visible c = column c + 4;
//           the left page lies at visible −4..−1, out of reach); third-page column c meets right-page column 15 − c
//   face 3  the book, flap folded onto the right page: left | a two-layer leaf. Each square of it reads the third page's
//           square over it (column 15 − c) unless that is a gap — then the right page shows through; a stone in either
//           layer is a stone. Left column q meets third-page column q + 8: two mirrors bring a column home.
(function (root) {
  const N = 4;
  const FOLD_MIN = 155;              // folded: stacked tiles connect
  const POP_MIN = 60, POP_MAX = 120; // pop-up tabs stand and bridge the crease
  const SHADE_MIN = 91;              // leaning page casts shadows onto the flat page until it folds
  const STAND = 90;                  // the lifted page is upright or past it: loose stones roll when the hinge crosses this

  const mirror = (c) => 2 * N - 1 - c;
  const trifold = (s) => s.w === 3 * N;                          // vol. 3 ch. 12: the third page hangs off the right page's outer edge
  const vw = (s) => (trifold(s) && !s.face ? 3 * N : 2 * N);   // visible columns: face 0 of a trifold shows all three pages
  const proj = (c) => (c < N ? c : mirror(c));
  const isRight = (c) => c >= N;

  function modeOf(a) {
    if (a >= FOLD_MIN) return 'fold';
    if (a >= POP_MIN && a <= POP_MAX) return 'pop';
    return 'open';
  }

  const isFloor = (t) => '.SGkiopgIh'.includes(t);
  const isBlock = (t) => t === 'x' || t === 'r' || t === 'D';
  const isOpaque = (t) => t === 'x' || t === 'r';   // stones (fixed or loose) block the light; paper and ink let it through
  const standing = (a) => a >= STAND;               // vol. 3: which side of upright the lifted page is on

  // Shadows: a stone d cells from the hinge on the leaning right page shades the left cell
  // round(d * -cos a) from the hinge. Flat (<=90) nothing; folded, the stone itself lands there.
  const shadowOffset = (d, a) => Math.round(d * -Math.cos((a * Math.PI) / 180));
  const shadowColumn = (c, a) => { const e = shadowOffset(c - N + 1, a); return e < 1 ? -1 : N - e; };
  // Lamp on the left bank: a left-page stone d cells from the hinge shades the lifted page's cell round(d * -cos a) from
  // the hinge (the mirror of shadowColumn); closed, that is the stone's mirror cell — the stack the stone blocks.
  const shadowColumnL = (c, a) => { const e = shadowOffset(N - c, a); return e < 1 ? -1 : N - 1 + e; };
  const lampOf = (s) => s.lamp || 'R';
  const lit = (a) => a >= SHADE_MIN && a < FOLD_MIN;   // the lean window: shadows are cast, angle gates stand open
  // Everything that is floor only while the page leans: 'q,r' -> source. Shadows map to the column of the stone that
  // casts them (right-page stones onto the left page under the right-bank lamp, left-page stones onto the facing page
  // under the left-bank lamp); open angle gates map to 'A'.
  function shadows(s, a) {
    const out = new Map();
    if (!lit(a)) return out;
    const lamp = lampOf(s);
    for (let r = 0; r < s.h; r++) {
      if (lamp.includes('R')) for (let c = N; c < vw(s); c++) {
        if (!isOpaque(at(s, c, r))) continue;
        const q = shadowColumn(c, a);
        if (q >= 0 && !out.has(q + ',' + r)) out.set(q + ',' + r, c);
      }
      if (lamp.includes('L')) for (let c = N - 1; c >= 0; c--) {
        if (!isOpaque(at(s, c, r))) continue;
        const q = shadowColumnL(c, a);
        if (q >= 0 && !out.has(q + ',' + r)) out.set(q + ',' + r, c);
      }
      for (let c = 0; c < 2 * N; c++) if (at(s, c, r) === 'A' && !out.has(c + ',' + r)) out.set(c + ',' + r, 'A');
    }
    return out;
  }

  function create(level) {
    const grid = level.map.map((row) => row.split(''));
    let start = null;
    grid.forEach((row, r) => row.forEach((t, c) => { if (t === 'S') start = { c, r }; }));
    // pages: 2 (left | right) or 3 (left | right | third, the back of the right leaf). The start is on the first spread.
    return { grid, h: grid.length, w: level.trifold ? 3 * N : 2 * N, pages: grid[0].length / N, face: 0, char: { ...start }, start, init: level.map, lamp: level.lamp || 'R' };
  }

  // Back to how the level began: the grids as drawn, the right page facing the left page again, the figure on the start.
  // A crush by the turn (flip) does this — the face it turned to stays put otherwise, and on a board whose start lies
  // under a third-page stone (6-3) the next opening would crush her again, and again.
  function restart(s) {
    s.grid = s.init.map((row) => row.split('')); s.face = 0; s.char = { ...s.start };
  }

  // The grid column behind a visible column: the facing page's columns N..2N-1 read from the third page when turned;
  // trifold face 2 is shifted one page (right | third); trifold face 3 reads the top layer of the folded leaf (row r).
  function colOf(s, c, r) {
    if (s.face === 2) return c + N;
    if (c < N || !s.face) return c;
    if (s.face === 1) return c + N;
    const T = 4 * N - 1 - c, top = s.grid[r][T];   // face 3: the third page folded over the right page
    return isBlock(top) || (!isBlock(s.grid[r][c]) && top !== '-') ? T : c;
  }
  const at = (s, c, r) => (r >= 0 && r < s.h && c >= 0 && c < vw(s) ? s.grid[r][colOf(s, c, r)] : '-');
  const put = (s, c, r, t) => { s.grid[r][colOf(s, c, r)] = t; };

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
      if (nc < 0 || nc >= vw(s) || nr < 0 || nr >= s.h) continue;
      if ((c === 2 * N - 1 && nc === 2 * N) || (c === 2 * N && nc === 2 * N - 1)) continue;   // trifold face 0: the second crease
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
  const crushCause = (s, from, a) => (offBook(s, from, a) ? 'off' : !crushed(s, from, a) ? null : isRight(from.c) ? 'glue' : 'stone');
  // Trifold face 0 (vol. 3 ch. 12): the book closes with the flap open — the third page swings past the left page's outer
  // edge and lies face down on the table. Whoever stands on it goes with it: off the book.
  const offBook = (s, from, a) => a >= FOLD_MIN && trifold(s) && !s.face && from.c >= 2 * N;

  // Why a cell cannot be entered, in the given mode (c is the actual column; folded, its stack is used):
  // 'edge' | 'stone' | 'card' (a paper card lying on a stone: folded, the stack is blocked) | 'door' | 'gap' | null.
  function cellBlock(s, c, r, mode, sh) {
    if (r < 0 || r >= s.h || c < 0 || c >= vw(s) || (mode === 'fold' && c >= 2 * N)) return 'edge';
    if (mode === 'fold') {
      const q = proj(c), L = at(s, q, r), R = at(s, mirror(q), r);
      if (foldOpen(s, q, r)) return null;
      if (isOpaque(R) || (isOpaque(L) && !isFloor(R))) return 'stone';
      if (isOpaque(L)) return 'card';
      if (L === 'D' || R === 'D' || L === 'A' || R === 'A') return 'door';
      return 'gap';
    }
    const t = at(s, c, r);
    if (isOpaque(t)) return 'stone';
    if (t === 'D' || (t === 'A' && !(sh && sh.has(c + ',' + r)))) return 'door';
    if (isFloor(t) || (sh && sh.has(c + ',' + r))) return null;
    return 'gap';
  }

  // Why one step (dc, dr) from the character is refused, or null if it is allowed. Folded, dc moves along the stack.
  // Returns { why, c, r } with c the actual column (folded: the left-page column of the stack).
  function stepBlock(s, from, dc, dr, mode, sh) {
    const col = (p) => (mode === 'fold' ? proj(p.c) : p.c);
    if (neighbours(s, from, mode, sh).some((n) => col(n) === col(from) + dc && n.r === from.r + dr)) return null;
    const c = col(from) + dc, r = from.r + dr;
    if (r < 0 || r >= s.h || c < 0 || c >= (mode === 'fold' ? N : vw(s))) return { why: 'edge', c, r };
    if (mode !== 'fold' && ((from.c === N - 1 && dc === 1) || (from.c === N && dc === -1) || (from.c === 2 * N - 1 && dc === 1) || (from.c === 2 * N && dc === -1))) return { why: 'crease', c, r };
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
  // On an angle gate the character stays while the lean lasts and falls when it ends (the flap lies down).
  function ride(s, from, src, a) {
    if (from.c < 0) return from;   // trifold face 2: on the left page, beside the flap's book — nothing there moves
    if (crushed(s, from, a) || offBook(s, from, a)) return null;
    const t = at(s, from.c, from.r);
    if (isFloor(t)) return from;
    if (t === 'A') return lit(a) ? from : null;
    if (src == null || src === 'A') return null;
    const q = isRight(src) ? shadowColumn(src, a) : shadowColumnL(src, a);
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

  // Wet ink (vol. 2 ch. 7 「墨晕」, docs/design-ch7.md): 'I' is ink that has not dried. It is floor like dry ink, but every
  // press (a close, a turn of the closed book) it first BLEEDS one ring — each wet square on the two pressed pages spreads
  // into the gap and glue squares beside it on its own page (paper, stones, doors, the hinge and the page edge stop it;
  // glue it covers is spoiled and will not pull) — and only then prints, like dry ink, onto the gap facing it. What it
  // prints is wet too, so both pages keep growing a ring per press: the number of closes is a resource, and a gap you
  // meant to cross on a shadow may be paper by the time you get there (a shadow over paper carries no one).
  function bleed(s) {
    const wet = [];
    for (let r = 0; r < s.h; r++) for (let c = 0; c < 2 * N; c++) if (at(s, c, r) === 'I') wet.push([c, r]);
    const cells = [], seen = new Set();
    for (const [c, r] of wet) for (const [dc, dr] of DIRS) {
      const nc = c + dc, nr = r + dr, k = nc + ',' + nr;
      if (nc < 0 || nc >= 2 * N || nr < 0 || nr >= s.h || isRight(nc) !== isRight(c) || seen.has(k)) continue;
      const t = at(s, nc, nr);
      if (t === '-' || t === 'g') { seen.add(k); put(s, nc, nr, 'I'); cells.push({ c: nc, r: nr, was: t }); }
    }
    return cells;
  }

  // Pressing the pages together: wet ink bleeds a ring, then keys open the door they touch, ink (dry or wet) prints
  // onto the gap it touches, glue pulls the stone it touches onto itself (the stone changes page; the glue is used up).
  function stamp(s) {
    const events = [];
    const bled = bleed(s);
    if (bled.length) events.push({ type: 'bleed', cells: bled });
    for (let r = 0; r < s.h; r++) {
      for (let q = 0; q < N; q++) {
        const m = mirror(q);
        const pair = [[q, m], [m, q]];
        for (const [a, b] of pair) {
          const A = at(s, a, r), B = at(s, b, r);
          if (A === 'k' && B === 'D') {
            put(s, a, r, '.'); put(s, b, r, 'o');
            events.push({ type: 'door', cells: [{ c: a, r }, { c: b, r }] });
          } else if ((A === 'i' || A === 'I') && B === '-') {
            put(s, b, r, A);
            events.push({ type: 'ink', wet: A === 'I', cells: [{ c: a, r }, { c: b, r }] });
          } else if (A === 'g' && isOpaque(B)) {   // a loose stone the glue takes is held: it arrives as a stone
            put(s, a, r, 'x'); put(s, b, r, '.');
            events.push({ type: 'glue', cells: [{ c: b, r }, { c: a, r }] });
          }
        }
      }
    }
    events.push(...fly(s));   // vol. 3 ch. 10: last of all, the cranes fly (after the roll of the sweep, the bleed, the keys, the ink, the glue)
    return events;
  }

  // Paper crane (vol. 3 ch. 10 「鹤」, docs/design-ch10.md): 'h' is paper folded into a crane — floor, like any paper. At EVERY
  // press (a close, a turn of the closed book) — after the roll of the same sweep, the bleed, the keys, the ink and the glue —
  // each crane flies to its mirror cell (c → 7 − c), and the figure standing on it flies with it: the book's second way to
  // change page (the first is the stack walk). Landing on paper or on a gap it lands (its old square is paper; a gap it sits
  // in is floor for as long as it stays). Landing on WET INK it is soaked: it stays where it is, as wet ink, and never flies
  // again (it bleeds with the rest). Landing on GLUE it is stuck: it carries you over one last time and is plain paper there
  // (the glue is used up). Landing on anything else — a stone, a loose stone (one that rolled in during the same sweep
  // counts), a door, a gate, a key, dry ink, her square, the start, another crane — it cannot fly and stays where it is.
  // All cranes are judged on the board as it is after the glue. Returns the events: a 'crane' event with `to` carried
  // whoever stood on cells[0] (see carried()).
  function fly(s) {
    const events = [], cranes = [];
    for (let r = 0; r < s.h; r++) for (let c = 0; c < 2 * N; c++) if (at(s, c, r) === 'h') cranes.push({ c, r });   // only the two pressed pages
    for (const { c, r } of cranes) {
      const m = mirror(c), t = at(s, m, r);
      if (t === '-' || t === '.') { put(s, m, r, 'h'); put(s, c, r, '.'); events.push({ type: 'crane', cells: [{ c, r }, { c: m, r }], to: { c: m, r } }); }
      else if (t === 'I') { put(s, c, r, 'I'); events.push({ type: 'crane', cells: [{ c, r }], inked: true }); }
      else if (t === 'g') { put(s, m, r, '.'); put(s, c, r, '.'); events.push({ type: 'crane', cells: [{ c, r }, { c: m, r }], to: { c: m, r }, glued: true }); }
    }
    return events;
  }
  // Where the figure stands after a press: carried by the crane it stood on (to the crane's landing, on the other page),
  // or where it was. Closed, the landing is the same stack — you notice only when the book opens.
  function carried(events, fig) {
    const e = events.find((e) => e.type === 'crane' && e.to && e.cells[0].c === fig.c && e.cells[0].r === fig.r);
    return e ? { c: e.to.c, r: e.to.r } : fig;
  }

  // Loose stones (vol. 3 ch. 9 「滚」, docs/design-ch9.md): 'r' is a stone that is not glued down. Every time the lifted page
  // passes upright — the hinge crosses 90° in either direction: a lean that comes back flat counts twice, a close once and
  // the opening after it once more — every loose stone on the page that is lifted (the page facing the left page, read
  // through columns N..2N-1, so after a turn it is the third page's stones that roll) rolls ONE cell towards the crease:
  // onto paper it rolls (its old square is paper now); into a gap it drops and fills it (the gap is paper from then on and
  // the stone is gone); against anything else — a stone, a door, a gate, ink, glue, a key, her square, the start, or the
  // figure standing in front of it — it stays. The stone nearest the crease rolls first, so a line of them rolls together;
  // one that stands beside the crease has nowhere lower to go. Stones on the flat left page never roll. Returns the events,
  // nearest the crease first; `fig` is the figure's cell (default s.char), the one thing on the page that can hold a stone.
  function roll(s, fig = s.char) {
    const events = [];
    for (let r = 0; r < s.h; r++) for (let c = N + 1; c < vw(s); c++) {   // trifold face 0: the third page rolls with the right page
      if (at(s, c, r) !== 'r') continue;
      if (fig && fig.c === c - 1 && fig.r === r) continue;
      const ahead = at(s, c - 1, r);
      if (ahead !== '.' && ahead !== '-') continue;
      put(s, c - 1, r, ahead === '-' ? '.' : 'r'); put(s, c, r, '.');
      events.push({ type: 'roll', cells: [{ c, r }, { c: c - 1, r }], filled: ahead === '-' });
    }
    return events;
  }
  // The hinge moved from a0 to a1: did the lifted page pass upright (so loose stones roll)?
  const passes = (a0, a1) => standing(a0) !== standing(a1);

  // Turning the page (vol. 2 ch. 6): only a closed book can be turned over, and only by someone standing on the page
  // that stays — the left page. The leaf under your feet cannot be turned. Why not, or null when allowed:
  // 'single' (this book has no third page) | 'open' (the book is not closed) | 'leaf' (you stand on the right leaf).
  function flipBlock(s, a) {
    if (s.pages < 3 || trifold(s)) return 'single';
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
    if (!crush) s.char = carried(events, s.char);   // vol. 3 ch. 10: a crane under your feet flies to the page you turned to, with you
    return { events, crush };
  }

  // Trifold (vol. 3 ch. 12): taking hold of the other crease re-reads the same figure in the other view.
  // flapIn: the book lies flat (face 0, or face 3 with the flap folded) → the flap's view (face 2). On the folded leaf you
  // stand on its top layer — the third page where it has paper, the right page through its holes.
  function flapIn(s, fig) {
    if (s.face === 3 && fig.c >= N) return { c: colOf(s, fig.c, fig.r) - N, r: fig.r };
    return { c: fig.c - N, r: fig.r };
  }
  // flapOut: the flap reached flat (b = 0 → face 0) or folded (b = 180 → face 3). null when the folded leaf has a stone under
  // your feet (you stood on the third page over a right-page stone) — the fold is refused before it gets there (flapBlock).
  function flapOut(s, fig, folded) {
    const c = fig.c + N;
    if (!folded) return { c, r: fig.r };
    const v = c < 2 * N ? c : 4 * N - 1 - c;
    return isFloor(at({ ...s, face: 3 }, v, fig.r)) ? { c: v, r: fig.r } : null;
  }

  // The flap cannot fold down onto a stone you stand over (vol. 3 ch. 12, lead's call 10/29: a blocked fold with a toast, not
  // a death — deaths must be readable). In the flap's view (face 2) you stand on the lifted third page and the right page's
  // square under you is a stone (or a loose stone, a door): 'stone'. Glue under your feet is not a block — the glue pulls
  // the stone up (crushCause 'glue'), as on any page. null when the flap may fold.
  function flapBlock(s, fig = s.char) {
    if (!trifold(s) || s.face !== 2 || fig.c < N || at(s, fig.c, fig.r) === 'g') return null;
    return isBlock(at(s, mirror(fig.c), fig.r)) ? 'stone' : null;
  }

  function isWin(s, mode) {
    const { c, r } = s.char;
    if (at(s, c, r) === 'G') return true;
    return mode === 'fold' && at(s, mirror(c), r) === 'G';
  }

  const api = { N, FOLD_MIN, POP_MIN, POP_MAX, SHADE_MIN, STAND, mirror, proj, isRight, modeOf, isFloor, isBlock,
    isOpaque, standing, passes, trifold, vw, offBook, flapIn, flapOut, flapBlock, shadowColumn, shadowColumnL, lampOf, lit, shadows, crushed, crushCause, cellBlock, stepBlock, pathBlock, ride, create, restart, at, colOf, neighbours, findPath, stamp,
    bleed, roll, fly, carried, flipBlock, flip, isWin };
  if (typeof module !== 'undefined') module.exports = api; else root.FoldLogic = api;
})(this);
