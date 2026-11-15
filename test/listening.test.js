'use strict';

// Talk to me comes before whatever he's doing (Sushant, 2026-10-25): he
// stops, stands and listens with a 👂 bubble; what he was showing waits
// underneath and comes back afterwards.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { Companion } = require('../src/main/companion');

const bounds = { left: 0, right: 1920, top: 0, floor: 1040 };
const cursor = { x: 800, y: 700 };

function settled() {
  const c = new Companion({ bounds, rng: () => 0.5 });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.enter('idle', 10);
  return c;
}

function run(c, seconds) {
  for (let t = 0; t < seconds; t += 1 / 60) c.update(1 / 60, cursor);
}

const at = (c, sx, sy) => ({ x: c.x + sx, y: c.y - sy });

test('while he asks a question: the 👂 shows, the question waits, and a spoken answer still picks it', () => {
  const c = settled();
  c.ask('Tea or coffee?', ['🍵 Tea', '☕ Coffee']);
  const until = c.speech.until;
  c.listening(true);
  let s = c.snapshot();
  assert.equal(s.speech, '👂');
  assert.equal(s.answers, null);
  run(c, 10);
  assert.ok(c.speech.until >= until + 9, 'the question’s 30 s wait pauses while he listens');
  c.listening(true, '…');
  assert.equal(c.snapshot().speech, '…');
  c.listening(false);
  s = c.snapshot();
  assert.equal(s.speech, 'Tea or coffee?');
  assert.deepEqual(s.answers, ['🍵 Tea', '☕ Coffee']);
  assert.equal(c.answerQuestion(1), '☕ Coffee');
});

test('while he says something, he stops talking to listen', () => {
  const c = settled();
  c.say('Look at that cloud!');
  c.listening(true);
  assert.equal(c.snapshot().speech, '👂');
  c.listening(false);
  assert.equal(c.snapshot().speech, null);
});

test('a game invite he holds up is hidden while he listens and comes back after', () => {
  const c = settled();
  assert.ok(c.startGame('ttt'));
  run(c, 2);
  assert.equal(c.state, 'offerGame');
  assert.ok(c.snapshot().board);
  c.listening(true);
  const s = c.snapshot();
  assert.equal(s.board, null);
  assert.equal(s.speech, '👂');
  assert.equal(s.state, 'idle', 'his standing pose');
  run(c, 5);
  assert.equal(c.state, 'offerGame', 'still inviting underneath');
  // The hidden invite can't be clicked; his body still can.
  assert.notEqual(c.hitPart(at(c, 0, 170)), 'sign');
  assert.equal(c.hitPart(at(c, 0, 60)), 'body');
  c.listening(false);
  assert.ok(c.snapshot().board, 'back after');
  assert.ok(c.showingGameInvite(), 'so “let’s play” can still accept it');
});

test('busy with an activity or asleep: he stands and listens, then carries on', () => {
  for (const activity of ['sleep', 'wave']) {
    const c = settled();
    c.doActivity(activity);
    const state = c.state;
    const left = c.stateDuration - c.stateTime;
    c.listening(true);
    run(c, 3);
    const s = c.snapshot();
    assert.equal(s.state, 'idle', `${activity}: standing`);
    assert.equal(s.vx, 0);
    assert.equal(c.state, state, `${activity}: still ${state} underneath`);
    assert.ok(Math.abs(c.stateDuration - c.stateTime - left) < 0.1, `${activity}: its time waits`);
    c.listening(false);
    assert.equal(c.snapshot().state, state);
  }
});

test('walking around, he stops where he is', () => {
  const c = settled();
  c.enter('walk', 5);
  c.vx = 80;
  c.listening(true);
  const x = c.x;
  run(c, 2);
  assert.equal(c.x, x);
});

test('main: not in meetings; nothing else stops him listening; his 👂 bubble is not a pat', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'main.js'), 'utf8');
  const cant = main.slice(main.indexOf('function cantListen'), main.indexOf('async function startListening'));
  assert.match(cant, /companion\.context\.quiet\) return 'you’re in a meeting'/);
  assert.doesNotMatch(cant, /asking|board|game|nudge|speaking/);
  assert.match(main, /if \(part === 'listening'\) \{/);
});

test('a spoken reminder’s 📝 waits until he puts down what he’s holding up', () => {
  const c = settled();
  assert.ok(c.startGame('ttt'));
  run(c, 2);
  assert.ok(c.snapshot().board, 'holding up a game invite');
  assert.equal(c.sayLater('📝 17:00', 'happy'), false);
  run(c, 1);
  assert.equal(c.snapshot().speech, null, 'not over his invite');
  c.endGame('cancel');
  run(c, 1);
  assert.equal(c.snapshot().board, null);
  assert.equal(c.snapshot().speech, '📝 17:00');
  // Free right away: he says it at once.
  const d = settled();
  assert.equal(d.sayLater('📝 9:30'), true);
  assert.equal(d.snapshot().speech, '📝 9:30');
  // Too late (after maxWait): dropped.
  const e = settled();
  e.startGame('ttt');
  run(e, 2);
  e.sayLater('📝 8:00', 'none', 1);
  run(e, 2);
  e.endGame('cancel');
  run(e, 1);
  assert.equal(e.snapshot().speech, null);
  const main = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'main.js'), 'utf8');
  assert.match(main, /c\.sayLater\(`📝 /);
});
