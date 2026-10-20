'use strict';

// Downloads what Togepi's mind runs on, once, into the repo (git-ignored):
//   engine/  llama.cpp's llama-server for this computer
//   models/  the language model ("voice") and the decision model ("decide"),
//            plus models/models.json naming them
// `npm run dist` runs this first and bundles both folders into Togepi.app, so
// the app itself never needs the internet. Re-running skips what's already
// there. See docs/mind/PLAN.md.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const ROOT = path.join(__dirname, '..');
const ENGINE_DIR = path.join(ROOT, 'engine');
const MODELS_DIR = path.join(ROOT, 'models');

// llama.cpp release with /v1/systemone (decision models) support.
const LLAMA_TAG = 'b11748';
const ENGINE_ASSETS = {
  'darwin-arm64': `llama-${LLAMA_TAG}-bin-macos-arm64.tar.gz`,
  'darwin-x64': `llama-${LLAMA_TAG}-bin-macos-x64.tar.gz`,
  'linux-x64': `llama-${LLAMA_TAG}-bin-ubuntu-x64.tar.gz`,
  'linux-arm64': `llama-${LLAMA_TAG}-bin-ubuntu-arm64.tar.gz`,
};

// The two models (Hugging Face repo + file). `args` are extra llama-server options.
const MODELS = {
  voice: { repo: 'ggml-org/gemma-4-12B-it-GGUF', file: 'gemma-4-12B-it-Q4_0.gguf', args: [] },
  decide: { repo: 'ggml-org/Laya-GGUF', file: 'Laya-Q8_0.gguf', args: [] },
};

function mb(n) {
  return `${Math.round(n / 1e6)} MB`;
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (fs.existsSync(dest) && total && fs.statSync(dest).size === total) {
    console.log(`  already have ${path.basename(dest)}`);
    await res.body.cancel();
    return;
  }
  const part = `${dest}.part`;
  let done = 0;
  let shown = 0;
  const body = Readable.fromWeb(res.body);
  body.on('data', (chunk) => {
    done += chunk.length;
    if (done - shown > 50e6 || done === total) {
      shown = done;
      process.stdout.write(`\r  ${path.basename(dest)}: ${mb(done)}${total ? ` / ${mb(total)}` : ''}   `);
    }
  });
  await pipeline(body, fs.createWriteStream(part));
  process.stdout.write('\n');
  fs.renameSync(part, dest);
}

async function fetchEngine() {
  const key = `${process.platform}-${process.arch}`;
  const asset = ENGINE_ASSETS[key];
  const exe = path.join(ENGINE_DIR, 'llama-server');
  if (fs.existsSync(exe) && fs.existsSync(path.join(ENGINE_DIR, 'VERSION')) && fs.readFileSync(path.join(ENGINE_DIR, 'VERSION'), 'utf8').trim() === LLAMA_TAG) {
    console.log(`engine: llama-server ${LLAMA_TAG} already there`);
    return;
  }
  if (!asset) {
    console.log(`engine: no prebuilt llama-server for ${key}; build llama.cpp yourself and put llama-server in engine/`);
    return;
  }
  console.log(`engine: llama-server ${LLAMA_TAG} (${asset})`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'togepi-engine-'));
  const tarball = path.join(tmp, asset);
  await download(`https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_TAG}/${asset}`, tarball);
  execFileSync('tar', ['-xzf', tarball, '-C', tmp]);
  const src = path.join(tmp, `llama-${LLAMA_TAG}`);
  fs.rmSync(ENGINE_DIR, { recursive: true, force: true });
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
  // Only the server and the libraries it needs (the release has many other tools).
  for (const f of fs.readdirSync(src)) {
    if (f === 'llama-server' || /\.(dylib|so(\.\d+)*|metal|txt|md)$/.test(f) || /^LICENSE/i.test(f)) {
      fs.cpSync(path.join(src, f), path.join(ENGINE_DIR, f), { recursive: true, verbatimSymlinks: true });
    }
  }
  fs.chmodSync(exe, 0o755);
  fs.writeFileSync(path.join(ENGINE_DIR, 'VERSION'), `${LLAMA_TAG}\n`);
  fs.rmSync(tmp, { recursive: true, force: true });
}

async function fetchModels() {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  const manifest = {};
  for (const [role, m] of Object.entries(MODELS)) {
    console.log(`${role}: ${m.repo}/${m.file}`);
    await download(`https://huggingface.co/${m.repo}/resolve/main/${m.file}`, path.join(MODELS_DIR, m.file));
    manifest[role] = { file: m.file, repo: m.repo, args: m.args };
  }
  fs.writeFileSync(path.join(MODELS_DIR, 'models.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  // Remove models no longer used (e.g. after switching to a different one).
  const keep = new Set(['models.json', ...Object.values(MODELS).map((m) => m.file)]);
  for (const f of fs.readdirSync(MODELS_DIR)) {
    if (!keep.has(f) && f.endsWith('.gguf')) {
      fs.rmSync(path.join(MODELS_DIR, f));
      console.log(`removed old model ${f}`);
    }
  }
}

(async () => {
  try {
    await fetchEngine();
    await fetchModels();
    console.log('Done: his mind has everything it needs.');
  } catch (e) {
    console.error(`\nCould not download: ${e.message}`);
    process.exit(1);
  }
})();
