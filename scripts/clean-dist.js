'use strict';

// Before `npm run dist`: remove the previous build. electron-builder clears
// dist/mac-* itself but gives up with ENOTEMPTY when something still touches
// it (an old Togepi or its llama-server started from dist/, or Spotlight
// indexing the multi-gigabyte model files), so retry here first.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dist = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(dist)) process.exit(0);

// Model servers left running from the old build hold files open inside it.
if (process.platform === 'darwin') {
  try {
    execFileSync('pkill', ['-f', `${dist}/.*llama-server`]);
    console.log('Stopped llama-server processes running from the old build.');
  } catch {
    // none running
  }
}

for (const d of fs.readdirSync(dist).filter((n) => n.startsWith('mac'))) {
  const dir = path.join(dist, d);
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
  } catch (e) {
    console.error(`Could not remove ${dir}: ${e.message}`);
    console.error('Quit Togepi if it is running from dist/, then try again.');
    process.exit(1);
  }
}
