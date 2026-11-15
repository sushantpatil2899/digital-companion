'use strict';

// How Tonk looks (SBU Hacks, 2026-10-24): drawing code for every basic pose,
// how his own activities look, his watching reactions and the ball bearing
// he fetches. A pocket-sized robot: a boxy rounded steel body with brass
// panels and copper rivets, steam vents on his shoulders, a red glass visor
// with two round glowing eyes, an antenna bulb and wheels for feet; on his
// back a pressure gauge and a wind-up key. Coordinates: his feet at (0, 0),
// up is negative. Registers window.Characters.tonk (see src/characters/README.md).

(function () {
const PALETTE = {
  outline: '#2c2f36',
  steel: '#b3bcc6',
  steelShade: '#8f99a5',
  steelLight: '#d4dbe2',
  brass: '#d9a94a',
  brassDark: '#a9782a',
  copper: '#b86f3c',
  visor: '#c9362f',
  visorDark: '#8e211c',
  eye: '#ffe9de',
  eyeGlow: 'rgba(255, 120, 95, ',
  rubber: '#3b4048',
  cheek: 'rgba(255, 150, 140, ',
  bulb: '#ffd54a',
  white: '#ffffff',
  paper: '#f7f3e6',
  blueprint: '#3d6fb6',
  toolbox: '#d1453b',
  water: 'rgba(120, 190, 235, 0.8)',
};

const BODY_W = 84;
const BODY_H = 70;
const BODY_BOTTOM = -24; // just above his wheels
const BODY_TOP = BODY_BOTTOM - BODY_H;
const CY = (BODY_TOP + BODY_BOTTOM) / 2; // centre of his body
const VISOR_Y = BODY_TOP + 8; // top of the visor
const VISOR_H = 22;
const EYE_Y = VISOR_Y + VISOR_H / 2;
const EYE_X = 12;
const MOUTH_Y = VISOR_Y + VISOR_H + 6;
const SHOULDER_Y = BODY_TOP + 28;
const SHOULDER_X = BODY_W / 2 + 2;
const WHEEL_X = 22;
const WHEEL_R = 11;
const SIT_DROP = 8; // how far his body sinks onto his wheels when he sits
const TAU = Math.PI * 2;

function fillStroke(ctx, fill, lineWidth = 2.2) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
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

// --------------------------------------------------------------- parts

/** A wheel: rubber tyre, brass hub, spokes turning with `spin`. */
function drawWheel(ctx, x, y, spin) {
  circle(ctx, x, y, WHEEL_R);
  fillStroke(ctx, PALETTE.rubber, 2);
  circle(ctx, x, y, WHEEL_R * 0.5);
  fillStroke(ctx, PALETTE.brass, 1.6);
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * TAU) / 3;
    line(ctx, x, y, x + Math.cos(a) * WHEEL_R * 0.85, y + Math.sin(a) * WHEEL_R * 0.85, 1.4, PALETTE.brassDark);
  }
}

function drawWheels(ctx, p) {
  const dangle = p.feet === 'dangle';
  const y = -WHEEL_R + (dangle ? 6 : 0);
  const spin = (p.walkPhase || 0) * 1.4 * (p.facing || 1) + (dangle ? p.t * 2 : 0);
  // Little legs from his body down to the wheels.
  for (const s of [-1, 1]) {
    rrect(ctx, s * WHEEL_X - 4, BODY_BOTTOM - 2, 8, y - BODY_BOTTOM + 4, 3);
    fillStroke(ctx, PALETTE.steelShade, 1.8);
    drawWheel(ctx, s * WHEEL_X, y, spin);
  }
}

/** The antenna and its bulb, glowing with his mood. */
function drawAntenna(ctx, p) {
  const top = BODY_TOP - 16;
  line(ctx, 0, BODY_TOP, 0, top + 4, 3);
  let color = PALETTE.bulb;
  let glow = 0.35;
  if (p.eyes === 'angry') color = '#ff6b4a';
  else if (p.eyes === 'sad' || p.eyes === 'closed' || p.eyes === 'sleepy' || p.view === 'lying') {
    color = '#b9ad7c';
    glow = 0.1;
  } else if (p.eyes === 'happy' || p.arms === 'cheer') glow = 0.6;
  if (p.bulbPulse) glow = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(p.t * 6));
  // Glow around the bulb.
  ctx.save();
  ctx.globalAlpha = glow;
  circle(ctx, 0, top, 11);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  circle(ctx, 0, top, 5.5);
  fillStroke(ctx, color, 1.8);
  rrect(ctx, -3.5, top + 4, 7, 4, 1.5);
  fillStroke(ctx, PALETTE.brassDark, 1.4);
}

