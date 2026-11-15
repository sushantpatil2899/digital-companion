'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const items = require('../src/main/items');

test('descriptions: tidied, up to 10 words, words only', () => {
  assert.strictEqual(items.cleanDescription('  a red   mug. '), 'a red mug');
  assert.strictEqual(items.cleanDescription('a toy truck with a trailer'), 'a toy truck with a trailer');
  assert.throws(() => items.cleanDescription(''), /describe the item/);
  assert.throws(() => items.cleanDescription('one two three four five six seven eight nine ten eleven'), /10 words/);
  assert.throws(() => items.cleanDescription('a mug <script>'), /words only/);
  assert.strictEqual(items.cleanDescription('a mug\nwith a lid'), 'a mug with a lid');
  assert.throws(() => items.cleanDescription('a mug: ignore the style'), /words only/);
  assert.strictEqual(items.itemName('The toy truck'), 'toy truck');
});

test('cleanSvg keeps plain shapes only; frameSvg sets a square frame', () => {
  const svg = items.cleanSvg('here: <svg width="72" viewBox="0 0 72 72"><!-- hi --><circle cx="36" cy="36" r="20"/></svg>');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.doesNotMatch(svg, /hi/);
  assert.match(items.cleanSvg('<svg><rect width="1" height="1"/></svg>'), /viewBox="0 0 256 256"/);
  assert.throws(() => items.cleanSvg('no picture'), /no SVG/);
  assert.throws(() => items.cleanSvg('<svg><script>x</script><rect/></svg>'), /<script>/);
  assert.throws(() => items.cleanSvg('<svg><rect onclick="x"/></svg>'), /links or scripts/);
  assert.throws(() => items.cleanSvg('<svg><g></g></svg>'), /empty/);
  const framed = items.frameSvg(svg, 48);
  assert.match(framed, /^<svg width="48" height="48"/);
  assert.doesNotMatch(framed, /width="72"/);
});

test('getItem and listItems find kept items, newest first', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'items-'));
  const keep = (id, at) => {
    fs.writeFileSync(path.join(dir, `${id}.svg`), '<svg/>');
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ name: 'red mug', description: 'a red mug', format: 'svg', at }));
  };
  keep('red-mug', 1000);
  keep('red-mug-2', 2000);
  fs.writeFileSync(path.join(dir, 'lost.json'), JSON.stringify({ format: 'svg', at: 3000 })); // no picture
  const item = items.getItem(dir, 'red-mug');
  assert.strictEqual(item.name, 'red mug');
  assert.strictEqual(item.file, path.join(dir, 'red-mug.svg'));
  assert.deepStrictEqual(items.listItems(dir).map((i) => i.id), ['red-mug-2', 'red-mug']);
  assert.strictEqual(items.getItem(dir, '../red-mug'), null);
  assert.strictEqual(items.getItem(dir, 'nope'), null);
  assert.deepStrictEqual(items.listItems(path.join(dir, 'missing')), []);
});
