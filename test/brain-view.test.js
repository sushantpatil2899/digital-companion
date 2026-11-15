'use strict';

// The brain window's tabs (Sushant, 2026-10-25): a header that stays, then
// Feelings, Noticing (with sub-tabs You, Screen, Day, Mind, System) and Decisions.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', f), 'utf8');

test('every row he notices belongs to one of the five groups', () => {
  const js = src('brain.js');
  const groups = js.slice(js.indexOf('const GROUPS = ['), js.indexOf('const groupOf'));
  assert.deepEqual([...groups.matchAll(/\['([a-z]+)', '(\w+)', \[/g)].map((m) => m[2]), ['You', 'Screen', 'Day', 'Mind', 'System']);
  const listed = new Set([...groups.matchAll(/'([^']+)'/g)].map((m) => m[1]));
  const labels = new Set([...js.matchAll(/rows\.push\(\[\s*'([^']+)'/g)].map((m) => m[1]));
  for (const l of ['Time', 'You', 'Battery']) labels.add(l); // the first three rows
  labels.add('Last said').add('Last asked').add('Remembered').add('Remembered (by meaning)');
  assert.ok(labels.size > 25);
  for (const l of labels) assert.ok(listed.has(l), `"${l}" has a group`);
  // Playing and the nudge he's holding up moved to the header.
  assert.doesNotMatch(js, /rows\.push\(\['(Playing|Showing)'/);
  assert.match(js, /sub\.push\(`Playing /);
});

test('the window has the header, three tabs and their panels', () => {
  const html = src('brain.html');
  assert.match(html, /class="card header"/);
  assert.deepEqual([...html.matchAll(/data-tab="(\w+)"/g)].map((m) => m[1]), ['feelings', 'noticing', 'decisions']);
  assert.deepEqual([...html.matchAll(/data-panel="(\w+)"/g)].map((m) => m[1]), ['feelings', 'noticing', 'decisions']);
  assert.match(html, /id="groups"/);
});
