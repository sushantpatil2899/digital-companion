'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const C = require('../src/main/mind/commands');
const H = require('../src/main/mind/hearing');
const W = require('../src/renderer/wav');
const characters = require('../src/characters');
const { WELCOME_VERSION, WHATS_NEW } = require('../src/main/welcome');

const NOW = new Date('2026-10-24T14:00:00').getTime();
const ACTS = [
  { id: 'eat', label: 'Eat an apple' },
  { id: 'mushrooms', label: 'Go mushroom hunting' },
  { id: 'conduct', label: 'Conduct the music' },
  { id: 'sit', label: 'Sit down' },
  { id: 'backView', label: 'Turn around' },
];
const parse = (text, ctx = {}) => C.parseCommand(text, { now: NOW, names: ['Pip'], activities: ACTS, ...ctx });

// ------------------------------------------------------------------ what you said

test('his menu’s commands, said the way people say them', () => {
  const cases = {
    'Hey Pip, come here!': { kind: 'comeHere' },
    'come over here please': { kind: 'comeHere' },
    "Let's play fetch": { kind: 'play', game: 'fetch' },
    'Can you play tic tac toe?': { kind: 'play', game: 'ttt' },
    'play with me': { kind: 'play', game: 'any' },
    'stop playing': { kind: 'stopPlaying' },
    'Take a nap': { kind: 'nap' },
    'wake up': { kind: 'wake' },
    'Stay put.': { kind: 'stayPut' },
    'you can move again': { kind: 'moveAgain' },
    'make our song': { kind: 'song' },
    'sing us a song about our week': { kind: 'song' },
    'open the chat': { kind: 'openChat' },
  };
  for (const [said, want] of Object.entries(cases)) assert.deepEqual(parse(said), want, said);
});

test('remind me…: in minutes, in an hour, at a time; without a time the window opens', () => {
  assert.deepEqual(parse('Remind me in 20 minutes to call mom'), { kind: 'remind', text: 'Call mom', at: NOW + 20 * 60e3 });
  assert.deepEqual(parse('remind me to drink water in an hour'), { kind: 'remind', text: 'Drink water', at: NOW + 3600e3 });
  assert.deepEqual(parse('remind me in half an hour to stretch'), { kind: 'remind', text: 'Stretch', at: NOW + 30 * 60e3 });
  assert.equal(parse('Remind me in ten minutes to check the oven').at, NOW + 10 * 60e3);
  const five = parse('Remind me at 5 pm to submit the form');
  assert.equal(five.text, 'Submit the form');
  assert.equal(new Date(five.at).getHours(), 17);
  assert.equal(new Date(parse('remind me at 5 to leave').at).getHours(), 17, '"at 5" in the afternoon: 5 pm');
  assert.equal(new Date(parse('remind me at 9:30 am to call').at).getDate(), 25, 'already past: tomorrow');
  assert.deepEqual(parse('remind me to stretch'), { kind: 'remindAsk' });
});

test('his activities by name; anything else is a chat message', () => {
  assert.deepEqual(parse('Eat an apple'), { kind: 'activity', id: 'eat' });
  assert.deepEqual(parse('go mushroom hunting'), { kind: 'activity', id: 'mushrooms' });
  assert.deepEqual(parse('conduct the music please'), { kind: 'activity', id: 'conduct' });
  assert.deepEqual(parse('sit down'), { kind: 'activity', id: 'sit' });
  for (const chat of ['How was your day?', 'I got the job at Stripe!', 'Nice weather today', 'what do you think about apples and the meaning of life']) {
    assert.equal(parse(chat), null, chat);
  }
});

test('"done" only means something while he’s holding something up', () => {
  assert.equal(parse('done'), null);
  assert.deepEqual(parse('I drank water', { waiting: true }), { kind: 'done' });
  assert.deepEqual(parse('okay', { waiting: true }), { kind: 'done' });
});

test('saying one of his answers picks it; the words only one answer has decide', () => {
  const answers = ['The blue one', 'The red one'];
  assert.deepEqual(parse('the blue one', { answers }), { kind: 'answer', index: 0 });
  assert.deepEqual(parse('red please', { answers }), { kind: 'answer', index: 1 });
  assert.equal(parse('I like both', { answers }), null);
  assert.deepEqual(parse('games', { answers: ['Coding all day', 'Playing games'] }), { kind: 'answer', index: 1 });
});

test('every character’s own activities can be asked for by their menu name', () => {
  for (const c of characters.list()) {
    const acts = c.activities.map((a) => ({ id: a.id, label: a.menu }));
    for (const a of acts) {
      assert.deepEqual(C.parseCommand(a.label, { now: NOW, names: [c.name], activities: acts }), { kind: 'activity', id: a.id }, `${c.id}: ${a.label}`);
    }
  }
});

test('hints for the recognizers: names and commands, short and allowed', () => {
  const h = C.hints(['Togepi', 'Pip'], ACTS);
  assert.ok(h.includes('Togepi') && h.includes('tic-tac-toe') && h.includes('eat an apple'));
  assert.ok(h.every((x) => x.length < 50 && x.split(' ').length <= 5 && !/[<>{}[\]\\]/.test(x)));
});

// ------------------------------------------------------------------ turning it into text

