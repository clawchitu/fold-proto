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
console.log('logic tests passed');
