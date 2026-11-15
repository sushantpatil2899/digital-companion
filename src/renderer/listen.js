'use strict';

// The hidden listen window (Phase 11). When the app says "listen", it opens
// the microphone, records until you stop talking (or `stop`), sends the
// recording back as a WAV and closes the microphone again. It's never open
// otherwise.

let session = null;

async function start() {
  if (session) return;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (e) {
    window.listen.result({ error: e && e.name === 'NotAllowedError' ? 'microphone not allowed' : `microphone: ${e && e.message}` });
    return;
  }
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor: simple, and fine for a few seconds of speech.
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  const talk = new window.Wav.Talk();
  session = { stream, ctx, source, proc, chunks, finished: false };
  proc.onaudioprocess = (ev) => {
    if (!session || session.finished) return;
    const data = new Float32Array(ev.inputBuffer.getChannelData(0));
    chunks.push(data);
    const state = talk.step(talk.level(data), data.length / ctx.sampleRate);
    if (state === 'talking') window.listen.state('talking');
    if (state === 'done') finish(true);
    else if (state === 'nothing') finish(false);
  };
  source.connect(proc);
  proc.connect(ctx.destination);
  window.listen.state('listening');
}

/** Stop: send what was said (`keep`), or nothing. */
function finish(keep) {
  const s = session;
  if (!s || s.finished) return;
  s.finished = true;
  session = null;
  try {
    s.proc.disconnect();
    s.source.disconnect();
    for (const t of s.stream.getTracks()) t.stop();
  } catch {
    // already closed
  }
  const rate = s.ctx.sampleRate;
  s.ctx.close().catch(() => {});
  if (!keep) {
    window.listen.result({ nothing: true });
    return;
  }
  const n = s.chunks.reduce((a, c) => a + c.length, 0);
  const all = new Float32Array(n);
  let o = 0;
  for (const c of s.chunks) {
    all.set(c, o);
    o += c.length;
  }
  window.listen.result({ wav: window.Wav.toWav(all, rate), seconds: n / rate });
}

window.listen.onStart(() => start());
// "Stop" from the app (the shortcut again, or a meeting started): keep what was said so far.
window.listen.onStop((keep) => finish(keep !== false));
