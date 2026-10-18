// Fold — every user-facing string, in 简体中文 / English / 日本語 / 한국어. No library.
// t(key, params): '{name}' is replaced by params.name. Korean particles follow the word:
// '{noun:이}' gives 이 or 가, '{col:을}' 을/를, '{pos:으로}' 으로/로, after checking the final consonant.
// Static markup uses data-i18n (text), data-i18n-label (aria-label), data-i18n-title (title).
(() => {
  const TAG = { zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko' };

  const S = {
    zh: {
      title: '折 · 折信', brandSub: '折信', langGroup: '语言', langName: '中文', langSet: '已切换为中文',
      suggest: '读屏或闭眼玩？按这里开启声音模式',
      navGame: '游戏', levels: '关卡', hint: '提示', reset: '重来', a11y: '无障碍',
      dragCrease: '拖动折痕', gridLabel: '书页：第1到4列是左页，第5到8列是右页',
      gridHelp: '第4列和第5列之间是折痕，合上时右页翻到左页上：第5列叠在第4列，第8列叠在第1列。方向键听每一格，回车走过去，F 折一点，Shift 加 F 展开一点，H 提示，R 重来，U 撤销，问号听全部按键。',
      'mode.open': '打开', 'mode.pop': '立起', 'mode.lean': '斜起', 'mode.fold': '合上',
      audioBadge: '声音模式', coachSlider: '拖到合上', foldAngle: '折叠角度',
      'pre.open': '展开', 'pre.half': '半开', 'pre.close': '合上', tilt: '体感', tiltOn: '体感：开',
      bbFold: '折书', foldLess: '展开一点', foldMore: '折一点', openAll: '打开', closeAll: '合上', undo: '撤销',
      foldLessLabel: '展开一点', foldMoreLabel: '折一点',
      bbWalk: '走一步', left: '左', up: '上', down: '下', right: '右',
      stepLeft: '向左走一步', stepUp: '向上走一步', stepDown: '向下走一步', stepRight: '向右走一步',
      'bb.row': '听一行', 'bb.rowLabel': '听一行', 'bb.where': '我在哪', 'bb.whereLabel': '我在哪',
      done: '关闭', on: '开', off: '关',
      'opt.audio': '声音模式', 'opt.speak': '语音朗读', 'opt.hc': '高对比', 'opt.big': '大格子', 'opt.motor': '大按钮',
      'desc.audio': '每格有音高和音色，闭眼也能玩（M）', 'desc.speak': '没有读屏软件时，用系统语音读出提示',
      'desc.hc': '粗边框、花纹，不只靠颜色', 'desc.big': '放大方块', 'desc.motor': '折一点、展开一点、走一步、撤销',
      you: '你', goalTag: '终点', tapTip: '点格子走过去',
      levelHead: '{n} / {total} · {name}', levelDone: '「{name}」完成',
      allDone: '全部完成。等 Duo 到了，用真的折痕再玩一次。', next: '下一关', first: '回到第一关',
      crushed: '石头压下来了，重新开始', fell: '影子走了，纸人掉了下去',
      tiltDenied: '没有获得体感权限', tiltHow: '左右倾斜手机来折叠',
      // separators
      sep: '，', list: '、', semi: '；',
      // the ARIA grid
      pos: '第{r}行第{c}列', col: '第{c}列',
      'kind.-': '缺口', 'kind..': '路', 'kind.G': '终点', 'kind.x': '石头', 'kind.k': '钥匙', 'kind.D': '锁着的门',
      'kind.o': '开着的门', 'kind.i': '湿墨', 'kind.p': '纸片', kindShadow: '影子，可以走', kindTabUp: '纸片，立着成桥',
      'noun..': '纸板', 'noun.G': '终点', 'noun.k': '钥匙', 'noun.o': '门', 'noun.D': '门', 'noun.i': '湿墨', 'noun.p': '纸片', 'noun.x': '石头',
      hereYou: '你在这里', hereStack: '你在这一叠',
      fallsHere: '合上后对面的{noun}会落在这里', doorKey: '对面是钥匙，合上就能开门', crushedHere: '合上会被对面的石头压住',
      inkPrints: '合上会印到对面', tabBridge: '书半开时，和对面的纸片立成桥',
      stoneShadow: '斜起时投下影子；合上会压住{col}', keyOpens: '合上能打开{col}的门', inkTo: '合上会印到{col}', covers: '合上后盖住{col}的缺口',
      // announcements
      optOn: '{name}已开启', optOff: '{name}已关闭',
      audioIntro: '。左页是木头声，右页是纸声，越靠上的行音越高；左页在左耳，右页在右耳。方向键听每一格，回车走过去，F 折一点，Shift 加 F 展开一点。按问号听全部按键。',
      needAudio: '先按 M 开启声音模式',
      'book.closed': '书已合上', 'book.pop': '书立起来了，{a}°', 'book.popBridge': '书立起来了，{a}°，纸片立成了桥',
      'book.opened': '书已打开', 'book.lean': '书斜起，{a}°', 'book.open': '书打开，{a}°', angle: '{a}°',
      connected: '路接通了', lost: '有的路断了', doorOpened: '钥匙打开了门', inkPrinted: '墨印到了对页',
      shadowOn: '影子落在{cells}', shadowGone: '影子没了',
      intro: '第{n}关，{name}。{line}你在{you}，终点在{goal}。书是打开的。', elsewhere: '别处',
      stack: '（右页，叠在第{c}列上）', already: '你已经在{pos}', arrived: '到了，{pos}', cantReach: '现在走不到那里',
      'no.step': '走不过去', 'no.edge': '到书边了', 'no.crease': '前面是折痕', 'no.stone': '石头挡住了', 'no.door': '门锁着', 'no.gap': '那边是缺口',
      slid: '影子带着你滑到了{pos}', undone: '已撤销。你在{pos}，书{a}°', win: '过关！{text}。按回车：{next}',
      'dir.left': '左', 'dir.right': '右', 'dir.up': '上', 'dir.down': '下', goalSteps: '{dir}{n}格',
      goal: '终点在{opp}{bits}', goalOpp: '对页，', here: '这里',
      where: '你在{pos}，{page}。能走：{ways}。书{a}°。{goal}', leftPage: '左页', rightPage: '右页', nowhere: '哪里都不行',
      nothingToUndo: '没有可以撤销的',
      suggestToast: '闭着眼也能玩：按 M 开启声音模式，按问号听按键说明',
      lvAria: '第{n}关，{name}', lvDone: '已完成', lvCurrent: '当前',
      help: '方向键：在格子间移动并听每一格。回车：走到这一格。Shift 加方向键：走一步。F：折一点；Shift 加 F：展开一点；C：合上；O：打开。L：听这一行；Shift 加 L：听整本书。W：我在哪。H：提示。U：撤销。R：重来。M：声音模式。',
      // chapter 3 「影」 (docs/design-ch3.md): opener, paper state, VoiceOver, the third letter
      'ch.3.line': '影子也是路。', 'paper.ch3': '背光的纸，影子能走。', 'paper.lit': '这页纸举到了灯前',
      'teach.lean': '书可以停在立起和合上之间的任何地方', shadowGap: '影子盖住了第{c}列的缺口',
      'letter.3.title': '左岸来信', 'letter.3.body': '灯在你那岸。\n你的石头把影子递过河来，\n我踩着它，又近了一点。', 'letter.3.sign': '——左岸',
    },

    en: {
      title: '折 · Letterfold', brandSub: 'Letterfold', langGroup: 'Language', langName: 'English', langSet: 'Language: English',
      suggest: 'Screen reader, or eyes closed? Turn on sound mode here',
      navGame: 'Game', levels: 'Levels', hint: 'Hint', reset: 'Restart', a11y: 'Accessibility',
      dragCrease: 'Drag the crease', gridLabel: 'Book: columns 1 to 4 are the left page, 5 to 8 the right page',
      gridHelp: 'The crease runs between columns 4 and 5. Closing lays the right page over the left: column 5 on column 4, column 8 on column 1. Arrow keys hear each square, Enter walks there, F folds a step, Shift+F unfolds a step, H hint, R restart, U undo, question mark for every key.',
      'mode.open': 'Open', 'mode.pop': 'Standing', 'mode.lean': 'Leaning', 'mode.fold': 'Closed',
      audioBadge: 'Sound mode', coachSlider: 'Drag to close', foldAngle: 'Fold angle',
      'pre.open': 'Open', 'pre.half': 'Half', 'pre.close': 'Close', tilt: 'Tilt', tiltOn: 'Tilt: on',
      bbFold: 'Fold the book', foldLess: 'Unfold', foldMore: 'Fold', openAll: 'Open', closeAll: 'Close', undo: 'Undo',
      foldLessLabel: 'Unfold a step', foldMoreLabel: 'Fold a step',
      bbWalk: 'Take a step', left: 'Left', up: 'Up', down: 'Down', right: 'Right',
      stepLeft: 'Step left', stepUp: 'Step up', stepDown: 'Step down', stepRight: 'Step right',
      'bb.row': 'Row', 'bb.rowLabel': 'Hear this row', 'bb.where': 'Where', 'bb.whereLabel': 'Where am I',
      done: 'Done', on: 'On', off: 'Off',
      'opt.audio': 'Sound mode', 'opt.speak': 'Read aloud', 'opt.hc': 'High contrast', 'opt.big': 'Large squares', 'opt.motor': 'Big buttons',
      'desc.audio': 'Every square has its own pitch and timbre: play with your eyes closed (M)', 'desc.speak': 'Speak hints in the system voice when no screen reader is running',
      'desc.hc': 'Bold outlines and patterns, never colour alone', 'desc.big': 'Bigger tiles', 'desc.motor': 'Fold, unfold, step and undo, one press at a time',
      you: 'You', goalTag: 'Goal', tapTip: 'Tap to walk',
      levelHead: '{n} / {total} · {name}', levelDone: '“{name}” solved',
      allDone: 'All done. When the Duo arrives, play it again on a real crease.', next: 'Next level', first: 'Back to level 1',
      crushed: 'The stone came down. Starting over.', fell: 'The shadow slipped away, and the paper figure fell.',
      tiltDenied: 'Motion access was not granted', tiltHow: 'Tilt the phone left and right to fold',
      sep: ', ', list: ', ', semi: '; ',
      pos: 'row {r}, column {c}', col: 'column {c}',
      'kind.-': 'gap', 'kind..': 'path', 'kind.G': 'goal', 'kind.x': 'stone', 'kind.k': 'key', 'kind.D': 'locked door',
      'kind.o': 'open door', 'kind.i': 'wet ink', 'kind.p': 'tab', kindShadow: 'shadow, walkable', kindTabUp: 'tab, standing as a bridge',
      'noun..': 'card', 'noun.G': 'goal', 'noun.k': 'key', 'noun.o': 'door', 'noun.D': 'door', 'noun.i': 'wet ink', 'noun.p': 'tab', 'noun.x': 'stone',
      hereYou: 'you are here', hereStack: 'you are on this stack',
      fallsHere: 'closing lays the {noun} opposite here', doorKey: 'the key is opposite: close to open the door', crushedHere: 'closing, the stone opposite covers this',
      inkPrints: 'closing prints it onto the facing page', tabBridge: 'half open, it stands with the tab opposite as a bridge',
      stoneShadow: 'casts a shadow while leaning; closing covers {col}', keyOpens: 'closing opens the door in {col}', inkTo: 'closing prints it onto {col}', covers: 'closing covers the gap in {col}',
      optOn: '{name} on', optOff: '{name} off',
      audioIntro: '. The left page sounds like wood, the right like paper; higher rows ring higher. Left page in your left ear, right page in your right. Arrow keys hear each square, Enter walks there, F folds a step, Shift+F unfolds a step. Press question mark for every key.',
      needAudio: 'Press M to turn on sound mode first',
      'book.closed': 'book closed', 'book.pop': 'book standing, {a}°', 'book.popBridge': 'book standing, {a}°, the tabs make a bridge',
      'book.opened': 'book open', 'book.lean': 'book leaning, {a}°', 'book.open': 'book open, {a}°', angle: '{a}°',
      connected: 'a path connects', lost: 'some paths broke', doorOpened: 'the key opened the door', inkPrinted: 'the ink printed onto the facing page',
      shadowOn: 'shadow on {cells}', shadowGone: 'the shadow is gone',
      intro: 'Level {n}, {name}. {line} You are at {you}; the goal is at {goal}. The book is open.', elsewhere: 'somewhere else',
      stack: ' (right page, stacked on column {c})', already: 'you are already at {pos}', arrived: 'arrived, {pos}', cantReach: 'you cannot get there right now',
      'no.step': 'cannot go that way', 'no.edge': 'edge of the book', 'no.crease': 'the crease is in the way', 'no.stone': 'a stone is in the way', 'no.door': 'the door is locked', 'no.gap': 'that is a gap',
      slid: 'the shadow carried you to {pos}', undone: 'Undone. You are at {pos}, book at {a}°', win: '{text}. Press Enter: {next}',
      'dir.left': 'left', 'dir.right': 'right', 'dir.up': 'up', 'dir.down': 'down', goalSteps: '{n} {dir}',
      goal: 'The goal is {opp}{bits}', goalOpp: 'on the facing page, ', here: 'here',
      where: 'You are at {pos}, {page}. You can go: {ways}. Book at {a}°. {goal}.', leftPage: 'left page', rightPage: 'right page', nowhere: 'nowhere',
      nothingToUndo: 'nothing to undo',
      suggestToast: 'You can play with your eyes closed: M for sound mode, question mark for the keys',
      lvAria: 'level {n}, {name}', lvDone: 'solved', lvCurrent: 'current',
      help: 'Arrow keys: move between squares and hear each one. Enter: walk to that square. Shift+arrow: take one step. F: fold a step; Shift+F: unfold a step; C: close; O: open. L: hear this row; Shift+L: hear the whole book. W: where am I. H: hint. U: undo. R: restart. M: sound mode.',
      'ch.3.line': 'Shadows are paths too.', 'paper.ch3': 'Paper held to the lamp; shadows can be walked on.', 'paper.lit': 'The page is held up to the lamp',
      'teach.lean': 'The book can rest anywhere between standing and closed', shadowGap: 'a shadow covers the gap in column {c}',
      'letter.3.title': 'A Letter from the Left Bank', 'letter.3.body': 'The lamp is on your bank.\nYour stones passed their shadows across the river,\nand I walked on them,\na little closer.', 'letter.3.sign': '— the Left Bank',
    },

    ja: {
      title: '折 · 折り文', brandSub: '折り文', langGroup: '言語', langName: '日本語', langSet: '日本語に切り替えました',
      suggest: 'スクリーンリーダーで、または目を閉じて遊ぶ？ ここでサウンドモードをオン',
      navGame: 'ゲーム', levels: 'ステージ', hint: 'ヒント', reset: 'やり直し', a11y: 'アクセシビリティ',
      dragCrease: '折り目をドラッグ', gridLabel: '本：1〜4列が左ページ、5〜8列が右ページ',
      gridHelp: '4列と5列のあいだが折り目。閉じると右ページが左ページに重なり、5列は4列に、8列は1列に重なります。矢印キーで各マスを聴き、Enterで歩き、Fで少し折り、Shift+Fで少し開きます。Hはヒント、Rはやり直し、Uは戻す、?ですべてのキー。',
      'mode.open': '開いた', 'mode.pop': '立った', 'mode.lean': '傾いた', 'mode.fold': '閉じた',
      audioBadge: 'サウンドモード', coachSlider: 'ドラッグして閉じる', foldAngle: '折る角度',
      'pre.open': '開く', 'pre.half': '半開き', 'pre.close': '閉じる', tilt: '傾き', tiltOn: '傾き：オン',
      bbFold: '本を折る', foldLess: '少し開く', foldMore: '少し折る', openAll: '開く', closeAll: '閉じる', undo: '戻す',
      foldLessLabel: '少し開く', foldMoreLabel: '少し折る',
      bbWalk: '一歩', left: '左', up: '上', down: '下', right: '右',
      stepLeft: '左へ一歩', stepUp: '上へ一歩', stepDown: '下へ一歩', stepRight: '右へ一歩',
      'bb.row': '行を聴く', 'bb.rowLabel': '行を聴く', 'bb.where': '現在地', 'bb.whereLabel': '現在地',
      done: '閉じる', on: 'オン', off: 'オフ',
      'opt.audio': 'サウンドモード', 'opt.speak': '読み上げ', 'opt.hc': 'ハイコントラスト', 'opt.big': '大きなマス', 'opt.motor': '大きなボタン',
      'desc.audio': 'マスごとに音の高さと音色。目を閉じても遊べる（M）', 'desc.speak': 'スクリーンリーダーがなくても、システムの声でヒントを読み上げる',
      'desc.hc': '太い枠と模様。色だけに頼らない', 'desc.big': 'マスを大きく', 'desc.motor': '少し折る・少し開く・一歩・戻す',
      you: 'あなた', goalTag: 'ゴール', tapTip: 'タップで歩く',
      levelHead: '{n} / {total} · {name}', levelDone: '「{name}」クリア',
      allDone: 'すべてクリア。Duoが届いたら、本物の折り目でもう一度。', next: '次のステージ', first: '最初のステージへ',
      crushed: '石が落ちてきた。最初から', fell: '影が去り、紙の人は落ちた',
      tiltDenied: 'モーションの許可が得られませんでした', tiltHow: 'スマホを左右に傾けて折る',
      sep: '、', list: '・', semi: '。',
      pos: '{r}行{c}列', col: '{c}列',
      'kind.-': 'すき間', 'kind..': '道', 'kind.G': 'ゴール', 'kind.x': '石', 'kind.k': '鍵', 'kind.D': '鍵のかかった扉',
      'kind.o': '開いた扉', 'kind.i': '濡れた墨', 'kind.p': '紙片', kindShadow: '影、歩ける', kindTabUp: '紙片、立って橋に',
      'noun..': '厚紙', 'noun.G': 'ゴール', 'noun.k': '鍵', 'noun.o': '扉', 'noun.D': '扉', 'noun.i': '濡れた墨', 'noun.p': '紙片', 'noun.x': '石',
      hereYou: 'あなたはここ', hereStack: 'あなたはこの重なりに',
      fallsHere: '閉じると向かいの{noun}がここに重なる', doorKey: '向かいは鍵。閉じれば扉が開く', crushedHere: '閉じると向かいの石にふさがれる',
      inkPrints: '閉じると向かいに写る', tabBridge: '半分開くと、向かいの紙片と立って橋になる',
      stoneShadow: '傾けると影を落とす。閉じると{col}をふさぐ', keyOpens: '閉じると{col}の扉が開く', inkTo: '閉じると{col}に写る', covers: '閉じると{col}のすき間をふさぐ',
      optOn: '{name}：オン', optOff: '{name}：オフ',
      audioIntro: '。左ページは木の音、右ページは紙の音。上の行ほど高く鳴ります。左ページは左耳、右ページは右耳に。矢印キーで各マスを聴き、Enterで歩き、Fで少し折り、Shift+Fで少し開きます。?ですべてのキー。',
      needAudio: '先にMでサウンドモードをオンにしてください',
      'book.closed': '本を閉じた', 'book.pop': '本が立った、{a}°', 'book.popBridge': '本が立った、{a}°、紙片が橋になった',
      'book.opened': '本を開いた', 'book.lean': '本が傾いた、{a}°', 'book.open': '本は開いている、{a}°', angle: '{a}°',
      connected: '道がつながった', lost: '道が一部途切れた', doorOpened: '鍵で扉が開いた', inkPrinted: '墨が向かいのページに写った',
      shadowOn: '影が{cells}に落ちた', shadowGone: '影が消えた',
      intro: 'ステージ{n}、{name}。{line}あなたは{you}、ゴールは{goal}。本は開いています。', elsewhere: '別の場所',
      stack: '（右ページ、{c}列の上）', already: 'もう{pos}にいる', arrived: '着いた、{pos}', cantReach: '今はそこへ行けない',
      'no.step': '進めない', 'no.edge': '本の端', 'no.crease': '前は折り目', 'no.stone': '石がふさいでいる', 'no.door': '扉に鍵がかかっている', 'no.gap': 'そこはすき間',
      slid: '影に乗って{pos}へ滑った', undone: '戻しました。あなたは{pos}、本は{a}°', win: '{text}！Enterで{next}',
      'dir.left': '左', 'dir.right': '右', 'dir.up': '上', 'dir.down': '下', goalSteps: '{dir}に{n}マス',
      goal: 'ゴールは{opp}{bits}', goalOpp: '向かいのページ、', here: 'ここ',
      where: 'あなたは{pos}、{page}。進める方向：{ways}。本は{a}°。{goal}。', leftPage: '左ページ', rightPage: '右ページ', nowhere: 'なし',
      nothingToUndo: '戻せる操作はありません',
      suggestToast: '目を閉じても遊べます。Mでサウンドモード、?でキーの説明',
      lvAria: 'ステージ{n}、{name}', lvDone: 'クリア済み', lvCurrent: '現在',
      help: '矢印キー：マスを移動して聴く。Enter：そのマスへ歩く。Shift+矢印：一歩進む。F：少し折る。Shift+F：少し開く。C：閉じる。O：開く。L：この行を聴く。Shift+L：本全体を聴く。W：現在地。H：ヒント。U：戻す。R：やり直し。M：サウンドモード。',
      'ch.3.line': '影も、道になる。', 'paper.ch3': '灯にかざした紙。影の上を歩ける。', 'paper.lit': 'ページが灯にかざされた',
      'teach.lean': '本は、立てた状態と閉じた状態のあいだのどこでも止められる', shadowGap: '影が{c}列目のすき間をふさいだ',
      'letter.3.title': '左岸からの手紙', 'letter.3.body': '灯はきみの岸にある。\nきみの石が影を川向こうへ差し出し、\nわたしはそれを踏んで、少し近づいた。', 'letter.3.sign': '——左岸より',
    },

    ko: {
      title: '折 · 접은 편지', brandSub: '접은 편지', langGroup: '언어', langName: '한국어', langSet: '한국어로 바꿨어요',
      suggest: '화면 낭독기를 쓰거나 눈을 감고 하나요? 여기서 소리 모드를 켜세요',
      navGame: '게임', levels: '단계', hint: '힌트', reset: '다시', a11y: '접근성',
      dragCrease: '접는 선 끌기', gridLabel: '책: 1~4열은 왼쪽 페이지, 5~8열은 오른쪽 페이지',
      gridHelp: '4열과 5열 사이가 접는 선이에요. 닫으면 오른쪽 페이지가 왼쪽 위에 겹쳐요: 5열은 4열 위에, 8열은 1열 위에. 방향키로 각 칸을 듣고, Enter로 걷고, F로 조금 접고, Shift+F로 조금 펴요. H 힌트, R 다시, U 되돌리기, 물음표로 모든 키.',
      'mode.open': '열림', 'mode.pop': '섬', 'mode.lean': '기울어짐', 'mode.fold': '닫힘',
      audioBadge: '소리 모드', coachSlider: '끝까지 밀어 닫기', foldAngle: '접는 각도',
      'pre.open': '펴기', 'pre.half': '반쯤', 'pre.close': '닫기', tilt: '기울기', tiltOn: '기울기: 켬',
      bbFold: '책 접기', foldLess: '덜 접기', foldMore: '더 접기', openAll: '펴기', closeAll: '닫기', undo: '되돌리기',
      foldLessLabel: '덜 접기', foldMoreLabel: '더 접기',
      bbWalk: '한 걸음', left: '왼쪽', up: '위', down: '아래', right: '오른쪽',
      stepLeft: '왼쪽으로 한 걸음', stepUp: '위로 한 걸음', stepDown: '아래로 한 걸음', stepRight: '오른쪽으로 한 걸음',
      'bb.row': '줄 듣기', 'bb.rowLabel': '줄 듣기', 'bb.where': '내 위치', 'bb.whereLabel': '내 위치',
      done: '닫기', on: '켬', off: '끔',
      'opt.audio': '소리 모드', 'opt.speak': '음성 읽기', 'opt.hc': '고대비', 'opt.big': '큰 칸', 'opt.motor': '큰 버튼',
      'desc.audio': '칸마다 음높이와 음색이 달라 눈을 감고도 할 수 있어요 (M)', 'desc.speak': '화면 낭독기가 없을 때 시스템 음성으로 안내를 읽어요',
      'desc.hc': '굵은 테두리와 무늬, 색에만 기대지 않아요', 'desc.big': '칸을 크게', 'desc.motor': '더 접기, 덜 접기, 한 걸음, 되돌리기',
      you: '나', goalTag: '도착', tapTip: '눌러서 걷기',
      levelHead: '{n} / {total} · {name}', levelDone: '‘{name}’ 완료',
      allDone: '모두 완료. Duo가 오면 진짜 접는 선으로 다시 해 봐요.', next: '다음 단계', first: '1단계로',
      crushed: '돌이 내려왔어요. 처음부터 다시', fell: '그림자가 떠나고, 종이 인형이 떨어졌어요',
      tiltDenied: '동작 권한을 받지 못했어요', tiltHow: '폰을 좌우로 기울여 접어요',
      sep: ', ', list: ', ', semi: '; ',
      pos: '{r}행 {c}열', col: '{c}열',
      'kind.-': '틈', 'kind..': '길', 'kind.G': '도착점', 'kind.x': '돌', 'kind.k': '열쇠', 'kind.D': '잠긴 문',
      'kind.o': '열린 문', 'kind.i': '젖은 먹', 'kind.p': '종이 조각', kindShadow: '그림자, 걸을 수 있음', kindTabUp: '종이 조각, 서서 다리가 됨',
      'noun..': '종이판', 'noun.G': '도착점', 'noun.k': '열쇠', 'noun.o': '문', 'noun.D': '문', 'noun.i': '젖은 먹', 'noun.p': '종이 조각', 'noun.x': '돌',
      hereYou: '내가 있는 곳', hereStack: '내가 이 겹침에 있음',
      fallsHere: '닫으면 맞은편 {noun:이} 여기에 겹쳐요', doorKey: '맞은편에 열쇠가 있어 닫으면 문이 열려요', crushedHere: '닫으면 맞은편 돌에 눌려요',
      inkPrints: '닫으면 맞은편에 찍혀요', tabBridge: '반쯤 열면 맞은편 종이 조각과 서서 다리가 돼요',
      stoneShadow: '기울이면 그림자를 드리우고, 닫으면 {col:을} 눌러요', keyOpens: '닫으면 {col}의 문이 열려요', inkTo: '닫으면 {col}에 찍혀요', covers: '닫으면 {col}의 틈을 덮어요',
      optOn: '{name} 켬', optOff: '{name} 끔',
      audioIntro: '. 왼쪽 페이지는 나무 소리, 오른쪽은 종이 소리, 위쪽 줄일수록 높은 음이에요. 왼쪽 페이지는 왼쪽 귀, 오른쪽 페이지는 오른쪽 귀로 들려요. 방향키로 각 칸을 듣고, Enter로 걷고, F로 조금 접고, Shift+F로 조금 펴요. 물음표를 누르면 모든 키를 들을 수 있어요.',
      needAudio: '먼저 M을 눌러 소리 모드를 켜세요',
      'book.closed': '책을 닫았어요', 'book.pop': '책이 섰어요, {a}°', 'book.popBridge': '책이 섰어요, {a}°, 종이 조각이 다리가 됐어요',
      'book.opened': '책을 폈어요', 'book.lean': '책이 기울었어요, {a}°', 'book.open': '책이 열려 있어요, {a}°', angle: '{a}°',
      connected: '길이 이어졌어요', lost: '길이 일부 끊겼어요', doorOpened: '열쇠가 문을 열었어요', inkPrinted: '먹이 맞은편 페이지에 찍혔어요',
      shadowOn: '그림자가 {cells}에 드리웠어요', shadowGone: '그림자가 사라졌어요',
      intro: '{n}단계, {name}. {line} 지금 {you}에 있고, 도착점은 {goal}에 있어요. 책은 펼쳐져 있어요.', elsewhere: '다른 곳',
      stack: ' (오른쪽 페이지, {c}열 위)', already: '이미 {pos}에 있어요', arrived: '도착, {pos}', cantReach: '지금은 거기 갈 수 없어요',
      'no.step': '갈 수 없어요', 'no.edge': '책 끝이에요', 'no.crease': '앞은 접는 선이에요', 'no.stone': '돌이 막고 있어요', 'no.door': '문이 잠겼어요', 'no.gap': '거기는 틈이에요',
      slid: '그림자가 {pos:으로} 데려갔어요', undone: '되돌렸어요. 지금 {pos}, 책은 {a}°', win: '{text}! Enter: {next}',
      'dir.left': '왼쪽', 'dir.right': '오른쪽', 'dir.up': '위', 'dir.down': '아래', goalSteps: '{dir:으로} {n}칸',
      goal: '도착점은 {opp}{bits}', goalOpp: '맞은편 페이지, ', here: '여기',
      where: '지금 {pos}, {page}. 갈 수 있는 쪽: {ways}. 책 {a}°. {goal}.', leftPage: '왼쪽 페이지', rightPage: '오른쪽 페이지', nowhere: '없음',
      nothingToUndo: '되돌릴 것이 없어요',
      suggestToast: '눈을 감고도 할 수 있어요: M은 소리 모드, 물음표는 키 안내',
      lvAria: '{n}단계, {name}', lvDone: '완료', lvCurrent: '현재',
      help: '방향키: 칸 사이를 옮기며 각 칸 듣기. Enter: 그 칸으로 걷기. Shift+방향키: 한 걸음. F: 조금 접기, Shift+F: 조금 펴기, C: 닫기, O: 열기. L: 이 줄 듣기, Shift+L: 책 전체 듣기. W: 내 위치. H: 힌트. U: 되돌리기. R: 다시. M: 소리 모드.',
      'ch.3.line': '그림자도 길이 된다.', 'paper.ch3': '등불에 비춘 종이, 그림자 위를 걸을 수 있어요.', 'paper.lit': '페이지를 등불에 비췄어요',
      'teach.lean': '책은 세운 상태와 닫힌 상태 사이 어디에서든 멈출 수 있어요', shadowGap: '그림자가 {c}열의 틈을 덮었어요',
      'letter.3.title': '왼쪽 강가에서 온 편지', 'letter.3.body': '등불은 네 쪽 강가에 있다.\n네 돌들이 그림자를 강 건너로 건네주어,\n나는 그것을 밟고 조금 더 가까워졌다.', 'letter.3.sign': '— 왼쪽 강가에서',
    },
  };

  // levels by id: [name, line, hint]. Names follow meaning and tone, not the characters.
  const LV = {
    zh: {
      bridge: ['桥', '缺口的对面，有一块纸板。', '合上手机，右边的纸板会正好盖住缺口。'],
      facing: ['对页', '终点在另一页。', '合上，走到右页的路上；石头挡住了，就展开继续走。'],
      back: ['往返', '过去，再回来。', '合上过去，展开走一段，再合上回到左页。'],
      key: ['钥匙', '门锁着，钥匙在对页。', '钥匙和门左右对称。合上，它们就碰到了。'],
      ink: ['墨', '墨还没干。', '合上一次，墨会印到右页的缺口上；展开后它还在。'],
      stand: ['立', '合上也过不去。', '把手机打开到一半，折痕上的纸片会立起来，连成一座桥。'],
      twoBridges: ['两桥', '过去，再回来。', '立起来：两座桥都在。走过上面那座，沿着立起的页走到底，从下面那座回来。'],
      standClose: ['先立后合', '墙上也能走。', '先立起来过桥，在立起的页上一直走到头，再合上——终点就在脚下。'],
      doorBridge: ['门与桥', '先开门，再过桥。', '先合上让钥匙开门，再打开到一半，从立起的纸片走过去。'],
      inkBridge: ['墨与桥', '桥的那头，路断了；终点被压住了。', '合上时石头会压住终点，所以只合一下：让墨印过去，再半开过桥。'],
      crease: ['折痕', '用上你学会的一切。', '先合上一次，钥匙和墨都印过去；再半开过桥，走到门边，最后合上。'],
      shadow: ['影', '灯在纸的后面。', '把书慢慢合到一半多一点，右页石头的影子会落在缺口上。影子能走。'],
      press: ['压', '纸板在对岸，石头也在。', '合上时纸板盖住缺口，可石头会压在缺口后面的路上。只斜起：石头的影子就是桥。'],
      lock: ['远近', '远的石头，影子走得快。', '两个缺口要同时有影子。再慢慢合一点，直到两道影子排成一列——就在书快要合上之前。'],
      ride: ['乘影', '缺口太宽，影子太短。', '站到影子上，再慢慢合书：影子会带着你一起滑过去。合到底石头就压下来了。'],
      rideBack: ['回程', '影子会走，也会回来。', '书几乎合上时，影子才伸到你脚边。站上去，再把书打开：影子带你回到折痕边。'],
      lamp: ['灯下', '走过影子，再把信合上。', '站上影子慢慢合书；两道影子排成一列时，往下走到纸上。再合上：终点在对页。书合拢之前，一定要先离开影子。'],
    },
    en: {
      bridge: ['Bridge', 'Across the gap, a scrap of card.', 'Close the phone: the card on the right lands exactly over the gap.'],
      facing: ['Facing Page', 'The goal lies on the other page.', 'Close, and step onto the right page’s path; when a stone blocks you, open and walk on.'],
      back: ['There and Back', 'Over, and home again.', 'Close to cross, open to walk a while, then close again to come back to the left page.'],
      key: ['Key', 'The door is locked. The key is on the facing page.', 'Key and door mirror each other. Close, and they meet.'],
      ink: ['Ink', 'The ink is still wet.', 'Close once: the ink prints onto the gap on the right page, and stays when you open.'],
      stand: ['Stand', 'Even closed, there is no way across.', 'Open the phone halfway: the tabs on the crease stand up and join into a bridge.'],
      twoBridges: ['Two Bridges', 'Over, and back.', 'Open halfway: both bridges stand. Cross the top one, walk down the standing page, come back over the bottom one.'],
      standClose: ['Stand, then Close', 'You can walk on the wall.', 'Stand the page and cross, walk to the end of the standing page, then close: the goal is right under you.'],
      doorBridge: ['Door, then Bridge', 'First the door, then the bridge.', 'Close so the key opens the door, then open halfway and cross on the standing tabs.'],
      inkBridge: ['Ink, then Bridge', 'Past the bridge the path breaks off; the goal is pinned down.', 'Closing drops the stone on the goal, so close only once: let the ink print across, then half-open and cross.'],
      crease: ['Crease', 'Everything you have learned.', 'Close once so the key and the ink carry across; half-open and cross the bridge, walk to the door, then close.'],
      shadow: ['Shade', 'There is a lamp behind the page.', 'Close the book slowly, a little past halfway: the stone’s shadow falls across the gap. Shadows can be walked on.'],
      press: ['Weight', 'The card is on the far bank. So is the stone.', 'Closing lays the card over the gap, but drops the stone on the road beyond it. Only lean the page: the stone’s shadow is the bridge.'],
      lock: ['Near and Far', 'The farther the stone, the faster its shadow.', 'Both gaps need a shadow at once. Keep closing slowly until the two shadows line up, just before the book shuts.'],
      ride: ['Shadow Ride', 'The gap too wide, the shadow too short.', 'Stand on the shadow, then close the book slowly: it carries you across. Close all the way and the stone comes down.'],
      rideBack: ['The Way Back', 'A shadow goes out, and comes back.', 'Only when the book is nearly shut does the shadow reach your feet. Step on, then open the book: the shadow carries you back to the crease.'],
      lamp: ['By Lamplight', 'Walk the shadows, then fold the letter shut.', 'Stand on a shadow and close slowly; where the two shadows line up, step down onto the paper. Then close: the goal is on the facing page. Get off the shadow before the book shuts.'],
    },
    ja: {
      bridge: ['橋', 'すき間の向こうに、厚紙が一枚。', 'スマホを閉じると、右の厚紙がすき間にぴたりと重なる。'],
      facing: ['見開き', 'ゴールは、もう一枚のページに。', '閉じて右ページの道へ。石にふさがれたら、開いて先へ。'],
      back: ['行き帰り', '行って、また帰る。', '閉じて渡り、開いて少し歩き、また閉じて左ページへ戻る。'],
      key: ['鍵', '扉は閉ざされ、鍵は向かいのページに。', '鍵と扉は左右対称。閉じれば、ふれあう。'],
      ink: ['墨', '墨はまだ乾いていない。', '一度閉じると、墨が右ページのすき間に写る。開いても残る。'],
      stand: ['立つ', '閉じても、渡れない。', 'スマホを半分だけ開くと、折り目の紙片が立ち上がり、橋になる。'],
      // TODO(ja): draft, pending native review (design-review-2 §5)
      twoBridges: ['二つの橋', '渡って、戻る。', '半分だけ開くと、橋が二つ立つ。上の橋を渡り、立ったページを端まで歩いて、下の橋で戻る。'],
      standClose: ['立ててから閉じる', '壁の上も歩ける。', 'ページを立てて橋を渡り、立ったページを端まで歩いてから閉じる。ゴールは足もとにある。'],
      doorBridge: ['扉と橋', 'まず扉、それから橋。', '閉じて鍵で扉を開け、半分開いて、立った紙片を渡る。'],
      inkBridge: ['墨と橋', '橋の先で道は途切れ、ゴールは押さえられている。', '閉じると石がゴールをふさぐ。だから一度だけ閉じて墨を写し、半分開いて橋を渡る。'],
      crease: ['折り目', '覚えたすべてを。', 'まず一度閉じて鍵と墨を写す。半分開いて橋を渡り、扉まで歩いて、最後に閉じる。'],
      shadow: ['影', '紙のうしろに、灯がある。', '本をゆっくり、半分より少しだけ閉じると、右ページの石の影がすき間に落ちる。影は歩ける。'],
      press: ['重し', '厚紙は向こう岸に。石も。', '閉じると厚紙がすき間をふさぐが、石がその先の道に落ちてくる。斜めに起こすだけ。石の影が橋になる。'],
      lock: ['遠近', '遠い石ほど、影は速く動く。', '二つのすき間に、同時に影がいる。ゆっくり閉じていき、二つの影が一列にそろったら止める。閉じきる少し手前。'],
      ride: ['影に乗る', 'すき間は広く、影は短い。', '影の上に立って、ゆっくり本を閉じる。影があなたを乗せて滑っていく。閉じきると石が落ちてくる。'],
      rideBack: ['帰り道', '影は出ていき、また戻ってくる。', 'ほとんど閉じたときだけ、影が足もとまで届く。乗ったら本を開く。影があなたを折り目のそばまで運ぶ。'],
      lamp: ['灯の下', '影をわたって、手紙を閉じる。', '影に乗ってゆっくり閉じる。二つの影がそろったら、下の紙へ降りる。それから閉じる。ゴールは向かいのページ。閉じきる前に、かならず影から降りること。'],
    },
    ko: {
      bridge: ['다리', '틈 건너편에 종이판 한 장.', '폰을 닫으면 오른쪽 종이판이 틈을 꼭 덮어요.'],
      facing: ['맞은편', '도착점은 다른 페이지에.', '닫고 오른쪽 페이지의 길로 건너가요. 돌이 막으면 펼쳐서 계속 걸어요.'],
      back: ['오가는 길', '건너갔다가, 다시 돌아오기.', '닫아서 건너고, 펼쳐서 조금 걷고, 다시 닫아 왼쪽 페이지로 돌아와요.'],
      key: ['열쇠', '문은 잠겼고, 열쇠는 맞은편에.', '열쇠와 문은 좌우 대칭이에요. 닫으면 서로 닿아요.'],
      ink: ['먹', '먹이 아직 마르지 않았다.', '한 번 닫으면 먹이 오른쪽 틈에 찍혀요. 펼쳐도 남아 있어요.'],
      stand: ['일어서다', '닫아도 건널 수 없다.', '폰을 반쯤 열면 접는 선의 종이 조각이 일어서서 다리가 돼요.'],
      // TODO(ko): draft, pending native review (design-review-2 §5)
      twoBridges: ['두 다리', '건너갔다가, 돌아온다.', '반쯤 열면 다리 두 개가 서요. 위 다리를 건너 선 페이지를 끝까지 걷고, 아래 다리로 돌아와요.'],
      standClose: ['세우고 닫기', '벽 위도 걸을 수 있다.', '페이지를 세워 다리를 건너고, 선 페이지를 끝까지 걸은 다음 닫아요. 도착점이 바로 발밑에 있어요.'],
      doorBridge: ['문과 다리', '먼저 문, 그다음 다리.', '닫아서 열쇠로 문을 열고, 반쯤 열어 일어선 종이 조각을 건너요.'],
      inkBridge: ['먹과 다리', '다리 너머 길은 끊기고, 도착점은 눌려 있다.', '닫으면 돌이 도착점을 눌러요. 그러니 한 번만 닫아 먹을 찍고, 반쯤 열어 다리를 건너요.'],
      crease: ['접힌 자국', '배운 모든 것을.', '먼저 한 번 닫아 열쇠와 먹을 찍어요. 반쯤 열어 다리를 건너 문까지 걷고, 마지막에 닫아요.'],
      shadow: ['그림자', '종이 뒤에 등불이 있다.', '책을 천천히 반보다 조금 더 닫으면 오른쪽 돌의 그림자가 틈에 드리워요. 그림자 위로는 걸을 수 있어요.'],
      press: ['누름돌', '종이판은 건너편에 있다. 돌도.', '닫으면 종이판이 틈을 덮지만, 돌이 그 너머 길에 떨어져요. 비스듬히 세우기만 하세요. 돌의 그림자가 다리예요.'],
      lock: ['멀고 가까운', '먼 돌일수록 그림자는 빨리 움직인다.', '두 틈에 동시에 그림자가 있어야 해요. 천천히 더 닫아 두 그림자가 한 줄로 서면 멈춰요. 다 닫히기 바로 전이에요.'],
      ride: ['그림자를 타고', '틈은 너무 넓고, 그림자는 너무 짧다.', '그림자 위에 서서 책을 천천히 닫아요. 그림자가 나를 태우고 미끄러져요. 끝까지 닫으면 돌이 내려와요.'],
      rideBack: ['돌아오는 길', '그림자는 나갔다가, 다시 돌아온다.', '거의 닫혔을 때만 그림자가 발밑까지 와요. 올라선 다음 책을 펼쳐요. 그림자가 접는 선 가까이로 데려다줘요.'],
      lamp: ['등불 아래', '그림자를 건너, 편지를 덮는다.', '그림자 위에 서서 천천히 닫아요. 두 그림자가 나란히 서면 아래 종이로 내려가요. 그다음 닫아요. 도착점은 맞은편 페이지예요. 책이 닫히기 전에 꼭 그림자에서 내려와요.'],
    },
  };

  // Korean particles: pick the form by the final consonant (batchim) of the last Hangul syllable
  const JOSA = { '이': ['이', '가'], '을': ['을', '를'], '은': ['은', '는'], '과': ['과', '와'], '으로': ['으로', '로'] };
  function josa(word, p) {
    const pair = JOSA[p]; if (!pair) return word + p;
    const code = word.charCodeAt(word.length - 1) - 0xac00;
    if (code < 0 || code > 11171) return word + pair[1];
    const fin = code % 28;
    if (p === '으로') return word + (fin === 0 || fin === 8 ? '로' : '으로');   // ㄹ takes 로
    return word + pair[fin ? 0 : 1];
  }

  const pick = () => {
    const saved = localStorage.getItem('fold.lang');
    if (saved && S[saved]) return saved;
    for (const l of navigator.languages || [navigator.language || 'en']) {
      const p = l.toLowerCase().slice(0, 2);
      if (p === 'zh' || p === 'ja' || p === 'ko') return p;
      if (p === 'en') return 'en';
    }
    return 'en';
  };
  let lang = pick();
  const subs = [];

  function t(key, p = {}) {
    const s = S[lang][key] ?? S.en[key] ?? key;
    return s.replace(/\{(\w+)(?::([^}]+))?\}/g, (_, k, part) => {
      const v = p[k] == null ? '' : String(p[k]);
      return part ? (lang === 'ko' ? josa(v, part) : v) : v;
    });
  }
  const level = (id) => { const [name, line, hint] = (LV[lang][id] || LV.en[id]); return { name, line, hint }; };

  function applyStatic(root = document) {
    document.documentElement.lang = TAG[lang];
    document.title = t('title');
    root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
    root.querySelectorAll('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
    root.querySelectorAll('[data-i18n-title]').forEach((el) => el.setAttribute('title', t(el.dataset.i18nTitle)));
    const css = document.documentElement.style;
    css.setProperty('--t-on', JSON.stringify(t('on'))); css.setProperty('--t-off', JSON.stringify(t('off')));
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }
  function setLang(l) {
    if (!S[l] || l === lang) return;
    lang = l; localStorage.setItem('fold.lang', l);
    applyStatic();
    subs.forEach((f) => f(l));
  }

  window.I18N = {
    t, level, setLang, applyStatic, langs: Object.keys(S), strings: S, levelTexts: LV,
    get lang() { return lang; }, get tag() { return TAG[lang]; },
    onChange: (f) => subs.push(f),
  };
})();
