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
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ watchApps: 'yes', quietApps: ['Zoom'] }));
  const t = new Settings(dir);
  assert.strictEqual(t.get('watchApps'), false);
  assert.deepStrictEqual(t.get('quietApps'), ['Zoom']);
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
