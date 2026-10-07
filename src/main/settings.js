'use strict';

// User settings, stored as JSON in the app's data folder.

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  // Opt-in: notice which app is in front (macOS). Off by default.
  watchApps: false,
  // Opt-in: read upcoming events from the Mac Calendar app. Off by default.
  readCalendar: false,
  // Apps where he keeps still and quiet (meetings). Matched case-insensitively
  // against the app's name, so "teams" also matches "Microsoft Teams".
  quietApps: ['zoom.us', 'Microsoft Teams', 'FaceTime', 'Webex', 'Cisco Webex Meetings', 'Skype', 'Around', 'Discord'],
  // Apps where he hides completely (presenting).
  presentApps: ['Keynote', 'Microsoft PowerPoint'],
  // Browsers whose open tabs are checked for meetings.
  browsers: ['Google Chrome', 'Arc', 'Brave Browser', 'Microsoft Edge', 'Safari'],
  // Tab addresses that always mean you're in a meeting (matched anywhere in the URL).
  meetingUrls: ['meet.google.com/', 'zoom.us/wc', 'zoom.us/j/', 'whereby.com/', 'around.co/'],
  // Web apps you might also just leave open for chat: these count as a
  // meeting only while a calendar event is on (like a meeting app's window).
  meetingAppUrls: ['teams.microsoft.com', 'teams.live.com', '.webex.com/'],
};

class Settings {
  constructor(dir) {
    this.file = path.join(dir, 'settings.json');
    this.values = { ...DEFAULTS };
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      for (const k of Object.keys(DEFAULTS)) {
        if (saved[k] !== undefined && typeof saved[k] === typeof DEFAULTS[k]) this.values[k] = saved[k];
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

/** Which list (if any) an app name is on: 'presenting', 'meeting' or null. */
function classifyApp(name, settings) {
  if (!name) return null;
  const n = name.toLowerCase();
  const match = (list) => list.some((a) => n === a.toLowerCase() || n.includes(a.toLowerCase()));
  if (match(settings.presentApps || [])) return 'presenting';
  if (match(settings.quietApps || [])) return 'meeting';
  return null;
}

module.exports = { Settings, DEFAULTS, classifyApp, classifyUrl };
