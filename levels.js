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
  {
    id: 'shadow',
    map: [
      '-S------',
      '-.------',
      '-------x',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'ride',
    map: [
      'G.------',
      '-.------',
      '---S---x',
      '--------',
    ],
  },
];

if (typeof module !== 'undefined') module.exports = LEVELS;
