'use strict';

const C = window.Character;
const { drawCharacter, defaultPose, drawHeart, drawStar, drawText, drawPuff, BODY_CY, HEAD_TOP } = C;

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
let ballRot = 0;
let squash = 1;
let squashVel = 0;
let blinkTimer = 2 + Math.random() * 3;
let blink = 0;
let zzzTimer = 0;
let turn = 0; // eased 0..1 amount he's turned sideways

// States where he turns to a 3/4 view towards where he's going or looking;
// otherwise he faces you, like most panels of the reference sheet.
const TURNED = { walk: 1, run: 1, play: 1, adventure: 1, talk: 1, curious: 1, surprised: 1, jump: 1, angry: 0.6, wave: 0.5, shy: 0.6, fall: 1, grabbed: 0.5 };

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
      spawn('text', 0, HEAD_TOP - 8, { text: 'Wheee!', vy: -20, max: 1, size: 15 });
      break;
    case 'grab':
      spawn('text', 34, HEAD_TOP + 8, { text: '!', vy: -30, max: 0.6, size: 20 });
      break;
    case 'wake':
      spawn('text', 32, HEAD_TOP + 8, { text: '!?', vy: -30, max: 0.8, size: 18 });
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
        drawText(ctx, 'z', p.x, p.y, p.size * (0.7 + k * 0.7), alpha, '#2e2420');
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
      // Every so often a peaceful, eyes-closed smile (the "Blinking" panel).
      if (Math.floor(st / 2.5) % 3 === 2) {
        p.eyes = 'content';
        p.mouth = 'smallSmile';
      }
      break;
    case 'walk':
      walkCycle(p, f, dt, 10, 5);
      p.mouth = 'open';
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
    case 'play':
      walkCycle(p, f, dt, 12, 6);
      p.prop = 'ball';
      // The ball rolls just ahead of him; each step gives it a little kick.
      p.ballX = f.facing * (46 + Math.abs(Math.sin(walkPhase * 0.5)) * 8);
      ballRot += (f.vx * dt) / 11;
      p.ballRot = ballRot;
      p.mouth = 'open';
      p.lookX = f.facing;
      p.lookY = 0.6;
      break;
    case 'adventure':
      walkCycle(p, f, dt, 10, 5);
      p.prop = 'backpack';
      p.mouth = 'open';
      p.armSwing = 0.35;
      break;
    case 'sit':
      p.feet = 'sit';
      p.scaleY *= 0.95;
      p.scaleX = 1.03;
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
      break;
    case 'talk':
      p.mouth = 'talk';
      p.arms = Math.sin(t * 2.5) > 0 ? 'cheer' : 'down';
      p.bob = -Math.abs(Math.sin(t * 8)) * 1.2;
      overlay = 'sound';
      break;
    case 'eat':
      p.feet = 'sit';
      p.arms = 'hold';
      p.prop = 'apple';
      p.propProgress = clamp(st / duration, 0, 1);
      p.eyes = 'content';
      p.mouth = 'chew';
      p.blush = 0.7;
      break;
    case 'flower':
      p.arms = 'hold';
      p.prop = 'flower';
      p.eyes = 'content';
      p.mouth = 'smallSmile';
      p.blush = 0.8;
      p.tilt = Math.sin(t * 1.5) * 0.04;
      overlay = 'flower';
      break;
    case 'backView':
      p.view = 'back';
      p.tilt = Math.sin(t * 1.2) * 0.03;
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
    case 'wave':
      p.arms = 'wave';
      p.mouth = 'open';
      p.blush = 0.7;
      overlay = 'waveLines';
      break;
    default:
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
    case 'flower':
      C.drawDaisy(ctx, x, y + Math.sin(clock * 2) * 2, 5);
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
    if (overlay) drawOverlay(ctx, overlay, pose);
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
