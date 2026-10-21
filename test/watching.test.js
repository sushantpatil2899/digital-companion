'use strict';

// Watching together: he notices you watching something, sits in the corner
// of that screen with his back to you, quietly, until you stop.

const test = require('node:test');
const assert = require('node:assert');
const { Watching, WATCH, watchingIn, showTitle } = require('../src/main/mind/watching');
const { ContextTracker } = require('../src/main/context');
const { NudgeTracker } = require('../src/main/nudges');
const { Mind } = require('../src/main/mind/mind');
const T = require('../src/main/mind/thinker');
const { Companion } = require('../src/main/companion');

const chrome = (url, title = 'Netflix', screen = null) => ({ app: 'Google Chrome', title, url, screen });

test('only playback pages and video players count as watching, not browsing', () => {
  assert.deepEqual(watchingIn(chrome('https://www.netflix.com/watch/81234?trackId=1')), { name: 'Netflix', youtube: false });
  assert.equal(watchingIn(chrome('https://www.netflix.com/browse')), null);
  assert.deepEqual(watchingIn(chrome('https://www.youtube.com/watch?v=abc')), { name: 'YouTube', youtube: true });
  assert.equal(watchingIn(chrome('https://www.youtube.com/')), null);
  assert.equal(watchingIn(chrome('https://www.youtube.com/results?search_query=cats')), null);
  assert.equal(watchingIn(chrome('https://www.primevideo.com/region/eu/detail/0ABC/')).name, 'Prime Video');
  assert.equal(watchingIn(chrome('https://www.amazon.com/Some-Book/dp/B0123')), null); // shopping, not Prime Video
  assert.equal(watchingIn(chrome('https://www.disneyplus.com/en-gb/video/123')).name, 'Disney+');
  assert.equal(watchingIn(chrome('https://www.hulu.com/watch/abc')).name, 'Hulu');
  assert.equal(watchingIn(chrome('https://play.max.com/video/watch/abc')).name, 'Max');
  assert.equal(watchingIn(chrome('https://tv.apple.com/us/episode/x/umc.1')).name, 'Apple TV');
  assert.equal(watchingIn(chrome('https://www.crunchyroll.com/watch/G4/x')).name, 'Crunchyroll');
  for (const app of ['VLC', 'IINA', 'QuickTime Player', 'TV']) assert.ok(watchingIn({ app }), app);
  assert.equal(watchingIn({ app: 'Code', title: 'watch.js' }), null);
  // A private window is never looked at.
  assert.equal(watchingIn({ ...chrome('https://www.netflix.com/watch/1'), private: true }), null);
});

test("the show's name comes from the title when it says more than the site", () => {
  assert.equal(showTitle('(3) Lofi hip hop radio - beats to relax - YouTube', 'YouTube'), 'Lofi hip hop radio - beats to relax');
  assert.equal(showTitle('Netflix', 'Netflix'), null);
  assert.equal(showTitle('Prime Video', 'Prime Video'), null);
  assert.equal(showTitle('Movie.mkv', 'VLC'), 'Movie.mkv');
});

test('it starts after 30 s (YouTube after 2 min) and ends a minute after you leave', () => {
  let t = 0;
  const w = new Watching(() => t);
  const netflix = chrome('https://www.netflix.com/watch/1', 'Netflix', 2);
  assert.equal(w.update(netflix), null);
  t += (WATCH.start - 1) * 1000;
  assert.equal(w.update(netflix), null);
  t += 1000;
  assert.equal(w.update(netflix), 'start');
  assert.deepEqual({ ...w.current, since: 0 }, { name: 'Netflix', title: null, screen: 2, since: 0 });
  // A quick look at something else doesn't end it.
  t += 20 * 1000;
  assert.equal(w.update({ app: 'Messages' }), null);
  t += 20 * 1000;
  assert.equal(w.update(netflix), null);
  t += 1000;
  assert.equal(w.update(null), null);
  t += (WATCH.stopAfter - 2) * 1000;
  assert.equal(w.update(null), null);
  t += 1000;
  assert.equal(w.update(null), 'stop');
  assert.equal(w.current, null);

  // YouTube needs longer, so a short clip doesn't count.
  const yt = chrome('https://www.youtube.com/watch?v=x', 'Cat does a flip - YouTube');
  assert.equal(w.update(yt), null);
  t += 60 * 1000;
  assert.equal(w.update(yt), null);
  t += (WATCH.startYouTube - 60) * 1000;
  assert.equal(w.update(yt), 'start');
  assert.equal(w.current.title, 'Cat does a flip');
});

test("while you watch, not touching the mouse doesn't make you away (for up to 3 hours)", () => {
  let t = 1_000_000;
  const c = new ContextTracker({ now: () => t });
  assert.equal(c.update(600).userAway, true);
  c.update(0);
  c.setWatching('Netflix', WATCH.maxIdle);
  const ctx = c.update(2 * 3600);
  assert.equal(ctx.userAway, false);
  assert.equal(ctx.watching, 'Netflix');
  assert.equal(c.update(WATCH.maxIdle + 1).userAway, true);
  c.setLocked(true);
  assert.equal(c.update(0).userAway, true);
});

