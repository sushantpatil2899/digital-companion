'use strict';

// Togepi's personality: 34 traits (Big Five facets + HEXACO Honesty-Humility),
// 19 Schwartz values, all 0..100 (50 = average), plus his relationship with
// you. Stored as personality.md: numbers in the front matter, a short
// self-description below. Background in docs/mind/research/personality.md,
// starting values in docs/mind/togepi-personality.md.
// No Electron imports, so it can be unit tested.

const fs = require('fs');
const path = require('path');
const { user, them } = require('./names');

// [key, label, one-line explanation] per facet, grouped by dimension.
const TRAITS = {
  openness: {
    label: 'Openness',
    facets: [
      ['fantasy', 'Fantasy', 'lives in a world of imagination and play'],
      ['aesthetics', 'Aesthetics', 'loves music, art and pretty things'],
      ['feelings', 'Feelings', 'feels emotions strongly and shows them'],
      ['actions', 'Adventurousness', 'loves trying new things and exploring'],
      ['ideas', 'Ideas', 'enjoys thinking and puzzles'],
      ['values', 'Open-mindedness', 'accepts new and different ways'],
    ],
  },
  conscientiousness: {
    label: 'Conscientiousness',
    facets: [
      ['competence', 'Competence', 'feels capable and gets things right'],
      ['order', 'Orderliness', 'tidy and organised'],
      ['dutifulness', 'Dutifulness', 'does what he is asked or supposed to'],
      ['achievement', 'Achievement striving', 'works hard towards goals'],
      ['self_discipline', 'Self-discipline', 'sticks with things, not distracted'],
      ['deliberation', 'Deliberation', 'thinks before acting'],
    ],
  },
  extraversion: {
    label: 'Extraversion',
    facets: [
      ['warmth', 'Warmth', 'affectionate and friendly'],
      ['gregariousness', 'Gregariousness', 'wants company and attention'],
      ['assertiveness', 'Assertiveness', 'speaks up and gets his way'],
      ['activity', 'Activity', 'bouncy, always on the move'],
      ['excitement_seeking', 'Excitement-seeking', 'loves thrills and mischief'],
      ['positive_emotions', 'Cheerfulness', 'full of joy and laughter'],
    ],
  },
  agreeableness: {
    label: 'Agreeableness',
    facets: [
      ['trust', 'Trust', 'believes the best of others'],
      ['straightforwardness', 'Straightforwardness', 'says what he means, no tricks'],
      ['altruism', 'Altruism', 'loves helping and giving'],
      ['compliance', 'Compliance', 'goes along rather than arguing'],
      ['modesty', 'Modesty', "doesn't need to be the centre of attention"],
      ['tender_mindedness', 'Tender-mindedness', 'soft-hearted and caring'],
    ],
  },
  neuroticism: {
    label: 'Neuroticism',
    facets: [
      ['anxiety', 'Anxiety', 'worries and gets scared'],
      ['angry_hostility', 'Anger', 'quick to get cross'],
      ['depression', 'Gloominess', 'gets sad and down'],
      ['self_consciousness', 'Self-consciousness', 'shy, embarrassed easily'],
      ['impulsiveness', 'Impulsiveness', 'acts on every urge'],
      ['vulnerability', 'Vulnerability', 'needs comfort when things go wrong'],
    ],
  },
  honesty_humility: {
    label: 'Honesty-Humility',
    facets: [
      ['sincerity', 'Sincerity', 'genuine, no hidden agenda'],
      ['fairness', 'Fairness', 'plays fair, kind to the kind'],
      ['greed_avoidance', 'Greed avoidance', "doesn't crave treats or stuff"],
      ['modesty', 'Humility', 'not boastful or vain'],
    ],
  },
};

const VALUES = [
  ['self_direction_thought', 'Self-direction: thought', 'thinking for himself'],
  ['self_direction_action', 'Self-direction: action', 'doing things his own way'],
  ['stimulation', 'Stimulation', 'excitement, novelty, mischief'],
  ['hedonism', 'Hedonism', 'fun, play and pleasure'],
  ['achievement', 'Achievement', 'being successful'],
  ['power_dominance', 'Power: dominance', 'being in charge of others'],
  ['power_resources', 'Power: resources', 'having things'],
  ['face', 'Face', 'looking good, not being embarrassed'],
  ['security_personal', 'Security: personal', 'feeling safe with his person'],
  ['security_societal', 'Security: societal', 'a safe, orderly world'],
  ['tradition', 'Tradition', 'customs and old ways'],
  ['conformity_rules', 'Conformity: rules', 'following rules'],
  ['conformity_interpersonal', 'Conformity: interpersonal', 'not upsetting others'],
  ['humility', 'Humility', 'knowing his small place in the world'],
  ['benevolence_dependability', 'Benevolence: dependability', 'being loyal to his person'],
  ['benevolence_caring', 'Benevolence: caring', "caring about his person's happiness"],
  ['universalism_concern', 'Universalism: concern', 'fairness for everyone'],
  ['universalism_nature', 'Universalism: nature', 'loving nature'],
  ['universalism_tolerance', 'Universalism: tolerance', 'accepting everyone'],
];

