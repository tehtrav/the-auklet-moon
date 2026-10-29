// All sounds are made with code (no sound files needed yet):
// waves, seabirds, cats chatting, crickets at night, and soft music.

export function createAudio() {
  let ctx = null;
  let master, musicBus, ambienceBus, ambienceFilter, waveGain, waveFilter;
  let started = false;
  let muted = false;
  let musicOn = true;
  const timers = { wave: 0, bird: 2, gull: 6, meow: 8, cricket: 0, chord: 0, pluck: 1, drip: 1 };
  let chordIndex = 0;
  let env = { day: 1, night: 0, underground: 0 };

  function start() {
    if (started) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? 0.22 : 0;
    // A little echo for a dreamy sound.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 1800;
    musicBus.connect(master);
    musicBus.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(fb);
    fb.connect(delay);
    delayFilter.connect(master);

    ambienceFilter = ctx.createBiquadFilter();
    ambienceFilter.type = 'lowpass';
    ambienceFilter.frequency.value = 20000;
    ambienceBus = ctx.createGain();
    ambienceBus.gain.value = 1;
    ambienceBus.connect(ambienceFilter);
    ambienceFilter.connect(master);

    // Ocean: filtered noise that swells like waves.
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoise(ctx, 4);
    noise.loop = true;
    waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.value = 700;
    waveGain = ctx.createGain();
    waveGain.gain.value = 0.05;
    noise.connect(waveFilter);
    waveFilter.connect(waveGain);
    waveGain.connect(ambienceBus);
    noise.start();

    started = true;
  }

  function setMuted(v) {
    muted = v;
    if (master) master.gain.setTargetAtTime(v ? 0 : 0.8, ctx.currentTime, 0.1);
  }
  function setMusic(v) {
    musicOn = v;
    if (musicBus) musicBus.gain.setTargetAtTime(v ? 0.22 : 0, ctx.currentTime, 0.3);
  }

  // ----- Sound makers -----
  function wave() {
    const now = ctx.currentTime;
    const loud = (0.25 + 0.75 * env.day) * 0.55 + 0.12; // loud by day, gentle at night
    const g = waveGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(loud, now + 2.2);
    g.linearRampToValueAtTime(loud * 0.18, now + 6.5);
    waveFilter.frequency.cancelScheduledValues(now);
    waveFilter.frequency.setValueAtTime(450, now);
    waveFilter.frequency.linearRampToValueAtTime(1300, now + 2.2);
    waveFilter.frequency.linearRampToValueAtTime(450, now + 6.5);
  }

  function chirp(pan = 0) {
    const now = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 4);
    const base = 2600 + Math.random() * 1600;
    for (let i = 0; i < n; i++) {
      const t = now + i * 0.11;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 1.4, t + 0.06);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.04 * env.day, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g);
      g.connect(panner(pan));
      o.start(t);
      o.stop(t + 0.1);
    }
  }

  function gull(pan = 0) {
    const now = ctx.currentTime;
    const calls = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < calls; i++) {
      const t = now + i * 0.32;
      const o = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(900, t);
      o.frequency.linearRampToValueAtTime(1350, t + 0.08);
      o.frequency.linearRampToValueAtTime(800, t + 0.28);
      f.type = 'bandpass';
      f.frequency.value = 1600;
      f.Q.value = 3;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05 * env.day, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(f);
      f.connect(g);
      g.connect(panner(pan));
      o.start(t);
      o.stop(t + 0.32);
    }
  }

  // A synthesized "mew". pitch > 1 sounds like a kit.
  function meow(pitch = 1, volume = 0.08, pan = 0, bus = ambienceBus) {
    const now = ctx.currentTime;
    const dur = 0.55 + Math.random() * 0.2;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const p = 500 * pitch;
    o.frequency.setValueAtTime(p * 0.9, now);
    o.frequency.linearRampToValueAtTime(p * 1.45, now + dur * 0.35);
    o.frequency.linearRampToValueAtTime(p * 0.8, now + dur);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 5;
    f1.frequency.setValueAtTime(900 * pitch, now);
    f1.frequency.linearRampToValueAtTime(1900 * pitch, now + dur * 0.4);
    f1.frequency.linearRampToValueAtTime(800 * pitch, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.06);
    g.gain.setValueAtTime(volume, now + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(f1);
    f1.connect(g);
    const pn = ctx.createStereoPanner();
    pn.pan.value = pan;
    g.connect(pn);
    pn.connect(bus);
    o.start(now);
    o.stop(now + dur + 0.05);
  }

  function cricket(pan = 0) {
    const now = ctx.currentTime;
    const freq = 4200 + Math.random() * 700;
    const pulses = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < pulses; i++) {
      const t = now + i * 0.045;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.025 * env.night, t + 0.005);
      g.gain.linearRampToValueAtTime(0, t + 0.025);
      o.connect(g);
      g.connect(panner(pan));
      o.start(t);
      o.stop(t + 0.03);
    }
  }

  function drip() {
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    const f = 1200 + Math.random() * 800;
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(f * 2, now + 0.05);
    g.gain.setValueAtTime(0.06 * env.underground, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    o.connect(g);
    g.connect(master);
    o.start(now);
    o.stop(now + 0.3);
  }

  // Calm music: slow chords with music-box notes on top.
  const CHORDS = [
    [50, 57, 62, 66], // D
    [47, 54, 59, 62], // Bm
    [43, 50, 55, 59], // G
    [45, 52, 57, 61], // A
  ];
  const SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81]; // D major pentatonic
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function chord() {
    const now = ctx.currentTime;
    const notes = CHORDS[chordIndex % CHORDS.length];
    chordIndex++;
    const dur = 9;
    for (const n of notes) {
      for (const detune of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = mtof(n);
        o.detune.value = detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.035, now + 2.5);
        g.gain.setValueAtTime(0.035, now + dur - 3);
        g.gain.linearRampToValueAtTime(0, now + dur + 1);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 900;
        o.connect(f);
        f.connect(g);
        g.connect(musicBus);
        o.start(now);
        o.stop(now + dur + 1.2);
      }
    }
  }

  function pluck() {
    const now = ctx.currentTime;
    const n = SCALE[Math.floor(Math.random() * SCALE.length)] - (env.night > 0.5 ? 12 : 0);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = mtof(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.09, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    o.connect(g);
    g.connect(musicBus);
    o.start(now);
    o.stop(now + 2.3);
  }

  function panner(pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(ambienceBus);
    return p;
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const rpan = () => rnd(-0.8, 0.8);

  // Called every frame.
  function update(dt, newEnv) {
    env = newEnv;
    if (!started || ctx.state !== 'running') return;

    // Muffle the outside world when underground.
    const ug = env.underground;
    ambienceFilter.frequency.setTargetAtTime(20000 * (1 - ug) + 350 * ug, ctx.currentTime, 0.3);
    ambienceBus.gain.setTargetAtTime(1 - ug * 0.6, ctx.currentTime, 0.3);

    for (const k in timers) timers[k] -= dt;
    if (timers.wave <= 0) { wave(); timers.wave = rnd(6.5, 9); }
    if (env.day > 0.3) {
      if (timers.bird <= 0) { chirp(rpan()); timers.bird = rnd(1.5, 5); }
      if (timers.gull <= 0) { gull(rpan()); timers.gull = rnd(8, 18); }
      if (timers.meow <= 0) { meow(rnd(0.85, 1.5), 0.035, rpan()); timers.meow = rnd(10, 25); }
    }
    if (env.night > 0.4 && timers.cricket <= 0) {
      cricket(rpan());
      if (Math.random() < 0.5) cricket(rpan());
      timers.cricket = rnd(0.25, 0.8);
    }
    if (ug > 0.5 && timers.drip <= 0) { drip(); timers.drip = rnd(1.5, 4); }
    if (timers.chord <= 0) { chord(); timers.chord = 8; }
    if (timers.pluck <= 0) {
      if (Math.random() < 0.7) pluck();
      timers.pluck = env.night > 0.5 ? rnd(1.8, 3.5) : rnd(1, 2.4);
    }
  }

  return {
    start,
    update,
    playerMeow: (kit = false) => started && meow(kit ? 1.6 : 1.15, 0.16, 0, master),
    setMuted,
    setMusic,
    get muted() { return muted; },
    get musicOn() { return musicOn; },
  };
}

function makeNoise(ctx, seconds) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      // Soft "pink-ish" noise
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
  }
  return buf;
}