/** The steam vents on his shoulders (and a puff of steam when `steam`). */
function drawVents(ctx, p) {
  for (const s of [-1, 1]) {
    const x = s * (BODY_W / 2) - (s > 0 ? 0 : 10);
    rrect(ctx, x, BODY_TOP + 6, 10, 14, 3);
    fillStroke(ctx, PALETTE.brass, 1.8);
    for (let i = 0; i < 3; i++) line(ctx, x + 2.5, BODY_TOP + 10 + i * 3.5, x + 7.5, BODY_TOP + 10 + i * 3.5, 1.2, PALETTE.brassDark);
    if (p.steam) drawPuff(ctx, s * (BODY_W / 2 + 6), BODY_TOP - 4, p.t + s);
  }
}

/** One soft puff of steam, drifting up and fading with time `t`. */
function drawPuff(ctx, x, y, t) {
  const k = (t * 0.8) % 1;
  ctx.save();
  ctx.globalAlpha = 0.7 * (1 - k);
  ctx.fillStyle = PALETTE.white;
  ctx.strokeStyle = 'rgba(140, 150, 160, 0.6)';
  ctx.lineWidth = 1.2;
  for (const [dx, dy, r] of [[0, 0, 6], [6, -3, 5], [-5, -4, 4.5]]) {
    circle(ctx, x + dx, y + dy - k * 14, r * (0.8 + k * 0.5));
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function rivet(ctx, x, y) {
  circle(ctx, x, y, 2.2);
  fillStroke(ctx, PALETTE.copper, 1.1);
}

function drawBody(ctx, p, back) {
  rrect(ctx, -BODY_W / 2, BODY_TOP, BODY_W, BODY_H, 14);
  fillStroke(ctx, PALETTE.steel, 2.4);
  // A brushed-steel shine down one side.
  ctx.save();
  rrect(ctx, -BODY_W / 2 + 6, BODY_TOP + 6, 8, BODY_H - 12, 4);
  ctx.fillStyle = PALETTE.steelLight;
  ctx.globalAlpha = 0.7;
  ctx.fill();
  ctx.restore();
  for (const [x, y] of [[-34, BODY_TOP + 7], [34, BODY_TOP + 7], [-34, BODY_BOTTOM - 7], [34, BODY_BOTTOM - 7]]) rivet(ctx, x, y);
  if (back) {
    drawGauge(ctx, 0, BODY_TOP + 22, p);
    drawKey(ctx, 0, BODY_BOTTOM - 18, p);
    return;
  }
  // The brass panel on his belly.
  const fx = (p.facing || 1) * (p.turn || 0) * 5;
  rrect(ctx, fx - 22, MOUTH_Y + 6, 44, BODY_BOTTOM - MOUTH_Y - 12, 6);
  fillStroke(ctx, PALETTE.brass, 1.8);
  for (const s of [-1, 1]) rivet(ctx, fx + s * 17, MOUTH_Y + 11);
  line(ctx, fx - 12, BODY_BOTTOM - 14, fx + 12, BODY_BOTTOM - 14, 1.4, PALETTE.brassDark);
}

/** The pressure gauge on his back; the needle follows his energy (and his mood). */
function drawGauge(ctx, x, y, p) {
  circle(ctx, x, y, 11);
  fillStroke(ctx, PALETTE.brass, 1.8);
  circle(ctx, x, y, 8);
  fillStroke(ctx, PALETTE.white, 1.2);
  const a = -Math.PI * 0.75 + Math.PI * 1.5 * (p.gauge != null ? p.gauge : 0.6);
  line(ctx, x, y, x + Math.cos(a) * 6.5, y + Math.sin(a) * 6.5, 1.6, PALETTE.visor);
}

/** The wind-up key on his back. */
function drawKey(ctx, x, y, p) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.keySpin || 0);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 9, 0, 8, 5.5, 0, 0, TAU);
    fillStroke(ctx, PALETTE.brass, 1.8);
  }
  circle(ctx, 0, 0, 4);
  fillStroke(ctx, PALETTE.brassDark, 1.6);
  ctx.restore();
}

