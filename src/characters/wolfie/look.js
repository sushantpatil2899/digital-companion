'use strict';

// How Wolfie looks (SBU Hacks, 2026-10-24): drawing code for every basic
// pose, his college activities, his watching reactions and the football he
// fetches. Stony Brook's Seawolf, as on the team's sheet: charcoal and
// light-grey fur, a big head seen from the side (facing the way he walks)
// with a white muzzle and a big toothy grin, a red-and-black eye, big pointed
// ears poking up through his red Stony Brook cap; muscular arms and legs; a
// broad red "STONY BROOK 1" jersey with short sleeves and red shorts, a
// fluffy tail. A little taller than the others (his ears). Coordinates: his
// feet at (0, 0), up is negative. Registers window.Characters.wolfie.

(function () {
const PALETTE = {
  outline: '#26272c',
  fur: '#55585f', // charcoal
  furDark: '#3c3e44',
  furLight: '#a8adb4', // light-grey fluff
  muzzle: '#f4f1ea',
  nose: '#1d1d21',
  red: '#d0112b', // Stony Brook red
  redDark: '#9e0c20',
  white: '#ffffff',
  iris: '#c8102e',
  mouth: '#7a1420',
  tongue: '#e8737f',
  paw: '#34363c',
  cheek: 'rgba(255, 140, 140, ',
  crust: '#d99b4e',
  cheese: '#f7cf55',
  pepperoni: '#c0392b',
  navy: '#26334f',
  book: '#2f5d9a',
  highlighter: '#f4e04d',
  laptop: '#9aa2ab',
  screen: '#cfe6ff',
  football: '#8a4a25',
};

const TAU = Math.PI * 2;
const FOOT_Y = -5;
const SHORTS_BOTTOM = -28;
const SHORTS_TOP = -48;
const JERSEY_TOP = -88;
const HEAD_CY = -100; // his head's origin (side view, drawn facing right, mirrored for left)
const HEAD_S = 1.15; // his head is drawn this much bigger than its coordinates
const EAR_TOP = -42.5; // his ear tips, in head coordinates
const EYE_Y = HEAD_CY - 8;
const MUZZLE_Y = HEAD_CY + 7;
const SHOULDER_X = 32;
const SHOULDER_Y = -79;
const SIT_DROP = 12;
const CY = -64; // centre of his body

function fillStroke(ctx, fill, lineWidth = 2.2) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

function line(ctx, x1, y1, x2, y2, width, color = PALETTE.outline) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

const fx = (p) => (p.facing || 1) * (p.turn || 0) * 6;
const happyish = (p) => p.eyes === 'happy' || p.arms === 'cheer' || p.arms === 'fists';

// --------------------------------------------------------------- body parts

/** His fluffy tail, behind him on the side away from where he faces; wags when he's happy. */
function drawTail(ctx, p, back) {
  const s = back ? 1 : -(p.facing || 1);
  const wag = happyish(p) || p.tailWag ? Math.sin(p.t * 12) * 0.35 : Math.sin(p.t * 1.5) * 0.06;
  ctx.save();
  ctx.translate(s * 16, -36);
  ctx.rotate(s * (0.9 + wag));
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-14, -26, 0, -44);
  ctx.quadraticCurveTo(14, -26, 6, 0);
  ctx.closePath();
  fillStroke(ctx, PALETTE.fur, 2.2);
  ctx.beginPath();
  ctx.moveTo(-5, -30);
  ctx.quadraticCurveTo(0, -46, 5, -30);
  ctx.quadraticCurveTo(0, -34, -5, -30);
  ctx.fillStyle = PALETTE.furLight;
  ctx.fill();
  ctx.restore();
}

/**
 * A thick furry limb along `points` ([x, y, width] each): drawn as one shape
 * (the outline pass, then the fur), so the joints are smooth.
 */
function furLimb(ctx, points, bulges = []) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [pass, extra] of [[PALETTE.outline, 4.4], [PALETTE.fur, 0]]) {
    ctx.strokeStyle = pass;
    ctx.fillStyle = pass;
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1, w] = points[i];
      const [x2, y2] = points[i + 1];
      ctx.lineWidth = w + extra;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    for (const [x, y, rx, ry, rot] of bulges) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx + extra / 2, ry + extra / 2, rot, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A tuft of light-grey fur: a few short strokes at (x, y), pointing `dir`. */
function furTuft(ctx, x, y, dir, size = 5) {
  ctx.save();
  ctx.strokeStyle = PALETTE.furLight;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const a = dir + i * 0.45;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5);
    ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size);
    ctx.stroke();
  }
  ctx.restore();
}

/** A big foot (sneaker-paw), toes towards `facing`. */
function drawFoot(ctx, x, y, facing) {
  ellipse(ctx, x + facing * 4, y, 15, 7.5);
  fillStroke(ctx, PALETTE.paw, 2.2);
  ellipse(ctx, x + facing * 11, y - 1, 5.5, 4.5);
  ctx.fillStyle = PALETTE.furDark;
  ctx.fill();
  line(ctx, x - 9 + facing * 4, y + 3.5, x + 9 + facing * 4, y + 3.5, 1.6, PALETTE.red);
}

