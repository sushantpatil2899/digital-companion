'use strict';

// The item library: a short description ("a red mug", "a toy truck with a
// trailer", up to 10 words) becomes a little picture a character can hold or
// play with on the screen. The picture is the OpenMoji icon that shows the
// item (src/main/icons.js), picked by a language model and, with a Gemini
// key, recoloured to match the description. Only plain shapes are kept (no
// scripts, styles, links, pictures or text) and it gets a square frame
// (48 px), so the renderer can draw it like any picture.
//
// Each item is `<id>.svg` + `<id>.json` in the library folder; createItem
// resolves with the id and the caller decides what to do with it. No
// Electron imports, so it can be unit tested.

const fs = require('fs');
const path = require('path');

const ITEMS = {
  maxWords: 10,
  maxChars: 80,
  svgSize: 256, // the viewBox given to an SVG that has none
  maxSvg: 60 * 1024,
  svgPx: 48, // a kept SVG's frame (width and height), in pixels
};

/** Tidy a description; throws when it is empty, too long or has odd characters. */
function cleanDescription(text) {
  const s = String(text == null ? '' : text)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '');
  if (!s) throw new Error('describe the item first');
  if (s.split(' ').length > ITEMS.maxWords) throw new Error(`describe the item in ${ITEMS.maxWords} words or fewer`);
  if (s.length > ITEMS.maxChars) throw new Error(`describe the item in ${ITEMS.maxChars} characters or fewer`);
  if (!/^[\p{L}\p{N} ,'’&-]+$/u.test(s)) throw new Error('describe the item with words only');
  return s;
}

/** The item's name: the description without a leading a/an/the ("toy truck with a trailer"). */
function itemName(description) {
  return description.replace(/^(a|an|the|some)\s+/i, '');
}

const SVG_TAGS = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line']);

/**
 * An icon → a safe, standalone SVG: only plain shapes, no scripts, styles,
 * links, pictures or text. Throws when there is none.
 */
function cleanSvg(text) {
  const m = String(text || '').match(/<svg[\s>][\s\S]*<\/svg>/i);
  if (!m) throw new Error('the icon has no SVG');
  let svg = m[0].replace(/<!--[\s\S]*?-->/g, '');
  if (svg.length > ITEMS.maxSvg) throw new Error('the SVG is too big');
  for (const [, tag] of svg.matchAll(/<\/?\s*([a-zA-Z][\w:.-]*)/g)) {
    if (!SVG_TAGS.has(tag.toLowerCase())) throw new Error(`the SVG has a <${tag}>, which isn’t allowed`);
  }
  if (/\son\w+\s*=|href|url\s*\(|javascript:|<!|<\?/i.test(svg)) throw new Error('the SVG has links or scripts, which aren’t allowed');
  if (!/^<svg[^>]*\sxmlns\s*=/.test(svg)) svg = svg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  if (!/^<svg[^>]*\sviewBox\s*=/.test(svg)) svg = svg.replace(/^<svg/, `<svg viewBox="0 0 ${ITEMS.svgSize} ${ITEMS.svgSize}"`);
  if (!/<(path|rect|circle|ellipse|polygon|polyline|line)[\s/>]/.test(svg)) throw new Error('the SVG is empty');
  return svg;
}

/** Give the SVG a square frame of `px` pixels (its width and height), whatever the icon set. */
function frameSvg(svg, px = ITEMS.svgPx) {
  const open = svg.match(/^<svg[^>]*>/)[0];
  const framed = open.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/g, '').replace(/^<svg/, `<svg width="${px}" height="${px}"`);
  return framed + svg.slice(open.length);
}

function slug(name) {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/, '') || 'item'
  );
}

// --- the library -------------------------------------------------------------------

/**
 * Find the item's icon and keep it in the library at `dir`; resolves with its
 * id. The OpenMoji icon that shows the item is picked by `opts.engine`; with
 * a Gemini `key`, Gemini recolours it to match the description and
 * `opts.recolour`.
 * Options: engine, recolour, index, fetchImpl, px (SVG frame), now.
 */
async function createItem(dir, description, key, opts = {}) {
  const desc = cleanDescription(description);
  const name = itemName(desc);
  const icons = require('./icons');
  const px = opts.px || ITEMS.svgPx;
  // With a Gemini key, Gemini recolours the icon to match the description.
  let colourEngine = null;
  if (key) {
    const { GeminiEngine } = require('./mind/gemini');
    colourEngine = new GeminiEngine({ apiKey: key, model: icons.ICONS.colourModel, fetchImpl: opts.fetchImpl });
    await colourEngine.start();
  }
  const recolour = String(opts.recolour || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const found = await icons.findIcon(desc, { engine: opts.engine, colourEngine, recolour, ...(opts.index ? { index: opts.index } : {}), fetchImpl: opts.fetchImpl });
  const svg = frameSvg(cleanSvg(found.svg), px);
  let meta = { w: px, h: px, icon: `openmoji:${found.icon}`, candidates: found.candidates, model: opts.engine.model || 'gemma (local)', license: icons.ICONS.license };
  if (colourEngine) meta = { ...meta, colourModel: icons.ICONS.colourModel, colours: found.colours, ...(recolour ? { recolour } : {}) };
  fs.mkdirSync(dir, { recursive: true });
  const base = slug(name);
  let id = base;
  for (let i = 2; fs.existsSync(path.join(dir, `${id}.json`)); i++) id = `${base}-${i}`;
  fs.writeFileSync(path.join(dir, `${id}.svg`), svg);
  meta = { name, description: desc, format: 'svg', ...meta, provider: 'openmoji', at: opts.now || Date.now() };
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(meta, null, 2));
  return id;
}

/** One item: { id, name, description, format ('svg'), file, w, h, icon, provider, model, at }, or null. */
function getItem(dir, id) {
  if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), 'utf8'));
    const file = path.join(dir, `${id}.svg`);
    return fs.existsSync(file) ? { ...meta, id, file } : null;
  } catch {
    return null;
  }
}

/** Every item, newest first. */
function listItems(dir) {
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((f) => /\.json$/.test(f));
  } catch {
    return [];
  }
  return names
    .map((f) => getItem(dir, f.replace(/\.json$/, '')))
    .filter(Boolean)
    .sort((a, b) => b.at - a.at);
}

module.exports = {
  ITEMS,
  cleanDescription,
  itemName,
  cleanSvg,
  frameSvg,
  createItem,
  getItem,
  listItems,
};
