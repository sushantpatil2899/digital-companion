// Pip's looks: a tiny clockwork bird, drawn in code. Everything is drawn
// relative to his feet at (0, 0); up is negative y. Registers itself as
// window.Characters.pip (see src/characters/README.md).
// His look was approved by Sushant on 2026-10-24 (Phase 9, step 2).
(function () {
'use strict';

const PALETTE = {
  outline: '#2b2a33',
  body: '#f6efdc', // warm ivory
  bodyShade: '#e6d9bb',
  belly: '#f1cd72', // muted yellow
  wing: '#2f6f73', // dark teal
  wingDark: '#24575b',
  wingLight: '#3f8a8e',
  beak: '#f08a3c',
  beakDark: '#c9661f',
  goggle: '#3d4a52', // the rings around his eyes
  eye: '#1f1d24',
  white: '#ffffff',
  metal: '#9aa3ab',
  metalDark: '#6e7780',
  key: '#e0b13a', // brass wind-up key
  keyDark: '#b58a22',
  cheek: 'rgba(240, 150, 140, ',
  lid: '#e9dec4', // eyelids inside the goggles
};

const CY = -58; // centre of his round body
const RX = 45; // half width
const RY = 49; // half height
const FACE_Y = CY - 12; // eye line
const EYE_X = 17;
const SIT_DROP = 12; // how far his body sinks when he sits
const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

function fillStroke(ctx, fill, lineWidth = 2.2) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

// --------------------------------------------------------------- parts

/**
 * The wind-up key on top of his head: a short, thick brass stem and a bow
 * on top. Drawn before his body, so the stem goes into his head (front and
 * back alike).
 */
function drawKey(ctx, p) {
  const spin = p.keySpin || 0; // radians: the bow turns when he's wound up or happy
  const baseY = CY - RY + 10; // inside his head
  const hubY = CY - RY - 12;
  const w = 17 * Math.abs(Math.cos(spin)) + 4; // the bow, foreshortened as it turns
  ctx.save();
  // Stem, up to the middle of the bow (no gap).
  ctx.beginPath();
  ctx.roundRect(-5, hubY, 10, baseY - hubY, 3);
  fillStroke(ctx, PALETTE.keyDark, 2.2);
  // Bow: two rounded wings with holes.
  for (const s of [-1, 1]) {
    ellipse(ctx, s * w * 0.6, hubY - 6, w * 0.62, 10);
    fillStroke(ctx, PALETTE.key, 2.2);
    ellipse(ctx, s * w * 0.62, hubY - 6, w * 0.24, 3.4);
    ctx.fillStyle = PALETTE.keyDark;
    ctx.fill();
  }
  // Hub where the bow meets the stem.
  ellipse(ctx, 0, hubY - 2, 6, 6);
  fillStroke(ctx, PALETTE.key, 2.2);
  ctx.restore();
}

/**
 * One wing, `side` -1 (left) or 1 (right), hanging from his shoulder and
 * turned by `wingAngle` (the same angles as Togepi's arms: the wing points
 * along (-sin a, cos a)).
 */
function drawWing(ctx, side, p, back) {
  const k = side; // mirrors the shape to his outside
  // Wings brought forward (hugging, holding something) point towards you,
  // so they look shorter, and come from a little lower.
  const forward = FORWARD[p.arms];
  ctx.save();
  ctx.translate(side * (RX - 6), CY - 6 + (forward ? 10 : 0));
  ctx.rotate(wingAngle(side, p));
  if (forward) ctx.scale(forward, forward);
  // A broad wing with three feather tips along its edge.
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(k * 14, -14, k * 22, 0, k * 21, 16);
    ctx.bezierCurveTo(k * 20, 27, k * 18, 35, k * 14, 41);
    ctx.quadraticCurveTo(k * 11, 44, k * 8, 38);
    ctx.quadraticCurveTo(k * 6, 45, k * 1, 38);
    ctx.quadraticCurveTo(k * -2, 42, k * -4, 32);
    ctx.bezierCurveTo(k * -7, 20, k * -6, 0, 0, -12);
    ctx.closePath();
  };
  shape();
  fillStroke(ctx, back ? PALETTE.wingDark : PALETTE.wing);
  // Lighter feather tips and the lines between the plates.
  ctx.save();
  shape();
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(k * 7, 42, 20, 9, 0, 0, TAU);
  ctx.fillStyle = PALETTE.wingLight;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = PALETTE.wingDark;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  for (const [x1, y1, x2, y2] of [[4, 8, 8, 37], [0, 10, 1, 36]]) {
    ctx.beginPath();
    ctx.moveTo(k * x1, y1);
    ctx.quadraticCurveTo(k * (x1 + x2) * 0.6, (y1 + y2) * 0.55, k * x2, y2);
    ctx.stroke();
  }
  shape();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.restore();
}

// How much shorter a wing looks when it's brought forward, by pose.
const FORWARD = { hold: 0.72, hug: 0.78, grip: 0.68, sip: 0.66, paper: 0.7 };
const WING_LEN = 38; // shoulder to wing tip

// Holding an item (arms: 'item', from the holdItem / playItem states): a
// picture from the brain (pose.item = { img, w, h }) up in the hand on the
// left of the body, waved around as much as pose.itemWave (0..1) says.
function itemArm(p) {
  return 1.75 + (p.itemWave || 0) * (0.25 + Math.sin((p.t || 0) * 7) * 0.55);
}

/** The item in the hand at (x, y), turned with the arm (`a`); the hand covers its bottom. */
function drawItem(ctx, p, x, y, a) {
  const it = p.item;
  if (!it || !it.img) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((a - 1.75) * 0.8);
  ctx.drawImage(it.img, -it.w / 2, -it.h * 0.8, it.w, it.h);
  ctx.restore();
}

/** The angle of each wing for the current pose (see drawWing). */
function wingAngle(side, p) {
  const lead = side === p.facing;
  // Spread out from his sides, like the reference; drooping when he's sad,
  // sleepy or asleep.
  const rest = -side * (['sad', 'sleepy', 'closed'].includes(p.eyes) ? 0.1 : 0.42);
  switch (p.arms) {
    case 'up':
      return -side * (2.35 + Math.sin(p.t * 15 + side) * 0.2);
    case 'flail':
      return -side * (1.5 + Math.sin(p.t * 20 + side * 2) * 0.7);
    case 'wave':
      return lead ? -side * (2.4 + Math.sin(p.t * 11) * 0.45) : rest;
    case 'hold':
      // Across his belly (shy, holding something).
      return side * 1.0;
    case 'hug':
      // Wrapped around his middle, the tips meeting in front.
      return side * 1.15;
    case 'cheer':
      // Up in a V.
      return -side * (2.5 + Math.abs(Math.sin(p.t * 8)) * 0.25);
    case 'fists':
      return -side * (1.05 + Math.sin(p.t * 18) * 0.15);
    case 'stretch':
      return -side * (2.75 + Math.sin(p.t * 1.6) * 0.08);
    case 'shade':
      // The leading wing up over his goggles, shading his eyes.
      return lead ? side * 2.45 : rest;
    case 'sip':
      return side * 1.75;
    case 'grip':
      return side * 1.05;
    case 'item':
      return side < 0 ? itemArm(p) : rest;
    // His activities.
    case 'reach':
      // Trying to reach the key on top of his head (he can't quite).
      return lead ? -side * (2.85 + Math.sin(p.t * 6) * 0.12) : rest;
    case 'point':
      // Pointing up at his key: wind me?
      return lead ? -side * 2.7 : rest;
    case 'lens':
      // Holding the magnifying glass out at his side.
      return lead ? -side * 0.55 : rest;
    case 'paper':
      return side * 1.0;
    case 'hammer':
      // Raised, then tapping down on his contraption.
      return lead ? -side * (1.5 + Math.abs(Math.sin(p.t * 6)) * 1.0) : rest;
    case 'baton':
      return lead ? -side * (1.7 + Math.sin(p.t * 7) * 0.7) : -side * (1.2 + Math.sin(p.t * 7 + 1.5) * 0.3);
    default:
      return rest - side * Math.sin((p.walkPhase || 0) + (side > 0 ? 0 : Math.PI)) * (p.armSwing || 0) * 0.6;
  }
}

/** A small metal foot: a short leg and three toes (standing, or dangling when held). */
function drawFoot(ctx, side, p) {
  const dangle = p.feet === 'dangle';
  const step = !dangle && p.stepHeight ? Math.max(0, Math.sin((p.walkPhase || 0) + (side > 0 ? Math.PI : 0))) * p.stepHeight : 0;
  const x = side * 14;
  const y = dangle ? 8 : -step;
  ctx.save();
  ctx.lineCap = 'round';
  const line = (x1, y1, x2, y2, w) => {
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = w + 2.6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.metal;
    ctx.lineWidth = w;
    ctx.stroke();
  };
  line(x, CY + RY - 8, x, y - 3, 3);
  for (const a of [-0.55, 0, 0.55]) {
    if (dangle) line(x, y - 3, x + Math.sin(a) * 4, y + 5, 2.4);
    else line(x, y - 3, x + Math.sin(a) * 9, y - 3 + Math.cos(a) * 3, 2.4);
  }
  ctx.restore();
}

/** Sitting: just his toes peek out from under him. */
function drawSitToes(ctx, side) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const a of [-0.45, 0.1, 0.65]) {
    const x = side * 16;
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.lineTo(x + side * Math.sin(a) * 9, -2);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.metal;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * His tail: three feather plates fanned out behind him, low on his back.
 * From the front it only peeks out on the far side when he's turned.
 */
function drawTail(ctx, p, back) {
  const wag = p.tailSpin || 0;
  ctx.save();
  if (back) {
    ctx.translate(0, CY + 24);
  } else {
    // Peeking out behind him on the far side, pointing back.
    ctx.translate(-p.facing * (RX - 14), CY + 8);
    ctx.rotate(p.facing * 1.35);
    ctx.scale(0.8, 0.8);
  }
  for (const [a, len] of [[-0.8, 28], [0.8, 28], [0, 34]]) {
    ctx.save();
    ctx.rotate(a + wag);
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-8.5, len - 7);
    ctx.quadraticCurveTo(0, len + 5, 8.5, len - 7);
    ctx.lineTo(7, 0);
    ctx.closePath();
    fillStroke(ctx, a === 0 ? PALETTE.wing : PALETTE.wingDark, 2);
    ctx.restore();
  }
  ctx.restore();
}