/** Thick furry legs and big feet: standing, sitting (feet forward) or dangling. */
function drawLegs(ctx, p) {
  const sit = p.feet === 'sit';
  const dangle = p.feet === 'dangle';
  const facing = p.facing || 1;
  for (const s of [-1, 1]) {
    const step = Math.sin((p.walkPhase || 0) + (s > 0 ? 0 : Math.PI)) * (p.stepHeight || 0) * 0.6;
    const x = s * 15;
    if (sit) {
      furLimb(ctx, [[x, SHORTS_BOTTOM - 2, 22], [x + facing * 6, FOOT_Y - 4, 20]]);
      furTuft(ctx, x + facing * 6 - s * 9, FOOT_Y - 6, Math.PI / 2 + s * 0.6);
      drawFoot(ctx, x + facing * 8, FOOT_Y + 2, facing);
      continue;
    }
    const footY = FOOT_Y + (dangle ? 8 : 0) - Math.max(0, step);
    // Thigh, knee, shin: a little bend and a fuller calf.
    furLimb(ctx, [[x, SHORTS_BOTTOM - 3, 22], [x - facing * 1.5, (SHORTS_BOTTOM + footY) / 2, 19], [x, footY - 5, 18]], [[x + facing * 2.5, (SHORTS_BOTTOM + footY) / 2 + 2, 10.5, 7, Math.PI / 2]]);
    furTuft(ctx, x - s * 9, footY - 6, Math.PI / 2 + s * 0.7);
    furTuft(ctx, x + s * 9, footY - 6, Math.PI / 2 - s * 0.7);
    drawFoot(ctx, x, footY, facing);
  }
}

function drawShorts(ctx, p, back) {
  ctx.beginPath();
  ctx.moveTo(-27, SHORTS_TOP);
  ctx.lineTo(27, SHORTS_TOP);
  ctx.lineTo(33, SHORTS_BOTTOM);
  ctx.lineTo(4, SHORTS_BOTTOM);
  ctx.lineTo(0, SHORTS_BOTTOM - 6);
  ctx.lineTo(-4, SHORTS_BOTTOM);
  ctx.lineTo(-33, SHORTS_BOTTOM);
  ctx.closePath();
  fillStroke(ctx, PALETTE.red, 2.2);
  if (!back) {
    // The white drawstring.
    line(ctx, -2, SHORTS_TOP + 2, -4, SHORTS_TOP + 11, 1.3, PALETTE.white);
    line(ctx, 2, SHORTS_TOP + 2, 4, SHORTS_TOP + 11, 1.3, PALETTE.white);
  }
}

/**
 * His jersey, a broad T-shirt for his big arms (the sleeves are drawn with
 * each arm, so they move with it): "STONY BROOK" and a big 1 on the front, a
 * big 1 on the back.
 */
function drawJersey(ctx, p, back) {
  ctx.beginPath();
  ctx.moveTo(-12, JERSEY_TOP);
  ctx.lineTo(12, JERSEY_TOP);
  ctx.lineTo(25, JERSEY_TOP + 3);
  ctx.quadraticCurveTo(34, JERSEY_TOP + 5, 33, JERSEY_TOP + 15); // a broad, round shoulder
  ctx.lineTo(31, SHORTS_TOP + 5);
  ctx.lineTo(-31, SHORTS_TOP + 5);
  ctx.lineTo(-33, JERSEY_TOP + 15);
  ctx.quadraticCurveTo(-34, JERSEY_TOP + 5, -25, JERSEY_TOP + 3);
  ctx.closePath();
  fillStroke(ctx, PALETTE.red, 2.4);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.redDark;
  ctx.fillStyle = PALETTE.white;
  const x = back ? 0 : fx(p) * 0.6;
  if (!back) {
    ctx.font = 'bold 7px system-ui, sans-serif';
    ctx.fillText('STONY BROOK', x, JERSEY_TOP + 17, 40);
  }
  ctx.font = `bold ${back ? 25 : 22}px system-ui, sans-serif`;
  ctx.lineWidth = 2;
  ctx.strokeText('1', x, JERSEY_TOP + (back ? 31 : 33));
  ctx.fillText('1', x, JERSEY_TOP + (back ? 31 : 33));
  ctx.restore();
}

// --------------------------------------------------------------- head

/** A big pointed ear (head frame, facing right), tipped back a little; `droop` 0..1 tips it further. */
function drawEar(ctx, x, y, droop, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25 - droop * 0.8);
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.quadraticCurveTo(-6, -8, 0, -18);
  ctx.quadraticCurveTo(5, -7, 8, 4);
  ctx.closePath();
  fillStroke(ctx, fill, 2);
  ctx.beginPath();
  ctx.moveTo(-4, 2);
  ctx.quadraticCurveTo(-3, -5, 0, -12);
  ctx.quadraticCurveTo(2.5, -4, 4, 2);
  ctx.closePath();
  ctx.fillStyle = PALETTE.furLight;
  ctx.fill();
  ctx.restore();
}

