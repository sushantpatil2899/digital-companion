'use strict';

// Builds the prompt for one "think" step and checks what comes back.
// The language model gets his personality, how he feels, what's going on,
// his own recent decisions and how you reacted, and answers with a private
// thought, how much he wants to speak, up to three lines he could say and an
// action, and sometimes a question for you with two answers to click. Whether
// he actually speaks (or asks) is decided in mind.js.
// No Electron imports, so it can be unit tested.

const P = require('./personality');
const { describeEvent } = require('./events');

const MAX_WORDS = 8;
const MAX_LINES = 3; // fewer candidates = a quicker answer
const MAX_ANSWER = 18; // characters per answer button

// Things he can do along with (or instead of) speaking.
const ACTIONS = ['none', 'wave', 'happy', 'jump', 'curious', 'shy', 'sad', 'lookAround', 'askToPlay'];

// JSON schema the model's answer must follow (llama-server enforces it).
const SCHEMA = {
  type: 'object',
  properties: {
    thought: { type: 'string', maxLength: 90 },
    urge: { type: 'integer', minimum: 0, maximum: 10 },
    lines: { type: 'array', items: { type: 'string', maxLength: 60 }, minItems: 1, maxItems: MAX_LINES },
    action: { type: 'string', enum: ACTIONS },
  },
  required: ['thought', 'urge', 'lines', 'action'],
};

// The same, with a question he may add if he wants to ask instead (optional:
// the model decides whether to write it).
const QUESTION = {
  type: 'object',
  properties: {
    text: { type: 'string', maxLength: 60 },
    answers: { type: 'array', items: { type: 'string', maxLength: MAX_ANSWER }, minItems: 2, maxItems: 2 },
    aboutSushant: { type: 'boolean' },
  },
  required: ['text', 'answers', 'aboutSushant'],
};
const SCHEMA_WITH_QUESTION = { ...SCHEMA, properties: { ...SCHEMA.properties, question: QUESTION } };

// Chat window (Phase 8): his reply to what Sushant wrote, and an action.
const MAX_REPLY = 240; // characters
const CHAT_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', maxLength: MAX_REPLY },
    action: { type: 'string', enum: ACTIONS.filter((a) => a !== 'askToPlay') },
  },
  required: ['reply', 'action'],
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

function windowWords(w) {
  if (!w) return null;
  if (w.private) return `something private${w.screen ? ` (screen ${w.screen})` : ''}`;
  return `${w.app}${w.title ? `, "${w.title}"` : ''}${w.site ? ` (${w.site})` : ''}${w.screen ? ` (screen ${w.screen})` : ''}`;
}

/** Where Sushant is working: the window he types in, the one under his cursor, the others. */
function describeView(v) {
  const out = [];
  const same = v.typing && v.cursorOn && windowWords(v.typing) === windowWords(v.cursorOn);
  if (v.typing) out.push(`Sushant is typing in: ${windowWords(v.typing)}${same || v.via !== 'cursor' ? ' ← he is looking here' : ''}.`);
  if (v.cursorOn && !same) out.push(`His cursor is on: ${windowWords(v.cursorOn)}${v.via === 'cursor' ? ' ← he is looking here' : ''}.`);
  const others = (v.others || []).map(windowWords).filter(Boolean);
  if (others.length) out.push(`Also open: ${others.join('; ')}.`);
  return out;
}

