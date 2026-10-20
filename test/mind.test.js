'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const P = require('../src/main/mind/personality');
const privacy = require('../src/main/mind/privacy');
const T = require('../src/main/mind/thinker');
const { Mind, MIND, FEEL_DIFFERENT } = require('../src/main/mind/mind');
const { EventLog, describeEvent } = require('../src/main/mind/events');
const { groupClips, pickClip } = require('../src/main/mind/sounds');
const { locate } = require('../src/main/mind/engine');
const { parseTabs } = require('../src/main/mac/front-app');
const { Companion } = require('../src/main/companion');

// ------------------------------------------------------------------ personality

test('personality has 34 traits, 19 values and the relationship, all from Togepi', () => {
  const s = P.sliders();
  assert.equal(s.filter(([p]) => p.startsWith('traits.')).length, 34);
  assert.equal(s.filter(([p]) => p.startsWith('values.')).length, 19);
  assert.equal(s.filter(([p]) => p.startsWith('relationship.')).length, 3);
  const p = P.defaultPersonality();
  for (const [sp] of s) assert.ok(Number.isFinite(P.getPath(p, sp)), sp);
  assert.equal(p.traits.extraversion.positive_emotions, 95);
  assert.deepEqual(p.relationship, { affection: 25, trust: 25, familiarity: 5 });
});

test('personality.md round-trips and survives hand edits', () => {
  const p = P.defaultPersonality();
  P.setScore(p, 'traits.openness.ideas', 72);
  P.setScore(p, 'values.tradition', 140); // clamped
  const back = P.parse(P.serialize(p));
  assert.deepEqual(back, p);
  assert.equal(back.values.tradition, 100);
  // A broken line falls back to the default for that score only.
  const text = P.serialize(p).replace('order: 15', 'order: lots');
  assert.equal(P.parse(text).traits.conscientiousness.order, 15);
  assert.equal(P.parse(text).traits.openness.ideas, 72);
  assert.deepEqual(P.parse('no front matter'), P.defaultPersonality());
});

test('load writes the defaults on first run and reads them back', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-mind-'));
  const file = path.join(dir, 'mind', 'personality.md');
  const p = P.load(file);
  assert.ok(fs.existsSync(file));
  assert.match(fs.readFileSync(file, 'utf8'), /# Who I am/);
  assert.deepEqual(P.load(file), p);
});

test('only scores far from average are put into words, strongest first', () => {
  assert.equal(P.band(50), null);
  assert.equal(P.band(95), 'extremely');
  assert.equal(P.band(5), 'not at all');
  const words = P.describe(P.defaultPersonality());
  assert.ok(words.length <= 14);
  assert.match(words[0], /^extremely (cheerfulness|feelings)/);
  assert.ok(!words.some((w) => w.includes('assertiveness')), 'assertiveness 55 is average');
});

test('diff lists what changed', () => {
  const a = P.defaultPersonality();
  const b = P.defaultPersonality();
  P.setScore(b, 'traits.neuroticism.anxiety', 70);
  assert.deepEqual(P.diff(a, b), [{ path: 'traits.neuroticism.anxiety', label: 'Anxiety', from: 25, to: 70 }]);
});

// ------------------------------------------------------------------ privacy

test('private windows, password managers, payments, banking and sign-in pages are blocked', () => {
  const blocked = (o) => privacy.check(o).blocked;
  assert.ok(blocked({ app: 'Google Chrome', title: 'Anything', url: 'https://example.com', private: true }));
  assert.ok(blocked({ app: '1Password' }));
  assert.ok(blocked({ app: 'Passwords', bundle: 'com.apple.Passwords' }));
  assert.ok(blocked({ app: 'Safari', title: 'Checkout', url: 'https://www.amazon.com/gp/buy/spc/handlers/display.html' }));
  assert.ok(blocked({ app: 'Arc', title: 'Review your payment', url: 'https://www.paypal.com/checkoutnow' }));
  assert.ok(blocked({ app: 'Google Chrome', title: 'Accounts', url: 'https://secure.chase.com/web/auth/dashboard' }));
  assert.ok(blocked({ app: 'Google Chrome', title: 'Sign in - Google Accounts', url: 'https://accounts.google.com/v3/signin' }));
  assert.ok(blocked({ app: 'Safari', title: 'Test Results', url: 'https://mychart.example.org/' }));
  assert.ok(!blocked({ app: 'Google Chrome', title: 'Software Engineer II - Amazon', url: 'https://jobright.ai/jobs/info/123' }));
  assert.ok(!blocked({ app: 'Code', title: 'companion.js — digital-companion' }));
  assert.ok(!blocked({ app: 'Safari', title: 'YouTube', url: 'https://www.youtube.com/watch?v=x' }));
});

