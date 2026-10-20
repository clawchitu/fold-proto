// Fold — rendering, input and sound. Game rules live in logic.js, levels in levels.js.
(() => {
  const F = window.FoldLogic;
  const { N } = F;
  const $ = (s) => document.querySelector(s);
  const { t } = window.I18N, lvText = (i) => window.I18N.level(LEVELS[i].id);

  const ui = {
    book: $('#book'), left: $('#page-left'), right: $('#page-right'), grab: $('#grab'),
    slider: $('#fold'), modeWord: $('#mode-word'), angleNum: $('#angle-num'),
    name: $('#level-name'), line: $('#level-line'), toast: $('#toast'),
    sheetLevels: $('#sheet-levels'), sheetWin: $('#sheet-win'), levelGrid: $('#level-grid'),
    winText: $('#win-text'), next: $('#btn-next'), tilt: $('#btn-tilt'),
  };

  const STEP = 15;                                   // keyboard / button fold step, degrees
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const opts = Object.assign({ audio: false, speak: false, hc: matchMedia('(prefers-contrast: more)').matches, big: false, motor: false },
    JSON.parse(localStorage.getItem('fold.a11y') || '{}'));
  // tiny event bus: a11y.js listens to the game through it
  const bus = (() => { const m = {}; return { on: (e, f) => (m[e] ||= []).push(f), emit: (e, d) => (m[e] || []).forEach((f) => f(d)) }; })();
  const done = new Set(JSON.parse(localStorage.getItem('fold.done') || '[]'));

  let index = 0, state, angle = 0, mode = 'open', won = false;
  let cells = [], charEl, tabs = [], walkTimer = null, tween = null;
  let shade = new Map(), shadowEls = new Map(), rideSrc = null;

  // ---------- sound: tiny WebAudio synth ----------
  const sound = (() => {
    let ctx, noise, rustleGain;
    let rustlePan;
    function ensure() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noise = buf;
      // continuous paper rustle, gain driven by fold speed
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.7;
      rustleGain = ctx.createGain(); rustleGain.gain.value = 0;
      rustlePan = ctx.createStereoPanner();
      src.connect(bp).connect(rustleGain).connect(rustlePan).connect(ctx.destination); src.start();
      return ctx;
    }
    function burst(freq, q, dur, vol, type = 'bandpass') {
      if (!ctx) return;
      const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(ctx.destination); src.start(t, Math.random()); src.stop(t + dur);
    }
    function tone(freq, dur, vol, at = 0, type = 'sine') {
      if (!ctx) return;
      const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    return {
      ensure,
      pan(p) { if (rustlePan) rustlePan.pan.setTargetAtTime(p, ctx.currentTime, 0.05); },
      rustle(speed) { if (rustleGain) rustleGain.gain.setTargetAtTime(Math.min(0.22, speed * 0.004), ctx.currentTime, 0.05); },
      crease() { burst(900, 0.9, 0.12, 0.5, 'lowpass'); tone(110, 0.12, 0.35); burst(4200, 2, 0.05, 0.12); },
      unfold() { burst(1600, 0.8, 0.09, 0.2); },
      tick() { if (opts.audio) return; tone(1320, 0.05, 0.05, 0, 'triangle'); },
      step() { if (opts.audio) return; tone(520 + Math.random() * 60, 0.05, 0.05, 0, 'triangle'); },
      nope() { if (opts.audio) return; tone(180, 0.08, 0.08, 0, 'triangle'); },
      stamp() { tone(82, 0.22, 0.45); burst(500, 1, 0.18, 0.4, 'lowpass'); tone(990, 0.3, 0.06, 0.05); },
      win() { [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, 0.7, 0.09, i * 0.09)); },
      slide() { burst(700, 1.2, 0.08, 0.18, 'lowpass'); },
      fall() { tone(300, 0.25, 0.12, 0, 'triangle'); tone(150, 0.3, 0.1, 0.12, 'triangle'); },
    };
  })();

  // ---------- layout ----------
  function layout() {
    const h = state.h;
    const availW = Math.min(window.innerWidth - 24, 1100);
    const availH = window.innerHeight - document.querySelector('.top').offsetHeight -
      document.querySelector('.controls').offsetHeight - 40;
    const k = opts.big ? 0.15 : 0.35;                // page margin, in cells
    const cell = Math.floor(Math.min(availW / (2 * N + 4 * k), availH / (h + 2 * k), opts.big ? 150 : 92));
    document.documentElement.style.setProperty('--cell', cell + 'px');
    document.documentElement.style.setProperty('--pad-k', k);
    bus.emit('layout');
    document.documentElement.style.setProperty('--rows', h);
  }

  // ---------- rendering ----------
  const SVG = {
    G: '<svg viewBox="0 0 40 40"><path d="M14 33V8" stroke="#2b2a28" stroke-width="2.2" stroke-linecap="round"/><path d="M15 8.5l13 5-13 5z" fill="var(--accent)"/></svg>',
    k: '<svg viewBox="0 0 40 40"><circle cx="14" cy="20" r="6" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M20 20h13M28 20v5M32 20v4" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/></svg>',
    D: '<svg viewBox="0 0 40 40"><circle cx="20" cy="17" r="3.6" fill="var(--accent)"/><path d="M20 19v8" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/></svg>',
    i: '<svg viewBox="0 0 40 40"><path d="M20 7c6 1 12 5 12 12 1 7-5 13-12 13-8 0-13-5-13-12 0-6 4-9 6-10 2-2 4-3 7-3z" fill="#2b2a28"/><circle cx="33" cy="9" r="2" fill="#2b2a28"/></svg>',
    // glue (vol. 2): a wet drop with a highlight; the amber smear itself is the tile background (style.css)
    g: '<svg viewBox="0 0 40 40"><path d="M20 9c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z" fill="none" stroke="#8a5a14" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 24a4 4 0 0 0 3 4" fill="none" stroke="#8a5a14" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };

  function build() {
    hintRung = 0;
    const lv = LEVELS[index];
    state = F.create(lv);
    won = false;
    // paper per volume: vol. 1 xuan paper (levels 1–25), vol. 2 letter paper with a printed grid (design-v2c1.md §2)
    document.body.dataset.paper = index >= 25 ? 'letter' : 'xuan';
    stopWalk();
    for (const page of [ui.left, ui.right]) page.querySelectorAll('.cell, .char, .tab, .shadow').forEach((e) => e.remove());
    shadowEls = new Map(); shade = new Map(); rideSrc = null;
    cells = state.grid.map((row, r) => row.map((_, c) => {
      const el = document.createElement('div');
      el.className = 'cell';
      el.style.setProperty('--x', c % N); el.style.setProperty('--y', r);
      el.dataset.c = c; el.dataset.r = r;
      el.addEventListener('click', () => onTap(c, r));
      (c < N ? ui.left : ui.right).appendChild(el);
      return el;
    }));
    tabs = [];
    state.grid.forEach((row, r) => {
      if (row[N - 1] === 'p' && row[N] === 'p') {
        const t = document.createElement('div');
        t.className = 'tab'; t.style.setProperty('--y', r);
        ui.left.appendChild(t); tabs.push(t);
      }
    });
    charEl = document.createElement('div');
    charEl.className = 'char';
    charEl.innerHTML = '<i></i>' + (index === 0 ? `<b class="tag" data-i18n="you">${t('you')}</b>` : '');
    header();
    layout();
    paintTiles();
    placeChar(true);
    shade = F.shadows(state, angle);
    applyAngle();
    hideSheets();
    coachMarks();
    undoStack = [];
    bus.emit('build');
  }

  function paintTiles() {
    state.grid.forEach((row, r) => row.forEach((t, c) => {
      const el = cells[r][c];
      const kind = { '-': 'empty', '.': 'floor', S: 'floor', G: 'goal', x: 'stone', k: 'key', D: 'door', o: 'open', i: 'ink', p: 'pop', g: 'glue' }[t];
      if (el.dataset.kind === kind) return;
      el.dataset.kind = kind;
      el.innerHTML = kind === 'empty' ? '' : `<div class="tile">${SVG[t === 'S' ? '' : t] || ''}</div>`;
    }));
  }

  function placeChar(instant) {
    const { c, r } = state.char;
    const page = c < N ? ui.left : ui.right;
    if (charEl.parentNode !== page) { page.appendChild(charEl); instant = true; }
    charEl.classList.toggle('instant', !!instant);
    charEl.style.setProperty('--x', c % N); charEl.style.setProperty('--y', r);
    if (!instant) { charEl.classList.remove('hop'); void charEl.offsetWidth; charEl.classList.add('hop'); }
  }

  function applyAngle() {
    const a = angle, rad = (a * Math.PI) / 180;
    ui.right.style.transform = `rotateY(${-a}deg) translateZ(${-(a / 180) * 2}px)`;
    // the camera orbits a little mid-fold so the standing page faces you, and recentres when closed
    const shift = (ui.left.offsetWidth / 2) * (1 - Math.cos(rad)) / 2;
    ui.book.style.transform = `rotateX(16deg) translateX(${shift}px) rotateY(${24 * Math.sin(rad)}deg)`;
    // tracing paper: the closing page's paper turns see-through, its tiles stay solid
    const veil = a < 110 ? 1 : 1 - 0.62 * Math.min(1, (a - 110) / 70);
    ui.right.style.backgroundColor = `rgba(247, 244, 238, ${veil.toFixed(3)})`;
    ui.left.querySelector('.shade').style.opacity = (Math.sin(rad) * 0.55).toFixed(3);
    ui.right.querySelector('.light').style.opacity = (Math.sin(rad) * 0.12).toFixed(3);
    const pop = Math.max(0, Math.sin(rad)) * (a < 180 ? 1 : 0);
    tabs.forEach((t) => {
      t.style.transform = `rotateY(${-a / 2}deg)`;
      t.classList.toggle('up', mode === 'pop');
      t.style.opacity = (0.35 + 0.65 * pop).toFixed(3);
    });
    paintShadows();
    ui.book.dataset.mode = mode;
    ui.slider.value = Math.round(a);
    ui.angleNum.textContent = Math.round(a) + '°';
    ui.modeWord.textContent = t('mode.' + (mode !== 'fold' && a >= F.SHADE_MIN ? 'lean' : mode));
    ui.slider.setAttribute('aria-valuetext', `${ui.modeWord.textContent} ${Math.round(a)}°`);
    bus.emit('angle');
  }

  // Shadows of right-page stones, foreshortened by the lean of the page.
  function paintShadows() {
    const squash = Math.max(0.3, -Math.cos((angle * Math.PI) / 180));
    for (const [key, el] of shadowEls) if (!shade.has(key)) { el.remove(); shadowEls.delete(key); }
    for (const [key, src] of shade) {
      let el = shadowEls.get(key);
      const [q, r] = key.split(',').map(Number);
      if (!el) {
        el = document.createElement('div'); el.className = 'shadow';
        el.style.setProperty('--y', r); ui.left.appendChild(el); shadowEls.set(key, el);
      }
      el.style.setProperty('--x', q); el.style.setProperty('--squash', squash.toFixed(3));
      el.dataset.src = src;
    }
  }

  // The angle moved: shadows shift; a character standing on nothing but shadow goes with them.
  function updateShade() {
    const before = shade;
    shade = F.shadows(state, angle);
    const { c, r } = state.char;
    const key = c + ',' + r;
    if (F.crushed(state, state.char, angle)) return fall();
    if (!F.isRight(c) && !F.isFloor(F.at(state, c, r))) {
      if (rideSrc == null) rideSrc = before.get(key) ?? shade.get(key) ?? null;
      const to = F.ride(state, state.char, rideSrc, angle);
      if (!to) return fall();
      if (to.c !== c) { state.char = to; placeChar(false); sound.slide(); bus.emit('slide'); }
    } else rideSrc = null;
    if ([...shade.keys()].join() !== [...before.keys()].join()) {
      if (shade.size) sound.tick();
      bus.emit('shade', before);
    }
  }

  function fall() {
    stopWalk(); rideSrc = null;
    sound.fall();
    charEl.classList.remove('fall'); void charEl.offsetWidth; charEl.classList.add('fall');
    toast(t(angle >= F.FOLD_MIN ? 'crushed' : 'fell'));
    setTimeout(() => { state.char = { ...state.start }; charEl.classList.remove('fall'); placeChar(true); bus.emit('fall'); }, 260);
  }

  // ---------- fold angle ----------
  let lastA = 0, lastT = 0;
  function setAngle(a, fromUser = true) {
    a = Math.max(0, Math.min(180, a));
    if (fromUser) cancelTween();
    const now = performance.now(), dt = Math.max(1, now - lastT);
    sound.rustle(Math.abs(a - lastA) / dt * 16);
    lastA = a; lastT = now;
    clearTimeout(setAngle.quiet); setAngle.quiet = setTimeout(() => sound.rustle(0), 90);
    angle = a;
    const next = F.modeOf(a);
    if (!demo && state) updateShade();
    if (next !== mode) changeMode(mode, next);
    if (next === 'fold' && !demo) document.body.classList.remove('coach-fold');
    applyAngle();
  }

  function changeMode(prev, next) {
    mode = next;
    if (next === 'fold') {
      sound.crease();
      const events = F.stamp(state);
      lastStamp = events;
      if (events.length) {
        paintTiles();
        setTimeout(() => sound.stamp(), 120);
        events.forEach((e) => e.cells.forEach(({ c, r }) => flash(cells[r][c])));
      }
      pulseLinks();
    } else if (prev === 'fold') sound.unfold();
    else sound.tick();
    bus.emit('mode', { prev, next });
    checkWin();
  }

  function pulseLinks() {
    for (let r = 0; r < state.h; r++) for (let q = 0; q < N; q++) {
      const L = F.at(state, q, r), R = F.at(state, F.mirror(q), r);
      if (F.isFloor(L) && F.isFloor(R) && !F.isBlock(L) && !F.isBlock(R)) flash(cells[r][q], 'link');
    }
  }

  function flash(el, cls = 'flash') {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 900);
  }

  let lastStamp = [], tweenTarget = 0;
  function tweenTo(target, ms = 650) {
    cancelTween();
    if (reduced.matches && !demo) ms = 1;
    tweenTarget = target;
    const from = angle, t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      setAngle(from + (target - from) * ease(t), false);
      if (t < 1) tween = requestAnimationFrame(step); else { tween = null; bus.emit('settle'); }
    };
    tween = requestAnimationFrame(step);
  }
  function cancelTween() { if (tween) cancelAnimationFrame(tween); tween = null; }

  // gentle magnets at the three postures
  function snap() {
    if (angle > 165) tweenTo(180, 260);
    else if (angle > 70 && angle < 110) tweenTo(90, 260);
    else if (angle < 22) tweenTo(0, 260);
  }

  // ---------- movement ----------
  function onTap(c, r) {
    sound.ensure();
    document.body.classList.remove('coach-tap');
    if (won) return;
    stopWalk();
    const target = { c, r };
    const path = F.findPath(state, target, mode, shade);
    if (!path) { sound.nope(); flash(cells[r][c], 'nope'); bus.emit('blocked', { c, r, why: 'path' }); return; }
    if (!path.length) { bus.emit('arrive', { already: true }); return; }
    pushUndo();
    walk(path);
  }

  // One step in a screen direction (D-pad, Shift+arrows). Folded, the pages are stacked, so
  // left/right is measured on the projected column.
  function stepDir(dc, dr) {
    sound.ensure();
    if (won || demo) return;
    stopWalk();
    const ch = state.char, col = (p) => (mode === 'fold' ? F.proj(p.c) : p.c);
    const to = F.neighbours(state, ch, mode, shade).find((n) => col(n) === col(ch) + dc && n.r === ch.r + dr);
    if (!to) {
      sound.nope();
      bus.emit('blocked', { c: mode === 'fold' ? col(ch) + dc : ch.c + dc, r: ch.r + dr, why: 'step', dc, dr });
      return;
    }
    pushUndo();
    walk([to]);
  }

  function walk(path) {
    const next = () => {
      if (!path.length) { walkTimer = null; bus.emit('arrive', {}); return; }
      const n = path.shift();
      const ok = F.neighbours(state, state.char, mode, shade).some((p) => p.c === n.c && p.r === n.r);
      if (!ok) { walkTimer = null; bus.emit('arrive', {}); return; }
      state.char = n;
      rideSrc = F.isFloor(F.at(state, n.c, n.r)) ? null : shade.get(n.c + ',' + n.r) ?? null;
      placeChar(false);
      sound.step();
      bus.emit('step', n);
      if (checkWin()) { walkTimer = null; return; }
      walkTimer = setTimeout(next, 190);
    };
    walkTimer = setTimeout(next, 10);
  }
  function stopWalk() { clearTimeout(walkTimer); walkTimer = null; }

  function checkWin() {
    if (demo || won || !F.isWin(state, mode)) return false;
    won = true;
    done.add(index); localStorage.setItem('fold.done', JSON.stringify([...done]));
    setTimeout(() => {
      sound.win();
      charEl.classList.add('joy');
      winTexts();
      setTimeout(() => (ui.sheetWin.hidden = false), 300);
      bus.emit('win', { text: ui.winText.textContent, next: ui.next.textContent });
    }, 180);
    return true;
  }

  function winTexts() {
    const last = index === LEVELS.length - 1;
    ui.winText.textContent = last ? t('allDone') : t('levelDone', { name: lvText(index).name });
    ui.next.textContent = t(last ? 'first' : 'next');
  }
  function header() {
    const lv = LEVELS[index], mainCount = LEVELS.filter((l) => !l.optional).length;
    ui.name.textContent = lv.optional
      ? t('darkHead', { n: LEVELS.slice(0, index + 1).filter((l) => l.optional).length, name: lvText(index).name })
      : t('levelHead', { n: index + 1, total: mainCount, name: lvText(index).name });
    ui.line.textContent = lvText(index).line;
  }

  function go(i) { if (demo) endDemo(false); index = (i + LEVELS.length) % LEVELS.length; build(); if (angle) tweenTo(0, 500); }

  // ---------- undo, stepped folding (no precision or timing needed) ----------
  let undoStack = [];
  function pushUndo() {
    undoStack.push({ grid: state.grid.map((row) => row.slice()), char: { ...state.char }, angle });
    if (undoStack.length > 200) undoStack.shift();
  }
  function undo() {
    const s = undoStack.pop();
    if (!s) return false;
    cancelTween(); stopWalk();
    state.grid = s.grid; state.char = s.char; angle = s.angle;
    mode = F.modeOf(angle); shade = F.shadows(state, angle); rideSrc = null; won = false;
    ui.sheetWin.hidden = true; charEl.classList.remove('joy');
    paintTiles(); placeChar(true); applyAngle();
    bus.emit('undo');
    return true;
  }
  function foldTo(a) { sound.ensure(); if (demo) endDemo(true); if (Math.round(a) === Math.round(angle)) return bus.emit('settle'); pushUndo(); tweenTo(a, 380); }
  function foldBy(dir) {
    const now = tween ? tweenTarget : angle;
    const a = dir > 0 ? Math.floor(now / STEP + 1e-6) * STEP + STEP : Math.ceil(now / STEP - 1e-6) * STEP - STEP;
    foldTo(Math.max(0, Math.min(180, a)));
  }
  let hintRung = 0;   // the 「?」 ladder: the level's hint1 first (if it has one), then its hint
  function hint() {
    const tx = lvText(index);
    if (index === 0 && !opts.audio) playDemo(); else toast(tx.hint1 && hintRung++ === 0 ? tx.hint1 : tx.hint);
  }

  // ---------- onboarding (level 1): a ghost hand plays the level once, ~4 s, any tap skips ----------
  let demo = false, demoTimers = [], swallowClick = false;
  const finger = document.createElement('div');
  finger.className = 'finger'; document.body.appendChild(finger);

  function coachMarks() {
    document.querySelectorAll('.coach').forEach((e) => e.remove());
    const show = index === 0 && !demo && !done.has(0);
    document.body.classList.toggle('coach-tap', show); document.body.classList.toggle('coach-fold', show);
    if (index !== 0) return;
    const goal = cells.flat().find((el) => el.dataset.kind === 'goal');
    goal.insertAdjacentHTML('beforeend', `<b class="tag" data-i18n="goalTag">${t('goalTag')}</b>`);
    cells[1][1].insertAdjacentHTML('beforeend', `<b class="tag coach tap-tip" data-i18n="tapTip">${t('tapTip')}</b>`);
  }
  function centerOf(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function thumbAt(a) {
    const r = ui.slider.getBoundingClientRect();
    return [r.left + 11 + (r.width - 22) * (a / 180), r.top + r.height / 2];
  }
  function moveFinger([x, y], ms) {
    finger.style.transitionDuration = ms + 'ms, ' + ms + 'ms, 200ms, 200ms';
    finger.style.left = x + 'px'; finger.style.top = y + 'px';
  }

  function playDemo() {
    if (index !== 0) go(0);
    endDemo(false);
    build(); setAngle(0, false);
    demo = true;
    document.body.classList.remove('coach-tap', 'coach-fold');
    const at = (ms, fn) => demoTimers.push(setTimeout(fn, ms));
    moveFinger(thumbAt(0), 0);
    at(30, () => finger.classList.add('on'));
    at(350, () => { moveFinger(thumbAt(180), 1100); tweenTo(180, 1100); });
    at(1480, () => cells[2][6].classList.add('glow'));
    at(1750, () => moveFinger(centerOf(cells[4][1]), 520));
    at(2320, () => {
      finger.classList.add('tap');
      sound.ensure();
      walk(F.findPath(state, { c: 1, r: 4 }, mode) || []);
    });
    at(3450, () => finger.classList.remove('on', 'tap'));
    at(3600, () => { build(); demo = true; tweenTo(0, 600); });
    at(4250, () => endDemo(true));
    window.addEventListener('pointerdown', skipDemo, true);
  }
  function skipDemo(e) { e.stopPropagation(); e.preventDefault(); swallowClick = true; endDemo(true); }
  function endDemo(finished) {
    demoTimers.forEach(clearTimeout); demoTimers = [];
    window.removeEventListener('pointerdown', skipDemo, true);
    finger.classList.remove('on', 'tap');
    if (!demo) return;
    demo = false;
    cancelTween(); stopWalk();
    if (finished) {
      build(); setAngle(0, false);
      localStorage.setItem('fold.intro', '1');
      document.body.classList.add('coach-tap', 'coach-fold');
    }
  }
  window.addEventListener('click', (e) => { if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); } }, true);

  // ---------- UI wiring ----------
  function toast(text) {
    bus.emit('toast', text);
    ui.toast.textContent = text; ui.toast.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => ui.toast.classList.remove('show'), 4200);
  }
  function hideSheets() { document.querySelectorAll('.sheet').forEach((el) => (el.hidden = true)); }

  function openLevels() {
    ui.levelGrid.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const b = document.createElement('button');
      b.className = 'lv' + (done.has(i) ? ' done' : '') + (i === index ? ' current' : '');
      b.innerHTML = `<span>${lv.optional ? t('darkTag') : i + 1}</span>${lvText(i).name}`;
      b.onclick = () => go(i);
      ui.levelGrid.appendChild(b);
    });
    ui.sheetLevels.hidden = false;
  }

  $('#btn-levels').onclick = openLevels;
  $('#btn-hint').onclick = hint;
  $('#btn-reset').onclick = () => go(index);
  ui.next.onclick = () => go(index + 1);
  document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = hideSheets));
  document.querySelectorAll('.sheet').forEach((s) => s.addEventListener('click', (e) => { if (e.target === s && s.id !== 'sheet-win') hideSheets(); }));
  document.querySelectorAll('.presets [data-a]').forEach((b) => (b.onclick = () => { sound.ensure(); pushUndo(); tweenTo(+b.dataset.a); }));

  let sliding = false;
  ui.slider.addEventListener('input', () => { sound.ensure(); if (!sliding) { sliding = true; pushUndo(); } setAngle(+ui.slider.value); });
  ui.slider.addEventListener('change', () => { sliding = false; snap(); bus.emit('settle'); });

  // drag the crease: pull left to close
  ui.grab.addEventListener('pointerdown', (e) => {
    sound.ensure();
    ui.grab.setPointerCapture(e.pointerId);
    pushUndo();
    const x0 = e.clientX, a0 = angle, pageW = ui.left.offsetWidth;
    const move = (ev) => setAngle(a0 + ((x0 - ev.clientX) / pageW) * 180);
    const up = () => { ui.grab.removeEventListener('pointermove', move); ui.grab.removeEventListener('pointerup', up); snap(); bus.emit('settle'); };
    ui.grab.addEventListener('pointermove', move);
    ui.grab.addEventListener('pointerup', up);
  });

  // letter shortcuts (F / Shift+F / H / R / U …) live in a11y.js
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideSheets(); });

  // phones: tilt left/right as a stand-in for the hinge sensor
  let tiltOn = false, tiltA = 0;
  function onTilt(e) {
    if (e.gamma == null) return;
    const target = Math.min(1, Math.abs(e.gamma) / 70) * 180;
    tiltA += (target - tiltA) * 0.25;
    setAngle(tiltA);
  }
  if ('DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) {
    ui.tilt.hidden = false;
    ui.tilt.onclick = async () => {
      sound.ensure();
      if (!tiltOn && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try { if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return toast(t('tiltDenied')); }
        catch { return toast(t('tiltDenied')); }
      }
      tiltOn = !tiltOn;
      ui.tilt.classList.toggle('on', tiltOn);
      ui.tilt.textContent = t(tiltOn ? 'tiltOn' : 'tilt');
      if (tiltOn) { tiltA = angle; window.addEventListener('deviceorientation', onTilt); toast(t('tiltHow')); }
      else window.removeEventListener('deviceorientation', onTilt);
    };
  }

  window.FoldGame = {
    bus, opts, sound, STEP, reduced,
    get state() { return state; }, get angle() { return angle; }, get mode() { return mode; },
    get index() { return index; }, get won() { return won; }, get shade() { return shade; }, get demo() { return demo; },
    get lastStamp() { return lastStamp; }, get tabs() { return tabs; },
    cells: () => cells, levels: LEVELS,
    tap: onTap, step: stepDir, foldBy, foldTo, undo, hint, go, layout, endDemo, toast,
    reset: () => go(index), canUndo: () => undoStack.length > 0,
  };

  // ---------- language: switch in place, keep the level, the angle and the moves ----------
  document.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => window.I18N.setLang(b.dataset.lang)));
  window.I18N.onChange(() => {
    header(); applyAngle();
    if (!ui.sheetWin.hidden || won) winTexts();
    if (!ui.sheetLevels.hidden) { const f = ui.levelGrid.contains(document.activeElement); openLevels(); if (f) ui.levelGrid.querySelector('.current')?.focus(); }
    ui.tilt.textContent = t(tiltOn ? 'tiltOn' : 'tilt');
    requestAnimationFrame(layout);
  });
  window.I18N.applyStatic();

  window.addEventListener('resize', layout);
  build();
  // the ghost-hand demo is a visual lesson: skip it for audio mode and reduced motion
  if (!localStorage.getItem('fold.intro') && !opts.audio && !reduced.matches) setTimeout(() => { if (!opts.audio) playDemo(); }, 500);
})();
