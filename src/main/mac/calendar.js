'use strict';

// Reads upcoming events from the Mac Calendar app (macOS only) by running
// calendar.jxa.js with osascript every few minutes.

const path = require('path');
const { run } = require('./run');

const SCRIPT = path.join(__dirname, 'calendar.jxa.js').replace('app.asar', 'app.asar.unpacked');

const MESSAGES = {
  denied: 'Calendar access was declined. Allow Togepi in System Settings → Privacy & Security → Calendars.',
  restricted: 'Calendar access is restricted on this Mac.',
  'write-only': 'Togepi only has "add events" access. Change it to Full Access in System Settings → Privacy & Security → Calendars.',
  'not determined': 'Calendar permission prompt was not answered (or could not be shown — see the README).',
};

/** Parse the script's JSON output into { events } or { error }. */
function parseCalendarOutput(out) {
  let data;
  try {
    data = JSON.parse(String(out).trim());
  } catch {
    return { error: `Unexpected calendar output: ${String(out).slice(0, 120)}` };
  }
  if (data.error) return { error: MESSAGES[data.error] || `Calendar: ${data.error}` };
  const events = (data.events || [])
    .filter((e) => e && Number.isFinite(e.start) && Number.isFinite(e.end) && e.end > e.start)
    .map((e) => ({ title: String(e.title || 'Event').slice(0, 80), start: e.start, end: e.end }));
  return { events };
}

async function readEvents(hours = 12) {
  try {
    // Generous timeout: the first run waits for you to answer the permission prompt.
    const out = await run('/usr/bin/osascript', ['-l', 'JavaScript', SCRIPT, String(hours)], 150000);
    return parseCalendarOutput(out);
  } catch (e) {
    return { error: `Couldn't read the calendar: ${e.message.split('\n').slice(-1)[0] || e.message}` };
  }
}

class CalendarWatcher {
  /** @param {(result: {events?: object[], error?: string}) => void} onResult */
  constructor(onResult, intervalMs = 5 * 60 * 1000) {
    this.onResult = onResult;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.busy = false;
  }

  start() {
    if (this.timer || process.platform !== 'darwin') return;
    this.timer = setInterval(() => this.poll(), this.intervalMs);
    this.poll();
  }

  async poll() {
    if (this.busy || !this.timer) return;
    this.busy = true;
    try {
      const r = await readEvents();
      if (this.timer) this.onResult(r);
    } finally {
      this.busy = false;
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = { CalendarWatcher, parseCalendarOutput };
