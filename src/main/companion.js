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
const screensLib = require('./screens');
const { NudgeTracker, TIMING: NUDGE_TIMING, say, clockTime } = require('./nudges');

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
// his feet in screen px (an ellipse centred `cy` above the feet). The board
// or bubble he holds up over his head is clickable too, and the meeting
// sign's "Join" tag sits on its bottom-left corner.
const HIT = {
  cy: 70,
  rx: 60,
  ry: 72,
  signHalfWidth: 64,
  signBottom: 128,
  signTop: 205,
  join: { left: -66, right: -12, bottom: 126, top: 162 },
};

// How each nudge is shown (see src/main/nudges.js for when).
const NUDGE = {
  water: { state: 'water', walk: true, gait: 'walk', hold: NUDGE_TIMING.hold },
  stretch: { state: 'stretch', walk: true, gait: 'walk', hold: NUDGE_TIMING.hold },
  bedtime: { state: 'bedtime', walk: true, gait: 'walk', hold: NUDGE_TIMING.hold },
  eyes: { state: 'eyeRest', walk: false, hold: NUDGE_TIMING.eyeRest },
  note: { state: 'note', walk: true, gait: 'run', hold: Infinity },
};
const NUDGE_STATES = Object.values(NUDGE).map((n) => n.state);
// States with something held up over his head that you can click.
const BOARD_STATES = ['sign', ...NUDGE_STATES];
// Busy with you, or just landed: a reminder waits until he's done.
const REACTING = ['hug', 'happy', 'surprised', 'land', 'confused', 'angry', 'drink', 'nod'];