test('Apple: the helper’s answer, its errors, and the recording is deleted', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heard-'));
  const file = path.join(dir, 'a.wav');
  try {
    fs.writeFileSync(file, 'RIFF');
    let args = null;
    const ok = (cmd, a, _o, cb) => {
      args = [cmd, ...a];
      cb(null, '{"text":"Come here (laughs) please"}\n');
    };
    assert.equal(await H.transcribe({ engine: 'apple', file, helper: '/x/companion-listen', hints: ['Pip'], locale: 'en-US', run: ok }), 'Come here please');
    assert.deepEqual(args, ['/x/companion-listen', file, 'en-US', 'Pip']);
    assert.equal(fs.existsSync(file), false, 'never kept');

    fs.writeFileSync(file, 'RIFF');
    const denied = (_c, _a, _o, cb) => cb(new Error('exit 1'), '{"error":"Speech Recognition isn’t allowed","code":"denied"}');
    await assert.rejects(H.transcribe({ engine: 'apple', file, helper: '/x', run: denied }), /isn’t allowed/);
    assert.equal(fs.existsSync(file), false, 'deleted after a failure too');

    fs.writeFileSync(file, 'RIFF');
    await assert.rejects(H.transcribe({ engine: 'apple', file, helper: null }), /isn’t set up/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('ElevenLabs Scribe: the recording, the model and the key; a key without Speech to Text says so', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heard-'));
  const file = path.join(dir, 'a.wav');
  try {
    fs.writeFileSync(file, 'RIFFxxxx');
    let sent = null;
    const ok = async (url, opts) => {
      sent = { url, opts };
      return { ok: true, json: async () => ({ text: 'Let’s play fetch' }) };
    };
    assert.equal(await H.transcribe({ engine: 'elevenlabs', file, key: 'k1', hints: ['Pip', 'fetch'], fetchImpl: ok }), 'Let’s play fetch');
    assert.equal(sent.url, 'https://api.elevenlabs.io/v1/speech-to-text');
    assert.equal(sent.opts.headers['xi-api-key'], 'k1');
    const form = sent.opts.body;
    assert.equal(form.get('model_id'), 'scribe_v2');
    assert.deepEqual(form.getAll('keyterms'), ['Pip', 'fetch']);
    assert.equal(form.get('file').type, 'audio/wav');
    assert.equal(fs.existsSync(file), false);

    fs.writeFileSync(file, 'RIFF');
    const noPerm = async () => ({ ok: false, status: 401, json: async () => ({ detail: { message: 'The API key you used is missing the permission speech_to_text to execute this operation.' } }) });
    await assert.rejects(H.transcribe({ engine: 'elevenlabs', file, key: 'k1', fetchImpl: noPerm }), /give your ElevenLabs key access to Speech to Text/);
    fs.writeFileSync(file, 'RIFF');
    await assert.rejects(H.transcribe({ engine: 'elevenlabs', file, key: '' }), /no ElevenLabs key/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------ the recording

test('a WAV both recognizers read: 16 kHz, 16-bit, mono', () => {
  const tone = Float32Array.from({ length: 48000 }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / 48000));
  const wav = Buffer.from(W.toWav(tone, 48000));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt32LE(24), 16000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), 16000 * 2, 'one second');
  assert.equal(wav.length, 44 + 32000);
});

test('listening stops by itself: after you stop talking, or when nothing was said', () => {
  const run = (levels) => {
    const t = new W.Talk();
    let last = null;
    for (const l of levels) {
      last = t.step(l, 0.1);
      if (last === 'done' || last === 'nothing') return last;
    }
    return last;
  };
  const quiet = (n) => Array(n).fill(0.002);
  const loud = (n) => Array(n).fill(0.08);
  assert.equal(run([...quiet(3), ...loud(10), ...quiet(13)]), 'done', 'talked, then 1.2 s of quiet');
  assert.equal(run([...quiet(3), ...loud(10), ...quiet(5)]), 'talking', 'a short pause isn’t the end');
  assert.equal(run(quiet(70)), 'nothing', 'nothing said for 6 s');
  assert.equal(run([...quiet(3), ...loud(200)]), 'done', 'at most 12 s');
});

test('the welcome window has Talk to me', () => {
  assert.equal(WHATS_NEW[WHATS_NEW.length - 1].version, WELCOME_VERSION);
  assert.ok(WHATS_NEW.some((w) => /Talk to me/.test(w.title)));
});

test('night-only activities can only be asked for at night, like in his menu', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../src/main/main.js'), 'utf8');
  const body = src.slice(src.indexOf('function commandActivities'), src.indexOf('function heard'));
  assert.match(body, /\.filter\(\(a\) => !notYet\(a\)\)/);
  // By day, "watch the moon" is then a chat message, not Nomi's moon watching.
  const nomi = characters.get('nomi');
  const byDay = nomi.activities.filter((a) => !(a.night && !nomi.isNight(12))).map((a) => ({ id: a.id, label: a.menu }));
  assert.equal(C.parseCommand('watch the moon', { now: NOW, names: ['Nomi'], activities: byDay }), null);
  const atNight = nomi.activities.filter((a) => !(a.night && !nomi.isNight(22))).map((a) => ({ id: a.id, label: a.menu }));
  assert.deepEqual(C.parseCommand('watch the moon', { now: NOW, names: ['Nomi'], activities: atNight }), { kind: 'activity', id: 'moon' });
});
