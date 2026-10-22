'use strict';

// Phase 4: Togepi's personality grows with experience (docs/mind/PLAN.md).
// - Relationship (affection, trust, familiarity): every day, by clear rules,
//   from what you did together that day; at most ±10 per week each.
// - Traits and values: once a week Gemma reflects on the week's diary and
//   proposes a few changes with reasons; at most ±3 a trait, ±1 a value, and
//   never more than ±15 from where he started (or where you last set it).
//   The reflection also writes a few insights about you into his memory.
// - Your sliders always win; locked sliders never move; every change is in
//   growth.md with its reason, and a week can be undone.
// State lives in growth.json in his mind folder.
// No Electron imports, so it can be unit tested.

const fs = require('fs');
const path = require('path');
const P = require('./personality');
const { INTERACTIONS } = require('./interactions');
const { dayString, dayStart } = require('./memory');

const GROWTH = {
  weekCap: { relationship: 10 }, // per metric per week
  stepCap: { traits: 3, values: 1 }, // per slider per reflection
  maxDrift: 15, // from his starting (or your last hand-set) value
  maxChanges: 6, // per reflection
  minDiaryDays: 3, // in the week, for a reflection
  reflectHour: 18, // Sunday from 18:00 (while you're away), or late
  reflectAway: 600, // s away
};

const DAY = 24 * 3600 * 1000;

// What each kind of day-event does to the relationship: [metric, amount, daily cap].
const KEY_BY_TEXT = Object.fromEntries(Object.entries(INTERACTIONS).map(([k, text]) => [text, k]));
const RULES = {
  heart: [['affection', 0.6, 3]],
  throw: [['affection', -0.7, -4], ['trust', -0.5, -3]],
  angry: [['trust', -1, -2]],
  thatWasFun: [['affection', 0.7, 3]],
  tttIWin: [['affection', 0.5, 2]],
  tttYouWin: [['affection', 0.5, 2]],
  tttDraw: [['affection', 0.5, 2]],
  gotBall: [['affection', 0.3, 2]],
  chatted: [['affection', 0.6, 3]], // like a pat, once per conversation
  gaveUp: [['affection', -0.4, -1.5]],
  welcomeBack: [['trust', 0.5, 1.5]],
  waterDone: [['trust', 0.3, 1]],
  stretchDone: [['trust', 0.3, 1]],
  bedtimeDone: [['trust', 0.3, 1]],
  nudgeLater: [['trust', -0.2, -1]],
};

/** Monday (local) of the week a day is in, as 'YYYY-MM-DD'. */
function weekOf(day) {
  const d = new Date(dayStart(day));
  const back = (d.getDay() + 6) % 7; // Monday = 0
  return dayString(d.getTime() - back * DAY);
}

