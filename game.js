(() => {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // Canvas emoji font stack. iOS Safari falls back to a non-color glyph (just
  // the outline/shadow) when the canvas font is plain 'serif', so we name the
  // platform color-emoji fonts explicitly here. (Newer iOS only — older iOS
  // can't render color emoji on canvas at all, which is why the character
  // sprites are drawn as DOM elements via #sprite-layer instead.)
  const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", serif';
  function emojiFont(px) { return px + 'px ' + EMOJI_FONT; }

  const spriteLayer = document.getElementById('sprite-layer');

  function makeSprite(emoji, size, extraClass) {
    const el = document.createElement('div');
    el.className = 'sprite' + (extraClass ? ' ' + extraClass : '');
    el.style.fontSize = size + 'px';
    el.style.width = Math.ceil(size * 1.3) + 'px';
    el.style.height = Math.ceil(size * 1.3) + 'px';
    el.textContent = emoji;
    spriteLayer.appendChild(el);
    return el;
  }

  function positionSprite(el, x, y) {
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }

  const sprites = {
    player: null,
    bear: null,
    pets: [],
    stations: {},
    shop: null,
    bossPortal: null,
  };

  function rebuildLevelSprites() {
    Object.values(sprites.stations).forEach(el => el.remove());
    sprites.stations = {};
    if (sprites.shop) { sprites.shop.remove(); sprites.shop = null; }
    if (sprites.bossPortal) { sprites.bossPortal.remove(); sprites.bossPortal = null; }

    const L = LEVELS[state ? state.currentLevel : 1] || LEVELS[1];
    for (const s of L.stations) {
      const el = makeSprite(s.emoji, 28, 'sprite-station');
      positionSprite(el, s.x, s.y);
      sprites.stations[s.id] = el;
    }
    if (L.shopPos) {
      sprites.shop = makeSprite('\u26E9\uFE0F', 30, 'sprite-shop');
      positionSprite(sprites.shop, L.shopPos.x, L.shopPos.y);
    }
    if (L.bossPortal) {
      sprites.bossPortal = makeSprite('\u{1F480}', 36, 'sprite-boss');
      positionSprite(sprites.bossPortal, L.bossPortal.x, L.bossPortal.y);
    }
  }

  function updateSprites() {
    if (!sprites.player) {
      sprites.player = makeSprite('\u{1F467}', 36, 'sprite-player');
    }
    positionSprite(sprites.player, player.x, player.y);

    if (state.bear) {
      if (!sprites.bear) {
        sprites.bear = makeSprite('\u{1F43B}', 40, 'sprite-bear');
      }
      sprites.bear.style.fontSize = Math.round(40 * state.bear.size) + 'px';
      positionSprite(sprites.bear, state.bear.x, state.bear.y);
    } else if (sprites.bear) {
      sprites.bear.remove();
      sprites.bear = null;
    }

    while (sprites.pets.length < state.petInstances.length) {
      const pi = state.petInstances[sprites.pets.length];
      const size = (pi.id === 'dragon' || pi.id === 'unicorn') ? 34 : 28;
      const el = makeSprite(PETS[pi.id].emoji, size, 'sprite-pet-' + pi.id);
      sprites.pets.push(el);
    }
    while (sprites.pets.length > state.petInstances.length) {
      sprites.pets.pop().remove();
    }
    state.petInstances.forEach((pi, i) => {
      positionSprite(sprites.pets[i], pi.x, pi.y);
    });

    const solved = ls().solved;
    Object.entries(sprites.stations).forEach(([id, el]) => {
      el.classList.toggle('dim', !!solved[id]);
    });

    const L = currentLevel();
    if (sprites.shop) {
      sprites.shop.classList.toggle('gone', ls().shopBought);
      sprites.shop.classList.toggle('dim', ls().coins < L.coinTarget);
    }
    if (sprites.bossPortal) {
      sprites.bossPortal.classList.toggle('gone', !ls().shopBought);
      sprites.bossPortal.classList.toggle('dim', state.bossDefeated);
    }
  }

  // ==========================================================
  // LEVEL DEFINITIONS
  // ==========================================================
  const LEVELS = {
    1: {
      title: 'Level 1 \u2014 The Shadow Gate',
      coinTarget: 3,
      stations: [
        { id: 'sequence', x: 180, y: 180, label: 'Rune Sequence', emoji: '\u{1F52E}', difficulty: 1 },
        { id: 'lock',     x: 780, y: 200, label: 'Arcane Lock',   emoji: '\u{1F5DD}\uFE0F', difficulty: 1 },
        { id: 'memory',   x: 180, y: 490, label: 'Shadow Pairs',  emoji: '\u{1F300}', difficulty: 1 },
      ],
      shopPos: { x: 780, y: 480 },
      exitPos: { x: 480, y: 580 },
      playerSpawn: { x: 480, y: 330 },
      snakeSpeed: 1.5,
      snake: true,
      bear: false,
    },
    2: {
      title: 'Level 2 \u2014 The Inner Sanctum',
      coinTarget: 5,
      stations: [
        { id: 'sequence', x: 140, y: 160, label: 'Rune Sequence',   emoji: '\u{1F52E}', difficulty: 2 },
        { id: 'memory',   x: 480, y: 130, label: 'Shadow Pairs',    emoji: '\u{1F300}', difficulty: 2 },
        { id: 'lock',     x: 820, y: 160, label: 'Arcane Lock',     emoji: '\u{1F5DD}\uFE0F', difficulty: 2 },
        { id: 'circuit',  x: 220, y: 450, label: 'Rune Circuit',    emoji: '\u{1F4A1}', difficulty: 2 },
        { id: 'seer',     x: 740, y: 450, label: "Seer's Sequence", emoji: '\u{1F522}', difficulty: 2 },
      ],
      shopPos: { x: 480, y: 560 },
      exitPos: { x: 480, y: 610 },
      playerSpawn: { x: 480, y: 300 },
      snakeSpeed: 1.5,
      snake: false,
      bear: true,
    },
    3: {
      title: 'Level 3 \u2014 The Abyssal Vault',
      coinTarget: 7,
      stations: [
        { id: 'sequence', x: 130, y: 140, label: 'Rune Sequence',   emoji: '\u{1F52E}', difficulty: 3 },
        { id: 'memory',   x: 480, y: 120, label: 'Shadow Pairs',    emoji: '\u{1F300}', difficulty: 3 },
        { id: 'lock',     x: 830, y: 140, label: 'Arcane Lock',     emoji: '\u{1F5DD}\uFE0F', difficulty: 3 },
        { id: 'circuit',  x: 180, y: 330, label: 'Rune Circuit',    emoji: '\u{1F4A1}', difficulty: 3 },
        { id: 'seer',     x: 780, y: 330, label: "Seer's Sequence", emoji: '\u{1F522}', difficulty: 3 },
        { id: 'color',    x: 280, y: 500, label: 'Color Mixer',     emoji: '\u{1F3A8}' },
        { id: 'cipher',   x: 680, y: 500, label: 'Ancient Cipher',  emoji: '\u{1F524}' },
      ],
      shopPos: { x: 120, y: 430 },
      exitPos: null,
      bossPortal: { x: 480, y: 410 },
      playerSpawn: { x: 480, y: 230 },
      snakeSpeed: 1.9,
      snake: true,
      bear: true,
    },
  };

  const PETS = {
    cat:     { id: 'cat',     name: 'Shadow Cat',     emoji: '\u{1F431}', price: 3 },
    dog:     { id: 'dog',     name: 'Shadow Dog',     emoji: '\u{1F436}', price: 3 },
    dragon:  { id: 'dragon',  name: 'Shadow Dragon',  emoji: '\u{1F409}', price: 5 },
    unicorn: { id: 'unicorn', name: 'Shadow Unicorn', emoji: '\u{1F984}', price: 7 },
  };

  // ==========================================================
  // STATE
  // ==========================================================
  const state = {
    currentLevel: 1,
    levelStates: makeLevelStates(),
    pets: [],
    petInstances: [],
    keys: {},
    near: null,
    modalOpen: false,
    t: 0,
    trail: [],
    snake: null,
    bear: null,
    biteCooldown: 0,
    biteFlash: 0,
    bossPhase: 1,
    bossDefeated: false,
    fireworks: [],
    nextFireworkT: 0,
  };

  const player = { x: 480, y: 330, speed: 3.2 };

  function makeLevelStates() {
    return {
      1: { coins: 0, solved: {}, shopBought: false },
      2: { coins: 0, solved: {}, shopBought: false },
      3: { coins: 0, solved: {}, shopBought: false },
    };
  }

  function ls() { return state.levelStates[state.currentLevel]; }
  function currentLevel() { return LEVELS[state.currentLevel]; }
  function currentStation(id) { return currentLevel().stations.find(s => s.id === id); }

  // ==========================================================
  // AUDIO
  // ==========================================================
  const SEQ_SYMBOLS_ALL = ['\u2726', '\u26A1', '\u2744', '\u263E', '\u2600', '\u2605'];

  // Positional guitar chords — each rune position gets a chord so the
  // sequence sounds like Korobeiniki bar 1: top notes trace E5-B4-C5-D5-C5-B4.
  // Voicings chosen so the melody-note sits on top of each chord.
  const CHORD_PROGRESSION = [
    [440.00, 523.25, 659.25], // Am     (A-C-E)   top E5
    [329.63, 392.00, 493.88], // Em     (E-G-B)   top B4
    [329.63, 392.00, 523.25], // C/E    (E-G-C)   top C5
    [392.00, 493.88, 587.33], // G      (G-B-D)   top D5
    [329.63, 392.00, 523.25], // C/E    (E-G-C)   top C5
    [329.63, 392.00, 493.88], // Em     (E-G-B)   top B4
  ];

  // Dissonant cluster used when the player clicks the wrong symbol
  const WRONG_CHORD = [440.00, 466.16, 493.88]; // A-A#-B chromatic cluster

  // Korobeiniki (the classic Tetris theme) — a traditional Russian folk
  // song from the 1860s, public domain. E minor, 8 bars.
  const MELODY = [
    // Bar 1
    { f: 659.25, d: 1.0 }, // E5
    { f: 493.88, d: 0.5 }, // B4
    { f: 523.25, d: 0.5 }, // C5
    { f: 587.33, d: 1.0 }, // D5
    { f: 523.25, d: 0.5 }, // C5
    { f: 493.88, d: 0.5 }, // B4
    // Bar 2
    { f: 440.00, d: 1.0 }, // A4
    { f: 440.00, d: 0.5 }, // A4
    { f: 523.25, d: 0.5 }, // C5
    { f: 659.25, d: 1.0 }, // E5
    { f: 587.33, d: 0.5 }, // D5
    { f: 523.25, d: 0.5 }, // C5
    // Bar 3
    { f: 493.88, d: 1.5 }, // B4 (dotted quarter)
    { f: 523.25, d: 0.5 }, // C5
    { f: 587.33, d: 1.0 }, // D5
    { f: 659.25, d: 1.0 }, // E5
    // Bar 4
    { f: 523.25, d: 1.0 }, // C5
    { f: 440.00, d: 1.0 }, // A4
    { f: 440.00, d: 1.5 }, // A4
    { f: 0,      d: 0.5 }, // rest
    // Bar 5
    { f: 587.33, d: 1.5 }, // D5 (dotted)
    { f: 698.46, d: 0.5 }, // F5
    { f: 880.00, d: 1.0 }, // A5
    { f: 783.99, d: 0.5 }, // G5
    { f: 698.46, d: 0.5 }, // F5
    // Bar 6
    { f: 659.25, d: 1.5 }, // E5 (dotted)
    { f: 523.25, d: 0.5 }, // C5
    { f: 659.25, d: 1.0 }, // E5
    { f: 587.33, d: 0.5 }, // D5
    { f: 523.25, d: 0.5 }, // C5
    // Bar 7
    { f: 493.88, d: 1.0 }, // B4
    { f: 493.88, d: 0.5 }, // B4
    { f: 523.25, d: 0.5 }, // C5
    { f: 587.33, d: 1.0 }, // D5
    { f: 659.25, d: 1.0 }, // E5
    // Bar 8
    { f: 523.25, d: 1.0 }, // C5
    { f: 440.00, d: 1.0 }, // A4
    { f: 440.00, d: 1.5 }, // A4
    { f: 0,      d: 0.5 }, // rest

    // --- Part B: bars 9-16, variation that climbs and descends ---
    // Bar 9 - descending run
    { f: 659.25, d: 0.5 }, // E5
    { f: 587.33, d: 0.5 }, // D5
    { f: 523.25, d: 0.5 }, // C5
    { f: 493.88, d: 0.5 }, // B4
    { f: 440.00, d: 0.5 }, // A4
    { f: 392.00, d: 0.5 }, // G4
    { f: 440.00, d: 0.5 }, // A4
    { f: 493.88, d: 0.5 }, // B4
    // Bar 10
    { f: 523.25, d: 1.0 }, // C5
    { f: 659.25, d: 1.0 }, // E5
    { f: 880.00, d: 1.0 }, // A5
    { f: 783.99, d: 0.5 }, // G5
    { f: 739.99, d: 0.5 }, // F#5
    // Bar 11
    { f: 659.25, d: 1.0 }, // E5
    { f: 587.33, d: 1.0 }, // D5
    { f: 523.25, d: 1.0 }, // C5
    { f: 493.88, d: 1.0 }, // B4
    // Bar 12
    { f: 440.00, d: 1.0 }, // A4
    { f: 493.88, d: 1.0 }, // B4
    { f: 523.25, d: 2.0 }, // C5
    // Bar 13 - ascending
    { f: 587.33, d: 1.0 }, // D5
    { f: 659.25, d: 1.0 }, // E5
    { f: 739.99, d: 1.0 }, // F#5
    { f: 783.99, d: 1.0 }, // G5
    // Bar 14 - peak
    { f: 880.00, d: 1.5 }, // A5
    { f: 783.99, d: 0.5 }, // G5
    { f: 739.99, d: 1.0 }, // F#5
    { f: 659.25, d: 1.0 }, // E5
    // Bar 15 - descending
    { f: 587.33, d: 1.0 }, // D5
    { f: 523.25, d: 1.0 }, // C5
    { f: 493.88, d: 1.0 }, // B4
    { f: 440.00, d: 1.0 }, // A4
    // Bar 16 - dominant, resolves back to Em at loop start
    { f: 392.00, d: 1.0 }, // G4
    { f: 440.00, d: 1.0 }, // A4
    { f: 493.88, d: 2.0 }, // B4
  ];

  // Bass on each bar (16 bars: Part A | Part B)
  const BASS_LINE = [
    { f: 82.41,  t: 0  }, // E2   - Em
    { f: 82.41,  t: 4  }, // E2   - Em
    { f: 123.47, t: 8  }, // B2   - B7
    { f: 123.47, t: 12 }, // B2   - B7
    { f: 130.81, t: 16 }, // C3   - C
    { f: 98.00,  t: 20 }, // G2   - G
    { f: 110.00, t: 24 }, // A2   - Am
    { f: 123.47, t: 28 }, // B2   - B7
    { f: 82.41,  t: 32 }, // E2   - Em
    { f: 110.00, t: 36 }, // A2   - Am
    { f: 98.00,  t: 40 }, // G2   - G
    { f: 110.00, t: 44 }, // A2   - Am
    { f: 98.00,  t: 48 }, // G2   - G
    { f: 110.00, t: 52 }, // A2   - Am
    { f: 82.41,  t: 56 }, // E2   - Em
    { f: 123.47, t: 60 }, // B2   - B7 leading back to Em
  ];

  const audio = {
    ctx: null,
    master: null,
    musicGain: null,
    muted: false,

    ensureStarted() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.55;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.22;
        this.musicGain.connect(this.master);
        this.startMusic();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    setMute(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.55;
    },

    startMusic() {
      // Light E minor pad (root + fifth), subtle under the melody
      [164.81, 246.94].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        const g = this.ctx.createGain();
        g.gain.value = i === 0 ? 0.035 : 0.025;
        osc.connect(filter);
        filter.connect(g);
        g.connect(this.musicGain);
        osc.start();
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.18 + i * 0.14;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = g.gain.value * 0.4;
        lfo.connect(lfoGain);
        lfoGain.connect(g.gain);
        lfo.start();
      });

      this.playMelody();
    },

    playMelody() {
      if (!this.ctx) return;
      const BEAT = 0.38;
      let delayMs = 0;

      // Walking bass on chord changes
      BASS_LINE.forEach(b => {
        const ms = b.t * BEAT * 1000;
        setTimeout(() => this.bassNote(b.f, 4 * BEAT * 0.95, 0.12), ms);
      });

      // Piano melody
      MELODY.forEach(n => {
        if (n.f > 0) {
          const ms = delayMs;
          setTimeout(() => this.piano(n.f, Math.max(0.28, n.d * BEAT), 0.15), ms);
        }
        delayMs += n.d * BEAT * 1000;
      });

      setTimeout(() => this.playMelody(), delayMs + 900);
    },

    bassNote(freq, dur, vol) {
      if (!this.ctx || !freq) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.03);
      g.gain.exponentialRampToValueAtTime(vol * 0.5, now + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    },

    piano(freq, dur, vol) {
      if (!this.ctx || !freq) return;
      const now = this.ctx.currentTime;
      // Fundamental triangle + octave sine for a mellow piano-ish tone
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.value = freq;
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      const g1 = this.ctx.createGain();
      const g2 = this.ctx.createGain();

      g1.gain.setValueAtTime(0, now);
      g1.gain.linearRampToValueAtTime(vol, now + 0.01);
      g1.gain.exponentialRampToValueAtTime(vol * 0.3, now + 0.2);
      g1.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      g2.gain.setValueAtTime(0, now);
      g2.gain.linearRampToValueAtTime(vol * 0.25, now + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.6);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2800;

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(filter);
      g2.connect(filter);
      filter.connect(this.musicGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + dur + 0.1);
      osc2.stop(now + dur + 0.1);
    },

    // Strummed sawtooth-based guitar chord — distinct from the piano melody.
    guitarChord(freqs, vol) {
      if (!this.ctx || !freqs || freqs.length === 0) return;
      const now = this.ctx.currentTime;
      const v = vol != null ? vol : 0.06;
      freqs.forEach((f, i) => {
        const start = now + i * 0.018;
        // Body: sawtooth with filter sweep for plucked feel
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 1.6;
        filter.frequency.setValueAtTime(3000, start);
        filter.frequency.exponentialRampToValueAtTime(900, start + 1.0);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(v, start + 0.005);
        g.gain.exponentialRampToValueAtTime(v * 0.25, start + 0.25);
        g.gain.exponentialRampToValueAtTime(0.001, start + 1.4);
        osc.connect(filter);
        filter.connect(g);
        g.connect(this.master);
        osc.start(start);
        osc.stop(start + 1.5);
        // Harmonic: triangle an octave up for string brightness
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = f * 2;
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0, start);
        g2.gain.linearRampToValueAtTime(v * 0.28, start + 0.005);
        g2.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
        osc2.connect(g2);
        g2.connect(this.master);
        osc2.start(start);
        osc2.stop(start + 0.6);
      });
    },

    positionChord(i) {
      this.guitarChord(CHORD_PROGRESSION[i % CHORD_PROGRESSION.length]);
    },
    wrongChord() {
      this.guitarChord(WRONG_CHORD, 0.055);
    },
    setMusicVolume(v) {
      if (this.ctx && this.musicGain) {
        this.musicGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.12);
      }
    },

    beep(freq, dur, type, vol) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    },

    sweep(f1, f2, dur, type, vol) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(f1, now);
      osc.frequency.exponentialRampToValueAtTime(f2, now + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    },

    click()      { this.beep(900, 0.04, 'square', 0.04); },
    coin()       { this.beep(1200, 0.12, 'triangle', 0.14); setTimeout(() => this.beep(1600, 0.12, 'triangle', 0.1), 80); },
    solve()      { [523.25, 659.25, 784, 1046].forEach((f, i) => setTimeout(() => this.piano(f, 0.6, 0.13), i * 100)); },
    bite()       { this.sweep(200, 60, 0.35, 'sawtooth', 0.2); },
    bearGrowl()  { this.sweep(90, 45, 0.7, 'sawtooth', 0.25); setTimeout(() => this.sweep(70, 40, 0.5, 'square', 0.15), 150); },
    balalaika()  {
      if (!this.ctx) return;
      const notes = [261.63, 329.63, 392, 440, 493.88];
      const base = notes[Math.floor(Math.random() * notes.length)];
      [base, base * 1.5, base * 1.25, base].forEach((f, i) => setTimeout(() => this.beep(f, 0.5, 'triangle', 0.06), i * 110));
    },
    portal()     { this.sweep(200, 1400, 0.7, 'sine', 0.15); },
    sparkle()    {
      if (Math.random() > 0.4) return;
      const f = 1400 + Math.random() * 800;
      this.beep(f, 0.1, 'triangle', 0.04);
      setTimeout(() => this.beep(f * 1.33, 0.08, 'triangle', 0.03), 55);
    },
    levelStart() { [164.81, 196.00, 246.94, 329.63, 392.00].forEach((f, i) => setTimeout(() => this.piano(f, 1.1, 0.15), i * 120)); },
    bossEntrance() {
      // deep ominous drop
      this.sweep(220, 40, 1.4, 'sawtooth', 0.28);
      setTimeout(() => this.sweep(55, 30, 2, 'square', 0.2), 200);
    },
    victoryFanfare() {
      [523.25, 659.25, 784, 1046.5, 1318.5].forEach((f, i) => setTimeout(() => this.piano(f, 1.6, 0.2), i * 180));
      setTimeout(() => [220, 329.63, 440].forEach((f, j) => this.piano(f, 3, 0.16)), 600);
    },
  };

  function updateMuteButton() {
    document.getElementById('mute-btn').textContent = audio.muted ? '\u{1F507}' : '\u{1F50A}';
  }

  // ==========================================================
  // INPUT
  // ==========================================================
  let audioStarted = false;
  function maybeStartAudio() {
    if (audioStarted) return;
    audioStarted = true;
    audio.ensureStarted();
  }
  window.addEventListener('keydown', maybeStartAudio);
  window.addEventListener('click', maybeStartAudio);
  window.addEventListener('pointerdown', maybeStartAudio);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      audio.click();
      if (state.modalOpen) closeModal();
      else openMenu();
      e.preventDefault();
      return;
    }
    if (e.key.toLowerCase() === 'm' && !isTypingInField()) {
      audio.setMute(!audio.muted);
      updateMuteButton();
      return;
    }
    state.keys[e.key.toLowerCase()] = true;
    if (!state.modalOpen && state.near && (e.key === ' ' || e.key === 'Enter')) {
      openInteraction(state.near);
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    state.keys[e.key.toLowerCase()] = false;
  });

  function isTypingInField() {
    const ae = document.activeElement;
    return ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
  }

  document.getElementById('mute-btn').addEventListener('click', () => {
    audio.setMute(!audio.muted);
    updateMuteButton();
  });

  // ==========================================================
  // MOBILE / TOUCH
  // ==========================================================
  const isTouchDevice = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    || ('ontouchstart' in window);

  const joystick = {
    active: false,
    id: null,
    cx: 0,
    cy: 0,
    dx: 0,
    dy: 0,
    maxRadius: 56,
    deadzone: 0.18,
  };

  function fitGameToViewport() {
    const sx = window.innerWidth / W;
    const sy = window.innerHeight / H;
    // On touch devices we allow scaling up past 1 so phones/tablets fill the screen.
    // On desktop we cap at 1 to preserve the original authored size.
    const s = isTouchDevice ? Math.min(sx, sy) : Math.min(sx, sy, 1);
    document.documentElement.style.setProperty('--game-scale', String(s));
  }
  window.addEventListener('resize', fitGameToViewport);
  window.addEventListener('orientationchange', fitGameToViewport);
  fitGameToViewport();

  if (isTouchDevice) {
    document.getElementById('touch-controls').classList.remove('hidden');
    document.body.classList.add('touch-device');

    const joyEl = document.getElementById('joystick');
    const knobEl = document.getElementById('joystick-knob');
    const interactEl = document.getElementById('touch-interact');

    function setKnob(dx, dy) {
      knobEl.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    }

    function updateJoystickFromTouch(x, y) {
      let dx = x - joystick.cx;
      let dy = y - joystick.cy;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > joystick.maxRadius) {
        dx = (dx / mag) * joystick.maxRadius;
        dy = (dy / mag) * joystick.maxRadius;
      }
      setKnob(dx, dy);
      let nx = dx / joystick.maxRadius;
      let ny = dy / joystick.maxRadius;
      const nmag = Math.sqrt(nx * nx + ny * ny);
      if (nmag < joystick.deadzone) { nx = 0; ny = 0; }
      joystick.dx = nx;
      joystick.dy = ny;
    }

    joyEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      maybeStartAudio();
      if (joystick.active) return;
      const t = e.changedTouches[0];
      const r = joyEl.getBoundingClientRect();
      joystick.active = true;
      joystick.id = t.identifier;
      joystick.cx = r.left + r.width / 2;
      joystick.cy = r.top + r.height / 2;
      updateJoystickFromTouch(t.clientX, t.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!joystick.active) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystick.id) {
          updateJoystickFromTouch(t.clientX, t.clientY);
          e.preventDefault();
          break;
        }
      }
    }, { passive: false });

    function endJoystickTouch(e) {
      if (!joystick.active) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystick.id) {
          joystick.active = false;
          joystick.id = null;
          joystick.dx = 0;
          joystick.dy = 0;
          setKnob(0, 0);
          break;
        }
      }
    }
    window.addEventListener('touchend', endJoystickTouch);
    window.addEventListener('touchcancel', endJoystickTouch);

    interactEl.addEventListener('click', (e) => {
      e.preventDefault();
      maybeStartAudio();
      if (state.modalOpen || !state.near) return;
      openInteraction(state.near);
    });
  }

  function updateTouchInteractButton() {
    if (!isTouchDevice) return;
    const el = document.getElementById('touch-interact');
    if (!el) return;
    const label = el.querySelector('.ti-label');
    if (state.near && !state.modalOpen) {
      el.classList.add('active');
      if (label) label.textContent = state.near.label.length > 14
        ? state.near.label.slice(0, 13) + '\u2026'
        : state.near.label;
    } else {
      el.classList.remove('active');
      if (label) label.textContent = 'TAP';
    }
  }

  // ==========================================================
  // MOVEMENT
  // ==========================================================
  function updatePlayer() {
    if (state.modalOpen) return;
    let dx = 0, dy = 0;
    if (state.keys['arrowleft']  || state.keys['a']) dx -= 1;
    if (state.keys['arrowright'] || state.keys['d']) dx += 1;
    if (state.keys['arrowup']    || state.keys['w']) dy -= 1;
    if (state.keys['arrowdown']  || state.keys['s']) dy += 1;

    if (joystick.active && (joystick.dx || joystick.dy)) {
      dx = joystick.dx;
      dy = joystick.dy;
    } else if (dx && dy) {
      dx *= 0.7071; dy *= 0.7071;
    }

    player.x = clamp(player.x + dx * player.speed, 40, W - 40);
    player.y = clamp(player.y + dy * player.speed, 60, H - 40);

    if (dx || dy) {
      state.trail.push({ x: player.x, y: player.y });
      if (state.trail.length > 250) state.trail.shift();
    }
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ==========================================================
  // PROXIMITY
  // ==========================================================
  function updateProximity() {
    const hintEl = document.getElementById('hint');
    if (state.modalOpen) { hintEl.classList.add('hidden'); return; }

    state.near = null;
    const L = currentLevel();
    const r = 54;

    for (const s of L.stations) {
      if (ls().solved[s.id]) continue;
      if (dist(player, s) < r) { state.near = { id: s.id, label: s.label }; break; }
    }
    if (!state.near && ls().coins >= L.coinTarget && !ls().shopBought) {
      if (dist(player, L.shopPos) < r) state.near = { id: 'shop', label: 'Summoning Altar' };
    }
    if (!state.near && ls().shopBought && L.exitPos) {
      if (dist(player, L.exitPos) < r) state.near = { id: 'exit', label: 'Exit to Next Level' };
    }
    if (!state.near && ls().shopBought && L.bossPortal) {
      if (dist(player, L.bossPortal) < r) {
        state.near = { id: 'boss', label: state.bossDefeated ? 'Monarch Slain' : 'FINAL BOSS' };
      }
    }

    if (state.near) {
      const prefix = isTouchDevice ? 'TAP  ' : '[ SPACE ]  ';
      hintEl.textContent = prefix + state.near.label;
      hintEl.classList.remove('hidden');
    } else {
      hintEl.classList.add('hidden');
    }

    updateTouchInteractButton();
  }

  // ==========================================================
  // SNAKE
  // ==========================================================
  function spawnSnake() {
    let x, y;
    do {
      x = 80 + Math.random() * (W - 160);
      y = 100 + Math.random() * (H - 180);
    } while (dist({ x, y }, player) < 220);
    state.snake = {
      x, y,
      dir: Math.random() * Math.PI * 2,
      speed: currentLevel().snakeSpeed,
      length: 3,
      segments: [],
      turnTimer: 60,
    };
    state.biteCooldown = 90;
  }

  function updateSnake() {
    if (!state.snake) return;
    if (state.modalOpen) return;
    const sn = state.snake;
    sn.turnTimer -= 1;
    if (sn.turnTimer <= 0) {
      sn.dir += (Math.random() - 0.5) * 1.4;
      sn.turnTimer = 45 + Math.floor(Math.random() * 50);
    }
    sn.x += Math.cos(sn.dir) * sn.speed;
    sn.y += Math.sin(sn.dir) * sn.speed;

    if (sn.x < 40) { sn.dir = Math.PI - sn.dir; sn.x = 40; }
    else if (sn.x > W - 40) { sn.dir = Math.PI - sn.dir; sn.x = W - 40; }
    if (sn.y < 60) { sn.dir = -sn.dir; sn.y = 60; }
    else if (sn.y > H - 40) { sn.dir = -sn.dir; sn.y = H - 40; }

    sn.segments.push({ x: sn.x, y: sn.y });
    const maxLen = sn.length * 14;
    while (sn.segments.length > maxLen) sn.segments.shift();

    if (state.biteCooldown > 0) return;

    // Head collision
    if (dist(sn, player) < 26) { snakeBite(); return; }
    // Body collision — every segment that is drawn is biteable
    const step = 14;
    for (let i = 1; i < sn.length; i++) {
      const segIdx = sn.segments.length - 1 - i * step;
      if (segIdx < 0) continue;
      const seg = sn.segments[segIdx];
      if (dist(seg, player) < 20) { snakeBite(); return; }
    }
  }

  function snakeBite() {
    const s = ls();
    if (s.coins > 0) {
      s.coins -= 1;
      updateCoinUI();
      notify('\u{1F525} Bitten by the serpent! -1 Coin', 'danger');
    } else {
      notify('\u{1F525} Bitten by the serpent!', 'danger');
    }
    state.snake.length += 1;
    relocateEnemy(state.snake, 260);
    state.biteCooldown = 75;
    state.biteFlash = 1;
    audio.bite();
  }

  function drawSnake() {
    if (!state.snake) return;
    const sn = state.snake;
    const step = 14;
    for (let i = sn.length - 1; i >= 0; i--) {
      const segIdx = sn.segments.length - 1 - i * step;
      if (segIdx < 0) continue;
      const seg = sn.segments[segIdx];
      const r = Math.max(3, 11 - i * 1.0);
      ctx.save();
      const grad = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, r * 2.4);
      grad.addColorStop(0, 'rgba(255, 64, 96, 0.8)');
      grad.addColorStop(1, 'rgba(255, 64, 96, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(seg.x, seg.y, r * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = i === 0 ? '#ff6680' : '#c82040';
      ctx.beginPath(); ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Eyes on the head
    ctx.save();
    const ex = Math.cos(sn.dir) * 4;
    const ey = Math.sin(sn.dir) * 4;
    const px = -Math.sin(sn.dir) * 4;
    const py = Math.cos(sn.dir) * 4;
    ctx.fillStyle = '#ffff88';
    ctx.beginPath(); ctx.arc(sn.x + ex + px, sn.y + ey + py, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sn.x + ex - px, sn.y + ey - py, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ==========================================================
  // BEAR
  // ==========================================================
  function spawnBear() {
    let x, y;
    do {
      x = 100 + Math.random() * (W - 200);
      y = 120 + Math.random() * (H - 220);
    } while (dist({ x, y }, player) < 280);
    state.bear = {
      x, y,
      dir: Math.random() * Math.PI * 2,
      speed: 1.2,
      size: 1.0,
      turnTimer: 40,
      plinkTimer: 120,
      noteY: 0,
      noteAlpha: 0,
    };
  }

  function updateBear() {
    if (!state.bear) return;
    if (state.modalOpen) return;
    const b = state.bear;
    b.turnTimer -= 1;
    if (b.turnTimer <= 0) {
      b.dir += (Math.random() - 0.5) * 1.8;
      b.turnTimer = 30 + Math.floor(Math.random() * 50);
    }
    b.x += Math.cos(b.dir) * b.speed;
    b.y += Math.sin(b.dir) * b.speed;

    const rad = 26 * b.size;
    if (b.x < rad) { b.dir = Math.PI - b.dir; b.x = rad; }
    else if (b.x > W - rad) { b.dir = Math.PI - b.dir; b.x = W - rad; }
    if (b.y < rad + 20) { b.dir = -b.dir; b.y = rad + 20; }
    else if (b.y > H - rad) { b.dir = -b.dir; b.y = H - rad; }

    b.plinkTimer -= 1;
    if (b.plinkTimer <= 0) {
      audio.balalaika();
      b.plinkTimer = 180 + Math.floor(Math.random() * 200);
      b.noteAlpha = 1;
      b.noteY = 0;
    }
    if (b.noteAlpha > 0) {
      b.noteAlpha *= 0.97;
      b.noteY -= 0.4;
      if (b.noteAlpha < 0.05) b.noteAlpha = 0;
    }

    if (state.biteCooldown > 0) return;
    if (dist(b, player) < 24 * b.size) bearBite();
  }

  function bearBite() {
    const s = ls();
    if (s.coins > 0) {
      s.coins -= 1;
      updateCoinUI();
      notify('\u{1F43B} Swatted by the crazy bear! -1 Coin', 'bear');
    } else {
      notify('\u{1F43B} Swatted by the bear!', 'bear');
    }
    state.bear.size = Math.min(5.5, state.bear.size * 1.39);
    setTimeout(() => notify('\u{1F43B} The bear grows fatter!', 'bear'), 400);
    relocateEnemy(state.bear, 300);
    state.bear.dir = Math.random() * Math.PI * 2;
    state.biteCooldown = 90;
    state.biteFlash = 1;
    audio.bearGrowl();
  }

  function drawBear() {
    if (!state.bear) return;
    const b = state.bear;
    ctx.save();
    ctx.translate(b.x, b.y);
    const r = 38 * b.size;
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    grad.addColorStop(0, 'rgba(180, 100, 60, 0.55)');
    grad.addColorStop(1, 'rgba(180, 100, 60, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

    // Bear face emoji rendered as a DOM sprite (see sprites.bear).

    // Balalaika
    const bx = 16 * b.size;
    const by = 10 * b.size;
    ctx.strokeStyle = '#d9a066';
    ctx.fillStyle = '#b07040';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx - 8 * b.size, by);
    ctx.lineTo(bx + 8 * b.size, by);
    ctx.lineTo(bx, by + 14 * b.size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#6b3a1e';
    ctx.beginPath();
    ctx.moveTo(bx, by + 14 * b.size);
    ctx.lineTo(bx, by - 10 * b.size);
    ctx.stroke();

    if (b.noteAlpha > 0) {
      ctx.globalAlpha = b.noteAlpha;
      ctx.font = emojiFont(20);
      ctx.fillStyle = '#ffddaa';
      ctx.fillText('\u266A', 24 * b.size, -18 * b.size + b.noteY);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function relocateEnemy(entity, minDist) {
    let nx, ny;
    do {
      nx = 60 + Math.random() * (W - 120);
      ny = 90 + Math.random() * (H - 160);
    } while (dist({ x: nx, y: ny }, player) < minDist);
    entity.x = nx;
    entity.y = ny;
    if (entity.segments) entity.segments = [];
    if ('dir' in entity) entity.dir = Math.random() * Math.PI * 2;
  }

  // ==========================================================
  // RENDERING
  // ==========================================================
  function drawWorld() {
    ctx.fillStyle = '#070a14';
    ctx.fillRect(0, 0, W, H);
    drawGrid();
    drawVignette();
    drawAuraAtPlayer();
    drawStations();
    drawShopGlyph();
    drawExit();
    drawBossPortal();
    drawSnake();
    drawBear();
    drawPets();
    drawPlayer();
    drawBiteFlash();
    drawFireworks();
    drawSignature();
  }

  function drawSignature() {
    ctx.save();
    ctx.font = '10px Consolas, monospace';
    ctx.fillStyle = 'rgba(169, 212, 255, 0.45)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(62, 168, 255, 0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText('Created by Anna D (and her dad)', W - 12, H - 8);
    ctx.restore();
  }

  // ---------- Fireworks near signature ----------
  const SIGNATURE_CENTER = { x: W - 90, y: H - 14 };

  function updateFireworks() {
    const nearSig = !state.modalOpen && dist(player, SIGNATURE_CENTER) < 170;
    if (nearSig && state.t >= state.nextFireworkT) {
      const bx = SIGNATURE_CENTER.x + (Math.random() - 0.5) * 110;
      const by = SIGNATURE_CENTER.y - 4 + (Math.random() - 0.5) * 10;
      spawnFireworkBurst(bx, by);
      state.nextFireworkT = state.t + 22 + Math.floor(Math.random() * 24);
    }
    for (let i = state.fireworks.length - 1; i >= 0; i--) {
      const p = state.fireworks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life--;
      if (p.life <= 0) state.fireworks.splice(i, 1);
    }
  }

  function spawnFireworkBurst(x, y) {
    const palette = ['#ffd86b', '#66ffcc', '#ff6680', '#3ea8ff', '#c28cff', '#ffffff'];
    const color = palette[Math.floor(Math.random() * palette.length)];
    const count = 10 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 2.4;
      state.fireworks.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 0.9,
        life: 35 + Math.floor(Math.random() * 22),
        maxLife: 58,
        color,
        size: 1.4 + Math.random() * 1.4,
      });
    }
    audio.sparkle();
  }

  function drawFireworks() {
    if (state.fireworks.length === 0) return;
    ctx.save();
    for (const p of state.fireworks) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(62, 168, 255, 0.06)';
    ctx.lineWidth = 1;
    const g = 48;
    for (let x = 0; x < W; x += g) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += g) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawVignette() {
    const grad = ctx.createRadialGradient(W/2, H/2, 220, W/2, H/2, 540);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawAuraAtPlayer() {
    const grad = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, 180);
    grad.addColorStop(0, 'rgba(62, 168, 255, 0.26)');
    grad.addColorStop(1, 'rgba(62, 168, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStations() {
    for (const s of currentLevel().stations) drawStation(s, !!ls().solved[s.id]);
  }

  function drawStation(s, solved) {
    const pulse = 1 + Math.sin(state.t * 0.05 + s.x * 0.01) * 0.08;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.globalAlpha = solved ? 0.28 : 0.9;
    ctx.strokeStyle = solved ? '#2a4060' : '#3ea8ff';
    ctx.shadowColor = solved ? '#1a3353' : '#00aaff';
    ctx.shadowBlur = solved ? 6 : 22;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 36 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2); ctx.stroke();
    const spokes = 6;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 + state.t * 0.01;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30);
      ctx.lineTo(Math.cos(a) * 38, Math.sin(a) * 38);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // Station emoji rendered as a DOM sprite (see sprites.stations).
    ctx.font = '11px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = solved ? '#3a4e70' : '#8bb6e6';
    ctx.fillText(solved ? '[ cleared ]' : s.label, 0, 56);
    ctx.restore();
  }

  function drawShopGlyph() {
    const L = currentLevel();
    if (ls().shopBought) return;
    const active = ls().coins >= L.coinTarget;
    ctx.save();
    ctx.translate(L.shopPos.x, L.shopPos.y);
    if (active) {
      const pulse = 1 + Math.sin(state.t * 0.08) * 0.15;
      ctx.strokeStyle = '#c28cff';
      ctx.shadowColor = '#8a5cf6';
      ctx.shadowBlur = 28 * pulse;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 42 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 28 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      // Shop emoji rendered as DOM sprite (see sprites.shop).
      ctx.font = '11px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#c8aaff';
      ctx.fillText('Summoning Altar', 0, 58);
    } else {
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#404060';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.stroke();
      // Shop emoji rendered as DOM sprite (dimmed via .dim class).
      ctx.globalAlpha = 0.5;
      ctx.font = '11px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#4a5570';
      ctx.fillText('[ sealed ]', 0, 58);
    }
    ctx.restore();
  }

  function drawExit() {
    const L = currentLevel();
    if (!L.exitPos || !ls().shopBought) return;
    const pulse = 1 + Math.sin(state.t * 0.07) * 0.2;
    ctx.save();
    ctx.translate(L.exitPos.x, L.exitPos.y);
    ctx.strokeStyle = '#66ffcc';
    ctx.shadowColor = '#00ffaa';
    ctx.shadowBlur = 30 * pulse;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 40 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = emojiFont(26);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('\u25B2', 0, 4);
    ctx.font = '11px Consolas, monospace';
    ctx.fillStyle = '#66ffcc';
    ctx.fillText('EXIT', 0, 56);
    ctx.restore();
  }

  function drawBossPortal() {
    const L = currentLevel();
    if (!L.bossPortal || !ls().shopBought) return;
    const defeated = state.bossDefeated;
    const pulse = 1 + Math.sin(state.t * 0.09) * 0.25;
    ctx.save();
    ctx.translate(L.bossPortal.x, L.bossPortal.y);
    ctx.strokeStyle = defeated ? '#8888aa' : '#ff3060';
    ctx.shadowColor = defeated ? '#444466' : '#ff0050';
    ctx.shadowBlur = (defeated ? 10 : 34) * pulse;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 48 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
    const spikes = 8;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + state.t * 0.018;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
      ctx.lineTo(Math.cos(a) * 54, Math.sin(a) * 54);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // Boss portal emoji rendered as DOM sprite (see sprites.bossPortal).
    ctx.font = '11px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = defeated ? '#8888aa' : '#ff6080';
    ctx.fillText(defeated ? '[ MONARCH SLAIN ]' : 'FINAL BOSS', 0, 70);
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();
    const grad = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, 38);
    grad.addColorStop(0, 'rgba(62, 168, 255, 0.55)');
    grad.addColorStop(1, 'rgba(62, 168, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(player.x, player.y, 38, 0, Math.PI * 2); ctx.fill();
    // Player emoji rendered as DOM sprite (see sprites.player).
    ctx.restore();
  }

  function drawPets() {
    state.petInstances.forEach((pi, i) => {
      const trailOffset = 22 + i * 18;
      const target = state.trail[Math.max(0, state.trail.length - trailOffset)] || player;
      const offX = (i % 2 === 0 ? -42 : 42);
      const offY = (i < 2 ? -4 : 14);
      pi.x += (target.x + offX - pi.x) * 0.14;
      pi.y += (target.y + offY - pi.y) * 0.14;

      ctx.save();
      let cIn, cOut;
      if (pi.id === 'dragon')       { cIn = 'rgba(255, 120, 60, 0.55)'; cOut = 'rgba(255, 120, 60, 0)'; }
      else if (pi.id === 'unicorn') { cIn = 'rgba(255, 200, 255, 0.7)'; cOut = 'rgba(255, 200, 255, 0)'; }
      else                          { cIn = 'rgba(138, 92, 246, 0.55)'; cOut = 'rgba(138, 92, 246, 0)'; }
      const grad = ctx.createRadialGradient(pi.x, pi.y, 2, pi.x, pi.y, 32);
      grad.addColorStop(0, cIn);
      grad.addColorStop(1, cOut);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(pi.x, pi.y, 32, 0, Math.PI * 2); ctx.fill();
      // Pet emoji rendered as DOM sprite (see sprites.pets).
      ctx.restore();
    });
  }

  function drawBiteFlash() {
    if (state.biteFlash <= 0) return;
    ctx.fillStyle = 'rgba(255, 40, 80, ' + (state.biteFlash * 0.35) + ')';
    ctx.fillRect(0, 0, W, H);
    state.biteFlash *= 0.92;
    if (state.biteFlash < 0.02) state.biteFlash = 0;
  }

  // ==========================================================
  // NOTIFICATIONS / HUD
  // ==========================================================
  function notify(text, kind) {
    const el = document.createElement('div');
    el.className = 'notification' + (kind ? ' ' + kind : '');
    el.textContent = text;
    document.getElementById('notifications').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function updateCoinUI() {
    document.getElementById('coinCount').textContent = ls().coins;
    document.getElementById('coinTarget').textContent = currentLevel().coinTarget;
  }
  function updateTitleUI() {
    document.getElementById('title').textContent = '\u2694\uFE0F  ' + currentLevel().title;
  }

  // ==========================================================
  // MODALS
  // ==========================================================
  const overlay = document.getElementById('overlay');
  const panels = {
    sequence: document.getElementById('p-sequence'),
    lock:     document.getElementById('p-lock'),
    memory:   document.getElementById('p-memory'),
    circuit:  document.getElementById('p-circuit'),
    seer:     document.getElementById('p-seer'),
    color:    document.getElementById('p-color'),
    cipher:   document.getElementById('p-cipher'),
    shop:     document.getElementById('p-shop'),
    boss:     document.getElementById('p-boss'),
    menu:     document.getElementById('p-menu'),
  };

  function openModal(id) {
    state.modalOpen = true;
    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    Object.values(panels).forEach(p => p.classList.add('hidden'));
    panels[id].classList.remove('hidden');
    // Release any in-flight joystick touch so the player doesn't keep sliding
    // after opening a puzzle modal.
    if (joystick.active) {
      joystick.active = false;
      joystick.id = null;
      joystick.dx = 0;
      joystick.dy = 0;
      const knob = document.getElementById('joystick-knob');
      if (knob) knob.style.transform = 'translate(0, 0)';
    }
  }
  function closeModal() {
    state.modalOpen = false;
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    audio.setMusicVolume(0.22); // restore BGM if it was ducked
  }
  document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => { audio.click(); closeModal(); }));

  function openInteraction(target) {
    audio.click();
    if (target.id === 'exit') {
      const next = state.currentLevel + 1;
      if (LEVELS[next]) goToLevel(next);
      return;
    }
    if (target.id === 'boss') { openBoss(); return; }
    if (target.id === 'shop') { openModal('shop'); populateShop(); return; }
    openModal(target.id);
    if (target.id === 'sequence') startSequence();
    if (target.id === 'lock')     startLock();
    if (target.id === 'memory')   startMemory();
    if (target.id === 'circuit')  startCircuit();
    if (target.id === 'seer')     startSeer();
    if (target.id === 'color')    startColor();
    if (target.id === 'cipher')   startCipher();
  }

  // ==========================================================
  // PUZZLE 1: Rune Sequence
  // ==========================================================
  let seqAnswer = [];
  let seqInput = [];
  let seqSymbols = [];

  function startSequence() {
    const diff = currentStation('sequence').difficulty || 1;
    const count = diff === 1 ? 4 : diff === 2 ? 5 : 6;
    seqSymbols = SEQ_SYMBOLS_ALL.slice(0, count);
    seqAnswer = shuffle(seqSymbols.slice());
    seqInput = [];
    audio.setMusicVolume(0.04); // duck BGM so chords are clearly audible
    const display = document.getElementById('seq-display');
    const btns = document.getElementById('seq-buttons');
    const status = document.getElementById('seq-status');
    status.textContent = 'Memorize the order...';
    status.className = 'status';
    display.innerHTML = '';
    btns.innerHTML = '';
    seqAnswer.forEach(() => {
      const s = document.createElement('div');
      s.className = 'seq-slot';
      s.textContent = '?';
      display.appendChild(s);
    });
    const slots = display.querySelectorAll('.seq-slot');

    let i = 0;
    const reveal = setInterval(() => {
      slots.forEach(x => { x.classList.remove('active'); x.textContent = '?'; });
      if (i < slots.length) {
        slots[i].classList.add('active');
        slots[i].textContent = seqAnswer[i];
        audio.positionChord(i);
        i++;
      } else {
        clearInterval(reveal);
        enableSeqInput(slots, status);
        status.textContent = 'Now repeat the order.';
      }
    }, 800);
  }

  function enableSeqInput(slots, status) {
    const btns = document.getElementById('seq-buttons');
    btns.innerHTML = '';
    seqSymbols.forEach(sym => {
      const b = document.createElement('button');
      b.textContent = sym;
      b.addEventListener('click', () => handleSeqClick(sym, slots, status));
      btns.appendChild(b);
    });
  }

  function handleSeqClick(sym, slots, status) {
    if (seqInput.length >= seqAnswer.length) return;
    const idx = seqInput.length;
    seqInput.push(sym);
    slots[idx].textContent = sym;
    slots[idx].classList.add('active');
    if (sym !== seqAnswer[idx]) {
      audio.wrongChord();
      status.textContent = '\u2717 Wrong order. Retrying...';
      status.className = 'status err';
      setTimeout(() => startSequence(), 1200);
      return;
    }
    audio.positionChord(idx);
    if (seqInput.length === seqAnswer.length) {
      status.textContent = '\u2713 [ Puzzle Cleared ]';
      status.className = 'status ok';
      onSolve('sequence');
    }
  }

  // ==========================================================
  // PUZZLE 2: Arcane Lock
  // ==========================================================
  const LOCK_LEVELS = {
    1: {
      code: '657',
      clues: [
        { nth: '1st', text: 'twice three' },
        { nth: '2nd', text: 'the square root of twenty-five' },
        { nth: '3rd', text: 'ten minus three' },
      ],
    },
    2: {
      code: '916',
      clues: [
        { nth: '1st', text: 'three squared' },
        { nth: '2nd', text: 'the smallest odd digit greater than zero' },
        { nth: '3rd', text: 'half of twelve' },
      ],
    },
    3: {
      code: '8473',
      clues: [
        { nth: '1st', text: 'two cubed' },
        { nth: '2nd', text: 'two times two' },
        { nth: '3rd', text: 'half of fourteen' },
        { nth: '4th', text: 'nine minus six' },
      ],
    },
  };
  let currentLockCode = '000';

  function startLock() {
    const diff = currentStation('lock').difficulty || 1;
    const data = LOCK_LEVELS[diff];
    currentLockCode = data.code;

    const cluesEl = document.getElementById('lock-clues');
    cluesEl.innerHTML = '';
    data.clues.forEach(c => {
      const d = document.createElement('div');
      d.innerHTML = c.nth + ' digit &mdash; <em>' + c.text + '</em>';
      cluesEl.appendChild(d);
    });

    const inputsEl = document.getElementById('lock-inputs');
    inputsEl.innerHTML = '';
    for (let i = 0; i < currentLockCode.length; i++) {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.maxLength = 1;
      inp.className = 'lock-digit';
      inp.inputMode = 'numeric';
      inp.dataset.idx = i;
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
        const inputs = inputsEl.querySelectorAll('.lock-digit');
        const idx = parseInt(inp.dataset.idx);
        if (inp.value && idx < inputs.length - 1) inputs[idx + 1].focus();
      });
      inp.addEventListener('keydown', (e) => {
        const inputs = inputsEl.querySelectorAll('.lock-digit');
        const idx = parseInt(inp.dataset.idx);
        if (e.key === 'Enter') document.getElementById('lock-submit').click();
        else if (e.key === 'Backspace' && !inp.value && idx > 0) inputs[idx - 1].focus();
      });
      inputsEl.appendChild(inp);
    }

    const s = document.getElementById('lock-status');
    s.textContent = '';
    s.className = 'status';
    setTimeout(() => { const first = inputsEl.querySelector('.lock-digit'); if (first) first.focus(); }, 10);
  }

  document.getElementById('lock-submit').addEventListener('click', () => {
    audio.click();
    const inputs = document.querySelectorAll('#lock-inputs .lock-digit');
    const code = Array.from(inputs).map(i => i.value).join('');
    const s = document.getElementById('lock-status');
    if (code === currentLockCode) {
      s.textContent = '\u2713 [ Lock Opened ]';
      s.className = 'status ok';
      onSolve('lock');
    } else {
      s.textContent = '\u2717 Code rejected.';
      s.className = 'status err';
    }
  });

  // ==========================================================
  // PUZZLE 3: Shadow Pairs
  // ==========================================================
  const MEM_SYMBOLS_ALL = ['\u{1F409}', '\u{1F5E1}\uFE0F', '\u{1F451}', '\u{1F480}', '\u{1F6E1}\uFE0F', '\u2694\uFE0F'];
  let memFlipped = [];
  let memMatched = 0;
  let memPairCount = 3;

  function startMemory() {
    const diff = currentStation('memory').difficulty || 1;
    memPairCount = diff === 1 ? 3 : diff === 2 ? 4 : 5;
    memFlipped = [];
    memMatched = 0;
    const status = document.getElementById('memory-status');
    status.textContent = '';
    status.className = 'status';
    const board = document.getElementById('memory-board');
    board.innerHTML = '';
    board.dataset.cols = String(memPairCount);
    const symbols = MEM_SYMBOLS_ALL.slice(0, memPairCount);
    const deck = shuffle(symbols.concat(symbols));
    deck.forEach(sym => {
      const tile = document.createElement('div');
      tile.className = 'mem-tile';
      tile.textContent = '?';
      tile.dataset.sym = sym;
      tile.addEventListener('click', () => { audio.click(); flipTile(tile); });
      board.appendChild(tile);
    });
  }

  function flipTile(tile) {
    if (memFlipped.length >= 2) return;
    if (tile.classList.contains('flipped') || tile.classList.contains('matched')) return;
    tile.textContent = tile.dataset.sym;
    tile.classList.add('flipped');
    memFlipped.push(tile);
    if (memFlipped.length === 2) {
      const [a, b] = memFlipped;
      if (a.dataset.sym === b.dataset.sym) {
        setTimeout(() => {
          a.classList.add('matched'); b.classList.add('matched');
          memFlipped = [];
          memMatched += 1;
          if (memMatched === memPairCount) {
            const s = document.getElementById('memory-status');
            s.textContent = '\u2713 [ All Pairs Matched ]';
            s.className = 'status ok';
            onSolve('memory');
          }
        }, 420);
      } else {
        setTimeout(() => {
          a.classList.remove('flipped'); b.classList.remove('flipped');
          a.textContent = '?'; b.textContent = '?';
          memFlipped = [];
        }, 750);
      }
    }
  }

  // ==========================================================
  // PUZZLE 4: Rune Circuit
  // ==========================================================
  let circuitState = [];
  let circuitLen = 5;

  function startCircuit() {
    const diff = currentStation('circuit').difficulty || 2;
    circuitLen = diff >= 3 ? 7 : 5;
    circuitState = genCircuitStart();
    const s = document.getElementById('circuit-status');
    s.textContent = 'Light all ' + circuitLen + ' runes.';
    s.className = 'status';
    renderCircuit();
  }

  function genCircuitStart() {
    const s = new Array(circuitLen).fill(1);
    const moves = 3 + Math.floor(Math.random() * (circuitLen >= 7 ? 4 : 2));
    for (let i = 0; i < moves; i++) toggleCircuit(s, Math.floor(Math.random() * circuitLen));
    if (s.every(v => v === 1)) return genCircuitStart();
    return s;
  }

  function toggleCircuit(s, i) {
    s[i] ^= 1;
    if (i > 0)            s[i - 1] ^= 1;
    if (i < s.length - 1) s[i + 1] ^= 1;
  }

  function renderCircuit() {
    const container = document.getElementById('circuit-runes');
    container.innerHTML = '';
    circuitState.forEach((v, i) => {
      const btn = document.createElement('button');
      btn.className = 'circuit-rune' + (v ? ' on' : '');
      btn.textContent = v ? '\u2726' : '\u00B7';
      btn.addEventListener('click', () => {
        audio.click();
        toggleCircuit(circuitState, i);
        renderCircuit();
        if (circuitState.every(v => v === 1)) {
          const s = document.getElementById('circuit-status');
          s.textContent = '\u2713 [ Circuit Completed ]';
          s.className = 'status ok';
          onSolve('circuit');
        }
      });
      container.appendChild(btn);
    });
  }

  // ==========================================================
  // PUZZLE 5: Seer's Sequence
  // ==========================================================
  const SEER_EASY = [
    { seq: [2, 4, 8, '?', 32], answer: 16, options: [12, 16, 24], hint: 'Each number doubles.' },
    { seq: [3, 7, 11, '?', 19], answer: 15, options: [13, 15, 17], hint: 'The same amount is added each time.' },
    { seq: [1, 1, 2, 3, '?', 8], answer: 5, options: [4, 5, 6], hint: 'Add the two numbers before it.' },
    { seq: [1, 4, 9, '?', 25], answer: 16, options: [12, 16, 20], hint: 'Squares of 1, 2, 3, 4, 5...' },
    { seq: [10, 9, 7, '?', 0], answer: 4, options: [4, 5, 6], hint: 'Subtract 1, then 2, then 3...' },
  ];
  const SEER_HARD = [
    { seq: [1, 3, 6, 10, '?', 21], answer: 15, options: [13, 15, 18], hint: 'Triangular numbers (add 1, 2, 3, 4...).' },
    { seq: [2, 3, 5, 7, '?', 13], answer: 11, options: [9, 11, 12], hint: 'Prime numbers.' },
    { seq: [1, 8, 27, '?', 125], answer: 64, options: [48, 56, 64], hint: 'Perfect cubes.' },
    { seq: [1, 3, 9, '?', 81], answer: 27, options: [18, 24, 27], hint: 'Each one triples.' },
    { seq: [2, 6, 12, 20, '?', 42], answer: 30, options: [28, 30, 36], hint: 'Add 4, then 6, then 8, then 10...' },
  ];
  let seerPuzzle = null;

  function startSeer() {
    const diff = currentStation('seer').difficulty || 2;
    const pool = diff >= 3 ? SEER_HARD : SEER_EASY;
    seerPuzzle = pool[Math.floor(Math.random() * pool.length)];
    const seqEl = document.getElementById('seer-seq');
    seqEl.innerHTML = '';
    seerPuzzle.seq.forEach((v, i) => {
      const n = document.createElement('span');
      n.className = 'seer-num' + (v === '?' ? ' q' : '');
      n.textContent = v + (i < seerPuzzle.seq.length - 1 ? ',' : '');
      seqEl.appendChild(n);
    });
    document.getElementById('seer-hint').textContent = 'Hint: ' + seerPuzzle.hint;
    const optsEl = document.getElementById('seer-options');
    optsEl.innerHTML = '';
    shuffle(seerPuzzle.options.slice()).forEach(opt => {
      const b = document.createElement('button');
      b.textContent = opt;
      b.addEventListener('click', () => { audio.click(); handleSeerClick(opt); });
      optsEl.appendChild(b);
    });
    const s = document.getElementById('seer-status');
    s.textContent = '';
    s.className = 'status';
  }

  function handleSeerClick(opt) {
    const s = document.getElementById('seer-status');
    if (opt === seerPuzzle.answer) {
      s.textContent = '\u2713 [ Foreseen ]';
      s.className = 'status ok';
      onSolve('seer');
    } else {
      s.textContent = '\u2717 The pattern says otherwise.';
      s.className = 'status err';
    }
  }

  // ==========================================================
  // PUZZLE 6: Color Mixer
  // ==========================================================
  const COLOR_MIXES = {
    '000': { hex: '#202030' },
    '100': { hex: '#ff3030' },
    '010': { hex: '#ffee33' },
    '001': { hex: '#3060ff' },
    '110': { hex: '#ff9020' },
    '011': { hex: '#30c040' },
    '101': { hex: '#9030ff' },
    '111': { hex: '#884022' },
  };
  const COLOR_TARGETS = ['110', '011', '101', '111'];
  let colorState = [0, 0, 0];
  let colorTarget = '000';
  let colorSolved = false;

  function startColor() {
    colorState = [0, 0, 0];
    colorTarget = COLOR_TARGETS[Math.floor(Math.random() * COLOR_TARGETS.length)];
    colorSolved = false;
    document.getElementById('color-target').style.background = COLOR_MIXES[colorTarget].hex;
    document.getElementById('color-yours').style.background = COLOR_MIXES['000'].hex;
    const buttonsEl = document.getElementById('color-buttons');
    buttonsEl.innerHTML = '';
    ['Red', 'Yellow', 'Blue'].forEach((name, i) => {
      const btn = document.createElement('button');
      btn.className = 'color-btn color-' + name.toLowerCase();
      btn.textContent = name;
      btn.addEventListener('click', () => {
        audio.click();
        colorState[i] ^= 1;
        btn.classList.toggle('on', colorState[i] === 1);
        renderColorState();
      });
      buttonsEl.appendChild(btn);
    });
    const s = document.getElementById('color-status');
    s.textContent = 'Match the target color.';
    s.className = 'status';
  }

  function renderColorState() {
    const key = colorState.join('');
    document.getElementById('color-yours').style.background = COLOR_MIXES[key].hex;
    if (!colorSolved && key === colorTarget) {
      colorSolved = true;
      const s = document.getElementById('color-status');
      s.textContent = '\u2713 [ Colors Matched ]';
      s.className = 'status ok';
      onSolve('color');
    }
  }

  // ==========================================================
  // PUZZLE 7: Ancient Cipher
  // ==========================================================
  const CIPHER_WORDS = ['CAT', 'DOG', 'KEY', 'SUN', 'MAP', 'EGG', 'STAR', 'MOON', 'GEM', 'FIRE'];
  let cipherWord = '';

  function startCipher() {
    cipherWord = CIPHER_WORDS[Math.floor(Math.random() * CIPHER_WORDS.length)];
    const numbers = cipherWord.split('').map(c => c.charCodeAt(0) - 64).join('  \u00B7  ');
    document.getElementById('cipher-numbers').textContent = numbers;
    const inp = document.getElementById('cipher-input');
    inp.value = '';
    const s = document.getElementById('cipher-status');
    s.textContent = '';
    s.className = 'status';
    setTimeout(() => inp.focus(), 10);
  }

  function checkCipher() {
    const guess = document.getElementById('cipher-input').value.toUpperCase().trim();
    const s = document.getElementById('cipher-status');
    if (guess === cipherWord) {
      s.textContent = '\u2713 [ Decoded ]';
      s.className = 'status ok';
      onSolve('cipher');
    } else {
      s.textContent = '\u2717 Incorrect.';
      s.className = 'status err';
    }
  }

  document.getElementById('cipher-submit').addEventListener('click', () => { audio.click(); checkCipher(); });
  document.getElementById('cipher-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { audio.click(); checkCipher(); }
  });

  // ==========================================================
  // BOSS: The Arch-Shadow
  // ==========================================================
  const BOSS_ECHO_LEN = 5;
  let bossEchoSequence = [];
  let bossEchoExpected = [];
  let bossEchoInput = [];
  let bossEchoRevealing = false;

  const BOSS_WORDS = [
    { word: 'SHADOW',  hint: "The Monarch wears this like a cloak." },
    { word: 'ABYSS',   hint: "A bottomless void where light dies." },
    { word: 'MONARCH', hint: "A ruler upon the dark throne." },
    { word: 'NIGHT',   hint: "The hour when the Monarch rises." },
    { word: 'GLOOM',   hint: "Heavy, oppressive darkness." },
    { word: 'DUSK',    hint: "The twilight before true dark." },
  ];
  let bossWord = '';
  let bossScrambled = '';

  const BOSS_SIGIL_TARGETS = [
    [1,0,1,0,1],
    [0,1,1,1,0],
    [1,1,0,1,1],
    [1,0,0,0,1],
    [0,1,0,1,0],
  ];
  let bossSigilTarget = [];
  let bossSigilState = [];
  let bossSigilSolved = false;

  function openBoss() {
    openModal('boss');
    audio.bossEntrance();
    if (state.bossDefeated) {
      showBossVictory();
      return;
    }
    if (state.bossPhase < 1 || state.bossPhase > 3) state.bossPhase = 1;
    showBossPhase(state.bossPhase);
  }

  function showBossPhase(n) {
    document.getElementById('boss-victory').classList.add('hidden');
    document.getElementById('boss-phase-1').classList.add('hidden');
    document.getElementById('boss-phase-2').classList.add('hidden');
    document.getElementById('boss-phase-3').classList.add('hidden');
    document.getElementById('boss-phase-' + n).classList.remove('hidden');
    updateBossShards();
    if (n === 1) startBossEcho();
    if (n === 2) startBossWord();
    if (n === 3) startBossSigil();
  }

  function updateBossShards() {
    const shards = document.querySelectorAll('#boss-shards .shard');
    const broken = state.bossDefeated ? 3 : state.bossPhase - 1;
    shards.forEach((s, i) => s.classList.toggle('broken', i < broken));
  }

  function advanceBossPhase() {
    if (state.bossPhase >= 3) { bossVictory(); return; }
    state.bossPhase += 1;
    setTimeout(() => showBossPhase(state.bossPhase), 900);
  }

  // --- Boss Phase 1: Reverse Echo ---
  function startBossEcho() {
    const pool = shuffle(SEQ_SYMBOLS_ALL.slice());
    bossEchoSequence = pool.slice(0, BOSS_ECHO_LEN);
    bossEchoExpected = bossEchoSequence.slice().reverse();
    bossEchoInput = [];
    bossEchoRevealing = true;
    audio.setMusicVolume(0.04);
    const display = document.getElementById('boss-echo-display');
    const btns = document.getElementById('boss-echo-buttons');
    const status = document.getElementById('boss-echo-status');
    display.innerHTML = '';
    btns.innerHTML = '';
    status.textContent = 'Memorize the chant...';
    status.className = 'status';
    for (let i = 0; i < BOSS_ECHO_LEN; i++) {
      const s = document.createElement('div');
      s.className = 'seq-slot';
      s.textContent = '?';
      display.appendChild(s);
    }
    const slots = display.querySelectorAll('.seq-slot');
    let i = 0;
    const reveal = setInterval(() => {
      slots.forEach(x => { x.classList.remove('active'); x.textContent = '?'; });
      if (i < bossEchoSequence.length) {
        slots[i].classList.add('active');
        slots[i].textContent = bossEchoSequence[i];
        audio.positionChord(i);
        i++;
      } else {
        clearInterval(reveal);
        bossEchoRevealing = false;
        status.innerHTML = 'Now repeat in <em>REVERSE</em> order.';
        enableBossEchoInput();
      }
    }, 750);
  }

  function enableBossEchoInput() {
    const btns = document.getElementById('boss-echo-buttons');
    btns.innerHTML = '';
    SEQ_SYMBOLS_ALL.forEach(sym => {
      const b = document.createElement('button');
      b.textContent = sym;
      b.addEventListener('click', () => {
        if (bossEchoRevealing) return;
        handleBossEchoClick(sym);
      });
      btns.appendChild(b);
    });
  }

  function handleBossEchoClick(sym) {
    if (bossEchoInput.length >= bossEchoExpected.length) return;
    const slots = document.querySelectorAll('#boss-echo-display .seq-slot');
    const idx = bossEchoInput.length;
    bossEchoInput.push(sym);
    slots[idx].textContent = sym;
    slots[idx].classList.add('active');
    if (sym !== bossEchoExpected[idx]) {
      audio.wrongChord();
      const s = document.getElementById('boss-echo-status');
      s.textContent = '\u2717 The shadow rejects your echo. Restarting...';
      s.className = 'status err';
      setTimeout(() => startBossEcho(), 1400);
      return;
    }
    audio.positionChord(idx);
    if (bossEchoInput.length === bossEchoExpected.length) {
      const s = document.getElementById('boss-echo-status');
      s.textContent = '\u2713 [ The first shard shatters ]';
      s.className = 'status ok';
      audio.solve();
      advanceBossPhase();
    }
  }

  // --- Boss Phase 2: Shadow Word ---
  function startBossWord() {
    const chosen = BOSS_WORDS[Math.floor(Math.random() * BOSS_WORDS.length)];
    bossWord = chosen.word;
    bossScrambled = scrambleWord(bossWord);
    document.getElementById('boss-word-scrambled').textContent = bossScrambled;
    document.getElementById('boss-word-hint').textContent = 'Hint: ' + chosen.hint;
    const inp = document.getElementById('boss-word-input');
    inp.value = '';
    const s = document.getElementById('boss-word-status');
    s.textContent = '';
    s.className = 'status';
    setTimeout(() => inp.focus(), 10);
  }

  function scrambleWord(word) {
    const arr = word.split('');
    let tries = 0;
    while (tries++ < 30) {
      shuffle(arr);
      if (arr.join('') !== word) break;
    }
    return arr.join('');
  }

  function checkBossWord() {
    const guess = document.getElementById('boss-word-input').value.toUpperCase().trim();
    const s = document.getElementById('boss-word-status');
    if (guess === bossWord) {
      s.textContent = '\u2713 [ The second shard shatters ]';
      s.className = 'status ok';
      audio.solve();
      advanceBossPhase();
    } else {
      s.textContent = '\u2717 Incorrect. The shadow laughs.';
      s.className = 'status err';
    }
  }

  document.getElementById('boss-word-submit').addEventListener('click', () => { audio.click(); checkBossWord(); });
  document.getElementById('boss-word-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { audio.click(); checkBossWord(); }
  });

  // --- Boss Phase 3: Binding Sigil ---
  function startBossSigil() {
    bossSigilSolved = false;
    bossSigilTarget = BOSS_SIGIL_TARGETS[Math.floor(Math.random() * BOSS_SIGIL_TARGETS.length)].slice();
    bossSigilState = bossSigilTarget.slice();
    const moves = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < moves; i++) toggleSigil(bossSigilState, Math.floor(Math.random() * 5));
    if (bossSigilState.every((v, i) => v === bossSigilTarget[i])) return startBossSigil();
    const s = document.getElementById('boss-sigil-status');
    s.textContent = 'Shape your runes to match the target.';
    s.className = 'status';
    renderBossSigil();
  }

  function toggleSigil(arr, i) {
    arr[i] ^= 1;
    if (i > 0)           arr[i - 1] ^= 1;
    if (i < arr.length - 1) arr[i + 1] ^= 1;
  }

  function renderBossSigil() {
    const tEl = document.getElementById('boss-sigil-target');
    tEl.innerHTML = '';
    bossSigilTarget.forEach(v => {
      const d = document.createElement('div');
      d.className = 'sigil-slot' + (v ? ' on' : '');
      d.textContent = v ? '\u2726' : '\u00B7';
      tEl.appendChild(d);
    });
    const sEl = document.getElementById('boss-sigil-state');
    sEl.innerHTML = '';
    bossSigilState.forEach((v, i) => {
      const b = document.createElement('button');
      b.className = 'sigil-btn' + (v ? ' on' : '');
      b.textContent = v ? '\u2726' : '\u00B7';
      b.addEventListener('click', () => {
        if (bossSigilSolved) return;
        audio.click();
        toggleSigil(bossSigilState, i);
        renderBossSigil();
        if (bossSigilState.every((vv, ii) => vv === bossSigilTarget[ii])) {
          bossSigilSolved = true;
          const s = document.getElementById('boss-sigil-status');
          s.textContent = '\u2713 [ The final shard shatters ]';
          s.className = 'status ok';
          audio.solve();
          advanceBossPhase();
        }
      });
      sEl.appendChild(b);
    });
  }

  // --- Boss Victory ---
  function bossVictory() {
    state.bossDefeated = true;
    setTimeout(() => showBossVictory(), 700);
  }

  function showBossVictory() {
    document.getElementById('boss-phase-1').classList.add('hidden');
    document.getElementById('boss-phase-2').classList.add('hidden');
    document.getElementById('boss-phase-3').classList.add('hidden');
    document.getElementById('boss-victory').classList.remove('hidden');
    updateBossShards();
    if (!state.bossCelebrated) {
      state.bossCelebrated = true;
      audio.victoryFanfare();
      notify('\u2694\uFE0F THE ARCH-SHADOW FALLS', 'win');
      setTimeout(() => notify('You have become the Shadow Monarch.', 'win'), 900);
    }
  }

  // ==========================================================
  // SHOP
  // ==========================================================
  function getShopItems() {
    const lvl = state.currentLevel;
    if (lvl === 1) return [PETS.cat, PETS.dog];
    if (lvl === 2) {
      const items = [PETS.dragon];
      if (!state.pets.includes('cat')) items.push(PETS.cat);
      if (!state.pets.includes('dog')) items.push(PETS.dog);
      return items;
    }
    if (lvl === 3) {
      const items = [PETS.unicorn];
      ['cat', 'dog', 'dragon'].forEach(id => {
        if (!state.pets.includes(id)) items.push(PETS[id]);
      });
      return items;
    }
    return [];
  }

  function populateShop() {
    const items = getShopItems();
    const container = document.getElementById('shop-items');
    container.innerHTML = '';
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'shop-item';
      btn.dataset.pet = item.id;
      if (ls().coins < item.price) btn.disabled = true;
      btn.innerHTML =
        '<div class="pet-emoji">' + item.emoji + '</div>' +
        '<div>' + item.name + '</div>' +
        '<div class="price">\u2726 ' + item.price + '</div>';
      btn.addEventListener('click', () => buyPet(item));
      container.appendChild(btn);
    });
  }

  function buyPet(item) {
    if (ls().coins < item.price) return;
    ls().coins -= item.price;
    ls().shopBought = true;
    updateCoinUI();
    state.pets.push(item.id);
    state.petInstances.push({
      id: item.id,
      x: player.x - 40 * (state.petInstances.length + 1),
      y: player.y,
    });
    closeModal();
    audio.portal();
    notify('\u26E9\uFE0F  ' + item.name + ' summoned!', 'win');
    setTimeout(() => {
      if (currentLevel().exitPos) notify('A gateway to the next level has opened.');
      else if (currentLevel().bossPortal) notify('\u{1F480}  A crimson portal appears. The final boss awaits.', 'danger');
      else notify('\u2694\uFE0F You have completed Shadow Quest!', 'win');
    }, 700);
  }

  // ==========================================================
  // SOLVE CALLBACK
  // ==========================================================
  function onSolve(id) {
    const s = ls();
    if (s.solved[id]) return;
    s.solved[id] = true;
    audio.solve();
    setTimeout(() => { closeModal(); addCoin(); }, 800);
  }

  function addCoin() {
    const s = ls();
    const L = currentLevel();
    s.coins += 1;
    updateCoinUI();
    audio.coin();
    notify('\u2726 +1 Coin  (' + s.coins + '/' + L.coinTarget + ')');
    if (s.coins === L.coinTarget) {
      setTimeout(() => notify('\u26E9\uFE0F  The Summoning Altar awakens.'), 900);
    }
  }

  // ==========================================================
  // LEVEL TRANSITIONS
  // ==========================================================
  function goToLevel(n) {
    if (!LEVELS[n]) return;
    state.currentLevel = n;
    const L = LEVELS[n];
    player.x = L.playerSpawn.x;
    player.y = L.playerSpawn.y;
    state.trail = [];
    state.petInstances.forEach((pi, i) => {
      pi.x = player.x - 40 * (i + 1);
      pi.y = player.y;
    });
    if (L.snake) spawnSnake();
    else state.snake = null;
    if (L.bear) spawnBear();
    else state.bear = null;
    rebuildLevelSprites();
    updateCoinUI();
    updateTitleUI();
    closeModal();
    audio.levelStart();
    notify('\u2694\uFE0F  ' + L.title, 'win');
  }

  function restartGame() {
    state.currentLevel = 1;
    state.levelStates = makeLevelStates();
    state.pets = [];
    state.petInstances = [];
    state.bossPhase = 1;
    state.bossDefeated = false;
    state.bossCelebrated = false;
    goToLevel(1);
  }

  // ==========================================================
  // MENU
  // ==========================================================
  function openMenu() {
    openModal('menu');
    document.getElementById('menu-prev').disabled = state.currentLevel <= 1;
    document.getElementById('menu-next').disabled = !LEVELS[state.currentLevel + 1];
  }

  document.getElementById('menu-btn').addEventListener('click', () => { audio.click(); openMenu(); });
  document.getElementById('menu-continue').addEventListener('click', () => { audio.click(); closeModal(); });
  document.getElementById('menu-prev').addEventListener('click', () => {
    audio.click();
    if (state.currentLevel > 1) goToLevel(state.currentLevel - 1);
  });
  document.getElementById('menu-next').addEventListener('click', () => {
    audio.click();
    if (LEVELS[state.currentLevel + 1]) goToLevel(state.currentLevel + 1);
  });
  document.getElementById('menu-restart').addEventListener('click', () => {
    audio.click();
    restartGame();
  });

  // ==========================================================
  // UTILS
  // ==========================================================
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ==========================================================
  // MAIN LOOP
  // ==========================================================
  function loop() {
    state.t++;
    if (state.biteCooldown > 0) state.biteCooldown--;
    updatePlayer();
    updateSnake();
    updateBear();
    updateFireworks();
    updateProximity();
    drawWorld();
    updateSprites();
    requestAnimationFrame(loop);
  }

  // ==========================================================
  // INIT
  // ==========================================================
  player.x = LEVELS[1].playerSpawn.x;
  player.y = LEVELS[1].playerSpawn.y;
  updateCoinUI();
  updateTitleUI();
  updateMuteButton();
  if (LEVELS[1].snake) spawnSnake();
  if (LEVELS[1].bear) spawnBear();
  rebuildLevelSprites();
  notify('\u2694\uFE0F  ' + LEVELS[1].title);
  setTimeout(() => notify('Find 3 runes, then visit the altar.'), 700);
  setTimeout(() => notify('\u26A0 Beware the serpent \u2014 head AND tail bite.', 'danger'), 1500);
  setTimeout(() => notify('\u{1F3B5} Tap or press any key to enable audio.'), 2300);
  loop();
})();
