'use strict';

// Tonk's voice, a placeholder (Tonk decision: "skip the voice part for now"):
// a few soft, even beeps, lower when he's sad or grumpy. A whirr-and-click
// voice comes later. Played by src/renderer/chirp.js, which passes the
// audio context, the start time and a `note` helper; returns when the chirp
// ends. Registers window.Characters.tonk.chirp.

(function () {
  const VOICE = {
    cheerful: { pitch: 880, len: 0.06, volume: 0.06 },
    content: { pitch: 780, len: 0.065, volume: 0.06 },
    meh: { pitch: 660, len: 0.07, volume: 0.07 },
    sad: { pitch: 520, len: 0.08, volume: 0.07 },
    grumpy: { pitch: 440, len: 0.06, volume: 0.05 },
  };

  /** Beeps for a line of `syllables` (about one per word, 2..5). */
  function chirp({ band = 'content', syllables = 3 } = {}, { ctx, start, note }) {
    const v = VOICE[band] || VOICE.content;
    const n = Math.max(2, Math.min(5, syllables));
    let t = start;
    for (let i = 0; i < n; i++) {
      const f = v.pitch * (i % 2 ? 0.94 : 1);
      note(ctx, t, f, f, v.len, 'sine', v.volume);
      t += v.len + 0.05;
    }
    return t;
  }

  window.Characters = window.Characters || {};
  window.Characters.tonk = Object.assign(window.Characters.tonk || {}, { chirp, VOICE });
})();
