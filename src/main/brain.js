'use strict';

// Togepi's "brain": needs, mood and how he decides what to do next.
// Pure functions over plain objects so it can be unit tested without Electron.
//
// Needs are 0..1:
//   energy    1 = rested, 0 = exhausted        (drains while active, refills asleep)
//   hunger    0 = full,   1 = starving         (rises over time, eating lowers it)
//   boredom   0 = busy,   1 = very bored       (rises while idle, play lowers it)
//   affection 1 = loved,  0 = lonely           (decays, pats and hugs raise it)
// Mood is -1 (sad) .. 1 (cheerful). It slowly drifts towards what his needs
// suggest, and is nudged directly by you: pats and hugs lift it, throws drop
// it. His own activities only help through his needs (eating fixes hunger,
// which lifts his mood), so he can't simply cheer himself up.
// Rough handling also makes him grumpy for a few minutes (grumpiness, kept by
// the companion), which overrides the mood band.

const NEEDS = {
  // Per-second drift rates.
  energyDrain: 1 / 3600, // ~60 min of normal activity from full to empty
  energySleep: 1 / 480, // ~8 min of sleep from empty to full
  hungerRise: 1 / 4500, // ~75 min from full to starving (hungry after ~40)
  boredomRise: 1 / 600, // ~10 min of doing nothing to be very bored
  boredomFall: 1 / 300, // while moving around / exploring
  affectionDecay: 1 / 5400, // ~90 min from loved to lonely
  // After asking for attention he waits before asking again; each time he's
  // ignored the wait doubles (4, 8, 16, 32 min), until you give him attention.
  seekCooldown: 240,
  sadCooldown: 120, // s between sad spells (doubles the same way)
  attentionGrace: 600, // s after a pat/hug before he asks for attention again
  moodDrift: 1 / 240, // how fast mood follows his needs (changes over minutes)
  grumpyFade: 1 / 180, // grumpiness fades in ~3 min
  grumpyPerThrow: 0.35,
  // Wanders over to another screen after staying on one for a while: never
  // before visitAfter seconds, then more and more likely over visitRamp.
  visitAfter: 300,
  visitRamp: 600,
  // Asks you to play when he's getting bored, but before he's properly bored
  // (early enough that he still asks when you keep him company: about one ask
  // every 2-3 hours then, about two an hour when he's left alone).
  inviteFrom: 0.3,
  inviteTo: 0.8,
  // How hard each kind of state works him (multiplies energyDrain).
  effort: { run: 3, play: 3, adventure: 2.5, jump: 2.5, walk: 1.5, grabbed: 1.5, fall: 1.5, sit: 0.4, sleep: 0 },
  // States where he's not doing anything interesting (boredom rises).
  still: ['idle', 'sit', 'lookAround', 'backView', 'sad'],
  // States where he's exploring (boredom falls).
  busy: ['run', 'play', 'adventure', 'eat', 'flower', 'talk', 'jump', 'watchBall', 'pickBall', 'ttt'],
};

// One-off changes when he starts an activity (or is interacted with).
const EFFECTS = {
  eat: { hunger: -0.65, energy: 0.05 },
  play: { boredom: -0.4, energy: -0.04 },
  adventure: { boredom: -0.55, energy: -0.06 },
  visitScreen: { boredom: -0.35, energy: -0.04 },
  flower: { boredom: -0.15 },
  talk: { boredom: -0.1 },
  run: { boredom: -0.12 },
  jump: { boredom: -0.08 },
  pat: { affection: 0.22, mood: 0.15 },
  hugPerSecond: { affection: 0.15, mood: 0.15 },
  throw: { mood: -0.18, affection: -0.04 },
  drop: { mood: -0.02 },
  attention: { affection: 0.03 }, // you asked him to do something / called him
  nudgeThanks: { affection: 0.04, mood: 0.03 }, // you answered one of his nudges
  fetchRound: { boredom: -0.2, affection: 0.08, mood: 0.06 }, // you threw the ball and he brought it back
  gameRound: { boredom: -0.35, affection: 0.1, mood: 0.08 }, // a game of tic-tac-toe with you
  pluggedIn: { energy: 0.15, mood: 0.1 },
};

// Context he lives in. Filled in by the ContextTracker (src/main/context.js).
/** Today at 12:00 local time (ms), so a default context's clock matches its hour. */
function middayToday() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

