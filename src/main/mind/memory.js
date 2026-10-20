'use strict';

// Togepi's long-term memory (Phase 2 in docs/mind/PLAN.md), as Markdown files
// in his mind folder that you can read and edit:
//   journal/YYYY-MM-DD.md  his diary for each day, in his own words
//   about-sushant.md       what he's learned about you, plus your own notes
//   about-me.md            his opinions and running jokes
// Each remembered line keeps its date and how important it is in a hidden
// comment, e.g. "- Sushant applies to lots of jobs <!-- 2026-10-20 i7 -->".
// When he thinks, the memories that fit best are recalled by recency,
// importance and relevance (the "Generative Agents" recipe, research §6).
// The raw event log (events.jsonl) is kept for 90 days; the rest forever.
// No Electron imports, so it can be unit tested.

const fs = require('fs');
const path = require('path');
const { similar } = require('./thinker');

const MEMORY = {
  keepEventsDays: 90,
  maxFacts: 80, // least important, oldest go first beyond this
  maxOpinions: 40,
  recall: 5, // memories in each prompt
  journalHalfLife: 7, // days: how fast diary memories fade from mind
  factHalfLife: 60, // facts and opinions fade much more slowly
  notesChars: 1200, // your own notes, put into every prompt
};

const DAY = 24 * 3600 * 1000;

const STOP = new Set(
  'the and for you your are was were with that this have has had not but his her him she they them from what when where which who will would can could just like into about there their then than been being over also only very some more most such its our out all any how why get got did does doing done one two new now see saw say said use used make made way www com http https sushant togepi toge priii'.split(' '), // (names are in every memory)
);

const NOTES_HELP =
  "(Write anything you'd like me to know here: your goals, your resume, what you like. I read it, but I never change it.)";

