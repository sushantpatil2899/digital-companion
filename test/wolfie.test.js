'use strict';

// Wolfie, the sixth character (SBU Hacks): Stony Brook's Seawolf, classic
// and college-themed. His parts, his college activities (the all-nighter
// only at night), his shake-off after a throw, "Go Seawolves!", his height,
// and his drawing code run against a stand-in canvas for every pose.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const characters = require('../src/characters');
const brain = require('../src/main/brain');
const { Companion } = require('../src/main/companion');

const wolfie = characters.get('wolfie');
const BOUNDS = { left: 0, right: 1600, top: 0, floor: 900 };
const ACTIVITIES = ['pizza', 'class', 'study', 'allnighter', 'cheer', 'dance'];

function wolfieCompanion(hour = 14) {
  const c = new Companion({ bounds: BOUNDS, rng: () => 0.5, character: wolfie });
  c.setContext({ hour });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.enter('idle', 5);
  return c;
}

const run = (c, s, events = []) => {
  for (let i = 0; i < s * 30; i++) {
    c.update(1 / 30);
    events.push(...c.drainEvents());
  }
};

function throwHim(c, events) {
  c.state = 'grabbed';
  c.cursorHistory = [{ x: c.x, y: 300, t: 0 }, { x: c.x + 60, y: 290, t: 0.05 }];
  c.release();
  for (let i = 0; i < 30 * 4 && !c.isGrounded(); i++) {
    c.update(1 / 30);
    events.push(...c.drainEvents());
  }
  for (let i = 0; i < 30 * 4 && ['fall', 'land'].includes(c.state); i++) {
    c.update(1 / 30);
    events.push(...c.drainEvents());
  }
}

test('Wolfie is a character of his own: a college personality, "Who I am", activities and lines', () => {
  assert.equal(wolfie.id, 'wolfie');
  assert.equal(wolfie.name, 'Wolfie');
  assert.ok(characters.list().some((c) => c.id === 'wolfie'), 'offered in the picker');
  const pip = characters.get('pip');
  for (const dim of Object.keys(pip.personality.traits)) {
    assert.deepEqual(Object.keys(wolfie.personality.traits[dim]).sort(), Object.keys(pip.personality.traits[dim]).sort(), dim);
  }
  assert.deepEqual(Object.keys(wolfie.personality.values).sort(), Object.keys(pip.personality.values).sort());
  // The sheet's strongest traits and values.
  const t = wolfie.personality.traits;
  assert.ok(t.extraversion.gregariousness >= 90);
  assert.ok(t.extraversion.activity >= 85 && t.extraversion.excitement_seeking >= 80 && t.extraversion.positive_emotions >= 85);
  assert.ok(t.conscientiousness.self_discipline <= 55, 'crams the night before');
  assert.ok(t.neuroticism.anxiety <= 25);
  assert.ok(wolfie.personality.values.tradition >= 75, 'school spirit');
  assert.match(wolfie.self, /^I'm Wolfie, the Stony Brook Seawolf\./);
  assert.match(wolfie.self, /Academic Mall/);
  assert.deepEqual(wolfie.activities.map((a) => a.id), ACTIVITIES);
  assert.equal(wolfie.soloPlay, 'dance');
});

test('"Go Seawolves!" is in his cheer and his lines', () => {
  assert.match(characters.activity(wolfie, 'cheer').doing, /Go Seawolves!/);
  assert.match(wolfie.self, /Go Seawolves!/);
  const all = JSON.stringify(wolfie.lines);
  assert.ok((all.match(/Go Seawolves!/g) || []).length >= 4, 'in several of his lines');
  assert.match(wolfie.lines.floats.goodMorning, /Go Seawolves!/);
});

test('his college activities: in his brain, each does what it says; the all-nighter only at night', () => {
  const needs = { energy: 0.9, hunger: 0.9, boredom: 0.9, affection: 0.7 };
  const night = brain.scoreActivities(needs, 0.3, { ...brain.defaultContext(), hour: 23 }, { character: wolfie }).map((s) => s.name);
  for (const id of ACTIVITIES) assert.ok(night.includes(id), `${id} is scored by his brain at night`);
  const day = brain.scoreActivities(needs, 0.3, { ...brain.defaultContext(), hour: 14 }, { character: wolfie });
  const allDay = day.find((s) => s.name === 'allnighter');
  assert.ok(!allDay || allDay.score === 0, 'no all-nighters at 2 pm');

  const c = wolfieCompanion();
  c.needs.hunger = 0.9;
  assert.equal(c.doActivity('pizza'), true);
  assert.equal(c.state, 'pizza');
  assert.ok(c.needs.hunger < 0.3, 'pizza fed him');
  assert.equal(c.brainSnapshot().stateLabel, 'Eating pizza at the dining hall');

  const d = wolfieCompanion();
  assert.equal(d.doActivity('class'), true);
  assert.equal(d.state, 'class');
  assert.ok(Math.abs(d.targetX - d.x) >= 300, 'walks off to class');

  for (const id of ['study', 'cheer', 'dance']) {
    const e = wolfieCompanion();
    assert.equal(e.doActivity(id), true, id);
    run(e, 1);
    assert.equal(e.state, id, `${id}: stays put doing it`);
  }
  const n = wolfieCompanion(23);
  assert.equal(n.doActivity('allnighter'), true);
  run(n, 1);
  assert.equal(n.state, 'allnighter');
});

test('thrown: he shakes himself off and fixes his cap, then he is himself again', () => {
  const c = wolfieCompanion();
  const events = [];
  throwHim(c, events);
  assert.equal(c.state, 'shakeOff');
  assert.equal(c.brainSnapshot().stateLabel, 'Shaking it off after a throw');
  assert.ok(!events.includes('angry'));
  run(c, 2.5, events);
  assert.notEqual(c.state, 'shakeOff');
});

// ------------------------------------------------------------------ drawing

function fakeCanvas() {
  const numbers = [];
  const ctx = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return (...args) => {
          for (const a of args) if (typeof a === 'number') numbers.push([prop, a]);
        };
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    },
  );
  return { ctx, numbers };
}