function bodyPath(ctx) {
  ellipse(ctx, 0, CY, RX, RY);
}

function drawBody(ctx, p, back) {
  bodyPath(ctx);
  fillStroke(ctx, PALETTE.body, 2.4);
  ctx.save();
  bodyPath(ctx);
  ctx.clip();
  const fx = back ? 0 : p.facing * p.turn * 7;
  if (!back) {
    // Muted yellow belly.
    ellipse(ctx, fx, CY + 22, 29, 25);
    ctx.fillStyle = PALETTE.belly;
    ctx.fill();
  } else {
    // A panel seam and rivets: he's a machine underneath.
    ctx.strokeStyle = PALETTE.bodyShade;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, CY - 2, 30, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    ctx.fillStyle = PALETTE.metalDark;
    for (const [x, y] of [[-22, 12], [22, 12], [-12, 24], [12, 24]]) {
      ellipse(ctx, x, CY + y, 1.8, 1.8);
      ctx.fill();
    }
  }
  // Soft shading low on the body.
  ellipse(ctx, 0, CY + RY + 4, RX + 6, 20);
  ctx.fillStyle = PALETTE.bodyShade;
  ctx.globalAlpha = 0.45;
  ctx.fill();
  ctx.restore();
}

/** One eye inside its goggle ring; `side` -1 left, 1 right. */
function drawEye(ctx, x, y, side, p) {
  // Goggle ring (always there, like glasses).
  ellipse(ctx, x, y, 14.5, 14.5);
  fillStroke(ctx, PALETTE.white, 2);
  const eyes = p.blink ? 'closed' : p.eyes;
  const line = (draw) => {
    ctx.strokeStyle = PALETTE.eye;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    draw();
    ctx.stroke();
  };
  if (eyes === 'closed') {
    line(() => {
      ctx.moveTo(x - 6.5, y + 1);
      ctx.lineTo(x + 6.5, y + 1);
    });
  } else if (eyes === 'happy') {
    line(() => ctx.arc(x, y + 4, 6.5, Math.PI * 1.15, Math.PI * 1.85));
  } else if (eyes === 'content') {
    line(() => ctx.arc(x, y - 3, 6.5, Math.PI * 0.2, Math.PI * 0.8));
  } else if (eyes === 'squint') {
    // > < : tight shut.
    line(() => {
      ctx.moveTo(x - side * 5, y - 5);
      ctx.lineTo(x + side * 4, y);
      ctx.lineTo(x - side * 5, y + 5);
    });
  } else {
    const r = eyes === 'small' ? 3.2 : eyes === 'wide' ? 4.8 : 6.2;
    const down = eyes === 'sad' || eyes === 'meh' || eyes === 'sleepy' ? 2 : 0;
    const px = x + (p.lookX || 0) * 3.5;
    const py = y + (p.lookY || 0) * 3.5 + down;
    ellipse(ctx, px, py, r, eyes === 'small' || eyes === 'wide' ? r : r * 1.13);
    ctx.fillStyle = PALETTE.eye;
    ctx.fill();
    ellipse(ctx, px - r * 0.32, py - r * 0.4, Math.max(1.2, r * 0.32), Math.max(1.2, r * 0.32));
    ctx.fillStyle = PALETTE.white;
    ctx.fill();
    if (eyes === 'wide') {
      ellipse(ctx, px + 1.8, py + 1.6, 0.9, 0.9);
      ctx.fill();
    }
    // Eyelids: a slanted or flat lid inside the goggle.
    const lid = {
      sad: [y - 11, y - 3], // [inner edge, outer edge]: inner corner up
      angry: [y - 3, y - 11], // inner corner down
      meh: [y - 1, y - 1],
      sleepy: [y + 1.5, y + 1.5],
    }[eyes];
    if (lid) {
      const inner = x - side * 13;
      const outer = x + side * 13;
      ctx.save();
      ellipse(ctx, x, y, 13.2, 13.2);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(inner, y - 16);
      ctx.lineTo(outer, y - 16);
      ctx.lineTo(outer, lid[1]);
      ctx.lineTo(inner, lid[0]);
      ctx.closePath();
      ctx.fillStyle = PALETTE.lid;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(outer, lid[1]);
      ctx.lineTo(inner, lid[0]);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = PALETTE.eye;
      ctx.stroke();
      ctx.restore();
    }
  }
  // The goggle ring on top.
  ctx.lineWidth = 4;
  ctx.strokeStyle = PALETTE.goggle;
  ellipse(ctx, x, y, 12.5, 12.5);
  ctx.stroke();
}

