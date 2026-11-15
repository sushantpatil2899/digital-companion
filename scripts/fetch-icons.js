'use strict';

// Builds models/openmoji-index.json, the OpenMoji icons items can be found
// in (src/main/icons.js): every icon's name from Iconify's OpenMoji set and
// its keywords from OpenMoji's data. Only the index is kept (a few hundred
// KB); each icon's SVG is fetched when it's used.
//
//   npm run fetch-icons

const fs = require('fs');
const path = require('path');
const { ICONS, buildIndex, defaultIndexFile } = require('../src/main/icons');

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

(async () => {
  console.log('Downloading the OpenMoji icon names and keywords…');
  const [set, data] = await Promise.all([getJson(ICONS.setUrl), getJson(ICONS.dataUrl)]);
  const index = buildIndex(set, data);
  const file = defaultIndexFile(path.join(__dirname, '..'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(index));
  console.log(`${index.length} of ${Object.keys(set.icons).length} icons can be items → ${path.relative(process.cwd(), file)} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
