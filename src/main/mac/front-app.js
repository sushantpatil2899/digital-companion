'use strict';

// Which app is in front (macOS only), for "keep quiet during meetings".
//
// First tries `lsappinfo`, a built-in macOS tool that needs no permission.
// Falls back to asking System Events via AppleScript, which macOS asks you to
// allow once (Privacy & Security → Automation).

const { run } = require('./run');

// Our own app being in front (e.g. while you use his menu) doesn't count.
const IGNORE = ['togepi', 'electron'];

function parseLsappinfoName(out) {
  const m = String(out).match(/"[^"]*"\s*=\s*"([^"]*)"/);
  return m ? m[1] : null;
}

async function frontAppName() {
  try {
    const asn = (await run('/usr/bin/lsappinfo', ['front'])).trim();
    if (asn) {
      const name = parseLsappinfoName(await run('/usr/bin/lsappinfo', ['info', '-only', 'name', asn]));
      if (name) return { name };
    }
  } catch {
    // fall through to AppleScript
  }
  try {
    const out = await run('/usr/bin/osascript', [
      '-e',
      'tell application "System Events" to get name of first application process whose frontmost is true',
    ]);
    return { name: out.trim() };
  } catch (e) {
    const denied = /-1743|not allowed|not authori[sz]ed/i.test(e.message);
    return {
      error: denied
        ? 'Not allowed to see which app is in front. Allow it in System Settings → Privacy & Security → Automation.'
        : `Couldn't check the front app: ${e.message.split('\n')[0]}`,
    };
  }
}

class FrontAppWatcher {
  /** @param {(result: {name?: string, error?: string}) => void} onResult */
  constructor(onResult, intervalMs = 5000) {
    this.onResult = onResult;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.busy = false;
  }

  start() {
    if (this.timer || process.platform !== 'darwin') return;
    const poll = async () => {
      if (this.busy) return;
      this.busy = true;
      try {
        const r = await frontAppName();
        if (r.name && IGNORE.includes(r.name.toLowerCase())) return; // keep the previous answer
        if (this.timer) this.onResult(r);
      } finally {
        this.busy = false;
      }
    };
    this.timer = setInterval(poll, this.intervalMs);
    poll();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = { FrontAppWatcher, parseLsappinfoName };
