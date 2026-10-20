// Procedural drawing of the companion: Togepi, a little egg-shell Pokémon.
// Everything is drawn relative to his feet at (0, 0); up is negative y.
// Wrapped in an IIFE so its helpers don't leak into the page's global scope.
(function () {
'use strict';

// Colours sampled from the reference sheet.
const PALETTE = {
  outline: '#3a2d25',
  head: '#fdefbd',
  headShade: '#efd9a6',
  headBack: '#f3e2b0',
  limb: '#f7deab', // arms and feet are a touch warmer than the head
  shell: '#fcf5ee',
  shellShade: 'rgba(160, 160, 205, 0.14)',
  red: '#df6166',
  blue: '#5c9bc8',
  cheek: 'rgba(243, 160, 157, ',
  eye: '#2a211c',
  white: '#ffffff',
  mouth: '#b8434f',
  tongue: '#f58a95',
};

// Body: a round dome of a head on a full, wide belly. The top half of the
// outline is an ellipse; the bottom half is a "superellipse" so the belly
// stays wide until close to the feet, like in the reference.
const CY = -53; // widest point of the belly (high enough for the feet to show)
const SIT_DROP = 13; // how far the body sinks onto the floor when sitting
const R = 49; // half width
const RY = 62; // height of the head dome above the widest point
const RY_BELLY = 37; // depth of the belly below the widest point
const BELLY = 2.3; // superellipse exponent for the belly (2 = plain ellipse)
const FACE_Y = CY - 33; // eye line
const SHELL_Y = -13; // height of the shell's zig-zag edge above the widest point
const HEAD_NARROW = 0.13; // how much narrower the head gets towards the top

// Spikes on top of the head. Seen from the front there are three big ones,
// joined edge to edge: a tall centre one and one on each side pointing out.
// Two smaller ones sit further back and only peek out of the V between them.
// Angles are degrees around the egg, -90 = straight up.
//   base: where the spike sits on the head, hw: half its width at the base,
//   tip: direction it points, len: how far it sticks out past the head.
const FRONT_SPIKES = [
  { base: -131.5, hw: 15.5, tip: -137, len: 16.5 },
  { base: -90, hw: 26, tip: -90, len: 12.5 },
  { base: -48.5, hw: 15.5, tip: -43, len: 16.5 },
];
const BACK_SPIKES = [
  { base: -116, hw: 9, tip: -116, len: 8 },
  { base: -64, hw: 9, tip: -64, len: 8 },
];

// Zig-zag edge of the shell: [x, y offset from the body centre] (front view).
// The two ends are snapped onto the egg's outline.
function zigzag(lift) {
  const pts = [
    [-46, 0], [-36, -6], [-26, 1], [-15, -6.5], [-4.5, 0], [7, -5.5],
    [17, 1], [28, -6], [37, -0.5], [46, 0],
  ].map(([x, y]) => [(x * R) / 46, CY + SHELL_Y + y - lift]);
  for (const i of [0, pts.length - 1]) {
    const sn = (pts[i][1] - CY) / RY;
    pts[i][0] = Math.sign(pts[i][0]) * R * Math.sqrt(1 - sn ** 2) * headNarrowing(sn);
  }
  return pts;
}
const ZIGZAG = zigzag(0);
const ZIGZAG_BACK = zigzag(9);

// Triangle markings on the shell: [x, y, size, rotation (rad), colour]
// (y is relative to the widest point of the belly.)
const MARKS_FRONT = [
  [3, 9, 11, Math.PI / 2 + 0.12, 'blue'],
  [-27, 15, 8, 0.2, 'red'],
  [32, 2, 7.5, -0.5, 'red'],
  [-41, 0, 6.5, 1.2, 'blue'],
  [18, 27, 6.5, 0.1, 'red'],
];
const MARKS_BACK = [
  [-4, 6, 11, 0.4, 'blue'],
  [27, 16, 7.5, -0.3, 'red'],
  [-29, 19, 7.5, 0.9, 'red'],
  [38, -6, 6, 1.6, 'red'],
];

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

function fillStroke(ctx, fill, lineWidth = 2) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

// Point at angle `deg` around the head dome, `r` measured in half-widths
// (r = R is on the outline). Used for the spikes, which are all on top.
function polar(deg, r) {
  const a = (deg * Math.PI) / 180;
  const sn = Math.sin(a);
  return [Math.cos(a) * r * headNarrowing(sn), CY + sn * r * (RY / R)];
}

// The head is a little narrower than the belly: 1 at the widest point,
// shrinking towards the top.
function headNarrowing(sn) {
  return sn < 0 ? 1 - HEAD_NARROW * -sn : 1;
}

// Point on the body outline at angle `deg` (0 = right, 90 = bottom).
function outlinePoint(deg) {
  const a = rad(deg);
  const c = Math.cos(a);
  const sn = Math.sin(a);
  if (sn <= 0) return [R * c * headNarrowing(sn), CY + RY * sn];
  const k = 2 / BELLY;
  return [R * Math.sign(c) * Math.abs(c) ** k, CY + RY_BELLY * sn ** k];
}

// Trace the body outline clockwise from one angle to another.
function eggArc(ctx, fromDeg, toDeg) {
  if (toDeg < fromDeg - 0.5) toDeg += 360;
  else if (toDeg <= fromDeg) return; // nothing between touching spikes
  const steps = Math.max(2, Math.ceil((toDeg - fromDeg) / 3));
  for (let i = 0; i <= steps; i++) {
    const [x, y] = outlinePoint(fromDeg + ((toDeg - fromDeg) * i) / steps);
    ctx.lineTo(x, y);
  }
}

// Spikes for the current pose. When he turns to one side (3/4 view) they
// shift that way: the near-side spike gets shorter, the far back spike shows more.
function spikesFor(p) {
  // -1..1: how far he's turned towards his left/right (0 = facing you).
  const turn = p.view === 'back' ? 0 : p.facing * p.turn;
  const amount = Math.abs(turn);
  const dir = Math.sign(turn);
  const shift = turn * 7;
  const side = (sp) => Math.sign(sp.tip + 90); // -1 left spike, 1 right, 0 centre
  const front = FRONT_SPIKES.map((sp) => {
    const near = dir !== 0 && side(sp) === dir;
    const far = dir !== 0 && side(sp) === -dir;
    const scale = near ? 1 - 0.18 * amount : far ? 1 + 0.05 * amount : 1;
    return { ...sp, base: sp.base + shift, tip: sp.tip + shift, len: sp.len * scale };
  });
  const back = BACK_SPIKES.map((sp) => {
    const near = dir !== 0 && side(sp) === dir;
    const scale = near ? 1 - 0.45 * amount : 1 + 0.25 * amount;
    return { ...sp, base: sp.base + shift, tip: sp.tip + shift, len: sp.len * scale };
  });
  return { front, back };
}

// Outline of one spike from its first base point to its second, with a soft tip.
function spikeCurve(ctx, sp, baseR) {
  const [b1x, b1y] = polar(sp.base - sp.hw, baseR);
  const [b2x, b2y] = polar(sp.base + sp.hw, baseR);
  const [tx, ty] = polar(sp.tip, R + sp.len);
  const [mx, my] = polar(sp.base, baseR);
  // Control points halfway up each side, nudged outwards so the sides bulge slightly.
  const bulge = 0.18;
  const c1x = (b1x + tx) / 2 + ((b1x + tx) / 2 - mx) * bulge;
  const c1y = (b1y + ty) / 2 + ((b1y + ty) / 2 - my) * bulge;
  const c2x = (b2x + tx) / 2 + ((b2x + tx) / 2 - mx) * bulge;
  const c2y = (b2y + ty) / 2 + ((b2y + ty) / 2 - my) * bulge;
  const round = 0.2;
  ctx.quadraticCurveTo(c1x, c1y, tx + (c1x - tx) * round, ty + (c1y - ty) * round);
  ctx.quadraticCurveTo(tx, ty, tx + (c2x - tx) * round, ty + (c2y - ty) * round);
  ctx.quadraticCurveTo(c2x, c2y, b2x, b2y);
}

function rad(deg) {
  return (deg * Math.PI) / 180;
}

// Silhouette of head + body: a circle with the front spikes on top.
function bodyPath(ctx, spikes) {
  ctx.beginPath();
  eggArc(ctx, 0, 180); // bottom half, right to left
  let angle = -180;
  for (const sp of spikes) {
    eggArc(ctx, angle, sp.base - sp.hw);
    spikeCurve(ctx, sp, R);
    angle = sp.base + sp.hw;
  }
  eggArc(ctx, angle, 0);
  ctx.closePath();
}

// A spike further back on the head; drawn before the body so only its tip shows.
function drawBackSpike(ctx, sp) {
  ctx.beginPath();
  const [bx, by] = polar(sp.base - sp.hw, R - 6);
  ctx.moveTo(bx, by);
  spikeCurve(ctx, sp, R - 6);
  ctx.closePath();
  fillStroke(ctx, PALETTE.headBack);
}

function shellPath(ctx, zig) {
  ctx.beginPath();
  ctx.moveTo(zig[0][0], zig[0][1]);
  for (let i = 1; i < zig.length; i++) ctx.lineTo(zig[i][0], zig[i][1]);
  // The zig-zag ends sit on the head dome; follow the outline round the belly.
  const last = zig[zig.length - 1];
  const angleOf = ([x, y]) => {
    const sn = (y - CY) / RY;
    return Math.atan2(sn, x / (R * headNarrowing(sn))) * (180 / Math.PI);
  };
  const startA = angleOf(last);
  const endA = angleOf(zig[0]);
  eggArc(ctx, startA, endA);
  ctx.closePath();
}

function drawMark(ctx, x, y, size, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 3;
    ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
  }
  ctx.closePath();
  // White centre first, then a thick rounded border over it.
  ctx.fillStyle = PALETTE.shell;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.52;
  ctx.strokeStyle = PALETTE[color];
  ctx.stroke();
  ctx.restore();
}

// --------------------------------------------------------------- limbs

// A foot: a rounded cone, i.e. the outline wrapped around a big circle
// (the rounded end, centred at (x, y)) and a small one (the soft tip) `len`
// away in direction `angle`. `tipRound` is the tip radius / end radius.
// `shade`, if given, is called (in body coordinates, clipped to the foot)
// to darken part of it, e.g. where the belly hangs over it.
function footShape(ctx, x, y, angle, len, width, tipRound = 0.45, shade = null) {
  const rt = width * tipRound;
  const cx = len - rt; // centre of the tip circle
  const a = Math.acos(Math.min(1, (width - rt) / cx)); // where the straight sides touch
  const outline = () => {
    ctx.beginPath();
    ctx.arc(cx, 0, rt, -a, a); // round the tip
    ctx.arc(0, 0, width, a, Math.PI * 2 - a); // and the back
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  outline();
  ctx.fillStyle = PALETTE.limb;
  ctx.fill();
  if (shade) {
    ctx.save();
    ctx.clip();
    ctx.rotate(-angle);
    ctx.translate(-x, -y);
    shade(ctx);
    ctx.restore();
    outline(); // shade() drew its own path; rebuild ours for the stroke
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

// A standing/dangling leg like the reference: a curvy oval with bulging
// sides that narrows to a soft point at the far end (u = 1). (x, y) is its
// centre, `angle` the direction it points, `len`/`width` its half-length and
// greatest half-width.
function ovalLeg(ctx, x, y, angle, len, width, shade = null) {
  const outline = () => {
    ctx.beginPath();
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const u = Math.cos(t); // -1 (top, under the belly) .. 1 (tip)
      // An egg shape: a smooth ellipse whose tip end is narrower than its
      // root, so it tapers to a soft, rounded point with no kink.
      const half = width * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - 0.42 * u);
      ctx.lineTo(len * u, half * Math.sign(Math.sin(t)));
    }
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  outline();
  ctx.fillStyle = PALETTE.limb;
  ctx.fill();
  if (shade) {
    ctx.save();
    ctx.clip();
    ctx.rotate(-angle);
    ctx.translate(-x, -y);
    shade(ctx);
    ctx.restore();
    outline();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

// A standing leg pointing down and out at `tilt` radians from vertical, its
// tip resting at (tipX, tipY). The root is hidden behind the lower belly.
function sideLeg(ctx, side, tipX, tipY, tilt, len, width) {
  const dx = side * Math.sin(tilt);
  const dy = Math.cos(tilt);
  ovalLeg(ctx, side * tipX - dx * len, tipY - dy * len, Math.atan2(dy, dx), len, width, bellyShadow);
}

// Shadow of the round belly falling across the tops of the legs, so the
// belly reads as hanging out in front of them.
function bellyShadow(ctx) {
  ellipse(ctx, 0, CY + RY_BELLY - 1, R * 0.92, 8);
  ctx.fillStyle = 'rgba(170, 120, 60, 0.26)';
  ctx.fill();
}

function drawFoot(ctx, side, p) {
  const lift = Math.max(0, Math.sin(p.walkPhase + (side > 0 ? Math.PI : 0))) * p.stepHeight;
  if (p.feet === 'dangle') {
    // Hanging down from under the belly, kicking.
    const kick = Math.sin(p.t * 13 + side) * 3;
    sideLeg(ctx, side, 35, 2 + kick, 0.9, 14, 8.5);
  } else if (p.feet === 'sit') {
    // Plump feet sticking out in front, tapering in towards the body.
    footShape(ctx, side * 31, -10 - SIT_DROP, Math.atan2(-0.8, -side * 0.6), 15, 10.5, 0.5);
  } else {
    // Standing: little cones poking out from under the belly, tips down.
    // Standing: the feet splay outwards, tips pointing down and out.
    // Standing: legs come out of the lower sides of the belly, pointing down and out.
    sideLeg(ctx, side, 35 + lift * 0.3, -1.5 - lift, 0.85, 14, 8.5);
  }
}

// The Pokeball held out in front in both hands, for fetch (keep in sync with
// HELD_BALL in src/main/companion.js: same point, in screen px).
const HELD = { x: 2.6, y: CY - 3, r: 12 };
// Where the hands sit on the ball's sides (from its centre), and the arm's angle.
const GRIP = { reach: HELD.r - 3, shoulder: 13, angle: 1.75 };

function armAngle(side, p) {
  // Local +y of the nub points along the arm. Angle a gives direction (-sin a, cos a).
  const lead = side === p.facing;
  switch (p.arms) {
    case 'up':
      return -side * (2.35 + Math.sin(p.t * 15 + side) * 0.2);
    case 'flail':
      return -side * (1.6 + Math.sin(p.t * 20 + side * 2) * 0.7);
    case 'wave':
      return lead ? -side * (2.5 + Math.sin(p.t * 11) * 0.45) : -side * 0.45;
    case 'hold':
      return side * 2.0;
    case 'hug':
      return side * 1.25;
    case 'cheer':
      return -side * (1.9 + Math.abs(Math.sin(p.t * 8)) * 0.4);
    case 'fists':
      return -side * (0.9 + Math.sin(p.t * 18) * 0.15);
    case 'stretch':
      // Both arms reaching up and out over his head (a slow sway as he stretches).
      return -side * (2.55 + Math.sin(p.t * 1.6) * 0.08);
    case 'shade':
      // Leading hand up at his brow, shading his eyes; the other one down.
      return lead ? side * 2.28 : -side * 0.3;
    case 'sip':
      // Both hands bringing the glass up to his mouth.
      return side * 2.45;
    case 'grip':
      // Both hands on the sides of the ball.
      return side * GRIP.angle;
    default:
      return -side * (0.3 + Math.sin(p.walkPhase + (side > 0 ? 0 : Math.PI)) * p.armSwing);
  }
}

function drawArm(ctx, side, p) {
  const inward = p.arms === 'hold' || p.arms === 'hug';
  ctx.save();
  if (p.arms === 'shade' && side === p.facing) ctx.translate(side * 36, CY - 22);
  else if (p.arms === 'stretch') ctx.translate(side * 47, CY - 22);
  else if (p.arms === 'sip') ctx.translate(side * 30, CY - 12);
  else if (p.arms === 'grip') ctx.translate(p.facing * HELD.x + side * (GRIP.reach + GRIP.shoulder), HELD.y + 4);
  else ctx.translate(side * (inward ? 35 : 43), CY + (inward ? 0 : -9));
  ctx.rotate(armAngle(side, p));
  ellipse(ctx, 0, 6, 6.5, 8.5);
  fillStroke(ctx, PALETTE.limb, 2.1);
  ctx.restore();
}

// --------------------------------------------------------------- face

function drawEye(ctx, x, y, side, p) {
  ctx.save();
  ctx.translate(x + p.lookX * 2, y + p.lookY * 1.5);
  ctx.strokeStyle = PALETTE.eye;
  ctx.fillStyle = PALETTE.eye;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.4;
  const open = 1 - p.blink;
  const closedArc = (dir) => {
    ctx.beginPath();
    ctx.moveTo(-4.5, 0);
    ctx.quadraticCurveTo(0, dir * 5, 4.5, 0);
    ctx.stroke();
  };
  switch (p.eyes) {
    case 'happy': // ^ ^
      closedArc(-1);
      break;
    case 'content': // ‿ ‿ (peaceful, eyes closed)
    case 'closed':
      closedArc(1);
      break;
    case 'squint': // > <
      ctx.beginPath();
      ctx.moveTo(-side * 4, -4);
      ctx.lineTo(side * 3.5, 0);
      ctx.lineTo(-side * 4, 4);
      ctx.stroke();
      break;
    case 'meh':
    case 'sleepy': {
      // Half-closed eyes: a flat upper lid over the eye ("meh"), lower when tired.
      const lid = p.eyes === 'meh' ? -1.6 : 0.6;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-6, lid, 12, 10);
      ctx.clip();
      ellipse(ctx, 0, 0, 3.7, 5.5);
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ellipse(ctx, -1.1, lid + 1.7, 1.3, 1.3);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-4.6, lid);
      ctx.lineTo(4.6, lid);
      ctx.lineWidth = 2.2;
      ctx.stroke();
      break;
    }
    case 'sad':
    case 'angry': {
      ellipse(ctx, 0, 1, 3, 3.8 * Math.max(0.1, open));
      ctx.fill();
      ctx.fillStyle = PALETTE.white;
      ellipse(ctx, -0.9, -0.3, 1.1, 1.2);
      ctx.fill();
      // Brows: worried (inner end up) or angry (inner end down).
      const inner = p.eyes === 'sad' ? -9.5 : -4.5;
      const outer = p.eyes === 'sad' ? -6 : -8.5;
      ctx.beginPath();
      ctx.moveTo(side * 5, outer);
      ctx.lineTo(-side * 3, inner);
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    default: {
      const big = p.eyes === 'wide' ? 1.25 : p.eyes === 'small' ? 0.8 : 1;
      ellipse(ctx, 0, 0, 3.7 * big, 5.5 * big * Math.max(0.1, open));
      ctx.fill();
      if (open > 0.4) {
        ctx.fillStyle = PALETTE.white;
        ellipse(ctx, -1.1 + p.lookX * 0.6, -2, 1.6 * big, 1.9 * big);
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
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let kind = p.mouth;
  if (kind === 'talk') kind = Math.sin(p.t * 16) > 0 ? 'open' : 'smile';
  if (kind === 'chew') kind = Math.sin(p.t * 12) > 0 ? 'smallSmile' : 'flat';
  const openMouth = (w, h) => {
    ctx.beginPath();
    ctx.moveTo(-w, -1);
    ctx.quadraticCurveTo(0, -2, w, -1);
    ctx.quadraticCurveTo(w * 0.6, h, 0, h);
    ctx.quadraticCurveTo(-w * 0.6, h, -w, -1);
    ctx.closePath();
    ctx.fillStyle = PALETTE.mouth;
    ctx.fill();
    ctx.stroke();
    ellipse(ctx, 0, h * 0.62, w * 0.45, h * 0.25);
    ctx.fillStyle = PALETTE.tongue;
    ctx.fill();
  };
  switch (kind) {
    case 'open':
      openMouth(4.2, 6);
      break;
    case 'smile': // small open smile, his usual face
      openMouth(3, 4);
      break;
    case 'smallSmile':
      ctx.beginPath();
      ctx.moveTo(-3.5, 0);
      ctx.quadraticCurveTo(0, 3.5, 3.5, 0);
      ctx.stroke();
      break;
    case 'o':
      ellipse(ctx, 0, 1.5, 2.6, 3.3);
      ctx.fillStyle = PALETTE.mouth;
      ctx.fill();
      ctx.stroke();
      break;
    case 'frown':
      ctx.beginPath();
      ctx.moveTo(-3.5, 2.5);
      ctx.quadraticCurveTo(0, -1.5, 3.5, 2.5);
      ctx.stroke();
      break;
    case 'growl': // angry open frown
      ctx.beginPath();
      ctx.moveTo(-4, 3);
      ctx.quadraticCurveTo(0, -2.5, 4, 3);
      ctx.closePath();
      ctx.fillStyle = PALETTE.mouth;
      ctx.fill();
      ctx.stroke();
      break;
    case 'wavy':
      ctx.beginPath();
      ctx.moveTo(-4.5, 1);
      ctx.quadraticCurveTo(-2.2, -1.5, 0, 1);
      ctx.quadraticCurveTo(2.2, 3.5, 4.5, 1);
      ctx.stroke();
      break;
    case 'flat':
      ctx.beginPath();
      ctx.moveTo(-2.5, 1);
      ctx.lineTo(2.5, 1);
      ctx.stroke();
      break;
    case 'yawn': // a big, tall yawn
      ellipse(ctx, 0, 3, 3.6, 5.6);
      ctx.fillStyle = PALETTE.mouth;
      ctx.fill();
      ctx.stroke();
      ellipse(ctx, 0, 6, 2.2, 1.6);
      ctx.fillStyle = PALETTE.tongue;
      ctx.fill();
      break;
    default:
      openMouth(3, 4);
  }
  ctx.restore();
}

// --------------------------------------------------------------- props

function drawApple(ctx, x, y, progress) {
  // Bites are taken out of it as `progress` goes 0 -> 1.
  const bites = Math.min(3, Math.floor(progress * 4));
  if (bites >= 3 && progress > 0.9) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.save();
  if (bites > 0) {
    ctx.beginPath();
    ctx.rect(-30, -30, 60, 60);
    const biteSpots = [[-10, -4], [9, -6], [0, -11]];
    for (let i = 0; i < bites; i++) {
      ctx.moveTo(biteSpots[i][0] + 5, biteSpots[i][1]);
      ctx.arc(biteSpots[i][0], biteSpots[i][1], 5, 0, TAU);
    }
    ctx.clip('evenodd');
  }
  ellipse(ctx, 0, 0, 11, 10.5);
  ctx.fillStyle = '#e53941';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ellipse(ctx, -3.5, -3, 2.2, 3, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  ctx.restore();
  // Stem + leaf.
  ctx.beginPath();
  ctx.moveTo(0, -9.5);
  ctx.lineTo(1, -13.5);
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ellipse(ctx, 4.5, -13.5, 3.8, 2, -0.4);
  fillStroke(ctx, '#6cbf5a', 1.4);
  ctx.restore();
}

// A glass of water. `level` 0..1 is how full it is; `tilt` tips it (radians).
function drawGlass(ctx, x, y, level, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const top = -16;
  const bottom = 11;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-10, top);
    ctx.lineTo(10, top);
    ctx.lineTo(7.5, bottom);
    ctx.quadraticCurveTo(0, bottom + 2.5, -7.5, bottom);
    ctx.closePath();
  };
  path();
  ctx.fillStyle = 'rgba(225, 243, 252, 0.85)';
  ctx.fill();
  // Water.
  if (level > 0.02) {
    ctx.save();
    path();
    ctx.clip();
    const wy = bottom - (bottom - top) * Math.min(1, level);
    ctx.beginPath();
    ctx.rect(-12, wy, 24, bottom - wy + 3);
    ctx.fillStyle = '#8fcdf0';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-11, wy);
    ctx.lineTo(11, wy);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#4b9fd0';
    ctx.stroke();
    ctx.restore();
  }
  path();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // Shine.
  ctx.beginPath();
  ctx.moveTo(-5.5, top + 5);
  ctx.lineTo(-4.5, bottom - 5);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
  ctx.restore();
}

function drawDaisy(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    ellipse(ctx, Math.cos(a) * size * 0.75, Math.sin(a) * size * 0.75, size * 0.55, size * 0.32, a);
    fillStroke(ctx, '#ffffff', 1.2);
  }
  ellipse(ctx, 0, 0, size * 0.42, size * 0.42);
  fillStroke(ctx, '#ffd23f', 1.2);
  ctx.restore();
}

function drawFlower(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(3, 4, -1, 16);
  ctx.lineWidth = 4;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#5fae4e';
  ctx.stroke();
  ellipse(ctx, 5, 5, 4.5, 2.2, -0.6);
  fillStroke(ctx, '#78c766', 1.3);
  drawDaisy(ctx, 0, -14, 7.5);
  ctx.restore();
}

// His ball, a Pokeball (also the one you throw for fetch).
function drawBall(ctx, x, y, rot, r = 11) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = '#e53941';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ellipse(ctx, 0, 0, r, r);
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ellipse(ctx, 0, 0, r * 0.27, r * 0.27);
  fillStroke(ctx, '#ffffff', 1.8);
  ctx.restore();
}

// Backpack for adventures (the "Going on an adventure" panel): a tall blue
// bag on his back that sticks out past his body, and a strap that loops
// around his arm on that side and runs back into the bag.
const BAG = '#3f7ec9';
const BAG_LIGHT = '#5a97dc';

function bagSide(p) {
  return -p.facing; // the bag sits on his back
}

function drawBackpackBag(ctx, p) {
  const side = bagSide(p);
  ctx.save();
  ctx.translate(side * 46, CY + 13);
  ctx.rotate(side * 0.16);
  // Top handle.
  ctx.beginPath();
  ctx.arc(0, -27, 5.5, Math.PI, 0);
  ctx.lineWidth = 5;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = BAG;
  ctx.stroke();
  // Bag.
  ctx.beginPath();
  ctx.roundRect(-15.5, -27, 31, 52, 13);
  fillStroke(ctx, BAG, 2.2);
  // Front pocket and a seam.
  ctx.beginPath();
  ctx.roundRect(-11 + side * 2, 3, 22, 17, 7);
  fillStroke(ctx, BAG_LIGHT, 1.8);
  ctx.beginPath();
  ctx.moveTo(-10, -7);
  ctx.quadraticCurveTo(0, -4, 10, -7);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.restore();
}

// Shoulder straps, drawn over the body but under the arms:
// - near strap: leaves the top of the bag, goes over his shoulder, down past
//   his arm and back into the bottom of the bag (his arm sits in the loop);
// - far strap: shows over his other shoulder at the edge of his body.
function strapStroke(ctx, scale = 1) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7.5 * scale;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.lineWidth = 4.8 * scale;
  ctx.strokeStyle = BAG;
  ctx.stroke();
  // Stitching down the middle of the strap.
  ctx.setLineDash([2.5, 2.5]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBackpackStraps(ctx, p) {
  const side = bagSide(p);
  ctx.save();
  // Near strap.
  ctx.beginPath();
  ctx.moveTo(side * 46, CY - 11); // top of the bag
  ctx.bezierCurveTo(side * 40, CY - 26, side * 27, CY - 22, side * 27, CY - 8); // over the shoulder
  ctx.bezierCurveTo(side * 27, CY + 6, side * 33, CY + 18, side * 44, CY + 22); // down into the bag
  strapStroke(ctx);
  // Far strap, over the other shoulder at the body's edge.
  const far = -side;
  ctx.save();
  bodyPath(ctx, spikesFor(p).front);
  ctx.clip();
  ctx.beginPath();
  // A short band just inside the edge of his far shoulder, starting at the
  // shell's edge and running down behind his arm.
  ctx.moveTo(far * 38, CY - 19);
  ctx.quadraticCurveTo(far * 44, CY - 13, far * 46, CY - 3);
  strapStroke(ctx, 0.8);
  ctx.restore();
  ctx.restore();
}

// --------------------------------------------------------------- body

function drawBodyAndShell(ctx, p, back) {
  const spikes = spikesFor(p);
  for (const sp of spikes.back) drawBackSpike(ctx, sp);

  // Head + body in yellow.
  bodyPath(ctx, spikes.front);
  fillStroke(ctx, PALETTE.head);

  // Soft shading low on the head.
  ctx.save();
  bodyPath(ctx, spikes.front);
  ctx.clip();
  ellipse(ctx, 0, CY + SHELL_Y + 2, R + 4, 16);
  ctx.fillStyle = PALETTE.headShade;
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.restore();

  // Shell.
  const zig = back ? ZIGZAG_BACK : ZIGZAG;
  const shift = back ? 0 : p.facing * p.turn * 3; // a hint of 3/4 view
  shellPath(ctx, zig);
  ctx.fillStyle = PALETTE.shell;
  ctx.fill();
  ctx.save();
  shellPath(ctx, zig);
  ctx.clip();
  for (const [x, y, s, rot, c] of back ? MARKS_BACK : MARKS_FRONT) drawMark(ctx, x + shift, CY + y, s * 1.05, rot, c);
  ellipse(ctx, 6, CY + 32, R + 6, 16);
  ctx.fillStyle = PALETTE.shellShade;
  ctx.fill();
  ctx.restore();
  shellPath(ctx, zig);
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function drawFace(ctx, p) {
  const fx = p.facing * p.turn * 3.5;
  drawEye(ctx, fx - 11.5, FACE_Y, -1, p);
  drawEye(ctx, fx + 11.5, FACE_Y, 1, p);
  const blush = p.blush;
  if (blush > 0.01) {
    ctx.fillStyle = PALETTE.cheek + (0.35 + 0.5 * blush) + ')';
    ellipse(ctx, fx - 21, FACE_Y + 6, 5.5 + blush, 3.2);
    ctx.fill();
    ellipse(ctx, fx + 21, FACE_Y + 6, 5.5 + blush, 3.2);
    ctx.fill();
    if (blush > 0.8) {
      // Little blush hatching when he's really flustered.
      ctx.strokeStyle = 'rgba(220, 90, 100, 0.7)';
      ctx.lineWidth = 1.1;
      for (const sx of [-21, 21]) {
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(fx + sx + i * 2.6 - 1, FACE_Y + 7.5);
          ctx.lineTo(fx + sx + i * 2.6 + 1, FACE_Y + 4.5);
          ctx.stroke();
        }
      }
    }
  }
  drawMouth(ctx, fx, FACE_Y + 9, p);
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

  if (p.view === 'lying') {
    drawLying(ctx, p);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.scale(p.scaleX, p.scaleY);
  if (p.feet === 'sit') ctx.translate(0, SIT_DROP);
  const back = p.view === 'back';

  if (p.prop === 'backpack' && !back) drawBackpackBag(ctx, p);

  // Feet come out from behind the belly, except when sitting (in front).
  if (p.feet !== 'sit' || back) {
    drawFoot(ctx, -1, p);
    drawFoot(ctx, 1, p);
  }
  if (back) {
    drawArm(ctx, -1, p);
    drawArm(ctx, 1, p);
  }

  drawBodyAndShell(ctx, p, back);

  if (back) {
    if (p.prop === 'backpack') {
      ctx.save();
      ctx.translate(0, 0);
      ctx.beginPath();
      ctx.roundRect(-14, CY - 16, 28, 36, 9);
      fillStroke(ctx, '#3f7ec9', 2.4);
      ctx.restore();
    }
  } else {
    if (p.feet === 'sit') {
      drawFoot(ctx, -1, p);
      drawFoot(ctx, 1, p);
    }
    drawFace(ctx, p);
    if (p.prop === 'flower') drawFlower(ctx, p.facing * 3, CY - 6);
    if (p.prop === 'backpack') drawBackpackStraps(ctx, p);
    // The Pokeball for fetch, held out in front with his hands on its sides.
    if (p.prop === 'pokeball') drawBall(ctx, p.facing * HELD.x, HELD.y, 0, HELD.r);
    drawArm(ctx, -1, p);
    drawArm(ctx, 1, p);
    // The apple is held up in front, over his hands.
    if (p.prop === 'apple') drawApple(ctx, p.facing * 2, CY - 8, p.propProgress);
    // The glass: held in front, or raised to his mouth for a sip.
    if (p.prop === 'glass') {
      const lift = p.glassLift || 0;
      const fx = p.facing * p.turn * 3.5;
      drawGlass(ctx, fx + p.facing * 4 * lift, CY - 4 - (CY - 4 - (FACE_Y + 16)) * lift, p.propProgress, -p.facing * 0.5 * lift);
    }
  }

  ctx.restore();
  ctx.restore();

  if (p.prop === 'ball') drawBall(ctx, p.ballX, -11, p.ballRot);
}

// --------------------------------------------------------------- sleeping

// Asleep, lying on his tummy (the "Sleeping" panel): a round, low egg with
// the head upright at one end, the face low near the floor, the shell crack
// running down from the spikes and under his face, and a foot poking out at
// each end. Drawn with the head on the left; mirrored when he faces right.
const LIE = { cx: 0, cy: -39, rx: 56, ry: 40 };
const LIE_SIZE = 1.1; // a touch bigger than the standing scale

function liePoint(deg, out = 0) {
  const a = rad(deg);
  return [LIE.cx + (LIE.rx + out) * Math.cos(a), LIE.cy + (LIE.ry + out) * Math.sin(a)];
}

function lieArc(ctx, fromDeg, toDeg) {
  if (toDeg < fromDeg - 0.5) toDeg += 360;
  else if (toDeg <= fromDeg) return;
  const steps = Math.max(2, Math.ceil((toDeg - fromDeg) / 3));
  for (let i = 0; i <= steps; i++) {
    const [x, y] = liePoint(fromDeg + ((toDeg - fromDeg) * i) / steps);
    // The very bottom rests flat on the floor.
    ctx.lineTo(x, Math.min(y, 0));
  }
}

// Head spikes for the lying pose, built like the standing ones: the crown is
// tipped a little towards his head end. Front spikes are joined edge to
// edge; the two back spikes peek out of the Vs between them.
//   base/hw: where on the egg each spike sits (degrees), tip: direction, len: length.
const LIE_SPIKES = [
  { base: -150, hw: 18, tip: -143, len: 15 },
  { base: -113, hw: 19, tip: -112, len: 18 },
  { base: -80, hw: 14, tip: -74, len: 12 },
];
const LIE_BACK_SPIKES = [
  { base: -132, hw: 8, tip: -133, len: 7.5 },
  { base: -92, hw: 7, tip: -92, len: 6.5 },
];

// One spike from its first base point to its second, with a soft tip.
function lieSpikeCurve(ctx, sp, inset) {
  const [b1x, b1y] = liePoint(sp.base - sp.hw, -inset);
  const [b2x, b2y] = liePoint(sp.base + sp.hw, -inset);
  const [mx, my] = liePoint(sp.base, -inset);
  const [tx, ty] = liePoint(sp.tip, sp.len);
  const bulge = 0.16;
  const c1x = (b1x + tx) / 2 + ((b1x + tx) / 2 - mx) * bulge;
  const c1y = (b1y + ty) / 2 + ((b1y + ty) / 2 - my) * bulge;
  const c2x = (b2x + tx) / 2 + ((b2x + tx) / 2 - mx) * bulge;
  const c2y = (b2y + ty) / 2 + ((b2y + ty) / 2 - my) * bulge;
  const round = 0.2;
  ctx.quadraticCurveTo(c1x, c1y, tx + (c1x - tx) * round, ty + (c1y - ty) * round);
  ctx.quadraticCurveTo(tx, ty, tx + (c2x - tx) * round, ty + (c2y - ty) * round);
  ctx.quadraticCurveTo(c2x, c2y, b2x, b2y);
}

function lieBodyPath(ctx) {
  ctx.beginPath();
  lieArc(ctx, 0, 180); // underside, right to left
  let angle = -180;
  for (const sp of LIE_SPIKES) {
    lieArc(ctx, angle, sp.base - sp.hw);
    lieSpikeCurve(ctx, sp, 0);
    angle = sp.base + sp.hw;
  }
  lieArc(ctx, angle, 0);
  ctx.closePath();
}

// Crack between head and shell: from the last spike's base down the side,
// then along the bottom under his face so his head rests in the shell.
function lieCrack() {
  const start = liePoint(LIE_SPIKES[2].base + LIE_SPIKES[2].hw);
  return [
    start, [22, -64], [28, -54], [16, -45], [22, -36], [9, -29], [3, -23],
    [-9, -21], [-16, -15], [-25, -16], [-33, -11], [-42, -11], [-49, -5], [-55, 1],
  ];
}

function drawLying(ctx, p) {
  ctx.save();
  if (p.facing > 0) ctx.scale(-1, 1);
  ctx.scale(LIE_SIZE * p.scaleX, LIE_SIZE * p.scaleY);

  // Feet poking out at each end, behind the body.
  footShape(ctx, -42, -8, Math.atan2(0.35, -1), 15, 8.5, 0.6);
  footShape(ctx, 43, -8, Math.atan2(0.35, 1), 15, 8.5, 0.6);

  // Back spikes first so only their tips peek out.
  for (const sp of LIE_BACK_SPIKES) {
    ctx.beginPath();
    const [bx, by] = liePoint(sp.base - sp.hw, -6);
    ctx.moveTo(bx, by);
    lieSpikeCurve(ctx, sp, 6);
    ctx.closePath();
    fillStroke(ctx, PALETTE.headBack);
  }

  // Head + body.
  lieBodyPath(ctx);
  fillStroke(ctx, PALETTE.head);

  // Shell over the far end and under the face, with markings and shading.
  const crack = lieCrack();
  ctx.save();
  lieBodyPath(ctx);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(crack[0][0] + 20, crack[0][1] - 20);
  for (const [x, y] of crack) ctx.lineTo(x, y);
  ctx.lineTo(-70, 5);
  ctx.lineTo(70, 5);
  ctx.lineTo(70, -100);
  ctx.closePath();
  ctx.fillStyle = PALETTE.shell;
  ctx.fill();
  drawMark(ctx, 39, -44, 10.5, Math.PI / 2 + 0.1, 'blue');
  drawMark(ctx, 5, -9, 6.5, 0.3, 'red');
  drawMark(ctx, 33, -6, 7, -0.2, 'red');
  ellipse(ctx, 14, -2, LIE.rx, 12);
  ctx.fillStyle = PALETTE.shellShade;
  ctx.fill();
  // The crack line stays inside the body, so it can't cut across a foot.
  ctx.beginPath();
  ctx.moveTo(crack[0][0], crack[0][1]);
  for (const [x, y] of crack) ctx.lineTo(x, y);
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.restore();
  // Redraw the outline on top so the clipped crack meets it cleanly.
  lieBodyPath(ctx);
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();

  // Face, low on the head near the floor.
  const sleepy = { ...p, lookX: 0, lookY: 0, blink: 0 };
  drawEye(ctx, -38, -28, -1, sleepy);
  drawEye(ctx, -19, -29, 1, sleepy);
  ctx.fillStyle = PALETTE.cheek + '0.75)';
  ellipse(ctx, -47, -21, 5, 3);
  ctx.fill();
  ellipse(ctx, -10, -23, 5, 3);
  ctx.fill();
  // Little "ω" cat mouth.
  ctx.beginPath();
  ctx.moveTo(-33, -21);
  ctx.quadraticCurveTo(-31, -18, -29, -21);
  ctx.quadraticCurveTo(-27, -18, -25, -21);
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();

  // Arm tucked in at the bottom front.
  ctx.save();
  ctx.translate(-4, -13);
  ctx.rotate(0.55);
  ellipse(ctx, 0, 6, 7.5, 9.5);
  fillStroke(ctx, PALETTE.limb, 2);
  ctx.restore();

  ctx.restore();
}

function defaultPose() {
  return {
    t: 0,
    facing: 1,
    turn: 0, // 0 = facing you, 1 = turned (3/4 view) towards `facing`
    tilt: 0,
    bob: 0,
    scaleX: 1,
    scaleY: 1,
    walkPhase: 0,
    stepHeight: 0,
    armSwing: 0,
    view: 'front', // front | back | lying
    feet: 'stand', // stand | sit | dangle
    arms: 'down', // down | up | wave | flail | hold | hug | cheer | fists | stretch | shade | sip
    eyes: 'open', // open | wide | small | happy | content | closed | squint | sad | angry | meh | sleepy
    mouth: 'smile', // smile | smallSmile | open | o | frown | growl | wavy | flat | talk | chew | yawn
    blink: 0,
    lookX: 0,
    lookY: 0,
    blush: 0.35,
    prop: null, // null | apple | flower | ball | pokeball | backpack | glass
    glassLift: 0, // 0 = held in front, 1 = at his mouth
    propProgress: 0,
    ballX: 0,
    ballRot: 0,
  };
}

// --------------------------------------------------------------- effects

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
  ctx.fillStyle = '#f2596f';
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
    const a = (i / 10) * TAU - Math.PI / 2;
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

function drawText(ctx, text, x, y, size, alpha, color = PALETTE.outline) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold ${size}px "Chalkboard SE", "Comic Sans MS", "Segoe Print", system-ui, sans-serif`;
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
  ctx.fillStyle = '#efe9e0';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(120,100,90,0.5)';
  ctx.stroke();
  ctx.restore();
}

// Overlay symbols from the reference sheet, drawn near his head.
function drawSoundLines(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const pulse = 1 + Math.sin(t * 14) * 0.15;
  for (const [a, len] of [[-1.0, 9], [-0.45, 10], [0.1, 8]]) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
    ctx.lineTo(Math.cos(a) * (6 + len * pulse), Math.sin(a) * (6 + len * pulse));
    ctx.stroke();
  }
  ctx.restore();
}

function drawAngerMark(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y);
  const s = 1 + Math.sin(t * 10) * 0.12;
  ctx.scale(s, s);
  ctx.strokeStyle = '#e0303e';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(2.5, -8);
    ctx.quadraticCurveTo(2.5, -2.5, 8, -2.5);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawScribble(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#3a2f2a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const a = i * 0.55 + t * 3;
    const r = 7 + Math.sin(i * 0.37) * 3.5;
    const px = Math.cos(a) * r * 1.25 + Math.sin(i * 0.11) * 3;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.lineTo(-11, 15);
  ctx.stroke();
  ctx.restore();
}

function drawSweat(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3) * 1.5);
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.quadraticCurveTo(5, 2, 0, 4);
  ctx.quadraticCurveTo(-5, 2, 0, -6);
  ctx.fillStyle = '#9fd3f5';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#4b8fc0';
  ctx.stroke();
  for (const [dx, dy, r] of [[8, -12, 2.2], [12, -6, 1.6]]) {
    ellipse(ctx, dx, dy, r, r);
    ctx.stroke();
  }
  ctx.restore();
}

// Fit `text` in `maxWidth` by shrinking the font (down to 8px).
function fitFont(ctx, text, size, weight, maxWidth) {
  let px = size;
  do {
    ctx.font = `${weight}${px}px "Chalkboard SE", "Comic Sans MS", system-ui, sans-serif`;
    px -= 0.5;
  } while (ctx.measureText(text).width > maxWidth && px > 8);
}

// Split `text` into at most two lines that fit `maxWidth` at `size`px.
function wrapTwo(ctx, text, size, weight, maxWidth) {
  ctx.font = `${weight}${size}px "Chalkboard SE", "Comic Sans MS", system-ui, sans-serif`;
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  let first = '';
  let i = 0;
  for (; i < words.length; i++) {
    const next = first ? `${first} ${words[i]}` : words[i];
    if (ctx.measureText(next).width > maxWidth && first) break;
    first = next;
  }
  let rest = words.slice(i).join(' ');
  if (!rest) return [first];
  if (ctx.measureText(rest).width > maxWidth) {
    while (rest.length > 1 && ctx.measureText(`${rest}…`).width > maxWidth) rest = rest.slice(0, -1);
    rest = `${rest.trimEnd()}…`;
  }
  return [first, rest];
}

// Little clickable tag hanging off the bottom of a board: green "OK ✓" on the
// right, blue "Join ▸" on the left.
function drawTag(ctx, x, y, text, color) {
  ctx.font = 'bold 10px system-ui, sans-serif';
  const w = Math.max(30, ctx.measureText(text).width + 12);
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y, w, 15, 7);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 7.8);
}

function drawSticks(ctx, top, h) {
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 30, top + h - 2);
    ctx.lineTo(side * 41, -76);
    ctx.lineWidth = 5;
    ctx.strokeStyle = PALETTE.outline;
    ctx.stroke();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#c99a62';
    ctx.stroke();
  }
}

// A board he holds up over his head: the meeting sign ("Meeting in 5!") or a
// sticky note ("remind me"). `b` = { style: 'sign'|'note', line1, line2, tag,
// join, urgent } from the main process (see Companion.board()). `urgent`
// makes it bounce more (the meeting is starting now).
function drawSign(ctx, b, t) {
  const note = b.style === 'note';
  const w = note ? 114 : 108;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = note ? wrapTwo(ctx, b.line1 || '', 12, 'bold ', w - 14) : null;
  const h = note ? 22 + lines.length * 14 : b.line2 ? 38 : 26;
  const bob = b.urgent ? Math.abs(Math.sin(t * 9)) * -4 : Math.sin(t * 5) * 1.5;
  const top = (note ? -129 - h : -167 + (b.line2 ? 0 : 6)) + bob;
  drawSticks(ctx, top, h);
  // Board (a sticky note, slightly crooked, with a folded corner).
  ctx.save();
  if (note) ctx.rotate(-0.03);
  ctx.beginPath();
  if (note) {
    ctx.moveTo(-w / 2, top);
    ctx.lineTo(w / 2, top);
    ctx.lineTo(w / 2, top + h - 10);
    ctx.lineTo(w / 2 - 10, top + h);
    ctx.lineTo(-w / 2, top + h);
    ctx.closePath();
  } else {
    ctx.roundRect(-w / 2, top, w, h, 8);
  }
  ctx.fillStyle = note ? '#fff1a0' : b.urgent ? '#ffe9d6' : '#fff7e2';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineJoin = 'round';
  ctx.stroke();
  if (note) {
    ctx.beginPath();
    ctx.moveTo(w / 2, top + h - 10);
    ctx.lineTo(w / 2 - 10, top + h - 10);
    ctx.lineTo(w / 2 - 10, top + h);
    ctx.fillStyle = '#e9d67c';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.outline;
  if (note) {
    // Header ("Reminder"), then your text on up to two lines.
    fitFont(ctx, b.line2 || '', 10, '', w - 14);
    ctx.fillStyle = '#8a6d2a';
    ctx.fillText(b.line2 || '', 0, top + 10);
    ctx.fillStyle = PALETTE.outline;
    ctx.font = 'bold 12px "Chalkboard SE", "Comic Sans MS", system-ui, sans-serif';
    lines.forEach((line, i) => {
      fitFont(ctx, line, 12, 'bold ', w - 12);
      ctx.fillText(line, 0, top + 24 + i * 14);
    });
  } else {
    fitFont(ctx, b.line1 || '', 13, 'bold ', w - 12);
    ctx.fillText(b.line1 || '', 0, top + (b.line2 ? 12 : h / 2 + 0.5));
    if (b.line2) {
      fitFont(ctx, b.line2, 11, '', w - 12);
      ctx.fillStyle = '#7a6656';
      ctx.fillText(b.line2, 0, top + 27);
    }
  }
  ctx.restore();
  if (b.tag) drawTag(ctx, w / 2 - 20, top + h - 6, b.tag, '#6cb86a');
  if (b.join) drawTag(ctx, -w / 2 + 22, top + h - 6, 'Join ▸', PALETTE.blue);
  ctx.restore();
}

// A speech bubble over his head for wellbeing nudges ("Water break?").
// `b` = { line1, line2, tag } (tag: e.g. "Drank ✓", or null when there's
// nothing to click).
function drawBubble(ctx, b, t) {
  const w = 116;
  const h = b.line2 ? 38 : 26;
  const bob = Math.sin(t * 2.5) * 1.2;
  const top = -174 + (b.line2 ? 0 : 8) + bob;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.beginPath();
  ctx.roundRect(-w / 2, top, w, h, 12);
  // Tail down towards his head.
  ctx.moveTo(-6, top + h);
  ctx.lineTo(4, top + h + 9);
  ctx.lineTo(8, top + h);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, top + h);
  ctx.lineTo(-w / 2 + 12, top + h);
  ctx.arcTo(-w / 2, top + h, -w / 2, top, 12);
  ctx.arcTo(-w / 2, top, w / 2, top, 12);
  ctx.arcTo(w / 2, top, w / 2, top + h, 12);
  ctx.arcTo(w / 2, top + h, -w / 2, top + h, 12);
  ctx.lineTo(8, top + h);
  ctx.lineTo(4, top + h + 9);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.outline;
  fitFont(ctx, b.line1 || '', 13, 'bold ', w - 14);
  ctx.fillText(b.line1 || '', 0, top + (b.line2 ? 12 : h / 2 + 0.5));
  if (b.line2) {
    fitFont(ctx, b.line2, 10.5, '', w - 14);
    ctx.fillStyle = '#7a6656';
    ctx.fillText(b.line2, 0, top + 27);
  }
  if (b.tag) drawTag(ctx, w / 2 - 24, top + h - 6, b.tag, '#6cb86a');
  ctx.restore();
}

// A speech bubble with his own words (one short sentence, up to two lines).
function drawSpeech(ctx, text, t) {
  const w = 136;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapTwo(ctx, text, 12.5, 'bold ', w - 16);
  const h = 12 + lines.length * 15;
  const bob = Math.sin(t * 2.5) * 1.2;
  const top = -138 - h + bob;
  ctx.beginPath();
  ctx.moveTo(-6, top + h);
  ctx.lineTo(-w / 2 + 12, top + h);
  ctx.arcTo(-w / 2, top + h, -w / 2, top, 12);
  ctx.arcTo(-w / 2, top, w / 2, top, 12);
  ctx.arcTo(w / 2, top, w / 2, top + h, 12);
  ctx.arcTo(w / 2, top + h, -w / 2, top + h, 12);
  ctx.lineTo(8, top + h);
  ctx.lineTo(4, top + h + 9);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.outline;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = PALETTE.outline;
  lines.forEach((line, i) => {
    fitFont(ctx, line, 12.5, 'bold ', w - 14);
    ctx.fillText(line, 0, top + 13.5 + i * 15);
  });
  ctx.restore();
}

window.Character = {
  drawSpeech,
  drawCharacter,
  defaultPose,
  drawHeart,
  drawStar,
  drawText,
  drawPuff,
  drawDaisy,
  drawBall,
  drawSoundLines,
  drawAngerMark,
  drawScribble,
  drawSweat,
  drawSign,
  drawBubble,
  BODY_CY: CY,
  HEAD_TOP: CY - RY - 16,
};
})();
