// Levels as data; names, lines and hints live in i18n.js under each id. Each map row is 8 columns: 4 on the left page | 4 on the right page.
// Column c on the right lands on column 7-c on the left when the book closes.
// Legend: - empty  . paper  S start  G goal  x stone  k key  D door  i ink  p pop-up tab
// A stone on the right page casts a shadow onto the left page while the book leans (91°–154°);
// the shadow is walkable and slides towards the stone's mirror cell as the book closes.
const LEVELS = [
  {
    id: 'bridge',
    map: [
      '-S------',
      '-.------',
      '------.-',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'facing',
    map: [
      '-----..G',
      '-----.--',
      '--x--.--',
      'S.---.--',
    ],
  },
  {
    id: 'back',
    map: [
      'S.---.--',
      '--x--.--',
      '-----..-',
      '-.----.-',
      '-G------',
    ],
  },
  {
    id: 'key',
    map: [
      '-S------',
      '-.------',
      '-D----k-',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'ink',
    map: [
      '--------',
      '----G---',
      '-xix.-..',
      '-------S',
    ],
  },
  {
    id: 'stand',
    map: [
      '-----..G',
      '--x--.--',
      'S..pp.--',
      '--------',
    ],
  },
  {
    id: 'twoBridges',        // 2-2 · 1 posture change · tabs only (design-review-2 §5)
    map: [
      'S..pp..-',
      '-x----.-',
      '------.-',
      'G..pp..-',
    ],
  },
  {
    id: 'standClose',        // 2-3 · stand, then close · the goal is under your feet
    map: [
      'S..pp.--',
      '--x--.--',
      '-----.--',
      '--G--.--',
    ],
  },
  {
    id: 'doorBridge',
    map: [
      'S.kppD.-',
      '-x----.-',
      '------.G',
      '--------',
    ],
  },
  {
    id: 'inkBridge',
    map: [
      '--------',
      '-Sipp---',
      '--x--G--',
      '--------',
    ],
  },
  {
    id: 'crease',
    map: [
      'G.------',
      '-k----D-',
      '--xi-..-',
      '---..---',
      '--Spp---',
    ],
  },
  // ---- Chapter 3 「影」 (docs/design-ch3.md): the right page leans towards the lamp (fold 91°–154°), its stones cast
  // walkable shadows on the left page that slide outward as the book closes. No new tile: one rule, six faces.
  {
    id: 'shadow',            // 3-1 · teaching, no instructions · 1 change · the shadow drops into the gap at 129°–154°
    map: [
      '-S------',
      '-.------',
      '-------x',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'press',             // 3-2 · 1 change · the card says "close"; closing drops the stone on the road beyond the gap
                             //       (and crushes you if you are standing there: logic.js crushed, design-review-ch3 §2)
    map: [
      '--------',
      '-.-S-.x-',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'lock',              // 3-3 · 1 change · far stones throw their shadows faster: both meet column 2 only at 147°–154°
    map: [
      '-S------',
      '-------x',
      '------x-',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'ride',              // 3-4 · 2 changes · stand on the shadow and keep closing: it carries you
    map: [
      'G.------',
      '-.------',
      '---S---x',
      '--------',
    ],
  },
  {
    id: 'rideBack',          // 3-5 · 2 changes · board at 147°+, then open: the shadow brings you back towards the crease
    map: [
      '--------',
      'S--.--x-',
      '---.----',
      '---G----',
    ],
  },
  {
    id: 'lamp',              // 3-6 · 3 changes · ride, step off before it's too late, then the last close delivers the letter
    map: [
      '--------',
      '---S---x',
      '------x-',
      '-.------',
      '------G-',
    ],
  },
];

if (typeof module !== 'undefined') module.exports = LEVELS;
