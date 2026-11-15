'use strict';

// Phase 9, step 1b: glancing at what you watch together, his reactions, and
// going to your window when he's lonely.

const test = require('node:test');
const assert = require('node:assert');
const T = require('../src/main/mind/thinker');
const { Mind } = require('../src/main/mind/mind');
const { describeEvent } = require('../src/main/mind/events');
const { dayDigest } = require('../src/main/mind/journal');
const { Companion } = require('../src/main/companion');

// He calls you Sushant (he/him) in these tests (settings since Phase 9).
require('../src/main/mind/names').setNames({ user: 'Sushant', pronoun: 'he' });

const STRANGER = { name: 'Netflix', title: 'Stranger Things', screen: null, since: 0 };
const PICTURE = { app: 'Google Chrome', title: 'Stranger Things', text: 'RUN, WILL!', picture: 'data:image/png;base64,AAAA', at: 1 };

function makeMind(answer, { canSee = true } = {}) {
  const calls = [];
  const mind = new Mind({
    engine: { ready: true, canSee, canDecide: false, async think(req) { calls.push(req); return typeof answer === 'string' ? answer : JSON.stringify(answer); }, status: () => 'running' },
    now: () => 5_000_000,
    rng: () => 0.5,
    getSelf: () => ({ band: 'content', needs: {}, state: 'backView', hour: 20, watching: 'Netflix' }),
    onSpeak: () => {},
    onAsk: () => true,
  });
  mind.nextJournalCheck = Infinity;
  return { mind, calls };
}

test('a glance: what is happening and the feeling of the moment, nothing else', () => {
  const p = T.glancePrompt({ what: '"Stranger Things" on Netflix', text: 'RUN, WILL!' });
  assert.match(p, /You and Sushant are watching "Stranger Things" on Netflix together/);
  assert.match(p, /«RUN, WILL!»/);
  assert.match(p, /one of: exciting, funny, sad, scary, beautiful, boring, calm/);
  assert.deepEqual(T.parseGlance('{"scene":"  A chase in the dark woods. ","mood":"scary"}'), { scene: 'A chase in the dark woods', mood: 'scary' });
  assert.equal(T.parseGlance('{"scene":"x","mood":"angry"}'), null);
  assert.equal(T.parseGlance('{"scene":"As an AI I cannot see","mood":"calm"}'), null);
  assert.equal(T.parseGlance('not json'), null);
  assert.equal(T.parseGlance('{"scene":"","mood":"calm"}'), null);
});

test('he glances with the picture, and what he saw goes into his day as text', async () => {
  const { mind, calls } = makeMind({ scene: 'Kids running from a monster', mood: 'scary' });
  const g = await mind.glance(PICTURE, STRANGER);
  assert.deepEqual(g, { scene: 'Kids running from a monster', mood: 'scary' });
  assert.equal(calls[0].image, PICTURE.picture);
  assert.equal(calls[0].schema, T.GLANCE_SCHEMA);
  const e = mind.log.last(['watched']);
  assert.deepEqual({ what: e.what, scene: e.scene, mood: e.mood }, { what: '"Stranger Things" on Netflix', scene: 'Kids running from a monster', mood: 'scary' });
  assert.ok(!JSON.stringify(e).includes('base64'), 'never the picture');
  assert.match(describeEvent(e, e.t), /while watching "Stranger Things" on Netflix with Sushant you saw: Kids running from a monster \(scary\)/);
  assert.equal(mind.status().glance.mood, 'scary');
});

test('no glance without a picture, a model that can see, or while he is busy', async () => {
  const a = makeMind({ scene: 'x', mood: 'calm' });
  assert.equal(await a.mind.glance({ ...PICTURE, picture: null }, STRANGER), null);
  assert.equal(await a.mind.glance({ ...PICTURE, skipped: 'private window' }, STRANGER), null);
  a.mind.thinking = true;
  assert.equal(await a.mind.glance(PICTURE, STRANGER), null);
  assert.equal(a.calls.length, 0);
  const b = makeMind({ scene: 'x', mood: 'calm' }, { canSee: false });
  assert.equal(await b.mind.glance(PICTURE, STRANGER), null);
  const c = makeMind('garbage');
  assert.equal(await c.mind.glance(PICTURE, STRANGER), null);
  assert.equal(c.mind.log.last(['watched']), null);
  assert.equal(c.mind.thinking, false);
});

