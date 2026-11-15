'use strict';

// Bubbles that fit their whole text, and spoken messages that open the chat
// (Sushant, 2026-10-25).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Companion, HIT } = require('../src/main/companion');

const src = (...p) => fs.readFileSync(path.join(__dirname, '..', 'src', ...p), 'utf8');

// window.UI from src/renderer/ui.js.
function loadUI() {
  const sandbox = { window: {}, Math, String, Number, Object, Array, JSON };
  vm.runInNewContext(src('renderer', 'ui.js'), sandbox);
  return sandbox.window.UI;
}

// A canvas that measures text roughly (each character 0.55 of the font size)
// and records what's written.
function fakeCanvas() {
  const written = [];
  let font = '12px sans-serif';
  const ctx = new Proxy(
    {},
    {
      get(_t, k) {
        if (k === 'font') return font;
        if (k === 'measureText') return (s) => ({ width: String(s).length * 0.55 * parseFloat(font.match(/([\d.]+)px/)[1]) });
        if (k === 'fillText') return (s, x, y) => written.push({ s: String(s), x, y });
        return () => {};
      },
      set(_t, k, v) {
        if (k === 'font') font = v;
        return true;
      },
    },
  );
  return { ctx, written };
}

const UI = loadUI();
const SIZE = Number(src('renderer', 'renderer.js').match(/const SIZE = ([\d.]+)/)[1]);
const LONG =
  'I have been watching you work on that essay all afternoon, and honestly the second paragraph is the best thing you have written this week, so maybe take a short break and come back to the ending with fresh eyes.';

test('a short line gets a small bubble, a long one shows every word', () => {
  const short = fakeCanvas();
  const s = UI.drawSpeech(short.ctx, 'Hi!', 0);
  assert.equal(s.lines.length, 1);
  assert.ok(s.w < 136, `narrower than the old fixed bubble: ${s.w}`);

  const long = fakeCanvas();
  const l = UI.drawSpeech(long.ctx, LONG, 0);
  assert.ok(l.lines.length > 2, 'more than two lines');
  assert.equal(long.written.map((w) => w.s).join(' '), LONG, 'every word written, in order');
  assert.ok(!long.written.some((w) => w.s.includes('…')), 'nothing cut off');
  assert.ok(l.w <= 272 && l.w > 200, `widens first: ${l.w}`);
  assert.equal(l.top, -138 - l.h, 'grows upward from the same bottom');
});

test('a word too long for a line is broken, not cut', () => {
  const { ctx, written } = fakeCanvas();
  const word = 'https://example.com/a/really/long/link/that/does/not/fit/on/one/line/at/all';
  const L = UI.drawSpeech(ctx, `Look: ${word}`, 0);
  assert.ok(L.lines.length >= 2);
  assert.equal(written.map((w) => w.s).join('').replace(/\s/g, ''), `Look:${word}`);
});

test('his question shows its whole text above the buttons, which stay put', () => {
  const short = UI.drawQuestion(fakeCanvas().ctx, 'Tea or coffee?', ['🍵 Tea', '☕ Coffee'], null);
  const { ctx, written } = fakeCanvas();
  const q = `${LONG} Tea or coffee?`;
  const long = UI.drawQuestion(ctx, q, ['🍵 Tea', '☕ Coffee'], null);
  assert.equal(short.w, 186, 'at least the width the buttons need');
  assert.ok(long.w > 186 && long.w <= 272);
  assert.ok(long.top < short.top, 'taller, upward');
  assert.equal(long.top + long.h, short.top + short.h, 'same bottom');
  assert.ok(written.map((w) => w.s).join(' ').startsWith(q), 'every word of the question');
});

test('a nudge bubble with a long line wraps it instead of shrinking it', () => {
  const { ctx, written } = fakeCanvas();
  const line1 = 'Time for a glass of water, you have been typing for ages';
  const L = UI.drawBubble(ctx, { line1, line2: 'first one today', tag: 'Drank ✓' }, 0);
  assert.ok(L.lines1.length >= 2);
  assert.ok(written.some((w) => w.s === 'first one today'));
  assert.equal(L.lines1.join(' '), line1);
  // The short ones look like before.
  const S = UI.drawBubble(fakeCanvas().ctx, { line1: 'Water break?', line2: 'first one today', tag: 'Drank ✓' }, 0);
  assert.equal(S.w, 116);
  assert.equal(S.h, 38);
});

test('clicks land on the whole of a big bubble, and his window grows to fit it', () => {
  const c = new Companion({ bounds: { left: 0, right: 1920, top: 0, floor: 1040 }, rng: () => 0.5 });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.enter('idle', 10);
  c.say(LONG);
  const at = (sx, sy) => ({ x: c.x + sx, y: c.y - sy });
  // Measured like renderer.js reports it.
  const L = UI.drawSpeech(fakeCanvas().ctx, LONG, 0);
  const box = { halfWidth: Math.ceil((L.w / 2 + 2) * SIZE), top: Math.ceil((-L.top + 3) * SIZE) };
  assert.equal(c.hitPart(at(0, box.top - 4)), null, 'before the renderer says how big it is');
  c.setBubble(box);
  assert.equal(c.hitPart(at(0, box.top - 4)), 'speech');
  assert.equal(c.hitPart(at(box.halfWidth - 3, HIT.signBottom + 4)), 'speech');
  assert.equal(c.hitPart(at(0, box.top + 20)), null);
  c.setBubble(null);
  assert.equal(c.bubble, null);
  c.setBubble({ halfWidth: 'x' });
  assert.equal(c.bubble, null, 'ignores nonsense');

  const main = src('main', 'main.js');
  const winSize = main.slice(main.indexOf('function winSize'), main.indexOf('// Let clicks pass through'));
  assert.match(winSize, /companion\.bubble/);
  assert.match(main, /if \(ww !== lastWinPos\.w \|\| wh !== lastWinPos\.h\) win\.setBounds/);
  assert.match(src('preload.js'), /bubble: \(box\) => ipcRenderer\.send\('bubble', box\)/);
  assert.match(src('renderer', 'renderer.js'), /reportBubble\(bubble\)/);
});

test('saying something that is not a command opens the chat, with his reply only there', () => {
  const main = src('main', 'main.js');
  const heard = main.slice(main.indexOf('function heard'), main.indexOf('function runCommand'));
  assert.match(heard, /if \(!cmd\) \{[^}]*showChat\(\);\s*sendWhenFree\(text\);/);
  // Sent once he's done answering the one before, without the bubble.
  const free = main.slice(main.indexOf('async function sendWhenFree'), main.indexOf('function runCommand'));
  assert.match(free, /while \(chatState\.busy/);
  assert.match(free, /chatSend\(text, \{ bubble: false \}\)/);
  const send = main.slice(main.indexOf('async function chatSend'), main.indexOf('function applyReadScreen'));
  assert.match(send, /if \(bubble && !r\.error/);
  // Typed messages still get the bubble too.
  assert.match(main, /ipcMain\.on\('chat-send', \(_e, text\) => chatSend\(text\)\)/);
});