// What he stops doing when you join a meeting (he sits down where he is).
const BUSY_WHEN_QUIET = ['walk', 'run', 'play', 'adventure', 'lookAround', 'talk', 'eat', 'flower', 'curious', 'wave'];

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
  'water',
  'drink',
  'stretch',
  'eyeRest',
  'bedtime',
  'note',
  'nod',
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
    this.mood = 0.3; // -1 sad .. 1 cheerful
    this.grumpiness = 0; // 0..1, raised by being thrown, fades over minutes
    this.lastMoveDistance = 0;
    // Multiple monitors (see src/main/screens.js). Empty = just `bounds`.
    this.screens = [];
    this.screenIndex = 0;
    this.crossing = null; // the screen link he's deliberately crossing right now
    this.route = null; // { target, links, x, then, gait } while travelling between screens
    this.softLanding = false; // a deliberate drop: land gently, no bounce
    this.context = brain.defaultContext();
    this.lastActivity = null;
    this.lastScores = [];
    this.lastCursor = null;
    this.afterMove = null; // state to enter when the current walk/run arrives
    this.pendingGreet = null; // 'return' | 'morning' | 'plugged' | 'eventEnded'
    // Meeting reminder he's holding a sign for, until you click it:
    // { kind: '30' | '5' | 'now', event, acknowledged }
    this.reminder = null;
    // Wellbeing nudges and "remind me" notes: when they're due, and the one
    // he's showing you right now ({ kind, note?, shownAt, acknowledged }).
    this.nudges = new NudgeTracker();
    this.nudge = null;
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

  setBounds(bounds, keepX = false) {
    this.bounds = { ...bounds };
    if (this.state !== 'grabbed') {
      if (!this.crossing && !keepX) this.x = clamp(this.x, this.bounds.left + this.halfWidth, this.bounds.right - this.halfWidth);
      // Snap onto the floor, except while rising past it (springing up a screen).
      if (this.y > this.bounds.floor && (this.isGrounded() || this.vy >= 0)) this.y = this.bounds.floor;
      if (this.y < this.bounds.floor && this.isGrounded()) this.enter('fall');
    }
  }

  // ---------------------------------------------------------------- screens

  /** All displays, as Electron gives them: [{ bounds, workArea }]. */
  setScreens(displays) {
    this.screens = screensLib.makeScreens(displays);
    if (!this.screens.length) return;
    if (this.route && this.route.target >= this.screens.length) this.route = null;
    this.crossing = null;
    this.screenIndex = screensLib.screenAt(this.screens, this.x, this.y - 10);
    this.setBounds(this.screens[this.screenIndex]);
  }

  /** Which screen his feet are on now; switch walls/floor when that changes. */
  updateScreen() {
    if (!this.screens.length) return;
    const idx = screensLib.screenAt(this.screens, this.x, this.y - 10);
    if (idx === this.screenIndex) return;
    this.screenIndex = idx;
    // Just came through an edge: don't yank him fully inside the new screen,
    // he walks (or flies) the rest of the way in.
    const cameThrough = !!this.crossing;
    if (this.crossing && this.crossing.to === idx) {
      if (this.crossing.kind === 'drop') this.softLanding = true;
      this.crossing = null;
    }
    this.setBounds(this.screens[idx], cameThrough);
  }

  /** Screens he could walk to from here. */
  reachableScreens() {
    if (this.screens.length < 2) return [];
    return screensLib.linksFrom(this.screens, this.screenIndex, this.halfWidth).map((l) => l.to);
  }

  /** Travel to screen `target` through the edges, then walk to `x` and do `then`. */
  travelTo(target, x, then = null, gait = 'walk') {
    const links = screensLib.route(this.screens, this.screenIndex, target, this.halfWidth);
    if (!links) return false;
    this.route = { target, links, x, then, gait };
    this.continueRoute();
    return true;
  }

  /** Take the next step of the current route. Returns false if there's nothing to do. */
  continueRoute() {
    const r = this.route;
    if (!r) return false;
    this.crossing = null;
    if (this.screenIndex === r.target) {
      this.route = null;
      const sc = this.screens[r.target];
      // Somewhere new: have a look around before deciding what's next.
      this.walkTo(clamp(r.x, sc.left + this.halfWidth, sc.right - this.halfWidth), r.gait, r.then || { state: 'lookAround', duration: 4 });
      return true;
    }
    let link = r.links.find((l) => l.from === this.screenIndex);
    if (!link) {
      // Off the planned path (e.g. dropped somewhere else): plan again.
      const again = screensLib.route(this.screens, this.screenIndex, r.target, this.halfWidth);
      if (!again || !again.length) {
        this.route = null;
        return false;
      }
      r.links = again;
      link = again[0];
    }
    this.approach(link, r.gait);
    return true;
  }

  /** Walk to where a crossing starts (or straight through a side edge). */
  approach(link, gait) {
    const sign = link.dir === 'right' ? 1 : -1;
    const sc = this.screens[this.screenIndex];
    const inside = (x) => clamp(x, sc.left + this.halfWidth, sc.right - this.halfWidth);
    if (link.kind === 'walk' || link.kind === 'drop') {
      // Just keep walking through the edge.
      this.crossing = link;
      this.walkTo(link.edgeX + sign * (this.halfWidth + 60), gait, null);
    } else if (link.kind === 'hop') {
      // Take a run-up so he's at the top of the hop as he crosses the edge.
      const { vy } = this.hopVelocity(link.rise + 70);
      const runUp = Math.max(this.halfWidth + 5, 200 * (vy / TUNING.gravity));
      this.walkTo(inside(link.edgeX - sign * runUp), gait, { cross: link });
    } else {
      // Stacked: get under / over the shared part of the edge first.
      this.walkTo(clamp(this.x, link.rangeLeft, link.rangeRight), gait, { cross: link });
    }
  }

  hopVelocity(height) {
    return { vy: Math.sqrt(2 * TUNING.gravity * Math.max(20, height)) };
  }

  /** The actual crossing move at the end of the approach. */
  startCross(link) {
    this.crossing = link;
    this.vx = 0;
    switch (link.kind) {
      case 'hop': {
        this.vy = -this.hopVelocity(link.rise + 70).vy;
        this.vx = (link.dir === 'right' ? 1 : -1) * 200;
        this.facing = Math.sign(this.vx);
        this.enter('jump');
        this.emit('hop');
        break;
      }
      case 'fall':
        // Step off the bottom of this screen onto the one below.
        this.softLanding = true;
        this.vy = 120;
        this.enter('fall');
        this.emit('dropDown');
        break;
      case 'spring': {
        // Big spring jump up through the top edge onto the screen above.
        const target = this.screens[link.to];
        this.vy = -this.hopVelocity(this.y - target.floor + 90).vy;
        this.enter('jump');
        this.emit('spring');
        break;
      }
      default:
        this.crossing = null;
    }
  }

  /** Walk/run to `x` on this screen, then do `then` (or decide what's next). */
  walkTo(x, gait = 'walk', then = null) {
    this.targetX = x;
    this.lastMoveDistance = Math.abs(x - this.x);
    if (Math.abs(x - this.x) < 3) {
      this.afterMove = then;
      this.arrive();
      return;
    }
    this.facing = x > this.x ? 1 : -1;
    this.enter(gait);
    this.afterMove = then;
  }

  /** Reached the end of a walk/run. */
  arrive() {
    if (this.afterMove) {
      const next = this.afterMove;
      this.afterMove = null;
      if (next.cross) {
        this.startCross(next.cross);
        return;
      }
      this.enter(next.state, next.duration);
      if (next.event) this.emit(next.event);
      return;
    }
    if (this.route && this.continueRoute()) return;
    this.chooseNext();
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

  /** cheerful | content | meh | sad | grumpy */
  moodBand() {
    return brain.moodBand(this.mood, this.grumpiness);
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
    this.route = null;
    this.crossing = null;
    this.softLanding = false;
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
      this.grumpiness = Math.min(1, this.grumpiness + brain.NEEDS.grumpyPerThrow);
      this.emit('throw');
    } else {
      this.applyEffect('drop');
      this.emit('drop');
    }
  }

  /** Called every tick while the mouse button is held on him. `dt` = seconds. */
  pet(dt) {
    if (['grabbed', 'fall', 'jump'].includes(this.state)) return;
    if (this.showingReminder() && this.acknowledgeReminder()) return;
    if (this.showingNudge() && this.acknowledgeNudge()) return;
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
    if (this.showingReminder() && this.acknowledgeReminder()) return;
    if (this.showingNudge() && this.acknowledgeNudge()) return;
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

  /**
   * Run along the floor to below (x, y), e.g. from the menu. On another screen
   * he goes there through the screen edges.
   * @returns {boolean} false if he can't get there on foot (screens don't touch)
   */
  comeTo(x, y) {
    if (!this.isGrounded()) return false;
    this.lastInteraction = this.time;
    if (this.screens.length > 1 && y != null) {
      const target = screensLib.screenAt(this.screens, x, y);
      if (target !== this.screenIndex) {
        this.endStayPut();
        this.applyEffect('attention');
        return this.travelTo(target, x, { state: 'happy', duration: 1 }, 'run');
      }
    }
    const minX = this.bounds.left + this.halfWidth;
    const maxX = this.bounds.right - this.halfWidth;
    this.targetX = clamp(x, minX, maxX);
    if (Math.abs(this.targetX - this.x) < 5) {
      this.enter('happy', 1);
      return true;
    }
    this.endStayPut(); // you're sending him somewhere, so he's no longer staying put
    this.applyEffect('attention');
    this.route = null;
    this.afterMove = null;
    this.facing = this.targetX > this.x ? 1 : -1;
    this.enter('run');
    return true;
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
    this.grumpiness = Math.max(0, this.grumpiness - brain.NEEDS.grumpyFade * dt);
    this.nudges.tick(dt, this.context);
    // Petting "charge" fades once the rubbing stops.
    if (this.time - this.lastPet > 0.4) this.petting = Math.max(0, this.petting - dt * 2);
    // Tell the menu once when "Stay put" runs out.
    if (this.pausedUntil > 0 && !this.paused && !this.stayPutNotified) {
      this.stayPutNotified = true;
      this.pausedUntil = 0;
      this.emit('stayPutEnded');
    }

    this.updateScreen();
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

    // Walls (except the edge he's deliberately crossing through).
    const minX = b.left + this.halfWidth;
    const maxX = b.right - this.halfWidth;
    const open = this.crossing ? this.crossing.dir : null;
    if (this.x < minX && this.vx <= 0 && open !== 'left') {
      this.x = minX;
      if (this.vx < 0) {
        this.vx = -this.vx * TUNING.wallBounce;
        if (Math.abs(this.vx) > 300) this.emit('bonk');
      }
    } else if (this.x > maxX && this.vx >= 0 && open !== 'right') {
      this.x = maxX;
      if (this.vx > 0) {
        this.vx = -this.vx * TUNING.wallBounce;
        if (Math.abs(this.vx) > 300) this.emit('bonk');
      }
    }

    // Ceiling.
    const minY = b.top + this.height;
    if (this.y < minY && open !== 'up') {
      this.y = minY;
      if (this.vy < 0) {
        this.vy = -this.vy * TUNING.wallBounce;
        this.emit('bonk');
      }
    }

    // Floor.
    if (this.y >= b.floor && this.vy >= 0 && open !== 'down') {
      this.y = b.floor;
      const impact = this.vy;
      if (this.softLanding) {
        // A deliberate drop onto another screen: land on his feet.
        this.softLanding = false;
        this.crossing = null;
        this.vx = 0;
        this.vy = 0;
        this.swing = 0;
        this.emit('land');
        this.enter('land', 0.35);
        return;
      }
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
        // The edge he's crossing through is open; the others are walls.
        const openLeft = this.crossing && this.crossing.dir === 'left';
        const openRight = this.crossing && this.crossing.dir === 'right';
        // Only a wall he's heading towards stops him (just after coming through
        // an edge, the wall behind him is still close).
        const hitWall = (dir < 0 && !openLeft && this.x <= minX) || (dir > 0 && !openRight && this.x >= maxX);
        if (arrived || hitWall) {
          if (!this.crossing) this.x = clamp(arrived ? this.targetX : this.x, minX, maxX);
          else if (arrived) this.x = this.targetX;
          this.vx = 0;
          this.arrive();
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
      case 'water':
      case 'stretch':
      case 'eyeRest':
      case 'bedtime':
      case 'note':
        // Holding up a nudge until you click it (or he gives up / it's done).
        this.vx = 0;
        if (this.stateTime >= this.stateDuration) this.nudgeTimedOut();
        break;
      default:
        this.vx = 0;
        if (this.stateTime >= this.stateDuration) this.chooseNext();
    }

    this.updateReminder();
    this.updateNudge();
    if (this.pendingGreet && this.isFreeForReaction() && !this.showingReminder() && !this.showingNudge()) this.react(this.pendingGreet);
    if (cursor) this.reactToCursor(dt, cursor);

    // Look towards the cursor when it's close and he's not busy.
    if (cursor && ['idle', 'sit', 'happy', 'curious', 'shy', 'wave'].includes(this.state)) {
      const dx = cursor.x - this.x;
      if (Math.abs(dx) > 20 && Math.abs(dx) < 400) this.facing = dx > 0 ? 1 : -1;
    }
  }

  /** Is the point over his body (or the sign he's holding up)? */
  isOver(point) {
    return this.hitPart(point) != null;
  }

  /** Which part of him the point is on: 'join' (the sign's Join tag), 'sign', 'body' or null. */
  hitPart(point) {
    const sx = point.x - this.x;
    const sy = this.y - point.y; // height above his feet
    if (BOARD_STATES.includes(this.state)) {
      const j = HIT.join;
      if (this.state === 'sign' && this.meetingLink() && sx >= j.left && sx <= j.right && sy >= j.bottom && sy <= j.top) return 'join';
      if (Math.abs(sx) <= HIT.signHalfWidth && sy >= HIT.signBottom && sy <= HIT.signTop) return 'sign';
    }
    const dx = sx / HIT.rx;
    const dy = (sy - HIT.cy) / HIT.ry;
    if (dx * dx + dy * dy <= 1) return 'body';
    return null;
  }

  /** The video call link of the meeting he's reminding you about (https only), or null. */
  meetingLink() {
    const r = this.reminder;
    const link = r && !r.acknowledged && r.event && r.event.link;
    return typeof link === 'string' && /^https:\/\//i.test(link) ? link : null;
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
    if (this.route && this.continueRoute()) return;
    this.crossing = null;
    const scored = brain.scoreActivities(this.needs, this.mood, this.context, {
      paused: this.paused,
      cursorKnown: !!this.lastCursor,
      last: this.lastActivity,
      grumpiness: this.grumpiness,
      afterLongWalk: this.lastActivity === 'walk' && this.lastMoveDistance > 350,
      canVisitScreen: this.reachableScreens().length > 0,
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
    if (ctx.reminder) this.reminder = { ...ctx.reminder, acknowledged: false };
    if (ctx.eventEnded) this.pendingGreet = this.pendingGreet || 'eventEnded';
    // First time he sees you on a new day: say good morning.
    if (ctx.day && !ctx.userAway && ctx.hour >= 5 && this.lastGreetDay !== ctx.day) {
      if (this.lastGreetDay) this.pendingGreet = this.pendingGreet || 'morning';
      this.lastGreetDay = ctx.day;
    }
    // Wake up when you come back (or when your meeting is about to start).
    if (this.state === 'sleep' && prev.userAway && !ctx.userAway) this.enter('surprised', 0.9);
    // You've joined a meeting: stop and sit down quietly where he is.
    if (ctx.quiet && !prev.quiet) this.settleForQuiet();
  }

  /** Stop whatever he's doing (walks, trips to other screens, props) and sit still. */
  settleForQuiet() {
    // Wellbeing nudges wait until after the meeting (notes and meeting reminders don't).
    if (this.nudge && this.nudge.kind !== 'note') {
      const showing = this.state === NUDGE[this.nudge.kind].state;
      this.nudge = null;
      if (showing) this.enter('sit', rand(24, 60, this.rng));
    }
    if (!this.isGrounded() || this.state === 'grabbed') return;
    if (!BUSY_WHEN_QUIET.includes(this.state)) return;
    if (this.afterMove && this.afterMove.state === 'sign') return; // on his way to show you a reminder
    this.route = null;
    this.crossing = null;
    this.afterMove = null;
    this.vx = 0;
    this.lastActivity = 'sit';
    this.enter('sit', rand(24, 60, this.rng));
  }

  // ---------------------------------------------------------------- reminders

  /** Holding up (or on his way to hold up) an unanswered meeting sign. */
  showingReminder() {
    return !!this.reminder && !this.reminder.acknowledged && this.headingFor('sign');
  }

  /** In `state`, or on his way (walking, or travelling between screens) to it. */
  headingFor(state) {
    return (
      this.state === state ||
      (!!this.afterMove && this.afterMove.state === state) ||
      (!!this.route && !!this.route.then && this.route.then.state === state)
    );
  }

  updateReminder() {
    const r = this.reminder;
    if (!r) return;
    const now = this.context.now;
    if (now >= r.event.end) {
      // The meeting's over: nothing to remind you about any more.
      this.reminder = null;
      if (this.state === 'sign') this.enter('idle', 2);
      return;
    }
    if (r.acknowledged) return;
    if (now >= r.event.start) r.kind = 'now';
    // Keep holding the sign up until you click it; come back to it after
    // being picked up, and show it when you return if you were away.
    if (!this.showingReminder() && this.isGrounded() && this.state !== 'grabbed' && !this.context.userAway) {
      if (REACTING.includes(this.state) && this.stateTime < this.stateDuration) return;
      this.pendingGreet = null;
      this.emit('reminder');
      this.goToCursorThen({ state: 'sign', duration: Infinity }, 'run');
    }
  }

  /** You clicked the sign (or him): got it. */
  acknowledgeReminder() {
    if (!this.reminder || this.reminder.acknowledged) return false;
    this.reminder.acknowledged = true;
    this.applyEffect('attention');
    this.emit('reminderAck');
    this.vx = 0;
    this.enter('wave', 1.8);
    return true;
  }

  // ---------------------------------------------------------------- nudges

  /** Holding up (or on his way to hold up) a nudge you haven't answered yet. */
  showingNudge() {
    const n = this.nudge;
    return !!n && !n.acknowledged && this.headingFor(NUDGE[n.kind].state);
  }

  /** Start a nudge that's due, or go back to one he was interrupted from. */
  updateNudge() {
    if (this.showingReminder()) return;
    // A meeting reminder still waiting for you comes first.
    if (this.reminder && !this.reminder.acknowledged) return;
    const free =
      this.isGrounded() &&
      !this.context.userAway &&
      !(REACTING.includes(this.state) && this.stateTime < this.stateDuration);
    const n = this.nudge;
    if (n) {
      if (this.showingNudge() || !free) return;
      // Interrupted (picked up, a meeting reminder, …): back to it if there's time left.
      const left = NUDGE[n.kind].hold - (this.time - n.shownAt);
      if (left <= 1) this.nudgeTimedOut();
      else this.presentNudge(n, left);
      return;
    }
    if (!free) return;
    const due = this.nudges.due(this.context);
    if (!due || (due.kind === 'eyes' && this.state === 'sleep')) return;
    this.nudge = { ...due, shownAt: this.time, acknowledged: false };
    this.nudges.shown(due, this.context);
    this.pendingGreet = null;
    this.emit('nudge');
    this.presentNudge(this.nudge, NUDGE[due.kind].hold);
  }

  presentNudge(n, duration) {
    const cfg = NUDGE[n.kind];
    if (cfg.walk) {
      this.goToCursorThen({ state: cfg.state, duration }, cfg.gait);
    } else {
      this.vx = 0;
      this.enter(cfg.state, duration);
    }
  }

  /** You clicked the nudge (or him): done. */
  acknowledgeNudge() {
    const n = this.nudge;
    if (!n || n.acknowledged) return false;
    n.acknowledged = true;
    this.nudge = null;
    this.nudges.done(n);
    this.applyEffect('nudgeThanks');
    this.emit(`${n.kind}Done`);
    this.vx = 0;
    if (n.kind === 'water') this.enter('drink', 2.4);
    else this.enter('nod', 1.4);
    return true;
  }

  /** Held it up long enough: the eye rest is done; water / stretch / bedtime are put off. */
  nudgeTimedOut() {
    const n = this.nudge;
    this.nudge = null;
    if (n && n.kind === 'eyes') {
      this.nudges.done(n);
      this.emit('eyesDone');
      this.enter('nod', 1.2);
      return;
    }
    if (n) {
      this.nudges.ignored(n);
      this.emit('nudgeLater');
    }
    this.enter('idle', 3);
  }

  /** "Remind me": add a note for `at` (ms epoch). */
  addNote(text, at) {
    return this.nudges.addNote(text, at);
  }

  removeNote(id) {
    if (this.nudge && this.nudge.kind === 'note' && this.nudge.note.id === id) {
      this.nudge = null;
      if (this.state === 'note') this.enter('idle', 2);
    }
    this.nudges.removeNote(id);
  }

  /** What he's holding up over his head (for the renderer), or null. */
  board() {
    const band = this.moodBand();
    const n = this.nudge;
    if (this.state === 'sign' && this.reminder) {
      const kind = this.reminder.kind;
      const key = kind === 'now' ? 'meetingNow' : kind === '30' ? 'meeting30' : 'meeting5';
      return {
        style: 'sign',
        line1: say(key, band),
        line2: this.reminder.event.title || '',
        tag: 'OK ✓',
        join: !!this.meetingLink(),
        urgent: kind === 'now',
      };
    }
    if (!n || this.state !== NUDGE[n.kind].state) return null;
    switch (n.kind) {
      case 'note':
        return { style: 'note', line1: n.note.text, line2: say('note', band), tag: 'OK ✓' };
      case 'water': {
        const g = this.nudges.water;
        return { style: 'bubble', line1: say('water', band), line2: g ? `${g} glass${g === 1 ? '' : 'es'} today` : 'first one today', tag: 'Drank ✓' };
      }
      case 'stretch': {
        const m = this.nudges.minutesSinceBreak();
        return { style: 'bubble', line1: say('stretch', band), line2: m ? `${m} min without a break` : '', tag: 'Done ✓' };
      }
      case 'bedtime':
        return { style: 'bubble', line1: say('bedtime', band), line2: `It's ${clockTime(this.context.now)}`, tag: 'OK ✓' };
      case 'eyes':
        return { style: 'bubble', line1: say('eyes', band), line2: `${Math.max(0, Math.ceil(this.stateDuration - this.stateTime))} s`, tag: null };
      default:
        return null;
    }
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
    // Your cursor is on another screen: go there through the edges.
    if (this.screens.length > 1) {
      const target = screensLib.screenAt(this.screens, this.lastCursor.x, this.lastCursor.y);
      if (target !== this.screenIndex && this.travelTo(target, this.lastCursor.x, then, gait)) return;
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
    if (this.moodBand() === 'sad') f *= 0.7; // trudging
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
      band: this.moodBand(),
      grumpiness: this.grumpiness,
      lastGreetDay: this.lastGreetDay,
      nudges: this.nudges.serialize(),
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
    this.nudges.restore(saved.nudges);
    this.catchUp(elapsed);
    return true;
  }

  /** Everything the "brain" debug view shows. */
  brainSnapshot() {
    return {
      state: this.state,
      needs: { ...this.needs },
      mood: this.mood,
      context: { ...this.context, screens: this.screens.length, screenIndex: this.screenIndex },
      reminder: this.reminder ? { title: this.reminder.event.title, kind: this.reminder.kind, acknowledged: this.reminder.acknowledged } : null,
      nudge: this.nudge ? { kind: this.nudge.kind, text: this.nudge.note ? this.nudge.note.text : null } : null,
      nudges: {
        water: this.nudges.water,
        settings: { ...this.nudges.settings },
        active: { ...this.nudges.active },
        quietHold: this.nudges.quietHold,
        notes: this.nudges.notes.map((n) => ({ ...n })),
      },
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
        this.startMove('walk', 150, 800);
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
        this.enter('idle', rand(6, 15, rng) * (this.context.quiet ? 2 : 1));
        break;
      case 'sit':
        this.enter('sit', rand(12, 30, rng) * (this.context.quiet ? 2 : 1));
        break;
      case 'lookAround':
        this.enter('lookAround', rand(3, 5, rng));
        break;
      case 'talk':
        this.enter('talk', rand(4, 6, rng));
        this.emit('talk');
        break;
      case 'eat':
        this.enter('eat', 5);
        this.emit('eat');
        break;
      case 'flower':
        this.enter('flower', rand(6, 10, rng));
        this.emit('flower');
        break;
      case 'backView':
        this.enter('backView', rand(6, 10, rng) * (this.context.quiet ? 2 : 1));
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
      case 'visitScreen': {
        // Wander over to a neighbouring screen, through the edge they share.
        const options = this.reachableScreens();
        const to = options[Math.floor(rng() * options.length)];
        const sc = to != null ? this.screens[to] : null;
        if (!sc || !this.travelTo(to, rand(sc.left + this.halfWidth + 60, sc.right - this.halfWidth - 60, rng), null, 'walk')) {
          this.startMove('walk', 150, 800);
        } else {
          this.emit('visitScreen');
        }
        break;
      }
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
    this.lastMoveDistance = Math.abs(this.targetX - this.x);
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
      band: this.moodBand(),
      energy: this.needs.energy,
      eventTitle: this.reminder ? this.reminder.event.title : this.context.nextEvent ? this.context.nextEvent.title : null,
      reminderKind: this.reminder && !this.reminder.acknowledged ? this.reminder.kind : null,
      petting: this.petting,
      quiet: !!this.context.quiet,
      board: this.board(),
      grumpy: this.time < this.grumpyUntil,
      time: this.time,
    };
  }
}

module.exports = { Companion, TUNING, STATES, MENU_ACTIVITIES, HIT, NUDGE };
