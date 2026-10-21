'use strict';

const test = require('node:test');
const assert = require('node:assert');
const screens = require('../src/main/screens');
const { Companion } = require('../src/main/companion');

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// A display with a menu bar on top and a dock at the bottom.
const disp = (x, y, w, h) => ({ bounds: { x, y, width: w, height: h }, workArea: { x, y: y + 25, width: w, height: h - 25 - 60 } });

const LAYOUTS = {
  sideBySide: [disp(0, 0, 1500, 900), disp(1500, 0, 1500, 900)],
  // Laptop next to a taller monitor, aligned at the top.
  laptopAndMonitor: [disp(0, 0, 1512, 982), disp(1512, 0, 2560, 1440)],
  stacked: [disp(0, 0, 1512, 982), disp(-500, -1440, 2560, 1440)],
  three: [disp(0, 0, 1000, 800), disp(1000, 0, 1000, 800), disp(2000, 0, 1000, 800)],
  apart: [disp(0, 0, 1000, 800), disp(1200, 0, 1000, 800)],
};

function companionOn(layout, screen = 0, x) {
  const ss = screens.makeScreens(layout);
  const s = ss[screen];
  const c = new Companion({ bounds: s, halfWidth: 56, height: 142, x: x != null ? x : (s.left + s.right) / 2, y: s.floor, rng: seeded(4) });
  c.setScreens(layout);
  for (let i = 0; i < 60 * 3; i++) c.update(1 / 60);
  c.enter('idle', 1000);
  return c;
}

/** Run until he's settled on `target` (or time runs out); return the path he took. */
function travel(c, seconds, target) {
  const path = [];
  for (let i = 0; i < 60 * seconds; i++) {
    c.update(1 / 60);
    path.push({ x: c.x, y: c.y, screen: c.screenIndex, state: c.state });
    if (target != null && c.screenIndex === target && !c.route && c.isGrounded() && c.state !== 'run' && c.state !== 'walk') break;
  }
  return path;
}

function assertSmooth(path) {
  for (let i = 1; i < path.length; i++) {
    const jump = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    assert.ok(jump < 60, `no teleporting: jumped ${jump.toFixed(0)}px at step ${i} (${path[i - 1].state} -> ${path[i].state})`);
  }
}

test('screen map: side-by-side, hop up, drop down, stacked, and screens that do not touch', () => {
  const lm = screens.makeScreens(LAYOUTS.laptopAndMonitor);
  assert.strictEqual(screens.link(lm[0], lm[1], 56).kind, 'drop');
  assert.strictEqual(screens.link(lm[1], lm[0], 56).kind, 'hop');
  const st = screens.makeScreens(LAYOUTS.stacked);
  assert.strictEqual(screens.link(st[0], st[1], 56).kind, 'spring');
  assert.strictEqual(screens.link(st[1], st[0], 56).kind, 'fall');
  const ap = screens.makeScreens(LAYOUTS.apart);
  assert.strictEqual(screens.link(ap[0], ap[1], 56), null);
  assert.strictEqual(screens.route(ap, 0, 1, 56), null);
  const th = screens.makeScreens(LAYOUTS.three);
  assert.deepStrictEqual(screens.route(th, 0, 2, 56).map((l) => l.to), [1, 2]);
});

test('walks across a shared edge to the next screen, smoothly', () => {
  const c = companionOn(LAYOUTS.sideBySide, 0, 600);
  assert.ok(c.travelTo(1, 2200));
  const path = travel(c, 60, 1);
  assertSmooth(path);
  assert.strictEqual(c.screenIndex, 1);
  assert.ok(Math.abs(c.x - 2200) < 5, `x ${c.x}`);
  assert.strictEqual(c.y, c.screens[1].floor);
});

test('drops down onto a lower screen next door, and lands on his feet', () => {
  const c = companionOn(LAYOUTS.laptopAndMonitor, 0, 1200);
  const events = [];
  assert.ok(c.travelTo(1, 2500));
  const path = [];
  for (let i = 0; i < 60 * 40; i++) {
    c.update(1 / 60);
    events.push(...c.drainEvents());
    path.push({ x: c.x, y: c.y, state: c.state });
  }
  assertSmooth(path);
  assert.strictEqual(c.screenIndex, 1);
  assert.strictEqual(c.y, c.screens[1].floor);
  assert.ok(!events.includes('confused') && !events.includes('thud'), events.join(','));
});

test('hops up onto a higher screen next door', () => {
  const c = companionOn(LAYOUTS.laptopAndMonitor, 1, 2400);
  const events = [];
  assert.ok(c.travelTo(0, 800));
  const path = [];
  for (let i = 0; i < 60 * 60; i++) {
    c.update(1 / 60);
    events.push(...c.drainEvents());
    path.push({ x: c.x, y: c.y, state: c.state });
  }
  assertSmooth(path);
  assert.ok(events.includes('hop'), events.join(','));
  assert.strictEqual(c.screenIndex, 0);
  assert.strictEqual(c.y, c.screens[0].floor);
});

test('stacked screens: springs up through the top edge and drops back down', () => {
  const c = companionOn(LAYOUTS.stacked, 0, 700);
  const events = [];
  assert.ok(c.travelTo(1, 1000));
  let path = [];
  for (let i = 0; i < 60 * 30; i++) {
    c.update(1 / 60);
    events.push(...c.drainEvents());
    path.push({ x: c.x, y: c.y, state: c.state });
  }
  assert.ok(events.includes('spring'), events.join(','));
  assert.strictEqual(c.screenIndex, 1);
  assert.strictEqual(c.y, c.screens[1].floor);
  // Only straight up and down through the shared edge, never sideways out of it.
  assertSmooth(path.map((p) => ({ ...p, y: p.y })).filter((p, i, a) => i === 0 || Math.abs(p.x - a[i - 1].x) < 60));
  c.enter('idle', 1000);
  assert.ok(c.travelTo(0, 400));
  path = [];
  for (let i = 0; i < 60 * 40; i++) {
    c.update(1 / 60);
    events.push(...c.drainEvents());
    path.push({ x: c.x, y: c.y, state: c.state });
  }
  assert.ok(events.includes('dropDown'), events.join(','));
  assert.strictEqual(c.screenIndex, 0);
  assert.strictEqual(c.y, c.screens[0].floor);
  assert.ok(!events.includes('confused'));
});

