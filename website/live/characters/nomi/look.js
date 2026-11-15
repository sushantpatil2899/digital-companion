// Nomi's looks: a little floating dream cloud, drawn in code.
// Everything is drawn relative to the point on the floor below it at (0, 0);
// up is negative y. It never touches the floor: it hovers above it.
// Registers itself as window.Characters.nomi (see src/characters/README.md).
// Draft for Sushant's approval (Phase 9, step 4): front, 3/4 and back first.
(function () {
'use strict';

const PALETTE = {
  outline: '#8fb1e2', // soft light-blue outlines, like the reference
  cloudTop: '#fffaee', // creamy white on top
  cloudMid: '#f8f5ea',
  cloudBottom: '#d9e6f7', // pale blue underneath
  backTop: '#e6f0fc',
  backBottom: '#bcd3f1',
  swirl: '#a3bfe8',
  eye: '#1f3463',
  white: '#ffffff',
  cheek: 'rgba(250, 175, 178, ',
  moonLight: '#fff1a1',
  moon: '#f9d75b',
  moonDeep: '#eab53e',
  moonEdge: '#dda53a',
  star: '#f6cf4a',
};

// Its shape, measured from Sushant's reference (pixels there × K = units
// here, centred on the head): a wide cloud head with big puffs, long puffy
// cheeks low on each side and a flatter scalloped bottom; a small trunk
// under it with one leg out to the side and one hanging down.
const K = 0.141;
const HCY = -84; // centre of the cloud head
const at = (x, y) => [(x - 400) * K, HCY + (y - 380) * K];
const HEAD = [
  // [x, y, rx, ry?, tilt?] in reference pixels
  [300, 235, 112], [470, 220, 108], // top
  [190, 335, 96], [235, 560, 82], // left side
  [118, 478, 122, 90, 0.16], // the long left cheek, its tip rising a little
  [360, 585, 76], [480, 580, 76], [590, 545, 80], // the flatter bottom
  [640, 330, 92], // right side
  [680, 450, 116, 86, -0.16], // the long right cheek
  [400, 400, 205], // the middle
].map(([x, y, rx, ry = rx, tilt = 0]) => [...at(x, y), rx * K, ry * K, tilt]);
const HEAD_TOP_Y = Math.min(...HEAD.map(([, y, , ry]) => y - ry));
const RX = 48; // about half the head's width
const RY = 39; // about half its height
const CY = HCY;
const FACE_Y = HCY + 11; // eye line: low on the head, like the reference
const EYE_X = 16;
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

function drawStar(ctx, x, y, r, fill = PALETTE.star) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = PALETTE.moonEdge;
  ctx.stroke();
}

// --------------------------------------------------------------- parts

// From the back it's rounder: even puffs all round.
const BACK = Array.from({ length: 11 }, (_, i) => {
  const a = (i / 11) * TAU - Math.PI / 2;
  const r = i % 2 ? 15 : 17;
  return [Math.cos(a) * 33, HCY + 2 + Math.sin(a) * 30, r, r, 0];
}).concat([[0, HCY + 2, 34, 34, 0]]);

/** A union of circles with one soft outline: each stroked thick, then all filled on top. */
function puffs(ctx, list, fill, lineWidth = 2.2) {
  ctx.save();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = lineWidth * 2;
  for (const [x, y, rx, ry = rx, tilt = 0] of list) {
    ellipse(ctx, x, y, rx, ry, tilt);
    ctx.stroke();
  }
  ctx.fillStyle = fill;
  for (const [x, y, rx, ry = rx, tilt = 0] of list) {
    ellipse(ctx, x, y, rx, ry, tilt);
    ctx.fill();
  }
  ctx.restore();
}

/** Its cloud head: creamy on top, pale blue underneath, with soft shading on the lower puffs. */
function drawCloud(ctx, back, p = {}) {
  const list = back ? BACK : HEAD;
  const top = back ? HCY - 50 : HEAD_TOP_Y;
  const g = ctx.createLinearGradient(0, top, 0, HCY + 42);
  if (back) {
    g.addColorStop(0, PALETTE.backTop);
    g.addColorStop(0.5, PALETTE.backTop);
    g.addColorStop(1, PALETTE.backBottom);
  } else {
    g.addColorStop(0, PALETTE.cloudTop);
    g.addColorStop(0.6, PALETTE.cloudMid);
    g.addColorStop(1, PALETTE.cloudBottom);
  }
  puffs(ctx, list, g);
  // Shade under each of the lower puffs (a little blue where they curve away).
  ctx.save();
  ctx.beginPath();
  for (const [x, y, rx, ry, tilt] of list) {
    ctx.moveTo(x + rx * Math.cos(tilt), y + rx * Math.sin(tilt));
    ctx.ellipse(x, y, rx, ry, tilt, 0, TAU);
  }
  ctx.clip();
  // Only along the bottom edge: a darker rim just inside each low puff.
  ctx.lineWidth = 6;
  ctx.strokeStyle = back ? 'rgba(140,170,225,0.35)' : 'rgba(170,198,240,0.45)';
  for (const [x, y, rx, ry, tilt] of list) {
    if (y < HCY + 8 || rx > 25) continue;
    ctx.beginPath();
    ctx.ellipse(x, y, rx - 2, ry - 2, tilt, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  // Stormy (after a throw) or a little darker (sad): grey-blue over the cloud.
  const dark = Math.max(p.stormy || 0, (p.gloom || 0) * 0.3);
  if (dark) {
    ctx.fillStyle = `rgba(95, 108, 140, ${0.42 * dark})`;
    ctx.fillRect(-80, top - 10, 160, 120);
  }
  // A few soft highlights on top.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const shine = back ? [[-18, HCY - 30, 4.5, 4.5], [-27, HCY - 4, 2, 2]] : [[-16, HCY - 26, 6, 3.2], [-34, HCY - 8, 3, 2]];
  for (const [x, y, rx, ry] of shine) {
    ellipse(ctx, x, y, rx, ry, -0.4);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * One soft leg from `from` towards `to`: wide where it joins the body,
 * narrowing a little, ending in a round foot (not a tube).
 */
function legPath(ctx, from, to, base, foot) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const a = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, -base);
  ctx.bezierCurveTo(len * 0.45, -base * 0.9, len - foot * 1.2, -foot * 0.8, len - foot * 0.2, -foot);
  ctx.arc(len - foot * 0.2, 0, foot, -Math.PI / 2, Math.PI / 2);
  ctx.bezierCurveTo(len - foot * 1.2, foot * 0.8, len * 0.45, base * 0.95, 0, base);
  ctx.closePath();
  ctx.restore();
}

/**
 * Below the cloud: a small fluffy body (a few little puffs), with two soft
 * legs attached to it, one out to the side and one hanging down; they
 * swing gently.
 */
function drawBody(ctx, p) {
  const t = p.t || 0;
  const g = ctx.createLinearGradient(0, HCY + 30, 0, HCY + 72);
  g.addColorStop(0, PALETTE.cloudTop);
  g.addColorStop(1, PALETTE.cloudBottom);
  const sideSwing = Math.sin(t * 2) * 1.5;
  const downSwing = Math.sin(t * 2 + 1.6) * 1.3;
  const f = p.facing || 1;
  let ends;
  if (p.feet === 'tuck') {
    // Flying: legs tucked in under her fluffy body.
    puffs(ctx, [[-8, HCY + 41, 10.5], [8, HCY + 42, 10], [0, HCY + 46, 10.5], [0, HCY + 37, 12]], g);
    return;
  }
  if (p.feet === 'dangle') ends = [[-8, HCY + 67 + sideSwing], [8, HCY + 67 + downSwing]]; // both hanging
  else if (p.feet === 'sit') ends = [[-15, HCY + 60], [15, HCY + 60]]; // tucked up, settled
  else if (p.stepHeight) {
    // Drifting along: both legs trail behind, kicking a little.
    const k = Math.sin(p.walkPhase || 0) * 3;
    ends = [[-f * 20 - 4 + k, HCY + 61], [-f * 14 + 6 - k, HCY + 65]];
  } else ends = [[-26 + sideSwing, HCY + 54 + sideSwing * 0.6], [10 + downSwing, HCY + 67]];
  const legs = [
    [[-8, HCY + 47], ends[0], 8.2, 7.6],
    [[7, HCY + 50], ends[1], 8.2, 7.8],
  ];
  for (const [from, to, base, foot] of legs) {
    legPath(ctx, from, to, base, foot);
    fillStroke(ctx, g, 2.2);
  }
  // The fluffy body on top of where the legs join.
  puffs(ctx, [[-8, HCY + 41, 10.5], [8, HCY + 42, 10], [0, HCY + 47, 10.5], [0, HCY + 37, 12]], g);
}

/** The swirl on its back. */
function drawSwirl(ctx) {
  ctx.save();
  ctx.strokeStyle = PALETTE.swirl;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const a = i * 0.2;
    const r = 1.5 + i * 0.33;
    const x = 2 + Math.cos(a) * r;
    const y = HCY + 4 + Math.sin(a) * r * 0.9;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // The little bump of an arm tucked in, low on one side.
  ctx.beginPath();
  ctx.arc(-17, HCY + 20, 7, Math.PI * 1.35, Math.PI * 0.35);
  ctx.stroke();
  ctx.restore();
}

/** A crescent: a circle of radius r1 with a circle of radius r2 at (cx, cy) taken out of it. */
function crescent(ctx, r1, cx, cy, r2) {
  const d = Math.hypot(cx, cy);
  const phi = Math.atan2(cy, cx);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d); // from the centre to where the circles cross
  const alpha = Math.acos(Math.min(1, a / r1));
  const p1 = { x: r1 * Math.cos(phi + alpha), y: r1 * Math.sin(phi + alpha) };
  const p2 = { x: r1 * Math.cos(phi - alpha), y: r1 * Math.sin(phi - alpha) };
  ctx.beginPath();
  // The outer edge, the long way round, then back along the inner circle.
  ctx.arc(0, 0, r1, phi + alpha, phi - alpha + TAU);
  ctx.arc(cx, cy, r2, Math.atan2(p2.y - cy, p2.x - cx), Math.atan2(p1.y - cy, p1.x - cx), true);
  ctx.closePath();
}

/** The little crescent moon on one side of its head: glossy yellow, shaded, no blue outline. */
function drawMoon(ctx, p) {
  ctx.save();
  // On its right side; from the back that's on the left, peeking over the top.
  if (p.view === 'back') ctx.translate(-20, HCY - 44);
  else ctx.translate(16, HEAD_TOP_Y + 1);
  ctx.rotate(-0.2 + Math.sin((p.t || 0) * 1.2) * 0.04);
  crescent(ctx, 13, 7, -6, 11);
  const g = ctx.createLinearGradient(-12, -12, 10, 12);
  g.addColorStop(0, PALETTE.moonLight);
  g.addColorStop(0.45, PALETTE.moon);
  g.addColorStop(1, PALETTE.moonDeep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = PALETTE.moonEdge;
  ctx.stroke();
  // Its shine.
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, Math.PI * 0.8, Math.PI * 1.15);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

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

/** Where one of her tiny floating hands is (`side` -1 / 1) for the pose's `arms`. */
function handAt(side, p) {
  const t = p.t || 0;
  const lead = side === p.facing;
  const bob = Math.sin(t * 2.4 + side) * 1.2;
  switch (p.arms) {
    case 'up':
    case 'stretch':
      return [side * 52, HCY - 16 + bob];
    case 'cheer':
      return [side * 52, HCY - 16 - Math.abs(Math.sin(t * 9)) * 4];
    case 'wave':
      return lead ? [side * (52 + Math.sin(t * 11) * 3), HCY - 22] : [side * 24, HCY + 39 + bob];
    case 'flail':
      return [side * (48 + Math.sin(t * 20) * 3), HCY + Math.sin(t * 20 + side) * 14];
    case 'hold':
    case 'grip':
    case 'sip':
    case 'hug':
      return [side * 10, HCY + 30];
    case 'shade':
      return lead ? [side * 15, HCY + 1] : [side * 24, HCY + 39 + bob];
    // Her activities.
    case 'catch':
      return lead ? [side * 40, HCY - 30 + bob] : [side * 24, HCY + 39 + bob];
    case 'blow':
      return [side * 9, HCY + 24];
    case 'paint':
      return lead ? [side * 46, HCY + 4 + Math.sin(t * 6) * 6] : [side * 24, HCY + 39 + bob];
    case 'book':
      return [side * 30, HCY + 42];
    case 'scope':
      return [side * 30, HCY + 30];
    case 'trail':
      return [-p.facing * 44 + side * 4, HCY + 24 + side * 4];
    case 'item': {
      if (side > 0) return [side * 24, HCY + 39 + bob];
      const a = itemArm(p);
      return [-24 - Math.sin(a) * 28, HCY + 18 + Math.cos(a) * 28];
    }
    default:
      return [side * 24, HCY + 39 + bob];
  }
}

/** One of her tiny hands: not attached, just floating near her. */
function drawHand(ctx, side, p) {
  const [x, y] = handAt(side, p);
  ellipse(ctx, x, y, 5.5, 5);
  fillStroke(ctx, PALETTE.cloudTop, 2);
}

function drawEye(ctx, x, y, side, p) {
  const eyes = p.blink ? 'closed' : p.eyes;
  const line = (draw) => {
    ctx.strokeStyle = PALETTE.eye;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    draw();
    ctx.stroke();
  };
  if (eyes === 'closed' || eyes === 'content') return line(() => ctx.arc(x, y - 2, 5, Math.PI * 0.2, Math.PI * 0.8));
  if (eyes === 'happy') return line(() => ctx.arc(x, y + 3, 5, Math.PI * 1.15, Math.PI * 1.85));
  if (eyes === 'squint') {
    return line(() => {
      ctx.moveTo(x - side * 4.5, y - 4.5);
      ctx.lineTo(x + side * 3.5, y);
      ctx.lineTo(x - side * 4.5, y + 4.5);
    });
  }
  if (eyes === 'dizzy') {
    return line(() => {
      for (let i = 0; i <= 22; i++) {
        const a = i * 0.55 + (p.t || 0) * 4 * side;
        const rr = 0.4 + i * 0.25;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
    });
  }
  const r = eyes === 'small' ? 3.2 : eyes === 'wide' || eyes === 'sparkle' ? 6.2 : 5.2;
  const down = eyes === 'sad' || eyes === 'meh' || eyes === 'sleepy' ? 1.2 : 0;
  const px = x + (p.lookX || 0) * 2;
  const py = y + (p.lookY || 0) * 2 + down;
  ellipse(ctx, px, py, r, r * 1.25);
  ctx.fillStyle = PALETTE.eye;
  ctx.fill();
  ctx.fillStyle = PALETTE.white;
  if (eyes === 'sparkle') {
    drawStar(ctx, px + 1, py - 2.5, 3, PALETTE.white);
  } else {
    ellipse(ctx, px - r * 0.3, py - r * 0.45, r * 0.38, r * 0.38);
    ctx.fill();
  }
  // Eyelids: a slanted or flat lid of cloud over the top of the eye.
  const lid = { sad: [y - 10, y - 3], angry: [y - 3, y - 10], meh: [y - 1.5, y - 1.5], sleepy: [y + 1.5, y + 1.5] }[eyes];
  if (lid) {
    const inner = x - side * 9;
    const outer = x + side * 9;
    ctx.save();
    ellipse(ctx, px, py, r + 0.8, r * 1.25 + 0.8);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(inner, y - 14);
    ctx.lineTo(outer, y - 14);
    ctx.lineTo(outer, lid[1]);
    ctx.lineTo(inner, lid[0]);
    ctx.closePath();
    ctx.fillStyle = PALETTE.cloudMid;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(outer, lid[1]);
    ctx.lineTo(inner, lid[0]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.eye;
    ctx.stroke();
    ctx.restore();
  }
}

function drawMouth(ctx, x, y, p) {
  ctx.strokeStyle = PALETTE.eye;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (['open', 'o', 'talk', 'yawn'].includes(p.mouth)) {
    const h = p.mouth === 'talk' ? 1 + Math.abs(Math.sin((p.t || 0) * 12)) * 2 : p.mouth === 'yawn' ? 4.5 : p.mouth === 'o' ? 3 : 2.4;
    ellipse(ctx, x, y + 1, p.mouth === 'yawn' ? 3.2 : 2.6, h);
    ctx.fillStyle = '#c45a6a';
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (p.mouth === 'frown') {
    ctx.arc(x, y + 4, 3.5, Math.PI * 1.2, Math.PI * 1.8);
  } else if (p.mouth === 'flat') {
    ctx.moveTo(x - 2.5, y + 1);
    ctx.lineTo(x + 2.5, y + 1);
  } else if (p.mouth === 'wavy' || p.mouth === 'growl') {
    ctx.moveTo(x - 4, y + 1);
    ctx.quadraticCurveTo(x - 3, y - 1, x - 2, y + 1);
    ctx.quadraticCurveTo(x - 1, y + 3, x, y + 1);
    ctx.quadraticCurveTo(x + 1, y - 1, x + 2, y + 1);
    ctx.quadraticCurveTo(x + 3, y + 3, x + 4, y + 1);
  } else {
    // A tiny cat smile.
    ctx.moveTo(x - 4, y - 0.5);
    ctx.quadraticCurveTo(x - 2, y + 2.5, x, y + 0.3);
    ctx.quadraticCurveTo(x + 2, y + 2.5, x + 4, y - 0.5);
  }
  ctx.stroke();
}

function drawFace(ctx, p) {
  const fx = p.facing * p.turn * 8;
  ctx.save();
  ctx.translate(fx, 0);
  drawEye(ctx, -EYE_X, FACE_Y, -1, p);
  drawEye(ctx, EYE_X, FACE_Y, 1, p);
  const blush = p.blush != null ? p.blush : 0.4;
  for (const side of [-1, 1]) {
    ellipse(ctx, side * 25, FACE_Y + 9, 6, 4.2);
    ctx.fillStyle = PALETTE.cheek + (0.35 + 0.4 * blush) + ')';
    ctx.fill();
  }
  drawMouth(ctx, 0, FACE_Y + 5, p);
  ctx.restore();
}

/** Small stars circling it (happy): the ones behind it, or in front. */
function drawOrbit(ctx, p, front) {
  const n = 3;
  for (let i = 0; i < n; i++) {
    const a = (p.t || 0) * 1.1 + (i / n) * TAU;
    if (Math.sin(a) > 0 !== front) continue;
    const x = Math.cos(a) * (RX + 16);
    const y = CY - 4 + Math.sin(a) * 14;
    drawStar(ctx, x, y, 4.2);
  }
}

/**
 * Draw Nomi.
 * @param {CanvasRenderingContext2D} ctx already translated so (0,0) = the floor below it
 * @param {object} p pose, see `defaultPose`
 */
function drawCharacter(ctx, p) {
  ctx.save();
  ctx.rotate(p.tilt);
  // Always gently bobbing in the air.
  ctx.translate(0, p.bob + Math.sin((p.t || 0) * 1.8) * 2.5);
  ctx.scale(p.scaleX, p.scaleY);
  const back = p.view === 'back';
  const lying = p.view === 'lying';
  // Watching with you: a little see-through.
  if (p.alpha != null) ctx.globalAlpha = p.alpha;
  // Scared by what you're watching: hiding behind the edge of the window, one eye peeking.
  if (p.peek) {
    const edge = 8;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(111, 127, 176, 0.5)';
    ctx.fillRect(edge, HEAD_TOP_Y - 10, 3, 110);
    ctx.restore();
    ctx.beginPath();
    ctx.rect(-120, -200, 120 + edge, 260);
    ctx.clip();
    ctx.translate(22 * p.peek, 0);
  }
  if (lying) {
    // Asleep: curled into a little cloud, hovering just above the floor.
    p = { ...p, view: 'front', turn: 0, arms: 'tucked', eyes: 'closed', mouth: 'smile', stars: 0 };
    ctx.translate(0, 34);
    ctx.scale(1.06, 0.82);
  }
  // Happy: a soft glow round her cloud.
  if (p.glow && !back) {
    const g = ctx.createRadialGradient(0, HCY, 20, 0, HCY, 70);
    g.addColorStop(0, `rgba(255, 246, 200, ${0.55 * p.glow})`);
    g.addColorStop(1, 'rgba(255, 246, 200, 0)');
    ctx.fillStyle = g;
    ellipse(ctx, 0, HCY, 70, 64);
    ctx.fill();
  }
  if (p.stars) drawOrbit(ctx, p, false);
  if (!back) drawPropsBehind(ctx, p);
  if (back) {
    drawMoon(ctx, p);
    drawBackFeet(ctx, p);
    drawCloud(ctx, true, p);
    drawSwirl(ctx);
    // A little bubble of cloud on its shoulder.
    ellipse(ctx, 33, HCY - 33, 8, 8.5);
    fillStroke(ctx, '#c9dcf6', 2);
  } else {
    if (!lying) drawBody(ctx, p);
    drawCloud(ctx, false, p);
    drawMoon(ctx, p);
    drawFace(ctx, p);
    if (!lying) {
      if (p.arms === 'item') {
        const [x, y] = handAt(-1, p);
        drawItem(ctx, p, x, y, itemArm(p));
      }
      drawHand(ctx, -1, p);
      drawHand(ctx, 1, p);
    }
    if (p.stormy > 0.5) drawBolt(ctx, p);
    drawPropsFront(ctx, p);
  }
  if (p.stars) drawOrbit(ctx, p, true);
  if (p.constellation) drawConstellation(ctx, p.constellation, p.t || 0);
  if (p.giggles) drawGiggleBubbles(ctx, p.t || 0);
  ctx.restore();
}

// ------------------------------------------------------------- her things

const RAINBOW = ['#f28b82', '#fbbc6b', '#fde58a', '#a8dba8', '#8ec5f2', '#b9a2e8'];

/** Is it night where she is (for her glowing star jar)? 6 pm to 5 am. */
function nightNow() {
  const h = new Date().getHours();
  return h >= 18 || h < 5;
}

/** A small glass jar at (x, y) (its bottom), with `n` stars in it; glowing at night. */
function drawJar(ctx, x, y, n, t) {
  ctx.save();
  ctx.translate(x, y);
  if (nightNow() && n > 0) {
    const g = ctx.createRadialGradient(0, -10, 2, 0, -10, 26);
    g.addColorStop(0, 'rgba(255, 230, 120, 0.75)');
    g.addColorStop(1, 'rgba(255, 230, 120, 0)');
    ctx.fillStyle = g;
    ellipse(ctx, 0, -10, 26, 26);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.roundRect(-9, -20, 18, 20, 5);
  ctx.fillStyle = 'rgba(220, 238, 252, 0.75)';
  ctx.fill();
  for (let i = 0; i < Math.min(n, 5); i++) {
    const sx = [-4, 4, 0, -3, 4][i];
    const sy = [-5, -6, -10, -14, -13][i];
    drawStar(ctx, sx, sy + Math.sin(t * 2 + i) * 0.6, 3);
  }
  ctx.beginPath();
  ctx.roundRect(-9, -20, 18, 20, 5);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-7, -25, 14, 6, 2);
  fillStroke(ctx, '#c9965a', 1.6);
  ctx.restore();
}

/** Stars falling around her (catching stars). */
function drawFallingStars(ctx, t) {
  for (let i = 0; i < 4; i++) {
    const u = (t * 0.5 + i * 0.27) % 1;
    const x = [-44, 36, -20, 50][i];
    const y = HEAD_TOP_Y - 30 + u * 70;
    ctx.globalAlpha = 1 - u * 0.4;
    drawStar(ctx, x, y, 5, '#ffd84a');
  }
  ctx.globalAlpha = 1;
}

/** A dream bubble at (x, y), radius r, with a tiny scene in it; `pop` 0..1 bursts it. */
function drawBubble(ctx, x, y, r, scene, pop = 0) {
  ctx.save();
  if (pop > 0) {
    ctx.strokeStyle = 'rgba(140, 170, 230, 0.8)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * (0.8 + pop * 0.4), y + Math.sin(a) * r * (0.8 + pop * 0.4));
      ctx.lineTo(x + Math.cos(a) * r * (1.1 + pop * 0.6), y + Math.sin(a) * r * (1.1 + pop * 0.6));
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ellipse(ctx, x, y, r, r);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.35)');
  g.addColorStop(0.8, 'rgba(225,235,255,0.45)');
  g.addColorStop(1, 'rgba(200,180,250,0.7)');
  ctx.fillStyle = g;
  ctx.fill();
  if (scene) {
    ctx.font = `${Math.round(r * 1.05)}px "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(scene, x, y + r * 0.05);
  }
  ellipse(ctx, x, y, r, r);
  const rim = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  rim.addColorStop(0, '#f4a6d0');
  rim.addColorStop(0.5, '#a9c6f4');
  rim.addColorStop(1, '#b7e3c8');
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, x - r * 0.4, y - r * 0.45, r * 0.22, r * 0.12, -0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  ctx.restore();
}

/** A little rain cloud above her head, raining. */
function drawRainCloud(ctx, t) {
  const y = HEAD_TOP_Y - 18;
  ctx.save();
  ctx.strokeStyle = 'rgba(90, 140, 220, 0.95)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const u = (t * 1.6 + i * 0.37) % 1;
    const x = -20 + i * 7;
    const yy = y + 8 + u * 30;
    ctx.globalAlpha = 1 - u * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x - 1.5, yy + 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const g = ctx.createLinearGradient(0, y - 14, 0, y + 8);
  g.addColorStop(0, '#c6cddd');
  g.addColorStop(1, '#8f9bb6');
  ctx.save();
  ctx.strokeStyle = '#7d89a6';
  ctx.lineWidth = 4;
  const ps = [[-12, y, 9], [0, y - 5, 11], [12, y, 9], [0, y + 2, 9]];
  for (const [x, yy, r] of ps) {
    ellipse(ctx, x, yy, r, r);
    ctx.stroke();
  }
  ctx.fillStyle = g;
  for (const [x, yy, r] of ps) {
    ellipse(ctx, x, yy, r, r);
    ctx.fill();
  }
  ctx.restore();
}

/** A rainbow arc centred at (cx, cy), outer radius r, drawn from the left up to `progress` (0..1). */
function drawRainbow(ctx, cx, cy, r, progress = 1, band = 3.2) {
  if (progress <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  RAINBOW.forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r - i * band, Math.PI, Math.PI + Math.PI * Math.min(1, progress));
    ctx.strokeStyle = c;
    ctx.lineWidth = band + 0.6;
    ctx.stroke();
  });
  ctx.restore();
}

/** Her little paintbrush in her hand at (x, y). */
function drawBrush(ctx, x, y, side) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(side * 0.7);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -14);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#b07a46';
  ctx.lineCap = 'round';
  ctx.stroke();
  ellipse(ctx, 0, -17, 2.6, 4.5);
  ctx.fillStyle = RAINBOW[(Math.floor(Date.now() / 400)) % RAINBOW.length];
  ctx.fill();
  ctx.restore();
}

/** A book much bigger than she is, open in front of her; `turn` 0..1 turns a page. */
function drawBook(ctx, y, turn, t) {
  ctx.save();
  ctx.translate(0, y);
  // Covers.
  ctx.beginPath();
  ctx.moveTo(-36, -2);
  ctx.quadraticCurveTo(-18, -8, 0, -3);
  ctx.quadraticCurveTo(18, -8, 36, -2);
  ctx.lineTo(36, 20);
  ctx.quadraticCurveTo(18, 14, 0, 19);
  ctx.quadraticCurveTo(-18, 14, -36, 20);
  ctx.closePath();
  fillStroke(ctx, '#7fa3dc', 2);
  // Pages.
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(side * 16, -7, side * 33, -2);
    ctx.lineTo(side * 33, 16);
    ctx.quadraticCurveTo(side * 16, 12, 0, 16);
    ctx.closePath();
    fillStroke(ctx, '#fffaf0', 1.6);
    ctx.strokeStyle = 'rgba(111, 127, 176, 0.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(side * 6, 3 + i * 4);
      ctx.lineTo(side * 27, 3 + i * 4);
      ctx.stroke();
    }
  }
  // A page turning over.
  if (turn > 0 && turn < 1) {
    const w = Math.cos(turn * Math.PI) * 33;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(w * 0.5, -8 - Math.sin(turn * Math.PI) * 8, w, -2 - Math.sin(turn * Math.PI) * 6);
    ctx.lineTo(w, 16 - Math.sin(turn * Math.PI) * 6);
    ctx.quadraticCurveTo(w * 0.5, 12, 0, 16);
    ctx.closePath();
    fillStroke(ctx, '#ffffff', 1.4);
  }
  ctx.restore();
  // Little pictures floating up out of it.
  ctx.save();
  ctx.font = '11px "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ['⭐', '🐟', '🌙', '🌸'].forEach((e, i) => {
    const u = (t * 0.35 + i * 0.25) % 1;
    ctx.globalAlpha = Math.sin(u * Math.PI);
    ctx.fillText(e, [-24, 20, -8, 30][i] + Math.sin(t * 2 + i) * 3, y - 4 - u * 46);
  });
  ctx.restore();
}

/** Her tiny telescope on its tripod at x, pointing up; the moon huge in its lens (`zoom` 0..1). */
function drawTelescope(ctx, x, side, zoom, t) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.strokeStyle = '#7d6a58';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (const dx of [-9, 0, 9]) {
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(dx, 0);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(0, -32);
  ctx.rotate(side * 0.75);
  ctx.beginPath();
  ctx.roundRect(-4, -26, 8, 30, 3);
  fillStroke(ctx, '#5d6fa8', 1.8);
  ctx.beginPath();
  ctx.roundRect(-5.5, -30, 11, 7, 2);
  fillStroke(ctx, '#d8b65a', 1.6);
  ctx.restore();
  ctx.restore();
  // The view in the lens: the moon, huge.
  if (zoom > 0) {
    const cx = x + side * 12;
    const cy = HEAD_TOP_Y - 14;
    const r = 8 + zoom * 16;
    ctx.save();
    ellipse(ctx, cx, cy, r, r);
    ctx.fillStyle = '#28305a';
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#fff6c8';
    ellipse(ctx, cx + r * 0.1, cy, r * 0.75, r * 0.75);
    ctx.fill();
    ctx.fillStyle = 'rgba(210, 190, 120, 0.6)';
    for (const [dx, dy, rr] of [[-0.25, -0.2, 0.15], [0.2, 0.15, 0.12], [0.05, -0.35, 0.08]]) {
      ellipse(ctx, cx + r * dx, cy + r * dy, r * rr, r * rr);
      ctx.fill();
    }
    ctx.restore();
    ellipse(ctx, cx, cy, r, r);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5d6fa8';
    ctx.stroke();
    drawStar(ctx, cx - r - 6, cy - r * 0.6, 2.6);
    drawStar(ctx, cx + r + 5, cy + r * 0.4, 2.2);
  }
}

/** A glass of water at (x, y), `level` 0..1 full. */
function drawGlass(ctx, x, y, level) {
  ctx.save();
  ctx.translate(x, y);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-8, -13);
    ctx.lineTo(8, -13);
    ctx.lineTo(6, 9);
    ctx.quadraticCurveTo(0, 11, -6, 9);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = 'rgba(225, 243, 252, 0.85)';
  ctx.fill();
  if (level > 0.02) {
    ctx.save();
    path();
    ctx.clip();
    const wy = 9 - 22 * Math.min(1, level);
    ctx.fillStyle = '#8fcdf0';
    ctx.fillRect(-10, wy, 20, 14 - wy + 3);
    ctx.restore();
  }
  path();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.restore();
}

/** Her fetch toy, a dream bubble, wobbling as it moves (`rot` turns with it). */
function drawFetchBubble(ctx, x, y, rot = 0, r = 12) {
  const w = Math.sin(rot * 1.7) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + w, 1 - w);
  drawBubble(ctx, 0, 0, r, null);
  ctx.restore();
}

/** After she wins tic-tac-toe: a little constellation of the board above her. */
function drawConstellation(ctx, board, t) {
  const gx = (i) => -14 + (i % 3) * 14;
  const gy = (i) => HEAD_TOP_Y - 42 + Math.floor(i / 3) * 12;
  ctx.save();
  if (board.line) {
    ctx.strokeStyle = 'rgba(246, 207, 74, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    board.line.forEach((i, n) => (n ? ctx.lineTo(gx(i), gy(i)) : ctx.moveTo(gx(i), gy(i))));
    ctx.stroke();
  }
  board.mine.forEach((m, i) => {
    if (m === 1) drawStar(ctx, gx(i), gy(i), 3.6 + Math.sin(t * 3 + i) * 0.5);
    else if (m === 2) {
      ellipse(ctx, gx(i), gy(i), 1.6, 1.6);
      ctx.fillStyle = 'rgba(160, 180, 230, 0.8)';
      ctx.fill();
    }
  });
  ctx.restore();
}

/** Watching something funny: little bubbles rising round her. */
function drawGiggleBubbles(ctx, t) {
  for (let i = 0; i < 4; i++) {
    const u = (t * 0.6 + i * 0.25) % 1;
    ctx.globalAlpha = 1 - u;
    drawBubble(ctx, [-46, 44, -36, 50][i] + Math.sin(t * 3 + i) * 3, HCY + 10 - u * 50, 4 + (i % 2) * 2, null);
  }
  ctx.globalAlpha = 1;
}

/** Her things behind her. */
function drawPropsBehind(ctx, p) {
  if (p.prop === 'rainbowBridge') drawRainbow(ctx, 0, HCY + 120, 58, 1, 4);
  if (p.prop === 'paint' || p.prop === 'rainbow') drawRainbow(ctx, p.facing * 46, -14, 40, p.propProgress != null ? p.propProgress : 1, 3.6);
  if (p.prop === 'rainAfter') drawRainbow(ctx, 0, HCY + 6, 66, 1, 3.4);
}

/** Her things in front of her. */
function drawPropsFront(ctx, p) {
  const side = p.facing;
  const t = p.t || 0;
  switch (p.prop) {
    case 'glass': {
      const lift = p.glassLift || 0;
      drawGlass(ctx, p.facing * p.turn * 4, HCY + 30 - 8 * lift, p.propProgress);
      break;
    }
    case 'bubble':
      drawFetchBubble(ctx, p.facing * p.turn * 4, HCY + 28, t * 2, 11);
      break;
    case 'stars':
      drawFallingStars(ctx, t);
      if (p.holdingStar) {
        const [hx, hy] = handAt(side, p);
        drawStar(ctx, hx, hy - 8, 4.5);
      }
      if (p.jar != null) drawJar(ctx, side * 12, HCY + 44, p.jar, t);
      break;
    case 'bubbles':
      if (p.bubble) drawBubble(ctx, p.bubble.x, p.bubble.y, p.bubble.r, p.bubble.scene, p.bubble.pop);
      break;
    case 'rain':
      drawRainCloud(ctx, t);
      break;
    case 'paint': {
      const [hx, hy] = handAt(side, p);
      drawBrush(ctx, hx, hy, side);
      break;
    }
    case 'book':
      drawBook(ctx, HCY + 36, p.pageTurn || 0, t);
      break;
    case 'moon':
      drawTelescope(ctx, side * 42, side, p.zoom || 0, t);
      break;
  }
}

/** Stormy: a tiny lightning bolt flickering beside her head. */
function drawBolt(ctx, p) {
  if (Math.sin((p.t || 0) * 13) < 0.2) return;
  ctx.save();
  ctx.translate(-34, HEAD_TOP_Y + 6);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-5, 9);
  ctx.lineTo(0, 9);
  ctx.lineTo(-4, 18);
  ctx.lineTo(5, 6);
  ctx.lineTo(0, 6);
  ctx.lineTo(3, 0);
  ctx.closePath();
  ctx.fillStyle = PALETTE.moon;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = PALETTE.moonEdge;
  ctx.stroke();
  ctx.restore();
}

/** From the back: just its two feet below the cloud. */
function drawBackFeet(ctx, p) {
  for (const side of [-1, 1]) {
    const swing = Math.sin((p.t || 0) * 2 + side) * 0.1;
    ctx.save();
    ctx.translate(side * 9, HCY + 34);
    ctx.rotate(swing);
    ellipse(ctx, 0, 13, 7, 14);
    fillStroke(ctx, PALETTE.backBottom, 2);
    ctx.restore();
  }
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
    blush: 0.4,
    prop: null,
    stars: 0,
    glow: 0,
    gloom: 0,
    stormy: 0,
    item: null, // what's in the hand for arms 'item': { img, w, h } (see itemArm)
    itemWave: 0,
  };
}

/** Her own take on shared states and moods. */
function restyle(state, p, f) {
  // She never gets angry: cross moods look tired and a little sad instead.
  if (p.eyes === 'angry') p.eyes = 'meh';
  if (p.mouth === 'growl') p.mouth = 'frown';
  if (p.arms === 'fists') p.arms = 'down';
  // Happy: stars circle her and her cloud glows; cheerful, a little.
  if (state === 'happy') {
    p.stars = 1;
    p.glow = 1;
  } else if (f.band === 'cheerful') {
    p.stars = 1;
    p.glow = 0.5;
  }
  // Sad: her cloud turns a little darker.
  if (f.band === 'sad' || state === 'sad') p.gloom = 1;
  // Watching something with you: a little see-through.
  if ((state === 'backView' || state === 'watchReact') && f.watching && p.alpha == null) p.alpha = 0.8;
  // Just beat you at tic-tac-toe: a little constellation of the board.
  if (f.wonBoard) p.constellation = f.wonBoard;
}

/**
 * Watching something with you, her reaction to a moment (Phase 9): floating
 * in the corner, a little see-through, her eyes on the film. Leans in when
 * it's exciting, little bubbles when it's funny, stars when it's beautiful,
 * a darker cloud when it's sad; at scary scenes she hides behind the edge of
 * the window with one eye peeking; bored, she turns and floats quietly.
 */
function watchPose(mood, p, f, k) {
  p.view = 'back';
  switch (mood) {
    case 'exciting':
      p.scaleY *= 1.04;
      p.bob = -Math.abs(Math.sin(k.t * 9)) * 2;
      break;
    case 'funny':
      p.giggles = true;
      p.tilt = Math.sin(k.t * 12) * 0.05;
      break;
    case 'beautiful':
      p.stars = 1;
      p.glow = 0.4;
      break;
    case 'sad':
      p.gloom = 1.6;
      break;
    case 'scary':
      p.view = 'front';
      p.alpha = 1;
      p.peek = Math.min(1, k.st / 0.8);
      p.eyes = 'wide';
      p.mouth = 'flat';
      p.lookX = -1;
      break;
    case 'boring':
      p.view = 'front';
      p.eyes = 'meh';
      p.mouth = 'flat';
      break;
    default:
  }
}

// What's in her dream bubbles: little dreams, or (bored) sillier and sillier.
const DREAMS = ['🏖️', '⛰️', '🍰', '🚀', '🛏️', '🌲'];
const SILLY = ['🌳', '🐸', '🐸🚀', '🐸👨‍🚀'];

const ACTIVITY_POSES = {
  // Catching stars (fixes hunger): looking up as they fall, catching one,
  // then putting them in her jar (it glows at night).
  stars(p, f, k) {
    const u = k.st / k.duration;
    p.prop = 'stars';
    if (u < 0.3) {
      p.arms = 'up';
      p.eyes = 'wide';
      p.mouth = 'o';
      p.lookY = -1;
    } else if (u < 0.6) {
      p.arms = 'catch';
      p.holdingStar = true;
      p.eyes = 'sparkle';
      p.mouth = 'open';
      p.lookX = f.facing;
      p.lookY = -0.8;
    } else {
      p.arms = 'hold';
      p.jar = 2 + Math.floor((u - 0.6) * 8);
      p.eyes = 'content';
      p.mouth = 'smile';
      p.blush = 0.8;
    }
  },
  // Dream bubbles: she blows a bubble with a tiny dream in it; it floats
  // away and pops. Bored: sillier and sillier dreams.
  bubbles(p, f, k) {
    const c = k.st % 4;
    const n = Math.floor(k.st / 4);
    const scenes = f.variant === 'silly' ? SILLY : DREAMS;
    const scene = scenes[Math.min(n, scenes.length - 1) % scenes.length];
    p.prop = 'bubbles';
    p.lookX = f.facing * 0.6;
    p.lookY = -0.4;
    if (c < 1.4) {
      p.arms = 'blow';
      p.mouth = 'o';
      p.blush = 0.9;
      p.bubble = { x: f.facing * (12 + c * 12), y: HCY + 14 - c * 8, r: 5 + c * 11, scene: c > 0.6 ? scene : null };
    } else if (c < 3.3) {
      const u = (c - 1.4) / 1.9;
      p.eyes = f.variant === 'silly' && n >= 3 ? 'sparkle' : 'content';
      p.mouth = 'smile';
      p.bubble = { x: f.facing * (29 + u * 24), y: HCY + 3 - u * 40, r: 20.4, scene };
    } else {
      p.eyes = 'wide';
      p.mouth = 'o';
      p.bubble = { x: f.facing * 53, y: HCY - 37, r: 20.4, pop: (c - 3.3) / 0.7 };
    }
  },
  // Making rain (mostly when she's sad): a little rain cloud over her head.
  rain(p, f, k) {
    p.prop = 'rain';
    p.eyes = 'sad';
    p.mouth = 'frown';
    p.gloom = 1;
    p.lookY = 0.5;
  },
  // You patted her while it rained: the rain stops, a rainbow over her.
  rainbowAfterRain(p, f, k) {
    p.prop = 'rainAfter';
    p.eyes = 'happy';
    p.mouth = 'open';
    p.blush = 1;
    p.glow = 0.6;
  },
  // Painting a rainbow in the air with her tiny brush, then walking across it.
  paint(p, f, k) {
    const u = k.st / k.duration;
    if (u < 0.55) {
      p.prop = 'paint';
      p.arms = 'paint';
      p.propProgress = u / 0.55;
      p.eyes = 'open';
      p.mouth = 'smile';
      p.lookX = f.facing;
      p.lookY = -0.3;
    } else if (u < 0.72) {
      p.prop = 'rainbow';
      p.eyes = 'sparkle';
      p.mouth = 'open';
      p.lookX = f.facing;
    } else {
      // Crossing her rainbow bridge.
      p.prop = 'rainbowBridge';
      p.bob = -26;
      p.stepHeight = 3;
      p.walkPhase = k.t * 6;
      p.eyes = 'happy';
      p.mouth = 'open';
      p.blush = 0.9;
    }
  },
  // Reading a book much bigger than she is; little pictures float out.
  read(p, f, k) {
    p.prop = 'book';
    p.feet = 'sit';
    p.arms = 'book';
    const c = k.st % 3.5;
    p.pageTurn = c > 2.6 ? (c - 2.6) / 0.9 : 0;
    p.eyes = Math.sin(k.t * 0.8) > 0.7 ? 'sparkle' : 'open';
    p.mouth = 'smile';
    p.lookY = 0.8;
    p.lookX = Math.sin(k.t * 1.5) * 0.6;
  },
  // Moon watching (only at night): looking through her tiny telescope; the
  // moon grows huge in its lens and she smiles.
  moon(p, f, k) {
    const u = k.st / k.duration;
    p.prop = 'moon';
    p.feet = 'sit';
    p.arms = 'scope';
    p.zoom = Math.min(1, Math.max(0, (u - 0.15) / 0.3));
    p.eyes = u < 0.15 ? 'open' : 'content';
    p.mouth = u < 0.45 ? 'o' : 'smile';
    p.lookX = f.facing;
    p.lookY = -0.6;
    p.tilt = f.facing * 0.06;
  },
  // Wandering around the top of the screen like a cloud, legs tucked in.
  sky(p, f, k) {
    p.feet = 'tuck';
    p.arms = 'trail';
    p.eyes = 'content';
    p.mouth = 'smile';
    p.tilt = f.facing * 0.1;
    p.stars = 1;
  },
  // Carried off the screen by a throw, floating back in: legs trailing, a bit stormy.
  floatingBack(p, f, k) {
    p.stepHeight = 3;
    p.walkPhase = k.t * 5;
    p.eyes = 'small';
    p.mouth = 'wavy';
    p.stormy = 0.6;
  },
  // After a throw: back from wherever it carried her, dizzy, a little stormy.
  dizzy(p, f, k) {
    p.eyes = k.st % 3 > 2.4 ? 'closed' : 'dizzy';
    p.blink = 0;
    p.mouth = 'wavy';
    p.tilt = Math.sin(k.t * 2.2) * 0.09;
    p.stormy = Math.max(0, 1 - k.st / k.duration);
    k.overlay('scribble');
  },
};

window.Characters = window.Characters || {};
window.Characters.nomi = Object.assign(window.Characters.nomi || {}, {
  draw: drawCharacter,
  defaultPose,
  BODY_CY: CY,
  HEAD_TOP: HEAD_TOP_Y - 10,
  turned: { stars: 0.4, bubbles: 0.5, paint: 0.6, moon: 0.6, sky: 1, floatingBack: 1 },
  activityPose: ACTIVITY_POSES,
  restyle,
  watchPose,
  // What she holds while bringing the fetch bubble back to you.
  heldProp: 'bubble',
  drawFetchItem: drawFetchBubble,
});
})();
