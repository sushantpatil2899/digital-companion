'use strict';

// Phase 9, step 3: Mori.

const test = require('node:test');
const assert = require('node:assert');
const characters = require('../src/characters');
const brain = require('../src/main/brain');
const { Companion } = require('../src/main/companion');
const P = require('../src/main/mind/personality');

require('../src/main/mind/names').setNames({ user: 'Sushant', pronoun: 'he' });

const mori = characters.get('mori');
const BOUNDS = { left: 0, right: 1600, top: 0, floor: 900 };

function moriCompanion(rng = () => 0.5) {
  const c = new Companion({ bounds: BOUNDS, rng, character: mori });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.enter('idle', 5);
  return c;
}

const run = (c, s, events = []) => {
  for (let i = 0; i < s * 30; i++) {
    c.update(1 / 30);
    events.push(...c.drainEvents());
  }
  return events;
};

/** Pick him up and throw him, then let him land. */
function throwHim(c, events) {
  c.state = 'grabbed';
  c.cursorHistory = [{ x: c.x, y: 300, t: 0 }, { x: c.x + 60, y: 290, t: 0.05 }];
  c.release();
  for (let i = 0; i < 30 * 4 && !c.isGrounded(); i++) {
    c.update(1 / 30);
    events.push(...c.drainEvents());
  }
  for (let i = 0; i < 30 * 4 && ['fall', 'land'].includes(c.state); i++) {
    c.update(1 / 30);
    events.push(...c.drainEvents());
  }
}

test("Mori is a character of his own: his personality, activities and lines", () => {
  assert.equal(mori.name, 'Mori');
  assert.equal(mori.pronoun, 'he');
  const p = P.defaultPersonality(mori);
  assert.equal(p.traits.neuroticism.angry_hostility, 10);
  assert.match(p.self, /a few small flowers do too\. My humour is dry and gentle\./);
  assert.deepEqual(mori.activities.map((a) => a.id), ['leaves', 'plant', 'mushrooms', 'tea', 'stones', 'fireflies']);
  assert.equal(mori.lines.signs.pleaseDont.content, "Please don't.");
  assert.equal(mori.lines.says.tttIWin.cheerful, 'Mushrooms win.');
});

test('fireflies only at night (6 pm to 5 am)', () => {
  const needs = { energy: 0.8, hunger: 0.2, boredom: 0.5, affection: 0.7 };
  const score = (hour) => brain.scoreActivities(needs, 0.5, { ...brain.defaultContext(), hour }, { character: mori, rng: () => 0 }).find((s) => s.name === 'fireflies');
  for (const hour of [18, 21, 0, 4]) assert.ok(score(hour) && score(hour).score > 0.2, `${hour}:00`);
  for (const hour of [5, 9, 12, 17]) assert.equal(score(hour), undefined, `${hour}:00`);
  assert.equal(mori.isNight(17), false);
  assert.equal(mori.isNight(18), true);
  assert.equal(mori.isNight(4), true);
});

test('tea fixes his hunger', () => {
  const c = moriCompanion();
  c.needs.hunger = 0.9;
  c.startActivity('tea');
  assert.equal(c.state, 'tea');
  assert.ok(c.needs.hunger < 0.3);
});

test('mushroom hunting: a walk of a random length, either way, then he finds them', () => {
  const lengths = new Set();
  const sides = new Set();
  for (const r of [0.05, 0.3, 0.6, 0.9]) {
    let i = 0;
    const seq = [r, r, 0.1]; // variant, distance, direction
    const c = moriCompanion(() => seq[i++ % seq.length]);
    c.x = 800;
    c.startActivity('mushrooms');
    assert.equal(c.state, 'mushrooms');
    lengths.add(Math.round(Math.abs(c.targetX - c.x)));
    sides.add(Math.sign(c.targetX - c.x));
    const ahead = c.snapshot().ahead;
    assert.ok(Math.abs(ahead) >= 140 && Math.abs(ahead) <= 420, `ahead ${ahead}`);
  }
  assert.ok(lengths.size >= 3, 'different distances');

  // Walking there: the distance shrinks, then the found state with the same variant.
  const c = moriCompanion(() => 0.1);
  c.x = 800;
  c.startActivity('mushrooms');
  assert.equal(c.variant, 'good');
  const start = Math.abs(c.snapshot().ahead);
  run(c, 1);
  assert.ok(Math.abs(c.snapshot().ahead) < start);
  for (let i = 0; i < 30 * 30 && c.state === 'mushrooms'; i++) c.update(1 / 30);
  assert.equal(c.state, 'mushroomFound');
  assert.equal(c.snapshot().variant, 'good');
  assert.equal(c.snapshot().ahead, null);
  assert.equal(c.brainSnapshot().stateLabel, 'Found some mushrooms');
});

test('he walks slowly', () => {
  const t = new Companion({ bounds: BOUNDS, rng: () => 0.5 });
  const m = moriCompanion();
  t.needs.energy = m.needs.energy = 0.8;
  assert.equal(m.speedFactor(), t.speedFactor() * 0.75);
});

test('thrown: dizzy, then he walks away; the 3rd throw in 10 minutes gets "Please don\'t." and he never gets angry', () => {
  const c = moriCompanion();
  const events = [];
  throwHim(c, events);
  assert.equal(c.state, 'dizzy');
  run(c, 3.1, events);
  assert.equal(c.state, 'walk', 'walks away');

  // Two more throws, two minutes apart: Togepi's rule (3 in a minute) wouldn't count them.
  run(c, 120, events);
  throwHim(c, events);
  assert.equal(c.state, 'dizzy');
  run(c, 120, events);
  throwHim(c, events);
  assert.equal(c.state, 'pleaseDont');
  assert.ok(events.includes('pleaseDont'));
  assert.ok(!events.includes('angry'));
  assert.equal(c.board().line1, "Please don't.");
  run(c, 4.1, events);
  assert.equal(c.state, 'walk');

  // Togepi still gets angry after 3 quick throws.
  const t = new Companion({ bounds: BOUNDS, rng: () => 0.5 });
  for (let i = 0; i < 300; i++) t.update(1 / 60);
  const te = [];
  for (let i = 0; i < 3; i++) throwHim(t, te);
  assert.ok(te.includes('angry'));
});

test('fetch: sometimes a leaf distracts him on the way, then he carries on', () => {
  const c = moriCompanion(() => 0.1);
  c.x = 400;
  c.game = { kind: 'fetch', step: 'thrown', rounds: 0, asked: c.time, deadline: Infinity };
  c.ball.state = 'resting';
  c.ball.x = 1200;
  c.ball.y = BOUNDS.floor - 14;
  c.fetchBall();
  assert.equal(c.afterMove.state, 'leafDistract');
  for (let i = 0; i < 30 * 20 && c.state !== 'leafDistract'; i++) c.update(1 / 30);
  assert.equal(c.state, 'leafDistract');
  assert.ok(Math.abs(c.x - 800) < 5, 'halfway');
  run(c, 2.6);
  assert.equal(c.afterMove && c.afterMove.state, 'pickBall', 'on to the pinecone');
  // Never twice for the same throw, and never for a short way.
  c.enter('idle', 1);
  c.fetchBall(true);
  assert.equal(c.afterMove.state, 'pickBall');
});

test('after beating you at tic-tac-toe he wears a mushroom for a while', () => {
  const c = moriCompanion();
  assert.equal(c.snapshot().wonGame, false);
  c.wonGameAt = c.time;
  assert.equal(c.snapshot().wonGame, true);
  run(c, 10.5);
  assert.equal(c.snapshot().wonGame, false);
});
