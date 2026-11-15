'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { REST, restReason, restPlan } = require('../src/main/mind/rest');
const { Growth } = require('../src/main/mind/growth');
const { Memory, dayStart } = require('../src/main/mind/memory');
const { Mind } = require('../src/main/mind/mind');
const { INTERACTIONS } = require('../src/main/mind/interactions');
const P = require('../src/main/mind/personality');
const { buildReport } = require('../src/main/report');
const { WELCOME_VERSION, WHATS_NEW, SWITCHES, welcomeFor } = require('../src/main/welcome');
const { DEFAULTS } = require('../src/main/settings');

// He calls you Sushant (he/him) in these tests (settings since Phase 9).
require('../src/main/mind/names').setNames({ user: 'Sushant', pronoun: 'he' });

function at(day, hour) {
  return dayStart(day) + hour * 3600 * 1000;
}

const ev = (t, key) => ({ t, kind: 'interact', text: INTERACTIONS[key] });
const S = { restAfterAway: 15, restBattery: 20 };
const here = { userAway: false, awayFor: 0, asleep: false, hour: 14, onBattery: false, charging: true, batteryLevel: 0.8 };

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

// ------------------------------------------------------------- resting the models

test('the models rest after 15 minutes away, at night while he sleeps, and on battery below 20%', () => {
  assert.equal(restReason(here, S), null);
  assert.equal(restReason({ ...here, userAway: true, awayFor: 14 * 60 }, S), null, 'not yet');
  assert.equal(restReason({ ...here, userAway: true, awayFor: 15 * 60 }, S).kind, 'away');
  assert.equal(restReason({ ...here, userAway: true, awayFor: 3600 }, { ...S, restAfterAway: 0 }), null, 'Never');
  assert.equal(restReason({ ...here, userAway: true, awayFor: 6 * 60 }, { ...S, restAfterAway: 5 }).kind, 'away', 'your own setting');
  assert.equal(restReason({ ...here, asleep: true, hour: 23 }, S).kind, 'night');
  assert.equal(restReason({ ...here, asleep: true, hour: 3 }, S).kind, 'night');
  assert.equal(restReason({ ...here, asleep: true, hour: 14 }, S), null, 'a nap in the afternoon');
  assert.equal(restReason({ ...here, hour: 23 }, S), null, 'awake at night');
  const low = { ...here, onBattery: true, charging: false, batteryLevel: 0.19 };
  assert.equal(restReason(low, S).kind, 'battery');
  assert.equal(restReason({ ...low, charging: true }, S), null, 'plugged in');
  assert.equal(restReason({ ...low, batteryLevel: 0.22 }, S), null);
  assert.equal(restReason({ ...low, batteryLevel: 0.22 }, S, { kind: 'battery' }).kind, 'battery', `stays resting until ${S.restBattery + REST.batteryHysteresis}%`);
  assert.equal(restReason({ ...low, batteryLevel: 0.26 }, S, { kind: 'battery' }), null);
  assert.equal(restReason({ ...low, batteryLevel: null }, S), null, 'no battery');
});

test('before resting his diary and reflection get done; on low battery they wait', () => {
  const away = { kind: 'away' };
  assert.equal(restPlan({ reason: null, running: false }), 'start');
  assert.equal(restPlan({ reason: null, running: true }), null);
  assert.equal(restPlan({ reason: away, running: true }), 'stop');
  assert.equal(restPlan({ reason: away, running: true, busy: true }), null, 'never in the middle of a thought');
  assert.equal(restPlan({ reason: away, running: true, workDue: true }), 'work');
  assert.equal(restPlan({ reason: away, running: false, workDue: true }), 'start', 'wake up to write the diary');
  assert.equal(restPlan({ reason: { kind: 'battery' }, running: true, workDue: true }), 'stop');
  assert.equal(restPlan({ reason: { kind: 'battery' }, running: false, forced: true }), 'start', 'Try it now');
});

