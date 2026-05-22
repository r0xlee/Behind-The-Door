/**
 * ============================================================
 * BEHIND THE DOOR — script.js
 * Psychological Horror Interactive Story Game
 * ============================================================
 * Architecture:
 *   - AudioEngine   : Web Audio API sound synthesis
 *   - FXEngine      : Visual effects (glitch, shake, flicker)
 *   - StoryEngine   : Scene/choice management, typewriter
 *   - ScreenManager : Screen transitions
 *   - SaveSystem    : localStorage persistence
 *   - Game          : Main controller / init
 * ============================================================
 */

'use strict';

/* ============================================================
   AUDIO ENGINE — synthesized sounds via Web Audio API
============================================================ */
const AudioEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let ambientOscillators = [];
  let muted = false;

  /** Lazily create AudioContext on first user gesture */
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);
  }

  function setMuted(val) {
    muted = val;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.6;
  }

  function isMuted() { return muted; }

  /** Low drone ambient loop */
  function startAmbient() {
    stopAmbient();
    if (!ctx || muted) return;
    // Sub-bass drone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(40, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(42, ctx.currentTime + 8);
    gain1.gain.value = 0.04;
    osc1.connect(gain1); gain1.connect(masterGain);
    osc1.start();

    // Mid eerie tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(180, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(183, ctx.currentTime + 12);
    gain2.gain.value = 0.025;
    osc2.connect(gain2); gain2.connect(masterGain);
    osc2.start();

    ambientOscillators = [osc1, osc2];
  }

  function stopAmbient() {
    ambientOscillators.forEach(o => { try { o.stop(); } catch(e){} });
    ambientOscillators = [];
  }

  /** Knocking sound — rhythmic thumps */
  function playKnock(times = 3) {
    if (!ctx || muted) return;
    for (let i = 0; i < times; i++) {
      const t = ctx.currentTime + i * 0.55;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.04));
      }
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      g.gain.setValueAtTime(0.9, t);
      src.connect(g); g.connect(masterGain);
      src.start(t);
    }
  }

  /** Static / VHS glitch sound */
  function playStatic(duration = 0.4) {
    if (!ctx || muted) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 0.3;
    src.buffer = buf;
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(f); f.connect(g); g.connect(masterGain);
    src.start();
  }

  /** Breathing sound — slow sine wave modulation */
  function playBreathing() {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 0.25;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
    g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 6);
    osc.connect(g); g.connect(masterGain);
    osc.start(); osc.stop(ctx.currentTime + 6);
  }

  /** Heartbeat — two quick thumps */
  function playHeartbeat() {
    if (!ctx || muted) return;
    [0, 0.35].forEach(offset => {
      const t = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 55;
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g); g.connect(masterGain);
      osc.start(t); osc.stop(t + 0.25);
    });
  }

  /** High-pitched jumpscare sting */
  function playJumpscare() {
    if (!ctx || muted) return;
    [440, 660, 880].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.03;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(g); g.connect(masterGain);
      osc.start(t); osc.stop(t + 0.6);
    });
    // Low boom
    const boom = ctx.createOscillator();
    const bg = ctx.createGain();
    boom.type = 'sawtooth'; boom.frequency.value = 60;
    bg.gain.setValueAtTime(0.5, ctx.currentTime);
    bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    boom.connect(bg); bg.connect(masterGain);
    boom.start(); boom.stop(ctx.currentTime + 1.5);
  }

  /** Door creak sound */
  function playCreak() {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 1.2);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(g); g.connect(masterGain);
    osc.start(); osc.stop(ctx.currentTime + 1.2);
  }

  return { init, startAmbient, stopAmbient, playKnock, playStatic, playBreathing, playHeartbeat, playJumpscare, playCreak, setMuted, isMuted };
})();