// --------------------------------------------------------------- face

function drawVisor(ctx, p) {
  const fx = (p.facing || 1) * (p.turn || 0) * 6;
  rrect(ctx, fx - 30, VISOR_Y, 60, VISOR_H, 9);
  fillStroke(ctx, PALETTE.visor, 2.2);
  // Glass shine.
  ctx.save();
  rrect(ctx, fx - 25, VISOR_Y + 3, 18, 4, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.restore();
  // Rosy glow on the glass when he's pleased (or shy).
  if (p.blush > 0.05) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(fx + s * 24, EYE_Y + 5, 4.5, 2.5, 0, 0, TAU);
      ctx.fillStyle = `${PALETTE.cheek}${Math.min(0.8, p.blush * 0.7)})`;
      ctx.fill();
    }
  }
  for (const s of [-1, 1]) drawEye(ctx, fx + s * EYE_X + (p.lookX || 0) * 3, EYE_Y + (p.lookY || 0) * 2, s, p);
}

/** One glowing visor eye in the shape his expression asks for. */
function drawEye(ctx, x, y, side, p) {
  const eyes = p.eyes;
  const blink = Math.max(0, Math.min(1, p.blink || 0));
  const glow = (r) => {
    ctx.save();
    circle(ctx, x, y, r + 3);
    ctx.fillStyle = `${PALETTE.eyeGlow}0.45)`;
    ctx.fill();
    ctx.restore();
  };
  const dot = (r) => {
    glow(r);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, Math.max(0.12, 1 - blink));
    circle(ctx, 0, 0, r);
    ctx.fillStyle = PALETTE.eye;
    ctx.fill();
    ctx.restore();
  };
  const stroke = (draw, width = 2.6) => {
    ctx.save();
    ctx.strokeStyle = PALETTE.eye;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    draw();
    ctx.stroke();
    ctx.restore();
  };
  // Lids (in the visor's red) over the top of a round eye.
  const lid = (r, slope) => {
    dot(r);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - r - 2, y - r - 2 + slope * side * -1);
    ctx.lineTo(x + r + 2, y - r - 2 + slope * side);
    ctx.lineTo(x + r + 2, y + (slope === 0 ? 0 : -1));
    ctx.lineTo(x - r - 2, y + (slope === 0 ? 0 : -1));
    ctx.closePath();
    ctx.fillStyle = PALETTE.visor;
    ctx.fill();
    ctx.restore();
  };
  switch (eyes) {
    case 'closed':
      stroke(() => {
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
      });
      break;
    case 'happy':
      stroke(() => ctx.arc(x, y + 3, 5, Math.PI * 1.1, Math.PI * 1.9));
      break;
    case 'content':
      stroke(() => ctx.arc(x, y + 2, 4.5, Math.PI * 1.15, Math.PI * 1.85), 2.2);
      break;
    case 'squint':
      stroke(() => {
        ctx.moveTo(x - 5, y - side * 1);
        ctx.lineTo(x + 5, y + side * 1);
      });
      break;
    case 'wide':
      dot(7.5);
      break;
    case 'small':
      dot(3.5);
      break;
    case 'meh':
      lid(6, 0);
      break;
    case 'sleepy':
      lid(6, 0);
      stroke(() => {
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x + 5, y);
      }, 1.6);
      break;
    case 'sad':
      lid(6, 3.5);
      break;
    case 'angry':
      lid(6, -3.5);
      break;
    case 'dizzy': {
      // A swirl, turning.
      stroke(() => {
        const turns = 2.2;
        for (let i = 0; i <= 28; i++) {
          const u = i / 28;
          const a = u * turns * TAU + p.t * 7 * side;
          const r = 0.6 + u * 5.6;
          if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
      }, 1.8);
      break;
    }
    default:
      dot(6);
  }
}

