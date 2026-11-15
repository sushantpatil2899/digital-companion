// Mori's looks: a small moss-capped forest creature on four stubby legs,
// drawn in code. Everything is drawn relative to his feet at (0, 0); up is
// negative y. Registers itself as window.Characters.mori (see
// src/characters/README.md).
// Draft for Sushant's approval (Phase 9, step 3): front, 3/4 and back first.
(function () {
'use strict';

const PALETTE = {
  outline: '#5a3b22', // soft brown outlines, like the reference
  body: '#c69c60', // light warm tan
  bodyShade: '#ad8549',
  bodyLight: '#d8b47c',
  leg: '#b88d52',
  legFar: '#a17846',
  moss: '#9db63f',
  mossDark: '#7f9832',
  mossLight: '#bad05f',
  sprout: '#fbec9c', // pale yellow antler sprouts
  sproutShade: '#e4cd68',
  eye: '#3a2414',
  white: '#ffffff',
  cheek: 'rgba(240, 145, 105, ',
  freckle: '#9a6a3c',
  leaf: '#8db43e',
  leafDark: '#6c9030',
  stem: '#cfd36a',
};

const CY = -60; // centre of his body
const RX = 40; // half width at his belly (his head is a little narrower)
const HX = RX * 0.92; // half width of his head
const RY = 45; // half height (his body sits on his legs)
const FACE_Y = CY + 2; // eye line (below the moss cap)
const EYE_X = 17;
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
 * His body: one soft, plump lump (head and body together), widest around his
 * cheeks, a little lumpy on the sides and settled at the bottom.
 */
function bodyPath(ctx) {
  const T = CY - RY;
  const B = CY + RY;
  ctx.beginPath();
  ctx.moveTo(0, T);
  ctx.bezierCurveTo(RX * 0.6, T, RX * 0.88, CY - RY * 0.62, RX * 0.92, CY - RY * 0.2);
  // A soft puff as his head becomes his plump belly...
  ctx.bezierCurveTo(RX * 0.95, CY + RY * 0.02, RX * 1.05, CY + RY * 0.2, RX * 1.03, CY + RY * 0.46);
  // ...which settles, round, onto his legs.
  ctx.bezierCurveTo(RX * 1.02, CY + RY * 0.82, RX * 0.72, B + 1, RX * 0.32, B);
  ctx.quadraticCurveTo(0, B + 2, -RX * 0.34, B);
  ctx.bezierCurveTo(-RX * 0.76, B + 1, -RX * 1.04, CY + RY * 0.8, -RX * 1.04, CY + RY * 0.44);
  ctx.bezierCurveTo(-RX * 1.06, CY + RY * 0.22, -RX * 0.96, CY + RY * 0.0, -RX * 0.93, CY - RY * 0.22);
  ctx.bezierCurveTo(-RX * 0.88, CY - RY * 0.64, -RX * 0.6, T, 0, T);
  ctx.closePath();
}

/** One of the two antler-like sprouts on top, `side` -1 / 1: a blade with a little second tip. */
function drawSprout(ctx, side, p) {
  const sway = Math.sin((p.t || 0) * 1.6 + side) * 0.04;
  ctx.save();
  ctx.translate(side * 16, CY - RY + 1);
  ctx.rotate(side * 0.3 + sway);
  ctx.scale(side, 1); // the second tip is on the outer side
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.bezierCurveTo(-8, -6, -8, -23, -2, -29);
  ctx.bezierCurveTo(1, -32, 4, -28, 4, -23); // a rounded tip
  ctx.bezierCurveTo(6, -24, 9, -23, 8.5, -19); // and a little second one
  ctx.bezierCurveTo(8, -12, 6, -4, 3, 4);
  ctx.closePath();
  fillStroke(ctx, PALETTE.sprout, 2);
  ctx.beginPath();
  ctx.moveTo(0.5, 1);
  ctx.quadraticCurveTo(0, -11, 0, -21);
  ctx.strokeStyle = PALETTE.sproutShade;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/**
 * A thick, fleshy ear sticking out and a little up, `side` -1 / 1. Moss grows
 * over its outer (top) side; the inside is tan.
 */
function earPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.bezierCurveTo(10, -23, 23, -21, 32, -12); // top edge out to the pointed tip
  ctx.bezierCurveTo(29, 1, 22, 11, 12, 13); // round, meaty bottom edge
  ctx.bezierCurveTo(7, 14, 2, 14, 0, 13);
  ctx.closePath();
}

function drawEar(ctx, side, p, back) {
  const droop = p.earDroop || 0; // 0 normal, 1 hanging (sad)
  ctx.save();
  ctx.translate(side * (HX - 5), CY - 2);
  ctx.rotate(side * (-0.42 + droop * 1.2));
  ctx.scale(side, 1);
  earPath(ctx);
  fillStroke(ctx, PALETTE.body, 2.2);
  ctx.save();
  earPath(ctx);
  ctx.clip();
  // The tan inside of the ear, a shade darker (seen from the front).
  if (!back) {
    ctx.beginPath();
    ctx.moveTo(4, 7);
    ctx.bezierCurveTo(12, 5, 20, -1, 27, -10);
    ctx.bezierCurveTo(18, -4, 10, 0, 4, 1);
    ctx.closePath();
    ctx.fillStyle = PALETTE.bodyShade;
    ctx.fill();
  }
  // Moss over the outer side, with a soft wavy edge.
  ctx.beginPath();
  ctx.moveTo(-4, -30);
  ctx.lineTo(42, -30);
  ctx.lineTo(42, -10);
  ctx.bezierCurveTo(32, back ? -4 : -10, 26, back ? -2 : -9, 21, back ? -2 : -8);
  ctx.bezierCurveTo(16, back ? 3 : -3, 11, back ? 0 : -7, 6, back ? 2 : -4);
  ctx.bezierCurveTo(2, back ? 6 : 0, -2, 2, -4, 4);
  ctx.closePath();
  ctx.fillStyle = PALETTE.moss;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = PALETTE.mossDark;
  ctx.stroke();
  ctx.restore();
  earPath(ctx);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.restore();
}

/**
 * The mossy cap over the top of his head, in uneven round lobes (it comes
 * lower on his left side). From the back it covers more, with one drip.
 */
const MOSS_FRONT = [
  // [x at the end of the lobe, how low its bottom hangs (from CY)]
  [HX * 0.55, -13],
  [HX * 0.12, -20],
  [-HX * 0.3, -16],
  [-HX * 0.68, -6],
  [-HX - 3, 2],
];
const MOSS_BACK = [
  [HX * 0.66, 4],
  [HX * 0.36, 8],
  [HX * 0.1, 10],
  [-HX * 0.1, 12],
  [-HX * 0.36, 10],
  [-HX * 0.66, 8],
  [-HX - 3, 4],
];

function mossPath(ctx, back, dy = 0) {
  const lobes = back ? MOSS_BACK : MOSS_FRONT;
  const startY = CY + (back ? 0 : -6) + dy;
  ctx.beginPath();
  ctx.moveTo(HX + 3, startY);
  let x0 = HX + 3;
  for (const [x1, low] of lobes) {
    const yEnd = x1 <= -HX ? CY + (back ? 0 : -2) + dy : CY + low - 6 + dy;
    const bottom = CY + low + dy;
    ctx.bezierCurveTo(x0 - 2, bottom + 4, x1 + 2, bottom + 4, x1, yEnd);
    x0 = x1;
  }
  // Over the top of his head and back to the start.
  ctx.bezierCurveTo(-HX - 4, CY - RY * 0.6 + dy, -HX * 0.62, CY - RY - 5 + dy, 0, CY - RY - 5 + dy);
  ctx.bezierCurveTo(HX * 0.62, CY - RY - 5 + dy, HX + 4, CY - RY * 0.6 + dy, HX + 3, startY);
  ctx.closePath();
}

function drawMoss(ctx, p, back) {
  // From the back: one drop of moss hanging below the edge (drawn first so
  // the cap covers its top).
  if (back) {
    ctx.beginPath();
    ctx.moveTo(-4, CY + 8);
    ctx.bezierCurveTo(-5, CY + 15, -6.5, CY + 23, 0, CY + 23);
    ctx.bezierCurveTo(6.5, CY + 23, 5, CY + 15, 4, CY + 8);
    ctx.closePath();
    fillStroke(ctx, PALETTE.moss, 2);
  }
  // Its thickness: a darker band just inside the bottom edge.
  ctx.save();
  mossPath(ctx, back);
  ctx.fillStyle = PALETTE.mossDark;
  ctx.fill();
  ctx.clip();
  mossPath(ctx, back, -3.5);
  ctx.fillStyle = PALETTE.moss;
  ctx.fill();
  // Soft lighter patches where the light catches it.
  ctx.fillStyle = PALETTE.mossLight;
  ctx.globalAlpha = 0.75;
  for (const [x, y, rx, ry] of [[-14, -46, 12, 5], [16, -48, 8, 4], [-30, -30, 5, 6], [29, -34, 4, 5]]) {
    ellipse(ctx, x, CY + y + 6, rx, ry, -0.3);
    ctx.fill();
  }
  ctx.globalAlpha = 0.9;
  for (const [x, y] of [[-20, -38], [-14, -36], [22, -40], [6, -52], [-4, -28], [30, -22]]) {
    ellipse(ctx, x, CY + y + 6, 1.1, 1.1);
    ctx.fill();
  }
  ctx.restore();
  mossPath(ctx, back);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // A little clump of moss by one sprout (like the reference).
  for (const [x, y, r] of [[HX * 0.74, CY - RY - 1, 4.2], [HX * 0.74 + 5, CY - RY + 3, 3.6], [HX * 0.74 + 1, CY - RY + 6, 3.4]]) {
    ellipse(ctx, x, y, r, r);
    fillStroke(ctx, PALETTE.moss, 1.6);
  }
  // Happy: tiny flowers grow on his moss.
  if (p.flowers) {
    for (const [x, y, c] of [[-22, -42, '#ffffff'], [12, -50, '#ffd6e0'], [28, -32, '#ffffff'], [-4, -32, '#fff3a6']]) drawFlower(ctx, x, CY + y + 6, 3.4 * p.flowers, c);
  }
}

function drawFlower(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ellipse(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, r * 0.75);
    ctx.fill();
    ctx.stroke();
  }
  ellipse(ctx, x, y, r * 0.6, r * 0.6);
  ctx.fillStyle = '#f2b33d';
  ctx.fill();
  ctx.restore();
}

const LEG_TOP = CY + RY - 14; // where his legs start, hidden under his body

/** One stubby leg hanging from (x, top) down to y = bottom, turned by `angle` (0 = straight down). */
function drawLeg(ctx, x, top, bottom, fill, angle = 0) {
  const w = 9;
  const len = bottom - top;
  ctx.save();
  ctx.translate(x, top);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w - 0.5, len - 6, -w + 1, len, 0, len);
  ctx.bezierCurveTo(w - 1, len, w + 0.5, len - 6, w, 0);
  ctx.closePath();
  fillStroke(ctx, fill, 2.1);
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

/**
 * He has no arms: where Togepi would use his arms, Mori lifts a front paw
 * (or both). Returns the paw's angle (0 = down; it swings out and up), or
 * null while it stays on the ground.
 */
function pawRaise(side, p) {
  const lead = side === p.facing;
  switch (p.arms) {
    case 'wave':
      return lead ? -side * (2.35 + Math.sin(p.t * 11) * 0.3) : null;
    case 'up':
    case 'stretch':
      return -side * 1.9;
    case 'cheer':
      return -side * (1.8 + Math.sin(p.t * 9) * 0.25);
    case 'flail':
      return -side * (1.5 + Math.sin(p.t * 20 + side * 2) * 0.6);
    case 'hold':
    case 'hug':
    case 'grip':
    case 'sip':
      return side * 2.25; // both paws up in front of his belly
    case 'item':
      return side < 0 ? itemArm(p) : null;
    case 'shade':
      return lead ? side * 2.7 : null;
    // His activities: one front paw at work, out at his side.
    case 'inspect':
      return lead ? -side * 2.2 : null;
    case 'dig':
      return lead ? -side * (0.75 + Math.sin(p.t * 14) * 0.25) : null;
    case 'pour':
      return lead ? -side * 1.9 : null;
    case 'push':
      return lead ? -side * (1.55 + Math.sin(p.t * 9) * 0.06) : null;
    case 'throwBack':
      return lead ? -side * 2.8 : null;
    case 'throw':
      return lead ? -side * 1.2 : null;
    case 'dance':
      return -side * (1.6 + Math.sin(p.t * 10 + (side > 0 ? 0 : Math.PI)) * 0.5);
    default:
      return null;
  }
}

const nearX = (side, p) => side * 12 + p.facing * p.turn * 9;
const farX = (side, p) => side * 24 - p.facing * p.turn * 10;

/**
 * His four legs (the ones on the ground; raised paws come after his body).
 * The near pair (front legs from the front, hind legs from the back) stand
 * closer together; the far pair peek out wider and a touch higher. Walking
 * moves them in diagonal pairs. `drop`: how far his body sinks (sitting).
 */
function drawLegs(ctx, p, drop) {
  const step = (offset) => (p.stepHeight ? Math.max(0, Math.sin((p.walkPhase || 0) + offset)) * p.stepHeight : 0);
  if (p.feet === 'dangle') {
    // Picked up or falling: all four hang loose, swinging a little.
    const swing = Math.sin((p.t || 0) * 6) * 0.08;
    for (const side of [-1, 1]) drawLeg(ctx, farX(side, p), LEG_TOP - 2, LEG_TOP + 19, PALETTE.legFar, -side * 0.12 + swing);
    for (const side of [-1, 1]) drawLeg(ctx, nearX(side, p), LEG_TOP, LEG_TOP + 23, PALETTE.leg, -side * 0.06 + swing);
    return;
  }
  if (p.feet === 'sit') {
    // Sitting: his hind legs fold into round haunches at his sides.
    for (const side of [-1, 1]) {
      ellipse(ctx, side * 29 - p.facing * p.turn * 6, -9, 13, 9.5);
      fillStroke(ctx, PALETTE.legFar, 2.1);
    }
  } else {
    for (const side of [-1, 1]) drawLeg(ctx, farX(side, p), LEG_TOP, -2.5 - step(side > 0 ? 0 : Math.PI), PALETTE.legFar);
  }
  for (const side of [-1, 1]) {
    if (pawRaise(side, p) === null) drawLeg(ctx, nearX(side, p), LEG_TOP + drop, -step(side > 0 ? Math.PI : 0), PALETTE.leg);
  }
}

/** Where a raised paw (not one held in front of him) is, and where its tip is. */
function pawPivot(side, p) {
  return { x: side * 25 + p.facing * p.turn * 6, y: LEG_TOP - 10 };
}
function pawTip(side, p) {
  const a = pawRaise(side, p) || 0;
  const o = pawPivot(side, p);
  return { x: o.x - Math.sin(a) * 22, y: o.y + Math.cos(a) * 22 };
}

/** Raised front paws: small round paws in front of his body. */
function drawRaisedPaws(ctx, p) {
  if (p.feet === 'dangle') return;
  for (const side of [-1, 1]) {
    const a = pawRaise(side, p);
    if (a === null) continue;
    // Paws held in front of him stay close; raised ones reach out past his sides.
    const inFront = ['hold', 'hug', 'grip', 'sip'].includes(p.arms);
    const reach = inFront ? 9 : 13;
    ctx.save();
    const around = inFront && ['tea', 'mug', 'glass', 'pinecone'].includes(p.prop);
    const o = inFront ? { x: nearX(side, p) + (around ? side * 5 : 0), y: LEG_TOP - 4 } : pawPivot(side, p);
    ctx.translate(o.x, o.y);
    ctx.rotate(around ? side * 2.6 : a);
    ellipse(ctx, 0, reach, 7, 9.5);
    fillStroke(ctx, PALETTE.leg, 2.1);
    // A little pad line at the end of the paw.
    ctx.beginPath();
    ctx.arc(0, reach + 4, 3.2, Math.PI * 0.15, Math.PI * 0.85);
    ctx.strokeStyle = PALETTE.bodyShade;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
}

/** His leafy tail: a curled stem with a big leaf at the end, behind him. */
function drawTail(ctx, p, back) {
  const wag = Math.sin((p.t || 0) * 2) * 0.08;
  ctx.save();
  const s = back ? 1 : -p.facing;
  if (!back) {
    // From the front only the leaf peeks out low behind him.
    ctx.translate(s * (RX - 2), CY + RY - 12);
    ctx.rotate(s * 0.8 + wag);
    ctx.scale(0.62, 0.62);
    drawTailLeaf(ctx, s);
    ctx.restore();
    return;
  }
  ctx.translate(8, CY + RY - 6);
  ctx.rotate(wag);
  // The curl: down, round and up.
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.bezierCurveTo(-4, 6, 4, 14, 14, 12);
  ctx.bezierCurveTo(22, 10, 26, 2, 26, -6);
  ctx.lineWidth = 10;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineWidth = 6.5;
  ctx.strokeStyle = PALETTE.stem;
  ctx.stroke();
  ctx.translate(26, -6);
  ctx.rotate(0.75);
  drawTailLeaf(ctx, s);
  ctx.restore();
}

/** The leaf at the end of his tail, pointing up from (0, 0). */
function drawTailLeaf(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.bezierCurveTo(s * 17, -2, s * 19, -24, s * 6, -36);
  ctx.bezierCurveTo(s * -9, -24, s * -8, -5, 0, 2);
  ctx.closePath();
  fillStroke(ctx, PALETTE.leaf, 2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 6, -16, s * 6, -30);
  ctx.moveTo(s * 3, -12);
  ctx.lineTo(s * 9, -17);
  ctx.moveTo(s * 5, -20);
  ctx.lineTo(s * 1, -25);
  ctx.strokeStyle = PALETTE.leafDark;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawEye(ctx, x, y, side, p) {
  const eyes = p.blink ? 'closed' : p.eyes;
  const line = (draw) => {
    ctx.strokeStyle = PALETTE.eye;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    draw();
    ctx.stroke();
  };
  if (eyes === 'closed') return line(() => ctx.arc(x, y - 2, 6, Math.PI * 0.2, Math.PI * 0.8));
  if (eyes === 'happy') return line(() => ctx.arc(x, y + 3, 6, Math.PI * 1.15, Math.PI * 1.85));
  if (eyes === 'content') return line(() => ctx.arc(x, y - 2, 6, Math.PI * 0.2, Math.PI * 0.8));
  if (eyes === 'sparkle') {
    // Found something wonderful: big eyes with star glints.
    const r2 = 7.8;
    ellipse(ctx, x, y, r2, r2 * 1.32);
    ctx.fillStyle = PALETTE.eye;
    ctx.fill();
    ctx.fillStyle = PALETTE.white;
    drawStar(ctx, x + 1, y - 3.5, 3.6);
    ellipse(ctx, x - 2.5, y + 4, 1.4, 1.4);
    ctx.fill();
    return;
  }
  if (eyes === 'squint') {
    return line(() => {
      ctx.moveTo(x - side * 5, y - 5);
      ctx.lineTo(x + side * 4, y);
      ctx.lineTo(x - side * 5, y + 5);
    });
  }
  if (eyes === 'dizzy') {
    // Spirals: dizzy after being thrown.
    return line(() => {
      for (let i = 0; i <= 24; i++) {
        const a = i * 0.55 + (p.t || 0) * 4 * side;
        const rr = 0.4 + i * 0.27;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
    });
  }
  const r = eyes === 'small' ? 4.5 : eyes === 'wide' ? 8.2 : 7.2;
  const down = eyes === 'sad' || eyes === 'meh' || eyes === 'sleepy' ? 1.5 : 0;
  const px = x + (p.lookX || 0) * 2.5;
  const py = y + (p.lookY || 0) * 2.5 + down;
  ellipse(ctx, px, py, r, r * 1.32);
  ctx.fillStyle = PALETTE.eye;
  ctx.fill();
  ellipse(ctx, px + r * 0.12, py - r * 0.42, r * 0.36, r * 0.36);
  ctx.fillStyle = PALETTE.white;
  ctx.fill();
  // Eyelids: a slanted or flat lid of his skin over the top of the eye.
  const lid = {
    sad: [y - 12, y - 4], // [inner edge, outer edge]: inner corner up
    angry: [y - 3, y - 12], // inner corner down
    meh: [y - 2, y - 2],
    sleepy: [y + 1.5, y + 1.5],
  }[eyes];
  if (lid) {
    const inner = x - side * 11;
    const outer = x + side * 11;
    ctx.save();
    ellipse(ctx, px, py, r + 0.8, r * 1.32 + 0.8);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(inner, y - 16);
    ctx.lineTo(outer, y - 16);
    ctx.lineTo(outer, lid[1]);
    ctx.lineTo(inner, lid[0]);
    ctx.closePath();
    ctx.fillStyle = PALETTE.body;
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

function drawMouth(ctx, x, y, p) {
  ctx.strokeStyle = PALETTE.eye;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (p.mouth === 'open' || p.mouth === 'talk') {
    // His ":3" opened: a little round mouth under the curls.
    const open = p.mouth === 'talk' ? 1 + Math.abs(Math.sin(p.t * 12)) * 2.5 : 3.5;
    ctx.moveTo(x - 4.5, y - 1);
    ctx.quadraticCurveTo(x - 2.2, y + 3, x, y);
    ctx.quadraticCurveTo(x + 2.2, y + 3, x + 4.5, y - 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 2.6, y + 1.2);
    ctx.quadraticCurveTo(x, y + 2 + open * 1.4, x + 2.6, y + 1.2);
    ctx.quadraticCurveTo(x, y + 0.2, x - 2.6, y + 1.2);
    ctx.fillStyle = '#8a3b33';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.stroke();
    return;
  }
  if (p.mouth === 'o' || p.mouth === 'yawn') {
    ellipse(ctx, x, y + 1, p.mouth === 'yawn' ? 3.6 : 2.6, p.mouth === 'yawn' ? 6 : 3.2);
    ctx.fillStyle = '#8a3b33';
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (p.mouth === 'frown') {
    ctx.arc(x, y + 4, 4, Math.PI * 1.2, Math.PI * 1.8);
  } else if (p.mouth === 'flat') {
    ctx.moveTo(x - 3, y + 1);
    ctx.lineTo(x + 3, y + 1);
  } else if (p.mouth === 'growl') {
    // A small cross zigzag.
    ctx.moveTo(x - 5, y + 2);
    ctx.lineTo(x - 2.5, y);
    ctx.lineTo(x, y + 2);
    ctx.lineTo(x + 2.5, y);
    ctx.lineTo(x + 5, y + 2);
  } else if (p.mouth === 'wavy') {
    ctx.moveTo(x - 5, y + 1);
    ctx.quadraticCurveTo(x - 3.7, y - 1.5, x - 2.5, y + 1);
    ctx.quadraticCurveTo(x - 1.2, y + 3.5, x, y + 1);
    ctx.quadraticCurveTo(x + 1.2, y - 1.5, x + 2.5, y + 1);
    ctx.quadraticCurveTo(x + 3.7, y + 3.5, x + 5, y + 1);
  } else {
    // His ":3" mouth (smile and smallSmile alike).
    ctx.moveTo(x - 4.5, y - 1);
    ctx.quadraticCurveTo(x - 2.2, y + 3, x, y);
    ctx.quadraticCurveTo(x + 2.2, y + 3, x + 4.5, y - 1);
  }
  ctx.stroke();
}

function drawFace(ctx, p) {
  const fx = p.facing * p.turn * 7;
  ctx.save();
  ctx.translate(fx, 0);
  drawEye(ctx, -EYE_X, FACE_Y, -1, p);
  drawEye(ctx, EYE_X, FACE_Y, 1, p);
  // Rosy cheeks with a few faint freckles.
  const blush = p.blush != null ? p.blush : 0.4;
  for (const side of [-1, 1]) {
    ellipse(ctx, side * 28, FACE_Y + 12, 6.5, 4.5);
    ctx.fillStyle = PALETTE.cheek + (0.3 + 0.4 * blush) + ')';
    ctx.fill();
    ctx.fillStyle = PALETTE.freckle;
    ctx.globalAlpha = 0.6;
    for (const [dx, dy] of [[-3, -1], [0, 1.5], [3, -0.5]]) {
      ellipse(ctx, side * 28 + dx, FACE_Y + 12 + dy, 0.85, 0.85);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  drawMouth(ctx, 0, FACE_Y + 11, p);
  ctx.restore();
}

// ---------------------------------------------------------- his things

const THINGS = {
  autumn: ['#e39a45', '#cf7438', '#e7c45b', '#b9622f'],
  pot: '#d9773f',
  potDark: '#b65c2b',
  soil: '#6b4a2f',
  can: '#8fb0c4',
  kettle: '#7d9bb3',
  kettleDark: '#5f7d95',
  mug: '#f4ecd9',
  mugBand: '#9db63f',
  tea: '#9a6534',
  pond: '#a7d8ee',
  pondDark: '#72b6d6',
  stone: '#a3a7ab',
  cap: '#b9773f',
  redCap: '#d9534a',
  stalk: '#f3e7cf',
  glow: '#fff2a0',
};

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const rr = i % 2 ? r * 0.38 : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** Little golden sparkles around (x, y): something wonderful. */
function drawSparkles(ctx, x, y, t) {
  ctx.save();
  ctx.fillStyle = '#f2c94c';
  for (const [dx, dy, r, ph] of [[-10, -8, 4, 0], [9, -14, 3, 2], [12, 4, 2.6, 4]]) {
    const s2 = 0.6 + 0.4 * Math.abs(Math.sin(t * 4 + ph));
    drawStar(ctx, x + dx, y + dy, r * s2);
  }
  ctx.restore();
}

/** A leaf pointing up from (x, y). */
function drawLeaf(ctx, x, y, angle, size, fill, vein = PALETTE.leafDark) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.bezierCurveTo(13, -3, 14, -22, 1, -34);
  ctx.bezierCurveTo(-12, -22, -12, -3, 0, 2);
  ctx.closePath();
  fillStroke(ctx, fill, 2.2 / size);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.quadraticCurveTo(1.5, -14, 1, -29);
  ctx.strokeStyle = vein;
  ctx.lineWidth = 1.5 / size;
  ctx.stroke();
  ctx.restore();
}

/**
 * A big heap of autumn leaves on the floor at x: a soft mound with leaves
 * all over it, some sticking out. `rustle` 0..1 shakes the top (he's
 * rummaging in it).
 */
const HEAP = [
  // [dx, dy, angle, colour] back to front, bottom to top
  [-27, -3, -1.3, 3], [27, -3, 1.3, 1], [-20, -4, -0.9, 0], [20, -4, 1, 2], [-12, -3, -0.4, 1],
  [12, -3, 0.5, 3], [-3, -2, -0.1, 2], [5, -2, 0.2, 0], [-22, -10, -1.1, 2], [22, -10, 1, 0],
  [-14, -11, -0.6, 3], [14, -11, 0.7, 1], [-5, -10, -0.3, 0], [5, -11, 0.3, 2], [-17, -17, -0.8, 1],
  [17, -17, 0.8, 3], [-8, -18, -0.4, 2], [8, -19, 0.4, 0], [0, -17, 0, 3], [-11, -24, -0.5, 0],
  [10, -25, 0.5, 1], [-2, -26, -0.1, 2], [4, -30, 0.3, 3], [-5, -31, -0.3, 1],
];
/** One round autumn leaf of the heap, pointing up from (x, y). */
function heapLeaf(ctx, x, y, angle, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(8, 1, 8.5, -8, 0, -12.5);
  ctx.bezierCurveTo(-8.5, -8, -8, 1, 0, 3);
  ctx.closePath();
  fillStroke(ctx, fill, 1.4);
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, -9);
  ctx.strokeStyle = 'rgba(90, 45, 15, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
function drawLeafHeap(ctx, x, rustle, t) {
  ctx.save();
  ctx.translate(x, 0);
  // The mound under the leaves.
  ctx.beginPath();
  ctx.moveTo(-31, 0);
  ctx.bezierCurveTo(-30, -20, -14, -33, 0, -33);
  ctx.bezierCurveTo(14, -33, 30, -20, 31, 0);
  ctx.closePath();
  fillStroke(ctx, '#c4743a', 2.2);
  HEAP.forEach(([dx, dy, a, c], i) => {
    const shake = rustle && dy < -14 ? Math.sin(t * 22 + i) * 0.3 * rustle : 0;
    heapLeaf(ctx, dx, dy, a + shake, THINGS.autumn[c]);
  });
  ctx.restore();
}

/** A flower pot on the floor at x; `sprout` 0..1 grows a seedling. */
function drawPot(ctx, x, sprout) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(1.2, 1.2);
  if (sprout > 0) {
    ctx.save();
    ctx.translate(0, -19);
    ctx.scale(sprout, sprout);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-1, -6, 0, -11);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = PALETTE.leafDark;
    ctx.stroke();
    drawLeaf(ctx, 0, -10, -1.0, 0.28, PALETTE.leaf);
    drawLeaf(ctx, 0, -10, 1.0, 0.28, PALETTE.leaf);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.lineTo(10, -14);
  ctx.lineTo(8, 0);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  fillStroke(ctx, THINGS.pot, 2);
  ctx.beginPath();
  ctx.rect(-13, -20, 26, 7);
  fillStroke(ctx, THINGS.potDark, 2);
  ellipse(ctx, 0, -20, 11.5, 2.4);
  ctx.fillStyle = THINGS.soil;
  ctx.fill();
  ctx.restore();
}

/** A little watering can at (x, y), tipped toward `dir`, dripping when pouring. */
function drawCan(ctx, x, y, dir, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * 1.3, 1.3);
  ctx.rotate(0.45);
  ctx.beginPath();
  ctx.moveTo(6, -4);
  ctx.lineTo(19, -12);
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(-8, -8, 15, 13);
  fillStroke(ctx, THINGS.can, 2);
  ctx.beginPath();
  ctx.arc(-1, -8, 5, Math.PI, 0);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // Drops falling from the spout.
  ctx.fillStyle = THINGS.pondDark;
  for (let i = 0; i < 3; i++) {
    const u = ((t * 1.8 + i / 3) % 1);
    ellipse(ctx, x + dir * (24 + i * 2), y + 4 + u * 20, 1.4, 2.2);
    ctx.fill();
  }
}

/** A mushroom standing at (x, y): brown, or red with white spots. */
function drawMushroom(ctx, x, y, size, red) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.quadraticCurveTo(-5, -8, -3.5, -12);
  ctx.lineTo(3.5, -12);
  ctx.quadraticCurveTo(5, -8, 4, 0);
  ctx.closePath();
  fillStroke(ctx, THINGS.stalk, 2 / size);
  ctx.beginPath();
  ctx.moveTo(-12, -11);
  ctx.bezierCurveTo(-12, -24, 12, -24, 12, -11);
  ctx.quadraticCurveTo(0, -8, -12, -11);
  ctx.closePath();
  fillStroke(ctx, red ? THINGS.redCap : THINGS.cap, 2 / size);
  if (red) {
    ctx.fillStyle = '#ffffff';
    for (const [dx, dy, rr] of [[-5, -17, 2], [3, -19, 1.6], [7, -14, 1.5], [-8, -13, 1.2]]) {
      ellipse(ctx, dx, dy, rr, rr);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A group of mushrooms on the floor at x (`n` of 3 left), brown or red-spotted. */
function drawMushroomGroup(ctx, x, red, n) {
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(1.2, 1.2);
  // A tuft of grass behind them.
  ctx.strokeStyle = PALETTE.leafDark;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [dx, h, lean] of [[-14, 9, -0.4], [-10, 12, -0.1], [13, 10, 0.3], [9, 7, 0.1]]) {
    ctx.beginPath();
    ctx.moveTo(dx, 0);
    ctx.quadraticCurveTo(dx + lean * 4, -h / 2, dx + lean * 9, -h);
    ctx.stroke();
  }
  const group = [[-13, 0.7], [12, 0.78], [-1, 1.0]]; // the big one in front is picked first
  for (let i = 0; i < Math.min(n, 3); i++) drawMushroom(ctx, group[i][0], 0, group[i][1], red);
  ctx.restore();
}

/** His ridiculously big kettle on the floor at x, tipped toward `dir` by `tip` (0..1). */
function drawKettle(ctx, x, dir, tip) {
  ctx.save();
  ctx.translate(x - dir * 22, 0); // tips over its front edge
  ctx.rotate(-dir * 0.5 * tip);
  ctx.translate(dir * 22, 0);
  ctx.scale(dir * 1.3, 1.3);
  // Spout (pointing at him, toward -x in this frame).
  ctx.beginPath();
  ctx.moveTo(-14, -12);
  ctx.quadraticCurveTo(-24, -14, -28, -26);
  ctx.lineTo(-23, -27);
  ctx.quadraticCurveTo(-20, -19, -12, -20);
  ctx.closePath();
  fillStroke(ctx, THINGS.kettleDark, 2);
  // Handle.
  ctx.beginPath();
  ctx.moveTo(-10, -32);
  ctx.bezierCurveTo(-8, -48, 12, -48, 12, -30);
  ctx.lineWidth = 5;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = THINGS.kettleDark;
  ctx.stroke();
  // Body.
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.bezierCurveTo(-22, -10, -18, -32, 0, -33);
  ctx.bezierCurveTo(18, -32, 22, -10, 16, 0);
  ctx.closePath();
  fillStroke(ctx, THINGS.kettle, 2.2);
  ellipse(ctx, -6, -22, 4, 7, 0.4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ellipse(ctx, 0, -34, 4.5, 3);
  fillStroke(ctx, THINGS.kettleDark, 1.8);
  ctx.restore();
}

/** A small mug at (x, y), tilted by `tilt`; steam curls above it. */
function drawMug(ctx, x, y, tilt, t, steam = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(1.2, 1.2);
  if (steam) {
    ctx.strokeStyle = 'rgba(160, 160, 160, 0.7)';
    ctx.lineWidth = 1.6;
    for (const dx of [-3, 3]) {
      ctx.beginPath();
      const ph = t * 3 + dx;
      ctx.moveTo(dx, -10);
      ctx.bezierCurveTo(dx + Math.sin(ph) * 3, -15, dx - Math.sin(ph) * 3, -19, dx, -24);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.arc(8, -2, 4, -Math.PI / 2, Math.PI / 2);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(-7, -9, 15, 15);
  fillStroke(ctx, THINGS.mug, 2);
  ctx.fillStyle = THINGS.mugBand;
  ctx.fillRect(-6, -1, 13, 3);
  ellipse(ctx, 0.5, -9, 6.5, 1.6);
  ctx.fillStyle = THINGS.tea;
  ctx.fill();
  ctx.restore();
}

/** A little pond on the floor at x, with a splash and rings when a pebble lands (`ripple` 0..1). */
function drawPond(ctx, x, ripple) {
  ctx.save();
  ctx.translate(x, 0);
  // Reeds at the back.
  ctx.strokeStyle = PALETTE.leafDark;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [dx, h, lean] of [[16, 20, 0.15], [20, 15, 0.35], [12, 13, -0.1]]) {
    ctx.beginPath();
    ctx.moveTo(dx, -6);
    ctx.quadraticCurveTo(dx + lean * 6, -6 - h / 2, dx + lean * 12, -6 - h);
    ctx.stroke();
  }
  ellipse(ctx, 18.5, -24, 1.8, 4.5, 0.3);
  ctx.fillStyle = '#8a5a2b';
  ctx.fill();
  // The water: a darker rim, lighter in the middle.
  ellipse(ctx, 0, -4, 27, 7.5);
  fillStroke(ctx, THINGS.pondDark, 2);
  ellipse(ctx, -2, -4.5, 21, 5);
  ctx.fillStyle = THINGS.pond;
  ctx.fill();
  ellipse(ctx, -9, -5.5, 6, 1.2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  // A lily pad.
  ctx.beginPath();
  ctx.ellipse(-15, -3.5, 5.5, 2, 0, 0.35, TAU - 0.35);
  ctx.lineTo(-15, -3.5);
  ctx.closePath();
  fillStroke(ctx, PALETTE.leaf, 1.4);
  if (ripple > 0 && ripple < 1) {
    // Rings spreading out.
    ctx.save();
    ctx.globalAlpha = 1 - ripple;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    for (const k of [1, 0.55]) {
      ellipse(ctx, 4, -4.5, 3 + ripple * 15 * k, 0.8 + ripple * 3.6 * k);
      ctx.stroke();
    }
    ctx.restore();
    // The splash: a few drops thrown up.
    if (ripple < 0.45) {
      const u = ripple / 0.45;
      ctx.fillStyle = THINGS.pondDark;
      for (const [vx, vy] of [[-7, 16], [0, 21], [7, 15], [-3, 11], [4, 12]]) {
        ellipse(ctx, 4 + vx * u, -5 - (vy * u - 14 * u * u), 1.6, 2.1);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** A smooth, flat river pebble at (x, y): grey, shaded, with a shine. */
function drawPebble(ctx, x, y, size = 1, rot = 0, tone = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size, size);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-6.5, 0.5);
    ctx.bezierCurveTo(-7, -3.5, -2.5, -4.6, 1.5, -4.2);
    ctx.bezierCurveTo(5.5, -3.8, 7.2, -1.5, 6.6, 1);
    ctx.bezierCurveTo(6, 3.6, 2, 4.2, -1.5, 3.9);
    ctx.bezierCurveTo(-4.8, 3.6, -6.2, 2.6, -6.5, 0.5);
    ctx.closePath();
  };
  const base = ['#a4a9ad', '#b3aa9c', '#8f979c'][tone % 3];
  shape();
  const g = ctx.createLinearGradient(0, -4.5, 0, 4.5);
  g.addColorStop(0, '#d5d9dc');
  g.addColorStop(0.45, base);
  g.addColorStop(1, '#6f767b');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1.6 / size;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  // A shine and a couple of specks.
  ellipse(ctx, -2, -2.4, 2.4, 0.9, -0.15);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
  ctx.fillStyle = 'rgba(70, 70, 70, 0.45)';
  for (const [dx, dy] of [[2.5, 1.2], [-3.2, 1.6], [4, -1]]) {
    ellipse(ctx, dx, dy, 0.55, 0.55);
    ctx.fill();
  }
  ctx.restore();
}

/** His little stack of pebbles to throw, on the floor at x. */
function drawPebbles(ctx, x, n) {
  const spots = [[-6, -3.5, 1.2, 0.1, 0], [6, -3.5, 1.1, -0.2, 1], [0, -9.5, 1.05, 0.15, 2]];
  for (let i = 0; i < Math.min(n, spots.length); i++) {
    const [dx, dy, sz, r, tone] = spots[i];
    drawPebble(ctx, x + dx, dy, sz, r, tone);
  }
}

/** Fireflies drifting around him, glowing. */
function drawFireflies(ctx, t) {
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const a = t * (0.25 + i * 0.04) + i * 0.9;
    const x = Math.cos(a) * (52 + (i % 3) * 9) + Math.sin(t * 0.7 + i) * 6;
    const y = CY - 10 + Math.sin(a * 1.3 + i) * 42;
    const on = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.4 + i * 1.7));
    const g = ctx.createRadialGradient(x, y, 0, x, y, 15);
    g.addColorStop(0, `rgba(255, 205, 40, ${0.9 * on})`);
    g.addColorStop(0.45, `rgba(255, 215, 60, ${0.4 * on})`);
    g.addColorStop(1, 'rgba(255, 215, 60, 0)');
    ctx.fillStyle = g;
    ellipse(ctx, x, y, 15, 15);
    ctx.fill();
    // The firefly: a tiny dark body with a glowing tail.
    ellipse(ctx, x - 2, y - 1.5, 1.8, 1.4);
    ctx.fillStyle = 'rgba(70, 55, 35, 0.9)';
    ctx.fill();
    ellipse(ctx, x + 0.5, y + 0.5, 3, 3);
    ctx.fillStyle = `rgba(255, 228, 80, ${0.7 + 0.3 * on})`;
    ctx.fill();
  }
  ctx.restore();
}

/** "plop." in small letters. */
function drawWord(ctx, word, x, y) {
  ctx.save();
  ctx.font = 'italic 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.outline;
  ctx.fillText(word, x, y);
  ctx.restore();
}

/** A glass of water at (x, y), `level` 0..1 full, tilted by `tilt`. */
function drawGlass(ctx, x, y, level, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-9, -15);
    ctx.lineTo(9, -15);
    ctx.lineTo(7, 10);
    ctx.quadraticCurveTo(0, 12.5, -7, 10);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = 'rgba(225, 243, 252, 0.85)';
  ctx.fill();
  if (level > 0.02) {
    ctx.save();
    path();
    ctx.clip();
    const wy = 10 - 25 * Math.min(1, level);
    ctx.fillStyle = '#8fcdf0';
    ctx.fillRect(-11, wy, 22, 14 - wy + 3);
    ctx.restore();
  }
  path();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.restore();
}

/** A pinecone (his fetch toy) at (x, y), turned by `rot`, about `r` across the middle. */
function drawPinecone(ctx, x, y, rot, r = 12) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const k = r / 12;
  ctx.scale(k, k);
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.bezierCurveTo(9, -14, 11, 2, 0, 15);
  ctx.bezierCurveTo(-11, 2, -9, -14, 0, -15);
  ctx.closePath();
  fillStroke(ctx, '#9c6a3a', 2 / k);
  // Rows of scales.
  ctx.strokeStyle = '#6e4622';
  ctx.lineWidth = 1.3 / k;
  for (let row = 0; row < 5; row++) {
    const yy = -10 + row * 5.2;
    const w = 7.5 - Math.abs(row - 1.6) * 1.4;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * w * 0.6 + (row % 2 ? w * 0.3 : 0), yy, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }
  // A little stalk on top.
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(1.5, -19);
  ctx.lineWidth = 2.2 / k;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.restore();
}

/** Steam rising beside his head: his mug of tea, seen from behind while he watches. */
function drawSteam(ctx, x, y, t) {
  ctx.save();
  ctx.strokeStyle = 'rgba(160, 160, 160, 0.75)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const dx of [-3, 3]) {
    const ph = t * 2.5 + dx;
    ctx.beginPath();
    ctx.moveTo(x + dx, y);
    ctx.bezierCurveTo(x + dx + Math.sin(ph) * 3.5, y - 7, x + dx - Math.sin(ph) * 3.5, y - 13, x + dx, y - 20);
    ctx.stroke();
  }
  ctx.restore();
}

/** What he holds (drawn before his paws, so his paws hold it). */
function drawHeld(ctx, p) {
  const fx = p.facing * p.turn * 7;
  const side = p.facing;
  if (p.prop === 'leaves' && p.leaf === 'inspect') {
    const tip = pawTip(side, p);
    drawLeaf(ctx, tip.x, tip.y - 2, side * 0.2, 0.7, PALETTE.leaf);
    drawSparkles(ctx, tip.x + side * 6, tip.y - 22, p.t);
  }
  if (p.prop === 'pot' && p.arms === 'pour') {
    const tip = pawTip(side, p);
    drawCan(ctx, tip.x, tip.y, side, p.t);
  }
  if ((p.prop === 'tea' || p.prop === 'mug') && p.arms === 'sip') {
    const lift = p.mugLift || 0;
    drawMug(ctx, fx * 0.5 + side * 2 * lift, -36 - 9 * lift, -side * 0.35 * lift, p.t, lift < 0.5);
  }
  if (p.prop === 'stones' && p.arms === 'throwBack') {
    const tip = pawTip(side, p);
    drawPebble(ctx, tip.x, tip.y - 4, 1.1, 0.3);
  }
  if (p.prop === 'glass') {
    const lift = p.glassLift || 0;
    drawGlass(ctx, fx * 0.5 + side * 2 * lift, -36 - 10 * lift, p.propProgress, -side * 0.4 * lift);
  }
  if (p.prop === 'pinecone') drawPinecone(ctx, fx * 0.5, -38, 0.2, 11);
  if (p.prop === 'mushroomFound' && p.holding) {
    const tip = pawTip(side, p);
    drawMushroom(ctx, tip.x, tip.y - 2, 0.85, false);
    if (p.eyes === 'sparkle') drawSparkles(ctx, tip.x, tip.y - 24, p.t);
  }
}

/** Things on the floor beside him. */
function drawGround(ctx, p) {
  const side = p.facing;
  switch (p.prop) {
    case 'leaves':
      drawLeafHeap(ctx, side * 50, p.rustle || 0, p.t);
      if (p.leaf === 'pop') drawLeaf(ctx, side * 46, -40 - Math.sin(p.t * 3) * 3, side * (0.4 + Math.sin(p.t * 5) * 0.3), 0.6, PALETTE.leaf);
      break;
    case 'pot':
      drawPot(ctx, side * 58, p.sprout || 0);
      break;
    case 'mushrooms':
      // Somewhere ahead of him: they come into view as he gets close.
      if (p.ahead != null && Math.abs(p.ahead) < 140) drawMushroomGroup(ctx, p.ahead + side * 50, p.variant === 'spotted', 3);
      break;
    case 'mushroomFound':
      drawMushroomGroup(ctx, side * 50, p.variant === 'spotted', p.holding ? 2 : 3);
      break;
    case 'tea':
      drawKettle(ctx, side * 62, side, p.kettleTip || 0);
      if (p.arms !== 'sip') drawMug(ctx, side * 30, -7, 0, p.t, p.kettleTip > 0.5);
      break;
    case 'stones': {
      const px = side * 56;
      drawPond(ctx, px, p.ripple || 0);
      drawPebbles(ctx, -side * 34, 3);
      if (p.pebble != null) {
        const tip = pawTip(side, { ...p, arms: 'throw' });
        const u = p.pebble;
        const tx = px + side * 4;
        drawPebble(ctx, tip.x + (tx - tip.x) * u, tip.y + (-5 - tip.y) * u - Math.sin(u * Math.PI) * 26, 1.1, u * 9 * side);
      }
      if (p.ripple > 0 && p.ripple < 0.8) drawWord(ctx, 'plop.', px + side * 4, -24 - p.ripple * 6);
      break;
    }
    case 'fireflies':
      drawFireflies(ctx, p.t);
      break;
    case 'distractLeaf':
      drawLeaf(ctx, side * 34, -1, side * 1.45, 0.55, THINGS.autumn[0], 'rgba(90, 50, 20, 0.5)');
      break;
  }
}

/**
 * Draw Mori.
 * @param {CanvasRenderingContext2D} ctx already translated so (0,0) = feet
 * @param {object} p pose, see `defaultPose`
 */
function drawCharacter(ctx, p) {
  ctx.save();
  ctx.rotate(p.tilt);
  ctx.translate(0, p.bob);
  ctx.scale(p.scaleX, p.scaleY);
  const back = p.view === 'back';
  const lying = p.view === 'lying';
  if (lying) {
    // Asleep: curled up under his moss cap, legs tucked in, ears down, the
    // moss pulled low over his closed eyes.
    p = { ...p, view: 'front', turn: 0, arms: 'down', eyes: 'closed', mouth: 'smile', earDroop: 0.8, mossDown: 1 };
    ctx.scale(1.12, 0.8);
    ctx.translate(0, 15);
  }
  const drop = p.feet === 'sit' ? 7 : 0;

  if (!back) drawTail(ctx, p, back);
  if (!lying) drawLegs(ctx, p, drop);
  ctx.translate(0, drop);
  drawEar(ctx, -1, p, back);
  drawEar(ctx, 1, p, back);
  drawSprout(ctx, -1, p);
  drawSprout(ctx, 1, p);
  bodyPath(ctx);
  fillStroke(ctx, PALETTE.body, 2.4);
  // A soft shade under his belly.
  ctx.save();
  bodyPath(ctx);
  ctx.clip();
  ellipse(ctx, 0, CY + RY + 4, RX + 8, 18);
  ctx.fillStyle = PALETTE.bodyShade;
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.restore();
  if (back) {
    drawMoss(ctx, p, back);
    drawTail(ctx, p, back);
    if (p.hat) drawMushroom(ctx, 6, CY - RY - 2, 0.9, false);
    // Watching with his mug of tea (in front of him): its steam rises beside his head.
    if (p.watchMug) drawSteam(ctx, p.facing * 30, CY - RY + 14, p.t);
  } else {
    drawFace(ctx, p);
    // The moss after the face, so it can come down over his eyes (asleep).
    ctx.save();
    if (p.mossDown) {
      const top = CY - RY - 5;
      ctx.translate(0, top);
      ctx.scale(1 + 0.04 * p.mossDown, 1 + 0.32 * p.mossDown);
      ctx.translate(0, -top);
    }
    drawMoss(ctx, p, back);
    ctx.restore();
    // A leaf on his head (he's proud of it).
    if (p.leaf === 'head') drawLeaf(ctx, -8, CY - RY + 2, -1.1, 0.65, PALETTE.leaf);
    // Just beat you at tic-tac-toe: no loud celebration, just a mushroom on his head.
    if (p.hat) drawMushroom(ctx, 6, CY - RY - 2, 0.9, false);
    drawHeld(ctx, p);
    if (p.arms === 'item' && p.feet !== 'dangle') {
      const tip = pawTip(-1, p);
      drawItem(ctx, p, tip.x, tip.y, itemArm(p));
    }
    drawRaisedPaws(ctx, p);
    // Hugging his leaf: held against him, over his paws.
    if (p.prop === 'leaves' && p.leaf === 'hug') drawLeaf(ctx, p.facing * p.turn * 3 - p.facing * 3, -30, p.facing * 0.5, 0.9, PALETTE.leaf);
    ctx.save();
    ctx.translate(0, -drop); // back down to the floor
    drawGround(ctx, p);
    ctx.restore();
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
    blush: 0.4,
    prop: null,
    flowers: 0,
    earDroop: 0,
    mossDown: 0,
    item: null, // what's in the hand for arms 'item': { img, w, h } (see itemArm)
    itemWave: 0,
  };
}

/** His own take on shared states and moods. */
function restyle(state, p, f) {
  // He never gets angry: cross moods look tired and a little sad instead.
  if (p.eyes === 'angry') p.eyes = 'meh';
  if (p.mouth === 'growl') p.mouth = 'frown';
  if (p.arms === 'fists') p.arms = 'down';
  // Sitting with you while you watch something: with his mug of tea.
  if (state === 'backView' && f.watching) p.watchMug = true;
  // Just won tic-tac-toe.
  if (f.wonGame) p.hat = true;
  // Happy: tiny flowers bloom on his moss; a few smaller ones while he's cheerful.
  if (state === 'happy') p.flowers = 1;
  else if (f.band === 'cheerful') p.flowers = 0.75;
  // Sad: his ears hang.
  if (state === 'sad' || (f.band === 'sad' && state !== 'happy')) p.earDroop = 1;
  // Sleepy: ears down a little, his moss slipping over his eyes.
  if (p.eyes === 'sleepy') {
    p.earDroop = Math.max(p.earDroop, 0.5);
    p.mossDown = 0.25;
  }
}

const ACTIVITY_POSES = {
  // Collecting leaves: looks over his big heap, rummages in it, pulls out
  // a nice leaf and inspects it, then hugs it (or proudly wears it).
  leaves(p, f, k) {
    const u = k.st / k.duration;
    p.prop = 'leaves';
    if (u < 0.22) {
      p.leaf = 'heap';
      p.lookX = f.facing;
      p.lookY = 0.6;
      p.tilt = f.facing * 0.05;
      p.mouth = 'smile';
    } else if (u < 0.4) {
      // Rummaging: a paw in the heap, the top rustling, a leaf popping up.
      p.leaf = u > 0.32 ? 'pop' : 'heap';
      p.arms = 'dig';
      p.rustle = 1;
      p.lookX = f.facing;
      p.lookY = 0.5;
      p.tilt = f.facing * 0.1;
      p.mouth = 'flat';
    } else if (u < 0.65) {
      p.leaf = 'inspect';
      p.arms = 'inspect';
      p.eyes = 'wide';
      p.mouth = 'o';
      p.lookX = f.facing;
      p.lookY = -0.5;
    } else if (f.variant === 'onHead') {
      p.leaf = 'head';
      p.eyes = 'happy';
      p.mouth = 'open';
      p.blush = 0.9;
    } else {
      p.leaf = 'hug';
      p.arms = 'hug';
      p.eyes = 'content';
      p.mouth = 'smile';
      p.blush = 1;
      p.tilt = Math.sin(k.t * 2) * 0.05;
    }
  },
  // Planting a seed: digs, waters, waits... and it sprouts, or nothing
  // happens and he looks at you.
  plant(p, f, k) {
    const u = k.st / k.duration;
    p.prop = 'pot';
    p.lookX = f.facing * 0.8;
    p.lookY = 0.7;
    if (u < 0.3) {
      p.arms = 'dig';
      p.mouth = 'flat';
      p.tilt = f.facing * 0.08;
    } else if (u < 0.5) {
      p.arms = 'pour';
      p.mouth = 'smile';
    } else if (u < 0.78) {
      p.feet = 'sit';
      p.mouth = 'flat';
    } else if (f.variant === 'sprouts') {
      p.feet = 'sit';
      p.sprout = Math.min(1, (u - 0.78) / 0.08);
      p.eyes = 'sparkle';
      p.mouth = 'open';
      p.blush = 0.9;
    } else {
      // Nothing. He stares at it, then at you.
      p.feet = 'sit';
      p.eyes = 'meh';
      p.mouth = 'flat';
      if (u > 0.88) {
        p.lookX = 0;
        p.lookY = 0;
      }
    }
  },
  // Mushroom hunting: a slow walk, nose down, to a group of mushrooms
  // somewhere ahead (a random distance away; they come into view as he
  // gets close). Then mushroomFound.
  mushrooms(p, f, k) {
    k.walkCycle(p, f, 7, 4);
    p.prop = 'mushrooms';
    p.variant = f.variant;
    p.ahead = f.ahead != null ? f.ahead / k.size : null;
    p.lookX = f.facing * (0.6 + Math.sin(k.t * 1.3) * 0.4);
    p.lookY = 0.8;
    p.mouth = 'flat';
    if (p.ahead != null && Math.abs(p.ahead) < 70) {
      // There they are!
      p.eyes = 'wide';
      p.mouth = 'o';
    }
  },
  // Found them: freeze, sparkly eyes, pick one and a tiny dance with it.
  // (Red spotted ones: he backs off. Not those.)
  mushroomFound(p, f, k) {
    const u = k.st / k.duration;
    p.prop = 'mushroomFound';
    p.variant = f.variant;
    p.lookX = f.facing;
    p.lookY = 0.6;
    if (u < 0.2) {
      p.eyes = 'wide';
      p.mouth = 'o';
      p.blink = 0;
    } else if (f.variant === 'spotted') {
      p.eyes = 'wide';
      p.mouth = 'wavy';
      p.tilt = -f.facing * 0.12;
      k.overlay('sweat');
    } else if (u < 0.4) {
      // Reaching down to pick the big one.
      p.arms = 'dig';
      p.eyes = 'sparkle';
      p.mouth = 'smile';
      p.tilt = f.facing * 0.1;
    } else {
      p.holding = true;
      p.arms = 'inspect';
      p.eyes = u < 0.6 ? 'sparkle' : 'happy';
      p.mouth = 'open';
      p.blush = 1;
      if (u >= 0.6) {
        p.bob = -Math.abs(Math.sin(k.t * 10)) * 4;
        p.tilt = Math.sin(k.t * 10) * 0.08;
        p.stepHeight = 4;
        p.walkPhase = k.t * 10;
      }
    }
  },
  // Making tea (fixes hunger): wrestling his huge kettle to pour, then
  // sitting with his mug in both paws, sipping.
  tea(p, f, k) {
    const u = k.st / k.duration;
    p.prop = 'tea';
    if (u < 0.35) {
      p.arms = 'push';
      p.kettleTip = Math.min(1, u / 0.12);
      p.eyes = 'squint';
      p.mouth = 'wavy';
      p.tilt = f.facing * 0.1;
      k.overlay('sweat');
    } else {
      p.feet = 'sit';
      p.arms = 'sip';
      const c = (k.st % 4) / 4;
      p.mugLift = c > 0.7 ? Math.sin(((c - 0.7) / 0.3) * Math.PI) : 0;
      p.eyes = 'content';
      p.mouth = 'smile';
      p.blush = 0.7;
    }
  },
  // Skipping stones: a dramatic wind-up, a throw... plop. Disappointed. Again.
  stones(p, f, k) {
    const c = k.st % 4.4;
    p.prop = 'stones';
    p.lookX = f.facing;
    if (c < 1.1) {
      p.arms = 'throwBack';
      p.mouth = 'flat';
      p.lookY = 0;
      p.tilt = -f.facing * 0.1;
    } else if (c < 1.6) {
      p.arms = 'throw';
      p.pebble = (c - 1.1) / 0.5;
      p.eyes = 'wide';
      p.mouth = 'o';
      p.tilt = f.facing * 0.08;
    } else {
      p.ripple = Math.min(1, (c - 1.6) / 1.2);
      p.lookY = 0.6;
      p.eyes = c < 2.4 ? 'open' : 'meh';
      p.mouth = 'flat';
      if (c >= 2.4) p.earDroop = 0.45;
    }
  },
  // Watching fireflies (only at night): sitting quietly while they drift
  // around him.
  fireflies(p, f, k) {
    p.prop = 'fireflies';
    p.feet = 'sit';
    p.eyes = Math.sin(k.t * 0.5) > 0.6 ? 'content' : 'open';
    p.mouth = 'smile';
    p.blush = 0.6;
    p.lookX = Math.sin(k.t * 0.4) * 0.8;
    p.lookY = -0.5;
    p.tilt = Math.sin(k.t * 0.6) * 0.03;
  },
  // Holding up "Please don't." (the sign itself is drawn by the renderer).
  pleaseDont(p, f, k) {
    p.arms = 'up';
    p.eyes = 'meh';
    p.mouth = 'flat';
    p.earDroop = 0.3;
    p.blush = 0.3;
  },
  // On the way to the pinecone: oh, a leaf.
  leafDistract(p, f, k) {
    p.prop = 'distractLeaf';
    p.eyes = k.st < 0.5 ? 'wide' : 'sparkle';
    p.mouth = 'o';
    p.lookX = f.facing;
    p.lookY = 0.9;
    p.tilt = f.facing * 0.1;
  },
  // After a throw: dizzy, swaying, blinking slowly.
  dizzy(p, f, k) {
    p.eyes = k.st % 3 > 2.4 ? 'closed' : 'dizzy';
    p.blink = 0;
    p.mouth = 'wavy';
    p.tilt = Math.sin(k.t * 2.2) * 0.09;
    p.earDroop = 0.4;
    k.overlay('scribble');
  },
};

/**
 * Watching something with you, his reaction to a moment (Phase 9): sitting
 * with his mug of tea. Leans in when it's exciting, ears droop at sad
 * scenes, flowers at beautiful ones; at scary ones he ducks under his moss
 * (pretending he isn't scared); bored, he turns round and sips his tea.
 */
function watchPose(mood, p, f, k) {
  p.feet = 'sit';
  p.view = 'back';
  p.watchMug = true;
  switch (mood) {
    case 'exciting':
      p.scaleY *= 1.04;
      p.bob = -Math.abs(Math.sin(k.t * 9)) * 2;
      break;
    case 'funny':
      p.tilt = Math.sin(k.t * 14) * 0.06;
      break;
    case 'beautiful':
      p.flowers = 1;
      p.tilt = Math.sin(k.t * 1.5) * 0.04;
      break;
    case 'sad':
      p.earDroop = 1;
      break;
    case 'scary':
      p.view = 'front';
      p.watchMug = false;
      p.mossDown = 0.8;
      p.eyes = 'wide';
      p.mouth = 'flat';
      p.scaleY *= 0.92;
      p.tilt = Math.sin(k.t * 30) * 0.015;
      k.overlay('sweat');
      break;
    case 'boring':
      p.view = 'front';
      p.watchMug = false;
      p.prop = 'mug';
      p.arms = 'sip';
      p.mugLift = Math.max(0, Math.sin(k.t * 1.6));
      p.eyes = 'meh';
      p.mouth = 'flat';
      break;
    default:
  }
}

window.Characters = window.Characters || {};
window.Characters.mori = Object.assign(window.Characters.mori || {}, {
  draw: drawCharacter,
  defaultPose,
  BODY_CY: CY,
  HEAD_TOP: CY - RY - 30,
  turned: { leaves: 0.4, plant: 0.5, mushrooms: 1, mushroomFound: 0.5, tea: 0.4, stones: 0.6 },
  activityPose: ACTIVITY_POSES,
  restyle,
  watchPose,
  // What he holds while carrying the fetch pinecone back to you.
  heldProp: 'pinecone',
  drawFetchItem: drawPinecone,
});
})();
