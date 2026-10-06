'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Companion, MENU_ACTIVITIES } = require('../src/main/companion');

const bounds = { left: 0, right: 1920, top: 0, floor: 1040 };

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function run(c, seconds, cursor) {
  for (let i = 0; i < seconds * 60; i++) c.update(1 / 60, cursor);
}

test('falls onto the floor and lands', () => {
  const c = new Companion({ bounds, y: 500, rng: seeded() });
  run(c, 2);
  assert.strictEqual(c.y, bounds.floor);
  assert.ok(c.isGrounded(), `expected grounded, got ${c.state}`);
});

test('wanders around on his own and stays on screen', () => {
  const c = new Companion({ bounds, rng: seeded(7) });
  const seen = new Set();
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < 60 * 300; i++) {
    c.update(1 / 60);
    seen.add(c.state);
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x);
  }
  assert.ok(seen.has('walk'), 'should walk');
  assert.ok(seen.has('idle') || seen.has('sit'), 'should rest sometimes');
  assert.ok(maxX - minX > 200, 'should cover some ground');
  assert.ok(minX >= bounds.left + c.halfWidth && maxX <= bounds.right - c.halfWidth);
});

test('gets sleepy when left alone', () => {
  const c = new Companion({ bounds, rng: seeded(3) });
  let slept = false;
  for (let i = 0; i < 60 * 600 && !slept; i++) {
    c.update(1 / 60);
    slept = c.state === 'sleep';
  }
  assert.ok(slept);
});

test('can be picked up, carried and dropped', () => {
  const c = new Companion({ bounds, rng: seeded() });
  run(c, 1);
  c.grab({ x: c.x, y: c.y - 50 });
  assert.strictEqual(c.state, 'grabbed');
  c.update(1 / 60);
  c.drag({ x: 400, y: 300 });
  assert.strictEqual(c.x, 400);
  assert.strictEqual(c.y, 350);
  run(c, 0.5);
  c.release();
  assert.strictEqual(c.state, 'fall');
  run(c, 3);
  assert.strictEqual(c.y, bounds.floor);
  assert.ok(c.isGrounded());
});

test('a hard throw bounces off walls and leaves him confused', () => {
  const c = new Companion({ bounds, rng: seeded() });
  run(c, 1);
  c.grab({ x: c.x, y: c.y - 50 });
  // Fling him up and to the right fast.
  for (let i = 0; i < 6; i++) {
    c.update(1 / 60);
    c.drag({ x: 1500 + i * 60, y: 600 - i * 40 });
  }
  c.release();
  assert.ok(c.vx > 1000);
  const events = [];
  for (let i = 0; i < 60 * 5; i++) {
    c.update(1 / 60);
    events.push(...c.drainEvents());
  }
  assert.ok(events.includes('throw'));
  assert.ok(events.includes('bonk'), `events: ${events}`);
  assert.ok(events.includes('confused'), `events: ${events}`);
  assert.ok(c.x <= bounds.right - c.halfWidth);
});

test('holding the mouse on him gives him a hug, with hearts', () => {
  const c = new Companion({ bounds, rng: seeded() });
  run(c, 1);
  const events = [];
  for (let i = 0; i < 60; i++) {
    c.pet(1 / 60);
    c.update(1 / 60);
    events.push(...c.drainEvents());
  }
  assert.strictEqual(c.state, 'hug');
  assert.ok(events.filter((e) => e === 'heart').length >= 2);
  assert.ok(c.happiness > 0.5);
});

test('a click pats him (heart), a click while asleep wakes him', () => {
  const c = new Companion({ bounds, rng: seeded() });
  run(c, 1);
  c.enter('idle', 5);
  c.drainEvents();
  c.pat();
  assert.strictEqual(c.state, 'happy');
  assert.deepStrictEqual(c.drainEvents(), ['heart']);
  run(c, 2);
  c.enter('sleep', 30);
  c.pat();
  assert.strictEqual(c.state, 'surprised');
});

test('nothing makes him happy unless you interact', () => {
  const c = new Companion({ bounds, rng: seeded(5) });
  for (let i = 0; i < 60 * 120; i++) {
    c.update(1 / 60, { x: c.x, y: c.y - 40 }); // cursor hovering right on him
    assert.ok(!c.drainEvents().includes('heart'));
  }
});

