'use strict';

// He sometimes asks you a question with two answers to click.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const P = require('../src/main/mind/personality');
const T = require('../src/main/mind/thinker');
const { Mind, MIND } = require('../src/main/mind/mind');
const { describeEvent } = require('../src/main/mind/events');
const { dayRelationship } = require('../src/main/mind/growth');
const { Companion, HIT } = require('../src/main/companion');

const bounds = { left: 0, right: 1920, top: 0, floor: 1040 };

function engine(answers) {
  const calls = [];
  const scale = (a) => (a && typeof a.urge === 'number' ? { ...a, urge: a.urge * 10 } : a);
  return {
    ready: true,
    canDecide: false,
    calls,
    async think(req) {
      calls.push(req);
      return JSON.stringify(scale(typeof answers === 'function' ? answers(req) : answers));
    },
    status: () => 'running',
  };
}

function makeMind(eng, { onAsk, blocklist } = {}) {
  let t = 1_000_000;
  const spoken = [];
  const asked = [];
  const facts = [];
  const memory = { notes: '', recall: () => [], addFacts: (items) => (facts.push(...items), items) };
  const mind = new Mind({
    engine: eng,
    now: () => t,
    rng: () => 0.5,
    memory,
    getSelf: () => ({ band: 'cheerful', needs: {}, state: 'idle', hour: 10, quiet: false, away: false, asleep: false, busy: false }),
    onSpeak: (s) => spoken.push(s),
    onAsk: onAsk || ((q) => asked.push(q)),
    getBlocklist: () => blocklist || {},
  });
  mind.nextJournalCheck = Infinity; // no diary in these tests
  return { mind, spoken, asked, facts, advance: (s) => (t += s * 1000) };
}

const flush = () => new Promise((r) => setImmediate(r));

const ASKING = {
  thought: 'What does he drink?',
  urge: 0.9,
  lines: ['Sip sip!'],
  action: 'curious',
  question: { text: 'Tea or coffee?', answers: ['🍵 Tea', '☕ Coffee'], aboutSushant: true },
};

// ------------------------------------------------------------------ prompt

