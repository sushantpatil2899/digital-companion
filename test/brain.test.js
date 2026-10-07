'use strict';

const test = require('node:test');
const assert = require('node:assert');
const brain = require('../src/main/brain');
const { Companion } = require('../src/main/companion');

const bounds = { left: 0, right: 1920, top: 0, floor: 1040 };

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const ctx = (over = {}) => ({ ...brain.defaultContext(), ...over });
const needs = (over = {}) => ({ ...brain.defaultNeeds(), ...over });

// How often (out of n tries with different randomness) each activity wins.
function winners(n, ns, c, opts = {}) {
  const rng = seeded(42);
  const count = {};
  for (let i = 0; i < n; i++) {
    const best = brain.pick(brain.scoreActivities(ns, opts.mood ?? 0.3, c, { ...opts, rng }), rng);
    count[best.name] = (count[best.name] || 0) + 1;
  }
  return count;
}

function grounded(c) {
  for (let i = 0; i < 60 * 3; i++) c.update(1 / 60);
  return c;
}

test('needs drift over time: tired when active, hungry, bored when idle, lonely', () => {
  const n = needs({ energy: 1, hunger: 0, boredom: 0, affection: 1 });
  let mood = 0;
  for (let i = 0; i < 600; i++) mood = brain.drift(n, mood, 'walk', 1, ctx());
  assert.ok(n.energy < 0.8, `energy ${n.energy}`);
  assert.ok(n.hunger > 0.1, `hunger ${n.hunger}`);
  assert.ok(n.affection < 0.95, `affection ${n.affection}`);
  const b = needs({ boredom: 0 });
  for (let i = 0; i < 300; i++) brain.drift(b, 0, 'idle', 1, ctx());
  assert.ok(b.boredom > 0.4, `boredom ${b.boredom}`);
});

test('sleeping restores energy', () => {
  const n = needs({ energy: 0.1 });
  for (let i = 0; i < 300; i++) brain.drift(n, 0, 'sleep', 1, ctx());
  assert.ok(n.energy > 0.7, `energy ${n.energy}`);
});

test('activities satisfy needs; pats raise affection and mood; throws lower mood', () => {
  const n = needs({ hunger: 0.9, boredom: 0.9, affection: 0.2 });
  let mood = 0;
  mood = brain.apply(n, mood, brain.EFFECTS.eat);
  assert.ok(n.hunger < 0.3);
  mood = brain.apply(n, mood, brain.EFFECTS.play);
  assert.ok(n.boredom < 0.6);
  const before = mood;
  mood = brain.apply(n, mood, brain.EFFECTS.pat);
  assert.ok(n.affection > 0.3 && mood > before);
  const m2 = brain.apply(n, mood, brain.EFFECTS.throw);
  assert.ok(m2 < mood);
});

test('he eats when hungry', () => {
  const w = winners(50, needs({ hunger: 0.95 }), ctx());
  assert.ok(w.eat >= 35, JSON.stringify(w));
  const notHungry = winners(50, needs({ hunger: 0.1 }), ctx());
  assert.ok(!notHungry.eat, JSON.stringify(notHungry));
});

test('he sleeps when exhausted', () => {
  const w = winners(50, needs({ energy: 0.05 }), ctx());
  assert.ok(w.sleep >= 35, JSON.stringify(w));
});

test('he plays or goes exploring when bored and rested', () => {
  const w = winners(50, needs({ boredom: 0.95, energy: 0.95 }), ctx());
  assert.ok((w.play || 0) + (w.adventure || 0) >= 30, JSON.stringify(w));
});

test('when lonely he seeks you out (or is sad if he can\'t find you)', () => {
  const w = winners(50, needs({ affection: 0.05 }), ctx(), { mood: -0.3, cursorKnown: true });
  assert.ok(w.seek >= 25, JSON.stringify(w));
  const noCursor = winners(50, needs({ affection: 0.05 }), ctx(), { mood: -0.3, cursorKnown: false });
  assert.ok(noCursor.sad >= 25, JSON.stringify(noCursor));
});

test('night makes him sleepy and calmer', () => {
  const day = winners(100, needs({ energy: 0.5 }), ctx({ hour: 14 }));
  const night = winners(100, needs({ energy: 0.5 }), ctx({ hour: 1 }));
  assert.ok((night.sleep || 0) > (day.sleep || 0) + 30, `day ${JSON.stringify(day)} night ${JSON.stringify(night)}`);
});

