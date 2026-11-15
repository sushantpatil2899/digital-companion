'use strict';

// Phase 9, step 2: Pip, music, and switching characters.

const test = require('node:test');
const assert = require('node:assert');
const characters = require('../src/characters');
const brain = require('../src/main/brain');
const { Companion } = require('../src/main/companion');
const { musicPlaying, needsGuess } = require('../src/main/mind/music');
const P = require('../src/main/mind/personality');

require('../src/main/mind/names').setNames({ user: 'Sushant', pronoun: 'he' });

const pip = characters.get('pip');

function pipCompanion(rng = () => 0.5) {
  const c = new Companion({ bounds: { left: 0, right: 1600, top: 0, floor: 900 }, rng, character: pip });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.enter('idle', 5);
  return c;
}

const run = (c, s) => {
  for (let i = 0; i < s * 30; i++) c.update(1 / 30);
};

test("Pip is a character of his own: his personality, activities and lines", () => {
  assert.equal(pip.name, 'Pip');
  const p = P.defaultPersonality(pip);
  assert.equal(p.traits.openness.ideas, 95);
  assert.match(p.self, /design flaw, not a\s+personal one\. My humour is dry and a little smug\./);
  assert.deepEqual(pip.activities.map((a) => a.id), ['wind', 'investigate', 'newspaper', 'cube', 'build', 'conduct']);
  assert.equal(pip.lines.says.tttYouWin.content, 'Statistically improbable.');
  assert.equal(pip.lines.floats.unnecessary, 'That was unnecessary.');
});

test('winding himself: he gets it (fed), or gives up and waits; a click winds him', () => {
  // rng 0.1: the first variant (gotIt, 60%).
  const got = pipCompanion(() => 0.1);
  got.needs.hunger = 0.9;
  got.startActivity('wind');
  assert.equal(got.variant, 'gotIt');
  assert.ok(got.needs.hunger < 0.3);
  assert.equal(got.snapshot().variant, 'gotIt');

  // rng 0.9: gives up (40%): still hungry, then points at his key.
  const gave = pipCompanion(() => 0.9);
  gave.needs.hunger = 0.9;
  gave.startActivity('wind');
  assert.equal(gave.variant, 'gaveUp');
  assert.ok(gave.needs.hunger > 0.85, 'not fed yet');
  run(gave, 8.2);
  assert.equal(gave.state, 'windAsk');
  assert.equal(gave.brainSnapshot().stateLabel, 'Waiting for you to wind him');
  gave.pat();
  assert.equal(gave.state, 'happy');
  assert.ok(gave.needs.hunger < 0.3, 'you wound him');

  // Nobody winds him: after a while he goes back to his own things.
  const alone = pipCompanion(() => 0.9);
  alone.startActivity('wind');
  run(alone, 8.2 + 20.5);
  assert.notEqual(alone.state, 'windAsk');
});

test('he only conducts while you play music', () => {
  const needs = { energy: 0.8, hunger: 0.2, boredom: 0.5, affection: 0.7 };
  const score = (ctx) => brain.scoreActivities(needs, 0.5, { ...brain.defaultContext(), ...ctx }, { character: pip, rng: () => 0 }).find((s) => s.name === 'conduct');
  assert.equal(score({}), undefined);
  assert.ok(score({ music: 'Spotify' }).score > 0.5);
  assert.match(score({ music: 'Spotify' }).why, /Spotify is playing/);
  // Togepi never conducts.
  assert.ok(!brain.scoreActivities(needs, 0.5, { ...brain.defaultContext(), music: 'Spotify' }, { rng: () => 0 }).some((s) => s.name === 'conduct'));
});

test('music: the players, music sites showing a song, window titles, and the decision model', () => {
  assert.equal(musicPlaying({ players: { Spotify: 'playing' } }), 'Spotify');
  assert.equal(musicPlaying({ players: { Spotify: 'paused', Music: 'playing' } }), 'Apple Music');
  assert.equal(musicPlaying({ players: { Spotify: 'paused' } }), null);
  assert.equal(musicPlaying({ frontTab: { url: 'https://music.youtube.com/watch?v=x', title: 'Blinding Lights - YouTube Music' } }), 'YouTube Music');
  assert.equal(musicPlaying({ frontTab: { url: 'https://music.youtube.com/', title: 'YouTube Music' } }), null, 'just the site');
  assert.equal(musicPlaying({ frontTab: { url: 'https://open.spotify.com/track/1', title: 'Song • Artist', private: true } }), null, 'private');
  assert.equal(musicPlaying({ windows: [{ app: 'Google Chrome', title: 'Lofi beats - YouTube Music' }] }), 'YouTube Music');
  const radio = { url: 'https://radio.example.com/live', title: 'Jazz FM live' };
  assert.equal(needsGuess(radio), 'radio.example.com|Jazz FM live');
  assert.equal(musicPlaying({ frontTab: radio, guess: { music: true } }), 'radio.example.com');
  assert.equal(musicPlaying({ frontTab: radio, guess: { music: false } }), null);
  assert.equal(needsGuess({ url: 'https://music.youtube.com/', title: 'YouTube Music' }), null, 'known site: no need to ask');
});

test('thrown: he lands, checks himself, then "That was unnecessary."', () => {
  const c = pipCompanion();
  c.state = 'grabbed';
  c.cursorHistory = [{ x: 400, y: 300, t: 0 }, { x: 460, y: 290, t: 0.05 }];
  c.release();
  assert.equal(c.justThrown, true);
  let sawCheck = false;
  const events = [];
  for (let i = 0; i < 30 * 8; i++) {
    c.update(1 / 30);
    events.push(...c.drainEvents());
    if (c.state === 'checkSelf') sawCheck = true;
  }
  assert.ok(sawCheck, 'checked himself');
  assert.ok(events.includes('unnecessary'));
  // Togepi doesn't.
  const t = new Companion({ bounds: { left: 0, right: 1600, top: 0, floor: 900 }, rng: () => 0.5 });
  for (let i = 0; i < 300; i++) t.update(1 / 60);
  t.state = 'grabbed';
  t.cursorHistory = [{ x: 400, y: 300, t: 0 }, { x: 460, y: 290, t: 0.05 }];
  t.release();
  for (let i = 0; i < 30 * 8; i++) {
    t.update(1 / 30);
    assert.notEqual(t.state, 'checkSelf');
  }
});

test('switching characters: his own needs and mood come, your reminders and water stay', () => {
  const c = new Companion({ bounds: { left: 0, right: 1600, top: 0, floor: 900 }, rng: () => 0.5 });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.nudges.water = 3;
  c.needs.hunger = 0.95;
  c.setCharacter(pip, { v: 1, needs: { energy: 0.5, hunger: 0.1, boredom: 0.2, affection: 0.9 }, mood: 0.6 });
  assert.equal(c.character.id, 'pip');
  assert.equal(c.needs.hunger, 0.1);
  assert.equal(c.nudges.water, 3, 'your water count stays');
  assert.equal(c.state, 'idle');
  // Never seen before: fresh.
  c.setCharacter(characters.get('togepi'));
  assert.deepEqual(c.needs, brain.defaultNeeds());
});
