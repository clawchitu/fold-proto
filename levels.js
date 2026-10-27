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
    id: 'pocket', tier: 'hard', chapter: 7, backs: 1, phases: 2, needs: ['needsFold', 'needsWet'],   // 7-5 · the first ring opens the road up the right page to column 6, row 2 — the square on the back of the left page's stone. Close there and you stand inside a blocked stack; one step left is a stack whose right half is still a gap, so it puts you down in the pocket (left page). The pocket has no opening: lean to 30° and the stone's shadow lies on the gap beside her. Hand-drawn (J17; (0,3) stone stops the ink climbing column 1 from the bottom prints, which let a five-close brute force walk the stacks to her): len 15, wrong 8, phases 2, backs 1, idle 70%; the stone at (1,2) seals the pocket's side so three or four closes cannot grow a way in — the ring reaches column 6, row 2 at the fourth press and the window stack is then paper on both halves
    map: [
      'G-----x-',
      '-.x--.--',
      '-x--..--',
      'x---.x-S',
      '----.I-.',
    ],
  },
  {
    id: 'through', tier: 'final', chapter: 7, backs: 1, phases: 3, needs: ['needsFold', 'needsFlip', 'needsWet'],   // 7-7 · final · close once (the ink prints the road down the right page), close a second time standing on the back of the left page's stone (7,3) — inside the blocked stack, one step left is the only square of the left page you can reach — and turn the book from there: the turn is the third press, the third ring bleeds and prints onto the third page, and only a three-ring print opens the stacks to her. The glance sheet prints the third page after close → turn (two rings), never after close → open → close → turn. Hand-drawn (F7b): len 19, wrong 9, dead 17% / 3 basins, phases 3, backs 1, idle 79% (three-page limit 80%)
    map: [
      '----...SG.--',
      '----.-----..',
      '.x----------',
      'x.-I--..----',
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
    id: 'taken', tier: 'hard', chapter: 8, lamp: 'LR', phases: 1, needs: ['needsFold', 'needsShade', 'needsRide', 'needsLamp'],   // the glue is the trap, not the tool (check.js: glueFires, not needsGlue): it fires at the first close whatever you do, and takes the left-page road away   // 8-6 · two lamps + glue: cross the left page at 50° on the right stones' shadows to the glue's corner, close — the glue pulls the (7,1) stone across, which TAKES AWAY the shadow you came on (before) — and the stack walk puts you on the right page; there the left stone's shadow at 40° and a reverse ride to 60° reach her. gen.js S6 #2 (seed 6): len 15, wrong 17, dead 30% / 2, before, phases 1. glance: 1/1 one-shot 2026-10-26 (kept for its aha, design-ch8.md §3.2)
    map: [
      '-.-..-x-',
      'g-x.-..x',
      '.-S.-x.-',
      'x--.g--.',
      '.----G--',
    ],
  },
  {
    id: 'twolamps', tier: 'final', chapter: 8, lamp: 'LR', phases: 3, backs: 1, needs: ['needsFold', 'needsShade', 'needsGlue', 'needsFlip', 'needsWet', 'needsLamp', 'needsGate'],   // 8-7 · final · 卷二 finale. First close (from the right page's top corner): both glues fire at once — the right page's stone comes to the left page (and becomes a stone's back + a left-lamp shadow), the left page's stone goes to the right page (its left-page shadow is gone). Lean to 30° and walk the lifted page over the left stone's shadow to the square the glue just emptied: it is now the back of the glued-in stone. Close there — inside a blocked stack — step out to the left page and turn the book: the turn is the third press, the third page's wet ink bleeds, and the stack walk lands on a square that is wet only after the turn. Lean to 50°: the left page's stones shade the third page and bridge the last gap to her. The gate stands only in the lean and seals the flat shortcut. gen.js S7 #1 (seed 7, from a hand seed) polished, the left-page glue decoy removed by hand (the left-page wet ink stays: it is what makes the second close change the board — without it wrong drops from 11 to 1): len 19, wrong 11, dead 18% / 4, phases 3, backs 1, switches 2, noise 1. glance: 1/1 one-shot 2026-10-26 (the reader wrote the intended route; kept for its aha, see design-ch8.md §3.2)
    map: [
      '.x.gx.-.G---',
      '.x-.--g.--.-',
      '.-A--...-I--',
      '--I..S...---',
    ],
  },
];

if (typeof module !== 'undefined') module.exports = LEVELS;
