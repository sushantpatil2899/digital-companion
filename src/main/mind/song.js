'use strict';

// Phase 10, part 2: the weekly song. Once a week each character writes a
// 30-second song about your week together and ElevenLabs Music sings it:
// - the week in numbers comes from the Tiger Data database (store.js), what
//   it meant from his diary;
// - his own language model writes the title, the lyrics and the music style,
//   in his own way: nothing about tone is fixed here, it all comes from his
//   personality (Sushant, 2026-10-24, as for everything he says since
//   2026-10-22);
// - the singer is a setting (`songSinger`, a sweet female voice), the same
//   for every character, never his own voice;
// - only the title, lyrics and style he wrote are sent, after the privacy
//   rules and the decision model have checked them. This is the one thing
//   that leaves the Mac, and only when you've switched it on.
// The song (mp3) and its words are kept in his mind folder under songs/.
// No Electron imports, so it can be unit tested.

const fs = require('fs');
const path = require('path');
const T = require('./thinker');
const { scrub } = require('./screen');
const { user, they, them } = require('./names');

const SONG = {
  seconds: 30,
  verseMs: 15000, // [Verse] then [Chorus], 15 s each
  chorusMs: 15000,
  maxLine: 70, // characters per sung line
  verseLines: [2, 4],
  chorusLines: [2, 4],
  maxStyles: 8,
  maxTitle: 50,
  model: 'music_v2_5',
  api: 'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128',
  timeout: 3 * 60 * 1000, // a song takes up to a minute or two to compose
  dueDay: 0, // Sunday…
  dueHour: 18, // …from 6 pm, like his weekly reflection
};

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', maxLength: SONG.maxTitle },
    style: { type: 'array', items: { type: 'string', maxLength: 40 }, minItems: 4, maxItems: SONG.maxStyles },
    verse: { type: 'array', items: { type: 'string', maxLength: SONG.maxLine }, minItems: SONG.verseLines[0], maxItems: SONG.verseLines[1] },
    chorus: { type: 'array', items: { type: 'string', maxLength: SONG.maxLine }, minItems: SONG.chorusLines[0], maxItems: SONG.chorusLines[1] },
  },
  required: ['title', 'style', 'verse', 'chorus'],
};

const hours = (h) => (h >= 10 ? `${Math.round(h)} h` : `${h} h`);
const times = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The week from the database as plain lines for his prompt (only what happened). */
function weekLines(w) {
  if (!w) return [];
  const lines = [];
  if (w.hoursAtComputer) lines.push(`${user()} spent about ${hours(w.hoursAtComputer)} at the computer, on ${times(w.days, 'day')}.`);
  if (w.apps.length) lines.push(`Most of it in: ${w.apps.map((a) => `${a.app} (${hours(a.hours)})`).join(', ')}.`);
  if (w.sites.length) lines.push(`Websites: ${w.sites.map((s) => `${s.site} (${hours(s.hours)})`).join(', ')}.`);
  if (w.lateNights) lines.push(`${cap(they())} stayed up past midnight on ${times(w.lateNights, 'night')}.`);
  const g = w.together;
  const play = [];
  if (g.pets) play.push(`petted you ${times(g.pets, 'time')}`);
  if (g.throws) play.push(`threw you ${times(g.throws, 'time')}`);
  if (g.fetches) play.push(`played fetch (${times(g.fetches, 'throw')})`);
  if (g.ticTacToe) play.push(`played ${times(g.ticTacToe, 'game')} of tic-tac-toe (${they()} won ${g.youWonTicTacToe})`);
  if (g.chats) play.push(`chatted with you (${times(g.chats, 'message')})`);
  if (play.length) lines.push(`With you, ${user()} ${play.join(', ')}.`);
  const c = w.care;
  const care = [];
  if (c.water) care.push(`drank ${times(c.water, 'glass', 'glasses')} of water when you asked`);
  if (c.stretches) care.push(`took ${times(c.stretches, 'stretch break')}`);
  if (c.ignoredReminders) care.push(`ignored ${times(c.ignoredReminders, 'reminder')}`);
  if (care.length) lines.push(`${user()} ${care.join(', ')}.`);
  if (w.shows.length) lines.push(`You watched together: ${w.shows.join(', ')}.`);
  const moods = Object.entries(w.moods || {}).sort((a, b) => b[1] - a[1]);
  if (moods.length) lines.push(`How you felt most of the week: ${moods.slice(0, 2).map(([m]) => m).join(', then ')}.`);
  return lines;
}

