'use strict';

// Phase 9: characters, your name, and the move from Togepi to Companion.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const characters = require('../src/characters');
const brain = require('../src/main/brain');
const { Companion } = require('../src/main/companion');
const { migrate, characterDir } = require('../src/main/migrate');
const names = require('../src/main/mind/names');
const { interaction, interactionKey, INTERACTIONS } = require('../src/main/mind/interactions');
const T = require('../src/main/mind/thinker');
const P = require('../src/main/mind/personality');

const ROOT = path.join(__dirname, '..');

test('every character has the parts the app needs', () => {
  for (const ch of characters.list()) {
    assert.ok(ch.id && ch.name, ch.id);
    assert.ok(ch.self && ch.personality.traits && ch.personality.values && ch.personality.relationship, `${ch.id}: personality`);
    assert.ok(characters.activity(ch, ch.soloPlay), `${ch.id}: soloPlay is one of its activities`);
    for (const a of ch.activities) {
      assert.ok(a.menu && a.doing && a.label, `${ch.id}.${a.id}: words`);
      assert.ok(!!a.stay !== !!a.move, `${ch.id}.${a.id}: either stay or move`);
      assert.equal(typeof a.score, 'function', `${ch.id}.${a.id}: score`);
      assert.ok(a.effects, `${ch.id}.${a.id}: effects`);
    }
    for (const f of ['index.js', 'look.js', 'voice.js', 'lines.js']) assert.ok(fs.existsSync(path.join(ROOT, 'src', 'characters', ch.id, f)), `${ch.id}/${f}`);
    // The companion window and the fetch ball load its drawing.
    const index = fs.readFileSync(path.join(ROOT, 'src', 'renderer', 'index.html'), 'utf8');
    for (const f of ['look.js', 'voice.js', 'lines.js']) assert.ok(index.includes(`../characters/${ch.id}/${f}`), `index.html loads ${ch.id}/${f}`);
    assert.ok(fs.readFileSync(path.join(ROOT, 'src', 'renderer', 'games', 'ball.html'), 'utf8').includes(`../../characters/${ch.id}/look.js`));
    // Every sign and floating text the app uses exists.
    for (const k of ['water', 'stretch', 'eyes', 'bedtime', 'note', 'meeting30', 'meeting5', 'meetingNow', 'fetch', 'fetchAgain', 'ttt']) assert.ok(ch.lines.signs[k] && ch.lines.signs[k].content, `${ch.id} sign ${k}`);
    for (const k of ['reminderAck', 'waterDone', 'nudgeLater', 'gaveUp', 'thatWasFun', 'tttYouWin', 'tttIWin']) assert.ok(ch.lines.says[k] && ch.lines.says[k].content, `${ch.id} says ${k}`);
  }
  assert.equal(characters.get('nobody').id, characters.DEFAULT);
});

test('his own activities: in his brain, his menu and his body', () => {
  const togepi = characters.get('togepi');
  const names_ = brain.scoreActivities({ energy: 0.9, hunger: 0.9, boredom: 0.9, affection: 0.7 }, 0.3, brain.defaultContext(), { character: togepi }).map((s) => s.name);
  for (const id of ['eat', 'flower', 'play', 'adventure']) assert.ok(names_.includes(id), id);
  // A character without them never does them.
  const plain = { ...togepi, activities: [] };
  const none = brain.scoreActivities({ energy: 0.9, hunger: 0.9, boredom: 0.9, affection: 0.7 }, 0.3, brain.defaultContext(), { character: plain }).map((s) => s.name);
  assert.ok(!none.some((n) => ['eat', 'flower', 'play', 'adventure'].includes(n)));

  const c = new Companion({ bounds: { left: 0, right: 1200, top: 0, floor: 800 }, rng: () => 0.5 });
  c.state = 'idle';
  assert.equal(c.doActivity('eat'), true);
  assert.equal(c.state, 'eat');
  assert.ok(c.needs.hunger < 0.25, 'eating fed him');
  assert.equal(c.brainSnapshot().stateLabel, 'Eating an apple');
  c.state = 'idle';
  assert.equal(c.doActivity('adventure'), true);
  assert.equal(c.state, 'adventure');
  assert.ok(Math.abs(c.targetX - c.x) >= 500, 'off for a long walk');
  assert.equal(c.doActivity('nonsense'), false);
});