test('"come here" makes him run to the cursor along the floor', () => {
  const c = new Companion({ bounds, rng: seeded() });
  run(c, 1);
  c.enter('idle', 30);
  c.comeTo(300);
  assert.strictEqual(c.state, 'run');
  for (let i = 0; i < 60 * 15 && c.state === 'run'; i++) c.update(1 / 60);
  assert.strictEqual(c.x, 300);
  assert.strictEqual(c.y, bounds.floor);
});

test('stays put when paused', () => {
  const c = new Companion({ bounds, rng: seeded(11) });
  c.paused = true;
  run(c, 1);
  const x = c.x;
  run(c, 120);
  assert.strictEqual(c.x, x);
});

function hardThrow(c) {
  c.grab({ x: c.x, y: c.y - 50 });
  for (let i = 0; i < 6; i++) {
    c.update(1 / 60);
    c.drag({ x: 900 + i * 60, y: 600 - i * 40 });
  }
  c.release();
  for (let i = 0; i < 60 * 4 && !c.isGrounded(); i++) c.update(1 / 60);
}

test('waves hello after dropping in at startup', () => {
  const c = new Companion({ bounds, y: 600, rng: seeded() });
  const events = [];
  for (let i = 0; i < 60 * 2; i++) {
    c.update(1 / 60);
    events.push(...c.drainEvents());
  }
  assert.ok(events.includes('wave'), `events: ${events}`);
});

test('three hard throws within a minute make him angry, then he stomps off', () => {
  const c = new Companion({ bounds, rng: seeded() });
  run(c, 2);
  hardThrow(c);
  assert.notStrictEqual(c.state, 'angry');
  run(c, 3);
  hardThrow(c);
  run(c, 3);
  hardThrow(c);
  assert.strictEqual(c.state, 'angry');
  run(c, 3);
  assert.strictEqual(c.state, 'walk');
  assert.ok(c.snapshot().grumpy);
  // A pat makes up for it.
  c.pat();
  assert.strictEqual(c.state, 'happy');
  assert.ok(!c.snapshot().grumpy);
});

test('gets sad when ignored for a long time; a pat cheers him up', () => {
  const c = new Companion({ bounds, rng: seeded(9) });
  let sad = false;
  for (let i = 0; i < 60 * 1200 && !sad; i++) {
    c.update(1 / 60);
    sad = c.state === 'sad';
  }
  assert.ok(sad);
  assert.ok(c.time > 300);
  c.pat();
  assert.strictEqual(c.state, 'happy');
});

test('cursor lingering near him makes him curious, resting on him makes him shy (no hearts)', () => {
  const c = new Companion({ bounds, rng: seeded() });
  run(c, 4);
  c.enter('idle', 30);
  const events = [];
  for (let i = 0; i < 60 * 2; i++) {
    c.update(1 / 60, { x: c.x + 110, y: c.y - 48 });
    events.push(...c.drainEvents());
  }
  assert.strictEqual(c.state, 'curious');
  c.enter('idle', 30);
  for (let i = 0; i < 60 * 3; i++) {
    c.update(1 / 60, { x: c.x, y: c.y - 48 });
    events.push(...c.drainEvents());
  }
  assert.strictEqual(c.state, 'shy');
  assert.ok(!events.includes('heart'));
});

test('waves when the cursor comes back after being away', () => {
  const c = new Companion({ bounds, rng: seeded() });
  run(c, 4);
  c.paused = true;
  for (let i = 0; i < 60 * 35; i++) c.update(1 / 60, { x: c.x + 900, y: 100 });
  if (!['idle', 'sit', 'lookAround', 'talk', 'backView'].includes(c.state)) c.enter('idle', 5);
  c.update(1 / 60, { x: c.x + 200, y: c.y - 40 });
  assert.strictEqual(c.state, 'wave');
});

test('every menu activity can be started', () => {
  for (const name of MENU_ACTIVITIES) {
    const c = new Companion({ bounds, rng: seeded() });
    run(c, 3);
    assert.ok(c.doActivity(name), name);
    const expected = { jump: 'jump' }[name] || name;
    assert.strictEqual(c.state, expected, name);
    run(c, 1);
  }
});

test('adventures and play move him across the screen', () => {
  const c = new Companion({ bounds, x: 300, rng: seeded() });
  run(c, 3);
  c.doActivity('adventure');
  const start = c.x;
  for (let i = 0; i < 60 * 30 && c.state === 'adventure'; i++) c.update(1 / 60);
  assert.ok(Math.abs(c.x - start) > (bounds.right - bounds.left) * 0.4);
});
