'use strict';

// Pure simulation of the companion: behaviour state machine + physics.
// No Electron imports here so it can be unit tested with plain Node.
//
// Coordinates are screen pixels (DIP). `x`/`y` is the position of the
// character's feet (bottom-centre of the body).
//
// What he decides to do next comes from his needs, mood and context; see
// src/main/brain.js.

const brain = require('./brain');

const TUNING = {
  gravity: 2600, // px/s^2
  walkSpeed: 70, // px/s
  runSpeed: 190, // px/s
  airDrag: 0.35, // fraction of velocity lost per second while airborne
  wallBounce: 0.55, // fraction of speed kept when hitting a wall
  floorBounce: 0.35, // fraction of vertical speed kept on a hard landing
  playSpeed: 95, // px/s, dribbling his ball
  adventureSpeed: 85, // px/s, off on an adventure with his backpack
  hardLanding: 900, // px/s impact speed that counts as a "hard" landing
  confusedLanding: 1700, // px/s impact speed that leaves him confused
  maxThrowSpeed: 4000, // px/s
  throwSpeed: 600, // px/s release speed that counts as a throw (vs. a drop)
  angryThrows: 3, // this many throws ...
  angryWindow: 60, // ... within this many seconds make him angry
  stayPutFor: 600, // seconds "Stay put" lasts before he wanders again
  petToHappy: 0.3, // seconds of holding before hearts start appearing
  curiousAfter: 1.5, // seconds the cursor lingers near him before he gets curious
  curiousCooldown: 25,
  shyAfter: 2, // seconds the cursor rests on him (no click) before he gets shy
  shyCooldown: 20,
  waveAway: 30, // seconds the cursor must be far away before he waves on its return
};

// Activities that move him around (asking for one ends "Stay put").
const MOVING_ACTIVITIES = ['walk', 'run', 'play', 'adventure', 'jump'];
// Activities you can ask for from the menu.
const MENU_ACTIVITIES = ['eat', 'play', 'talk', 'wave', 'flower', 'adventure', 'sit', 'sleep', 'jump', 'backView'];

// Area around his body that counts as the cursor being "on him", relative to
// his feet in screen px (an ellipse centred `cy` above the feet).
const HIT = { cy: 70, rx: 60, ry: 72 };

// States the cursor reactions (curious / shy / wave) may interrupt.
const INTERRUPTIBLE = ['idle', 'sit', 'lookAround', 'walk', 'backView', 'talk'];