test('your name: in his prompts, and interactions logged under any name still count', () => {
  names.setNames({ user: 'Priya', character: 'Togepi' });
  const sys = T.systemPrompt(P.defaultPersonality());
  assert.match(sys, /who lives on Priya's computer screen/);
  assert.doesNotMatch(sys, /Sushant/);
  assert.equal(interaction('heart'), 'Priya petted you.');
  assert.equal(interactionKey('Sushant petted you.'), 'heart');
  assert.equal(interactionKey('Priya beat you at tic-tac-toe.'), 'tttYouWin');
  assert.equal(interactionKey('something else'), null);
  for (const k of Object.keys(INTERACTIONS)) {
    // "hello" and "goodMorning" say the same thing; either key counts the same.
    if (k !== 'hello') assert.equal(interactionKey(interaction(k)), k);
  }
  // Blank names are ignored.
  names.setNames({ user: '   ' });
  assert.equal(names.user(), 'Priya');
  assert.equal(names.fill('{character} and {user}'), 'Togepi and Priya');
});

test('your pronouns: he, she or they, with the verbs that go with them', () => {
  const view = { typing: { app: 'Code', title: 'a.js' }, via: 'typing' };
  const prompt = () => T.systemPrompt(P.defaultPersonality()) + '\n' + T.situationPrompt({ self: { band: 'content', needs: {}, state: 'idle', hour: 12 }, trigger: { text: 'x' }, events: [], now: Date.now(), view, canAsk: true });
  names.setNames({ user: 'Sam', pronoun: 'he' });
  assert.match(prompt(), /on his computer/);
  assert.match(prompt(), /He often uses several windows/);
  assert.match(prompt(), /← he is looking here/);
  names.setNames({ pronoun: 'she' });
  assert.match(prompt(), /on her computer/);
  assert.match(prompt(), /She often uses several windows/);
  assert.match(prompt(), /what you want to ask her, two short answers she can click/);
  assert.equal(interaction('bedtimeDone'), 'Sam said she will go to bed.');
  names.setNames({ pronoun: 'they' });
  assert.match(prompt(), /on their computer/);
  assert.match(prompt(), /They often use several windows/);
  assert.match(prompt(), /← they are looking here/);
  assert.match(prompt(), /what they told you about themselves/);
  assert.doesNotMatch(prompt(), /\b(he|his|him|she|her)\b/);
  assert.match(P.describeRelationship(P.defaultPersonality()), /likes them a little so far/);
  // Logged under another pronoun, it still counts.
  assert.equal(interactionKey('Sam said he will go to bed.'), 'bedtimeDone');
  names.setNames({ pronoun: 'nonsense' });
  assert.match(prompt(), /on their computer/);
});

test("Togepi's data is copied into Filo's folder on its first start", () => {
  const appData = fs.mkdtempSync(path.join(os.tmpdir(), 'companion-migrate-'));
  const old = path.join(appData, 'Togepi');
  fs.mkdirSync(path.join(old, 'mind', 'journal'), { recursive: true });
  fs.mkdirSync(path.join(old, 'sounds'));
  fs.writeFileSync(path.join(old, 'settings.json'), JSON.stringify({ mind: true, welcomeSeen: 11 }));
  fs.writeFileSync(path.join(old, 'brain.json'), '{"needs":{}}');
  fs.writeFileSync(path.join(old, 'mind', 'personality.md'), 'me');
  fs.writeFileSync(path.join(old, 'mind', 'journal', '2026-10-22.md'), 'a day');
  fs.writeFileSync(path.join(old, 'mind', 'engine.pids'), '123');
  fs.writeFileSync(path.join(old, 'sounds', 'cheerful-1.wav'), 'x');
  const userData = path.join(appData, 'Filo');

  assert.equal(migrate({ appData, userData }), old);
  const togepi = characterDir(userData, 'togepi');
  assert.equal(fs.readFileSync(path.join(togepi, 'mind', 'personality.md'), 'utf8'), 'me');
  assert.equal(fs.readFileSync(path.join(togepi, 'mind', 'journal', '2026-10-22.md'), 'utf8'), 'a day');
  assert.ok(fs.existsSync(path.join(togepi, 'brain.json')));
  assert.ok(fs.existsSync(path.join(togepi, 'sounds', 'cheerful-1.wav')));
  assert.ok(!fs.existsSync(path.join(togepi, 'mind', 'engine.pids')), 'not the old process ids');
  const settings = JSON.parse(fs.readFileSync(path.join(userData, 'settings.json'), 'utf8'));
  assert.deepEqual(settings, { mind: true, welcomeSeen: 11, userName: 'Sushant', userPronoun: 'he', character: 'togepi', characterChosen: true });
  assert.ok(fs.existsSync(path.join(old, 'mind', 'personality.md')), 'the old folder is left alone');

  // Only once: Filo's own settings are never overwritten.
  fs.writeFileSync(path.join(userData, 'settings.json'), '{"userName":"Sush"}');
  assert.equal(migrate({ appData, userData }), null);
  assert.equal(JSON.parse(fs.readFileSync(path.join(userData, 'settings.json'), 'utf8')).userName, 'Sush');
  // Nothing to copy on a fresh Mac.
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'companion-fresh-'));
  assert.equal(migrate({ appData: empty, userData: path.join(empty, 'Filo') }), null);
});

