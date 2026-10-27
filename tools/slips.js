// 物件笺 (docs/design-onboarding.md §2): the nine demo boards and their storyboards, checked against logic.js.
// Each slip's demo is a real 2-row level played by a script, so the drawing can never show an illegal move.
// Angles are fold angles as in levels.js / check.js (0 flat … 180 closed); the doc quotes physical = 180 − fold.
//   node tools/slips.js        → prints each slip's beats and fails on the first rule violation
const F = require('../logic.js');
const N = F.N;

const SLIPS = [
  { id: 'stone', level: '1-2', tile: 'x',
    map: ['GxS---.-', '.-.---.-'],
    beats: [
      { step: [-1, 0], blocked: 'stone' },        // open: the stone is a wall
      { angle: 180 },                             // close
      { walkStack: [0, 0] },                      // the stack walk goes round it, under the crease … (closed q, r)
      { win: true },
    ] },
  { id: 'door', level: '1-4', tile: 'D',
    map: ['-k---SDG', '--------'],
    beats: [
      { step: [1, 0], blocked: 'door' },
      { angle: 180, stamp: 'door' },
      { angle: 0 },
      { walk: [7, 0] }, { win: true },
    ] },
  { id: 'ink', level: '1-5', tile: 'i',
    map: ['-i---S-G', '--------'],
    beats: [
      { step: [1, 0], blocked: 'gap' },
      { angle: 180, stamp: 'ink' },
      { angle: 0 },
      { walk: [7, 0] }, { win: true },
    ] },
  { id: 'tab', level: '2-1', tile: 'p',
    map: ['S..pp..G', '--------'],
    beats: [
      { walk: [3, 0] },
      { step: [1, 0], blocked: 'crease' },
      { angle: 90 },                              // stand the page: the tabs rise
      { walk: [7, 0] }, { win: true },
    ] },
  { id: 'shadow', level: '3-1', tile: 'shadow',
    map: ['S-G----x', '--------'],
    beats: [
      { step: [1, 0], blocked: 'gap' },
      { angle: 135, shadowAt: [1, 0] },           // physical 45°: the far stone's shadow fills the gap
      { walk: [2, 0] }, { win: true },
    ] },
  { id: 'press', level: '3-2', tile: 'press',
    map: ['S.----x-', '--------'],
    beats: [
      { walk: [1, 0] },
      { angle: 180, crushed: true },              // under the stone: it comes down on you, back to the start
      { angle: 0 },
      { at: [0, 0] },
      { angle: 180, crushed: false },             // beside it: safe, the stone lands next to you
    ] },
  { id: 'ride', level: '3-4', tile: 'ride',
    map: ['G.-----x', '---S----'],
    beats: [
      { angle: 110, shadowAt: [3, 0] },           // physical 70°
      { walk: [3, 0] },                           // onto the shadow
      { angle: 130, at: [1, 0] },                 // physical 50°: the shadow slides 3 → 2 → 1 and carries you onto paper
      { walk: [0, 0] }, { win: true },
    ] },
  { id: 'glue', level: '5-1', tile: 'g',
    map: ['-g---SxG', '--------'],
    beats: [
      { step: [1, 0], blocked: 'stone' },
      { angle: 180, stamp: 'glue' },              // the glue pulls the stone across the crease
      { angle: 0 },
      { walk: [7, 0] }, { win: true },
    ] },
  { id: 'turn', level: '6-1', tile: 'turn',
    map: ['S.------.G--', '------------'],
    beats: [
      { walk: [1, 0] },
      { step: [1, 0], blocked: 'gap' },
      { angle: 180 },
      { flip: true },                             // turn the closed book over: the third page now faces the left page
      { walkStack: [2, 0] },                      // the stack with a gap on the left and her on the third page
      { win: true },
    ] },
  { id: 'lamp', level: '8-1', tile: 'lamp', lamp: 'L',
    map: ['x---S-G-', '--------'],
    beats: [
      { step: [1, 0], blocked: 'gap' },           // the gap between you and her on the lifted page
      { angle: 120, shadowAt: [5, 0] },           // physical 60°: the LEFT page's stone throws its shadow up onto the lifted page, beside you
      { walk: [5, 0] },                           // onto the shadow
      { angle: 135, at: [6, 0] },                 // physical 45°: it slides away from the hinge and carries you onto her square
      { win: true },
    ] },
  { id: 'gate', level: '8-4', tile: 'A',
    map: ['S.A-----', '-.AG----'],
    beats: [
      { walk: [1, 0] },
      { step: [1, 0], blocked: 'door' },          // flat: the gate lies down — a flap over a gap, not floor
      { angle: 120 },                             // lean (physical 60°): the flap stands, the gate is floor
      { walk: [2, 0] },                           // onto it …
      { angle: 0, falls: true },                  // … and flatten the book while standing on it: the flap lies down, you fall, back to the start
      { walk: [1, 1] },
      { angle: 120 },                             // lean again
      { walk: [3, 1] }, { win: true },            // through the lower gate onto her paper square
    ] },
  { id: 'wet', level: '7-1', tile: 'I',
    map: ['S--I----', '-G------'],
    beats: [
      { step: [1, 0], blocked: 'gap' },           // the gap beside the start
      { angle: 180, stamp: 'bleed' },             // close: the blot bleeds one ring — (2,0) and (3,1) — and prints onto the right page
      { angle: 0 },
      { step: [1, 0], blocked: 'gap' },           // one square short: still a gap
      { angle: 180, stamp: 'bleed' },             // close again: ring two reaches (1,0) and (2,1)
      { angle: 0 },
      { walk: [1, 1] }, { win: true },            // the road joins: down to the letter
    ] },
];

