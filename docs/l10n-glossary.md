# 折信 · Letterfold — ja / ko glossary (1.0)

Source of truth for every Japanese and Korean string in `i18n.js` (and, by extension, the native
String Catalogs built from it). zh-Hans is the original voice, en is final; ja / ko follow the
terms below. Rules: short lines, concrete images, no exclamation marks, no game jargon beyond
what en already allows. One term per concept — never two words for one thing.

## Voice

| | ja | ko |
|---|---|---|
| UI, toasts, VoiceOver events | 常体（閉じた / 道がつながった）。操作のお願いだけ です・ます（先にMで…してください） | 해요체 (닫았어요 / 길이 이어졌어요). 안내·요청도 해요체 |
| Level names | 漢字一〜四字、zh と同じ重さ | 두세 음절 명사 / -기 명사형 |
| Level lines (the caption) | 常体・短文、句点で終える | 평서체 「-다」, 짧게 |
| Hints | 常体、「：」で因果、「——」で一拍 | 해요체, 「:」로 인과, 「—」로 한 박 |
| Letters | きみ / わたし、ひらがな多め、常体 | 너 / 나, 반말 해체 (-어 / -야 / -을게) |
| Dash | ——（二倍ダッシュ） | — (em dash, 한 개) |
| Exclamation marks | none | none |
| Numbers / coordinates | 4列目、(2,3)、60° — half-width digits, no space before 列/行/° | 4열, (2,3), 60° — 숫자 뒤 띄어쓰기 없음 |

## The book

| zh | en | ja | ko | note |
|---|---|---|---|---|
| 信 | letter | 手紙 | 편지 | the unit of play and the thing delivered |
| 书 | book | 本 | 책 | |
| 页 | page | ページ | 페이지 | never 頁 in running text (TTS reads ページ either way, but keep one form) |
| 左页 / 右页 | left / right page | 左ページ / 右ページ | 왼쪽 페이지 / 오른쪽 페이지 | |
| 对页 · 对面 | facing page · opposite | 向かいのページ · 向かい | 맞은편 페이지 · 맞은편 | |
| 第三页 | third page | 三枚目のページ（短く：三枚目） | 셋째 페이지 | ch. 6 (the turned-to page) and ch. 12 (the flap) share the term, as in zh |
| 折痕 · 铰链 | crease · hinge | 折り目 · 綴じ目 | 접는 선 | ko uses 접는 선 for both; never 접힌 금 / 경첩 |
| 叠 | stack | 重なり | 겹 | the column pair that meets when closed |
| 合着走 · 叠合走法 | walking closed · the stacks | 閉じたまま歩く · 重なりの道 | 닫은 채 걷다 · 겹의 길 | |
| 格 | square | マス | 칸 | |
| 行 / 列 | row / column | 行 / 列（3行5列） | 행 / 열 (3행 5열) | |
| 缺口 | gap | すき間 | 틈 | never 隙間 (kanji) / 빈칸 |
| 路 | path, road | 道 | 길 | |
| 纸 | paper | 紙 | 종이 | walkable paper |
| 纸板 | card (ch. 1 scrap) | 厚紙 | 종이판 | |
| 硬卡纸 | card (vol. 3 paper) | 厚紙 | 두꺼운 종이 | |
| 信笺 | letter paper | 便箋 | 편지지 | |
| 洞 | hole (third page) | 穴 | 구멍 | |

## Things on the page

| zh | en | ja | ko | note |
|---|---|---|---|---|
| 石头 | stone | 石 | 돌 | |
| 石头的背 | the stone's back | 石の背 | 돌의 등 | closing from the square facing a stone |
| 松石 | loose stone | 転がる石 | 구르는 돌 | |
| 钥匙 / 门 | key / door | 鍵 / 扉 | 열쇠 / 문 | |
| 墨 · 湿墨 | ink · wet ink | 墨 · 濡れた墨 | 먹 · 젖은 먹 | |
| 印 | print (ink onto the facing page) | 写る | 찍히다 | |
| 洇 · 一圈 | bleed · one ring | 滲む · ひとまわり | 번지다 · 한 겹 | |
| 纸片 | tab | 紙片 | 종이 조각 | stands as a bridge when half open |
| 桥 | bridge | 橋 | 다리 | |
| 胶 | glue | 糊 | 풀 | |
| 灯 | lamp | 灯り（章題のみ 灯） | 등불 | 灯 alone is ambiguous for TTS (ひ / とう); 灯り reads あかり |
| 影子 · 乘影 | shadow · ride the shadow | 影 · 影に乗る | 그림자 · 그림자를 타다 | |
| 活页门 | paper gate | 紙の扉 | 종이 문 | |
| 纸鹤 | paper crane | 折り鶴（章題 鶴） | 종이학（장 제목 학） | |
| 落点 | landing | 降り場 | 내려앉을 자리 | |
| 岸 · 左岸 / 右岸 | bank | 岸 · 左岸 / 右岸 | 강가 · 왼쪽 강가 / 오른쪽 강가 | native map title 両岸 / 양안 |
| 河 | river | 川 | 강 | |
| 纸人 | paper figure | 紙の人形 | 종이 인형 | |
| 她 · 那个人 | her · the other one | 彼女 · その人 | 그녀 · 그 사람 | the figure on the far bank |
| 终点 | goal | 終点 | 도착점 | |