test('renamed to Filo: everything in Companion’s folder comes along, except the keys that only the old app can open', () => {
  const net = require('net');
  const appData = fs.mkdtempSync(path.join(os.tmpdir(), 'filo-migrate-'));
  const old = path.join(appData, 'Companion');
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(old, rel)), { recursive: true });
    fs.writeFileSync(path.join(old, rel), text);
  };
  put('settings.json', JSON.stringify({ userName: 'Alex', userPronoun: 'they', character: 'nomi', characterChosen: true, welcomeSeen: 27 }));
  put('characters/nomi/mind/personality.md', 'dreamy');
  put('characters/pip/brain.json', '{"needs":{}}');
  put('characters/pip/mind/engine.pids', '123');
  put('database/data/PG_VERSION', '18');
  put('database/data/postmaster.pid', '99999999\n/x');
  put('elevenlabs.key', 'locked with the old Keychain entry');
  put('gemini.key', 'locked too');
  const sock = net.createServer().listen(path.join(old, 'database', 's.sock')); // a socket file can't be copied
  const userData = path.join(appData, 'Filo');
  try {
    assert.equal(migrate({ appData, userData }), old);
  } finally {
    sock.close();
  }
  const s = JSON.parse(fs.readFileSync(path.join(userData, 'settings.json'), 'utf8'));
  assert.deepEqual([s.userName, s.userPronoun, s.character, s.welcomeSeen], ['Alex', 'they', 'nomi', 27], 'settings as they were, not Togepi defaults');
  assert.equal(fs.readFileSync(path.join(characterDir(userData, 'nomi'), 'mind', 'personality.md'), 'utf8'), 'dreamy');
  assert.ok(fs.existsSync(path.join(characterDir(userData, 'pip'), 'brain.json')), 'every character, not only Togepi');
  assert.ok(!fs.existsSync(path.join(characterDir(userData, 'pip'), 'mind', 'engine.pids')));
  assert.equal(fs.readFileSync(path.join(userData, 'database', 'data', 'PG_VERSION'), 'utf8'), '18', 'the database too');
  assert.ok(!fs.existsSync(path.join(userData, 'database', 'data', 'postmaster.pid')));
  assert.ok(!fs.existsSync(path.join(userData, 'elevenlabs.key')) && !fs.existsSync(path.join(userData, 'gemini.key')), 'asked for again');
  assert.ok(fs.existsSync(path.join(old, 'elevenlabs.key')), 'the old folder is left alone');

  // The old app is still running: its database isn't copied (it's rebuilt from the event logs).
  const live = path.join(appData, 'live');
  fs.mkdirSync(path.join(live, 'Companion', 'characters'), { recursive: true });
  fs.mkdirSync(path.join(live, 'Companion', 'database', 'data'), { recursive: true });
  fs.writeFileSync(path.join(live, 'Companion', 'settings.json'), '{}');
  fs.writeFileSync(path.join(live, 'Companion', 'database', 'data', 'postmaster.pid'), `${process.pid}\n/x`);
  assert.equal(migrate({ appData: live, userData: path.join(live, 'Filo') }), path.join(live, 'Companion'));
  assert.ok(!fs.existsSync(path.join(live, 'Filo', 'database')));
  assert.ok(fs.existsSync(path.join(live, 'Filo', 'settings.json')));
});

test('your notes file is now about-you.md (about-sushant.md is renamed)', () => {
  const { Memory } = require('../src/main/mind/memory');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'companion-notes-'));
  fs.writeFileSync(path.join(dir, 'about-sushant.md'), "# About Sushant\n\n## Notes from Sushant\n\nI study at Stony Brook.\n\n## What I've learned\n\n");
  const m = new Memory(dir);
  assert.equal(m.notes, 'I study at Stony Brook.');
  assert.ok(fs.existsSync(path.join(dir, 'about-you.md')));
  assert.ok(!fs.existsSync(path.join(dir, 'about-sushant.md')));
  m.saveAbout();
  assert.equal(new Memory(dir).notes, 'I study at Stony Brook.');
  assert.match(fs.readFileSync(path.join(dir, 'about-you.md'), 'utf8'), /## Your notes\n\nI study at Stony Brook\./);
});
