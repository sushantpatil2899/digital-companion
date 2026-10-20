'use strict';

// What's on your screens (macOS only), for "keep quiet during meetings":
// - the app in front (`lsappinfo`, no permission needed; AppleScript fallback)
// - which apps have a window showing on any screen (windows.jxa.js, no
//   permission needed: only app names and positions are read)
// - the open tab of each visible window of your browsers (AppleScript; macOS
//   asks once per browser under Privacy & Security → Automation), with the
//   title of the one you're looking at for his mind (src/main/mind)

const path = require('path');
const { run } = require('./run');
const { classifyApp, classifyUrl } = require('../settings');

const WINDOWS_SCRIPT = path.join(__dirname, 'windows.jxa.js').replace('app.asar', 'app.asar.unpacked');

// Our own app being in front (e.g. while you use his menu) doesn't count.
const IGNORE = ['togepi', 'electron'];

// Parses `lsappinfo info -only <key>` output: "LSDisplayName"="zoom.us"
function parseLsappinfoName(out) {
  const m = String(out).match(/"[^"]*"\s*=\s*"([^"]*)"/);
  return m ? m[1] : null;
}

function parseWindowsOutput(out) {
  try {
    const data = JSON.parse(String(out).trim());
    return (data.windows || []).filter((w) => w && typeof w.app === 'string');
  } catch {
    return null;
  }
}

/**
 * AppleScript that prints the active tab of each non-minimized window, front
 * window first, one per line: URL, title and window mode ("incognito" for a
 * private Chrome-family window), separated by tabs.
 */
function browserTabsScript(browser) {
  const safari = /safari/i.test(browser);
  const tab = safari ? 'current tab' : 'active tab';
  const minimized = safari ? 'miniaturized' : 'minimized';
  const title = safari ? 'name' : 'title';
  return [
    'set sep to character id 9',
    `tell application "${browser.replace(/"/g, '')}"`,
    '  set out to ""',
    `  repeat with w in (every window whose ${minimized} is false)`,
    '    try',
    `      set t to ${tab} of w`,
    '      set m to ""',
    '      try',
    '        set m to (mode of w) as text',
    '      end try',
    '      set ttl to ""',
    '      try',
    `        set ttl to (${title} of t) as text`,
    '      end try',
    '      set out to out & (URL of t) & sep & ttl & sep & m & linefeed',
    '    end try',
    '  end repeat',
    '  return out',
    'end tell',
  ].join('\n');
}

/** Lines from browserTabsScript -> [{ url, title, private }], front window first. */
function parseTabs(out) {
  return String(out)
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.trim())
    .map((l) => {
      const [url, title, mode] = l.split('\t');
      return { url: (url || '').trim(), title: (title || '').trim() || null, private: /incognito|private/i.test(mode || '') };
    })
    .filter((t) => t.url);
}

async function frontAppName() {
  try {
    const asn = (await run('/usr/bin/lsappinfo', ['front'])).trim();
    if (asn) {
      const name = parseLsappinfoName(await run('/usr/bin/lsappinfo', ['info', '-only', 'name', asn]));
      let bundleId = null;
      try {
        bundleId = parseLsappinfoName(await run('/usr/bin/lsappinfo', ['info', '-only', 'bundleid', asn]));
      } catch {
        // the name alone will do
      }
      if (name) return { name, bundleId };
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

async function visibleWindows() {
  try {
    return parseWindowsOutput(await run('/usr/bin/osascript', ['-l', 'JavaScript', WINDOWS_SCRIPT]));
  } catch {
    return null;
  }
}

async function browserTabs(browser) {
  try {
    const tabs = parseTabs(await run('/usr/bin/osascript', ['-e', browserTabsScript(browser)]));
    return { tabs, urls: tabs.map((t) => t.url) };
  } catch (e) {
    const denied = /-1743|not allowed|not authori[sz]ed/i.test(e.message);
    return { error: denied ? `Allow Togepi to control ${browser} (Privacy & Security → Automation) so he can spot meetings in its tabs.` : null };
  }
}

/**
 * Put the raw observations together.
 * @param {string} front name of the app in front
 * @param {string} [frontBundle] its bundle ID
 * @returns {{frontApp, frontBundle, frontKind, meetingAppVisible, meetingTab, visibleApps: string[]}}
 */
function summarize(front, windows, tabsByBrowser, settings, frontBundle = null) {
  const visibleApps = [...new Set((windows || []).map((w) => w.app))];
  const frontKind = classifyApp(front, settings, frontBundle);
  let meetingTab = false;
  let meetingAppTab = false;
  for (const urls of Object.values(tabsByBrowser)) {
    for (const url of urls) {
      const kind = classifyUrl(url, settings);
      if (kind === 'meeting') meetingTab = true;
      if (kind === 'meetingApp') meetingAppTab = true;
    }
  }
  const meetingAppVisible = meetingAppTab || visibleApps.some((a) => classifyApp(a, settings) === 'meeting');
  return { frontApp: front, frontBundle, frontKind, meetingAppVisible, meetingTab, visibleApps };
}

class AppWatcher {
  /**
   * @param {() => object} getSettings current settings values
   * @param {(result: object) => void} onResult summary (see summarize) plus `error`
   */
  constructor(getSettings, onResult, intervalMs = 3000) {
    this.getSettings = getSettings;
    this.onResult = onResult;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.busy = false;
    this.lastFront = null;
    this.lastBundle = null;
  }

  start() {
    if (this.timer || process.platform !== 'darwin') return;
    this.timer = setInterval(() => this.poll(), this.intervalMs);
    this.poll();
  }

  async poll() {
    if (this.busy || !this.timer) return;
    this.busy = true;
    try {
      const settings = this.getSettings();
      const errors = [];
      const f = await frontAppName();
      if (f.error) errors.push(f.error);
      // Ignore our own app in front: keep the previous answer.
      if (f.name && !IGNORE.includes(f.name.toLowerCase())) {
        this.lastFront = f.name;
        this.lastBundle = f.bundleId || null;
      }
      const windows = await visibleWindows();
      const visible = new Set((windows || []).map((w) => w.app));
      const tabs = {};
      let frontTab = null;
      for (const browser of settings.browsers || []) {
        if (!visible.has(browser) && this.lastFront !== browser) continue; // only running, visible browsers
        const r = await browserTabs(browser);
        if (r.urls) tabs[browser] = r.urls;
        // The tab you're looking at: the front window of the browser in front.
        if (r.tabs && r.tabs.length && browser === this.lastFront) frontTab = r.tabs[0];
        if (r.error) errors.push(r.error);
      }
      const summary = summarize(this.lastFront, windows, tabs, settings, this.lastBundle);
      if (this.timer) this.onResult({ ...summary, windows: windows || [], frontTab, error: errors.join(' ') || null });
    } finally {
      this.busy = false;
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = { AppWatcher, parseLsappinfoName, parseWindowsOutput, browserTabsScript, parseTabs, summarize };
