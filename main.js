// Fold — rendering, input and sound. Game rules live in logic.js, levels in levels.js.
(() => {
  const F = window.FoldLogic;
  const { N } = F;
  const $ = (s) => document.querySelector(s);

  const ui = {
    book: $('#book'), left: $('#page-left'), right: $('#page-right'), grab: $('#grab'),
    slider: $('#fold'), modeWord: $('#mode-word'), angleNum: $('#angle-num'),
    name: $('#level-name'), line: $('#level-line'), toast: $('#toast'),
    sheetLevels: $('#sheet-levels'), sheetWin: $('#sheet-win'), levelGrid: $('#level-grid'),
    winText: $('#win-text'), next: $('#btn-next'), tilt: $('#btn-tilt'),
  };

  const MODE_WORD = { open: '打开', pop: '立起', fold: '合上' };
  const done = new Set(JSON.parse(localStorage.getItem('fold.done') || '[]'));

  let index = 0, state, angle = 0, mode = 'open', won = false;
  let cells = [], charEl, tabs = [], walkTimer = null, tween = null;

  // ---------- sound: tiny WebAudio synth ----------
  const sound = (() => {
    let ctx, noise, rustleGain;
    function ensure() {
      if (ctx) return ctx.state === 'suspended' && ctx.resume();
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noise = buf;
      // continuous paper rustle, gain driven by fold speed
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.7;
      rustleGain = ctx.createGain(); rustleGain.gain.value = 0;
      src.connect(bp).connect(rustleGain).connect(ctx.destination); src.start();
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
      rustle(speed) { if (rustleGain) rustleGain.gain.setTargetAtTime(Math.min(0.22, speed * 0.004), ctx.currentTime, 0.05); },
      crease() { burst(900, 0.9, 0.12, 0.5, 'lowpass'); tone(110, 0.12, 0.35); burst(4200, 2, 0.05, 0.12); },
      unfold() { burst(1600, 0.8, 0.09, 0.2); },
      tick() { tone(1320, 0.05, 0.05, 0, 'triangle'); },
      step() { tone(520 + Math.random() * 60, 0.05, 0.05, 0, 'triangle'); },
      nope() { tone(180, 0.08, 0.08, 0, 'triangle'); },
      stamp() { tone(82, 0.22, 0.45); burst(500, 1, 0.18, 0.4, 'lowpass'); tone(990, 0.3, 0.06, 0.05); },
      win() { [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, 0.7, 0.09, i * 0.09)); },
    };
  })();

  // ---------- layout ----------
  function layout() {
    const h = state.h;
    const availW = Math.min(window.innerWidth - 24, 1100);
    const availH = window.innerHeight - document.querySelector('.top').offsetHeight -
      document.querySelector('.controls').offsetHeight - 40;
    const cell = Math.floor(Math.min(availW / (2 * N + 1.4), availH / (h + 0.7), 92));
    document.documentElement.style.setProperty('--cell', cell + 'px');
    document.documentElement.style.setProperty('--rows', h);
  }

  // ---------- rendering ----------
  const SVG = {
    G: '<svg viewBox="0 0 40 40"><path d="M14 33V8" stroke="#2b2a28" stroke-width="2.2" stroke-linecap="round"/><path d="M15 8.5l13 5-13 5z" fill="var(--accent)"/></svg>',
    k: '<svg viewBox="0 0 40 40"><circle cx="14" cy="20" r="6" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M20 20h13M28 20v5M32 20v4" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/></svg>',
    D: '<svg viewBox="0 0 40 40"><circle cx="20" cy="17" r="3.6" fill="var(--accent)"/><path d="M20 19v8" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/></svg>',
    i: '<svg viewBox="0 0 40 40"><path d="M20 7c6 1 12 5 12 12 1 7-5 13-12 13-8 0-13-5-13-12 0-6 4-9 6-10 2-2 4-3 7-3z" fill="#2b2a28"/><circle cx="33" cy="9" r="2" fill="#2b2a28"/></svg>',
  };

  function build() {
    const lv = LEVELS[index];
    state = F.create(lv);
    won = false;
    stopWalk();
    for (const page of [ui.left, ui.right]) page.querySelectorAll('.cell, .char, .tab').forEach((e) => e.remove());
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
    charEl.innerHTML = '<i></i>' + (index === 0 ? '<b class="tag">你</b>' : '');
    ui.name.textContent = `${index + 1} / ${LEVELS.length} · ${lv.name}`;
    ui.line.textContent = lv.line;
    layout();
    paintTiles();
    placeChar(true);
    applyAngle();
    hideSheets();
    coachMarks();
  }

  function paintTiles() {
    state.grid.forEach((row, r) => row.forEach((t, c) => {
      const el = cells[r][c];
      const kind = { '-': 'empty', '.': 'floor', S: 'floor', G: 'goal', x: 'stone', k: 'key', D: 'door', o: 'open', i: 'ink', p: 'pop' }[t];
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
    ui.book.dataset.mode = mode;
    ui.slider.value = Math.round(a);
    ui.angleNum.textContent = Math.round(a) + '°';
    ui.modeWord.textContent = MODE_WORD[mode];
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
    if (next !== mode) changeMode(mode, next);
    if (next === 'fold' && !demo) document.body.classList.remove('coach-fold');
    applyAngle();
  }

  function changeMode(prev, next) {
    mode = next;
    if (next === 'fold') {
      sound.crease();
      const events = F.stamp(state);
      if (events.length) {
        paintTiles();
        setTimeout(() => sound.stamp(), 120);
        events.forEach((e) => e.cells.forEach(({ c, r }) => flash(cells[r][c])));
      }
      pulseLinks();
    } else if (prev === 'fold') sound.unfold();
    else sound.tick();
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

  function tweenTo(target, ms = 650) {
    cancelTween();
    const from = angle, t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      setAngle(from + (target - from) * ease(t), false);
      if (t < 1) tween = requestAnimationFrame(step); else tween = null;
    };
    tween = requestAnimationFrame(step);
  }
  function cancelTween() { if (tween) cancelAnimationFrame(tween); tween = null; }

  // gentle magnets at the three postures
  function snap() {
    if (angle > 140) tweenTo(180, 260);
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
    const path = F.findPath(state, target, mode);
    if (!path) { sound.nope(); flash(cells[r][c], 'nope'); return; }
    walk(path);
  }

  function walk(path) {
    const next = () => {
      if (!path.length) { walkTimer = null; return; }
      const n = path.shift();
      const ok = F.neighbours(state, state.char, mode).some((p) => p.c === n.c && p.r === n.r);
      if (!ok) { walkTimer = null; return; }
      state.char = n;
      placeChar(false);
      sound.step();
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
      const last = index === LEVELS.length - 1;
      ui.winText.textContent = last ? '全部完成。等 Duo 到了，用真的折痕再玩一次。' : `「${LEVELS[index].name}」完成`;
      ui.next.textContent = last ? '回到第一关' : '下一关';
      setTimeout(() => (ui.sheetWin.hidden = false), 300);
    }, 180);
    return true;
  }

  function go(i) { if (demo) endDemo(false); index = (i + LEVELS.length) % LEVELS.length; build(); if (angle) tweenTo(0, 500); }

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
    goal.insertAdjacentHTML('beforeend', '<b class="tag">终点</b>');
    cells[1][1].insertAdjacentHTML('beforeend', '<b class="tag coach tap-tip">点格子走过去</b>');
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
    ui.toast.textContent = text; ui.toast.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => ui.toast.classList.remove('show'), 4200);
  }
  function hideSheets() { ui.sheetLevels.hidden = true; ui.sheetWin.hidden = true; }

  function openLevels() {
    ui.levelGrid.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const b = document.createElement('button');
      b.className = 'lv' + (done.has(i) ? ' done' : '') + (i === index ? ' current' : '');
      b.innerHTML = `<span>${i + 1}</span>${lv.name}`;
      b.onclick = () => go(i);
      ui.levelGrid.appendChild(b);
    });
    ui.sheetLevels.hidden = false;
  }

  $('#btn-levels').onclick = openLevels;
  $('#btn-hint').onclick = () => (index === 0 ? playDemo() : toast(LEVELS[index].hint));
  $('#btn-reset').onclick = () => go(index);
  ui.next.onclick = () => go(index + 1);
  document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = hideSheets));
  document.querySelectorAll('.sheet').forEach((s) => s.addEventListener('click', (e) => { if (e.target === s && s.id !== 'sheet-win') hideSheets(); }));
  document.querySelectorAll('.presets [data-a]').forEach((b) => (b.onclick = () => { sound.ensure(); tweenTo(+b.dataset.a); }));

  ui.slider.addEventListener('input', () => { sound.ensure(); setAngle(+ui.slider.value); });
  ui.slider.addEventListener('change', snap);

  // drag the crease: pull left to close
  ui.grab.addEventListener('pointerdown', (e) => {
    sound.ensure();
    ui.grab.setPointerCapture(e.pointerId);
    const x0 = e.clientX, a0 = angle, pageW = ui.left.offsetWidth;
    const move = (ev) => setAngle(a0 + ((x0 - ev.clientX) / pageW) * 180);
    const up = () => { ui.grab.removeEventListener('pointermove', move); ui.grab.removeEventListener('pointerup', up); snap(); };
    ui.grab.addEventListener('pointermove', move);
    ui.grab.addEventListener('pointerup', up);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'f') tweenTo(angle > 120 ? 0 : 180);
    if (e.key === 'h') tweenTo(90);
    if (e.key === 'r') go(index);
    if (e.key === 'Escape') hideSheets();
  });

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
        try { if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return toast('没有获得体感权限'); }
        catch { return toast('没有获得体感权限'); }
      }
      tiltOn = !tiltOn;
      ui.tilt.classList.toggle('on', tiltOn);
      ui.tilt.textContent = tiltOn ? '体感：开' : '体感';
      if (tiltOn) { tiltA = angle; window.addEventListener('deviceorientation', onTilt); toast('左右倾斜手机来折叠'); }
      else window.removeEventListener('deviceorientation', onTilt);
    };
  }

  window.addEventListener('resize', layout);
  build();
  if (!localStorage.getItem('fold.intro')) setTimeout(playDemo, 500);
})();