/** His red Stony Brook cap (head frame): crown, the logo, the brim forward (or the strap, from behind). */
function drawCap(ctx, p, back) {
  ctx.save();
  ctx.translate(back ? 0 : -1, -15);
  ctx.rotate(p.capTilt || 0);
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 13, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  fillStroke(ctx, PALETTE.red, 2.2);
  if (back) {
    ctx.beginPath();
    ctx.roundRect(-7, -4, 14, 5, 2);
    fillStroke(ctx, PALETTE.redDark, 1.4);
  } else {
    // The brim, pointing the way he faces.
    ctx.beginPath();
    ctx.moveTo(10, -1);
    ctx.quadraticCurveTo(26, -4, 33, 1);
    ctx.quadraticCurveTo(24, 4, 10, 3);
    ctx.closePath();
    fillStroke(ctx, PALETTE.redDark, 2);
    // The Seawolf logo on the side.
    circle(ctx, 4, -6, 4.2);
    ctx.fillStyle = PALETTE.white;
    ctx.fill();
    circle(ctx, 4, -6, 2.1);
    ctx.fillStyle = PALETTE.navy;
    ctx.fill();
  }
  circle(ctx, 0, -13, 2.2);
  fillStroke(ctx, PALETTE.redDark, 1.2);
  ctx.restore();
}

/** Seen from behind: the back of his head, both ears, his cap. */
function drawHeadBack(ctx, p, droop) {
  circle(ctx, 0, 0, 21);
  fillStroke(ctx, PALETTE.fur, 2.4);
  drawCap(ctx, p, true);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    drawEar(ctx, -11, -22, droop, PALETTE.fur);
    ctx.restore();
  }
}

function drawHead(ctx, p, back) {
  const droop = p.eyes === 'sad' || p.eyes === 'sleepy' ? 1 : p.eyes === 'meh' ? 0.4 : 0;
  ctx.save();
  ctx.translate(0, HEAD_CY);
  ctx.scale(HEAD_S, HEAD_S);
  if (back) {
    drawHeadBack(ctx, p, droop);
    ctx.restore();
    return;
  }
  // Seen from the side, facing the way he walks: drawn facing right, mirrored for left.
  ctx.scale(p.facing || 1, 1);
  // The far ear pokes up behind his cap, a shade darker.
  drawEar(ctx, -2, -24, droop, PALETTE.furDark);
  // His head: a round skull and a snout to the front.
  ctx.beginPath();
  ctx.moveTo(-14, 16);
  ctx.bezierCurveTo(-24, 10, -24, -12, -12, -18);
  ctx.bezierCurveTo(0, -24, 12, -18, 16, -11);
  ctx.bezierCurveTo(24, -9, 31, -6, 35, -2);
  ctx.bezierCurveTo(37, 2, 35, 6, 30, 7);
  ctx.bezierCurveTo(26, 15, 14, 19, 2, 18);
  ctx.bezierCurveTo(-4, 19, -10, 18, -14, 16);
  ctx.closePath();
  fillStroke(ctx, PALETTE.fur, 2.4);
  // Light-grey fluff on his cheek, swept back.
  ctx.beginPath();
  ctx.moveTo(6, 6);
  ctx.lineTo(-4, 3);
  ctx.lineTo(-16, 8);
  ctx.lineTo(-9, 10);
  ctx.lineTo(-17, 15);
  ctx.lineTo(-4, 15);
  ctx.lineTo(4, 14);
  ctx.closePath();
  ctx.fillStyle = PALETTE.furLight;
  ctx.fill();
  // The white muzzle along the lower snout.
  ctx.beginPath();
  ctx.moveTo(10, -2);
  ctx.bezierCurveTo(18, -4, 28, -3, 34, -1);
  ctx.bezierCurveTo(36, 3, 34, 6, 30, 7);
  ctx.bezierCurveTo(26, 14, 16, 17, 8, 15);
  ctx.bezierCurveTo(4, 10, 5, 2, 10, -2);
  ctx.closePath();
  fillStroke(ctx, PALETTE.muzzle, 1.8);
  // Nose.
  ellipse(ctx, 34.5, -1.5, 3.4, 2.8);
  ctx.fillStyle = PALETTE.nose;
  ctx.fill();
  if (p.blush > 0.05) {
    ellipse(ctx, 7, 4, 3.5, 2);
    ctx.fillStyle = `${PALETTE.cheek}${Math.min(0.8, p.blush * 0.7)})`;
    ctx.fill();
  }
  drawCap(ctx, p, false);
  // The near ear comes up through his cap.
  drawEar(ctx, -11, -22, droop, PALETTE.fur);
  drawEye(ctx, p);
  drawMouth(ctx, p);
  ctx.restore();
}

