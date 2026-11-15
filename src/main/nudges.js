'use strict';

// Gentle nudges Togepi gives you: drink water, stretch, rest your eyes, go to
// bed, and "remind me" notes. Pure (no Electron) so it can be unit tested.
//
// Wellbeing timers only run while you're actually at the computer: not while
// you're away, and not during meetings. Being away for 5+ minutes counts as a
// break. The companion (src/main/companion.js) shows the nudges; this decides
// when they're due and keeps count.

function dayString(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Settings (stored in settings.json under "nudges"). Times in minutes.
const NUDGE_DEFAULTS = {
  water: true,
  waterEvery: 45,
  stretch: true,
  stretchEvery: 50,
  eyes: true,
  eyesEvery: 20,
  bedtime: '23:00', // 'HH:MM', or '' for off
};

const TIMING = {
  hold: 120, // s he holds up water / stretch / bedtime before putting it down
  retry: 600, // s until he tries again after being ignored
  breakAfter: 300, // s away that count as a break (resets stretch and eyes)
  afterMeeting: 300, // s after a meeting before wellbeing nudges come back
  gap: 180, // s at least between two wellbeing nudges
  eyeRest: 20, // s of looking far away
  bedtimeRepeat: 1800, // s between bedtime nudges while you're still up
};

// Most important first.
const PRIORITY = ['note', 'bedtime', 'water', 'stretch', 'eyes'];

function minutesOf(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Is it past your bedtime? Nights run until 5am, so a bedtime of 00:30 means
 * half past midnight that same night.
 * @returns {string|null} the night (date it started) if past bedtime, else null
 */
function pastBedtime(bedtime, nowMs) {
  let bed = minutesOf(bedtime);
  if (bed == null) return null;
  const d = new Date(nowMs);
  let mins = d.getHours() * 60 + d.getMinutes();
  const early = mins < 5 * 60;
  if (early) mins += 24 * 60;
  if (bed < 5 * 60) bed += 24 * 60;
  if (mins < bed || mins >= 29 * 60) return null;
  return dayString(new Date(nowMs - (early ? 24 * 3600 * 1000 : 0)));
}

class NudgeTracker {
  constructor(settings = {}) {
    this.settings = { ...NUDGE_DEFAULTS };
    this.setSettings(settings);
    this.active = { water: 0, stretch: 0, eyes: 0 }; // s of active use since each was last done
    this.quietHold = 0; // s left before wellbeing nudges may come back after a meeting
    this.sinceLast = Infinity; // s since the last wellbeing nudge
    this.day = null;
    this.water = 0; // glasses today
    this.bedtime = { night: null, done: false, lastAt: -Infinity }; // lastAt: ms
    this.notes = []; // [{ id, text, at (ms) }]
    this.nextNoteId = 1;
  }

  setSettings(s) {
    for (const k of Object.keys(NUDGE_DEFAULTS)) {
      if (s && s[k] !== undefined && typeof s[k] === typeof NUDGE_DEFAULTS[k]) this.settings[k] = s[k];
    }
  }

  /** Advance the clocks. `ctx` is his context (see defaultContext in brain.js). */
  tick(dt, ctx) {
    const day = ctx.day || dayString(new Date(ctx.now));
    if (day !== this.day) {
      if (this.day) this.water = 0;
      this.day = day;
    }
    this.sinceLast += dt;
    if (ctx.userAway) {
      if (ctx.awayFor >= TIMING.breakAfter) {
        this.active.stretch = 0;
        this.active.eyes = 0;
      }
      return;
    }
    if (ctx.quiet) {
      this.quietHold = TIMING.afterMeeting;
      return;
    }
    this.quietHold = Math.max(0, this.quietHold - dt);
    for (const k of Object.keys(this.active)) this.active[k] += dt;
  }

  /** The most important nudge that's due now, or null. */
  due(ctx) {
    const due = [];
    const note = this.notes.filter((n) => n.at <= ctx.now).sort((a, b) => a.at - b.at)[0];
    if (note) due.push({ kind: 'note', note });
    const s = this.settings;
    const wellbeingOk = !ctx.userAway && !ctx.quiet && !ctx.presenting && this.quietHold <= 0 && this.sinceLast >= TIMING.gap;
    if (wellbeingOk) {
      const night = s.bedtime ? pastBedtime(s.bedtime, ctx.now) : null;
      if (night && !(this.bedtime.night === night && this.bedtime.done) && ctx.now - this.bedtime.lastAt >= TIMING.bedtimeRepeat * 1000) {
        due.push({ kind: 'bedtime', night });
      }
      // Water, stretch and eye breaks wait while you're watching something together.
      if (!ctx.watching) {
        if (s.water && this.active.water >= s.waterEvery * 60) due.push({ kind: 'water' });
        if (s.stretch && this.active.stretch >= s.stretchEvery * 60) due.push({ kind: 'stretch' });
        if (s.eyes && this.active.eyes >= s.eyesEvery * 60) due.push({ kind: 'eyes' });
      }
    }
    due.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
    return due[0] || null;
  }

  /** He's started showing this nudge. */
  shown(nudge, ctx) {
    if (nudge.kind !== 'note') this.sinceLast = 0;
    if (nudge.kind === 'bedtime') {
      if (this.bedtime.night !== nudge.night) this.bedtime = { night: nudge.night, done: false, lastAt: -Infinity };
      this.bedtime.lastAt = ctx.now;
    }
  }

  /** You clicked it (or the eye rest ran its course). */
  done(nudge) {
    switch (nudge.kind) {
      case 'water':
        this.active.water = 0;
        this.water += 1;
        break;
      case 'stretch':
        this.active.stretch = 0;
        this.active.eyes = 0; // you looked away from the screen too
        break;
      case 'eyes':
        this.active.eyes = 0;
        break;
      case 'bedtime':
        this.bedtime.done = true;
        break;
      case 'note':
        this.removeNote(nudge.note.id);
        break;
      default:
    }
  }

  /** You didn't click it in time: try again later. */
  ignored(nudge) {
    const s = this.settings;
    if (nudge.kind === 'water') this.active.water = Math.max(0, s.waterEvery * 60 - TIMING.retry);
    if (nudge.kind === 'stretch') this.active.stretch = Math.max(0, s.stretchEvery * 60 - TIMING.retry);
    // Bedtime comes back by itself after bedtimeRepeat; notes wait for a click.
  }

  /** Minutes of screen time since your last break (for the stretch sign). */
  minutesSinceBreak() {
    return Math.round(this.active.stretch / 60);
  }

  addNote(text, at) {
    const t = String(text || '').trim().slice(0, 120);
    if (!t || !Number.isFinite(at)) return null;
    const note = { id: this.nextNoteId++, text: t, at };
    this.notes.push(note);
    return note;
  }

  removeNote(id) {
    this.notes = this.notes.filter((n) => n.id !== id);
  }

  serialize() {
    return {
      day: this.day,
      water: this.water,
      active: { ...this.active },
      bedtime: { ...this.bedtime, lastAt: Number.isFinite(this.bedtime.lastAt) ? this.bedtime.lastAt : null },
      notes: this.notes.map((n) => ({ ...n })),
      nextNoteId: this.nextNoteId,
    };
  }

  restore(saved) {
    if (!saved || typeof saved !== 'object') return;
    if (typeof saved.day === 'string') this.day = saved.day;
    if (Number.isFinite(saved.water)) this.water = saved.water;
    if (saved.active) {
      for (const k of Object.keys(this.active)) if (Number.isFinite(saved.active[k])) this.active[k] = saved.active[k];
    }
    if (saved.bedtime) {
      this.bedtime = {
        night: typeof saved.bedtime.night === 'string' ? saved.bedtime.night : null,
        done: !!saved.bedtime.done,
        lastAt: Number.isFinite(saved.bedtime.lastAt) ? saved.bedtime.lastAt : -Infinity,
      };
    }
    if (Array.isArray(saved.notes)) {
      this.notes = saved.notes
        .filter((n) => n && typeof n.text === 'string' && Number.isFinite(n.at) && Number.isFinite(n.id))
        .map((n) => ({ id: n.id, text: n.text, at: n.at }));
    }
    const maxId = this.notes.reduce((m, n) => Math.max(m, n.id), 0);
    this.nextNoteId = Math.max(Number.isFinite(saved.nextNoteId) ? saved.nextNoteId : 1, maxId + 1);
  }
}

// ------------------------------------------------------------------ words

// What he says, by mood: cheerful | content | meh | sad | grumpy. When he's
// sad or cross he still reminds you, just not with a smile.
// Togepi's sign texts (the active character's are passed to say()).
const TEXT = require('../characters/togepi/lines').signs;

/** The text for sign `key` in mood `band`, from `texts` (a character's signs). */
function say(key, band, texts = TEXT) {
  const t = texts[key];
  return (t && (t[band] || t.content)) || '';
}

function clockTime(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

module.exports = { NudgeTracker, NUDGE_DEFAULTS, TIMING, PRIORITY, pastBedtime, minutesOf, say, clockTime, TEXT };
