'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Memory, relevance, meaningRelevance, readEvents, pruneEvents, journalDue, dayString, dayStart } = require('../src/main/mind/memory');
const { writeDay, writeWeek, dayDigest } = require('../src/main/mind/journal');
const { Mind } = require('../src/main/mind/mind');
const P = require('../src/main/mind/personality');

// He calls you Sushant (he/him) in these tests (settings since Phase 9).
require('../src/main/mind/names').setNames({ user: 'Sushant', pronoun: 'he' });

const DAY = 24 * 3600 * 1000;

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-memory-'));
}

function at(day, hour) {
  return dayStart(day) + hour * 3600 * 1000;
}

test('memory files are created, read back and editable by hand', () => {
  const dir = tmpDir();
  const m = new Memory(dir, () => at('2026-10-20', 12));
  assert.match(fs.readFileSync(path.join(dir, 'about-you.md'), 'utf8'), /## Your notes/);
  assert.ok(fs.existsSync(path.join(dir, 'about-me.md')));
  m.addFacts([{ text: 'Sushant is job hunting', importance: 8 }]);
  m.addOpinions([{ text: 'Fetch is the best game', importance: 6 }]);
  m.writeJournal('2026-10-20', [{ text: 'Sushant applied to Amazon!', importance: 7 }], at('2026-10-20', 20));
  // Sushant writes his own notes in the file.
  const f = path.join(dir, 'about-you.md');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/\(Write anything[^)]*\)/, 'I am a CS student at Stony Brook.'));
  const back = new Memory(dir, () => at('2026-10-20', 12));
  assert.equal(back.notes, 'I am a CS student at Stony Brook.');
  assert.deepEqual(back.facts, [{ text: 'Sushant is job hunting', date: '2026-10-20', importance: 8 }]);
  assert.equal(back.opinions[0].text, 'Fetch is the best game');
  assert.deepEqual(back.journal['2026-10-20'].lines.map((l) => l.text), ['Sushant applied to Amazon!']);
  assert.equal(back.journal['2026-10-20'].until, at('2026-10-20', 20));
});

test('he does not write down the same fact twice, and forgets the least important first', () => {
  const m = new Memory(null, () => at('2026-10-20', 12));
  m.addFacts([{ text: 'Sushant loves playing fetch', importance: 6 }]);
  assert.equal(m.addFacts([{ text: 'Sushant loves playing fetch!', importance: 6 }]).length, 0);
  for (let i = 0; i < 90; i++) m.addFacts([{ text: `fact number ${i} about thing${i}`, importance: i === 3 ? 1 : 5 }]);
  assert.equal(m.facts.length, 80);
  assert.ok(!m.facts.some((f) => f.text === 'fact number 3 about thing3'));
  assert.ok(m.facts.some((f) => f.text === 'Sushant loves playing fetch'));
});

test('recall: relevant, important and recent memories come to mind', () => {
  const now = at('2026-10-20', 12);
  const m = new Memory(null, () => now);
  m.addFacts([
    { text: 'Sushant is applying to software engineering jobs at Amazon and Stripe', date: '2026-10-18', importance: 8 },
    { text: 'Sushant likes lofi music', date: '2026-10-10', importance: 4 },
  ]);
  m.writeJournal('2026-10-19', [{ text: 'We played fetch three times!', importance: 6 }], at('2026-10-19', 22));
  const got = m.recall('Sushant switched to Google Chrome: "Software Engineer II - Amazon | JobRight"');
  assert.equal(got[0].text, 'Sushant is applying to software engineering jobs at Amazon and Stripe');
  assert.ok(!got.some((g) => g.text.includes('lofi')), 'unrelated, unimportant things stay out');
  assert.ok(relevance('Amazon job', 'jobs at Amazon') > 0.5);
});

