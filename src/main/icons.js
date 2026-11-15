'use strict';

// Items from OpenMoji (openmoji.org, CC BY-SA 4.0): instead of drawing an
// item, find the hand-drawn icon that shows it. OpenMoji is drawn like the
// characters (flat fills, one dark outline), so its palette is mapped to the
// characters' pastels and its black outline to their warm dark brown.
//
// 1. scripts/fetch-icons.js keeps an index of the icons that can be items
//    (models/openmoji-index.json: each icon's name and keywords, no people,
//    faces, flags or skin tones). It joins Iconify's OpenMoji set (every
//    icon's name) with OpenMoji's own data (the keywords).
// 2. search(): keyword search of the description in the index, best 5.
// 3. pickIcon(): the language model (local Gemma or Gemini, whichever he
//    thinks with: any engine with think()) picks the one that shows the item,
//    or none.
// 4. The icon's SVG comes from Iconify's API (only its name is sent),
//    mapped to the characters' palette (COLOUR_MAP).
// 5. recolourIcon(): with a Gemini key, Gemini (ICONS.colourModel) gets the
//    icon and its colours and sends a new colour for each, so it matches the
//    description ("a red mug") and any recolouring instructions. It says
//    first whether the icon's colours already match; if so nothing changes. Only the
//    colours change, never the shapes. Then it's checked and framed
//    (items.js).
// No Electron imports, so it can be unit tested.

const fs = require('fs');
const path = require('path');

const ICONS = {
  candidates: 5,
  setUrl: 'https://cdn.jsdelivr.net/npm/@iconify-json/openmoji@1.2.29/icons.json',
  dataUrl: 'https://cdn.jsdelivr.net/npm/openmoji@17.0.0/data/openmoji.json',
  svgUrl: (name) => `https://api.iconify.design/openmoji/${encodeURIComponent(name)}.svg`,
  // Not things a character holds.
  skipGroups: ['people-body', 'smileys-emotion', 'flags', 'component'],
  timeout: 20 * 1000,
  colourModel: 'gemini-3.5-flash-lite', // fast and free of charge (2026-10-24); there is no 3.6 Flash-Lite
  outline: '#3a2d25', // the characters' outline: never recoloured
  license: 'OpenMoji (openmoji.org), CC BY-SA 4.0, recoloured',
};

/** Where the index lives (gitignored, next to the models). */
function defaultIndexFile(root = path.join(__dirname, '..', '..')) {
  return path.join(root, 'models', 'openmoji-index.json');
}

