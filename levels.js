// Levels as data; names, lines and hints live in i18n.js under each id. Each map row is 8 columns: 4 on the left page | 4 on the right page.
// Column c on the right lands on column 7-c on the left when the book closes.
// Legend: - empty  . paper  S start  G goal  x stone  k key  D door  i ink  p pop-up tab
// A stone on the right page casts a shadow onto the left page while the book leans (91°–154°);
// the shadow is walkable and slides towards the stone's mirror cell as the book closes.
// tier: the difficulty band the level must score in (tools/check.js TIERS, docs/design-difficulty.md §2).
// needs: solver flags the level must keep true, so a later edit cannot quietly remove the mechanic it teaches.
const LEVELS = [
  // ---- Chapter 1 「对页」: close = mirror. Teaching chapter; only 1-3 and 1-5 ask for a second thought.
  {
    id: 'bridge', tier: 'teach', needs: ['needsFold'],
    map: [
      '-S------',
      '-.------',
      '------.-',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'facing', tier: 'teach', needs: ['needsFold'],
    map: [
      '-----..G',
      '-----.--',
      '--x--.--',
      'S.---.--',
    ],
  },
  {
    id: 'back', tier: 'easy', needs: ['needsFold'],
    map: [
      'S.---.--',
      '--x--.--',
      '-----..-',
      '-.----.-',
      '-G------',
    ],
  },
  {
    id: 'key', tier: 'teach', needs: ['needsFold', 'needsKey'],
    map: [
      '-S------',
      '-.------',
      '-D----k-',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'ink', tier: 'easy', needs: ['needsFold', 'needsInk'],   // retuned (design-difficulty.md §3): the ink prints the only road to the letter
    map: [
      'xS----.G',
      '-.----.-',
      '-.i-.-.-',
    ],
  },
  // ---- Chapter 2 「立」: stand the page (60°–120°), tabs on the crease make a bridge. 8 levels (design-review-2 §5).
  {
    id: 'stand', tier: 'teach', needs: ['needsPop'],
    map: [
      '-----..G',
      '--x--.--',
      'S..pp.--',
      '--------',
    ],
  },
  {
    id: 'twoBridges', tier: 'teach', needs: ['needsPop'],        // 2-2 · 1 posture change · tabs only (design-review-2 §5)
    map: [
      'S..pp..-',
      '-x----.-',
      '------.-',
      'G..pp..-',
    ],
  },
  {
    id: 'standClose', tier: 'easy', needs: ['needsFold', 'needsPop'],   // 2-3 · stand, then close · the goal is under your feet
    map: [
      'S..pp.--',
      '--x--.--',
      '-----.--',
      '--G--.--',
    ],
  },
  {
    id: 'doorBridge', tier: 'easy', needs: ['needsFold', 'needsPop', 'needsKey'],
    map: [
      'S.kppD.-',
      '-x----.-',
      '------.G',
      '--------',
    ],
  },
  {
    id: 'inkBridge', tier: 'easy', needs: ['needsFold', 'needsPop', 'needsInk'],
    map: [
      '--------',
      '-Sipp---',
      '--x--G--',
      '--------',
    ],
  },
  {
    id: 'inkTwice', tier: 'mid', needs: ['needsFold', 'needsPop', 'needsInk'],   // 2-6 · close (ink prints onto the wall) → stand and walk it → close onto the goal
    map: [
      'S..pp.--',
      '--i-----',
      '--x--.--',
      '--G--.--',
    ],
  },
  {
    id: 'crease', tier: 'mid', needs: ['needsFold', 'needsPop', 'needsKey', 'needsInk'],
    map: [
      'G.------',
      '-k----D-',
      '--xi-..-',
      '---..---',
      '--Spp---',
    ],
  },
  {
    id: 'rightBank', tier: 'mid', needs: ['needsFold', 'needsPop', 'needsKey', 'needsInk'],   // 2-8 · chapter end · the letter is on the standing page
    map: [
      'S.------',
      '-k.pp.D-',
      '-i------',
      '-xG--..-',
    ],
  },
  // ---- Chapter 3 「影」 (docs/design-ch3.md): the right page leans towards the lamp (fold 91°–154°), its stones cast
  // walkable shadows on the left page that slide outward as the book closes. No new tile: one rule, six faces.
  {
    id: 'shadow', tier: 'teach', needs: ['needsShade'],   // 3-1 · teaching, no instructions · 1 change · the shadow drops into the gap at 129°–154°
    map: [
      '-S------',
      '-.------',
      '-------x',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'press', tier: 'easy', needs: ['needsShade'],   // 3-2 · retuned: a longer walk around the stone's landing cell; closing while standing there crushes you
    map: [
      '--.S----',
      '-.---.x-',
      '..------',
      '.-------',
      '.G------',
    ],
  },
  {
    id: 'lock', tier: 'easy', needs: ['needsShade'],    // 3-3 · 1 change · far stones throw their shadows faster: both meet column 2 only at 147°–154°
    map: [
      '-S------',
      '-------x',
      '------x-',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'ride', tier: 'easy', needs: ['needsShade', 'needsRide'],   // 3-4 · 2 changes · stand on the shadow and keep closing: it carries you
    map: [
      'G.------',
      '-.------',
      '---S---x',
      '--------',
    ],
  },
  {
    id: 'rideBack', tier: 'mid', needs: ['needsShade'],   // 3-5 · retuned: board at 147°+, open, and the shadow brings you back; the far shore is a long walk
    map: [
      'S-------',
      '.--.--x-',
      '---.----',
      '---.----',
      'G...----',
    ],
  },
  {
    id: 'lamp', tier: 'hard', needs: ['needsFold', 'needsShade', 'needsRide'],   // 3-6 · retuned: a stone now hangs over the start — close first and it crushes you
    map: [
      '--------',
      '---Sx--x',
      '------x-',
      '-.------',
      '------G-',
    ],
  },
  // ---- Chapter 4 「岸」 (docs/design-ch4.md): no new tile, no new posture. Every level needs two or three of the
  // earlier mechanics at once, and the thing you learned in one chapter is the trap in the next.
  {
    id: 'twoShades', tier: 'mid', needs: ['needsShade', 'needsRide'],   // 4-1 · ride the far shadow out, change to the near one at 150, ride it back in
    map: [
      '--.Sx---',
      '-------x',
      '-.------',
      '------x-',
      '--.G----',
    ],
  },
  {
    id: 'bridgeShade', tier: 'hard', needs: ['needsFold', 'needsPop', 'needsShade', 'needsKey'],   // 4-2 · tabs stand ≤ 120, shadows start at 91: only at 100–110 is there a bridge AND a shadow beside it
    map: [
      '-k-pp.DS',
      '-------x',
      '---.x---',
      '--G.----',
    ],
  },
  {
    id: 'inkShore', tier: 'hard', needs: ['needsFold', 'needsShade', 'needsInk'],   // 4-3 · the shadow is a road, not a shore: print the shore first, then close from it
    map: [
      '-S--G---',
      '-.--.-x-',
      '-.--i--x',
      '--------',
    ],
  },
  {
    id: 'stoneRain', tier: 'hard', needs: ['needsFold', 'needsShade', 'needsRide', 'needsInk'],   // 4-4 · three stones hang over the road; only one cell is safe to close from
    map: [
      '-S----x-',
      '-.----x-',
      '-.----x-',
      '-.--i---',
      '---G----',
    ],
  },
  {
    id: 'shadeDoor', tier: 'hard', needs: ['needsFold', 'needsShade', 'needsKey'],   // 4-5 · a shadow cannot pass a locked door: close once for the key, then ride through
    map: [
      'S...----',
      '---.----',
      '.D----kx',
      'G--.----',
      '-.----x-',
    ],
  },
  {
    id: 'twoFigures', tier: 'final', needs: ['needsFold', 'needsShade', 'needsKey'],   // 4-6 · she waits on the far bank; ride back to the shore, and the last close opens the door and puts you in her square
    map: [
      'S.------',
      '-.--G---',
      '-.--.-x-',
      '-.-Dk---',
      '---.--x-',
    ],
  },
];

if (typeof module !== 'undefined') module.exports = LEVELS;