/* ============================================================
   FX ENGINE — visual effects
============================================================ */
const FXEngine = (() => {
  const glitchEl   = document.getElementById('glitch-overlay');
  const flickerEl  = document.getElementById('flicker-overlay');
  const jumpscareEl= document.getElementById('jumpscare-layer');
  const gameScreen = document.getElementById('screen-game');

  function glitch(duration = 600) {
    glitchEl.classList.add('active');
    AudioEngine.playStatic(duration / 1000);
    setTimeout(() => glitchEl.classList.remove('active'), duration);
  }

  function flicker() {
    flickerEl.classList.add('active');
    setTimeout(() => flickerEl.classList.remove('active'), 1500);
  }

  function shake() {
    gameScreen.classList.remove('shake');
    void gameScreen.offsetWidth; // force reflow
    gameScreen.classList.add('shake');
    setTimeout(() => gameScreen.classList.remove('shake'), 500);
  }

  function jumpscare() {
    AudioEngine.playJumpscare();
    jumpscareEl.classList.add('active');
    shake();
    glitch(400);
    setTimeout(() => jumpscareEl.classList.remove('active'), 400);
  }

  /** Change scene background class */
  function setSceneBg(bgClass) {
    const el = document.getElementById('scene-bg');
    el.className = 'scene-bg ' + bgClass;
  }

  return { glitch, flicker, shake, jumpscare, setSceneBg };
})();

/* ============================================================
   SAVE SYSTEM
============================================================ */
const SaveSystem = (() => {
  const KEY = 'btd_save';

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {}
  }

  function load() {
    try {
      const d = localStorage.getItem(KEY);
      return d ? JSON.parse(d) : null;
    } catch(e) { return null; }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch(e) {}
  }

  return { save, load, clear };
})();

/* ============================================================
   SCREEN MANAGER
============================================================ */
const ScreenManager = (() => {
  let current = null;

  function go(id) {
    // Hide all
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
    });
    // Show target
    const target = document.getElementById('screen-' + id);
    if (target) {
      target.classList.add('active');
      current = id;
    }
  }

  function overlay(id) {
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.add('active');
  }

  function hideOverlay(id) {
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.remove('active');
  }

  function getCurrent() { return current; }

  return { go, overlay, hideOverlay, getCurrent };
})();