test('recall by meaning (Phase 10): what fits the moment without sharing a word, and back to words without it', async () => {
  const now = at('2026-10-20', 12);
  const m = new Memory(null, () => now);
  m.addFacts([
    { text: 'Sushant gets nervous before interviews', date: '2026-10-18', importance: 4 },
    { text: 'Sushant likes lofi music', date: '2026-10-18', importance: 4 },
  ]);
  const query = 'Sushant is on a LinkedIn job post';
  // By words: nothing about interviews shares a word with the job post.
  assert.ok(!m.recall(query).some((g) => g.text.includes('nervous')));
  // By meaning (similarities from the database): it does come to mind, the music doesn't.
  const meaning = new Map([
    ['Sushant gets nervous before interviews', 0.55],
    ['Sushant likes lofi music', 0.18],
  ]);
  const got = m.recall(query, 5, [], meaning);
  assert.equal(got[0].text, 'Sushant gets nervous before interviews');
  assert.ok(!got.some((g) => g.text.includes('lofi')));
  assert.equal(meaningRelevance(0.18), 0);
  assert.equal(meaningRelevance(0.9), 1);
  assert.equal(meaningRelevance(undefined), 0);

  // The mind asks the database first and says how it recalled.
  const mind = new Mind({ memory: m, meaning: async () => meaning, now: () => now });
  mind.coreFacts = []; // (both facts would otherwise be his core, always on his mind)
  const r = await mind.recall({ text: query }, null);
  assert.equal(r[0].text, 'Sushant gets nervous before interviews');
  assert.equal(mind.recalledBy, 'meaning');
  const broken = new Mind({ memory: m, meaning: async () => { throw new Error('database down'); }, now: () => now });
  await broken.recall({ text: query }, null);
  assert.equal(broken.recalledBy, 'words');
});

test('he can forget a fact, an opinion or a whole day', () => {
  const dir = tmpDir();
  const m = new Memory(dir, () => at('2026-10-20', 12));
  m.addFacts([{ text: 'A' }, { text: 'Bee' }]);
  m.addOpinions([{ text: 'Mine' }]);
  m.writeJournal('2026-10-19', [{ text: 'A day' }], at('2026-10-19', 22));
  assert.ok(m.forget('fact:0'));
  assert.ok(m.forget('opinion:0'));
  assert.ok(m.forget('day:2026-10-19'));
  const back = new Memory(dir);
  assert.deepEqual(back.facts.map((f) => f.text), ['Bee']);
  assert.equal(back.opinions.length, 0);
  assert.ok(!fs.existsSync(path.join(dir, 'journal', '2026-10-19.md')));
  // A forgotten day isn't written again from the same events.
  const events = Array.from({ length: 6 }, (_, i) => ({ t: at('2026-10-19', 10 + i), kind: 'interact', text: 'pet' }));
  assert.equal(journalDue(events, m, { now: at('2026-10-20', 12) }), null);
});

test('the event log keeps 90 days', () => {
  const dir = tmpDir();
  const f = path.join(dir, 'events.jsonl');
  const now = at('2026-10-20', 12);
  fs.writeFileSync(f, [{ t: now - 100 * DAY, kind: 'old' }, { t: now - 10 * DAY, kind: 'recent' }].map((e) => JSON.stringify(e)).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'events.1.jsonl'), JSON.stringify({ t: now - 200 * DAY, kind: 'ancient' }) + '\n');
  pruneEvents(f, 90, now);
  assert.deepEqual(readEvents(f).map((e) => e.kind), ['recent']);
  assert.ok(!fs.existsSync(path.join(dir, 'events.1.jsonl')));
});

test('his diary is due for past days, and for today only at the end of the day', () => {
  const m = new Memory(null);
  const ev = (day, h) => ({ t: at(day, h), kind: 'interact', text: 'Sushant petted you.' });
  const events = [...[9, 10, 11, 12, 13].map((h) => ev('2026-10-19', h)), ...[9, 10, 11, 12, 13, 14].map((h) => ev('2026-10-20', h))];
  const now = at('2026-10-20', 19);
  assert.equal(journalDue(events, m, { now }).day, '2026-10-19');
  m.writeJournal('2026-10-19', [{ text: 'x' }], at('2026-10-19', 13));
  assert.equal(journalDue(events, m, { now }), null, 'today waits for the end of the day');
  assert.equal(journalDue(events, m, { now, endOfDay: true }).day, '2026-10-20');
  // A quiet day (a couple of events) gets no diary.
  assert.equal(journalDue([ev('2026-10-18', 9)], m, { now }), null);
});

