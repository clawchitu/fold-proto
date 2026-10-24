// Levels as data; names, lines and hints live in i18n.js under each id. Each map row is 8 columns: 4 on the left page | 4 on the right page.
// Column c on the right lands on column 7-c on the left when the book closes.
// From chapter 6 a row may be 12 columns: a third page (the back of the right leaf) follows the right page; turned, it faces the left page the same way.
// Legend: - empty  . paper  S start  G goal  x stone  k key  D door  i ink  p pop-up tab
// A stone on the right page casts a shadow onto the left page while the book leans (91°–154°);
// the shadow is walkable and slides towards the stone's mirror cell as the book closes.
// Glue (vol. 2) is walkable paper; when the book closes it pulls the stone facing it onto itself, once.
// tier: the difficulty band the level must meet (tools/check.js GATES: minimal solution length, wrong turns, decoys;
//       docs/difficulty-postmortem.md §6). Vol. 1 was retuned 2026-10-19 (postmortem §6): every chapter's first level
//       is still a ≤ 30 s teach, the second ~1 min, and from the third on each level needs thought (mid → hard → final).
// len:  the measured minimal solution (posture changes + steps); check.js fails if an edit changes it.
// needs: solver flags the level must keep true, so a later edit cannot quietly remove the mechanic it teaches.
const LEVELS = [
  // ---- Chapter 1 「对页」: close = mirror. Stones stay on the left page (no shadows yet). 1-1 teaches; 1-2 ~1 min; 1-3…1-5 are
  // stack-walking puzzles: which stack you close over and which page you are on when you open (postmortem P5).
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
    id: 'facing', tier: 'easy', len: 13, needs: ['needsFold'],   // 1-2 · retuned 2026-10-19 (postmortem §6) · start and letter on the same page, the straight stack is walled: which stack do you close over?
    map: [
      '----....',
      '---x.-..',
      '---.-.-.',
      '---xG.-S',
    ],
  },
  {
    id: 'back', tier: 'mid', len: 16, needs: ['needsFold'],   // 1-3 · two closes; the stack walk ends on the far page, one step up, and the second close brings you home
    map: [
      'G---S.--',
      '.--.-.--',
      'x---..-.',
      '----.-..',
      '--.x.-..',
    ],
  },
  {
    id: 'key', tier: 'mid', len: 16, needs: ['needsFold', 'needsKey'],   // 1-4 · the first close opens the door you walk through on the far page; the door at (5,1) has no key in this letter — it is a wall that reads as a door (postmortem §6, to revisit)
    map: [
      '---G-.-.',
      '.D.--Dk-',
      '.---.S--',
      'x-.-.-..',
      '.---...-',
    ],
  },
  {
    id: 'ink', tier: 'hard', len: 17, needs: ['needsFold', 'needsInk'],   // 1-5 · chapter end · two closes; the ink printed by the first is the one rung of the stack that leads down to the letter
    map: [
      '........',
      '......-.',
      'i--x.-.-',
      '---.---.',
      'Sx--..G-',
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
    id: 'twoBridges', tier: 'easy', needs: ['needsPop'],        // 2-2 · 1 posture change · tabs only (design-review-2 §5)
    map: [
      'S..pp..-',
      '-x----.-',
      '------.-',
      'G..pp..-',
    ],
  },
  {
    id: 'standClose', tier: 'mid', len: 17, needs: ['needsFold', 'needsPop'],   // 2-3 · stand, cross, walk the standing page to its far corner, close, and open on the other page beside the letter
    map: [
      '...pp...',
      'S------.',
      'x.x--G-.',
      '-.---.--',
    ],
  },
  {
    id: 'doorBridge', tier: 'mid', len: 17, needs: ['needsFold', 'needsPop', 'needsKey'],   // 2-4 · close once for the door, cross the bridge, then close again over the stone's back to drop onto the left page
    map: [
      '..kppD..',
      '.-..---.',
      'S---.--.',
      'x.G----.',
    ],
  },
  {
    id: 'inkBridge', tier: 'mid', len: 18, needs: ['needsFold', 'needsPop', 'needsInk'],   // 2-5 · the ink beside the start prints across; after the bridge it is the one square that joins the far page to the stone's back you close over
    map: [
      '...pp..-',
      '.x----.-',
      '.iS--.--',
      '--xG-.-.',
    ],
  },
  {
    id: 'inkTwice', tier: 'hard', len: 18, needs: ['needsFold', 'needsPop', 'needsInk'],   // 2-6 · the ink prints the one square that joins the bridge to the far shore; the second close is from the corner
    map: [
      '--xS...-',
      '---i--..',
      '-.-pp--.',
      '------..',
      '--xG-..-',
    ],
  },
  {
    id: 'crease', tier: 'hard', len: 19, needs: ['needsFold', 'needsPop', 'needsKey', 'needsInk'],   // 2-7 · the first close (over the stone's back at the foot of the bridge) opens the door and prints the ink; the stack walk ends at the door, and the second close is from beyond it
    map: [
      'G-S.----',
      'xk-.--D.',
      '-.-.--.-',
      '-i-.---.',
      '-.xpp.--',
    ],
  },
  {
    id: 'rightBank', tier: 'hard', len: 20, needs: ['needsFold', 'needsPop'],   // 2-8 · chapter end · two bridges, two closes, two page changes; the door at (7,0) has no key — a wall that reads as a door (postmortem §6)
    map: [
      '...pp..D',
      '-----.-.',
      'x--S..-.',
      'G--..---',
      '--.pp---',
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
    id: 'press', tier: 'mid', len: 13, needs: ['needsShade'],   // 3-2 · retuned: a stone hangs over the start (close there and it crushes you); the far stone's shadow is the bridge to the corner you close from
    map: [
      '.-..--x-',
      '---.---.',
      '---.---.',
      '-S...-xG',
    ],
  },
  {
    id: 'lock', tier: 'hard', len: 16, needs: ['needsShade'],   // 3-3 · near and far: at 100° only the far stone's shadow reaches; at 140° the near one's does. No ride needed
    map: [
      'G-.---.-',
      '---.-x--',
      '.S-----x',
      '.-..--.-',
      '...-----',
    ],
  },
  {
    id: 'ride', tier: 'mid', len: 17, needs: ['needsShade', 'needsRide'],   // 3-4 · the ride is taught here: step on the far shadow at 130° and OPEN to 110°: it carries you to the strip you close from
    map: [
      '--.-x-.-',
      '--.-Gx.-',
      '.---...x',
      '.-------',
      '...S----',
    ],
  },
  {
    id: 'rideBack', tier: 'hard', len: 16, needs: ['needsFold', 'needsShade', 'needsRide'],   // 3-5 · the one square of shore is an island only the shadow reaches; ride it towards the crease, step off, close
    map: [
      '...--.--',
      '.-.S----',
      '.-.-----',
      '.--.----',
      '.---..Gx',
    ],
  },
  {
    id: 'lamp', tier: 'hard', len: 18, needs: ['needsFold', 'needsShade', 'needsRide'],   // 3-6 · close over a stone's back to reach the left page; two shadows at two angles; the last close is from the corner, not from under the stone
    map: [
      '-..--.x-',
      '-.x...--',
      '---..---',
      '.--.S--x',
      '.---.-G-',
    ],
  },
  // ---- Chapter 4 「岸」 (docs/design-ch4.md): no new tile, no new posture. Every level needs two or three of the
  // earlier mechanics at once, and the thing you learned in one chapter is the trap in the next.
  {
    id: 'twoShades', tier: 'easy', len: 11, needs: ['needsShade', 'needsRide'],   // 4-1 · quick: one stone, one gap two squares wide; ride its shadow OUT by opening the book, walk back along the far strip
    map: [
      '-.---.x-',
      '..-.--.-',
      '..-.----',
      'S-G..---',
    ],
  },
  {
    id: 'bridgeShade', tier: 'easy', len: 12, needs: ['needsPop', 'needsShade', 'needsRide'],   // 4-2 · ride the shadow towards the crease by opening to 100°: at that angle the tabs stand too
    map: [
      'S--.----',
      '..-pp---',
      '-.x..G--',
      '..-----x',
    ],
  },
  {
    id: 'inkShore', tier: 'hard', len: 18, needs: ['needsFold', 'needsShade', 'needsRide', 'needsInk'],   // 4-3 · the close prints the shore between two shadows; close over the stone's back, ride one shadow, cross the ink to the other
    map: [
      '----...-',
      '.x--.-.-',
      '.---..-x',
      '-----iS-',
      '-.-.G-x-',
    ],
  },
  {
    id: 'stoneRain', tier: 'hard', len: 19, needs: ['needsFold', 'needsShade', 'needsRide'],   // 4-4 · three stones hang over the stack; the only way to the left page is over the fourth stone's back, then a ride and a long walk to the one safe close
    map: [
      '--.---G-',
      '--.--xx-',
      '-......-',
      '.x-..-.-',
      '..--S-x-',
    ],
  },
  {
    id: 'shadeDoor', tier: 'final', len: 20, needs: ['needsFold', 'needsShade', 'needsRide', 'needsKey'],   // 4-5 · the ride ends at the door the first close opened; the stone over the top row makes the last close safe from one square only
    map: [
      '--..x-G-',
      '---..---',
      '..xDkSx-',
      'x.--.x..',
      '.---...-',
    ],
  },
  {
    id: 'twoFigures', tier: 'final', len: 19, needs: ['needsFold', 'needsShade', 'needsRide', 'needsKey'],   // 4-6 · vol. 1 finale · close over the stone's back to reach the left page, two shadows at two angles, and the last close is from the doorway the first close opened: the stack walk ends in her square
    map: [
      '.--..--x',
      'D--..-Gk',
      '-.-..Sx-',
      '-.-x.---',
      '-.-.-.--',
    ],
  },
  // ---- Vol. 2 「翻页」 · Chapter 5 「胶」 (docs/design-v2c1.md): letter paper with glue on it. One new tile, one sentence:
  // when the book closes, glue pulls the stone facing it onto itself. A stone that changes page takes its shadow and
  // its weight with it — so the first close now rearranges the board, and the question is what to do before it.
  {
    id: 'glue', tier: 'teach', needs: ['needsFold', 'needsGlue'],   // 5-1 · teaching · the stone on your road is gone after one close: the glue across the crease took it
    map: [
      '------S-',
      '------.-',
      '-g----x-',
      '------.-',
      '------G-',
    ],
  },
  {
    id: 'lend', tier: 'easy', needs: ['needsFold', 'needsShade', 'needsGlue'],   // 5-2 · no stone on the far page, so no shadow — until you glue one across. Close, open, lean 30°–50°
    map: [
      '-S------',
      '-.------',
      'x------g',
      '-.------',
      '-G------',
    ],
  },
  {
    id: 'bridgeGlue', tier: 'easy', needs: ['needsFold', 'needsPop', 'needsShade', 'needsGlue'],   // 5-3 · 4-2 again, but you build the shadow: glue the stone across, then 70°–80° has bridge and shadow at once
    map: [
      '---pp..S',
      'x------g',
      '-G..----',
    ],
  },
  // ---- 5-4 … 5-7 redesigned 2026-10-19 (docs/difficulty-postmortem.md): the owner solved the first cut of this chapter
  // (v2 scores 8 · 8 · 9 · 14) in seconds. These four come out of tools/gen.js (search + polish, then hand-curated):
  // minimal solutions of 17–20 actions (chapter average was 7), no decoy elements, every stone with two jobs,
  // one close that rearranges the board and a chain of shadows you can only read after it.
  {
    id: 'oldHome', tier: 'hard', len: 17, needs: ['needsFold', 'needsShade', 'needsRide', 'glueFires'],   // (wiping the glue opens a shortcut over the stone's back, so needsGlue is false by construction)   // 5-4 · no stone on the far page until you send two across; the shadow of one leads back to where it stood
    map: [
      '----S...',
      '-------.',
      'x----..g',
      'G-x.-g--',
      '---.-.--',
    ],
  },
  {
    id: 'ferry', tier: 'hard', len: 17, needs: ['needsFold', 'needsPop', 'needsShade', 'needsRide', 'needsGlue'],   // 5-5 · cross the stack through a hole, then open the book FURTHER to ride the shadow to the bridge: at 70° the tabs stand and both shadows are there
    map: [
      '.-----..',
      '.x--S.g.',
      '.-x---.x',
      '.--.G-.-',
      '---pp---',
    ],
  },
  {
    id: 'twiceClosed', tier: 'hard', len: 18, needs: ['needsFold', 'needsShade', 'needsRide', 'needsGlue'],   // 5-6 · three elements, two closes; the second close is only safe from one cell, reached by two shadows
    map: [
      '-----...',
      'x--...-g',
      '.-.--S-.',
      '.-.--x--',
      '---.G---',
    ],
  },
  {
    id: 'twoLamps', tier: 'final', len: 20, needs: ['needsFold', 'needsShade', 'needsRide', 'needsGlue'],   // ink: without it the road still exists but costs 5 postures   // 5-7 · finale · two stones four columns out throw shadows into the same column; the ink patch printed by the close is the only link between them. Open to 60°, then close back to 40°
    map: [
      'G--x---x',
      '--..S.--',
      '---..--.',
      'x---i..g',
      '.------.',
      '.-------',
    ],
  },
  // ---- 「暗信」 hidden letters of chapter 5: optional, par ≤ 6, closes ≤ 3 (check.js PAR_MAX.dark). Not on the main path.
  {
    id: 'darkBack', tier: 'final', optional: true, len: 20, needs: ['needsFold', 'needsShade', 'needsRide', 'glueFires'],   // 暗一 · the stack over a left-page stone cannot be entered — but you can stand on the stone's back from the open page and close
    map: [
      '.g-...x-',
      '-.-x.---',
      '..-.----',
      'S--.----',
      '---.--x-',
      '-G------',
    ],
  },
  {
    id: 'darkDoor', tier: 'final', optional: true, len: 19, needs: ['needsFold', 'needsShade', 'needsKey', 'glueFires'],   // 暗二 · ride the shadow down onto paper as the book closes; then a stacked walk with four page changes to a door that was locked
    map: [
      '..----x-',
      '.-D--k--',
      '.x---.G-',
      '-.-S---.',
      '---.--.-',
      'g.-.---x',
    ],
  },
  {
    id: 'darkInk', tier: 'final', optional: true, len: 22, needs: ['needsFold', 'needsShade', 'needsRide', 'needsInk', 'needsGlue'],   // 暗三 · three closes; the ink prints the hole you cross and the cell you close from; the last close stands on a stone's back
    map: [
      '-----xi.',
      '---..S-.',
      'x-....-.',
      '.--xg-G-',
      '----i---',
      '---.-.--',
    ],
  },
  // ---- Vol. 2 · Chapter 6 「翻」 (docs/design-ch6.md): the book has a third page. Rows are 12 columns: left page | right
  // page | third page (the back of the right leaf). 「翻」 turns the CLOSED book over: the third page now faces the left
  // page, the right page is away. You can only turn while standing on the left page (the leaf under your feet will not
  // turn); the press stamps like a close (keys / ink / glue between the two pages now touching); a third-page stone over
  // your square comes down on you. Each turn is one posture change (par). Main path: `chapter: 6` — unlocked only when
  // all seven main levels of chapter 5 are cleared (the 暗信 above are not required); the 暗信 of this chapter come later.
  {
    id: 'turn', tier: 'teach', chapter: 6, needs: ['needsFold', 'needsFlip'],   // 6-1 · teaching · the letter is not on this spread: close, turn the book over, and the stack leads onto the third page
    map: [
      '-S----------',
      '-.----------',
      '-.----------',
      '-.----------',
      '----------G-',
    ],
  },
  {
    id: 'overleaf', tier: 'easy', chapter: 6, len: 9, needs: ['needsFold', 'needsFlip'],   // 6-2 · you start on the right leaf, and the leaf under your feet will not turn: closed, step into the one stack whose right-page cell is a gap, land on the left page, then turn
    map: [
      '-..--S..----',
      '-.----------',
      '-.----------',
      '-...--------',
      '---.----G---',
    ],
  },
  {
    id: 'twoFaces', tier: 'mid', chapter: 6, len: 16, needs: ['needsFold', 'needsShade', 'needsFlip'],   // 6-3 · the right page's stone throws the shadow you walk to the one square you can close from; the third page's stone is the wall that makes it the only one
    map: [
      'S-----..-.Gx',
      '.-------..--',
      '.--.--..----',
      '..----x.----',
      '-...--------',
    ],
  },
  {
    id: 'inlay', tier: 'hard', chapter: 6, len: 16, needs: ['needsFold', 'needsShade', 'needsFlip'],   // 6-4 · two shadows at one angle pave the top row; close in the corner, turn, and the third page's stone is a wall beside the two-step stack walk down to the letter
    map: [
      '-.-.--x..-..',
      '-.--.-.-..x-',
      '.----.-x-G-.',
      '.x-.....--..',
      '...S....-.--',
    ],
  },
  {
    id: 'bleed', tier: 'hard', chapter: 6, len: 18, needs: ['needsFold', 'needsShade', 'needsRide', 'needsFlip'],   // 6-5 · replaced 「页边」 after the 10/24 blind playtest (two samplers solved it in 3 calls) · closing first glues the top-left stone away and with it the only shadow (before): lean 55° at the top-left, ride OUT to 70° onto column 4, step down, close, turn
    map: [
      '.g----x--G--',
      '.x--.--x-.--',
      '.--..-.--.--',
      '.-------.---',
      '...S..--x.--',
    ],
  },
  {
    id: 'pressedFlower', tier: 'hard', chapter: 6, len: 19, needs: ['needsFold', 'needsShade', 'needsRide', 'needsFlip'],   // 6-6 · closing first glues a stone across and breaks the road (before): lean 40°, ride the shadow out at 60°, then close in the one safe square and turn
    map: [
      '-.S---------',
      '..-..-------',
      '.x--.x-x.---',
      '.-.--..-.x--',
      'g------x.G--',
    ],
  },
  {
    id: 'lastPage', tier: 'final', chapter: 6, len: 20, needs: ['needsFold', 'needsShade', 'needsGlue', 'needsFlip'],   // 6-7 · chapter end (re-searched 10/24, Chitu: real dead ends) · the first close must be made from the bottom of the right page: the glue ferries the left-page stone across, and only that stone's shadow (40°) reaches the narrow road to the one square you can close and turn from; the stack walk up column 1 ends on her page
    map: [
      '----.S.---.G',
      '-.----..----',
      '-..-...----.',
      '------..---.',
      '.x---.g..---',
      'x-..----..-.',
    ],
  },
];

if (typeof module !== 'undefined') module.exports = LEVELS;