const RELATIONSHIP = [
  ['affection', 'Affection', 'how much he likes you'],
  ['trust', 'Trust', 'how much he trusts you'],
  ['familiarity', 'Familiarity', 'how well he knows you'],
];

// Togepi's starting values, the reference for temperament() (see below).
// Every character's own are in src/characters/<id>/index.js.
const TOGEPI = require('../../characters/togepi').personality;

function clampScore(v) {
  return Math.max(0, Math.min(100, Math.round(Number(v))));
}

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

/** A fresh personality: character `ch`'s starting values (Togepi's by default). */
function defaultPersonality(ch = require('../../characters').get()) {
  return { version: 1, ...clone(ch.personality), self: ch.self, locked: [] };
}

/** Every slider as [path, label, explanation], e.g. ['traits.openness.fantasy', 'Fantasy', '…']. */
function sliders() {
  const out = [];
  for (const [dim, d] of Object.entries(TRAITS)) {
    for (const [k, label, help] of d.facets) out.push([`traits.${dim}.${k}`, label, help, d.label]);
  }
  for (const [k, label, help] of VALUES) out.push([`values.${k}`, label, help, 'Values']);
  for (const [k, label, help] of RELATIONSHIP) out.push([`relationship.${k}`, label, help, 'Relationship']);
  return out;
}

function getPath(obj, p) {
  return p.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

/** Set one score by path. Returns false for an unknown path. */
function setScore(personality, p, value) {
  if (!sliders().some(([sp]) => sp === p)) return false;
  const keys = p.split('.');
  let o = personality;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys[keys.length - 1]] = clampScore(value);
  return true;
}

/** Fill in anything missing or out of range from character `ch`'s defaults (old or hand-edited files). */
function normalize(p, ch) {
  const base = defaultPersonality(ch);
  const out = clone(base);
  if (!p || typeof p !== 'object') return out;
  for (const [sp] of sliders()) {
    const v = getPath(p, sp);
    if (Number.isFinite(Number(v)) && v !== null && v !== '') setScore(out, sp, v);
  }
  for (const k of Object.keys(base.change)) {
    const v = p.change && Number(p.change[k]);
    if (Number.isFinite(v) && v >= 0) out.change[k] = v;
  }
  if (typeof p.self === 'string' && p.self.trim()) out.self = p.self.trim();
  // Sliders that growth (Phase 4) must never move.
  const valid = new Set(sliders().map(([sp]) => sp));
  const locked = Array.isArray(p.locked) ? p.locked : typeof p.locked === 'string' ? p.locked.split(',') : [];
  out.locked = [...new Set(locked.map((x) => String(x).trim()).filter((x) => valid.has(x)))];
  return out;
}

// ------------------------------------------------------------------ file format

// The front matter is a small, fixed subset of YAML: nested maps of numbers,
// with flow maps ("{ a: 1, b: 2 }") for the trait dimensions.
function serialize(p) {
  const lines = ['---', `version: ${p.version || 1}`, 'traits:            # 0-100, 50 = average'];
  for (const dim of Object.keys(TRAITS)) {
    const pairs = TRAITS[dim].facets.map(([k]) => `${k}: ${p.traits[dim][k]}`).join(', ');
    lines.push(`  ${dim}: { ${pairs} }`);
  }
  lines.push('values:            # Schwartz 19, 0-100');
  for (const [k] of VALUES) lines.push(`  ${k}: ${p.values[k]}`);
  lines.push('relationship:      # grows with time together');
  for (const [k] of RELATIONSHIP) lines.push(`  ${k}: ${p.relationship[k]}`);
  lines.push('change:            # max change per weekly reflection');
  for (const [k, v] of Object.entries(p.change)) lines.push(`  ${k}: ${v}`);
  lines.push(`locked: ${(p.locked || []).join(', ')}   # sliders growth never moves`);
  lines.push('---', '', '# Who I am', '', p.self, '');
  return lines.join('\n');
}

function parseScalar(s) {
  const t = s.replace(/#.*$/, '').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : t;
}

function parseFlowMap(s) {
  const out = {};
  const body = s.trim().replace(/^\{/, '').replace(/\}.*$/, '');
  for (const part of body.split(',')) {
    const m = part.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/);
    if (m) out[m[1]] = parseScalar(m[2]);
  }
  return out;
}

