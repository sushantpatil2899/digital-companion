'use strict';

// macOS side of "Let him read my screen" (src/main/mind/screen.js): a picture
// of one window (screencapture -l), its text (Apple's Vision text recognition,
// ocr.applescript) and a small JPEG of it for the language model (sips).
// Needs Screen Recording permission. Picture files go to the temp folder and
// are deleted straight after.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { run } = require('./run');

const OCR_SCRIPT = path.join(__dirname, 'ocr.applescript').replace('app.asar', 'app.asar.unpacked');

async function capture(windowId) {
  const file = path.join(os.tmpdir(), `companion-look-${process.pid}-${Date.now()}.png`);
  // -x no sound, -o no shadow, -l just this window (whichever screen it's on).
  await run('/usr/sbin/screencapture', ['-x', '-o', '-l', String(windowId), '-t', 'png', file], 8000);
  let size = 0;
  try {
    size = fs.statSync(file).size;
  } catch {
    // no file
  }
  if (!size) throw new Error('no picture: allow Filo under System Settings → Privacy & Security → Screen & System Audio Recording');
  return file;
}

async function ocr(file) {
  return run('/usr/bin/osascript', [OCR_SCRIPT, file], 20000);
}

async function picture(file) {
  const small = file.replace(/\.png$/, '-small.jpg');
  try {
    await run('/usr/bin/sips', ['-Z', '1280', '-s', 'format', 'jpeg', file, '--out', small], 8000);
    return fs.readFileSync(small).toString('base64');
  } finally {
    fs.rmSync(small, { force: true });
  }
}

function remove(file) {
  fs.rmSync(file, { force: true });
}

module.exports = { capture, ocr, picture, remove };
