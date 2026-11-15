'use strict';

// Phase 11: what you said out loud, as something to do. His menu's commands
// run directly ("come here", "let's play fetch", "remind me in 20 minutes to
// call mom"); an answer to the question he's asking picks it; anything else
// is a chat message (null here). The same for every character; each one
// reacts in its own way. No Electron imports, so it can be unit tested.

const NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45, fifty: 50, sixty: 60, ninety: 90, half: 0.5 };

const FILLER = /^(?:(?:hey|hi|ok(?:ay)?|so|um+|uh+|please|can you|could you|would you|will you|i want you to|i'd like you to|go ahead and)\s+)+/;
const TRAILING = /\s+(?:please|now|for me|right now)$/;

/** Lower case, no punctuation, no "hey <name>," at the start or "please" at the end. */
function normalize(text, names = []) {
  let s = String(text || '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^\p{L}\p{N}' :-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s.replace(FILLER, '');
    for (const n of names) if (n) s = s.replace(new RegExp(`^${n.toLowerCase()}\\b[\\s,]*`), '');
    s = s.replace(TRAILING, '').trim();
    if (s === before) break;
  }
  return s;
}

function amount(word) {
  if (/^\d+(\.\d+)?$/.test(word)) return Number(word);
  return NUMBERS[word] ?? null;
}

/**
 * When "in 20 minutes", "in an hour", "in half an hour", "at 5", "at 5:30 pm",
 * "at 17:30" means, from `now` (ms). Returns { at, rest } (the words left), or null.
 */
function parseWhen(s, now) {
  let m = s.match(/\bin (half an hour|an? (?:hour|minute)|[\w-]+(?:\.\d+)?) ?(minutes?|mins?|hours?|hrs?)?\b/);
  if (m) {
    let n;
    let unit = m[2] || '';
    if (m[1] === 'half an hour') {
      n = 30;
      unit = 'min';
    } else if (/^an? (hour|minute)$/.test(m[1])) {
      n = 1;
      unit = m[1].split(' ')[1];
    } else {
      n = amount(m[1]);
    }
    if (n != null && unit) {
      const ms = /^h/.test(unit) ? n * 3600e3 : n * 60e3;
      return { at: now + ms, rest: s.replace(m[0], ' ').replace(/\s+/g, ' ').trim() };
    }
  }
  m = s.match(/\bat (\d{1,2})(?::(\d{2}))? ?(am|pm|a m|p m)?\b/);
  if (m) {
    let h = Number(m[1]);
    const min = Number(m[2] || 0);
    const ampm = (m[3] || '').replace(' ', '');
    if (h > 23 || min > 59) return null;
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    const d = new Date(now);
    d.setHours(h, min, 0, 0);
    // "at 5" without am/pm: the next 5 o'clock that's still ahead.
    if (!ampm && h < 12 && d.getTime() <= now) d.setHours(h + 12);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return { at: d.getTime(), rest: s.replace(m[0], ' ').replace(/\s+/g, ' ').trim() };
  }
  return null;
}

/** "remind me in 20 minutes to call mom" / "remind me to call mom at 5 pm". */
function parseReminder(s, now) {
  if (!/^remind me\b/.test(s)) return null;
  const when = parseWhen(s, now);
  if (!when) return { kind: 'remindAsk' }; // no time: the Remind me… window opens
  let text = when.rest
    .replace(/^remind me\b/, '')
    .replace(/^\s*(to|that|about)\b/, '')
    .replace(/\s+(to|that|about)$/, '')
    .trim();
  text = text.replace(/^(to|that|about)\s+/, '').trim();
  if (!text) return { kind: 'remindAsk' };
  return { kind: 'remind', text: text.charAt(0).toUpperCase() + text.slice(1), at: when.at };
}

// Shared commands: [kind, patterns]. Checked in order; whole-phrase matches.
const COMMANDS = [
  ['comeHere', [/^(come|get|run|walk) (here|over here|over|to me|back)$/, /^come$/, /^come here (buddy|little one)$/]],
  ['stopPlaying', [/^(stop|end|quit|finish) (playing|the game|game)$/, /^(game over|no more games|that's enough playing)$/]],
  ['play', [/^(let's |lets |wanna |want to |do you want to )?play (some )?(fetch|ball|catch)$/, /^(throw|fetch) the ball$/], 'fetch'],
  ['play', [/^(let's |lets |wanna |want to |do you want to )?play (a game of )?(tic tac toe|tic-tac-toe|tictactoe|noughts and crosses|x and o|x's and o's)$/], 'ttt'],
  ['play', [/^(let's |lets |wanna |want to )?play( a game)?( with me)?$/], 'any'],
  ['wake', [/^(wake up|rise and shine|good morning|are you awake)$/]],
  ['nap', [/^(take a nap|go to sleep|go to bed|sleep|nap|have a nap|go take a nap|time for a nap)$/]],
  ['stayPut', [/^(stay|stay put|stay there|stay here|don't move|do not move|sit still|wait here|wait there)$/]],
  ['moveAgain', [/^(you can move( again)?|go play|you can go|off you go|free to go|go on)$/]],
  ['song', [/^(make|sing|write|play) (me |us )?(a |our |the )?(week'?s |weekly )?song( about (our|this|the) week)?$/]],
  ['openChat', [/^(open (the )?chat|let's chat|chat with me)$/]],
  ['done', [/^(done|did it|i did it|i'm done|all done|finished|ok|okay|got it|yes|yeah|sure|will do|i drank( it| water| some water)?|drank (it|water)|i stretched|stretched)$/]],
];

const STOP = new Set(['a', 'an', 'the', 'your', 'some', 'go', 'to', 'do', 'with', 'on', 'of', 'at', 'up', 'yourself', 'me', 'my', 'for', 'and', 'let', "let's", 'lets', 'can', 'you']);

function keywords(label) {
  return normalize(label)
    .replace(/…/g, '')
    .split(' ')
    .filter((w) => w && !STOP.has(w));
}

/** "eat an apple" / "go mushroom hunting" / "conduct the music": one of his activities. */
function matchActivity(s, activities) {
  const said = new Set(s.split(' ').map((w) => w.replace(/s$/, '')));
  let best = null;
  for (const a of activities) {
    const kw = keywords(a.label);
    if (!kw.length) continue;
    const hits = kw.filter((w) => said.has(w) || said.has(w.replace(/s$/, ''))).length;
    // Every key word, or at least the main ones for long labels ("mushroom hunting").
    const need = kw.length <= 2 ? kw.length : kw.length - 1;
    if (hits >= need && (!best || hits > best.hits)) best = { id: a.id, hits };
  }
  return best ? best.id : null;
}

/**
 * Which of his two answers you said (or null): the words only one answer has
 * decide ("red" picks "The red one" over "The blue one").
 */
function matchAnswer(s, answers) {
  const words = (x) => new Set(normalize(x).split(' ').filter(Boolean));
  const said = words(s);
  if (!said.size) return null;
  const exact = answers.findIndex((a) => normalize(a) === s);
  if (exact >= 0) return exact;
  const [a, b] = answers.map(words);
  const only = [new Set([...a].filter((w) => !b.has(w) && !STOP.has(w))), new Set([...b].filter((w) => !a.has(w) && !STOP.has(w)))];
  const hits = only.map((o) => [...o].filter((w) => said.has(w)).length);
  if (hits[0] && !hits[1]) return 0;
  if (hits[1] && !hits[0]) return 1;
  return null;
}

/**
 * What to do about what you said.
 * @param {string} text  what was heard
 * @param {object} ctx
 * @param {number} ctx.now
 * @param {string[]} [ctx.names]       his name (and nicknames) to strip ("Hey Pip, …")
 * @param {object[]} [ctx.activities]  [{ id, label }] his activities and the shared ones
 * @param {string[]|null} [ctx.answers] the two answers of the question he's asking
 * @param {boolean} [ctx.waiting]      he's holding up something to click (a nudge, a note, a game invite)
 * @returns {{ kind: string, ... }|null}  null: it's a chat message
 */
function parseCommand(text, ctx = {}) {
  const now = ctx.now ?? Date.now();
  const s = normalize(text, ctx.names || []);
  if (!s) return null;
  if (ctx.answers && ctx.answers.length === 2) {
    const i = matchAnswer(s, ctx.answers);
    if (i != null) return { kind: 'answer', index: i };
  }
  const reminder = parseReminder(s, now);
  if (reminder) return reminder;
  for (const [kind, patterns, arg] of COMMANDS) {
    if (!patterns.some((p) => p.test(s))) continue;
    // "Done" / "OK" only mean something while he's holding something up.
    if (kind === 'done' && !ctx.waiting) return null;
    return arg ? { kind, game: arg } : { kind };
  }
  // Short requests about one of his activities ("go eat your apple").
  if (s.split(' ').length <= 6 && ctx.activities && ctx.activities.length) {
    const id = matchActivity(s, ctx.activities);
    if (id) return { kind: 'activity', id };
  }
  return null;
}

/** Words and names that help the recognizers hear right (Apple's contextual strings, Scribe's keyterms). */
function hints(characterNames = [], activities = []) {
  const base = ['come here', 'fetch', 'tic-tac-toe', 'take a nap', 'wake up', 'stay put', 'remind me', 'stop playing', 'our song'];
  const list = [...characterNames, ...base, ...activities.map((a) => a.label.replace(/…/g, '').toLowerCase())];
  return [...new Set(list.filter((x) => x && x.length < 50 && x.split(' ').length <= 5 && !/[<>{}[\]\\]/.test(x)))].slice(0, 60);
}

module.exports = { parseCommand, normalize, parseWhen, parseReminder, matchActivity, matchAnswer, hints };
