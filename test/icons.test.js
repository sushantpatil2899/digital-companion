'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const I = require('../src/main/icons');
const { createItem, getItem } = require('../src/main/items');

// A little of Iconify's set and OpenMoji's data, as fetch-icons sees them.
const SET = {
  icons: {
    'hot-beverage': { body: '<path fill="#fff" d="M0 0h10v10z"/>' },
    'beer-mug': { body: '<path d="M0 0h1v1z"/>' },
    'teddy-bear': { body: '<path d="M0 0h1v1z"/>' },
    'red-apple': { body: '<path d="M0 0h1v1z"/>' },
    'red-circle': { body: '<path d="M0 0h1v1z"/>' },
    'coffee-grinder': { body: '<path d="M0 0h1v1z"/>' },
    'waving-hand': { body: '<path d="M0 0h1v1z"/>' },
    'waving-hand-dark-skin-tone': { body: '<path d="M0 0h1v1z"/>' },
    'grinning-face': { body: '<path d="M0 0h1v1z"/>' },
    'ontario-flag': { body: '<path fill="url(#a)" d="M0 0h1v1z"/>' },
    'mystery-thing': { body: '<path d="M0 0h1v1z"/>' },
  },
};
const DATA = [
  { annotation: 'hot beverage', tags: 'beverage, coffee, drink, hot, steaming, tea', group: 'food-drink' },
  { annotation: 'beer mug', tags: 'bar, beer, drink, mug', group: 'food-drink' },
  { annotation: 'teddy bear', tags: 'plaything, plush, stuffed, toy', group: 'activities' },
  { annotation: 'red apple', tags: 'apple, fruit, red', group: 'food-drink' },
  { annotation: 'red circle', tags: 'circle, geometric, red', group: 'symbols' },
  { annotation: 'coffee grinder', tags: 'coffee, grinder', group: 'extras-openmoji' },
  { annotation: 'waving hand', tags: 'hand, wave', group: 'people-body' },
  { annotation: 'grinning face', tags: 'face, grin', group: 'smileys-emotion' },
];

test('the icon index keeps things, not people, faces, skin tones or icons with links', () => {
  const index = I.buildIndex(SET, DATA);
  const names = index.map((i) => i.n);
  assert.ok(names.includes('hot-beverage') && names.includes('teddy-bear'));
  for (const n of ['waving-hand', 'waving-hand-dark-skin-tone', 'grinning-face', 'ontario-flag']) assert.ok(!names.includes(n), n);
  assert.match(index.find((i) => i.n === 'teddy-bear').w, /plush/);
  // An icon OpenMoji's data doesn't know is found by its name.
  assert.equal(index.find((i) => i.n === 'mystery-thing').w, 'mystery thing');
});

test('keyword search: names count most, then keywords; plurals match; colours alone do not', () => {
  const index = I.buildIndex(SET, DATA);
  assert.equal(I.search(index, 'a teddy bear')[0].n, 'teddy-bear');
  assert.equal(I.search(index, 'a plush toy')[0].n, 'teddy-bear', 'by its keywords');
  assert.equal(I.search(index, 'two beer mugs')[0].n, 'beer-mug', 'plural');
  const coffee = I.search(index, 'a cup of coffee').map((c) => c.n);
  assert.deepEqual(coffee.slice(0, 2), ['coffee-grinder', 'hot-beverage']);
  // "red" alone doesn't bring in the red circle.
  assert.deepEqual(I.search(index, 'a red mug').map((c) => c.n), ['beer-mug']);
  assert.deepEqual(I.search(index, 'the'), []);
  assert.equal(I.search(index, 'drink', 5).length, 2);
  assert.equal(I.stem('cherries'), 'cherry');
  assert.equal(I.stem('boxes'), 'box');
  assert.equal(I.stem('glass'), 'glass');
});

function fakeEngine(answer) {
  const calls = [];
  return { calls, async think(req) { calls.push(req); return JSON.stringify(answer); } };
}

test('the model picks one of the candidates, or none; anything else counts as none', async () => {
  const cands = [{ n: 'beer-mug', w: 'beer mug' }, { n: 'hot-beverage', w: 'hot beverage, coffee' }];
  const eng = fakeEngine({ icon: 'hot-beverage' });
  assert.equal(await I.pickIcon(eng, 'a mug of coffee', cands), 'hot-beverage');
  assert.deepEqual(eng.calls[0].schema.properties.icon.enum, ['beer-mug', 'hot-beverage', 'none']);
  assert.match(eng.calls[0].user, /Item: "a mug of coffee"/);
  assert.match(eng.calls[0].user, /- hot-beverage: hot beverage, coffee/);
  assert.equal(await I.pickIcon(fakeEngine({ icon: 'none' }), 'x', cands), null);
  assert.equal(await I.pickIcon(fakeEngine({ icon: 'teddy-bear' }), 'x', cands), null);
  assert.equal(await I.pickIcon(fakeEngine({}), 'x', []), null);
});

test('icons are recoloured to the characters’ palette, and reused shapes are copied in', () => {
  assert.equal(I.recolor('<path fill="#FFF" stroke="#000" d="M0 0"/>'), '<path fill="#fcf5ee" stroke="#3a2d25" d="M0 0"/>');
  const svg = '<svg><defs><path id="p1" d="M1 1h2"/></defs><use href="#p1" stroke="#000"/></svg>';
  assert.equal(I.inlineUses(svg), '<svg><path d="M1 1h2" stroke="#000"/></svg>');
  assert.throws(() => I.inlineUses('<svg><use href="#nope"/></svg>'), /reuses a shape/);
});

