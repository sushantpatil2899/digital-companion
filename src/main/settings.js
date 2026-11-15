'use strict';

// User settings, stored as JSON in the app's data folder.

const fs = require('fs');
const path = require('path');
const { NUDGE_DEFAULTS } = require('./nudges');

const DEFAULTS = {
  // Opt-in: notice which app is in front (macOS). Off by default.
  watchApps: false,
  // Opt-in: read upcoming events from the Mac Calendar app. Off by default.
  readCalendar: false,
  // Apps where he keeps still and quiet (meetings). Matched case-insensitively
  // anywhere in the app's name, so "zoom" matches "zoom.us" and "Zoom Workplace".
  quietApps: ['zoom', 'Microsoft Teams', 'FaceTime', 'Webex', 'Cisco Webex Meetings', 'Skype', 'Around', 'Discord'],
  // Apps where he hides completely (presenting).
  presentApps: ['Keynote', 'Microsoft PowerPoint'],
  // Browsers whose open tabs are checked for meetings.
  browsers: ['Google Chrome', 'Arc', 'Brave Browser', 'Microsoft Edge', 'Safari'],
  // Tab addresses that always mean you're in a meeting (matched anywhere in the URL).
  meetingUrls: ['meet.google.com/', 'zoom.us/wc', 'zoom.us/j/', 'whereby.com/', 'around.co/'],
  // Web apps you might also just leave open for chat: these count as a
  // meeting only while a calendar event is on (like a meeting app's window).
  meetingAppUrls: ['teams.microsoft.com', 'teams.live.com', '.webex.com/'],
  // Wellbeing nudges (water, stretch, eye rest, bedtime); see src/main/nudges.js.
  nudges: { ...NUDGE_DEFAULTS },
  // His own mind: he thinks and talks for himself with local models (src/main/mind).
  mind: true,
  // Where his voice model runs: 'local' (on this Mac) or 'gemini' (Google's
  // Gemini API, online; needs GEMINI_API_KEY). Mind → Think with changes it;
  // MIND_ENGINE, when set, sets it at start (and it's kept).
  // `gemini`: optional { model, images, localDecider, generationConfig,
  // timeoutMs }; missing ones use the defaults in src/main/mind/gemini.js.
  mindEngine: 'local',
  gemini: {},
  // He chirps when he talks.
  sounds: true,
  // Your own privacy blocklist on top of the built-in one (private windows,
  // password managers, payments, banking, sign-in pages): anything matching is
  // never shown to his mind. Matched case-insensitively anywhere in the app
  // name, the page address, or (for words) the window title and address.
  privacyBlock: { apps: [], sites: [], words: [] },
  // Opt-in (macOS): he reads the window you're looking at (text, and now and
  // then a picture of it) for his thoughts. Needs Screen Recording permission.
  readScreen: false,
  // Email and chat apps he may read anyway (he only sees their titles otherwise).
  screenAllow: { apps: [], sites: [] },
  // His models rest (free about 11 GB of memory and save battery) after
  // you've been away this many minutes (0 = never; Mind → Rest the models
  // after I'm away), at night while he sleeps, and on battery below
  // restBattery % (0 = never).
  restAfterAway: 15,
  restBattery: 20,
  // The welcome window shows what's new since this version (src/main/welcome.js).
  welcomeSeen: 0,
  // What he calls you, and how he refers to you: 'he', 'she' or 'they'
  // (asked on first run).
  userName: '',
  userPronoun: '',
  // The character on your screen (src/characters), and whether you've picked
  // one (a new install shows "Pick your companion" after the welcome).
  character: 'togepi',
  characterChosen: false,
  // Phase 10: once a week the character writes a song about your week and
  // ElevenLabs sings it (only the song's words are sent). Off until you turn
  // it on and add your key. The singer is the same for every character.
  weeklySong: false,
  songSinger: 'sweet female vocals',
  // Phase 11: talk to him. Off until you turn it on; the microphone only
  // opens while you use the shortcut (or 🎤 in the chat). speechEngine:
  // 'apple' (on this Mac) or 'elevenlabs' (Scribe, online). speechLocale:
  // e.g. 'en-US' ('' = your Mac's language).
  voiceCommands: false,
  speechEngine: 'apple',
  listenShortcut: 'Alt+Space',
  speechLocale: '',
};


