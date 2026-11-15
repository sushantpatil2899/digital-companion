'use strict';

// Optional (SBU Hacks, 2026-10-24): his voice model on Google's Gemini API
// instead of on this Mac, for computers without the memory for the local
// models (about 11 GB). Off unless `mindEngine` is 'gemini' in settings.json
// (Mind → Think with, or MIND_ENGINE=gemini at start). Same interface as Engine (engine.js), so his
// thoughts, chat, diary, reflection and song don't know the difference.
//
// Online: everything in his prompt goes to Google (his personality, what
// you're doing, screen text and pictures, memories, your notes, the chat).
// The privacy rules run before anything reaches his prompt, as always. The
// decision model (and the embedding model) can keep running on this Mac
// (`localDecider`, ~3 GB), since Gemini has nothing like it.
//
// Settings (`gemini` in settings.json, all optional): model, images,
// localDecider, generationConfig (passed to Gemini as is), timeoutMs.
// Key: asked in the welcome window and kept in the Keychain (main.js), or
// GOOGLE_API_KEY / GEMINI_API_KEY (Google's order, testing); GEMINI_MODEL wins
// over the setting (testing). No Electron imports, so it can be unit tested.

const { Engine, wellFormed } = require('./engine');
const { user: userName } = require('./names');

const API = 'https://generativelanguage.googleapis.com/v1beta';

const GEMINI_DEFAULTS = {
  model: 'gemini-3.5-flash-lite', // fast and free of charge (ai.google.dev, 2026-10-24)
  images: true, // send the picture of the window he looks at
  localDecider: true, // keep the decision model on this Mac (privacy check, picking lines)
  generationConfig: { temperature: 0.9 },
  timeoutMs: 60 * 1000,
};

// JSON Schema keywords Gemini's responseSchema takes; the rest (maxLength…)
// are dropped. Lengths are checked in code anyway (thinker.js).
const SCHEMA_KEYS = ['type', 'enum', 'items', 'properties', 'required', 'minItems', 'maxItems', 'minimum', 'maximum', 'description'];

/** Our JSON Schema (thinker.js) in the shape Gemini's responseSchema expects. */
function toGeminiSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const out = {};
  for (const k of SCHEMA_KEYS) {
    if (s[k] === undefined) continue;
    if (k === 'type') out.type = String(s.type).toUpperCase();
    else if (k === 'items') out.items = toGeminiSchema(s.items);
    else if (k === 'properties') out.properties = Object.fromEntries(Object.entries(s.properties).map(([p, v]) => [p, toGeminiSchema(v)]));
    else out[k] = s[k];
  }
  return out;
}

/** The engine settings ask for: 'gemini' or 'local' (Mind → Think with). */
function engineChoice(settings) {
  return String((settings && settings.get('mindEngine')) || 'local').toLowerCase() === 'gemini' ? 'gemini' : 'local';
}

/** MIND_ENGINE (testing) sets the choice when he starts, and it's kept; the menu changes it later. */
function applyEngineEnv(settings, env = process.env) {
  const v = String(env.MIND_ENGINE || '').toLowerCase();
  if ((v === 'gemini' || v === 'local') && settings.get('mindEngine') !== v) settings.set('mindEngine', v);
}

/** Mind → Think with: [id, label] for each engine, like Listen with. `hasKey`: a Gemini key is set. */
function engineChoices({ hasKey = false } = {}) {
  return [
    ['local', 'Gemma, on this Mac (about 11 GB of memory; nothing leaves it)'],
    ['gemini', `Gemini (online: what he thinks about goes to Google)${hasKey ? '' : ' — add your key in Welcome and what’s new…'}`],
  ];
}

class GeminiEngine {
  /**
   * @param {object} [opts] { apiKey, model, images, generationConfig, timeoutMs, local, fetchImpl }
   *   local: an Engine started without its voice model (decide and embed only), or null.
   */
  constructor(opts = {}) {
    const o = { ...GEMINI_DEFAULTS, ...opts };
    this.apiKey = o.apiKey || null;
    this.model = o.model;
    this.images = !!o.images;
    this.generationConfig = { ...o.generationConfig };
    this.timeoutMs = o.timeoutMs;
    this.local = o.local || null;
    this.fetchImpl = o.fetchImpl || fetch;
    this.state = this.apiKey ? 'stopped' : 'not set up (no GEMINI_API_KEY)';
    this.lastError = null;
  }

