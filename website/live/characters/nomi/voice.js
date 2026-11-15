'use strict';

// Nomi's voice: very soft, dreamy "mmm…", "oh…" and "hmm?" hums with a
// gentle airy reverb (never words read aloud). Pitch and shape follow her
// mood. Played by src/renderer/chirp.js, which passes the audio context and
// the start time; she makes her own notes so they can go through the reverb.
// Registers window.Characters.nomi.chirp.

(function () {
  // Per mood: pitch (Hz), how the last hum bends (up: "hmm?", down: "oh…"),
  // hum length (s) and volume.
  const VOICE = {
    cheerful: { pitch: 560, bend: 1.25, len: 0.26, volume: 0.13 },
    content: { pitch: 500, bend: 1.12, len: 0.3, volume: 0.12 },
    meh: { pitch: 440, bend: 0.97, len: 0.32, volume: 0.1 },
    sad: { pitch: 390, bend: 0.82, len: 0.4, volume: 0.1 },
    grumpy: { pitch: 400, bend: 0.92, len: 0.26, volume: 0.09 },
  };

  // One airy reverb per audio context: a short burst of fading noise as the room.
  const rooms = new WeakMap();
  function room(ctx) {
    if (rooms.has(ctx)) return rooms.get(ctx);
    const seconds = 1.6;
    const buf = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    conv.connect(wet).connect(ctx.destination);
    rooms.set(ctx, conv);
    return conv;
  }

  /** One soft hum from `f` to `to` Hz, partly through the reverb. */
  function hum(ctx, t, f, to, len, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, to), t + len);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + len * 0.3); // a slow, breathy start
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(room(ctx));
    osc.start(t);
    osc.stop(t + len + 0.05);
  }

  /** Chirp for a line of `syllables` (about one per word, 2..6): two or three soft hums, the last one bending. */
  function chirp({ band = 'content', syllables = 3 } = {}, { ctx, start }) {
    const v = VOICE[band] || VOICE.content;
    const n = Math.max(1, Math.min(3, Math.round(syllables / 2)));
    let t = start;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      const f = v.pitch * (i % 2 ? 1.06 : 1) * (0.98 + Math.random() * 0.04);
      const len = last ? v.len * 1.6 : v.len;
      hum(ctx, t, f, last ? f * v.bend : f * 1.02, len, v.volume);
      t += len + 0.07;
    }
    return t + 0.3; // let the reverb fade
  }

  window.Characters = window.Characters || {};
  window.Characters.nomi = Object.assign(window.Characters.nomi || {}, { chirp, VOICE });
})();