function loadLook(id) {
  const window = {};
  const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'characters', id, 'look.js'), 'utf8');
  vm.runInNewContext(code, { window, Math, console });
  return window.Characters[id];
}

test('he is in profile and faces the way he walks: his head mirrors when he faces left', () => {
  const look = loadLook('wolfie');
  const mirrored = (facing) => {
    const { ctx, numbers } = fakeCanvas();
    look.draw(ctx, { ...look.defaultPose(), facing });
    return numbers.some(([fn, n]) => fn === 'scale' && n === -1);
  };
  assert.equal(mirrored(1), false, 'facing right: drawn as is');
  assert.equal(mirrored(-1), true, 'facing left: mirrored');
  // From behind (watching with you) it's the back of his head: the same whichever way he faced.
  const backView = (facing) => {
    const { ctx, numbers } = fakeCanvas();
    look.draw(ctx, { ...look.defaultPose(), facing, view: 'back' });
    const all = numbers.map(([fn, n]) => `${fn}:${n.toFixed(2)}`).join(' ');
    // From his head on (it's drawn from translate(0, HEAD_CY)); his feet still point the way he faced.
    return all.slice(all.indexOf('translate:-100.00'));
  };
  assert.ok(backView(1).length > 100);
  assert.equal(backView(-1), backView(1));
});

test('a little taller than the others, still under his speech bubble', () => {
  const look = loadLook('wolfie');
  // Topmost point drawn: his ear tips (the canvas records every y).
  const { ctx, numbers } = fakeCanvas();
  look.draw(ctx, look.defaultPose());
  const ys = numbers.filter(([fn]) => ['moveTo', 'lineTo'].includes(fn)).map(([, n]) => n);
  assert.ok(ys.length > 10);
  assert.ok(look.HEAD_TOP < loadLook('tonk').HEAD_TOP, 'taller than Tonk');
  assert.ok(look.HEAD_TOP < loadLook('pip').HEAD_TOP, 'taller than Pip');
  // The speech bubble's bottom is at -138 (src/renderer/ui.js drawSpeech).
  assert.ok(look.HEAD_TOP > -150, 'not into his bubble');
});

