'use strict';

// Phase 11: the listen window's sound helpers, also used by the tests.
// - toWav: mono float samples → 16-bit PCM WAV (what Apple's recognizer and
//   ElevenLabs Scribe both read), resampled to 16 kHz.
// - Talk: tells when you've started and stopped talking from the loudness,
//   so listening ends by itself.

(function (root) {
  const RATE = 16000;

  function resample(samples, from, to = RATE) {
    if (from === to) return samples;
    const n = Math.floor((samples.length * to) / from);
    const out = new Float32Array(n);
    const step = from / to;
    for (let i = 0; i < n; i++) {
      // Average the samples this one stands for (a little low-pass).
      const a = Math.floor(i * step);
      const b = Math.min(samples.length, Math.max(a + 1, Math.floor((i + 1) * step)));
      let sum = 0;
      for (let j = a; j < b; j++) sum += samples[j];
      out[i] = sum / (b - a);
    }
    return out;
  }

  function toWav(samples, rate) {
    const pcm = resample(samples, rate);
    const buf = new ArrayBuffer(44 + pcm.length * 2);
    const v = new DataView(buf);
    const str = (o, s) => {
      for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
    };
    str(0, 'RIFF');
    v.setUint32(4, 36 + pcm.length * 2, true);
    str(8, 'WAVE');
    str(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); // PCM
    v.setUint16(22, 1, true); // mono
    v.setUint32(24, RATE, true);
    v.setUint32(28, RATE * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Uint8Array(buf);
  }

  const TALK = {
    calibrate: 0.3, // s of room noise measured first
    minLevel: 0.012, // RMS that counts as talking at least
    overNoise: 3, // …and this many times the room noise
    endSilence: 1.2, // s of quiet after talking: done
    waitForSpeech: 6, // s without a word: nothing to hear
    maxLength: 12, // s at most
  };

  /** Feed it the loudness of each chunk; it says 'wait', 'talking', 'done' or 'nothing'. */
  class Talk {
    constructor(opts = {}) {
      this.o = { ...TALK, ...opts };
      this.t = 0;
      this.noise = [];
      this.started = null;
      this.lastLoud = null;
    }

    level(chunk) {
      let sum = 0;
      for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
      return Math.sqrt(sum / Math.max(1, chunk.length));
    }

    /** One chunk of `seconds` with loudness `rms`. */
    step(rms, seconds) {
      this.t += seconds;
      if (this.t <= this.o.calibrate) {
        this.noise.push(rms);
        return 'wait';
      }
      const noise = this.noise.length ? this.noise.reduce((a, b) => a + b, 0) / this.noise.length : 0;
      const loud = rms >= Math.max(this.o.minLevel, noise * this.o.overNoise);
      if (loud) {
        if (this.started == null) this.started = this.t;
        this.lastLoud = this.t;
      }
      if (this.t >= this.o.maxLength) return this.started != null ? 'done' : 'nothing';
      if (this.started == null) return this.t >= this.o.waitForSpeech ? 'nothing' : 'wait';
      return this.t - this.lastLoud >= this.o.endSilence ? 'done' : 'talking';
    }
  }

  const api = { toWav, resample, Talk, TALK, RATE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Wav = api;
})(typeof window !== 'undefined' ? window : globalThis);
