'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { ContextTracker } = require('../src/main/context');

function clock(start = new Date('2026-10-06T09:00:00').getTime()) {
  const c = { t: start };
  c.now = () => c.t;
  c.add = (s) => {
    c.t += s * 1000;
  };
  return c;
}

test('you count as away after 3 minutes idle, and "just returned" fires once', () => {
  const k = clock();
  const t = new ContextTracker({ now: k.now });
  assert.strictEqual(t.update(10).userAway, false);
  const away = t.update(200);
  assert.strictEqual(away.userAway, true);
  assert.ok(away.awayFor >= 190);
  k.add(600);
  assert.ok(t.update(800).awayFor >= 790);
  const back = t.update(1);
  assert.strictEqual(back.userAway, false);
  assert.strictEqual(back.justReturned, true);
  assert.ok(!t.update(2).justReturned, 'one-shot');
});

test('locking the screen or sleeping the Mac counts as away', () => {
  const t = new ContextTracker({ now: clock().now });
  t.setLocked(true);
  assert.ok(t.update(0).userAway);
  t.setLocked(false);
  assert.ok(t.update(0).justReturned);
  t.setSuspended(true);
  assert.ok(t.update(0).userAway);
});

test('battery: level, on-battery and "just plugged in"', () => {
  const t = new ContextTracker({ now: clock().now });
  t.setBattery({ level: 0.15, charging: false });
  let c = t.update(0);
  assert.strictEqual(c.batteryLevel, 0.15);
  assert.strictEqual(c.onBattery, true);
  t.setBattery({ level: 0.15, charging: true });
  c = t.update(0);
  assert.strictEqual(c.justPluggedIn, true);
  assert.strictEqual(c.onBattery, false);
  assert.ok(!t.update(0).justPluggedIn);
});

test('hour and day come from the clock', () => {
  const t = new ContextTracker({ now: clock(new Date('2026-10-07T23:30:00').getTime()).now });
  const c = t.update(0);
  assert.strictEqual(c.hour, 23);
  assert.strictEqual(c.day, '2026-10-07');
});

test('calendar: reminders at 30 and 5 minutes (once each), "ended" after', () => {
  const k = clock();
  const t = new ContextTracker({ now: k.now });
  const start = k.t + 45 * 60 * 1000;
  t.setEvents([{ title: 'Standup', start, end: start + 15 * 60 * 1000 }]);
  assert.ok(!t.update(0).reminder);
  k.add(16 * 60); // 29 min to go
  let c = t.update(0);
  assert.strictEqual(c.reminder.kind, '30');
  assert.strictEqual(c.reminder.event.title, 'Standup');
  assert.ok(!t.update(0).reminder, 'only once');
  k.add(25 * 60); // 4 min to go
  assert.strictEqual(t.update(0).reminder.kind, '5');
  assert.ok(!t.update(0).reminder, 'only once');
  k.add(5 * 60);
  c = t.update(0);
  assert.strictEqual(c.inEvent.title, 'Standup');
  k.add(16 * 60);
  assert.strictEqual(t.update(0).eventEnded, true);
});

test('calendar: skip the 30-minute reminder if the event is already close', () => {
  const k = clock();
  const t = new ContextTracker({ now: k.now });
  t.setEvents([{ title: 'Soon', start: k.t + 3 * 60 * 1000, end: k.t + 30 * 60 * 1000 }]);
  assert.strictEqual(t.update(0).reminder.kind, '5');
  assert.ok(!t.update(0).reminder);
});

function inMeetingTracker(apps) {
  const k = clock();
  const t = new ContextTracker({ now: k.now });
  t.setEvents([{ title: 'Sync', start: k.t - 60000, end: k.t + 30 * 60000 }]);
  if (apps) t.setApps(apps);
  return t;
}

test('quiet only when you are really in the meeting', () => {
  // Calendar event on, but you're working in another app: not quiet.
  let c = inMeetingTracker({ watching: true, frontApp: 'Claude', visibleApps: ['Claude', 'Finder'] }).update(0);
  assert.strictEqual(c.quiet, false);
  // Meeting app in front: quiet.
  c = inMeetingTracker({ watching: true, frontApp: 'zoom.us', frontKind: 'meeting' }).update(0);
  assert.strictEqual(c.quiet, true);
  // Zoom showing on your other screen during the event: quiet.
  c = inMeetingTracker({ watching: true, frontApp: 'Notes', meetingAppVisible: true }).update(0);
  assert.strictEqual(c.quiet, true);
  assert.match(c.quietReason, /another screen/);
  // A Meet tab in any browser window: quiet, even with no calendar event.
  const t = new ContextTracker({ now: clock().now });
  t.setApps({ watching: true, frontApp: 'Notes', meetingTab: true });
  assert.strictEqual(t.update(0).quiet, true);
  // Zoom window left open, no event and not in front: not quiet.
  const u = new ContextTracker({ now: clock().now });
  u.setApps({ watching: true, frontApp: 'Notes', meetingAppVisible: true });
  assert.strictEqual(u.update(0).quiet, false);
});

test('without app watching, a calendar event still means quiet (fallback)', () => {
  const c = inMeetingTracker(null).update(0);
  assert.strictEqual(c.quiet, true);
  assert.strictEqual(c.quietReason, 'calendar event');
});

test('presenting app in front', () => {
  const t = new ContextTracker({ now: clock().now });
  t.setApps({ watching: true, frontApp: 'Keynote', frontKind: 'presenting' });
  const c = t.update(0);
  assert.strictEqual(c.quiet, true);
  assert.strictEqual(c.presenting, true);
  assert.strictEqual(c.frontApp, 'Keynote');
});
