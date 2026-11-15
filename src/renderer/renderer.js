'use strict';

// The active character (?character=<id>, set by src/main/main.js): its
// looks, activities, voice and lines live in src/characters/<id>/.
const CHARACTER_ID = new URLSearchParams(location.search).get('character') || 'togepi';
const ch = window.Characters[CHARACTER_ID] || window.Characters.togepi;
const LINES = (window.CharacterLines || {})[CHARACTER_ID] || window.CharacterLines.togepi;
const C = window.UI;
const { drawHeart, drawStar, drawText, drawPuff } = C;
const { defaultPose, BODY_CY, HEAD_TOP } = ch;
const drawCharacter = ch.draw;

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const FOOT_MARGIN = 18; // keep in sync with src/main/main.js
const SIZE = 1.15; // drawing scale; keep in sync with HIT in src/main/companion.js

let frame = null; // latest state from the main process
let pose = defaultPose();
let particles = [];
let clock = 0;
let lastNow = performance.now();

// Local animation state.
let walkPhase = 0;
let squash = 1;
let squashVel = 0;
let blinkTimer = 2 + Math.random() * 3;
let blink = 0;
let zzzTimer = 0;
let turn = 0; // eased 0..1 amount he's turned sideways

// States where he turns to a 3/4 view towards where he's going or looking;
// otherwise he faces you, like most panels of the reference sheet. The
// character adds its own activities.
const TURNED = { ...ch.turned, walk: 1, run: 1, talk: 1, curious: 1, surprised: 1, jump: 1, angry: 0.6, wave: 0.5, shy: 0.6, fall: 1, grabbed: 0.5, eyeRest: 1, watchBall: 0.6, pickBall: 1, ttt: 0.6 };

// What he says after you answer a nudge (or when he gives up on one), by
// mood, and other floating texts: the character's own (LINES.says / floats).
const SAYS = LINES.says;
const FLOATS = LINES.floats;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------ particles

const CONFETTI = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9f43'];

function spawn(kind, x, y, extra = {}) {
  particles.push({ kind, x, y, vx: 0, vy: 0, life: 0, max: 1, size: 10, rot: 0, ...extra });
}

function puffs(count, strength) {
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    spawn('puff', side * (22 + Math.random() * 10), -4, {
      vx: side * (30 + Math.random() * 50) * strength,
      vy: -10 - Math.random() * 25,
      max: 0.5 + Math.random() * 0.3,
      size: 5 + Math.random() * 5 * strength,
    });
  }
}