/** A small mouth slot under his visor. */
function drawMouth(ctx, p) {
  const x = (p.facing || 1) * (p.turn || 0) * 6;
  const y = MOUTH_Y;
  ctx.save();
  ctx.strokeStyle = PALETTE.outline;
  ctx.fillStyle = PALETTE.outline;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  switch (p.mouth) {
    case 'smile':
      ctx.arc(x, y - 3, 6, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      break;
    case 'smallSmile':
      ctx.arc(x, y - 2, 3.5, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      break;
    case 'frown':
      ctx.arc(x, y + 4, 5, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      break;
    case 'o':
      ctx.arc(x, y, 2.6, 0, TAU);
      ctx.fill();
      break;
    case 'open':
    case 'talk': {
      const h = p.mouth === 'talk' ? 2 + 2 * Math.abs(Math.sin(p.t * 14)) : 4;
      ctx.roundRect(x - 4.5, y - h / 2, 9, h, 2);
      ctx.fill();
      break;
    }
    case 'yawn':
      ctx.ellipse(x, y, 3.5, 4.5, 0, 0, TAU);
      ctx.fill();
      break;
    case 'wavy':
    case 'growl':
      for (let i = 0; i <= 4; i++) {
        const xx = x - 6 + i * 3;
        const yy = y + (i % 2 ? -1.5 : 1.5);
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      break;
    default:
      // flat (and anything else): a short line.
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 4, y);
      ctx.stroke();
  }
  ctx.restore();
}

// --------------------------------------------------------------- arms

/** Where his hand on `side` (-1 left, 1 right) goes for this pose. */
function handAt(side, p) {
  const lead = side === (p.facing || 1);
  const swing = Math.sin(p.walkPhase || 0) * (p.armSwing || 0) * 10 * side;
  const down = { x: side * 50, y: -40 + swing * 0.3 };
  switch (p.arms) {
    case 'up':
      return { x: side * 52, y: -104 };
    case 'cheer':
      return { x: side * 54, y: -106 + Math.sin(p.t * 12 + side) * 3 };
    case 'stretch':
      return { x: side * 26, y: -118 };
    case 'wave':
      return lead ? { x: side * 58 + Math.sin(p.t * 12) * 4, y: -102 } : down;
    case 'hold':
      return { x: side * 14, y: -46 };
    case 'grip':
      return { x: side * 15, y: -50 };
    case 'hug':
      return { x: -side * 14, y: -50 };
    case 'flail':
      return { x: side * 56, y: -80 + Math.sin(p.t * 16 + side) * 14 };
    case 'fists':
      return { x: side * 34, y: -86 };
    case 'shade':
      return lead ? { x: side * 6, y: VISOR_Y - 2 } : down;
    case 'sip':
      return lead ? { x: side * 8, y: MOUTH_Y + 2 } : { x: side * 14, y: -46 };
    case 'reach':
      return lead ? { x: side * 18, y: -118 } : down;
    case 'point':
      return lead ? { x: side * 66, y: -72 } : down;
    // His own.
    case 'toolbox':
      return lead ? { x: side * 52, y: -34 } : down;
    case 'clipboard':
      return { x: side * 13, y: -54 };
    case 'blueprint':
      return { x: side * 32, y: -60 };
    case 'wrench':
      return lead ? { x: side * 10, y: -48 } : { x: side * 22, y: -40 };
    case 'screws':
      return { x: side * 18, y: -26 };
    case 'warm':
      return lead ? { x: side * 62, y: -50 } : down;
    default:
      return down;
  }
}

/** One arm: a jointed steel arm from his shoulder to a round claw hand. */
function drawArm(ctx, side, p) {
  const sx = side * SHOULDER_X;
  const sy = SHOULDER_Y;
  const h = handAt(side, p);
  // The elbow bends outward a little.
  const ex = (sx + h.x) / 2 + side * 6;
  const ey = (sy + h.y) / 2 + 4;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(h.x, h.y);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.steelShade;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  circle(ctx, ex, ey, 3.2);
  fillStroke(ctx, PALETTE.brass, 1.4);
  circle(ctx, h.x, h.y, 5.5);
  fillStroke(ctx, PALETTE.steel, 1.8);
  return h;
}

// --------------------------------------------------------------- props

function drawGlass(ctx, x, y, level, tilt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt || 0);
  ctx.beginPath();
  ctx.moveTo(-7, -11);
  ctx.lineTo(7, -11);
  ctx.lineTo(5.5, 11);
  ctx.lineTo(-5.5, 11);
  ctx.closePath();
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
    ctx.fillStyle = PALETTE.water;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-7, -11);
  ctx.lineTo(7, -11);
  ctx.lineTo(5.5, 11);
  ctx.lineTo(-5.5, 11);
  ctx.closePath();
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

/** The ball bearing he fetches (also drawn by the fetch ball window). */
function drawBearing(ctx, x, y, rot, r = 10) {
  ctx.save();
  ctx.translate(x, y);
  circle(ctx, 0, 0, r);
  fillStroke(ctx, '#c6ced6', Math.max(1.4, r * 0.16));
  // A highlight that turns as it rolls.
  ctx.rotate(rot || 0);
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.32, r * 0.32, r * 0.2, -0.6, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0.3, 1.4);
  ctx.strokeStyle = 'rgba(80, 90, 100, 0.45)';
  ctx.lineWidth = r * 0.12;
  ctx.stroke();
  ctx.restore();
}

function drawToolbox(ctx, h) {
  rrect(ctx, h.x - 12, h.y + 4, 24, 14, 3);
  fillStroke(ctx, PALETTE.toolbox, 1.8);
  line(ctx, h.x - 12, h.y + 9, h.x + 12, h.y + 9, 1.2, '#8f2a23');
  ctx.beginPath();
  ctx.moveTo(h.x - 6, h.y + 4);
  ctx.lineTo(h.x - 6, h.y - 1);
  ctx.lineTo(h.x + 6, h.y - 1);
  ctx.lineTo(h.x + 6, h.y + 4);
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** A clipboard with a little to-do list; ticks appear as `done` goes 0 → 1. */
function drawClipboard(ctx, p) {
  const x = (p.facing || 1) * (p.turn || 0) * 5;
  const y = -60;
  rrect(ctx, x - 14, y - 4, 28, 34, 3);
  fillStroke(ctx, '#a5774a', 1.8);
  rrect(ctx, x - 11, y, 22, 27, 2);
  fillStroke(ctx, PALETTE.paper, 1.2);
  rrect(ctx, x - 6, y - 7, 12, 6, 2);
  fillStroke(ctx, PALETTE.steel, 1.4);
  const ticks = Math.floor((p.propProgress || 0) * 3.999);
  for (let i = 0; i < 3; i++) {
    const ly = y + 6 + i * 7;
    rrect(ctx, x - 8, ly - 2.5, 5, 5, 1);
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    line(ctx, x - 1, ly, x + 8, ly, 1.2, '#7d8794');
    if (i < ticks) {
      ctx.beginPath();
      ctx.moveTo(x - 8, ly);
      ctx.lineTo(x - 6, ly + 2.5);
      ctx.lineTo(x - 2.5, ly - 3.5);
      ctx.strokeStyle = '#2f9e5a';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }
}

/** A blueprint held open between his hands. */
function drawBlueprint(ctx, p) {
  const x = (p.facing || 1) * (p.turn || 0) * 4;
  const y = -70;
  rrect(ctx, x - 34, y, 68, 34, 2);
  fillStroke(ctx, PALETTE.blueprint, 1.8);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 26, y + 7, 22, 16);
  ctx.beginPath();
  ctx.arc(x + 14, y + 15, 7, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 15);
  ctx.lineTo(x + 7, y + 15);
  ctx.moveTo(x - 26, y + 28);
  ctx.lineTo(x + 26, y + 28);
  ctx.stroke();
  ctx.restore();
}

/** A small brass steam boiler on the floor beside him, puffing. */
function drawBoiler(ctx, p) {
  const s = p.facing || 1;
  const x = s * 86;
  rrect(ctx, x - 16, -50, 32, 50, 8);
  fillStroke(ctx, PALETTE.brass, 2);
  rrect(ctx, x - 5, -62, 10, 13, 2);
  fillStroke(ctx, PALETTE.brassDark, 1.8);
  for (const y of [-42, -12]) line(ctx, x - 16, y, x + 16, y, 1.4, PALETTE.brassDark);
  circle(ctx, x, -27, 7);
  fillStroke(ctx, PALETTE.white, 1.4);
  const a = -Math.PI * 0.75 + Math.PI * 1.5 * (p.propProgress || 0);
  line(ctx, x, -27, x + Math.cos(a) * 5, -27 + Math.sin(a) * 5, 1.4, PALETTE.visor);
  drawPuff(ctx, x, -66, p.t);
  drawPuff(ctx, x + 4, -66, p.t + 0.5);
  // A cable from the boiler to his hand.
  const h = handAt(s, p);
  ctx.beginPath();
  ctx.moveTo(x - s * 16, -20);
  ctx.quadraticCurveTo((x + h.x) / 2, -6, h.x, h.y);
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** A tray of screws in front of him, sorted into piles as `sorted` goes 0 → 1. */
function drawScrews(ctx, p) {
  const x = (p.facing || 1) * (p.turn || 0) * 5;
  rrect(ctx, x - 30, -14, 60, 14, 3);
  fillStroke(ctx, PALETTE.steelShade, 1.8);
  const sorted = p.propProgress || 0;
  for (let i = 0; i < 9; i++) {
    const messyX = x - 24 + ((i * 37) % 48);
    const neatX = x - 20 + Math.floor(i / 3) * 20 + (i % 3) * 3;
    const sx = messyX + (neatX - messyX) * sorted;
    circle(ctx, sx, -8 - (i % 2) * 2, 2.6);
    fillStroke(ctx, i % 3 === 0 ? PALETTE.copper : PALETTE.steelLight, 1);
  }
}

/** The tiny wrench in his leading hand, turning a bolt on his chest. */
function drawWrench(ctx, p, h) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(-0.6 * (p.facing || 1) + Math.sin(p.t * 8) * 0.35);
  rrect(ctx, -2.5, -2, 5, 20, 2);
  fillStroke(ctx, PALETTE.steelLight, 1.6);
  ctx.beginPath();
  ctx.arc(0, -4, 5.5, Math.PI * 0.25, Math.PI * 1.75);
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.restore();
}

// --------------------------------------------------------------- him

function drawCharacter(ctx, p) {
  // Asleep ("lying" for others): power-saving mode, sitting low, eyes shut.
  if (p.view === 'lying') p = { ...p, view: 'front', feet: 'sit', arms: 'down', eyes: 'closed', mouth: 'flat', turn: 0, lying: true };
  ctx.save();
  ctx.rotate(p.tilt || 0);
  ctx.translate(0, p.bob || 0);
  ctx.scale(p.scaleX || 1, p.scaleY || 1);
  const back = p.view === 'back';
  const sitting = p.feet === 'sit';

  // Props on the floor behind him.
  if (!back && p.prop === 'boiler') drawBoiler(ctx, p);
  drawWheels(ctx, p);
  if (sitting) ctx.translate(0, SIT_DROP);
  drawAntenna(ctx, p);
  if (back) {
    drawArm(ctx, -1, p);
    drawArm(ctx, 1, p);
  }
  drawVents(ctx, p);
  drawBody(ctx, p, back);
  if (!back) {
    drawVisor(ctx, p);
    drawMouth(ctx, p);
    if (p.prop === 'blueprint') drawBlueprint(ctx, p);
    if (p.prop === 'clipboard') drawClipboard(ctx, p);
    if (p.prop === 'screws') {
      ctx.save();
      if (sitting) ctx.translate(0, -SIT_DROP);
      drawScrews(ctx, p);
      ctx.restore();
    }
    const left = drawArm(ctx, -1, p);
    const right = drawArm(ctx, 1, p);
    const lead = (p.facing || 1) > 0 ? right : left;
    if (p.prop === 'glass') {
      const lift = p.glassLift || 0;
      drawGlass(ctx, lead.x, lead.y - 6 - lift * 4, p.propProgress, -(p.facing || 1) * 0.5 * lift);
    }
    if (p.prop === 'bearing') drawBearing(ctx, (left.x + right.x) / 2, (left.y + right.y) / 2 - 4, 0, 9);
    if (p.prop === 'toolbox') drawToolbox(ctx, lead);
    if (p.prop === 'wrench') drawWrench(ctx, p, lead);
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
    mouth: 'smallSmile',
    blink: 0,
    lookX: 0,
    lookY: 0,
    blush: 0.2,
    prop: null,
    steam: false,
    keySpin: 0,
  };
}

// --------------------------------------------------------------- his activities

// How his own activities look, called by computePose in
// src/renderer/renderer.js with the pose so far (`p`), the frame from the
// main process (`f`) and a kit: { t, st, duration, dt, clamp, walkCycle, overlay }.
const ACTIVITY_POSES = {
  // Recharging beside his little boiler (fixes hunger): a cable to his hand,
  // his bulb pulsing, then a happy puff when he's full.
  recharge(p, f, k) {
    const u = k.st / k.duration;
    p.feet = 'sit';
    p.prop = 'boiler';
    p.arms = 'warm';
    p.propProgress = k.clamp(u, 0, 1);
    p.bulbPulse = u < 0.85;
    p.lookX = f.facing * 0.8;
    if (u < 0.85) {
      p.eyes = 'content';
      p.mouth = 'smallSmile';
    } else {
      p.eyes = 'happy';
      p.mouth = 'open';
      p.steam = true;
      p.blush = 0.6;
    }
  },
  // Rolling along with his toolbox.
  toolbox(p, f, k) {
    k.walkCycle(p, f, 10, 1);
    p.arms = 'toolbox';
    p.prop = 'toolbox';
    p.armSwing = 0;
    p.eyes = 'open';
    p.mouth = 'smile';
  },
  // Checking things off his to-do list, one tick at a time; pleased at the end.
  checklist(p, f, k) {
    const u = k.st / k.duration;
    p.arms = 'clipboard';
    p.prop = 'clipboard';
    p.propProgress = k.clamp(u / 0.85, 0, 1);
    p.lookY = 0.8;
    if (u < 0.85) {
      p.eyes = 'open';
      p.mouth = 'flat';
    } else {
      p.eyes = 'happy';
      p.mouth = 'smile';
      p.blush = 0.5;
    }
  },
  // Studying a tiny blueprint, eyes moving over it.
  blueprint(p, f, k) {
    p.feet = 'sit';
    p.arms = 'blueprint';
    p.prop = 'blueprint';
    p.eyes = 'open';
    p.mouth = 'o';
    p.lookX = Math.sin(k.t * 1.6) * 0.9;
    p.lookY = 0.6;
  },
  // Sorting screws into neat piles; a small nod when they're done.
  screws(p, f, k) {
    const u = k.st / k.duration;
    p.feet = 'sit';
    p.arms = 'screws';
    p.prop = 'screws';
    p.propProgress = k.clamp(u / 0.8, 0, 1);
    p.lookY = 1;
    p.lookX = Math.sin(k.t * 3) * 0.5;
    p.eyes = u < 0.8 ? 'open' : 'content';
    p.mouth = u < 0.8 ? 'flat' : 'smallSmile';
  },
  // Tightening his bolts with a tiny wrench.
  fix(p, f, k) {
    const u = k.st / k.duration;
    p.feet = 'sit';
    p.arms = 'wrench';
    p.prop = 'wrench';
    p.lookY = 0.9;
    p.eyes = u < 0.8 ? 'squint' : 'happy';
    p.mouth = u < 0.8 ? 'flat' : 'smile';
    if (u >= 0.8) p.steam = true;
  },
  // After a throw: only his eyes react, swirling (Tonk decision).
  dizzy(p, f, k) {
    p.eyes = 'dizzy';
    p.mouth = 'wavy';
    p.tilt = Math.sin(k.t * 5) * 0.06;
    p.arms = 'down';
  },
};

/** His own take on shared states: a puff of steam when he's happy or cross. */
function restyle(state, p) {
  if (state === 'happy' || state === 'angry') p.steam = true;
}

/**
 * Watching something with you, his reaction to a moment: sitting with his
 * back to you, his bulb glowing; it flashes when it's exciting and dims
 * when it's sad.
 */
function watchPose(mood, p, f, k) {
  p.feet = 'sit';
  switch (mood) {
    case 'exciting':
      p.view = 'back';
      p.bob = -Math.abs(Math.sin(k.t * 9)) * 2.5;
      p.bulbPulse = true;
      p.steam = true;
      break;
    case 'funny':
      p.view = 'back';
      p.tilt = Math.sin(k.t * 14) * 0.07;
      break;
    case 'beautiful':
      p.view = 'back';
      p.tilt = Math.sin(k.t * 1.5) * 0.04;
      p.bulbPulse = true;
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

window.Characters = window.Characters || {};
window.Characters.tonk = Object.assign(window.Characters.tonk || {}, {
  draw: drawCharacter,
  defaultPose,
  BODY_CY: CY,
  HEAD_TOP: BODY_TOP - 26,
  turned: { toolbox: 1, recharge: 0.5, blueprint: 0.3 },
  activityPose: ACTIVITY_POSES,
  watchPose,
  restyle,
  overlays: {},
  // What he holds while carrying the fetch bearing back to you.
  heldProp: 'bearing',
  drawFetchItem: drawBearing,
});
})();
