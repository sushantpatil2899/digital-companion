'use strict';

// Togepi's voice: little "toge-priii" chirps made with Web Audio when he
// talks (never words read aloud). Pitch, speed and shape follow his mood.
// If you've put your own clips in his sounds folder, the main process sends
// one and it's played instead (see src/main/mind/sounds.js).

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

  let ac = null;
  let busyUntil = 0;

  function audio() {
    if (!ac) {
      try {
        ac = new AudioContext();
      } catch {
        return null;
      }
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }

  function note(ctx, t, freq, toFreq, len, wave, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, toFreq), t + len);
    // A little vibrato makes it sound alive.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 28;
    lfoGain.gain.value = freq * 0.025;
    lfo.connect(lfoGain).connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + Math.min(0.015, len / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + len + 0.02);
    lfo.stop(t + len + 0.02);
  }

  /**
   * Chirp for a line of `syllables` (about one per word, 2..6), in his mood:
   * a few quick "to-ge" notes and a longer "priii" at the end.
   */
  function play({ band = 'content', syllables = 3 } = {}) {
    const ctx = audio();
    if (!ctx) return;
    const v = VOICE[band] || VOICE.content;
    const n = Math.max(2, Math.min(6, syllables));
    let t = Math.max(ctx.currentTime + 0.02, busyUntil);
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
    busyUntil = t + last + 0.05;
  }

  /** Play one of your own clips (an ArrayBuffer of the file). */
  async function playClip(data) {
    const ctx = audio();
    if (!ctx || !data) return;
    try {
      const buf = await ctx.decodeAudioData(data.slice(0));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(Math.max(ctx.currentTime, busyUntil));
      busyUntil = Math.max(ctx.currentTime, busyUntil) + buf.duration;
    } catch {
      // not a sound file we can decode
    }
  }

  window.Chirp = { play, playClip, VOICE };
})();