test('low battery makes him rest', () => {
  const ok = winners(100, needs(), ctx({ onBattery: true, batteryLevel: 0.8 }));
  const low = winners(100, needs(), ctx({ onBattery: true, batteryLevel: 0.07 }));
  const rest = (w) => (w.sleep || 0) + (w.sit || 0);
  assert.ok(rest(low) > rest(ok) + 30, `ok ${JSON.stringify(ok)} low ${JSON.stringify(low)}`);
});

test('naps while you are away', () => {
  const w = winners(50, needs(), ctx({ userAway: true, awayFor: 600 }));
  assert.ok(w.sleep >= 40, JSON.stringify(w));
});

test('keeps still and quiet during a meeting, and when staying put', () => {
  const quiet = winners(100, needs({ boredom: 1, energy: 1 }), ctx({ quiet: true }));
  for (const name of Object.keys(quiet)) assert.ok(brain.QUIET.includes(name), `quiet: ${name}`);
  const stay = winners(100, needs({ boredom: 1, energy: 1, affection: 0 }), ctx(), { paused: true, cursorKnown: true });
  for (const name of Object.keys(stay)) assert.ok(brain.STAY.includes(name), `stay put: ${name}`);
});

test('catch-up after time away: rested, hungrier, missing you', () => {
  const n = needs({ energy: 0.2, hunger: 0.2, affection: 0.9 });
  brain.catchUp(n, 0, 8 * 3600);
  assert.ok(n.energy > 0.95);
  assert.ok(n.hunger > 0.5);
  assert.ok(n.affection < 0.5);
  const same = needs();
  brain.catchUp(same, 0, 0);
  assert.deepStrictEqual(same, needs());
});

test('companion: memory survives a save/restore round trip', () => {
  const a = grounded(new Companion({ bounds, rng: seeded() }));
  a.needs = { energy: 0.3, hunger: 0.6, boredom: 0.2, affection: 0.5 };
  a.mood = -0.2;
  const saved = JSON.parse(JSON.stringify(a.serialize()));
  const b = new Companion({ bounds, rng: seeded() });
  assert.ok(b.restore(saved, 0));
  assert.deepStrictEqual(b.needs, a.needs);
  assert.strictEqual(b.mood, a.mood);
  // Junk is ignored.
  assert.ok(!new Companion({ bounds }).restore({ v: 99 }));
  assert.ok(!new Companion({ bounds }).restore(null));
});

test('companion: hungry Togepi eats on his own', () => {
  const c = grounded(new Companion({ bounds, rng: seeded(5) }));
  c.needs.hunger = 0.95;
  let ate = false;
  for (let i = 0; i < 60 * 60 && !ate; i++) {
    c.update(1 / 60);
    ate = c.state === 'eat';
  }
  assert.ok(ate);
  assert.ok(c.needs.hunger < 0.5);
});

test('companion: lonely Togepi walks over to your cursor', () => {
  const c = grounded(new Companion({ bounds, x: 300, rng: seeded(2) }));
  c.needs.affection = 0.02;
  c.mood = -0.4;
  const cursor = { x: 1500, y: 500 };
  let closest = Infinity;
  for (let i = 0; i < 60 * 120; i++) {
    c.update(1 / 60, cursor);
    closest = Math.min(closest, Math.abs(c.x - 1500));
  }
  assert.ok(closest < 40, `closest ${closest}`);
});

test('companion: wakes and greets you when you come back', () => {
  const c = grounded(new Companion({ bounds, x: 400, rng: seeded() }));
  c.setContext({ userAway: true, awayFor: 900, hour: 14, day: '2026-10-06' });
  c.startActivity('sleep');
  for (let i = 0; i < 60 * 30; i++) c.update(1 / 60);
  assert.strictEqual(c.state, 'sleep', 'keeps sleeping while you are away');
  c.update(1 / 60, { x: 1400, y: 600 });
  c.setContext({ userAway: false, justReturned: true, hour: 14, day: '2026-10-06' });
  const events = [];
  let closest = Infinity;
  for (let i = 0; i < 60 * 12; i++) {
    c.update(1 / 60, { x: 1400, y: 600 });
    events.push(...c.drainEvents());
    closest = Math.min(closest, Math.abs(c.x - 1400));
  }
  assert.ok(events.includes('welcomeBack'), events.join(','));
  assert.ok(events.includes('wave'), events.join(','));
  assert.ok(closest < 40, `ran over to you: closest ${closest}`);
});