/** His beak: an orange diamond, open when he talks, yawns or is surprised. */
function drawBeak(ctx, x, y, p) {
  let open = 0;
  if (p.mouth === 'talk') open = Math.abs(Math.sin(p.t * 14)) * 5;
  else if (p.mouth === 'chew') open = Math.abs(Math.sin(p.t * 9)) * 3;
  else if (p.mouth === 'open' || p.mouth === 'o') open = 5;
  else if (p.mouth === 'yawn') open = 9;
  // A frown tips the corners down a little.
  const droop = p.mouth === 'frown' || p.mouth === 'growl' ? 2 : 0;
  // Lower half first, the upper half over it.
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 1 + droop);
  ctx.quadraticCurveTo(x, y + 11 + open * 1.5, x + 10, y + 1 + droop);
  ctx.closePath();
  fillStroke(ctx, PALETTE.beakDark, 2);
  ctx.beginPath();
  ctx.moveTo(x - 12, y + droop);
  ctx.quadraticCurveTo(x, y - 11, x + 12, y + droop);
  ctx.quadraticCurveTo(x, y + 6 - open * 0.3, x - 12, y + droop);
  ctx.closePath();
  fillStroke(ctx, PALETTE.beak, 2);
}

function drawFace(ctx, p) {
  const fx = p.facing * p.turn * 7;
  const near = p.turn * 0.18; // the eye further away looks a touch smaller
  ctx.save();
  ctx.translate(fx, 0);
  for (const side of [-1, 1]) {
    const far = side === -p.facing ? 1 - near : 1;
    ctx.save();
    ctx.translate(side * EYE_X, FACE_Y);
    ctx.scale(far, 1);
    drawEye(ctx, 0, 0, side, p);
    ctx.restore();
  }
  if (p.blush > 0.01) {
    ctx.fillStyle = PALETTE.cheek + (0.3 + 0.45 * p.blush) + ')';
    for (const side of [-1, 1]) {
      ellipse(ctx, side * 27, FACE_Y + 15, 5.5, 3);
      ctx.fill();
    }
  }
  drawBeak(ctx, p.facing * p.turn * 2, FACE_Y + 15, p);
  ctx.restore();
}

