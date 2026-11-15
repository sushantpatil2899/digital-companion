'use strict';

// Where the app keeps its data, and how it moves when the app is renamed.
// Since Phase 9 each character has its own folder:
//
//   Filo/settings.json               shared (your name, nudges, privacy…)
//   Filo/characters/<id>/brain.json  his needs, mood, your notes
//   Filo/characters/<id>/mind/       personality, memories, diary
//   Filo/characters/<id>/sounds/     your own clips for his voice
//   Filo/database/                   the Tiger Data database (Phase 10)
//
// The app was called Togepi (one data folder for the one character), then
// Companion, and is now Filo. On the first start of Filo the data of the
// newest older name is copied over (the old folder is left as it was).
// No Electron imports, so it can be unit tested.

const fs = require('fs');
const path = require('path');

// The folder of the name before Filo, which already has this layout.
const PREVIOUS = 'Companion';
// Older data folders, newest name first ("digital-companion": running from
// source before the app had a product name). These hold Togepi's data only.
const OLD_FOLDERS = ['Togepi', 'digital-companion'];

/** Where character `id`'s own data lives inside `userData`. */
function characterDir(userData, id) {
  return path.join(userData, 'characters', id);
}

/** Not the old run's model process ids: they'd point at other programs now. */
const notPids = (f) => path.basename(f) !== 'engine.pids';

/** The old app's database server is still running (copying it now would copy a half-written state). */
function serverRunning(dbDir) {
  try {
    const pid = Number(fs.readFileSync(path.join(dbDir, 'data', 'postmaster.pid'), 'utf8').split('\n')[0]);
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // alive, but not ours
  }
}

/** Plain files and folders only: the database folder holds a socket file, which can't be copied. */
function copyable(f) {
  try {
    const st = fs.lstatSync(f);
    return st.isFile() || st.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Companion → Filo: everything, as it was: settings, every character's folder
 * and the database (unless the old app is still running, then it's rebuilt
 * from each character's event log). The saved ElevenLabs and Gemini keys stay
 * behind: they're encrypted with the old app's Keychain entry, which Filo
 * can't open, so they're asked for again.
 */
function copyAll(from, userData) {
  fs.mkdirSync(userData, { recursive: true });
  const chars = path.join(from, 'characters');
  if (fs.existsSync(chars)) fs.cpSync(chars, path.join(userData, 'characters'), { recursive: true, filter: (f) => notPids(f) && copyable(f) });
  const db = path.join(from, 'database');
  if (fs.existsSync(db) && !serverRunning(db)) {
    fs.cpSync(db, path.join(userData, 'database'), { recursive: true, filter: (f) => path.basename(f) !== 'postmaster.pid' && copyable(f) });
  }
  // The settings last: with them there, this never runs again.
  fs.copyFileSync(path.join(from, 'settings.json'), path.join(userData, 'settings.json'));
}

/** Togepi → the per-character layout (Phase 9). */
function copyTogepi(from, userData) {
  const to = characterDir(userData, 'togepi');
  fs.mkdirSync(to, { recursive: true });
  for (const name of ['brain.json', 'mind', 'sounds']) {
    const src = path.join(from, name);
    if (!fs.existsSync(src)) continue;
    fs.cpSync(src, path.join(to, name), { recursive: true, filter: notPids });
  }
  // The old app only ever talked to Sushant.
  const settings = JSON.parse(fs.readFileSync(path.join(from, 'settings.json'), 'utf8'));
  if (!settings.userName) settings.userName = 'Sushant';
  if (!settings.userPronoun) settings.userPronoun = 'he';
  if (!settings.character) settings.character = 'togepi';
  settings.characterChosen = true;
  fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify(settings, null, 2));
}

/**
 * Copy the data of an older name from next to `userData` (both in `appData`),
 * unless this app already has settings. Returns the folder it copied from, or
 * null.
 */
function migrate({ appData, userData }) {
  if (fs.existsSync(path.join(userData, 'settings.json'))) return null;
  const has = (d) => d !== userData && fs.existsSync(path.join(d, 'settings.json'));
  const previous = path.join(appData, PREVIOUS);
  if (has(previous) && fs.existsSync(path.join(previous, 'characters'))) {
    copyAll(previous, userData);
    return previous;
  }
  const from = OLD_FOLDERS.map((n) => path.join(appData, n)).find(has);
  if (!from) return null;
  copyTogepi(from, userData);
  return from;
}

module.exports = { migrate, characterDir, OLD_FOLDERS, PREVIOUS };