test('companion: says good morning the first time he sees you on a new day', () => {
  const c = grounded(new Companion({ bounds, rng: seeded() }));
  c.setContext({ hour: 9, day: '2026-10-06' });
  c.drainEvents();
  c.setContext({ hour: 8, day: '2026-10-07' });
  const events = [];
  for (let i = 0; i < 60; i++) {
    c.update(1 / 60);
    events.push(...c.drainEvents());
  }
  assert.ok(events.includes('goodMorning'), events.join(','));
});

test('companion: plugging in perks him up; low battery slows him down', () => {
  const c = grounded(new Companion({ bounds, rng: seeded() }));
  c.needs.energy = 0.4;
  c.setContext({ onBattery: false, batteryLevel: 0.15, charging: true, justPluggedIn: true });
  c.update(1 / 60);
  assert.ok(c.drainEvents().includes('charging'));
  assert.ok(c.needs.energy > 0.5);
  c.setContext({ onBattery: true, batteryLevel: 0.1, charging: false });
  assert.ok(c.speedFactor() < 1);
});

test('companion: brain snapshot has needs, context and reasons', () => {
  const c = grounded(new Companion({ bounds, rng: seeded() }));
  c.chooseNext();
  const b = c.brainSnapshot();
  assert.ok(b.needs.energy >= 0 && b.needs.energy <= 1);
  assert.ok(b.scores.length > 0 && typeof b.scores[0].why === 'string');
  assert.strictEqual(typeof b.context.hour, 'number');
});

test('companion: if you keep ignoring him he asks less and less often', () => {
  const c = grounded(new Companion({ bounds, x: 300, rng: seeded(4) }));
  c.needs.affection = 0.02;
  const asks = [];
  const cursor = { x: 1200, y: 500 };
  for (let i = 0; i < 20 * 60 * 40; i++) {
    c.needs.affection = 0.02; // stays lonely: you never pat him
    c.update(1 / 20, cursor);
    if (c.drainEvents().includes('lonely')) asks.push(c.time);
  }
  assert.ok(asks.length >= 3 && asks.length <= 6, `asked ${asks.length} times in 40 min`);
  const gaps = asks.slice(1).map((t, i) => t - asks[i]);
  for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i] > gaps[i - 1], `gaps grow: ${gaps.map(Math.round)}`);
  // A pat resets it.
  c.pat();
  assert.strictEqual(c.ignoredAsks, 0);
});

function meetingSetup(minutesAhead) {
  const { ContextTracker } = require('../src/main/context');
  const k = { t: new Date('2026-10-06T10:00:00').getTime() };
  const tracker = new ContextTracker({ now: () => k.t });
  const c = grounded(new Companion({ bounds, x: 500, rng: seeded(3) }));
  const start = k.t + minutesAhead * 60 * 1000;
  tracker.setEvents([{ title: 'Standup', start, end: start + 10 * 60 * 1000 }]);
  const states = new Set();
  const step = (seconds, cursor = { x: 900, y: 500 }) => {
    const events = [];
    for (let i = 0; i < seconds * 20; i++) {
      k.t += 50;
      if (i % 40 === 0) c.setContext(tracker.update(0));
      c.update(1 / 20, cursor);
      events.push(...c.drainEvents());
      states.add(c.state);
    }
    return events;
  };
  return { c, k, tracker, step, states };
}

test('reminder: the sign stays up until you click it, then he says "Got it!"', () => {
  const { c, step } = meetingSetup(4);
  const ev = step(10);
  assert.ok(ev.includes('reminder'), ev.join(','));
  step(120); // two minutes later he's still holding it
  assert.strictEqual(c.state, 'sign');
  assert.strictEqual(c.snapshot().reminderKind, '5');
  assert.strictEqual(c.snapshot().eventTitle, 'Standup');
  c.pat();
  assert.ok(c.drainEvents().includes('reminderAck'));
  assert.strictEqual(c.state, 'wave');
  step(30);
  assert.notStrictEqual(c.state, 'sign');
});

test('reminder: clicking the sign itself counts as being on him', () => {
  const { c, step } = meetingSetup(4);
  step(15);
  assert.strictEqual(c.state, 'sign');
  assert.ok(c.isOver({ x: c.x + 40, y: c.y - 180 }), 'sign board');
  assert.ok(!c.isOver({ x: c.x + 40, y: c.y - 240 }), 'above the sign');
});