// Lists you can add to in settings.json. Saved lists are added to the
// built-in ones (not replacing them), so new defaults reach older installs.
const LIST_KEYS = ['quietApps', 'presentApps', 'browsers', 'meetingUrls', 'meetingAppUrls'];

// Meeting apps by bundle ID: still recognised if an app renames itself.
const MEETING_BUNDLES = [
  'us.zoom.xos',
  'com.microsoft.teams',
  'com.microsoft.teams2',
  'com.apple.facetime',
  'com.cisco.webexmeetingsapp',
  'com.webex.meetingmanager',
  'cisco-systems.spark',
];
const PRESENT_BUNDLES = ['com.apple.iwork.keynote', 'com.microsoft.powerpoint'];

class Settings {
  constructor(dir) {
    this.file = path.join(dir, 'settings.json');
    this.values = { ...DEFAULTS };
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const k of Object.keys(DEFAULTS)) {
        if (saved[k] === undefined || typeof saved[k] !== typeof DEFAULTS[k]) continue;
        if (k === 'nudges' && saved[k] && !Array.isArray(saved[k])) {
          this.values[k] = { ...DEFAULTS[k] };
          for (const [nk, nv] of Object.entries(saved[k])) {
            if (nk in DEFAULTS[k] && typeof nv === typeof DEFAULTS[k][nk]) this.values[k][nk] = nv;
          }
        } else if ((k === 'privacyBlock' || k === 'screenAllow') && saved[k] && !Array.isArray(saved[k])) {
          this.values[k] = {};
          for (const bk of Object.keys(DEFAULTS[k])) {
            const list = saved[k][bk];
            this.values[k][bk] = Array.isArray(list) ? list.filter((v) => typeof v === 'string' && v.trim()) : [];
          }
        } else if (LIST_KEYS.includes(k) && Array.isArray(saved[k])) {
          const seen = new Set(DEFAULTS[k].map((v) => String(v).toLowerCase()));
          this.values[k] = [...DEFAULTS[k], ...saved[k].filter((v) => typeof v === 'string' && !seen.has(v.toLowerCase()))];
        } else {
          this.values[k] = saved[k];
        }
      }
    } catch (e) {
      if (e.code === 'ENOENT') {
        // No settings yet: write the defaults so they're easy to find and edit.
        this.save();
      } else {
        // Unreadable (e.g. a typo while hand-editing): use the defaults for
        // now, but don't overwrite the file until something is changed.
        console.error(`Could not read ${this.file}, using defaults:`, e.message);
      }
    }
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    this.values[key] = value;
    this.save();
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.values, null, 2));
    } catch (e) {
      console.error('Could not save settings:', e.message);
    }
  }
}

/**
 * What a browser tab URL says about meetings: 'meeting' (Meet call, Zoom web
 * meeting, …), 'meetingApp' (Teams / Webex web app: a meeting only during a
 * calendar event) or null.
 */
function classifyUrl(url, settings) {
  if (!url) return null;
  const u = String(url).toLowerCase();
  // Google Meet's landing page (no meeting code) isn't a meeting.
  if (/meet\.google\.com\/?(\?.*)?$/.test(u) || /meet\.google\.com\/landing/.test(u)) return null;
  if ((settings.meetingUrls || []).some((m) => u.includes(m.toLowerCase()))) return 'meeting';
  if ((settings.meetingAppUrls || []).some((m) => u.includes(m.toLowerCase()))) return 'meetingApp';
  return null;
}

/** Which list (if any) an app is on, by name or bundle ID: 'presenting', 'meeting' or null. */
function classifyApp(name, settings, bundleId) {
  const b = bundleId ? String(bundleId).toLowerCase() : '';
  if (b && PRESENT_BUNDLES.includes(b)) return 'presenting';
  if (b && MEETING_BUNDLES.includes(b)) return 'meeting';
  if (!name) return null;
  const n = name.toLowerCase();
  const match = (list) => list.some((a) => a && n.includes(String(a).toLowerCase()));
  if (match(settings.presentApps || [])) return 'presenting';
  if (match(settings.quietApps || [])) return 'meeting';
  return null;
}

module.exports = { Settings, DEFAULTS, classifyApp, classifyUrl };