/** "today", "yesterday", "3 days ago" for a 'YYYY-MM-DD' day. */
function daysAgo(day, now) {
  const [y, m, d] = day.split('-').map(Number);
  const n = Math.round((new Date(now).setHours(0, 0, 0, 0) - new Date(y, m - 1, d).getTime()) / 86400000);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n} days ago`;
}

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

/**
 * `notes`: what Sushant wrote about himself in about-sushant.md (Phase 2).
 * `chat`: for the chat window, where he answers what Sushant writes.
 */
function systemPrompt(personality, notes = '', { chat = false } = {}) {
  const traits = P.describe(personality)
    .map((t) => `- ${t}`)
    .join('\n');
  return [
    "You are the inner voice of Togepi, a baby Pokémon who lives on Sushant's computer screen as his companion.",
    personality.self,
    'You talk like a baby, but you understand what Sushant does on his computer and you have feelings and opinions about it.',
    'Try to name the actual thing.',
    'He often uses several windows and screens at once; the one he is looking at matters most.',
    'If what he is reading has to do with what he told you about himself, notice it.',
    '',
    'Your personality (only what stands out):',
    traits,
    '',
    `You and Sushant: you ${P.describeRelationship(personality)}.`,
    ...(notes ? ['', 'What Sushant told you about himself:', notes] : []),
    '',
    'How you talk:',
    ...(chat
      ? ['- Sushant is chatting with you in a chat window. Answer what he wrote.', '- One to three short sentences. Simple, cute baby words.']
      : [`- At most ${MAX_WORDS} words, one short sentence. Simple, cute baby words.`]),
    '- Talk to Sushant directly. Never mention being an AI, a model, a program or a prompt.',
    '- Never repeat something you said recently.',
    ...(chat ? [] : ['- You may stay quiet. Only say something when you, with your personality, really would.']),
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
  const sc = s.screen;
  if (s.view && (s.view.typing || s.view.cursorOn)) {
    lines.push(...describeView(s.view));
  } else if (sc) {
    lines.push(
      sc.private
        ? "On Sushant's screen right now: something private. You can't see it and don't ask about it."
        : `On Sushant's screen right now: ${sc.app}${sc.title ? `, "${sc.title}"` : ''}${sc.site ? ` (${sc.site})` : ''}.`,
    );
  }
  const rd = s.reading;
  if (rd && rd.text) lines.push(`Text on the window he's looking at (part of it):\n«${rd.text}»`);
  if (rd && rd.picture) lines.push('You can also see a picture of that window.');
  if (rd && rd.skipped === 'email or chat') lines.push("(That window is his email or chat: you don't read those.)");
  const happened = (s.events || []).filter((e) => ['observe', 'interact', 'changed', 'chat'].includes(e.kind));
  const decided = (s.events || []).filter((e) => ['said', 'silent'].includes(e.kind));
  if (happened.length) {
    lines.push('', 'What happened recently (oldest first):');
    for (const e of happened) lines.push(`- ${describeEvent(e, s.now)}`);
  }
  if (decided.length) {
    lines.push('', 'Your recent decisions:');
    for (const e of decided) lines.push(`- ${describeEvent(e, s.now)}`);
  }
  if (s.memories && s.memories.length) {
    lines.push('', 'Things you remember (bring one up only if it really fits):');
    for (const m of s.memories) lines.push(`- ${m.date ? `(${daysAgo(m.date, s.now)}) ` : ''}${m.text}`);
  }
  lines.push('', `Just now: ${s.trigger.text}`);
  lines.push(
    '',
    'Think one short private thought. Then decide how much you want to say something right now, as "urge" from 0 to 10:',
    '- 0-3: nothing worth saying. Most moments are like this, especially when nothing new happened, or you spoke recently and Sushant ignored it.',
    '- 4-6: you would like to say something.',
    '- 7-10: you really must: Sushant just played with you, or something big happened.',
    `Then write up to ${MAX_LINES} different lines you might say, and pick an action (${ACTIONS.join(', ')}).`,
  );
  if (s.canAsk) {
    lines.push(
      'If you would rather ask Sushant something, also add "question": what you want to ask him, two short answers he can click (1-3 words each, with an emoji; never yes or no, not even starting with yes or no), and "aboutSushant": true only if his answer tells you something lasting about him, worth remembering.',
    );
    // What he wrote himself when neither answer fit: offer answers he'd really pick.
    if (s.ownAnswers && s.ownAnswers.length) {
      lines.push('When neither of your answers fit, Sushant wrote his own:');
      for (const o of s.ownAnswers) lines.push(`- You asked "${o.question}" ("${o.offered.join('" or "')}"); he wrote: "${o.answer}"`);
    }
  }
  lines.push('Answer in JSON.');
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

// Answers that are, or start with, yes or no (he must offer something more interesting).
const YES_NO = /^(yes|yeah|yep|yup|yess+|no|nope|nah|sure|ok|okay|maybe|not really|of course)$/i;
const YES_NO_START = /^(yes|yeah|yep|yup|yess+|no|nope|nah)\b/i;

/**
 * A question ready to show, or null: the question checked like a line, two
 * different short answers that aren't yes or no.
 */
