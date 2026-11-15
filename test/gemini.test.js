'use strict';

// Optional Gemini voice (SBU Hacks): his voice model on Google's Gemini API,
// behind the same interface as the local Engine. A fake fetch stands in for
// Google, so nothing goes online.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { GeminiEngine, GEMINI_DEFAULTS, engineChoice, applyEngineEnv, engineChoices, toGeminiSchema } = require('../src/main/mind/gemini');
const { Engine } = require('../src/main/mind/engine');
const T = require('../src/main/mind/thinker');

const settingsWith = (values) => ({ get: (k) => values[k] });

function fakeFetch(replies) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const r = typeof replies === 'function' ? replies(calls.length) : replies[Math.min(calls.length, replies.length) - 1];
    return { ok: r.status === 200, status: r.status, statusText: r.statusText || '', json: async () => r.json };
  };
  return { calls, fetchImpl };
}

const answer = (text, extra = {}) => ({ status: 200, json: { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], ...extra } });

test('the engine is local unless the setting says gemini', () => {
  assert.equal(engineChoice(settingsWith({ mindEngine: 'local' })), 'local');
  assert.equal(engineChoice(settingsWith({})), 'local');
  assert.equal(engineChoice(null), 'local');
  assert.equal(engineChoice(settingsWith({ mindEngine: 'Gemini' })), 'gemini');
  assert.equal(engineChoice(settingsWith({ mindEngine: 'something else' })), 'local');
});

test('MIND_ENGINE sets the choice when he starts and it is kept; the menu changes it later', () => {
  const values = { mindEngine: 'local' };
  const saved = [];
  const s = { get: (k) => values[k], set: (k, v) => { values[k] = v; saved.push([k, v]); } };
  applyEngineEnv(s, { MIND_ENGINE: 'Gemini' });
  assert.equal(engineChoice(s), 'gemini');
  assert.deepEqual(saved, [['mindEngine', 'gemini']]);
  // Nothing set, unknown or the same: nothing saved.
  applyEngineEnv(s, {});
  applyEngineEnv(s, { MIND_ENGINE: 'cloud' });
  applyEngineEnv(s, { MIND_ENGINE: 'gemini' });
  assert.equal(saved.length, 1);
});

test('Mind → Think with offers Gemma on this Mac and Gemini online, like Listen with', () => {
  const withKey = engineChoices({ hasKey: true });
  assert.deepEqual(withKey.map(([id]) => id), ['local', 'gemini']);
  assert.match(withKey[0][1], /^Gemma, on this Mac \(about 11 GB of memory; nothing leaves it\)$/);
  assert.match(withKey[1][1], /^Gemini \(online: what he thinks about goes to Google\)$/);
  assert.match(engineChoices({ hasKey: false })[1][1], /add your key in Welcome and what’s new…/);
});

test('the key you saved in the app is used; the environment only when there is none', () => {
  const s = settingsWith({ gemini: { localDecider: false } });
  assert.equal(GeminiEngine.fromSettings(s, { env: {}, apiKey: ' saved ' }).apiKey, 'saved');
  assert.equal(GeminiEngine.fromSettings(s, { env: { GEMINI_API_KEY: 'env' }, apiKey: null }).apiKey, 'env');
  assert.equal(GeminiEngine.fromSettings(s, { env: {}, apiKey: null }).apiKey, null);
});

test('the key and model come from the environment and settings, nothing built in', () => {
  const none = GeminiEngine.fromSettings(settingsWith({ gemini: { localDecider: false } }), { env: {} });
  assert.equal(none.apiKey, null);
  assert.equal(none.ready, false);
  assert.deepEqual(none.files.missing, ['GEMINI_API_KEY']);
  assert.match(none.status(), /no GEMINI_API_KEY/);

  const e = GeminiEngine.fromSettings(settingsWith({ gemini: { model: 'my-model', localDecider: false } }), { env: { GEMINI_API_KEY: ' k1 ' } });
  assert.equal(e.apiKey, 'k1');
  assert.equal(e.model, 'my-model');
  assert.equal(e.files.voice, 'gemini/my-model');
  assert.equal(e.local, null);
  // Google's order: GOOGLE_API_KEY wins; GEMINI_MODEL wins over the setting.
  const g = GeminiEngine.fromSettings(settingsWith({ gemini: { localDecider: false } }), { env: { GEMINI_API_KEY: 'a', GOOGLE_API_KEY: 'b', GEMINI_MODEL: 'env-model' } });
  assert.equal(g.apiKey, 'b');
  assert.equal(g.model, 'env-model');
  assert.equal(GeminiEngine.fromSettings(settingsWith({ gemini: {} }), { env: { GEMINI_API_KEY: 'k' } }).model, GEMINI_DEFAULTS.model);
});