function run(slip) {
  const s = F.create({ map: slip.map, lamp: slip.lamp });
  let angle = 0, src = null;
  const mode = () => F.modeOf(angle);
  const sh = () => F.shadows(s, angle);
  const fail = (m) => { throw new Error(`${slip.id}: ${m}`); };
  const log = [];
  for (const b of slip.beats) {
    if (b.step) {
      const why = F.stepBlock(s, s.char, b.step[0], b.step[1], mode(), sh());
      if (!why || why.why !== b.blocked) fail(`step ${b.step} expected blocked by ${b.blocked}, got ${why && why.why}`);
      log.push(`blocked by ${b.blocked}`);
    }
    if (b.angle !== undefined) {
      // sweep in 5° steps so shadows carry (ride) and the close crushes as in the game
      const from = angle, dir = Math.sign(b.angle - from);
      let crushed = false, events = [];
      for (let a = from; dir && a !== b.angle;) {
        a = dir > 0 ? Math.min(b.angle, a + 5) : Math.max(b.angle, a - 5);
        const prevMode = mode(), before = sh(); angle = a;
        if (F.crushed(s, s.char, angle)) { crushed = true; break; }
        const here = F.at(s, s.char.c, s.char.r);
        if (!F.isFloor(here)) {
          if (src == null) src = before.get(s.char.c + ',' + s.char.r) ?? sh().get(s.char.c + ',' + s.char.r) ?? null;
          const to = F.ride(s, s.char, src, angle);
          if (!to) { if (b.falls) { s.char = { ...s.start }; src = null; log.push(`fell at fold ${angle}, back to the start`); break; } fail(`fell at fold ${angle}`); }
          s.char = to;
        } else src = null;
        if (prevMode !== 'fold' && mode() === 'fold') events = F.stamp(s);
      }
      if (b.crushed !== undefined && crushed !== b.crushed) fail(`at fold ${b.angle} crushed=${crushed}, expected ${b.crushed}`);
      if (crushed) { s.char = { ...s.start }; angle = 180; log.push('crushed, back to the start'); }
      if (b.stamp && !events.some((e) => e.type === b.stamp)) fail(`expected a ${b.stamp} stamp at fold ${b.angle}`);
      if (b.shadowAt && !sh().has(b.shadowAt.join(','))) fail(`no shadow at ${b.shadowAt} at fold ${b.angle} (${[...sh().keys()]})`);
      log.push(`fold ${angle}${b.stamp ? ' · ' + b.stamp : ''}${b.shadowAt ? ' · shadow at ' + b.shadowAt : ''}`);
    }
    if (b.flip) {
      const why = F.flipBlock(s, angle); if (why) fail(`cannot turn: ${why}`);
      const { crush } = F.flip(s); if (crush) fail('the turn crushed her');
      log.push('turned');
    }
    if (b.walk) {
      const path = F.findPath(s, { c: b.walk[0], r: b.walk[1] }, mode(), sh());
      if (!path) fail(`no path to ${b.walk} at fold ${angle}`);
      s.char = path[path.length - 1] || s.char; src = null;
      log.push(`walk → ${s.char.c},${s.char.r} (${path.length} steps)`);
    }
    if (b.walkStack) {
      if (mode() !== 'fold') fail('walkStack needs the book closed');
      const path = F.findPath(s, { c: b.walkStack[0], r: b.walkStack[1] }, 'fold', null);
      if (!path) fail(`no closed path to stack ${b.walkStack}`);
      s.char = path[path.length - 1];
      log.push(`closed walk → stack ${b.walkStack}, standing on ${s.char.c},${s.char.r} (${path.length} steps)`);
    }
    if (b.at && (s.char.c !== b.at[0] || s.char.r !== b.at[1])) fail(`expected her at ${b.at}, she is at ${s.char.c},${s.char.r}`);
    if (b.win && !F.isWin(s, mode())) fail('expected the letter delivered');
    if (b.win) log.push('delivered');
  }
  return log;
}

if (require.main === module) {
  let bad = 0;
  for (const slip of SLIPS) {
    try { console.log(`${slip.id} (${slip.level}): ${run(slip).join(' → ')}`); }
    catch (e) { bad++; console.error('FAIL ' + e.message); }
  }
  process.exit(bad ? 1 : 0);
}
module.exports = { SLIPS, run };
