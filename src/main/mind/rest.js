'use strict';

// Phase 5: the two models take about 11 GB of memory and use the battery
// while they run, so they rest when nobody needs them:
// - you've been away a while (15 min by default; Mind → Rest the models after I'm away)
// - it's night and he's asleep
// - the Mac is on battery below 20% (restBattery in settings.json)
// Before resting, his diary and weekly reflection get done; when you're back
// (or he wakes up, or you plug in) they start again. A "Try it now" action
// keeps them awake for a few minutes whatever the reason.
// No Electron imports, so it can be unit tested.

const REST = {
  nightFrom: 22, // h, "night" as in the brain view
  nightTo: 6,
  batteryHysteresis: 5, // % above the threshold before they come back on battery
  forceFor: 10 * 60 * 1000, // ms a "Try it now" keeps them awake
};

/**
 * Why the models should rest right now, or null.
 * @param {object} ctx  { userAway, awayFor (s), asleep, hour, onBattery, charging, batteryLevel (0..1) }
 * @param {object} s    { restAfterAway (min, 0 = never), restBattery (%, 0 = never) }
 * @param {object|null} current the reason they're resting now (for the battery hysteresis)
 */
function restReason(ctx, s, current = null) {
  const level = Number.isFinite(ctx.batteryLevel) ? ctx.batteryLevel * 100 : null;
  const threshold = s.restBattery + (current && current.kind === 'battery' ? REST.batteryHysteresis : 0);
  if (s.restBattery > 0 && ctx.onBattery && !ctx.charging && level != null && level < threshold) {
    return { kind: 'battery', text: `on battery at ${Math.round(level)}%` };
  }
  if (s.restAfterAway > 0 && ctx.userAway && (ctx.awayFor || 0) >= s.restAfterAway * 60) {
    return { kind: 'away', text: `you've been away ${Math.floor(ctx.awayFor / 60)} min` };
  }
  const night = ctx.hour >= REST.nightFrom || ctx.hour < REST.nightTo;
  if (ctx.asleep && night) return { kind: 'night', text: "it's night and he's asleep" };
  return null;
}

/**
 * What to do with the models: 'start', 'stop', 'work' (do the diary /
 * reflection now, then rest) or null (leave them).
 * @param {object} o { reason, workDue, running, busy, forced }
 *   running: started or starting; busy: thinking or writing right now;
 *   forced: a "Try it now" wants them awake.
 */
function restPlan({ reason, workDue = false, running, busy = false, forced = false }) {
  // Low battery: his diary can wait (missed days are written later).
  const work = !!workDue && !!reason && reason.kind !== 'battery';
  const want = !reason || work || forced;
  if (want && !running) return 'start';
  if (!want && running) return busy ? null : 'stop';
  if (running && work && !busy) return 'work';
  return null;
}

module.exports = { REST, restReason, restPlan };