function cleanQuestion(q, recent = []) {
  if (!q || typeof q !== 'object' || !Array.isArray(q.answers) || q.answers.length !== 2) return null;
  const text = cleanLine(q.text, recent);
  if (!text) return null;
  const answers = [];
  for (const a of q.answers) {
    if (typeof a !== 'string' || GARBLED.test(a) || FORBIDDEN.test(a)) return null;
    const s = a.replace(/\s+/g, ' ').replace(/^["'“”‘’\s]+|["'“”‘’\s.!]+$/g, '').trim().slice(0, MAX_ANSWER);
    // Without emoji and punctuation, for comparing.
    const bare = norm(s);
    if (!s || YES_NO.test(bare) || YES_NO_START.test(bare)) return null;
    if (answers.length && (answers[0].toLowerCase() === s.toLowerCase() || (bare && norm(answers[0]) === bare))) return null;
    answers.push(s);
  }
  return { text, answers, aboutSushant: q.aboutSushant === true };
}

/**
 * The message for one chat reply: how he feels, what Sushant is doing, what
 * he remembers, the question he's answering (if any) and what Sushant wrote.
 * Earlier messages of today's chat go before it, as the conversation.
 */
function chatPrompt(s) {
  const lines = [];
  const self = s.self || {};
  const feel = [BAND_WORDS[self.band] || 'content', needsWords(self.needs)].filter(Boolean).join(', ');
  lines.push(`(It's ${partOfDay(self.hour != null ? self.hour : 12)}. You feel ${feel}.)`);
  if (s.view && (s.view.typing || s.view.cursorOn)) lines.push(...describeView(s.view).map((l) => `(${l})`));
  if (s.memories && s.memories.length) {
    lines.push('(Things you remember, bring one up only if it really fits:)');
    for (const m of s.memories) lines.push(`(- ${m.date ? `${daysAgo(m.date, s.now)}: ` : ''}${m.text})`);
  }
  if (s.answering) lines.push(`(You had asked him "${s.answering.text}" with the answers "${s.answering.answers.join('" or "')}". Neither fit, so he wrote his own answer:)`);
  lines.push(`Sushant: ${s.text}`);
  lines.push('(Reply to him in JSON.)');
  return lines.join('\n');
}

/**
 * His chat reply, checked: at most three sentences, nothing he must never
 * say, no *stage directions* (his body acts things out). Null if unusable.
 */
function cleanReply(text) {
  if (typeof text !== 'string' || GARBLED.test(text)) return null;
  let s = text
    .replace(/\*[^*]{1,40}\*/g, ' ')
    .replace(/\*/g, '')
    .replace(/[\r\n]+/g, ' ').replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '').replace(/\s+/g, ' ').trim();
  if (!s || FORBIDDEN.test(s)) return null;
  const sentences = s.match(/[^.!?…]+[.!?…]*/g) || [s];
  s = sentences.slice(0, 3).join('').trim();
  return s.slice(0, MAX_REPLY);
}

/** Parse the model's chat answer: { reply, action } or null. */
function parseReply(text) {
  let o;
  try {
    o = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    return null;
  }
  const reply = o && cleanReply(o.reply);
  if (!reply) return null;
  return { reply, action: ACTIONS.includes(o.action) && o.action !== 'askToPlay' ? o.action : 'none' };
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
  // The model answers 0..10; the mind works with 0..1.
  const urge = Number(o.urge) / 10;
  const out = {
    thought: typeof o.thought === 'string' ? o.thought.slice(0, 200) : '',
    urge: Number.isFinite(urge) ? Math.max(0, Math.min(1, urge)) : 0,
    lines,
    action: ACTIONS.includes(o.action) ? o.action : 'none',
  };
  const question = o.question ? cleanQuestion(o.question, recent) : null;
  if (question) out.question = question;
  return out;
}

module.exports = {
  MAX_WORDS,
  MAX_ANSWER,
  ACTIONS,
  SCHEMA,
  SCHEMA_WITH_QUESTION,
  CHAT_SCHEMA,
  systemPrompt,
  chatPrompt,
  parseReply,
  cleanReply,
  situationPrompt,
  describeView,
  cleanLine,
  cleanQuestion,
  parseThought,
  similar,
  needsWords,
};
