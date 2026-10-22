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
const { spawn, execFile, execFileSync } = require('child_process');

const START_TIMEOUT = 180 * 1000; // ms to load a model
const REQUEST_TIMEOUT = 60 * 1000;
const MAX_RESTARTS = 3;
const DEFAULT_MEDIA_MARKER = '<__media__>'; // older llama-servers; newer ones pick a random one (GET /props)
const IMAGE_SLOT = '[[togepi-picture]]';

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
  // The voice model's vision add-on (optional): lets him look at pictures of windows.
  const vision = manifest.voice && manifest.voice.mmproj ? path.join(root, 'models', manifest.voice.mmproj) : null;
  const files = { server, voice: model('voice'), decide: model('decide'), vision: vision && fs.existsSync(vision) ? vision : null, manifest };
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

/** Is `pid` a running llama-server (and not some other process that reused the number)? */
function isOurServer(pid) {
  try {
    return /llama-server/.test(execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }));
  } catch {
    return false;
  }
}

class Engine {
  /**
   * @param {object} [opts] { root, pidFile }
   *   pidFile: where the servers' process ids are kept, so ones left running
   *   after a crash (holding gigabytes of memory) are stopped next time.
   */
  constructor(opts = {}) {
    this.pidFile = opts.pidFile || null;
    this.files = locate(opts.root);
    this.voice = null;
    this.decider = null;
    this.state = this.files.missing.length ? 'not installed' : 'stopped';
    this.run = 0; // each start/stop; a start that was stopped meanwhile leaves the state alone
    this.starting = null;
  }

  /** Started or starting (not stopped, not resting). */
  get running() {
    return this.state === 'starting' || this.state === 'running' || this.state.startsWith('trouble');
  }

  get ready() {
    return !!this.voice && this.voice.ready;
  }

  get canDecide() {
    return !!this.decider && this.decider.ready;
  }

  /** The voice model can look at pictures (its vision add-on is installed). */
  get canSee() {
    return this.ready && !!this.files.vision;
  }

  start() {
    if (this.state === 'running' && this.ready) return Promise.resolve(true);
    if (!this.starting) this.starting = this.startServers().finally(() => (this.starting = null));
    return this.starting;
  }

  async startServers() {
    const f = this.files;
    if (f.missing.length) {
      this.state = `not installed (missing ${f.missing.join(', ')}; run npm run fetch-models)`;
      return false;
    }
    const run = ++this.run;
    this.state = 'starting';
    this.stopLeftovers();
    // --swa-full: keep the whole cache for Gemma's sliding-window layers, so
    // the unchanged start of his prompt (who he is) is reused between calls
    // instead of read again (measured: 487 of ~700 tokens reused vs 215).
    const voiceArgs = ['-m', f.voice, '-c', '4096', '-ngl', 'all', '-np', '1', '--swa-full', ...(f.vision ? ['--mmproj', f.vision] : []), ...((f.manifest.voice && f.manifest.voice.args) || [])];
    const decideArgs = ['-m', f.decide, '-c', '4096', '-ngl', 'all', '-np', '1', '-ub', '2048', '-b', '2048', ...((f.manifest.decide && f.manifest.decide.args) || [])];
    this.voice = new Server('voice', voiceArgs, f.server);
    this.decider = new Server('decide', decideArgs, f.server);
    const started = Promise.allSettled([this.voice.start(), this.decider.start()]);
    this.savePids();
    const results = await started;
    if (run !== this.run) return false; // stopped while loading
    this.savePids();
    const failed = results.map((r, i) => (r.status === 'rejected' ? `${['voice', 'decide'][i]}: ${r.reason.message}` : null)).filter(Boolean);
    this.state = failed.length ? `trouble: ${failed.join('; ')}` : 'running';
    return this.ready;
  }

  stop() {
    this.run++;
    if (this.voice) this.voice.stop();
    if (this.decider) this.decider.stop();
    this.state = 'stopped';
    this.savePids();
  }

  /** Memory the servers use right now, in MB (resident size), or null. */
  memoryMB() {
    const pids = [this.voice, this.decider].map((sv) => sv && sv.proc && sv.proc.pid).filter(Boolean);
    if (!pids.length) return Promise.resolve(null);
    return new Promise((resolve) => {
      execFile('ps', ['-o', 'rss=', '-p', pids.join(',')], { encoding: 'utf8' }, (err, out) => {
        if (err) return resolve(null);
        const kb = out.split('\n').map(Number).filter((n) => n > 0).reduce((a, b) => a + b, 0);
        resolve(kb ? Math.round(kb / 1024) : null);
      });
    });
  }

  savePids() {
    if (!this.pidFile) return;
    const pids = [this.voice, this.decider].map((sv) => sv && sv.proc && sv.proc.pid).filter(Boolean);
    try {
      fs.mkdirSync(path.dirname(this.pidFile), { recursive: true });
      fs.writeFileSync(this.pidFile, pids.join('\n'));
    } catch {
      // not critical
    }
  }

  /** Stop servers a previous run left behind (it crashed or was force-quit). */
  stopLeftovers() {
    if (!this.pidFile) return;
    let pids = [];
    try {
      pids = fs.readFileSync(this.pidFile, 'utf8').split('\n').map(Number).filter((n) => n > 0);
    } catch {
      return;
    }
    for (const pid of pids) {
      if (!isOurServer(pid)) continue;
      try {
        process.kill(pid);
      } catch {
        // already gone
      }
    }
  }

  /**
   * One think step: returns the model's JSON answer as text. `history`:
   * earlier turns of a conversation ({ role, content }). `image`: a
   * base64 JPEG he looks at too (only if canSee).
   */
  async think({ system, user, schema, image = null, history = [] }) {
    if (!this.ready) throw new Error('voice model not running');
    const withImage = !!image && this.canSee;
    // The model's own chat format, then plain completion constrained to the
    // schema (no thinking-mode or tool-call parsing to trip over). A picture
    // goes in at llama.cpp's media marker.
    const t = await fetchJson(`${this.voice.url}/apply-template`, {
      messages: [
        { role: 'system', content: system },
        // Earlier turns of a conversation (the chat window).
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: withImage ? `${IMAGE_SLOT}\nThis is a picture of the window Sushant is looking at.\n\n${user}` : user },
      ],
      chat_template_kwargs: { enable_thinking: false },
    });
    // A placeholder goes through the template and is swapped for the
    // server's media marker (where the picture goes) afterwards.
    const prompt = withImage ? t.prompt.replace(IMAGE_SLOT, await this.mediaMarker()) : t.prompt;
    const r = await fetchJson(`${this.voice.url}/completion`, {
      prompt: withImage ? { prompt_string: prompt, multimodal_data: [image] } : prompt,
      n_predict: 400,
      temperature: 0.9,
      top_p: 0.95,
      json_schema: schema,
      cache_prompt: true,
    });
    return r ? r.content : null;
  }

  /** The marker the voice server expects where a picture goes (random per server run). */
  async mediaMarker() {
    if (this.voice.mediaMarker && this.voice.markerPort === this.voice.port) return this.voice.mediaMarker;
    let marker = DEFAULT_MEDIA_MARKER;
    try {
      const props = await fetchJson(`${this.voice.url}/props`, null, 5000);
      if (props && typeof props.media_marker === 'string' && props.media_marker) marker = props.media_marker;
    } catch {
      // older server: the default marker
    }
    this.voice.mediaMarker = marker;
    this.voice.markerPort = this.voice.port; // a restarted server picks a new one
    return marker;
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
