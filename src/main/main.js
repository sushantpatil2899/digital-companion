'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, shell, session, systemPreferences, desktopCapturer, clipboard, dialog, safeStorage, globalShortcut, protocol } = require('electron');
const { Companion, TUNING, GAMES } = require('./companion');
const { ContextTracker } = require('./context');
const { Settings } = require('./settings');
const { AppWatcher } = require('./mac/front-app');
const { CalendarWatcher } = require('./mac/calendar');
const { px } = require('./px');
const { toScreen, screenAt } = require('./screens');
const { BALL } = require('./games/fetch');
const P = require('./mind/personality');
const creator = require('./creator');
const { Mind } = require('./mind/mind');
const { Engine } = require('./mind/engine');
const { GeminiEngine, engineChoice, applyEngineEnv, engineChoices } = require('./mind/gemini');
const { EventLog } = require('./mind/events');
const { Store, databaseDir } = require('./mind/store');
const songs = require('./mind/song');
const commands = require('./mind/commands');
const hearing = require('./mind/hearing');
const { weekDiary } = require('./mind/reflect');
const { SoundLibrary } = require('./mind/sounds');
const { Memory, pruneEvents } = require('./mind/memory');
const { Attention } = require('./mind/attention');
const { Growth } = require('./mind/growth');
const { ScreenReader, screenKey } = require('./mind/screen');
const { REST, restReason, restPlan } = require('./mind/rest');
const { Watching, WATCH, guessQuestion, GUESS_YES, needsGuess, guessState } = require('./mind/watching');
const privacy = require('./mind/privacy');
const { buildReport } = require('./report');
const { PANES, permissionProblems, parseSigning, signingNote } = require('./permissions');
const { SWITCHES, welcomeFor } = require('./welcome');
const characters = require('../characters');
const names = require('./mind/names');
const { migrate, characterDir } = require('./migrate');
const music = require('./mind/music');
const { run } = require('./mac/run');

const CONTEXT_MS = 2000; // how often he checks on you (idle time, battery, …)
const SAVE_MS = 60 * 1000; // how often his brain is saved to disk

// Entries for the "Do something…" menu: [activity, label]. The character's
// own activities are in the "Activities" menu.
const ACTIVITY_MENU = [
  ['talk', 'Chatter'],
  ['wave', 'Wave'],
  ['jump', 'Jump'],
  ['sit', 'Sit down'],
  ['backView', 'Turn around'],
];

// The window is a small transparent square that travels around the screen.
// The character's feet sit at (WIN_W / 2, WIN_H - FOOT_MARGIN) inside it.
const WIN_W = 220;
const WIN_H = 256; // tall enough for a sticky note or a two-line question over his head
// (It grows upward and wider while a long bubble needs the room: winSize().)
const FOOT_MARGIN = 18;
const TICK_MS = 1000 / 60;
// Fetch: the thrown ball gets its own little window so it can fly anywhere.
// It's tall, like his, so that on the floor it isn't entirely inside the Dock
// area (macOS moves a window that is up out of the Dock's way); the ball is
// drawn at the bottom of it there.
const BALL_WIN_W = 56;
const BALL_WIN_H = 160;
// Tic-tac-toe board, shown next to him while you play.
const BOARD_W = 210;
const BOARD_H = 262;

// Pressing on him and moving the cursor more than this (px) picks him up.
// Holding the button down without moving pets him; a quick click is a pat.
const DRAG_THRESHOLD = 6;
const CLICK_MAX = 0.25; // s; a shorter press is a click (pat on the head)
// s of holding still before it counts as petting. Not less than CLICK_MAX, so
// a press is never both (a slow click on "Join" would pet him first, which
// dismisses the sign before the click can open the call).
const PET_DELAY = CLICK_MAX;

// Click-through on the transparent parts of the window relies on polling the
// cursor position. On Linux/X11 Electron's cursor position goes stale while a
// window ignores the mouse, so he could become impossible to grab. There the
// whole (small) window stays clickable instead.
const CLICK_THROUGH = process.platform !== 'linux';

if (process.platform === 'linux') {
  // Needed for transparent windows on many X11 setups.
  app.commandLine.appendSwitch('enable-transparent-visuals');
}
// His chirps play without you having clicked anything first.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Events where he says something out loud (floating text, a bubble or his own
// words): he chirps along. See src/renderer/renderer.js for the texts.
const VOICE_EVENTS = {
  speak: 0, // his own words: one syllable per word
  throw: 2, goodMorning: 3, hello: 3, welcomeBack: 3, charging: 3, reminderAck: 2, noteDone: 2, waterDone: 2,
  stretchDone: 2, eyesDone: 2, bedtimeDone: 2, nudgeLater: 2, eventEnded: 2, gaveUp: 3, thatWasFun: 3,
  tttYouWin: 3, tttIWin: 3, tttDraw: 2, tttYouStart: 3, tttIStart: 2, ballThrow: 3, gotBall: 2,
  gameInvite: 3, nudge: 3, reminder: 3,
};

let win = null;
let tray = null;
let companion = null;
let character = characters.get(); // the active character (src/characters), from settings
let timer = null;
let lastTick = 0;
let ignoringMouse = null;
let press = null; // { x, y, t } while the mouse button is down on him
let ballPress = false; // the mouse button is down on the ball (you're holding it)
let ballWin = null;
let ballIgnoring = null;
let boardWin = null;
let boardSide = 1; // which side of him the board is on
let lastBoardPos = { x: NaN, y: NaN };
let lastBoardView = '';
let lastWinPos = { x: NaN, y: NaN, w: WIN_W, h: WIN_H };
let tracker = null;
let contextTimer = null;
let saveTimer = null;
let suspendedAt = null;
let brainWin = null;
let brainTimer = null;
let noteWin = null;
let settings = null;
let frontApp = null;
let calendar = null;
let hiddenForPresenting = false;
let mind = null;
let engine = null;
// A new install: his models wait until you've chosen how he thinks in the
// welcome window (Gemma would otherwise start loading about 11 GB at once).
let waitForBrainChoice = false;
let store = null; // Tiger Data: the shared TimescaleDB database (src/main/mind/store.js)
let storeTimer = null;
let mindTimer = null;
let personality = null;
let personalityWin = null;
let noticeTimer = null;
let sounds = null;
let memory = null;
let growth = null;
let memoriesWin = null;
const attention = new Attention();
let lastApps = null; // latest window list etc. from the app watcher
let reader = null; // "Let him read my screen" (macOS)
let attentionBusy = false;
const watcher = new Watching(); // watching a movie or video together
const watchGuesses = new Map(); // page -> { video } (the decision model's answers for pages not on the list)
let watchGuessing = false;
let rest = null; // why his models are resting: { kind, text, since }
let restWanted = null; // the latest reason (for the battery hysteresis)
let restWorking = false; // doing the diary / reflection before resting
let awakeUntil = 0; // "Try it now" keeps the models awake until then
let chatWin = null; // the chat window (Phase 8)
let songWin = null; // the weekly song window (Phase 10)
let listenWin = null; // hidden: records what you say (Phase 11)
let chatState = { busy: false, status: '', question: null }; // question: his, while you type your own answer
let lastBodyClick = 0; // for double-clicking him (opens the chat)
let engineMB = null; // memory the models use (measured every 10 s)
let welcomeWin = null;
let pickerWin = null; // "Pick your companion" (Phase 9)
let pruneTimer = null;
const IS_MAC = process.platform === 'darwin';
// For testing the mind and the other windows without him on screen
// (TOGEPI_NO_BODY=1 npm start): his window exists and everything runs, it's
// just never shown. Open things from the tray icon.
const NO_BODY = !!process.env.TOGEPI_NO_BODY;

// --------------------------------------------------------------- opt-in context (macOS)

function applyWatchApps(on) {
  if (frontApp) frontApp.stop();
  frontApp = null;
  if (companion) companion.setWorkWindow(null);
  tracker.setApps({ watching: false });
  tracker.setNote('apps', null);
  showAfterPresenting();
  if (!on || !IS_MAC) return;
  tracker.setApps({ watching: true });
  frontApp = new AppWatcher(
    () => settings.values,
    (r) => {
      tracker.setNote('apps', r.error);
      tracker.setApps({ watching: true, ...r });
      // His mind follows your attention from this (see updateAttention).
      lastApps = r;
      if (r.frontKind === 'presenting') hideForPresenting();
      else showAfterPresenting();
    },
  );
  frontApp.start();
}

function applyReadCalendar(on) {
  if (calendar) calendar.stop();
  calendar = null;
  tracker.setEvents([]);
  tracker.setNote('calendar', null);
  tracker.calendarRead = null;
  if (!on || !IS_MAC) return;
  calendar = new CalendarWatcher((r) => {
    if (r.error) {
      tracker.setNote('calendar', r.error);
      return;
    }
    tracker.setNote('calendar', null);
    tracker.setEvents(r.events);
    tracker.calendarRead = Date.now();
  });
  calendar.start();
}

/** Read the calendar now (opening the menu or the brain view, the Mac waking up), unless it just did. */
function refreshCalendar(minGapMs) {
  if (calendar) calendar.refresh(minGapMs);
}

// --------------------------------------------------------------- permissions and signing

let signing = null; // how this app is signed: { kind, name? } (permissions.js)

/** How the app is signed (macOS, packaged builds): ad hoc builds lose their permissions with every rebuild. */
function checkSigning() {
  if (!IS_MAC || !app.isPackaged) return;
  const bundle = path.resolve(process.execPath, '..', '..', '..');
  execFile('/usr/bin/codesign', ['-dv', '--verbose=2', bundle], (_err, stdout, stderr) => {
    signing = parseSigning(`${stdout}\n${stderr}`);
    tracker.setNote('signing', signingNote(signing));
  });
}

/** What's on but not allowed by macOS (the Brain menu shows it). */
function currentPermissionProblems() {
  if (!IS_MAC || !settings || !tracker) return [];
  return permissionProblems({ settings: settings.values, screen: screenPermission(), notes: tracker.notes });
}

/** "Fix…" in the Brain menu: open the right page of System Settings and say what to do. */
function fixPermission(problem) {
  if (problem.kind === 'screen' && screenPermission() === 'not-determined') {
    // Asking for a picture of the screen makes macOS show its prompt.
    desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }).catch(() => {});
    return;
  }
  shell.openExternal(PANES[problem.kind]).catch(() => {});
  const detail = problem.kind === 'screen' ? SCREEN_PERMISSION_NOTE : problem.text;
  tell('Allow Filo in System Settings', `${detail}${signing && signing.kind === 'adhoc' ? `\n\n${signingNote(signing)}` : ''}`);
}

// While you present (Keynote / PowerPoint in front) he hides completely.
function hideForPresenting() {
  if (hiddenForPresenting || !win || win.isDestroyed()) return;
  hiddenForPresenting = true;
  win.hide();
}

function showAfterPresenting() {
  if (!hiddenForPresenting || !win || win.isDestroyed()) return;
  hiddenForPresenting = false;
  if (!NO_BODY) win.showInactive();
}

// --------------------------------------------------------------- memory

/** The active character's own data folder (src/main/migrate.js). */
function characterData() {
  return characterDir(app.getPath('userData'), character.id);
}

function brainFile() {
  return path.join(characterData(), 'brain.json');
}

function loadBrain() {
  try {
    const saved = JSON.parse(fs.readFileSync(brainFile(), 'utf8'));
    const elapsed = Math.max(0, (Date.now() - (saved.savedAt || Date.now())) / 1000);
    companion.restore(saved, elapsed);
  } catch {
    // First run (or unreadable file): start fresh.
  }
}

function saveBrain() {
  if (!companion) return;
  try {
    const file = brainFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(companion.serialize(), null, 2));
    fs.renameSync(tmp, file);
  } catch (e) {
    console.error('Could not save brain:', e.message);
  }
}

// --------------------------------------------------------------- context

// Music you're playing (Phase 9, for Pip's conducting): every 10 s, only
// when the character has an activity that needs it and app watching is on.
const MUSIC_SCRIPT = path.join(__dirname, 'mac', 'music.jxa.js').replace('app.asar', 'app.asar.unpacked');
const musicGuesses = new Map(); // decision model answers per tab
let musicGuessing = false;
let musicChecking = false;

async function checkMusic() {
  const wanted = IS_MAC && settings.get('watchApps') && character.activities.some((a) => a.needs === 'music');
  if (!wanted || musicChecking) {
    if (!wanted) tracker.setMusic(null);
    return;
  }
  musicChecking = true;
  try {
    let players = {};
    try {
      players = JSON.parse(await run('/usr/bin/osascript', ['-l', 'JavaScript', MUSIC_SCRIPT]));
    } catch {
      // not allowed to ask (Automation), or neither app is around
    }
    let tab = lastApps && lastApps.frontTab;
    if (tab && privacy.check({ app: lastApps.frontApp, title: tab.title, url: tab.url, private: tab.private }, settings.get('privacyBlock')).blocked) tab = null;
    const windows = lastApps && lastApps.windows ? lastApps.windows : [];
    tracker.setMusic(music.musicPlaying({ players, windows, frontTab: tab, guess: musicGuess(tab) }));
  } finally {
    musicChecking = false;
  }
}

