'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Attention, ATTENTION, screenOf } = require('../src/main/mind/attention');
const { ScreenReader, SCREEN, scrub, whyNotRead, screenKey } = require('../src/main/mind/screen');
const T = require('../src/main/mind/thinker');
const { Mind } = require('../src/main/mind/mind');

// Two screens side by side: Claude on the left one, Chrome (GitHub) on the right one.
const displays = [
  { x: 0, y: 0, width: 1512, height: 982 },
  { x: 1512, y: 0, width: 1920, height: 1080 },
];
const windows = [
  { id: 11, app: 'Claude', title: 'Graphify codebase review', x: 0, y: 30, width: 1500, height: 900 },
  { id: 22, app: 'Google Chrome', title: 'PR #14 · GitHub', x: 1512, y: 30, width: 1900, height: 1000 },
  { id: 33, app: 'Slack', title: 'general', x: 1600, y: 60, width: 800, height: 600 },
  { id: 44, app: 'Togepi', title: null, x: 400, y: 700, width: 220, height: 240 },
];

function clock() {
  let t = 1e12;
  return { now: () => t, advance: (s) => (t += s * 1000) };
}

test('attention: the window you type in, unless your cursor is busy somewhere else', () => {
  const c = clock();
  const a = new Attention(c.now);
  a.cursorAt({ x: 2000, y: 500 }); // over GitHub on the right screen
  let v = a.update({ windows, frontApp: 'Claude', displays });
  assert.equal(v.typing.app, 'Claude');
  assert.equal(v.typing.screen, 1);
  assert.equal(v.cursorOn.app, 'Google Chrome');
  assert.equal(v.cursorOn.screen, 2);
  assert.equal(v.attention, null, 'not settled yet');
  c.advance(ATTENTION.settle);
  v = a.update({ windows, frontApp: 'Claude', displays });
  assert.ok(v.settled);
  assert.equal(v.attention.app, 'Google Chrome', 'the cursor moved recently: you are looking at GitHub');
  assert.equal(v.via, 'cursor');
  assert.deepEqual(v.others.map((w) => w.app), ['Slack'], "his own window isn't in the list");
  // The cursor rests for a while: you're typing in Claude.
  c.advance(ATTENTION.cursorRecent + 1);
  a.update({ windows, frontApp: 'Claude', displays });
  c.advance(ATTENTION.settle);
  v = a.update({ windows, frontApp: 'Claude', displays });
  assert.equal(v.attention.app, 'Claude');
  assert.equal(v.via, 'typing');
});

test('attention: sweeping the cursor across a window does not count', () => {
  const c = clock();
  const a = new Attention(c.now);
  a.cursorAt({ x: 100, y: 100 });
  a.update({ windows, frontApp: 'Claude', displays });
  c.advance(ATTENTION.settle);
  a.update({ windows, frontApp: 'Claude', displays });
  assert.equal(a.current.app, 'Claude');
  a.cursorAt({ x: 2000, y: 500 }); // passes over GitHub for 2 s
  c.advance(2);
  assert.equal(a.update({ windows, frontApp: 'Claude', displays }).settled, false);
  a.cursorAt({ x: 100, y: 120 }); // and back
  c.advance(4);
  const v = a.update({ windows, frontApp: 'Claude', displays });
  assert.equal(v.settled, false);
  assert.equal(v.attention.app, 'Claude');
});

test('a focused browser uses its tab title; screens are numbered', () => {
  const a = new Attention(() => 0);
  const v = a.update({ windows, frontApp: 'Google Chrome', frontTab: { title: 'Pull request #14', url: 'https://github.com/x/y/pull/14' }, displays });
  assert.equal(v.typing.title, 'Pull request #14');
  assert.equal(v.typing.url, 'https://github.com/x/y/pull/14');
  assert.equal(screenOf({ x: 0, y: 0, width: 100, height: 100 }, [displays[0]]), null, 'one screen: no numbers');
});

