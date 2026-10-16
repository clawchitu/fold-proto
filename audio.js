// Fold — spatial sound for 声音模式 (audio mode).
// Left page = wood (soft marimba knock), right page = paper (breathy tone with a quiet fifth).
// Pitch by row (pentatonic, top row highest), stereo position by where the tile is in space.
// Everything runs through a gentle compressor and a small wooden-room reverb.
(function (root) {
  // A4 F#4 E4 D4 B3 A3 — pentatonic, so any two rows heard together are consonant
  const ROW_F = [440, 370, 329.6, 293.7, 246.9, 220];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  function create(ctx) {
    const out = ctx.createDynamicsCompressor();
    out.threshold.value = -20; out.knee.value = 18; out.ratio.value = 3; out.attack.value = 0.004; out.release.value = 0.25;
    out.connect(ctx.destination);
    const master = ctx.createGain(); master.gain.value = 0.9; master.connect(out);
    const verb = ctx.createConvolver(); verb.buffer = room(1.2);
    const dark = ctx.createBiquadFilter(); dark.type = 'lowpass'; dark.frequency.value = 2600;
    const wet = ctx.createGain(); wet.gain.value = 0.2;
    master.connect(verb); verb.connect(dark).connect(wet).connect(out);

    const len = ctx.sampleRate * 2, noise = ctx.createBuffer(1, len, ctx.sampleRate), nd = noise.getChannelData(0);
    for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;

    function room(sec) {
      const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
      }
      return b;
    }
    // a voice: gain -> stereo panner -> master; torn down after it has rung out
    function voice(pan, vol, life = 2) {
      const g = ctx.createGain(); g.gain.value = vol;
      const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1);
      g.connect(p).connect(master);
      setTimeout(() => { g.disconnect(); p.disconnect(); }, life * 1000 + 400);
      return g;
    }
    const T = (when) => ctx.currentTime + 0.005 + (when || 0);
    function env(g, t, a, peak, d) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    }
    function osc(dest, type, f, t, a, peak, d, f2) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
      env(g, t, a, peak, d); o.connect(g).connect(dest); o.start(t); o.stop(t + a + d + 0.05);
    }
    function hiss(dest, t, dur, type, f, q, peak, a = 0.004, f2) {
      const s = ctx.createBufferSource(); s.buffer = noise;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
      if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + dur);
      const g = ctx.createGain(); env(g, t, a, peak, dur);
      s.connect(fl).connect(g).connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + a + dur + 0.05);
    }

    // ---- instruments ----
    function wood(dest, f, t, v) {
      osc(dest, 'sine', f, t, 0.004, v, 0.5);
      osc(dest, 'sine', f * 3.93, t, 0.002, v * 0.2, 0.06);
      hiss(dest, t, 0.02, 'bandpass', Math.min(f * 5, 6000), 3, v * 0.12);
    }
    function paper(dest, f, t, v) {
      osc(dest, 'sine', f, t, 0.018, v * 0.75, 0.55);
      osc(dest, 'triangle', f * 1.5, t, 0.02, v * 0.1, 0.35);
      hiss(dest, t, 0.07, 'bandpass', 3000, 1.2, v * 0.3, 0.01);
    }
    const api = {
      ROW_F,
      note(page, f, pan, v = 1, when = 0) { (page === 'paper' ? paper : wood)(voice(pan, 0.32 * v), f, T(when), 1); },
      // nothing here: a breath of air
      air(pan, v = 1, when = 0) { hiss(voice(pan, 0.3 * v), T(when), 0.16, 'bandpass', 380, 0.7, 0.35, 0.04); },
      // a walkable shadow: the row's note, muffled and soft
      shadow(f, pan, v = 1, when = 0) {
        const g = voice(pan, 0.3 * v), t = T(when);
        osc(g, 'sine', f, t, 0.06, 0.5, 0.5); hiss(g, t, 0.3, 'lowpass', 520, 0.5, 0.35, 0.06);
      },
      stone(pan, v = 1, when = 0) {
        const g = voice(pan, 0.4 * v), t = T(when);
        osc(g, 'sine', 96, t, 0.004, 0.9, 0.22, 70); hiss(g, t, 0.1, 'lowpass', 380, 0.8, 0.5);
      },
      door(pan, v = 1, when = 0) {
        const g = voice(pan, 0.35 * v), t = T(when);
        [0, 0.12].forEach((d) => { wood(g, 196, t + d, 0.7); hiss(g, t + d, 0.05, 'lowpass', 900, 1, 0.5); });
      },
      opened(f, pan, v = 1, when = 0) {
        const g = voice(pan, 0.3 * v), t = T(when);
        wood(g, f, t, 1); hiss(g, t + 0.03, 0.22, 'bandpass', 600, 4, 0.25, 0.05, 900);
      },
      bell(f, pan, v = 1, when = 0) {
        const g = voice(pan, 0.22 * v), t = T(when);
        osc(g, 'sine', f, t, 0.002, 0.6, 1.0); osc(g, 'sine', f * 2.76, t, 0.002, 0.18, 0.3);
      },
      ink(f, pan, v = 1, when = 0) {
        const g = voice(pan, 0.3 * v), t = T(when);
        osc(g, 'sine', f, t, 0.03, 0.7, 0.4, f * 0.94); hiss(g, t, 0.12, 'lowpass', 700, 1, 0.2, 0.02);
      },
      flick(pan, v = 1, when = 0) { hiss(voice(pan, 0.28 * v), T(when), 0.12, 'bandpass', 800, 2, 0.6, 0.01, 2400); },
      // "you are here": a soft double heartbeat
      you(pan, when = 0) {
        const g = voice(pan, 0.4), t = T(when);
        osc(g, 'sine', 72, t, 0.006, 0.6, 0.12); osc(g, 'sine', 72, t + 0.17, 0.006, 0.4, 0.12);
      },
      step(page, f, pan, when = 0) {
        const g = voice(pan, 0.4), t = T(when);
        if (page === 'paper') { hiss(g, t, 0.06, 'bandpass', 2400 + Math.random() * 400, 0.9, 0.35); }
        else { hiss(g, t, 0.05, 'bandpass', 480 + Math.random() * 120, 1.4, 0.55); osc(g, 'sine', 140, t, 0.003, 0.18, 0.06); }
        osc(g, 'sine', f, t, 0.01, 0.06, 0.18);          // a whisper of the row's pitch, so you feel up/down
      },
      thud(pan) {
        const g = voice(pan, 0.4), t = T(0);
        osc(g, 'sine', 82, t, 0.004, 0.7, 0.2, 52); hiss(g, t, 0.12, 'lowpass', 260, 0.7, 0.5);
      },
      // the goal's motif: a little music-box phrase, D5 A5 F#5
      motif(pan, v = 1, when = 0) {
        const g = voice(pan, 0.3 * v, 2.5), t = T(when);
        [587.3, 880, 740].forEach((f, i) => {
          osc(g, 'sine', f, t + i * 0.17, 0.004, 0.55, 0.9); osc(g, 'sine', f * 4, t + i * 0.17, 0.002, 0.05, 0.12);
        });
      },
      // a connection formed across the fold: a rolled D-major add9, ear to ear
      chord(v = 1) {
        const t = T(0);
        [293.7, 440, 587.3, 740, 659.3].forEach((f, i) => {
          const g = voice(-0.6 + i * 0.3, 0.2 * v, 2.5);
          (i % 2 ? paper : wood)(g, f, t + i * 0.06, 1);
        });
      },
      softChord() { const t = T(0); [440, 659.3].forEach((f, i) => paper(voice(i ? 0.3 : -0.3, 0.16, 2), f, t + i * 0.07, 1)); },
      lost() { const t = T(0); [329.6, 293.7].forEach((f, i) => wood(voice(0, 0.14), f, t + i * 0.14, 1)); },
    };
    return api;
  }

  root.FoldAudio = { create, ROW_F };
})(this);