test('crosses two screens in a row', () => {
  const c = companionOn(LAYOUTS.three, 0, 300);
  assert.ok(c.travelTo(2, 2700));
  assertSmooth(travel(c, 90, 2));
  assert.strictEqual(c.screenIndex, 2);
  assert.ok(Math.abs(c.x - 2700) < 5);
});

test('never leaves through an edge that does not touch another screen', () => {
  const c = companionOn(LAYOUTS.apart, 0, 500);
  assert.strictEqual(c.travelTo(1, 1500), false);
  for (let i = 0; i < 60 * 600; i++) {
    c.update(1 / 60);
    assert.strictEqual(c.screenIndex, 0);
    assert.ok(c.x >= c.screens[0].left && c.x <= c.screens[0].right);
  }
});

test('wanders to the other screen on his own (when bored and rested)', () => {
  const c = companionOn(LAYOUTS.sideBySide, 0, 700);
  c.enter('idle', 1); // decide soon (companionOn parks him)
  c.needs.boredom = 0.95;
  c.needs.energy = 0.95;
  c.mood = 0.5;
  const seen = new Set();
  for (let i = 0; i < 20 * 60 * 15 && seen.size < 2; i++) {
    c.needs.boredom = Math.max(c.needs.boredom, 0.8);
    c.update(1 / 20);
    seen.add(c.screenIndex);
  }
  assert.deepStrictEqual([...seen].sort(), [0, 1]);
});

test('"Come here" on another screen walks over instead of teleporting', () => {
  const c = companionOn(LAYOUTS.sideBySide, 0, 700);
  assert.strictEqual(c.comeTo(2400, 500), true);
  const path = travel(c, 30, 1);
  assertSmooth(path);
  assert.strictEqual(c.screenIndex, 1);
  assert.ok(Math.abs(c.x - 2400) < 5);
  // Screens that don't touch: can't walk there.
  const d = companionOn(LAYOUTS.apart, 0, 500);
  assert.strictEqual(d.comeTo(1500, 400), false);
});

test('unplugging the monitor he is on puts him on the remaining screen', () => {
  const c = companionOn(LAYOUTS.sideBySide, 1, 2200);
  c.setScreens([LAYOUTS.sideBySide[0]]);
  for (let i = 0; i < 60 * 3; i++) c.update(1 / 60);
  assert.strictEqual(c.screenIndex, 0);
  assert.ok(c.x <= c.screens[0].right - c.halfWidth);
  assert.strictEqual(c.y, c.screens[0].floor);
});

test('being picked up mid-trip cancels it', () => {
  const c = companionOn(LAYOUTS.sideBySide, 0, 600);
  c.travelTo(1, 2200);
  c.update(1 / 60);
  c.grab({ x: c.x, y: c.y - 50 });
  assert.strictEqual(c.route, null);
  assert.strictEqual(c.crossing, null);
});

test('he walks along the very bottom of every screen (in front of the Dock), below the menu bar', () => {
  const lm = screens.makeScreens(LAYOUTS.laptopAndMonitor);
  assert.strictEqual(lm[0].floor, 982);
  assert.strictEqual(lm[1].floor, 1440);
  assert.strictEqual(lm[0].top, 25);
  assert.strictEqual(lm[0].left, 0);
  assert.strictEqual(lm[0].right, 1512);
  const c = companionOn(LAYOUTS.laptopAndMonitor, 0, 700);
  assert.strictEqual(c.y, 982);
});

test('unplugging a screen while he walks to a hop does not crash him; he picks something else to do', () => {
  const c = companionOn(LAYOUTS.laptopAndMonitor, 1, 2400);
  assert.ok(c.travelTo(0, 700));
  for (let i = 0; i < 10; i++) c.update(1 / 60);
  assert.ok(c.afterMove && c.afterMove.cross, 'on his way to the hop');
  c.setScreens([LAYOUTS.laptopAndMonitor[0]]); // the monitor is unplugged
  assert.equal(c.route, null);
  assert.ok(!c.afterMove || !c.afterMove.cross, 'the planned hop is forgotten');
  assert.doesNotThrow(() => travel(c, 20));
  assert.equal(c.screenIndex, 0);
});

test('a crossing planned for a screen that is gone is skipped, not followed', () => {
  const c = companionOn(LAYOUTS.laptopAndMonitor, 1, 2400);
  const link = screens.route(c.screens, 1, 0, 56)[0];
  c.setScreens([LAYOUTS.laptopAndMonitor[0]]);
  assert.doesNotThrow(() => c.startCross(link));
  assert.equal(c.crossing, null);
  assert.ok(c.isGrounded());
});

test('after an error he forgets his plan and lands on the floor of the screen he is on', () => {
  const c = companionOn(LAYOUTS.laptopAndMonitor, 1, 2400);
  c.travelTo(0, 700);
  c.y -= 300;
  c.recover();
  assert.equal(c.route, null);
  assert.equal(c.afterMove, null);
  assert.equal(c.state, 'fall');
  travel(c, 5);
  assert.equal(c.y, c.screens[c.screenIndex].floor);
});
