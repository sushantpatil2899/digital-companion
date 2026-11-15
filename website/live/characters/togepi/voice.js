'use strict';

// Togepi's voice: little "toge-priii" chirps (never words read aloud). Pitch,
// speed and shape follow his mood. Played by src/renderer/chirp.js, which
// passes the audio context, the start time and a `note` helper; returns
// when the chirp ends. Registers window.Characters.togepi.chirp.

(function () {
  // Per mood: base pitch (Hz), how much each syllable jumps, syllable length
  // (s), wave shape and the final trill's direction.
  const VOICE = {
    cheerful: { pitch: 980, jump: 1.35, len: 0.075, wave: 'triangle', trill: 1.6, volume: 0.16 },
    content: { pitch: 860, jump: 1.22, len: 0.085, wave: 'triangle', trill: 1.35, volume: 0.14 },
    meh: { pitch: 700, jump: 1.08, len: 0.1, wave: 'sine', trill: 1.0, volume: 0.12 },
    sad: { pitch: 560, jump: 0.94, len: 0.13, wave: 'sine', trill: 0.7, volume: 0.11 },
    grumpy: { pitch: 430, jump: 1.05, len: 0.09, wave: 'square', trill: 0.85, volume: 0.06 },
  };

  /**
   * Chirp for a line of `syllables` (about one per word, 2..6), in his mood:
   * a few quick "to-ge" notes and a longer "priii" at the end.
   */
  function chirp({ band = 'content', syllables = 3 } = {}, { ctx, start, note }) {
    const v = VOICE[band] || VOICE.content;
    const n = Math.max(2, Math.min(6, syllables));
    let t = start;
    let f = v.pitch * (0.95 + Math.random() * 0.1);
    for (let i = 0; i < n - 1; i++) {
      const up = i % 2 === 0 ? v.jump : 1 / v.jump;
      const len = v.len * (0.85 + Math.random() * 0.3);
      note(ctx, t, f, f * up, len, v.wave, v.volume);
      f *= up * (0.97 + Math.random() * 0.06);
      t += len + 0.03;
    }
    const last = v.len * 2.6;
    note(ctx, t, f, f * v.trill, last, v.wave, v.volume);
    return t + last;
  }

  window.Characters = window.Characters || {};
  window.Characters.togepi = Object.assign(window.Characters.togepi || {}, { chirp, VOICE });
})();