## Verbs and states

| zh | en | ja | ko | note |
|---|---|---|---|---|
| 折 | fold | 折る | 접다 | |
| 合上 | close | 閉じる | 닫다 | |
| 打开 | open | 開く | 펴다 / 펼치다 | UI verb 펴기 |
| 立起 | stand | 立てる（本が立つ） | 세우다 (책이 서다) | |
| 斜起 | lean | 傾ける | 기울이다 | |
| 放平 · 摊平 | lay flat | 寝かせる · 平らにする | 눕히다 · 평평하게 펴다 | |
| 翻 | turn (the closed book) | めくる | 넘기다 | native button 'flip.action' says 裏返す / 뒤집기 — see Native notes |
| 压 (那一拍) | the press | 押す（閉じ切る一拍） | 누름 (닫히는 순간) | |
| 过立 | a pass (past upright) | 一度立つ | 한 번 서다 | 「二度立つ」/「두 번 서다」 |
| 走 · 一步 | walk · a step | 歩く · 一歩 | 걷다 · 한 걸음 | |
| 撤销 | undo | 戻す | 되돌리기 | |
| 重来 | restart | やり直す | 다시 하기 | |
| 提示 | hint | ヒント | 힌트 | |
| 关卡 | level | ステージ | 단계 | |
| 回到起点 | back to the start | 最初から | 처음부터 | ends every death toast |
| 声音模式 / 读屏 | sound mode / screen reader | サウンドモード / スクリーンリーダー | 소리 모드 / 화면 낭독기 | |

## Structure

| zh | en | ja | ko |
|---|---|---|---|
| 卷一《两岸》 | Book One, The Two Banks | 第一巻『両岸』 | 제1권 《양안》 |
| 卷二《翻页》 | Book Two, Turning the Page | 第二巻『ページをめくる』 | 제2권 《책장 넘기기》 |
| 卷三《倾》 | Book Three, Tilt | 第三巻『傾く』 | 제3권 《기울기》 |
| 第 n 章 | Chapter n | 第n章 | n장 |
| 第三章完。 | End of Chapter Three. | 第三章、完。 | 제3장 끝. |
| 暗信 | hidden letter | 隠し手紙（タグ 隠し） | 숨은 편지 (태그 숨은) |
| 物件笺 | slip (object card) | しおり | 쪽지 |

### Chapter titles (`chHead.*`: numeral · title)

| ch | zh | en | ja | ko |
|---|---|---|---|---|
| 1 | 折 | Fold | 一 · 折 | 1장 · 접기 |
| 2 | 立 | Stand | 二 · 立 | 2장 · 세우기 |
| 3 | 影 | Shadow | 三 · 影 | 3장 · 그림자 |
| 4 | 岸 | Banks | 四 · 岸 | 4장 · 강가 |
| 5 | 胶 | Glue | 五 · 糊 | 5장 · 풀 |
| 6 | 翻 | Turn | 六 · めくる | 6장 · 넘김 |
| 7 | 墨晕 | Bleed | 七 · 滲み | 7장 · 번짐 |
| 8 | 灯位 | The Lamp | 八 · 灯 | 8장 · 등불 |
| 9 | 滚 | Roll | 九 · 転石 | 9장 · 구르기 |
| 10 | 鹤 | Crane | 十 · 鶴 | 10장 · 학 |
| 11 | 来回 | To and Fro | 十一 · 往き来 | 11장 · 오가기 |
| 12 | 三折 | Trifold | 十二 · 三つ折り | 12장 · 세 겹 |

## Native notes (letterfold/tools/make-strings.js, not edited here)

- `NATIVE['ch.9'].ja` is 転 and `NATIVE['ch.12'].ko` is 세 번 접기; this glossary says 転石 / 세 겹
  (a trifold is folded twice). `NATIVE['ch.6'].ko` 넘김 and `.ja` めくる match.
- `STRING_FIX` still overrides ja `chHead.6`, `no.flip.leaf`, `layerRule`, `shadowOnPaper`,
  `why.stoneTop`, `why.stoneUnder` (and the ko four) with 頁-era wording; the i18n.js versions now
  follow this glossary and the overrides can go. `HELP_ADD` looks for `O：開く。` / `O: 열기.`;
  the new `help` strings already carry T/めくる and are written so that pattern no longer matches.
- `flip.action` 裏返す / 뒤집기 names the physical move; `pre.flip` めくる / 넘기기 is the game verb.
  Both are defensible; if one must go, keep めくる / 넘기기.
