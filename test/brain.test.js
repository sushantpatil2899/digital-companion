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
  for (let i = 0; i < 60 * 40; i++) {
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
