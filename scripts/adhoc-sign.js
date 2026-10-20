'use strict';

// After `electron-builder --mac --dir`: ad-hoc sign the app so it runs on
// Apple silicon (changing Info.plist breaks Electron's original signature).
// This is a local, personal build: not notarized and not for distribution.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.platform !== 'darwin') {
  console.log('Skipping signing: not on macOS.');
  process.exit(0);
}

const dist = path.join(__dirname, '..', 'dist');
const apps = fs
  .readdirSync(dist)
  .filter((d) => d.startsWith('mac'))
  .map((d) => path.join(dist, d, 'Togepi.app'))
  .filter((p) => fs.existsSync(p));

for (const app of apps) {
  // llama-server and its libraries (his mind's engine) sit in Resources, where
  // --deep doesn't look: sign them first.
  const engine = path.join(app, 'Contents', 'Resources', 'engine');
  if (fs.existsSync(engine)) {
    for (const f of fs.readdirSync(engine)) {
      const file = path.join(engine, f);
      if (fs.lstatSync(file).isFile() && (f === 'llama-server' || f.endsWith('.dylib'))) {
        execFileSync('codesign', ['--force', '--sign', '-', file], { stdio: 'inherit' });
      }
    }
  }
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  console.log(`Signed (ad-hoc): ${app}`);
}
if (!apps.length) {
  console.error('No Togepi.app found in dist/.');
  process.exit(1);
}
