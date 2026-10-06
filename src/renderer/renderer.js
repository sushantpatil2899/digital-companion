'use strict';

const { drawCharacter, defaultPose, drawHeart, drawStar, drawText, drawPuff, BODY_CY } = window.Character;

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const FOOT_MARGIN = 12; // keep in sync with src/main/main.js

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
let heartTimer = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------ particles

function spawn(kind, x, y, extra = {}) {
  particles.push({ kind, x, y, vx: 0, vy: 0, life: 0, max: 1, size: 10, rot: 0, ...extra });
}

function puffs(count, strength) {
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    spawn('puff', side * (18 + Math.random() * 10), -4, {
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
      spawn('heart', (Math.random() - 0.5) * 50, BODY_CY - 40, {
        vx: (Math.random() - 0.5) * 30,
        vy: -45,
        max: 1.4,
        size: 9 + Math.random() * 5,
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
      spawn('star', 0, BODY_CY - 40, { vy: -30, max: 0.6, size: 9 });
      break;
    case 'throw':
      spawn('text', 0, BODY_CY - 60, { text: 'Wheee!', vy: -20, max: 1, size: 15 });
      break;
    case 'grab':
      spawn('text', 26, BODY_CY - 52, { text: '!', vy: -30, max: 0.6, size: 20 });
      break;
    case 'poke':
      spawn('text', 22, BODY_CY - 50, { text: '♪', vy: -35, max: 0.8, size: 18 });
      break;
    case 'wake':
      spawn('text', 24, BODY_CY - 52, { text: '!?', vy: -30, max: 0.8, size: 18 });
      break;
    case 'yawn':
      spawn('text', 30, BODY_CY - 40, { text: '~', vy: -20, max: 1, size: 18 });
      break;
    case 'dizzy':
      break;
    default:
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
        drawText(ctx, 'z', p.x, p.y, p.size * (0.7 + k * 0.6), alpha, '#5b6bb5');
        break;
      case 'text':
        drawText(ctx, p.text, p.x, p.y, p.size, alpha);
        break;
      default:
    }
  }
}

// ------------------------------------------------------------ pose

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function computePose(f, dt) {
  const p = defaultPose();
  const t = clock;
  const st = f.stateTime;
  p.t = t;
  p.facing = f.facing;
  p.blush = 0.25 + f.happiness * 0.3;

  // Look at the cursor (relative to his eyes).
  if (f.cursor) {
    p.lookX = clamp(f.cursor.x / 160, -1, 1);
    p.lookY = clamp((f.cursor.y - (BODY_CY - 10)) / 160, -1, 1);
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
  p.tailWag = Math.sin(t * 2) * 0.15;

  switch (f.state) {
    case 'walk':
    case 'run': {
      const run = f.state === 'run';
      walkPhase += dt * (run ? 19 : 10);
      p.walkPhase = walkPhase;
      p.stepHeight = run ? 7 : 5;
      p.bob = -Math.abs(Math.sin(walkPhase)) * (run ? 5 : 3);
      p.armSwing = run ? 0.7 : 0.35;
      p.tilt = f.facing * (run ? 0.12 : 0.04);
      p.tailWag = Math.sin(t * (run ? 12 : 5)) * 0.25;
      p.lookX = f.facing * 0.6;
      p.lookY = 0;
      if (run) {
        p.mouth = 'open';
        p.earFlop = 0.25;
      }
      break;
    }
    case 'sit':
      p.feet = 'sit';
      p.scaleY *= 0.92;
      p.scaleX = 1.04;
      p.tailWag = Math.sin(t * 1.2) * 0.3;
      break;
    case 'sleep':
      p.feet = 'sit';
      p.eyes = 'closed';
      p.mouth = 'flat';
      p.blink = 0;
      p.scaleY = 0.9 + Math.sin(t * 1.5) * 0.025;
      p.scaleX = 1.06;
      p.earFlop = 0.25;
      p.blush = 0.55;
      p.tailWag = 0.3;
      p.tilt = 0.05;
      zzzTimer -= dt;
      if (zzzTimer <= 0) {
        zzzTimer = 1.3;
        spawn('zzz', 26, BODY_CY - 40, { vx: 12, vy: -22, max: 2.2, size: 15 });
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
      p.blush = 0.7;
      p.earFlop = 0.2;
      if (st < 0.6) {
        p.eyes = 'wide';
        p.mouth = 'o';
      } else if (Math.abs(f.swing) > 0.5) {
        p.eyes = 'squint';
        p.mouth = 'wavy';
      } else {
        p.mouth = 'wavy';
      }
      p.scaleY = 1.06;
      p.scaleX = 0.96;
      p.tailWag = Math.sin(t * 6) * 0.4;
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
      p.earFlop = f.vy > 0 ? -0.2 : 0.2;
      break;
    }
    case 'land':
      p.eyes = 'squint';
      p.mouth = 'flat';
      break;
    case 'dizzy':
      p.eyes = 'dizzy';
      p.mouth = 'wavy';
      p.tilt = Math.sin(t * 5) * 0.12;
      p.earFlop = 0.3;
      break;
    case 'happy':
      p.eyes = 'happy';
      p.mouth = 'open';
      p.blush = 1;
      p.tailWag = Math.sin(t * 14) * 0.45;
      p.bob = -Math.abs(Math.sin(t * 7)) * 2;
      p.earFlop = 0.15 + Math.sin(t * 7) * 0.05;
      p.tilt = Math.sin(t * 3.5) * 0.06;
      if (f.petting > 0) {
        heartTimer -= dt;
        if (heartTimer <= 0) {
          heartTimer = 0.45;
          handleEvent('heart');
        }
      }
      break;
    case 'surprised':
      p.eyes = 'wide';
      p.mouth = 'o';
      p.blink = 0;
      p.earFlop = -0.15;
      p.bob = -Math.max(0, Math.sin(st * 9)) * 6 * Math.max(0, 1 - st);
      break;
    case 'lookAround':
      p.lookX = Math.sin(st * 3);
      p.lookY = -0.2;
      p.tilt = Math.sin(st * 3) * 0.06;
      break;
    default: // idle
  }

  // Squash spring (landings).
  squashVel += (-(squash - 1) * 320 - squashVel * 13) * dt;
  squash += squashVel * dt;
  squash = clamp(squash, 0.55, 1.4);
  p.scaleY *= squash;
  p.scaleX *= 1 / Math.sqrt(squash);

  return p;
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

    const grounded = !['grabbed', 'fall', 'jump'].includes(frame.state);
    if (grounded) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34 * pose.scaleX, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    if (frame.state === 'grabbed') {
      // Hang and swing from the point where he was picked up.
      const g = frame.grabOffset;
      ctx.translate(g.x, g.y);
      ctx.rotate(frame.swing);
      ctx.translate(-g.x, -g.y);
    }
    drawCharacter(ctx, pose);

    if (frame.state === 'dizzy') {
      for (let i = 0; i < 3; i++) {
        const a = clock * 4 + (i * Math.PI * 2) / 3;
        drawStar(ctx, Math.cos(a) * 30, BODY_CY - 46 + Math.sin(a) * 7, 7, clock * 3, 1);
      }
    }
    ctx.restore();

    drawParticles(ctx);
    ctx.restore();
  }

  requestAnimationFrame(render);
}

window.companion.onFrame((f) => {
  frame = f;
  for (const e of f.events) handleEvent(e);
});
requestAnimationFrame(render);

// ------------------------------------------------------------ input

let pressed = false;
let lastMove = null;
let rub = 0;
let rubSent = performance.now();

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

// Petting: rub the cursor back and forth over him without clicking.
canvas.addEventListener('pointermove', (e) => {
  const now = performance.now();
  if (e.buttons !== 0 || pressed) {
    lastMove = null;
    return;
  }
  if (lastMove) {
    const dt = (now - lastMove.t) / 1000;
    const dist = Math.hypot(e.screenX - lastMove.x, e.screenY - lastMove.y);
    if (dt > 0 && dt < 0.2 && dist / dt > 40) rub += dt;
  }
  lastMove = { x: e.screenX, y: e.screenY, t: now };
  if (rub > 0 && now - rubSent > 100) {
    window.companion.pet(Math.min(rub, 0.3));
    rub = 0;
    rubSent = now;
  }
});
canvas.addEventListener('pointerleave', () => {
  lastMove = null;
});

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