test('reminder: 30 min, then 5 min, then "now" if you never click; dropped after the meeting', () => {
  const { c, step } = meetingSetup(31);
  step(90);
  assert.strictEqual(c.snapshot().reminderKind, '30');
  c.pat(); // seen the 30-minute one
  step(26 * 60);
  assert.strictEqual(c.snapshot().reminderKind, '5', 'a new reminder at 5 minutes');
  assert.strictEqual(c.state, 'sign');
  step(6 * 60); // meeting has started, still not clicked
  assert.strictEqual(c.snapshot().reminderKind, 'now');
  assert.strictEqual(c.state, 'sign');
  step(10 * 60); // meeting over
  assert.strictEqual(c.reminder, null);
  assert.notStrictEqual(c.state, 'sign');
});

test('reminder: if you were away it waits, and shows up when you come back', () => {
  const { c, tracker, step } = meetingSetup(4);
  tracker.setLocked(true);
  step(30);
  assert.notStrictEqual(c.state, 'sign');
  tracker.setLocked(false);
  const ev = step(15);
  assert.ok(ev.includes('reminder'), ev.join(','));
  assert.ok(c.state === 'sign' || c.state === 'run', c.state);
});

test('mood: left alone for an hour he ends up meh or sad, not cheerful; pats bring him back', () => {
  const c = grounded(new Companion({ bounds, rng: seeded(8) }));
  for (let i = 0; i < 20 * 3600; i++) c.update(1 / 20);
  assert.ok(['meh', 'sad'].includes(c.moodBand()), `${c.moodBand()} (${c.mood.toFixed(2)}) needs ${JSON.stringify(c.needs)}`);
  for (let i = 0; i < 5; i++) {
    c.enter('idle', 10);
    c.pat();
  }
  for (let i = 0; i < 20 * 600; i++) c.update(1 / 20);
  assert.ok(['content', 'cheerful'].includes(c.moodBand()), `${c.moodBand()} (${c.mood.toFixed(2)})`);
});

test('mood: his own activities don\'t lift his mood directly', () => {
  for (const name of ['eat', 'play', 'adventure', 'flower', 'talk', 'jump', 'run']) {
    assert.ok(!brain.EFFECTS[name].mood, name);
  }
});

test('mood: throwing him around makes him grumpy for a few minutes', () => {
  const c = grounded(new Companion({ bounds, rng: seeded() }));
  c.grab({ x: c.x, y: c.y - 50 });
  for (let i = 0; i < 6; i++) {
    c.update(1 / 60);
    c.drag({ x: 900 + i * 60, y: 600 - i * 40 });
  }
  c.release();
  c.grab({ x: c.x, y: c.y - 50 });
  for (let i = 0; i < 6; i++) {
    c.update(1 / 60);
    c.drag({ x: 300 + i * 60, y: 600 - i * 40 });
  }
  c.release();
  assert.strictEqual(c.moodBand(), 'grumpy');
  for (let i = 0; i < 60 * 300; i++) c.update(1 / 60);
  assert.notStrictEqual(c.moodBand(), 'grumpy');
});

test('mood bands', () => {
  assert.strictEqual(brain.moodBand(0.6), 'cheerful');
  assert.strictEqual(brain.moodBand(0.3), 'content');
  assert.strictEqual(brain.moodBand(0), 'meh');
  assert.strictEqual(brain.moodBand(-0.5), 'sad');
  assert.strictEqual(brain.moodBand(0.6, 0.5), 'grumpy');
});

test('a sad Togepi doesn\'t run, jump or go on adventures', () => {
  const w = winners(200, needs({ boredom: 0.7, energy: 0.9, affection: 0.1 }), ctx(), { mood: -0.6, cursorKnown: false });
  for (const n of ['run', 'jump', 'adventure']) assert.ok(!w[n], `${n}: ${JSON.stringify(w)}`);
});

test('pacing: he settles into things instead of switching every few seconds', () => {
  const c = grounded(new Companion({ bounds, rng: seeded(12) }));
  let decisions = 0;
  const orig = c.chooseNext.bind(c);
  c.chooseNext = () => {
    decisions += 1;
    orig();
  };
  const minutes = 30;
  for (let i = 0; i < 20 * 60 * minutes; i++) c.update(1 / 20, { x: 800, y: 500 });
  const avg = (minutes * 60) / decisions;
  assert.ok(avg >= 10, `a decision every ${avg.toFixed(1)} s`);
});