const STATES = [
  'sign',
  'idle',
  'walk',
  'run',
  'sit',
  'sleep',
  'jump',
  'grabbed',
  'fall',
  'land',
  'confused',
  'happy',
  'hug',
  'surprised',
  'lookAround',
  'talk',
  'eat',
  'flower',
  'play',
  'adventure',
  'backView',
  'sad',
  'angry',
  'shy',
  'curious',
  'wave',
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
    this.needs = brain.defaultNeeds();
    this.mood = 0.3; // -1 grumpy .. 1 cheerful
    this.context = brain.defaultContext();
    this.lastActivity = null;
    this.lastScores = [];
    this.lastCursor = null;
    this.afterMove = null; // state to enter when the current walk/run arrives
    this.pendingGreet = null; // 'return' | 'morning' | 'plugged' | 'eventSoon' | 'eventEnded'
    this.lastGreetDay = null;
    this.lastSeekAt = -Infinity;
    this.lastSadAt = -Infinity;
    this.ignoredAsks = 0; // times he asked for attention and didn't get any
    this.lastAttentionAt = -Infinity;
    this.petting = 0; // seconds of continuous petting
    this.lastPet = -Infinity;
    this.pausedUntil = 0; // "Stay put": no wandering until this time

    this.throwTimes = []; // recent throws, for getting angry
    this.grumpyUntil = 0; // stomps off with an angry face until this time
    this.greeted = false; // waves once after first landing
    this.hoverOn = 0; // seconds the cursor has rested on him
    this.hoverNear = 0; // seconds the cursor has lingered near him
    this.cursorFar = 0; // seconds the cursor has been far away
    this.lastCurious = -Infinity;
    this.lastShy = -Infinity;

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
    // A planned "then do X when you arrive" only survives the walk/run it belongs to.
    if (state !== 'walk' && state !== 'run') this.afterMove = null;
    this.state = state;
    this.stateTime = 0;
    this.stateDuration = duration != null ? duration : 0;
  }

  emit(name) {
    this.events.push(name);
  }

  /** 0..1 version of mood, used by the renderer for blush. */
  get happiness() {
    return (this.mood + 1) / 2;
  }

  applyEffect(name, scale = 1) {
    const e = brain.EFFECTS[name];
    if (e) this.mood = brain.apply(this.needs, this.mood, e, scale);
    // Any attention from you means he no longer has to keep asking (for a while).
    if (e && e.affection > 0) {
      this.ignoredAsks = 0;
      this.lastAttentionAt = this.time;
    }
  }

  /** How much longer he waits between asks after being ignored: 1, 2, 4, 8. */
  backoff() {
    return 2 ** Math.min(this.ignoredAsks, 3);
  }

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** True while "Stay put" is on. */
  get paused() {
    return this.time < this.pausedUntil;
  }

  /** "Stay put" for `seconds` (default TUNING.stayPutFor), then wander again. */
  stayPut(seconds = TUNING.stayPutFor) {
    this.pausedUntil = this.time + seconds;
    this.stayPutNotified = false;
  }

  endStayPut() {
    this.pausedUntil = 0;
  }

  /** Seconds of "Stay put" left (0 when off). */
  stayPutLeft() {
    return Math.max(0, this.pausedUntil - this.time);
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
    if (speed > TUNING.throwSpeed) {
      this.throwTimes.push(this.time);
      this.applyEffect('throw');
      this.emit('throw');
    } else {
      this.applyEffect('drop');
      this.emit('drop');
    }
  }

  /** Called every tick while the mouse button is held on him. `dt` = seconds. */
  pet(dt) {
    if (['grabbed', 'fall', 'jump'].includes(this.state)) return;
    this.lastInteraction = this.time;
    this.lastPet = this.time;
    this.petting += dt;
    this.applyEffect('hugPerSecond', dt);
    if (this.state === 'sleep') {
      // Gentle petting doesn't wake him fully; he snuggles into a hug.
      if (this.petting > 2.5) this.enter('hug', 1.5);
      return;
    }
    if (this.state !== 'hug') {
      this.enter('hug', 1.5);
    } else {
      // Keep hugging while the button is held.
      this.stateDuration = Math.max(this.stateDuration, this.stateTime + 0.8);
    }
    this.grumpyUntil = 0;
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
      this.applyEffect('pat'); // woken up, but it's still attention
      this.enter('surprised', 0.9);
      this.emit('wake');
      return;
    }
    this.applyEffect('pat');
    this.vx = 0;
    this.grumpyUntil = 0;
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
    this.endStayPut(); // you're sending him somewhere, so he's no longer staying put
    this.applyEffect('attention');
    this.afterMove = null;
    this.facing = this.targetX > this.x ? 1 : -1;
    this.enter('run');
  }

  /** Do one of MENU_ACTIVITIES on request. Returns false if he can't right now. */
  doActivity(name) {
    if (!MENU_ACTIVITIES.includes(name) || !this.isGrounded()) return false;
    this.lastInteraction = this.time;
    this.grumpyUntil = 0;
    this.vx = 0;
    this.applyEffect('attention');
    if (MOVING_ACTIVITIES.includes(name)) this.endStayPut();
    if (name === 'sleep') {
      this.startActivity('sleep');
      this.stateDuration = Math.max(this.stateDuration, 60);
    } else if (name === 'wave') {
      this.enter('wave', 2.2);
      this.emit('wave');
    } else {
      this.startActivity(name);
    }
    return true;
  }

  // ---------------------------------------------------------------- update

  /**
   * Advance the simulation.
   * @param {number} dt seconds
   * @param {{x:number,y:number}} [cursor] cursor position, used for curiosity
   */
  update(dt, cursor) {
    dt = Math.min(dt, 0.05); // avoid huge steps after the machine sleeps
    if (!(dt > 0)) return;
    this.time += dt;
    this.stateTime += dt;
    if (cursor) this.lastCursor = { x: cursor.x, y: cursor.y };
    this.mood = brain.drift(this.needs, this.mood, this.state, dt, this.context);
    // Petting "charge" fades once the rubbing stops.
    if (this.time - this.lastPet > 0.4) this.petting = Math.max(0, this.petting - dt * 2);
    // Tell the menu once when "Stay put" runs out.
    if (this.pausedUntil > 0 && !this.paused && !this.stayPutNotified) {
      this.stayPutNotified = true;
      this.pausedUntil = 0;
      this.emit('stayPutEnded');
    }

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
        this.emit(impact > TUNING.confusedLanding ? 'thud' : 'bounce');
        if (impact > TUNING.confusedLanding) this.confusedPending = true;
        return;
      }
      this.vx = 0;
      this.vy = 0;
      this.swing = 0;
      this.emit('land');
      this.throwTimes = this.throwTimes.filter((t) => this.time - t < TUNING.angryWindow);
      if (this.throwTimes.length >= TUNING.angryThrows) {
        this.throwTimes = [];
        this.confusedPending = false;
        this.enter('angry', 2.5);
        this.emit('angry');
      } else if (this.confusedPending) {
        this.confusedPending = false;
        this.enter('confused', 2.5);
        this.emit('confused');
      } else if (!this.greeted) {
        this.greeted = true;
        this.enter('wave', 2.2);
        this.emit('wave');
      } else {
        this.enter('land', 0.25);
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
      case 'run':
      case 'play':
      case 'adventure': {
        const speed = {
          walk: TUNING.walkSpeed,
          run: TUNING.runSpeed,
          play: TUNING.playSpeed,
          adventure: TUNING.adventureSpeed,
        }[this.state] * this.speedFactor();
        const dir = Math.sign(this.targetX - this.x);
        this.facing = dir || this.facing;
        this.vx = dir * speed;
        this.x += this.vx * dt;
        const arrived = dir === 0 || Math.sign(this.targetX - this.x) !== dir;
        if (arrived || this.x <= minX || this.x >= maxX) {
          this.x = clamp(arrived ? this.targetX : this.x, minX, maxX);
          this.vx = 0;
          if (this.afterMove) {
            const next = this.afterMove;
            this.afterMove = null;
            this.enter(next.state, next.duration);
            if (next.event) this.emit(next.event);
          } else {
            this.chooseNext();
          }
        }
        break;
      }
      case 'sleep':
        this.vx = 0;
        // Keep sleeping while you're away; otherwise wake once rested (or the nap is over).
        const night = this.context.hour >= 22 || this.context.hour < 6;
        const rested = !night && this.needs.energy > 0.97 && this.stateTime > 20;
        if (!this.context.userAway && (this.stateTime > this.stateDuration || rested)) {
          // Wakes up on his own: a proper nap ends with a wave, a short doze with a look around.
          if (this.stateTime > 180) {
            this.enter('wave', 2.2);
            this.emit('wave');
          } else {
            this.enter('lookAround', 2);
          }
        }
        break;
      case 'angry':
        this.vx = 0;
        if (this.stateTime >= this.stateDuration) {
          if (this.paused) {
            // Told to stay put: sulk on the spot instead of stomping off.
            this.grumpyUntil = this.time + 3;
            this.enter('idle', 3);
          } else {
            // Stomp off in a huff.
            this.grumpyUntil = this.time + 4;
            this.startActivity('walk');
          }
        }
        break;
      default:
        this.vx = 0;
        if (this.stateTime >= this.stateDuration) this.chooseNext();
    }

    if (this.pendingGreet && this.isFreeForReaction()) this.react(this.pendingGreet);
    if (cursor) this.reactToCursor(dt, cursor);

    // Look towards the cursor when it's close and he's not busy.
    if (cursor && ['idle', 'sit', 'happy', 'curious', 'shy', 'wave'].includes(this.state)) {
      const dx = cursor.x - this.x;
      if (Math.abs(dx) > 20 && Math.abs(dx) < 400) this.facing = dx > 0 ? 1 : -1;
    }
  }

  /** Is the point over his body? */
  isOver(point) {
    const dx = (point.x - this.x) / HIT.rx;
    const dy = (point.y - (this.y - HIT.cy)) / HIT.ry;
    return dx * dx + dy * dy <= 1;
  }

  /** Curious when the cursor lingers nearby, shy when it rests on him, waves when it returns. */
  reactToCursor(dt, cursor) {
    const dist = Math.hypot(cursor.x - this.x, cursor.y - (this.y - HIT.cy));
    const on = this.isOver(cursor);
    const near = !on && dist < 180;
    this.hoverOn = on ? this.hoverOn + dt : 0;
    this.hoverNear = near ? this.hoverNear + dt : 0;

    const free = INTERRUPTIBLE.includes(this.state) && this.time - this.lastInteraction > 2;
    if (dist > 500) {
      this.cursorFar += dt;
    } else if (dist < 250) {
      const wasAway = this.cursorFar > TUNING.waveAway;
      this.cursorFar = 0;
      if (wasAway && free) {
        this.enter('wave', 2.2);
        this.emit('wave');
        return;
      }
    }
    if (!free) return;
    if (this.hoverOn > TUNING.shyAfter && this.time - this.lastShy > TUNING.shyCooldown) {
      this.lastShy = this.time;
      this.enter('shy', 3);
      this.emit('shy');
    } else if (this.hoverNear > TUNING.curiousAfter && this.time - this.lastCurious > TUNING.curiousCooldown) {
      this.lastCurious = this.time;
      this.enter('curious', 2.5);
      this.emit('curious');
    }
  }

  /** Pick the next autonomous behaviour from his needs, mood and context. */
  chooseNext() {
    const scored = brain.scoreActivities(this.needs, this.mood, this.context, {
      paused: this.paused,
      cursorKnown: !!this.lastCursor,
      last: this.lastActivity,
      seekReady:
        this.time - this.lastSeekAt >= brain.NEEDS.seekCooldown * this.backoff() &&
        this.time - this.lastAttentionAt >= brain.NEEDS.attentionGrace,
      sadReady: this.time - this.lastSadAt >= brain.NEEDS.sadCooldown * this.backoff(),
      rng: this.rng,
    });
    this.lastScores = scored.slice(0, 6);
    const choice = brain.pick(scored, this.rng);
    this.startActivity(choice.name);
  }

  // ---------------------------------------------------------------- context

  /** Latest context from the ContextTracker (src/main/context.js). */
  setContext(ctx) {
    const prev = this.context;
    this.context = { ...brain.defaultContext(), ...ctx };
    // Remember one-shot happenings until he's free to react to them.
    if (ctx.justReturned) this.pendingGreet = 'return';
    else if (ctx.justPluggedIn) this.pendingGreet = this.pendingGreet || 'plugged';
    if (ctx.eventSoon) this.pendingGreet = 'eventSoon';
    if (ctx.eventEnded) this.pendingGreet = this.pendingGreet || 'eventEnded';
    // First time he sees you on a new day: say good morning.
    if (ctx.day && !ctx.userAway && ctx.hour >= 5 && this.lastGreetDay !== ctx.day) {
      if (this.lastGreetDay) this.pendingGreet = this.pendingGreet || 'morning';
      this.lastGreetDay = ctx.day;
    }
    // Wake up when you come back (or when your meeting is about to start).
    if (this.state === 'sleep' && prev.userAway && !ctx.userAway) this.enter('surprised', 0.9);
  }

  /** Not busy with you / in the air, so he can react to something. */
  isFreeForReaction() {
    return this.isGrounded() && !['hug', 'happy', 'angry', 'surprised', 'land', 'confused'].includes(this.state);
  }

  react(kind) {
    this.pendingGreet = null;
    switch (kind) {
      case 'return':
        // You're back! Run over (unless told to stay put) and wave.
        this.applyEffect('attention');
        this.emit('welcomeBack');
        this.goToCursorThen({ state: 'wave', duration: 2.2, event: 'wave' }, 'run');
        break;
      case 'morning':
        this.emit(this.context.hour < 12 ? 'goodMorning' : 'hello');
        this.enter('wave', 2.5);
        this.emit('wave');
        break;
      case 'plugged':
        this.applyEffect('pluggedIn');
        this.emit('charging');
        this.enter('happy', 1.5);
        break;
      case 'eventSoon':
        // Come to where you're looking and hold up a "Meeting in 5!" sign.
        this.emit('eventSoon');
        this.goToCursorThen({ state: 'sign', duration: 8 }, 'run');
        break;
      case 'eventEnded':
        this.emit('eventEnded');
        this.enter('wave', 2);
        break;
      default:
    }
  }

  /** Walk/run to below the cursor, then enter `then`; just do `then` if he can't move. */
  goToCursorThen(then, gait = 'walk') {
    const minX = this.bounds.left + this.halfWidth;
    const maxX = this.bounds.right - this.halfWidth;
    if (!this.lastCursor || this.paused || this.context.quiet) {
      this.enter(then.state, then.duration);
      if (then.event) this.emit(then.event);
      return;
    }
    this.targetX = clamp(this.lastCursor.x, minX, maxX);
    if (Math.abs(this.targetX - this.x) < 30) {
      this.enter(then.state, then.duration);
      if (then.event) this.emit(then.event);
      return;
    }
    this.afterMove = then;
    this.facing = this.targetX > this.x ? 1 : -1;
    this.enter(gait);
  }

  /** Slower when tired or the battery is low. */
  speedFactor() {
    let f = 1;
    const c = this.context;
    if (c.onBattery && c.batteryLevel != null && c.batteryLevel < 0.2) f *= 0.75;
    if (this.needs.energy < 0.2) f *= 0.8;
    return f;
  }

  /** Time passed without the simulation running (app closed, Mac asleep). */
  catchUp(seconds) {
    this.mood = brain.catchUp(this.needs, this.mood, seconds);
  }

  // ---------------------------------------------------------------- memory

  serialize() {
    return {
      v: 1,
      savedAt: Date.now(),
      needs: { ...this.needs },
      mood: this.mood,
      lastGreetDay: this.lastGreetDay,
    };
  }

  /** Restore saved state; `elapsed` = seconds since it was saved. */
  restore(saved, elapsed = 0) {
    if (!saved || saved.v !== 1 || !saved.needs) return false;
    for (const k of Object.keys(this.needs)) {
      const v = saved.needs[k];
      if (typeof v === 'number' && Number.isFinite(v)) this.needs[k] = clamp(v, 0, 1);
    }
    if (typeof saved.mood === 'number' && Number.isFinite(saved.mood)) this.mood = clamp(saved.mood, -1, 1);
    if (typeof saved.lastGreetDay === 'string') this.lastGreetDay = saved.lastGreetDay;
    this.catchUp(elapsed);
    return true;
  }

  /** Everything the "brain" debug view shows. */
  brainSnapshot() {
    return {
      state: this.state,
      needs: { ...this.needs },
      mood: this.mood,
      context: { ...this.context },
      paused: this.paused,
      stayPutLeft: this.stayPutLeft(),
      scores: this.lastScores.map((s) => ({ name: s.name, score: Math.round(s.score * 100) / 100, why: s.why })),
    };
  }

  /** Start one activity (used by chooseNext and doActivity). */
  startActivity(name) {
    const rng = this.rng;
    this.lastActivity = name;
    this.applyEffect(name);
    switch (name) {
      case 'walk':
        this.startMove('walk', 80, 600);
        break;
      case 'run':
        this.startMove('run', 150, 700);
        break;
      case 'play':
        this.startMove('play', 120, 320);
        this.emit('play');
        break;
      case 'adventure': {
        const width = this.bounds.right - this.bounds.left;
        this.startMove('adventure', width * 0.5, Math.min(width * 0.9, 1600));
        this.emit('adventure');
        break;
      }
      case 'jump':
        this.vy = -rand(500, 800, rng);
        this.vx = this.facing * rand(0, 120, rng);
        this.enter('jump');
        this.emit('jump');
        break;
      case 'idle':
        this.enter('idle', rand(1.5, 4, rng));
        break;
      case 'sit':
        this.enter('sit', rand(3, 8, rng));
        break;
      case 'lookAround':
        this.enter('lookAround', rand(1.5, 2.5, rng));
        break;
      case 'talk':
        this.enter('talk', rand(2.5, 4, rng));
        this.emit('talk');
        break;
      case 'eat':
        this.enter('eat', 5);
        this.emit('eat');
        break;
      case 'flower':
        this.enter('flower', rand(4, 6, rng));
        this.emit('flower');
        break;
      case 'backView':
        this.enter('backView', rand(3, 5, rng));
        break;
      case 'sleep': {
        // Nap until rested: longer when more tired, and much longer at night.
        const night = this.context.hour >= 22 || this.context.hour < 6;
        const nap = 20 + (1 - this.needs.energy) * 420;
        this.enter('sleep', night ? Math.max(600, nap * 4) : nap);
        this.emit('sleep');
        break;
      }
      case 'sad':
        this.lastSadAt = this.time;
        this.enter('sad', rand(6, 10, rng));
        this.emit('sad');
        break;
      case 'seek':
        // Lonely: go and stand under your cursor hoping for attention.
        this.lastSeekAt = this.time;
        this.lastSadAt = this.time; // the sad face at the end counts as a sad spell
        this.ignoredAsks += 1; // reset as soon as you give him attention
        this.emit('lonely');
        this.goToCursorThen({ state: 'sad', duration: rand(4, 7, rng) });
        break;
      default:
        throw new Error(`unknown activity ${name}`);
    }
  }

  /** Walk-like movement of a random distance in [minD, maxD]. */
  startMove(kind, minD, maxD) {
    const b = this.bounds;
    const minX = b.left + this.halfWidth;
    const maxX = b.right - this.halfWidth;
    const width = maxX - minX;
    const distance = rand(Math.min(minD, width * 0.5), Math.max(minD, Math.min(maxD, width)), this.rng);
    let dir = this.rng() < 0.5 ? -1 : 1;
    if (this.x + dir * distance > maxX || this.x + dir * distance < minX) {
      // Turn around if there's more room the other way.
      const roomLeft = this.x - minX;
      const roomRight = maxX - this.x;
      dir = roomRight >= roomLeft ? 1 : -1;
    }
    this.targetX = clamp(this.x + dir * distance, minX, maxX);
    this.facing = dir;
    this.afterMove = null;
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
      stateDuration: this.stateDuration,
      happiness: this.happiness,
      mood: this.mood,
      energy: this.needs.energy,
      eventTitle: this.context.nextEvent ? this.context.nextEvent.title : null,
      petting: this.petting,
      grumpy: this.time < this.grumpyUntil,
      time: this.time,
    };
  }
}

module.exports = { Companion, TUNING, STATES, MENU_ACTIVITIES, HIT };
