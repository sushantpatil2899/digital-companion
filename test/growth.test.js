'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Growth, GROWTH, dayRelationship, weekOf } = require('../src/main/mind/growth');
const { reflect, schema } = require('../src/main/mind/reflect');
const { Memory, dayStart } = require('../src/main/mind/memory');
const { Mind } = require('../src/main/mind/mind');
const { INTERACTIONS } = require('../src/main/mind/interactions');
const P = require('../src/main/mind/personality');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-growth-'));
}

function at(day, hour) {
  return dayStart(day) + hour * 3600 * 1000;
}

const ev = (day, hour, key) => ({ t: at(day, hour), kind: 'interact', text: INTERACTIONS[key] });

function fakeEngine(answer) {
  const calls = [];
  return {
    ready: true,
    calls,
    async think(req) {
      calls.push(req);
      return JSON.stringify(typeof answer === 'function' ? answer(req) : answer);
    },
    status: () => 'running',
  };
}

// ------------------------------------------------------------- relationship

test('weeks start on Monday', () => {
  assert.equal(weekOf('2026-10-19'), '2026-10-19');
  assert.equal(weekOf('2026-10-20'), '2026-10-19');
  assert.equal(weekOf('2026-10-25'), '2026-10-19', 'Sunday ends the week');
  assert.equal(weekOf('2026-10-26'), '2026-10-26');
});

test('a day together moves affection, trust and familiarity by clear rules, with daily caps', () => {
  const day = '2026-10-19';
  const pets = Array.from({ length: 10 }, (_, i) => ev(day, 9 + i * 0.1, 'heart'));
  const d = dayRelationship(pets);
  assert.equal(d.affection, 3, 'ten pets count as five (capped at +3 a day)');
  assert.equal(d.familiarity, 1, 'a day with him around');
  const rough = dayRelationship([ev(day, 9, 'throw'), ev(day, 9.1, 'throw'), ev(day, 9.2, 'angry')]);
  assert.ok(Math.abs(rough.affection - -1.4) < 1e-9);
  assert.equal(rough.trust, -2);
  assert.equal(rough.familiarity, 0, 'too little that day');
  const replies = dayRelationship([
    { t: at(day, 9), kind: 'reaction', reaction: 'clicked the bubble' },
    { t: at(day, 10), kind: 'reaction', reaction: 'petted you' },
    { t: at(day, 11), kind: 'reaction', reaction: 'ignored it' },
  ]);
  assert.ok(Math.abs(replies.affection - 0.5) < 1e-9);
});

test('finished days are counted once, in whole points, with the rest carried over', () => {
  const g = new Growth(null, () => at('2026-10-21', 12));
  let p = P.defaultPersonality();
  const events = [ev('2026-10-19', 10, 'heart'), ev('2026-10-20', 10, 'heart'), ev('2026-10-21', 10, 'heart')];
  p = g.applyDays(p, events);
  assert.equal(p.relationship.affection, 26, '0.6 + 0.6 = 1 point, 0.2 carried; today is not counted yet');
  assert.equal(g.state.carry.affection, 0.2);
  assert.equal(g.state.relationshipThrough, '2026-10-20');
  assert.equal(g.applyDays(p, events), p, 'nothing new to count');
  assert.equal(g.week('2026-10-19').relationship.affection, 1.2);
});

test('the relationship moves at most ±10 a week per metric', () => {
  const g = new Growth(null, () => at('2026-10-26', 12));
  const events = [];
  for (const day of ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']) {
    for (let i = 0; i < 6; i++) events.push(ev(day, 9 + i * 0.1, 'heart'));
  }
  const p = g.applyDays(P.defaultPersonality(), events);
  assert.equal(p.relationship.affection, 35, '5 days × 3 = 15, capped at 10');
  assert.equal(g.week('2026-10-19').relationship.affection, 10);
});

test('a locked slider never grows', () => {
  const g = new Growth(null, () => at('2026-10-21', 12));
  const p = { ...P.defaultPersonality(), locked: ['relationship.affection'] };
  const events = Array.from({ length: 6 }, (_, i) => ev('2026-10-20', 9 + i * 0.1, 'heart'));
  assert.equal(g.applyDays(p, events).relationship.affection, 25);
});

// ------------------------------------------------------------- reflection

test('the weekly reflection is due on Sunday evening while you are away, or when overdue', () => {
  let now = at('2026-10-25', 19); // Sunday
  const g = new Growth(null, () => now);
  assert.equal(g.reflectionDue({ away: false }), false, 'not while you are here');
  assert.equal(g.reflectionDue({ away: true, awayFor: 900 }), true);
  now = at('2026-10-25', 15);
  assert.equal(g.reflectionDue({ away: true, awayFor: 900 }), false, 'not before 18:00');
  g.state.lastReflection = at('2026-10-25', 19);
  now = at('2026-10-30', 12);
  assert.equal(g.reflectionDue({ away: true, awayFor: 900 }), false, 'reflected this week');
  now = at('2026-11-02', 20);
  assert.equal(g.reflectionDue({ away: false }), true, 'missed Sunday: overdue after 8 days');
});

