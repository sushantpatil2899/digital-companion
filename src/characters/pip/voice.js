'use strict';

// Pip's voice: short clicky "pip!" and "brrrp?" chirps, a little mechanical
// (never words read aloud). Pitch and shape follow his mood. Played by
// src/renderer/chirp.js, which passes the audio context, the start time and
// a `note` helper; returns when the chirp ends. Registers
// window.Characters.pip.chirp.

(function () {
  // Per mood: pitch (Hz) of his "pip"s, how much the last note bends (a
  // "brrrp?" goes up), note length (s), wave shape and volume.
  const VOICE = {
    cheerful: { pitch: 1500, bend: 1.5, len: 0.05, wave: 'square', volume: 0.07 },
    content: { pitch: 1300, bend: 1.3, len: 0.055, wave: 'square', volume: 0.06 },
    meh: { pitch: 1050, bend: 1.0, len: 0.065, wave: 'triangle', volume: 0.09 },
    sad: { pitch: 850, bend: 0.75, len: 0.08, wave: 'triangle', volume: 0.08 },
    grumpy: { pitch: 700, bend: 0.85, len: 0.06, wave: 'sawtooth', volume: 0.04 },
  };

  /**
   * Chirp for a line of `syllables` (about one per word, 2..6): quick even
   * "pip"s like a little machine, and a rolling "brrrp" at the end.
   */
  function chirp({ band = 'content', syllables = 3 } = {}, { ctx, start, note }) {
    const v = VOICE[band] || VOICE.content;
    const n = Math.max(2, Math.min(6, syllables));
    let t = start;
    for (let i = 0; i < n - 1; i++) {
      const f = v.pitch * (i % 2 ? 0.92 : 1.04) * (0.98 + Math.random() * 0.04);
      note(ctx, t, f, f * 0.97, v.len, v.wave, v.volume);
      t += v.len + 0.045;
    }
    // "brrrp": a fast run of tiny notes bending up (a question) or down.
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const f = v.pitch * 0.8 * (1 + ((v.bend - 1) * i) / steps);
      note(ctx, t, f, f, 0.022, v.wave, v.volume * 0.9);
      t += 0.026;
    }
    return t;
  }

  window.Characters = window.Characters || {};
  window.Characters.pip = Object.assign(window.Characters.pip || {}, { chirp, VOICE });
})();
