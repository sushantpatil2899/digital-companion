'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const S = require('../src/main/mind/song');
const P = require('../src/main/mind/personality');
const T = require('../src/main/mind/thinker');
const characters = require('../src/characters');

require('../src/main/mind/names').setNames({ user: 'Sushant', pronoun: 'he', character: 'Pip' });

const WEEK = {
  days: 5,
  hoursAtComputer: 14.2,
  lateNights: 3,
  apps: [{ app: 'Code', hours: 9 }, { app: 'Google Chrome', hours: 4 }],
  sites: [{ site: 'linkedin.com', hours: 2 }],
  moods: { cheerful: 300, meh: 80 },
  together: { pets: 12, throws: 2, fetches: 4, ticTacToe: 3, youWonTicTacToe: 1, chats: 7, backAfterBreaks: 3 },
  care: { water: 6, stretches: 2, bedtimes: 1, ignoredReminders: 3 },
  said: 20,
  keptQuiet: 40,
  shows: ['Severance'],
};

const GOOD = JSON.stringify({
  title: 'Fourteen Hours of Code',
  style: ['indie pop', 'ukulele', 'upbeat', '110 BPM'],
  verse: ['Fourteen hours staring at Code', 'LinkedIn tabs and a heavy load'],
  chorus: ['Drink your water, Sushant', 'I fetched the ball, you know I can'],
});

// ------------------------------------------------------------------ what he's asked

test('the prompt has the week and his diary, and nothing about how to sound', () => {
  const p = S.songPrompt({ week: WEEK, diary: [{ day: '2026-10-20', lines: ['Sushant applied to Stripe.'] }] });
  for (const s of ['14 h at the computer', 'Code (9 h)', 'linkedin.com', 'past midnight on 3 nights', 'petted you 12 times', '6 glasses of water', 'Severance', 'Sushant applied to Stripe.']) {
    assert.ok(p.includes(s), s);
  }
  // Tone only comes from the personality (Sushant, 2026-10-22 and 2026-10-24).
  assert.doesNotMatch(p, /\b(cute|baby|sweet|snarky|sarcastic|calm|dreamy|happy|funny|sad|silly)\b/i);
  assert.match(S.songPrompt({ week: null, diary: [] }), /title/);
});

test('his system prompt is his own personality, with the song format instead of the 8-word rule', () => {
  for (const c of characters.list()) {
    const p = P.defaultPersonality(c);
    const sys = S.songSystem(p, '', []);
    assert.ok(sys.includes(p.self.split('\n')[0]), `${c.id}: "Who I am"`);
    assert.doesNotMatch(sys, /At most 8 words|You may stay quiet/);
    assert.match(sys, /words of a song/);
  }
  // Normal thoughts and chat are unchanged.
  const p = P.defaultPersonality();
  assert.match(T.systemPrompt(p), /At most 8 words/);
  assert.match(T.systemPrompt(p, '', { chat: true }), /One to three short sentences/);
});

// ------------------------------------------------------------------ his answer

test('a good answer is kept; broken, empty or private words are not', () => {
  const s = S.parseSong(GOOD);
  assert.equal(s.title, 'Fourteen Hours of Code');
  assert.equal(s.verse.length, 2);
  assert.equal(S.parseSong('not json'), null);
  assert.equal(S.parseSong(JSON.stringify({ title: 'x', style: ['a', 'b'], verse: ['one'], chorus: ['a', 'b'] })), null, 'too few lines');
  const leaky = S.parseSong(
    JSON.stringify({ title: 'Mail', style: ['pop', 'piano'], verse: ['Write to me at sushant@example.com', 'Line two', 'Line three'], chorus: ['As an AI I sing', 'Chorus two', 'Chorus three'] }),
  );
  assert.deepEqual(leaky.verse, ['Line two', 'Line three'], 'an email address is never sung');
  assert.deepEqual(leaky.chorus, ['Chorus two', 'Chorus three']);
});

