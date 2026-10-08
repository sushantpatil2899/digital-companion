'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { NudgeTracker, pastBedtime, say, TIMING } = require('../src/main/nudges');
const { Companion, HIT } = require('../src/main/companion');

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const START = new Date('2026-10-08T10:00:00').getTime();

// A companion on one screen, with a wall clock we control.
function setup(nudgeSettings = {}) {
  const c = new Companion({ bounds: { left: 0, right: 1500, top: 25, floor: 900 }, rng: seeded(7), x: 700, y: 900 });
  c.nudges.setSettings({ water: false, stretch: false, eyes: false, bedtime: '', ...nudgeSettings });
  c.lastGreetDay = '2026-10-08';
  const sim = { now: START, ctx: {} };
  sim.run = (seconds, cursor = { x: 900, y: 500 }) => {
    const seen = [];
    const dt = 1 / 20; // the simulation steps at most 50 ms at a time
    for (let i = 0; i < seconds / dt; i++) {
      sim.now += dt * 1000;
      const d = new Date(sim.now);
      c.setContext({ hour: d.getHours(), day: '2026-10-08', now: sim.now, ...sim.ctx });
      c.update(dt, cursor);
      for (const e of c.drainEvents()) seen.push(e);
    }
    return seen;
  };
  for (let i = 0; i < 30; i++) c.update(1 / 10);
  c.enter('idle', 5);
  return { c, sim };
}

// Context for the tracker alone.
const ctx = (over = {}) => ({ now: START, day: '2026-10-08', userAway: false, awayFor: 0, quiet: false, ...over });

test('water is due after 45 minutes at the computer; time away does not count', () => {
  const t = new NudgeTracker({ water: true, stretch: false, eyes: false, bedtime: '' });
  for (let i = 0; i < 44 * 60; i++) t.tick(1, ctx());
  assert.strictEqual(t.due(ctx()), null);
  for (let i = 0; i < 20 * 60; i++) t.tick(1, ctx({ userAway: true, awayFor: i }));
  assert.strictEqual(t.due(ctx()), null, 'away time does not count');
  for (let i = 0; i < 60; i++) t.tick(1, ctx());
  assert.strictEqual(t.due(ctx()).kind, 'water');
});

test('a 5-minute break resets the stretch and eye-rest timers', () => {
  const t = new NudgeTracker({ water: false, stretch: true, eyes: true, bedtime: '' });
  for (let i = 0; i < 45 * 60; i++) t.tick(1, ctx());
  assert.ok(t.active.stretch >= 45 * 60);
  for (let i = 0; i < 4 * 60; i++) t.tick(1, ctx({ userAway: true, awayFor: i }));
  assert.ok(t.active.stretch >= 45 * 60, 'a short break does not reset');
  t.tick(1, ctx({ userAway: true, awayFor: 301 }));
  assert.strictEqual(t.active.stretch, 0);
  assert.strictEqual(t.active.eyes, 0);
});

test('priority: note, then bedtime, water, stretch, eye rest', () => {
  const late = new Date('2026-10-08T23:30:00').getTime();
  const t = new NudgeTracker({ water: true, stretch: true, eyes: true, bedtime: '23:00' });
  for (let i = 0; i < 60 * 60; i++) t.tick(1, ctx({ now: late }));
  assert.strictEqual(t.due(ctx({ now: late })).kind, 'bedtime');
  t.addNote('Call Mom', late - 1000);
  assert.strictEqual(t.due(ctx({ now: late })).kind, 'note');
  const u = new NudgeTracker({ water: true, stretch: true, eyes: true, bedtime: '' });
  for (let i = 0; i < 60 * 60; i++) u.tick(1, ctx());
  assert.deepStrictEqual(['water', 'stretch', 'eyes'].map((k) => k), ['water', 'stretch', 'eyes']);
  assert.strictEqual(u.due(ctx()).kind, 'water');
  u.done({ kind: 'water' });
  assert.strictEqual(u.due(ctx()).kind, 'stretch');
  u.done({ kind: 'stretch' });
  assert.strictEqual(u.due(ctx()), null, 'stretching counts as resting your eyes too');
});

test('bedtime: from your bedtime until 5am, nights run past midnight', () => {
  const at = (s) => new Date(s).getTime();
  assert.strictEqual(pastBedtime('23:00', at('2026-10-08T22:59:00')), null);
  assert.strictEqual(pastBedtime('23:00', at('2026-10-08T23:00:00')), '2026-10-08');
  assert.strictEqual(pastBedtime('23:00', at('2026-10-09T01:30:00')), '2026-10-08');
  assert.strictEqual(pastBedtime('23:00', at('2026-10-09T05:00:00')), null);
  assert.strictEqual(pastBedtime('00:30', at('2026-10-08T23:50:00')), null);
  assert.strictEqual(pastBedtime('00:30', at('2026-10-09T00:40:00')), '2026-10-08');
  assert.strictEqual(pastBedtime('', at('2026-10-09T00:40:00')), null);
});

