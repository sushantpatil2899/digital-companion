'use strict';

// Builds the prompt for one "think" step and checks what comes back.
// The language model gets his personality, how he feels, what's going on,
// his own recent decisions and how you reacted, and answers with a private
// thought, how much he wants to speak, up to four lines he could say and an
// action. Whether he actually speaks is decided in mind.js.
// No Electron imports, so it can be unit tested.

const P = require('./personality');
const { describeEvent } = require('./events');

const MAX_WORDS = 8;
const MAX_LINES = 4;

// Things he can do along with (or instead of) speaking.
const ACTIONS = ['none', 'wave', 'happy', 'jump', 'curious', 'shy', 'sad', 'lookAround', 'askToPlay'];

// JSON schema the model's answer must follow (llama-server enforces it).
const SCHEMA = {
  type: 'object',
  properties: {
    thought: { type: 'string', maxLength: 140 },
    urge: { type: 'number', minimum: 0, maximum: 1 },
    lines: { type: 'array', items: { type: 'string', maxLength: 60 }, minItems: 1, maxItems: MAX_LINES },
    action: { type: 'string', enum: ACTIONS },
  },
  required: ['thought', 'urge', 'lines', 'action'],
};

const BAND_WORDS = {
  cheerful: 'cheerful and bubbly',
  content: 'content',
  meh: 'a bit meh',
  sad: 'sad',
  grumpy: 'grumpy',
};

// What he's doing (companion states), in words; others aren't mentioned.
const STATE_WORDS = {
  idle: 'hanging out', walk: 'walking around', run: 'running around', sit: 'sitting down', sleep: 'asleep',
  lookAround: 'looking around', talk: 'chattering to yourself', eat: 'eating an apple', flower: 'smelling a flower',
  play: 'playing with your ball', adventure: 'off on an adventure', backView: "watching Sushant's screen",
  sad: 'feeling down', angry: 'cross', shy: 'feeling shy', curious: 'curious', hug: 'getting a hug', happy: 'happy',
  grabbed: 'being held by Sushant', fall: 'falling', jump: 'jumping', wave: 'waving',
  offerBall: 'holding out your ball to play fetch', watchBall: 'watching the ball Sushant threw',
  offerGame: 'asking Sushant to play tic-tac-toe', ttt: 'playing tic-tac-toe with Sushant',
};

function partOfDay(hour) {
  if (hour < 5) return 'the middle of the night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'late at night';
}

/** What his needs say, in words ("a bit hungry, sleepy"). */
function needsWords(n) {
  if (!n) return '';
  const out = [];
  if (n.hunger > 0.7) out.push('hungry');
  if (n.energy < 0.3) out.push('sleepy');
  if (n.boredom > 0.6) out.push('bored');
  if (n.affection < 0.4) out.push('lonely');
  if (n.affection > 0.75) out.push('loved');
  return out.join(', ');
}

function systemPrompt(personality) {
  const traits = P.describe(personality)
    .map((t) => `- ${t}`)
    .join('\n');
  return [
    "You are the inner voice of Togepi, a baby Pokémon who lives on Sushant's computer screen as his companion.",
    personality.self,
    '',
    'Your personality (only what stands out):',
    traits,
    '',
    `You and Sushant: you ${P.describeRelationship(personality)}.`,
    '',
    'How you talk:',
    `- At most ${MAX_WORDS} words, one short sentence. Simple, cute baby words.`,
    '- Sometimes add a Togepi sound like "Toge!" or "Priii!".',
    '- Talk to Sushant directly. Never mention being an AI, a model, a program or a prompt.',
    '- Never repeat something you said recently.',
    '- You may stay quiet. Only say something when you, with your personality, really would.',
    '- Act like your personality, even when it is not polite.',
  ].join('\n');
}

/**
 * The user message for one think step.
 * @param {object} s
 * @param {object} s.trigger    { kind, text } what woke him up
 * @param {object} s.self       { band, needs, state, hour }
 * @param {object[]} s.events   recent log entries (see events.js)
 * @param {number} s.now        ms epoch
 */
