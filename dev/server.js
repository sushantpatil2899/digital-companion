'use strict';

// The character creator in a browser: a tiny dev server (no dependencies)
// for making and trying out characters without starting Filo.
//
//   npm run creator    →  http://localhost:5178  (?character=<id> for one)
//
// The page and everything it asks for come from src/main/creator.js, the
// same as in the app (Character → More info). This server adds:
//   /creator/env.json       what this host can do: live reload and making items
//   /creator/reload         server-sent events: tells the page to reload when a
//                           file under src/ or dev/ changes
//   /creator/items.json     the item library (src/main/items.js) at ITEMS_DIR
//                           (default dev/items/, not committed); POST
//                           {description, recolour?} makes a new one: the
//                           OpenMoji icon that shows it, picked by local Gemma,
//                           or by Gemini with MIND_ENGINE=gemini (npm run
//                           fetch-icons first); recoloured by Gemini when
//                           there's a key (GEMINI_API_KEY from the environment
//                           or .env)
//   /creator/items/<id>.svg an item's picture

const http = require('http');
const fs = require('fs');
const path = require('path');
const creator = require('../src/main/creator');

const { ROOT, TYPES } = creator;
const PORT = Number(process.env.PORT) || 5178;
const ITEMS_DIR = path.resolve(ROOT, process.env.ITEMS_DIR || 'dev/items');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

// ------------------------------------------------------------ the item library

/** src/main/items.js, fresh (it may have changed since the server started). */
function items() {
  const file = require.resolve(path.join(ROOT, 'src/main/items'));
  delete require.cache[file];
  return require(file);
}

/** The Gemini key: the environment, else a line in .env. */
/** A setting from the environment, or else from .env (not committed). */
function envVar(name) {
  if (process.env[name]) return process.env[name].trim();
  try {
    const m = read('.env').match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*["']?([^"'\\s#]+)`, 'm'));
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function geminiKey() {
  return envVar('GEMINI_API_KEY');
}

/** The library for the page: no file paths, a URL for each picture instead. */
function itemList() {
  return items()
    .listItems(ITEMS_DIR)
    .map(({ id, name, description, w, h, at }) => ({ id, name, description, w, h, at, src: `/creator/items/${id}.svg?${at}` }));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (c) => {
      s += c;
      if (s.length > 10000) req.destroy();
    });
    req.on('end', () => resolve(s));
    req.on('error', reject);
  });
}

// The model that picks OpenMoji icons is his voice model, made like the app
// makes it (main.js): local Gemma (started on the first item, about 11 GB),
// or with MIND_ENGINE=gemini the Gemini API's model, GEMINI_MODEL if set
// (e.g. gemma-4-26b-a4b-it: Gemma, hosted). Both can be set in .env.
let pickEngine = null;
async function pickerEngine() {
  if (!pickEngine) {
    const { GeminiEngine, engineChoice } = require(path.join(ROOT, 'src/main/mind/gemini'));
    const env = { ...process.env, ...['MIND_ENGINE', 'GEMINI_MODEL'].reduce((o, k) => (envVar(k) ? { ...o, [k]: envVar(k) } : o), {}) };
    // Only the voice: no local decision model.
    const settings = { get: (k) => ({ mindEngine: env.MIND_ENGINE, gemini: { localDecider: false } })[k] };
    if (engineChoice(settings) === 'gemini') {
      pickEngine = GeminiEngine.fromSettings(settings, { env, apiKey: geminiKey() });
    } else {
      const { Engine } = require(path.join(ROOT, 'src/main/mind/engine'));
      pickEngine = new Engine({ root: ROOT });
      console.log('Starting local Gemma to pick icons…');
    }
    console.log(`Icons are picked by ${pickEngine.model || 'local Gemma'}`);
  }
  await pickEngine.start();
  if (!pickEngine.ready) throw new Error(`the model isn’t running: ${pickEngine.status()}`);
  return pickEngine;
}
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (pickEngine) pickEngine.stop();
    process.exit(0);
  });
}

async function newItem(req, res) {
  try {
    const { description, recolour } = JSON.parse((await body(req)) || '{}');
    // Gemini recolours the icon when there's a key.
    const id = await items().createItem(ITEMS_DIR, description, geminiKey(), { engine: await pickerEngine(), recolour });
    console.log(`Made a new item: ${id}`);
    send(res, 200, TYPES['.json'], JSON.stringify({ id, items: itemList() }));
  } catch (err) {
    send(res, 400, TYPES['.json'], JSON.stringify({ error: err.message }));
  }
}

// Live reload.
const listeners = new Set();
let reloadTimer = null;
for (const dir of ['src', 'dev']) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, (_, file) => {
    // A new item isn't a code change: the page adds it to the carousel itself.
    if (file && path.resolve(ROOT, dir, String(file)).startsWith(ITEMS_DIR + path.sep)) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      for (const res of listeners) res.write('data: reload\n\n');
    }, 120);
  });
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === '/creator/env.json') return send(res, 200, TYPES['.json'], JSON.stringify({ host: 'browser', live: true, makesItems: true }));
    if (p === '/creator/items.json') {
      if (req.method === 'POST') return void newItem(req, res);
      return send(res, 200, TYPES['.json'], JSON.stringify(itemList()));
    }
    const pic = p.match(/^\/creator\/items\/([a-z0-9-]+)\.svg$/);
    if (pic) {
      const it = items().getItem(ITEMS_DIR, pic[1]);
      if (!it) return send(res, 404, 'text/plain', 'Not found');
      return send(res, 200, TYPES['.svg'], fs.readFileSync(it.file));
    }
    if (p === '/creator/reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(': hi\n\n');
      listeners.add(res);
      req.on('close', () => listeners.delete(res));
      return;
    }
    const r = creator.serve(p) || { status: 404, type: 'text/plain', body: 'Not found' };
    send(res, r.status, r.type, r.body);
  } catch (err) {
    console.error(err);
    send(res, 500, 'text/plain', String(err && err.stack ? err.stack : err));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Character creator: http://localhost:${PORT}`);
});