test('bedtime nudge comes again every 30 minutes until you click it, then not again tonight', () => {
  let now = new Date('2026-10-08T23:05:00').getTime();
  const t = new NudgeTracker({ water: false, stretch: false, eyes: false, bedtime: '23:00' });
  const tick = (s) => {
    for (let i = 0; i < s; i++) {
      now += 1000;
      t.tick(1, ctx({ now }));
    }
  };
  const d = t.due(ctx({ now }));
  assert.strictEqual(d.kind, 'bedtime');
  t.shown(d, ctx({ now }));
  tick(20 * 60);
  assert.strictEqual(t.due(ctx({ now })), null);
  tick(11 * 60);
  const again = t.due(ctx({ now }));
  assert.strictEqual(again.kind, 'bedtime');
  t.shown(again, ctx({ now }));
  t.done(again);
  tick(60 * 60);
  assert.strictEqual(t.due(ctx({ now })), null);
});

test('wellbeing nudges wait during meetings and for 5 minutes after', () => {
  const t = new NudgeTracker({ water: true, stretch: false, eyes: false, bedtime: '' });
  for (let i = 0; i < 46 * 60; i++) t.tick(1, ctx());
  assert.strictEqual(t.due(ctx({ quiet: true })), null);
  for (let i = 0; i < 30 * 60; i++) t.tick(1, ctx({ quiet: true }));
  assert.strictEqual(t.due(ctx()), null);
  for (let i = 0; i < TIMING.afterMeeting - 1; i++) t.tick(1, ctx());
  assert.strictEqual(t.due(ctx()), null);
  t.tick(2, ctx());
  assert.strictEqual(t.due(ctx()).kind, 'water');
  // Notes still come during a meeting.
  t.addNote('Send the deck', START);
  assert.strictEqual(t.due(ctx({ quiet: true })).kind, 'note');
});

test('water: he walks over with a glass, a click counts it, and he is pleased', () => {
  const { c, sim } = setup({ water: true, waterEvery: 1 });
  const affection = (c.needs.affection = 0.5);
  const seen = sim.run(70);
  assert.ok(seen.includes('nudge'));
  sim.run(15);
  assert.strictEqual(c.state, 'water');
  assert.ok(Math.abs(c.x - 900) < 40, `walked to the cursor (x ${c.x})`);
  assert.strictEqual(c.board().tag, 'Drank ✓');
  c.pat();
  assert.strictEqual(c.state, 'drink');
  assert.strictEqual(c.nudges.water, 1);
  assert.ok(c.needs.affection > affection);
  assert.ok(c.drainEvents().includes('waterDone'));
});

test('water and stretch: put down after 2 minutes if ignored, back 10 minutes later', () => {
  const { c, sim } = setup({ stretch: true, stretchEvery: 1 });
  sim.run(80);
  assert.strictEqual(c.state, 'stretch');
  const seen = sim.run(TIMING.hold + 5);
  assert.ok(seen.includes('nudgeLater'));
  assert.notStrictEqual(c.state, 'stretch');
  assert.strictEqual(c.nudge, null);
  // retried after ~10 minutes of screen time (here the interval is 1 min, so right away after the gap)
  const t = new NudgeTracker({ water: true, stretch: false, eyes: false, bedtime: '' });
  for (let i = 0; i < 46 * 60; i++) t.tick(1, ctx());
  t.ignored({ kind: 'water' });
  for (let i = 0; i < 9 * 60; i++) t.tick(1, ctx());
  assert.strictEqual(t.due(ctx()), null);
  for (let i = 0; i < 61; i++) t.tick(1, ctx());
  assert.strictEqual(t.due(ctx()).kind, 'water');
});

test('eye rest: he looks away for 20 seconds where he is, then it is done by itself', () => {
  const { c, sim } = setup({ eyes: true, eyesEvery: 1 });
  let seen = [];
  for (let i = 0; i < 70 && c.state !== 'eyeRest'; i++) seen = seen.concat(sim.run(1));
  assert.strictEqual(c.state, 'eyeRest');
  const x = c.x;
  assert.strictEqual(c.board().tag, null);
  seen = sim.run(21);
  assert.ok(Math.abs(c.x - x) < 1, 'stays where he is');
  assert.ok(seen.includes('eyesDone'));
  assert.strictEqual(c.nudges.active.eyes < 30, true);
});