/** The user message: the week, his diary, and the format (nothing about tone). */
function songPrompt({ week = null, diary = [] }) {
  const facts = weekLines(week);
  return [
    `It's the end of the week. You're writing a short song about your week with ${user()}, to sing to ${them()}.`,
    '',
    ...(facts.length ? ['The week in numbers:', ...facts.map((l) => `- ${l}`), ''] : []),
    ...(diary.length ? ['Your diary this week:', ...diary.map((d) => `${d.day}: ${d.lines.join(' ')}`), ''] : []),
    `Write it the way you would, with your personality, about what really happened. It is sung by a singer, about ${SONG.seconds} seconds long.`,
    'Answer with:',
    '- title: the song’s title.',
    `- style: ${SONG.maxStyles - 4} to ${SONG.maxStyles} short music style tags in English that fit you (genre, instruments, tempo, mood).`,
    `- verse: ${SONG.verseLines[0]} to ${SONG.verseLines[1]} short lines to sing.`,
    `- chorus: ${SONG.chorusLines[0]} to ${SONG.chorusLines[1]} short lines to sing.`,
  ].join('\n');
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** His system prompt, with the song's format instead of the 8-word rule. */
function songSystem(personality, notes, core) {
  return T.systemPrompt(personality, notes, {
    core,
    format: [
      `- You are writing the words of a song about your week with ${user()}; this is not a chat.`,
      `- Name the real things from the week (apps, sites, games, shows) when they matter to you.`,
    ],
  });
}

const BAD = /\b(ai|a\.i\.|language model|assistant|chatbot|prompt)\b|https?:\/\/|www\.|@/i;

function cleanSung(line) {
  const s = scrub(String(line || ''))
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SONG.maxLine);
  if (!s || BAD.test(s) || /\[(email|number|phone|key|hidden line)\]/i.test(s)) return null;
  return s;
}

/** The model's answer as { title, style, verse, chorus }, or null if it isn't usable. */
function parseSong(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object') return null;
  const title = cleanSung(o.title);
  const style = (Array.isArray(o.style) ? o.style : []).map((s) => String(s || '').trim().slice(0, 40)).filter((s) => s && !BAD.test(s)).slice(0, SONG.maxStyles);
  const verse = (Array.isArray(o.verse) ? o.verse : []).map(cleanSung).filter(Boolean).slice(0, SONG.verseLines[1]);
  const chorus = (Array.isArray(o.chorus) ? o.chorus : []).map(cleanSung).filter(Boolean).slice(0, SONG.chorusLines[1]);
  if (!title || style.length < 2 || verse.length < SONG.verseLines[0] || chorus.length < SONG.chorusLines[0]) return null;
  return { title, style, verse, chorus };
}

/** All the words that would be sent, for the privacy check. */
function songText(song) {
  return [song.title, ...song.verse, ...song.chorus].join('\n');
}

/** Does anything sung match your privacy blocklist words/sites/apps? */
function blockedWords(song, block = {}) {
  const text = songText(song).toLowerCase();
  const all = [...(block.words || []), ...(block.sites || []), ...(block.apps || [])].map((x) => String(x || '').toLowerCase()).filter(Boolean);
  return all.find((x) => text.includes(x)) || null;
}

/** The ElevenLabs composition plan: verse and chorus, each with his style and the singer. */
function compositionPlan(song, singer = 'sweet female vocals') {
  const styles = [...song.style, singer, 'clear vocals', 'polished production'];
  return {
    chunks: [
      { text: `[Verse]\n${song.verse.join('\n')}`, duration_ms: SONG.verseMs, positive_styles: styles, negative_styles: ['male vocals', 'spoken word'], context_adherence: 'high' },
      { text: `[Chorus]\n${song.chorus.join('\n')}`, duration_ms: SONG.chorusMs, positive_styles: [...song.style.slice(0, 3), singer, 'catchy chorus'], negative_styles: ['male vocals'], context_adherence: 'high' },
    ],
  };
}

