'use strict';

// Wolfie's voice, a placeholder: a short rising "awoo" (lower when he's sad or
// grumpy) until a real one. Played by src/renderer/chirp.js, which passes the
// audio context, the start time and a `note` helper; returns when the chirp
// ends. Registers window.Characters.wolfie.chirp.

(function () {
  const VOICE = {
    cheerful: { pitch: 520, rise: 1.5, len: 0.28, volume: 0.07 },
    content: { pitch: 460, rise: 1.35, len: 0.26, volume: 0.06 },
    meh: { pitch: 400, rise: 1.15, len: 0.24, volume: 0.07 },
    sad: { pitch: 340, rise: 0.85, len: 0.3, volume: 0.07 },
    grumpy: { pitch: 300, rise: 1.0, len: 0.18, volume: 0.05 },
  };

  /** One "awoo" per line, a second short one for longer lines. */
  function chirp({ band = 'content', syllables = 3 } = {}, { ctx, start, note }) {
    const v = VOICE[band] || VOICE.content;
    let t = start;
    note(ctx, t, v.pitch, v.pitch * v.rise, v.len, 'triangle', v.volume);
    t += v.len + 0.05;
    if (syllables > 3) {
      note(ctx, t, v.pitch * 1.1, v.pitch * v.rise * 1.1, v.len * 0.6, 'triangle', v.volume * 0.8);
      t += v.len * 0.6 + 0.05;
    }
    return t;
  }

  window.Characters = window.Characters || {};
  window.Characters.wolfie = Object.assign(window.Characters.wolfie || {}, { chirp, VOICE });
})();