function handleEvent(name) {
  switch (name) {
    case 'heart':
      spawn('heart', (Math.random() < 0.5 ? -1 : 1) * (36 + Math.random() * 14), HEAD_TOP + 20, {
        vx: (Math.random() - 0.5) * 20,
        vy: -40,
        max: 1.4,
        size: 9 + Math.random() * 4,
      });
      break;
    case 'land':
      squashVel -= 5;
      puffs(2, 0.6);
      break;
    case 'bounce':
      squashVel -= 9;
      puffs(4, 1);
      break;
    case 'thud':
      squashVel -= 13;
      puffs(6, 1.5);
      break;
    case 'bonk':
      spawn('star', 0, HEAD_TOP + 10, { vy: -30, max: 0.6, size: 9 });
      break;
    case 'throw':
      spawn('text', 0, HEAD_TOP - 8, { text: FLOATS.throw, vy: -20, max: 1, size: 15 });
      break;
    case 'grab':
      spawn('text', 34, HEAD_TOP + 8, { text: FLOATS.grab, vy: -30, max: 0.6, size: 20 });
      break;
    case 'goodMorning':
      spawn('text', 0, HEAD_TOP - 10, { text: FLOATS.goodMorning, vy: -12, max: 2.2, size: 14 });
      break;
    case 'hello':
      spawn('text', 0, HEAD_TOP - 10, { text: FLOATS.hello, vy: -12, max: 2, size: 14 });
      break;
    case 'welcomeBack':
      spawn('text', 0, HEAD_TOP - 10, { text: FLOATS.welcomeBack, vy: -12, max: 2, size: 14 });
      break;
    case 'charging':
      spawn('text', 0, HEAD_TOP - 10, { text: FLOATS.charging, vy: -12, max: 1.8, size: 14 });
      break;
    case 'lonely':
      spawn('text', 30, HEAD_TOP + 4, { text: FLOATS.lonely, vy: -15, max: 1.5, size: 18 });
      break;
    case 'reminderAck':
    case 'noteDone':
    case 'waterDone':
    case 'stretchDone':
    case 'eyesDone':
    case 'bedtimeDone':
    case 'nudgeLater': {
      const band = (frame && frame.band) || 'content';
      spawn('text', 0, HEAD_TOP - 10, { text: SAYS[name][band] || SAYS[name].content, vy: -12, max: 1.6, size: 14 });
      if (name === 'waterDone' && (band === 'cheerful' || band === 'content')) {
        spawn('heart', 30, HEAD_TOP + 10, { vy: -30, max: 1.2, size: 9 });
      }
      break;
    }
    case 'eventEnded':
      spawn('text', 0, HEAD_TOP - 10, { text: FLOATS.eventEnded, vy: -12, max: 1.8, size: 14 });
      break;
    case 'gaveUp':
    case 'thatWasFun':
    case 'tttYouWin':
    case 'tttIWin': {
      const band = (frame && frame.band) || 'content';
      spawn('text', 0, HEAD_TOP - 10, { text: SAYS[name][band] || SAYS[name].content, vy: -12, max: 1.8, size: 14 });
      if (name === 'thatWasFun' && band !== 'grumpy') spawn('heart', 30, HEAD_TOP + 10, { vy: -30, max: 1.2, size: 9 });
      break;
    }
    case 'ballThrow':
      spawn('text', 0, HEAD_TOP - 10, { text: FLOATS.ballThrow, vy: -14, max: 1.4, size: 14 });
      break;
    case 'gotBall':
      spawn('text', 0, HEAD_TOP - 10, { text: FLOATS.gotBall, vy: -14, max: 1.2, size: 14 });
      break;
    case 'tttDraw':
      spawn('text', 0, HEAD_TOP - 10, { text: FLOATS.tttDraw, vy: -12, max: 1.6, size: 14 });
      break;
    case 'tttYouStart':
      spawn('text', 0, HEAD_TOP - 10, { text: FLOATS.tttYouStart, vy: -12, max: 1.6, size: 14 });
      break;
    case 'tttIStart':
      spawn('text', 0, HEAD_TOP - 10, { text: FLOATS.tttIStart, vy: -12, max: 1.6, size: 14 });
      break;
    case 'watchHeart':
      // Something funny in what you're watching.
      spawn('heart', 30, HEAD_TOP + 10, { vy: -30, max: 1.4, size: 10 });
      break;
    case 'sparkles':
      // Something beautiful in what you're watching.
      for (let i = 0; i < 5; i++) {
        spawn('star', (Math.random() - 0.5) * 90, HEAD_TOP + 10 + Math.random() * 50, { vy: -12 - Math.random() * 12, max: 1.6 + Math.random(), size: 6 + Math.random() * 4 });
      }
      break;
    case 'puff':
      // A new character appearing (switched from the menu).
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        spawn('puff', Math.cos(a) * 26, BODY_CY + Math.sin(a) * 34, { vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 - 20, max: 0.7 + Math.random() * 0.3, size: 9 + Math.random() * 6 });
      }
      break;
    case 'wake':
      spawn('text', 32, HEAD_TOP + 8, { text: FLOATS.wake, vy: -30, max: 0.8, size: 18 });
      break;
    // Phase 12 moments (his mind chose 'celebrate' or 'comfort'). Particles
    // only, so they work the same for every character.
    case 'confetti':
      for (let i = 0; i < 28; i++) {
        spawn('confetti', (Math.random() - 0.5) * 50, HEAD_TOP - 4, {
          vx: (Math.random() - 0.5) * 150,
          vy: -90 - Math.random() * 70,
          max: 1.6 + Math.random() * 0.8,
          size: 4 + Math.random() * 3,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 14,
          color: CONFETTI[i % CONFETTI.length],
        });
      }
      break;
    case 'comfort':
      for (let i = 0; i < 3; i++) {
        spawn('heart', (i - 1) * 24, HEAD_TOP + 16, { vx: (i - 1) * 6, vy: -22 - i * 6, max: 1.8 + i * 0.3, size: 9 + Math.random() * 3 });
      }
      break;
    default:
      // The character's own floating texts (Pip: "That was unnecessary.").
      if (FLOATS[name]) spawn('text', 0, HEAD_TOP - 10, { text: FLOATS[name], vy: -12, max: 2.4, size: 13 });
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'puff') {
      p.vx *= 1 - 3 * dt;
      p.vy *= 1 - 3 * dt;
    }
    if (p.kind === 'heart' || p.kind === 'zzz') p.x += Math.sin(p.life * 5) * 15 * dt;
    if (p.kind === 'confetti') {
      p.vy += 220 * dt;
      p.vx *= 1 - 1.5 * dt;
      p.rot += p.spin * dt;
    }
  }
  particles = particles.filter((p) => p.life < p.max);
}