// --------------------------------------------------------------- props

/** A glass of water (water nudges), level 0..1, tilted when he sips. */
function drawGlass(ctx, x, y, level, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-10, -16);
    ctx.lineTo(10, -16);
    ctx.lineTo(7.5, 11);
    ctx.quadraticCurveTo(0, 13.5, -7.5, 11);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = 'rgba(225, 243, 252, 0.85)';
  ctx.fill();
  if (level > 0.02) {
    ctx.save();
    path();
    ctx.clip();
    const wy = 11 - 27 * Math.min(1, level);
    ctx.fillStyle = '#8fcdf0';
    ctx.fillRect(-12, wy, 24, 14 - wy + 3);
    ctx.restore();
  }
  path();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.restore();
}

/** A small brass gear: what he plays fetch with (and carries back, sometimes). */
function drawGear(ctx, x, y, rot, r = 11) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  const teeth = 8;
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * TAU;
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a1 = a - TAU / (teeth * 4) * 0.8;
    const a2 = a + TAU / (teeth * 4) * 0.8;
    ctx.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
    ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
  }
  ctx.closePath();
  fillStroke(ctx, PALETTE.key, Math.max(1.5, r * 0.14));
  ellipse(ctx, 0, 0, r * 0.32, r * 0.32);
  ctx.fillStyle = PALETTE.keyDark;
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, r * 0.12);
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.restore();
}

/** Where wing `side`'s tip is (after the pose's wing angle), and its angle. */
function wingTip(side, p) {
  const forward = FORWARD[p.arms];
  const a = wingAngle(side, p);
  const len = WING_LEN * (forward || 1);
  return { x: side * (RX - 6) - Math.sin(a) * len, y: CY - 6 + (forward ? 10 : 0) + Math.cos(a) * len, a };
}

/**
 * Investigating: the big magnifying glass he holds out at his side, at body
 * height, looking through it (like the reference).
 */
