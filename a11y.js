// Fold — accessibility layer: ARIA grid over the book, keyboard, announcements, audio mode,
// large controls, high contrast / large tiles, dialogs. Talks to main.js only through window.FoldGame.
(() => {
  const G = window.FoldGame, F = window.FoldLogic, N = F.N;
  const $ = (s) => document.querySelector(s);
  const opts = G.opts;
  const live = $('#live'), gridEl = $('#a11y-grid');
  const KIND = { '-': '缺口', '.': '路', S: '路', G: '终点', x: '石头', k: '钥匙', D: '锁着的门', o: '开着的门', i: '湿墨', p: '纸片' };
  const NOUN = { '.': '纸板', S: '纸板', G: '终点', k: '钥匙', o: '门', i: '湿墨', p: '纸片', x: '石头', D: '门' };
  const pos = (c, r) => `第${r + 1}行第${c + 1}列`;
  const DIR = { '-1,0': '左', '1,0': '右', '0,-1': '上', '0,1': '下' };

  // ---------- prefs ----------
  function save() { localStorage.setItem('fold.a11y', JSON.stringify(opts)); }
  function apply() {
    const b = document.body.classList;
    b.toggle('a11y-audio', opts.audio); b.toggle('hc', opts.hc); b.toggle('big', opts.big);
    b.toggle('motor', opts.motor || opts.audio);
    document.querySelectorAll('[data-opt]').forEach((s) => s.setAttribute('aria-checked', String(!!opts[s.dataset.opt])));
    $('#bigbar').hidden = !(opts.motor || opts.audio);
    $('#audio-badge').hidden = !opts.audio;
    requestAnimationFrame(() => { G.layout(); place(); });
  }
  function setOpt(k, v, quiet) {
    opts[k] = v; save(); apply();
    if (k === 'audio' && v) { G.sound.ensure(); if (G.demo) G.endDemo(true); clearTimeout(flushT); pend = newPend(); saidAngle = Math.round(G.angle); }
    if (quiet) return;
    const name = { audio: '声音模式', speak: '语音朗读', hc: '高对比', big: '大格子', motor: '大按钮' }[k];
    say(`${name}${v ? '已开启' : '已关闭'}` + (k === 'audio' && v ? '。左页是木头声，右页是纸声，越靠上的行音越高；左页在左耳，右页在右耳。方向键听每一格，回车走过去，F 折一点，Shift 加 F 展开一点。按问号听全部按键。' : ''));
  }

  // ---------- announcer (aria-live, plus optional speech for players without a screen reader) ----------
  let sayT;
  function say(text) {
    clearTimeout(sayT); live.textContent = '';
    sayT = setTimeout(() => (live.textContent = text), 40);
    if (opts.speak && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; u.rate = 1.15;
      speechSynthesis.speak(u);
    }
  }

  // ---------- audio ----------
  let fx = null;
  function sfx() {
    if (!opts.audio) return null;
    const ctx = G.sound.ensure();
    return (fx ||= FoldAudio.create(ctx));
  }
  const rowF = (r) => FoldAudio.ROW_F[Math.min(r, FoldAudio.ROW_F.length - 1)];
  // physical position of a cell centre, in cells, hinge at x = 0; the right page swings up and over
  function spot(c, r) {
    const a = (G.angle * Math.PI) / 180;
    if (!F.isRight(c)) return { x: c - N + 0.5, y: r, z: 0 };
    const d = c - N + 0.5;
    return { x: d * Math.cos(a), y: r, z: d * Math.sin(a) };
  }
  const panOf = (c, r) => Math.max(-0.9, Math.min(0.9, (spot(c, r).x / 3.5) * 0.9));
  const gainOf = (c) => (F.isRight(c) ? 1 - 0.25 * Math.sin((G.angle * Math.PI) / 180) : 1);

  function playCell(c, r, when = 0, quiet = 1) {
    const s = sfx(); if (!s) return;
    const st = G.state, t = F.at(st, c, r), pan = panOf(c, r), v = gainOf(c) * quiet, f = rowF(r);
    const page = F.isRight(c) ? 'paper' : 'wood';
    if (t === '-') G.shade.has(c + ',' + r) ? s.shadow(f, pan, v, when) : s.air(pan, v, when);
    else if (t === 'x') s.stone(pan, v, when);
    else if (t === 'D') s.door(pan, v, when);
    else if (t === 'G') s.motif(pan, v * 0.8, when);
    else if (t === 'o') s.opened(f, pan, v, when);
    else if (t === 'i') s.ink(f, pan, v, when);
    else {
      s.note(page, f, pan, v, when);
      if (t === 'k') s.bell(f * 2, pan, v, when + 0.05);
      if (t === 'p') s.flick(pan, v, when + 0.03);
    }
    const ch = st.char;
    if (quiet >= 0.7 && ch.c === c && ch.r === r) s.you(pan, when + 0.18);
  }

  let busyUntil = 0;
  function cellsByX(r) {
    return [...Array(2 * N).keys()].map((c) => ({ c, x: spot(c, r).x })).sort((a, b) => a.x - b.x || a.c - b.c);
  }
  function scanRow(r) {
    if (!sfx()) return say('先按 M 开启声音模式');
    let t = 0, lastX = null;
    for (const { c, x } of cellsByX(r)) {
      if (lastX !== null && Math.abs(x - lastX) > 0.05) t += 0.11;   // stacked cells sound together
      playCell(c, r, t, 0.8); lastX = x;
    }
    busyUntil = performance.now() + t * 1000 + 600;
  }
  function scanAll() {
    if (!sfx()) return say('先按 M 开启声音模式');
    let t = 0;
    for (let r = 0; r < G.state.h; r++) {
      let lastX = null;
      for (const { c, x } of cellsByX(r)) {
        if (lastX !== null && Math.abs(x - lastX) > 0.05) t += 0.07;
        playCell(c, r, t, 0.7); lastX = x;
      }
      t += 0.22;
    }
    busyUntil = performance.now() + t * 1000 + 600;
  }
  function goalCell() {
    const st = G.state;
    for (let r = 0; r < st.h; r++) for (let c = 0; c < st.w; c++) if (st.grid[r][c] === 'G') return { c, r };
    return null;
  }
  // the goal hums its motif every few seconds, louder the closer you are (3-D distance, so folding counts)
  setInterval(() => {
    if (!opts.audio || !fx || G.won || G.demo || document.hidden || performance.now() < busyUntil) return;
    const g = goalCell(); if (!g) return;
    const a = spot(G.state.char.c, G.state.char.r), b = spot(g.c, g.r);
    const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    const near = Math.max(0, 1 - d / 8);
    fx.motif(panOf(g.c, g.r), 0.12 + 0.7 * near * near);
  }, 2800);

  function buzz(p) { if (opts.audio && navigator.vibrate) try { navigator.vibrate(p); } catch { /* not allowed yet */ } }

  // ---------- labels ----------
  function label(c, r) {
    const st = G.state, t = F.at(st, c, r), m = F.mirror(c), M = F.at(st, m, r), mode = G.mode;
    const shaded = G.shade.has(c + ',' + r);
    let kind = shaded && !F.isFloor(t) ? '影子，可以走' : KIND[t];
    if (t === 'p' && mode === 'pop') kind = '纸片，立着成桥';
    const parts = [pos(c, r), kind];
    const ch = st.char;
    if (ch.c === c && ch.r === r) parts.push('你在这里');
    else if (mode === 'fold' && ch.c === m && ch.r === r) parts.push('你在这一叠');
    let extra = '';
    if (!F.isRight(c)) {
      if (t === '-' && F.isFloor(M)) extra = `合上后对面的${NOUN[M]}会落在这里`;
      else if (t === '-' && M === 'x') extra = '合上后对面的石头会落在这里';
      else if (t === 'D' && M === 'k') extra = '对面是钥匙，合上就能开门';
      else if (F.isFloor(t) && M === 'x') extra = '合上会被对面的石头压住';
      else if (t === 'i' && M === '-') extra = '合上会印到对面';
      else if (t === 'p' && c === N - 1 && M === 'p') extra = '书半开时，和对面的纸片立成桥';
    } else {
      const col = `第${m + 1}列`;
      if (t === 'x') extra = `斜起时投下影子；合上会压住${col}`;
      else if (t === 'k' && M === 'D') extra = `合上能打开${col}的门`;
      else if (t === 'i' && M === '-') extra = `合上会印到${col}`;
      else if (t === 'p' && c === N && M === 'p') extra = '书半开时，和对面的纸片立成桥';
      else if (F.isFloor(t) && M === '-') extra = `合上后盖住${col}的缺口`;
    }
    return parts.join('，') + (extra ? '；' + extra : '');
  }

  // ---------- ARIA grid laid over the book ----------
  let gcells = [], focus = { c: 0, r: 0 }, gridActive = false;
  function buildGrid() {
    const st = G.state;
    gridEl.innerHTML = '';
    gcells = [];
    for (let r = 0; r < st.h; r++) {
      const row = document.createElement('div');
      row.setAttribute('role', 'row');
      gcells.push([]);
      for (let c = 0; c < st.w; c++) {
        const el = document.createElement('div');
        el.setAttribute('role', 'gridcell');
        el.tabIndex = -1;
        el.dataset.c = c; el.dataset.r = r;
        el.addEventListener('click', () => { G.tap(c, r); });
        row.appendChild(el); gcells[r].push(el);
      }
      gridEl.appendChild(row);
    }
    gridEl.setAttribute('aria-rowcount', st.h); gridEl.setAttribute('aria-colcount', st.w);
    focus = { ...st.char };
    relabel(); place();
  }
  function relabel() {
    gcells.forEach((row, r) => row.forEach((el, c) => {
      el.setAttribute('aria-label', label(c, r));
      el.tabIndex = focus.c === c && focus.r === r ? 0 : -1;
      el.classList.toggle('here', G.state.char.c === c && G.state.char.r === r);
    }));
  }
  let placeQ = false;
  function place() {
    if (placeQ) return; placeQ = true;
    requestAnimationFrame(() => {
      placeQ = false;
      const cells = G.cells();
      gcells.forEach((row, r) => row.forEach((el, c) => {
        const b = cells[r][c].getBoundingClientRect(), s = el.style;
        s.left = b.left + 'px'; s.top = b.top + 'px'; s.width = b.width + 'px'; s.height = b.height + 'px';
      }));
    });
  }
  function focusCell(c, r) {
    const st = G.state;
    c = Math.max(0, Math.min(st.w - 1, c)); r = Math.max(0, Math.min(st.h - 1, r));
    focus = { c, r };
    gcells.flat().forEach((el) => (el.tabIndex = -1));
    gcells[r][c].tabIndex = 0; gcells[r][c].focus();
  }
  gridEl.addEventListener('focusin', (e) => {
    const el = e.target.closest('[role=gridcell]'); if (!el) return;
    gridActive = true;
    focus = { c: +el.dataset.c, r: +el.dataset.r };
    gcells.flat().forEach((x) => (x.tabIndex = x === el ? 0 : -1));
    playCell(focus.c, focus.r);
  });
  gridEl.addEventListener('keydown', (e) => {
    const { c, r } = focus;
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (mv && e.shiftKey) { e.preventDefault(); return G.step(mv[0], mv[1]); }
    if (mv) { e.preventDefault(); return focusCell(c + mv[0], r + mv[1]); }
    if (e.key === 'Home') { e.preventDefault(); return focusCell(0, e.ctrlKey ? 0 : r); }
    if (e.key === 'End') { e.preventDefault(); return focusCell(G.state.w - 1, e.ctrlKey ? G.state.h - 1 : r); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); G.tap(c, r); }
  });

  // ---------- reachability: did a fold just connect a new path? ----------
  function reach() {
    const st = G.state, seen = new Set([st.char.c + ',' + st.char.r]), q = [st.char];
    while (q.length) {
      const cur = q.shift();
      for (const n of F.neighbours(st, cur, G.mode, G.shade)) {
        const k = n.c + ',' + n.r;
        if (!seen.has(k)) { seen.add(k); q.push(n); }
      }
    }
    return seen;
  }
  let base = new Set(), pend = null;
  function rebase() { base = reach(); }
  function checkReach() {
    const now = reach();
    const gained = [...now].some((k) => !base.has(k));
    const lost = now.size < base.size && [...base].some((k) => !now.has(k));
    base = now;
    if (gained) { pend.connected = true; pend.lost = false; const s = sfx(); if (s) s.chord(); buzz([18, 40, 30]); }
    else if (lost && !pend.connected) pend.lost = true;
  }
  const newPend = () => ({ mode: false, connected: false, lost: false, shade: false, stamp: [] });
  pend = newPend();

  let flushT, saidAngle = 0, intro = null;
  function soon() { clearTimeout(flushT); flushT = setTimeout(flush, G.reduced.matches ? 120 : 260); }
  function flush() {
    clearTimeout(flushT);
    const a = Math.round(G.angle), mode = G.mode, p = pend; pend = newPend();
    if (intro && !G.demo) { if (a === 0) { say(intro); intro = null; saidAngle = 0; rebase(); relabel(); } return; }
    if (G.demo || (a === saidAngle && !p.mode && !p.connected && !p.shade && !p.stamp.length)) return;
    saidAngle = a;
    const parts = [];
    if (p.mode) {
      if (mode === 'fold') parts.push('书已合上');
      else if (mode === 'pop') parts.push(G.tabs.length ? `书立起来了，${a}°，纸片立成了桥` : `书立起来了，${a}°`);
      else if (a === 0) parts.push('书已打开');
      else parts.push(a >= F.SHADE_MIN ? `书斜起，${a}°` : `书打开，${a}°`);
    } else parts.push(`${a}°`);
    if (p.connected) parts.push('路接通了');
    else if (p.lost) parts.push('有的路断了');
    for (const e of p.stamp) parts.push(e.type === 'door' ? '钥匙打开了门' : '墨印到了对页');
    if (p.shade || (G.shade.size && !p.mode)) {
      const st = G.state, on = [...G.shade.keys()].map((k) => k.split(',').map(Number)).filter(([c, r]) => !F.isFloor(F.at(st, c, r)));
      if (on.length) parts.push('影子落在' + on.map(([c, r]) => pos(c, r)).join('、'));
      else if (p.shade && !G.shade.size) parts.push('影子没了');
    }
    say(parts.join('，'));
    relabel();
    // let the ear follow the right page: replay its half of your row where it now is
    const s = sfx();
    if (s) {
      const r = G.state.char.r;
      [N, N + 1, N + 2, N + 3].forEach((c, i) => playCell(c, r, 0.05 + i * 0.07, 0.55));
    }
  }

  // ---------- game events ----------
  const bus = G.bus;
  bus.on('build', () => {
    const lv = G.levels[G.index], st = G.state, g = goalCell();
    buildGrid(); rebase(); pend = newPend(); saidAngle = Math.round(G.angle);
    intro = `第${G.index + 1}关，${lv.name}。${lv.line}你在${pos(st.char.c, st.char.r)}，终点在${g ? pos(g.c, g.r) : '别处'}。书是打开的。`;
    if (!G.angle) { say(intro); intro = null; }      // otherwise said once the book has swung open
    const ae = document.activeElement;
    if (gridActive && (!ae || ae === document.body || ae.closest('[hidden]') || gridEl.contains(ae))) setTimeout(() => focusCell(st.char.c, st.char.r), 30);
  });
  bus.on('layout', place);
  bus.on('angle', () => {
    place();
    if (opts.audio) G.sound.pan(Math.max(-0.85, Math.min(0.85, Math.cos((G.angle * Math.PI) / 180) * 0.85)));
    soon();
  });
  bus.on('mode', ({ next }) => {
    if (intro) return soon();
    pend.mode = true;
    if (next === 'fold') pend.stamp = G.lastStamp.slice();
    if (next === 'fold' && G.lastStamp.length) buzz([30, 30, 30]);
    checkReach(); soon();
  });
  bus.on('shade', () => {
    if (intro) return soon();
    pend.shade = true;
    const st = G.state;
    const onGap = [...G.shade.keys()].some((k) => { const [c, r] = k.split(',').map(Number); return !F.isFloor(F.at(st, c, r)); });
    const before = pend.connected;
    checkReach();
    if (onGap && !pend.connected && !before && fx) { fx.softChord(); buzz(15); }
    soon();
  });
  bus.on('settle', flush);
  bus.on('step', (n) => {
    const s = sfx(); if (s) s.step(F.isRight(n.c) ? 'paper' : 'wood', rowF(n.r), panOf(n.c, n.r));
    relabel();
  });
  bus.on('arrive', (e) => {
    rebase(); relabel();
    const ch = G.state.char;
    if (gridActive && gridEl.contains(document.activeElement)) focusCell(ch.c, ch.r);
    const stack = G.mode === 'fold' && F.isRight(ch.c) ? `（右页，叠在第${F.mirror(ch.c) + 1}列上）` : '';
    say((e.already ? `你已经在${pos(ch.c, ch.r)}` : `到了，${pos(ch.c, ch.r)}`) + stack);
  });
  bus.on('blocked', ({ c, r, why, dc }) => {
    const st = G.state, s = sfx();
    const pc = Math.max(0, Math.min(st.w - 1, c));
    if (s) s.thud(panOf(pc, Math.max(0, Math.min(st.h - 1, r))));
    if (why === 'path') return say('现在走不到那里');
    const ch = st.char;
    let reason = '走不过去';
    if (r < 0 || r >= st.h || c < 0 || c >= (G.mode === 'fold' ? N : st.w)) reason = '到书边了';
    else if (G.mode !== 'fold' && ((ch.c === N - 1 && dc === 1) || (ch.c === N && dc === -1))) reason = '前面是折痕';
    else {
      const ts = G.mode === 'fold' ? [F.at(st, c, r), F.at(st, F.mirror(c), r)] : [F.at(st, c, r)];
      if (ts.includes('x')) reason = '石头挡住了';
      else if (ts.includes('D')) reason = '门锁着';
      else reason = '那边是缺口';
    }
    say(reason);
  });
  bus.on('slide', () => { const ch = G.state.char; say(`影子带着你滑到了${pos(ch.c, ch.r)}`); rebase(); relabel(); });
  bus.on('fall', () => { rebase(); relabel(); const ch = G.state.char; if (gridActive) focusCell(ch.c, ch.r); });
  bus.on('undo', () => { clearTimeout(flushT); pend = newPend(); saidAngle = Math.round(G.angle); rebase(); relabel(); place(); const ch = G.state.char; say(`已撤销。你在${pos(ch.c, ch.r)}，书${Math.round(G.angle)}°`); });
  bus.on('toast', (t) => say(t));
  bus.on('win', ({ text, next }) => {
    say(`过关！${text.replace(/。$/, '')}。按回车：${next}`);
    if (fx) setTimeout(() => fx.motif(0, 1), 700);
    buzz([40, 60, 40, 60, 80]);
    setTimeout(() => { if (!$('#sheet-win').hidden) $('#btn-next').focus(); }, 520);
  });

  // ---------- where am I ----------
  function whereAmI() {
    const st = G.state, ch = st.char, g = goalCell();
    const ways = F.neighbours(st, ch, G.mode, G.shade).map((n) => {
      const dc = G.mode === 'fold' ? F.proj(n.c) - F.proj(ch.c) : n.c - ch.c;
      return DIR[dc + ',' + (n.r - ch.r)];
    }).filter(Boolean);
    let goal = '';
    if (g) {
      const gc = G.mode === 'fold' ? F.proj(g.c) : g.c, cc = G.mode === 'fold' ? F.proj(ch.c) : ch.c;
      const dy = g.r - ch.r, dx = gc - cc, bits = [];
      if (dy) bits.push(`${dy > 0 ? '下' : '上'}${Math.abs(dy)}格`);
      if (dx) bits.push(`${dx > 0 ? '右' : '左'}${Math.abs(dx)}格`);
      goal = `终点在${F.isRight(g.c) === F.isRight(ch.c) || G.mode === 'fold' ? '' : '对页，'}${bits.join('、') || '这里'}`;
    }
    say(`你在${pos(ch.c, ch.r)}，${F.isRight(ch.c) ? '右页' : '左页'}。能走：${ways.join('、') || '哪里都不行'}。书${Math.round(G.angle)}°。${goal}`);
    if (gridActive) focusCell(ch.c, ch.r);
  }
  const HELP = '方向键：在格子间移动并听每一格。回车：走到这一格。Shift 加方向键：走一步。F：折一点；Shift 加 F：展开一点；C：合上；O：打开。L：听这一行；Shift 加 L：听整本书。W：我在哪。H：提示。U：撤销。R：重来。M：声音模式。';

  // ---------- global keys ----------
  window.addEventListener('keydown', (e) => {
    const sheet = document.querySelector('.sheet:not([hidden])');
    if (e.key === 'Tab') {
      if (sheet && sheet.getAttribute('aria-modal') === 'true') trapTab(e, sheet);
      maybeSuggest();
      return;
    }
    if (sheet || e.altKey || e.metaKey || (e.ctrlKey && e.code !== 'KeyZ')) return;
    if (e.target.matches('input:not([type=range]), textarea, select')) return;
    if (G.demo) G.endDemo(true);
    const k = e.code;
    const act = {
      KeyF: () => G.foldBy(e.shiftKey ? -1 : 1),
      KeyC: () => G.foldTo(180), KeyO: () => G.foldTo(0),
      KeyH: () => G.hint(), KeyR: () => G.reset(),
      KeyU: () => doUndo(), KeyZ: () => doUndo(),
      KeyL: () => (e.shiftKey ? scanAll() : scanRow(gridEl.contains(document.activeElement) ? focus.r : G.state.char.r)),
      KeyW: () => whereAmI(),
      KeyM: () => setOpt('audio', !opts.audio),
      Slash: () => say(HELP),
    }[k];
    if (!act || (k === 'KeyZ' && !e.ctrlKey && !e.metaKey)) return;
    e.preventDefault();
    G.sound.ensure();
    act();
  });
  function doUndo() { if (!G.undo()) say('没有可以撤销的'); }
  // the slider: arrows move a whole step, so a screen-reader user isn't pressing 180 times
  const slider = $('#fold');
  slider.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowUp: 1, PageUp: 1, ArrowLeft: -1, ArrowDown: -1, PageDown: -1 }[e.key];
    if (d) { e.preventDefault(); G.foldBy(d); }
    else if (e.key === 'Home') { e.preventDefault(); G.foldTo(0); }
    else if (e.key === 'End') { e.preventDefault(); G.foldTo(180); }
  });

  // ---------- screen-reader / keyboard suggestion ----------
  let suggested = !!localStorage.getItem('fold.suggested');
  function maybeSuggest() {
    if (suggested || opts.audio) return;
    suggested = true; localStorage.setItem('fold.suggested', '1');
    G.toast('闭着眼也能玩：按 M 开启声音模式，按问号听按键说明');
  }
  $('#a11y-suggest').addEventListener('click', () => {
    setOpt('audio', true);
    const ch = G.state.char; focusCell(ch.c, ch.r);
  });

  // ---------- big buttons ----------
  document.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
    G.sound.ensure();
    if (G.demo) G.endDemo(true);
    const a = b.dataset.act;
    if (a === 'fold+') G.foldBy(1);
    else if (a === 'fold-') G.foldBy(-1);
    else if (a === 'close') G.foldTo(180);
    else if (a === 'open') G.foldTo(0);
    else if (a === 'undo') doUndo();
    else if (a === 'row') scanRow(G.state.char.r);
    else if (a === 'where') whereAmI();
    else if (a.startsWith('go')) { const [dc, dr] = a.slice(2).split(',').map(Number); G.step(dc, dr); }
  }));

  // ---------- settings sheet ----------
  $('#btn-a11y').addEventListener('click', () => { $('#sheet-a11y').hidden = false; });
  document.querySelectorAll('[data-opt]').forEach((s) => s.addEventListener('click', () => setOpt(s.dataset.opt, !opts[s.dataset.opt])));
  $('#a11y-help').textContent = HELP;

  // ---------- dialogs: focus in, trap, Esc, focus back ----------
  const back = new Map();
  function focusables(el) { return [...el.querySelectorAll('button, [href], input, [tabindex="0"]')].filter((x) => !x.closest('[hidden]')); }
  function trapTab(e, sheet) {
    const f = focusables(sheet); if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
  const mo = new MutationObserver((list) => list.forEach(({ target: s }) => {
    if (!s.hidden) {
      if (!back.has(s)) back.set(s, document.activeElement);
      if (s.getAttribute('aria-modal') === 'true') setTimeout(() => (s.querySelector('.lv.current, [data-opt], button') || s).focus(), 30);
    } else {
      const prev = back.get(s); back.delete(s);
      if (s.contains(document.activeElement) || document.activeElement === document.body) {
        if (prev && document.contains(prev) && !prev.closest('[hidden]')) prev.focus();
        else if (gridActive) { const ch = G.state.char; focusCell(ch.c, ch.r); }
      }
    }
  }));
  document.querySelectorAll('.sheet').forEach((s) => mo.observe(s, { attributes: true, attributeFilter: ['hidden'] }));
  // level buttons get a spoken state
  new MutationObserver(() => document.querySelectorAll('#level-grid .lv').forEach((b, i) => {
    if (b.hasAttribute('aria-label')) return;
    b.setAttribute('aria-label', `第${i + 1}关，${G.levels[i].name}${b.classList.contains('done') ? '，已完成' : ''}${b.classList.contains('current') ? '，当前' : ''}`);
  })).observe($('#level-grid'), { childList: true });

  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  apply();
  buildGrid(); rebase();
  window.FoldA11y = { say, label, scanRow, scanAll, whereAmI, setOpt };
})();
