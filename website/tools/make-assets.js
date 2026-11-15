'use strict';
// Renders the website's pictures with the app's own code: each companion as
// drawn by src/renderer (transparent PNGs), and real app windows (song, chat,
// brain, picker) fed the same data the app would send. Run from dcapp/:
//   node website/tools/make-assets.js
const path = require('path');
const { chromium } = require('playwright');
const { Companion } = require('../../src/main/companion');
const characters = require('../../src/characters');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '..', 'assets');
const R = `file://${path.join(ROOT, 'src', 'renderer')}`;
const BOUNDS = { left: 0, right: 1920, top: 0, floor: 1040 };

const STUBS = () => {
  const cb = (window.__cb = {});
  const on = (k) => (f) => (cb[k] = f);
  window.companion = { onFrame: on('frame'), press() {}, release() {}, contextMenu() {}, setTrayIcon() {}, setBattery() {}, onVoice() {}, bubble() {} };
  window.chat = { onLoad: on('chat'), send() {}, listen() {} };
  window.song = { onLoad: on('song'), onAudio: on('audio'), select() {}, playing() {}, make() {}, setKey() {}, setWeekly() {} };
  window.brain = { onUpdate: on('brain') };
  window.picker = { onLoad: on('picker'), pick() {} };
  try {
    Object.defineProperty(navigator, 'getBattery', { value: undefined });
  } catch {}
};

function settled(id) {
  const c = new Companion({ bounds: BOUNDS, rng: () => 0.5, character: characters.get(id) });
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  c.enter('idle', 10);
  return c;
}

/** A frame for the renderer: the companion's snapshot with a few things set. */
function frame(id, set = {}) {
  const c = settled(id);
  if (set.activity) {
    c.startActivity(set.activity);
    c.stateTime = c.stateDuration * (set.at ?? 0.35);
  }
  if (set.state) c.enter(set.state, 10);
  if (set.stateTime != null) c.stateTime = set.stateTime;
  if (set.say) c.say(set.say);
  if (set.facing) c.facing = set.facing;
  const s = { ...c.snapshot(), events: [], cursor: { x: -40, y: -120 } };
  return { ...s, ...(set.over || {}) };
}

async function shootChar(browser, id, name, f, { w = 300, h = 300 } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 3 });
  await page.addInitScript(STUBS);
  await page.goto(`${R}/index.html?character=${id}`);
  await page.addStyleTag({ content: 'html,body{background:transparent!important}' });
  await page.evaluate((fr) => window.__cb.frame(fr), JSON.parse(JSON.stringify(f)));
  await page.waitForTimeout(400);
  await page.evaluate((fr) => window.__cb.frame(fr), JSON.parse(JSON.stringify({ ...f, time: f.time + 0.4 })));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, 'chars', `${name}.png`), omitBackground: true });
  await page.close();
}

async function shootWindow(browser, file, key, data, name, { w, h, query = '' }) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.addInitScript(STUBS);
  await page.goto(`${R}/${file}?${query}`);
  await page.waitForFunction((k) => window.__cb && window.__cb[k], key);
  await page.evaluate(({ k, d }) => window.__cb[k](d), { k: key, d: data });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'ui', `${name}.png`) });
  return page;
}

