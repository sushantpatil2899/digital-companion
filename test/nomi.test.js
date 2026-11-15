'use strict';

// Phase 9, step 4: Nomi.

const test = require('node:test');
const assert = require('node:assert');
const characters = require('../src/characters');
const brain = require('../src/main/brain');
const { Companion } = require('../src/main/companion');
const { wellFormed } = require('../src/main/mind/engine');
const P = require('../src/main/mind/personality');

require('../src/main/mind/names').setNames({ user: 'Sushant', pronoun: 'he' });

const nomi = characters.get('nomi');
const BOUNDS = { left: 0, right: 1600, top: 0, floor: 900 };

function nomiCompanion(rng = () => 0.5) {
  const c = new Companion({ bounds: BOUNDS, rng, character: nomi });
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

/** Pick her up and throw her sideways at `speed` px/s. */
function throwHer(c, speed, events = []) {
  c.state = 'grabbed';
  c.y = 500; // held up in the air
  c.cursorHistory = [{ x: c.x, y: 600, t: 0 }, { x: c.x + speed * 0.05, y: 600, t: 0.05 }];
  c.release();
  return events;
}

test('Nomi is a character of her own: her personality, activities and lines', () => {
  assert.equal(nomi.name, 'Nomi');
  assert.equal(nomi.pronoun, 'she');
  const p = P.defaultPersonality(nomi);
  assert.equal(p.traits.openness.fantasy, 95);
  assert.match(p.self, /I'll just\s+stay nearby\. My humour is soft and a little whimsical\./);
  assert.deepEqual(nomi.activities.map((a) => a.id), ['stars', 'bubbles', 'rain', 'paint', 'read', 'moon', 'sky']);
  assert.equal(nomi.lines.floats.bubblePop, 'Oh!');
});

test('moon watching only at night; catching stars fixes her hunger', () => {
  const needs = { energy: 0.8, hunger: 0.2, boredom: 0.5, affection: 0.7 };
  const score = (hour) => brain.scoreActivities(needs, 0.5, { ...brain.defaultContext(), hour }, { character: nomi, rng: () => 0 }).find((s) => s.name === 'moon');
  assert.ok(score(21) && score(21).score > 0.2);
  assert.equal(score(12), undefined);
  const c = nomiCompanion();
  c.needs.hunger = 0.9;
  c.startActivity('stars');
  assert.ok(c.needs.hunger < 0.3);
});

test('making rain: mostly when sad; a pat stops it and a rainbow appears', () => {
  const needs = { energy: 0.6, hunger: 0.2, boredom: 0.3, affection: 0.3 };
  const rain = (mood) => brain.scoreActivities(needs, mood, brain.defaultContext(), { character: nomi, rng: () => 0 }).find((s) => s.name === 'rain');
  assert.ok(rain(-0.8) && rain(-0.8).score > 0.5, 'sad');
  assert.ok(!rain(0.8), 'not when happy');
  const c = nomiCompanion();
  c.startActivity('rain');
  const events = [];
  c.pat();
  events.push(...c.drainEvents());
  assert.equal(c.state, 'rainbowAfterRain');
  assert.ok(events.includes('heart'));
});

test('bubbles: 3 in 10 silly; silly ones when nobody plays with her', () => {
  assert.deepEqual(characters.activity(nomi, 'bubbles').variants.map((v) => [v.id, v.chance]), [['dreams', 0.7], ['silly', 0.3]]);
  const c = nomiCompanion(() => 0.1);
  c.game = { kind: 'fetch', step: 'offer', rounds: 0, asked: c.time, deadline: c.time + 1 };
  c.state = 'offerBall';
  c.endGame('gaveUp');
  assert.equal(c.state, 'bubbles');
  assert.equal(c.variant, 'silly');
});

test('wandering the sky: up to the top of the screen for 30–60 s, then back down', () => {
  const c = nomiCompanion(() => 0.5);
  c.startActivity('sky');
  assert.equal(c.state, 'sky');
  assert.ok(c.stateDuration >= 30 && c.stateDuration <= 60);
  run(c, 15);
  assert.ok(c.y < BOUNDS.top + 300, `up high (${Math.round(c.y)})`);
  assert.equal(c.snapshot().state, 'sky');
  run(c, c.stateDuration - c.stateTime + 0.5);
  assert.notEqual(c.state, 'sky');
  run(c, 8);
  assert.equal(c.y, BOUNDS.floor, 'floated back down');
});

test('thrown hard: carried off the screen, floats back, dizzy and stormy; never angry', () => {
  const c = nomiCompanion();
  c.x = 1400;
  const events = throwHer(c, 3000);
  for (let i = 0; i < 30 * 6 && c.state !== 'floatingBack'; i++) {
    c.update(1 / 30);
    events.push(...c.drainEvents());
  }
  assert.equal(c.state, 'floatingBack');
  assert.ok(c.x > BOUNDS.right, 'off the screen');
  run(c, 2, events);
  assert.ok(c.x > BOUNDS.right, 'out of sight for a moment');
  for (let i = 0; i < 30 * 20 && c.state === 'floatingBack'; i++) c.update(1 / 30);
  assert.equal(c.state, 'dizzy');
  assert.ok(c.x < BOUNDS.right);

  // Thrown again and again (gently, staying on screen): never angry.
  const many = [];
  for (let n = 0; n < 5; n++) {
    c.enter('idle', 5);
    c.x = 800;
    throwHer(c, 700, many);
    for (let i = 0; i < 30 * 10 && !['dizzy', 'floatingBack'].includes(c.state); i++) {
      c.update(1 / 30);
      many.push(...c.drainEvents());
    }
  }
  assert.ok(many.filter((e) => e === 'throw').length >= 5);
  assert.ok(!many.includes('angry'));
});

test('she floats down gently when dropped', () => {
  const n = nomiCompanion();
  const t = new Companion({ bounds: BOUNDS, rng: () => 0.5 });
  for (const c of [n, t]) {
    c.state = 'fall';
    c.y = 300;
    c.vx = 0;
    c.vy = 0;
    for (let i = 0; i < 30; i++) c.update(1 / 30);
  }
  assert.ok(n.y < t.y - 150, `Nomi ${Math.round(n.y)} vs Togepi ${Math.round(t.y)}`);
});

test('fetch: sometimes the bubble pops; she is surprised, then offers a new one', () => {
  const c = nomiCompanion(() => 0.05);
  c.game = { kind: 'fetch', step: 'thrown', rounds: 1, asked: c.time, deadline: Infinity };
  c.ball.state = 'resting';
  c.ball.x = 1200;
  c.ball.y = BOUNDS.floor - 14;
  c.fetchBall();
  const events = c.drainEvents();
  assert.ok(events.includes('bubblePop'));
  assert.equal(c.state, 'surprised');
  assert.equal(c.ball.state, 'away');
  run(c, 1.6);
  assert.equal(c.ball.state, 'held', 'a new bubble');
  assert.equal(c.game.step, 'offer');
});

test('after beating you at tic-tac-toe: the board, for her constellation', () => {
  const c = nomiCompanion();
  c.game = { kind: 'ttt', step: 'playing', rounds: 0, asked: c.time, deadline: Infinity, ttt: { board: ['O', 'O', 'O', 'X', 'X', null, null, null, null], me: 'O', result: { mark: 'O', line: [0, 1, 2] }, outcome: () => 'me' } };
  c.checkGameOver();
  const s = c.snapshot();
  assert.equal(s.wonGame, true);
  assert.deepEqual(s.wonBoard, { mine: [1, 1, 1, 2, 2, 0, 0, 0, 0], line: [0, 1, 2] });
});

test('requests to the models never carry half an emoji (the 400 "invalid string: surrogate" error)', () => {
  const cut = 'Mood: 😀😀'.slice(0, 7); // ends in half an emoji
  assert.ok(/[\uD800-\uDBFF]$/.test(cut));
  const body = wellFormed({ messages: [{ role: 'user', content: [{ type: 'text', text: `${cut} and more` }] }], temperature: 0.7 });
  const json = JSON.stringify(body);
  assert.doesNotMatch(json, /\\ud83d/i);
  assert.equal(body.messages[0].content[0].text, 'Mood:  and more');
  assert.equal(body.temperature, 0.7);
  assert.equal(wellFormed('fine 😀 text'), 'fine 😀 text', 'whole emoji stay');
});
