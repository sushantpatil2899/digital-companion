'use strict';

// Phase 8: the chat window, and typing your own answer to his questions.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const T = require('../src/main/mind/thinker');
const P = require('../src/main/mind/personality');
const { Mind, MIND } = require('../src/main/mind/mind');
const { dayRelationship } = require('../src/main/mind/growth');
const { describeEvent } = require('../src/main/mind/events');
const { dayDigest } = require('../src/main/mind/journal');

function makeMind(reply, { dir = null, clock } = {}) {
  let t = clock ? clock.t : 10_000_000;
  const calls = [];
  const facts = [];
  const memory = { notes: 'I study at Stony Brook.', recall: () => [{ text: 'Sushant likes ramen', date: null }], addFacts: (items) => (facts.push(...items), items) };
  const mind = new Mind({
    engine: {
      ready: true,
      canDecide: false,
      async think(req) {
        calls.push(req);
        const r = typeof reply === 'function' ? reply(req) : reply;
        return JSON.stringify(r.urge != null ? { ...r, urge: r.urge * 10 } : r);
      },
      status: () => 'running',
    },
    now: () => t,
    rng: () => 0.5,
    memory,
    getSelf: () => ({ band: 'cheerful', needs: {}, state: 'idle', hour: 14, quiet: false, away: false, asleep: false, busy: false }),
    onSpeak: () => {},
    onAsk: () => true,
    chatFile: dir ? path.join(dir, 'chat.json') : null,
    ownAnswersFile: dir ? path.join(dir, 'own-answers.json') : null,
  });
  mind.nextJournalCheck = Infinity;
  return { mind, calls, facts, advance: (s) => (t += s * 1000) };
}

const flush = () => new Promise((r) => setImmediate(r));

test('in the chat he answers in up to three short sentences', () => {
  const sys = T.systemPrompt(P.defaultPersonality(), '', { chat: true });
  assert.match(sys, /chatting with you in a chat window/);
  assert.match(sys, /One to three short sentences/);
  assert.doesNotMatch(sys, /At most 8 words/);
  assert.doesNotMatch(sys, /You may stay quiet/);
  assert.match(T.systemPrompt(P.defaultPersonality()), /At most 8 words/);
  assert.deepEqual(T.parseReply(JSON.stringify({ reply: 'Hi Sushant! Ramen today? Yum yum! Extra sentence here.', action: 'happy' })), { reply: 'Hi Sushant! Ramen today? Yum yum!', action: 'happy' });
  assert.equal(T.parseReply(JSON.stringify({ reply: 'Togepi happy! *wiggles* I feel sparkly!', action: 'wave' })).reply, 'Togepi happy! I feel sparkly!');
  assert.equal(T.parseReply(JSON.stringify({ reply: 'Study? So many big words! *Togepi hop!', action: 'wave' })).reply, 'Study? So many big words! Togepi hop!');
  assert.equal(T.parseReply(JSON.stringify({ reply: 'As an AI, I…', action: 'none' })), null);
  assert.equal(T.parseReply('not json'), null);
  assert.equal(T.parseReply(JSON.stringify({ reply: 'Play?', action: 'askToPlay' })).action, 'none');
});

test("he replies with what he knows: today's conversation, memories, notes, what you're doing", async () => {
  let n = 0;
  const { mind, calls } = makeMind(() => ({ reply: n++ ? 'Ramen again? Yum!' : 'Hi hi Sushant!', action: 'happy' }));
  mind.setView({ typing: { app: 'Code', title: 'chat.js' } });
  assert.deepEqual(await mind.chat('hello Togepi'), { reply: 'Hi hi Sushant!', action: 'happy' });
  assert.deepEqual(await mind.chat('what should I eat?'), { reply: 'Ramen again? Yum!', action: 'happy' });
  const last = calls[1];
  assert.equal(last.schema, T.CHAT_SCHEMA);
  assert.match(last.system, /I study at Stony Brook\./);
  assert.match(last.user, /Sushant: what should I eat\?/);
  assert.match(last.user, /Sushant likes ramen/);
  assert.match(last.user, /typing in: Code, "chat\.js"/);
  assert.deepEqual(last.history, [
    { role: 'user', content: 'hello Togepi' },
    { role: 'assistant', content: 'Hi hi Sushant!' },
  ]);
  assert.deepEqual(
    mind.todaysChat().map((m) => `${m.from}: ${m.text}`),
    ['you: hello Togepi', 'him: Hi hi Sushant!', 'you: what should I eat?', 'him: Ramen again? Yum!'],
  );
  // It's in his day (for his thoughts and his diary).
  const chats = mind.log.recent(20, ['chat']);
  assert.equal(chats.length, 4);
  assert.match(describeEvent(chats[0], Date.now()), /in the chat, Sushant wrote "hello Togepi"/);
  assert.match(dayDigest(chats), /What you and Sushant wrote in the chat:[\s\S]*Sushant: hello Togepi[\s\S]*You: Hi hi Sushant!/);
});