function drawInvestigation(ctx, p) {
  const side = p.facing;
  const tip = wingTip(side, p);
  const lx = side * 60;
  const ly = CY + 2;
  const r = 17;
  const RIM = '#8a5a2b';
  ctx.save();
  // Handle from his wing tip up to the lens.
  ctx.lineCap = 'round';
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(lx - side * r * 0.55, ly + r * 0.8);
  ctx.stroke();
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 4.6;
  ctx.stroke();
  // Lens with a brown rim.
  ellipse(ctx, lx, ly, r, r);
  ctx.fillStyle = 'rgba(205, 232, 248, 0.9)';
  ctx.fill();
  ellipse(ctx, lx, ly, r, r);
  ctx.lineWidth = 5;
  ctx.strokeStyle = RIM;
  ctx.stroke();
  ellipse(ctx, lx, ly, r + 2.6, r + 2.6);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ellipse(ctx, lx, ly, r - 2.6, r - 2.6);
  ctx.stroke();
  // Glints.
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(lx, ly, r - 6, Math.PI * 1.08, Math.PI * 1.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(lx, ly, r - 6, Math.PI * 1.55, Math.PI * 1.62);
  ctx.stroke();
  ctx.restore();
}

/** A newspaper much too big for him; `lowered` 0..1 brings it down so he can look over it. */
function drawNewspaper(ctx, p, lowered) {
  const fx = p.facing * p.turn * 7;
  const x = fx - 30;
  const y = CY - 4 + lowered * 18;
  const w = 60;
  const h = 40;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  fillStroke(ctx, '#f3f1ea', 2);
  // Fold, headline and columns of text.
  ctx.strokeStyle = '#c9c4b5';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 2);
  ctx.lineTo(x + w / 2, y + h - 2);
  ctx.stroke();
  ctx.fillStyle = '#3b3a40';
  ctx.fillRect(x + 4, y + 4, w / 2 - 8, 4);
  ctx.fillRect(x + w / 2 + 4, y + 4, w / 2 - 8, 4);
  ctx.fillStyle = '#9a968a';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + 4, y + 12 + i * 5, w / 2 - 8 - (i % 2) * 5, 1.6);
    ctx.fillRect(x + w / 2 + 4, y + 12 + i * 5, w / 2 - 10 + (i % 2) * 3, 1.6);
  }
  ctx.restore();
}

/** A puzzle cube in his wings; `solved` 0..1 (scrambled until 1). */
function drawCube(ctx, p, solved, t) {
  const fx = p.facing * p.turn * 7;
  const x = fx;
  const y = CY + 18;
  const sz = 21; // one face's half size
  const COLORS = ['#e8453c', '#2f7fd8', '#f2c84b', '#4cae4f', '#f28c28', '#ffffff'];
  // Scrambled colours change as he turns it; solved: one colour per face.
  const seed = Math.floor(t * 9);
  const color = (face, i) => (solved >= 1 ? COLORS[face] : COLORS[(face * 7 + i * 3 + seed * (i + 1)) % 6]);
  const faces = [
    // [face index, corner points]
    [2, [[0, -sz], [sz, -sz / 2], [0, 0], [-sz, -sz / 2]]], // top
    [0, [[-sz, -sz / 2], [0, 0], [0, sz], [-sz, sz / 2]]], // left
    [1, [[0, 0], [sz, -sz / 2], [sz, sz / 2], [0, sz]]], // right
  ];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(solved >= 1 ? 0 : Math.sin(t * 10) * 0.15);
  for (const [face, pts] of faces) {
    const [a, b, , d] = pts;
    // 3×3 stickers on each face.
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const u = (k) => a[k] + ((b[k] - a[k]) * i) / 3 + ((d[k] - a[k]) * j) / 3;
        const du = (k) => (b[k] - a[k]) / 3;
        const dv = (k) => (d[k] - a[k]) / 3;
        ctx.beginPath();
        ctx.moveTo(u(0), u(1));
        ctx.lineTo(u(0) + du(0), u(1) + du(1));
        ctx.lineTo(u(0) + du(0) + dv(0), u(1) + du(1) + dv(1));
        ctx.lineTo(u(0) + dv(0), u(1) + dv(1));
        ctx.closePath();
        ctx.fillStyle = color(face, i * 3 + j);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = PALETTE.outline;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** A wooden crate, its bottom centre at (x, y). */
function drawCrate(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h, w, h, 2);
  fillStroke(ctx, '#c8783a', 2);
  ctx.strokeStyle = '#9a5626';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 2, y - h / 2);
  ctx.lineTo(x + w / 2 - 2, y - h / 2);
  ctx.moveTo(x - w / 2 + 3, y - h + 3);
  ctx.lineTo(x + w / 2 - 3, y - 3);
  ctx.stroke();
}

/**
 * Building: wooden crates beside him with his contraption on top (a gear on
 * a post, then a light), sparks while he works. `progress` 0..1 (parts
 * appear as he builds); `smoke` when it doesn't work.
 */