function situationPrompt(s) {
  const lines = [];
  const self = s.self || {};
  const feel = [BAND_WORDS[self.band] || 'content', needsWords(self.needs)].filter(Boolean).join(', ');
  const doing = STATE_WORDS[self.state];
  lines.push(`It's ${partOfDay(self.hour != null ? self.hour : 12)}. You feel ${feel}.${doing ? ` You are ${doing}.` : ''}`);
  const happened = (s.events || []).filter((e) => ['observe', 'interact', 'changed'].includes(e.kind));
  const decided = (s.events || []).filter((e) => ['said', 'silent'].includes(e.kind));
  if (happened.length) {
    lines.push('', 'What happened recently (oldest first):');
    for (const e of happened) lines.push(`- ${describeEvent(e, s.now)}`);
  }
  if (decided.length) {
    lines.push('', 'Your recent decisions:');
    for (const e of decided) lines.push(`- ${describeEvent(e, s.now)}`);
  }
  lines.push('', `Just now: ${s.trigger.text}`);
  lines.push(
    '',
    'Think one short private thought. Then decide how much you want to say something right now (urge, 0 = not at all, 1 = must say it), ' +
      `write up to ${MAX_LINES} different lines you might say, and pick an action (${ACTIONS.join(', ')}). Answer in JSON.`,
  );
  return lines.join('\n');
}

function words(s) {
  return String(s).trim().split(/\s+/).filter(Boolean);
}

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Two lines that say nearly the same thing (by shared words). */
function similar(a, b) {
  const wa = new Set(norm(a).split(' ').filter(Boolean));
  const wb = new Set(norm(b).split(' ').filter(Boolean));
  if (!wa.size || !wb.size) return false;
  let both = 0;
  for (const w of wa) if (wb.has(w)) both++;
  return both / Math.max(wa.size, wb.size) >= 0.7;
}

const FORBIDDEN = /\b(ai|a\.i\.|language model|assistant|chatbot|prompt|as an? (ai|model)|openai|llama)\b|https?:\/\/|www\./i;
// Broken output: replacement or control characters.
const GARBLED = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * One line ready to show, or null: first sentence only, at most MAX_WORDS
 * words, nothing he must never say, not a repeat of `recent` lines.
 */
function cleanLine(line, recent = []) {
  if (typeof line !== 'string' || GARBLED.test(line)) return null;
  let s = line.replace(/[\r\n]+/g, ' ').replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '').replace(/\s+/g, ' ').trim();
  if (!s || FORBIDDEN.test(s)) return null;
  const whole = s;
  // First sentence only (keep "Toge!" style openers with what follows).
  const m = s.match(/^(.+?[.!?…]+)(\s|$)/);
  if (m && words(m[1]).length >= 2) s = m[1];
  const w = words(s);
  if (w.length > MAX_WORDS) s = `${w.slice(0, MAX_WORDS).join(' ').replace(/[,;:]$/, '')}…`;
  if (recent.some((r) => similar(r, s) || similar(r, whole))) return null;
  return s;
}

/** Parse and check the model's JSON answer. Returns null if it's unusable. */
function parseThought(text, recent = []) {
  let o;
  try {
    o = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object') return null;
  const lines = [];
  for (const l of Array.isArray(o.lines) ? o.lines : []) {
    const c = cleanLine(l, [...recent, ...lines]);
    if (c) lines.push(c);
    if (lines.length >= MAX_LINES) break;
  }
  const urge = Number(o.urge);
  return {
    thought: typeof o.thought === 'string' ? o.thought.slice(0, 200) : '',
    urge: Number.isFinite(urge) ? Math.max(0, Math.min(1, urge)) : 0,
    lines,
    action: ACTIONS.includes(o.action) ? o.action : 'none',
  };
}

module.exports = { MAX_WORDS, ACTIONS, SCHEMA, systemPrompt, situationPrompt, cleanLine, parseThought, similar, needsWords };