test('an OpenMoji item: found, picked, fetched by name only, recoloured and kept', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
  const index = I.buildIndex(SET, DATA);
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return { ok: true, text: async () => `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 72 72">${SET.icons['hot-beverage'].body}</svg>` };
  };
  const id = await createItem(dir, 'A cup of coffee', null, { engine: fakeEngine({ icon: 'hot-beverage' }), index, fetchImpl, now: 5 });
  assert.deepEqual(urls, ['https://api.iconify.design/openmoji/hot-beverage.svg']);
  const it = getItem(dir, id);
  assert.equal(it.provider, 'openmoji');
  assert.equal(it.icon, 'openmoji:hot-beverage');
  assert.ok(it.candidates.includes('hot-beverage'));
  assert.match(it.license, /CC BY-SA 4\.0/);
  const svg = fs.readFileSync(it.file, 'utf8');
  assert.match(svg, /^<svg width="48" height="48"/);
  assert.match(svg, /fill="#fcf5ee"/);
});

test('Gemini recolours an icon by a colour map: only its colours change, never the outline', async () => {
  const svg = '<svg><path fill="#fdefbd" stroke="#3a2d25" d="M0 0"/><path fill="#f2cf7e" d="M1 1"/><path fill="#FCF5EE" d="M2 2"/></svg>';
  assert.deepEqual(I.svgColours(svg), ['#fdefbd', '#3a2d25', '#f2cf7e', '#fcf5ee']);
  // A swap doesn't chain: #a → #b and #b → #c stay apart.
  assert.equal(I.applyColours('<path fill="#aaaaaa" stroke="#bbbbbb"/>', { '#aaaaaa': '#bbbbbb', '#bbbbbb': '#cccccc' }), '<path fill="#bbbbbb" stroke="#cccccc"/>');
  const eng = fakeEngine({ now: 'yellow beer', asked: 'red', needed: true, colours: { '#fdefbd': '#DF6166', '#f2cf7e': '#b8434f', '#3a2d25': '#ff0000', '#fcf5ee': 'red' } });
  const r = await I.recolourIcon(eng, 'a red mug', 'beer-mug', svg, 'keep the foam');
  assert.deepEqual(r.colours, { '#fdefbd': '#df6166', '#f2cf7e': '#b8434f' }, 'the outline and a non-colour answer are kept');
  assert.equal(r.svg, '<svg><path fill="#df6166" stroke="#3a2d25" d="M0 0"/><path fill="#b8434f" d="M1 1"/><path fill="#FCF5EE" d="M2 2"/></svg>');
  assert.deepEqual(Object.keys(eng.calls[0].schema.properties.colours.properties), ['#fdefbd', '#3a2d25', '#f2cf7e', '#fcf5ee']);
  assert.match(eng.calls[0].user, /Item: "a red mug"/);
  assert.match(eng.calls[0].user, /Recolouring instructions: keep the foam/);
  // Gemini says the icon already matches: nothing changes, whatever colours it sent.
  const same = await I.recolourIcon(fakeEngine({ now: 'red', asked: 'red', needed: false, colours: { '#fdefbd': '#000000' } }), 'a red apple', 'red-apple', svg);
  assert.deepEqual(same, { svg, colours: {} });
  await assert.rejects(I.recolourIcon({ think: async () => 'not json' }, 'a red mug', 'beer-mug', svg), /aren’t JSON/);
});

test('an OpenMoji item with a Gemini key: Gemini says whether to recolour it, and how', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
  const index = I.buildIndex(SET, DATA);
  const posts = [];
  let answer = { now: 'cream', asked: 'blue', needed: true, colours: { '#fcf5ee': '#5c9bc8' } };
  const fetchImpl = async (url, init) => {
    if (/iconify/.test(url)) return { ok: true, text: async () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">${SET.icons['hot-beverage'].body}</svg>` };
    posts.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }) };
  };
  const engine = fakeEngine({ icon: 'hot-beverage' });
  const blue = getItem(dir, await createItem(dir, 'a blue coffee cup', 'KEY', { engine, index, fetchImpl, recolour: '  shiny ' }));
  assert.equal(posts.length, 1);
  assert.match(posts[0].url, new RegExp(`/${I.ICONS.colourModel}:generateContent`));
  assert.equal(blue.colourModel, I.ICONS.colourModel);
  assert.deepEqual(blue.colours, { '#fcf5ee': '#5c9bc8' });
  assert.equal(blue.recolour, 'shiny');
  assert.match(fs.readFileSync(blue.file, 'utf8'), /fill="#5c9bc8"/);
  answer = { now: 'cream', asked: 'nothing', needed: false };
  const plain = getItem(dir, await createItem(dir, 'a coffee cup', 'KEY', { engine, index, fetchImpl }));
  assert.equal(posts.length, 2);
  assert.deepEqual(plain.colours, {});
  assert.match(fs.readFileSync(plain.file, 'utf8'), /fill="#fcf5ee"/);
});

test('no OpenMoji item without an index, a match or a fitting icon', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
  const index = I.buildIndex(SET, DATA);
  const engine = fakeEngine({ icon: 'none' });
  await assert.rejects(createItem(dir, 'a mug', null, { engine, index: [] }), /no icon matches/);
  await assert.rejects(createItem(dir, 'a beer mug', null, { engine, index }), /none of the icons shows/);
  await assert.rejects(I.findIcon('a mug', { engine, index: null }), /npm run fetch-icons/);
  assert.deepEqual(fs.readdirSync(dir), []);
});
