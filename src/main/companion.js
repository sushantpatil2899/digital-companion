'use strict';

// Pure simulation of the companion: behaviour state machine + physics.
// No Electron imports here so it can be unit tested with plain Node.
//
// Coordinates are screen pixels (DIP). `x`/`y` is the position of the
// character's feet (bottom-centre of the body).

const TUNING = {
  gravity: 2600, // px/s^2
  walkSpeed: 70, // px/s
  runSpeed: 190, // px/s
  airDrag: 0.35, // fraction of velocity lost per second while airborne
  wallBounce: 0.55, // fraction of speed kept when hitting a wall
  floorBounce: 0.35, // fraction of vertical speed kept on a hard landing
  hardLanding: 900, // px/s impact speed that counts as a "hard" landing
  dizzyLanding: 1700, // px/s impact speed that makes him dizzy
  maxThrowSpeed: 4000, // px/s
  sleepAfter: 90, // seconds without interaction before he gets sleepy
  petToHappy: 0.3, // seconds of holding before hearts start appearing
};

const STATES = [
  'idle',
  'walk',
  'run',
  'sit',
  'sleep',
  'jump',
  'grabbed',
  'fall',
  'land',
  'dizzy',
  'happy',
  'surprised',
  'lookAround',
];

function rand(min, max, rng) {
  return min + (max - min) * rng();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

class Companion {
  /**
   * @param {object} opts
   * @param {{left:number,right:number,floor:number,top:number}} opts.bounds
   *   Area the companion lives in. `floor` is the y of the ground.
   * @param {number} [opts.halfWidth] half of the body width, used for walls
   * @param {number} [opts.height] body height, used for the ceiling
   * @param {() => number} [opts.rng] random source in [0, 1)
   */
  constructor(opts) {
    this.rng = opts.rng || Math.random;
    this.halfWidth = opts.halfWidth || 40;
    this.height = opts.height || 90;
    this.bounds = { ...opts.bounds };

    this.x = opts.x != null ? opts.x : (this.bounds.left + this.bounds.right) / 2;
    this.y = opts.y != null ? opts.y : this.bounds.floor;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1 = right, -1 = left

    this.state = 'fall';
    this.stateTime = 0; // seconds spent in current state
    this.stateDuration = 0; // planned length of current state
    this.targetX = this.x;

    this.time = 0;
    this.lastInteraction = 0;
    this.happiness = 0.5; // 0..1, purely cosmetic
    this.petting = 0; // seconds of continuous petting
    this.lastPet = -Infinity;
    this.paused = false; // when true he stays put (no wandering)

    // Pendulum swing while being carried (radians, rad/s).
    this.swing = 0;
    this.swingVel = 0;
    this.grabOffset = { x: 0, y: 0 };
    this.cursorHistory = [];

    this.events = []; // one-shot events for the renderer (sounds/particles)
  }

  setBounds(bounds) {
    this.bounds = { ...bounds };
    if (this.state !== 'grabbed') {
      this.x = clamp(this.x, this.bounds.left + this.halfWidth, this.bounds.right - this.halfWidth);
      if (this.y > this.bounds.floor) this.y = this.bounds.floor;
      if (this.y < this.bounds.floor && this.isGrounded()) this.enter('fall');
    }
  }

  isGrounded() {
    return !['grabbed', 'fall', 'jump'].includes(this.state);
  }

  enter(state, duration) {
    if (!STATES.includes(state)) throw new Error(`unknown state ${state}`);
    this.state = state;
    this.stateTime = 0;
    this.stateDuration = duration != null ? duration : 0;
  }

  emit(name) {
    this.events.push(name);
  }

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ---------------------------------------------------------------- input

  /** Pointer pressed on the character. `point` = cursor in screen coords. */
  grab(point) {
    this.grabOffset = { x: point.x - this.x, y: point.y - this.y };
    this.cursorHistory = [{ t: this.time, x: point.x, y: point.y }];
    this.vx = 0;
    this.vy = 0;
    this.swing = 0;
    this.swingVel = 0;
    this.petting = 0;
    this.lastInteraction = this.time;
    this.enter('grabbed');
    this.emit('grab');
  }

  /** Cursor moved while grabbed. */
  drag(point) {
    if (this.state !== 'grabbed') return;
    const prevX = this.x;
    this.x = point.x - this.grabOffset.x;
    this.y = point.y - this.grabOffset.y;
    this.cursorHistory.push({ t: this.time, x: point.x, y: point.y });
    // Keep ~100ms of history to estimate throw velocity.
    while (this.cursorHistory.length > 2 && this.time - this.cursorHistory[0].t > 0.1) {
      this.cursorHistory.shift();
    }
    // Horizontal movement kicks the pendulum the opposite way.
    this.swingVel -= (this.x - prevX) * 0.012;
    if (Math.abs(this.x - prevX) > 0.5) this.facing = this.x > prevX ? 1 : -1;
  }

  /** Pointer released: he is dropped (or thrown, if the cursor was moving). */
  release() {
    if (this.state !== 'grabbed') return;
    const h = this.cursorHistory;
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
    if (speed > TUNING.maxThrowSpeed) {
      vx *= TUNING.maxThrowSpeed / speed;
      vy *= TUNING.maxThrowSpeed / speed;
    }
    this.vx = vx;
    this.vy = vy;
    this.lastInteraction = this.time;
    this.enter('fall');
    this.emit(speed > 600 ? 'throw' : 'drop');
  }

  /** Called every tick while the mouse button is held on him. `dt` = seconds. */
  pet(dt) {
    if (['grabbed', 'fall', 'jump'].includes(this.state)) return;
    this.lastInteraction = this.time;
    this.lastPet = this.time;
    this.petting += dt;
    this.happiness = clamp(this.happiness + dt * 0.15, 0, 1);
    if (this.state === 'sleep') {
      // Gentle petting doesn't wake him fully; he smiles in his sleep.
      if (this.petting > 2.5) this.enter('happy', 2.5);
      return;
    }
    if (this.state !== 'happy') {
      this.enter('happy', 1.5);
    } else {
      // Keep him happy while the petting continues.
      this.stateDuration = Math.max(this.stateDuration, this.stateTime + 0.8);
    }
    this.vx = 0;
    if (this.petting > TUNING.petToHappy && Math.floor((this.petting - dt) * 3) !== Math.floor(this.petting * 3)) {
      this.emit('heart');
    }
  }

  /** Quick click without dragging: a pat on the head (or a wake-up call). */
  pat() {
    if (!this.isGrounded()) return;
    this.lastInteraction = this.time;
    if (this.state === 'sleep') {
      this.petting = 0;
      this.enter('surprised', 0.9);
      this.emit('wake');
      return;
    }
    this.happiness = clamp(this.happiness + 0.05, 0, 1);
    this.vx = 0;
    if (this.state === 'happy') {
      this.stateDuration = Math.max(this.stateDuration, this.stateTime + 1.2);
    } else {
      this.enter('happy', 1.2);
    }
    this.emit('heart');
  }

  /** Run along the floor to `x` (e.g. when called from the menu). */
  comeTo(x) {
    if (!this.isGrounded()) return;
    this.lastInteraction = this.time;
    const minX = this.bounds.left + this.halfWidth;
    const maxX = this.bounds.right - this.halfWidth;
    this.targetX = clamp(x, minX, maxX);
    if (Math.abs(this.targetX - this.x) < 5) {
      this.enter('happy', 1);
      return;
    }
    this.facing = this.targetX > this.x ? 1 : -1;
    this.enter('run');
  }

  // ---------------------------------------------------------------- update

  /**
   * Advance the simulation.
   * @param {number} dt seconds
   * @param {{x:number,y:number}} [cursor] cursor position, used for curiosity
   */
  update(dt, cursor) {
    dt = Math.min(dt, 0.05); // avoid huge steps after the machine sleeps
    this.time += dt;
    this.stateTime += dt;
    // Petting "charge" fades once the rubbing stops.
    if (this.time - this.lastPet > 0.4) this.petting = Math.max(0, this.petting - dt * 2);

    switch (this.state) {
      case 'grabbed':
        this.updateGrabbed(dt);
        break;
      case 'fall':
      case 'jump':
        this.updateAirborne(dt);
        break;
      default:
        this.updateGrounded(dt, cursor);
    }
  }

  updateGrabbed(dt) {
    // Damped pendulum hanging from the grab point.
    const k = 30; // stiffness
    const damping = 3.2;
    this.swingVel += (-k * Math.sin(this.swing) - damping * this.swingVel) * dt;
    this.swing += this.swingVel * dt;
    this.swing = clamp(this.swing, -1.2, 1.2);
  }

  updateAirborne(dt) {
    const b = this.bounds;
    this.vy += TUNING.gravity * dt;
    const drag = Math.max(0, 1 - TUNING.airDrag * dt);
    this.vx *= drag;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Swing relaxes back to upright while flying.
    this.swing *= Math.max(0, 1 - 6 * dt);
    if (Math.abs(this.vx) > 30) this.facing = this.vx > 0 ? 1 : -1;

    // Walls.
    const minX = b.left + this.halfWidth;
    const maxX = b.right - this.halfWidth;
    if (this.x < minX) {
      this.x = minX;
      if (this.vx < 0) {
        this.vx = -this.vx * TUNING.wallBounce;
        if (Math.abs(this.vx) > 300) this.emit('bonk');
      }
    } else if (this.x > maxX) {
      this.x = maxX;
      if (this.vx > 0) {
        this.vx = -this.vx * TUNING.wallBounce;
        if (Math.abs(this.vx) > 300) this.emit('bonk');
      }
    }

    // Ceiling.
    const minY = b.top + this.height;
    if (this.y < minY) {
      this.y = minY;
      if (this.vy < 0) {
        this.vy = -this.vy * TUNING.wallBounce;
        this.emit('bonk');
      }
    }

    // Floor.
    if (this.y >= b.floor && this.vy >= 0) {
      this.y = b.floor;
      const impact = this.vy;
      if (impact > TUNING.hardLanding) {
        // Bounce.
        this.vy = -impact * TUNING.floorBounce;
        this.vx *= 0.6;
        this.emit(impact > TUNING.dizzyLanding ? 'thud' : 'bounce');
        if (impact > TUNING.dizzyLanding) this.dizzyPending = true;
        return;
      }
      this.vx = 0;
      this.vy = 0;
      this.swing = 0;
      if (this.dizzyPending) {
        this.dizzyPending = false;
        this.enter('dizzy', 2.5);
        this.emit('dizzy');
      } else {
        this.enter('land', 0.25);
        this.emit('land');
      }
    }
  }

  updateGrounded(dt, cursor) {
    const b = this.bounds;
    this.y = b.floor;
    this.vy = 0;

    const minX = b.left + this.halfWidth;
    const maxX = b.right - this.halfWidth;

    switch (this.state) {
      case 'walk':
      case 'run': {
        const speed = this.state === 'run' ? TUNING.runSpeed : TUNING.walkSpeed;
        const dir = Math.sign(this.targetX - this.x);
        this.facing = dir || this.facing;
        this.vx = dir * speed;
        this.x += this.vx * dt;
        const arrived = dir === 0 || Math.sign(this.targetX - this.x) !== dir;
        if (arrived || this.x <= minX || this.x >= maxX) {
          this.x = clamp(arrived ? this.targetX : this.x, minX, maxX);
          this.vx = 0;
          this.chooseNext();
        }
        break;
      }
      case 'sleep':
        this.vx = 0;
        if (this.stateTime > this.stateDuration) {
          this.enter('lookAround', 1.5);
          this.emit('yawn');
        }
        break;
      default:
        this.vx = 0;
        if (this.stateTime >= this.stateDuration) this.chooseNext();
    }

    // Look towards the cursor when it's close and he's not busy.
    if (cursor && ['idle', 'sit', 'happy'].includes(this.state)) {
      const dx = cursor.x - this.x;
      if (Math.abs(dx) > 20 && Math.abs(dx) < 400) this.facing = dx > 0 ? 1 : -1;
    }
  }

  /** Pick the next autonomous behaviour. */
  chooseNext() {
    const r = this.rng();
    const idleFor = this.time - this.lastInteraction;

    if (this.paused) {
      this.enter(r < 0.7 ? 'idle' : 'sit', rand(2, 5, this.rng));
      return;
    }

    if (idleFor > TUNING.sleepAfter && r < 0.35) {
      this.enter('sleep', rand(20, 60, this.rng));
      this.emit('sleep');
      return;
    }

    if (r < 0.45) {
      this.startWalk(this.rng() < 0.15 ? 'run' : 'walk');
    } else if (r < 0.65) {
      this.enter('idle', rand(1.5, 4, this.rng));
    } else if (r < 0.8) {
      this.enter('sit', rand(3, 8, this.rng));
    } else if (r < 0.92) {
      this.enter('lookAround', rand(1.5, 2.5, this.rng));
    } else {
      this.vy = -rand(500, 800, this.rng);
      this.vx = this.facing * rand(0, 120, this.rng);
      this.enter('jump');
      this.emit('jump');
    }
  }

  startWalk(kind) {
    const b = this.bounds;
    const minX = b.left + this.halfWidth;
    const maxX = b.right - this.halfWidth;
    const width = maxX - minX;
    const distance = rand(80, Math.max(120, Math.min(width * 0.5, 600)), this.rng);
    let dir = this.rng() < 0.5 ? -1 : 1;
    if (this.x + dir * distance > maxX || this.x + dir * distance < minX) dir = -dir;
    this.targetX = clamp(this.x + dir * distance, minX, maxX);
    this.facing = dir;
    this.enter(kind);
  }

  /** Data the renderer needs each frame. */
  snapshot() {
    return {
      state: this.state,
      stateTime: this.stateTime,
      facing: this.facing,
      vx: this.vx,
      vy: this.vy,
      swing: this.swing,
      grabOffset: this.grabOffset,
      happiness: this.happiness,
      petting: this.petting,
      time: this.time,
    };
  }
}

module.exports = { Companion, TUNING, STATES };