/** His eye (side view): white, a red iris and a black pupil, shaped by his expression. */
function drawEye(ctx, p) {
  const x = 10 + (p.lookX || 0) * (p.facing || 1) * 1.5;
  const y = -7 + (p.lookY || 0) * 1.2;
  const blink = Math.max(0, Math.min(1, p.blink || 0));
  const round = (rx, ry) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, Math.max(0.1, 1 - blink));
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, -0.15, 0, TAU);
    fillStroke(ctx, PALETTE.white, 1.4);
    circle(ctx, 1.2, 0.3, ry * 0.78);
    ctx.fillStyle = PALETTE.iris;
    ctx.fill();
    circle(ctx, 1.6, 0.3, ry * 0.36);
    ctx.fillStyle = PALETTE.nose;
    ctx.fill();
    circle(ctx, 0, -ry * 0.35, ry * 0.2);
    ctx.fillStyle = PALETTE.white;
    ctx.fill();
    ctx.restore();
    // A dark brow above it.
    line(ctx, x - 5, y - ry - 2.5, x + 5, y - ry - 1.5, 2.2);
  };
  const arc = (dy, from, to, width = 2.2) => {
    ctx.beginPath();
    ctx.arc(x, y + dy, 4.5, from, to);
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  // A fur lid over the top: sad slopes down towards the back, angry towards the snout.
  const lid = (slope, cover) => {
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 8);
    ctx.lineTo(x + 7, y - 8);
    ctx.lineTo(x + 7, y - 5 + cover + slope);
    ctx.lineTo(x - 7, y - 5 + cover - slope);
    ctx.closePath();
    ctx.fillStyle = PALETTE.fur;
    ctx.fill();
    line(ctx, x - 6, y - 5 + cover - slope, x + 6, y - 5 + cover + slope, 2);
  };
  switch (p.eyes) {
    case 'closed':
      arc(-2, Math.PI * 0.15, Math.PI * 0.85);
      break;
    case 'happy':
      arc(3, Math.PI * 1.15, Math.PI * 1.85, 2.4);
      break;
    case 'content':
      arc(2, Math.PI * 1.2, Math.PI * 1.8, 2);
      break;
    case 'squint':
      line(ctx, x - 4.5, y, x + 4.5, y, 2.2);
      break;
    case 'wide':
      round(5.6, 5.4);
      break;
    case 'small':
      round(3.4, 3.2);
      break;
    case 'meh':
      round(4.6, 4.2);
      lid(0, 4.5);
      break;
    case 'sleepy':
      round(4.6, 4.2);
      lid(0, 6.5);
      break;
    case 'sad':
      round(4.6, 4.2);
      lid(-2.5, 3);
      break;
    case 'angry':
      round(4.6, 4.2);
      lid(3, 3);
      break;
    default:
      round(4.6, 4.2);
  }
}

