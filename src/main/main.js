'use strict';

const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, shell, session, systemPreferences, desktopCapturer } = require('electron');
const { Companion, TUNING } = require('./companion');
const { ContextTracker } = require('./context');
const { Settings } = require('./settings');
const { AppWatcher } = require('./mac/front-app');
const { CalendarWatcher } = require('./mac/calendar');
const { px } = require('./px');
const { toScreen, screenAt } = require('./screens');
const { BALL } = require('./games/fetch');
const P = require('./mind/personality');
const { Mind } = require('./mind/mind');
const { Engine } = require('./mind/engine');
const { EventLog } = require('./mind/events');
const { SoundLibrary } = require('./mind/sounds');
const { Memory, pruneEvents } = require('./mind/memory');
const { Attention } = require('./mind/attention');
const { Growth } = require('./mind/growth');
const { ScreenReader, screenKey } = require('./mind/screen');

const CONTEXT_MS = 2000; // how often he checks on you (idle time, battery, …)
const SAVE_MS = 60 * 1000; // how often his brain is saved to disk

// Entries for the "Do something…" menu: [activity, label].
const ACTIVITY_MENU = [
  ['eat', 'Eat an apple'],
  ['play', 'Play with the ball'],
  ['flower', 'Smell a flower'],
  ['talk', 'Chatter'],
  ['wave', 'Wave'],
  ['adventure', 'Go on an adventure'],
  ['jump', 'Jump'],
  ['sit', 'Sit down'],
  ['backView', 'Turn around'],
];

// The window is a small transparent square that travels around the screen.
// The character's feet sit at (WIN_W / 2, WIN_H - FOOT_MARGIN) inside it.
const WIN_W = 220;
const WIN_H = 240; // tall enough for a sticky note held over his head
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
let lastWinPos = { x: NaN, y: NaN };
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
const IS_MAC = process.platform === 'darwin';

// --------------------------------------------------------------- opt-in context (macOS)

function applyWatchApps(on) {
  if (frontApp) frontApp.stop();
  frontApp = null;
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
  if (!on || !IS_MAC) return;
  calendar = new CalendarWatcher((r) => {
    if (r.error) {
      tracker.setNote('calendar', r.error);
      return;
    }
    tracker.setNote('calendar', null);
    tracker.setEvents(r.events);
  });
  calendar.start();
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
  win.showInactive();
}

// --------------------------------------------------------------- memory