test('reflection changes are clamped: ±3 a trait, ±1 a value, ±15 from the baseline, locks and relationship untouched', () => {
  const dir = tmpDir();
  const g = new Growth(dir, () => at('2026-10-25', 19));
  const p = { ...P.defaultPersonality(), locked: ['traits.openness.ideas'] };
  P.setScore(p, 'traits.neuroticism.anxiety', 39); // 25 + 14
  const { personality, applied } = g.applyReflection(p, {
    changes: [
      { path: 'traits.extraversion.warmth', delta: 9, reason: 'so many pets' },
      { path: 'values.stimulation', delta: -3, reason: 'calm week' },
      { path: 'traits.neuroticism.anxiety', delta: 3, reason: 'he was thrown a lot' },
      { path: 'traits.openness.ideas', delta: 2, reason: 'locked' },
      { path: 'relationship.trust', delta: 3, reason: 'not by reflection' },
      { path: 'traits.extraversion.warmth', delta: 1, reason: 'twice' },
      { path: 'traits.nope', delta: 1, reason: 'made up' },
    ],
    insights: ['Sushant works late on Fridays'],
  });
  assert.equal(personality.traits.extraversion.warmth, 93);
  assert.equal(personality.values.stimulation, 89);
  assert.equal(personality.traits.neuroticism.anxiety, 40, 'never more than 15 from where he started');
  assert.equal(personality.traits.openness.ideas, 35);
  assert.equal(personality.relationship.trust, 25);
  assert.deepEqual(applied.map((c) => c.path), ['traits.extraversion.warmth', 'values.stimulation', 'traits.neuroticism.anxiety']);
  const md = fs.readFileSync(path.join(dir, 'growth.md'), 'utf8');
  assert.match(md, /## Week of 2026-10-19/);
  assert.match(md, /Warmth 90 → 93: so many pets/);
  assert.match(md, /Learned: Sushant works late on Fridays/);
  // State survives a restart.
  assert.equal(new Growth(dir).history()[0].changes.length, 3);
});

test('at most 6 changes a week, and your hand-set value becomes the new baseline', () => {
  const g = new Growth(null, () => at('2026-10-25', 19));
  const paths = P.sliders().map(([p]) => p).filter((p) => p.startsWith('traits.')).slice(0, 9);
  const { applied } = g.applyReflection(P.defaultPersonality(), { changes: paths.map((p) => ({ path: p, delta: -1, reason: 'x' })), insights: [] });
  assert.equal(applied.length, GROWTH.maxChanges);

  const p = P.defaultPersonality();
  P.setScore(p, 'traits.extraversion.warmth', 40);
  g.setBaseline('traits.extraversion.warmth', 40);
  assert.equal(g.applyReflection(p, { changes: [{ path: 'traits.extraversion.warmth', delta: 3, reason: 'x' }] }).personality.traits.extraversion.warmth, 43, 'not pulled back towards 90');
});

test('a week can be undone, relationship included', () => {
  const g = new Growth(null, () => at('2026-10-26', 12));
  let p = P.defaultPersonality();
  p = g.applyDays(p, Array.from({ length: 6 }, (_, i) => ev('2026-10-20', 9 + i * 0.1, 'heart')));
  p = g.applyReflection(p, { changes: [{ path: 'traits.extraversion.warmth', delta: 2, reason: 'pets' }] }, '2026-10-19').personality;
  assert.equal(p.relationship.affection, 28);
  assert.equal(p.traits.extraversion.warmth, 92);
  p = g.undo(p, '2026-10-19');
  assert.equal(p.relationship.affection, 25);
  assert.equal(p.traits.extraversion.warmth, 90);
  assert.equal(g.history()[0].undone, true);
  assert.equal(g.undo(p, '2026-10-19'), p, 'only once');
});

test('the reflection prompt has the week diary and his scores; too little diary means no reflection', async () => {
  const dir = tmpDir();
  const now = at('2026-10-25', 19);
  const memory = new Memory(dir, () => now);
  memory.writeJournal('2026-10-20', [{ text: 'Sushant applied to Amazon.', importance: 7 }], at('2026-10-20', 20));
  memory.writeJournal('2026-10-22', [{ text: 'We played fetch.', importance: 5 }], at('2026-10-22', 20));
  const engine = fakeEngine({ changes: [{ path: 'traits.extraversion.warmth', delta: 1, reason: 'fetch' }], insights: ['Sushant is job hunting', 'mail me at a@b.c'] });
  assert.equal(await reflect(engine, P.defaultPersonality(), memory, { now }), null);
  assert.equal(engine.calls.length, 0, 'the model is not even asked');
  memory.writeJournal('2026-10-24', [{ text: 'He worked late.', importance: 4 }], at('2026-10-24', 20));
  const r = await reflect(engine, P.defaultPersonality(), memory, { now, together: 'affection grew by 3' });
  assert.deepEqual(r.insights, ['Sushant is job hunting'], 'no emails or links');
  const { user, system } = engine.calls[0];
  assert.match(user, /- 2026-10-20: Sushant applied to Amazon\./);
  assert.match(user, /You and Sushant this week: affection grew by 3/);
  assert.match(user, /traits\.extraversion\.warmth \(Warmth\) = 90/);
  assert.doesNotMatch(user, /relationship\.affection/);
  assert.match(system, /reflecting on your week/);
  assert.ok(!schema().properties.changes.items.properties.path.enum.some((p) => p.startsWith('relationship.')));
});

test('the mind grows on Sunday evening: saves his personality, remembers insights and notices the change', async () => {
  const dir = tmpDir();
  let now = at('2026-10-25', 19);
  const memory = new Memory(dir, () => now);
  for (const d of ['2026-10-20', '2026-10-22', '2026-10-24']) memory.writeJournal(d, [{ text: `Day ${d}.`, importance: 5 }], at(d, 20));
  const engine = fakeEngine({ changes: [{ path: 'traits.extraversion.warmth', delta: 2, reason: 'lots of pets' }], insights: ['Sushant likes fetch'] });
  const saved = [];
  let self = { band: 'content', hour: 19, away: true, awayFor: 1200 };
  const mind = new Mind({
    engine,
    memory,
    growth: new Growth(dir, () => now),
    now: () => now,
    getSelf: () => self,
    onSpeak: () => {},
    onPersonality: (p) => saved.push(p),
  });
  mind.personality = P.defaultPersonality();
  for (let i = 0; i < 6; i++) mind.log.items.push(ev('2026-10-24', 10 + i * 0.1, 'heart'));
  const applied = await mind.maybeGrow();
  assert.equal(applied.length, 1);
  assert.equal(saved.length, 2, 'once for the relationship, once for the reflection');
  assert.equal(saved[0].relationship.affection, 28);
  assert.equal(mind.personality.traits.extraversion.warmth, 92);
  assert.ok(memory.facts.some((f) => f.text === 'Sushant likes fetch' && f.importance === 7));
  assert.match(mind.log.items.at(-1).text, /you grew this week: Warmth up \(lots of pets\)/);
  assert.equal(mind.status().growth.changes, 1);
  assert.equal(await mind.maybeGrow(), null, 'once a week');
  // He thinks about it when you're back, not while you're away.
  const before = engine.calls.length;
  mind.tick();
  await new Promise((r) => setImmediate(r));
  assert.equal(engine.calls.length, before);
  self = { ...self, away: false, awayFor: 0 };
  mind.tick();
  await new Promise((r) => setImmediate(r));
  assert.match(engine.calls.at(-1).user, /You notice you feel different/);
  assert.equal(mind.toNotice, null);
  // Next Sunday with no diary: skipped, and not retried every few minutes.
  now = at('2026-11-01', 19);
  self = { ...self, away: true, awayFor: 1200 };
  memory.journal = {};
  assert.equal(await mind.maybeGrow(), null);
  assert.match(mind.status().growth.note, /not enough diary/);
  const calls = engine.calls.length;
  await mind.maybeGrow();
  assert.equal(engine.calls.length, calls);
});

// ------------------------------------------------------------- personality

test('locked sliders survive personality.md round trips', () => {
  const p = { ...P.defaultPersonality(), locked: ['traits.extraversion.warmth', 'relationship.trust', 'bogus.path'] };
  const back = P.parse(P.serialize(P.normalize(p)));
  assert.deepEqual(back.locked, ['traits.extraversion.warmth', 'relationship.trust']);
});

test('his resting mood and how fast it changes come from his personality, relative to Togepi', () => {
  assert.deepEqual(P.temperament(P.defaultPersonality()), { offset: 0, speed: 1 });
  const gloomy = P.defaultPersonality();
  for (const k of ['anxiety', 'depression', 'vulnerability']) P.setScore(gloomy, `traits.neuroticism.${k}`, 90);
  P.setScore(gloomy, 'traits.extraversion.positive_emotions', 10);
  const t = P.temperament(gloomy);
  assert.ok(t.offset < -0.1 && t.offset >= -0.4);
  assert.equal(t.speed, 0.6);
});