/** Relationship changes from one day's events: { affection, trust, familiarity }. */
function dayRelationship(events) {
  const sums = { affection: 0, trust: 0, familiarity: 0 };
  const perKey = {};
  for (const e of events) {
    let key = null;
    if (e.kind === 'interact') key = KEY_BY_TEXT[e.text] || null;
    if (key && RULES[key]) {
      for (const [metric, amount, cap] of RULES[key]) {
        const k = `${key}:${metric}`;
        const next = (perKey[k] || 0) + amount;
        perKey[k] = cap > 0 ? Math.min(cap, next) : Math.max(cap, next);
      }
    }
  }
  // Your reactions to what he said.
  const clicked = events.filter((e) => e.kind === 'reaction' && /clicked|petted/.test(e.reaction || '')).length;
  const ignored = events.filter((e) => e.kind === 'reaction' && e.reaction === 'ignored it').length;
  perKey['reply:affection'] = Math.min(1.5, clicked * 0.3) - Math.min(1, ignored * 0.1);
  // Answering one of his questions counts like a pat; ignoring one costs nothing.
  const answered = events.filter((e) => e.kind === 'reaction' && /^answered /.test(e.reaction || '')).length;
  if (answered) perKey['answer:affection'] = Math.min(RULES.heart[0][2], answered * RULES.heart[0][1]);
  for (const [k, v] of Object.entries(perKey)) sums[k.split(':')[1]] += v;
  // Familiarity: a day spent together (he was around while you used the Mac).
  if (events.length >= 10) sums.familiarity += 1;
  return sums;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

class Growth {
  /** @param {string|null} dir his mind folder (null: memory only, for tests) */
  constructor(dir, now = () => Date.now()) {
    this.dir = dir;
    this.now = now;
    this.state = { relationshipThrough: null, partial: null, carry: { affection: 0, trust: 0, familiarity: 0 }, weeks: {}, baselines: {}, lastReflection: null };
    this.lastDays = { affection: 0, trust: 0, familiarity: 0 };
    this.load();
  }

  file(name) {
    return this.dir ? path.join(this.dir, name) : null;
  }

  load() {
    if (!this.dir) return;
    try {
      this.state = { ...this.state, ...JSON.parse(fs.readFileSync(this.file('growth.json'), 'utf8')) };
    } catch {
      // first run
    }
  }

  save() {
    if (!this.dir) return;
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.file('growth.json'), JSON.stringify(this.state, null, 2));
    fs.writeFileSync(this.file('growth.md'), this.markdown());
  }

  week(key) {
    if (!this.state.weeks[key]) this.state.weeks[key] = { relationship: { affection: 0, trust: 0, familiarity: 0 }, changes: [], insights: [], reflectedAt: null, undone: false };
    return this.state.weeks[key];
  }

  /** You set a slider by hand: growth limits now count from there. */
  setBaseline(sliderPath, value) {
    this.state.baselines[sliderPath] = value;
    this.save();
  }

  baseline(sliderPath) {
    const b = this.state.baselines[sliderPath];
    return Number.isFinite(b) ? b : P.getPath(P.TOGEPI, sliderPath);
  }

  /**
   * Apply the relationship changes of every finished day not yet counted.
   * `today`: also count today so far ("Try it now"); the rest of the day is
   * counted when it's over, without counting the same things twice.
   * Returns the new personality (or the same one if nothing changed);
   * `lastDays` has what was added ({ affection, trust, familiarity }).
   */
  applyDays(personality, events, { today = false } = {}) {
    const todayStr = dayString(this.now());
    const byDay = {};
    for (const e of events) {
      if (!e || !Number.isFinite(e.t)) continue;
      const day = dayString(e.t);
      if (day > todayStr || (day === todayStr && !today)) continue;
      if (this.state.relationshipThrough && day <= this.state.relationshipThrough) continue;
      (byDay[day] = byDay[day] || []).push(e);
    }
    const days = Object.keys(byDay).sort();
    this.lastDays = { affection: 0, trust: 0, familiarity: 0 };
    if (!days.length) return personality;
    const next = P.normalize(personality);
    const locked = new Set(personality.locked || []);
    for (const day of days) {
      const w = this.week(weekOf(day));
      const whole = dayRelationship(byDay[day]);
      // Part of this day may have been counted already (by "Try it now").
      const partial = this.state.partial && this.state.partial.day === day ? this.state.partial.sums : null;
      for (const metric of ['affection', 'trust', 'familiarity']) {
        const change = whole[metric] - (partial ? partial[metric] : 0);
        const cap = GROWTH.weekCap.relationship;
        const used = w.relationship[metric];
        const allowed = round1(Math.max(-cap - used, Math.min(cap - used, change)));
        if (!allowed || locked.has(`relationship.${metric}`)) continue;
        w.relationship[metric] = round1(used + allowed);
        this.lastDays[metric] = round1(this.lastDays[metric] + allowed);
        // Whole points go into personality.md; the rest waits for the next day.
        const total = this.state.carry[metric] + allowed;
        const points = Math.trunc(total);
        this.state.carry[metric] = round1(total - points);
        if (points) P.setScore(next, `relationship.${metric}`, P.getPath(next, `relationship.${metric}`) + points);
      }
      if (day === todayStr) {
        this.state.partial = { day, sums: whole };
      } else {
        this.state.relationshipThrough = day;
        if (partial) this.state.partial = null;
      }
    }
    this.save();
    return next;
  }

  /** This week's reflection is done (or skipped). */
  reflected(weekKey) {
    const w = this.state.weeks[weekKey];
    return !!(w && (w.reflectedAt || w.skipped));
  }

  /**
   * Is the weekly reflection due? Sunday evening while you're away, unless
   * this week's is done already (e.g. by "Try it now"); or last week's was
   * missed (he wasn't running, or you never left).
   */
  reflectionDue({ away = false, awayFor = 0 } = {}) {
    const now = this.now();
    const week = weekOf(dayString(now));
    if (this.reflected(week)) return false;
    const d = new Date(now);
    if (d.getDay() === 0 && d.getHours() >= GROWTH.reflectHour && away && awayFor >= GROWTH.reflectAway) return true;
    const lastWeek = weekOf(dayString(dayStart(week) - DAY));
    const last = this.state.lastReflection || 0;
    return last > 0 && !this.reflected(lastWeek) && now - last >= 8 * DAY;
  }

  /**
   * Clamp the model's proposed changes and apply them. `proposal` =
   * { changes: [{ path, delta, reason }], insights: [] }. Returns
   * { personality, applied: [{ path, label, from, to, reason }] }.
   */
  applyReflection(personality, proposal, weekKey = weekOf(dayString(this.now()))) {
    const next = P.normalize(personality);
    const locked = new Set(personality.locked || []);
    const labels = Object.fromEntries(P.sliders().map(([p, label]) => [p, label]));
    const applied = [];
    const seen = new Set();
    for (const c of (proposal && proposal.changes) || []) {
      if (applied.length >= GROWTH.maxChanges) break;
      if (!c || !labels[c.path] || seen.has(c.path) || locked.has(c.path) || c.path.startsWith('relationship.')) continue;
      seen.add(c.path);
      const cap = c.path.startsWith('traits.') ? GROWTH.stepCap.traits : GROWTH.stepCap.values;
      const delta = Math.max(-cap, Math.min(cap, Math.round(Number(c.delta) || 0)));
      if (!delta) continue;
      const from = P.getPath(next, c.path);
      const base = this.baseline(c.path);
      const to = Math.max(0, Math.min(100, Math.max(base - GROWTH.maxDrift, Math.min(base + GROWTH.maxDrift, from + delta))));
      if (to === from) continue;
      P.setScore(next, c.path, to);
      applied.push({ path: c.path, label: labels[c.path], from, to, reason: String(c.reason || '').slice(0, 140) });
    }
    const w = this.week(weekKey);
    w.changes.push(...applied);
    w.insights.push(...((proposal && proposal.insights) || []).filter((s) => typeof s === 'string' && s.trim()).slice(0, 3));
    w.reflectedAt = this.now();
    this.state.lastReflection = this.now();
    this.save();
    return { personality: next, applied };
  }

  /** No reflection this week (too little diary, or nothing usable): try again next week. */
  skipReflection(note, weekKey = weekOf(dayString(this.now()))) {
    this.week(weekKey).skipped = note;
    this.state.lastReflection = this.now();
    this.save();
  }

  /** Undo a week: its trait/value changes and its relationship changes. */
  undo(personality, weekKey) {
    const w = this.state.weeks[weekKey];
    if (!w || w.undone) return personality;
    const next = P.normalize(personality);
    for (const c of w.changes) P.setScore(next, c.path, P.getPath(next, c.path) - (c.to - c.from));
    for (const metric of ['affection', 'trust', 'familiarity']) {
      const v = w.relationship[metric];
      if (v) P.setScore(next, `relationship.${metric}`, P.getPath(next, `relationship.${metric}`) - Math.round(v));
    }
    w.undone = true;
    this.save();
    return next;
  }

  /** History for the Personality window, newest week first. */
  history() {
    return Object.keys(this.state.weeks)
      .sort()
      .reverse()
      .map((key) => ({ week: key, ...this.state.weeks[key] }));
  }

  markdown() {
    const lines = ['# How I\'ve grown', '', 'Written by Togepi\'s mind (growth.json has the details). Undo a week from the Personality window.', ''];
    for (const w of this.history()) {
      lines.push(`## Week of ${w.week}${w.undone ? ' (undone)' : ''}`, '');
      const r = w.relationship;
      const rel = ['affection', 'trust', 'familiarity'].filter((m) => r[m]).map((m) => `${m} ${r[m] > 0 ? '+' : ''}${r[m]}`);
      if (rel.length) lines.push(`- Relationship: ${rel.join(', ')}`);
      for (const c of w.changes) lines.push(`- ${c.label} ${c.from} → ${c.to}: ${c.reason}`);
      for (const i of w.insights) lines.push(`- Learned: ${i}`);
      lines.push('');
    }
    return lines.join('\n');
  }
}

module.exports = { Growth, GROWTH, dayRelationship, weekOf };