test('your privacy blocklist stops a song before it is sent', () => {
  const s = S.parseSong(GOOD);
  assert.equal(S.blockedWords(s, { words: ['interview'], sites: [], apps: [] }), null);
  assert.equal(S.blockedWords(s, { words: [], sites: ['linkedin'], apps: [] }), 'linkedin');
});

// ------------------------------------------------------------------ ElevenLabs

test('the composition plan: verse then chorus, 30 s, his style plus the singer', () => {
  const plan = S.compositionPlan(S.parseSong(GOOD), 'sweet female vocals');
  assert.equal(plan.chunks.length, 2);
  assert.equal(plan.chunks.reduce((t, c) => t + c.duration_ms, 0), 30000);
  assert.match(plan.chunks[0].text, /^\[Verse\]\nFourteen hours staring at Code\n/);
  assert.match(plan.chunks[1].text, /^\[Chorus\]\n/);
  assert.ok(plan.chunks[0].positive_styles.includes('indie pop'));
  assert.ok(plan.chunks.every((c) => c.positive_styles.includes('sweet female vocals')));
});

test('compose sends the plan with the key and returns the mp3; errors say why', async () => {
  let sent = null;
  const ok = async (url, opts) => {
    sent = { url, opts };
    return { ok: true, arrayBuffer: async () => new Uint8Array([0x49, 0x44, 0x33]).buffer };
  };
  const plan = S.compositionPlan(S.parseSong(GOOD));
  const audio = await S.compose(plan, 'k123', { fetchImpl: ok });
  assert.equal(audio.toString('latin1'), 'ID3');
  assert.match(sent.url, /^https:\/\/api\.elevenlabs\.io\/v1\/music/);
  assert.equal(sent.opts.headers['xi-api-key'], 'k123');
  const body = JSON.parse(sent.opts.body);
  assert.equal(body.model_id, 'music_v2_5');
  assert.deepEqual(body.composition_plan, plan);

  const bad = async () => ({ ok: false, status: 401, json: async () => ({ detail: { message: 'Invalid API key' } }) });
  await assert.rejects(S.compose(plan, 'k', { fetchImpl: bad }), /ElevenLabs 401: Invalid API key/);
  await assert.rejects(S.compose(plan, '', { fetchImpl: ok }), /no ElevenLabs key/);
});

// ------------------------------------------------------------------ when and where

test('one song a week, from Sunday 6 pm', () => {
  const at = (s) => new Date(s).getTime();
  assert.equal(S.weekDue(at('2026-10-24T12:00:00')), at('2026-10-18T18:00:00'), 'Saturday: last Sunday');
  assert.equal(S.weekDue(at('2026-10-25T17:59:00')), at('2026-10-18T18:00:00'), 'Sunday afternoon: still last week');
  assert.equal(S.weekDue(at('2026-10-25T18:30:00')), at('2026-10-25T18:00:00'), 'Sunday evening: this week');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'songs-'));
  try {
    assert.equal(S.songDue(dir, at('2026-10-25T19:00:00')), true);
    const saved = S.saveSong(dir, S.parseSong(GOOD), Buffer.from('ID3'), { week: WEEK, now: at('2026-10-25T19:00:00') });
    assert.equal(saved.id, '2026-10-25');
    assert.equal(S.songDue(dir, at('2026-10-26T10:00:00')), false);
    assert.equal(S.songDue(dir, at('2026-11-01T18:30:00')), true);
    const again = S.saveSong(dir, S.parseSong(GOOD), Buffer.from('ID3'), { now: at('2026-10-25T20:00:00') });
    assert.equal(again.id, '2026-10-25-2');
    const list = S.listSongs(dir);
    assert.deepEqual(list.map((s) => s.id), ['2026-10-25-2', '2026-10-25']);
    assert.match(list[1].week, /^14 h at the computer · mostly Code · 3 late nights · 12 pats/);
    assert.equal(list[0].week, null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