test('the day digest never contains email subjects', () => {
  const d = dayDigest([
    { t: at('2026-10-20', 9), kind: 'observe', app: 'Google Chrome', title: 'Offer letter from Stripe - Gmail', site: 'mail.google.com' },
    { t: at('2026-10-20', 10), kind: 'observe', app: 'Google Chrome', title: 'Software Engineer II - Amazon', site: 'jobright.ai' },
    { t: at('2026-10-20', 11), kind: 'observe', private: true },
    { t: at('2026-10-20', 12), kind: 'interact', text: 'Sushant petted you.' },
    { t: at('2026-10-20', 12), kind: 'interact', text: 'Sushant petted you.' },
    { t: at('2026-10-20', 13), kind: 'said', text: 'Amazon again?', reaction: 'clicked the bubble' },
  ]);
  assert.ok(!d.includes('Offer letter'));
  assert.match(d, /read emails/);
  assert.match(d, /"Software Engineer II - Amazon"/);
  assert.match(d, /private things/);
  assert.match(d, /Sushant petted you\. \(2 times\)/);
  assert.match(d, /"Amazon again\?" \(Sushant clicked the bubble\)/);
});

function fakeEngine(answer, importanceScore = 3) {
  const calls = [];
  return {
    ready: true,
    canDecide: true,
    calls,
    think: async (req) => {
      calls.push(req);
      return JSON.stringify(typeof answer === 'function' ? answer(req) : answer);
    },
    decide: async () => ({ m: { score: importanceScore } }),
    status: () => 'running',
  };
}

test('writing a day: diary, new facts and opinions, rated for importance', async () => {
  const m = new Memory(null, () => at('2026-10-20', 20));
  const engine = fakeEngine({
    diary: ['Sushant applied to Amazon today!', 'He petted me two times. Yay!'],
    facts: ['Sushant is applying for software jobs', 'Write to me at a@b.com'],
    opinions: ['JobRight has too many words'],
  });
  const events = Array.from({ length: 6 }, (_, i) => ({ t: at('2026-10-20', 10 + i), kind: 'observe', app: 'Google Chrome', title: 'SWE - Amazon', site: 'jobright.ai' }));
  const done = await writeDay(engine, m, P.defaultPersonality(), { day: '2026-10-20', events, until: events[5].t });
  assert.deepEqual(done.facts, ['Sushant is applying for software jobs'], 'nothing with an email address');
  assert.equal(m.journal['2026-10-20'].lines.length, 2);
  assert.equal(m.facts[0].importance, 8); // score 3 of 4 -> 8 of 10
  assert.equal(m.opinions[0].text, 'JobRight has too many words');
  assert.match(engine.calls[0].system, /writing in your own diary/);
  assert.match(engine.calls[0].user, /"SWE - Amazon"/);
});

test('his memories and your notes reach his thoughts', async () => {
  const now = at('2026-10-20', 12);
  const memory = new Memory(null, () => now);
  memory.notes = 'I am a CS student looking for SWE internships.';
  // His 12 most important facts are his core (in message 1); the rest come to mind when they fit.
  const core = [
    'plays chess every weekend at the club',
    'watches cricket matches late at night',
    'learning guitar chords from videos',
    'cooks spicy biryani on Sundays',
    'hikes mountain trails in autumn',
    'paints watercolour landscapes sometimes',
    'swims laps before breakfast',
    'reads science fiction novels',
    'cycles to campus daily',
    'grows tomatoes and basil indoors',
    'photographs sunsets near the harbour',
    'bakes sourdough bread on Fridays',
  ];
  memory.addFacts(core.map((c) => ({ text: `Core: ${c}`, date: '2026-10-01', importance: 9 })));
  memory.addFacts([{ text: 'Sushant applied to Amazon jobs yesterday', date: '2026-10-19', importance: 8 }]);
  const engine = fakeEngine({ thought: 'x', urge: 0, lines: ['x'], action: 'none' });
  const mind = new Mind({
    engine,
    memory,
    now: () => now,
    getSelf: () => ({ band: 'content', state: 'idle', hour: 12 }),
    onSpeak: () => {},
  });
  await mind.observe({ app: 'Google Chrome', title: 'Software Engineer - Amazon', url: 'https://jobright.ai/jobs/2' });
  await new Promise((r) => setImmediate(r));
  assert.match(engine.calls[0].system, /What Sushant told you about himself:\nI am a CS student/);
  assert.match(engine.calls[0].user, /Things you remember[^\n]*\n- \(yesterday\) Sushant applied to Amazon jobs yesterday/);
  assert.deepEqual(mind.status().recalled, ['Sushant applied to Amazon jobs yesterday']);
  assert.match(engine.calls[0].system, /What you know best about Sushant:\n- Core: /);
  assert.equal((engine.calls[0].system.match(/- Core: /g) || []).length, 12);
  assert.doesNotMatch(engine.calls[0].user, /Core: /); // not twice
});

