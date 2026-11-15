'use strict';

// Permissions shown honestly, the calendar read every minute, and how the app is signed.

const test = require('node:test');
const assert = require('node:assert');
const { permissionProblems, parseSigning, signingNote, SIGNING_IDENTITY, PANES } = require('../src/main/permissions');
const { CalendarWatcher } = require('../src/main/mac/calendar');
const { buildReport } = require('../src/main/report');

test('a switch that is on but not allowed by macOS says so', () => {
  const all = { watchApps: true, readScreen: true, readCalendar: true };
  assert.deepEqual(permissionProblems({ settings: all, screen: 'granted', notes: {} }), []);
  const p = permissionProblems({ settings: all, screen: 'denied', notes: { calendar: 'Calendar access was declined.', apps: 'Not allowed to control System Events.' } });
  assert.deepEqual(p.map((x) => x.key), ['watchApps', 'readScreen', 'readCalendar']);
  assert.match(p[1].text, /hasn’t allowed Screen Recording/);
  assert.match(permissionProblems({ settings: all, screen: 'not-determined' })[0].text, /hasn’t asked/);
  // Switched off: nothing to fix.
  assert.deepEqual(permissionProblems({ settings: {}, screen: 'denied', notes: { calendar: 'x' } }), []);
  for (const k of ['screen', 'calendar', 'apps']) assert.match(PANES[k], /^x-apple\.systempreferences:/);
});

test('how the app is signed', () => {
  assert.deepEqual(parseSigning('Executable=/Applications/Companion.app/Contents/MacOS/Companion\nSignature=adhoc\nTeamIdentifier=not set'), { kind: 'adhoc' });
  assert.deepEqual(parseSigning(`Identifier=com.sushantpatil.companion\nAuthority=${SIGNING_IDENTITY}\nSigned Time=…`), { kind: 'local', name: SIGNING_IDENTITY });
  assert.equal(parseSigning('Authority=Developer ID Application: Someone (ABC)\nAuthority=Developer ID Certification Authority').kind, 'developer');
  assert.equal(parseSigning('Companion.app: code object is not signed at all').kind, 'unsigned');
  assert.equal(parseSigning('').kind, 'unknown');
  assert.match(signingNote({ kind: 'adhoc' }), /npm run make-cert/);
  assert.equal(signingNote({ kind: 'local', name: SIGNING_IDENTITY }), null);
});

test('the calendar is read every minute, and right away on request (not more than every 15 s)', () => {
  const w = new CalendarWatcher(() => {});
  assert.equal(w.intervalMs, 60 * 1000);
  let polls = 0;
  w.poll = () => {
    polls += 1;
    w.lastPoll = Date.now();
  };
  w.refresh();
  w.refresh();
  assert.equal(polls, 1, 'just read: not again');
  w.lastPoll = Date.now() - 16000;
  w.refresh();
  assert.equal(polls, 2);
  w.refresh(0);
  assert.equal(polls, 3, 'waking up: always');
});

test('the report says how the app is signed and when the calendar was read', () => {
  const now = Date.now();
  const text = buildReport({ now, settings: { readCalendar: true }, permissions: { screen: 'granted', signing: 'adhoc', calendarRead: now - 10000 } });
  assert.match(text, /read my calendar: on, last read \(just now\)/);
  assert.match(text, /signed: adhoc \(macOS forgets permissions with every rebuild\)/);
});
