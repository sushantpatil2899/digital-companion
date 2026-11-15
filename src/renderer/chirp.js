'use strict';

// His chirps when he talks, made with Web Audio: the active character's own
// voice (src/characters/<id>/voice.js) does the notes. If you've put your
// own clips in his sounds folder, the main process sends one and it's played
// instead (see src/main/mind/sounds.js).

(function () {
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

  /** Chirp for a line of `syllables` in his mood, with character `ch`'s voice. */
  function play(ch, { band = 'content', syllables = 3 } = {}) {
    const ctx = audio();
    if (!ctx || !ch || !ch.chirp) return;
    const end = ch.chirp({ band, syllables }, { ctx, start: Math.max(ctx.currentTime + 0.02, busyUntil), note });
    busyUntil = end + 0.05;
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

  window.Chirp = { play, playClip };
})();