test('screen text is scrubbed of anything sensitive', () => {
  const s = scrub(
    [
      'Contact jane.doe@gmail.com or (631) 555-0199',
      'Card 4111 1111 1111 1111 exp 12/29',
      'SSN 123-45-6789',
      'key sk-proj-abcdefghijklmnopqrstuvwx and ghp_abcdefghijklmnop1234',
      'Password: hunter2',
      'Basic qualifications: 3+ years of Java or Python',
    ].join('\n'),
  );
  for (const bad of ['jane.doe', '555-0199', '4111', '123-45-6789', 'sk-proj', 'ghp_', 'hunter2']) assert.ok(!s.includes(bad), bad);
  assert.match(s, /3\+ years of Java or Python/);
});

test('what he may read: not private things, not email or chat unless allowed', () => {
  const w = (o) => ({ id: 1, ...o });
  assert.equal(whyNotRead(w({ app: 'Google Chrome', title: 'SWE - Amazon', url: 'https://jobright.ai/jobs/1' })), null);
  assert.equal(whyNotRead(w({ app: 'Google Chrome', title: 'x', private: true })), 'private window');
  assert.equal(whyNotRead(w({ app: '1Password' })), 'password manager');
  assert.equal(whyNotRead(w({ app: 'Google Chrome', title: 'Checkout', url: 'https://shop.com/checkout' })), 'sensitive page');
  assert.equal(whyNotRead(w({ app: 'Slack', title: 'general' })), 'email or chat');
  assert.equal(whyNotRead(w({ app: 'Google Chrome', title: 'Inbox', url: 'https://mail.google.com/mail/u/0' })), 'email or chat');
  assert.equal(whyNotRead(w({ app: 'Slack', title: 'general' }), { allow: { apps: ['Slack'] } }), null);
  assert.equal(whyNotRead(w({ app: 'Notes', title: 'x' }), { block: { apps: ['Notes'] } }), 'blocked app');
});

const JOB = 'Software Engineer II, Backend. Amazon, Seattle. Build distributed services for Amazon Fulfillment. Basic qualifications: 3+ years of software development, Java, Python or Go, AWS, distributed systems and SQL databases. Preferred: Kubernetes, React.';

function fakeIo(text = JOB) {
  const calls = { capture: [], removed: [], pictures: 0 };
  return {
    calls,
    capture: async (id) => {
      calls.capture.push(id);
      return `/tmp/look-${id}.png`;
    },
    ocr: async () => text,
    picture: async () => {
      calls.pictures++;
      return 'BASE64';
    },
    remove: (f) => calls.removed.push(f),
  };
}

const view = (attention, other) => ({ attention, typing: attention, cursorOn: other || attention, via: other ? 'typing' : 'typing' });
const chrome = { id: 22, app: 'Google Chrome', title: 'SWE - Amazon', url: 'https://jobright.ai/jobs/1', screen: 2 };
const claude = { id: 11, app: 'Claude', title: 'Chat', screen: 1 };

test('he reads one window per look, deletes the picture, and only rereads after a while', async () => {
  const c = clock();
  const io = fakeIo();
  const r = new ScreenReader(io, { now: c.now });
  const got = await r.look(view(chrome), { force: true });
  assert.deepEqual(io.calls.capture, [22]);
  assert.deepEqual(io.calls.removed, ['/tmp/look-22.png'], 'picture file deleted');
  assert.match(got.text, /Basic qualifications/);
  assert.equal(got.picture, null, 'plenty of text: no picture');
  c.advance(SCREEN.minGap + 1);
  assert.equal(await r.look(view(chrome)), null, 'too soon to reread the same window');
  c.advance(SCREEN.revisit);
  assert.ok(await r.look(view(chrome)));
  assert.equal(r.readingFor(screenKey(chrome)).app, 'Google Chrome');
  c.advance(SCREEN.fresh + 1);
  assert.equal(r.readingFor(screenKey(chrome)), null, 'old readings are not used');
});

