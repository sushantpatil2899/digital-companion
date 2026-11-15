'use strict';

// The character creator (src/creator/): what its page asks for, made from
// the repo's own files. Served two ways with the same paths: by the app, on
// the filo-creator:// protocol (src/main/main.js, Character → More info),
// and in a browser by dev/server.js (npm run creator). No Electron imports,
// so it can be unit tested.
//
//   /                         the page (src/creator/creator.html)
//   /creator/stage.html       the real companion window (src/renderer/index.html,
//                             rewritten) with a fake window.companion
//                             (src/creator/stage.js)
//   /creator/characters.json  each character's activities, variants, own states,
//                             lines, pose values and personality (with each
//                             slider's label and explanation), read fresh from
//                             src/characters
//   /creator/renderer.json    the states and events src/renderer/renderer.js
//                             knows, read from its source
//   /creator/sim.js           the companion's simulation (src/main/companion.js
//                             and the plain modules it needs) as one browser
//                             script, window.Sim, for the Simulation tab
//   /src/…                    the files under src/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
};

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

/** The companion window's page, with paths made absolute and the fake companion added before renderer.js. */
function stagePage() {
  let html = read('src/renderer/index.html');
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\s*/, '');
  html = html.replace(/src="\.\.\/([^"]+)"/g, 'src="/src/$1"');
  html = html.replace(/src="(?!\/)([^"]+)"/g, 'src="/src/renderer/$1"');
  html = html.replace(
    '<script src="/src/renderer/renderer.js">',
    '<script src="/src/creator/scenes.js"></script>\n    <script src="/src/creator/stage.js"></script>\n    <script src="/src/renderer/renderer.js">',
  );
  return html;
}

/** The part of `src` from `from` up to `to`. */
function between(src, from, to) {
  const i = src.indexOf(from);
  const j = src.indexOf(to, i + 1);
  return i < 0 ? '' : src.slice(i, j < 0 ? undefined : j);
}

/** The `case '...'` labels of the top-level switch in a function body (4-space indented). */
function topCases(body) {
  return [...new Set([...body.matchAll(/^ {4}case '(\w+)':/gm)].map((m) => m[1]))];
}

/** The states and events renderer.js handles. */
function rendererInfo() {
  const src = read('src/renderer/renderer.js');
  return {
    states: topCases(between(src, 'function computePose(', '\nfunction ')),
    events: topCases(between(src, 'function handleEvent(', '\nfunction ')),
  };
}

/**
 * The text values each pose field takes in some source (`arms: ['down', 'up', ...]`):
 * from `p.arms === 'up'`, `p.arms = 'up'`, `case 'up':` in a `switch (p.arms)`,
 * `['up', ...].includes(p.arms)` and the `// a | b | c` comments in defaultPose.
 */
function poseValues(src, into = {}) {
  const add = (key, value) => (into[key] = into[key] || new Set()).add(value);
  for (const m of src.matchAll(/\b(?:p|pose)\.(\w+) (?:===|!==|=) '(\w+)'/g)) add(m[1], m[2]);
  for (const m of src.matchAll(/\b(arms|eyes|mouth|feet|view|prop) (?:===|!==) '(\w+)'/g)) add(m[1], m[2]);
  for (const m of src.matchAll(/\[([^\]]+)\]\.includes\((?:p|pose)\.(\w+)\)/g)) {
    for (const v of m[1].matchAll(/'(\w+)'/g)) add(m[2], v[1]);
  }
  for (const m of src.matchAll(/^\s+(\w+): '\w+', \/\/ (\w+(?: \| \w+)+)/gm)) {
    for (const v of m[2].split(' | ')) add(m[1], v);
  }
  for (const m of src.matchAll(/switch \((?:p|pose)\.(\w+)\) \{/g)) {
    // The cases directly inside this switch (not in nested ones).
    let depth = 1;
    let i = m.index + m[0].length;
    let body = '';
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      body += depth === 1 ? src[i] : ' ';
    }
    for (const c of body.matchAll(/case '(\w+)':/g)) add(m[1], c[1]);
  }
  return into;
}