test('his drawing code draws every pose, expression, activity and watching reaction without errors', () => {
  const look = loadLook('wolfie');
  for (const k of ['draw', 'defaultPose', 'activityPose', 'watchPose', 'restyle', 'drawFetchItem']) assert.ok(look[k], k);
  assert.equal(look.heldProp, 'football');
  const { ctx, numbers } = fakeCanvas();
  let draws = 0;
  const draw = (extra) => {
    look.draw(ctx, { ...look.defaultPose(), t: 1.3, walkPhase: 2.1, stepHeight: 4, ...extra });
    draws++;
  };
  const arms = ['down', 'cheer', 'fists', 'flail', 'grip', 'hold', 'hug', 'shade', 'sip', 'stretch', 'up', 'wave', 'reach', 'point', 'pizza', 'straps', 'book', 'typing', 'megaphone', 'dance', 'capFix', 'foamFinger'];
  const eyes = ['open', 'angry', 'closed', 'content', 'happy', 'meh', 'sad', 'sleepy', 'small', 'squint', 'wide'];
  const mouths = ['smile', 'flat', 'frown', 'growl', 'o', 'open', 'smallSmile', 'talk', 'wavy', 'yawn', 'chew'];
  for (const view of ['front', 'back', 'lying']) {
    for (const feet of ['stand', 'sit', 'dangle']) {
      for (const facing of [1, -1]) {
        for (const a of arms) draw({ view, feet, facing, arms: a, turn: 0.6 });
        for (const e of eyes) draw({ view, feet, facing, eyes: e, blink: 0.5, lookX: 0.8, lookY: -0.5 });
        for (const m of mouths) draw({ view, feet, facing, mouth: m });
      }
    }
  }
  for (const prop of ['glass', 'football', 'pizza', 'backpack', 'book', 'laptop', 'megaphone', 'foamFinger']) {
    for (const facing of [1, -1]) draw({ prop, facing, propProgress: 0.5, glassLift: 1, tailWag: true, capTilt: 0.3 });
  }
  const kit = (st, duration) => ({ t: 2, st, duration, dt: 1 / 60, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), size: 1.15, walkCycle: (pp) => { pp.walkPhase = 1; }, overlay: () => {} });
  for (const [name, pose] of Object.entries(look.activityPose)) {
    for (const st of [0.5, 4, 9.9]) {
      const p = { ...look.defaultPose(), t: 2 };
      pose(p, { facing: 1, variant: null, state: name }, kit(st, 10));
      look.draw(ctx, p);
      draws++;
    }
  }
  for (const mood of ['exciting', 'funny', 'sad', 'scary', 'beautiful', 'boring', 'calm']) {
    const p = { ...look.defaultPose(), t: 2 };
    look.watchPose(mood, p, { facing: 1 }, kit(1, 5));
    look.draw(ctx, p);
    draws++;
  }
  for (const s of ['happy', 'angry', 'idle']) {
    const p = { ...look.defaultPose(), t: 2 };
    look.restyle(s, p, {}, kit(1, 5));
    look.draw(ctx, p);
    draws++;
  }
  for (const [name, fn] of Object.entries(look.overlays)) {
    fn(ctx, 38, look.HEAD_TOP + 8, 1.4);
    assert.ok(name);
  }
  look.drawFetchItem(ctx, 0, 0, 1.2, 12);
  assert.ok(draws > 700, `drew ${draws} poses`);
  const bad = numbers.filter(([, n]) => !Number.isFinite(n));
  assert.deepEqual(bad.slice(0, 5), [], 'every coordinate is a real number');
});

test('he is in every window that draws characters, and has his tic-tac-toe pieces', () => {
  const r = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', f), 'utf8');
  for (const f of ['look.js', 'voice.js', 'lines.js']) assert.ok(r('index.html').includes(`../characters/wolfie/${f}`), f);
  assert.ok(r('games/ball.html').includes('../../characters/wolfie/look.js'));
  assert.ok(r('picker.html').includes('../characters/wolfie/look.js'));
  assert.match(r('games/board.js'), /wolfie: \{ you: '🐾', me: '🌊' \}/);
});
