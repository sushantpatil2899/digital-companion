'use strict';

// Builds the small macOS helpers Filo runs (git-ignored, into helpers/):
//   helpers/companion-listen  Apple's on-device speech recognition (Phase 11,
//                             src/main/mac/listen.swift)
// With an Info.plist inside the binary: macOS needs its usage description
// before it asks for Speech Recognition permission. `npm run dist` runs this
// and bundles helpers/ into Filo.app; `npm start` builds it on first use
// if it's missing (src/main/main.js). Needs Xcode's command line tools
// (xcode-select --install). Does nothing on other systems.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key><string>com.sushantpatil.filo.listen</string>
  <key>CFBundleName</key><string>Filo</string>
  <key>NSSpeechRecognitionUsageDescription</key><string>Filo turns what you say to it into text on your Mac, so it can do what you ask.</string>
</dict>
</plist>
`;

/** Compile `source` (Swift) into `out`, with the Info.plist above inside it. */
function buildListen(out = path.join(ROOT, 'helpers', 'companion-listen'), source = path.join(ROOT, 'src', 'main', 'mac', 'listen.swift')) {
  if (process.platform !== 'darwin') return null;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const plist = path.join(path.dirname(out), 'listen-Info.plist');
  fs.writeFileSync(plist, PLIST);
  execFileSync(
    'xcrun',
    ['swiftc', '-O', '-swift-version', '5', source, '-o', out, '-framework', 'Speech', '-Xlinker', '-sectcreate', '-Xlinker', '__TEXT', '-Xlinker', '__info_plist', '-Xlinker', plist],
    { stdio: 'inherit' },
  );
  fs.rmSync(plist, { force: true });
  return out;
}

/** Is `out` missing or older than its source (or this script)? */
function stale(out, sources) {
  if (!fs.existsSync(out)) return true;
  const t = fs.statSync(out).mtimeMs;
  return sources.some((f) => fs.existsSync(f) && fs.statSync(f).mtimeMs > t);
}

if (require.main === module) {
  if (process.platform !== 'darwin') {
    console.log('build-helpers: macOS only, nothing to do.');
  } else {
    const out = path.join(ROOT, 'helpers', 'companion-listen');
    if (!stale(out, [path.join(ROOT, 'src', 'main', 'mac', 'listen.swift'), __filename])) {
      console.log('build-helpers: up to date.');
    } else {
      try {
        console.log(`Built ${buildListen(out)}`);
      } catch (e) {
        // Not fatal: he works without it (Talk to me says what's missing).
        console.warn(`build-helpers: couldn't build Apple speech recognition (${e.message.split('\n')[0]}). Install Xcode's command line tools: xcode-select --install`);
      }
    }
  }
}

module.exports = { buildListen, PLIST };
