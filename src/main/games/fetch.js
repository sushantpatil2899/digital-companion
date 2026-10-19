'use strict';

// The Pokeball for fetch. Pure physics, no Electron.
//
// `x`/`y` is the centre of the ball in screen pixels (DIP). It flies, bounces
// and rolls across all screens: it passes through an edge where another
// display continues, and bounces off the others. The floor is the bottom of
// the display, the same floor he walks on.
//
// state:
//   'away'     put away (no game)
//   'held'     in his hands (the companion draws it)
//   'grabbed'  you're holding it with the mouse
//   'flying'   thrown: in the air, bouncing or rolling
//   'resting'  lying still on the floor, waiting to be fetched

const screensLib = require('../screens');

const BALL = {
  r: 14, // radius, px
  gravity: 2600, // px/s^2
  airDrag: 0.25, // fraction of speed lost per second in the air
  bounce: 0.55, // fraction of vertical speed kept on a bounce
  wallBounce: 0.6,
  rollFriction: 700, // px/s^2 while rolling on the floor
  minBounce: 160, // px/s: slower than this and it stops bouncing
  restSpeed: 25, // px/s: rolling slower than this counts as stopped ...
  restAfter: 0.25, // ... for this many seconds
  maxSpeed: 3500, // px/s
};

function inAnyDisplay(screens, x, y) {
  return screens.some((s) => x >= s.b.left && x < s.b.right && y >= s.b.top && y < s.b.bottom);
}

class Ball {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.rot = 0;
    this.state = 'away';
    this.still = 0; // seconds it has been (almost) still on the floor
    this.history = [];
    this.events = [];
  }

  get loose() {
    return this.state === 'grabbed' || this.state === 'flying' || this.state === 'resting';
  }

  /** In his hands at (x, y). */
  hold(x, y) {
    this.state = 'held';
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  putAway() {
    this.state = 'away';
    this.vx = 0;
    this.vy = 0;
  }

  /** You picked it up with the mouse at `point` (time `t`, seconds). */
  grab(point, t) {
    this.state = 'grabbed';
    this.x = point.x;
    this.y = point.y;
    this.vx = 0;
    this.vy = 0;
    this.history = [{ t, x: point.x, y: point.y }];
  }

  drag(point, t) {
    if (this.state !== 'grabbed') return;
    this.rot += (point.x - this.x) / BALL.r;
    this.x = point.x;
    this.y = point.y;
    this.history.push({ t, x: point.x, y: point.y });
    // ~100 ms of history to work out how fast it was thrown.
    while (this.history.length > 2 && t - this.history[0].t > 0.1) this.history.shift();
  }

  /** Let go: it's thrown with the speed the cursor had. Returns that speed. */
  release() {
    if (this.state !== 'grabbed') return 0;
    const h = this.history;
    let vx = 0;
    let vy = 0;
    if (h.length >= 2) {
      const a = h[0];
      const b = h[h.length - 1];
      const dt = b.t - a.t;
      if (dt > 0.001) {
        vx = (b.x - a.x) / dt;
        vy = (b.y - a.y) / dt;
      }
    }
    const speed = Math.hypot(vx, vy);
    if (speed > BALL.maxSpeed) {
      vx *= BALL.maxSpeed / speed;
      vy *= BALL.maxSpeed / speed;
    }
    this.vx = vx;
    this.vy = vy;
    this.still = 0;
    this.state = 'flying';
    return Math.min(speed, BALL.maxSpeed);
  }

  /**
   * Advance a thrown ball.
   * @param {number} dt seconds
   * @param {object[]} screens see src/main/screens.js
   */
  update(dt, screens) {
    if (this.state !== 'flying' || !screens.length) return;
    const r = BALL.r;
    this.vy += BALL.gravity * dt;
    const drag = Math.max(0, 1 - BALL.airDrag * dt);
    this.vx *= drag;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += (this.vx * dt) / r;

    const s = screens[screensLib.screenAt(screens, this.x, this.y)];
    // Walls and ceiling, unless another display carries on past them.
    if (this.x - r < s.left && this.vx < 0 && !inAnyDisplay(screens, s.left - 1, this.y)) {
      this.x = s.left + r;
      this.vx = -this.vx * BALL.wallBounce;
      this.events.push('ballBonk');
    } else if (this.x + r > s.right && this.vx > 0 && !inAnyDisplay(screens, s.right + 1, this.y)) {
      this.x = s.right - r;
      this.vx = -this.vx * BALL.wallBounce;
      this.events.push('ballBonk');
    }
    if (this.y - r < s.top && this.vy < 0 && !inAnyDisplay(screens, this.x, s.b.top - 1)) {
      this.y = s.top + r;
      this.vy = -this.vy * BALL.wallBounce;
    }
    // Floor: bounce, then roll to a stop.
    if (this.y + r >= s.floor && this.vy >= 0 && !inAnyDisplay(screens, this.x, s.floor + 1)) {
      this.y = s.floor - r;
      if (this.vy > BALL.minBounce) {
        this.vy = -this.vy * BALL.bounce;
        this.events.push('ballBounce');
      } else {
        this.vy = 0;
        const slow = Math.min(Math.abs(this.vx), BALL.rollFriction * dt);
        this.vx -= Math.sign(this.vx) * slow;
        this.still = Math.abs(this.vx) < BALL.restSpeed ? this.still + dt : 0;
        if (this.still >= BALL.restAfter) {
          this.vx = 0;
          this.state = 'resting';
          this.events.push('ballRest');
        }
      }
    }
  }

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }
}

module.exports = { Ball, BALL };