/** The decision model's answer for a tab that might be music, asked once per page; null until then. */
function musicGuess(tab) {
  const key = music.needsGuess(tab);
  if (!key) return null;
  if (musicGuesses.has(key)) return musicGuesses.get(key);
  if (!musicGuessing && engine && engine.canDecide) {
    musicGuessing = true;
    engine
      .decide(music.guessState(tab), { music: music.guessQuestion() })
      .then((ans) => {
        const p = ans && ans.music && ans.music.probabilities;
        musicGuesses.set(key, { music: !!p && Number(p.A) >= music.GUESS_YES });
        if (musicGuesses.size > 300) musicGuesses.delete(musicGuesses.keys().next().value);
      })
      .catch(() => {})
      .finally(() => {
        musicGuessing = false;
      });
  }
  return null;
}

function startContext() {
  tracker = new ContextTracker();
  setInterval(() => checkMusic().catch(() => {}), 10 * 1000);
  applyWatchApps(settings.get('watchApps'));
  applyReadCalendar(settings.get('readCalendar'));
  const refresh = () => {
    if (!companion) return;
    let idle = 0;
    try {
      idle = powerMonitor.getSystemIdleTime();
    } catch {
      // Not available on this platform: treat you as present.
    }
    companion.setContext(tracker.update(idle));
  };
  powerMonitor.on('lock-screen', () => tracker.setLocked(true));
  powerMonitor.on('unlock-screen', () => {
    tracker.setLocked(false);
    refreshCalendar(0);
  });
  powerMonitor.on('suspend', () => {
    tracker.setSuspended(true);
    suspendedAt = Date.now();
    saveBrain();
  });
  powerMonitor.on('resume', () => {
    tracker.setSuspended(false);
    // He "slept" while the Mac did.
    if (suspendedAt && companion) companion.catchUp((Date.now() - suspendedAt) / 1000);
    suspendedAt = null;
    refreshCalendar(0);
  });
  powerMonitor.on('on-battery', () => tracker.setOnBattery(true));
  powerMonitor.on('on-ac', () => tracker.setOnBattery(false));
  try {
    tracker.setOnBattery(powerMonitor.isOnBatteryPower());
  } catch {
    // ignore
  }
  refresh();
  contextTimer = setInterval(refresh, CONTEXT_MS);
  saveTimer = setInterval(saveBrain, SAVE_MS);
}

// --------------------------------------------------------------- brain view