/** What the creator needs to know about each character (functions dropped). */
function characterInfo() {
  // Fresh every time, so a character added or changed since the app started
  // shows up (only src/characters: the rest of the app keeps its modules).
  const dir = path.join(ROOT, 'src', 'characters') + path.sep;
  for (const k of Object.keys(require.cache)) if (k.startsWith(dir)) delete require.cache[k];
  const characters = require('../characters');
  const sliders = require('./mind/personality')
    .sliders()
    .map(([p, label, help, group]) => ({ path: p, label, help, group }));
  return characters.list().map((ch) => ({
    id: ch.id,
    name: ch.name,
    pronoun: ch.pronoun,
    concept: ch.concept || '',
    self: ch.self,
    personality: ch.personality,
    sliders,
    activities: ch.activities.map((a) => ({
      id: a.id,
      label: a.label,
      duration: a.stay && a.stay.duration,
      move: a.move || null,
      variants: (a.variants || []).map((v) => ({ id: v.id, then: v.then || null })),
    })),
    states: Object.entries(ch.states || {}).map(([id, s]) => ({ id, label: s.label, then: s.then || null })),
    lines: JSON.parse(JSON.stringify(ch.lines)),
    poseValues: Object.fromEntries(
      Object.entries(poseValues(read(`src/characters/${ch.id}/look.js`), poseValues(read('src/renderer/renderer.js')))).map(([k, v]) => [k, [...v]]),
    ),
  }));
}

/**
 * src/main/companion.js and everything it requires (all plain modules, no
 * Electron or Node), wrapped as CommonJS modules in one script for the
 * browser. Sets window.Sim: { Companion, MENU_ACTIVITIES, characters }.
 */
function simBundle() {
  const mods = new Map(); // repo path → { src, deps: { spec: repo path } }
  const visit = (file) => {
    const id = path.relative(ROOT, file).split(path.sep).join('/');
    if (mods.has(id)) return;
    const src = fs.readFileSync(file, 'utf8');
    const deps = {};
    mods.set(id, { src, deps });
    for (const [, spec] of src.matchAll(/require\('(\.[^']+)'\)/g)) {
      let dep;
      try {
        dep = require.resolve(path.resolve(path.dirname(file), spec));
      } catch {
        continue; // in a comment
      }
      deps[spec] = path.relative(ROOT, dep).split(path.sep).join('/');
      visit(dep);
    }
  };
  visit(path.join(ROOT, 'src', 'main', 'companion.js'));
  const defs = [...mods].map(([id, { src, deps }]) => `${JSON.stringify(id)}: [${JSON.stringify(deps)}, function (module, exports, require) {\n${src}\n}]`);
  return `// Generated by src/main/creator.js (simBundle) from src/main/companion.js.
(function () {
'use strict';
const defs = {
${defs.join(',\n')}
};
const cache = {};
function load(id) {
  if (cache[id]) return cache[id].exports;
  const [deps, fn] = defs[id];
  const module = { exports: {} };
  cache[id] = module;
  fn(module, module.exports, (spec) => {
    if (!(spec in deps)) throw new Error('Not in the creator simulation: ' + spec);
    return load(deps[spec]);
  });
  return module.exports;
}
const c = load('src/main/companion.js');
window.Sim = { Companion: c.Companion, MENU_ACTIVITIES: c.MENU_ACTIVITIES, characters: load('src/characters/index.js') };
})();
`;
}

/**
 * The answer for `pathname`: { status, type, body }, or null for paths the
 * host answers itself (dev/server.js: items and live reload).
 */
function serve(pathname) {
  const ok = (type, body) => ({ status: 200, type, body });
  if (pathname === '/') pathname = '/src/creator/creator.html';
  if (pathname === '/creator/stage.html') return ok(TYPES['.html'], stagePage());
  if (pathname === '/creator/characters.json') return ok(TYPES['.json'], JSON.stringify(characterInfo()));
  if (pathname === '/creator/renderer.json') return ok(TYPES['.json'], JSON.stringify(rendererInfo()));
  if (pathname === '/creator/sim.js') return ok(TYPES['.js'], simBundle());
  if (!pathname.startsWith('/src/')) return null;
  // Only files under src/.
  const file = path.resolve(ROOT, '.' + pathname);
  if (!file.startsWith(path.join(ROOT, 'src') + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return { status: 404, type: 'text/plain', body: 'Not found' };
  }
  return ok(TYPES[path.extname(file)] || 'application/octet-stream', fs.readFileSync(file));
}

module.exports = { serve, characterInfo, rendererInfo, simBundle, stagePage, TYPES, ROOT };
