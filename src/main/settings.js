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
        } else if (LIST_KEYS.includes(k) && Array.isArray(saved[k])) {
          const seen = new Set(DEFAULTS[k].map((v) => String(v).toLowerCase()));
          this.values[k] = [...DEFAULTS[k], ...saved[k].filter((v) => typeof v === 'string' && !seen.has(v.toLowerCase()))];
        } else {
          this.values[k] = saved[k];
        }
      }
    } catch {
      // No settings yet: write the defaults so they're easy to find and edit.
      this.save();
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
