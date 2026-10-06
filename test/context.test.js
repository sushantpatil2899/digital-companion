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

test('calendar: "soon" 5 minutes before, quiet during, "ended" after', () => {
  const k = clock();
  const t = new ContextTracker({ now: k.now });
  const start = k.t + 10 * 60 * 1000;
  t.setEvents([{ title: 'Standup', start, end: start + 15 * 60 * 1000 }]);
  let c = t.update(0);
  assert.strictEqual(c.nextEvent.title, 'Standup');
  assert.ok(!c.eventSoon);
  k.add(6 * 60);
  c = t.update(0);
  assert.strictEqual(c.eventSoon, true);
  assert.ok(!t.update(0).eventSoon, 'only once');
  k.add(5 * 60);
  c = t.update(0);
  assert.strictEqual(c.inEvent.title, 'Standup');
  assert.strictEqual(c.quiet, true);
  k.add(16 * 60);
  c = t.update(0);
  assert.strictEqual(c.eventEnded, true);
  assert.strictEqual(c.quiet, false);
});

test('front app quiet mode', () => {
  const t = new ContextTracker({ now: clock().now });
  t.setQuiet(true, 'meeting', 'zoom.us');
  const c = t.update(0);
  assert.strictEqual(c.quiet, true);
  assert.strictEqual(c.quietReason, 'meeting');
  assert.strictEqual(c.frontApp, 'zoom.us');
});