test('a chat counts like a pat, once per conversation', async () => {
  const { mind, advance } = makeMind({ reply: 'Hehe!', action: 'happy' });
  await mind.chat('hi');
  await mind.chat('how are you');
  advance(MIND.conversationGap + 1);
  await mind.chat('back again');
  const chatted = mind.log.recent(50, ['interact']).filter((e) => e.text === 'Sushant chatted with you in the chat window.');
  assert.equal(chatted.length, 2);
  assert.equal(dayRelationship(chatted).affection, 1.2);
});

test("today's chat is kept across restarts and starts fresh the next day", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-chat-'));
  const clock = { t: new Date(2026, 9, 22, 14, 0).getTime() };
  const a = makeMind({ reply: 'Toge toge!', action: 'none' }, { dir, clock });
  await a.mind.chat('morning!');
  const b = makeMind({ reply: 'x', action: 'none' }, { dir, clock });
  assert.deepEqual(b.mind.todaysChat().map((m) => m.text), ['morning!', 'Toge toge!']);
  const c = makeMind({ reply: 'x', action: 'none' }, { dir, clock: { t: clock.t + 24 * 3600 * 1000 } });
  assert.deepEqual(c.mind.todaysChat(), []);
});

test('no chat without his mind running', async () => {
  const { mind } = makeMind({ reply: 'x', action: 'none' });
  mind.engine.ready = false;
  assert.deepEqual(await mind.chat('hi'), { error: 'his mind is not running' });
  assert.deepEqual(await mind.chat('   '), { error: 'nothing to send' });
});

// ------------------------------------------------------------------ your own answer

const ASK = { thought: 'Food?', urge: 0.9, lines: ['Yum?'], action: 'curious', question: { text: 'Pizza or pasta?', answers: ['🍕 Pizza', '🍝 Pasta'], aboutSushant: true } };

test('your own answer (✏️) is remembered, counts as answering, and he reacts to it in the chat', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-own-'));
  let n = 0;
  const { mind, calls, facts } = makeMind(() => (n++ === 0 ? ASK : { reply: 'Ooh, dosa! Yummy!', action: 'happy' }), { dir });
  mind.interact('Sushant petted you.');
  await flush();
  assert.deepEqual(mind.pendingQuestion(), { text: 'Pizza or pasta?', answers: ['🍕 Pizza', '🍝 Pasta'] });
  mind.holdQuestion(600);
  assert.equal(mind.awaiting.until, 10_000_000 + 600 * 1000);
  const r = await mind.chat('neither, I want dosa', { answering: true });
  assert.equal(r.reply, 'Ooh, dosa! Yummy!');
  assert.equal(mind.pendingQuestion(), null);
  assert.match(calls.at(-1).user, /You had asked him "Pizza or pasta\?" with the answers "🍕 Pizza" or "🍝 Pasta"\. Neither fit/);
  assert.equal(mind.log.last(['said']).reaction, 'answered in his own words "neither, I want dosa"');
  assert.deepEqual(facts, [{ text: 'Asked "Pizza or pasta?", Sushant answered "neither, I want dosa"', importance: 6 }]);
  assert.equal(mind.ownAnswers.length, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'own-answers.json'), 'utf8'))[0].answer, 'neither, I want dosa');
});

test('he learns from your own answers: they are in his prompt when he may ask', async () => {
  const { mind, calls, advance } = makeMind({ thought: 'hm', urge: 0.1, lines: ['Hm.'], action: 'none' });
  mind.ownAnswers = [{ question: 'Pizza or pasta?', offered: ['🍕 Pizza', '🍝 Pasta'], answer: 'neither, I want dosa', day: '2026-10-22' }];
  mind.log.add({ kind: 'observe', app: 'Google Chrome', title: 'Food delivery' });
  mind.interact('Sushant petted you.');
  await flush();
  assert.match(calls.at(-1).user, /When neither of your answers fit, Sushant wrote his own:\n- You asked "Pizza or pasta\?" \("🍕 Pizza" or "🍝 Pasta"\); he wrote: "neither, I want dosa"/);
  // Not when he can't ask (e.g. reacting to an answer).
  advance(60);
  mind.awaiting = null;
  mind.askPausedUntil = Infinity;
  mind.interact('Sushant petted you.');
  await flush();
  assert.doesNotMatch(calls.at(-1).user, /wrote his own/);
});