// His small windows (brain view, personality, notes) stay with you when you
// switch apps, desktops (Spaces) or go full screen, like he does.
function followYou(w) {
  w.setAlwaysOnTop(true, 'floating');
  if (process.platform === 'darwin') w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

function showBrain() {
  refreshCalendar();
  if (brainWin && !brainWin.isDestroyed()) {
    brainWin.show();
    brainWin.focus();
    return;
  }
  brainWin = new BrowserWindow({
    width: 380,
    height: 560,
    title: `${character.name}'s brain`,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'brain-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  followYou(brainWin);
  brainWin.loadFile(path.join(__dirname, '..', 'renderer', 'brain.html'), { query: { name: character.name } });
  const send = () => {
    if (brainWin && !brainWin.isDestroyed() && companion) brainWin.webContents.send('brain', { ...companion.brainSnapshot(), mind: mind ? { ...mind.status(), rest, memoryMB: engine && engine.running ? engineMB : null, watchCheck: watcher.check, watchingApps: !!settings.get('watchApps'), database: store ? store.status(character.id) : null, hearing: hearStatus().text } : null });
  };
  brainWin.webContents.on('did-finish-load', send);
  brainTimer = setInterval(send, 1000);
  brainWin.on('closed', () => {
    clearInterval(brainTimer);
    brainTimer = null;
    brainWin = null;
  });
}

function allDisplays() {
  return screen.getAllDisplays().map((d) => ({ bounds: d.bounds, workArea: d.workArea }));
}

function boundsForPoint(point) {
  const display = screen.getDisplayNearestPoint({ x: px(point.x), y: px(point.y) });
  const { left, right, top, floor } = toScreen({ bounds: display.bounds, workArea: display.workArea }, 0);
  return { left, right, top, floor };
}

function createWindow() {
  settings = new Settings(app.getPath('userData'));
  applyEngineEnv(settings);
  waitForBrainChoice = !settings.get('welcomeSeen') && !process.env.MIND_ENGINE;
  character = characters.get(settings.get('character'));
  names.setNames({ user: settings.get('userName'), pronoun: settings.get('userPronoun'), character: character.name });
  const start = screen.getCursorScreenPoint();
  const bounds = boundsForPoint(start);

  companion = new Companion({
    character,
    bounds,
    halfWidth: 56,
    height: 142,
    x: (bounds.left + bounds.right) / 2,
    // Drop in from a bit above the floor so he lands on startup.
    y: bounds.floor - 260,
  });
  companion.setScreens(allDisplays());
  companion.nudges.setSettings(settings.get('nudges'));
  loadBrain();

  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x: px(companion.x - WIN_W / 2),
    y: px(companion.y - (WIN_H - FOOT_MARGIN)),
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    // macOS: put the window exactly where we say, even partly off screen or
    // over the Dock (otherwise it may be moved back into the visible area).
    enableLargerThanScreen: true,
    alwaysOnTop: true,
    // Don't steal keyboard focus from whatever you're working in.
    focusable: process.platform === 'linux',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), { query: { character: character.id } });
  win.once('ready-to-show', () => {
    if (!NO_BODY) win.showInactive();
    startLoop();
    startContext();
    applyVoice(settings.get('voiceCommands'));
    checkSigning();
    startMind();
    // First run: what he can do; after an update: what's new (once). Also
    // when he doesn't know your name or pronouns yet.
    setTimeout(() => showWelcome(!settings.get('userName') || !names.PRONOUNS[settings.get('userPronoun')]), 2500);
  });
  win.on('closed', () => {
    win = null;
    stopLoop();
  });
  createBallWindow();
}

// A small transparent window for the ball, always on top like him.
function overlayWindow(width, height, preload) {
  const w = new BrowserWindow({
    width,
    height,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    // macOS: put the window exactly where we say, even partly off screen or
    // over the Dock (otherwise it may be moved back into the visible area).
    enableLargerThanScreen: true,
    alwaysOnTop: true,
    focusable: process.platform === 'linux',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', preload),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  w.setAlwaysOnTop(true, 'screen-saver');
  if (process.platform === 'darwin') w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  return w;
}

function createBallWindow() {
  ballWin = overlayWindow(BALL_WIN_W, BALL_WIN_H, 'game-preload.js');
  ballWin.loadFile(path.join(__dirname, '..', 'renderer', 'games', 'ball.html'), { query: { character: character.id } });
  ballWin.on('closed', () => {
    ballWin = null;
  });
}

// --------------------------------------------------------------- main loop

function startLoop() {
  lastTick = Date.now();
  timer = setInterval(tick, TICK_MS);
}

function stopLoop() {
  if (timer) clearInterval(timer);
  timer = null;
}

// A bug in one frame shouldn't stop him (or pop up an error): he drops what
// he was doing and lands on the floor; the error shows in his brain view and
// in "Copy a report".
function tick() {
  try {
    tickOnce();
  } catch (e) {
    console.error('Tick:', e);
    if (companion) companion.recover();
    if (tracker) tracker.setNote('crash', `He tripped over a bug and got back up: ${e.message}`);
  }
}

function tickOnce() {
  if (!win || win.isDestroyed()) return;
  const now = Date.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;

  const cursor = screen.getCursorScreenPoint();
  attention.cursorAt(cursor);

  // A press turns into a pick-up once the cursor moves; held still, it's petting.
  if (press && !press.onQuestion && companion.state !== 'grabbed') {
    const moved = Math.hypot(cursor.x - press.x, cursor.y - press.y);
    const held = (now - press.t) / 1000;
    if (moved > DRAG_THRESHOLD) companion.grab(press);
    else if (held > PET_DELAY) companion.pet(dt);
  }
  if (companion.state === 'grabbed') companion.drag(cursor);
  if (ballPress) {
    if (companion.ball.state === 'grabbed') companion.dragBall(cursor);
    else ballPress = false; // the game ended while you were holding it
  }

  // (He works out which monitor he's on himself, from the display list.)
  companion.update(dt, cursor);

  const { w: ww, h: wh } = winSize();
  const wx = px(companion.x - ww / 2);
  const wy = px(companion.y - (wh - FOOT_MARGIN));
  if (ww !== lastWinPos.w || wh !== lastWinPos.h) win.setBounds({ x: wx, y: wy, width: ww, height: wh });
  else if (wx !== lastWinPos.x || wy !== lastWinPos.y) win.setPosition(wx, wy);
  lastWinPos = { x: wx, y: wy, w: ww, h: wh };

  updateClickThrough(cursor);
  updateBallWindow(cursor);
  updateBoardWindow();

  const events = companion.drainEvents();
  if (events.some((e) => ['stayPutEnded', 'gameStart', 'gameInvite', 'gameEnded'].includes(e))) refreshTrayMenu();
  if (events.includes('noteDone')) sendNotes();
  if (mind) mind.companionEvents(events);
  const voiced = events.find((e) => e in VOICE_EVENTS);
  if (voiced) chirp(voiced === 'speak' && companion.speech ? companion.speech.text.split(/\s+/).length : VOICE_EVENTS[voiced]);

  win.webContents.send('frame', {
    ...companion.snapshot(),
    events,
    // Cursor relative to his feet, so the eyes can follow it.
    cursor: { x: cursor.x - companion.x, y: cursor.y - companion.y },
  });
}

// His window: the usual size, or bigger while the bubble over his head needs
// the room (it grows upward and to both sides; his feet stay where they are).
function winSize() {
  const b = companion.bubble;
  if (!b) return { w: WIN_W, h: WIN_H };
  return { w: Math.max(WIN_W, 2 * Math.ceil(b.halfWidth + 6)), h: Math.max(WIN_H, Math.ceil(b.top + FOOT_MARGIN + 6)) };
}

// Let clicks pass through the transparent parts of the window: only the
// area around his body catches the mouse.
function updateClickThrough(cursor) {
  if (!CLICK_THROUGH) return;
  let over = true;
  if (!press && !ballPress && companion.state !== 'grabbed') over = companion.isOver(cursor);
  const ignore = !over;
  if (ignore !== ignoringMouse) {
    ignoringMouse = ignore;
    win.setIgnoreMouseEvents(ignore);
  }
}

// The ball's window follows the ball while it's out of his hands; only the
// ball itself catches the mouse.
function updateBallWindow(cursor) {
  if (!ballWin || ballWin.isDestroyed()) return;
  const b = companion.ball;
  if (!b.loose) {
    if (ballWin.isVisible()) ballWin.hide();
    return;
  }
  // Keep the window inside the screen: near the floor the ball is drawn lower
  // in it instead.
  const screens = companion.ballScreens();
  const floor = screens[screenAt(screens, b.x, b.y)].floor;
  const x = px(b.x - BALL_WIN_W / 2);
  const y = px(Math.min(b.y - BALL_WIN_H / 2, floor - BALL_WIN_H));
  if (!ballWin.isVisible()) ballWin.showInactive();
  // Checked every frame, so it's put back if the system moves the window.
  const [wx, wy] = ballWin.getPosition();
  if (wx !== x || wy !== y) ballWin.setPosition(x, y);
  ballWin.webContents.send('ball', { rot: b.rot, held: b.state === 'grabbed', dy: b.y - BALL_WIN_H / 2 - y });
  if (!CLICK_THROUGH) return;
  const ignore = !ballPress && Math.hypot(cursor.x - b.x, cursor.y - b.y) > BALL.r + 8;
  if (ignore !== ballIgnoring) {
    ballIgnoring = ignore;
    ballWin.setIgnoreMouseEvents(ignore);
  }
}

// The tic-tac-toe board stands next to him while a game is on.
function updateBoardWindow() {
  const view = companion.boardView();
  if (!view) {
    closeBoard();
    return;
  }
  if (!boardWin) openBoard();
  if (companion.isGrounded()) {
    const x = px(boardSide > 0 ? companion.x + companion.halfWidth + 6 : companion.x - companion.halfWidth - 6 - BOARD_W);
    const y = px(companion.bounds.floor - BOARD_H - 8);
    if (x !== lastBoardPos.x || y !== lastBoardPos.y) {
      boardWin.setPosition(x, y);
      lastBoardPos = { x, y };
    }
  }
  const json = JSON.stringify(view);
  if (json !== lastBoardView) {
    lastBoardView = json;
    boardWin.webContents.send('board', view);
  }
}

function openBoard() {
  // On whichever side of him there's more room (and stay there).
  const b = companion.bounds;
  boardSide = b.right - companion.x >= companion.x - b.left ? 1 : -1;
  if (companion.game) companion.game.side = boardSide;
  lastBoardPos = { x: NaN, y: NaN };
  lastBoardView = '';
  boardWin = overlayWindow(BOARD_W, BOARD_H, 'game-preload.js');
  boardWin.loadFile(path.join(__dirname, '..', 'renderer', 'games', 'board.html'), { query: { name: character.name, character: character.id } });
  boardWin.webContents.on('did-finish-load', () => {
    lastBoardView = '';
  });
  boardWin.once('ready-to-show', () => boardWin && boardWin.showInactive());
  boardWin.on('closed', () => {
    boardWin = null;
  });
}

function closeBoard() {
  if (boardWin && !boardWin.isDestroyed()) boardWin.close();
  boardWin = null;
}

// --------------------------------------------------------------- input

// The renderer measured the bubble over his head (it sizes to its text).
ipcMain.on('bubble', (_e, box) => {
  if (companion) companion.setBubble(box);
});

ipcMain.on('press', () => {
  const p = screen.getCursorScreenPoint();
  // Taking the ball he's holding out to you.
  if (companion.hitPart(p) === 'ball' && companion.grabBall(p)) {
    ballPress = true;
    return;
  }
  // On his question bubble a press is only ever a click (no pick-up or petting).
  press = { x: p.x, y: p.y, t: Date.now(), onQuestion: /^(answer|question)/.test(companion.hitPart(p) || '') };
});

function releaseBall() {
  if (!ballPress) return false;
  ballPress = false;
  companion.releaseBall();
  return true;
}

ipcMain.on('release', () => {
  if (releaseBall() || !press) return;
  const held = (Date.now() - press.t) / 1000;
  const at = press;
  press = null;
  if (companion.state === 'grabbed') {
    companion.release();
  } else if (at.onQuestion) {
    // One of his question's answers, or ✏️ to type your own (the bubble around them does nothing).
    const part = companion.hitPart(at);
    const i = part === 'answer0' ? 0 : part === 'answer1' ? 1 : -1;
    if (i >= 0 && companion.answerQuestion(i) != null && mind) mind.answered(i);
    else if (part === 'answerOwn') answerInOwnWords();
  } else if (held < CLICK_MAX) {
    // The meeting sign's "Join" tag opens the call; his speech bubble goes
    // away when clicked; anywhere else is a pat.
    const part = companion.hitPart(at);
    const link = part === 'join' ? companion.meetingLink() : null;
    if (part === 'listening') {
      // His 👂 bubble: nothing to do (he's listening to you).
    } else if (part === 'speech') {
      // "I made us a song!": the song window opens and it plays.
      const song = pendingSong && companion.speech && companion.speech.text === pendingSong.text ? pendingSong.id : null;
      companion.dismissSpeech();
      if (mind) mind.reacted('clicked');
      if (song) {
        pendingSong = null;
        showSong(song, true);
      }
    } else if (link) {
      companion.acknowledgeReminder();
      shell.openExternal(link).catch(() => {});
    } else {
      companion.pat();
      // Double-click: open the chat.
      if (part === 'body' && Date.now() - lastBodyClick < DOUBLE_CLICK) {
        lastBodyClick = 0;
        showChat();
      } else if (part === 'body') {
        lastBodyClick = Date.now();
      }
    }
  }
  // Otherwise it was a long pet; he stays happy for a moment on his own.
});

// The ball (in its own window) picked up and let go.
ipcMain.on('ball-press', () => {
  if (companion && companion.grabBall(screen.getCursorScreenPoint())) ballPress = true;
});
ipcMain.on('ball-release', () => {
  if (companion) releaseBall();
});

// Tic-tac-toe board.
ipcMain.on('ttt-play', (_e, i) => {
  if (companion && Number.isInteger(i)) companion.playSquare(i);
});
ipcMain.on('ttt-again', () => {
  if (companion) companion.playAgain();
});
ipcMain.on('ttt-close', () => {
  if (companion) companion.endGame('done');
});

// Battery level from the renderer (navigator.getBattery()).
ipcMain.on('battery', (_e, b) => {
  if (tracker && b && typeof b.level === 'number') tracker.setBattery({ level: b.level, charging: !!b.charging });
});

ipcMain.on('context-menu', () => {
  press = null;
  // He holds still while the menu is open, so it doesn't move with his window.
  if (companion) companion.holdForMenu(true);
  buildMenu().popup({ window: win, callback: () => companion && companion.holdForMenu(false) });
});

ipcMain.on('tray-icon', (_e, dataUrl) => {
  if (tray || typeof dataUrl !== 'string') return;
  let image = nativeImage.createFromDataURL(dataUrl);
  image = image.resize({ width: process.platform === 'darwin' ? 18 : 24 });
  tray = new Tray(image);
  tray.setToolTip(character.name);
  if (process.platform === 'linux') {
    // Most Linux trays only support a fixed context menu, not click events.
    tray.setContextMenu(buildMenu());
  } else {
    // Clicking the icon only opens the menu; it's rebuilt each time so labels
    // like "Wake up" are current.
    const open = () => tray.popUpContextMenu(buildMenu());
    tray.on('click', open);
    tray.on('right-click', open);
  }
});

// --------------------------------------------------------------- menus

function callHere() {
  if (!companion) return;
  const c = screen.getCursorScreenPoint();
  press = null;
  const target = boundsForPoint(c);
  const sameScreen = target.left === companion.bounds.left && target.floor === companion.bounds.floor;
  if (sameScreen && companion.isGrounded()) {
    // Run along the floor to below the cursor.
    companion.comeTo(c.x);
    return;
  }
  // On another screen: he walks over through the screen edges.
  if (companion.isGrounded() && companion.comeTo(c.x, c.y)) return;
  // Mid-air, or screens that don't touch: drop him in from just above the cursor.
  companion.route = null;
  companion.crossing = null;
  companion.setBounds(target);
  companion.x = c.x;
  companion.y = Math.min(c.y - 40, companion.bounds.floor);
  companion.vx = 0;
  companion.vy = 0;
  companion.enter('fall');
}

/**
 * A Brain menu switch. Ticked means you switched it on; if macOS hasn't
 * allowed it (or it isn't working), it says so and a line under it opens
 * System Settings.
 */
function permissionSwitch(problems, key, label, apply) {
  const problem = problems.find((p) => p.key === key);
  const items = [
    {
      label: problem ? `${label} (not allowed by macOS)` : label,
      type: 'checkbox',
      enabled: IS_MAC,
      checked: !!(settings && settings.get(key)),
      click: (item) => {
        apply(item.checked);
        refreshTrayMenu();
      },
    },
  ];
  if (problem) items.push({ label: '    ⚠ Fix in System Settings…', click: () => fixPermission(problem) });
  return items;
}

// "Stay put (10 min)", or "Stay put (7 min left)" while it's on.
function stayPutLabel() {
  if (companion && companion.paused) {
    const min = Math.max(1, Math.ceil(companion.stayPutLeft() / 60));
    return `Stay put (${min} min left)`;
  }
  return `Stay put (${Math.round(TUNING.stayPutFor / 60)} min)`;
}

function refreshTrayMenu() {
  if (tray && process.platform === 'linux') tray.setContextMenu(buildMenu());
}

function buildMenu() {
  refreshCalendar(); // so "Next event" in the brain view is fresh
  const problems = currentPermissionProblems();
  const sleeping = companion && companion.state === 'sleep';
  const doIt = (name) => () => {
    companion.doActivity(name);
    refreshTrayMenu();
  };
  const grounded = companion ? companion.isGrounded() : false;
  const items = [
    { label: 'Come here', click: callHere },
    {
      label: 'Activities',
      // Night-only ones (Mori's fireflies) only at night.
      submenu: character.activities.map((a) => {
        const later = notYet(a);
        return { label: later ? `${a.menu} (at night)` : a.menu, enabled: grounded && !later, click: doIt(a.id) };
      }),
    },
    {
      label: 'Do something…',
      submenu: ACTIVITY_MENU.map(([name, label]) => ({ label, enabled: grounded, click: doIt(name) })),
    },
    { label: 'Play', submenu: playMenu() },
    {
      label: sleeping ? 'Wake up' : 'Take a nap',
      click: () => {
        if (sleeping) companion.pat();
        else companion.doActivity('sleep');
        refreshTrayMenu();
      },
    },
    {
      label: stayPutLabel(),
      type: 'checkbox',
      checked: companion ? companion.paused : false,
      click: (item) => {
        if (item.checked) companion.stayPut(TUNING.stayPutFor);
        else companion.endStayPut();
        refreshTrayMenu();
      },
    },
  ];
  items.push({ label: `Chat with ${character.name}…`, click: () => showChat() });
  items.push({
    label: 'Character',
    submenu: [
      ...characters.list().map((c) => ({ label: c.name, type: 'radio', checked: c.id === character.id, click: () => switchCharacter(c.id) })),
      { type: 'separator' },
      { label: 'Pick your companion…', click: showPicker },
    ],
  });
  items.push({ label: 'Remind me…', click: showNotes });
  items.push({ label: 'Wellbeing', submenu: wellbeingMenu() });
  items.push({ label: 'Mind', submenu: mindMenu() });
  items.push({ label: 'Try it now', submenu: tryMenu() });
  items.push({
    label: 'Brain',
    submenu: [
      { label: 'Show his brain…', click: showBrain },
      { type: 'separator' },
      ...permissionSwitch(problems, 'watchApps', 'Notice which app I’m using', (on) => {
        settings.set('watchApps', on);
        applyWatchApps(on);
      }),
      ...permissionSwitch(problems, 'readScreen', 'Let him read my screen', (on) => applyReadScreen(on)),
      ...permissionSwitch(problems, 'readCalendar', 'Read my calendar', (on) => {
        settings.set('readCalendar', on);
        applyReadCalendar(on);
      }),
    ],
  });
  items.push({ label: 'Welcome and what’s new…', click: () => showWelcome(true) });
  if (process.platform === 'darwin' || process.platform === 'win32') {
    items.push({
      label: 'Start at login',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    });
  }
  items.push({ type: 'separator' }, { label: 'Quit', click: () => app.quit() });
  return Menu.buildFromTemplate(items);
}

function mindMenu() {
  const on = !!(settings && settings.get('mind'));
  return [
    { label: !engine ? 'Mind: off' : rest ? `Mind: resting (${rest.text})` : `Mind: ${engine.status().split(' — ')[0]}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Think and talk for himself',
      type: 'checkbox',
      checked: on,
      click: (item) => {
        settings.set('mind', item.checked);
        applyMind(item.checked);
        refreshTrayMenu();
      },
    },
    {
      label: 'Think with',
      submenu: engineChoices({ hasKey: !!geminiKey() }).map(([id, label]) => ({
        label,
        type: 'radio',
        checked: engineChoice(settings) === id,
        click: () => switchEngine(id),
      })),
    },
    {
      label: 'Chirp when he talks',
      type: 'checkbox',
      checked: !!(settings && settings.get('sounds')),
      click: (item) => {
        settings.set('sounds', item.checked);
        refreshTrayMenu();
      },
    },
    {
      label: 'Rest the models after I’m away',
      submenu: [5, 15, 30, 60, 0].map((min) => ({
        label: min ? `${min} min` : 'Never',
        type: 'radio',
        checked: !!settings && settings.get('restAfterAway') === min,
        click: () => {
          settings.set('restAfterAway', min);
          refreshTrayMenu();
        },
      })),
    },
    { type: 'separator' },
    { label: 'Personality…', click: showPersonality },
    { label: 'Memories…', click: showMemories },
    { label: 'Our songs…', click: () => showSong() },
    { type: 'separator' },
    {
      label: `Talk to me (${(settings && settings.get('listenShortcut')) || 'Alt+Space'})`,
      type: 'checkbox',
      checked: !!(settings && settings.get('voiceCommands')),
      click: (item) => {
        settings.set('voiceCommands', item.checked);
        applyVoice(item.checked);
        sendChat();
        refreshTrayMenu();
      },
    },
    {
      label: 'Listen with',
      submenu: [
        ['apple', 'Apple, on this Mac (nothing leaves it)'],
        ['elevenlabs', 'ElevenLabs Scribe (online: your voice goes to ElevenLabs)'],
      ].map(([id, label]) => ({
        label,
        type: 'radio',
        checked: (settings && settings.get('speechEngine') === 'elevenlabs' ? 'elevenlabs' : 'apple') === id,
        click: () => {
          settings.set('speechEngine', id);
          applyVoice(settings.get('voiceCommands'));
          refreshTrayMenu();
        },
      })),
    },
    { type: 'separator' },
    { label: 'Open sounds folder…', click: () => sounds && shell.openPath(sounds.dir) },
    { label: 'Privacy blocklist… (settings.json)', click: () => settings && shell.openPath(settings.file) },
    { label: 'Show his memory folder…', click: () => shell.openPath(mindDir()) },
    { type: 'separator' },
    { label: 'Copy a report', click: copyReport },
  ];
}

// "Try it now": see the diary, relationship and weekly reflection work right
// away instead of waiting for the evening or Sunday.
function tryMenu() {
  const on = !!(settings && settings.get('mind')) && !!mind;
  return [
    { label: 'Write today’s diary now', enabled: on, click: () => tryNow('diary') },
    { label: 'Count today towards our relationship now', enabled: !!mind && !!growth, click: () => tryNow('days') },
    { label: 'Reflect on this week now', enabled: on && !!growth, click: () => tryNow('reflect') },
    { label: 'Make this week’s song now', enabled: on && !songState.busy, click: () => makeSong({ manual: true }) },
  ];
}

function playMenu() {
  const can = !!companion && companion.isGrounded() && !companion.context.quiet;
  const start = (kind) => () => {
    companion.startGame(kind, true);
    refreshTrayMenu();
  };
  const items = [
    { label: 'Fetch', enabled: can, click: start('fetch') },
    { label: 'Tic-tac-toe', enabled: can, click: start('ttt') },
  ];
  if (companion && companion.game) {
    items.push({ type: 'separator' }, {
      label: 'Stop playing',
      click: () => {
        companion.endGame('done');
        refreshTrayMenu();
      },
    });
  }
  return items;
}

function setNudge(key, value) {
  const n = { ...settings.get('nudges'), [key]: value };
  settings.set('nudges', n);
  companion.nudges.setSettings(n);
  refreshTrayMenu();
}

const BEDTIMES = ['22:00', '22:30', '23:00', '23:30', '00:00', '00:30'];

function wellbeingMenu() {
  const n = (settings && settings.get('nudges')) || {};
  const glasses = companion ? companion.nudges.water : 0;
  return [
    { label: `Water today: ${glasses} glass${glasses === 1 ? '' : 'es'}`, enabled: false },
    { type: 'separator' },
    { label: `Drink water (every ${n.waterEvery} min)`, type: 'checkbox', checked: !!n.water, click: (i) => setNudge('water', i.checked) },
    { label: `Stretch breaks (after ${n.stretchEvery} min)`, type: 'checkbox', checked: !!n.stretch, click: (i) => setNudge('stretch', i.checked) },
    { label: `Rest your eyes (every ${n.eyesEvery} min)`, type: 'checkbox', checked: !!n.eyes, click: (i) => setNudge('eyes', i.checked) },
    {
      label: 'Bedtime nudge',
      submenu: [
        { label: 'Off', type: 'radio', checked: !n.bedtime, click: () => setNudge('bedtime', '') },
        ...BEDTIMES.map((t) => ({ label: t, type: 'radio', checked: n.bedtime === t, click: () => setNudge('bedtime', t) })),
      ],
    },
  ];
}

// --------------------------------------------------------------- "remind me" notes

function sendNotes() {
  if (noteWin && !noteWin.isDestroyed() && companion) noteWin.webContents.send('notes', companion.nudges.notes);
}

function showNotes() {
  if (noteWin && !noteWin.isDestroyed()) {
    noteWin.show();
    noteWin.focus();
    return;
  }
  noteWin = new BrowserWindow({
    width: 360,
    height: 480,
    title: 'Remind me',
    resizable: false,
    alwaysOnTop: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'note-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  followYou(noteWin);
  noteWin.loadFile(path.join(__dirname, '..', 'renderer', 'note.html'));
  noteWin.webContents.on('did-finish-load', sendNotes);
  noteWin.on('closed', () => {
    noteWin = null;
  });
}

ipcMain.on('note-add', (_e, n) => {
  if (!companion || !n || typeof n.text !== 'string' || !Number.isFinite(n.at)) return;
  if (n.at < Date.now() - 60 * 1000) return;
  companion.addNote(n.text, n.at);
  saveBrain();
  sendNotes();
});

ipcMain.on('note-remove', (_e, id) => {
  if (!companion || !Number.isFinite(id)) return;
  companion.removeNote(id);
  saveBrain();
  sendNotes();
});

ipcMain.on('note-close', () => {
  if (noteWin && !noteWin.isDestroyed()) noteWin.close();
});

// --------------------------------------------------------------- mind (src/main/mind)

function mindDir() {
  return path.join(characterData(), 'mind');
}

function personalityFile() {
  return path.join(mindDir(), 'personality.md');
}

function eventsFile() {
  return path.join(mindDir(), 'events.jsonl');
}

const WATCHED_MIND_FILES = ['about-you.md', 'about-me.md'];

/** Stop the current character's mind (switching characters); his models keep running. */
function stopMind() {
  if (mind) mind.setEnabled(false);
  clearInterval(mindTimer);
  clearInterval(pruneTimer);
  for (const f of WATCHED_MIND_FILES) fs.unwatchFile(path.join(mindDir(), f));
  mind = null;
  memory = null;
  growth = null;
}

function startMind() {
  const id = character.id;
  personality = P.load(personalityFile(), character);
  sounds = new SoundLibrary(path.join(characterData(), 'sounds'));
  memory = new Memory(mindDir());
  // The raw event log is kept 90 days (his diary keeps the gist); checked daily.
  const prune = () => pruneEvents(eventsFile());
  prune();
  pruneTimer = setInterval(prune, 24 * 3600 * 1000);
  // You can edit his memory files by hand: pick up the changes.
  for (const f of WATCHED_MIND_FILES) {
    fs.watchFile(path.join(mindDir(), f), { interval: 3000 }, () => {
      memory.load();
      sendMemories();
    });
  }
  growth = new Growth(mindDir());
  companion.temperament = P.temperament(personality);
  // His mind starts with nothing seen: the window you're on counts as new
  // (otherwise after switching character he'd see nothing until you moved).
  attention.forget();
  mind = new Mind({
    personality,
    memory,
    growth,
    // He grew (a day counted towards your relationship, or a weekly reflection).
    onPersonality: (p) => {
      personality = p;
      P.save(personalityFile(), personality);
      companion.temperament = P.temperament(personality);
      sendPersonality();
    },
    eventsFile: eventsFile(),
    chatFile: path.join(mindDir(), 'chat.json'),
    ownAnswersFile: path.join(mindDir(), 'own-answers.json'),
    log: new EventLog({ file: eventsFile(), onAdd: (e) => store && store.addEvent(id, e) }),
    getSelf: () => ({
      band: companion.moodBand(),
      needs: companion.needs,
      state: companion.state,
      doing: (companion.own(companion.state) || companion.ownState(companion.state) || {}).doing || null,
      hour: companion.context.hour,
      quiet: !!companion.context.quiet,
      away: !!companion.context.userAway,
      awayFor: companion.context.awayFor || 0,
      asleep: companion.state === 'sleep',
      busy: !!companion.board(),
      watching: watcher.current ? watcher.current.name : null,
      studying: companion.studying,
      calendar: tracker ? tracker.calendar.events : [],
    }),
    onSpeak: ({ text, action, badge }) => companion.say(text, action, { badge }),
    onAsk: ({ text, answers, action, badge }) => companion.ask(text, answers, action, { badge }),
    getBlocklist: () => settings.get('privacyBlock'),
    // Phase 10: the memories closest in meaning, from the database.
    meaning: async (query) => {
      if (!store || !store.vectors || !engine || !engine.canEmbed || !store.memoryCount[id]) return null;
      const [v] = await engine.embed([plainForMeaning(query.slice(0, 1500))], { query: true });
      const near = await store.nearest(id, v, 30);
      return near.length ? new Map(near.map((n) => [n.text, n.similarity])) : null;
    },
  });
  syncMeaning();
  let ticks = 0;
  mindTimer = setInterval(() => {
    mind.tick();
    updateAttention();
    updateWatching();
    updateRest();
    if (++ticks % 10 === 0 && engine && engine.running) engine.memoryMB().then((mb) => (engineMB = mb));
    // Never listening in a meeting or while you're away (Phase 11).
    if (hear.on && (companion.context.quiet || companion.context.userAway)) stopListening(false);
    // Fingerprint his memories as soon as the models are awake (then every minute).
    if (ticks % 5 === 0 && store && store.vectors && store.memoryCount[id] === undefined) syncMeaning();
  }, 1000);
  if (IS_MAC) {
    reader = new ScreenReader(require('./mac/screen-capture'), {
      decide: (state, q) => (engine && engine.canDecide ? engine.decide(state, q) : Promise.resolve(null)),
      getRules: () => ({ block: settings.get('privacyBlock'), allow: settings.get('screenAllow') }),
    });
  }
  applyMind(settings.get('mind'));
}

// --------------------------------------------------------------- attention and reading the screen

function screenPermission() {
  try {
    return systemPreferences.getMediaAccessStatus('screen');
  } catch {
    return 'unknown';
  }
}

// The app is signed for this Mac only, so macOS treats every rebuild as a new
// app: a Screen Recording switch that's already on belongs to the old build.
const SCREEN_PERMISSION_NOTE =
  'macOS hasn’t given him Screen Recording. Open System Settings → Privacy & Security → Screen & System Audio Recording. ' +
  'If Filo is already listed (even switched on), it’s from an older build: select it, remove it with −, then quit and reopen him and allow it when asked. ' +
  'Otherwise switch Filo on, then quit and reopen him.';

/** He may look at your windows right now. */
function canReadScreen() {
  if (!reader || !settings.get('readScreen') || !mind || !mind.enabled || !engine || !engine.ready) return false;
  if (companion.context.userAway || companion.context.quiet) return false;
  return screenPermission() === 'granted';
}

/**
 * Every second: where your attention is (window you type in vs. the one
 * under your cursor, across screens). When it settles on a new window he
 * reads it (if allowed) and notices it; otherwise he just keeps the view and
 * rereads the window now and then.
 */
async function updateAttention() {
  if (!mind || !lastApps || !lastApps.frontApp || attentionBusy) return;
  attentionBusy = true;
  try {
    const displays = screen.getAllDisplays().map((d) => d.bounds);
    const v = attention.update({ windows: lastApps.windows || [], frontApp: lastApps.frontApp, frontTab: lastApps.frontTab, displays });
    const a = v.attention;
    // Where he goes when he's lonely (Phase 9, step 1b).
    companion.setWorkWindow(a);
    if (!a) return;
    const view = { typing: v.typing, cursorOn: v.cursorOn, others: v.others, via: v.via };
    const reading = canReadScreen();
    if (settings.get('readScreen') && IS_MAC) {
      tracker.setNote('screen', screenPermission() === 'granted' ? null : SCREEN_PERMISSION_NOTE);
    }
    if (v.settled) {
      let r = reading ? reader.readingFor(screenKey(a)) || (await reader.look(v, { force: true })) : null;
      if (r && r.key !== screenKey(a)) r = null;
      await mind.observe({ app: a.app, title: a.title, url: a.url, private: a.private, screen: a.screen, via: v.via, view, reading: r });
    } else {
      mind.setView(view);
      // (No looking around while you watch something: he's watching too.)
      if (reading && !watcher.current) {
        await reader.look(v);
        const r = reader.readingFor(screenKey(a));
        if (r) mind.setReading(r);
      }
    }
  } catch (e) {
    console.error('Attention:', e.message);
  } finally {
    attentionBusy = false;
  }
}

/**
 * Watching together: once you've stayed on a movie, series or video (see
 * src/main/mind/watching.js) he goes and sits in the corner of that screen,
 * says something about it and watches quietly until you stop.
 */
function updateWatching() {
  if (!mind || !companion || !tracker) return;
  const a = lastApps && lastApps.frontApp ? attention.current : null;
  const blocked = !!a && (a.private || privacy.check({ app: a.app, title: a.title, url: a.url }, settings.get('privacyBlock')).blocked);
  const before = watcher.current;
  const event = watcher.update(blocked ? null : a, blocked ? null : watchGuess(a));
  const w = watcher.current;
  if (event === 'start') {
    startWatching(w).catch((e) => console.error('Watching:', e.message));
  } else if (event === 'stop') {
    tracker.setWatching(null);
    companion.stopWatching();
    mind.stoppedWatching(before);
  } else if (w && w.screen && before && before.screen !== w.screen) {
    companion.watchOn(w.screen - 1);
  }
  if (w && event !== 'start') glanceAtShow(w);
}

// While you watch (Phase 9, step 1b): every 2 minutes he glances at the
// screen (a picture of that window, for his vision model) and his body
// reacts to the moment. Needs "Let him read my screen" and his models
// running (they rest on battery below 20%); skipped while he's busy.
let lastGlanceAt = 0;
let glancing = false;

function glanceAtShow(w) {
  if (glancing || rest || !engine || !engine.ready || !canReadScreen() || !reader || !attention.current) return;
  if (Date.now() - Math.max(lastGlanceAt, w.since) < WATCH.glance * 1000) return;
  glancing = true;
  lastGlanceAt = Date.now();
  (async () => {
    const r = await reader.look({ attention: attention.current }, { force: true, picture: true });
    if (!watcher.current || !r || r.skipped) return;
    const g = await mind.glance(r, watcher.current);
    if (g && watcher.current) companion.watchReact(g.mood);
  })()
    .catch((e) => console.error('Glance:', e.message))
    .finally(() => {
      glancing = false;
    });
}

/**
 * The decision model's answer for a page not on the watching list (or a tab
 * whose address the browser doesn't tell us), asked once per page; null until
 * it has answered (or when the models are resting).
 */
function watchGuess(a) {
  const key = needsGuess(a);
  if (!key) return null;
  if (watchGuesses.has(key)) return watchGuesses.get(key);
  if (!watchGuessing && engine && engine.canDecide) {
    watchGuessing = true;
    engine
      .decide(guessState(a), { watching: guessQuestion() })
      .then((ans) => {
        const p = ans && ans.watching && ans.watching.probabilities;
        watchGuesses.set(key, { video: !!p && Number(p.A) >= GUESS_YES });
        if (watchGuesses.size > 300) watchGuesses.delete(watchGuesses.keys().next().value);
      })
      .catch(() => {})
      .finally(() => {
        watchGuessing = false;
      });
  }
  return null;
}

async function startWatching(w) {
  tracker.setWatching(w.name, WATCH.maxIdle);
  companion.startWatching(w.screen ? w.screen - 1 : null);
  // A look at the window first (with a picture), so he knows what it is.
  if (canReadScreen() && reader && attention.current) {
    const r = await reader.look({ attention: attention.current }, { force: true, picture: true });
    if (r && !r.skipped) mind.setReading(r);
  }
  if (watcher.current) mind.startedWatching(w);
}

// --------------------------------------------------------------- chat (Phase 8)

const DOUBLE_CLICK = 450; // ms between two clicks on him that open the chat

function showChat() {
  if (chatWin && !chatWin.isDestroyed()) {
    sendChat();
    chatWin.show();
    chatWin.focus();
    return;
  }
  chatWin = new BrowserWindow({
    width: 380,
    height: 540,
    title: `Chat with ${character.name}`,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'chat-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  followYou(chatWin);
  chatWin.loadFile(path.join(__dirname, '..', 'renderer', 'chat.html'), { query: { name: character.name } });
  chatWin.webContents.on('did-finish-load', sendChat);
  chatWin.on('closed', () => {
    chatWin = null;
    // Closed without writing an answer: his question waits its usual 30 s from now.
    if (chatState.question && mind && mind.pendingQuestion()) {
      mind.awaiting.until = Date.now() + 30 * 1000;
      if (companion.asking()) companion.speech.until = companion.time + 30;
    }
    chatState.question = null;
  });
}

function sendChat() {
  if (!chatWin || chatWin.isDestroyed()) return;
  chatWin.webContents.send('chat', {
    messages: mind ? mind.todaysChat().map((m) => ({ from: m.from, text: m.text })) : [],
    question: chatState.question,
    busy: chatState.busy,
    status: chatState.status,
    canListen: !!settings.get('voiceCommands'),
    listening: hear.on,
  });
}

/** ✏️ on his question: type your own answer in the chat; the question waits meanwhile. */
function answerInOwnWords() {
  const q = mind && mind.pendingQuestion();
  if (!q) return;
  mind.holdQuestion(600);
  companion.holdQuestion(600);
  chatState.question = q;
  showChat();
}

/** Wait (up to `ms`) for his voice model to be ready. */
async function voiceReady(ms = 90 * 1000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (engine && engine.ready) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return !!(engine && engine.ready);
}

ipcMain.on('chat-send', (_e, text) => chatSend(text));

/**
 * A chat message, typed or said out loud (Phase 11): he answers in the chat,
 * and in his bubble when `bubble` (typed messages; a spoken one opens the chat
 * and is answered only there, Sushant 2026-10-25).
 */
async function chatSend(text, { bubble = true } = {}) {
  if (typeof text !== 'string' || !text.trim() || chatState.busy) return;
  if (!mind || !engine || !settings.get('mind')) {
    chatState.status = 'His mind is off: turn on Mind → Think and talk for himself.';
    sendChat();
    return;
  }
  const answering = !!chatState.question && !!mind.pendingQuestion();
  chatState.busy = true;
  // Chatting keeps his models awake (and wakes them if they were resting).
  awakeUntil = Math.max(awakeUntil, Date.now() + REST.forceFor);
  if (companion.state === 'sleep') companion.pat();
  if (!engine.ready) {
    chatState.status = 'Waking up his mind… (a few seconds)';
    sendChat();
    if (!(await voiceReady())) {
      chatState.busy = false;
      chatState.status = `His mind didn't start: ${engine.status()}`;
      sendChat();
      return;
    }
  }
  chatState.status = `${character.name} is thinking…`;
  sendChat();
  // (Your message shows right away.)
  const reply = mind.chat(text, { answering });
  sendChat();
  const r = await reply;
  if (answering) {
    chatState.question = null;
    companion.closeQuestion();
  }
  chatState.busy = false;
  chatState.status = r.error ? `He couldn't answer: ${r.error}` : '';
  sendChat();
  // His reply in his bubble too (with a chirp), except in meetings and while you watch something.
  if (bubble && !r.error && !companion.context.quiet && !watcher.current) companion.say(r.reply, r.action);
}

/** Turn "Let him read my screen" on or off (it needs app watching and Screen Recording permission). */
function applyReadScreen(on) {
  settings.set('readScreen', on);
  tracker.setNote('screen', null);
  if (!on) {
    if (mind) mind.setReading(null);
    return;
  }
  if (!settings.get('watchApps')) {
    settings.set('watchApps', true);
    applyWatchApps(true);
  }
  // Asking for a picture of the screen makes macOS show its permission prompt once.
  if (screenPermission() !== 'granted') desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }).catch(() => {});
}

/** Turn his mind (and the local models) on or off. */
function applyMind(on) {
  if (!mind) return;
  mind.setEnabled(on);
  if (on && engine) mind.engine = engine; // a new character's mind uses the models already running
  if (on && !engine && waitForBrainChoice) return; // he uses his built-in lines meanwhile
  if (on && !engine) {
    // mindEngine (Mind → Think with): 'local' models, or his voice on Gemini (gemini.js).
    const pidFile = path.join(mindDir(), 'engine.pids');
    engine = engineChoice(settings) === 'gemini' ? GeminiEngine.fromSettings(settings, { pidFile, apiKey: geminiKey() }) : new Engine({ pidFile });
    mind.engine = engine;
    engine
      .start()
      .catch((e) => console.error('Mind engine:', e.message))
      .finally(refreshTrayMenu);
  } else if (!on && engine) {
    engine.stop();
    engine = null;
    mind.engine = null;
    rest = null;
  }
}

/** Mind → Think with (and the welcome window): stop the models he uses now and start the other kind. */
function switchEngine(id) {
  if (!settings || !['local', 'gemini'].includes(id)) return;
  const changed = engineChoice(settings) !== id;
  if (changed) settings.set('mindEngine', id);
  if (changed || waitForBrainChoice) restartEngine();
}

/** Stop his models and start them again as settings say (another engine, a new Gemini key, your choice made). */
function restartEngine() {
  waitForBrainChoice = false;
  if (engine) {
    engine.stop();
    engine = null;
    if (mind) mind.engine = null;
    rest = null;
  }
  applyMind(settings.get('mind'));
  refreshTrayMenu();
}

// --------------------------------------------------------------- resting the models (Phase 5)

/**
 * Every second: should his models rest (you're away, night while he
 * sleeps, low battery)? His diary and reflection get done first; they start
 * again when the reason is gone. See src/main/mind/rest.js.
 */
function updateRest() {
  if (!engine || !mind || !mind.enabled || engine.files.missing.length) {
    rest = null;
    restWanted = null;
    return;
  }
  const reason = restReason(
    { ...companion.context, asleep: companion.state === 'sleep' },
    { restAfterAway: settings.get('restAfterAway'), restBattery: settings.get('restBattery') },
    restWanted,
  );
  restWanted = reason;
  const workDue = !!reason && reason.kind !== 'battery' && !!mind.workDue();
  const plan = restPlan({ reason, workDue, running: engine.running, busy: mind.thinking || mind.writingJournal || restWorking, forced: Date.now() < awakeUntil });
  if (plan === 'start') {
    engine
      .start()
      .catch((e) => console.error('Mind engine:', e.message))
      .finally(refreshTrayMenu);
  } else if (plan === 'stop') {
    engine.stop();
    engineMB = null;
    refreshTrayMenu();
  } else if (plan === 'work' && engine.ready) {
    restWorking = true;
    mind
      .doWork()
      .catch((e) => console.error('Mind work:', e.message))
      .finally(() => (restWorking = false));
  }
  const resting = !!reason && !engine.running;
  rest = resting ? { kind: reason.kind, text: reason.text, since: rest && rest.kind === reason.kind ? rest.since : Date.now() } : null;
}

// --------------------------------------------------------------- "Try it now", report, welcome (Phase 5)

function tell(title, detail) {
  dialog.showMessageBox({ type: 'info', title, message: title, detail, buttons: ['OK'] }).catch(() => {});
}

async function tryNow(kind) {
  if (!mind) return;
  if (kind === 'days') {
    const d = mind.countDays({ today: true }) || {};
    const parts = ['affection', 'trust', 'familiarity'].filter((m) => d[m]).map((m) => `${m} ${d[m] > 0 ? '+' : ''}${d[m]}`);
    tell(
      'Counted today so far',
      parts.length
        ? `${parts.join(', ')}.\n\nWhole points are in his personality now (Mind → Personality…); the rest is kept and added later. The rest of today is counted when the day is over.`
        : 'Nothing new to count since the last time (or this week’s limit is reached).',
    );
    return;
  }
  if (!engine || !settings.get('mind')) {
    tell('His mind is off', 'Turn on Mind → Think and talk for himself first.');
    return;
  }
  awakeUntil = Date.now() + REST.forceFor;
  if (!engine.ready) {
    tell('Waking his models', 'They take a few seconds to start. The result shows up here when he’s done.');
    await engine.start().catch(() => false);
    if (!engine.ready) {
      tell('His models didn’t start', engine.status());
      return;
    }
  }
  try {
    if (kind === 'diary') {
      const r = await mind.writeDiaryNow();
      if (r.error) tell('He couldn’t write his diary', r.error);
      else if (!r.length) tell('Nothing new to write', 'His diary already covers everything up to now. Read it in Mind → Memories….');
      else {
        const lines = r.map((d) => (d.error ? `${d.day}: couldn’t write it (${d.error})` : `${d.day}: ${d.lines} diary lines, ${d.facts} new facts about you, ${d.opinions} opinions`));
        tell(r.every((d) => d.error) ? 'He couldn’t write his diary' : 'He wrote his diary', `${lines.join('\n')}\n\nRead it in Mind → Memories…. Anything that happens later today is added this evening.`);
      }
    } else if (kind === 'reflect') {
      const r = await mind.reflectNow();
      if (r.error) tell('He couldn’t reflect', r.error);
      else if (r.note) tell('Not enough to reflect on yet', 'He needs at least 3 days with a diary entry in the last week. Try Write today’s diary now first, or wait a few days.');
      else {
        const changes = r.applied.length ? r.applied.map((c) => `${c.label} ${c.from} → ${c.to}: ${c.reason}`) : ['He didn’t change this time.'];
        const learned = r.insights.map((i) => `Learned: ${i}`);
        tell('He looked back on his week', `${[...changes, ...learned].join('\n')}\n\nThis counts as this week’s reflection. Undo it in Mind → Personality….`);
      }
    }
  } finally {
    // Back to the usual resting rules a minute after he's done.
    awakeUntil = Date.now() + 60 * 1000;
  }
}

async function copyReport() {
  const memoryMB = engine && engine.running ? await engine.memoryMB() : null;
  const text = buildReport({
    now: Date.now(),
    app: { version: app.getVersion(), electron: process.versions.electron, platform: process.platform, osRelease: os.release(), arch: process.arch, totalMemGB: Math.round(os.totalmem() / 2 ** 30) },
    settings: settings.values,
    engine: engine ? { state: engine.status(), ready: engine.ready, canDecide: engine.canDecide, files: engine.files, memoryMB } : null,
    rest,
    mind: mind ? mind.status() : null,
    database: store ? store.status(character.id) : null,
    hearing: hearStatus().text,
    song: { weekly: !!settings.get('weeklySong'), key: !!elevenKey(), songs: songs.listSongs(songsDir()).length, last: songState.error ? songState.status : null },
    context: companion.context,
    permissions: {
      screen: IS_MAC ? screenPermission() : 'n/a',
      apps: tracker.notes.apps,
      calendar: tracker.notes.calendar,
      calendarRead: tracker.calendarRead || null,
      signing: signing ? signing.kind : IS_MAC && app.isPackaged ? 'unknown' : 'not packaged',
    },
    counts: memory
      ? { facts: memory.facts.length, opinions: memory.opinions.length, diaryDays: Object.keys(memory.journal).length, growthWeeks: growth ? growth.history().length : 0, locked: ((personality && personality.locked) || []).length }
      : {},
  });
  try {
    await clipboard.writeText(text);
  } catch (e) {
    tell('Couldn’t copy the report', e.message);
    return;
  }
  tell('Report copied', 'A short report about how he’s doing is on your clipboard: paste it into a message. Nothing private is in it (no window titles, screen text, memories or notes), and you can read it before sending.');
}

function welcomeData(info) {
  const loginOk = process.platform === 'darwin' || process.platform === 'win32';
  const named = (w) => ({ ...w, title: names.fill(w.title), ...(w.text ? { text: names.fill(w.text) } : {}), ...(w.items ? { items: w.items.map(names.fill) } : {}) });
  return {
    ...info,
    sections: info.sections.map(named),
    whatsNew: info.whatsNew.map(named),
    userName: settings.get('userName'),
    userPronoun: settings.get('userPronoun'),
    // How he thinks: Gemma on this Mac or Gemini online, and whether a Gemini key is saved.
    brain: { engine: engineChoice(settings), hasKey: !!geminiKey(), keyFromEnv: !!geminiEnvKey(), memGB: Math.round(os.totalmem() / 2 ** 30) },
    switches: SWITCHES.map(([key, label, help]) => ({
      key,
      label,
      help,
      on: key === 'openAtLogin' ? loginOk && app.getLoginItemSettings().openAtLogin : !!settings.get(key),
      enabled: key === 'openAtLogin' ? loginOk : key === 'weeklySong' || key === 'voiceCommands' ? true : IS_MAC,
    })),
  };
}

/** The welcome window: on first run, once after an update (what's new), or from the menu. */
function showWelcome(manual = false) {
  const info = welcomeFor(settings.get('welcomeSeen'), { manual });
  if (!info) return;
  if (welcomeWin && !welcomeWin.isDestroyed()) {
    welcomeWin.show();
    welcomeWin.focus();
    return;
  }
  welcomeWin = new BrowserWindow({
    width: 460,
    height: 640,
    title: 'Welcome to Filo',
    resizable: true,
    alwaysOnTop: true,
    minimizable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'welcome-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  followYou(welcomeWin);
  welcomeWin.info = info;
  welcomeWin.loadFile(path.join(__dirname, '..', 'renderer', 'welcome.html'), { query: { name: character.name } });
  welcomeWin.webContents.on('did-finish-load', sendWelcome);
  welcomeWin.on('closed', () => {
    settings.set('welcomeSeen', info.version);
    welcomeWin = null;
    // A new install: start his models now, as you chose (Gemma if you didn't).
    if (waitForBrainChoice) restartEngine();
    // A new install: now pick your companion.
    if (!settings.get('characterChosen')) showPicker();
  });
}

// --------------------------------------------------------------- characters (Phase 9)

/** "Pick your companion": on a new install after the welcome, and from the menu. */
function showPicker() {
  if (pickerWin && !pickerWin.isDestroyed()) {
    pickerWin.show();
    pickerWin.focus();
    return;
  }
  pickerWin = new BrowserWindow({
    width: Math.max(480, 60 + characters.list().length * 214),
    height: 500,
    title: 'Pick your companion',
    resizable: true,
    alwaysOnTop: true,
    minimizable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'picker-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  followYou(pickerWin);
  pickerWin.loadFile(path.join(__dirname, '..', 'renderer', 'picker.html'));
  pickerWin.webContents.on('did-finish-load', () => {
    if (!pickerWin || pickerWin.isDestroyed()) return;
    pickerWin.webContents.send('picker', {
      characters: characters.list().map((c) => ({ id: c.id, name: c.name, concept: c.concept, self: c.self })),
      current: character.id,
    });
  });
  pickerWin.on('closed', () => {
    pickerWin = null;
  });
}

// "More info" on a character in the picker.
ipcMain.on('picker-info', (_e, id) => showCreator(id));

// ---------------------------------------------------------- character creator

// The character creator (src/creator/, served by src/main/creator.js): who
// a character is, its scenes, and the real simulation to play with. Opened
// from "More info" in the picker, or from the command line while making a
// character: `npx electron . --creator=<id>` (see CREATOR_ARG).
const CREATOR_SCHEME = 'filo-creator';
protocol.registerSchemesAsPrivileged([{ scheme: CREATOR_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let creatorWin = null;

/** Answer the creator page's requests from the app's own files. */
function serveCreator() {
  protocol.handle(CREATOR_SCHEME, (req) => {
    let r;
    try {
      const p = decodeURIComponent(new URL(req.url).pathname);
      // The app doesn't reload on file changes or make new items (the browser one does).
      if (p === '/creator/env.json') r = { status: 200, type: creator.TYPES['.json'], body: JSON.stringify({ host: 'app', live: false, makesItems: false }) };
      else r = creator.serve(p) || { status: 404, type: 'text/plain', body: 'Not found' };
    } catch (e) {
      console.error('Character creator:', e);
      r = { status: 500, type: 'text/plain', body: String(e && e.stack ? e.stack : e) };
    }
    return new Response(r.body, { status: r.status, headers: { 'Content-Type': r.type, 'Cache-Control': 'no-store' } });
  });
}

/** The creator on character `id` (the current one if none); one window, reused. */
function showCreator(id) {
  const url = `${CREATOR_SCHEME}://app/?character=${encodeURIComponent(id || character.id)}`;
  if (creatorWin && !creatorWin.isDestroyed()) {
    creatorWin.loadURL(url);
    creatorWin.show();
    creatorWin.focus();
    return;
  }
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  creatorWin = new BrowserWindow({
    width: Math.min(1320, area.width - 40),
    height: Math.min(880, area.height - 40),
    title: 'Character creator',
    minimizable: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  followYou(creatorWin);
  creatorWin.loadURL(url);
  creatorWin.on('closed', () => {
    creatorWin = null;
  });
}

ipcMain.on('picker-pick', (_e, id) => {
  settings.set('characterChosen', true);
  switchCharacter(id);
  if (pickerWin && !pickerWin.isDestroyed()) pickerWin.close();
});

/**
 * Another character takes his place on your screen, with its own mind,
 * memories and needs (its folder in your data); your reminders and settings
 * stay. The models keep running. It appears in a puff.
 */
function switchCharacter(id) {
  const next = characters.get(id);
  if (!companion || next.id === character.id) return;
  saveBrain();
  stopMind();
  for (const w of [brainWin, personalityWin, memoriesWin, chatWin, songWin]) if (w && !w.isDestroyed()) w.close();
  pendingSong = null;
  stopListening(false);
  character = next;
  settings.set('character', next.id);
  names.setNames({ character: next.name });
  let saved = null;
  let elapsed = 0;
  try {
    saved = JSON.parse(fs.readFileSync(brainFile(), 'utf8'));
    elapsed = Math.max(0, (Date.now() - (saved.savedAt || Date.now())) / 1000);
  } catch {
    // never been on your screen before: fresh
  }
  companion.setCharacter(next, saved, elapsed);
  if (tray) tray.setToolTip(next.name);
  if (win && !win.isDestroyed()) {
    win.webContents.once('did-finish-load', () => companion.emit('puff'));
    win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), { query: { character: next.id } });
  }
  if (ballWin && !ballWin.isDestroyed()) ballWin.loadFile(path.join(__dirname, '..', 'renderer', 'games', 'ball.html'), { query: { character: next.id } });
  startMind();
  refreshTrayMenu();
}

function sendWelcome() {
  if (welcomeWin && !welcomeWin.isDestroyed()) welcomeWin.webContents.send('welcome', welcomeData(welcomeWin.info));
}

ipcMain.on('welcome-set', (_e, key, on) => {
  if (typeof on !== 'boolean') return;
  if (key === 'watchApps') {
    settings.set('watchApps', on);
    applyWatchApps(on);
  } else if (key === 'readScreen') {
    applyReadScreen(on);
  } else if (key === 'readCalendar') {
    settings.set('readCalendar', on);
    applyReadCalendar(on);
  } else if (key === 'voiceCommands') {
    settings.set('voiceCommands', on);
    applyVoice(on);
  } else if (key === 'weeklySong') {
    settings.set('weeklySong', on);
    if (on && !elevenKey()) showSong();
  } else if (key === 'openAtLogin') {
    if (process.platform === 'darwin' || process.platform === 'win32') app.setLoginItemSettings({ openAtLogin: on });
  } else {
    return;
  }
  refreshTrayMenu();
  sendWelcome();
});

// What he calls you (the welcome window's "What should I call you?").
ipcMain.on('welcome-name', (_e, name) => {
  if (typeof name !== 'string' || !name.trim() || name.trim() === settings.get('userName')) return;
  settings.set('userName', name.trim().slice(0, 40));
  names.setNames({ user: settings.get('userName') });
});

// How he refers to you (he/him, she/her or they/them).
ipcMain.on('welcome-pronoun', (_e, pronoun) => {
  if (!names.PRONOUNS[pronoun]) return;
  settings.set('userPronoun', pronoun);
  names.setNames({ pronoun });
});

ipcMain.on('welcome-done', () => {
  if (welcomeWin && !welcomeWin.isDestroyed()) welcomeWin.close();
});

// How he thinks (the welcome window's "How should I think?"): Gemma or Gemini.
ipcMain.on('welcome-engine', (_e, id) => {
  switchEngine(id);
  sendWelcome();
});

// Your Gemini key, from the welcome window: kept in the Keychain; his mind
// starts again with it if he thinks with Gemini.
ipcMain.on('welcome-gemini-key', (_e, key) => {
  if (typeof key !== 'string') return;
  const saved = setGeminiKey(key.trim().slice(0, 200));
  if (saved && engineChoice(settings) === 'gemini' && !waitForBrainChoice) restartEngine();
  else refreshTrayMenu();
  if (welcomeWin && !welcomeWin.isDestroyed()) welcomeWin.webContents.send('welcome-key-saved', saved);
  sendWelcome();
});

/** He chirps: one of your clips if there are any for his mood, otherwise a generated one. */
function chirp(syllables) {
  // Quiet in meetings and while you watch something together.
  if (!win || win.isDestroyed() || !settings.get('sounds') || companion.context.quiet || watcher.current) return;
  if (hear.on) return; // the microphone shouldn't hear him (Phase 11)
  const band = companion.moodBand();
  const clip = sounds ? sounds.clipFor(band) : null;
  win.webContents.send('voice', { band, syllables, clip: clip ? clip.data : null });
}

function sendPersonality() {
  if (!personalityWin || personalityWin.isDestroyed() || !personality) return;
  const values = {};
  for (const [p] of P.sliders()) values[p] = P.getPath(personality, p);
  personalityWin.webContents.send('personality', {
    sliders: P.sliders(),
    values,
    locked: personality.locked || [],
    history: growth ? growth.history() : [],
  });
}

function showPersonality() {
  if (personalityWin && !personalityWin.isDestroyed()) {
    personalityWin.show();
    personalityWin.focus();
    return;
  }
  personalityWin = new BrowserWindow({
    width: 420,
    height: 640,
    title: `${character.name}'s personality`,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'personality-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  followYou(personalityWin);
  personalityWin.loadFile(path.join(__dirname, '..', 'renderer', 'personality.html'), { query: { name: character.name } });
  personalityWin.webContents.on('did-finish-load', sendPersonality);
  personalityWin.on('closed', () => {
    personalityWin = null;
  });
}

/** Save a changed personality; he notices a few seconds after you stop moving sliders. */
function updatePersonality(next) {
  personality = next;
  P.save(personalityFile(), personality);
  if (companion) companion.temperament = P.temperament(personality);
  sendPersonality();
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => mind && mind.setPersonality(P.normalize(personality)), 3000);
}

ipcMain.on('personality-set', (_e, p, value) => {
  if (!personality || typeof p !== 'string' || !Number.isFinite(value) || p.startsWith('relationship.')) return;
  const next = P.normalize(personality);
  if (P.setScore(next, p, value)) {
    // Growth counts its limits from where you put it.
    if (growth) growth.setBaseline(p, P.getPath(next, p));
    updatePersonality(next);
  }
});

// Lock a slider so growth never moves it (or unlock it).
ipcMain.on('personality-lock', (_e, p, locked) => {
  if (!personality || typeof p !== 'string') return;
  const next = P.normalize(personality);
  const set = new Set(next.locked);
  if (locked) set.add(p);
  else set.delete(p);
  next.locked = [...set];
  updatePersonality(P.normalize(next));
  // Nothing for him to notice, but growth must respect it straight away.
  if (mind) mind.personality.locked = personality.locked;
});

// Undo a week of growth (he notices, like any change).
ipcMain.on('growth-undo', (_e, week) => {
  if (!personality || !growth || typeof week !== 'string') return;
  updatePersonality(growth.undo(personality, week));
});

ipcMain.on('personality-reset', () => {
  if (!personality) return;
  // Back to the character's own traits and values; the relationship stays as it has grown.
  const next = P.defaultPersonality(character);
  next.relationship = { ...personality.relationship };
  next.locked = personality.locked || [];
  if (growth) {
    growth.state.baselines = {};
    growth.save();
  }
  updatePersonality(next);
});

ipcMain.on('personality-open-file', () => shell.showItemInFolder(personalityFile()));

function sendMemories() {
  if (memoriesWin && !memoriesWin.isDestroyed() && memory) memoriesWin.webContents.send('memories', { ...memory.all(), core: mind ? mind.coreFacts : [] });
}

function showMemories() {
  if (memoriesWin && !memoriesWin.isDestroyed()) {
    memory.load();
    sendMemories();
    memoriesWin.show();
    memoriesWin.focus();
    return;
  }
  memoriesWin = new BrowserWindow({
    width: 440,
    height: 620,
    title: `${character.name}'s memories`,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'memories-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  followYou(memoriesWin);
  memoriesWin.loadFile(path.join(__dirname, '..', 'renderer', 'memories.html'), { query: { name: character.name } });
  memoriesWin.webContents.on('did-finish-load', () => {
    if (memory) memory.load();
    sendMemories();
  });
  memoriesWin.on('closed', () => {
    memoriesWin = null;
  });
}

ipcMain.on('memory-forget', (_e, id) => {
  if (memory && typeof id === 'string' && memory.forget(id)) {
    if (mind) mind.refreshCore();
    sendMemories();
  }
});
ipcMain.on('memory-open-folder', () => shell.openPath(mindDir()));
ipcMain.on('memory-edit-notes', () => shell.openPath(path.join(mindDir(), 'about-you.md')));

// --------------------------------------------------------------- talking to him (Phase 11)

const hear = { on: false, source: null, engine: null, status: '', error: null, last: null, timer: null };
let listenReady = null;
let shortcutOn = null; // the shortcut that's registered, or null

/** The Apple speech helper (built by scripts/build-helpers.js), or null. */
function listenHelper() {
  const found = [
    process.resourcesPath && path.join(process.resourcesPath, 'helpers', 'companion-listen'),
    path.join(__dirname, '..', '..', 'helpers', 'companion-listen'),
  ].filter(Boolean);
  return found.find((f) => fs.existsSync(f)) || null;
}

/** Turn "Talk to me" on or off: the keyboard shortcut (the microphone only opens when you use it). */
function applyVoice(on) {
  if (shortcutOn) globalShortcut.unregister(shortcutOn);
  shortcutOn = null;
  hear.error = null;
  if (!on) {
    stopListening(false);
    return;
  }
  const key = settings.get('listenShortcut') || 'Alt+Space';
  try {
    if (globalShortcut.register(key, () => startListening('shortcut'))) shortcutOn = key;
    else hear.error = `${key} is taken by another app (change listenShortcut in settings.json)`;
  } catch (e) {
    hear.error = `shortcut ${key}: ${e.message}`;
  }
  if (settings.get('speechEngine') !== 'elevenlabs' && IS_MAC && !listenHelper()) hear.error = 'Apple speech recognition isn’t built yet: run npm run build-helpers (needs xcode-select --install)';
}

function listenWindow() {
  if (listenWin && !listenWin.isDestroyed()) return listenReady;
  listenWin = new BrowserWindow({
    show: false,
    width: 120,
    height: 80,
    webPreferences: {
      preload: path.join(__dirname, '..', 'listen-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  listenReady = new Promise((resolve) => listenWin.webContents.once('did-finish-load', resolve));
  listenWin.loadFile(path.join(__dirname, '..', 'renderer', 'listen.html'));
  listenWin.on('closed', () => {
    listenWin = null;
    listenReady = null;
  });
  return listenReady;
}

function hearSays(status, error = null) {
  hear.status = status;
  if (error) hear.error = error;
  if (hear.source === 'chat') {
    chatState.status = error ? `Couldn’t hear you: ${error}` : status;
    sendChat();
  }
}

/** Why he can't listen right now, or null. */
function cantListen() {
  if (!settings.get('voiceCommands')) return 'Talk to me is off (Mind → Talk to me)';
  if (!companion) return 'not ready';
  if (companion.context.quiet) return 'you’re in a meeting';
  if (companion.context.userAway) return 'you’re away';
  const engine = settings.get('speechEngine') === 'elevenlabs' ? 'elevenlabs' : 'apple';
  if (engine === 'apple' && !IS_MAC) return 'Apple speech recognition only works on a Mac (Mind → Listen with → ElevenLabs Scribe)';
  if (engine === 'apple' && !listenHelper()) return 'Apple speech recognition isn’t built yet: run npm run build-helpers';
  if (engine === 'elevenlabs' && !elevenKey()) return 'add your ElevenLabs key first (Mind → Our songs… → Settings)';
  return null;
}

/** ⌥ Space or 🎤: listen to one thing you say (again while listening: stop and use what was said). */
async function startListening(source = 'shortcut') {
  if (hear.on) {
    stopListening(true);
    return;
  }
  hear.source = source;
  const why = cantListen();
  if (why) {
    hearSays('', why);
    // Set-up problems get a message; meetings and being away just stay quiet.
    if (source === 'shortcut' && companion && !companion.context.quiet && !companion.context.userAway && settings.get('voiceCommands')) tell('Talk to me', `He can’t listen yet: ${why}.`);
    return;
  }
  if (IS_MAC) {
    const mic = systemPreferences.getMediaAccessStatus('microphone');
    if (mic === 'denied' || mic === 'restricted') {
      hearSays('', 'the microphone isn’t allowed (System Settings → Privacy & Security → Microphone → Filo)');
      tell('Filo can’t hear you', 'Allow the microphone for Filo in System Settings → Privacy & Security → Microphone, then try again.');
      return;
    }
    if (mic !== 'granted' && !(await systemPreferences.askForMediaAccess('microphone'))) {
      hearSays('', 'the microphone wasn’t allowed');
      return;
    }
  }
  hear.on = true;
  hear.error = null;
  hear.engine = settings.get('speechEngine') === 'elevenlabs' ? 'elevenlabs' : 'apple';
  companion.listening(true, '👂');
  hearSays('Listening… (just talk; it stops when you do)');
  clearTimeout(hear.timer);
  hear.timer = setTimeout(() => stopListening(true), 15000);
  await listenWindow();
  if (hear.on && listenWin) listenWin.webContents.send('listen-start');
}

/** Stop the microphone: `keep` what was said so far, or throw it away. */
function stopListening(keep) {
  if (!hear.on) return;
  clearTimeout(hear.timer);
  if (listenWin && !listenWin.isDestroyed()) listenWin.webContents.send('listen-stop', keep);
  if (!keep) {
    hear.on = false;
    companion.listening(false);
    hearSays('');
  }
}

ipcMain.on('listen-state', (_e, st) => {
  if (hear.on && st === 'talking') companion.listening(true, '👂 …');
});

ipcMain.on('listen-result', async (_e, r) => {
  if (!hear.on) return;
  hear.on = false;
  clearTimeout(hear.timer);
  if (!r || r.error || r.nothing || !r.wav) {
    companion.listening(false);
    hearSays(r && r.nothing ? 'I didn’t hear anything.' : '', r && r.error ? r.error : null);
    if (hear.source === 'chat') sendChat();
    return;
  }
  companion.listening(true, '…');
  hearSays('Working out what you said…');
  // The recording only lives until it's turned into text (hearing.transcribe deletes it).
  const file = path.join(os.tmpdir(), `companion-heard-${process.pid}-${Date.now()}.wav`);
  try {
    fs.writeFileSync(file, Buffer.from(r.wav), { mode: 0o600 });
    const acts = commandActivities();
    const text = await hearing.transcribe({
      engine: hear.engine,
      file,
      helper: listenHelper(),
      key: elevenKey(),
      locale: settings.get('speechLocale') || '',
      hints: commands.hints(characters.list().map((c) => c.name), acts),
    });
    companion.listening(false);
    hear.last = { text, at: Date.now() };
    if (!text) {
      hearSays('I didn’t catch that.');
      return;
    }
    hearSays(`Heard: “${text}”`);
    heard(text);
  } catch (e) {
    fs.rmSync(file, { force: true });
    companion.listening(false);
    console.error('Talk to me:', e.message);
    hearSays('', e.message);
  }
});

/** A night-only activity (Mori's fireflies, Nomi's moon) while it isn't night. */
function notYet(a) {
  return !!a.night && !(character.isNight && character.isNight(companion ? companion.context.hour : new Date().getHours()));
}

/**
 * His activities and the shared ones, as the parser matches them. Night-only
 * ones are left out by day, like in his menu (asked for anyway, it's a chat
 * message he answers).
 */
function commandActivities() {
  return [...character.activities.filter((a) => !notYet(a)).map((a) => ({ id: a.id, label: a.menu })), ...ACTIVITY_MENU.map(([id, label]) => ({ id, label }))];
}

/** Something you said: one of his commands, an answer to his question, or a chat message. */
function heard(text) {
  const cmd = commands.parseCommand(text, {
    now: Date.now(),
    names: [character.name],
    activities: commandActivities(),
    answers: companion.asking() ? companion.speech.answers : null,
    waiting: companion.showingNudge() || companion.showingReminder() || companion.showingGameInvite(),
  });
  if (!cmd) {
    // Not one of his commands: an open-ended message. The chat opens with it
    // and his reply goes there only (Sushant, 2026-10-25).
    showChat();
    sendWhenFree(text);
    return;
  }
  // It goes into his day like a chat message (the recording itself is never kept).
  if (mind && cmd.kind !== 'answer') mind.log.add({ kind: 'interact', text: `${names.user()} asked you out loud: "${text}"`, key: 'voice' });
  runCommand(cmd);
  refreshTrayMenu();
}

/**
 * A spoken chat message: sent as soon as he's done answering the one before
 * (typed chat ignores a message while he's busy; a spoken one would be lost).
 */
async function sendWhenFree(text) {
  const until = Date.now() + 2 * 60 * 1000;
  while (chatState.busy && Date.now() < until) await new Promise((r) => setTimeout(r, 300));
  chatSend(text, { bubble: false });
}

function runCommand(cmd) {
  const c = companion;
  switch (cmd.kind) {
    case 'answer':
      if (c.answerQuestion(cmd.index) != null && mind) mind.answered(cmd.index);
      break;
    case 'comeHere':
      callHere();
      break;
    case 'play':
      if (c.context.quiet) break;
      if (cmd.game === 'any' && c.showingGameInvite()) c.acceptGame();
      else c.startGame(cmd.game === 'any' ? GAMES[Math.floor(Math.random() * GAMES.length)] : cmd.game, true);
      break;
    case 'stopPlaying':
      if (c.game) c.endGame('done');
      break;
    case 'wake':
      if (c.state === 'sleep') c.pat();
      break;
    case 'nap':
      c.doActivity('sleep');
      break;
    case 'stayPut':
      c.stayPut(TUNING.stayPutFor);
      break;
    case 'moveAgain':
      c.endStayPut();
      break;
    case 'remind': {
      c.addNote(cmd.text, cmd.at);
      saveBrain();
      sendNotes();
      const t = new Date(cmd.at);
      // Holding up a nudge or a sign: he shows it once he's put that down.
      c.sayLater(`📝 ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`, 'happy');
      break;
    }
    case 'remindAsk':
      showNotes();
      break;
    case 'song':
      makeSong({ manual: true });
      break;
    case 'openChat':
      showChat();
      break;
    case 'done':
      c.pat();
      break;
    case 'activity':
      c.doActivity(cmd.id);
      break;
    default:
  }
}

ipcMain.on('chat-listen', () => startListening('chat'));

/** Talk to me, for the brain view and the report (never what you said). */
function hearStatus() {
  const engine = settings.get('speechEngine') === 'elevenlabs' ? 'ElevenLabs Scribe (online)' : 'Apple, on this Mac';
  if (!settings.get('voiceCommands')) return { text: `off (${engine})` };
  const parts = [`${shortcutOn || 'no shortcut'} · ${engine}`];
  if (hear.on) parts.push('listening now');
  if (hear.error) parts.push(`problem: ${hear.error}`);
  if (IS_MAC) parts.push(`microphone: ${systemPreferences.getMediaAccessStatus('microphone')}`);
  return { text: parts.join(' · ') };
}

// --------------------------------------------------------------- the weekly song (src/main/mind/song.js)

const songState = { current: null, busy: false, status: '', error: false };
let pendingSong = null; // { id, text }: his "I made us a song!" bubble
let lastSongTry = 0;
let danceTimer = null;
let songAudioSent = null; // the song whose audio the window has (so status updates don't restart it)

function songsDir() {
  return path.join(mindDir(), 'songs');
}

// Your ElevenLabs key: asked in the app, kept encrypted with the macOS
// Keychain (safeStorage), never in the build. ELEVENLABS_API_KEY wins (testing).
function keyFile() {
  return path.join(app.getPath('userData'), 'elevenlabs.key');
}

function elevenKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  try {
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(fs.readFileSync(keyFile())).trim() || null : null;
  } catch {
    return null;
  }
}

function setElevenKey(key) {
  if (!key) {
    fs.rmSync(keyFile(), { force: true });
    return true;
  }
  if (!safeStorage.isEncryptionAvailable()) return false;
  fs.writeFileSync(keyFile(), safeStorage.encryptString(key), { mode: 0o600 });
  return true;
}

// Your Gemini key (Mind → Think with → Gemini): asked in the welcome window,
// kept encrypted with the macOS Keychain like the ElevenLabs key, never in
// the build. GOOGLE_API_KEY / GEMINI_API_KEY win (testing).
function geminiKeyFile() {
  return path.join(app.getPath('userData'), 'gemini.key');
}

function geminiEnvKey() {
  return (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '').trim() || null;
}

function geminiKey() {
  if (geminiEnvKey()) return geminiEnvKey();
  try {
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(fs.readFileSync(geminiKeyFile())).trim() || null : null;
  } catch {
    return null;
  }
}

function setGeminiKey(key) {
  if (!key) {
    fs.rmSync(geminiKeyFile(), { force: true });
    return true;
  }
  if (!safeStorage.isEncryptionAvailable()) return false;
  fs.writeFileSync(geminiKeyFile(), safeStorage.encryptString(key), { mode: 0o600 });
  return true;
}

function showSong(id = null, autoplay = false) {
  const list = songs.listSongs(songsDir());
  songState.current = id || songState.current || (list[0] && list[0].id) || null;
  if (songState.current && !list.some((s) => s.id === songState.current)) songState.current = list[0] ? list[0].id : null;
  if (songWin && !songWin.isDestroyed()) {
    sendSong(autoplay);
    songWin.show();
    songWin.focus();
    return;
  }
  songWin = new BrowserWindow({
    width: 400,
    height: 620,
    title: `${character.name}’s songs`,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'song-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  followYou(songWin);
  songWin.loadFile(path.join(__dirname, '..', 'renderer', 'song.html'));
  songWin.webContents.on('did-finish-load', () => {
    songAudioSent = null;
    sendSong(autoplay);
  });
  songWin.on('closed', () => {
    songWin = null;
    songAudioSent = null;
    dance(false);
  });
}

/** The window's list and settings, then the current song's audio. */
function sendSong(autoplay = false) {
  if (!songWin || songWin.isDestroyed()) return;
  const list = songs.listSongs(songsDir());
  songWin.webContents.send('song', {
    name: character.name,
    songs: list.map(({ file, ...s }) => s),
    current: songState.current,
    keySet: !!elevenKey(),
    keyFromEnv: !!process.env.ELEVENLABS_API_KEY,
    weekly: !!settings.get('weeklySong'),
    busy: songState.busy,
    status: songState.status,
    error: songState.error,
  });
  const cur = list.find((s) => s.id === songState.current);
  if (cur && (autoplay || cur.id !== songAudioSent)) {
    try {
      songWin.webContents.send('song-audio', { id: cur.id, audio: fs.readFileSync(cur.file), autoplay });
      songAudioSent = cur.id;
    } catch (e) {
      console.error('Could not read the song:', e.message);
    }
  }
}

/** While the song plays he dances: happy hops, unless he's busy with something else. */
function dance(on) {
  clearInterval(danceTimer);
  danceTimer = null;
  if (!on || !companion) return;
  let n = 0;
  const step = () => companion.mindAction(n++ % 3 === 2 ? 'jump' : 'happy');
  step();
  danceTimer = setInterval(step, 1600);
}

function songStatus(text, error = false) {
  songState.status = text;
  songState.error = error;
  sendSong();
}

/**
 * Make this week's song: the week from the database, his diary, his own
 * words and style (only from his personality), the privacy checks, then
 * ElevenLabs. `manual`: from the window or Try it now (the window opens and
 * plays it); otherwise he announces it with a bubble.
 */
async function makeSong({ manual = false } = {}) {
  if (songState.busy || !mind || !memory) return null;
  const key = elevenKey();
  if (!key) {
    if (manual) {
      showSong();
      songStatus('Add your ElevenLabs key under Settings first.', true);
    }
    return null;
  }
  if (!engine || !settings.get('mind')) {
    if (manual) {
      showSong();
      songStatus('His mind is off: turn on Mind → Think and talk for himself.', true);
    }
    return null;
  }
  const who = character.id;
  songState.busy = true;
  lastSongTry = Date.now();
  if (manual) showSong();
  try {
    awakeUntil = Math.max(awakeUntil, Date.now() + REST.forceFor);
    if (!engine.ready) {
      songStatus('Waking up his mind… (a few seconds)');
      if (!(await voiceReady())) throw new Error(`his mind didn't start: ${engine.status()}`);
    }
    songStatus('Adding up our week…');
    const now = Date.now();
    const week = store && store.ready ? await store.week(who, { to: now }).catch(() => null) : null;
    const diary = weekDiary(memory, now);
    songStatus(`${character.name} is writing the words…`);
    let song = null;
    for (let i = 0; i < 2 && !song; i++) {
      const raw = await engine.think({ system: songs.songSystem(personality, memory.notes, mind.coreFacts), user: songs.songPrompt({ week, diary }), schema: songs.SCHEMA });
      song = songs.parseSong(raw);
    }
    if (!song) throw new Error('he couldn’t find the words this time');
    // Nothing private may be sung: your blocklist, then the decision model.
    const block = settings.get('privacyBlock');
    if (songs.blockedWords(song, block)) throw new Error('the words touched something on your privacy blocklist, so it wasn’t sent');
    if (engine.canDecide) {
      const a = await engine.decide(`Song lyrics: ${songs.songText(song)}`, { sensitive: privacy.MODEL_QUESTION }).catch(() => null);
      const p = a && a.sensitive && a.sensitive.probabilities;
      if (p && Number(p.A) >= 0.5) throw new Error('the words looked private, so they weren’t sent');
    }
    songStatus('ElevenLabs is singing it… (up to a minute)');
    const audio = await songs.compose(songs.compositionPlan(song, settings.get('songSinger')), key);
    if (character.id !== who) throw new Error('switched characters while it was being made');
    const saved = songs.saveSong(songsDir(), song, audio, { week, now: Date.now() });
    mind.log.add({ kind: 'song', text: `You made a song for ${names.user()}: "${saved.title}"`, title: saved.title });
    songState.current = saved.id;
    songState.busy = false;
    songStatus('');
    if (manual || (songWin && !songWin.isDestroyed())) {
      showSong(saved.id, true);
    } else if (!companion.context.quiet && !watcher.current) {
      const text = 'I made us a song! 🎵 Click me';
      if (companion.say(text, 'happy')) pendingSong = { id: saved.id, text };
    }
    return saved;
  } catch (e) {
    songState.busy = false;
    console.error('Weekly song:', e.message);
    songStatus(`Couldn’t make the song: ${e.message}`, true);
    return null;
  } finally {
    songState.busy = false;
    refreshTrayMenu();
  }
}

/** Every 5 minutes: once a week (from Sunday 6 pm), when you're here and he isn't busy, he makes the song. */
function checkWeeklySong() {
  if (!settings || !settings.get('weeklySong') || !mind || songState.busy || !elevenKey()) return;
  if (!engine || !engine.ready || companion.context.userAway || companion.context.quiet || watcher.current || companion.board()) return;
  if (Date.now() - lastSongTry < 60 * 60 * 1000) return; // after a failure, try again in an hour
  if (!songs.songDue(songsDir(), Date.now())) return;
  makeSong();
}

ipcMain.on('song-select', (_e, id) => {
  if (typeof id !== 'string' || id === songState.current) return;
  songState.current = id;
  sendSong(true);
});
ipcMain.on('song-playing', (_e, on) => dance(!!on));
ipcMain.on('song-make', () => makeSong({ manual: true }));
ipcMain.on('song-weekly', (_e, on) => {
  settings.set('weeklySong', !!on);
  sendSong();
});
ipcMain.on('song-key', (_e, key) => {
  if (typeof key !== 'string') return;
  if (!setElevenKey(key.trim())) songStatus('Couldn’t save the key: this computer’s keychain isn’t available.', true);
  else songStatus(key.trim() ? 'Key saved.' : 'Key removed.');
});

// --------------------------------------------------------------- Tiger Data (src/main/mind/store.js)

/** Start the shared database, loading every character's old event logs; then a sample every minute. */
function startStore() {
  store = new Store({ dir: databaseDir(app.getPath('userData')) });
  const imports = characters.list().map((c) => {
    const dir = path.join(characterDir(app.getPath('userData'), c.id), 'mind');
    return { companion: c.id, files: [path.join(dir, 'events.1.jsonl'), path.join(dir, 'events.jsonl')] };
  });
  store.start({ imports }).then((ok) => console.log(`Database: ${store.status()}`, ok ? '' : '(he works without it)'));
  storeTimer = setInterval(() => {
    sampleMinute();
    syncMeaning();
  }, 60 * 1000);
}

/** Once a minute: the character's mood and needs, and what you're on (as his mind last saw it). */
function sampleMinute() {
  if (!store || !store.ready || !companion) return;
  const seen = mind ? mind.log.last(['observe']) : null;
  store.addMinute(character.id, {
    mood: companion.moodBand(),
    needs: companion.needs,
    app: seen && seen.app,
    site: seen && seen.site,
    private: !!(seen && seen.private),
    away: !!companion.context.userAway,
    quiet: !!companion.context.quiet,
  });
}

let storeStopped = false;
let syncingMeaning = false;

/**
 * Your name is in almost every memory, which made everything look alike
 * (measured: unrelated memories 0.3-0.45); fingerprints leave it out.
 */
function plainForMeaning(text) {
  const name = names.user();
  if (!name) return text;
  return String(text).replace(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), 'they');
}

/** His memories as the database fingerprints them (the Markdown files stay the real ones). */
function memoryItems(m) {
  return [
    ...m.facts.map((f) => ({ ...f, kind: 'fact' })),
    ...m.opinions.map((o) => ({ ...o, kind: 'opinion' })),
    ...Object.values(m.journal).flatMap((j) => j.lines.map((l) => ({ ...l, kind: 'journal' }))),
    ...Object.values(m.weeks).map((w) => ({ ...w, kind: 'week' })),
  ];
}

/** Every few minutes (and when his mind starts): fingerprint new memories, drop forgotten ones. */
async function syncMeaning() {
  if (syncingMeaning || !store || !store.ready || !store.vectors || !engine || !engine.canEmbed || !memory) return;
  syncingMeaning = true;
  const id = character.id;
  try {
    const r = await store.syncMemories(id, memoryItems(memory), (texts) => engine.embed(texts.map(plainForMeaning)));
    if (r && (r.added || r.removed)) console.log(`Memories by meaning (${id}): +${r.added} −${r.removed}`);
  } catch (e) {
    console.error('Memories by meaning:', e.message);
  } finally {
    syncingMeaning = false;
  }
}

// Fully local: nothing in his windows may reach the internet. (The models run
// in llama-server on 127.0.0.1; see src/main/mind/engine.js.)
function blockNetwork() {
  const local = /^(https?|wss?):\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i;
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (d, cb) => {
    cb({ cancel: !local.test(d.url) });
  });
}

// --------------------------------------------------------------- app

// `--creator` or `--creator=<id>` opens the character creator: in the Filo
// that's already running (handed over with the single-instance lock), or
// once this one has started.
const CREATOR_ARG = (() => {
  const a = process.argv.find((x) => x === '--creator' || x.startsWith('--creator='));
  return a == null ? null : a.slice('--creator='.length) || '';
})();

if (!app.requestSingleInstanceLock({ creator: CREATOR_ARG })) {
  app.quit();
} else {
  // Started again: the creator if asked for, else he comes over to you.
  app.on('second-instance', (_e, _argv, _cwd, data) => {
    if (app.isReady() && data && data.creator != null) showCreator(data.creator);
    else callHere();
  });
  app.whenReady().then(() => {
    serveCreator();
    if (process.platform === 'darwin' && app.dock) app.dock.hide();
    try {
      // The data of the app's older names (Companion, Togepi), copied once.
      const from = migrate({ appData: app.getPath('appData'), userData: app.getPath('userData') });
      if (from) console.log(`Copied the old data from ${from}`);
    } catch (e) {
      console.error('Could not copy the old data:', e.message);
    }
    blockNetwork();
    createWindow();
    if (CREATOR_ARG != null) showCreator(CREATOR_ARG);
    startStore();
    setInterval(checkWeeklySong, 5 * 60 * 1000);
    // Monitors plugged in / unplugged / rearranged.
    const updateScreens = () => {
      if (companion) companion.setScreens(allDisplays());
    };
    screen.on('display-added', updateScreens);
    screen.on('display-removed', updateScreens);
    screen.on('display-metrics-changed', () => {
      updateScreens();
    });
  });
  app.on('before-quit', () => {
    saveBrain();
    if (engine) engine.stop();
  });
  // The database is stopped cleanly before the app goes (a few seconds at most).
  app.on('will-quit', (e) => {
    globalShortcut.unregisterAll();
    if (!store || storeStopped) return;
    e.preventDefault();
    storeStopped = true;
    clearInterval(storeTimer);
    store.stop().finally(() => app.quit());
  });
  app.on('window-all-closed', () => app.quit());
}
