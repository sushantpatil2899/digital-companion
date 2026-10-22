'use strict';

// Writes Togepi's diary for a day: a short entry in his own voice, new
// things he learned about Sushant, and his own opinions and running jokes
// (memory.js stores them). Run when you're away at the end of the day, or the
// next time the app runs for days it missed.
// Email subjects never reach long-term memory: email is just "read emails".
// No Electron imports, so it can be unit tested.

const T = require('./thinker');

const MAIL_SITES = ['mail.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com', 'mail.yahoo.com', 'mail.proton.me', 'icloud.com', 'fastmail.com'];
const MAIL_APPS = ['mail', 'microsoft outlook', 'outlook', 'spark', 'airmail', 'mimestream', 'superhuman', 'thunderbird'];

const SCHEMA = {
  type: 'object',
  properties: {
    diary: { type: 'array', items: { type: 'string', maxLength: 120 }, minItems: 1, maxItems: 6 },
    facts: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 5 },
    opinions: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 3 },
  },
  required: ['diary', 'facts', 'opinions'],
};

// Asked of the decision model for each new memory.
const IMPORTANCE = {
  type: 'score',
  instructions: 'How important is this for Togepi, Sushant\'s companion, to remember about his day or about Sushant?',
  criteria: ['trivial', 'minor', 'somewhat important', 'important', 'very important'],
};

function isMail(e) {
  return MAIL_SITES.some((s) => (e.site || '').endsWith(s)) || MAIL_APPS.includes(String(e.app || '').toLowerCase());
}

function clock(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** A compact summary of one day's events for the diary prompt. */
function dayDigest(events) {
  const screen = new Map(); // "app (site)" -> { n, titles: Set }
  let privateCount = 0;
  let mail = 0;
  const together = new Map(); // interaction text -> count
  const said = [];
  const chat = [];
  let silent = 0;
  for (const e of events) {
    if (e.kind === 'observe') {
      if (e.private) privateCount++;
      else if (isMail(e)) mail++;
      else {
        const key = `${e.app}${e.site ? ` (${e.site})` : ''}`;
        const s = screen.get(key) || { n: 0, titles: new Set() };
        s.n++;
        if (e.title && s.titles.size < 4) s.titles.add(e.title);
        screen.set(key, s);
      }
    } else if (e.kind === 'interact') {
      together.set(e.text, (together.get(e.text) || 0) + 1);
    } else if (e.kind === 'said') {
      said.push(`${e.answers ? 'asked ' : ''}"${e.text}"${e.reaction ? ` (Sushant ${e.reaction})` : ''}`);
    } else if (e.kind === 'chat') {
      chat.push(`${e.from === 'you' ? 'Sushant' : 'You'}: ${e.text}`);
    } else if (e.kind === 'silent') {
      silent++;
    }
  }
  const lines = [];
  if (events.length) lines.push(`From ${clock(events[0].t)} to ${clock(events[events.length - 1].t)}.`);
  const top = [...screen.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  if (top.length || mail || privateCount) {
    lines.push('', 'What Sushant did on his computer:');
    for (const [k, s] of top) lines.push(`- ${k}${s.titles.size ? `: ${[...s.titles].map((t) => `"${t}"`).join(', ')}` : ''}`);
    if (mail) lines.push('- read emails');
    if (privateCount) lines.push('- some private things (you could not see them)');
  }
  if (together.size) {
    lines.push('', 'What you and Sushant did together:');
    for (const [text, n] of together) lines.push(`- ${text}${n > 1 ? ` (${n} times)` : ''}`);
  }
  if (chat.length) {
    lines.push('', 'What you and Sushant wrote in the chat:');
    for (const c of chat.slice(-16)) lines.push(`- ${c}`);
  }
  if (said.length || silent) {
    lines.push('', 'What you said today:');
    for (const s of said.slice(-10)) lines.push(`- ${s}`);
    if (silent) lines.push(`- (and ${silent} times you thought of something but kept quiet)`);
  }
  return lines.join('\n');
}

function userPrompt(day, digest, memory) {
  const known = memory.facts.slice(-20).map((f) => `- ${f.text}`);
  const jokes = memory.opinions.slice(-10).map((o) => `- ${o.text}`);
  return [
    `It's the end of ${day}. Time to write in your diary.`,
    '',
    digest,
    '',
    known.length ? `Things you already know about Sushant (don't repeat them):\n${known.join('\n')}` : 'You don\'t know much about Sushant yet.',
    jokes.length ? `\nYour opinions and jokes so far:\n${jokes.join('\n')}` : '',
    '',
    'Answer in JSON:',
    '- diary: 2 to 6 short sentences about your day, in your own voice ("I", "Sushant"). Mention the real things that happened: the companies, sites, games and what he did with you.',
    '- facts: up to 5 NEW things you learned about Sushant today (his work, interests, habits, how he treats you). Plain words, and specific: name the companies, sites and projects, e.g. "Sushant applied to Amazon and Stripe on JobRight". Never email contents or private things. None if nothing new.',
    '- opinions: up to 3 of your own opinions or running jokes, if you have any.',
  ].join('\n');
}

function cleanList(list, max) {
  return (Array.isArray(list) ? list : [])
    .map((s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : ''))
    .filter((s) => s && s.length <= 140 && !/https?:\/\//i.test(s) && !/[\w.+-]+@[\w-]+\.[\w.-]+/.test(s))
    .slice(0, max);
}

/** Importance 1..10 of each text, from the decision model (5 each without it). */
async function rateImportance(engine, texts) {
  if (!engine || !engine.canDecide || !texts.length) return texts.map(() => 5);
  try {
    // One request per memory: the question is the same, the state differs.
    const out = [];
    for (const t of texts) {
      const a = await engine.decide(`Memory: ${t}`, { m: IMPORTANCE });
      const score = a && a.m ? Number(a.m.score) : NaN; // 0..4
      out.push(Number.isFinite(score) ? Math.max(1, Math.min(10, Math.round(1 + (score / 4) * 9))) : 5);
    }
    return out;
  } catch {
    return texts.map(() => 5);
  }
}

/**
 * Write his diary for one day. `due` comes from memory.journalDue().
 * Returns what was written, or null if the model gave nothing usable.
 */
async function writeDay(engine, memory, personality, due) {
  const digest = dayDigest(due.events);
  const raw = await engine.think({
    system: `${T.systemPrompt(personality)}\n\nRight now you are writing in your own diary, not talking to Sushant.`,
    user: userPrompt(due.day, digest, memory),
    schema: SCHEMA,
  });
  let o;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  const diary = cleanList(o.diary, 6);
  if (!diary.length) return null;
  const facts = cleanList(o.facts, 5);
  const opinions = cleanList(o.opinions, 3);
  const imp = await rateImportance(engine, [...diary, ...facts, ...opinions]);
  const at = (i) => imp[i] || 5;
  memory.writeJournal(
    due.day,
    diary.map((text, i) => ({ text, importance: at(i) })),
    due.until,
  );
  const newFacts = memory.addFacts(facts.map((text, i) => ({ text, date: due.day, importance: at(diary.length + i) })));
  const newOpinions = memory.addOpinions(opinions.map((text, i) => ({ text, date: due.day, importance: at(diary.length + facts.length + i) })));
  return { day: due.day, diary, facts: newFacts.map((f) => f.text), opinions: newOpinions.map((x) => x.text) };
}

module.exports = { writeDay, dayDigest, isMail, SCHEMA, IMPORTANCE };