test('a diary that is due counts as work; one that just failed is not retried for an hour', async () => {
  let now = at('2026-10-20', 19);
  const memory = new Memory(null, () => now);
  let answer = { diary: [], facts: [], opinions: [] };
  const engine = fakeEngine(() => answer);
  const self = { band: 'content', hour: 19, away: true, awayFor: 20 * 60 };
  const mind = new Mind({ engine, memory, now: () => now, getSelf: () => self, onSpeak: () => {} });
  for (let i = 0; i < 6; i++) mind.log.items.push(ev(at('2026-10-20', 10 + i), 'heart'));
  assert.equal(mind.workDue(), 'diary');
  await mind.doWork();
  assert.equal(mind.status().journal.error, 'nothing usable');
  now += 2 * 60 * 1000;
  assert.equal(mind.workDue(), null, 'so the models can rest');
  now += 61 * 60 * 1000;
  answer = { diary: ['Pets all day!'], facts: [], opinions: [] };
  assert.equal(mind.workDue(), 'diary');
  await mind.doWork();
  assert.deepEqual(memory.journal['2026-10-20'].lines.map((l) => l.text), ['Pets all day!']);
  now += 61 * 1000;
  assert.equal(mind.workDue(), null);
});

// ------------------------------------------------------------- Try it now

test('counting today now, then the rest of the day later, never counts the same thing twice', () => {
  let now = at('2026-10-21', 12);
  const g = new Growth(null, () => now);
  let p = P.defaultPersonality();
  const events = [ev(at('2026-10-21', 9), 'heart'), ev(at('2026-10-21', 10), 'heart')];
  p = g.applyDays(p, events, { today: true });
  assert.deepEqual(g.lastDays, { affection: 1.2, trust: 0, familiarity: 0 });
  assert.equal(p.relationship.affection, 26);
  p = g.applyDays(p, events, { today: true });
  assert.deepEqual(g.lastDays, { affection: 0, trust: 0, familiarity: 0 }, 'nothing new');
  events.push(ev(at('2026-10-21', 15), 'heart'), ev(at('2026-10-21', 16), 'heart'));
  now = at('2026-10-22', 9);
  p = g.applyDays(p, events);
  assert.deepEqual(g.lastDays, { affection: 1.2, trust: 0, familiarity: 0 }, 'only the afternoon');
  assert.equal(p.relationship.affection, 27);
  assert.equal(g.week('2026-10-19').relationship.affection, 2.4);
  assert.equal(g.state.partial, null);
});

test('a reflection started by hand counts as that week’s; next week is due as usual', () => {
  let now = at('2026-10-21', 12); // Wednesday
  const g = new Growth(null, () => now);
  g.applyReflection(P.defaultPersonality(), { changes: [], insights: [] });
  now = at('2026-10-25', 19); // that Sunday
  assert.equal(g.reflectionDue({ away: true, awayFor: 900 }), false);
  now = at('2026-11-01', 19); // next Sunday
  assert.equal(g.reflectionDue({ away: true, awayFor: 900 }), true);
  now = at('2026-10-29', 12); // Thursday in between: not "overdue"
  assert.equal(g.reflectionDue({ away: false }), false);
});

