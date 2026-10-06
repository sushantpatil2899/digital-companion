'use strict';

const path = require('path');
const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage } = require('electron');
const { Companion } = require('./companion');

// The window is a small transparent square that travels around the screen.
// The character's feet sit at (WIN_W / 2, WIN_H - FOOT_MARGIN) inside it.
const WIN_W = 220;
const WIN_H = 220;
const FOOT_MARGIN = 12;
const TICK_MS = 1000 / 60;

// How far the cursor must travel (px) or how long the button must be held (s)
// before a press turns into picking him up rather than a poke.
const DRAG_THRESHOLD = 5;
const HOLD_THRESHOLD = 0.18;

// Click-through on the transparent parts of the window relies on polling the
// cursor position. On Linux/X11 Electron's cursor position goes stale while a
// window ignores the mouse, so he could become impossible to grab. There the
// whole (small) window stays clickable instead.
const CLICK_THROUGH = process.platform !== 'linux';

if (process.platform === 'linux') {
  // Needed for transparent windows on many X11 setups.
  app.commandLine.appendSwitch('enable-transparent-visuals');
}

let win = null;
let tray = null;
let companion = null;
let timer = null;
let lastTick = 0;
let ignoringMouse = null;
let press = null; // { x, y, t } while the mouse button is down on him
let lastWinPos = { x: NaN, y: NaN };

function boundsForPoint(point) {
  const display = screen.getDisplayNearestPoint({ x: Math.round(point.x), y: Math.round(point.y) });
  const wa = display.workArea;
  return { left: wa.x, right: wa.x + wa.width, top: wa.y, floor: wa.y + wa.height };
}

function createWindow() {
  const start = screen.getCursorScreenPoint();
  const bounds = boundsForPoint(start);

  companion = new Companion({
    bounds,
    halfWidth: 42,
    height: 95,
    x: (bounds.left + bounds.right) / 2,
    // Drop in from a bit above the floor so he lands on startup.
    y: bounds.floor - 260,
  });

  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x: Math.round(companion.x - WIN_W / 2),
    y: Math.round(companion.y - (WIN_H - FOOT_MARGIN)),
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
  });
  win.on('closed', () => {
    win = null;
    stopLoop();
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

  // Turn a press into a pick-up once the cursor moves or is held long enough.
  if (press && companion.state !== 'grabbed') {
    const moved = Math.hypot(cursor.x - press.x, cursor.y - press.y);
    const held = (now - press.t) / 1000;
    if (moved > DRAG_THRESHOLD || held > HOLD_THRESHOLD) companion.grab(press);
  }
  if (companion.state === 'grabbed') companion.drag(cursor);

  // While airborne or held he may cross onto another monitor.
  companion.setBounds(boundsForPoint({ x: companion.x, y: companion.y - 10 }));
  companion.update(dt, cursor);

  const wx = Math.round(companion.x - WIN_W / 2);
  const wy = Math.round(companion.y - (WIN_H - FOOT_MARGIN));
  if (wx !== lastWinPos.x || wy !== lastWinPos.y) {
    win.setPosition(wx, wy);
    lastWinPos = { x: wx, y: wy };
  }

  updateClickThrough(cursor);

  win.webContents.send('frame', {
    ...companion.snapshot(),
    events: companion.drainEvents(),
    // Cursor relative to his feet, so the eyes can follow it.
    cursor: { x: cursor.x - companion.x, y: cursor.y - companion.y },
  });
}

// Let clicks pass through the transparent parts of the window: only the
// area around his body catches the mouse.
function updateClickThrough(cursor) {
  if (!CLICK_THROUGH) return;
  let over = true;
  if (!press && companion.state !== 'grabbed') {
    const dx = (cursor.x - companion.x) / 52;
    const dy = (cursor.y - (companion.y - 46)) / 56;
    over = dx * dx + dy * dy <= 1;
  }
  const ignore = !over;
  if (ignore !== ignoringMouse) {
    ignoringMouse = ignore;
    win.setIgnoreMouseEvents(ignore);
  }
}

// --------------------------------------------------------------- input

ipcMain.on('press', () => {
  const p = screen.getCursorScreenPoint();
  press = { x: p.x, y: p.y, t: Date.now() };
});

ipcMain.on('release', () => {
  if (!press) return;
  press = null;
  if (companion.state === 'grabbed') companion.release();
  else companion.poke();
});

ipcMain.on('pet', (_e, dt) => {
  if (typeof dt === 'number' && dt > 0 && dt < 0.5) companion.pet(dt);
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
  tray.setToolTip('Desktop Companion');
  tray.setContextMenu(buildMenu());
  tray.on('click', () => callHere());
});

// --------------------------------------------------------------- menus

function callHere() {
  if (!companion) return;
  // Drop him from just above the cursor.
  const c = screen.getCursorScreenPoint();
  press = null;
  companion.setBounds(boundsForPoint(c));
  companion.x = c.x;
  companion.y = Math.min(c.y - 40, companion.bounds.floor);
  companion.vx = 0;
  companion.vy = 0;
  companion.enter('fall');
}

function refreshTrayMenu() {
  if (tray) tray.setContextMenu(buildMenu());
}

function buildMenu() {
  const sleeping = companion && companion.state === 'sleep';
  const items = [
    { label: 'Come here', click: callHere },
    {
      label: sleeping ? 'Wake up' : 'Take a nap',
      click: () => {
        if (sleeping) companion.poke();
        else if (companion.isGrounded()) companion.enter('sleep', 60);
        refreshTrayMenu();
      },
    },
    {
      label: 'Stay put (no wandering)',
      type: 'checkbox',
      checked: companion ? companion.paused : false,
      click: (item) => {
        companion.paused = item.checked;
        refreshTrayMenu();
      },
    },
  ];
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

// --------------------------------------------------------------- app

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => callHere());
  app.whenReady().then(() => {
    if (process.platform === 'darwin' && app.dock) app.dock.hide();
    createWindow();
    screen.on('display-metrics-changed', () => {
      if (companion) companion.setBounds(boundsForPoint({ x: companion.x, y: companion.y - 10 }));
    });
  });
  app.on('window-all-closed', () => app.quit());
}
