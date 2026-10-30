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
    id: 'twoFigures', tier: 'final', len: 18, backs: 1, needs: ['needsFold', 'needsShade', 'needsRide', 'needsKey'],   // 4-6 · vol. 1 finale · reworked 2026-10-25 under difficulty-v3.md §6 (batch 1, candidate B): the right page you start on reaches the left page only through the stack over the left-page stone (2,2) — stand on its back and close (that close also opens the door with the key in the corner); the open left page reaches the doorway only along two shadows at two angles (80°, then 55°), and the doorway is the one square the last close carries into her stack. Glance test: one-shot 2/3 over fresh readers (not at the vol. 1 bar of ≤ 1/2; adopted as the best candidate, par-5 variant tf5 also fell 2/2)
    map: [
      '-...----',
      '..-----x',
      '-.x.S.--',
      '---..--G',
      'D.-...xk',
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
    id: 'lastPage', tier: 'final', chapter: 6, len: 18, phases: 2, backs: 1, needs: ['needsFold', 'needsShade', 'needsFlip'],   // (the glue fires at the turn, not at the first close, so glueFires is not asserted) 6-7 · chapter end · reworked 2026-10-25 under difficulty-v3.md §6 (batch 1, candidate lp2): the only way onto the left page is to close standing on the back of the left-page stone (top-right paper over (0,1)); then the stone travels three pages — the turn lets the left page's glue (1,2) pull the third page's stone across, turning back lets the right page's glue (6,2) take it on — and only then does a shadow fall on the gap beside her. Glance test: 0/2 one-shot, 1/2 two-shot; text samplers 11 / 12 calls, 0 hints
    map: [
      '.--.-..-----',
      'xGx-.-x.----',
      '-g--.-gS--x-',
      '--.i-.-.-.--',
      '--..---..x--',
      '...----x....',
    ],
  },
  // ---- Chapter 7 「墨晕」 (vol. 2, docs/design-ch7.md): wet ink I. Every press (close or turn) first bleeds each wet square one ring
  // into the gaps and glue beside it on its own page, then prints the grown blot onto the facing gaps — and the print is wet too.
  // Closes are the chapter's resource (check.js CLOSES_MAX.wet = 3). Main path: `chapter: 7`.
  {
    id: 'wet', tier: 'teach', chapter: 7, needs: ['needsFold', 'needsWet'],   // 7-1 · teaching · one close: the blot bleeds one ring and the gap beside the start is ink; the right-page stone keeps the closed stack walk from reaching her
    map: [
      'S-I-----',
      '-G----x-',
    ],
  },
  {
    id: 'print', tier: 'easy', chapter: 7, needs: ['needsFold', 'needsWet'],   // 7-2 · you start on the right page; the blot prints across wet, and the print grows a ring at the second close — two closes to reach the corner
    map: [
      '-----S--',
      '-I---.--',
      '--------',
      '-------G',
    ],
  },
  {
    id: 'ring', tier: 'mid', chapter: 7, backs: 1, needs: ['needsFold', 'needsShade', 'needsRide', 'needsWet'],   // 7-3 · one ring is enough: close once from the stone's back to cross to the left page, lean 40° onto the shadow and ride out to 80°; a second close would fill the gap the ride needs (before)
    map: [
      '.-----.-',
      '-.-Gx..-',
      '-.--.-xI',
      '-x--S..-',
    ],
  },
  {
    id: 'spoiled', tier: 'hard', chapter: 7, phases: 2, needs: ['needsFold', 'needsShade', 'needsGlue', 'needsWet'],   // 7-4 · the glue beside the blot never pulls: the ring covers it at the first press (bleed comes before glue) — and that is the point: ink bleeds THROUGH glue where paper would stop it, and the second ring runs along the bottom row to her. gen.js B2 #2 (seed 23): len 18, wrong 14, dead 38% / 2 basins, before, phases 2, backs 1
    map: [
      '-------.',
      '-I-..---',
      'g.x--.-x',
      '-x-S.I.-',
      'G-x.-g--',
    ],
  },
  {
    id: 'pocket', tier: 'hard', chapter: 7, phases: 2, needs: ['needsFold', 'needsShade', 'needsRide', 'needsWet'],   // 7-5 · v4 (retune 2026-10-27, after the owner's playtest: 7-4's reversal held, everything else was cleared in one pass). 7-4 taught "ink spoils glue". Here the blot (7,2) is TWO squares from the glue (6,1), so the player reads the glue as dead and the (6,1) square as the paper doorway to her — close once, walk the stacks to the bottom-right ink, open, walk up. But the glue fires at the first press, before the ring arrives: the stone it pulls lands ON the doorway, and the ring that reaches (6,1) at the second press stops against it. Her only door is (4,1), entered from the (3,1)|(4,1) stack — so: close at the start (the stack walk crosses pages three times, through the right-edge prints and the (0,0)|(7,0) window that the second press shuts: before), lean to 50° at the top-left: the glued stone's NEW shadow (made) lies at (2,1) past the hole it left at (1,1); ride it to 80° onto (3,1), step to the island (3,2), close again and walk the stack to her door. Hunt from a hand seed (pred: glue fires before the ring, the glue-dead reading has its own shorter route, the real solution differs; glueFires but not needsGlue — the glue-dead board is solvable, that is the point): len 17, wrong 10, dead 41% / 1 basin, before, made, ride, phases 2, idle 68%, noise 1 (the (2,4) stone: a stone's back for the first close, decorative). A (2,0) paper variant (idle 60%) lets you walk onto the shadow at 80° without the ride — kept as a gap
    map: [
      '..-.xx.-',
      '-x--.Gg-',
      '-.-.--.I',
      '.-.---.-',
      '.-x-S.-.',
    ],
  },
  {
    id: 'through', tier: 'final', chapter: 7, backs: 2, phases: 3, needs: ['needsFold', 'needsFlip', 'needsWet'],   // 7-7 · final · v3 (retune 2026-10-26, after the owner's playtest cleared v2 in one pass): her letter is on the RIGHT page, so the turn is not the way to her — it is a press, and the third page's face is the only one whose stacks drop you onto the left page's far columns (7-5's window: the closed walk changes page only where the facing half is a gap; which half faces is yours to choose). Close on the back of the left stone (5,2); the stack walk lands on the left page through the (4,3) window — paper after any later press (before) — turn, walk the third page, open, close on the SAME stone's back from the third page, walk the stacks to the far corner (the (10,2) gap puts you on the left page where the right page's (6,2) paper would not), turn back, and the closed walk from (1,0) ends on her stack. Hunt from a hand seed (tools: /tmp/fold-tools/hunt.js, pred goal on the first spread + two turns): len 18, wrong 12, dead 42% / 2 basins, before, phases 4, backs 2, switches 4, noise 0
    map: [
      '..-.xG.-.--.',
      '.-x-Ix-x.---',
      '..x--...-.--',
      '.x-.--.S-.--',
    ],
  },
  // ---- Chapter 8 「灯位」 (docs/design-ch8.md): the lamp is on the LEFT bank — level.lamp 'L' (the flat left page's stones shade the
  // lifted page; shadows slide outward towards column 8 as the book closes) or 'LR' (two lamps, both sets). Tile A = angle gate: floor
  // only while the page leans. Vol. 2 finale: pays off the turn (6), glue (5) and wet ink (7) together. Main path: `chapter: 8`.
  {
    id: 'leftLamp', tier: 'teach', chapter: 8, lamp: 'L', needs: ['needsShade', 'needsLamp'],   // 8-1 · teaching · lean to 60°: the left page's stone shades the gap beside you on the lifted page — walk across it to her (a ride version, G one square further, scores 3 = easy; the slip 'lamp' shows the outward slide instead)
    map: [
      'x---S-G-',
      '--------',
    ],
  },
  {
    id: 'lift', tier: 'easy', chapter: 8, lamp: 'L', needs: ['needsFold', 'needsShade', 'needsRide', 'needsLamp'],   // 8-2 · the reverse ride: step onto the left stone's shadow at 50°, then OPEN to 70° — the shadow slides back towards the hinge and sets you on the hinge-side paper; close from there and the stack walk ends on her. gen.js S2 #1 (seed 2): len 8, wrong 11, backs 1
    map: [
      '..-.--..',
      '...x.-.S',
      '.x-G--.-',
    ],
  },
  {
    id: 'banks', tier: 'mid', chapter: 8, lamp: 'LR', needs: ['needsFold', 'needsShade', 'needsRide', 'needsLamp'],   // 8-3 · two lamps: the right page's stones shade the left page as always, the left page's stones shade the lifted page. The right-lamp shadows are the trap; the road is the left stone's shadow at 30°, ridden back to the hinge by opening to 60°, then one close and three stack switches to her. gen.js S3 #1 (seed 3): len 12, wrong 10, switches 3
    map: [
      '.-G----S',
      '.--.-.-.',
      '...x.x-.',
      '..x.--..',
    ],
  },
  {
    id: 'gate', tier: 'mid', chapter: 8, lamp: 'L', backs: 1, needs: ['needsFold', 'needsShade', 'needsLamp', 'needsGate'],   // 8-4 · the angle gate (A) stands only while the page leans: at 40° walk over the left stone's shadow and through the gate onto the paper above — in ONE lean, since the gate drops you if the lean ends — and close from there: that square is the back of the left page's stone, so you are inside a blocked stack and walk out of it. gen.js S4 #2 (seed 4): len 11, wrong 11, backs 1
    map: [
      'G.x.-.Ax',
      'x--.---.',
      '-..---.-',
      '....S...',
    ],
  },
  {
    id: 'taken', tier: 'hard', chapter: 8, lamp: 'LR', phases: 1, needs: ['needsFold', 'needsShade', 'needsRide', 'needsGlue', 'needsWet', 'needsLamp'],   // 8-6 · v2 (retune 2026-10-26): the glue takes the right stone — and the road you came on, the right-lamp shadow at (1,1) (before) — but under two lamps a stone that changes page changes bank: the same stone, now at (0,1), shades the LIFTED page at (6,1) (made, on the right page), and the first close also prints the ink onto (5,4), the last square before her. Ride the right stone's shadow up to (1,0) first, close there (the (0,0)|(7,0) stack is the only one that switches page), walk the hole the stone left at (7,1), ride the new shadow back towards the hinge to (5,1), down the paper to the print. Hunt from v1 (pred: a made shadow on the lifted page + wet): len 18, wrong 18 (first 7), dead 33% / 2 basins, before, made, phases 1, noise 0, irrelevant 0
    map: [
      '-.-----.',
      'g--.---x',
      '...--.--',
      '--.--.--',
      'S.IxG-.-',
    ],
  },
  {
    id: 'twolamps', tier: 'final', chapter: 8, lamp: 'LR', phases: 3, backs: 2, needs: ['needsFold', 'needsShade', 'needsGlue', 'needsFlip', 'needsWet', 'needsLamp'],   // 8-7 · final · v2 (retune 2026-10-26) · 卷二 finale. Close at once on the start — the back of the left stone (3,3): the glue (3,2) pulls the (4,2) stone across, and the hole it leaves is the road up the lifted page; at 50° the (1,0) stone's shadow waits at (5,0) and closing carries you out to (6,0) — the back of THAT stone — close there, walk out to (0,0) and turn. The turn is a press: the third page's glue (10,0) takes the (1,0) stone — the stone whose shadow you rode and whose back you closed on — so its shadow never appears on the third page; the shadow that bridges the third page's gap (8,2) is cast by the stone the FIRST close glued in at (3,2). The left-page ink (printed at the first close from (7,3)) climbs column 0 and keeps the (0,1)|(11,1) stack open after the turn. Hunt from v1 (pred: the turn fires a glue that takes a left stone): len 19, wrong 10, dead 20% / 10 basins, made, phases 3, backs 2, switches 4, noise 0, irrelevant 0
    map: [
      '.xx-.-.-G-g-',
      '----.-.-.---',
      '-A-gx--x--.-',
      '-.-xS-.I..-.',
    ],
  },
  // ---- vol. 3 「倾」 · Chapter 9 「滚」 (docs/design-vol3.md, docs/design-ch9.md): card paper. The loose stone `r` rolls one cell towards the crease
  // each time the lifted page passes upright (the hinge crosses 90°, closed or not); into a gap it drops and the gap is paper. Levels 9-1…9-7.
  {
    id: 'roll', tier: 'teach', chapter: 9, needs: ['needsRoll'],   // 9-1 · teaching · lean: the page passes upright and the loose stone rolls into the gap beside you — walk across to her. No close needed
    map: [
      '----G-rS',
      '--------',
    ],
  },
  {
    id: 'twice', tier: 'easy', chapter: 9, needs: ['needsRoll'],   // 9-2 · a lean that comes back is two passes: the stone is two squares from the gap beside you. Lean (it rolls one), flatten (it drops into the gap): the bridge to her is there without a close — and closing then opening would have been the same two passes
    map: [
      '-----.r-',
      '----S-.G',
    ],
  },
  {
    id: 'jump', tier: 'mid', chapter: 9, needs: ['needsFold', 'needsShade', 'needsRoll'],   // 9-3 · the shadow is where the stone WILL be: on the way to 50° the page passes upright and the far stone (7,3) rolls to (6,3), so its shadow falls on (2,3) — the gap you need — not on the paper at (1,3) the drawn stone would shade. Walk (3,2) over the near stone's shadow, down to (2,3), across to (1,3); flatten and close (passes 2 and 3 bring the far stone to (4,3)) and the stacks lead to her. hunt.js jump (seed 9): len 14, wrong 10, made, switches 3, noise 1 (the (5,1) stone drops into (4,1) at the first pass: visible, irrelevant)
    map: [
      '-S..--xG',
      '---.-r-.',
      '.---r---',
      '-.-....r',
    ],
  },
  {
    id: 'hold', tier: 'mid', chapter: 9, needs: ['needsFold', 'needsRoll'],   // 9-4 · your body holds a stone: stand at (5,0), crease-side of the upper loose stone, and lean and flatten — the LOWER stone rolls two squares to the crease while the upper one waits behind you; then step down to (6,1), close, and the stacks lead to her. Stand anywhere else and the upper stone rolls to (5,0)…(4,0) and walls the corridor. hunt.js hold (seed 10) #1, the left-page loose stone removed: len 13, wrong 11, rolls 3, noise 1
    map: [
      '-x-...r-',
      '......r-',
      '----.--.',
      '.---S-G-',
    ],
  },
  {
    id: 'late', tier: 'hard', chapter: 9, backs: 1, needs: ['needsFold', 'needsShade', 'needsRoll'],   // 9-5 · the crush map is the rolled board's, and so is the shadow map: at 60° the square (3,2) is shaded by the FAR stone — (7,2) after its roll to (6,2) — not by the near one (5,2 → 4,2, one square from the crease: no shadow yet at 60°). Stand on that shadow and close: the drawn board says the near stone comes down on you; the far stone's shadow carries you one square out, onto (2,2), and the near stone lands beside you. The stack walk puts you on the right page; flatten (the far stone rolls on), close again on the left stone's back, and the bottom stacks lead to her. hunt.js late (seed 9) #1: len 15, wrong 12, backs 1, made, noise 1 (the (6,0) stone: it drops into (5,0) at the first pass — visible, irrelevant)
    map: [
      '-..---rr',
      '..-.--.-',
      'Sx.-.r.r',
      '-----.--',
      '-.x.-.-G',
    ],
  },
  {
    id: 'order', tier: 'hard', chapter: 9, phases: 2, needs: ['needsFold', 'needsGlue', 'needsRoll'],   // 9-6 · the roll comes before the glue in the same close (7-4's reversal, on the hinge path): the glue at (2,0) faces paper, so it reads as dead; the glue at (1,0) faces the fixed stone (6,0) and takes it at the first close — and that opens the lane for the loose stone (7,0), which rolls to (6,0) on the way open and to (5,0) on the way to the SECOND close, where the "dead" glue takes it. Only then is the top stack (2,0)|(5,0) a wall that makes the stack walk land you on the right page's top corner, from which the bottom-right paper leads to her. hunt.js order (seed 9) #2, the left-page loose stone fixed as x (it never rolled): len 19, wrong 10, before, phases 2, rolls 3, fills 1, noise 0
    map: [
      '-ggS..xr',
      '..-..-x-',
      '---..-.-',
      '.--x-.r.',
      '---.---G',
    ],
  },
  {
    id: 'settle', tier: 'final', chapter: 9, phases: 1, needs: ['needsFold', 'needsShade', 'needsRide', 'needsGlue', 'needsRoll'],   // 9-7 · final · the glue (0,3) faces the loose stone (7,3): everyone who played chapter 5 expects the first close to take it. The roll comes first: on the way to the close the stone rolls to (6,3) and the glue takes nothing — it is the right page's glue (6,2) that fires, pulling the left stone (1,2) across (before: close anywhere first and that pull is spent in the wrong place). Walk the stacks to the left page's top corner, lean to 40°: the glued-in stone's new shadow (made) carries you down the left page; close from (3,4), walk the stacks to the right page's bottom row — and then OPEN FLAT: that opening is one more pass, and the far stone drops into (5,3), the last square of the road to her. Open only partway and the road never appears. gen.js E #1 (seed 95), the (1,0) stone stripped: len 21, wrong 12, before, made, ride, phases 1, rolls 2, fills 1, noise 1
    map: [
      '...-...-',
      '..-..xr-',
      'rx--S-gG',
      'gr----.r',
      '.--.-.--',
    ],
  },
  // ---- vol. 3 「倾」 · Chapter 10 「鹤」 (docs/design-vol3.md §1.2, docs/design-ch10.md): the paper crane `h` is floor; at EVERY press it flies to its
  // mirror cell (after the roll of the sweep, the bleed, the keys, the ink and the glue) and carries whoever stands on it. Levels 10-1…10-6.
  {
    id: 'crane', tier: 'teach', chapter: 10, needs: ['needsFold', 'needsCrane'],   // 10-1 · teaching · stand on the crane and close: at the press it flies to the mirror square on the facing page and you with it; open, and she is one step below you. Every stack is two-sided, so the stack walk never changes page: only the crane does
    map: [
      'S.h.....',
      '--x--G--',
    ],
  },
  {
    id: 'land', tier: 'easy', chapter: 10, needs: ['needsFold', 'needsCrane'],   // 10-2 · the crane comes to you: you are on the left page, it is on the right. Close (standing anywhere but (2,0): the (5,0) stone comes down there): it flies to its mirror square on YOUR page — the gap between you and her — and where it lands is floor. Open and walk across. The (5,0) stone blocks the (2,0) stack and the (1,1) stone the (1,1) stack, so the closed walk never reaches her corner; the (5,0) stone's shadow only ever falls on paper
    map: [
      'G-...xh.',
      '-x.S....',
    ],
  },
  {
    id: 'cross', tier: 'mid', chapter: 10, needs: ['needsFold', 'needsShade', 'needsRide', 'needsCrane'],   // 10-3 · fly first, then ride: the crane puts you on the LEFT page, where the right page's stones throw their shadows. Close on the crane (6,2) → (1,2); lean to 50°: the (6,1) stone shades the gap (2,1), step on; open to 80° and the shadow carries you to (3,1), one step below her (her stack is blocked by the (4,0) stone). gen.js search (seed 7) #1, the (0,2) decoy stone stripped: len 16, wrong 13, ride, noise 0
    map: [
      '---Gx...',
      '-.--..x.',
      '----.-h.',
      '.---.S--',
    ],
  },
  {
    id: 'ground', tier: 'hard', chapter: 10, phases: 1, needs: ['needsFold', 'needsRoll', 'needsCrane'],   // 10-4 · hard · the landing is free before the close; at the press the stone gets there first. The crane (2,0) faces (5,0), paper, with the loose stone (6,0) one square outward: close on the crane from flat and the pass of that close rolls the stone onto the landing — the crane stays and the stone comes down on you. Lean to 55° (pass 1: every loose stone rolls one; the rolled (4,4) stone's shadow at (3,4) and the (5,2) stone's at (3,2) lead round to the top-left corner), stand on the crane, FLATTEN (pass 2: the (5,0) stone drops into the (4,0) gap, the one behind rolls to (5,0)), then close (pass 3: it rolls on to (4,0), the landing is free, the crane carries you to (5,0)); walk the stacks to (6,2), open, one step down to her. The second crane (3,0) is the decoy whose landing (4,0) the stones fill and then occupy. hunt.js ground (seed 11) #2, the left-page loose stone fixed as x: len 18, wrong 22, before, made, rolls 3, noise 1
    map: [
      '..hh-.rr',
      '..--.--r',
      '...-.x.-',
      '-x-..-G-',
      'S..-.r--',
    ],
  },
  {
    id: 'soak', tier: 'hard', chapter: 10, phases: 2, needs: ['needsFold', 'needsWet', 'needsCrane'],   // 10-5 · hard · ink is faster than the crane (7-4's order, with a new victim): the left crane (2,3) faces the gap (5,3), and 10-2 says it will land there — but the wet ink (5,4) bleeds into that gap at the same press, before the crane flies: the crane is soaked and stays, as wet ink. Ride the right crane (7,1) to (0,1), cross the (7,0) stone's 30° shadow at (1,0) to (2,0) and close again: the soaked crane bleeds a ring — (3,3) is paper now — and the 70° shadow at (3,0) leads down column 3 to her. hunt.js soak (seed 3) #1: len 19, wrong 12, phases 2, carries 1, noise 0
    map: [
      '.-.-...x',
      '---..-.h',
      '---..S--',
      'x-h-.---',
      '.x-GxI.-',
    ],
  },
  {
    id: 'over', tier: 'final', chapter: 10, phases: 3, backs: 1, needs: ['needsFold', 'needsFlip', 'needsCrane'],   // 10-6 · final · the turn is a press too. Close on the back of the left stone (3,3) from (4,3): the crane (2,0) flies to (5,0) on the right page; walk the stacks to that stack and you stand on it. Open a little and close again: it carries you BACK to the left page (2,0) — the book can only be turned from the left page (ch. 6), and the crane is the only way there. Turn: the turn is a press, the crane flies to the third page's (5,0)·T — a gap, so it is floor — with you; open and walk to her. hunt.js over (seed 3) #1, the (0,1) and (8,2) decoy stones stripped: len 19, wrong 11, carries 2, phases 3, backs 1, noise 0
    map: [
      '.xh-.--S--.-',
      '.---..-.--..',
      '..-.--...--G',
      '.--x....-..-',
    ],
  },
  // ---- vol. 3 「倾」 · Chapter 11 「来回」 (docs/design-vol3.md §1.3, docs/design-ch11.md): no new tile. Passes (the hinge crossing 90°) and presses (a close or a
  // turn) are bought apart: a lean that comes back is two passes and no press (fro); opening a closed book only to a lean and closing it again is two presses and no pass (hover). Levels 11-1…11-5.
  {
    id: 'fro', tier: 'easy', chapter: 11, fros: 1, needs: ['needsRoll', 'needsFro'],   // 11-1 · easy (scores 6: the glue trap is a dead state, 33%) · lean and lay it flat: two passes, no press — the stone rolls to (5,0), the square the glue (2,0) faces, and on into the gap (4,0). Close and open instead and the press between the two passes glues it at its first stop: the gap stays a gap. Hand-drawn (the fro slip)
    map: [
      '.-g--.rS',
      '----G--.',
    ],
  },
  {
    id: 'still', tier: 'mid', chapter: 11, lamp: 'L', needs: ['needsFold', 'needsLamp', 'needsRoll'],   // 11-2 · the left lamp's shadows do not move: they are cast by left-page stones, which never roll, onto the lifted page, where the loose stones do. Lean to 50° on (5,0): the shadows on the right page are where the drawn board puts them, and the road along them to (6,2) is clear only because the (6,2) stone rolled off it at the same pass; flatten (pass 2), close from (5,2), the stacks lead to her. hunt.js still (seed 1) #1, left-page loose stones drawn as x: len 12, wrong 11, noise 0
    map: [
      'x---S.-.',
      '..-----.',
      'x.x-..r.',
      '.-.-G---',
    ],
  },
  {
    id: 'hover', tier: 'hard', chapter: 11, needs: ['needsFold', 'needsRoll', 'needsCrane', 'needsHover'],   // 11-3 · hard · open a little and close again: two presses, NO pass. Lean (the one pass of the level), walk onto the crane (7,2), close: it carries you to (0,2). Every opening since chapter 9 went flat — here opening flat rolls the loose stones onto the squares you need. Open only to 30°, walk to the crane that flew to (2,3), close again: it carries you to (5,3); open to 55° and step down to her. Two hovers, one pass. hunt.js hover (seed 2) #1, the left-page loose stone drawn as x: len 17, wrong 17, noise 0
    map: [
      '----..-r',
      '---..--.',
      '----S--h',
      '.-..xhr.',
      '-.x-G.--',
    ],
  },
  {
    id: 'past', tier: 'hard', chapter: 11, fros: 1, needs: ['needsFold', 'needsRoll', 'needsFro'],   // 11-4 · hard · the press is the trap: the right page's glue (7,0)/(7,2) faces left stones, and every close takes them. The stones (6,3)(7,3) must roll before the first press — lean to 55° from (7,2), walk down to (7,3), lay it flat (two passes, nothing pressed), then close once from (6,3) and walk the stacks to (1,2); lean to 80°, and she is two steps away. hunt.js frog (seed 1) #1: len 19, wrong 18, before, made, backs 1, noise 1 (the (1,3) stone)
    map: [
      'x..--..g',
      '.--GxS-.',
      'x.-----g',
      '-x-.--rr',
    ],
  },
  {
    id: 'park', tier: 'final', chapter: 11, needs: ['needsFold', 'needsFlip', 'needsRoll', 'needsFro'],   // 11-5 · final · after the turn the lifted page is the THIRD page: its loose stones roll and the right page's stand still (the back of the leaf never stands up). Stand the book up once at (6,2) (90°: the right page's stones roll one), close from (5,1), walk the stacks to (3,0), turn; open flat, lean to 30° and lay it flat again — two more passes, all of them the third page's — and the road to her (6,2)·T is filled. hunt.js turn (seed 2) #1, left-page loose stones drawn as x: len 20, wrong 11, backs 1, noise 0
    map: [
      '.....-.r-..r',
      '.-x--.-r.--.',
      'x-----...-G.',
      'x-.--S.---.-',
    ],
  },
  // ---- vol. 3 chapter 12 「三折」 (docs/design-ch12.md): the third page on its own crease at the right page's outer edge ----
  {
    id: 'home', tier: 'teach', chapter: 12, trifold: true, needs: ['needsTrifold'],   // 12-1 · teach · two mirrors bring a column home: she is on the third page at (9,1), home column 1. Close the book as it is and the third page swings out past your page onto the table — she goes with it. Fold the third page onto the right page first, then close: the left page meets the third page, and stack 1 row 1 has her on top. The single mirror (6,1) is paper on the right page — the vol. 1 answer, and she is not there. The loose stone (8,2) is the chapter's second lesson, shown, not needed: on that first, failing close the third page lifts WITH the right page (one stiff leaf) and the stone rolls over the second crease into the right page's gap (7,2); fold the third page first and the same close rolls it the other way, to (9,2) — 12-3 「回」 is built on both. Hand-drawn
    map: [
      'S..--..-.--.',
      '-.-..-.-.G-.',
      '..-.-..-r..-',
    ],
  },
  {
    id: 'hole', tier: 'mid', chapter: 12, trifold: true, needs: ['needsTrifold'],   // 12-2 · the folded third page covers the right page — except through its holes. She is on the right page at (4,1) and the right page is in pieces. Fold the third page over: it bridges the gaps, and standing on (11,1) you are right over her — on the third page, under which she is. Lay it flat from there and you are out on the third page. The way is round the folded leaf to (6,2), which is the RIGHT page seen through the third page's hole (9,2): lay the third page flat from there and you are on the right page, past its gaps; close, the stacks lead to her. hunt.js hole seed 2 #4 (start moved by the hunt to (7,0)): len 17, wrong 13, dead 22%, noise 1 (the (0,1) stone makes the crush basin)
    map: [
      '...--..S.---',
      'x.x-G--.x-..',
      '.x-.--.-.--.',
      '-..-.----...',
    ],
  },
];

if (typeof module !== 'undefined') module.exports = LEVELS;