function defaultContext() {
  return {
    hour: 12, // local hour, 0..23
    day: null, // 'YYYY-MM-DD'
    userAway: false, // idle for a while, screen locked or Mac asleep
    awayFor: 0, // seconds
    justReturned: false, // one-shot: you came back after being away
    onBattery: false,
    batteryLevel: null, // 0..1, null if unknown
    charging: null,
    justPluggedIn: false, // one-shot
    quiet: false, // in a meeting / presenting: keep still and quiet
    quietReason: null,
    frontApp: null,
    visibleApps: [], // apps with a window showing on any screen
    nextEvent: null, // { title, start, end } (ms epoch)
    inEvent: null,
    now: middayToday(), // wall clock (ms); the real one comes from the ContextTracker
    presenting: false,
    reminder: null, // one-shot: { kind: '30' | '5', event } an event starts soon
    eventEnded: false, // one-shot
  };
}

function defaultNeeds() {
  return { energy: 0.85, hunger: 0.25, boredom: 0.3, affection: 0.7 };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function apply(needs, mood, effect, scale = 1) {
  for (const k of ['energy', 'hunger', 'boredom', 'affection']) {
    if (effect[k]) needs[k] = clamp01(needs[k] + effect[k] * scale);
  }
  return Math.max(-1, Math.min(1, mood + (effect.mood || 0) * scale));
}

// What mood his needs "suggest", -1..1:
//   all needs fine              ~ +0.3..0.4 content
//   well loved and needs fine   ~ +0.7      cheerful
//   one need clearly unmet      ~  0        meh
//   two unmet / very lonely     <  -0.3     sad
function moodTarget(needs) {
  const hungry = clamp01((needs.hunger - 0.5) / 0.4);
  const tired = clamp01((0.35 - needs.energy) / 0.3);
  const bored = clamp01((needs.boredom - 0.6) / 0.35);
  const lonely = clamp01((0.4 - needs.affection) / 0.35);
  const loved = clamp01((needs.affection - 0.6) / 0.4);
  const t = 0.3 + 0.45 * loved - 0.4 * hungry - 0.35 * tired - 0.3 * bored - 0.65 * lonely;
  return Math.max(-1, Math.min(1, t));
}

/** Which face/mood he shows. */
function moodBand(mood, grumpiness = 0) {
  if (grumpiness > 0.3) return 'grumpy';
  if (mood > 0.45) return 'cheerful';
  if (mood > 0.1) return 'content';
  if (mood > -0.25) return 'meh';
  return 'sad';
}

/** Advance needs and mood by `dt` seconds while in `state`. Returns the new mood. */
function drift(needs, mood, state, dt, ctx = defaultContext()) {
  if (state === 'sleep') {
    needs.energy = clamp01(needs.energy + NEEDS.energySleep * dt);
  } else {
    let effort = NEEDS.effort[state] != null ? NEEDS.effort[state] : 1;
    if (ctx.batteryLevel != null && ctx.onBattery && ctx.batteryLevel < 0.2) effort *= 1.6; // low battery tires him
    if (ctx.hour >= 23 || ctx.hour < 6) effort *= 1.4; // and so does staying up late
    needs.energy = clamp01(needs.energy - NEEDS.energyDrain * effort * dt);
  }
  // Hunger rises slower while asleep.
  needs.hunger = clamp01(needs.hunger + NEEDS.hungerRise * (state === 'sleep' ? 0.4 : 1) * dt);
  if (NEEDS.still.includes(state)) needs.boredom = clamp01(needs.boredom + NEEDS.boredomRise * dt);
  else if (NEEDS.busy.includes(state)) needs.boredom = clamp01(needs.boredom - NEEDS.boredomFall * dt);
  // He misses you less while asleep or while you're away from the computer.
  const missing = state === 'sleep' || ctx.userAway ? 0.3 : 1;
  needs.affection = clamp01(needs.affection - NEEDS.affectionDecay * missing * dt);
  const target = moodTarget(needs);
  return mood + (target - mood) * Math.min(1, NEEDS.moodDrift * dt);
}

/**
 * Catch up on time that passed while the app wasn't running (or the Mac was
 * asleep). He's assumed to have mostly slept: rested, a bit hungry, missing you.
 */
function catchUp(needs, mood, seconds) {
  const s = Math.max(0, Math.min(seconds, 12 * 3600));
  if (s < 1) return mood;
  needs.energy = clamp01(needs.energy + s / 1200);
  needs.hunger = clamp01(needs.hunger + (s / 4500) * 0.5);
  needs.boredom = clamp01(needs.boredom + (0.45 - needs.boredom) * Math.min(1, s / 3600));
  needs.affection = Math.max(Math.min(needs.affection, 0.2), clamp01(needs.affection - (s / 5400) * 0.6));
  return mood + (moodTarget(needs) - mood) * Math.min(1, s / 600);
}

const ALL = ['walk', 'run', 'idle', 'sit', 'lookAround', 'jump', 'talk', 'eat', 'flower', 'play', 'adventure', 'visitScreen', 'backView', 'sleep', 'sad', 'seek', 'invite'];
// Still, silent things he may do while "Stay put" is on or you're in a meeting.
const STAY = ['idle', 'sit', 'lookAround', 'eat', 'flower', 'backView', 'sleep', 'sad', 'talk'];
// In a meeting he keeps still: no walking, no props, nothing that catches your eye.
const QUIET = ['idle', 'sit', 'backView', 'sleep'];
const ENERGETIC = ['run', 'jump', 'play', 'adventure', 'visitScreen'];

/**
 * Score every activity he could start now. Higher = more appealing.
 * @param {object} needs
 * @param {number} mood
 * @param {object} ctx context (see defaultContext)
 * @param {object} opts { paused, cursorKnown, last, rng, canVisitScreen, screenStay, ... }
 * @returns {{name:string, score:number, why:string}[]} sorted, best first
 */
function scoreActivities(needs, mood, ctx, opts = {}) {
  const { energy, hunger, boredom, affection } = needs;
  const tired = 1 - energy;
  const happy = Math.max(0, mood);
  const night = ctx.hour >= 22 || ctx.hour < 6;
  const lowBattery = ctx.onBattery && ctx.batteryLevel != null && ctx.batteryLevel < 0.2;
  const criticalBattery = ctx.onBattery && ctx.batteryLevel != null && ctx.batteryLevel < 0.1;
  const rng = opts.rng || Math.random;
  // The longer he's been on this screen, the more he feels like going to another one.
  const stay = opts.screenStay || 0;
  const wanderlust = stay < NEEDS.visitAfter ? 0 : 0.2 + 1.3 * clamp01((stay - NEEDS.visitAfter) / NEEDS.visitRamp);
  // Getting bored (not yet properly bored): a good time to ask you to play.
  const gettingBored = boredom >= NEEDS.inviteFrom && boredom < NEEDS.inviteTo;

  const s = {
    walk: [0.4 + 0.1 * boredom + 0.1 * energy, 'wander'],
    run: [energy > 0.5 ? 0.1 + 0.35 * happy * energy : 0, 'full of beans'],
    idle: [0.4, 'chill'],
    sit: [0.2 + 0.6 * tired, 'rest legs'],
    lookAround: [0.2 + 0.25 * boredom, 'curious'],
    jump: [energy > 0.4 ? 0.08 + 0.3 * happy * energy : 0, 'happy hop'],
    talk: [0.15 + 0.3 * happy, 'chatty'],
    eat: [hunger > 0.5 ? 1.6 * hunger * hunger : 0, 'hungry'],
    flower: [0.12 + 0.2 * happy, 'smell flowers'],
    play: [energy > 0.3 ? 0.05 + 1.2 * boredom * energy : 0, 'bored'],
    adventure: [energy > 0.5 ? 0.04 + 0.8 * boredom * energy : 0, 'restless'],
    backView: [0.12, 'watch your screen'],
    // Only offered when there's another screen he can walk to.
    visitScreen: [opts.canVisitScreen && energy > 0.25 && wanderlust > 0 ? wanderlust + 0.3 * boredom : 0, `been on this screen ${Math.round(stay / 60)} min`],
    sleep: [energy < 0.55 ? 1.8 * tired * tired : 0, 'tired'],
    sad: [affection < 0.35 && opts.sadReady !== false ? 1.3 * (0.35 - affection) / 0.35 : 0, 'lonely'],
    seek: [affection < 0.45 && opts.cursorKnown && opts.seekReady !== false ? 0.4 + 1.2 * (0.45 - affection) / 0.45 : 0, 'wants attention'],
    invite: [gettingBored && energy > 0.3 && opts.cursorKnown ? 0.7 + 1.5 * (boredom - NEEDS.inviteFrom) / (NEEDS.inviteTo - NEEDS.inviteFrom) : 0, 'getting bored, wants to play'],
  };
  // Only list the base reason when it actually contributes.
  const why = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v[0] > 0 ? [v[1]] : []]));
  const add = (name, amount, reason) => {
    s[name][0] += amount;
    why[name].push(reason);
  };
  const scale = (name, f, reason) => {
    s[name][0] *= f;
    why[name].push(reason);
  };

  if (night) {
    add('sleep', 0.5 + 0.6 * tired, 'night');
    for (const n of ENERGETIC) scale(n, 0.4, 'night');
  }
  if (lowBattery) {
    add('sleep', criticalBattery ? 1.2 : 0.3, 'battery low');
    add('sit', 0.35, 'battery low');
    for (const n of ENERGETIC) scale(n, 0.3, 'battery low');
  }
  if (ctx.userAway) {
    // Nothing to do without you around: nap.
    add('sleep', 0.9 + Math.min(1, ctx.awayFor / 600), 'you are away');
    scale('seek', 0, 'you are away');
    scale('invite', 0, 'you are away');
    scale('sad', 0.3, 'you are away');
    for (const n of ['walk', 'run', 'play', 'adventure', 'visitScreen', 'talk', 'jump']) scale(n, 0.4, 'you are away');
  }
  // Sad and seeking you don't make sense when he's fairly content.
  if (mood > 0.4) scale('sad', 0.3, 'in a good mood');

  // His mood colours what he feels like doing.
  const band = moodBand(mood, opts.grumpiness || 0);
  if (band === 'sad') {
    for (const n of ['run', 'jump', 'adventure', 'invite']) scale(n, 0, 'feeling sad');
    scale('visitScreen', 0.5, 'feeling sad');
    if (boredom < 0.85) scale('play', 0.3, 'feeling sad');
    scale('talk', 0.3, 'feeling sad');
    scale('flower', 0.5, 'feeling sad');
    add('sit', 0.3, 'feeling sad');
    add('idle', 0.1, 'feeling sad');
  } else if (band === 'meh') {
    for (const n of ['run', 'jump']) scale(n, 0.5, 'meh');
    scale('talk', 0.6, 'meh');
    add('walk', 0.1, 'meh');
    add('sit', 0.1, 'meh');
  } else if (band === 'cheerful') {
    add('jump', 0.15, 'cheerful');
    add('run', 0.1, 'cheerful');
    add('talk', 0.15, 'cheerful');
    add('flower', 0.1, 'cheerful');
  } else if (band === 'grumpy') {
    scale('talk', 0.2, 'grumpy');
    scale('seek', 0, 'grumpy');
    scale('invite', 0, 'grumpy');
    scale('flower', 0.5, 'grumpy');
  }
  // After a long walk, have a rest.
  if (opts.afterLongWalk) {
    add('sit', 0.2, 'just walked a long way');
    add('idle', 0.1, 'just walked a long way');
  }

  let allowed = ALL;
  if (opts.paused) allowed = STAY;
  if (ctx.quiet) allowed = allowed.filter((n) => QUIET.includes(n));

  const out = [];
  for (const name of allowed) {
    let score = s[name][0];
    if (score <= 0) continue;
    if (opts.last === name && name !== 'sleep') score *= 0.6; // variety
    score += rng() * 0.25; // a little unpredictability
    out.push({ name, score, why: why[name].join(', ') });
  }
  if (!out.length) out.push({ name: 'idle', score: 0.1, why: 'nothing else allowed' });
  return out.sort((a, b) => b.score - a.score);
}

/** Pick from scored activities: usually the best, sometimes the runner-up. */
function pick(scored, rng = Math.random) {
  if (scored.length > 1 && rng() < 0.2 && scored[1].score > scored[0].score * 0.7) return scored[1];
  return scored[0];
}

module.exports = { NEEDS, EFFECTS, defaultNeeds, defaultContext, drift, catchUp, apply, moodTarget, moodBand, scoreActivities, pick, STAY, QUIET };
