'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { px } = require('../src/main/px');

test('window coordinates are never -0 or NaN (Electron rejects them)', () => {
  assert.ok(Object.is(px(-0.3), 0));
  assert.ok(Object.is(px(-0), 0));
  assert.strictEqual(px(NaN), 0);
  assert.strictEqual(px(12.6), 13);
  assert.strictEqual(px(-12.6), -13);
});
