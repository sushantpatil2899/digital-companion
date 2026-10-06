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
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  console.log(`Signed (ad-hoc): ${app}`);
}
if (!apps.length) {
  console.error('No Togepi.app found in dist/.');
  process.exit(1);
}
