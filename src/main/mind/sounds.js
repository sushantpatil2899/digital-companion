'use strict';

// Your own sound clips for the character. Put them in the "sounds" folder in
// his data folder (on a Mac:
// ~/Library/Application Support/Filo/characters/<id>/sounds/), named
// <mood>-<anything>.<ext>, where mood is cheerful, content, meh, sad or grumpy
// (e.g. "cheerful-1.wav"). Files without a mood prefix play for any mood.
// With no clips he uses his own generated chirps (src/renderer/chirp.js).
// No Electron imports, so it can be unit tested.

const fs = require('fs');
const path = require('path');

const MOODS = ['cheerful', 'content', 'meh', 'sad', 'grumpy'];
const EXTS = ['.wav', '.mp3', '.m4a', '.aac', '.ogg'];
const MAX_BYTES = 2 * 1024 * 1024; // longer clips are skipped
const RESCAN_MS = 30 * 1000;

const README = `His sounds

Put your own short sound clips here (under ~2 seconds works best) and he
plays them when he talks, instead of his generated chirps.

Name them <mood>-<anything>.<ext>:
  mood: cheerful, content, meh, sad or grumpy
  ext:  .wav, .mp3, .m4a, .aac or .ogg
for example cheerful-1.wav, sad-sigh.mp3.

Files without a mood prefix (e.g. chirp.wav) play for any mood.
`;

/** Group clip file names by mood: { cheerful: [...], ..., any: [...] }. */
function groupClips(names) {
  const out = { any: [] };
  for (const m of MOODS) out[m] = [];
  for (const name of names) {
    const ext = path.extname(name).toLowerCase();
    if (!EXTS.includes(ext) || name.startsWith('.')) continue;
    const mood = MOODS.find((m) => name.toLowerCase().startsWith(`${m}-`));
    out[mood || 'any'].push(name);
  }
  return out;
}

/** A clip for this mood, or null: one for the mood, else one for any mood. */
function pickClip(groups, band, rng = Math.random) {
  const list = (groups[band] && groups[band].length ? groups[band] : groups.any) || [];
  return list.length ? list[Math.floor(rng() * list.length)] : null;
}

class SoundLibrary {
  constructor(dir) {
    this.dir = dir;
    this.groups = groupClips([]);
    this.scannedAt = 0;
    try {
      fs.mkdirSync(dir, { recursive: true });
      const readme = path.join(dir, 'README.txt');
      if (!fs.existsSync(readme)) fs.writeFileSync(readme, README);
    } catch {
      // read-only or missing folder: generated chirps only
    }
  }

  scan() {
    if (Date.now() - this.scannedAt < RESCAN_MS) return;
    this.scannedAt = Date.now();
    try {
      this.groups = groupClips(fs.readdirSync(this.dir));
    } catch {
      this.groups = groupClips([]);
    }
  }

  /** { name, data } of a clip for this mood, or null. */
  clipFor(band) {
    this.scan();
    const name = pickClip(this.groups, band);
    if (!name) return null;
    try {
      const file = path.join(this.dir, name);
      if (fs.statSync(file).size > MAX_BYTES) return null;
      return { name, data: fs.readFileSync(file) };
    } catch {
      return null;
    }
  }
}

module.exports = { SoundLibrary, groupClips, pickClip, MOODS, EXTS };
