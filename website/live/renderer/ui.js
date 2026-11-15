// Things drawn around any character: hearts, stars, floating text, puffs,
// mood marks, the signs and bubbles he holds up, his speech bubble and his
// question with its buttons. Everything relative to his feet at (0, 0).
// Registers window.UI. Wrapped in an IIFE so helpers don't leak.
(function () {
'use strict';

const PALETTE = {
  outline: '#3a2d25',
  blue: '#5c9bc8',
};

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
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

// Bubbles fit their whole text (Sushant, 2026-10-25): a short line gets a
// small bubble; a longer one widens up to BUBBLE.maxW, then takes as many
// lines as it needs. The font never shrinks and nothing is cut off. The
// renderer tells the main process how big the bubble is, so his window grows
// to make room and clicks on the bubble land.
const BUBBLE = { minW: 60, maxW: 272, pad: 16 };

// Split `text` into as many lines as it takes to fit `maxWidth` at `size`px
// (a word too long for a line on its own is broken inside it).
function wrapAll(ctx, text, size, weight, maxWidth) {
  ctx.font = `${weight}${size}px "Chalkboard SE", "Comic Sans MS", system-ui, sans-serif`;
  const fits = (s) => ctx.measureText(s).width <= maxWidth;
  const lines = [];
  let cur = '';
  for (let word of String(text).split(/\s+/).filter(Boolean)) {
    while (!fits(word) && word.length > 1) {
      let n = word.length - 1;
      while (n > 1 && !fits(word.slice(0, n))) n--;
      if (cur) lines.push(cur);
      cur = '';
      lines.push(word.slice(0, n));
      word = word.slice(n);
    }
    const next = cur ? `${cur} ${word}` : word;
    if (cur && !fits(next)) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

// Width of the widest line (in the font wrapAll last set).
function widest(ctx, lines) {
  return Math.ceil(Math.max(0, ...lines.map((l) => ctx.measureText(l).width)));
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
/** The nudge bubble's size for `b`: { w, h, top, lines1, lines2 } (top without the bob). */
function bubbleLayout(ctx, b) {
  const lines2 = b.line2 ? wrapAll(ctx, b.line2, 10.5, '', BUBBLE.maxW - 14) : [];
  const w2 = widest(ctx, lines2);
  const lines1 = wrapAll(ctx, b.line1 || '', 13, 'bold ', BUBBLE.maxW - 14);
  // At least today's width, so the tag along the bottom still fits.
  const w = Math.max(116, Math.max(widest(ctx, lines1), w2) + 14);
  const h = (b.line2 ? 38 : 26) + (lines1.length - 1) * 15 + Math.max(0, lines2.length - 1) * 13;
  return { w, h, top: (b.line2 ? -136 : -140) - h, lines1, lines2 };
}

function drawBubble(ctx, b, t) {
  const L = bubbleLayout(ctx, b);
  const { w, h } = L;
  const bob = Math.sin(t * 2.5) * 1.2;
  const top = L.top + bob;
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
  ctx.font = 'bold 13px "Chalkboard SE", "Comic Sans MS", system-ui, sans-serif';
  L.lines1.forEach((line, i) => ctx.fillText(line, 0, top + (b.line2 ? 12 : 13.5) + i * 15));
  if (b.line2) {
    ctx.font = '10.5px "Chalkboard SE", "Comic Sans MS", system-ui, sans-serif';
    ctx.fillStyle = '#7a6656';
    L.lines2.forEach((line, i) => ctx.fillText(line, 0, top + 12 + L.lines1.length * 15 + i * 13));
  }
  if (b.tag) drawTag(ctx, w / 2 - 24, top + h - 6, b.tag, '#6cb86a');
  ctx.restore();
  return L;
}

// Small round sticker on a bubble's top-left corner saying what it's about:
// 'calendar' (📅) when he's talking about what you have coming up.
const BADGES = { calendar: '📅' };

function drawBadge(ctx, x, y, badge) {
  const icon = BADGES[badge];
  if (!icon) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x, y + 0.5);
  ctx.restore();
}

/** The speech bubble's size for `text`: { w, h, top, lines } (top without the bob). */
function speechLayout(ctx, text) {
  const lines = wrapAll(ctx, text, 12.5, 'bold ', BUBBLE.maxW - BUBBLE.pad);
  const w = Math.max(BUBBLE.minW, widest(ctx, lines) + BUBBLE.pad);
  const h = 12 + lines.length * 15;
  return { w, h, top: -138 - h, lines };
}

// A speech bubble with his own words, sized to fit all of them.
function drawSpeech(ctx, text, t, badge = null) {
  const L = speechLayout(ctx, text);
  const { w, h, lines } = L;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bob = Math.sin(t * 2.5) * 1.2;
  const top = L.top + bob;
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
  ctx.font = 'bold 12.5px "Chalkboard SE", "Comic Sans MS", system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 0, top + 13.5 + i * 15));
  if (badge) drawBadge(ctx, -w / 2 + 4, top + 2, badge);
  ctx.restore();
  return L;
}

// His question with two answer buttons along the bottom (left = answer 0)
// and a small ✏️ button on the right (type your own answer). The buttons sit
// at a fixed height so the main process can tell which one you clicked: keep
// QUESTION in sync with HIT.question / HIT.answers in src/main/companion.js
// (times the drawing scale, SIZE in renderer.js).
// `hover`: the cursor in drawing coordinates, or null.
const QUESTION = { w: 186, bottom: -136, btnTop: -159, btnBottom: -141, gap: 3, own: 22 };

/** Button `i` (0, 1, or 'own'): { x, y, w, h } in drawing coordinates. */
function questionButton(i) {
  const q = QUESTION;
  const outer = q.w / 2 - 7;
  const y = q.btnTop;
  const h = q.btnBottom - q.btnTop;
  if (i === 'own') return { x: outer - q.own, y, w: q.own, h };
  const each = (2 * outer - q.own - 2 * q.gap) / 2;
  return { x: i === 0 ? -outer : -outer + each + q.gap, y, w: each, h };
}

/**
 * The question bubble's size for `text`: { w, h, top, lines }. It widens and
 * grows upward to fit the whole question; the buttons stay where they are.
 */
function questionLayout(ctx, text) {
  const q = QUESTION;
  const lines = wrapAll(ctx, text, 12.5, 'bold ', BUBBLE.maxW - BUBBLE.pad);
  const w = Math.max(q.w, widest(ctx, lines) + BUBBLE.pad);
  const top = q.btnTop - 9 - lines.length * 14.5;
  return { w, h: q.bottom - top, top, lines };
}

function drawQuestion(ctx, text, answers, hover, badge = null) {
  const L = questionLayout(ctx, text);
  const { w, h, top, lines } = L;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
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
  ctx.font = 'bold 12.5px "Chalkboard SE", "Comic Sans MS", system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 0, top + 11.5 + i * 14.5));
  answers.forEach((a, i) => {
    const b = questionButton(i);
    const over = hover && hover.x >= b.x && hover.x <= b.x + b.w && hover.y >= b.y && hover.y <= b.y + b.h;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fillStyle = over ? '#ffd86b' : '#fff1c9';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = PALETTE.outline;
    ctx.stroke();
    let label = String(a);
    fitFont(ctx, label, 10.5, 'bold ', b.w - 8);
    while (label.length > 1 && ctx.measureText(label).width > b.w - 8) label = label.slice(0, -1);
    if (label !== String(a)) label = `${label.trimEnd()}…`;
    ctx.fillStyle = PALETTE.outline;
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 0.5);
  });
  // ✏️: neither answer fits, type your own.
  const o = questionButton('own');
  const overOwn = hover && hover.x >= o.x && hover.x <= o.x + o.w && hover.y >= o.y && hover.y <= o.y + o.h;
  ctx.beginPath();
  ctx.roundRect(o.x, o.y, o.w, o.h, 8);
  ctx.fillStyle = overOwn ? '#cfe3f7' : '#eaf2fb';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = PALETTE.outline;
  ctx.stroke();
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.outline;
  ctx.fillText('✏️', o.x + o.w / 2, o.y + o.h / 2 + 0.5);
  if (badge) drawBadge(ctx, -w / 2 + 4, top + 2, badge);
  ctx.restore();
  return L;
}

window.UI = {
  drawSpeech,
  drawQuestion,
  drawHeart,
  drawStar,
  drawText,
  drawPuff,
  drawSoundLines,
  drawAngerMark,
  drawScribble,
  drawSweat,
  drawSign,
  drawBubble,
};
})();