/* ============================================================
   STORY DATA — All scenes, choices, branches
   ============================================================
   Each scene:
     id        : unique string key
     chapter   : HUD label
     bgClass   : CSS class for background
     speaker   : dialogue speaker label ('' = narration)
     lines     : array of dialogue strings (shown sequentially)
     fx        : optional fx to fire at start: 'glitch'|'shake'|'flicker'|'jumpscare'
     audio     : optional audio cue: 'knock'|'creak'|'breathe'|'heartbeat'
     choices   : array of { text, next } — if empty, auto-advance to 'next'
     next      : scene to go after all lines (when no choices)
     ending    : if set, triggers ending screen with this id
============================================================ */
const STORY = {

  /* ── SCENE 1: Bedroom ───────────────────────────────────── */
  s01_bedroom: {
    id: 's01_bedroom',
    chapter: 'CHAPTER I — MIDNIGHT',
    bgClass: 'bg-bedroom',
    speaker: 'NARRATOR',
    audio: null,
    fx: null,
    lines: [
      '3:00 AM.',
      'You wake abruptly from a dreamless sleep. The room is dark. The air is thick.',
      'Then you hear it...',
    ],
    choices: [],
    next: 's02_knock',
  },

  /* ── SCENE 2: The Knock ─────────────────────────────────── */
  s02_knock: {
    id: 's02_knock',
    chapter: 'CHAPTER I — MIDNIGHT',
    bgClass: 'bg-door',
    speaker: 'NARRATOR',
    audio: 'knock',
    fx: 'shake',
    lines: [
      'Three knocks.',
      'Slow. Deliberate. From outside your bedroom door.',
      'Your heart pounds. You haven\'t moved. The knocking stops.',
      'Silence stretches like a held breath.',
    ],
    choices: [
      { text: 'A — Open the door', next: 's03a_open_door' },
      { text: 'B — Stay completely still', next: 's03b_stay_silent' },
    ],
  },

  /* ── BRANCH A: Open the door ─────────────────────────────── */
  s03a_open_door: {
    id: 's03a_open_door',
    chapter: 'CHAPTER II — THE THRESHOLD',
    bgClass: 'bg-door',
    speaker: 'YOU',
    audio: 'creak',
    fx: 'flicker',
    lines: [
      '"Hello?"',
      'The door swings open with a long, dry creak.',
      'The hallway stretches before you — impossibly long, impossibly dark.',
      'At the far end, something breathes.',
    ],
    choices: [
      { text: 'A — Walk toward it', next: 's04a_hallway_toward' },
      { text: 'B — Run back to bed', next: 's04b_retreat' },
    ],
  },

  /* ── BRANCH B: Stay silent ───────────────────────────────── */
  s03b_stay_silent: {
    id: 's03b_stay_silent',
    chapter: 'CHAPTER II — THE THRESHOLD',
    bgClass: 'bg-bedroom',
    speaker: 'NARRATOR',
    audio: 'breathe',
    fx: null,
    lines: [
      'You press yourself flat against the mattress.',
      'The knocking resumes. Louder this time. Insistent.',
      'Then — a voice. Barely a whisper through the crack under the door.',
      '"I know you\'re awake."',
    ],
    choices: [
      { text: 'A — Grab your phone and call for help', next: 's04c_call_help' },
      { text: 'B — Hide under the bed', next: 's04d_under_bed' },
    ],
  },

  /* ── A → Walk toward it ─────────────────────────────────── */
  s04a_hallway_toward: {
    id: 's04a_hallway_toward',
    chapter: 'CHAPTER III — THE DARK',
    bgClass: 'bg-hallway',
    speaker: 'NARRATOR',
    audio: 'heartbeat',
    fx: 'glitch',
    lines: [
      'Each step feels longer than the last.',
      'The walls pulse. Or maybe that\'s just your heartbeat.',
      'Halfway down the hall, you see it — a shape. Human. Wrong.',
      'It tilts its head. Slowly. Far too far.',
    ],
    choices: [
      { text: 'A — Speak to it', next: 's05a_speak' },
      { text: 'B — Turn on the light switch', next: 's05b_light' },
    ],
  },

  /* ── A → Retreat ─────────────────────────────────────────── */
  s04b_retreat: {
    id: 's04b_retreat',
    chapter: 'CHAPTER III — TRAPPED',
    bgClass: 'bg-bedroom',
    speaker: 'NARRATOR',
    audio: null,
    fx: 'shake',
    lines: [
      'You slam the door shut. Lock it. Lean against it.',
      'Then the door handle begins to turn.',
      'From the inside.',
    ],
    choices: [],
    next: 's05c_door_inside',
  },

  /* ── B → Call for help ───────────────────────────────────── */
  s04c_call_help: {
    id: 's04c_call_help',
    chapter: 'CHAPTER III — SIGNAL',
    bgClass: 'bg-bedroom',
    speaker: 'NARRATOR',
    audio: null,
    fx: 'glitch',
    lines: [
      'You reach for your phone. The screen lights up.',
      'No signal. 0 bars.',
      'You try to dial anyway. Static floods the speaker.',
      'Through the static, a voice — your own voice — whispers: "Don\'t open the door."',
    ],
    choices: [
      { text: 'A — Open the door anyway', next: 's05d_open_anyway' },
      { text: 'B — Go to the window', next: 's05e_window' },
    ],
  },

  /* ── B → Under the bed ───────────────────────────────────── */
  s04d_under_bed: {
    id: 's04d_under_bed',
    chapter: 'CHAPTER III — BENEATH',
    bgClass: 'bg-basement',
    speaker: 'NARRATOR',
    audio: 'breathe',
    fx: null,
    lines: [
      'You slide under the bed frame, pressing into the cold floor.',
      'Dust. Darkness.',
      'The door opens. You see two bare feet stop beside the bed.',
      'They are perfectly still. Waiting.',
      'Then — they lower. Something is crouching down to look at you.',
    ],
    choices: [],
    next: 's05f_under_jumpscare',
  },

  /* ── SCENE 5 branches ────────────────────────────────────── */
  s05a_speak: {
    id: 's05a_speak',
    chapter: 'CHAPTER IV — CONVERSATION',
    bgClass: 'bg-hallway',
    speaker: 'YOU',
    audio: null,
    fx: null,
    lines: [
      '"Who are you?"',
      'Its mouth opens. No sound comes out.',
      'Then it raises one arm — pointing. Past you. Behind you.',
      'You turn. The front door is open. Moonlight floods in.',
      'And beyond — a path through the woods you have never seen before.',
    ],
    choices: [
      { text: 'A — Follow the path', next: 's06_good_path' },
      { text: 'B — Stay and demand answers', next: 's06_demand' },
    ],
  },

  s05b_light: {
    id: 's05b_light',
    chapter: 'CHAPTER IV — ILLUMINATED',
    bgClass: 'bg-hallway',
    speaker: 'NARRATOR',
    audio: null,
    fx: 'jumpscare',
    lines: [
      'Your hand finds the switch.',
      'The light floods on.',
      'The hallway is empty.',
      'But on the wall — written in something dark — are the words:',
      '"IT WAS NEVER ABOUT THE DOOR."',
    ],
    choices: [],
    next: 's06_basement_door',
  },

  s05c_door_inside: {
    id: 's05c_door_inside',
    chapter: 'CHAPTER IV — INSIDE',
    bgClass: 'bg-red',
    speaker: 'NARRATOR',
    audio: null,
    fx: 'jumpscare',
    lines: [
      'You scramble away.',
      'The door swings open.',
      'Nothing. The room is empty.',
      'You turn around.',
      'The mirror across the room shows your reflection.',
      'But your reflection isn\'t moving.',
    ],
    choices: [],
    next: 'end_bad',
  },

  s05d_open_anyway: {
    id: 's05d_open_anyway',
    chapter: 'CHAPTER IV — DEFIANCE',
    bgClass: 'bg-door',
    speaker: 'NARRATOR',
    audio: 'creak',
    fx: 'flicker',
    lines: [
      'You fling open the door.',
      'The hallway is empty. Normal.',
      'But at the end of it — a door you have never noticed before.',
      'Small. Black. No handle.',
    ],
    choices: [
      { text: 'A — Approach the black door', next: 's06_secret_door' },
      { text: 'B — Go back to your room', next: 'end_bad' },
    ],
  },

  s05e_window: {
    id: 's05e_window',
    chapter: 'CHAPTER IV — ESCAPE',
    bgClass: 'bg-outside',
    speaker: 'NARRATOR',
    audio: null,
    fx: null,
    lines: [
      'You pull back the curtain.',
      'Outside, the street is still. Familiar. Safe-looking.',
      'Then you see your neighbor\'s house — every light is on.',
      'And someone is standing in every window.',
      'All of them watching your house.',
      'All of them watching you.',
    ],
    choices: [
      { text: 'A — Try to climb out', next: 's06_climb_out' },
      { text: 'B — Lock the window and hide', next: 'end_bad' },
    ],
  },

  s05f_under_jumpscare: {
    id: 's05f_under_jumpscare',
    chapter: 'CHAPTER IV — FOUND',
    bgClass: 'bg-basement',
    speaker: 'NARRATOR',
    audio: null,
    fx: 'jumpscare',
    lines: [
      'A face appears — level with yours. Upside down.',
      'It smiles.',
      '"Found you."',
    ],
    choices: [],
    next: 'end_bad',
  },

  /* ── SCENE 6 — convergence scenes ───────────────────────── */
  s06_good_path: {
    id: 's06_good_path',
    chapter: 'CHAPTER V — THE WOODS',
    bgClass: 'bg-outside',
    speaker: 'NARRATOR',
    audio: null,
    fx: null,
    lines: [
      'The path is cold under your bare feet.',
      'The trees close behind you as you walk.',
      'At the center of the woods, a clearing. A light.',
      'And standing in it — someone you recognize.',
      'Someone who died three years ago.',
      '"You finally opened it," they say. "We\'ve been waiting."',
    ],
    choices: [],
    next: 'end_good',
  },

  s06_demand: {
    id: 's06_demand',
    chapter: 'CHAPTER V — ANSWERS',
    bgClass: 'bg-hallway',
    speaker: 'NARRATOR',
    audio: null,
    fx: 'glitch',
    lines: [
      'The figure flickers like a broken signal.',
      '"You already know," it says — in your voice.',
      'And then you remember.',
      'You have been here before. Every night.',
      'The door. The knock. The choice.',
      'You always forget.',
    ],
    choices: [
      { text: 'A — "I want to remember"', next: 'end_secret' },
      { text: 'B — "Make it stop"', next: 'end_bad' },
    ],
  },

  s06_basement_door: {
    id: 's06_basement_door',
    chapter: 'CHAPTER V — BELOW',
    bgClass: 'bg-basement',
    speaker: 'NARRATOR',
    audio: null,
    fx: 'flicker',
    lines: [
      'Following the writing, you find a door to the basement — open.',
      'Steps descend into absolute dark.',
      'You realize: the knocking came from below all along.',
    ],
    choices: [
      { text: 'A — Descend', next: 's07_descend' },
      { text: 'B — Run outside', next: 'end_good' },
    ],
  },

  s06_secret_door: {
    id: 's06_secret_door',
    chapter: 'CHAPTER V — THE LAST DOOR',
    bgClass: 'bg-mirror',
    speaker: 'NARRATOR',
    audio: null,
    fx: 'glitch',
    lines: [
      'As your hand touches the door — it opens.',
      'Not outward. Not inward.',
      'The door dissolves.',
      'Beyond it: a white void. Silence so complete it has texture.',
      'A voice — formless — says:',
      '"You were never supposed to find this."',
    ],
    choices: [],
    next: 'end_secret',
  },

  s06_climb_out: {
    id: 's06_climb_out',
    chapter: 'CHAPTER V — ESCAPE',
    bgClass: 'bg-outside',
    speaker: 'NARRATOR',
    audio: null,
    fx: null,
    lines: [
      'You push open the window and drop to the lawn.',
      'The cold grass. Real. Solid.',
      'You run without looking back.',
      'Two blocks away, you collapse against a streetlight — and look up.',
      'Your house. Every light is on.',
      'And you can see yourself, still standing at the bedroom window, watching.',
    ],
    choices: [],
    next: 'end_good',
  },

  s07_descend: {
    id: 's07_descend',
    chapter: 'CHAPTER VI — THE TRUTH',
    bgClass: 'bg-basement',
    speaker: 'NARRATOR',
    audio: 'heartbeat',
    fx: 'jumpscare',
    lines: [
      'The stairs creak.',
      'At the bottom: a chair, a lamp, a mirror.',
      'You look into the mirror.',
      'The reflection turns to face you.',
      '"It was always you," it says.',
      '"You were the one knocking."',
    ],
    choices: [],
    next: 'end_secret',
  },

  /* ── ENDINGS ─────────────────────────────────────────────── */
  end_good: {
    id: 'end_good',
    ending: true,
  },
  end_bad: {
    id: 'end_bad',
    ending: true,
  },
  end_secret: {
    id: 'end_secret',
    ending: true,
  },
};