test('your own blocklist adds apps, sites and words', () => {
  const block = { apps: ['Slack'], sites: ['reddit.com'], words: ['secret project'] };
  assert.equal(privacy.check({ app: 'Slack' }, block).reason, 'blocked app');
  assert.equal(privacy.check({ app: 'Safari', url: 'https://old.reddit.com/r/x' }, block).reason, 'blocked site');
  assert.equal(privacy.check({ app: 'Notes', title: 'Secret Project plans' }, block).reason, 'blocked word');
  assert.equal(privacy.domainOf('https://www.jobright.ai/jobs/1'), 'jobright.ai');
});

test('browser tabs come with titles and private mode', () => {
  const tabs = parseTabs('https://jobright.ai/jobs/1\tSWE II - Amazon\tnormal\nhttps://x.com\t\tincognito\n');
  assert.deepEqual(tabs, [
    { url: 'https://jobright.ai/jobs/1', title: 'SWE II - Amazon', private: false },
    { url: 'https://x.com', title: null, private: true },
  ]);
});

// ------------------------------------------------------------------ thinker

test('lines are cut to one short sentence and checked', () => {
  assert.equal(T.cleanLine('"Applying again? You got this!"'), 'Applying again?');
  assert.equal(T.cleanLine('Toge! Let us go play outside in the sunny garden right now please'), 'Toge! Let us go play outside in the…');
  assert.equal(T.cleanLine('As an AI I cannot'), null);
  assert.equal(T.cleanLine('Visit https://x.com'), null);
  assert.equal(T.cleanLine('Snack time? Toge!', ['snack time toge']), null);
  assert.equal(T.cleanLine(''), null);
  assert.equal(T.cleanLine('fox\uFFFD jumps'), null);
});

test('the model answer is parsed and made safe', () => {
  const t = T.parseThought(JSON.stringify({ thought: 'He looks tired', urge: 1.4, lines: ['Break time?', 'As an AI…', 'Break time?!'], action: 'dance' }));
  assert.deepEqual(t, { thought: 'He looks tired', urge: 1, lines: ['Break time?'], action: 'none' });
  assert.equal(T.parseThought('not json'), null);
});

test('the prompt carries personality, feelings, events and his own decisions', () => {
  const p = P.defaultPersonality();
  const sys = T.systemPrompt(p);
  assert.match(sys, /Togepi/);
  assert.match(sys, /At most 8 words/);
  assert.match(sys, /only just met Sushant/);
  const now = 1_000_000;
  const user = T.situationPrompt({
    trigger: { text: 'Sushant petted you.' },
    self: { band: 'cheerful', needs: { hunger: 0.9, energy: 0.8, boredom: 0.1, affection: 0.5 }, state: 'idle', hour: 9 },
    events: [
      { kind: 'observe', t: now - 120000, app: 'Google Chrome', title: 'SWE II - Amazon', site: 'jobright.ai' },
      { kind: 'said', t: now - 60000, text: 'Applying again?', reaction: 'ignored it' },
      { kind: 'silent', t: now - 30000, thought: 'He is busy' },
    ],
    now,
  });
  assert.match(user, /morning/);
  assert.match(user, /hungry/);
  assert.match(user, /"SWE II - Amazon" \(jobright\.ai\)/);
  assert.match(user, /You are hanging out\./);
  assert.match(user, /you said "Applying again\?" \(Sushant ignored it\)/);
  assert.match(user, /stayed quiet/);
  assert.match(user, /Just now: Sushant petted you\./);
});

test('private observations are described without details', () => {
  assert.match(describeEvent({ kind: 'observe', t: 0, private: true }, 5000), /something private/);
});

// ------------------------------------------------------------------ mind loop

function fakeEngine(answers, opts = {}) {
  const calls = [];
  return {
    ready: true,
    canDecide: !!opts.decide,
    calls,
    async think(req) {
      calls.push(req);
      const a = typeof answers === 'function' ? answers(req) : answers;
      return JSON.stringify(a);
    },
    async decide(state, questions) {
      calls.push({ state, questions });
      return opts.decide(state, questions);
    },
    status: () => 'running',
  };
}

