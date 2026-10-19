'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Companion, GAME } = require('../src/main/companion');
const { Ball, BALL } = require('../src/main/games/fetch');
const { TicTacToe, winner, bestMoves, chooseMove } = require('../src/main/games/tictactoe');
const screens = require('../src/main/screens');
const brain = require('../src/main/brain');

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

function settled(opts = {}) {
  const c = new Companion({ bounds, rng: seeded(opts.seed || 5), x: opts.x || 800 });
  c.setContext({ hour: 14, now: Date.now() });
  run(c, 3);
  c.enter('idle', 1000);
  return c;
}

// ---------------------------------------------------------------- tic-tac-toe

test('tic-tac-toe: rows, columns and diagonals win; a full board is a draw', () => {
  assert.deepStrictEqual(winner(['X', 'X', 'X', null, 'O', 'O', null, null, null]), { mark: 'X', line: [0, 1, 2] });
  assert.strictEqual(winner(['O', 'X', null, 'O', 'X', null, 'O', null, null]).mark, 'O');
  assert.strictEqual(winner(['X', 'O', null, null, 'X', 'O', null, null, 'X']).mark, 'X');
  assert.strictEqual(winner(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']).mark, 'draw');
  assert.strictEqual(winner(Array(9).fill(null)), null);
});

test('tic-tac-toe: his best move wins when he can, and blocks you otherwise', () => {
  // He's O and can win on square 5.
  assert.deepStrictEqual(bestMoves(['X', 'X', null, 'O', 'O', null, 'X', null, null], 'O'), [5]);
  // You (X) threaten 0-1-2: he blocks on 2.
  assert.deepStrictEqual(bestMoves(['X', 'X', null, null, 'O', null, null, null, null], 'O'), [2]);
});

test('tic-tac-toe: he never misses a win or a block', () => {
  const rng = seeded(11);
  for (let i = 0; i < 200; i++) {
    // You (X) threaten 0-1-2: he always blocks on 2.
    assert.strictEqual(chooseMove(['X', 'X', null, null, 'O', null, null, null, null], 'O', rng), 2);
    // He can win on 5 (and you threaten 6-7-8): winning comes first.
    assert.strictEqual(chooseMove(['X', null, null, 'O', 'O', null, 'X', 'X', null], 'O', rng), 5);
  }
});

test('tic-tac-toe: he can still slip up on a tricky move, so he can be beaten', () => {
  // You took a corner: the only safe answer is the centre. Mostly he finds it.
  const board = ['X', null, null, null, null, null, null, null, null];
  const moves = [];
  const rng = seeded(11);
  for (let i = 0; i < 300; i++) moves.push(chooseMove(board, 'O', rng));
  const centre = moves.filter((m) => m === 4).length;
  assert.ok(centre > 210, `centre ${centre}/300`);
  assert.ok(centre < 300, 'but not always');
});

test('tic-tac-toe: turns alternate and moves on taken squares are refused', () => {
  const t = new TicTacToe(true);
  assert.strictEqual(t.you, 'X');
  assert.ok(t.yourTurn);
  assert.ok(t.play(4, 'X'));
  assert.ok(!t.play(4, 'O'), 'taken');
  assert.ok(!t.play(0, 'X'), 'not your turn');
  assert.ok(t.myTurn);
});

// ---------------------------------------------------------------- the ball

test('a thrown ball bounces, rolls and comes to rest on the floor', () => {
  const b = new Ball();
  const ss = [{ index: 0, ...bounds, b: { left: 0, right: 1920, top: 0, bottom: 1040 } }];
  b.grab({ x: 500, y: 600 }, 0);
  b.drag({ x: 520, y: 590 }, 0.05);
  b.drag({ x: 540, y: 580 }, 0.1);
  b.release();
  assert.strictEqual(b.state, 'flying');
  let bounced = false;
  for (let i = 0; i < 60 * 20 && b.state === 'flying'; i++) {
    b.update(1 / 60, ss);
    if (b.drainEvents().includes('ballBounce')) bounced = true;
  }
  assert.strictEqual(b.state, 'resting');
  assert.ok(bounced);
  assert.strictEqual(b.y, bounds.floor - BALL.r);
  assert.ok(b.x > 540 && b.x < 1920 - BALL.r);
});

test('a ball thrown hard at a wall bounces back; it flies on into a screen next door', () => {
  const layout = [
    { bounds: { x: 0, y: 0, width: 1000, height: 800 } },
    { bounds: { x: 1000, y: 0, width: 1000, height: 800 } },
  ];
  const ss = screens.makeScreens(layout);
  const throwBall = (vx) => {
    const b = new Ball();
    b.grab({ x: 900, y: 500 }, 0);
    b.release();
    b.vx = vx;
    b.bonked = false;
    for (let i = 0; i < 60 * 30 && b.state === 'flying'; i++) {
      b.update(1 / 60, ss);
      if (b.drainEvents().includes('ballBonk')) b.bonked = true;
    }
    return b;
  };
  const right = throwBall(700);
  assert.ok(right.x > 1000 && !right.bonked, 'into the right-hand screen');
  const left = throwBall(-2500);
  assert.ok(left.bonked && left.x >= BALL.r && left.x <= 2000 - BALL.r, 'off the left wall and back');
});

// ---------------------------------------------------------------- fetch

test('fetch: he holds out the ball, you throw it, he fetches it and brings it back', () => {
  const c = settled();
  const cursor = { x: 800, y: 700 };
  assert.ok(c.startGame('fetch', true));
  run(c, 3, cursor);
  assert.strictEqual(c.state, 'offerBall');
  assert.strictEqual(c.ball.state, 'held');
  assert.ok(c.board(), 'asks you to play');

  // Pick the ball out of his hands and throw it to the right.
  const at = { x: c.ball.x, y: c.ball.y };
  assert.strictEqual(c.hitPart(at), 'ball');
  assert.ok(c.grabBall(at));
  assert.strictEqual(c.state, 'watchBall');
  for (let i = 1; i <= 6; i++) {
    c.dragBall({ x: at.x + i * 25, y: at.y - i * 10 });
    c.update(1 / 60, cursor);
  }
  c.releaseBall();
  assert.strictEqual(c.ball.state, 'flying');

  // He waits for it to stop, then runs over and picks it up.
  assert.ok(runUntil(c, 30, () => c.ball.state === 'resting', cursor));
  const restedAt = c.ball.x;
  assert.ok(runUntil(c, 30, () => c.ball.state === 'held', cursor), `still ${c.state}`);
  assert.ok(Math.abs(c.x - restedAt) <= GAME.reach);
  assert.strictEqual(c.game.rounds, 1);

  // ... and brings it back to you.
  assert.ok(runUntil(c, 30, () => c.state === 'offerBall', cursor));
  assert.ok(Math.abs(c.x - cursor.x) < 40);
});

test('fetch: he gives up after a couple of minutes if you never take the ball', () => {
  const c = settled();
  const cursor = { x: 800, y: 700 };
  c.needs.boredom = 0.6;
  assert.ok(c.startGame('fetch'));
  const events = [];
  for (let i = 0; i < 60 * (GAME.waitFor + 5); i++) {
    c.update(1 / 60, cursor);
    events.push(...c.drainEvents());
  }
  assert.strictEqual(c.game, null);
  assert.ok(events.includes('gaveUp'));
  assert.strictEqual(c.ball.state, 'away');
  // He played with his own ball instead, so he's not bored any more.
  assert.ok(c.needs.boredom < 0.5);
});

test('fetch: a meeting starting puts the ball away', () => {
  const c = settled();
  c.startGame('fetch', true);
  run(c, 2, { x: 800, y: 700 });
  c.setContext({ hour: 14, now: Date.now(), quiet: true });
  run(c, 1);
  assert.strictEqual(c.game, null);
  assert.strictEqual(c.ball.state, 'away');
});

test('fetch: picked up mid-game, he goes back to the game after landing', () => {
  const c = settled();
  const cursor = { x: 800, y: 700 };
  c.startGame('fetch', true);
  run(c, 2, cursor);
  c.grab({ x: c.x, y: c.y - 50 });
  c.drag({ x: c.x, y: c.y - 200 });
  c.release();
  assert.ok(runUntil(c, 10, () => c.state === 'offerBall', cursor), `got ${c.state}`);
});

// ---------------------------------------------------------------- tic-tac-toe with him

test('tic-tac-toe: he asks, you click him, and you take turns', () => {
  const c = settled();
  const cursor = { x: 800, y: 700 };
  assert.ok(c.startGame('ttt'));
  run(c, 2, cursor);
  assert.strictEqual(c.state, 'offerGame');
  c.pat();
  assert.strictEqual(c.state, 'ttt');
  const v = c.boardView();
  assert.ok(v);
  if (!v.yourTurn) {
    assert.ok(runUntil(c, 3, () => c.boardView().yourTurn, cursor), 'he plays after thinking');
  }
  const view = c.boardView();
  assert.strictEqual(view.board.filter(Boolean).length, view.you === 'X' ? 0 : 1);
  const free = view.board.findIndex((m) => !m);
  assert.ok(c.playSquare(free));
  assert.ok(!c.playSquare(free), 'square taken / not your turn');
  assert.ok(runUntil(c, 3, () => c.boardView().yourTurn || c.boardView().over, cursor));
});

test('tic-tac-toe: who goes first alternates between games', () => {
  const c = settled();
  c.startGame('ttt', true);
  const first = c.boardView().you;
  // Play it out with you always taking the first free square.
  const cursor = { x: 800, y: 700 };
  for (let i = 0; i < 60 * 30 && !c.boardView().over; i++) {
    const v = c.boardView();
    if (v.yourTurn) c.playSquare(v.board.findIndex((m) => !m));
    c.update(1 / 60, cursor);
  }
  assert.ok(c.boardView().over);
  assert.ok(c.playAgain());
  assert.notStrictEqual(c.boardView().you, first);
});

test('tic-tac-toe: you never answering his invitation makes him give up', () => {
  const c = settled();
  c.startGame('ttt');
  run(c, GAME.waitFor + 5, { x: 800, y: 700 });
  assert.strictEqual(c.game, null);
});

// ---------------------------------------------------------------- when he asks

test('he asks you to play when he is getting bored, not when he is fine or fed up', () => {
  const opts = { cursorKnown: true, rng: () => 0.5 };
  const score = (boredom) =>
    brain.scoreActivities({ energy: 0.8, hunger: 0.2, boredom, affection: 0.7 }, 0.3, brain.defaultContext(), opts).find((s) => s.name === 'invite');
  assert.strictEqual(score(0.2), undefined);
  assert.ok(score(0.6));
  assert.strictEqual(score(0.9), undefined);
  const quiet = brain.scoreActivities({ energy: 0.8, hunger: 0.2, boredom: 0.6, affection: 0.7 }, 0.3, { ...brain.defaultContext(), quiet: true }, opts);
  assert.ok(!quiet.some((s) => s.name === 'invite'), 'not in a meeting');
});

// ---------------------------------------------------------------- screens

test('screens: after a while on one screen he wanders over to another on his own', () => {
  const disp = (x, y, w, h) => ({ bounds: { x, y, width: w, height: h }, workArea: { x, y: y + 25, width: w, height: h - 85 } });
  const layout = [disp(0, 0, 1512, 982), disp(1512, 0, 2560, 1440)];
  const ss = screens.makeScreens(layout);
  for (const seed of [1, 2, 3]) {
    const c = new Companion({ bounds: ss[0], halfWidth: 56, height: 142, x: 700, y: ss[0].floor, rng: seeded(seed) });
    c.setScreens(layout);
    c.setContext({ hour: 14, now: Date.now() });
    let switches = 0;
    let last = c.screenIndex;
    let lastSwitch = 0;
    let shortest = Infinity;
    for (let i = 0; i < 60 * 3600; i++) {
      c.update(1 / 60);
      if (c.screenIndex !== last) {
        switches += 1;
        shortest = Math.min(shortest, c.time - lastSwitch);
        lastSwitch = c.time;
        last = c.screenIndex;
      }
      // Keep him happy so his mood doesn't get in the way.
      c.needs.affection = 0.8;
    }
    assert.ok(switches >= 2, `seed ${seed}: only ${switches} trips in an hour`);
    assert.ok(shortest >= brain.NEEDS.visitAfter, `seed ${seed}: left again after ${Math.round(shortest)} s`);
  }
});

test('screens: he can hop up onto a much taller screen next door when his ceiling allows it', () => {
  const laptop = { bounds: { x: 0, y: 0, width: 1512, height: 982 }, workArea: { x: 0, y: 25, width: 1512, height: 900 } };
  // A big monitor to the right, raised so its floor is 740 px above the laptop's.
  const monitor = { bounds: { x: 1512, y: -1198, width: 2560, height: 1440 }, workArea: { x: 1512, y: -1173, width: 2560, height: 1355 } };
  const ss = screens.makeScreens([laptop, monitor]);
  const l = screens.link(ss[0], ss[1], 56);
  assert.ok(l && l.kind === 'hop', 'hops up');
  const c = new Companion({ bounds: ss[0], halfWidth: 56, height: 142, x: 700, y: ss[0].floor, rng: seeded(2) });
  c.setScreens([laptop, monitor]);
  run(c, 2);
  c.enter('idle', 1000);
  assert.ok(c.travelTo(1, 2500));
  assert.ok(runUntil(c, 30, () => c.screenIndex === 1 && c.isGrounded()), `stuck on ${c.screenIndex} in ${c.state}`);
  assert.strictEqual(c.y, ss[1].floor);
});
