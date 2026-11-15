'use strict';

// Phase 12, moments: he may celebrate, comfort, cheer you on or be your study
// buddy. Only his prompt tells him about these moments; his personality and
// the model decide whether and how he reacts.

const test = require('node:test');
const assert = require('node:assert');
const T = require('../src/main/mind/thinker');
const P = require('../src/main/mind/personality');
const { MOMENTS, MOMENT_ACTIONS } = require('../src/main/mind/moments');
const names = require('../src/main/mind/names');
const { Mind } = require('../src/main/mind/mind');
const { Companion } = require('../src/main/companion');

names.setNames({ user: 'Sushant', pronoun: 'he' });
const filled = () => MOMENTS.map(names.fill);

// ------------------------------------------------------------------ prompt

test('the moments are in his first message for thoughts and chat, not for the diary or reflection', () => {
  const p = P.defaultPersonality();
  const first = filled()[0];
  for (const sys of [T.systemPrompt(p, '', { moments: true }), T.systemPrompt(p, '', { chat: true, moments: true })]) {
    assert.ok(sys.includes(filled().join('\n')));
    assert.match(sys, /Whether and how you react is up to you and your personality/);
    // After who he is, before how he talks.
    assert.ok(sys.indexOf(first) > sys.indexOf('Your personality'));
    assert.ok(sys.indexOf(first) < sys.indexOf('How you talk:'));
  }
  // The diary and the weekly reflection call it without moments.
  assert.ok(!T.systemPrompt(p).includes(first));
});

test('the moments text never names the character or you, and gives no tone', () => {
  const text = MOMENTS.join('\n');
  assert.doesNotMatch(text, /Togepi|Pip|Mori|Nomi|Pokémon|Pokemon/i);
  // Your name and pronouns come from names.js.
  assert.doesNotMatch(text, /Sushant|\b(he|him|his|she|her)\b/i);
  assert.match(text, /\{user\}/);
  assert.doesNotMatch(text, /baby|cute|cheerful|bubbly/i);
  // "I did it" is only something you tell him, not a button.
  assert.match(text, /"I did it"/);
  assert.doesNotMatch(text, /button|menu/i);
});

test('the moments use the name and pronouns you chose', () => {
  const p = P.defaultPersonality();
  names.setNames({ user: 'Priya', pronoun: 'she' });
  let sys = T.systemPrompt(p, '', { moments: true });
  assert.match(sys, /Moments that can matter to Priya\./);
  assert.match(sys, /You can comfort her \(action "comfort": a hug and hearts for her\)/);
  assert.match(sys, /You can cheer her on\./);
  names.setNames({ user: 'Sam', pronoun: 'they' });
  sys = T.systemPrompt(p, '', { moments: true });
  assert.match(sys, /Something big is coming up for Sam, like an interview or an exam\. You can cheer them on\./);
  // Study buddy is off (moments.js).
  assert.doesNotMatch(sys, /study buddy/);
  assert.doesNotMatch(sys, /\{(user|them|their)\}/);
  names.setNames({ user: 'Sushant', pronoun: 'he' });
});

test('his new actions are offered and accepted in thoughts and in chat', () => {
  for (const a of MOMENT_ACTIONS) {
    assert.ok(T.ACTIONS.includes(a), a);
    assert.ok(T.CHAT_SCHEMA.properties.action.enum.includes(a), a);
    assert.equal(T.parseThought(JSON.stringify({ thought: 'Yay!', urge: 8, lines: ['You did it!'], action: a })).action, a);
    assert.equal(T.parseReply(JSON.stringify({ reply: 'You did it!', action: a })).action, a);
  }
  const user = T.situationPrompt({ trigger: { text: 'Hi.' }, self: { hour: 10 }, events: [], now: Date.now() });
  assert.match(user, /celebrate, comfort\b/);
  // Study buddy is off: the model isn't offered it, and it isn't accepted.
  assert.ok(!T.ACTIONS.includes('studyBuddy'));
  assert.doesNotMatch(user, /studyBuddy/);
  assert.notEqual(T.parseReply(JSON.stringify({ reply: 'Study time!', action: 'studyBuddy' })).action, 'studyBuddy');
});