test('typing in one window and pointing at another: looks take turns', async () => {
  const c = clock();
  const io = fakeIo();
  const r = new ScreenReader(io, { now: c.now });
  const v = { attention: chrome, typing: claude, cursorOn: chrome, via: 'cursor' };
  await r.look(v);
  c.advance(SCREEN.minGap + 1);
  await r.look(v);
  assert.deepEqual(io.calls.capture, [22, 11]);
});

test('little text: he looks at the picture; email, chat and sensitive text are not read', async () => {
  const io = fakeIo('ok');
  const r = new ScreenReader(io, { now: () => 0 });
  assert.equal((await r.look(view({ id: 5, app: 'Preview', title: 'cat.jpg' }), { force: true })).picture, 'BASE64');
  const r2 = new ScreenReader(fakeIo(), { now: () => 0 });
  const skipped = await r2.look(view({ id: 6, app: 'Slack', title: 'general' }), { force: true });
  assert.equal(skipped.skipped, 'email or chat');
  assert.equal(skipped.text, null);
  const io3 = fakeIo('Your tax refund: account 1234');
  const r3 = new ScreenReader(io3, { now: () => 0, decide: async () => ({ sensitive: { probabilities: { A: 0.9, B: 0.1 } } }) });
  const s = await r3.look(view({ id: 7, app: 'Notes', title: 'taxes' }), { force: true });
  assert.equal(s.skipped, 'sensitive');
  assert.equal(io3.calls.removed.length, 1, 'picture still deleted');
});

test('his prompt knows where you type, where you point, and what you read', () => {
  const lines = T.describeView({
    typing: { app: 'Claude', title: 'Graphify codebase review', screen: 1 },
    cursorOn: { app: 'Google Chrome', title: 'PR #14 · GitHub', site: 'github.com', screen: 2 },
    via: 'cursor',
    others: [{ app: 'Slack', title: 'general', screen: 2 }, { private: true, screen: 1 }],
  });
  assert.deepEqual(lines, [
    'Sushant is typing in: Claude, "Graphify codebase review" (screen 1).',
    'His cursor is on: Google Chrome, "PR #14 · GitHub" (github.com) (screen 2) ← he is looking here.',
    'Also open: Slack, "general" (screen 2); something private (screen 1).',
  ]);
});

test('the mind thinks with the view, the screen text and the picture, and saves none of the text', async () => {
  const calls = [];
  const engine = {
    ready: true,
    canDecide: false,
    canSee: true,
    think: async (req) => {
      calls.push(req);
      return JSON.stringify({ thought: 'Java!', urge: 0, lines: ['Java!'], action: 'none' });
    },
    status: () => 'running',
  };
  const m = new Mind({ engine, now: () => 1e12, getSelf: () => ({ band: 'content', state: 'idle', hour: 11 }), onSpeak: () => {} });
  await m.observe({
    app: 'Google Chrome',
    title: 'SWE - Amazon',
    url: 'https://jobright.ai/jobs/1',
    screen: 2,
    via: 'cursor',
    view: { typing: claude, cursorOn: chrome, via: 'cursor', others: [] },
    reading: { key: screenKey(chrome), app: 'Google Chrome', text: 'Basic qualifications: Java, Python', picture: 'BASE64', at: 1e12 },
  });
  await new Promise((r) => setImmediate(r));
  assert.match(calls[0].user, /His cursor is on: Google Chrome, "SWE - Amazon" \(jobright\.ai\) \(screen 2\) ← he is looking here/);
  assert.match(calls[0].user, /«Basic qualifications: Java, Python»/);
  assert.equal(calls[0].image, 'BASE64');
  assert.ok(!JSON.stringify(m.log.items).includes('qualifications'), 'screen text is not written to his log');
  assert.equal(m.status().looked.chars, 34);
});
