'use strict';

// Mori's voice: soft, low, slightly breathy "mm…", "hmm…" and "mori…" hums
// with a sleepy rhythm (never words read aloud). Pitch and shape follow his
// mood. Played by src/renderer/chirp.js, which passes the audio context, the
// start time and a `note` helper; returns when the chirp ends. Registers
// window.Characters.mori.chirp.

(function () {
  // Per mood: pitch (Hz) of his hums, how the last one bends (up: a
  // question "mm?", down: a sigh), hum length (s), wave shape and volume.
  const VOICE = {
    cheerful: { pitch: 330, bend: 1.25, len: 0.2, wave: 'sine', volume: 0.16 },
    content: { pitch: 290, bend: 1.1, len: 0.24, wave: 'sine', volume: 0.15 },
    meh: { pitch: 250, bend: 0.95, len: 0.26, wave: 'triangle', volume: 0.12 },
    sad: { pitch: 220, bend: 0.82, len: 0.32, wave: 'sine', volume: 0.12 },
    grumpy: { pitch: 200, bend: 0.9, len: 0.2, wave: 'triangle', volume: 0.1 },
  };

  /**
   * Chirp for a line of `syllables` (about one per word, 2..6): a few soft
   * hums gliding into each other, slow, the last one bending.
   */
  function chirp({ band = 'content', syllables = 3 } = {}, { ctx, start, note }) {
    const v = VOICE[band] || VOICE.content;
    const n = Math.max(1, Math.min(3, Math.round(syllables / 2)));
    let t = start;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      const f = v.pitch * (i % 2 ? 0.94 : 1) * (0.98 + Math.random() * 0.04);
      const to = last ? f * v.bend : f * 0.97;
      const len = last ? v.len * 1.5 : v.len;
      note(ctx, t, f, to, len, v.wave, v.volume);
      // A faint breathy layer an octave up.
      note(ctx, t, f * 2, to * 2, len * 0.8, 'sine', v.volume * 0.15);
      t += len + 0.09;
    }
    return t;
  }

  window.Characters = window.Characters || {};
  window.Characters.mori = Object.assign(window.Characters.mori || {}, { chirp, VOICE });
})();
