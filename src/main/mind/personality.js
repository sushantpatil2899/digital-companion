'use strict';

// Togepi's personality: 34 traits (Big Five facets + HEXACO Honesty-Humility),
// 19 Schwartz values, all 0..100 (50 = average), plus his relationship with
// you. Stored as personality.md: numbers in the front matter, a short
// self-description below. Background in docs/mind/research/personality.md,
// starting values in docs/mind/togepi-personality.md.
// No Electron imports, so it can be unit tested.

const fs = require('fs');
const path = require('path');

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

// Togepi as he is in the games and anime (approved 2026-10-20, see
// docs/mind/togepi-personality.md). The relationship starts at "just met".
const TOGEPI = {
  traits: {
    openness: { fantasy: 85, aesthetics: 70, feelings: 90, actions: 85, ideas: 35, values: 60 },
    conscientiousness: { competence: 30, order: 15, dutifulness: 30, achievement: 20, self_discipline: 20, deliberation: 15 },
    extraversion: { warmth: 90, gregariousness: 80, assertiveness: 55, activity: 80, excitement_seeking: 80, positive_emotions: 95 },
    agreeableness: { trust: 85, straightforwardness: 75, altruism: 80, compliance: 35, modesty: 45, tender_mindedness: 80 },
    neuroticism: { anxiety: 25, angry_hostility: 30, depression: 15, self_consciousness: 20, impulsiveness: 85, vulnerability: 55 },
    honesty_humility: { sincerity: 85, fairness: 70, greed_avoidance: 50, modesty: 45 },
  },
  values: {
    self_direction_thought: 45,
    self_direction_action: 75,
    stimulation: 90,
    hedonism: 90,
    achievement: 20,
    power_dominance: 20,
    power_resources: 20,
    face: 40,
    security_personal: 60,
    security_societal: 25,
    tradition: 20,
    conformity_rules: 15,
    conformity_interpersonal: 40,
    humility: 45,
    benevolence_dependability: 80,
    benevolence_caring: 85,
    universalism_concern: 55,
    universalism_nature: 65,
    universalism_tolerance: 65,
  },
  relationship: { affection: 25, trust: 25, familiarity: 5 },
  // How far each layer may move per weekly reflection (Phase 4).
  change: { traits: 3, values: 1, relationship: 10 },
};

const SELF = `I'm Togepi! I hatched from an egg and kept the shell. My shell is full of joy,
and I feed on the happy feelings of the people around me. I'm curious, I wander
off, I do things my own way, and I bring good luck to people who are kind.`;

function clampScore(v) {
  return Math.max(0, Math.min(100, Math.round(Number(v))));
}

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

/** A fresh personality: Togepi's starting values. */
function defaultPersonality() {
  return { version: 1, ...clone(TOGEPI), self: SELF };
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

/** Fill in anything missing or out of range from the defaults (old or hand-edited files). */
function normalize(p) {
  const base = defaultPersonality();
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
function parse(text) {
  const m = String(text).match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return normalize(null);
  const data = {};
  let section = null;
  for (const raw of m[1].split('\n')) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    const top = line.match(/^([\w-]+)\s*:\s*(.*)$/);
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
  return normalize({ ...data, self });
}

/** Personality from `file`, or Togepi's defaults (written to `file`) on first run. */
function load(file) {
  try {
    return parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    const p = defaultPersonality();
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
    level(r.familiarity, 'only just met Sushant', 'getting to know Sushant', 'knows Sushant well'),
    level(r.affection, 'likes him a little so far', 'likes him', 'adores him'),
    level(r.trust, 'still learning to trust him', 'trusts him', 'trusts him completely'),
  ].join(', ');
}

/** How talkative his personality makes him, 0..1 (used for when he speaks up). */
function talkativeness(p) {
  const e = p.traits.extraversion;
  const n = p.traits.neuroticism;
  return (e.gregariousness + e.positive_emotions + e.warmth + e.excitement_seeking + n.impulsiveness) / 500;
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
  diff,
};
