// Fold — accessibility layer: ARIA grid over the book, keyboard, announcements, audio mode,
// large controls, high contrast / large tiles, dialogs. Talks to main.js only through window.FoldGame.
(() => {
  const G = window.FoldGame, F = window.FoldLogic, N = F.N;
  const $ = (s) => document.querySelector(s);
  const opts = G.opts;
  const live = $('#live'), gridEl = $('#a11y-grid');
  const I = window.I18N, { t } = I;
  const KIND = (tile) => t('kind.' + (tile === 'S' ? '.' : tile));
  const NOUN = (tile) => t('noun.' + (tile === 'S' ? '.' : tile));
  const pos = (c, r) => t('pos', { r: r + 1, c: c + 1 });
  const DIR = { '-1,0': 'left', '1,0': 'right', '0,-1': 'up', '0,1': 'down' };
  const lvName = (i) => I.level(G.levels[i].id).name;
  // English sentences start with a capital; a no-op for the CJK scripts
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

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
    say(t(v ? 'optOn' : 'optOff', { name: t('opt.' + k) }) + (k === 'audio' && v ? t('audioIntro') : ''));
  }

  // ---------- announcer (aria-live, plus optional speech for players without a screen reader) ----------
  let sayT;
  function say(text) {
    text = cap(text);
    clearTimeout(sayT); live.textContent = '';
    sayT = setTimeout(() => (live.textContent = text), 40);
    if (opts.speak && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = I.tag; u.rate = 1.15;
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
    say(rowWords(r));
    if (!sfx()) return;
    let at = 0, lastX = null;
    for (const { c, x } of cellsByX(r)) {
      if (lastX !== null && Math.abs(x - lastX) > 0.05) at += 0.11;   // stacked cells sound together
      playCell(c, r, at, 0.8); lastX = x;
    }
    busyUntil = performance.now() + at * 1000 + 600;
  }
  // the board in words, row by row (Shift+L; L reads one row): what a sighted player sees, in the current posture
  function rowWords(r) {
    const st = G.state, fold = G.mode === 'fold', bits = [];
    for (let c = 0; c < (fold ? N : st.w); c++) {
      const top = fold ? F.mirror(c) : c, under = c;
      const tl = F.at(st, top, r), bl = F.at(st, under, r), shaded = !fold && G.shade.has(c + ',' + r);
      let w;
      if (fold) {
        if (tl === '-' && bl === '-') continue;
        w = tl === '-' ? KIND(bl) : bl === '-' ? KIND(tl) : t('onTop', { top: KIND(tl), under: KIND(bl) });
      } else {
        if (tl === '-' && !shaded) continue;
        w = tl === '-' ? t('kindShadow') : KIND(tl);
      }
      const ch = st.char, here = ch.r === r && (fold ? F.proj(ch.c) === c : ch.c === c);
      bits.push(t('col', { c: c + 1 }) + ' ' + w + (here ? t('sep') + t('hereYou') : ''));
    }
    return t('rowWords', { r: r + 1, cells: bits.join(t('list')) || t('rowEmpty') });
  }
  function readBoard(rows) {
    const st = G.state, fold = G.mode === 'fold', a = Math.round(G.angle);
    const head = fold ? t('book.closed') + t('sep') + t('foldedCols') : a === 0 ? t('book.opened') : t(a >= F.SHADE_MIN ? 'book.lean' : 'book.open', { a });
    say(head + t('semi') + rows.map(rowWords).join(t('semi')));
  }
  function scanAll() {
    readBoard([...Array(G.state.h).keys()]);
    if (!sfx()) return;
    let at = 0;
    for (let r = 0; r < G.state.h; r++) {
      let lastX = null;
      for (const { c, x } of cellsByX(r)) {
        if (lastX !== null && Math.abs(x - lastX) > 0.05) at += 0.07;
        playCell(c, r, at, 0.7); lastX = x;
      }
      at += 0.22;
    }
    busyUntil = performance.now() + at * 1000 + 600;
  }
  function goalCell() {
    const st = G.state;
    for (let r = 0; r < st.h; r++) for (let c = 0; c < st.w; c++) if (F.at(st, c, r) === 'G') return { c, r };
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
    const st = G.state, tl = F.at(st, c, r), m = F.mirror(c), M = F.at(st, m, r), mode = G.mode;
    const shaded = G.shade.has(c + ',' + r);
    let kind = shaded && !F.isFloor(tl) ? t('kindShadow') : KIND(tl);
    if (tl === 'p' && mode === 'pop') kind = t('kindTabUp');
    const parts = [pos(c, r), kind];
    const ch = st.char;
    if (ch.c === c && ch.r === r) parts.push(t('hereYou'));
    else if (mode === 'fold' && ch.c === m && ch.r === r) parts.push(t('hereStack'));
    let extra = '';
    if (!F.isRight(c)) {
      if (tl === '-' && (F.isFloor(M) || M === 'x')) extra = t('fallsHere', { noun: NOUN(M) });
      else if (tl === 'D' && M === 'k') extra = t('doorKey');
      else if (tl === 'g' && M === 'x') extra = t('glueTakes');
      else if (tl === 'x' && M === 'g') extra = t('stoneGlued', { col: t('col', { c: m + 1 }) });
      else if (F.isFloor(tl) && M === 'x') extra = t('crushedHere');
      else if (tl === 'i' && M === '-') extra = t('inkPrints');
      else if (tl === 'p' && c === N - 1 && M === 'p') extra = t('tabBridge');
    } else {
      const col = t('col', { c: m + 1 });
      if (tl === 'x' && M === 'g') extra = t('stoneGlued', { col });
      else if (tl === 'x') extra = t('stoneShadow', { col });
      else if (tl === 'g' && M === 'x') extra = t('glueTakes');
      else if (tl === 'k' && M === 'D') extra = t('keyOpens', { col });
      else if (tl === 'i' && M === '-') extra = t('inkTo', { col });
      else if (tl === 'p' && c === N && M === 'p') extra = t('tabBridge');
      else if (F.isFloor(tl) && M === '-') extra = t('covers', { col });
    }
    return cap(parts.join(t('sep')) + (extra ? t('semi') + extra : ''));
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
  const newPend = () => ({ mode: false, connected: false, lost: false, shade: false, stamp: [], fell: '' });
  pend = newPend();

  let flushT, saidAngle = 0, intro = null;
  function soon() { clearTimeout(flushT); flushT = setTimeout(flush, G.reduced.matches ? 120 : 260); }
  function flush() {
    clearTimeout(flushT);
    const a = Math.round(G.angle), mode = G.mode, p = pend; pend = newPend();
    if (intro && !G.demo) { if (a === 0) { say(intro); intro = null; saidAngle = 0; rebase(); relabel(); } return; }
    if (G.demo || (a === saidAngle && !p.mode && !p.connected && !p.shade && !p.stamp.length && !p.fell)) return;
    saidAngle = a;
    const parts = [];
    if (p.mode) {
      if (mode === 'fold') parts.push(t('book.closed'));
      else if (mode === 'pop') parts.push(t(G.tabs.length ? 'book.popBridge' : 'book.pop', { a }));
      else if (a === 0) parts.push(t('book.opened'));
      else parts.push(t(a >= F.SHADE_MIN ? 'book.lean' : 'book.open', { a }));
    } else parts.push(t('angle', { a }));
    if (p.fell) { parts.push(...new Set(p.stamp.map((e) => t(e.type === 'door' ? 'doorOpened' : e.type === 'ink' ? 'inkPrinted' : 'glued'))), p.fell); say(parts.join(t('sep'))); relabel(); return; }
    if (p.connected) parts.push(t('connected'));
    else if (p.lost) parts.push(t('lost'));
    for (const e of p.stamp) parts.push(t(e.type === 'door' ? 'doorOpened' : e.type === 'ink' ? 'inkPrinted' : 'glued'));
    if (p.shade || (G.shade.size && !p.mode)) {
      const st = G.state, on = [...G.shade.keys()].map((k) => k.split(',').map(Number)).filter(([c, r]) => !F.isFloor(F.at(st, c, r)));
      if (on.length) parts.push(t('shadowOn', { cells: on.map(([c, r]) => pos(c, r)).join(t('list')) }));
      else if (p.shade && !G.shade.size) parts.push(t('shadowGone'));
    }
    say(parts.join(t('sep')));
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
    const lv = I.level(G.levels[G.index].id), st = G.state, g = goalCell();
    $('#bb-flip').hidden = st.pages < 3;   // 「翻」 only in books with a third page (vol. 2 ch. 6)
    buildGrid(); rebase(); pend = newPend(); saidAngle = Math.round(G.angle);
    intro = t('intro', { n: G.index + 1, name: lv.name, line: lv.line, you: pos(st.char.c, st.char.r), goal: g ? pos(g.c, g.r) : t('elsewhere') });
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
  // the closed book was turned over: say which page now faces, what the press did, and whether a road broke
  bus.on('flip', ({ face, events, crush }) => {
    buzz([20, 40, 20]);
    pend.stamp = events.slice();
    if (crush) { pend.fell = t(crush === 'glue' ? 'crushedGlue' : 'crushedFlip'); }
    const parts = [t(face ? 'turned' : 'turnedBack')];
    checkReach();
    if (pend.connected) parts.push(t('connected')); else if (pend.lost) parts.push(t('lost'));
    for (const e of pend.stamp) parts.push(t(e.type === 'door' ? 'doorOpened' : e.type === 'ink' ? 'inkPrinted' : 'glued'));
    if (pend.fell) parts.push(pend.fell);
    pend = newPend(); say(parts.join(t('sep'))); rebase(); relabel();
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
    const stack = G.mode === 'fold' && F.isRight(ch.c) ? t('stack', { c: F.mirror(ch.c) + 1 }) : '';
    say(t(e.already ? 'already' : 'arrived', { pos: pos(ch.c, ch.r) }) + stack);
  });
  bus.on('blocked', ({ c, r, why, dc, text }) => {
    const st = G.state, s = sfx();
    const pc = Math.max(0, Math.min(st.w - 1, c));
    if (s) s.thud(panOf(pc, Math.max(0, Math.min(st.h - 1, r))));
    if (text) return;                       // main.js showed the reason as a toast, which is announced
    if (why === 'path') return say(t('cantReach'));
    const ch = st.char;
    let reason = 'step';
    if (r < 0 || r >= st.h || c < 0 || c >= (G.mode === 'fold' ? N : st.w)) reason = 'edge';
    else if (G.mode !== 'fold' && ((ch.c === N - 1 && dc === 1) || (ch.c === N && dc === -1))) reason = 'crease';
    else {
      const ts = G.mode === 'fold' ? [F.at(st, c, r), F.at(st, F.mirror(c), r)] : [F.at(st, c, r)];
      if (ts.includes('x')) reason = 'stone';
      else if (ts.includes('D')) reason = 'door';
      else reason = 'gap';
    }
    say(t('no.' + reason));
  });
  bus.on('slide', () => { const ch = G.state.char; say(t('slid', { pos: pos(ch.c, ch.r) })); rebase(); relabel(); });
  // crushed / fell: the reason goes at the end of the fold announcement so "a path connects" cannot drown it
  bus.on('crush', ({ text }) => { pend.fell = text; pend.connected = false; soon(); });
  bus.on('fall', () => { rebase(); relabel(); const ch = G.state.char; if (gridActive) focusCell(ch.c, ch.r); });
  bus.on('undo', () => { clearTimeout(flushT); pend = newPend(); saidAngle = Math.round(G.angle); rebase(); relabel(); place(); const ch = G.state.char; say(t('undone', { pos: pos(ch.c, ch.r), a: Math.round(G.angle) })); });
  bus.on('toast', (t) => say(t));
  bus.on('win', ({ text, next }) => {
    say(t('win', { text: text.replace(/[。.]$/, ''), next }));
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
    }).filter(Boolean).map((d) => t('dir.' + d));
    let goal = '';
    if (g) {
      const gc = G.mode === 'fold' ? F.proj(g.c) : g.c, cc = G.mode === 'fold' ? F.proj(ch.c) : ch.c;
      const dy = g.r - ch.r, dx = gc - cc, bits = [];
      if (dy) bits.push(t('goalSteps', { dir: t(dy > 0 ? 'dir.down' : 'dir.up'), n: Math.abs(dy) }));
      if (dx) bits.push(t('goalSteps', { dir: t(dx > 0 ? 'dir.right' : 'dir.left'), n: Math.abs(dx) }));
      goal = t('goal', { opp: F.isRight(g.c) === F.isRight(ch.c) || G.mode === 'fold' ? '' : t('goalOpp'), bits: bits.join(t('sep')) || t('here') });
    }
    say(t('where', { pos: pos(ch.c, ch.r), page: t(F.isRight(ch.c) ? (G.state.face ? 'thirdPage' : 'rightPage') : 'leftPage'), ways: ways.join(t('list')) || t('nowhere'), a: Math.round(G.angle), goal }));
    if (gridActive) focusCell(ch.c, ch.r);
  }

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
      KeyT: () => G.flip(),
      KeyH: () => G.hint(), KeyR: () => G.reset(),
      KeyU: () => doUndo(), KeyZ: () => doUndo(),
      KeyL: () => (e.shiftKey ? scanAll() : scanRow(gridEl.contains(document.activeElement) ? focus.r : G.state.char.r)),
      KeyW: () => whereAmI(),
      KeyM: () => setOpt('audio', !opts.audio),
      Slash: () => say(t('help')),
    }[k];
    if (!act || (k === 'KeyZ' && !e.ctrlKey && !e.metaKey)) return;
    e.preventDefault();
    G.sound.ensure();
    act();
  });
  function doUndo() { if (!G.undo()) say(t('nothingToUndo')); }
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
    G.toast(t('suggestToast'));
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
    else if (a === 'flip') G.flip();
    else if (a === 'undo') doUndo();
    else if (a === 'row') scanRow(G.state.char.r);
    else if (a === 'where') whereAmI();
    else if (a.startsWith('go')) { const [dc, dr] = a.slice(2).split(',').map(Number); G.step(dc, dr); }
  }));

  // ---------- settings sheet ----------
  $('#btn-a11y').addEventListener('click', () => { $('#sheet-a11y').hidden = false; });
  document.querySelectorAll('[data-opt]').forEach((s) => s.addEventListener('click', () => setOpt(s.dataset.opt, !opts[s.dataset.opt])));
  $('#a11y-help').textContent = t('help');

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
    const bits = [t('lvAria', { n: i + 1, name: lvName(i) })];
    if (b.classList.contains('done')) bits.push(t('lvDone'));
    if (b.classList.contains('current')) bits.push(t('lvCurrent'));
    b.setAttribute('aria-label', cap(bits.join(t('sep'))));
  })).observe($('#level-grid'), { childList: true });

  // a new language: relabel the grid and the help, then say so in the new voice
  I.onChange(() => {
    $('#a11y-help').textContent = t('help');
    relabel();
    say(t('langSet'));
  });

  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  apply();
  buildGrid(); rebase();
  window.FoldA11y = { say, label, scanRow, scanAll, whereAmI, setOpt };
})();