function makeMind(engine, self = {}) {
  let t = 1_000_000;
  const spoken = [];
  const mind = new Mind({
    engine,
    now: () => t,
    rng: () => 0.5,
    getSelf: () => ({ band: 'cheerful', needs: {}, state: 'idle', hour: 10, quiet: false, away: false, asleep: false, busy: false, ...self }),
    onSpeak: (s) => spoken.push(s),
  });
  return { mind, spoken, advance: (s) => (t += s * 1000) };
}

const flush = () => new Promise((r) => setImmediate(r));

test('he speaks when he wants to, and remembers saying it', async () => {
  const { mind, spoken } = makeMind(fakeEngine({ thought: 'Pets!', urge: 0.9, lines: ['Hehe, more pets!'], action: 'happy' }));
  mind.interact('Sushant petted you.');
  await flush();
  assert.deepEqual(spoken, [{ text: 'Hehe, more pets!', action: 'happy', band: 'cheerful' }]);
  assert.equal(mind.log.last(['said']).text, 'Hehe, more pets!');
});

test('he stays quiet when the urge is low, and that decision is remembered too', async () => {
  const { mind, spoken } = makeMind(fakeEngine({ thought: 'meh', urge: 0.1, lines: ['ok'], action: 'none' }));
  mind.interact('Sushant petted you.');
  await flush();
  assert.equal(spoken.length, 0);
  assert.equal(mind.log.last(['silent']).thought, 'meh');
});

test('his personality sets how easily he speaks up', () => {
  const chatty = makeMind(fakeEngine({})).mind;
  const shyP = P.defaultPersonality();
  for (const k of ['gregariousness', 'positive_emotions', 'warmth', 'excitement_seeking']) shyP.traits.extraversion[k] = 10;
  shyP.traits.neuroticism.impulsiveness = 10;
  const shy = makeMind(fakeEngine({})).mind;
  shy.personality = shyP;
  const trigger = { interactive: false };
  assert.ok(chatty.threshold(trigger) < shy.threshold(trigger) - 0.2);
  // Interaction lowers the bar; having just spoken raises it.
  assert.ok(chatty.threshold({ interactive: true }) < chatty.threshold(trigger));
});

test('the rails: no speaking in meetings, while away, or too often', async () => {
  const answer = { thought: 'hi', urge: 1, lines: ['Hiii!', 'Toge toge!', 'Priii!'], action: 'none' };
  const quiet = makeMind(fakeEngine(answer), { quiet: true });
  quiet.mind.interact('Sushant petted you.');
  await flush();
  assert.equal(quiet.spoken.length, 0);

  const m = makeMind(fakeEngine(answer));
  m.mind.interact('Sushant petted you.');
  await flush();
  m.mind.wake({ kind: 'heartbeat', text: 'Nothing special.', interactive: false });
  await flush();
  assert.equal(m.spoken.length, 1, 'unprompted line right after speaking is held back');
  m.advance(MIND.gapUnprompted + 200);
  m.mind.wake({ kind: 'heartbeat', text: 'Nothing special.', interactive: false });
  await flush();
  assert.equal(m.spoken.length, 2);
});

test('how you react is written back: clicked, or ignored after a while', async () => {
  const answer = { thought: 'hi', urge: 1, lines: ['Hiii!'], action: 'none' };
  const m = makeMind(fakeEngine(answer));
  m.mind.interact('Sushant petted you.');
  await flush();
  m.mind.reacted('clicked');
  assert.equal(m.mind.log.last(['said']).reaction, 'clicked the bubble');
  m.advance(120);
  m.mind.engine = fakeEngine({ thought: 'again', urge: 1, lines: ['Play with me?'], action: 'none' });
  m.mind.wake({ kind: 'heartbeat', text: 'Nothing special.', interactive: false });
  await flush();
  m.advance(MIND.reactionWindow + 1);
  m.mind.tick();
  assert.equal(m.mind.log.last(['said']).reaction, 'ignored it');
  assert.equal(m.mind.ignoredStreak, 1);
});

test('the decision model picks among his candidate lines', async () => {
  const engine = fakeEngine(
    { thought: 'job hunt', urge: 1, lines: ['Error 404.', 'Amazon! You got this!'], action: 'none' },
    { decide: () => ({ line: { choice: 'B' } }) },
  );
  const m = makeMind(engine);
  m.mind.interact('Sushant petted you.');
  await flush();
  await flush();
  assert.equal(m.spoken[0].text, 'Amazon! You got this!');
});