test('a think step sends his prompt, the chat so far and the picture, with the key in a header', async () => {
  const { calls, fetchImpl } = fakeFetch([answer('{"thought":"Yay","urge":8,"lines":["You did it!"],"action":"celebrate"}')]);
  const e = new GeminiEngine({ apiKey: 'secret', model: 'm1', fetchImpl });
  await e.start();
  assert.equal(e.ready, true);
  assert.equal(e.canSee, true);
  const text = await e.think({
    system: 'who he is',
    user: 'what is happening',
    schema: T.SCHEMA,
    image: 'BASE64JPEG',
    history: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello!' }],
  });
  assert.equal(JSON.parse(text).action, 'celebrate');
  const c = calls[0];
  assert.match(c.url, /\/v1beta\/models\/m1:generateContent$/);
  assert.equal(c.init.headers['x-goog-api-key'], 'secret');
  assert.ok(!c.url.includes('secret'), 'the key is never in the address');
  assert.deepEqual(c.body.systemInstruction, { parts: [{ text: 'who he is' }] });
  assert.deepEqual(c.body.contents.map((m) => m.role), ['user', 'model', 'user']);
  const last = c.body.contents[2].parts;
  assert.deepEqual(last[0], { inlineData: { mimeType: 'image/jpeg', data: 'BASE64JPEG' } });
  assert.equal(last[last.length - 1].text, 'what is happening');
  assert.equal(c.body.generationConfig.responseMimeType, 'application/json');
  assert.equal(c.body.generationConfig.responseSchema.type, 'OBJECT');
});

test('pictures can be turned off', async () => {
  const { calls, fetchImpl } = fakeFetch([answer('{}')]);
  const e = new GeminiEngine({ apiKey: 'k', images: false, fetchImpl });
  await e.start();
  assert.equal(e.canSee, false);
  await e.think({ system: 's', user: 'u', image: 'X' });
  assert.ok(!JSON.stringify(calls[0].body).includes('inlineData'));
});

test('his answer schema is turned into what Gemini takes; lengths stay checked in code', () => {
  const g = toGeminiSchema(T.SCHEMA);
  assert.equal(g.type, 'OBJECT');
  assert.deepEqual(g.required, T.SCHEMA.required);
  assert.equal(g.properties.lines.type, 'ARRAY');
  assert.equal(g.properties.lines.items.type, 'STRING');
  assert.equal(g.properties.lines.maxItems, T.SCHEMA.properties.lines.maxItems);
  assert.equal(g.properties.lines.items.maxLength, undefined);
  assert.deepEqual(g.properties.action.enum, T.ACTIONS);
  assert.equal(g.properties.urge.minimum, 0);
});

test('settings can pass Gemini its own generation options', async () => {
  const { calls, fetchImpl } = fakeFetch([answer('{}')]);
  const e = new GeminiEngine({ apiKey: 'k', generationConfig: { temperature: 0.4, maxOutputTokens: 300 }, fetchImpl });
  await e.start();
  await e.think({ system: 's', user: 'u' });
  assert.equal(calls[0].body.generationConfig.temperature, 0.4);
  assert.equal(calls[0].body.generationConfig.maxOutputTokens, 300);
});

test('thought parts are skipped; a schema Gemini refuses falls back to plain JSON', async () => {
  const thinking = { status: 200, json: { candidates: [{ content: { parts: [{ text: 'let me think', thought: true }, { text: '{"reply":"ok"}' }] } }] } };
  const { calls, fetchImpl } = fakeFetch([{ status: 400, json: { error: { message: 'bad schema' } } }, thinking]);
  const e = new GeminiEngine({ apiKey: 'k', fetchImpl });
  await e.start();
  assert.equal(await e.think({ system: 's', user: 'u', schema: T.CHAT_SCHEMA }), '{"reply":"ok"}');
  assert.equal(calls.length, 2);
  assert.ok(calls[0].body.generationConfig.responseSchema);
  assert.equal(calls[1].body.generationConfig.responseSchema, undefined);
});

test('errors say what happened (and show in the brain view), never the key', async () => {
  const { fetchImpl } = fakeFetch((n) => (n === 1 ? { status: 429, json: { error: { message: 'Resource exhausted' } } } : answer('', { promptFeedback: { blockReason: 'SAFETY' } })));
  const e = new GeminiEngine({ apiKey: 'secret-key', fetchImpl });
  await e.start();
  await assert.rejects(e.think({ system: 's', user: 'u' }), /429 \(too many requests: free tier limit\)/);
  assert.match(e.status(), /429/);
  await assert.rejects(e.think({ system: 's', user: 'u' }), /no answer \(SAFETY\)/);
  assert.ok(!e.status().includes('secret-key'));
});