/* ============================================================
   ENDING DATA
============================================================ */
const ENDINGS = {
  end_good: {
    badge: '✦ GOOD ENDING',
    title: 'The Light Beyond',
    desc: 'You found the courage to face the unknown. Whatever waited behind the door — it wasn\'t a monster. It was a message. You will sleep easier now. For a while.',
    style: 'good',
  },
  end_bad: {
    badge: '✗ BAD ENDING',
    title: 'Still There',
    desc: 'You never really escaped. The door is still there. The knock will come again tonight. And the night after that. It always does.',
    style: 'bad',
  },
  end_secret: {
    badge: '◈ SECRET ENDING',
    title: 'The Loop',
    desc: 'You are the anomaly. You were never the one being haunted — you were the haunting. You wake up at 3:00 AM. There is knocking at the door. From the outside.',
    style: 'secret',
  },
};

/* ============================================================
   STORY ENGINE — typewriter, scene rendering, choices
============================================================ */
const StoryEngine = (() => {
  let currentScene   = null;
  let currentLineIdx = 0;
  let isTyping       = false;
  let typeInterval   = null;
  let onChoiceCb     = null;

  const dialogueBox    = document.getElementById('dialogue-box');
  const dialogueSpeaker= document.getElementById('dialogue-speaker');
  const dialogueText   = document.getElementById('dialogue-text');
  const dialogueContinue = document.getElementById('dialogue-continue');
  const choicePanel    = document.getElementById('choice-panel');
  const choiceButtons  = document.getElementById('choice-buttons');
  const hudChapter     = document.getElementById('hud-chapter');

  /** Register callback for when a choice is selected */
  function onChoice(cb) { onChoiceCb = cb; }

  /** Load and display a scene */
  function loadScene(sceneId) {
    const scene = STORY[sceneId];
    if (!scene) { console.error('Unknown scene:', sceneId); return; }

    // Endings are handled by Game controller
    if (scene.ending) {
      if (onChoiceCb) onChoiceCb({ type: 'ending', endingId: sceneId });
      return;
    }

    currentScene   = scene;
    currentLineIdx = 0;

    // Save progress
    SaveSystem.save({ scene: sceneId });

    // HUD
    hudChapter.textContent = scene.chapter || '';

    // Scene background
    FXEngine.setSceneBg(scene.bgClass || '');

    // Fire FX
    if (scene.fx) {
      setTimeout(() => FXEngine[scene.fx](), 400);
    }

    // Fire audio cue
    if (scene.audio) {
      setTimeout(() => {
        if      (scene.audio === 'knock')     AudioEngine.playKnock();
        else if (scene.audio === 'creak')     AudioEngine.playCreak();
        else if (scene.audio === 'breathe')   AudioEngine.playBreathing();
        else if (scene.audio === 'heartbeat') AudioEngine.playHeartbeat();
      }, 600);
    }

    // Reset UI
    choicePanel.classList.remove('visible');
    dialogueContinue.classList.remove('visible');
    dialogueSpeaker.textContent = scene.speaker || '';
    dialogueText.textContent = '';

    // Start typing first line
    setTimeout(() => typeLine(scene.lines[currentLineIdx]), 300);
  }

  /** Typewriter effect for a single line */
  function typeLine(text) {
    if (typeInterval) clearInterval(typeInterval);
    dialogueText.textContent = '';
    dialogueContinue.classList.remove('visible');
    isTyping = true;

    let i = 0;
    const speed = 28; // ms per character
    typeInterval = setInterval(() => {
      dialogueText.textContent += text[i];
      i++;
      if (i >= text.length) {
        clearInterval(typeInterval);
        isTyping = false;
        onLineComplete();
      }
    }, speed);
  }

  /** Skip typing — show full text immediately */
  function skipTyping() {
    if (!isTyping) return;
    clearInterval(typeInterval);
    isTyping = false;
    dialogueText.textContent = currentScene.lines[currentLineIdx];
    onLineComplete();
  }

  /** After a line finishes typing */
  function onLineComplete() {
    const scene = currentScene;
    const isLast = currentLineIdx >= scene.lines.length - 1;

    if (!isLast) {
      // More lines — show continue prompt
      dialogueContinue.classList.add('visible');
    } else {
      // Last line
      if (scene.choices && scene.choices.length > 0) {
        // Show choices
        setTimeout(() => showChoices(scene.choices), 300);
      } else if (scene.next) {
        // Auto-advance
        dialogueContinue.classList.add('visible');
        dialogueContinue.textContent = '▼ click to continue';
      }
    }
  }

  /** Advance to next line on click */
  function advance() {
    if (isTyping) { skipTyping(); return; }

    const scene = currentScene;
    if (!scene) return;

    const isLast = currentLineIdx >= scene.lines.length - 1;

    if (!isLast) {
      currentLineIdx++;
      dialogueContinue.classList.remove('visible');
      typeLine(scene.lines[currentLineIdx]);
    } else if (!scene.choices || scene.choices.length === 0) {
      // Auto-advance to next scene
      if (scene.next) {
        dialogueContinue.classList.remove('visible');
        loadScene(scene.next);
      }
    }
  }

  /** Render choice buttons */
  function showChoices(choices) {
    choiceButtons.innerHTML = '';
    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => {
        // Disable all buttons immediately
        choiceButtons.querySelectorAll('.choice-btn').forEach(b => b.disabled = true);
        AudioEngine.playStatic(0.15);
        FXEngine.glitch(300);
        setTimeout(() => loadScene(choice.next), 400);
      });
      choiceButtons.appendChild(btn);
    });
    choicePanel.classList.add('visible');
  }

  return { loadScene, advance, onChoice };
})();