(async () => {
  const browser = await chromium.launch();
  // Each companion: standing, waving, and one of its own activities.
  const OWN = { togepi: 'flower', pip: 'conduct', mori: 'tea', nomi: 'bubbles', tonk: 'fix', wolfie: 'cheer' };
  for (const c of characters.list()) {
    await shootChar(browser, c.id, `${c.id}-idle`, frame(c.id));
    await shootChar(browser, c.id, `${c.id}-wave`, frame(c.id, { state: 'wave', stateTime: 0.6 }));
    await shootChar(browser, c.id, `${c.id}-happy`, frame(c.id, { state: 'happy', stateTime: 0.4 }));
    await shootChar(browser, c.id, `${c.id}-act`, frame(c.id, { activity: OWN[c.id] }), { w: 360, h: 300 });
  }
  // What they do for you (the features).
  await shootChar(browser, 'togepi', 'f-water', frame('togepi', { state: 'water', over: { board: { style: 'bubble', line1: 'Water break?', line2: 'first one today', tag: 'Drank ✓' } } }), { w: 320, h: 340 });
  await shootChar(browser, 'pip', 'f-meeting', frame('pip', { state: 'sign', over: { board: { style: 'sign', line1: 'Meeting in 5!', line2: 'Team sync', join: true, tag: 'OK ✓' } } }), { w: 320, h: 340 });
  await shootChar(browser, 'nomi', 'f-watch', frame('nomi', { state: 'backView' }), { w: 300, h: 300 });
  await shootChar(browser, 'tonk', 'f-listen', frame('tonk', { over: { speech: '👂', answers: null } }), { w: 320, h: 340 });
  await shootChar(browser, 'mori', 'f-quiet', frame('mori', { state: 'sit', stateTime: 2 }), { w: 300, h: 300 });
  await shootChar(browser, 'wolfie', 'f-cheer', frame('wolfie', { state: 'happy', stateTime: 0.3, over: { speech: 'You submitted it! Go Seawolves!', answers: null } }), { w: 360, h: 360 });
  await shootChar(browser, 'togepi', 'f-ask', frame('togepi', { over: { speech: 'Is the meeting important?', answers: ['Yes, very', 'Not really'] } }), { w: 360, h: 360 });

  // Real windows.
  const SONG = {
    id: 'togepi-w43', title: 'Togepi’s Song',
    verse: ['Sixty-one soft pats on my shell today!', "We chased the ball and watched Grey's Anatomy play!", "From JioHotstar stories to Claude's magic words,", 'We saw SBUHacks and flew past many birds!'],
    chorus: ['Toge! Toge! Your hands are happy clouds!', "Through emails and jobs, we're cheering loud!", 'Tic-Tac-Toe queens and big water drinks,', "I'm your lucky friend, let's do more fun things!"],
    week: '61 pats · 27 fetches · 19 tic-tac-toe · 20 glasses of water · mostly cheerful', at: new Date('2026-10-25T18:12:00').getTime(), seconds: 30,
  };
  const sp = await shootWindow(browser, 'song.html', 'song', { name: 'Togepi', songs: [SONG], current: SONG.id, keySet: true, keyFromEnv: false, weekly: true, busy: false, status: '' }, 'song', { w: 420, h: 610, query: 'w=song&c=togepi' });
  await sp.evaluate(() => {
    document.getElementById('play').textContent = '❚❚';
    document.getElementById('fill').style.width = '26%';
    document.getElementById('time').textContent = '0:08 / 0:30';
    document.querySelectorAll('#lyrics .line').forEach((el, i) => el.classList.toggle('now', i === 2));
  });
  await sp.waitForTimeout(500);
  await sp.screenshot({ path: path.join(OUT, 'ui', 'song.png') });
  await shootWindow(browser, 'chat.html', 'chat', { messages: [
    { from: 'you', text: 'Can you help me tighten the script for our demo video?' },
    { from: 'him', text: 'Start with the moment the companion first appears, and let it breathe for a second before you name the app.' },
    { from: 'you', text: 'Good call. And make Pip sound more like himself.' },
    { from: 'him', text: 'Don’t let its logic do your thinking.' },
  ], question: null, status: '', canListen: true, listening: false }, 'chat', { w: 380, h: 520, query: 'w=chat&name=Pip' });
  const list = characters.list().map((c) => ({ id: c.id, name: c.name, concept: c.concept, self: c.self }));
  await shootWindow(browser, 'picker.html', 'picker', { characters: list, current: 'togepi' }, 'picker', { w: 1340, h: 500, query: 'w=picker' });
  // His brain view (the tabs), on Noticing → Mind: what he thought and why he kept quiet.
  const bc = settled('pip');
  const brain = {
    ...bc.brainSnapshot(),
    mind: {
      enabled: true, engine: 'running (Gemma, on this Mac)', speed: { seconds: 3.1 }, memoryMB: 10900, watchingApps: true,
      sees: { app: 'Google Chrome', title: 'Demo script — draft' },
      lastThought: { thought: 'They are polishing the demo script again. I should let them focus.', trigger: 'observe' },
      lastDecision: { urge: 2, threshold: 6 },
      lastSaid: { text: 'Don’t let its logic do your thinking.', reaction: 'they smiled' },
      journal: { day: '2026-10-24', facts: 3, opinions: 2 },
      recalled: ['gets nervous before demos', 'likes short scripts'], recalledBy: 'meaning',
    },
  };
  const bp = await browser.newPage({ viewport: { width: 380, height: 520 }, deviceScaleFactor: 2 });
  await bp.addInitScript(STUBS);
  await bp.addInitScript(() => localStorage.setItem('brainTabs', JSON.stringify({ tab: 'noticing', group: 'mind' })));
  await bp.goto(`${R}/brain.html`);
  await bp.waitForFunction(() => window.__cb && window.__cb.brain);
  await bp.evaluate((d) => window.__cb.brain(d), JSON.parse(JSON.stringify(brain)));
  await bp.waitForTimeout(500);
  await bp.screenshot({ path: path.join(OUT, 'ui', 'brain.png') });
  await browser.close();
  console.log('done');
})();
