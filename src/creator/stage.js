// Fake window.companion for the character creator (src/main/creator.js): runs
// inside /creator/stage.html, the real companion window, before renderer.js. It
// builds the frames the main process would send (src/main/companion.js
// snapshot()) from the creator's controls or a scene (src/creator/scenes.js), and
// slows down, pauses or steps time for the renderer. In the Simulation tab
// the creator runs the real simulation and sends each frame instead.
(function () {
'use strict';

const params = new URLSearchParams(location.search);
const CHARACTER_ID = params.get('character') || 'togepi';
const FOOT_MARGIN = 18; // keep in sync with src/renderer/renderer.js
// Events the main process chirps on (src/main/main.js VOICE_EVENTS): syllables.
const VOICE_EVENTS = {
  speak: 0, throw: 2, goodMorning: 3, hello: 3, welcomeBack: 3, charging: 3, reminderAck: 2, noteDone: 2, waterDone: 2,
  stretchDone: 2, eyesDone: 2, bedtimeDone: 2, nudgeLater: 2, eventEnded: 2, gaveUp: 3, thatWasFun: 3,
  tttYouWin: 3, tttIWin: 3, tttDraw: 2, tttYouStart: 3, tttIStart: 2, ballThrow: 3, gotBall: 2, gameInvite: 3, nudge: 3, reminder: 3,
};

const DEFAULT_FRAME = {
  state: 'idle',
  stateTime: 0,
  stateDuration: 4,
  facing: 1,
  vx: 0,
  vy: 0,
  swing: 0,
  grabOffset: { x: 0, y: -110 },
  happiness: 0.6,
  mood: 0.6,
  band: 'content',
  energy: 0.8,
  eventTitle: null,
  reminderKind: null,
  petting: false,
  quiet: false,
  board: null,
  grumpy: false,
  holdingBall: false,
  ball: null,
  thinking: false,
  speech: null,
  answers: null,
  speechBadge: null,
  watching: false,
  watchMood: null,
  byWindow: false,
  variant: null,
  ahead: null,
  wonGame: false,
  wonBoard: null,
  time: 0,
};

let onFrame = null;
let onVoice = null;
let manual = {}; // frame fields from the creator's State tab
let opts = { speed: 1, paused: false, followMouse: true, sound: false, loop: true, loopState: true, zoom: 1 };
let scene = null; // { def, i, st }
let state = null; // the state being shown, to reset stateTime when it changes
let stateTime = 0;
let time = 0;
let queued = [];
let cursor = null;
let held = null; // { st, lastX, swing } while you hold him with the mouse
let scenes = [];
let sim = null; // the latest frame from the simulation, in the Simulation tab

function post(msg) {
  parent.postMessage({ from: 'stage', ...msg }, '*');
}

fetch('/creator/characters.json')
  .then((r) => r.json())
  .then((all) => {
    scenes = window.Scenes.list(all.find((c) => c.id === CHARACTER_ID));
    post({ type: 'ready' });
  });

// ------------------------------------------------------------ time

// renderer.js animates with requestAnimationFrame's timestamp; hand it a
// clock that can run slower, stop, or step one frame.
const realRaf = window.requestAnimationFrame.bind(window);
let lastReal = null;
let virtual = performance.now();
let stepFrames = 0;
window.requestAnimationFrame = (cb) =>
  realRaf((real) => {
    if (lastReal !== real) {
      const d = lastReal == null ? 0 : real - lastReal;
      lastReal = real;
      let adv = opts.paused ? 0 : d * opts.speed;
      if (opts.paused && stepFrames > 0) {
        adv = 1000 / 60;
        stepFrames--;
      }
      virtual += adv;
      tick(adv / 1000);
    }
    cb(virtual);
  });

// Sharper drawing when the creator zooms the stage in.
const realDpr = window.devicePixelRatio || 1;
Object.defineProperty(window, 'devicePixelRatio', { get: () => realDpr * (opts.zoom || 1) });

// ------------------------------------------------------------ frames

function sceneStep() {
  return scene ? scene.def.steps[scene.i] : null;
}

function startStep() {
  const step = sceneStep();
  if (!step) return;
  queued.push(...(step.events || []));
  scene.fired = new Set();
  stateTime = 0;
  state = step.state;
}

function tick(dt) {
  time += dt;
  stateTime += dt;
  if (sim) return send({ ...DEFAULT_FRAME, ...sim, cursor: opts.followMouse ? sim.cursor : null });
  let f = { ...DEFAULT_FRAME, ...manual };
  if (scene) {
    scene.st += dt;
    let step = sceneStep();
    if (scene.st >= step.dur) {
      scene.st = 0;
      scene.i++;
      if (scene.i >= scene.def.steps.length) {
        if (opts.loop) scene.i = 0;
        else {
          scene = null;
          post({ type: 'sceneEnded' });
        }
      }
      if (scene) startStep();
    }
    step = sceneStep();
    if (step) {
      Object.assign(f, step.set || {}, { state: step.state, stateDuration: step.stateDuration || step.dur });
      for (const [at, e] of step.at || []) {
        if (scene.st >= at && !scene.fired.has(at + e)) {
          scene.fired.add(at + e);
          queued.push(e);
        }
      }
      if (step.tick) step.tick(f, scene.st, step.dur);
    }
  } else if (opts.loopState && f.stateDuration && stateTime > f.stateDuration) {
    // Replay a state with a duration (eat, drink, nod...).
    stateTime = 0;
  }
  if (held) {
    // You're holding him: dangling and swinging with the mouse.
    held.st += dt;
    held.swing += ((held.target || 0) - held.swing) * Math.min(1, dt * 6);
    held.target *= 1 - Math.min(1, dt * 3);
    Object.assign(f, { state: 'grabbed', swing: held.swing });
  }
  if (f.state !== state) {
    state = f.state;
    stateTime = 0;
  }
  f.stateTime = held ? held.st : stateTime;
  f.time = time;
  f.cursor = opts.followMouse ? cursor : null;
  send(f);
}

/** Hand frame `f` to the renderer, with the events queued since the last one (chirping for some). */
function send(f) {
  f.events = queued;
  queued = [];
  for (const e of f.events) {
    if (opts.sound && e in VOICE_EVENTS && onVoice) {
      const syllables = e === 'speak' && f.speech ? f.speech.split(/\s+/).length : VOICE_EVENTS[e];
      onVoice({ band: f.band, syllables, clip: null });
    }
  }
  if (onFrame) onFrame(f);
  status(f);
}

let lastStatus = 0;
function status(f) {
  const now = performance.now();
  if (now - lastStatus < 100) return;
  lastStatus = now;
  const step = sceneStep();
  post({
    type: 'status',
    state: f.state,
    stateTime: f.stateTime,
    stateDuration: f.stateDuration,
    scene: scene ? { id: scene.def.id, i: scene.i, n: scene.def.steps.length, label: step && (step.label || step.state) } : null,
  });
}

// ------------------------------------------------------------ the creator

window.addEventListener('message', (e) => {
  const m = e.data || {};
  switch (m.type) {
    case 'manual':
      manual = m.frame || {};
      break;
    case 'sim':
      // A frame from the simulation (src/main/companion.js snapshot()), or null to stop.
      sim = m.frame;
      if (sim) queued.push(...(sim.events || []));
      break;
    case 'opts':
      Object.assign(opts, m.opts);
      if ('zoom' in m.opts) window.dispatchEvent(new Event('resize'));
      break;
    case 'event':
      queued.push(m.name);
      break;
    case 'scene': {
      const def = scenes.find((s) => s.id === m.id);
      if (!def) return;
      scene = { def, i: 0, st: 0 };
      startStep();
      break;
    }
    case 'stopScene':
      scene = null;
      break;
    case 'restart':
      stateTime = 0;
      if (scene) {
        scene.i = 0;
        scene.st = 0;
        startStep();
      }
      break;
    case 'step':
      stepFrames += m.frames || 1;
      break;
    case 'chirp':
      if (onVoice) onVoice({ band: m.band || 'content', syllables: m.syllables || 3, clip: null });
      break;
    case 'getPose':
      // renderer.js's top-level `pose` (a script-scope binding, shared between scripts).
      // eslint-disable-next-line no-undef
      post({ type: 'pose', pose: typeof pose !== 'undefined' ? pose : null });
      break;
    default:
  }
});

document.addEventListener('pointermove', (e) => {
  cursor = { x: e.clientX - window.innerWidth / 2, y: e.clientY - (window.innerHeight - FOOT_MARGIN) };
  if (held) {
    held.target = Math.max(-0.8, Math.min(0.8, (held.target || 0) + (e.clientX - held.lastX) * 0.02));
    held.lastX = e.clientX;
  }
});
document.addEventListener('pointerleave', () => (cursor = null));

window.companion = {
  onFrame: (cb) => (onFrame = cb),
  onVoice: (cb) => (onVoice = cb),
  // Press and hold to pick him up; let go and he drops.
  press: () => {
    held = { st: 0, swing: 0, target: 0, lastX: cursor ? cursor.x + window.innerWidth / 2 : 0 };
    queued.push('grab');
  },
  release: () => {
    if (!held) return;
    held = null;
    queued.push('land');
  },
  contextMenu: () => post({ type: 'log', text: 'context menu' }),
  setTrayIcon: (dataUrl) => post({ type: 'trayIcon', dataUrl }),
  setBattery: () => {},
};
})();