test('Try it now: diary for today right away, reflection on demand, both explain when they can’t', async () => {
  const now = at('2026-10-21', 11);
  const memory = new Memory(null, () => now);
  const saved = [];
  const engine = fakeEngine((req) =>
    /reflecting on your week/.test(req.system)
      ? { changes: [{ path: 'traits.extraversion.warmth', delta: 2, reason: 'pets' }], insights: ['Sushant pets me in the mornings'] }
      : { diary: ['Morning pets!'], facts: ['Sushant starts work at 9'], opinions: [] },
  );
  const growth = new Growth(null, () => now);
  const mind = new Mind({ engine, memory, growth, now: () => now, getSelf: () => ({ band: 'content', hour: 11 }), onSpeak: () => {}, onPersonality: (p) => saved.push(p) });
  mind.personality = P.defaultPersonality();
  mind.log.items.push(ev(at('2026-10-21', 9), 'heart'));
  const written = await mind.writeDiaryNow();
  assert.deepEqual(written, [{ day: '2026-10-21', lines: 1, facts: 1, opinions: 0 }]);
  assert.deepEqual(await mind.writeDiaryNow(), [], 'nothing new');
  assert.deepEqual(await mind.reflectNow(), { note: 'not enough diary this week to reflect' });
  assert.equal(growth.reflected('2026-10-19'), false, 'a failed hand-started one is not a skipped week');
  for (const d of ['2026-10-19', '2026-10-20']) memory.writeJournal(d, [{ text: `Day ${d}`, importance: 5 }], at(d, 20));
  const r = await mind.reflectNow();
  assert.deepEqual(r.applied.map((c) => `${c.label} ${c.from}→${c.to}`), ['Warmth 90→92']);
  assert.deepEqual(r.insights, ['Sushant pets me in the mornings']);
  assert.equal(growth.reflected('2026-10-19'), true);
  assert.equal(mind.personality.traits.extraversion.warmth, 92);
  engine.ready = false;
  assert.match((await mind.writeDiaryNow()).error, /models aren't running/);
  mind.setEnabled(false);
  assert.match((await mind.reflectNow()).error, /mind is off/);
});

// ------------------------------------------------------------- report

test('the report has what helps and nothing private', () => {
  const secret = 'SECRET-Stripe-offer-letter';
  const text = buildReport({
    now: at('2026-10-21', 12),
    app: { version: '1.2.0', electron: '33.0.0', platform: 'darwin', osRelease: '25.0.0', arch: 'arm64', totalMemGB: 24 },
    settings: { ...DEFAULTS, mind: true, watchApps: true, readScreen: true, privacyBlock: { apps: [secret], sites: ['bank.com'], words: [secret] }, screenAllow: { apps: [secret], sites: [] } },
    engine: { state: 'running', ready: true, canDecide: true, files: { voice: '/x/models/gemma-4-12B-it-Q4_0.gguf', decide: '/x/models/vllm-d3-nano-Q8_0.gguf', vision: null, missing: [] }, memoryMB: 11059 },
    rest: { kind: 'away', text: `you've been away 20 min`, since: at('2026-10-21', 11.5) },
    mind: {
      enabled: true,
      thinking: false,
      talkativeness: 0.82,
      speed: { seconds: 3.24, n: 10 },
      sees: { app: 'Mail', title: secret },
      view: { typing: { app: 'Slack', title: secret } },
      looked: { app: 'Notion', chars: 1200, picture: true, skipped: null },
      recalled: [secret],
      lastSaid: { text: secret },
      lastThought: { thought: secret, lines: [secret], trigger: 'observe', at: at('2026-10-21', 11.9) },
      lastDecision: { urge: 0.4, threshold: 0.55, rail: null },
      journal: { day: '2026-10-20', facts: 3, opinions: 1 },
      growth: { changes: 2, insights: 1, at: at('2026-10-19', 19) },
    },
    context: { hour: 12, userAway: false, quiet: false, batteryLevel: 0.64, onBattery: true, screens: 2, frontApp: secret, inEvent: { title: secret }, error: 'Mail: card 4242 4242 4242 4242 refused' },
    permissions: { screen: 'granted', apps: null, calendar: null },
    counts: { facts: 12, opinions: 4, diaryDays: 6, growthWeeks: 1, locked: 2 },
  });
  assert.ok(!text.includes(secret), text);
  assert.ok(!text.includes('bank.com'));
  assert.ok(!text.includes('4242 4242'), 'scrubbed');
  for (const want of ['version 1.2.0', 'gemma-4-12B-it-Q4_0.gguf', '10.8 GB', 'resting: away', '3.2 s per thought', 'Screen Recording: granted', '1 apps, 1 sites, 1 words', '12 facts', 'rest after away 15 min', 'battery 64% on battery']) {
    assert.ok(text.includes(want), `${want}\n${text}`);
  }
});

// ------------------------------------------------------------- welcome

test('welcome on first run, what’s new once after an update, both from the menu any time', () => {
  assert.equal(welcomeFor(0).mode, 'welcome');
  assert.equal(welcomeFor(undefined).mode, 'welcome');
  assert.equal(welcomeFor(WELCOME_VERSION), null);
  const news = welcomeFor(WELCOME_VERSION - 2);
  assert.equal(news.mode, 'new');
  assert.deepEqual(news.whatsNew.map((w) => w.version), [WELCOME_VERSION - 1, WELCOME_VERSION]);
  const manual = welcomeFor(WELCOME_VERSION, { manual: true });
  assert.equal(manual.mode, 'welcome');
  assert.equal(manual.whatsNew.at(-1).version, WELCOME_VERSION);
  assert.equal(DEFAULTS.welcomeSeen, 0);
});

test('every version has a what’s new entry (the rule for future changes)', () => {
  assert.deepEqual(WHATS_NEW.map((w) => w.version), Array.from({ length: WELCOME_VERSION }, (_, i) => i + 1));
  for (const w of WHATS_NEW) assert.ok(w.title && w.items.length, `version ${w.version}`);
  assert.deepEqual(SWITCHES.map(([k]) => k), ['watchApps', 'readScreen', 'readCalendar', 'voiceCommands', 'weeklySong', 'openAtLogin']);
});