function drawParticles(ctx) {
  for (const p of particles) {
    const k = p.life / p.max;
    const alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    switch (p.kind) {
      case 'heart':
        drawHeart(ctx, p.x, p.y, p.size * (0.6 + Math.min(1, k * 4) * 0.4), alpha);
        break;
      case 'puff':
        drawPuff(ctx, p.x, p.y, p.size * (1 + k), alpha * 0.8);
        break;
      case 'star':
        drawStar(ctx, p.x, p.y, p.size, k * 6, alpha);
        break;
      case 'zzz':
        drawText(ctx, 'z', p.x, p.y, p.size * (0.7 + k * 0.7), alpha, '#2e2420');
        break;
      case 'text':
        drawText(ctx, p.text, p.x, p.y, p.size, alpha);
        break;
      case 'confetti':
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        break;
      default:
    }
  }
}

// ------------------------------------------------------------ pose

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Overlay symbol drawn by his head for the current state (from the reference sheet).
let overlay = null;

function walkCycle(p, f, dt, speed, step) {
  walkPhase += dt * speed;
  p.walkPhase = walkPhase;
  p.stepHeight = step;
  p.bob = -Math.abs(Math.sin(walkPhase)) * (step * 0.55);
  p.armSwing = 0.45;
  p.tilt = f.facing * 0.05;
  p.lookX = f.facing * 0.6;
  p.lookY = 0;
}

// His everyday face (idle, walking, sitting, looking around) follows his mood.
// `moving` = walking, so the face and gait can differ a little.
function applyMoodFace(p, f, moving) {
  const band = f.band || 'content';
  const tired = f.energy != null && f.energy < 0.25;
  switch (band) {
    case 'cheerful':
      p.eyes = 'open';
      p.mouth = moving ? 'open' : 'smile';
      p.blush = Math.max(p.blush, 0.6);
      if (moving) p.bob *= 1.3; // a bit of a spring in his step
      break;
    case 'content':
      p.eyes = 'open';
      p.mouth = 'smallSmile';
      break;
    case 'meh':
      p.eyes = 'meh';
      p.mouth = 'flat';
      break;
    case 'sad':
      p.eyes = 'sad';
      p.mouth = 'frown';
      p.blush = 0.2;
      p.lookY = 0.55; // looking down at his feet
      p.lookX *= 0.4;
      p.tilt += f.facing * 0.03;
      if (moving) {
        p.stepHeight = 3;
        p.bob *= 0.5;
        p.armSwing = 0.15;
      }
      break;
    case 'grumpy':
      p.eyes = 'angry';
      p.mouth = 'frown';
      p.blush = 0.6;
      if (moving) p.stepHeight = 6.5; // stompy
      break;
    default:
  }
  // Droopy eyes when he's running out of energy (unless sad or cross).
  if (tired && (band === 'cheerful' || band === 'content' || band === 'meh')) p.eyes = 'sleepy';
}

// Face for nudges and signs: his mood face, so he never smiles at you about
// water when he's sad or cross.
function nudgeFace(p, f) {
  applyMoodFace(p, f, false);
  if (f.band === 'sad') p.blush = 0.15;
}

const happyBand = (f) => f.band === 'cheerful' || f.band === 'content';

// An item he holds (holdItem / playItem): f.item, a PNG or SVG (item.js).
function itemFor(item) {
  const it = window.Items.load(item);
  return it && { img: it.img, w: it.w / SIZE, h: it.h / SIZE };
}

