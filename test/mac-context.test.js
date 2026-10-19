'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Settings, DEFAULTS, classifyApp } = require('../src/main/settings');
const { parseCalendarOutput } = require('../src/main/mac/calendar');
const { parseLsappinfoName } = require('../src/main/mac/front-app');

test('settings: opt-in features are off by default and changes are saved', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-'));
  const s = new Settings(dir);
  assert.strictEqual(s.get('watchApps'), false);
  assert.strictEqual(s.get('readCalendar'), false);
  s.set('readCalendar', true);
  assert.strictEqual(new Settings(dir).get('readCalendar'), true);
  // A hand-edited file with a wrong type falls back to the default.
  // Saved lists add to the built-in ones, so older files get new defaults.
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ watchApps: 'yes', quietApps: ['zoom.us', 'Slack'] }));
  const t = new Settings(dir);
  assert.strictEqual(t.get('watchApps'), false);
  const quiet = t.get('quietApps');
  for (const d of DEFAULTS.quietApps) assert.ok(quiet.includes(d), d);
  assert.ok(quiet.includes('Slack') && quiet.includes('zoom.us'));
  assert.strictEqual(new Set(quiet.map((q) => q.toLowerCase())).size, quiet.length);
});

test('settings: a file with a typo is not overwritten with the defaults', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-'));
  const file = path.join(dir, 'settings.json');
  const broken = '{ "watchApps": true, "quietApps": ["Slack"],, }';
  fs.writeFileSync(file, broken);
  const error = console.error;
  console.error = () => {};
  try {
    const s = new Settings(dir);
    assert.strictEqual(s.get('watchApps'), false, 'defaults are used for now');
  } finally {
    console.error = error;
  }
  assert.strictEqual(fs.readFileSync(file, 'utf8'), broken, 'your file is left as it was');
});

test('apps: Zoom is a meeting app whatever it calls itself, and by bundle ID', () => {
  for (const name of ['zoom.us', 'Zoom Workplace', 'Zoom']) assert.strictEqual(classifyApp(name, DEFAULTS), 'meeting', name);
  // An old settings file (just "zoom.us") still matches "Zoom Workplace" by bundle ID.
  const old = { ...DEFAULTS, quietApps: ['zoom.us'] };
  assert.strictEqual(classifyApp('Zoom Workplace', old), null);
  assert.strictEqual(classifyApp('Zoom Workplace', old, 'us.zoom.xos'), 'meeting');
  assert.strictEqual(classifyApp('Microsoft Teams', old, 'com.microsoft.teams2'), 'meeting');
  assert.strictEqual(classifyApp('Keynote', old, 'com.apple.iWork.Keynote'), 'presenting');
  assert.strictEqual(classifyApp('Finder', DEFAULTS, 'com.apple.finder'), null);
});

test('apps: meeting apps make him quiet, presentation apps hide him', () => {
  assert.strictEqual(classifyApp('zoom.us', DEFAULTS), 'meeting');
  assert.strictEqual(classifyApp('Microsoft Teams (work or school)', DEFAULTS), 'meeting');
  assert.strictEqual(classifyApp('Keynote', DEFAULTS), 'presenting');
  assert.strictEqual(classifyApp('Safari', DEFAULTS), null);
  assert.strictEqual(classifyApp(null, DEFAULTS), null);
});

test('front app: parses lsappinfo output', () => {
  assert.strictEqual(parseLsappinfoName('"LSDisplayName"="zoom.us"'), 'zoom.us');
  assert.strictEqual(parseLsappinfoName(''), null);
});

test('calendar: parses events and turns errors into readable messages', () => {
  const ok = parseCalendarOutput('{"events":[{"title":"Standup","start":1000,"end":2000},{"title":"bad","start":5,"end":1}]}');
  assert.deepStrictEqual(ok, { events: [{ title: 'Standup', start: 1000, end: 2000 }] });
  assert.match(parseCalendarOutput('{"error":"denied"}').error, /Privacy & Security/);
  assert.match(parseCalendarOutput('garbage').error, /Unexpected/);
});

const { parseWindowsOutput, summarize, browserTabsScript } = require('../src/main/mac/front-app');
const { classifyUrl } = require('../src/main/settings');

test('window list: parses the script output', () => {
  const w = parseWindowsOutput('{"windows":[{"app":"zoom.us","x":1512,"y":0,"width":1280,"height":800},{"bad":1}]}');
  assert.deepStrictEqual(w.map((x) => x.app), ['zoom.us']);
  assert.strictEqual(parseWindowsOutput('nope'), null);
});