/** His mouth on the muzzle (side view): a big toothy grin by default. */
function drawMouth(ctx, p) {
  ctx.save();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // An open jaw `h` deep: dark mouth, a tongue, teeth top and bottom.
  const jaw = (h) => {
    ctx.beginPath();
    ctx.moveTo(32, 5);
    ctx.lineTo(13, 6);
    ctx.quadraticCurveTo(18, 8 + h * 1.4, 28, 7 + h);
    ctx.closePath();
    ctx.fillStyle = PALETTE.mouth;
    ctx.fill();
    ctx.stroke();
    if (h > 3) {
      ctx.beginPath();
      ctx.ellipse(21, 7 + h * 0.7, 5, h * 0.3, 0, 0, TAU);
      ctx.fillStyle = PALETTE.tongue;
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.white;
    for (let i = 0; i < 4; i++) {
      const tx = 30 - i * 4.2;
      ctx.beginPath();
      ctx.moveTo(tx, 5.2);
      ctx.lineTo(tx - 1.4, 8);
      ctx.lineTo(tx - 2.8, 5.4);
      ctx.fill();
      if (h > 2.5 && i < 3) {
        const by = 7 + h - i * 0.6;
        ctx.beginPath();
        ctx.moveTo(tx - 2, by);
        ctx.lineTo(tx - 3.2, by - 2.6);
        ctx.lineTo(tx - 4.4, by);
        ctx.fill();
      }
    }
  };
  switch (p.mouth) {
    case 'smile':
      jaw(5);
      break;
    case 'open':
      jaw(6.5);
      break;
    case 'talk':
      jaw(2 + 4.5 * Math.abs(Math.sin((p.t || 0) * 14)));
      break;
    case 'growl':
      jaw(2.5);
      break;
    case 'yawn':
      jaw(10);
      break;
    case 'chew':
      jaw(1 + 2.5 * Math.abs(Math.sin((p.t || 0) * 10)));
      break;
    case 'o':
      circle(ctx, 28, 8, 2.6);
      ctx.fillStyle = PALETTE.mouth;
      ctx.fill();
      ctx.stroke();
      break;
    case 'smallSmile':
      ctx.beginPath();
      ctx.moveTo(14, 6);
      ctx.quadraticCurveTo(22, 10, 31, 5);
      ctx.stroke();
      break;
    case 'frown':
      ctx.beginPath();
      ctx.moveTo(14, 8);
      ctx.quadraticCurveTo(22, 4, 31, 7);
      ctx.stroke();
      break;
    case 'wavy':
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const xx = 14 + i * 3.2;
        const yy = 6.5 + (i % 2 ? -1.3 : 1.3);
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      break;
    default:
      // flat
      line(ctx, 14, 6, 31, 5, 1.8);
  }
  ctx.restore();
}

// --------------------------------------------------------------- arms

/** Where his paw on `side` (-1 left, 1 right) goes for this pose. */
function pawAt(side, p) {
  const lead = side === (p.facing || 1);
  const swing = Math.sin(p.walkPhase || 0) * (p.armSwing || 0) * 10 * side;
  const down = { x: side * 48, y: -46 + swing * 0.3 };
  switch (p.arms) {
    case 'up':
      return { x: side * 38, y: -120 };
    case 'cheer':
      return { x: side * 40, y: -122 + Math.sin(p.t * 12 + side) * 3 };
    case 'stretch':
      return { x: side * 20, y: -134 };
    case 'wave':
      return lead ? { x: side * 48 + Math.sin(p.t * 12) * 4, y: -114 } : down;
    case 'hold':
      return { x: side * 12, y: -58 };
    case 'grip':
      return { x: side * 13, y: -60 };
    case 'hug':
      return { x: -side * 12, y: -66 };
    case 'flail':
      return { x: side * 46, y: -96 + Math.sin(p.t * 16 + side) * 12 };
    case 'fists':
      // Flexing: the chest-pound pose.
      return lead ? { x: side * 6, y: -76 } : { x: side * 34, y: -98 };
    case 'shade':
      return lead ? { x: side * 16, y: EYE_Y - 6 } : down;
    case 'sip':
      return lead ? { x: side * 26, y: MUZZLE_Y + 4 } : { x: side * 12, y: -58 };
    case 'reach':
      return lead ? { x: side * 16, y: -132 } : down;
    case 'point':
      // His photo pose: pointing up and out.
      return lead ? { x: side * 52, y: -124 } : { x: -side * 4, y: -72 };
    // His own.
    case 'pizza':
      return lead ? { x: side * 28, y: MUZZLE_Y + 8 } : down;
    case 'straps':
      return { x: side * 22, y: -57 };
    case 'book':
      return { x: side * 14, y: -60 };
    case 'typing':
      return { x: side * 12 + Math.sin(p.t * 18 + side) * 1.5, y: -36 };
    case 'megaphone':
      return lead ? { x: side * 24, y: -96 } : { x: side * 30, y: -70 };
    case 'dance': {
      const beat = Math.floor((p.t || 0) * 2.4) % 2 === 0;
      return (beat ? lead : !lead) ? { x: side * 50, y: -122 } : { x: side * 24, y: -70 };
    }
    case 'capFix':
      return lead ? { x: side * 22, y: HEAD_CY - 18 } : down;
    case 'foamFinger':
      return lead ? { x: side * 36, y: -126 } : down;
    default:
      return down;
  }
}

/**
 * One muscular, furry arm from his shoulder to a big paw: a full upper arm
 * with a bicep, a fuller forearm with light-grey tufts, a paw with fingers.
 */
function drawArm(ctx, side, p) {
  const sx = side * SHOULDER_X;
  const sy = SHOULDER_Y;
  const h = pawAt(side, p);
  const ex = (sx + h.x) / 2 + side * 6;
  const ey = (sy + h.y) / 2 + 4;
  const ua = Math.atan2(ey - sy, ex - sx);
  // Upper arm (with the bicep bulge below the sleeve), forearm, wrist.
  furLimb(ctx, [[sx, sy, 20], [ex, ey, 17], [h.x, h.y, 18]], [[sx + (ex - sx) * 0.68, sy + (ey - sy) * 0.68, 10, 9.5, ua]]);
  // A crease at the elbow, and lighter fur on the forearm.
  ctx.save();
  ctx.beginPath();
  ctx.arc(ex, ey, 6, ua + Math.PI * 0.6, ua + Math.PI * 1.1);
  ctx.strokeStyle = PALETTE.furDark;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
  const fa = Math.atan2(h.y - ey, h.x - ex);
  furTuft(ctx, ex + (h.x - ex) * 0.55, ey + (h.y - ey) * 0.55, fa + Math.PI / 2 * side, 6);
  furTuft(ctx, ex + (h.x - ex) * 0.55, ey + (h.y - ey) * 0.55, fa - Math.PI / 2 * side, 5);
  drawSleeve(ctx, sx, sy, ua);
  // The paw: big and round, with three finger bumps pointing on from the forearm.
  circle(ctx, h.x, h.y, 10);
  fillStroke(ctx, PALETTE.furLight, 2);
  for (let i = -1; i <= 1; i++) {
    const a = fa + i * 0.55;
    circle(ctx, h.x + Math.cos(a) * 8.5, h.y + Math.sin(a) * 8.5, 3.6);
    fillStroke(ctx, PALETTE.furLight, 1.5);
  }
  return h;
}

/** His jersey's short sleeve on the upper arm, from the shoulder (sx, sy) along `angle`, with a white cuff. */
function drawSleeve(ctx, sx, sy, angle) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-5, -10);
  ctx.lineTo(13, -13.5);
  ctx.quadraticCurveTo(15, 0, 13, 13.5);
  ctx.lineTo(-5, 10);
  ctx.quadraticCurveTo(-11, 0, -5, -10);
  ctx.closePath();
  fillStroke(ctx, PALETTE.red, 2.2);
  line(ctx, 10.5, -12.2, 10.5, 12.2, 2, PALETTE.white);
  ctx.restore();
}

// --------------------------------------------------------------- props