/** Parse personality.md. Unknown or broken parts fall back to the defaults. */
function parse(text, ch) {
  const m = String(text).match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return normalize(null, ch);
  const data = {};
  let section = null;
  for (const raw of m[1].split('\n')) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    const top = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (top && top[1] === 'locked') {
      data.locked = top[2].replace(/#.*$/, '');
      section = null;
      continue;
    }
    if (top) {
      const v = parseScalar(top[2]);
      if (v === null) {
        section = top[1];
        data[section] = {};
      } else {
        data[top[1]] = v;
        section = null;
      }
      continue;
    }
    const sub = line.match(/^\s+([\w-]+)\s*:\s*(.*)$/);
    if (sub && section) data[section][sub[1]] = sub[2].trim().startsWith('{') ? parseFlowMap(sub[2]) : parseScalar(sub[2]);
  }
  const self = m[2].replace(/^\s*#\s*Who I am\s*\n/, '').trim();
  return normalize({ ...data, self }, ch);
}

/** Personality from `file`, or character `ch`'s defaults (written to `file`) on first run. */
function load(file, ch) {
  try {
    return parse(fs.readFileSync(file, 'utf8'), ch);
  } catch (e) {
    const p = defaultPersonality(ch);
    if (e.code === 'ENOENT') save(file, p);
    return p;
  }
}

function save(file, p) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, serialize(p));
    fs.renameSync(tmp, file);
  } catch (e) {
    console.error('Could not save personality:', e.message);
  }
}

// ------------------------------------------------------------------ words

// Dwarf Fortress-style bands: only scores away from average are put into words.
function band(v) {
  if (v >= 90) return 'extremely';
  if (v >= 75) return 'very';
  if (v > 60) return 'quite';
  if (v >= 40) return null;
  if (v > 25) return 'not very';
  if (v > 10) return 'hardly';
  return 'not at all';
}

/** Short description of the scores far from average, strongest first, for the prompt. */
function describe(p, max = 14) {
  const items = [];
  for (const [sp, label, help] of sliders()) {
    if (sp.startsWith('relationship.')) continue;
    const v = getPath(p, sp);
    const b = band(v);
    if (!b) continue;
    const what = sp.startsWith('values.') ? `cares about ${help}` : `${label.toLowerCase()} (${help})`;
    items.push({ d: Math.abs(v - 50), text: `${b} ${what}` });
  }
  items.sort((a, b) => b.d - a.d);
  return items.slice(0, max).map((i) => i.text);
}

/** How he feels about you, in words. */
function describeRelationship(p) {
  const r = p.relationship;
  const level = (v, low, mid, high) => (v < 35 ? low : v < 65 ? mid : high);
  return [
    level(r.familiarity, `only just met ${user()}`, `getting to know ${user()}`, `knows ${user()} well`),
    level(r.affection, `likes ${them()} a little so far`, `likes ${them()}`, `adores ${them()}`),
    level(r.trust, `still learning to trust ${them()}`, `trusts ${them()}`, `trusts ${them()} completely`),
  ].join(', ');
}

/** How talkative his personality makes him, 0..1 (used for when he speaks up). */
function talkativeness(p) {
  const e = p.traits.extraversion;
  const n = p.traits.neuroticism;
  return (e.gregariousness + e.positive_emotions + e.warmth + e.excitement_seeking + n.impulsiveness) / 500;
}

/**
 * His resting mood from his personality (ALMA: pleasure = 0.21·E + 0.59·A +
 * 0.19·S, S = emotional stability), relative to Togepi's own so his starting
 * self behaves as before: { offset } shifts the mood his needs suggest,
 * { speed } scales how fast his mood moves (cheerful ones bounce back faster).
 */
function temperament(p) {
  const avg = (o) => Object.values(o).reduce((a, b) => a + b, 0) / Object.values(o).length;
  const pleasure = (q) => {
    const E = (avg(q.traits.extraversion) - 50) / 50;
    const A = (avg(q.traits.agreeableness) - 50) / 50;
    const S = -(avg(q.traits.neuroticism) - 50) / 50;
    return 0.21 * E + 0.59 * A + 0.19 * S;
  };
  const base = { traits: TOGEPI.traits };
  const offset = Math.max(-0.4, Math.min(0.4, pleasure(p) - pleasure(base)));
  const speed = Math.max(0.6, Math.min(1.5, 1 + (p.traits.extraversion.positive_emotions - TOGEPI.traits.extraversion.positive_emotions) / 150));
  return { offset: Math.round(offset * 1000) / 1000, speed: Math.round(speed * 1000) / 1000 };
}

/** Scores that changed between two personalities: [{ path, label, from, to }]. */
function diff(a, b) {
  const out = [];
  for (const [sp, label] of sliders()) {
    const from = getPath(a, sp);
    const to = getPath(b, sp);
    if (from !== to) out.push({ path: sp, label, from, to });
  }
  return out;
}

module.exports = {
  TRAITS,
  VALUES,
  RELATIONSHIP,
  TOGEPI,
  defaultPersonality,
  sliders,
  getPath,
  setScore,
  normalize,
  serialize,
  parse,
  load,
  save,
  band,
  describe,
  describeRelationship,
  talkativeness,
  temperament,
  diff,
};
