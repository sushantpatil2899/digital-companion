'use strict';

// After `electron-builder --mac --dir`: sign the app so it runs on Apple
// silicon (changing Info.plist breaks Electron's original signature).
//
// With the "Companion Local Signing" certificate (made once on this Mac by
// `npm run make-cert`, scripts/make-signing-cert.sh) every build carries the
// same signature, so macOS keeps its permissions (Screen Recording, Calendar,
// Automation) from one build to the next. Without it the app is signed ad
// hoc, and macOS treats every rebuild as a new app.
//
// A local, personal build: not notarized and not for distribution.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { SIGNING_IDENTITY } = require('../src/main/permissions');

if (process.platform !== 'darwin') {
  console.log('Skipping signing: not on macOS.');
  process.exit(0);
}

/** Is the signing certificate in the keychain (and trusted for signing code)? */
function hasIdentity(name) {
  try {
    const out = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], { encoding: 'utf8' });
    return out.includes(`"${name}"`);
  } catch {
    return false;
  }
}

const identity = hasIdentity(SIGNING_IDENTITY) ? SIGNING_IDENTITY : '-';
if (identity === '-') {
  console.warn(
    `\nNo "${SIGNING_IDENTITY}" certificate found: signing ad hoc.\n` +
      'macOS will forget Filo’s permissions (Screen Recording, Calendar, Automation) with every rebuild.\n' +
      'Run `npm run make-cert` once on this Mac, then `npm run reset-permissions` and rebuild (see the README).\n',
  );
}
const sign = (file, deep) =>
  execFileSync('codesign', ['--force', ...(deep ? ['--deep'] : []), '--timestamp=none', '--sign', identity, file], { stdio: 'inherit' });

const dist = path.join(__dirname, '..', 'dist');
const apps = fs
  .readdirSync(dist)
  .filter((d) => d.startsWith('mac'))
  .map((d) => path.join(dist, d, 'Filo.app'))
  .filter((p) => fs.existsSync(p));

for (const app of apps) {
  // llama-server and its libraries (his mind's engine) sit in Resources, where
  // --deep doesn't look: sign them first.
  const engine = path.join(app, 'Contents', 'Resources', 'engine');
  if (fs.existsSync(engine)) {
    for (const f of fs.readdirSync(engine)) {
      const file = path.join(engine, f);
      if (fs.lstatSync(file).isFile() && (f === 'llama-server' || f.endsWith('.dylib'))) sign(file, false);
    }
  }
  // The speech helper (Phase 11) sits in Resources too.
  const helpers = path.join(app, 'Contents', 'Resources', 'helpers');
  if (fs.existsSync(helpers)) {
    for (const f of fs.readdirSync(helpers)) {
      const file = path.join(helpers, f);
      if (fs.lstatSync(file).isFile()) sign(file, false);
    }
  }
  sign(app, true);
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  console.log(`Signed (${identity === '-' ? 'ad hoc' : identity}): ${app}`);
  if (identity !== '-') {
    // What macOS remembers permissions by: the same every build.
    const req = execFileSync('codesign', ['-d', '-r-', app], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(req.trim());
  }
}
if (!apps.length) {
  console.error('No Filo.app found in dist/.');
  process.exit(1);
}