function computePose(f, dt) {
  const p = defaultPose();
  const t = clock;
  const st = f.stateTime;
  const duration = f.stateDuration || 1;
  p.t = t;
  p.facing = f.facing;
  p.blush = 0.35 + f.happiness * 0.25;
  overlay = null;

  // Look at the cursor (relative to his eyes).
  if (f.cursor) {
    p.lookX = clamp(f.cursor.x / 160, -1, 1);
    p.lookY = clamp((f.cursor.y - (BODY_CY - 22) * SIZE) / 160, -1, 1);
  }

  // Blinking.
  blinkTimer -= dt;
  if (blinkTimer <= 0) {
    blink = 0.15;
    blinkTimer = 2 + Math.random() * 4;
  }
  if (blink > 0) blink -= dt;
  p.blink = blink > 0 ? 1 : 0;

  // Breathing.
  p.scaleY = 1 + Math.sin(t * 2.2) * 0.012;

  // Ease between facing you and the 3/4 view.
  const turnTarget = TURNED[f.state] || (f.grumpy ? 1 : 0);
  turn += (turnTarget - turn) * Math.min(1, dt * 8);
  p.turn = turn;

  switch (f.state) {
    case 'idle':
      if (f.grumpy) {
        // Sulking on the spot (angry while told to stay put).
        p.eyes = 'angry';
        p.mouth = 'growl';
        p.arms = 'fists';
        p.blush = 0.7;
        overlay = 'anger';
        break;
      }
      applyMoodFace(p, f, false);
      // When he's happy, every so often a peaceful, eyes-closed smile (the "Blinking" panel).
      if ((f.band === 'cheerful' || f.band === 'content') && Math.floor(st / 2.5) % 3 === 2) {
        p.eyes = 'content';
        p.mouth = 'smallSmile';
      }
      break;
    case 'walk':
      walkCycle(p, f, dt, f.band === 'sad' ? 7 : 10, 5);
      applyMoodFace(p, f, true);
      if (f.grumpy) {
        // Stomping off after being thrown around too much.
        p.eyes = 'angry';
        p.mouth = 'growl';
        p.arms = 'fists';
        p.blush = 0.7;
        overlay = 'anger';
      }
      break;
    case 'run':
      walkCycle(p, f, dt, 19, 7);
      p.tilt = f.facing * 0.12;
      p.armSwing = 0.7;
      p.mouth = 'open';
      p.eyes = 'happy';
      break;
    case 'sit':
      p.feet = 'sit';
      p.scaleY *= 0.95;
      p.scaleX = 1.03;
      applyMoodFace(p, f, false);
      if (f.band === 'sad') p.scaleY *= 0.97; // slumped
      if (f.byWindow) {
        // Lonely, sitting below your window, still looking up at it.
        if (f.band !== 'sad' && f.band !== 'grumpy') p.eyes = 'open';
        p.lookX = 0;
        p.lookY = -0.8;
      }
      break;
    case 'lookUp':
      // Lonely: standing below your window, looking up at it (eyes open and
      // hopeful, unless he's sad or cross).
      applyMoodFace(p, f, false);
      if (f.band !== 'sad' && f.band !== 'grumpy') {
        p.eyes = 'open';
        p.mouth = 'flat';
      }
      p.lookX = 0;
      p.lookY = -0.9;
      p.tilt = Math.sin(t * 1.2) * 0.03;
      break;
    case 'sleep':
      p.view = 'lying';
      p.eyes = 'closed';
      p.blink = 0;
      p.scaleY = 1 + Math.sin(t * 1.5) * 0.03; // slow breathing
      p.blush = 0.6;
      zzzTimer -= dt;
      if (zzzTimer <= 0) {
        zzzTimer = 1.3;
        // Rising from above the shell end, like the reference.
        spawn('zzz', 22 * -f.facing, -82, { vx: 10 * -f.facing, vy: -24, max: 2.4, size: 16 });
      }
      break;
    case 'jump':
      p.arms = 'up';
      p.eyes = 'happy';
      p.mouth = 'open';
      p.stepHeight = 4;
      p.walkPhase = Math.PI / 2;
      break;
    case 'grabbed':
      p.feet = 'dangle';
      p.arms = 'up';
      p.blush = 0.8;
      if (st < 0.6) {
        p.eyes = 'wide';
        p.mouth = 'o';
      } else if (Math.abs(f.swing) > 0.5) {
        p.eyes = 'squint';
        p.mouth = 'wavy';
      } else {
        p.mouth = 'smallSmile';
      }
      p.scaleY = 1.05;
      p.scaleX = 0.97;
      break;
    case 'fall': {
      p.feet = 'dangle';
      p.arms = 'flail';
      p.eyes = 'wide';
      p.mouth = 'o';
      p.blink = 0;
      const stretch = clamp(Math.abs(f.vy) / 5000, 0, 0.15);
      p.scaleY = 1 + stretch;
      p.scaleX = 1 - stretch * 0.6;
      p.tilt = clamp(f.vx * 0.0003, -0.5, 0.5);
      break;
    }
    case 'land':
      p.eyes = 'squint';
      p.mouth = 'flat';
      break;
    case 'confused':
      p.eyes = 'small';
      p.mouth = Math.sin(t * 3) > 0 ? 'o' : 'wavy';
      p.tilt = Math.sin(t * 4) * 0.08;
      p.blink = 0;
      overlay = 'scribble';
      break;
    case 'happy':
      p.eyes = 'happy';
      p.mouth = 'open';
      p.arms = 'cheer';
      p.blush = 1;
      p.bob = -Math.abs(Math.sin(t * 7)) * 2;
      p.tilt = Math.sin(t * 3.5) * 0.05;
      break;
    case 'hug':
      p.eyes = 'content';
      p.mouth = 'smallSmile';
      p.arms = 'hug';
      p.blush = 1;
      p.scaleX = 1 + Math.sin(t * 3) * 0.015;
      p.tilt = Math.sin(t * 2) * 0.04;
      break;
    case 'surprised':
      p.eyes = 'wide';
      p.mouth = 'open';
      p.arms = 'up';
      p.blink = 0;
      p.bob = -Math.max(0, Math.sin(st * 9)) * 6 * Math.max(0, 1 - st);
      overlay = 'sound';
      break;
    case 'lookAround':
      p.lookX = Math.sin(st * 3);
      p.lookY = -0.2;
      p.tilt = Math.sin(st * 3) * 0.05;
      applyMoodFace(p, f, false);
      p.lookX = Math.sin(st * 3);
      break;
    case 'talk':
      p.mouth = 'talk';
      p.arms = Math.sin(t * 2.5) > 0 ? 'cheer' : 'down';
      p.bob = -Math.abs(Math.sin(t * 8)) * 1.2;
      overlay = 'sound';
      break;
    case 'backView':
      p.view = 'back';
      p.tilt = Math.sin(t * 1.2) * 0.03;
      // Watching something with you: sitting down for it.
      if (f.watching) {
        p.feet = 'sit';
        p.scaleY *= 0.95;
        p.scaleX = 1.03;
        p.tilt = Math.sin(t * 0.6) * 0.015;
      }
      break;
    case 'sad':
      p.eyes = 'sad';
      p.mouth = 'frown';
      p.blush = 0.25;
      p.scaleY *= 0.97;
      p.lookY = 0.4;
      p.lookX = 0;
      break;
    case 'angry':
      p.eyes = 'angry';
      p.mouth = 'growl';
      p.arms = 'fists';
      p.blush = 0.8;
      p.bob = -Math.abs(Math.sin(t * 12)) * 2; // stomping
      overlay = 'anger';
      break;
    case 'shy':
      p.eyes = 'open';
      p.mouth = 'smallSmile';
      p.arms = 'hold';
      p.blush = 1;
      p.lookX = -f.facing * 0.6;
      p.lookY = 0.5;
      p.tilt = -f.facing * 0.05;
      overlay = 'sweat';
      break;
    case 'curious':
      p.mouth = 'smile';
      p.tilt = -f.facing * 0.12;
      overlay = 'question';
      break;
    case 'sign':
    case 'note':
      // Holding up a "Meeting in 5!" sign or your "remind me" note.
      p.arms = 'up';
      nudgeFace(p, f);
      if (f.band === 'cheerful') p.mouth = 'open';
      if (f.board && f.board.urgent && happyBand(f)) {
        p.eyes = 'wide';
        p.mouth = 'open';
      }
      p.bob = -Math.abs(Math.sin(t * 5)) * 1.5;
      break;
    case 'water':
      // Bringing you a glass of water.
      p.arms = 'hold';
      p.prop = 'glass';
      p.propProgress = 0.85;
      nudgeFace(p, f);
      p.bob = -Math.abs(Math.sin(t * 2)) * 1.2;
      break;
    case 'drink': {
      // You drank, so he has a sip too.
      const up = clamp(Math.min(st / 0.4, (duration - st) / 0.4), 0, 1);
      p.arms = 'sip';
      p.prop = 'glass';
      p.glassLift = up;
      p.propProgress = 0.85 - 0.5 * clamp(st / duration, 0, 1);
      applyMoodFace(p, f, false);
      if (happyBand(f)) p.eyes = 'content';
      p.mouth = 'o';
      p.blush = happyBand(f) ? 0.8 : p.blush;
      break;
    }
    case 'stretch':
      // A big, slow stretch: up on tiptoe, arms high.
      p.arms = 'stretch';
      nudgeFace(p, f);
      if (happyBand(f) && Math.sin(t * 1.6) > 0.3) p.eyes = 'content';
      p.scaleY *= 1.04 + Math.sin(t * 1.6) * 0.025;
      p.scaleX *= 0.98;
      p.bob = -2 - Math.max(0, Math.sin(t * 1.6)) * 3;
      break;
    case 'eyeRest':
      // Shading his eyes, gazing far away (look 20 feet away for 20 seconds).
      p.arms = 'shade';
      nudgeFace(p, f);
      p.lookX = f.facing;
      p.lookY = -0.5;
      p.tilt = -f.facing * 0.03;
      break;
    case 'bedtime': {
      // Sleepy, yawning every few seconds.
      nudgeFace(p, f);
      if (f.band !== 'sad' && f.band !== 'grumpy') p.eyes = 'sleepy';
      const phase = st % 4.5;
      if (phase > 2.8) {
        p.mouth = 'yawn';
        p.eyes = 'closed';
        p.arms = 'stretch';
        p.scaleY *= 1.03;
      }
      p.tilt = Math.sin(t * 0.9) * 0.04;
      break;
    }
    case 'nod':
      // A small nod after you answer him: a smile only if he's in a good mood.
      nudgeFace(p, f);
      if (happyBand(f)) {
        p.eyes = 'happy';
        p.mouth = 'smile';
        p.blush = 0.8;
      }
      p.bob = Math.max(0, Math.sin(st * 9)) * 3 * Math.max(0, 1 - st / duration);
      break;
    case 'wave':
      p.arms = 'wave';
      p.mouth = 'open';
      p.blush = 0.7;
      overlay = 'waveLines';
      break;
    case 'offerBall':
      // Holding the fetch ball out to you: "Play fetch?"
      nudgeFace(p, f);
      if (happyBand(f)) p.mouth = 'open';
      p.bob = -Math.abs(Math.sin(t * 4)) * 2;
      break;
    case 'watchBall':
      // Eyes on the ball, bouncing on the spot.
      p.eyes = 'wide';
      p.mouth = 'open';
      p.arms = 'cheer';
      p.blink = 0;
      p.blush = 0.7;
      p.bob = -Math.abs(Math.sin(t * 9)) * 3;
      if (f.ball) {
        p.lookX = clamp(f.ball.x / 200, -1, 1);
        p.lookY = clamp((f.ball.y - BODY_CY * SIZE) / 200, -1, 1);
      }
      break;
    case 'pickBall':
      // Bending down to pick up the ball.
      p.arms = 'hold';
      p.scaleY *= 0.9;
      p.scaleX *= 1.05;
      p.lookX = f.facing;
      p.lookY = 0.9;
      p.mouth = 'o';
      break;
    case 'offerGame':
      // "Tic-tac-toe?" with a little bounce.
      nudgeFace(p, f);
      p.arms = 'cheer';
      if (happyBand(f)) p.mouth = 'open';
      p.bob = -Math.abs(Math.sin(t * 5)) * 1.5;
      break;
    case 'ttt':
      // Next to the board: watching your move, or thinking about his.
      applyMoodFace(p, f, false);
      p.lookX = f.facing * 0.8;
      p.lookY = 0.1;
      if (f.thinking) {
        p.mouth = 'flat';
        p.eyes = 'open';
        p.lookY = -0.4;
        p.tilt = Math.sin(t * 2) * 0.05;
        overlay = 'question';
      }
      break;
    case 'holdItem':
      // Holding up something (f.item) in the hand on the left of his body, having a look at it.
      applyMoodFace(p, f, false);
      p.arms = 'item';
      p.lookX = -0.7;
      p.lookY = -0.3;
      p.tilt = -0.03 + Math.sin(t * 1.4) * 0.015;
      break;
    case 'playItem':
      // Playing with it: waving it around.
      applyMoodFace(p, f, false);
      if (happyBand(f)) {
        p.eyes = 'happy';
        p.mouth = 'open';
      }
      p.arms = 'item';
      p.itemWave = 1;
      p.lookX = -0.8;
      p.lookY = -0.4 + Math.sin(t * 7) * 0.3;
      p.bob = -Math.abs(Math.sin(t * 7)) * 1.5;
      p.tilt = Math.sin(t * 3.5) * 0.04;
      break;
    case 'watchReact':
      // A moment of what you're watching, in the character's own way
      // (src/characters/<id>/look.js watchPose).
      if (ch.watchPose) ch.watchPose(f.watchMood, p, f, { t, st, duration, dt, clamp, overlay: (k) => (overlay = k) });
      break;
    default: {
      // The character's own activities (src/characters/<id>/look.js).
      const own = ch.activityPose && ch.activityPose[f.state];
      if (own) own(p, f, { t, st, duration, dt, clamp, size: SIZE, walkCycle: (pp, ff, speed, step) => walkCycle(pp, ff, dt, speed, step), overlay: (k) => (overlay = k) });
    }
  }
  // The character's own take on shared states (Pip's victory flight when happy).
  if (ch.restyle) ch.restyle(f.state, p, f, { t, st, duration, dt, clamp });
  // The item's picture, once it has loaded (until then his hand stays down).
  if (p.arms === 'item') {
    p.item = itemFor(f.item);
    if (!p.item) p.arms = 'down';
  }
  // Carrying the fetch ball (running back with it, holding it out to you).
  if (f.holdingBall && !['grabbed', 'fall', 'jump', 'sleep'].includes(f.state)) {
    p.prop = ch.heldProp;
    p.arms = 'grip';
    p.armSwing = 0;
  }

  // Squash spring (landings).
  squashVel += (-(squash - 1) * 320 - squashVel * 13) * dt;
  squash += squashVel * dt;
  squash = clamp(squash, 0.55, 1.4);
  p.scaleY *= squash;
  p.scaleX *= 1 / Math.sqrt(squash);

  return p;
}