test('water, stretch and eye breaks wait while you watch; notes and bedtime do not', () => {
  const n = new NudgeTracker({ water: true, waterEvery: 60, stretch: true, stretchEvery: 60, eyes: true, eyesEvery: 20, bedtime: null });
  n.settings.bedtime = null; // (bedtime reminders still come; not tested here)
  n.active.water = 3600;
  n.active.stretch = 3600;
  n.active.eyes = 3600;
  n.sinceLast = 9999;
  const ctx = { now: Date.now(), userAway: false, quiet: false, presenting: false, watching: 'Netflix' };
  assert.equal(n.due(ctx), null);
  assert.equal(n.due({ ...ctx, watching: null }).kind, 'water');
  n.notes.push({ id: 1, at: ctx.now - 1, text: 'Call mom' });
  assert.equal(n.due(ctx).kind, 'note');
});

// ------------------------------------------------------------------ mind

function makeMind(answers, watching) {
  const calls = [];
  const spoken = [];
  let self = { band: 'cheerful', needs: {}, state: 'idle', hour: 20, quiet: false, away: false, asleep: false, busy: false, watching };
  const scale = (a) => ({ ...a, urge: a.urge * 10 });
  const mind = new Mind({
    engine: { ready: true, canDecide: false, async think(req) { calls.push(req); return JSON.stringify(scale(answers)); }, status: () => 'running' },
    now: () => 5_000_000,
    rng: () => 0.5,
    getSelf: () => self,
    onSpeak: (s) => spoken.push(s),
    onAsk: () => true,
  });
  mind.nextJournalCheck = Infinity;
  return { mind, calls, spoken, set: (s) => (self = { ...self, ...s }) };
}

const flush = () => new Promise((r) => setImmediate(r));

test('when you start watching he always says something about it, in his own words, never a question', async () => {
  const { mind, calls, spoken } = makeMind({ thought: 'Movie time!', urge: 0.1, lines: ['Ooh, Stranger Things tonight!'], action: 'happy', question: { text: 'Scary or funny?', answers: ['👻 Scary', '😂 Funny'], aboutSushant: false } }, 'Netflix');
  mind.startedWatching({ name: 'Netflix', title: 'Stranger Things' });
  await flush();
  assert.deepEqual(spoken.map((s) => s.text), ['Ooh, Stranger Things tonight!']); // even with a low urge
  assert.match(calls[0].user, /Just now: Sushant started watching "Stranger Things" on Netflix\./);
  assert.equal(calls[0].schema, T.SCHEMA); // no question offered
  assert.match(mind.log.last(['interact']).text, /You sat down to watch "Stranger Things" on Netflix with Sushant\./);
});

test('while you watch he stays quiet and does not think on his own', async () => {
  const { mind, spoken } = makeMind({ thought: 'Pets!', urge: 1, lines: ['Hehe!'], action: 'happy' }, 'Netflix');
  assert.equal(mind.blockedBy({ interactive: true }), 'watching with you');
  mind.interact('Sushant petted you.');
  await flush();
  assert.deepEqual(spoken, []);
  mind.nextHeartbeat = 0;
  mind.tick();
  assert.equal(mind.thinking, false);
});

test('when you stop he decides himself whether to say anything', async () => {
  const quiet = makeMind({ thought: 'Over.', urge: 0.1, lines: ['Bye movie.'], action: 'none' }, null);
  quiet.mind.stoppedWatching({ name: 'Netflix', title: null });
  await flush();
  assert.deepEqual(quiet.spoken, []);
  const chatty = makeMind({ thought: 'That was fun', urge: 0.9, lines: ['That was fun!'], action: 'happy' }, null);
  chatty.mind.stoppedWatching({ name: 'Netflix', title: null });
  await flush();
  assert.deepEqual(chatty.spoken.map((s) => s.text), ['That was fun!']);
});

// ------------------------------------------------------------------ companion

const twoScreens = [
  { bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 25, width: 1920, height: 1055 } },
  { bounds: { x: 1920, y: 0, width: 1920, height: 1080 }, workArea: { x: 1920, y: 0, width: 1920, height: 1080 } },
];

function settled() {
  const c = new Companion({ bounds: { left: 0, right: 1920, top: 25, floor: 1080 }, rng: () => 0.5 });
  c.setScreens(twoScreens);
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.enter('idle', 5);
  return c;
}

function run(c, seconds) {
  for (let i = 0; i < seconds * 30; i++) c.update(1 / 30);
}

test('he goes to the screen you watch on, sits in its bottom-right corner with his back to you, and stays', () => {
  const c = settled();
  assert.equal(c.screenIndex, 0);
  c.startWatching(1);
  run(c, 40);
  assert.equal(c.screenIndex, 1);
  assert.equal(c.state, 'backView');
  assert.ok(c.x > 3840 - 120, `x ${c.x}`);
  assert.equal(c.snapshot().watching, true);
  // He stays put (no wandering off or games) for as long as it lasts.
  run(c, 150);
  assert.equal(c.state, 'backView');
  assert.equal(c.screenIndex, 1);
  // Moved somewhere else? He goes back to his spot.
  c.x = 2400;
  c.enter('idle', 1);
  run(c, 30);
  assert.equal(c.state, 'backView');
  assert.ok(c.x > 3840 - 120);
});

test('when you stop watching he gets up and goes back to his own things', () => {
  const c = settled();
  c.startWatching(null);
  run(c, 40);
  assert.equal(c.state, 'backView');
  assert.equal(c.screenIndex, 0);
  c.stopWatching();
  assert.equal(c.state, 'idle');
  assert.equal(c.snapshot().watching, false);
});

test('he follows what you watch to another screen', () => {
  const c = settled();
  c.startWatching(0);
  run(c, 30);
  c.watchOn(1);
  run(c, 40);
  assert.equal(c.screenIndex, 1);
  assert.equal(c.state, 'backView');
});
