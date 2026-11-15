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

// He calls you Sushant (he/him) in these tests (settings since Phase 9).
require('../src/main/mind/names').setNames({ user: 'Sushant', pronoun: 'he' });

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
  const t = T.parseThought(JSON.stringify({ thought: 'He looks tired', urge: 14, lines: ['Break time?', 'As an AI…', 'Break time?!'], action: 'dance' }));
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
  // Answers are written with urge 0..1 here; the model's scale is 0..10.
  const scale = (a) => (a && typeof a.urge === 'number' ? { ...a, urge: a.urge * 10 } : a);
  return {
    ready: true,
    canDecide: !!opts.decide,
    calls,
    async think(req) {
      calls.push(req);
      const a = typeof answers === 'function' ? answers(req) : answers;
      return JSON.stringify(scale(a));
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
  assert.deepEqual(spoken, [{ text: 'Hehe, more pets!', action: 'happy', band: 'cheerful', badge: null }]);
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

test('he never talks in his sleep, even if he fell asleep while thinking', async () => {
  const m = makeMind(fakeEngine({ thought: 'zzz', urge: 1, lines: ['Hiii!'], action: 'none' }), { asleep: true });
  m.mind.interact('Sushant petted you.');
  await flush();
  assert.equal(m.spoken.length, 0);
  assert.equal(m.mind.log.last(['silent']).why, 'asleep');
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

test('a line about something you already left is not said', async () => {
  let release;
  const slow = fakeEngine({ thought: 'ooh a job', urge: 1, lines: ['Amazon! Go go!'], action: 'none' });
  const think = slow.think;
  slow.think = (req) => new Promise((r) => { release = () => r(think(req)); });
  const m = makeMind(slow);
  await m.mind.observe({ app: 'Google Chrome', title: 'SWE II - Amazon', url: 'https://jobright.ai/jobs/1' });
  await m.mind.observe({ app: 'Code', title: 'companion.js' }); // you moved on while he thought
  release();
  await flush();
  await flush();
  assert.equal(m.spoken.length, 0);
  assert.equal(m.mind.log.last(['silent']).why, 'you already moved on');
});

test('he is told what is on your screen right now, without email addresses', async () => {
  const engine = fakeEngine({ thought: 'x', urge: 0, lines: ['x'], action: 'none' });
  const m = makeMind(engine);
  await m.mind.observe({ app: 'Google Chrome', title: 'In-person event in 4 hours - sushant.patil@stonybrook.edu - Mail', url: 'https://mail.google.com/mail/u/0' });
  await flush();
  assert.match(engine.calls[0].user, /On Sushant's screen right now: Google Chrome, "In-person event in 4 hours - \(email address\) - Mail" \(mail\.google\.com\)/);
  assert.ok(!JSON.stringify(m.mind.log.items).includes('stonybrook.edu'));
  assert.equal(m.mind.status().sees.site, 'mail.google.com');
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

test('the brain view shows the face he actually makes (grumpy after throws)', () => {
  const c = new Companion({ bounds: { left: 0, right: 1920, top: 0, floor: 1040 }, x: 500, y: 1040 });
  c.mood = 0.8;
  c.grumpiness = 0.7;
  const b = c.brainSnapshot();
  assert.equal(b.band, 'grumpy');
  assert.equal(b.grumpiness, 0.7);
});

test('he asks you to play now and then even when you keep him company', () => {
  let seed = 7;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const c = new Companion({ bounds: { left: 0, right: 1920, top: 0, floor: 1040 }, rng, halfWidth: 56, height: 142 });
  let invites = 0;
  let nextPet = 600;
  for (let t = 0; t < 4 * 3600; t += 0.05) {
    c.setContext({ hour: 14, day: '2026-01-01', now: 1e12 + t * 1000 });
    c.update(0.05, { x: 600, y: 900 });
    for (const e of c.drainEvents()) if (e === 'gameInvite') invites++;
    if (t >= nextPet) {
      c.pat(); // you pet him every 10 minutes
      nextPet += 600;
    }
  }
  assert.ok(invites >= 1 && invites <= 6, `asked ${invites} times in 4 hours`);
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

// ------------------------------------------------------------------ what you have coming up

const MIN = 60 * 1000;

// A mind whose clock starts at `t` with your next calendar event `minsAway` from then.
function upcomingMind(answers, { minsAway = 45, title = 'CS exam', link = null, self = {}, blocklist = {}, onAsk = null, more = [] } = {}) {
  let t = 1_000_000;
  const spoken = [];
  const asked = [];
  const engine = fakeEngine(answers);
  const event = { title, start: t + minsAway * MIN, end: t + (minsAway + 60) * MIN, ...(link ? { link } : {}) };
  // More events: [{ title, minsAway, mins }] (mins: how long it lasts).
  const calendar = [event, ...more.map((m) => ({ title: m.title, start: t + m.minsAway * MIN, end: t + (m.minsAway + (m.mins || 60)) * MIN }))];
  const mind = new Mind({
    engine,
    now: () => t,
    rng: () => 0.5,
    getSelf: () => ({ band: 'cheerful', needs: {}, state: 'idle', hour: 14, quiet: false, away: false, asleep: false, busy: false, calendar, ...self }),
    onSpeak: (s) => spoken.push(s),
    ...(onAsk ? { onAsk: (q) => (asked.push(q), onAsk(q)) } : {}),
    getBlocklist: () => blocklist,
  });
  // His first heartbeat comes after heartbeatMin..Max (rng 0.5: halfway).
  const heartbeat = async () => {
    t += MIND.heartbeatMax * 1000;
    mind.tick();
    await flush();
    await flush();
  };
  return { mind, engine, spoken, asked, heartbeat, calendar };
}

test('the next event is on his mind from an hour until the 30-minute sign', () => {
  const now = 1_000_000;
  const at = (mins) => T.upcomingSoon({ start: now + mins * MIN }, now);
  assert.equal(at(61), false);
  assert.equal(at(60), true);
  assert.equal(at(59), true);
  assert.equal(at(31), true);
  assert.equal(at(30), false, 'the 30-minute sign takes over');
  assert.equal(at(29), false);
  assert.equal(T.upcomingSoon(null, now), false);
});

test('the coming-up line names the event, its time, how long until, and a video call', () => {
  const now = new Date(2026, 9, 24, 14, 15).getTime();
  const start = new Date(2026, 9, 24, 15, 0).getTime();
  assert.equal(T.upcomingLine({ title: 'CS exam', start, call: false }, now), 'Coming up: Sushant has "CS exam" at 15:00 (in 45 minutes).');
  assert.equal(T.upcomingLine({ title: 'Office meeting', start, call: true }, now), 'Coming up: Sushant has "Office meeting" at 15:00 (in 45 minutes), a video call.');
  assert.equal(T.upcomingLine({ title: null, start, call: false }, now), 'Coming up: Sushant has an event at 15:00 (in 45 minutes).');
});

test('in the window his heartbeat wanders to the event, and the prompt says what is coming up', async () => {
  const { engine, heartbeat } = upcomingMind({ thought: 'A big exam!', urge: 0.2, lines: ['Good luck on your CS exam!'], action: 'jump', about: 'upcoming' });
  await heartbeat();
  assert.equal(engine.calls.length, 1);
  const { system, user } = engine.calls[0];
  assert.match(user, /Coming up: Sushant has "CS exam" at \d\d:\d\d \(in \d+ minutes\)\./);
  assert.match(user, /Just now: Your mind wanders to what Sushant has coming up: "CS exam" at \d\d:\d\d\./);
  assert.match(user, /"upcoming" \(what he has coming up\)/);
  assert.doesNotMatch(user, /Nothing special/);
  assert.match(system, /name the actual thing, in the line or question itself/);
  // No instruction what to say about it: how he reacts comes from his personality.
  assert.doesNotMatch(`${system}\n${user}`, /help him|get ready|prepare/i);
});

test('outside the window his heartbeat is the usual one, with nothing about events', async () => {
  for (const minsAway of [90, 20]) {
    const { engine, heartbeat } = upcomingMind({ thought: 'Hm.', urge: 0.1, lines: ['Hm.'], action: 'none', about: 'yourself' }, { minsAway });
    await heartbeat();
    const { user } = engine.calls[0];
    assert.match(user, /Just now: Nothing special\. You are just hanging around on the screen\./);
    assert.doesNotMatch(user, /Coming up|"upcoming"/);
  }
});

test('an event title on your privacy blocklist is never shown to him', async () => {
  const { engine, mind, heartbeat } = upcomingMind({ thought: 'Hm.', urge: 0.1, lines: ['Hm.'], action: 'none', about: 'upcoming' }, { title: 'Therapy session', blocklist: { words: ['therapy'] } });
  await heartbeat();
  const { user } = engine.calls[0];
  assert.doesNotMatch(user, /Therapy/i);
  assert.match(user, /Coming up: Sushant has an event at/);
  assert.match(user, /coming up: an event at/);
  assert.equal(mind.status().upcoming.title, null);
});

test('"about" is read from his answer, and anything else is dropped', () => {
  const base = { thought: 'Hi', urge: 5, lines: ['Hello there!'], action: 'none' };
  assert.equal(T.parseThought(JSON.stringify({ ...base, about: 'upcoming' })).about, 'upcoming');
  assert.equal(T.parseThought(JSON.stringify({ ...base, about: 'the moon' })).about, undefined);
  assert.equal(T.parseThought(JSON.stringify(base)).about, undefined);
  assert.ok(T.SCHEMA.required.includes('about'));
  assert.deepEqual(T.SCHEMA_WITH_QUESTION.properties.about.enum, T.ABOUT);
});

test('a line about what is coming up gets a 📅 on his bubble, and is remembered as about it', async () => {
  const { spoken, mind, heartbeat } = upcomingMind({ thought: 'A big exam!', urge: 0.9, lines: ['Good luck on your CS exam!'], action: 'jump', about: 'upcoming' });
  await heartbeat();
  assert.deepEqual(spoken, [{ text: 'Good luck on your CS exam!', action: 'jump', band: 'cheerful', badge: 'calendar' }]);
  assert.equal(mind.log.last(['said']).about, 'upcoming');
  assert.equal(mind.lastThought.about, 'upcoming');
});

test('no 📅 when the line is about something else, or nothing is coming up', async () => {
  const other = upcomingMind({ thought: 'Cozy.', urge: 0.9, lines: ['So cozy here!'], action: 'happy', about: 'yourself' });
  await other.heartbeat();
  assert.equal(other.spoken[0].badge, null);
  const later = upcomingMind({ thought: 'Hm.', urge: 0.9, lines: ['Something is coming!'], action: 'none', about: 'upcoming' }, { minsAway: 120 });
  await later.heartbeat();
  assert.equal(later.spoken[0].badge, null, 'he said "upcoming" but nothing is on his mind');
});

test('his question about what is coming up gets a 📅 too', async () => {
  const { asked, spoken, heartbeat } = upcomingMind(
    { thought: 'A test!', urge: 0.8, lines: ['You can do it!'], action: 'curious', about: 'upcoming', question: { text: 'Nervous about the exam?', answers: ['A little 😰', 'Ready ✨'], aboutSushant: true } },
    { onAsk: () => true },
  );
  await heartbeat();
  assert.deepEqual(spoken, []);
  assert.equal(asked.length, 1);
  assert.equal(asked[0].badge, 'calendar');
});

test('in a meeting, watching something or away, the event does not make him think', async () => {
  for (const self of [{ quiet: true }, { watching: 'YouTube' }, { away: true }]) {
    const { engine, heartbeat } = upcomingMind({ thought: 'Hm.', urge: 0.9, lines: ['Hm.'], action: 'none', about: 'upcoming' }, { self });
    await heartbeat();
    assert.equal(engine.calls.length, 0, JSON.stringify(self));
  }
});

test('thinking about what is coming up adds nothing new to his log, only what he said', async () => {
  const { mind, heartbeat } = upcomingMind({ thought: 'A big exam!', urge: 0.9, lines: ['Good luck on your CS exam!'], action: 'jump', about: 'upcoming' });
  await heartbeat();
  assert.deepEqual([...new Set(mind.log.items.map((e) => e.kind))], ['said']);
});

test('his bubble and question carry the 📅 to the screen', () => {
  const c = new Companion({ bounds: { left: 0, right: 1920, top: 0, floor: 1040 }, x: 500, y: 1040, halfWidth: 56, height: 142 });
  c.enter('idle', 10);
  assert.ok(c.say('Good luck!', 'none', { badge: 'calendar' }));
  assert.equal(c.snapshot().speechBadge, 'calendar');
  c.speech = null;
  assert.ok(c.say('Hi!'));
  assert.equal(c.snapshot().speechBadge, null);
  assert.ok(c.ask('Nervous?', ['A little', 'Ready'], 'none', { badge: 'calendar' }));
  assert.equal(c.snapshot().speechBadge, 'calendar');
});

test('once he has talked about it, the event is off his mind, even after the calendar is read again', async () => {
  const { mind, engine, calendar, heartbeat } = upcomingMind({ thought: 'A big exam!', urge: 0.9, lines: ['Good luck on your CS exam!'], action: 'jump', about: 'upcoming' });
  await heartbeat();
  assert.equal(mind.upcoming, null);
  // The calendar is read again every few minutes: the same event comes back as a new object.
  calendar.splice(0, 1, { ...calendar[0] });
  await heartbeat();
  assert.equal(engine.calls.length, 2);
  assert.match(engine.calls[1].user, /Just now: Nothing special\./);
  assert.doesNotMatch(engine.calls[1].user, /Coming up/);
  assert.equal(mind.status().upcoming, null);
});

test('it stays on his mind while he keeps quiet or talks about something else', async () => {
  for (const answer of [
    { thought: 'Hm, an exam.', urge: 0.1, lines: ['Hm.'], action: 'none', about: 'upcoming' },
    { thought: 'Cozy.', urge: 0.9, lines: ['So cozy here!'], action: 'happy', about: 'yourself' },
  ]) {
    // Two heartbeats 8 minutes apart, both inside the window.
    const { mind, engine, heartbeat } = upcomingMind(answer, { minsAway: 58 });
    await heartbeat();
    await heartbeat();
    assert.match(engine.calls[1].user, /Your mind wanders to what Sushant has coming up: "CS exam"/, answer.about);
    assert.equal(mind.upcoming.title, 'CS exam');
  }
});

test('after talking about one event, the next one in the window gets its turn', async () => {
  const { mind, engine, heartbeat } = upcomingMind(
    (req) => ({ thought: 'Ooh!', urge: 0.9, lines: [/coming up: "CS exam"/.test(req.user) ? 'Good luck on your CS exam!' : 'Cake for Alice!'], action: 'jump', about: 'upcoming' }),
    { minsAway: 40, more: [{ title: "Alice's birthday", minsAway: 55 }] },
  );
  await heartbeat();
  assert.match(engine.calls[0].user, /"CS exam"/);
  assert.equal(mind.upcoming.title, "Alice's birthday");
  await heartbeat();
  assert.match(engine.calls[1].user, /Your mind wanders to what Sushant has coming up: "Alice's birthday"/);
  assert.equal(mind.upcoming, null);
});

test('events starting together: the shorter one first, then by title', () => {
  const { mind } = upcomingMind({}, { minsAway: 45, title: 'Long one', more: [{ title: 'Zebra', minsAway: 45, mins: 15 }, { title: 'Apple', minsAway: 45, mins: 15 }] });
  mind.updateUpcoming();
  assert.equal(mind.upcoming.title, 'Apple');
});

test("a question he couldn't hold up doesn't count as talking about it", async () => {
  const { mind, asked, heartbeat } = upcomingMind(
    { thought: 'A test!', urge: 0.8, lines: ['You can do it!'], action: 'curious', about: 'upcoming', question: { text: 'Nervous about the exam?', answers: ['A little 😰', 'Ready ✨'], aboutSushant: true } },
    { onAsk: () => false },
  );
  await heartbeat();
  assert.equal(asked.length, 1);
  assert.equal(mind.upcoming.title, 'CS exam');
});

test('the coming-up lines read right for a user called "they" too', () => {
  const N = require('../src/main/mind/names');
  N.setNames({ user: 'Alex', pronoun: 'they' });
  try {
    const now = new Date(2026, 9, 24, 14, 15).getTime();
    const u = { title: 'CS exam', start: new Date(2026, 9, 24, 15, 0).getTime(), call: false };
    assert.match(T.upcomingLine(u, now), /^Coming up: Alex has "CS exam"/);
    assert.match(T.upcomingHeartbeat(u), /what Alex has coming up/);
    assert.match(T.situationPrompt({ trigger: { text: 'x' }, self: {}, events: [], now, upcoming: u }), /"upcoming" \(what they have coming up\)/);
  } finally {
    N.setNames({ user: 'Sushant', pronoun: 'he' });
  }
});

test('in chat he knows what is coming up during the same window, and chatting does not use it up', async () => {
  const reply = { reply: 'Good luck!', action: 'happy' };
  const inWindow = upcomingMind(reply);
  assert.ok(!(await inWindow.mind.chat('What do I have later?')).error);
  assert.match(inWindow.engine.calls[0].user, /\(Coming up: Sushant has "CS exam" at \d\d:\d\d \(in 45 minutes\)\.\)/);
  assert.equal(inWindow.mind.upcoming.title, 'CS exam');
  for (const minsAway of [90, 20]) {
    const outside = upcomingMind(reply, { minsAway });
    await outside.mind.chat('What do I have later?');
    assert.doesNotMatch(outside.engine.calls[0].user, /Coming up/);
  }
});
