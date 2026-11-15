'use strict';

// Phase 11: turning what you said into text, with the engine you pick
// (`speechEngine` in settings.json, *Mind → Listen with*):
// - 'apple': Apple's on-device speech recognition, through the small helper
//   built from src/main/mac/listen.swift. The audio never leaves your Mac.
// - 'elevenlabs': ElevenLabs Scribe. The recording is sent to ElevenLabs
//   (only when you've picked it), with your ElevenLabs key.
// Either way the recording (a short WAV the listen window made) is deleted
// right after it's turned into text. No Electron imports, so it can be unit
// tested.

const fs = require('fs');
const { execFile } = require('child_process');

const HEARING = {
  engines: ['apple', 'elevenlabs'],
  scribeApi: 'https://api.elevenlabs.io/v1/speech-to-text',
  scribeModel: 'scribe_v2',
  timeout: 30 * 1000,
  maxChars: 500, // what you said, at most (like a chat message)
};

/** Run Apple's recognizer on `file`; resolves with the text ('' if nothing was said). */
function transcribeApple(file, { helper, locale = '', hints = [], run = execFile } = {}) {
  return new Promise((resolve, reject) => {
    if (!helper) {
      reject(new Error('Apple speech recognition isn’t set up (Xcode command line tools: xcode-select --install)'));
      return;
    }
    run(helper, [file, locale, ...hints], { timeout: HEARING.timeout + 5000, maxBuffer: 1024 * 1024 }, (err, stdout) => {
      let out = null;
      try {
        out = JSON.parse(String(stdout || '').trim().split('\n').pop());
      } catch {
        // no JSON: it crashed or was stopped
      }
      if (out && typeof out.text === 'string') resolve(out.text);
      else if (out && out.error) reject(Object.assign(new Error(out.error), { code: out.code }));
      else reject(new Error(err ? `speech recognition stopped: ${err.message.split('\n')[0]}` : 'speech recognition gave nothing'));
    });
  });
}

/** Send `wav` (bytes) to ElevenLabs Scribe; resolves with the text. */
async function transcribeScribe(wav, key, { keyterms = [], language = null, fetchImpl = fetch } = {}) {
  if (!key) throw new Error('no ElevenLabs key (Mind → Our songs… → Settings)');
  const form = new FormData();
  form.append('model_id', HEARING.scribeModel);
  form.append('file', new Blob([wav], { type: 'audio/wav' }), 'speech.wav');
  form.append('tag_audio_events', 'false');
  form.append('no_verbatim', 'true');
  if (language) form.append('language_code', language);
  for (const k of keyterms) form.append('keyterms', k);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), HEARING.timeout);
  try {
    const res = await fetchImpl(HEARING.scribeApi, { method: 'POST', headers: { 'xi-api-key': key }, body: form, signal: ctl.signal });
    if (!res.ok) {
      let detail = '';
      try {
        const j = await res.json();
        detail = typeof j.detail === 'string' ? j.detail : j.detail && j.detail.message ? j.detail.message : JSON.stringify(j.detail || j).slice(0, 200);
      } catch {
        // no JSON body
      }
      if (res.status === 401 && /permission|missing/i.test(detail)) detail += ' (give your ElevenLabs key access to Speech to Text)';
      throw new Error(`ElevenLabs ${res.status}${detail ? `: ${detail}` : ''}`);
    }
    const j = await res.json();
    return typeof j.text === 'string' ? j.text : '';
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('ElevenLabs took too long');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** What you said, tidied: one line, no "(laughs)", not too long. */
function cleanHeard(text) {
  return String(text || '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, HEARING.maxChars);
}

/**
 * Turn the recording at `file` into text with `engine`, then delete it.
 * @param {object} o { engine, file, helper, key, hints, locale, run, fetchImpl }
 */
async function transcribe({ engine = 'apple', file, helper, key, hints = [], locale = '', run, fetchImpl }) {
  try {
    if (engine === 'elevenlabs') return cleanHeard(await transcribeScribe(fs.readFileSync(file), key, { keyterms: hints, fetchImpl }));
    return cleanHeard(await transcribeApple(file, { helper, locale, hints, run }));
  } finally {
    fs.rmSync(file, { force: true });
  }
}

module.exports = { HEARING, transcribe, transcribeApple, transcribeScribe, cleanHeard };
