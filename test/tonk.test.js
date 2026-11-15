'use strict';

// Tonk, the fifth character (SBU Hacks): a pocket-sized brass-and-steel
// robot. His parts, his activities, his dizzy eyes after a throw, and his
// drawing code run against a stand-in canvas for every pose.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const characters = require('../src/characters');
const brain = require('../src/main/brain');
const { Companion } = require('../src/main/companion');

const tonk = characters.get('tonk');
const BOUNDS = { left: 0, right: 1600, top: 0, floor: 900 };

function tonkCompanion(rng = () => 0.5) {
  const c = new Companion({ bounds: BOUNDS, rng, character: tonk });
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

test('Tonk is a character of his own: personality, "Who I am", activities and lines', () => {
  assert.equal(tonk.id, 'tonk');
  assert.equal(tonk.name, 'Tonk');
  assert.ok(characters.list().some((c) => c.id === 'tonk'), 'offered in the picker');
  // The same sliders as every other character.
  const pip = characters.get('pip');
  for (const dim of Object.keys(pip.personality.traits)) {
    assert.deepEqual(Object.keys(tonk.personality.traits[dim]).sort(), Object.keys(pip.personality.traits[dim]).sort(), dim);
  }
  assert.deepEqual(Object.keys(tonk.personality.values).sort(), Object.keys(pip.personality.values).sort());
  // The sheet's strongest traits and values.
  assert.ok(tonk.personality.traits.conscientiousness.dutifulness >= 85);
  assert.ok(tonk.personality.traits.extraversion.activity >= 80);
  assert.ok(tonk.personality.traits.conscientiousness.achievement >= 80);
  assert.ok(tonk.personality.traits.neuroticism.anxiety <= 20);
  assert.ok(tonk.personality.values.benevolence_dependability >= 85);
  assert.match(tonk.self, /^I'm Tonk\. I was built to help/);
  assert.deepEqual(tonk.activities.map((a) => a.id), ['recharge', 'toolbox', 'checklist', 'blueprint', 'screws', 'fix']);
  assert.equal(tonk.soloPlay, 'screws');
  assert.deepEqual(tonk.afterThrow, { state: 'dizzy', duration: 2.5 });
  assert.equal(tonk.lines.signs.fetch.cheerful, 'Fetch? I have wheels!');
});

test('his activities: in his brain, and each one does what it says', () => {
  const names = brain.scoreActivities({ energy: 0.9, hunger: 0.9, boredom: 0.9, affection: 0.7 }, 0.3, brain.defaultContext(), { character: tonk }).map((s) => s.name);
  for (const id of ['recharge', 'toolbox', 'checklist', 'blueprint', 'screws', 'fix']) assert.ok(names.includes(id), `${id} is scored by his brain`);
  // Nobody else does them.
  const others = brain.scoreActivities({ energy: 0.9, hunger: 0.9, boredom: 0.9, affection: 0.7 }, 0.3, brain.defaultContext(), { character: characters.get('pip') }).map((s) => s.name);
  assert.ok(!others.includes('recharge'));

  const c = tonkCompanion();
  c.needs.hunger = 0.9;
  assert.equal(c.doActivity('recharge'), true);
  assert.equal(c.state, 'recharge');
  assert.ok(c.needs.hunger < 0.3, 'recharging fed him');
  assert.equal(c.brainSnapshot().stateLabel, 'Recharging by the boiler');

  const d = tonkCompanion();
  assert.equal(d.doActivity('toolbox'), true);
  assert.equal(d.state, 'toolbox');
  assert.ok(Math.abs(d.targetX - d.x) >= 250, 'rolls off with his toolbox');

  for (const id of ['checklist', 'blueprint', 'screws', 'fix']) {
    const e = tonkCompanion();
    assert.equal(e.doActivity(id), true, id);
    assert.equal(e.state, id);
    run(e, 1);
    assert.equal(e.state, id, `${id}: stays put doing it`);
  }
});

test('thrown: only his eyes react (dizzy for a moment), then he is himself again', () => {
  const c = tonkCompanion();
  const events = [];
  throwHim(c, events);
  assert.equal(c.state, 'dizzy');
  assert.equal(c.brainSnapshot().stateLabel, 'Dizzy after a throw');
  assert.ok(!events.includes('angry'), 'one throw: dizzy, not cross');
  run(c, 3, events);
  assert.notEqual(c.state, 'dizzy');
});

// ------------------------------------------------------------------ drawing

/** A stand-in 2D canvas: accepts every call, records the numbers it's given. */
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

function loadLook() {
  const window = {};
  const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'characters', 'tonk', 'look.js'), 'utf8');
  vm.runInNewContext(code, { window, Math, console });
  return window.Characters.tonk;
}

test('his drawing code draws every pose, expression, activity and watching reaction without errors', () => {
  const look = loadLook();
  for (const k of ['draw', 'defaultPose', 'activityPose', 'watchPose', 'restyle', 'drawFetchItem']) assert.ok(look[k], k);
  assert.equal(look.heldProp, 'bearing');
  assert.ok(look.HEAD_TOP < look.BODY_CY && look.BODY_CY < 0);
  const { ctx, numbers } = fakeCanvas();
  let draws = 0;
  const draw = (extra) => {
    const p = { ...look.defaultPose(), t: 1.3, walkPhase: 2.1, ...extra };
    look.draw(ctx, p);
    draws++;
  };
  // Every value the shared renderer can set (src/renderer/renderer.js), plus his own.
  const arms = ['down', 'cheer', 'fists', 'flail', 'grip', 'hold', 'hug', 'shade', 'sip', 'stretch', 'up', 'wave', 'reach', 'point', 'toolbox', 'clipboard', 'blueprint', 'wrench', 'screws', 'warm'];
  const eyes = ['open', 'angry', 'closed', 'content', 'happy', 'meh', 'sad', 'sleepy', 'small', 'squint', 'wide', 'dizzy'];
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
  for (const prop of ['glass', 'bearing', 'toolbox', 'clipboard', 'blueprint', 'boiler', 'screws', 'wrench']) {
    for (const facing of [1, -1]) draw({ prop, facing, propProgress: 0.5, glassLift: 1, steam: true, bulbPulse: true });
  }
  // His own activities and watching reactions, as computePose calls them.
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
  look.drawFetchItem(ctx, 0, 0, 1.2, 12);
  assert.ok(draws > 700, `drew ${draws} poses`);
  const bad = numbers.filter(([, n]) => !Number.isFinite(n));
  assert.deepEqual(bad.slice(0, 5), [], 'every coordinate is a real number');
  assert.ok(numbers.length > 10000);
});

test('he is in every window that draws characters, and has his tic-tac-toe pieces', () => {
  const r = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', f), 'utf8');
  for (const f of ['look.js', 'voice.js', 'lines.js']) assert.ok(r('index.html').includes(`../characters/tonk/${f}`), f);
  assert.ok(r('games/ball.html').includes('../../characters/tonk/look.js'));
  assert.ok(r('picker.html').includes('../characters/tonk/look.js'));
  assert.match(r('games/board.js'), /tonk: \{ you: '🔌', me: '🔋' \}/);
});