function drawGlass(ctx, x, y, level, tilt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt || 0);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-7, -11);
    ctx.lineTo(7, -11);
    ctx.lineTo(5.5, 11);
    ctx.lineTo(-5.5, 11);
    ctx.closePath();
  };
  shape();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  const l = Math.max(0, Math.min(1, level == null ? 1 : 1 - level));
  if (l > 0) {
    ctx.beginPath();
    ctx.moveTo(-6.5 + 1.5 * (1 - l), 11 - 22 * l);
    ctx.lineTo(6.5 - 1.5 * (1 - l), 11 - 22 * l);
    ctx.lineTo(5.5, 11);
    ctx.lineTo(-5.5, 11);
    ctx.closePath();
    ctx.fillStyle = 'rgba(120, 190, 235, 0.8)';
    ctx.fill();
  }
  shape();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

/** The mini football he fetches (also drawn by the fetch ball window). */
function drawFootball(ctx, x, y, rot, r = 10) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  ellipse(ctx, 0, 0, r * 1.25, r * 0.78);
  fillStroke(ctx, PALETTE.football, Math.max(1.4, r * 0.16));
  line(ctx, -r * 0.45, 0, r * 0.45, 0, Math.max(1, r * 0.13), PALETTE.white);
  for (let i = -2; i <= 2; i++) line(ctx, i * r * 0.18, -r * 0.18, i * r * 0.18, r * 0.18, Math.max(0.8, r * 0.1), PALETTE.white);
  ctx.restore();
}

function drawPizza(ctx, h, bitten) {
  ctx.save();
  ctx.translate(h.x, h.y - 4);
  ctx.beginPath();
  ctx.moveTo(-9, -8);
  ctx.lineTo(9, -8);
  ctx.lineTo(0, 12 - bitten * 8);
  ctx.closePath();
  fillStroke(ctx, PALETTE.cheese, 1.6);
  ctx.beginPath();
  ctx.roundRect(-10, -11, 20, 5, 2.5);
  fillStroke(ctx, PALETTE.crust, 1.6);
  for (const [px, py] of [[-3, -2], [3, 0], [0, 4]]) {
    if (py > 8 - bitten * 10) continue;
    circle(ctx, px, py, 1.8);
    ctx.fillStyle = PALETTE.pepperoni;
    ctx.fill();
  }
  ctx.restore();
}

/** His backpack: peeking out behind his shoulders, straps over them. */
function drawBackpack(ctx, behind) {
  if (behind) {
    ctx.beginPath();
    ctx.roundRect(-35, JERSEY_TOP + 4, 70, 36, 9);
    fillStroke(ctx, PALETTE.navy, 2);
    return;
  }
  for (const s of [-1, 1]) line(ctx, s * 22, JERSEY_TOP + 3, s * 22, JERSEY_TOP + 30, 4, PALETTE.navy);
}

function drawBook(ctx, p) {
  const x = fx(p) * 0.5;
  const y = -64;
  ctx.beginPath();
  ctx.roundRect(x - 22, y - 1, 44, 24, 2);
  fillStroke(ctx, PALETTE.book, 1.8);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.roundRect(x + (s < 0 ? -20 : 1), y + 1, 19, 20, 1);
    fillStroke(ctx, PALETTE.white, 1);
    for (let i = 0; i < 4; i++) line(ctx, x + s * 4, y + 6 + i * 4, x + s * 16, y + 6 + i * 4, 0.8, '#9aa3ad');
  }
  // A highlighted line.
  line(ctx, x + 4, y + 10, x + 4 + 12 * Math.min(1, p.propProgress || 0), y + 10, 2.4, 'rgba(244, 224, 77, 0.8)');
}

function drawHighlighter(ctx, h) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(0.5);
  ctx.beginPath();
  ctx.roundRect(-2.5, -12, 5, 14, 2);
  fillStroke(ctx, PALETTE.highlighter, 1.4);
  ctx.restore();
}

/** Laptop on the floor in front of him (sitting), and a coffee with steam. */
function drawLaptop(ctx, p) {
  const x = fx(p) * 0.5;
  ctx.beginPath();
  ctx.moveTo(x - 24, -14);
  ctx.lineTo(x + 24, -14);
  ctx.lineTo(x + 20, -42);
  ctx.lineTo(x - 20, -42);
  ctx.closePath();
  fillStroke(ctx, PALETTE.laptop, 1.8);
  ctx.beginPath();
  ctx.moveTo(x - 17, -18);
  ctx.lineTo(x + 17, -18);
  ctx.lineTo(x + 14, -38);
  ctx.lineTo(x - 14, -38);
  ctx.closePath();
  ctx.fillStyle = PALETTE.screen;
  ctx.fill();
  circle(ctx, x, -29, 3);
  ctx.fillStyle = PALETTE.red;
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - 28, -14, 56, 5, 2);
  fillStroke(ctx, PALETTE.laptop, 1.6);
  // The coffee cup beside it.
  const cx = x + (p.facing || 1) * 38;
  ctx.beginPath();
  ctx.moveTo(cx - 6, -22);
  ctx.lineTo(cx + 6, -22);
  ctx.lineTo(cx + 5, -6);
  ctx.lineTo(cx - 5, -6);
  ctx.closePath();
  fillStroke(ctx, PALETTE.white, 1.6);
  ctx.beginPath();
  ctx.roundRect(cx - 6, -17, 12, 5, 1);
  ctx.fillStyle = PALETTE.red;
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = 'rgba(150, 150, 160, 0.7)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 2; i++) {
    const k = ((p.t || 0) * 0.7 + i * 0.5) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath();
    ctx.moveTo(cx - 2 + i * 4, -24 - k * 10);
    ctx.quadraticCurveTo(cx + 2 + i * 4, -28 - k * 10, cx - 1 + i * 4, -32 - k * 10);
    ctx.stroke();
  }
  ctx.restore();
}

