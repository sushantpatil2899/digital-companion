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
    this.watching = null; // what you're watching (see src/main/mind/watching.js)
    this.music = null; // music you're playing (see src/main/mind/music.js)
    this.idleSeconds = 0;
    this.away = false;
    this.awaySince = null;
    this.battery = { level: null, charging: null };
    this.onBattery = false;
    // What the app watcher (macOS) sees; see setApps().
    this.apps = { watching: false, frontApp: null, frontKind: null, meetingAppVisible: false, meetingTab: false };
    this.calendar = { nextEvent: null, inEvent: null, alsoIn: [], events: [] };
    this.alertedEvents = new Set(); // events we've already said "soon" about
    this.lastInEvent = null;
    this.pending = {}; // one-shot flags until the next snapshot
    this.notes = {}; // problems to show in the brain view, by source
    this.calendarRead = null; // when the calendar was last read (ms)
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

  /**
   * You're watching something ('Netflix'…) or null. While you watch, not
   * touching the mouse or keyboard doesn't make you away (up to `maxIdle` s).
   */
  setWatching(name, maxIdle = 3 * 3600) {
    this.watching = name || null;
    this.watchMaxIdle = maxIdle;
  }

  /** Music you're playing ('Spotify'…), or null. */
  setMusic(name) {
    this.music = name || null;
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

  /**
   * What's on your screens (macOS "Notice which app I'm using").
   * @param {object} a
   * @param {boolean} a.watching          the feature is on
   * @param {string}  [a.frontApp]        name of the app in front
   * @param {string}  [a.frontKind]       'meeting' | 'presenting' | null for the front app
   * @param {boolean} [a.meetingAppVisible] a meeting app has a window showing on any screen
   * @param {boolean} [a.meetingTab]      a browser window on any screen shows a meeting tab
   */
  setApps(a) {
    this.apps = { watching: false, frontApp: null, frontBundle: null, frontKind: null, meetingAppVisible: false, meetingTab: false, ...a };
  }

  /** Calendar events (stage 2): [{ title, start, end }] with ms epoch times. */
  setEvents(events) {
    const now = this.now();
    this.calendar.events = (events || []).filter((e) => e && e.end > now).sort((a, b) => a.start - b.start);
    this.refreshEvents(now);
  }

  /** "In event" is the most recently started one (a call inside a long block); "next" the next to start. */
  refreshEvents(now) {
    const cal = this.calendar;
    cal.events = cal.events.filter((e) => e.end > now);
    const current = cal.events.filter((e) => e.start <= now).sort((a, b) => b.start - a.start || a.end - b.end);
    cal.inEvent = current[0] || null;
    cal.alsoIn = current.slice(1);
    cal.nextEvent = cal.events.find((e) => e.start > now) || null;
  }

  /** Call every couple of seconds with the system idle time. Returns the context. */
  update(idleSeconds) {
    const now = this.now();
    this.idleSeconds = idleSeconds || 0;
    const awayAfter = this.watching ? Math.max(this.awayAfter, this.watchMaxIdle) : this.awayAfter;
    const away = this.locked || this.suspended || this.idleSeconds >= awayAfter;
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
    this.refreshEvents(now);
    // Reminders: once at ~30 minutes before an event and once at ~5 minutes.
    if (cal.nextEvent) {
      const left = cal.nextEvent.start - now;
      const key = `${cal.nextEvent.title}@${cal.nextEvent.start}`;
      if (left <= 5 * 60 * 1000) {
        if (!this.alertedEvents.has(`${key}#5`)) {
          this.alertedEvents.add(`${key}#5`);
          this.alertedEvents.add(`${key}#30`); // too late for the 30-minute one
          this.pending.reminder = { kind: '5', event: cal.nextEvent };
        }
      } else if (left <= 30 * 60 * 1000 && !this.alertedEvents.has(`${key}#30`)) {
        this.alertedEvents.add(`${key}#30`);
        this.pending.reminder = { kind: '30', event: cal.nextEvent };
      }
    }
    // "Just ended" when the event we were in is over.
    if (this.lastInEvent && !cal.inEvent) this.pending.eventEnded = true;
    this.lastInEvent = cal.inEvent;
    const inEvent = cal.inEvent;

    // Quiet only when you're actually in a meeting (or presenting). With app
    // watching off we can't tell, so a calendar event counts as a meeting.
    // `meetingCheck` says why (or why not), for the brain view.
    const a = this.apps;
    let quietReason = null;
    let meetingCheck;
    if (a.watching) {
      if (a.frontKind === 'presenting') quietReason = 'presenting';
      else if (a.frontKind === 'meeting') quietReason = `meeting (${a.frontApp})`;
      else if (a.meetingTab) quietReason = 'meeting (browser tab)';
      else if (a.meetingAppVisible && inEvent) quietReason = 'meeting (on another screen)';
      if (quietReason) meetingCheck = `quiet: ${quietReason}`;
      else if (a.meetingAppVisible) meetingCheck = 'not quiet: a meeting app is open, but not in front and no calendar event is on';
      else if (!a.frontApp) meetingCheck = "not quiet: haven't seen the front app yet";
      else meetingCheck = `not quiet: ${a.frontApp} isn't a meeting app and no meeting tab is showing`;
    } else if (inEvent) {
      quietReason = 'calendar event';
      meetingCheck = 'quiet: calendar event (turn on "Notice which app I\'m using" to only be quiet in actual meetings)';
    } else {
      meetingCheck = 'not quiet: no calendar event, and app watching is off';
    }

    const date = new Date(now);
    const ctx = {
      ...defaultContext(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      day: dayString(date),
      userAway: away,
      awayFor: away && this.awaySince != null ? (now - this.awaySince) / 1000 : 0,
      onBattery: this.onBattery,
      batteryLevel: this.battery.level,
      charging: this.battery.charging,
      now,
      quiet: !!quietReason,
      quietReason,
      presenting: quietReason === 'presenting',
      watching: this.watching,
      music: this.music,
      frontApp: a.watching ? a.frontApp : null,
      frontBundle: a.watching ? a.frontBundle : null,
      frontKind: a.watching ? a.frontKind : null,
      meetingCheck,
      alsoInEvents: cal.alsoIn,
      visibleApps: a.watching && a.visibleApps ? a.visibleApps : [],
      nextEvent: this.calendar.nextEvent,
      calendarRead: this.calendarRead,
      inEvent: this.calendar.inEvent,
      error: Object.values(this.notes).join(' ') || null,
      ...this.pending,
    };
    this.pending = {};
    return ctx;
  }
}

module.exports = { ContextTracker, dayString };