function drawOverlay(ctx, kind, p) {
  const x = 38 * (p.facing || 1);
  const y = HEAD_TOP + 8;
  switch (kind) {
    case 'sound':
      C.drawSoundLines(ctx, x - 4 * p.facing, y + 6, clock);
      break;
    case 'anger':
      C.drawAngerMark(ctx, x, y, clock);
      break;
    case 'scribble':
      C.drawScribble(ctx, x * 0.8, y - 6, clock);
      break;
    case 'sweat':
      C.drawSweat(ctx, x - 2 * p.facing, y + 22, clock);
      break;
    case 'question':
      drawText(ctx, '?', x, y - 2 + Math.sin(clock * 3) * 2, 20, 1);
      break;
    case 'waveLines': {
      // Little motion arcs next to the waving hand.
      ctx.save();
      ctx.strokeStyle = '#5b4534';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      const hx = 56 * p.facing;
      for (const r of [6, 11]) {
        ctx.beginPath();
        ctx.arc(hx, BODY_CY - 28, r, -0.9 + (p.facing < 0 ? Math.PI - 0.6 : 0), 0.3 + (p.facing < 0 ? Math.PI - 0.6 : 0));
        ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(clock * 6));
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    default:
      // The character's own marks (src/characters/<id>/look.js).
      if (ch.overlays && ch.overlays[kind]) ch.overlays[kind](ctx, x, y, clock);
  }
}

// ------------------------------------------------------------ render loop

function render(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  clock += dt;

  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);

  if (frame) {
    pose = computePose(frame, dt);
    updateParticles(dt);

    const ox = window.innerWidth / 2;
    const oy = window.innerHeight - FOOT_MARGIN;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(SIZE, SIZE);

    const grounded = !['grabbed', 'fall', 'jump'].includes(frame.state);
    if (grounded) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.ellipse(0, 0, (pose.view === 'lying' ? 50 : 38) * pose.scaleX, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#4a3a6a';
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    if (frame.state === 'grabbed') {
      // Hang and swing from the point where he was picked up.
      const gx = frame.grabOffset.x / SIZE;
      const gy = frame.grabOffset.y / SIZE;
      ctx.translate(gx, gy);
      ctx.rotate(frame.swing);
      ctx.translate(-gx, -gy);
    }
    drawCharacter(ctx, pose);
    // In a meeting: no "?" or chatter marks around him.
    if (frame.quiet && (overlay === 'question' || overlay === 'sound')) overlay = null;
    if (overlay) drawOverlay(ctx, overlay, pose);
    // Whatever he's holding up over his head: a sign, a note or a speech bubble.
    let bubble = null; // a bubble's size, when it sizes to its text
    if (frame.board) {
      if (frame.board.style === 'bubble') bubble = C.drawBubble(ctx, frame.board, clock);
      else C.drawSign(ctx, frame.board, clock);
    } else if (frame.speech && frame.answers) {
      bubble = C.drawQuestion(ctx, frame.speech, frame.answers, frame.cursor ? { x: frame.cursor.x / SIZE, y: frame.cursor.y / SIZE } : null, frame.speechBadge);
    } else if (frame.speech) {
      bubble = C.drawSpeech(ctx, frame.speech, clock, frame.speechBadge);
    }
    ctx.restore();
    reportBubble(bubble);

    drawParticles(ctx);
    ctx.restore();
  }

  requestAnimationFrame(render);
}

// Tell the main process how big the bubble is (screen px from his feet:
// half its width and how high its top is, with room for the bob), so his
// window can grow to fit it and clicks on it land. Sent only when it changes.
let sentBubble = 'null';
function reportBubble(L) {
  const box = L ? { halfWidth: Math.ceil((L.w / 2 + 2) * SIZE), top: Math.ceil((-L.top + 3) * SIZE) } : null;
  const key = JSON.stringify(box);
  if (key === sentBubble) return;
  sentBubble = key;
  if (window.companion.bubble) window.companion.bubble(box);
}

window.companion.onFrame((f) => {
  frame = f;
  for (const e of f.events) handleEvent(e);
});

// He chirps when he talks: your own clip if you've added some, otherwise
// the character's own generated voice (src/renderer/chirp.js).
window.companion.onVoice((v) => {
  if (v.clip) window.Chirp.playClip(v.clip.buffer ? v.clip.buffer.slice(v.clip.byteOffset, v.clip.byteOffset + v.clip.byteLength) : v.clip);
  else window.Chirp.play(ch, { band: v.band, syllables: v.syllables });
});
requestAnimationFrame(render);

// ------------------------------------------------------------ input

// Press-and-drag picks him up, press-and-hold pets him, a quick click pats
// him. The main process tells these apart; we just report press/release.
let pressed = false;

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  pressed = true;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('grabbing');
  window.companion.press();
});

function endPress() {
  if (!pressed) return;
  pressed = false;
  canvas.classList.remove('grabbing');
  window.companion.release();
}
canvas.addEventListener('pointerup', endPress);
canvas.addEventListener('pointercancel', endPress);
canvas.addEventListener('lostpointercapture', endPress);

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  pressed = false;
  canvas.classList.remove('grabbing');
  window.companion.contextMenu();
});

// ------------------------------------------------------------ tray icon

(function makeTrayIcon() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size - 2);
  g.scale(0.52, 0.52);
  drawCharacter(g, { ...defaultPose(), lookX: 0, lookY: 0.3 });
  window.companion.setTrayIcon(c.toDataURL('image/png'));
})();

// ------------------------------------------------------------ battery

// Battery level and charging state, for his brain (tired when it's low,
// perks up when you plug in). Not every machine has a battery.
(async function watchBattery() {
  if (!navigator.getBattery) return;
  try {
    const battery = await navigator.getBattery();
    const send = () => window.companion.setBattery({ level: battery.level, charging: battery.charging });
    battery.addEventListener('levelchange', send);
    battery.addEventListener('chargingchange', send);
    send();
  } catch {
    // No battery information: he just won't react to it.
  }
})();