/** The megaphone in his leading paw, pointing up and out. */
function drawMegaphone(ctx, p, h) {
  const s = p.facing || 1;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(-s * 0.7);
  ctx.beginPath();
  ctx.moveTo(-4 * s, -3);
  ctx.lineTo(24 * s, -11);
  ctx.lineTo(24 * s, 11);
  ctx.lineTo(-4 * s, 3);
  ctx.closePath();
  fillStroke(ctx, PALETTE.red, 1.8);
  line(ctx, 12 * s, -7, 12 * s, 7, 2.2, PALETTE.white);
  ctx.restore();
}

/** A red foam finger (#1) on his paw. */
function drawFoamFinger(ctx, h) {
  ctx.beginPath();
  ctx.roundRect(h.x - 9, h.y - 6, 18, 18, 5);
  fillStroke(ctx, PALETTE.red, 1.6);
  ctx.beginPath();
  ctx.roundRect(h.x - 4, h.y - 24, 8, 20, 4);
  fillStroke(ctx, PALETTE.red, 1.6);
  ctx.save();
  ctx.fillStyle = PALETTE.white;
  ctx.font = 'bold 7px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('#1', h.x, h.y + 7);
  ctx.restore();
}

// --------------------------------------------------------------- him

// Poses with a paw raised beside his head: those arms go behind his head (his
// big snout), the rest in front of him.
const ARMS_BEHIND_HEAD = new Set(['wave', 'cheer', 'up', 'flail', 'dance', 'point', 'foamFinger', 'stretch', 'reach']);

function drawCharacter(ctx, p) {
  // Asleep ("lying" for others): sitting, eyes shut, cap tipped down.
  if (p.view === 'lying') p = { ...p, view: 'front', feet: 'sit', arms: 'hold', eyes: 'closed', mouth: 'flat', turn: 0, capTilt: 0.2 };
  ctx.save();
  ctx.rotate(p.tilt || 0);
  ctx.translate(0, p.bob || 0);
  ctx.scale(p.scaleX || 1, p.scaleY || 1);
  const back = p.view === 'back';
  const sitting = p.feet === 'sit';

  if (!back) drawTail(ctx, p, false);
  if (sitting) ctx.translate(0, SIT_DROP);
  if (!back && p.prop === 'backpack') drawBackpack(ctx, true);
  if (back) {
    drawArm(ctx, -1, p);
    drawArm(ctx, 1, p);
  }
  drawLegs(ctx, p);
  drawShorts(ctx, p, back);
  drawJersey(ctx, p, back);
  if (back) drawTail(ctx, p, true);
  const armsFirst = !back && ARMS_BEHIND_HEAD.has(p.arms);
  const armsBehind = armsFirst ? [drawArm(ctx, -1, p), drawArm(ctx, 1, p)] : null;
  drawHead(ctx, p, back);
  if (!back) {
    if (p.prop === 'backpack') drawBackpack(ctx, false);
    if (p.prop === 'book') drawBook(ctx, p);
    if (p.prop === 'laptop') {
      ctx.save();
      if (sitting) ctx.translate(0, -SIT_DROP);
      drawLaptop(ctx, p);
      ctx.restore();
    }
    const [left, right] = armsBehind || [drawArm(ctx, -1, p), drawArm(ctx, 1, p)];
    const lead = (p.facing || 1) > 0 ? right : left;
    if (p.prop === 'glass') {
      const lift = p.glassLift || 0;
      drawGlass(ctx, lead.x, lead.y - 6 - lift * 4, p.propProgress, -(p.facing || 1) * 0.5 * lift);
    }
    if (p.prop === 'football') drawFootball(ctx, (left.x + right.x) / 2, (left.y + right.y) / 2 - 3, 0.3, 9);
    if (p.prop === 'pizza') drawPizza(ctx, lead, p.propProgress || 0);
    if (p.prop === 'book') drawHighlighter(ctx, lead);
    if (p.prop === 'megaphone') drawMegaphone(ctx, p, lead);
    if (p.prop === 'foamFinger') drawFoamFinger(ctx, lead);
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
    blush: 0.2,
    prop: null,
    capTilt: 0,
    tailWag: false,
  };
}

// --------------------------------------------------------------- his activities