test('stopped (resting) it does not think; started again it does', async () => {
  const { fetchImpl } = fakeFetch([answer('{}')]);
  const e = new GeminiEngine({ apiKey: 'k', fetchImpl });
  await e.start();
  e.stop();
  assert.equal(e.ready, false);
  assert.equal(e.running, false);
  await assert.rejects(e.think({ system: 's', user: 'u' }), /stopped/);
  await e.start();
  assert.equal(await e.think({ system: 's', user: 'u' }), '{}');
});

test('decisions and memory search go to the local models when they run, and are off otherwise', async () => {
  const local = {
    canDecide: true,
    canEmbed: true,
    running: false,
    files: { decide: '/m/vllm-d3-nano-Q8_0.gguf', embed: null, missing: [] },
    started: 0,
    stopped: 0,
    start() { this.started++; this.running = true; return Promise.resolve(true); },
    stop() { this.stopped++; this.running = false; },
    decide: async (state, q) => ({ asked: Object.keys(q) }),
    embed: async (texts) => texts.map(() => [1, 0]),
    memoryMB: async () => 2600,
    status: () => 'running',
  };
  const e = new GeminiEngine({ apiKey: 'k', local });
  await e.start();
  assert.equal(local.started, 1);
  assert.deepEqual(await e.decide('s', { privacy: {} }), { asked: ['privacy'] });
  assert.deepEqual(await e.embed(['a']), [[1, 0]]);
  assert.equal(await e.memoryMB(), 2600);
  assert.equal(e.files.decide, '/m/vllm-d3-nano-Q8_0.gguf');
  assert.match(e.status(), /decision model on this Mac: running/);
  e.stop();
  assert.equal(local.stopped, 1);

  const alone = new GeminiEngine({ apiKey: 'k' });
  assert.equal(alone.canDecide, false);
  await assert.rejects(alone.decide('s', {}), /decision model not running/);
  assert.equal(await alone.memoryMB(), null);
});

test('his mind thinks, talks and chats through Gemini like through the local models', async () => {
  const { Mind } = require('../src/main/mind/mind');
  const { calls, fetchImpl } = fakeFetch((n) => answer(n === 1 ? '{"thought":"A pat!","urge":9,"lines":["That tickles!"],"action":"happy"}' : '{"reply":"You did it! I knew you could.","action":"celebrate"}'));
  const engine = new GeminiEngine({ apiKey: 'k', fetchImpl });
  await engine.start();
  const spoken = [];
  const mind = new Mind({
    engine,
    now: () => 5_000_000,
    rng: () => 0.5,
    getSelf: () => ({ band: 'cheerful', needs: {}, state: 'idle', hour: 15, quiet: false, away: false, asleep: false, busy: false }),
    onSpeak: (s) => spoken.push(s),
    onAsk: () => true,
  });
  mind.nextJournalCheck = Infinity;
  mind.interact('You petted him.');
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  assert.equal(spoken[0] && spoken[0].text, 'That tickles!');
  const r = await mind.chat('I did it');
  assert.equal(r.action, 'celebrate');
  assert.match(r.reply, /You did it!/);
  assert.equal(calls.length, 2);
  assert.match(calls[1].body.systemInstruction.parts[0].text, /Moments that can matter to/);
});

test('the local engine can run without its voice model', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-'));
  fs.mkdirSync(path.join(root, 'engine'));
  fs.mkdirSync(path.join(root, 'models'));
  fs.writeFileSync(path.join(root, 'engine', 'llama-server'), '');
  fs.writeFileSync(path.join(root, 'models', 'd3.gguf'), '');
  fs.writeFileSync(path.join(root, 'models', 'models.json'), JSON.stringify({ decide: { file: 'd3.gguf' } }));
  assert.deepEqual(new Engine({ root }).files.missing, ['voice']);
  const light = new Engine({ root, voice: false });
  assert.deepEqual(light.files.missing, []);
  assert.equal(light.state, 'stopped');
  fs.rmSync(root, { recursive: true, force: true });
});

test('requests to Gemini never carry half an emoji (like the local models’ 400)', async () => {
  const { calls, fetchImpl } = fakeFetch([answer('{}')]);
  const e = new GeminiEngine({ apiKey: 'k', fetchImpl });
  await e.start();
  const cut = 'Mood: 😀😀'.slice(0, 7); // ends in half an emoji
  await e.think({ system: 'fine 😀', user: `${cut} and more`, history: [{ role: 'user', content: cut }] });
  assert.doesNotMatch(calls[0].init.body, /\\ud83d(?!\\ude00)/i);
  assert.equal(calls[0].body.contents[1].parts[0].text, 'Mood:  and more');
  assert.equal(calls[0].body.systemInstruction.parts[0].text, 'fine 😀', 'whole emoji stay');
});