function dayString(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Midnight (local) at the start of a 'YYYY-MM-DD' day, in ms. */
function dayStart(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function words(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

/** How much two texts are about the same things, 0..1 (shared keywords). */
function relevance(query, text) {
  const q = new Set(words(query));
  const m = new Set(words(text));
  if (!q.size || !m.size) return 0;
  let both = 0;
  for (const w of q) if (m.has(w)) both++;
  return both / Math.sqrt(q.size * m.size);
}

// ------------------------------------------------------------------ files

const ITEM = /^\s*[-*]\s+(.*?)\s*(?:<!--\s*(\d{4}-\d{2}-\d{2})?\s*(?:i(\d+))?\s*-->)?\s*$/;

/** Bullet lines -> [{ text, date, importance }]. */
function parseItems(lines, defaultDate = null) {
  const out = [];
  for (const line of lines) {
    const m = line.match(ITEM);
    if (!m || !m[1].trim()) continue;
    out.push({ text: m[1].trim(), date: m[2] || defaultDate, importance: m[3] ? Math.max(1, Math.min(10, Number(m[3]))) : 5 });
  }
  return out;
}

function itemLine(it, withDate = true) {
  return `- ${it.text} <!-- ${withDate && it.date ? `${it.date} ` : ''}i${it.importance} -->`;
}

/** Split a Markdown file into { heading: [lines] } by "## " headings. */
function sections(text) {
  const out = {};
  let cur = '';
  for (const line of String(text).split('\n')) {
    const h = line.match(/^##\s+(.*?)\s*$/);
    if (h) {
      cur = h[1].toLowerCase();
      out[cur] = [];
    } else {
      (out[cur] = out[cur] || []).push(line);
    }
  }
  return out;
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

// ------------------------------------------------------------------ memory

class Memory {
  /**
   * @param {string|null} dir his mind folder (null = in memory only, for tests)
   * @param {() => number} [now]
   */
  constructor(dir, now = () => Date.now()) {
    this.dir = dir;
    this.now = now;
    this.notes = '';
    this.facts = [];
    this.opinions = [];
    this.journal = {}; // day -> { lines: [{text, date, importance}], until: ms }
    this.load();
  }

  file(name) {
    return this.dir ? path.join(this.dir, name) : null;
  }

  load() {
    if (!this.dir) return;
    const about = read(this.file('about-sushant.md'));
    if (about == null) {
      this.saveAbout();
    } else {
      const s = sections(about);
      this.notes = (s['notes from sushant'] || [])
        .join('\n')
        .replace(NOTES_HELP, '')
        .trim();
      this.facts = parseItems(s["what i've learned"] || []);
    }
    const me = read(this.file('about-me.md'));
    if (me == null) this.saveMe();
    else this.opinions = parseItems(sections(me)['my opinions and jokes'] || []);
    this.journal = {};
    let days = [];
    try {
      days = fs.readdirSync(this.file('journal')).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
    } catch {
      // no journal yet
    }
    for (const f of days) {
      const day = f.slice(0, 10);
      const text = read(path.join(this.file('journal'), f)) || '';
      const until = text.match(/<!--\s*until\s+(\d+)\s*-->/);
      this.journal[day] = { lines: parseItems(text.split('\n'), day), until: until ? Number(until[1]) : dayStart(day) + DAY };
    }
  }

  saveAbout() {
    if (!this.dir) return;
    write(
      this.file('about-sushant.md'),
      [
        '# About Sushant',
        '',
        '## Notes from Sushant',
        '',
        this.notes || NOTES_HELP,
        '',
        "## What I've learned",
        '',
        ...this.facts.map((f) => itemLine(f)),
        '',
      ].join('\n'),
    );
  }

  saveMe() {
    if (!this.dir) return;
    write(this.file('about-me.md'), ['# About me', '', '## My opinions and jokes', '', ...this.opinions.map((o) => itemLine(o)), ''].join('\n'));
  }

  saveJournal(day) {
    if (!this.dir) return;
    const j = this.journal[day];
    const f = path.join(this.file('journal'), `${day}.md`);
    if (!j || !j.lines.length) {
      try {
        fs.rmSync(f);
      } catch {
        // already gone
      }
      return;
    }
    write(f, [`# ${day}`, '', ...j.lines.map((l) => itemLine(l, false)), '', `<!-- until ${j.until} -->`, ''].join('\n'));
  }

  /** Add new lines to a list, skipping ones he already knows; keep the list to `max`. */
  addTo(list, items, max) {
    const added = [];
    for (const it of items) {
      if (!it || !it.text) continue;
      if ([...list, ...added].some((x) => similar(x.text, it.text))) continue;
      added.push({ text: it.text, date: it.date || dayString(this.now()), importance: it.importance || 5 });
    }
    list.push(...added);
    if (list.length > max) {
      // Forget the least important first, the oldest among equals.
      const keep = [...list].sort((a, b) => b.importance - a.importance || String(b.date).localeCompare(String(a.date))).slice(0, max);
      list.splice(0, list.length, ...list.filter((x) => keep.includes(x)));
    }
    return added;
  }

  addFacts(items) {
    const added = this.addTo(this.facts, items, MEMORY.maxFacts);
    if (added.length) this.saveAbout();
    return added;
  }

  addOpinions(items) {
    const added = this.addTo(this.opinions, items, MEMORY.maxOpinions);
    if (added.length) this.saveMe();
    return added;
  }

  /** Write (or add to) the diary for `day`, covering events up to `until` (ms). */
  writeJournal(day, lines, until) {
    const j = this.journal[day] || { lines: [], until: dayStart(day) };
    j.lines.push(...lines.filter((l) => l && l.text).map((l) => ({ text: l.text, date: day, importance: l.importance || 5 })));
    j.until = Math.max(j.until, until);
    this.journal[day] = j;
    this.saveJournal(day);
  }

  /** Everything he remembers, with ids for the Memories window. */
  all() {
    const id = (kind, i, extra = '') => `${kind}:${i}${extra}`;
    return {
      notes: this.notes,
      facts: this.facts.map((f, i) => ({ ...f, id: id('fact', i) })),
      opinions: this.opinions.map((o, i) => ({ ...o, id: id('opinion', i) })),
      journal: Object.keys(this.journal)
        .sort()
        .reverse()
        .map((day) => ({ day, id: `day:${day}`, lines: this.journal[day].lines.map((l) => l.text) })),
    };
  }

  /** Forget one memory (an id from all()). */
  forget(id) {
    const [kind, key] = String(id).split(':');
    if (kind === 'fact' && this.facts[Number(key)]) {
      this.facts.splice(Number(key), 1);
      this.saveAbout();
      return true;
    }
    if (kind === 'opinion' && this.opinions[Number(key)]) {
      this.opinions.splice(Number(key), 1);
      this.saveMe();
      return true;
    }
    if (kind === 'day' && this.journal[key]) {
      // Keep "until" so the forgotten day isn't written again.
      this.journal[key].lines = [];
      this.saveJournal(key);
      return true;
    }
    return false;
  }

  /**
   * The memories that fit `query` best right now: [{ kind, text, date, score }].
   * Score = recency + importance + relevance, each 0..1 (equal weights).
   */
  recall(query, n = MEMORY.recall) {
    const now = this.now();
    const cands = [
      ...this.facts.map((f) => ({ ...f, kind: 'fact' })),
      ...this.opinions.map((o) => ({ ...o, kind: 'opinion' })),
      ...Object.values(this.journal).flatMap((j) => j.lines.map((l) => ({ ...l, kind: 'journal' }))),
    ];
    const scored = cands.map((c) => {
      const age = c.date ? Math.max(0, (now - dayStart(c.date)) / DAY) : 30;
      const half = c.kind === 'journal' ? MEMORY.journalHalfLife : MEMORY.factHalfLife;
      const rel = relevance(query, c.text);
      return { kind: c.kind, text: c.text, date: c.date, relevance: rel, score: 0.5 ** (age / half) + c.importance / 10 + rel };
    });
    // Something that has nothing to do with the moment needs to matter a lot to come to mind.
    return scored
      .filter((c) => c.relevance > 0 || c.score >= 1.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }
}

// ------------------------------------------------------------------ event log upkeep

/** All entries of an events.jsonl file (and its rotated older half). */
function readEvents(file) {
  const out = [];
  for (const f of [file.replace(/\.jsonl$/, '.1.jsonl'), file]) {
    const text = read(f);
    if (!text) continue;
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line));
      } catch {
        // a half-written line
      }
    }
  }
  return out;
}

/** Drop event log entries older than `days` (the journal keeps the gist). */
function pruneEvents(file, days = MEMORY.keepEventsDays, now = Date.now()) {
  const cutoff = now - days * DAY;
  for (const f of [file.replace(/\.jsonl$/, '.1.jsonl'), file]) {
    const text = read(f);
    if (!text) continue;
    const kept = text.split('\n').filter((line) => {
      if (!line.trim()) return false;
      try {
        return JSON.parse(line).t >= cutoff;
      } catch {
        return false;
      }
    });
    if (!kept.length && f !== file) fs.rmSync(f);
    else write(f, kept.length ? `${kept.join('\n')}\n` : '');
  }
}

/**
 * The next day his diary should be written for, or null: { day, events, until }.
 * Past days with enough new events are always due; today only at the end of
 * the day while you're away (`endOfDay`).
 */
function journalDue(events, memory, { now = Date.now(), endOfDay = false, minEvents = 5 } = {}) {
  const today = dayString(now);
  const byDay = {};
  for (const e of events) {
    if (!e || !Number.isFinite(e.t)) continue;
    const day = dayString(e.t);
    const done = memory.journal[day];
    if (done && e.t <= done.until) continue; // already in his diary
    (byDay[day] = byDay[day] || []).push(e);
  }
  for (const day of Object.keys(byDay).sort()) {
    const list = byDay[day];
    if (list.length < minEvents) continue;
    if (day === today && !endOfDay) continue;
    return { day, events: list, until: list[list.length - 1].t };
  }
  return null;
}

module.exports = { Memory, MEMORY, relevance, parseItems, readEvents, pruneEvents, journalDue, dayString, dayStart };
