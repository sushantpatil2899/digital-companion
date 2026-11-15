// Ready-made scenes for the character creator: little scripts of frames
// like the ones the main process sends (src/main/companion.js snapshot()),
// played by the fake companion in dev/stage.js. Loaded by both the stage and
// the creator page; registers window.Scenes.
//
// A scene is { id, name, group, steps }. Each step:
//   state   the frame's state (one of computePose's cases in
//           src/renderer/renderer.js, or a character's own activity/state)
//   dur     seconds (also sent as stateDuration unless `stateDuration` is set)
//   set     other frame fields for this step ({ band, board, speech, ... })
//   events  events fired when the step starts ('thud', 'heart', ...)
//   at      [[seconds, event], ...] fired during the step
//   tick    (f, st, dur) => {...} changes the frame every tick (st = time in step)
(function () {
'use strict';

const BANDS = ['cheerful', 'content', 'meh', 'sad', 'grumpy'];
const WATCH_MOODS = ['exciting', 'funny', 'beautiful', 'sad', 'scary', 'boring'];

/** The character's text for sign `key` in mood `band`, if it has one. */
function sign(ci, key, band = 'content', fallback = '') {
  const s = ci && ci.lines && ci.lines.signs && ci.lines.signs[key];
  if (!s) return fallback;
  if (typeof s === 'string') return s;
  return s[band] || s.content || fallback;
}

function mid(range, fallback) {
  return Array.isArray(range) ? (range[0] + range[1]) / 2 : range || fallback;
}

function shared(ci) {
  const b = (style, key, line2, tag, fallback) => ({ style, line1: sign(ci, key, 'content', fallback), line2, tag });
  return [
    {
      id: 'idle-moods', name: 'Idle in every mood', group: 'Moods',
      steps: [
        ...BANDS.map((band) => ({ state: 'idle', dur: 3, set: { band } })),
        { state: 'idle', dur: 3, set: { band: 'content', energy: 0.1 }, label: 'tired' },
        { state: 'idle', dur: 3, set: { grumpy: true }, label: 'grumpy (told to stay put)' },
      ],
    },
    {
      id: 'walk-moods', name: 'Walking in every mood', group: 'Moods',
      steps: BANDS.map((band, i) => ({ state: 'walk', dur: 3, set: { band, facing: i % 2 ? -1 : 1, vx: (i % 2 ? -1 : 1) * 60 } })),
    },
    {
      id: 'sit-moods', name: 'Sitting in every mood', group: 'Moods',
      steps: [...BANDS.map((band) => ({ state: 'sit', dur: 2.5, set: { band } })), { state: 'sit', dur: 3, set: { band: 'content', byWindow: true }, label: 'by your window' }],
    },
    {
      id: 'emotes', name: 'Emotes', group: 'Moods',
      steps: ['happy', 'sad', 'angry', 'shy', 'curious', 'confused', 'surprised', 'wave', 'lookAround', 'lookUp', 'hug'].map((state) => ({ state, dur: 2.5 })),
    },
    {
      id: 'throw', name: 'Pick up, swing, throw, land', group: 'Physics',
      steps: [
        { state: 'idle', dur: 0.8 },
        { state: 'grabbed', dur: 2.6, events: ['grab'], set: { grabOffset: { x: 0, y: -110 } }, tick: (f, st) => (f.swing = Math.sin(st * 5) * 0.5 * Math.min(1, st)) },
        { state: 'fall', dur: 1, events: ['throw'], tick: (f, st) => { f.vx = 900 * (1 - st); f.vy = -1200 + st * 2400; } },
        { state: 'land', dur: 0.6, events: ['thud'] },
        { state: 'confused', dur: 2 },
        { state: 'idle', dur: 1.5 },
      ],
    },
    {
      id: 'drop', name: 'Small drop and bounce', group: 'Physics',
      steps: [
        { state: 'fall', dur: 0.5, set: { vx: 0 }, tick: (f, st) => (f.vy = st * 3000) },
        { state: 'land', dur: 0.4, events: ['bounce'] },
        { state: 'fall', dur: 0.3, tick: (f, st) => (f.vy = -600 + st * 4000) },
        { state: 'land', dur: 0.5, events: ['land'] },
        { state: 'idle', dur: 1.5 },
      ],
    },
    {
      id: 'jump', name: 'Jump', group: 'Physics',
      steps: [{ state: 'jump', dur: 0.6 }, { state: 'land', dur: 0.4, events: ['land'] }, { state: 'idle', dur: 1.2 }],
    },
    {
      id: 'pet', name: 'Petting', group: 'With you',
      steps: [{ state: 'hug', dur: 4, set: { petting: true }, at: [[0.3, 'heart'], [1.1, 'heart'], [1.9, 'heart'], [2.7, 'heart'], [3.5, 'heart']] }, { state: 'happy', dur: 2 }],
    },
    {
      id: 'talk', name: 'Talking and asking', group: 'With you',
      steps: [
        { state: 'talk', dur: 3, events: ['speak'], set: { speech: 'I found a really nice spot by the window!' } },
        { state: 'talk', dur: 3.5, set: { speech: 'Do you want to play something?', answers: ['Sure!', 'Later'] } },
        { state: 'nod', dur: 1.2 },
      ],
    },
    {
      // The item is the one picked in the State tab (a sample until you pick a PNG).
      id: 'item', name: 'Holding and playing with an item', group: 'With you',
      steps: [{ state: 'holdItem', dur: 3 }, { state: 'playItem', dur: 4 }, { state: 'holdItem', dur: 2 }, { state: 'idle', dur: 1 }],
    },
    {
      id: 'item-moods', name: 'Playing with an item in every mood', group: 'With you',
      steps: BANDS.map((band) => ({ state: 'playItem', dur: 2.5, set: { band } })),
    },
    {
      id: 'greetings', name: 'Greetings', group: 'With you',
      steps: [
        { state: 'wave', dur: 2.2, events: ['hello'] },
        { state: 'happy', dur: 2.2, events: ['welcomeBack'] },
        { state: 'idle', dur: 2, events: ['goodMorning'] },
        { state: 'sit', dur: 2.5, events: ['lonely'], set: { band: 'sad' } },
      ],
    },
    {
      id: 'sleep', name: 'Sleep and wake up', group: 'With you',
      steps: [{ state: 'bedtime', dur: 5, set: { board: b('bubble', 'bedtime', '', 'OK ✓', 'Bedtime?') } }, { state: 'sleep', dur: 6 }, { state: 'surprised', dur: 1, events: ['wake'] }, { state: 'idle', dur: 2, events: ['goodMorning'] }],
    },
    {
      id: 'meeting', name: 'Meeting reminder', group: 'Nudges',
      steps: [
        { state: 'sign', dur: 3, set: { board: { style: 'sign', line1: sign(ci, 'meeting5', 'content', 'Meeting in 5!'), line2: 'Design review', tag: 'OK ✓', join: true } } },
        { state: 'sign', dur: 3, set: { board: { style: 'sign', line1: sign(ci, 'meetingNow', 'content', 'Meeting now!'), line2: 'Design review', tag: 'OK ✓', join: true, urgent: true } } },
        { state: 'nod', dur: 1.5, events: ['reminderAck'] },
        { state: 'idle', dur: 1.5 },
      ],
    },
    {
      id: 'water', name: 'Water break', group: 'Nudges',
      steps: [
        { state: 'water', dur: 3, set: { board: b('bubble', 'water', 'first one today', 'Drank ✓', 'Water break?') } },
        { state: 'drink', dur: 3, events: ['waterDone'] },
        { state: 'nod', dur: 1.2 },
      ],
    },
    {
      id: 'stretch', name: 'Stretch, eye rest', group: 'Nudges',
      steps: [
        { state: 'stretch', dur: 4, set: { board: b('bubble', 'stretch', '', 'Done ✓', 'Stretch a little?') } },
        { state: 'nod', dur: 1.2, events: ['stretchDone'] },
        { state: 'eyeRest', dur: 4, set: { board: b('bubble', 'eyes', '20 feet away, 20 seconds', 'Done ✓', 'Rest your eyes?') } },
        { state: 'nod', dur: 1.2, events: ['eyesDone'] },
      ],
    },
    {
      id: 'note', name: 'Your note', group: 'Nudges',
      steps: [{ state: 'note', dur: 4, set: { board: { style: 'note', line1: 'Call the dentist about Thursday', line2: sign(ci, 'note', 'content', 'You asked me to remind you'), tag: 'OK ✓' } } }, { state: 'nod', dur: 1.2, events: ['noteDone'] }],
    },
    {
      id: 'nudge-moods', name: 'A nudge in every mood', group: 'Nudges',
      steps: BANDS.map((band) => ({ state: 'water', dur: 2.5, set: { band, board: { style: 'bubble', line1: sign(ci, 'water', band, 'Water break?'), line2: '', tag: 'Drank ✓' } } })),
    },
    {
      id: 'fetch', name: 'Fetch', group: 'Games',
      steps: [
        { state: 'offerBall', dur: 3, set: { holdingBall: true, board: b('bubble', 'fetch', 'Grab the ball and throw it!', null, 'Play fetch?') } },
        { state: 'watchBall', dur: 2.2, events: ['ballThrow'], tick: (f, st) => (f.ball = { x: 40 + st * 110, y: -90 - Math.abs(Math.sin(st * 3)) * 120 * Math.max(0, 1 - st / 2.2) + Math.min(st, 1) * 60 }) },
        { state: 'run', dur: 1.6, set: { vx: 220 } },
        { state: 'pickBall', dur: 0.6 },
        { state: 'walk', dur: 2, events: ['gotBall'], set: { holdingBall: true, facing: -1, vx: -60 } },
        { state: 'offerBall', dur: 2.5, set: { holdingBall: true, board: b('bubble', 'fetchAgain', 'Grab the ball and throw it!', null, 'Again?') } },
        { state: 'happy', dur: 2, events: ['thatWasFun'] },
      ],
    },
    {
      id: 'ttt', name: 'Tic-tac-toe', group: 'Games',
      steps: [
        { state: 'offerGame', dur: 3, set: { board: b('bubble', 'ttt', 'Click me to play', 'Play ✓', 'Tic-tac-toe?') } },
        { state: 'ttt', dur: 2, events: ['tttYouStart'] },
        { state: 'ttt', dur: 1.5, set: { thinking: true } },
        { state: 'ttt', dur: 2 },
        { state: 'ttt', dur: 1.5, set: { thinking: true } },
        { state: 'happy', dur: 3, events: ['tttIWin'], set: { wonGame: true } },
      ],
    },
    {
      id: 'watch', name: 'Watching together', group: 'Watching',
      steps: [
        { state: 'backView', dur: 3, set: { watching: true } },
        ...WATCH_MOODS.map((watchMood) => ({
          state: 'watchReact', dur: 3.5, label: watchMood, set: { watching: true, watchMood },
          events: watchMood === 'funny' ? ['watchHeart'] : watchMood === 'beautiful' ? ['sparkles'] : [],
        })),
        { state: 'backView', dur: 2, set: { watching: true } },
      ],
    },
  ];
}

/** A tour of the character's own activities (every variant) and states. */
function ownScenes(ci) {
  if (!ci) return [];
  const scenes = [];
  for (const a of ci.activities) {
    const variants = a.variants.length ? a.variants : [{ id: null }];
    const steps = [];
    for (const v of variants) {
      const moving = a.move ? { vx: a.move.speed || 80, ahead: 200 } : {};
      steps.push({ state: a.id, dur: Math.min(10, mid(a.duration, a.move ? 4 : 8)), label: v.id || a.label, set: { variant: v.id, ...moving } });
      const then = v.then && v.then.state;
      if (then) steps.push({ state: then, dur: Math.min(6, v.then.duration || 4), label: `then ${then}`, set: { variant: v.id } });
      steps.push({ state: 'idle', dur: 1 });
    }
    scenes.push({ id: `own-${a.id}`, name: a.label || a.id, group: `${ci.name}'s activities`, steps });
  }
  for (const s of ci.states) {
    scenes.push({ id: `state-${s.id}`, name: s.label || s.id, group: `${ci.name}'s own states`, steps: [{ state: s.id, dur: 5 }, { state: 'idle', dur: 1 }] });
  }
  // Everything in a row.
  const all = scenes.flatMap((s) => s.steps);
  if (all.length) scenes.unshift({ id: 'own-all', name: 'Everything, in a row', group: `${ci.name}'s activities`, steps: all });
  return scenes;
}

window.Scenes = {
  BANDS,
  WATCH_MOODS,
  /** Every scene for character info `ci` (from /creator/characters.json). */
  list: (ci) => [...ownScenes(ci), ...shared(ci)],
};
})();