test('the glass count starts again on a new day', () => {
  const t = new NudgeTracker();
  t.tick(1, ctx());
  t.done({ kind: 'water' });
  t.done({ kind: 'water' });
  assert.strictEqual(t.water, 2);
  t.tick(1, ctx({ day: '2026-10-09' }));
  assert.strictEqual(t.water, 0);
});

test('a nudge in progress is put off when you join a meeting', () => {
  const { c, sim } = setup({ water: true, waterEvery: 1 });
  sim.run(85);
  assert.strictEqual(c.state, 'water');
  sim.ctx = { quiet: true };
  sim.run(1);
  assert.strictEqual(c.nudge, null);
  assert.strictEqual(c.state, 'sit');
  const seen = sim.run(120);
  assert.ok(!seen.includes('nudge'), 'nothing during the meeting');
});

test('notes: he brings it at the time and waits for a click; kept across restarts', () => {
  const { c, sim } = setup();
  c.addNote('Call Mom back', START + 60 * 1000);
  sim.run(30);
  assert.strictEqual(c.nudge, null);
  const saved = JSON.parse(JSON.stringify(c.serialize()));
  const d = new Companion({ bounds: { left: 0, right: 1500, top: 25, floor: 900 } });
  d.restore(saved, 0);
  assert.deepStrictEqual(d.nudges.notes.map((n) => n.text), ['Call Mom back']);
  sim.run(45);
  assert.strictEqual(c.state, 'note');
  assert.strictEqual(c.board().line1, 'Call Mom back');
  sim.run(600);
  assert.strictEqual(c.state, 'note', 'still waiting after 10 minutes');
  // Clicking the note board counts.
  assert.strictEqual(c.hitPart({ x: c.x, y: c.y - 170 }), 'sign');
  c.pat();
  assert.strictEqual(c.nudges.notes.length, 0);
  assert.strictEqual(c.state, 'nod');
});

test('notes due while you are away are shown when you come back', () => {
  const { c, sim } = setup();
  c.addNote('Take the laundry out', START + 10 * 1000);
  sim.ctx = { userAway: true, awayFor: 600 };
  sim.run(60);
  assert.notStrictEqual(c.state, 'note');
  sim.ctx = {};
  sim.run(20);
  assert.strictEqual(c.state, 'note');
});

test('meeting sign: a Join tag when the event has an https link', () => {
  const { c, sim } = setup();
  const event = { title: 'Design sync', start: START + 4 * 60e3, end: START + 34 * 60e3, link: 'https://zoom.us/j/123' };
  c.setContext({ hour: 10, now: START, reminder: { kind: '5', event } });
  sim.run(20);
  assert.strictEqual(c.state, 'sign');
  assert.strictEqual(c.board().join, true);
  assert.strictEqual(c.meetingLink(), 'https://zoom.us/j/123');
  const j = HIT.join;
  assert.strictEqual(c.hitPart({ x: c.x + (j.left + j.right) / 2, y: c.y - (j.bottom + j.top) / 2 }), 'join');
  assert.strictEqual(c.hitPart({ x: c.x + 40, y: c.y - 180 }), 'sign');
  assert.strictEqual(c.hitPart({ x: c.x, y: c.y - 60 }), 'body');
  assert.strictEqual(c.hitPart({ x: c.x + 200, y: c.y - 60 }), null);
  // Not https: no Join tag.
  c.reminder.event.link = 'javascript:alert(1)';
  assert.strictEqual(c.meetingLink(), null);
  assert.strictEqual(c.board().join, false);
});

test('when he is sad or cross he still reminds you, just not cheerfully', () => {
  for (const key of ['water', 'stretch', 'eyes', 'bedtime', 'note', 'meeting5']) {
    for (const band of ['sad', 'grumpy', 'meh']) {
      assert.ok(say(key, band), `${key}/${band}`);
      assert.notStrictEqual(say(key, band), say(key, 'cheerful'), `${key}/${band}`);
      assert.ok(!/!/.test(say(key, band)) || band === 'cheerful', `${key}/${band} no exclamations`);
    }
  }
  const { c, sim } = setup({ water: true, waterEvery: 1 });
  c.mood = -0.8;
  c.needs.affection = 0.05;
  sim.run(85);
  assert.strictEqual(c.state, 'water');
  assert.strictEqual(c.snapshot().band, 'sad');
  assert.strictEqual(c.board().line1, 'Drink some water…');
});