function drawWorkshop(ctx, p, progress, smoke, t) {
  const side = p.facing;
  ctx.save();
  const cx = side * 46;
  drawCrate(ctx, cx + side * 16, 0, 22, 18);
  drawCrate(ctx, cx - side * 4, 0, 28, 26);
  const top = -26;
  ctx.beginPath();
  ctx.roundRect(cx - 12, top - 9, 22, 9, 2);
  fillStroke(ctx, PALETTE.metal, 1.8);
  if (progress > 0.35) {
    ctx.beginPath();
    ctx.roundRect(cx - 2.5, top - 20, 5, 12, 1);
    fillStroke(ctx, PALETTE.metalDark, 1.6);
  }
  if (progress > 0.6) {
    // Spins when it works.
    drawGear(ctx, cx, top - 23, !smoke && progress >= 1 ? t * 6 : 0, 9);
  }
  if (progress > 0.85) {
    ellipse(ctx, cx + side * 7, top - 4.5, 2.6, 2.6);
    ctx.fillStyle = smoke && progress >= 1 ? '#555' : '#7fe0ff';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = PALETTE.outline;
    ctx.stroke();
  }
  // Sparks while he works on it.
  if (progress < 1) {
    for (let i = 0; i < 4; i++) {
      const k = (t * 3 + i / 4) % 1;
      ctx.fillStyle = `rgba(255, 196, 40, ${1 - k})`;
      ellipse(ctx, cx - side * 8 + Math.cos(i * 1.7) * k * 18, top - 10 - Math.abs(Math.sin(i * 1.7)) * k * 18, 1.9, 1.9);
      ctx.fill();
    }
  }
  // It didn't work: smoke.
  if (smoke && progress >= 1) {
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.8 + i / 4) % 1;
      ellipse(ctx, cx + Math.sin(k * 6 + i) * 4, top - 30 - k * 26, 4 + k * 6, 4 + k * 6);
      ctx.fillStyle = `rgba(110, 110, 120, ${0.55 * (1 - k)})`;
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The hammer in his leading wing tip. */
function drawHammer(ctx, p) {
  const tip = wingTip(p.facing, p);
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(tip.a);
  ctx.beginPath();
  ctx.roundRect(-2, -2, 4, 18, 1.5);
  fillStroke(ctx, '#8a5a2b', 1.6);
  ctx.beginPath();
  ctx.roundRect(-7.5, 14, 15, 7.5, 2);
  fillStroke(ctx, PALETTE.metalDark, 1.6);
  ctx.restore();
}

/** A conductor's baton in his leading wing tip. */
function drawBaton(ctx, p) {
  const tip = wingTip(p.facing, p);
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(tip.a);
  ctx.lineCap = 'round';
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(0, 30);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.white;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  // Grip.
  ctx.beginPath();
  ctx.roundRect(-3, -4, 6, 9, 2);
  fillStroke(ctx, '#8a5a2b', 1.6);
  ctx.restore();
}

// --------------------------------------------------------------- whole bird

/**
 * Draw Pip.
 * @param {CanvasRenderingContext2D} ctx already translated so (0,0) = feet
 * @param {object} p pose, see `defaultPose`
 */
function drawCharacter(ctx, p) {
  // Asleep ("lying" for others): sitting low, eyes shut, wings folded.
  if (p.view === 'lying') p = { ...p, view: 'front', feet: 'sit', arms: 'down', eyes: 'closed', mouth: 'smallSmile', scaleY: p.scaleY * 0.94, scaleX: p.scaleX * 1.03, turn: 0 };
  // Happy: his key and tail spin.
  const happy = p.eyes === 'happy' || p.arms === 'cheer';
  if (happy && !p.keySpin) p = { ...p, keySpin: p.t * 9, tailSpin: Math.sin(p.t * 14) * 0.15 };
  ctx.save();
  ctx.rotate(p.tilt);
  ctx.translate(0, p.bob);
  ctx.scale(p.scaleX, p.scaleY);
  const back = p.view === 'back';
  const sitting = p.feet === 'sit';
  if (sitting) ctx.translate(0, SIT_DROP);

  if (!back && p.turn > 0.3) drawTail(ctx, p, back);
  if (!sitting) {
    drawFoot(ctx, -1, p);
    drawFoot(ctx, 1, p);
  }
  drawKey(ctx, p);
  if (back) {
    drawWing(ctx, -1, p, back);
    drawWing(ctx, 1, p, back);
  }
  drawBody(ctx, p, back);
  if (back) {
    drawTail(ctx, p, back);
    if (sitting) {
      drawSitToes(ctx, -1);
      drawSitToes(ctx, 1);
    }
  } else {
    if (sitting) {
      drawSitToes(ctx, -1);
      drawSitToes(ctx, 1);
    }
    drawFace(ctx, p);
    const fx = p.facing * p.turn * 7;
    if (p.prop === 'glass') {
      const lift = p.glassLift || 0;
      drawGlass(ctx, fx + p.facing * 6 * lift, CY + 14 - (CY + 14 - (FACE_Y + 22)) * lift, p.propProgress, -p.facing * 0.5 * lift);
    }
    if (p.prop === 'gear') drawGear(ctx, fx, CY + 16, 0, 12);
    if (p.prop === 'newspaper') drawNewspaper(ctx, p, p.propProgress);
    if (p.prop === 'cube') drawCube(ctx, p, p.propProgress, p.t);
    if (p.prop === 'workshop') {
      // In front of him, on the floor (which is lower while he sits).
      ctx.save();
      if (sitting) ctx.translate(0, -SIT_DROP);
      drawWorkshop(ctx, p, p.propProgress, p.variant === 'smoke', p.t);
      ctx.restore();
    }
    if (p.arms === 'item') {
      const tip = wingTip(-1, p);
      drawItem(ctx, p, tip.x, tip.y, tip.a);
    }
    drawWing(ctx, -1, p, back);
    drawWing(ctx, 1, p, back);
    if (p.prop === 'workshop' && p.arms === 'hammer') drawHammer(ctx, p);
    if (p.prop === 'baton') drawBaton(ctx, p);
    if (p.prop === 'magnifier') drawInvestigation(ctx, p);
    if (p.prop === 'rating') drawRating(ctx, p, '3/10');
  }
  ctx.restore();
}

function defaultPose() {
  return {
    t: 0,
    facing: 1,
    turn: 0,
    tilt: 0,
    bob: 0,
    scaleX: 1,
    scaleY: 1,
    walkPhase: 0,
    stepHeight: 0,
    armSwing: 0,
    view: 'front',
    feet: 'stand',
    arms: 'down',
    eyes: 'open',
    mouth: 'smile',
    blink: 0,
    lookX: 0,
    lookY: 0,
    blush: 0.3,
    prop: null,
    keySpin: 0,
    tailSpin: 0,
    item: null, // what's in the hand for arms 'item': { img, w, h } (see itemArm)
    itemWave: 0,
  };
}

// --------------------------------------------------------------- his activities

// How his own activities look, called by computePose in
// src/renderer/renderer.js with the pose so far (`p`), the frame from the
// main process (`f`, with `variant` for activities that can turn out more
// than one way) and a kit: { t, st, duration, dt, clamp, walkCycle, overlay }.
const ACTIVITY_POSES = {
  // Winding himself (fixes hunger): reaching for his key; he gets it, or
  // gives up and looks at you.
  wind(p, f, k) {
    const u = k.st / k.duration;
    p.feet = 'sit';
    if (f.variant === 'gotIt' && u > 0.7) {
      p.arms = 'cheer';
      p.eyes = 'happy';
      p.mouth = 'open';
      p.keySpin = k.t * 16;
      p.blush = 0.8;
    } else if (f.variant === 'gaveUp' && u > 0.78) {
      p.eyes = 'meh';
      p.mouth = 'flat';
    } else {
      p.arms = 'reach';
      p.eyes = 'open';
      p.mouth = 'flat';
      p.lookX = f.facing * 0.3;
      p.lookY = -0.9;
      p.tilt = -f.facing * 0.08 + Math.sin(k.t * 6) * 0.03;
    }
  },
  // Gave up: pointing at his key, looking at you. Click him to wind him.
  windAsk(p, f, k) {
    p.feet = 'sit';
    p.arms = 'point';
    p.eyes = 'open';
    p.mouth = 'smallSmile';
    k.overlay('question');
  },
  // Investigating: looking through his big magnifying glass, held out at
  // his side; now and then he leans back: "Hm."
  investigate(p, f, k) {
    const hm = Math.sin(k.st * 1.3) > 0.85;
    p.arms = 'lens';
    p.prop = 'magnifier';
    p.eyes = hm ? 'meh' : 'wide';
    p.mouth = hm ? 'flat' : 'o';
    p.lookX = f.facing;
    p.lookY = 0.1;
    p.tilt = f.facing * (hm ? -0.03 : 0.08);
  },
  // Reading a newspaper much too big for him, until something makes him look at you.
  newspaper(p, f, k) {
    const u = k.st / k.duration;
    p.feet = 'sit';
    p.arms = 'paper';
    p.prop = 'newspaper';
    if (u < 0.72) {
      p.propProgress = 0;
      p.eyes = 'open';
      p.lookX = Math.sin(k.t * 2.2) * 0.8;
      p.lookY = 0.7;
    } else {
      p.propProgress = 1;
      p.eyes = 'wide';
      p.mouth = 'o';
    }
  },
  // Solving a puzzle cube very fast, then a smug look.
  cube(p, f, k) {
    const u = k.st / k.duration;
    p.feet = 'sit';
    p.arms = 'grip';
    p.prop = 'cube';
    if (u < 0.8) {
      p.propProgress = u / 0.8;
      p.eyes = 'open';
      p.mouth = 'flat';
      p.lookX = Math.sin(k.t * 14) * 0.6;
      p.lookY = 0.8;
    } else {
      p.propProgress = 1;
      p.eyes = 'meh';
      p.mouth = 'smile';
      p.tilt = f.facing * 0.08;
      p.blush = 0.5;
    }
  },
  // Building his contraption with a hammer; sometimes it works (the gear
  // spins), sometimes it smokes.
  build(p, f, k) {
    const u = k.st / k.duration;
    p.feet = 'sit';
    p.prop = 'workshop';
    p.variant = f.variant;
    p.propProgress = Math.min(1, u / 0.82);
    p.lookX = f.facing * 0.8;
    p.lookY = 0.9;
    if (u < 0.82) {
      p.arms = 'hammer';
      p.eyes = 'open';
      p.mouth = 'flat';
      p.tilt = f.facing * 0.06;
    } else if (f.variant === 'smoke') {
      p.arms = 'hold';
      p.eyes = 'squint';
      p.mouth = 'wavy';
    } else {
      p.arms = 'cheer';
      p.eyes = 'happy';
      p.mouth = 'open';
    }
  },
  // After a throw: checks himself over, then his key. ("That was unnecessary.")
  checkSelf(p, f, k) {
    const u = k.st / k.duration;
    p.eyes = 'meh';
    p.mouth = 'flat';
    if (u < 0.6) {
      // Looking himself over, one side then the other.
      p.lookX = Math.sin(k.st * 4) * 0.9;
      p.lookY = 0.9;
      p.tilt = Math.sin(k.st * 4) * 0.06;
      p.arms = 'hold';
    } else {
      // Checking his key, then looking at you.
      p.lookY = u < 0.8 ? -1 : 0;
      p.lookX = 0;
      p.keySpin = u < 0.8 ? (u - 0.6) * 12 : 0;
    }
  },
  // Conducting the music you're playing.
  conduct(p, f, k) {
    p.arms = 'baton';
    p.prop = 'baton';
    p.eyes = 'content';
    p.mouth = 'smallSmile';
    p.bob = -Math.abs(Math.sin(k.t * 3.5)) * 2;
    p.tilt = Math.sin(k.t * 3.5) * 0.05;
    k.overlay('notes');
  },
};

/**
 * His own take on shared states: when he's happy he does a tiny victory
 * flight (up off the floor, flapping, key spinning).
 */
function restyle(state, p, f, k) {
  if (state === 'happy') {
    p.bob = -16 - Math.sin(k.t * 9) * 4;
    p.arms = 'flail';
    p.feet = 'dangle';
  }
}

/**
 * Watching something with you, his reaction to a moment (Phase 9): a tiny
 * cinema critic. Sitting with his back to you; leans in when it's exciting,
 * turns round with a "3/10" card when it's boring.
 */
function watchPose(mood, p, f, k) {
  p.feet = 'sit';
  switch (mood) {
    case 'exciting':
      p.view = 'back';
      p.scaleY *= 1.04;
      p.bob = -Math.abs(Math.sin(k.t * 9)) * 2.5;
      p.keySpin = k.t * 10;
      break;
    case 'funny':
      p.view = 'back';
      p.tilt = Math.sin(k.t * 14) * 0.07;
      p.tailSpin = Math.sin(k.t * 14) * 0.2;
      break;
    case 'beautiful':
      p.view = 'back';
      p.tilt = Math.sin(k.t * 1.5) * 0.04;
      break;
    case 'sad':
      p.eyes = 'sad';
      p.mouth = 'frown';
      p.lookY = 0.4;
      break;
    case 'scary':
      p.eyes = 'wide';
      p.mouth = 'o';
      p.arms = 'hug';
      p.tilt = Math.sin(k.t * 30) * 0.02;
      k.overlay('sweat');
      break;
    case 'boring':
      // Turns round and rates it.
      p.eyes = 'meh';
      p.mouth = 'flat';
      p.arms = 'point';
      p.prop = 'rating';
      break;
    default:
      p.view = 'back';
  }
}

/** A little rating card held up in his leading wing. */
function drawRating(ctx, p, text) {
  const tip = wingTip(p.facing, p);
  ctx.save();
  ctx.translate(tip.x, tip.y - 14);
  ctx.beginPath();
  ctx.roundRect(-15, -11, 30, 20, 3);
  fillStroke(ctx, PALETTE.white, 1.8);
  ctx.fillStyle = PALETTE.outline;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -1);
  ctx.restore();
}

/** Musical notes floating by his head while he conducts. */
function drawNotes(ctx, x, y, clock) {
  ctx.save();
  ctx.fillStyle = PALETTE.outline;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < 2; i++) {
    const k = (clock * 0.6 + i * 0.5) % 1;
    ctx.globalAlpha = Math.sin(k * Math.PI);
    ctx.fillText(i ? '♫' : '♪', x + i * 10 + Math.sin(k * 6) * 3, y + 8 - k * 26);
  }
  ctx.restore();
}

window.Characters = window.Characters || {};
window.Characters.pip = Object.assign(window.Characters.pip || {}, {
  draw: drawCharacter,
  defaultPose,
  BODY_CY: CY,
  HEAD_TOP: CY - RY - 26,
  turned: { investigate: 0.7, build: 0.6 },
  activityPose: ACTIVITY_POSES,
  watchPose,
  restyle,
  overlays: { notes: drawNotes },
  // What he holds while carrying the fetch gear back to you.
  heldProp: 'gear',
  drawFetchItem: drawGear,
});
})();
