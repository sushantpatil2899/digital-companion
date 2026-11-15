'use strict';

// The character creator (src/main/creator.js): what its page gets, in the
// app (Character → More info) and in a browser (dev/server.js).

const test = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const creator = require('../src/main/creator');
const characters = require('../src/characters');

test('the page, the stage and the files under src/, nothing else', () => {
  const page = creator.serve('/');
  assert.equal(page.status, 200);
  assert.match(String(page.body), /<title>Character creator<\/title>/);
  const stage = creator.serve('/creator/stage.html');
  assert.match(stage.body, /<script src="\/src\/creator\/stage\.js"><\/script>\s*<script src="\/src\/renderer\/renderer\.js">/);
  assert.doesNotMatch(stage.body, /Content-Security-Policy/);
  assert.equal(creator.serve('/src/creator/creator.js').status, 200);
  assert.equal(creator.serve('/src/../package.json').status, 404);
  assert.equal(creator.serve('/src/nothing.js').status, 404);
  // Items and live reload are the browser host's own (dev/server.js).
  assert.equal(creator.serve('/creator/items.json'), null);
});

test('every character, with its personality and the sliders explained', () => {
  const info = JSON.parse(creator.serve('/creator/characters.json').body);
  assert.deepEqual(
    info.map((c) => c.id),
    characters.list().map((c) => c.id),
  );
  for (const c of info) {
    assert.ok(c.self && c.personality.traits && c.activities.length, c.id);
    assert.ok(c.poseValues.arms && c.poseValues.arms.length, `${c.id}: pose values`);
  }
  const sliders = info[0].sliders;
  assert.equal(sliders.length, 56);
  assert.deepEqual(Object.keys(sliders[0]), ['path', 'label', 'help', 'group']);
  const { states, events } = JSON.parse(creator.serve('/creator/renderer.json').body);
  assert.ok(states.includes('walk') && events.length);
});

test('the simulation runs from its browser bundle, for every character', () => {
  const window = {};
  vm.runInNewContext(creator.serve('/creator/sim.js').body, { window });
  const { Companion, MENU_ACTIVITIES, characters: chars } = window.Sim;
  assert.ok(MENU_ACTIVITIES.includes('wave'));
  for (const ch of chars.list()) {
    const c = new Companion({ character: ch, bounds: { left: 0, right: 800, top: 0, floor: 400 }, halfWidth: 56, height: 142, y: 140, rng: () => 0.5 });
    for (let i = 0; i < 60 * 20; i++) c.update(1 / 60, { x: -1e4, y: -1e4 });
    assert.equal(c.y, 400, `${ch.id} landed on the floor`);
    // Picked up, carried and dropped.
    c.grab({ x: c.x, y: c.y - 60 });
    c.drag({ x: 200, y: 100 });
    assert.equal(c.state, 'grabbed');
    c.release();
    for (let i = 0; i < 60 * 3; i++) c.update(1 / 60, { x: -1e4, y: -1e4 });
    assert.equal(c.y, 400, `${ch.id} fell back down`);
  }
});