test('what you do on screen is noted, private things without details', async () => {
  const engine = fakeEngine({ thought: 'ooh', urge: 0, lines: ['ok'], action: 'none' });
  const m = makeMind(engine);
  await m.mind.observe({ app: 'Google Chrome', title: 'SWE II - Amazon', url: 'https://jobright.ai/jobs/1' });
  await flush();
  const seen = m.mind.log.last(['observe']);
  assert.deepEqual([seen.app, seen.title, seen.site], ['Google Chrome', 'SWE II - Amazon', 'jobright.ai']);
  assert.equal(engine.calls.length, 1, 'something new on screen is a chance to think');
  await m.mind.observe({ app: 'Google Chrome', title: 'Checkout', url: 'https://www.amazon.com/checkout/pay' });
  const priv = m.mind.log.last(['observe']);
  assert.deepEqual(priv, { t: priv.t, kind: 'observe', private: true });
  assert.ok(!JSON.stringify(m.mind.log.items).includes('Checkout'));
  assert.equal(engine.calls.length, 1, 'no thinking about private things');
});

test('the decision model can block what the rules let through', async () => {
  const engine = fakeEngine({ thought: 'x', urge: 0, lines: ['x'], action: 'none' }, { decide: () => ({ sensitive: { probabilities: { A: 0.9, B: 0.1 } } }) });
  const m = makeMind(engine);
  await m.mind.observe({ app: 'Some App', title: 'My tax return 2026' });
  assert.equal(m.mind.log.last(['observe']).private, true);
});

test('he notices when his personality changes, even without the models', () => {
  const m = makeMind(null);
  const p = P.defaultPersonality();
  P.setScore(p, 'traits.neuroticism.anxiety', 80);
  m.mind.setPersonality(p);
  assert.equal(m.spoken[0].text, FEEL_DIFFERENT);
  assert.match(m.mind.log.last(['changed']).text, /Anxiety up \(25 → 80\)/);
});

test('companion events become interactions (a long pet counts once)', async () => {
  const engine = fakeEngine({ thought: 'x', urge: 0, lines: ['x'], action: 'none' });
  const m = makeMind(engine);
  m.mind.companionEvents(['heart', 'heart', 'land']);
  m.mind.companionEvents(['heart']);
  await flush();
  assert.equal(m.mind.log.recent(10, ['interact']).length, 1);
  m.mind.companionEvents(['tttIWin']);
  assert.match(m.mind.log.last(['interact']).text, /beat Sushant at tic-tac-toe/);
});

test('the event log is written to disk as JSON lines', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-log-'));
  const log = new EventLog({ file: path.join(dir, 'events.jsonl'), now: () => 5 });
  log.add({ kind: 'interact', text: 'hi' });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8')), { t: 5, kind: 'interact', text: 'hi' });
});

// ------------------------------------------------------------------ speech, sounds, engine

test('he shows his words in a bubble you can click, unless he is holding something up', () => {
  const c = new Companion({ bounds: { left: 0, right: 1920, top: 0, floor: 1040 }, x: 500, y: 1040, halfWidth: 56, height: 142 });
  c.enter('idle', 10);
  assert.ok(c.say('Hiii, Sushant!', 'wave'));
  assert.equal(c.state, 'wave');
  assert.equal(c.snapshot().speech, 'Hiii, Sushant!');
  assert.ok(c.drainEvents().includes('speak'));
  assert.equal(c.hitPart({ x: 500, y: 1040 - 160 }), 'speech');
  for (let i = 0; i < 400; i++) c.update(1 / 60);
  assert.equal(c.snapshot().speech, null, 'the bubble goes away after a few seconds');
  c.startGame('fetch', true);
  for (let i = 0; i < 10; i++) c.update(1 / 60);
  assert.equal(c.state, 'offerBall');
  assert.equal(c.say('Hi!'), false);
});

test('your own clips: by mood, or for any mood', () => {
  const g = groupClips(['cheerful-1.wav', 'sad-sigh.mp3', 'chirp.m4a', 'notes.txt', '.hidden.wav']);
  assert.deepEqual(g.cheerful, ['cheerful-1.wav']);
  assert.deepEqual(g.any, ['chirp.m4a']);
  assert.equal(pickClip(g, 'sad'), 'sad-sigh.mp3');
  assert.equal(pickClip(g, 'grumpy'), 'chirp.m4a');
  assert.equal(pickClip(groupClips([]), 'sad'), null);
});

test('the engine reports what is missing before anything is downloaded', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-engine-'));
  assert.deepEqual(locate(dir).missing, ['server', 'voice', 'decide']);
});
