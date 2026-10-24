// Unit tests for logic.js rules that the solver does not exercise directly: node tools/test.js (also run by check.js).
const assert = require('assert');
const L = require('../logic.js');
const mk = (map) => L.create({ map });

// Glue crush: standing on glue while the book closes pulls the stone opposite onto you (a rule, with a reason).
{
  const s = mk(['x--S...g']);   // stone at c0, glue at c7 faces it
  assert.strictEqual(L.crushCause(s, { c: 7, r: 0 }, 180), 'glue');
  assert.strictEqual(L.crushCause(s, { c: 7, r: 0 }, 120), null, 'not closed yet: safe');
  assert.strictEqual(L.crushCause(s, { c: 6, r: 0 }, 180), null, 'beside the glue: safe');
  const t = mk(['.S-----x']);   // right-page stone at c7 lands on c0
  assert.strictEqual(L.crushCause(t, { c: 0, r: 0 }, 180), 'stone');
  assert.strictEqual(L.crushCause(t, { c: 1, r: 0 }, 180), null);
}
// Step reasons: edge, crease, stone, door, gap; folded: card on a stone.
{
  const s = mk(['S.xD.D..', '...-....']);
  const at = (c, r) => ({ c, r });
  assert.strictEqual(L.stepBlock(s, at(0, 0), -1, 0, 'open').why, 'edge');
  assert.strictEqual(L.stepBlock(s, at(1, 0), 1, 0, 'open').why, 'stone');
  assert.strictEqual(L.stepBlock(s, at(2, 1), 1, 0, 'open').why, 'gap');
  assert.strictEqual(L.stepBlock(s, at(3, 1), 1, 0, 'open').why, 'crease');
  assert.strictEqual(L.stepBlock(s, at(4, 0), 1, 0, 'open').why, 'door');
  assert.strictEqual(L.stepBlock(s, at(0, 1), 1, 0, 'open'), null);
  // folded, stack 2 = left c2 under right c5: a stone under a gap blocks as a stone, under paper as a card
  const f = mk(['S.x..-..']), g = mk(['S.x.....']);
  assert.strictEqual(L.stepBlock(f, at(1, 0), 1, 0, 'fold').why, 'stone');
  assert.strictEqual(L.stepBlock(g, at(1, 0), 1, 0, 'fold').why, 'card');
}
// Path reasons: the target itself, else the nearest blocker on the edge of what you can reach.
{
  const s = mk(['S.x.....']);
  assert.strictEqual(L.pathBlock(s, { c: 1, r: 0 }, 'open'), null);
  assert.deepStrictEqual(L.pathBlock(s, { c: 2, r: 0 }, 'open'), { why: 'stone', c: 2, r: 0 });
  assert.deepStrictEqual(L.pathBlock(s, { c: 3, r: 0 }, 'open'), { why: 'stone', c: 2, r: 0 });
  const t = mk(['S..-....']);
  assert.strictEqual(L.pathBlock(t, { c: 6, r: 0 }, 'open').why, 'gap');
  const u = mk(['S...G...']);
  assert.strictEqual(L.pathBlock(u, { c: 4, r: 0 }, 'open').why, 'crease');
}
// Turning the page (vol. 2 ch. 6): a 12-column row is left | right | third page; the third page is the back of the right
// leaf and faces the left page once the closed book is turned over (face = 1).
{
  const s = mk(['.S.-..x-' + '---x',      // row 0: right page has a stone at c6; third page has one at its c3 (grid c11)
                '.g.-....' + '..x.',      // row 1: glue on the left at c1 faces paper on the right, a stone on the third page (its index 2)
                '..k-....' + '.D..']);    // row 2: a key on the left at c2 faces paper on the right, a door on the third page (index 1)
  assert.strictEqual(s.pages, 3); assert.strictEqual(s.face, 0); assert.strictEqual(s.w, 8, 'only two pages are visible');
  assert.strictEqual(L.at(s, 6, 0), 'x'); assert.strictEqual(L.at(s, 5, 0), '.');
  assert.strictEqual(L.flipBlock(s, 180), null, 'closed, standing on the left page: may turn');
  assert.strictEqual(L.flipBlock(s, 120), 'open');
  assert.strictEqual(L.flipBlock({ ...s, char: { c: 5, r: 0 } }, 180), 'leaf', 'standing on the right leaf: cannot turn it');
  assert.strictEqual(L.flipBlock(mk(['S......x']), 180), 'single', 'a two-page book has nothing to turn to');
  // shadows at face 0 come from the right page, at face 1 from the third page
  assert.deepStrictEqual([...L.shadows(s, 140).keys()], ['2,0'], 'right-page stone at c6 shades column 2 at 140');
  const f = L.flip(s);
  assert.strictEqual(s.face, 1);
  assert.strictEqual(L.at(s, 7, 0), 'x', 'visible column 7 now reads the third page'); assert.strictEqual(L.at(s, 6, 0), '-');
  assert.strictEqual(f.crush, null, 'the third-page stone comes down on column 0, not on the start (1,0)');
  // the press stamped the left page against the third page: glue pulled the stone, the key opened the door
  assert.deepStrictEqual(f.events.map((e) => e.type).sort(), ['door', 'glue']);
  assert.strictEqual(L.at(s, 1, 1), 'x', 'glue at (1,1) took the third-page stone facing it'); assert.strictEqual(L.at(s, 6, 1), '.');
  assert.strictEqual(L.at(s, 5, 2), 'o'); assert.strictEqual(L.at(s, 2, 2), '.');
  assert.strictEqual(s.grid[1][10], '.', 'the stamp wrote through to the third page'); assert.strictEqual(s.grid[0][6], 'x', 'the right page is untouched');
  assert.deepStrictEqual([...L.shadows(s, 140).keys()], ['1,0'], 'third-page stone at c7 shades column 1 at 140');
  // turning onto a stone crushes you, like a close does
  const t = mk(['-S..-...' + '--x-']);
  t.char = { c: 1, r: 0 };
  const tf = L.flip(t);
  assert.strictEqual(tf.crush, 'stone'); assert.deepStrictEqual(tf.events, [], 'a crush presses nothing');
  // ...and the level starts again: face, grids and figure as they began (no crush loop on 6-3)
  L.restart(t);
  assert.strictEqual(t.face, 0); assert.deepStrictEqual(t.char, t.start); assert.strictEqual(t.grid[0].join(''), '-S..-...--x-');
  // the goal may live on the third page: visible only once turned
  const u = mk(['S...-...' + '...G']);
  u.char = { c: 3, r: 0 };
  assert.strictEqual(L.isWin(u, 'fold'), false);
  L.flip(u);
  assert.strictEqual(L.isWin(u, 'fold'), false, 'stacked over column 0 of the facing page, not column 3');
  u.char = { c: 0, r: 0 };
  assert.strictEqual(L.isWin(u, 'fold'), true, 'closed and turned, the goal is in the stack');
  assert.strictEqual(L.flipBlock(u, 180), null, 'turning back is allowed too');
  L.flip(u); assert.strictEqual(u.face, 0); assert.strictEqual(L.isWin(u, 'fold'), false);
}
// 6-3: the start lies under the third page's stone. A turn that crushes her must not leave the third page facing,
// or the next opening crushes her again at the start (the crush loop).
{
  const lv = require('../levels.js').find((l) => l.id === 'twoFaces');
  const s = L.create(lv);
  s.char = { ...s.start };
  const f = L.flip(s);
  assert.strictEqual(f.crush, 'stone', '6-3: turning while standing on the start brings the third-page stone down');
  L.restart(s);
  assert.strictEqual(s.face, 0, 'back to the right page facing');
  assert.deepStrictEqual(s.char, s.start);
  assert.strictEqual(L.crushed(s, s.char, 180), false, 'closed at the start, nothing comes down: no loop');
  assert.deepStrictEqual(s.grid.map((r) => r.join('')), lv.map);
}
console.log('logic tests passed');
