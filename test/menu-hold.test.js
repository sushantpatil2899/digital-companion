'use strict';

// Right-click menu: while it's open he stands still in his standing pose,
// whatever he was doing (fetching, his own activities, wandering), and
// carries on afterwards. Asleep, in the air or holding something up for you,
// he keeps that pose.

const test = require('node:test');
const assert = require('node:assert');
const characters = require('../src/characters');
const { Companion } = require('../src/main/companion');

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

function runUntil(c, seconds, done, cursor) {
  for (let i = 0; i < seconds * 60; i++) {
    c.update(1 / 60, cursor);
    if (done()) return true;
  }
  return false;
}

function settled(character = characters.get('togepi'), seed = 5) {
  const c = new Companion({ bounds, rng: seeded(seed), x: 800, character });
  const d = new Date();
  d.setHours(14, 0, 0, 0);
  c.setContext({ hour: 14, now: d.getTime() });
  run(c, 3);
  c.enter('idle', 1000);
  c.drainEvents();
  return c;
}

/** What the renderer is told to draw, and where he is. */
const shown = (c) => ({ state: c.snapshot().state, vx: c.snapshot().vx, variant: c.snapshot().variant, ahead: c.snapshot().ahead, x: Math.round(c.x), y: Math.round(c.y) });

test('fetch: running after the ball, a right-click makes him stand still, then he runs on and fetches it', () => {
  const c = settled();
  const cursor = { x: 800, y: 700 };
  assert.ok(c.startGame('fetch', true));
  run(c, 3, cursor);
  const at = { x: c.ball.x, y: c.ball.y };
  assert.ok(c.grabBall(at));
  for (let i = 1; i <= 6; i++) {
    c.dragBall({ x: at.x + i * 25, y: at.y - i * 10 });
    c.update(1 / 60, cursor);
  }
  c.releaseBall();
  assert.ok(runUntil(c, 30, () => c.ball.state === 'resting', cursor));
  // He sets off after it.
  assert.ok(runUntil(c, 10, () => ['run', 'walk'].includes(c.state) && Math.abs(c.vx) > 0, cursor), `state ${c.state}`);
  const before = c.state;

  c.holdForMenu(true);
  const held = shown(c);
  assert.equal(held.state, 'idle', 'standing pose, not the running one');
  assert.equal(held.vx, 0);
  run(c, 3, cursor);
  assert.deepEqual(shown(c), { ...held, x: held.x, y: held.y }, 'stays exactly where and how he was');
  assert.equal(c.state, before, 'the chase is only paused');

  c.holdForMenu(false);
  assert.equal(c.snapshot().state, before, 'back to running as soon as the menu closes');
  assert.ok(runUntil(c, 30, () => c.ball.state === 'held', cursor), `still ${c.state}`);
});

for (const id of ['togepi', 'pip', 'mori', 'nomi', 'tonk', 'wolfie']) {
  test(`${id}: each of his own activities shows his standing pose while the menu is open, then goes on`, () => {
    const character = characters.get(id);
    let tested = 0;
    for (const a of character.activities) {
      const c = settled(character, 11);
      c.startActivity(a.id);
      run(c, 0.6);
      assert.equal(c.state, a.id, `${id} ${a.id}: started`);
      tested++;
      c.holdForMenu(true);
      const held = shown(c);
      assert.equal(held.state, 'idle', `${id} ${a.id}: standing pose`);
      assert.equal(held.variant, null, `${id} ${a.id}: no activity variant drawn`);
      assert.equal(held.ahead, null, `${id} ${a.id}: not walking`);
      run(c, 2);
      const after = shown(c);
      assert.equal(after.x, held.x, `${id} ${a.id}: doesn't move sideways`);
      assert.equal(after.y, held.y, `${id} ${a.id}: doesn't move up or down`);
      assert.equal(after.state, 'idle', `${id} ${a.id}: still standing`);
      c.holdForMenu(false);
      assert.equal(c.snapshot().state, a.id, `${id} ${a.id}: carries on after the menu`);
    }
    assert.equal(tested, character.activities.length);
  });
}

test('wandering: he stops and stands; sitting or watching your screen: he stands up for the menu', () => {
  const c = settled();
  c.walkTo(1700, 'walk');
  run(c, 0.4);
  c.holdForMenu(true);
  assert.equal(c.snapshot().state, 'idle');
  c.holdForMenu(false);

  const d = settled();
  d.enter('backView', 20);
  d.holdForMenu(true);
  assert.equal(d.snapshot().state, 'idle');
  d.holdForMenu(false);
  assert.equal(d.snapshot().state, 'backView');
});

test('asleep, in the air or holding something up for you, he keeps that pose', () => {
  const asleep = settled();
  asleep.enter('sleep', 30);
  asleep.holdForMenu(true);
  assert.equal(asleep.snapshot().state, 'sleep');

  const sign = settled();
  assert.ok(sign.startGame('fetch', true));
  run(sign, 3, { x: 800, y: 700 });
  assert.equal(sign.state, 'offerBall');
  sign.holdForMenu(true);
  assert.equal(sign.snapshot().state, 'offerBall', 'still holding out the ball');

  const air = settled();
  air.enter('jump', 1);
  air.holdForMenu(true);
  assert.equal(air.snapshot().state, 'jump');
});

test('a menu that never says it closed lets him go after a minute', () => {
  const c = settled();
  c.walkTo(1700, 'walk', { state: 'sit', duration: 5 });
  c.route = [{}];
  run(c, 0.3);
  c.holdForMenu(true);
  run(c, 61);
  c.route = null;
  assert.equal(c.menuHeld, false);
  assert.notEqual(c.snapshot().state, 'idle');
});