  /**
   * From settings.json (`gemini`) and the environment; the local part only if
   * wanted and installed. `apiKey`: the key you saved in the app (main.js
   * keeps it in the Keychain); without it, GOOGLE_API_KEY or GEMINI_API_KEY.
   */
  static fromSettings(settings, { env = process.env, pidFile = null, fetchImpl, apiKey = null } = {}) {
    const cfg = { ...GEMINI_DEFAULTS, ...((settings && settings.get('gemini')) || {}) };
    const local = cfg.localDecider ? new Engine({ pidFile, voice: false }) : null;
    return new GeminiEngine({
      ...cfg,
      apiKey: (apiKey || env.GOOGLE_API_KEY || env.GEMINI_API_KEY || '').trim() || null,
      model: env.GEMINI_MODEL || cfg.model,
      local: local && !local.files.missing.length ? local : null,
      fetchImpl,
    });
  }

  get running() {
    return this.state === 'running' || (!!this.local && this.local.running);
  }

  get ready() {
    return this.state === 'running';
  }

  get canDecide() {
    return !!this.local && this.local.canDecide;
  }

  get canEmbed() {
    return !!this.local && this.local.canEmbed;
  }

  get canSee() {
    return this.ready && this.images;
  }

  /** What runs where, in the shape Engine.files has (the report and the brain view show it). */
  get files() {
    const lf = this.local ? this.local.files : {};
    return {
      voice: `gemini/${this.model}`,
      vision: this.images ? `gemini/${this.model}` : null,
      decide: lf.decide || null,
      embed: lf.embed || null,
      missing: this.apiKey ? [] : ['GEMINI_API_KEY'],
    };
  }

  async start() {
    if (!this.apiKey) return false;
    this.state = 'running';
    // The local decision model loads in the background; Gemini works right away.
    if (this.local) this.local.start().catch((e) => console.error('Decision model:', e.message));
    return true;
  }

  stop() {
    if (this.apiKey) this.state = 'stopped';
    if (this.local) this.local.stop();
  }

  memoryMB() {
    return this.local ? this.local.memoryMB() : Promise.resolve(null);
  }

  embed(texts, opts) {
    if (!this.canEmbed) return Promise.reject(new Error('embedding model not running'));
    return this.local.embed(texts, opts);
  }

  decide(state, questions) {
    if (!this.canDecide) return Promise.reject(new Error('decision model not running'));
    return this.local.decide(state, questions);
  }

  status() {
    const parts = [`Gemini ${this.model}: ${this.state}`];
    if (this.lastError) parts.push(this.lastError);
    if (this.local) parts.push(`decision model on this Mac: ${this.local.status()}`);
    return parts.join(' — ');
  }

  /** One think step, like Engine.think: the model's JSON answer as text. */
  async think({ system, user, schema, image = null, history = [] }) {
    if (!this.ready) throw new Error(`Gemini ${this.state}`);
    const picture = image && this.canSee ? [{ inlineData: { mimeType: 'image/jpeg', data: image } }, { text: `This is a picture of the window ${userName()} is looking at.` }] : [];
    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [
        // Earlier turns of a conversation (the chat window).
        ...history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        { role: 'user', parts: [...picture, { text: user }] },
      ],
      generationConfig: { ...this.generationConfig, responseMimeType: 'application/json', ...(schema ? { responseSchema: toGeminiSchema(schema) } : {}) },
    };
    let r = await this.post(body);
    // A schema Gemini won't take: plain JSON mode (the answer is checked in code anyway).
    if (r.status === 400 && schema) {
      delete body.generationConfig.responseSchema;
      r = await this.post(body);
    }
    if (!r.ok) throw this.fail(`Gemini ${r.status}${r.status === 429 ? ' (too many requests: free tier limit)' : ''}: ${r.message}`);
    const c = r.data && r.data.candidates && r.data.candidates[0];
    // Thinking models may add their thoughts as parts marked `thought`.
    const text = c && c.content && Array.isArray(c.content.parts) ? c.content.parts.filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('') : '';
    if (!text) throw this.fail(`Gemini gave no answer (${(r.data && r.data.promptFeedback && r.data.promptFeedback.blockReason) || (c && c.finishReason) || 'empty'})`);
    this.lastError = null;
    return text;
  }

  async post(body) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(`${API}/models/${encodeURIComponent(this.model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        // No half emoji (a cut one breaks the request, like the local models' 400).
        body: JSON.stringify(wellFormed(body)),
        signal: ctl.signal,
      });
      const data = await res.json().catch(() => null);
      const message = (data && data.error && data.error.message) || res.statusText || '';
      return { ok: res.ok, status: res.status, data, message: String(message).slice(0, 200) };
    } catch (e) {
      throw this.fail(e.name === 'AbortError' ? 'Gemini took too long' : `Gemini unreachable: ${e.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  fail(message) {
    this.lastError = message;
    return new Error(message);
  }
}

module.exports = { GeminiEngine, GEMINI_DEFAULTS, engineChoice, applyEngineEnv, engineChoices, toGeminiSchema };