test('meeting tabs: Meet / Zoom web always; Teams web only counts like an open meeting app', () => {
  assert.strictEqual(classifyUrl('https://meet.google.com/abc-defg-hij', DEFAULTS), 'meeting');
  assert.strictEqual(classifyUrl('https://meet.google.com/', DEFAULTS), null);
  assert.strictEqual(classifyUrl('https://app.zoom.us/wc/123/join', DEFAULTS), 'meeting');
  assert.strictEqual(classifyUrl('https://teams.microsoft.com/v2/', DEFAULTS), 'meetingApp');
  assert.strictEqual(classifyUrl('https://github.com', DEFAULTS), null);
});

test('summary: what is on screen, across all screens', () => {
  const windows = [
    { app: 'Claude', x: 0, y: 0, width: 1500, height: 900 },
    { app: 'zoom.us', x: 1512, y: 0, width: 1200, height: 800 },
    { app: 'Google Chrome', x: 1600, y: 100, width: 900, height: 700 },
  ];
  const s = summarize('Claude', windows, { 'Google Chrome': ['https://meet.google.com/abc-defg-hij'] }, DEFAULTS);
  assert.strictEqual(s.frontKind, null);
  assert.strictEqual(s.meetingAppVisible, true);
  assert.strictEqual(s.meetingTab, true);
  assert.deepStrictEqual(s.visibleApps, ['Claude', 'zoom.us', 'Google Chrome']);
  const t = summarize('Claude', [{ app: 'Claude' }], { Safari: ['https://teams.microsoft.com/v2/'] }, DEFAULTS);
  assert.strictEqual(t.meetingTab, false);
  assert.strictEqual(t.meetingAppVisible, true, 'Teams web counts as an open meeting app');
});

test('browser tab script uses the right words for Safari vs Chrome', () => {
  assert.match(browserTabsScript('Safari'), /current tab/);
  assert.match(browserTabsScript('Safari'), /miniaturized/);
  assert.match(browserTabsScript('Google Chrome'), /active tab/);
  assert.match(browserTabsScript('Google Chrome'), /minimized is false/);
});

test('calendar: finds the video call link for the Join button', () => {
  const { findMeetingLink } = require('../src/main/mac/calendar');
  assert.strictEqual(findMeetingLink('', 'https://us02web.zoom.us/j/8123456789?pwd=abc', ''), 'https://us02web.zoom.us/j/8123456789?pwd=abc');
  assert.strictEqual(
    findMeetingLink(null, 'Room 4', 'Join with Google Meet: https://meet.google.com/abc-defg-hij\nOr dial: +1 555'),
    'https://meet.google.com/abc-defg-hij',
  );
  assert.strictEqual(
    findMeetingLink('', '', 'Click here <https://teams.microsoft.com/l/meetup-join/19%3ameeting_x%40thread.v2/0?context=%7b%7d>'),
    'https://teams.microsoft.com/l/meetup-join/19%3ameeting_x%40thread.v2/0?context=%7b%7d',
  );
  assert.strictEqual(findMeetingLink('https://acme.webex.com/meet/pat.', '', ''), 'https://acme.webex.com/meet/pat');
  // Not a call link, or not https.
  assert.strictEqual(findMeetingLink('https://docs.google.com/doc', 'Office', 'http://zoom.us/j/1'), null);
  assert.strictEqual(findMeetingLink('https://meet.google.com/', '', ''), null);
  const { parseCalendarOutput } = require('../src/main/mac/calendar');
  const r = parseCalendarOutput(JSON.stringify({ events: [{ title: 'Sync', start: 1, end: 2, location: 'https://zoom.us/j/42' }, { title: 'Block', start: 1, end: 5 }] }));
  assert.strictEqual(r.events[0].link, 'https://zoom.us/j/42');
  assert.strictEqual(r.events[1].link, undefined);
});

test('settings: wellbeing nudges have defaults, and saved choices are kept', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-'));
  assert.strictEqual(new Settings(dir).get('nudges').water, true);
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ nudges: { water: false, bedtime: '00:00', bogus: 1, eyesEvery: 'x' } }));
  const n = new Settings(dir).get('nudges');
  assert.strictEqual(n.water, false);
  assert.strictEqual(n.bedtime, '00:00');
  assert.strictEqual(n.eyesEvery, DEFAULTS.nudges.eyesEvery);
  assert.strictEqual(n.stretch, true);
  assert.strictEqual('bogus' in n, false);
});
