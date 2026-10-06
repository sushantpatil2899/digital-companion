// Procedural drawing of the companion ("Mochi", a round little cat-blob).
// Everything is drawn relative to his feet at (0, 0); up is negative y.
// Wrapped in an IIFE so its helpers don't leak into the page's global scope.
(function () {
'use strict';

const PALETTE = {
  outline: '#4a3226',
  body: '#ffb46b',
  bodyShade: '#f59a4c',
  belly: '#ffe6c7',
  innerEar: '#ff9eaa',
  cheek: 'rgba(255, 120, 130, ',
  eye: '#2e211a',
  white: '#ffffff',
  mouth: '#7a3b2e',
  tongue: '#ff7d8a',
};

const BODY_RX = 40;
const BODY_RY = 41;
const BODY_CY = -45;

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

function fillStroke(ctx, fill, lineWidth = 3) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
}

function drawTail(ctx, p) {
  const side = -p.facing; // tail sticks out the back
  const wag = p.tailWag;
  ctx.save();
  ctx.translate(side * 30, -22);
  ctx.rotate(side * (0.5 + wag));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(side * 26, -6, side * 24, -30);
  ctx.lineCap = 'round';
  ctx.lineWidth = 15;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.lineWidth = 9;
  ctx.strokeStyle = PALETTE.body;
  ctx.stroke();
  ctx.restore();
}

function drawFoot(ctx, x, lift, p) {
  ctx.save();
  if (p.feet === 'dangle') {
    // Little kicking legs hanging down.
    const kick = Math.sin(p.t * 14 + x) * 4;
    ctx.beginPath();
    ctx.moveTo(x * 0.7, -10);
    ctx.lineTo(x + kick * 0.5, 4 + kick);
    ctx.lineCap = 'round';
    ctx.lineWidth = 11;
    ctx.strokeStyle = PALETTE.outline;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = PALETTE.body;
    ctx.stroke();
    ellipse(ctx, x + kick * 0.5, 6 + kick, 9, 6);
    fillStroke(ctx, PALETTE.body, 2.5);
  } else if (p.feet === 'sit') {
    ellipse(ctx, x * 1.15, -4, 11, 7, x > 0 ? -0.3 : 0.3);
    fillStroke(ctx, PALETTE.belly, 2.5);
  } else {
    ellipse(ctx, x, -5 - lift, 11, 7);
    fillStroke(ctx, PALETTE.body, 2.5);
  }
  ctx.restore();
}

function drawEar(ctx, side, p) {
  ctx.save();
  ctx.translate(side * 23, BODY_CY - 30);
  ctx.rotate(side * (0.25 + p.earFlop));
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.quadraticCurveTo(-4, -22, 2, -24);
  ctx.quadraticCurveTo(8, -18, 13, 8);
  ctx.closePath();
  fillStroke(ctx, PALETTE.body);
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.quadraticCurveTo(-1, -12, 2, -14);
  ctx.quadraticCurveTo(6, -10, 7, 4);
  ctx.closePath();
  ctx.fillStyle = PALETTE.innerEar;
  ctx.fill();
  ctx.restore();
}

function drawArm(ctx, side, p) {
  ctx.save();
  let angle;
  switch (p.arms) {
    case 'up':
      angle = -side * (2.4 + Math.sin(p.t * 16 + side) * 0.25);
      break;
    case 'wave':
      angle = -side * (1.6 + Math.sin(p.t * 9) * 0.5);
      break;
    case 'flail':
      angle = -side * (1.5 + Math.sin(p.t * 22 + side * 2) * 0.8);
      break;
    default:
      angle = side * (0.35 + Math.sin(p.walkPhase + (side > 0 ? 0 : Math.PI)) * p.armSwing);
  }
  ctx.translate(side * 33, BODY_CY + 8);
  ctx.rotate(angle);
  ellipse(ctx, 0, 9, 7, 11);
  fillStroke(ctx, PALETTE.body, 2.5);
  ctx.restore();
}

function drawEye(ctx, x, y, p) {
  ctx.save();
  // Eyes drift towards whatever he's looking at.
  ctx.translate(x + p.lookX * 2.5, y + p.lookY * 2);
  ctx.strokeStyle = PALETTE.eye;
  ctx.fillStyle = PALETTE.eye;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  const open = 1 - p.blink;
  switch (p.eyes) {
    case 'happy': // ^ ^
      ctx.beginPath();
      ctx.moveTo(-6, 2);
      ctx.quadraticCurveTo(0, -7, 6, 2);
      ctx.stroke();
      break;
    case 'closed': // sleepy arcs
      ctx.beginPath();
      ctx.moveTo(-6, -1);
      ctx.quadraticCurveTo(0, 5, 6, -1);
      ctx.stroke();
      break;
    case 'squint': // > <
      ctx.beginPath();
      ctx.moveTo(x < 0 ? -5 : 5, -5);
      ctx.lineTo(x < 0 ? 5 : -5, 0);
      ctx.lineTo(x < 0 ? -5 : 5, 5);
      ctx.stroke();
      break;
    case 'dizzy': {
      ctx.beginPath();
      const turns = 2.2;
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * turns * Math.PI * 2 + p.t * 8 * (x < 0 ? 1 : -1);
        const r = (i / 40) * 7;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    default: {
      const big = p.eyes === 'wide' ? 1.3 : 1;
      const ry = 8 * big * Math.max(0.08, open);
      ellipse(ctx, 0, 0, 6.5 * big, ry);
      ctx.fill();
      if (open > 0.4) {
        // Highlights shift a little with where he's looking.
        ctx.fillStyle = PALETTE.white;
        ellipse(ctx, -2 + p.lookX * 2, -3 + p.lookY * 2, 2.6 * big, 2.8 * big);
        ctx.fill();
        ellipse(ctx, 2.2 + p.lookX * 1.5, 3 + p.lookY * 1.5, 1.2 * big, 1.2 * big);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawMouth(ctx, x, y, p) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (p.mouth) {
    case 'open': // happy open mouth
      ctx.beginPath();
      ctx.moveTo(-6, -1);
      ctx.quadraticCurveTo(0, 10, 6, -1);
      ctx.closePath();
      ctx.fillStyle = PALETTE.mouth;
      ctx.fill();
      ctx.stroke();
      ellipse(ctx, 0, 4, 3, 2);
      ctx.fillStyle = PALETTE.tongue;
      ctx.fill();
      break;
    case 'o':
      ellipse(ctx, 0, 2, 3.5, 4.5);
      ctx.fillStyle = PALETTE.mouth;
      ctx.fill();
      ctx.stroke();
      break;
    case 'wavy':
      ctx.beginPath();
      ctx.moveTo(-7, 1);
      ctx.quadraticCurveTo(-3.5, -3, 0, 1);
      ctx.quadraticCurveTo(3.5, 5, 7, 1);
      ctx.stroke();
      break;
    case 'flat':
      ctx.beginPath();
      ctx.moveTo(-3, 1);
      ctx.lineTo(3, 1);
      ctx.stroke();
      break;
    default: // cat smile "w"
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-3, 4, 0, 0);
      ctx.quadraticCurveTo(3, 4, 6, 0);
      ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draw the character.
 * @param {CanvasRenderingContext2D} ctx already translated so (0,0) = feet
 * @param {object} p pose, see `defaultPose`
 */
function drawCharacter(ctx, p) {
  ctx.save();
  ctx.rotate(p.tilt);
  ctx.translate(0, p.bob);

  // Soft ground shadow is drawn by the caller (it shouldn't tilt).

  ctx.save();
  // Squash & stretch around the feet.
  ctx.scale(p.scaleX, p.scaleY);

  drawTail(ctx, p);

  const leftLift = Math.max(0, Math.sin(p.walkPhase)) * p.stepHeight;
  const rightLift = Math.max(0, Math.sin(p.walkPhase + Math.PI)) * p.stepHeight;
  drawFoot(ctx, -17, leftLift, p);
  drawFoot(ctx, 17, rightLift, p);

  drawEar(ctx, -1, p);
  drawEar(ctx, 1, p);

  // Body.
  ellipse(ctx, 0, BODY_CY, BODY_RX, BODY_RY);
  fillStroke(ctx, PALETTE.body);
  // Shading on the lower back.
  ctx.save();
  ellipse(ctx, 0, BODY_CY, BODY_RX - 1.5, BODY_RY - 1.5);
  ctx.clip();
  ellipse(ctx, -p.facing * 14, BODY_CY + 30, 40, 22);
  ctx.fillStyle = PALETTE.bodyShade;
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Belly patch.
  const faceX = p.facing * 5;
  ellipse(ctx, faceX * 0.6, BODY_CY + 18, 23, 19);
  ctx.fillStyle = PALETTE.belly;
  ctx.fill();
  ctx.restore();

  drawArm(ctx, -1, p);
  drawArm(ctx, 1, p);

  // Face.
  const eyeY = BODY_CY - 10;
  drawEye(ctx, faceX - 14, eyeY, p);
  drawEye(ctx, faceX + 14, eyeY, p);

  if (p.blush > 0.01) {
    ctx.fillStyle = PALETTE.cheek + (0.25 + 0.45 * p.blush) + ')';
    ellipse(ctx, faceX - 24, eyeY + 9, 6.5, 4);
    ctx.fill();
    ellipse(ctx, faceX + 24, eyeY + 9, 6.5, 4);
    ctx.fill();
  }

  // Tiny nose.
  ctx.fillStyle = PALETTE.innerEar;
  ellipse(ctx, faceX, eyeY + 6, 2.5, 1.8);
  ctx.fill();

  drawMouth(ctx, faceX, eyeY + 9, p);

  ctx.restore();
  ctx.restore();
}

function defaultPose() {
  return {
    t: 0,
    facing: 1,
    tilt: 0,
    bob: 0,
    scaleX: 1,
    scaleY: 1,
    walkPhase: 0,
    stepHeight: 0,
    armSwing: 0,
    feet: 'stand', // stand | sit | dangle
    arms: 'down', // down | up | wave | flail
    eyes: 'open', // open | wide | happy | closed | squint | dizzy
    mouth: 'smile', // smile | open | o | wavy | flat
    blink: 0,
    lookX: 0,
    lookY: 0,
    blush: 0.3,
    tailWag: 0,
    earFlop: 0,
  };
}

function drawHeart(ctx, x, y, size, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(size / 10, size / 10);
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-10, -4, -6, -12, 0, -6);
  ctx.bezierCurveTo(6, -12, 10, -4, 0, 3);
  ctx.closePath();
  ctx.fillStyle = '#ff5d7a';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#b8304d';
  ctx.stroke();
  ctx.restore();
}

function drawStar(ctx, x, y, size, rot, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size * 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd84a';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#a07a10';
  ctx.stroke();
  ctx.restore();
}

function drawText(ctx, text, x, y, size, alpha, color = '#4a3226') {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold ${size}px "Comic Sans MS", "Chalkboard SE", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPuff(ctx, x, y, r, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ellipse(ctx, x, y, r, r * 0.7);
  ctx.fillStyle = '#e9e1d8';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(120,100,90,0.5)';
  ctx.stroke();
  ctx.restore();
}

window.Character = {
  drawCharacter,
  defaultPose,
  drawHeart,
  drawStar,
  drawText,
  drawPuff,
  BODY_CY,
};
})();