test('his instructions give no example topics or sounds, only to try to name the thing', () => {
  const sys = T.systemPrompt(P.defaultPersonality());
  assert.doesNotMatch(sys, /job hunting|coding|emails|videos|games/);
  assert.doesNotMatch(sys, /Toge!|Priii/);
  assert.doesNotMatch(sys, /\(the company|\(his skills/);
  assert.match(sys, /Try to name the actual thing\./);
  assert.match(sys, /At most 8 words, one short sentence/);
});

test('he is told he may ask (never yes or no) only when he can, and the question is optional', () => {
  const s = { trigger: { text: 'Hi.' }, self: { hour: 10 }, events: [], now: Date.now() };
  assert.match(T.situationPrompt({ ...s, canAsk: true }), /"question".*never yes or no.*"aboutSushant": true only if his answer tells you something lasting about him, worth remembering/s);
  assert.doesNotMatch(T.situationPrompt(s), /question/);
  assert.ok(T.SCHEMA_WITH_QUESTION.properties.question);
  assert.ok(!T.SCHEMA_WITH_QUESTION.required.includes('question'));
  assert.ok(!T.SCHEMA.properties.question);
  assert.equal(T.SCHEMA.properties.lines.items.maxLength, 60);
});

test('a question needs two different answers that are not yes or no', () => {
  assert.deepEqual(T.cleanQuestion(ASKING.question), { text: 'Tea or coffee?', answers: ['🍵 Tea', '☕ Coffee'], aboutSushant: true });
  assert.equal(T.cleanQuestion({ text: 'Done?', answers: ['Yes!', '👎 No'] }), null);
  assert.equal(T.cleanQuestion({ text: 'Done?', answers: ['Sure', 'Nope'] }), null);
  assert.equal(T.cleanQuestion({ text: 'For me?', answers: ['Yes, my friend! 💖', 'Just for fun! 🎨'] }), null);
  assert.ok(T.cleanQuestion({ text: 'Which?', answers: ['Nothing yet 🌱', 'Noodles! 🍜'] })); // starts with "no…" but isn't "no"
  assert.equal(T.cleanQuestion({ text: 'Which?', answers: ['🍕 Pizza', 'pizza'] }), null);
  assert.equal(T.cleanQuestion({ text: 'Which?', answers: ['Only one'] }), null);
  assert.equal(T.cleanQuestion({ text: 'Are you an AI fan?', answers: ['A', 'B'] }), null);
  const long = T.cleanQuestion({ text: 'Which?', answers: ['A very very long answer here', '🌙 Night'] });
  assert.equal(long.answers[0].length, T.MAX_ANSWER);
  assert.equal(long.aboutSushant, false);
  // Without a question the thought looks as before.
  assert.equal(T.parseThought(JSON.stringify({ thought: 'x', urge: 5, lines: ['Hi'], action: 'none' })).question, undefined);
});

// ------------------------------------------------------------------ mind

test('when he writes a question he asks it instead of a line, and waits for the answer', async () => {
  const eng = engine(ASKING);
  const { mind, spoken, asked } = makeMind(eng);
  mind.interact('Sushant petted you.');
  await flush();
  assert.deepEqual(spoken, []);
  assert.deepEqual(asked, [{ text: 'Tea or coffee?', answers: ['🍵 Tea', '☕ Coffee'], action: 'curious', band: 'cheerful' }]);
  assert.equal(eng.calls[0].schema, T.SCHEMA_WITH_QUESTION);
  assert.match(eng.calls[0].user, /never yes or no/);
  assert.equal(mind.blockedBy({ interactive: true }), 'waiting for your answer');
  // Petting him doesn't count as an answer.
  mind.reacted('petted');
  assert.ok(mind.awaiting && mind.awaiting.question);
  assert.match(describeEvent(mind.log.last(['said']), Date.now()), /you asked "Tea or coffee\?" \(answers: "🍵 Tea" or "☕ Coffee"\)/);
  assert.equal(mind.status().lastSaid.answers.length, 2);
  assert.equal(mind.lastDecision.asked, true);
});

test('your answer is remembered when it tells him about you, and wakes him to react', async () => {
  let n = 0;
  const eng = engine(() => (n++ === 0 ? ASKING : { thought: 'Tea!', urge: 0.9, lines: ['Tea buddy!'], action: 'happy' }));
  const { mind, spoken, facts } = makeMind(eng);
  mind.interact('Sushant petted you.');
  await flush();
  assert.equal(mind.answered(1), true);
  assert.deepEqual(facts, [{ text: 'Sushant picked "☕ Coffee" when asked "Tea or coffee?"', importance: 6 }]);
  assert.equal(mind.log.last(['said']).reaction, 'answered "☕ Coffee"');
  assert.equal(mind.log.last(['interact']).text, 'Sushant answered your question "Tea or coffee?" with "☕ Coffee".');
  await flush();
  assert.deepEqual(spoken.map((s) => s.text), ['Tea buddy!']);
  // Only once.
  assert.equal(mind.answered(0), false);
});

test('an answer that says nothing about you is not remembered', async () => {
  const q = { ...ASKING, question: { text: 'Bug or feature?', answers: ['🐛 Bug', '✨ Feature'], aboutSushant: false } };
  const { mind, facts } = makeMind(engine(q));
  mind.interact('Sushant petted you.');
  await flush();
  assert.equal(mind.answered(0), true);
  assert.deepEqual(facts, []);
});

test('ignoring a question costs nothing, but after two in a row he stops asking for an hour', async () => {
  // (A new question each time: he never repeats himself.)
  let n = 0;
  const eng = engine(() => ({ ...ASKING, question: { ...ASKING.question, text: `Question number ${++n}?` } }));
  const { mind, asked, advance } = makeMind(eng);
  for (let i = 0; i < 2; i++) {
    mind.log.add({ kind: 'observe', app: 'Code', title: `file${i}.js` }); // something new each time
    mind.interact('Sushant petted you.');
    await flush();
    advance(MIND.questionWait + 1);
    mind.tick();
    assert.equal(mind.log.last(['said']).reaction, 'ignored the question');
  }
  assert.equal(asked.length, 2);
  assert.equal(mind.ignoredStreak, 0);
  assert.equal(mind.canAsk(), false);
  assert.equal(mind.status().askPausedMin, 60);
  // Meanwhile he isn't offered the question and says his line instead.
  advance(10);
  mind.log.add({ kind: 'observe', app: 'Code', title: 'file2.js' });
  mind.interact('Sushant petted you.');
  await flush();
  assert.equal(eng.calls.at(-1).schema, T.SCHEMA);
  assert.equal(asked.length, 2);
  assert.equal(mind.log.last(['said']).text, 'Sip sip!');
  advance(MIND.questionPause);
  assert.equal(mind.canAsk(), true);
  // Ignored questions don't count against your relationship.
  const ev = mind.log.recent(50);
  assert.ok(ev.some((e) => e.kind === 'reaction' && e.reaction === 'ignored the question'));
  assert.equal(dayRelationship(ev.filter((e) => e.kind === 'reaction')).affection, 0);
});

test('he never asks about anything on your privacy blocklist', async () => {
  const q = { ...ASKING, question: { text: 'More Tinder later?', answers: ['🔥 Sure thing', '🙈 Never'], aboutSushant: true } };
  const { mind, spoken, asked } = makeMind(engine(q), { blocklist: { apps: ['Tinder'], sites: [], words: [] } });
  mind.interact('Sushant petted you.');
  await flush();
  assert.deepEqual(asked, []);
  assert.deepEqual(spoken.map((s) => s.text), ['Sip sip!']);
});

test("if he can't hold the question up, he doesn't wait for an answer", async () => {
  const { mind } = makeMind(engine(ASKING), { onAsk: () => false });
  mind.interact('Sushant petted you.');
  await flush();
  assert.equal(mind.awaiting, null);
  assert.equal(mind.log.last(['said']).reaction, "couldn't show it");
});

test('answering counts towards your relationship like a pat', () => {
  const answered = [1, 2, 3, 4, 5, 6].map(() => ({ kind: 'reaction', reaction: 'answered "🍵 Tea"' }));
  assert.equal(dayRelationship(answered.slice(0, 1)).affection, 0.6);
  assert.equal(dayRelationship(answered).affection, 3); // capped like pats
});

// ------------------------------------------------------------------ companion

function settled() {
  const c = new Companion({ bounds, rng: () => 0.5 });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.enter('idle', 10);
  return c;
}

const at = (c, sx, sy) => ({ x: c.x + sx, y: c.y - sy });

test('his question bubble shows two answers you can click, and he stands still', () => {
  const c = settled();
  c.enter('walk', 5);
  assert.equal(c.ask('Tea or coffee?', ['🍵 Tea', '☕ Coffee'], 'askToPlay'), true);
  assert.equal(c.state, 'idle'); // stopped walking, no game invite
  const s = c.snapshot();
  assert.equal(s.speech, 'Tea or coffee?');
  assert.deepEqual(s.answers, ['🍵 Tea', '☕ Coffee']);
  const midY = (HIT.answers.bottom + HIT.answers.top) / 2;
  assert.equal(c.hitPart(at(c, -40, midY)), 'answer0');
  assert.equal(c.hitPart(at(c, 40, midY)), 'answer1');
  assert.equal(c.hitPart(at(c, 0, midY)), 'question'); // the gap between them
  assert.equal(c.hitPart(at(c, 0, HIT.question.top - 5)), 'question');
  assert.equal(c.answerQuestion(1), '☕ Coffee');
  assert.equal(c.snapshot().speech, null);
  assert.equal(c.state, 'nod');
  assert.equal(c.answerQuestion(0), null);
  // Asked with a curious look, he still nods.
  c.enter('idle', 10);
  c.ask('Cats or dogs?', ['🐱 Cats', '🐶 Dogs'], 'curious');
  assert.equal(c.state, 'curious');
  c.answerQuestion(0);
  assert.equal(c.state, 'nod');
});

test('nobody answers: after 30 s the question goes away and he shrugs', () => {
  const c = settled();
  c.ask('Tea or coffee?', ['🍵 Tea', '☕ Coffee']);
  for (let i = 0; i < 29 * 20; i++) c.update(1 / 20);
  assert.ok(c.asking());
  for (let i = 0; i < 2 * 20; i++) c.update(1 / 20);
  assert.equal(c.asking(), false);
  assert.equal(c.speech, null);
  assert.equal(c.state, 'confused');
});

test('the answer buttons the main process checks match the ones drawn', () => {
  const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', f), 'utf8');
  const size = Number(src('renderer.js').match(/const SIZE = ([\d.]+)/)[1]);
  const q = Object.fromEntries([...src('character.js').match(/const QUESTION = \{([^}]+)\}/)[1].matchAll(/(\w+): (-?[\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
  const near = (a, b) => assert.ok(Math.abs(a - b) <= 1.5, `${a} vs ${b}`);
  near(HIT.answers.bottom, -q.btnBottom * size);
  near(HIT.answers.top, -q.btnTop * size);
  near(HIT.answers.inner, q.gap * size);
  near(HIT.answers.outer, (q.w / 2 - 7) * size);
  near(HIT.question.halfWidth, (q.w / 2) * size);
  // Two lines of question still fit in his window (256 px, feet 18 px up).
  const top = (-q.btnTop + 9 + 2 * 14.5) * size;
  near(HIT.question.top, top);
  assert.ok(top < 256 - 18);
});

test('his reaction to your answer is never another question', async () => {
  const eng = engine(ASKING);
  const { mind, asked, spoken } = makeMind(eng);
  mind.log.add({ kind: 'observe', app: 'Code', title: 'a.js' });
  mind.interact('Sushant petted you.');
  await flush();
  assert.equal(asked.length, 1);
  mind.log.add({ kind: 'observe', app: 'Code', title: 'b.js' }); // even after moving on
  mind.answered(0);
  await flush();
  assert.equal(eng.calls.at(-1).schema, T.SCHEMA);
  assert.doesNotMatch(eng.calls.at(-1).user, /never yes or no/);
  assert.equal(asked.length, 1);
  assert.deepEqual(spoken.map((s) => s.text), ['Sip sip!']);
});

test('one question per thing you do: not again until you move on to something else', async () => {
  let n = 0;
  const eng = engine(() => ({ ...ASKING, question: { ...ASKING.question, text: `Question number ${++n}?` } }));
  const { mind, asked, advance } = makeMind(eng);
  mind.log.add({ kind: 'observe', app: 'Google Chrome', title: 'Ramen near me' });
  mind.interact('Sushant petted you.');
  await flush();
  assert.equal(asked.length, 1);
  mind.answered(0);
  await flush();
  // Still on the same page: he may talk, but no new question is offered.
  advance(120);
  mind.interact('Sushant petted you.');
  await flush();
  assert.equal(asked.length, 1);
  assert.equal(mind.canAsk(), false);
  // Somewhere new: he may ask again (if he wants to).
  mind.log.add({ kind: 'observe', app: 'Spotify', title: 'Blinding Lights' });
  assert.equal(mind.canAsk(), true);
  advance(120);
  mind.interact('Sushant petted you.');
  await flush();
  assert.equal(asked.length, 2);
});

test('with app watching off, something new you do with him counts as moving on (not answering him)', async () => {
  const { mind } = makeMind(engine(ASKING));
  mind.interact('Sushant petted you.');
  await flush();
  assert.equal(mind.canAsk(), false);
  mind.answered(1);
  assert.equal(mind.canAsk(), false);
  mind.log.add({ kind: 'interact', text: 'Sushant threw you!' });
  assert.equal(mind.canAsk(), true);
});

