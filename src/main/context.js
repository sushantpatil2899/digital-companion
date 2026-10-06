'use strict';

// Turns raw signals from the computer (idle time, screen lock, sleep/wake,
// battery, clock, and later the front app and calendar) into the context
// object Togepi's brain uses (see defaultContext() in brain.js).
// No Electron imports, so it can be unit tested.

const { defaultContext } = require('./brain');

function dayString(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

class ContextTracker {
  /**
   * @param {object} [opts]
   * @param {number} [opts.awayAfter] seconds of no mouse/keyboard before you count as away
   * @param {() => number} [opts.now] clock (ms epoch), for tests
   */
  constructor(opts = {}) {
    this.awayAfter = opts.awayAfter || 180;
    this.now = opts.now || (() => Date.now());
    this.locked = false;
    this.suspended = false;
    this.idleSeconds = 0;
    this.away = false;
    this.awaySince = null;
    this.battery = { level: null, charging: null };
    this.onBattery = false;
    this.quiet = { on: false, reason: null, frontApp: null };
    this.calendar = { nextEvent: null, inEvent: null };
    this.alertedEvents = new Set(); // events we've already said "soon" about
    this.lastInEvent = null;
    this.pending = {}; // one-shot flags until the next snapshot
    this.notes = {}; // problems to show in the brain view, by source
  }

  /** A problem to show in the brain view (e.g. a permission was declined); null clears it. */
  setNote(source, message) {
    if (message) this.notes[source] = message;
    else delete this.notes[source];
  }

  setLocked(v) {
    this.locked = v;
  }

  setSuspended(v) {
    this.suspended = v;
  }

  setOnBattery(v) {
    this.onBattery = v;
  }

  /** From the renderer's navigator.getBattery(): { level 0..1, charging }. */
  setBattery(b) {
    if (!b || typeof b.level !== 'number') return;
    const wasCharging = this.battery.charging;
    this.battery = { level: Math.max(0, Math.min(1, b.level)), charging: !!b.charging };
    if (wasCharging === false && b.charging) this.pending.justPluggedIn = true;
    // navigator.getBattery() also tells us if we're on battery power.
    this.onBattery = !b.charging;
  }

  /** Front app / meeting detection (stage 2). */
  setQuiet(on, reason = null, frontApp = null) {
    this.quiet = { on: !!on, reason: on ? reason : null, frontApp };
  }

  /** Calendar events (stage 2): [{ title, start, end }] with ms epoch times. */
  setEvents(events) {
    const now = this.now();
    const list = (events || []).filter((e) => e && e.end > now).sort((a, b) => a.start - b.start);
    this.calendar.inEvent = list.find((e) => e.start <= now && e.end > now) || null;
    this.calendar.nextEvent = list.find((e) => e.start > now) || null;
  }

  /** Call every couple of seconds with the system idle time. Returns the context. */
  update(idleSeconds) {
    const now = this.now();
    this.idleSeconds = idleSeconds || 0;
    const away = this.locked || this.suspended || this.idleSeconds >= this.awayAfter;
    if (away && !this.away) {
      // Count the idle time that already passed as time away.
      this.awaySince = now - (this.locked || this.suspended ? 0 : this.idleSeconds * 1000);
    } else if (!away && this.away) {
      this.pending.justReturned = true;
      this.awaySince = null;
    }
    this.away = away;

    // Calendar: keep "now" and "next" current between calendar reads.
    const cal = this.calendar;
    if (cal.inEvent && cal.inEvent.end <= now) cal.inEvent = null;
    if (cal.nextEvent && cal.nextEvent.start <= now) {
      if (cal.nextEvent.end > now) cal.inEvent = cal.nextEvent;
      cal.nextEvent = null;
    }
    // "Starting soon" once per event (about 5 minutes before).
    if (cal.nextEvent && cal.nextEvent.start - now <= 5 * 60 * 1000) {
      const key = `${cal.nextEvent.title}@${cal.nextEvent.start}`;
      if (!this.alertedEvents.has(key)) {
        this.alertedEvents.add(key);
        this.pending.eventSoon = true;
      }
    }
    // "Just ended" when the event we were in is over.
    if (this.lastInEvent && !cal.inEvent) this.pending.eventEnded = true;
    this.lastInEvent = cal.inEvent;
    const inEvent = cal.inEvent;

    const date = new Date(now);
    const ctx = {
      ...defaultContext(),
      hour: date.getHours(),
      day: dayString(date),
      userAway: away,
      awayFor: away && this.awaySince != null ? (now - this.awaySince) / 1000 : 0,
      onBattery: this.onBattery,
      batteryLevel: this.battery.level,
      charging: this.battery.charging,
      quiet: this.quiet.on || !!inEvent,
      quietReason: this.quiet.on ? this.quiet.reason : inEvent ? 'calendar' : null,
      frontApp: this.quiet.frontApp,
      nextEvent: this.calendar.nextEvent,
      inEvent: this.calendar.inEvent,
      error: Object.values(this.notes).join(' ') || null,
      ...this.pending,
    };
    this.pending = {};
    return ctx;
  }
}

module.exports = { ContextTracker, dayString };
