// Levels as data. Each map row is 8 columns: 4 on the left page | 4 on the right page.
// Column c on the right lands on column 7-c on the left when the book closes.
// Legend: - empty  . paper  S start  G goal  x stone  k key  D door  i ink  p pop-up tab
// A stone on the right page casts a shadow onto the left page while the book leans (91°–154°);
// the shadow is walkable and slides towards the stone's mirror cell as the book closes.
const LEVELS = [
  {
    name: '桥',
    line: '缺口的对面，有一块纸板。',
    hint: '合上手机，右边的纸板会正好盖住缺口。',
    map: [
      '-S------',
      '-.------',
      '------.-',
      '-.------',
      '-G------',
    ],
  },
  {
    name: '对页',
    line: '终点在另一页。',
    hint: '合上，走到右页的路上；石头挡住了，就展开继续走。',
    map: [
      '-----..G',
      '-----.--',
      '--x--.--',
      'S.---.--',
    ],
  },
  {
    name: '往返',
    line: '过去，再回来。',
    hint: '合上过去，展开走一段，再合上回到左页。',
    map: [
      'S.---.--',
      '--x--.--',
      '-----..-',
      '-.----.-',
      '-G------',
    ],
  },
  {
    name: '钥匙',
    line: '门锁着，钥匙在对页。',
    hint: '钥匙和门左右对称。合上，它们就碰到了。',
    map: [
      '-S------',
      '-.------',
      '-D----k-',
      '-.------',
      '-G------',
    ],
  },
  {
    name: '墨',
    line: '墨还没干。',
    hint: '合上一次，墨会印到右页的缺口上；展开后它还在。',
    map: [
      '--------',
      '----G---',
      '-xix.-..',
      '-------S',
    ],
  },
  {
    name: '立',
    line: '合上也过不去。',
    hint: '把手机打开到一半，折痕上的纸片会立起来，连成一座桥。',
    map: [
      '-----..G',
      '--x--.--',
      'S..pp.--',
      '--------',
    ],
  },
  {
    name: '门与桥',
    line: '先开门，再过桥。',
    hint: '先合上让钥匙开门，再打开到一半，从立起的纸片走过去。',
    map: [
      'S.kppD.-',
      '-x----.-',
      '------.G',
      '--------',
    ],
  },
  {
    name: '墨与桥',
    line: '桥的那头，路断了；终点被压住了。',
    hint: '合上时石头会压住终点，所以只合一下：让墨印过去，再半开过桥。',
    map: [
      '--------',
      '-Sipp---',
      '--x--G--',
      '--------',
    ],
  },
  {
    name: '折痕',
    line: '用上你学会的一切。',
    hint: '先合上一次，钥匙和墨都印过去；再半开过桥，走到门边，最后合上。',
    map: [
      'G.------',
      '-k----D-',
      '--xi-..-',
      '---..---',
      '--Spp---',
    ],
  },
  {
    name: '影',
    line: '合上也过不去。可是石头有影子。',
    hint: '把书慢慢合到一半多一点，右页石头的影子会落在缺口上。影子能走。',
    map: [
      '-S------',
      '-.------',
      '-------x',
      '-.------',
      '-G------',
    ],
  },
  {
    name: '乘影',
    line: '缺口太宽，影子太短。',
    hint: '站到影子上，再慢慢合书：影子会带着你一起滑过去。合到底石头就压下来了。',
    map: [
      'G.------',
      '-.------',
      '---S---x',
      '--------',
    ],
  },
];

if (typeof module !== 'undefined') module.exports = LEVELS;