/** Ask ElevenLabs Music for the song; resolves with the mp3 bytes. */
async function compose(plan, key, { fetchImpl = fetch, timeout = SONG.timeout } = {}) {
  if (!key) throw new Error('no ElevenLabs key');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetchImpl(SONG.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
      body: JSON.stringify({ composition_plan: plan, model_id: SONG.model }),
      signal: ctl.signal,
    });
    if (!res.ok) {
      let detail = '';
      try {
        const j = await res.json();
        detail = typeof j.detail === 'string' ? j.detail : j.detail && j.detail.message ? j.detail.message : JSON.stringify(j.detail || j).slice(0, 200);
      } catch {
        // no JSON body
      }
      throw new Error(`ElevenLabs ${res.status}${detail ? `: ${detail}` : ''}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('ElevenLabs took too long');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** The local date 'YYYY-MM-DD' (songs are named after the day they're made). */
function dayName(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The start (ms) of the most recent Sunday 6 pm before `now`: one song per week after that. */
function weekDue(now) {
  const d = new Date(now);
  d.setHours(SONG.dueHour, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - SONG.dueDay + 7) % 7));
  if (d.getTime() > now) d.setDate(d.getDate() - 7);
  return d.getTime();
}

/** His songs, newest first: [{ id, file, title, verse, chorus, style, week, at }]. */
function listSongs(dir) {
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((f) => /\.json$/.test(f));
  } catch {
    return [];
  }
  const out = [];
  for (const f of names) {
    try {
      const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const mp3 = path.join(dir, f.replace(/\.json$/, '.mp3'));
      if (fs.existsSync(mp3)) out.push({ ...s, id: f.replace(/\.json$/, ''), file: mp3 });
    } catch {
      // unreadable
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Is a weekly song due (none made since the last Sunday 6 pm)? */
function songDue(dir, now) {
  const last = listSongs(dir)[0];
  return !last || last.at < weekDue(now);
}

/** Keep the song and its words (mp3 + json with the same name). */
function saveSong(dir, song, audio, { week = null, now = Date.now() } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  let id = dayName(now);
  for (let i = 2; fs.existsSync(path.join(dir, `${id}.json`)); i++) id = `${dayName(now)}-${i}`;
  fs.writeFileSync(path.join(dir, `${id}.mp3`), audio);
  const meta = { title: song.title, style: song.style, verse: song.verse, chorus: song.chorus, week: week ? summaryLine(week) : null, at: now, seconds: SONG.seconds };
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(meta, null, 2));
  return { ...meta, id, file: path.join(dir, `${id}.mp3`) };
}

/** "This week: 14 h at the computer · 3 late nights · 9 games of fetch · mostly cheerful" (the song window). */
function summaryLine(w) {
  if (!w) return null;
  const parts = [];
  if (w.hoursAtComputer) parts.push(`${hours(w.hoursAtComputer)} at the computer`);
  if (w.apps[0]) parts.push(`mostly ${w.apps[0].app}`);
  if (w.lateNights) parts.push(times(w.lateNights, 'late night'));
  if (w.together.pets) parts.push(times(w.together.pets, 'pat'));
  if (w.together.fetches) parts.push(times(w.together.fetches, 'fetch', 'fetches'));
  if (w.together.ticTacToe) parts.push(`${w.together.ticTacToe} tic-tac-toe`);
  if (w.care.water) parts.push(times(w.care.water, 'glass', 'glasses') + ' of water');
  if (w.shows.length) parts.push(`watched ${w.shows[0]}`);
  const mood = Object.entries(w.moods || {}).sort((a, b) => b[1] - a[1])[0];
  if (mood) parts.push(`mostly ${mood[0]}`);
  return parts.join(' · ') || null;
}

module.exports = {
  SONG,
  SCHEMA,
  weekLines,
  songPrompt,
  songSystem,
  parseSong,
  songText,
  blockedWords,
  compositionPlan,
  compose,
  weekDue,
  songDue,
  listSongs,
  saveSong,
  summaryLine,
};
