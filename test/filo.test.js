'use strict';

// The app is called Filo (φίλος, "friend"): name, bundle id, icon, scripts.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const pkg = JSON.parse(read('package.json'));

test('the packaged app is Filo, with its own bundle id and permission texts', () => {
  assert.equal(pkg.productName, 'Filo');
  assert.equal(pkg.build.productName, 'Filo');
  assert.equal(pkg.build.appId, 'com.sushantpatil.filo');
  for (const [key, text] of Object.entries(pkg.build.mac.extendInfo)) {
    if (/UsageDescription$/.test(key)) assert.match(text, /^Filo /, key);
  }
  assert.match(read('scripts/build-helpers.js'), /com\.sushantpatil\.filo\.listen/);
  assert.match(read('scripts/sign.js'), /'Filo\.app'/);
});

test('permissions are reset for Filo and for the names before it', () => {
  const ids = read('scripts/reset-permissions.sh').match(/for id in ([^;\n]+)/)[1].split(/\s+/);
  assert.deepEqual(ids, ['com.sushantpatil.filo', 'com.sushantpatil.companion', 'com.sushantpatil.togepi']);
});

test('the icon is a 1024 px PNG, and its vector source is kept', () => {
  const png = fs.readFileSync(path.join(root, pkg.build.mac.icon));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.match(read('build/icon.svg'), /<svg/);
  assert.ok(fs.existsSync(path.join(root, 'src/renderer/filo-icon.png')), 'the welcome window’s logo ships with the app');
});

test('the welcome window says what changed with the rename', () => {
  const { WELCOME_VERSION, WHATS_NEW } = require('../src/main/welcome');
  const entry = WHATS_NEW.find((w) => w.title === 'The app is called Filo now');
  assert.ok(entry);
  assert.ok(entry.version <= WELCOME_VERSION);
  assert.match(entry.items.join(' '), /ElevenLabs and Gemini keys/);
});
