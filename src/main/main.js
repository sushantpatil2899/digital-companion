'use strict';

const path = require('path');
const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage } = require('electron');
const { Companion } = require('./companion');

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
const WIN_H = 220;
const FOOT_MARGIN = 18;
const TICK_MS = 1000 / 60;

// Pressing on him and moving the cursor more than this (px) picks him up.
// Holding the button down without moving pets him; a quick click is a pat.
const DRAG_THRESHOLD = 6;
const PET_DELAY = 0.2; // s of holding still before it counts as petting
const CLICK_MAX = 0.25; // s; a shorter press is a click (pat on the head)

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
    halfWidth: 56,
    height: 142,
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

  // A press turns into a pick-up once the cursor moves; held still, it's petting.
  if (press && companion.state !== 'grabbed') {
    const moved = Math.hypot(cursor.x - press.x, cursor.y - press.y);
    const held = (now - press.t) / 1000;
    if (moved > DRAG_THRESHOLD) companion.grab(press);
    else if (held > PET_DELAY) companion.pet(dt);
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
  if (!press && companion.state !== 'grabbed') over = companion.isOver(cursor);
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
  const held = (Date.now() - press.t) / 1000;
  press = null;
  if (companion.state === 'grabbed') companion.release();
  else if (held < CLICK_MAX) companion.pat();
  // Otherwise it was a long pet; he stays happy for a moment on his own.
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
  // On another screen (or mid-air): drop him in from just above the cursor.
  companion.setBounds(target);
  companion.x = c.x;
  companion.y = Math.min(c.y - 40, companion.bounds.floor);
  companion.vx = 0;
  companion.vy = 0;
  companion.enter('fall');
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
    {
      label: sleeping ? 'Wake up' : 'Take a nap',
      click: () => {
        if (sleeping) companion.pat();
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
