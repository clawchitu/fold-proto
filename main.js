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
  let cells = [], els = [], charEl, tabs = [], walkTimer = null, tween = null;
  // vol. 3 ch. 12 「三折」 (docs/design-ch12.md §1): a trifold's third page hangs off the right page's outer edge on a crease of
  // its own. It is drawn as a child of the right page (so flat, it lifts with it: one rigid leaf) and swings on its own
  // left edge while the book lies flat. `angle` is always the hinge IN VIEW: the book's, or (face 2) the third page's —
  // logic.js reads face 2 as an ordinary book right | third, so every rule below applies unchanged.
  const tri = () => !!state && F.trifold(state);
  ui.third = document.createElement('div'); ui.third.className = 'page third'; ui.third.id = 'page-third'; ui.third.hidden = true;
  ui.third.innerHTML = '<div class="light"></div>'; ui.right.appendChild(ui.third);
  ui.crease = document.createElement('button'); ui.crease.id = 'btn-crease'; ui.crease.className = 'crease'; ui.crease.hidden = true;
  ui.crease.setAttribute('aria-keyshortcuts', 'P'); ui.crease.setAttribute('aria-pressed', 'false');
  $('#btn-flip').after(ui.crease);
  ui.bbCrease = document.createElement('button'); ui.bbCrease.id = 'bb-crease'; ui.bbCrease.hidden = true; ui.bbCrease.setAttribute('aria-keyshortcuts', 'P');
  $('#bb-flip').after(ui.bbCrease);
  // the map column (0–11) behind a visible column — what the trifold's texts and hints count in
  const mapCol = (c, r) => (!tri() ? c : c < 0 ? c + N : F.colOf(state, c, r));
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
    const pages = state && F.trifold(state) ? 3 : 2;   // ch. 12: the third page lies beside the right page
    const cell = Math.floor(Math.min(availW / (pages * N + 2 * pages * k), availH / (h + 2 * k), opts.big ? 150 : 92));
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
    h: '<svg viewBox="0 0 40 40"><path d="M6 25l10-4 4-13 4 13 10 4-12 2-2 7-2-7z" fill="none" stroke="#4a433b" stroke-width="2" stroke-linejoin="round"/><path d="M16 21l4 2 4-2" fill="none" stroke="#4a433b" stroke-width="1.4" stroke-linecap="round"/></svg>',   // vol. 3 ch. 10: the paper crane (an outline + one fold line; design-vol3.md §1.2)
    g: '<svg viewBox="0 0 40 40"><path d="M20 9c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z" fill="none" stroke="#8a5a14" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 24a4 4 0 0 0 3 4" fill="none" stroke="#8a5a14" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };

  function build() {
    hintRung = 0;
    const lv = LEVELS[index];
    state = F.create(lv);
    won = false;
    // paper per volume: vol. 1 xuan paper (levels 1–25), vol. 2 letter paper with a printed grid (design-v2c1.md §2)
    document.body.dataset.paper = index >= 25 ? 'letter' : 'xuan';
    document.body.dataset.face = 0;
    // from chapter 3 the lamp is lit: a Lean preset (135°) lands where the shadows show (Half, 90°, casts none)
    $('#btn-lean').hidden = index < 13;
    // from chapter 6 the book has a third page: 「翻」 turns the closed book over (logic.js flip)
    $('#btn-flip').hidden = state.pages < 3 || tri();
    // ch. 12: the second crease — the 「第三页」 toggle switches which hinge the slider and the buttons drive
    ui.crease.hidden = ui.bbCrease.hidden = !tri(); ui.third.hidden = !tri();
    document.body.classList.toggle('trifold', tri());
    ui.crease.setAttribute('aria-pressed', 'false'); ui.bbCrease.setAttribute('aria-pressed', 'false'); ui.crease.classList.remove('on');
    stopWalk();
    for (const page of [ui.left, ui.right, ui.third]) page.querySelectorAll('.cell, .char, .tab, .shadow').forEach((e) => e.remove());
    shadowEls = new Map(); shade = new Map(); rideSrc = null;
    // one element per visible column: the right page shows whichever face of the leaf is turned towards the left page.
    // Trifold: one element per MAP column (left | right | third page); viewCells() says which one each visible column is.
    els = Array.from({ length: state.h }, (_, r) => Array.from({ length: tri() ? 3 * N : 2 * N }, (_, m) => {
      const el = document.createElement('div');
      el.className = 'cell';
      el.style.setProperty('--x', m % N); el.style.setProperty('--y', r);
      el.dataset.c = m; el.dataset.r = r;
      el.addEventListener('click', () => { const v = visOf(m); if (v != null) onTap(v, r); });
      (m < N ? ui.left : m < 2 * N ? ui.right : ui.third).appendChild(el);
      return el;
    }));
    viewCells();
    buildTabs();
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

  // ch. 12: visible column ↔ element. Face 0 shows all twelve map columns; face 2 (the third page on its own crease) shows the
  // right page as the flat page and the third page as the lifted one; face 3 reads the folded leaf through the right page's squares.
  function visOf(m) {
    if (!tri()) return m;
    if (state.face === 2) return m < N ? null : m - N;
    if (state.face === 3) return m < 2 * N ? m : null;
    return m;
  }
  function viewCells() {
    if (!tri()) { cells = els; return; }
    const w = F.vw(state), off = state.face === 2 ? N : 0;
    cells = els.map((row) => Array.from({ length: w }, (_, v) => row[v + off]));
  }
  // the face changed (a crease was switched, a death laid the letter flat, undo): redraw what each element shows
  function refreshView() {
    document.body.dataset.face = state.face;
    viewCells();
    shadowEls.forEach((el) => el.remove()); shadowEls = new Map();
    els.flat().forEach((el) => { delete el.dataset.kind; el.classList.remove('through'); });
    shade = F.shadows(state, angle); rideSrc = null;
    ui.third.hidden = !tri() || state.face === 3;
    const flap = tri() && state.face === 2;
    ui.crease.setAttribute('aria-pressed', String(flap)); ui.bbCrease.setAttribute('aria-pressed', String(flap));
    ui.crease.classList.toggle('on', flap);
    paintTiles(); buildTabs(); applyAngle(); placeChar(true);
    bus.emit('view', { face: state.face });
  }
  const KIND = { '-': 'empty', '.': 'floor', S: 'floor', G: 'goal', x: 'stone', r: 'loose', k: 'key', D: 'door', o: 'open', i: 'ink', I: 'wet', p: 'pop', g: 'glue', A: 'gate', h: 'crane' };
  function paintEl(el, t) {
    const kind = KIND[t];
    if (el.dataset.kind === kind) return;
    el.dataset.kind = kind;
    el.innerHTML = kind === 'empty' ? '' : `<div class="tile">${SVG[t === 'S' ? '' : t === 'I' ? 'i' : t === 'A' ? 'o' : t === 'r' ? 'x' : t] || ''}</div>`;
  }
  function paintTiles() {
    if (tri()) {
      // face 2: the left page lies flat aside, out of reach — drawn as it is; face 3: the right leaf has two layers, and a
      // square showing the right page through a hole of the third page is marked (.through)
      if (state.face === 2) for (let r = 0; r < state.h; r++) for (let m = 0; m < N; m++) paintEl(els[r][m], state.grid[r][m]);
      if (state.face === 3) cells.forEach((row, r) => row.forEach((el, c) => el.classList.toggle('through', c >= N && F.colOf(state, c, r) < 2 * N && F.at(state, c, r) !== '-')));
    }
    cells.forEach((row, r) => row.forEach((el, c) => {
      const t = F.at(state, c, r);
      const kind = { '-': 'empty', '.': 'floor', S: 'floor', G: 'goal', x: 'stone', r: 'loose', k: 'key', D: 'door', o: 'open', i: 'ink', I: 'wet', p: 'pop', g: 'glue', A: 'gate', h: 'crane' }[t];
      if (el.dataset.kind === kind) return;
      el.dataset.kind = kind;
      el.innerHTML = kind === 'empty' ? '' : `<div class="tile">${SVG[t === 'S' ? '' : t === 'I' ? 'i' : t === 'A' ? 'o' : t === 'r' ? 'x' : t] || ''}</div>`;
    }));
  }
  function buildTabs() {
    tabs.forEach((t) => t.remove()); tabs = [];
    for (let r = 0; r < state.h; r++) {
      if (F.at(state, N - 1, r) === 'p' && F.at(state, N, r) === 'p') {
        const t = document.createElement('div');
        t.className = 'tab'; t.style.setProperty('--y', r);
        ui.left.appendChild(t); tabs.push(t);
      }
    }
  }

  // 「翻」: turn the closed book over. The page facing the left page changes; keys, ink and glue between the two now
  // pressed pages fire; a stone on the new facing page over your square comes down on you (design-ch6.md §1).
  function flipBook() {
    sound.ensure();
    if (won || demo) return;
    const why = F.flipBlock(state, angle);
    if (why) { sound.nope(); const text = t('no.flip.' + why); toast(text); bus.emit('blocked', { why: 'flip', reason: why, text }); return; }
    stopWalk(); cancelTween();
    pushUndo();
    const { events, crush } = F.flip(state);
    document.body.dataset.face = state.face;
    ui.right.classList.remove('turned'); void ui.right.offsetWidth; ui.right.classList.add('turned');
    sound.crease();
    lastStamp = events;
    paintTiles(); buildTabs(); applyAngle(); placeChar(true);   // vol. 3 ch. 10: the turn is a press — a crane under your feet flew to the third page with you (logic.flip moved state.char)
    if (events.length) { setTimeout(() => sound.stamp(), 120); events.forEach((e) => e.cells.forEach(({ c, r }) => flash(cells[r][c]))); }
    pulseLinks();
    bus.emit('flip', { face: state.face, events, crush });
    if (crush) {
      const text = t(crush === 'glue' ? 'crushedGlue' : 'crushedFlip');
      sound.fall(); charEl.classList.remove('fall'); void charEl.offsetWidth; charEl.classList.add('fall');
      toast(text); bus.emit('crush', { cause: crush, text });
      // a crush by the turn starts the level again: grids, face and figure as they began (else on 6-3 the next opening
      // crushes her again under the same third-page stone). The book stays shut; undo still steps back before the turn.
      setTimeout(() => {
        F.restart(state); document.body.dataset.face = state.face; shade = F.shadows(state, angle); rideSrc = null;
        charEl.classList.remove('fall'); paintTiles(); buildTabs(); applyAngle(); placeChar(true); bus.emit('fall');
      }, 260);
      return;
    }
    checkWin();
  }

  function placeChar(instant) {
    const { c, r } = state.char;
    let page = c < N ? ui.left : ui.right, x = c % N;
    if (tri() && state.face === 2) { page = c < 0 ? ui.left : c < N ? ui.right : ui.third; x = (c + N) % N; }   // the flap's view: right | third, the left page aside
    else if (tri() && c >= 2 * N) { page = ui.third; x = c - 2 * N; }
    if (charEl.parentNode !== page) { page.appendChild(charEl); instant = true; }
    charEl.classList.toggle('instant', !!instant);
    charEl.style.setProperty('--x', x); charEl.style.setProperty('--y', r);
    if (!instant) { charEl.classList.remove('hop'); void charEl.offsetWidth; charEl.classList.add('hop'); }
  }

  function applyAngle() {
    const a = angle, rad = (a * Math.PI) / 180;
    // ch. 12: in the flap's view (face 2) the book lies flat and the third page turns on its own crease
    const flap = tri() && state.face === 2, lifted = flap ? ui.third : ui.right, still = flap ? ui.right : ui.third;
    lifted.style.transform = `rotateY(${-a}deg) translateZ(${-(a / 180) * 2}px)`;
    still.style.transform = '';
    // the camera orbits a little mid-fold so the standing page faces you, and recentres when closed
    const pw = ui.left.offsetWidth, shift = (pw / 2) * (1 - Math.cos(rad)) / 2 + (tri() && state.face !== 3 ? -pw / 2 : 0);   // ch. 12: three pages wide, centred
    ui.book.style.transform = `rotateX(16deg) translateX(${shift}px) rotateY(${24 * Math.sin(rad)}deg)`;
    // tracing paper: the closing page's paper turns see-through, its tiles stay solid
    const veil = a < 110 ? 1 : 1 - 0.62 * Math.min(1, (a - 110) / 70);
    lifted.style.backgroundColor = `rgba(247, 244, 238, ${veil.toFixed(3)})`; still.style.backgroundColor = '';
    ui.left.querySelector('.shade').style.opacity = flap ? '0' : (Math.sin(rad) * 0.55).toFixed(3);
    lifted.querySelector('.light').style.opacity = (Math.sin(rad) * 0.12).toFixed(3);
    still.querySelector('.light').style.opacity = '0';
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
        el.style.setProperty('--y', r); (tri() && state.face === 2 ? ui.right : ui.left).appendChild(el); shadowEls.set(key, el);   // face 2: the right page is the flat page
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
    if (F.crushed(state, state.char, angle) || F.offBook(state, state.char, angle)) return fall();   // ch. 12: closed with the third page open, you on it
    if (!F.isFloor(F.at(state, c, r))) {
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
    // say why: the glue pulled the stone onto you, a stone came down on you, or the shadow you stood on slid away
    // ch. 12: 'off' — the book closed with the third page lying open; it swung out past the left page, with you on it
    const cause = F.crushCause(state, state.char, angle), text = t(cause === 'off' ? 'fellOff' : cause === 'glue' ? 'crushedGlue' : cause ? 'crushed' : 'fell');
    toast(text);
    bus.emit('crush', { cause: cause || 'fell', text });
    setTimeout(() => {
      charEl.classList.remove('fall');
      // a trifold starts again laid out flat (the start square may be under the folded third page, or in another view)
      if (tri()) { cancelTween(); F.restart(state); angle = 0; mode = 'open'; refreshView(); bus.emit('fall'); return; }
      state.char = { ...state.start }; placeChar(true); bus.emit('fall');
    }, 260);
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
    // ch. 12: the third page will not fold down onto a stone under your feet — the fold stops short, with a toast (not a death)
    const refused = state && tri() && state.face === 2 && a >= F.FOLD_MIN && F.flapBlock(state);   // 'stone' | 'cover' (its paper would lie on you)
    if (refused) {
      a = F.FOLD_MIN - 5;
      if (!setAngle.blocked) { setAngle.blocked = true; sound.nope(); const text = t(refused === 'cover' ? 'tri.covered' : 'tri.blocked'); toast(text); bus.emit('blocked', { why: 'flap', reason: refused, text }); }
    } else if (a < F.FOLD_MIN - 10) setAngle.blocked = false;
    const prevA = angle;
    angle = a;
    const next = F.modeOf(a);
    if (state && F.passes(prevA, a)) rollStones();   // vol. 3: the lifted page passed upright — loose stones roll before the shadows are read
    if (!demo && state) updateShade();
    if (next !== mode) changeMode(mode, next);
    if (next === 'fold' && !demo) document.body.classList.remove('coach-fold');
    applyAngle();
  }

  // Loose stones (vol. 3 ch. 9): the page passed upright. Roll them, repaint, say what moved.
  function rollStones() {
    const events = F.roll(state);
    if (!events.length) return;
    paintTiles(); sound.slide();
    events.forEach((e) => flash(cells[e.cells[1].r][e.cells[1].c]));
    const last = events[events.length - 1];
    toast(t(last.filled ? 'rolledIn' : 'rolled', { col: t('col', { c: mapCol(last.cells[1].c, last.cells[1].r) + 1 }) }));
    bus.emit('roll', events);
  }

  function changeMode(prev, next) {
    mode = next;
    if (next === 'fold') {
      sound.crease();
      if (state.pages > 2 && !tri() && !localStorage.getItem('fold.layerRule')) { localStorage.setItem('fold.layerRule', '1'); toast(t('layerRule')); }
      const events = F.stamp(state);
      const was = state.char; state.char = F.carried(events, state.char);   // vol. 3 ch. 10: the crane under your feet flew to its mirror cell, with you (the same stack while closed)
      // ch. 12: the third page pressed down onto the right page. The solver (check.js flapOf) reads a folded flap as the folded
      // leaf at once (face 3): you stand on its top layer, and there is no walking between the right and the third page. Stay in
      // the flap's view but re-read the figure the same way, so opening the flap again matches the solver exactly.
      if (tri() && state.face === 2) {
        const out = F.flapOut(state, state.char, true);
        if (out) { state.face = 3; state.char = F.flapIn(state, out); state.face = 2; placeChar(true); }
      }
      if (state.char !== was) { placeChar(true); toast(t('carried', { col: t('col', { c: mapCol(state.char.c, state.char.r) + 1 }) })); }
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
    if (tri() && state.face === 2 && mode === 'fold') { sound.nope(); const text = t('tri.walkFolded'); toast(text); bus.emit('blocked', { c, r, why: 'path', reason: 'folded', text }); return; }
    if (tri() && state.face === 2 && state.char.c < 0) { sound.nope(); const text = t('tri.aside'); toast(text); bus.emit('blocked', { c, r, why: 'path', reason: 'aside', text }); return; }
    const target = { c, r };
    const path = F.findPath(state, target, mode, shade);
    if (!path) {
      sound.nope(); flash(cells[r][c], 'nope');
      const b = F.pathBlock(state, target, mode, shade) || { why: 'gap', c, r };
      const why = mode === 'fold' && b.why === 'stone' ? 'stoneTop' : mode === 'fold' && b.why === 'card' ? 'stoneUnder' : b.why;
      const text = t('cantReachWhy', { why: t('why.' + why), pos: t('pos', { r: b.r + 1, c: (mode === 'fold' ? b.c : mapCol(b.c, b.r)) + 1 }) });
      toast(text);
      bus.emit('blocked', { c, r, why: 'path', reason: b.why, text });
      return;
    }
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
    if (tri() && state.face === 2 && (mode === 'fold' || state.char.c < 0)) { sound.nope(); const text = t(mode === 'fold' ? 'tri.walkFolded' : 'tri.aside'); toast(text); bus.emit('blocked', { why: 'step', reason: 'flap', text }); return; }
    const ch = state.char, col = (p) => (mode === 'fold' ? F.proj(p.c) : p.c);
    const to = F.neighbours(state, ch, mode, shade).find((n) => col(n) === col(ch) + dc && n.r === ch.r + dr);
    if (!to) {
      sound.nope();
      const b = F.stepBlock(state, ch, dc, dr, mode, shade) || { why: 'step' };
      const text = t('no.' + b.why);
      toast(text);
      bus.emit('blocked', { c: mode === 'fold' ? col(ch) + dc : ch.c + dc, r: ch.r + dr, why: 'step', reason: b.why, dc, dr, text });
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
    const lv = LEVELS[index], main = LEVELS.filter((l) => !l.optional), mainCount = main.length;
    ui.name.textContent = lv.optional
      ? t('darkHead', { n: LEVELS.slice(0, index + 1).filter((l) => l.optional).length, name: lvText(index).name })
      : t('levelHead', { n: main.indexOf(lv) + 1, total: mainCount, name: lvText(index).name });
    ui.line.textContent = lvText(index).line;
  }

  function go(i) { if (demo) endDemo(false); index = (i + LEVELS.length) % LEVELS.length; build(); if (angle) tweenTo(0, 500); }

  // ---------- undo, stepped folding (no precision or timing needed) ----------
  let undoStack = [];
  function pushUndo() {
    undoStack.push({ grid: state.grid.map((row) => row.slice()), char: { ...state.char }, angle, face: state.face });   // ch. 12: face 2's angle is the third page's
    if (undoStack.length > 200) undoStack.shift();
  }
  function undo() {
    const s = undoStack.pop();
    if (!s) return false;
    cancelTween(); stopWalk();
    state.grid = s.grid; state.char = s.char; angle = s.angle; state.face = s.face;
    document.body.dataset.face = state.face;
    mode = F.modeOf(angle); shade = F.shadows(state, angle); rideSrc = null; won = false;
    ui.sheetWin.hidden = true; charEl.classList.remove('joy');
    if (tri()) refreshView(); else { paintTiles(); buildTabs(); placeChar(true); applyAngle(); }
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

  // ---------- ch. 12: the second crease ----------
  // 「第三页」: take hold of the other crease. Only one moves at a time — the third page only while the book lies flat, the
  // book only while the third page lies flat or folded all the way onto the right page (logic.js flapIn / flapOut).
  function switchCrease() {
    sound.ensure();
    if (won || demo || !tri()) return;
    stopWalk(); cancelTween();
    const no = (key) => { sound.nope(); const text = t(key); toast(text); bus.emit('blocked', { why: 'crease', reason: key, text }); };
    if (state.face !== 2) {
      if (angle > 3) return no('tri.bookFirst');
      pushUndo();
      const folded = state.face === 3;
      state.char = F.flapIn(state, state.char); state.face = 2; angle = folded ? 180 : 0;
    } else {
      const folded = angle >= F.FOLD_MIN;
      if (!folded && angle > 3) return no('tri.flapFirst');
      const out = F.flapOut(state, state.char, folded);
      if (!out || F.flapBlock(state)) return no(F.flapBlock(state) === 'cover' ? 'tri.covered' : 'tri.blocked');
      pushUndo();
      state.char = out; state.face = folded ? 3 : 0; angle = 0;
    }
    mode = F.modeOf(angle);
    refreshView();
    toast(t(state.face === 2 ? 'tri.onFlap' : state.face === 3 ? 'tri.onBookFolded' : 'tri.onBookFlat'));
    bus.emit('crease', { face: state.face });
    checkWin();
  }
  function creaseLabels() {
    for (const b of [ui.crease, ui.bbCrease]) { b.textContent = t('pre.third'); b.setAttribute('aria-label', t('pre.thirdLabel')); }
  }
  ui.crease.onclick = switchCrease; ui.bbCrease.onclick = switchCrease;
  creaseLabels();

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

  // chapter headings in the Levels sheet: first level index of each chapter (tools/check.js CHAPTER_START), its volume
  const CHAPTERS = [{ at: 0, vol: 1, ch: 1 }, { at: 5, ch: 2 }, { at: 13, ch: 3 }, { at: 19, ch: 4 }, { at: 25, vol: 2, ch: 5 },
    { at: LEVELS.findIndex((l) => l.chapter === 6), ch: 6 }, { at: LEVELS.findIndex((l) => l.chapter === 7), ch: 7 }, { at: LEVELS.findIndex((l) => l.chapter === 8), ch: 8 },
    { at: LEVELS.findIndex((l) => l.chapter === 9), vol: 3, ch: 9 }, { at: LEVELS.findIndex((l) => l.chapter === 10), ch: 10 }, { at: LEVELS.findIndex((l) => l.chapter === 11), ch: 11 },
    { at: LEVELS.findIndex((l) => l.chapter === 12), ch: 12 }];
  function openLevels() {
    ui.levelGrid.innerHTML = '';
    const head = (cls, text) => { const h = document.createElement('h3'); h.className = cls; h.textContent = text; ui.levelGrid.appendChild(h); };
    const firstDark = LEVELS.findIndex((l) => l.optional);
    LEVELS.forEach((lv, i) => {
      const chap = CHAPTERS.find((x) => x.at === i);
      if (chap && chap.vol) head('lv-vol', t('vol.' + chap.vol));
      if (chap) head('lv-ch', t('chHead.' + chap.ch));
      if (i === firstDark) head('lv-ch', t('chHead.dark'));
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
  $('#btn-flip').onclick = flipBook;

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
    tap: onTap, step: stepDir, foldBy, foldTo, flip: flipBook, crease: switchCrease, mapCol, undo, hint, go, layout, endDemo, toast,
    reset: () => go(index), canUndo: () => undoStack.length > 0,
  };

  // ---------- language: switch in place, keep the level, the angle and the moves ----------
  document.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => window.I18N.setLang(b.dataset.lang)));
  window.I18N.onChange(() => {
    header(); applyAngle(); creaseLabels();
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