test("he is told when he's being a study buddy, so he can decide when to stop", () => {
  const s = { trigger: { text: 'Nothing special.' }, events: [], now: Date.now() };
  assert.match(T.situationPrompt({ ...s, self: { hour: 10, state: 'backView', studying: true } }), /You are being Sushant's study buddy/);
  assert.match(T.situationPrompt({ ...s, self: { hour: 10, state: 'backView' } }), /You are watching Sushant's screen\./);
});

// ------------------------------------------------------------------ mind

test('his thoughts and chat get the moments; what he does is the model\'s choice', async () => {
  const calls = [];
  const spoken = [];
  const answer = { thought: 'He did it!', urge: 9, lines: ['You did it!'], action: 'celebrate' };
  const mind = new Mind({
    engine: {
      ready: true,
      canDecide: false,
      async think(req) {
        calls.push(req);
        return JSON.stringify(req.schema === T.CHAT_SCHEMA ? { reply: 'You did it!', action: 'celebrate' } : answer);
      },
      status: () => 'running',
    },
    now: () => 5_000_000,
    rng: () => 0.5,
    getSelf: () => ({ band: 'cheerful', needs: {}, state: 'idle', hour: 15, quiet: false, away: false, asleep: false, busy: false }),
    onSpeak: (s) => spoken.push(s),
    onAsk: () => true,
  });
  mind.nextJournalCheck = Infinity;
  mind.interact('Sushant petted you.');
  await new Promise((r) => setImmediate(r));
  assert.ok(calls[0].system.includes(filled()[0]));
  assert.equal(spoken[0].text, 'You did it!');
  assert.equal(spoken[0].action, 'celebrate');
  const r = await mind.chat('I did it');
  assert.equal(r.action, 'celebrate');
  assert.ok(calls[1].system.includes(filled()[0]));
  assert.match(calls[1].user, /Sushant: I did it/);
});

// ------------------------------------------------------------------ body

function settled() {
  const c = new Companion({ bounds: { left: 0, right: 1920, top: 25, floor: 1080 }, rng: () => 0.5 });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.enter('idle', 5);
  c.drainEvents();
  return c;
}

function run(c, seconds) {
  for (let i = 0; i < seconds * 30; i++) c.update(1 / 30);
}

test('celebrate: confetti and a hop', () => {
  const c = settled();
  c.say('You did it!', 'celebrate');
  assert.ok(c.drainEvents().includes('confetti'));
  assert.equal(c.state, 'jump');
});

test("comfort: a hug and hearts, which don't count as you petting him", () => {
  const c = settled();
  c.say('I am here.', 'comfort');
  const events = c.drainEvents();
  assert.ok(events.includes('comfort'));
  assert.ok(!events.includes('heart'));
  assert.equal(c.state, 'hug');
});

test('study buddy is off: even when it is asked for, he does not sit down to watch your screen', () => {
  const c = settled();
  c.say('Study time!', 'studyBuddy');
  run(c, 40);
  assert.equal(c.studying, false);
  assert.notEqual(c.state, 'backView');
});

// Study buddy is off (moments.js); these come back if it does.
test.skip('study buddy: he stays watching your screen as long as the work goes on, until he chooses something else', () => {
  const c = settled();
  const x = c.x;
  c.say('Study time!', 'studyBuddy');
  assert.equal(c.state, 'backView');
  run(c, 200);
  assert.equal(c.state, 'backView');
  assert.equal(c.studying, true);
  assert.ok(Math.abs(c.x - x) < 1, 'no wandering off');
  // A line without an action keeps him studying; any other action ends it.
  c.say('Still here.', 'none');
  assert.equal(c.studying, true);
  c.say('Yay!', 'happy');
  assert.equal(c.studying, false);
});

test("watching together still works after study buddy: his own reactions to what you watch, then back to his spot", () => {
  const c = settled();
  c.say('Study time!', 'studyBuddy');
  c.startWatching(null);
  run(c, 40);
  assert.equal(c.studying, false);
  assert.equal(c.state, 'backView');
  assert.equal(c.snapshot().watching, true);
  // A funny moment on screen: main's watching reaction (each character draws it its own way).
  c.drainEvents();
  assert.equal(c.watchReact('funny'), true);
  assert.equal(c.state, 'watchReact');
  assert.ok(c.drainEvents().includes('watchHeart'));
  run(c, 20);
  assert.equal(c.state, 'backView');
  // His mind's moments don't interrupt watching: no lines (and so no actions) while you watch.
  assert.equal(c.watchReact('nonsense'), false);
});

test.skip('study buddy ends when you go away or start watching something together', () => {
  const c = settled();
  c.say('Study time!', 'studyBuddy');
  c.setContext({ userAway: true, awayFor: 300, hour: 14 });
  run(c, 40);
  assert.equal(c.studying, false);
  assert.notEqual(c.state, 'backView');

  const d = settled();
  d.say('Study time!', 'studyBuddy');
  d.startWatching(null);
  assert.equal(d.studying, false);
});
