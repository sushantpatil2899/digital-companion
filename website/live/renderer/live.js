'use strict';

// Stands in for the app's main process on the website: it gives the real
// renderer (renderer.js) the frames the app would, from the resting snapshot
// in frames.js. The companion rests, does its own activities, waves, follows
// the cursor with its eyes, and when you click it, it's happy, chirps in its
// own voice and says one of its real lines.
(function () {
  const id = new URLSearchParams(location.search).get('character') || 'togepi';
  const F = window.FRAMES[id] || window.FRAMES.togepi;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lines the companions really said in the app (their week in Tiger Data),
  // then their own fixed lines (lines.js) for the rest.
  const SAID = {
    togepi: ['I love your face and your fingers!', 'Yay! You fixed it!', 'Is the computer broken?'],
    pip: ['Remarkably well, actually.', 'I feel quite cherished right now.', 'Don’t let its logic do your thinking.'],
    nomi: ['Like a little spark of light.', 'I missed your presence here.'],
  };
  function lines() {
    const own = (window.CharacterLines && window.CharacterLines[id] && window.CharacterLines[id].says) || {};
    const fixed = ['thatWasFun', 'waterDone', 'stretchDone'].map((k) => own[k] && own[k].cheerful).filter(Boolean);
    return [...(SAID[id] || []), ...fixed];
  }

  let onFrame = null;
  let onVoice = null;
  let t = 0;
  let state = 'idle';
  let stateTime = 0;
  let duration = 3;
  let speech = null;
  let speechUntil = 0;
  let events = ['hello'];
  let cursor = { x: -60, y: -140 };
  let step = 0;
  let ownStep = 0;
  let said = 0;

  // What it does next: rest, one of its own activities, rest, wave, …
  function next() {
    if (still) return enter('idle', 3600);
    const plan = [['idle', 3.5], ['own'], ['idle', 2.5], ['wave', 2.2]];
    const [s, d] = plan[step % plan.length];
    step++;
    if (s === 'own' && F.own.length) {
      const a = F.own[ownStep++ % F.own.length];
      return enter(a, F.durations[a] || 6);
    }
    enter(s === 'own' ? 'idle' : s, d || 3);
  }
  function enter(s, d) {
    state = s;
    stateTime = 0;
    duration = d;
  }

  function pat() {
    enter('happy', 1.6);
    events.push('heart');
    const all = lines();
    speech = all[said++ % all.length];
    speechUntil = t + 3.4;
    if (onVoice) onVoice({ band: 'cheerful', syllables: Math.min(6, speech.split(/\s+/).length) });
  }

  // The page tells it where your cursor is (relative to its feet), so its eyes follow.
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'cursor') cursor = { x: e.data.x, y: e.data.y };
    if (e.data.type === 'pat') pat();
  });
  document.addEventListener('pointermove', (e) => {
    cursor = { x: e.clientX - innerWidth / 2, y: e.clientY - (innerHeight - 18) };
  });

  window.companion = {
    onFrame: (f) => (onFrame = f),
    onVoice: (f) => (onVoice = f),
    press: pat,
    release() {},
    contextMenu() {},
    setTrayIcon() {},
    setBattery() {},
    bubble() {},
  };

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    t += dt;
    stateTime += dt;
    if (stateTime >= duration) next();
    if (speech && t > speechUntil) speech = null;
    if (onFrame) {
      onFrame({
        ...F.rest,
        state,
        stateTime,
        stateDuration: duration,
        time: t,
        facing: 1,
        vx: 0,
        mood: 0.6,
        band: 'cheerful',
        speech,
        answers: null,
        board: null,
        cursor,
        events,
      });
      events = [];
    }
    requestAnimationFrame(tick);
  }
  next();
  requestAnimationFrame(tick);
})();
