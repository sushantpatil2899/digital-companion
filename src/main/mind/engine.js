'use strict';

// Runs the two local models with llama.cpp's llama-server, each in its own
// background process so thinking never stalls his animation:
// - "voice": the language model that thinks and writes his lines
// - "decide": the decision model (vLLM d3-nano) that answers typed questions fast
// Both listen on 127.0.0.1 only; nothing leaves your computer.
//
// Files (downloaded by scripts/fetch-models.js, bundled into the app):
//   engine/llama-server (+ its libraries)
//   models/models.json  { "voice": { "file": … }, "decide": { "file": … } }
//   models/*.gguf
// No Electron imports, so it can be unit tested.

const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const START_TIMEOUT = 180 * 1000; // ms to load a model
const REQUEST_TIMEOUT = 60 * 1000;
const MAX_RESTARTS = 3;

/** Where the engine and models live: inside the app when packaged, the repo otherwise. */
function defaultRoot() {
  if (process.env.TOGEPI_MODELS_ROOT) return process.env.TOGEPI_MODELS_ROOT;
  const resources = process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, 'models')) ? process.resourcesPath : null;
  return resources || path.join(__dirname, '..', '..', '..');
}

/** Paths of the server binary and both models, plus what's missing. */
function locate(root = defaultRoot()) {
  const exe = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
  const server = path.join(root, 'engine', exe);
  let manifest = {};
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(root, 'models', 'models.json'), 'utf8'));
  } catch {
    // not downloaded yet
  }
  const model = (role) => (manifest[role] && manifest[role].file ? path.join(root, 'models', manifest[role].file) : null);
  const files = { server, voice: model('voice'), decide: model('decide'), manifest };
  files.missing = ['server', 'voice', 'decide'].filter((k) => !files[k] || !fs.existsSync(files[k]));
  return files;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function fetchJson(url, body, timeout = REQUEST_TIMEOUT) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

/** One llama-server process serving one model. */
class Server {
  constructor(name, args, binary) {
    this.name = name;
    this.args = args;
    this.binary = binary;
    this.proc = null;
    this.port = null;
    this.ready = false;
    this.error = null;
    this.restarts = 0;
    this.stopping = false;
  }

  get url() {
    return `http://127.0.0.1:${this.port}`;
  }

  async start() {
    this.port = await freePort();
    this.ready = false;
    const args = [...this.args, '--host', '127.0.0.1', '--port', String(this.port), '--offline', '--no-webui'];
    this.proc = spawn(this.binary, args, { stdio: ['ignore', 'ignore', 'pipe'], cwd: path.dirname(this.binary) });
    let tail = '';
    this.proc.stderr.on('data', (d) => {
      tail = (tail + d.toString()).slice(-2000);
    });
    this.proc.on('exit', (code) => {
      this.ready = false;
      this.proc = null;
      if (this.stopping) return;
      this.error = `${this.name} stopped (${code}): ${tail.split('\n').filter(Boolean).slice(-2).join(' ')}`;
      if (this.restarts < MAX_RESTARTS) {
        this.restarts++;
        setTimeout(() => this.start().catch(() => {}), 2000 * this.restarts);
      }
    });
    const deadline = Date.now() + START_TIMEOUT;
    while (Date.now() < deadline && this.proc) {
      try {
        const h = await fetchJson(`${this.url}/health`, null, 2000);
        if (h && h.status === 'ok') {
          this.ready = true;
          this.error = null;
          return;
        }
      } catch {
        // still loading
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!this.ready) throw new Error(this.error || `${this.name} did not start`);
  }

  stop() {
    this.stopping = true;
    if (this.proc) this.proc.kill();
    this.proc = null;
    this.ready = false;
  }
}

class Engine {
  /** @param {object} [opts] { root } */
  constructor(opts = {}) {
    this.files = locate(opts.root);
    this.voice = null;
    this.decider = null;
    this.state = this.files.missing.length ? 'not installed' : 'stopped';
  }

  get ready() {
    return !!this.voice && this.voice.ready;
  }

  get canDecide() {
    return !!this.decider && this.decider.ready;
  }

  async start() {
    const f = this.files;
    if (f.missing.length) {
      this.state = `not installed (missing ${f.missing.join(', ')}; run npm run fetch-models)`;
      return false;
    }
    this.state = 'starting';
    const voiceArgs = ['-m', f.voice, '-c', '4096', '-ngl', 'all', '-np', '1', ...((f.manifest.voice && f.manifest.voice.args) || [])];
    const decideArgs = ['-m', f.decide, '-c', '4096', '-ngl', 'all', '-np', '1', '-ub', '2048', '-b', '2048', ...((f.manifest.decide && f.manifest.decide.args) || [])];
    this.voice = new Server('voice', voiceArgs, f.server);
    this.decider = new Server('decide', decideArgs, f.server);
    const results = await Promise.allSettled([this.voice.start(), this.decider.start()]);
    const failed = results.map((r, i) => (r.status === 'rejected' ? `${['voice', 'decide'][i]}: ${r.reason.message}` : null)).filter(Boolean);
    this.state = failed.length ? `trouble: ${failed.join('; ')}` : 'running';
    return this.ready;
  }

  stop() {
    if (this.voice) this.voice.stop();
    if (this.decider) this.decider.stop();
    this.state = 'stopped';
  }

  /** One think step: returns the model's JSON answer as text. */
  async think({ system, user, schema }) {
    if (!this.ready) throw new Error('voice model not running');
    // The model's own chat format, then plain completion constrained to the
    // schema (no thinking-mode or tool-call parsing to trip over).
    const t = await fetchJson(`${this.voice.url}/apply-template`, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      chat_template_kwargs: { enable_thinking: false },
    });
    const r = await fetchJson(`${this.voice.url}/completion`, {
      prompt: t.prompt,
      n_predict: 400,
      temperature: 0.9,
      top_p: 0.95,
      json_schema: schema,
      cache_prompt: true,
    });
    return r ? r.content : null;
  }

  /** Typed questions about `state` (TypeSafe System One shape); returns the answers. */
  async decide(state, questions) {
    if (!this.canDecide) throw new Error('decision model not running');
    const r = await fetchJson(`${this.decider.url}/v1/systemone`, { state, questions }, 15000);
    return r ? r.answers : null;
  }

  status() {
    const parts = [this.state];
    if (this.voice && this.voice.error) parts.push(this.voice.error);
    if (this.decider && this.decider.error) parts.push(this.decider.error);
    return parts.join(' — ');
  }
}

module.exports = { Engine, locate, defaultRoot };