test('his core: the 12 most important facts, newest first among equals, refreshed after his diary', async () => {
  const now = at('2026-10-20', 12);
  const memory = new Memory(null, () => now);
  memory.addFacts([
    { text: 'Sushant loves ramen noodles', date: '2026-10-01', importance: 6 },
    { text: 'Sushant is preparing for a Google interview', date: '2026-10-18', importance: 9 },
    { text: 'Sushant studies at Stony Brook', date: '2026-10-02', importance: 9 },
  ]);
  assert.deepEqual(memory.core(2), ['Sushant is preparing for a Google interview', 'Sushant studies at Stony Brook']);
  const engine = fakeEngine({ diary: ['A good day.'], facts: ['Sushant got an offer from Stripe'], opinions: [] });
  const mind = new Mind({ engine, memory, now: () => now, getSelf: () => ({ band: 'content', hour: 9 }), onSpeak: () => {} });
  assert.equal(mind.coreFacts.length, 3);
  for (let i = 0; i < 6; i++) mind.log.items.push({ t: at('2026-10-19', 10 + i), kind: 'interact', text: 'Sushant petted you.' });
  await mind.maybeWriteJournal();
  assert.ok(mind.coreFacts.includes('Sushant got an offer from Stripe'));
});

test('weekly summaries: written from the diary, kept in weeks.md, recalled like facts, forgettable', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-weeks-'));
  const now = at('2026-10-25', 19); // Sunday
  const memory = new Memory(dir, () => now);
  memory.writeJournal('2026-10-20', [{ text: 'Sushant practised interview questions with me.', importance: 7 }], at('2026-10-20', 23));
  memory.writeJournal('2026-10-23', [{ text: 'We watched a movie together.', importance: 5 }], at('2026-10-23', 23));
  const engine = fakeEngine({ summary: 'This week Sushant practised for interviews and we watched a movie. I felt happy and proud of him.' });
  const s = await writeWeek(engine, memory, P.defaultPersonality(), '2026-10-19');
  assert.match(s, /practised for interviews/);
  assert.match(engine.calls[0].user, /2026-10-20:\n- Sushant practised interview questions with me\./);
  assert.match(engine.calls[0].user, /3 to 4 short sentences about your week/);
  assert.equal(await writeWeek(engine, memory, P.defaultPersonality(), '2026-10-19'), null, 'only once per week');
  assert.equal(await writeWeek(engine, memory, P.defaultPersonality(), '2026-10-12'), null, 'no diary that week');
  // Kept on disk and read back.
  const again = new Memory(dir, () => now);
  assert.equal(again.weeks['2026-10-19'].text, s);
  assert.deepEqual(again.all().weeks.map((w) => w.id), ['week:2026-10-19']);
  // Two months later the week still comes to mind; the daily lines have faded.
  const later = new Memory(dir, () => at('2026-12-20', 12));
  const r = later.recall('interview practice', 5);
  assert.equal(r[0].kind, 'week');
  assert.equal(later.forget('week:2026-10-19'), true);
  assert.equal(new Memory(dir, () => now).weeks['2026-10-19'], undefined);
});

test('the mind writes his diary when a day is due', async () => {
  const day = '2026-10-19';
  const now = at('2026-10-20', 9);
  const memory = new Memory(null, () => now);
  const engine = fakeEngine({ diary: ['A good day.'], facts: [], opinions: [] });
  const mind = new Mind({ engine, memory, now: () => now, getSelf: () => ({ band: 'content', hour: 9 }), onSpeak: () => {} });
  for (let i = 0; i < 6; i++) mind.log.items.push({ t: at(day, 10 + i), kind: 'interact', text: 'Sushant petted you.' });
  const done = await mind.maybeWriteJournal();
  assert.equal(done.day, day);
  assert.deepEqual(memory.journal[day].lines.map((l) => l.text), ['A good day.']);
  assert.equal(mind.status().journal.day, day);
  assert.equal(await mind.maybeWriteJournal(), null, 'nothing more to write');
  assert.equal(dayString(now), '2026-10-20');
});