/* ============================================================
   GAME CONTROLLER — wires everything together
============================================================ */
const Game = (() => {
  let paused = false;

  function init() {
    // Bind menu buttons
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-howto').addEventListener('click', () => ScreenManager.go('howto'));
    document.getElementById('btn-credits').addEventListener('click', () => ScreenManager.go('credits'));
    document.getElementById('btn-exit').addEventListener('click', () => {
      if (confirm('Close this tab / window?')) window.close();
    });

    // Modal back buttons
    document.querySelectorAll('.modal-back-btn').forEach(btn => {
      btn.addEventListener('click', () => ScreenManager.go(btn.dataset.target));
    });

    // Pause
    document.getElementById('btn-pause').addEventListener('click', pause);
    document.getElementById('btn-resume').addEventListener('click', resume);
    document.getElementById('btn-restart-pause').addEventListener('click', restart);
    document.getElementById('btn-main-menu-pause').addEventListener('click', goMenu);

    // Mute
    document.getElementById('btn-mute').addEventListener('click', toggleMute);

    // Ending screen
    document.getElementById('btn-play-again').addEventListener('click', restart);
    document.getElementById('btn-main-menu-ending').addEventListener('click', goMenu);

    // Dialogue advance on click
    document.getElementById('dialogue-box').addEventListener('click', () => {
      if (ScreenManager.getCurrent() === 'game' && !paused) {
        StoryEngine.advance();
      }
    });

    // ESC = pause
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (ScreenManager.getCurrent() === 'game') {
          paused ? resume() : pause();
        }
      }
    });

    // Story choice callback — handle endings
    StoryEngine.onChoice(event => {
      if (event.type === 'ending') {
        showEnding(event.endingId);
      }
    });

    // Show menu initially
    ScreenManager.go('menu');

    // Check for saved progress
    const save = SaveSystem.load();
    if (save && save.scene) {
      const btn = document.getElementById('btn-start');
      btn.textContent = '▶  CONTINUE';
    }
  }

  function startGame() {
    AudioEngine.init();
    AudioEngine.startAmbient();
    ScreenManager.go('game');

    const save = SaveSystem.load();
    const startScene = (save && save.scene && STORY[save.scene]) ? save.scene : 's01_bedroom';
    StoryEngine.loadScene(startScene);
  }

  function pause() {
    paused = true;
    ScreenManager.overlay('pause');
  }

  function resume() {
    paused = false;
    ScreenManager.hideOverlay('pause');
  }

  function restart() {
    paused = false;
    SaveSystem.clear();
    ScreenManager.hideOverlay('pause');
    ScreenManager.go('game');
    StoryEngine.loadScene('s01_bedroom');
  }

  function goMenu() {
    paused = false;
    AudioEngine.stopAmbient();
    ScreenManager.hideOverlay('pause');
    ScreenManager.go('menu');
    // Update start button label
    const save = SaveSystem.load();
    const btn = document.getElementById('btn-start');
    btn.innerHTML = save && save.scene
      ? '<span class="btn-icon">▶</span> CONTINUE'
      : '<span class="btn-icon">▶</span> START GAME';
  }

  function toggleMute() {
    const muted = !AudioEngine.isMuted();
    AudioEngine.setMuted(muted);
    document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
    if (!muted) AudioEngine.startAmbient();
    else AudioEngine.stopAmbient();
  }

  function showEnding(endingId) {
    AudioEngine.stopAmbient();
    SaveSystem.clear();

    const data = ENDINGS[endingId];
    if (!data) return;

    const badge = document.getElementById('ending-badge');
    const title = document.getElementById('ending-title');
    const desc  = document.getElementById('ending-desc');

    badge.textContent = data.badge;
    title.textContent = data.title;
    desc.textContent  = data.desc;

    // Style per ending type
    badge.className = 'ending-badge';
    if (data.style === 'bad') {
      badge.style.borderColor = '#c0392b';
      badge.style.color = '#c0392b';
    } else if (data.style === 'secret') {
      badge.style.borderColor = '#a07840';
      badge.style.color = '#a07840';
    } else {
      badge.style.borderColor = '#2ecc71';
      badge.style.color = '#2ecc71';
    }

    // FX
    if (data.style === 'bad') { FXEngine.jumpscare(); }
    else if (data.style === 'secret') { FXEngine.glitch(800); }

    setTimeout(() => ScreenManager.go('ending'), data.style === 'bad' ? 500 : 0);
  }

  return { init };
})();

/* ============================================================
   BOOT
============================================================ */
document.addEventListener('DOMContentLoaded', () => Game.init());