test('his diary sees at most the last 8 moments of each show', () => {
  const events = Array.from({ length: 10 }, (_, i) => ({ t: i, kind: 'watched', what: '"Dark" on Netflix', scene: `scene ${i}`, mood: 'calm' }));
  events.push({ t: 20, kind: 'watched', what: 'YouTube', scene: 'a cat video', mood: 'funny' });
  const d = dayDigest(events);
  assert.match(d, /What you saw while watching with Sushant:/);
  assert.match(d, /- "Dark" on Netflix: scene 2 \(calm\); .*scene 9 \(calm\)/);
  assert.doesNotMatch(d, /scene 1 \(/);
  assert.match(d, /- YouTube: a cat video \(funny\)/);
});

// ------------------------------------------------------------------ his body

function watchingCompanion() {
  const c = new Companion({ bounds: { left: 0, right: 1920, top: 25, floor: 1080 }, rng: () => 0.5 });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.startWatching(null);
  for (let i = 0; i < 60 * 30; i++) c.update(1 / 30);
  return c;
}

test('his body reacts to the moment for a few seconds, then he goes back to watching', () => {
  const c = watchingCompanion();
  assert.equal(c.state, 'backView');
  c.drainEvents();
  assert.equal(c.watchReact('funny'), true);
  assert.equal(c.state, 'watchReact');
  assert.equal(c.snapshot().watchMood, 'funny');
  assert.ok(c.drainEvents().includes('watchHeart'));
  for (let i = 0; i < 30 * 5; i++) c.update(1 / 30);
  assert.equal(c.state, 'backView', 'back to watching');
  assert.equal(c.snapshot().watchMood, null);
  assert.equal(c.watchReact('calm'), false, 'calm: no reaction');
  assert.equal(c.watchReact('nonsense'), false);
  c.watchReact('scary');
  c.stopWatching();
  assert.equal(c.state, 'idle', 'you stopped watching mid-reaction');
  assert.equal(c.watchReact('exciting'), false, 'only while watching');
});

// ------------------------------------------------------------------ lonely

function lonelyCompanion() {
  const c = new Companion({ bounds: { left: 0, right: 1920, top: 25, floor: 1080 }, rng: () => 0.5 });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.x = 200;
  c.enter('idle', 5);
  c.lastCursor = { x: 1500, y: 300 };
  return c;
}

test('lonely, he walks to just below the window you work in, looks up, then sits there', () => {
  const c = lonelyCompanion();
  c.setWorkWindow({ x: 1000, y: 100, width: 600, height: 500 });
  c.startActivity('seek');
  for (let i = 0; i < 30 * 20 && c.state !== 'lookUp'; i++) c.update(1 / 30);
  assert.equal(c.state, 'lookUp');
  assert.ok(Math.abs(c.x - 1300) < 5, `below the middle of your window (${c.x})`);
  for (let i = 0; i < 30 * 61; i++) c.update(1 / 30);
  assert.equal(c.state, 'sit');
  assert.equal(c.snapshot().byWindow, true);
  // A pat ends it.
  c.pat();
  assert.equal(c.state, 'happy');
  assert.equal(c.snapshot().byWindow, false);
});

test('a window filling the screen: its bottom middle; without app watching: your cursor, as before', () => {
  const full = lonelyCompanion();
  full.setWorkWindow({ x: 0, y: 25, width: 1920, height: 1055 });
  full.startActivity('seek');
  for (let i = 0; i < 30 * 20 && full.state !== 'lookUp'; i++) full.update(1 / 30);
  assert.ok(Math.abs(full.x - 960) < 5, `${full.x}`);

  const old = lonelyCompanion();
  old.setWorkWindow(null);
  old.startActivity('seek');
  for (let i = 0; i < 30 * 20 && old.state !== 'sad'; i++) old.update(1 / 30);
  assert.equal(old.state, 'sad');
  assert.ok(Math.abs(old.x - 1500) < 40, `under your cursor (${old.x})`);
  assert.equal(old.workWindow, null);
  old.setWorkWindow({ x: 0, y: 0, width: 0, height: 0 });
  assert.equal(old.workWindow, null, 'a window without a size is no window');
});

test('your window on the other screen: he goes over there', () => {
  const c = lonelyCompanion();
  c.setScreens([
    { bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 25, width: 1920, height: 1055 } },
    { bounds: { x: 1920, y: 0, width: 1920, height: 1080 }, workArea: { x: 1920, y: 0, width: 1920, height: 1080 } },
  ]);
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.enter('idle', 5);
  c.setWorkWindow({ x: 2400, y: 100, width: 800, height: 600 });
  c.startActivity('seek');
  for (let i = 0; i < 30 * 60 && c.state !== 'lookUp'; i++) c.update(1 / 30);
  assert.equal(c.state, 'lookUp');
  assert.equal(c.screenIndex, 1);
  assert.ok(Math.abs(c.x - 2800) < 5, `${c.x}`);
});

test('a picture goes to the voice model with your name (the real Engine.think)', async () => {
  const { Engine } = require('../src/main/mind/engine');
  const engine = new Engine({ root: '/nonexistent' });
  engine.voice = { ready: true, port: 1, url: 'http://127.0.0.1:1', mediaMarker: '<__media__>', markerPort: 1 };
  engine.files.vision = '/fake/mmproj.gguf';
  const sent = [];
  const realFetch = global.fetch;
  global.fetch = async (url, o) => {
    const body = JSON.parse(o.body);
    sent.push({ url, body });
    const reply = url.endsWith('/apply-template') ? { prompt: `<start>${body.messages.map((m) => m.content).join('\n')}<end>` } : { content: '{"scene":"a chase","mood":"exciting"}' };
    return { ok: true, text: async () => JSON.stringify(reply) };
  };
  try {
    const out = await engine.think({ system: 'sys', user: 'What is happening?', schema: T.GLANCE_SCHEMA, image: 'AAAA' });
    assert.equal(out, '{"scene":"a chase","mood":"exciting"}');
    assert.match(sent[0].body.messages[1].content, /This is a picture of the window Sushant is looking at\.\n\nWhat is happening\?/);
    assert.deepEqual(sent[1].body.prompt.multimodal_data, ['AAAA']);
    assert.match(sent[1].body.prompt.prompt_string, /<__media__>/);
  } finally {
    global.fetch = realFetch;
  }
});