function brainFile() {
  return path.join(app.getPath('userData'), 'brain.json');
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

function startContext() {
  tracker = new ContextTracker();
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
  powerMonitor.on('unlock-screen', () => tracker.setLocked(false));
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
  if (brainWin && !brainWin.isDestroyed()) {
    brainWin.show();
    brainWin.focus();
    return;
  }
  brainWin = new BrowserWindow({
    width: 380,
    height: 560,
    title: "Togepi's brain",
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
  brainWin.loadFile(path.join(__dirname, '..', 'renderer', 'brain.html'));
  const send = () => {
    if (brainWin && !brainWin.isDestroyed() && companion) brainWin.webContents.send('brain', { ...companion.brainSnapshot(), mind: mind ? mind.status() : null });
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
  const start = screen.getCursorScreenPoint();
  const bounds = boundsForPoint(start);

  companion = new Companion({
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
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    win.showInactive();
    startLoop();
    startContext();
    startMind();
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
  ballWin.loadFile(path.join(__dirname, '..', 'renderer', 'games', 'ball.html'));
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

function tick() {
  if (!win || win.isDestroyed()) return;
  const now = Date.now();
  const dt = (now - lastTick) / 1000;
  lastTick = now;

  const cursor = screen.getCursorScreenPoint();
  attention.cursorAt(cursor);

  // A press turns into a pick-up once the cursor moves; held still, it's petting.
  if (press && companion.state !== 'grabbed') {
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

  const wx = px(companion.x - WIN_W / 2);
  const wy = px(companion.y - (WIN_H - FOOT_MARGIN));
  if (wx !== lastWinPos.x || wy !== lastWinPos.y) {
    win.setPosition(wx, wy);
    lastWinPos = { x: wx, y: wy };
  }

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
  boardWin.loadFile(path.join(__dirname, '..', 'renderer', 'games', 'board.html'));
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

ipcMain.on('press', () => {
  const p = screen.getCursorScreenPoint();
  // Taking the ball he's holding out to you.
  if (companion.hitPart(p) === 'ball' && companion.grabBall(p)) {
    ballPress = true;
    return;
  }
  press = { x: p.x, y: p.y, t: Date.now() };
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
  } else if (held < CLICK_MAX) {
    // The meeting sign's "Join" tag opens the call; his speech bubble goes
    // away when clicked; anywhere else is a pat.
    const part = companion.hitPart(at);
    const link = part === 'join' ? companion.meetingLink() : null;
    if (part === 'speech') {
      companion.dismissSpeech();
      if (mind) mind.reacted('clicked');
    } else if (link) {
      companion.acknowledgeReminder();
      shell.openExternal(link).catch(() => {});
    } else {
      companion.pat();
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
  buildMenu().popup({ window: win });
});

ipcMain.on('tray-icon', (_e, dataUrl) => {
  if (tray || typeof dataUrl !== 'string') return;
  let image = nativeImage.createFromDataURL(dataUrl);
  image = image.resize({ width: process.platform === 'darwin' ? 18 : 24 });
  tray = new Tray(image);
  tray.setToolTip('Togepi');
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
  const sleeping = companion && companion.state === 'sleep';
  const items = [
    { label: 'Come here', click: callHere },
    {
      label: 'Do something…',
      submenu: ACTIVITY_MENU.map(([name, label]) => ({
        label,
        enabled: companion ? companion.isGrounded() : false,
        click: () => {
          companion.doActivity(name);
          refreshTrayMenu();
        },
      })),
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
  items.push({ label: 'Remind me…', click: showNotes });
  items.push({ label: 'Wellbeing', submenu: wellbeingMenu() });
  items.push({ label: 'Mind', submenu: mindMenu() });
  items.push({
    label: 'Brain',
    submenu: [
      { label: 'Show his brain…', click: showBrain },
      { type: 'separator' },
      {
        label: 'Notice which app I’m using',
        type: 'checkbox',
        enabled: IS_MAC,
        checked: !!(settings && settings.get('watchApps')),
        click: (item) => {
          settings.set('watchApps', item.checked);
          applyWatchApps(item.checked);
          refreshTrayMenu();
        },
      },
      {
        label: 'Let him read my screen',
        type: 'checkbox',
        enabled: IS_MAC,
        checked: !!(settings && settings.get('readScreen')),
        click: (item) => {
          applyReadScreen(item.checked);
          refreshTrayMenu();
        },
      },
      {
        label: 'Read my calendar',
        type: 'checkbox',
        enabled: IS_MAC,
        checked: !!(settings && settings.get('readCalendar')),
        click: (item) => {
          settings.set('readCalendar', item.checked);
          applyReadCalendar(item.checked);
          refreshTrayMenu();
        },
      },
    ],
  });
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
    { label: engine ? `Mind: ${engine.status().split(' — ')[0]}` : 'Mind: off', enabled: false },
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
      label: 'Chirp when he talks',
      type: 'checkbox',
      checked: !!(settings && settings.get('sounds')),
      click: (item) => {
        settings.set('sounds', item.checked);
        refreshTrayMenu();
      },
    },
    { type: 'separator' },
    { label: 'Personality…', click: showPersonality },
    { label: 'Memories…', click: showMemories },
    { label: 'Open sounds folder…', click: () => sounds && shell.openPath(sounds.dir) },
    { label: 'Privacy blocklist… (settings.json)', click: () => settings && shell.openPath(settings.file) },
    { label: 'Show his memory folder…', click: () => shell.openPath(mindDir()) },
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
  return path.join(app.getPath('userData'), 'mind');
}

function personalityFile() {
  return path.join(mindDir(), 'personality.md');
}

function eventsFile() {
  return path.join(mindDir(), 'events.jsonl');
}

function startMind() {
  personality = P.load(personalityFile());
  sounds = new SoundLibrary(path.join(app.getPath('userData'), 'sounds'));
  memory = new Memory(mindDir());
  // The raw event log is kept 90 days (his diary keeps the gist); checked daily.
  const prune = () => pruneEvents(eventsFile());
  prune();
  setInterval(prune, 24 * 3600 * 1000);
  // You can edit his memory files by hand: pick up the changes.
  for (const f of ['about-sushant.md', 'about-me.md']) {
    fs.watchFile(path.join(mindDir(), f), { interval: 3000 }, () => {
      memory.load();
      sendMemories();
    });
  }
  growth = new Growth(mindDir());
  companion.temperament = P.temperament(personality);
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
    log: new EventLog({ file: eventsFile() }),
    getSelf: () => ({
      band: companion.moodBand(),
      needs: companion.needs,
      state: companion.state,
      hour: companion.context.hour,
      quiet: !!companion.context.quiet,
      away: !!companion.context.userAway,
      awayFor: companion.context.awayFor || 0,
      asleep: companion.state === 'sleep',
      busy: !!companion.board(),
    }),
    onSpeak: ({ text, action }) => companion.say(text, action),
    getBlocklist: () => settings.get('privacyBlock'),
  });
  mindTimer = setInterval(() => {
    mind.tick();
    updateAttention();
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
    if (!a) return;
    const view = { typing: v.typing, cursorOn: v.cursorOn, others: v.others, via: v.via };
    const reading = canReadScreen();
    if (settings.get('readScreen') && IS_MAC) {
      tracker.setNote('screen', screenPermission() === 'granted' ? null : 'To let him read your screen, allow Togepi under System Settings → Privacy & Security → Screen & System Audio Recording, then quit and reopen him.');
    }
    if (v.settled) {
      let r = reading ? reader.readingFor(screenKey(a)) || (await reader.look(v, { force: true })) : null;
      if (r && r.key !== screenKey(a)) r = null;
      await mind.observe({ app: a.app, title: a.title, url: a.url, private: a.private, screen: a.screen, via: v.via, view, reading: r });
    } else {
      mind.setView(view);
      if (reading) {
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
  if (on && !engine) {
    engine = new Engine({ pidFile: path.join(mindDir(), 'engine.pids') });
    mind.engine = engine;
    engine
      .start()
      .catch((e) => console.error('Mind engine:', e.message))
      .finally(refreshTrayMenu);
  } else if (!on && engine) {
    engine.stop();
    engine = null;
    mind.engine = null;
  }
}

/** He chirps: one of your clips if there are any for his mood, otherwise a generated one. */
function chirp(syllables) {
  if (!win || win.isDestroyed() || !settings.get('sounds') || companion.context.quiet) return;
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
    title: "Togepi's personality",
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
  personalityWin.loadFile(path.join(__dirname, '..', 'renderer', 'personality.html'));
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
  // Back to Togepi's traits and values; the relationship stays as it has grown.
  const next = P.defaultPersonality();
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
  if (memoriesWin && !memoriesWin.isDestroyed() && memory) memoriesWin.webContents.send('memories', memory.all());
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
    title: "Togepi's memories",
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
  memoriesWin.loadFile(path.join(__dirname, '..', 'renderer', 'memories.html'));
  memoriesWin.webContents.on('did-finish-load', () => {
    if (memory) memory.load();
    sendMemories();
  });
  memoriesWin.on('closed', () => {
    memoriesWin = null;
  });
}

ipcMain.on('memory-forget', (_e, id) => {
  if (memory && typeof id === 'string' && memory.forget(id)) sendMemories();
});
ipcMain.on('memory-open-folder', () => shell.openPath(mindDir()));
ipcMain.on('memory-edit-notes', () => shell.openPath(path.join(mindDir(), 'about-sushant.md')));

// Fully local: nothing in his windows may reach the internet. (The models run
// in llama-server on 127.0.0.1; see src/main/mind/engine.js.)
function blockNetwork() {
  const local = /^(https?|wss?):\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i;
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (d, cb) => {
    cb({ cancel: !local.test(d.url) });
  });
}

// --------------------------------------------------------------- app

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => callHere());
  app.whenReady().then(() => {
    if (process.platform === 'darwin' && app.dock) app.dock.hide();
    blockNetwork();
    createWindow();
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
  app.on('window-all-closed', () => app.quit());
}