function slug(s) {
  return String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * The index from Iconify's set (`set`: its icons.json) and OpenMoji's data
 * (`data`: openmoji.json): [{ n: name, w: 'keywords' }].
 */
function buildIndex(set, data) {
  const byName = new Map();
  for (const e of data || []) byName.set(slug(e.annotation), e);
  const out = [];
  for (const [n, icon] of Object.entries((set && set.icons) || {})) {
    if (/-(light|medium-light|medium|medium-dark|dark)(-skin-tone)?$|skin-tone/.test(n)) continue;
    // Clip paths, masks and gradients (url(#…)) aren't allowed in an item.
    if (icon && /url\(/.test(icon.body || '')) continue;
    const e = byName.get(n);
    if (e && (ICONS.skipGroups.includes(e.group) || e.skintone)) continue;
    const words = e ? [e.annotation, e.tags, e.openmoji_tags, e.subgroups].filter(Boolean).join(', ') : n.replace(/-/g, ' ');
    out.push({ n, w: words.toLowerCase() });
  }
  return out;
}

function loadIndex(file = defaultIndexFile()) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// "Toy" too: a toy truck is a truck's icon, not another toy's.
const STOP = new Set(['a', 'an', 'the', 'of', 'with', 'and', 'for', 'my', 'some', 'little', 'small', 'big', 'tiny', 'cute', 'on', 'in', 'to', 'its', 'his', 'her', 'toy', 'mini', 'miniature']);
const COLOURS = new Set(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'black', 'white', 'grey', 'gray', 'golden', 'silver']);

/** "Mugs" and "mug", "boxes" and "box", "cherries" and "cherry" match. */
function stem(w) {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 4 && /(ches|shes|xes|ses)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function words(s) {
  return String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(stem);
}

/**
 * The `k` icons whose name and keywords best match `description`, best
 * first: [{ n, w, score }]. A word in the name counts most, then a keyword;
 * colours count little (any icon can be recoloured).
 */
function search(index, description, k = ICONS.candidates) {
  const query = words(description).filter((w) => !STOP.has(w));
  if (!query.length) return [];
  const scored = [];
  for (const icon of index || []) {
    const name = new Set(words(icon.n));
    const kw = new Set(words(icon.w));
    let score = 0;
    let thing = false; // matched more than a colour
    for (const q of query) {
      const colour = COLOURS.has(q);
      let s = 0;
      if (name.has(q)) s = 3;
      else if (kw.has(q)) s = 2;
      else if (q.length >= 4 && [...name].some((w) => w.length >= 4 && (w.startsWith(q) || q.startsWith(w)))) s = 1;
      score += s * (colour ? 0.3 : 1);
      if (s && !colour) thing = true;
    }
    if (thing) scored.push({ ...icon, score: score - name.size * 0.01 });
  }
  scored.sort((a, b) => b.score - a.score || a.n.localeCompare(b.n));
  return scored.slice(0, k);
}

const PICK_SYSTEM = 'You choose the icon that shows an everyday item a little character can hold in its hands. Answer in JSON.';

/** The message for picking among `candidates` ([{ n, w }]). */
function pickPrompt(description, candidates) {
  return [
    `Item: "${description}"`,
    '',
    'Icons (name: what it shows):',
    ...candidates.map((c) => `- ${c.n}: ${c.w}`),
    '',
    'Pick the icon that shows this item as an object a character can hold in its hands (not a person, body part or place). Its colour does not matter. If none fits, pick "none".',
  ].join('\n');
}

/** Ask `engine` (think(), local Gemma or Gemini) which candidate shows the item: its name, or null. */
async function pickIcon(engine, description, candidates) {
  if (!candidates.length) return null;
  const names = candidates.map((c) => c.n);
  const schema = { type: 'object', properties: { icon: { type: 'string', enum: [...names, 'none'] } }, required: ['icon'] };
  const raw = await engine.think({ system: PICK_SYSTEM, user: pickPrompt(description, candidates), schema });
  let icon = null;
  try {
    icon = (typeof raw === 'string' ? JSON.parse(raw) : raw).icon;
  } catch {
    return null;
  }
  return names.includes(icon) ? icon : null;
}

// OpenMoji's palette → the characters' pastels; the black outline → warm dark brown.
const COLOUR_MAP = {
  '#000': '#3a2d25', '#000000': '#3a2d25', '#fff': '#fcf5ee', '#ffffff': '#fcf5ee',
  '#d0cfce': '#e9e1d8', '#9b9b9a': '#c9bfb4', '#3f3f3f': '#7a6656',
  '#d22f27': '#df6166', '#ea5a47': '#f58a95', '#f4aa41': '#f7c27a', '#e27022': '#f0a066',
  '#6a462f': '#a57f63', '#a57939': '#c9a27a', '#5c9e31': '#8cc27a', '#b1cc33': '#c5dc8a',
  '#61b2e4': '#5c9bc8', '#92d3f5': '#a9d6f0', '#1e50a0': '#5c86b8', '#fcea2b': '#fdefbd', '#f1b31c': '#f2cf7e',
  '#b399c8': '#c7b3dc', '#8967aa': '#a990c4',
};

function recolor(svg) {
  return String(svg).replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, (m, attr, c) => `${attr}="${COLOUR_MAP[c.toLowerCase()] || c}"`);
}

/**
 * Some icons draw a shape once in <defs> and reuse it with <use href="#id">,
 * which items.js doesn't allow (no links): each <use> becomes a copy of the
 * shape with the <use>'s own attributes, and <defs> goes.
 */
function inlineUses(svg) {
  const defs = new Map();
  const body = String(svg).replace(/<defs>([\s\S]*?)<\/defs>/g, (m, inner) => {
    for (const [, tag, attrs] of inner.matchAll(/<(path|circle|ellipse|rect|polygon|polyline|line)\s([^>]*?)\/>/g)) {
      const id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
      if (id) defs.set(id, { tag, attrs: attrs.replace(/\s*\bid="[^"]+"/, '') });
    }
    return '';
  });
  return body.replace(/<use\s([^>]*?)\/>/g, (m, attrs) => {
    const id = (attrs.match(/\bhref="#([^"]+)"/) || [])[1];
    const def = id && defs.get(id);
    if (!def) throw new Error('the icon reuses a shape it doesn’t have');
    const all = `${def.attrs} ${attrs.replace(/\s*\bhref="[^"]+"/, '')}`.replace(/\s+/g, ' ').trim();
    return `<${def.tag} ${all}/>`;
  });
}

/** The icon's SVG from Iconify (only its name is sent), recoloured. */
async function fetchIcon(name, { fetchImpl = fetch, timeout = ICONS.timeout } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetchImpl(ICONS.svgUrl(name), { signal: ctl.signal });
    if (!res.ok) throw new Error(`couldn’t get the icon ${name} (${res.status})`);
    return recolor(inlineUses(await res.text()));
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('getting the icon took too long');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Every colour in the SVG's fill and stroke attributes, lower case, in order of first use. */
function svgColours(svg) {
  return [...new Set([...String(svg).matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,6})"/g)].map((m) => m[1].toLowerCase()))];
}

/** Swap colours by `map` ({ '#old': '#new' }), all at once (no chains). */
function applyColours(svg, map) {
  return String(svg).replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, (m, attr, c) => `${attr}="${map[c.toLowerCase()] || c}"`);
}

const COLOUR_SYSTEM = 'You recolour icons for a cute desktop pet game. Answer in JSON.';

/** The message for a new colour map: the icon, its colours and the item it should show. */
function colourPrompt(description, icon, svg, colours, instructions = '') {
  return [
    `Item: "${description}"`,
    `Icon: ${icon}`,
    ...(instructions ? [`Recolouring instructions: ${instructions}`] : []),
    '',
    'The icon (SVG):',
    svg,
    '',
    `Its colours: ${colours.join(' ')}`,
    '',
    'First, in "now", say in a few words which colours the icon\'s parts have now; in "asked", which colours the item and the instructions ask for (or "nothing").',
    'Then "needed": true only if the icon\'s colours differ from what is asked. If nothing is asked, or the icon already matches, "needed" is false and every colour stays as it is.',
    'If needed, give a new colour for each of its colours in "colours":',
    '- an asked colour goes on the parts it is for (with no part named, the item\'s main part: its body, not small details), its darker tone on the parts in the icon\'s darker tone;',
    '- every other colour stays exactly as it is, unless the instructions say otherwise;',
    '- the new colours are soft, warm pastel tints that sit well with the icon\'s other colours, but still clearly the asked colour (black: a soft dark grey-brown, not the outline colour);',
    `- the outline ${ICONS.outline} stays ${ICONS.outline}.`,
    'Each new colour as #rrggbb.',
  ].join('\n');
}

/**
 * Ask `engine` (think(), Gemini with ICONS.colourModel) whether the icon's
 * colours need to change for the description and instructions, and if so for
 * a new colour for each: { svg, colours: { '#old': '#new' } (only the changed
 * ones; {} when none was needed) }. An answer that isn't a colour keeps the
 * old one; the outline is never changed.
 */
async function recolourIcon(engine, description, icon, svg, instructions = '') {
  const colours = svgColours(svg);
  if (!colours.length) return { svg, colours: {} };
  const hex = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
  const schema = {
    type: 'object',
    properties: {
      now: { type: 'string' },
      asked: { type: 'string' },
      needed: { type: 'boolean' },
      colours: { type: 'object', properties: Object.fromEntries(colours.map((c) => [c, hex])) },
    },
    required: ['now', 'asked', 'needed'],
  };
  const raw = await engine.think({ system: COLOUR_SYSTEM, user: colourPrompt(description, icon, svg, colours, instructions), schema });
  let answer;
  try {
    answer = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new Error('the colours Gemini sent aren’t JSON');
  }
  const map = {};
  const given = (answer && answer.needed === true && answer.colours) || {};
  for (const c of colours) {
    const to = typeof given[c] === 'string' ? given[c].trim().toLowerCase() : '';
    if (c !== ICONS.outline && /^#[0-9a-f]{6}$/.test(to) && to !== c) map[c] = to;
  }
  return { svg: applyColours(svg, map), colours: map };
}

/**
 * The OpenMoji icon for `description`: { icon, svg, candidates, colours }
 * (svg recoloured, not yet checked). `colourEngine` (optional, Gemini)
 * recolours it to match the description and `recolour` (instructions);
 * without it only the palette is mapped. Throws when there's no index, no
 * match or the model finds none that fits.
 */
async function findIcon(description, { engine, colourEngine = null, recolour = '', index = loadIndex(), fetchImpl, k = ICONS.candidates } = {}) {
  if (!index) throw new Error('no icon index: run npm run fetch-icons');
  if (!engine) throw new Error('no model to pick the icon');
  const candidates = search(index, description, k);
  if (!candidates.length) throw new Error(`no icon matches “${description}”`);
  const icon = await pickIcon(engine, description, candidates);
  if (!icon) throw new Error(`none of the icons shows “${description}” (${candidates.map((c) => c.n).join(', ')})`);
  let svg = await fetchIcon(icon, { fetchImpl });
  let colours = null;
  if (colourEngine) ({ svg, colours } = await recolourIcon(colourEngine, description, icon, svg, recolour));
  return { icon, svg, candidates: candidates.map((c) => c.n), colours };
}

module.exports = { ICONS, COLOUR_MAP, defaultIndexFile, buildIndex, loadIndex, stem, search, pickPrompt, pickIcon, recolor, inlineUses, fetchIcon, svgColours, applyColours, colourPrompt, recolourIcon, findIcon };