// How his own activities look, called by computePose in
// src/renderer/renderer.js with the pose so far (`p`), the frame from the
// main process (`f`) and a kit: { t, st, duration, dt, clamp, walkCycle, overlay }.
const ACTIVITY_POSES = {
  // A slice of pizza from the dining hall (fixes hunger).
  pizza(p, f, k) {
    p.feet = 'sit';
    p.arms = 'pizza';
    p.prop = 'pizza';
    p.propProgress = k.clamp(k.st / k.duration, 0, 1);
    p.eyes = 'content';
    p.mouth = 'chew';
    p.blush = 0.6;
    p.tailWag = true;
  },
  // Off to class with his backpack.
  class(p, f, k) {
    k.walkCycle(p, f, 10, 5);
    p.arms = 'straps';
    p.prop = 'backpack';
    p.armSwing = 0;
    p.eyes = 'open';
    p.mouth = 'smallSmile';
  },
  // Studying: textbook open, highlighting, eyes moving over the page.
  study(p, f, k) {
    p.feet = 'sit';
    p.arms = 'book';
    p.prop = 'book';
    p.propProgress = (k.st % 4) / 4;
    p.eyes = 'open';
    p.mouth = 'flat';
    p.lookY = 0.8;
    p.lookX = Math.sin(k.t * 1.4) * 0.8;
  },
  // An all-nighter: laptop and coffee, getting sleepier, then a stretch.
  allnighter(p, f, k) {
    const u = k.st / k.duration;
    p.feet = 'sit';
    p.arms = 'typing';
    p.prop = 'laptop';
    p.lookY = 0.7;
    p.eyes = u < 0.5 ? 'open' : u < 0.85 ? 'sleepy' : 'squint';
    p.mouth = u < 0.85 ? 'flat' : 'yawn';
    if (u >= 0.85) p.arms = 'stretch';
  },
  // Cheering for the Seawolves: megaphone up, "GO SEAWOLVES!".
  cheer(p, f, k) {
    p.arms = 'megaphone';
    p.prop = 'megaphone';
    p.eyes = 'happy';
    p.mouth = 'open';
    p.bob = -Math.abs(Math.sin(k.t * 6)) * 4;
    p.tailWag = true;
    k.overlay('goSeawolves');
  },
  // His game-day dance: arms switching to the beat, a little hop.
  dance(p, f, k) {
    p.arms = 'dance';
    p.eyes = 'happy';
    p.mouth = 'smile';
    p.bob = -Math.abs(Math.sin(k.t * 7.5)) * 5;
    p.tilt = Math.sin(k.t * 7.5) * 0.1;
    p.tailWag = true;
    k.overlay('notes');
  },
  // After a throw: a quick wet-dog shake, then he fixes his cap.
  shakeOff(p, f, k) {
    const u = k.st / k.duration;
    p.eyes = u < 0.6 ? 'squint' : 'open';
    p.mouth = u < 0.6 ? 'wavy' : 'smallSmile';
    if (u < 0.6) {
      p.tilt = Math.sin(k.t * 32) * 0.14 * (1 - u / 0.6);
      p.capTilt = -0.35;
    } else {
      p.arms = 'capFix';
      p.capTilt = -0.35 * (1 - (u - 0.6) / 0.4);
    }
  },
};

/** His own take on shared states: happy is a chest-pound flex. */
function restyle(state, p) {
  if (state === 'happy') {
    p.arms = 'fists';
    p.tailWag = true;
  }
}

/**
 * Watching something with you: a dorm watch party. Sitting with his back to
 * you; the foam finger goes up when it's exciting, his tail wags when it's
 * funny, his ears droop when it's sad.
 */
function watchPose(mood, p, f, k) {
  p.feet = 'sit';
  switch (mood) {
    case 'exciting':
      p.view = 'front';
      p.arms = 'foamFinger';
      p.prop = 'foamFinger';
      p.eyes = 'wide';
      p.mouth = 'open';
      p.bob = -Math.abs(Math.sin(k.t * 9)) * 3;
      break;
    case 'funny':
      p.view = 'back';
      p.tailWag = true;
      p.tilt = Math.sin(k.t * 14) * 0.05;
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
      p.eyes = 'meh';
      p.mouth = 'flat';
      p.arms = 'hold';
      break;
    default:
      p.view = 'back';
  }
}

/** "GO SEAWOLVES!" over his head while he cheers. */
function drawGoSeawolves(ctx, x, y, clock) {
  ctx.save();
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bounce = Math.abs(Math.sin(clock * 6)) * 3;
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.white;
  ctx.strokeText('GO SEAWOLVES!', x - 38 * Math.sign(x || 1), y - 12 - bounce);
  ctx.fillStyle = PALETTE.red;
  ctx.fillText('GO SEAWOLVES!', x - 38 * Math.sign(x || 1), y - 12 - bounce);
  ctx.restore();
}

/** Musical notes by his head while he dances. */
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
window.Characters.wolfie = Object.assign(window.Characters.wolfie || {}, {
  draw: drawCharacter,
  defaultPose,
  BODY_CY: CY,
  HEAD_TOP: HEAD_CY + EAR_TOP * HEAD_S,
  turned: { class: 1, cheer: 0.5, dance: 0.3 },
  activityPose: ACTIVITY_POSES,
  watchPose,
  restyle,
  overlays: { goSeawolves: drawGoSeawolves, notes: drawNotes },
  // What he holds while carrying the football back to you.
  heldProp: 'football',
  drawFetchItem: drawFootball,
});
})();
