'use strict';

// Watching together (Sushant, 2026-10-21): when you watch a movie, a series
// or a video, he notices, says something about it, goes to the screen it's
// on and sits in its bottom-right corner with his back to you, watching too,
// quiet, until you stop. Only real playback counts: the playback pages of
// streaming sites (by their address) and video player apps, not browsing.
// It starts once you've stayed on it a little while (YouTube longer, so a
// short clip doesn't count) and ends once you've been somewhere else for a
// minute. A paused video can't be told apart from a playing one.
// No Electron imports, so it can be unit tested.

const WATCH = {
  start: 30, // s on a playback page or player before it counts
  startYouTube: 120, // s on YouTube (short clips don't count)
  stopAfter: 60, // s somewhere else before it's over
  maxIdle: 3 * 3600, // s without mouse or keyboard while watching before you count as away
};

// Playback pages, by address (host and path, without "www.").
const SITES = [
  { name: 'Netflix', re: /^netflix\.com\/watch\//i },
  { name: 'YouTube', re: /^(m\.)?youtube\.com\/(watch|live\/)|^youtu\.be\//i, youtube: true },
  { name: 'Prime Video', re: /^primevideo\.com\/(.*\/)?detail\/|^amazon\.[a-z.]+\/gp\/video\/detail\//i },
  { name: 'Disney+', re: /^disneyplus\.com\/(.*\/)?(video|play)\//i },
  { name: 'Hulu', re: /^hulu\.com\/watch\//i },
  { name: 'Max', re: /^(play\.)?max\.com\/(video|movie|episode)\//i },
  { name: 'Apple TV', re: /^tv\.apple\.com\/(.*\/)?(episode|movie)\//i },
  { name: 'Crunchyroll', re: /^crunchyroll\.com\/(.*\/)?watch\//i },
];

// Video player apps (by app name).
const APPS = {
  vlc: 'VLC',
  iina: 'IINA',
  'quicktime player': 'QuickTime Player',
  tv: 'Apple TV',
};

function urlPart(url) {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./i, '')}${u.pathname}`;
  } catch {
    return '';
  }
}

/**
 * What you're watching in window `w` ({ app, title, url }), or null:
 * { name: 'Netflix', youtube: false }.
 */
function watchingIn(w) {
  if (!w || w.private) return null;
  if (w.url) {
    const u = urlPart(w.url);
    const site = SITES.find((s) => s.re.test(u));
    if (site) return { name: site.name, youtube: !!site.youtube };
  }
  const app = APPS[String(w.app || '').toLowerCase()];
  return app ? { name: app, youtube: false } : null;
}

/** The show or video's name from a window title, if it says more than the site's name. */
function showTitle(title, name) {
  const t = String(title || '')
    .replace(/^\(\d+\)\s*/, '') // "(3) " unread count on YouTube
    .replace(/\s+[-–|]\s+(YouTube|Netflix|Prime Video|Disney\+|Hulu|Max|Apple TV\+?|Crunchyroll)\s*$/i, '')
    .trim();
  if (!t || t.toLowerCase() === String(name).toLowerCase() || /^(netflix|youtube|prime video|disney\+|hulu|max|apple tv\+?|crunchyroll)$/i.test(t)) return null;
  return t.slice(0, 80);
}

class Watching {
  /** @param {() => number} [now] ms */
  constructor(now = () => Date.now()) {
    this.now = now;
    this.candidate = null; // { name, since } playback you've just gone to
    this.current = null; // { name, title, screen, since } what you're watching
    this.lastSeen = 0;
  }

  /**
   * Call about once a second with the window your attention is on (null if
   * none, or if it's private or on your blocklist). Returns 'start', 'stop'
   * or null.
   */
  update(w) {
    const t = this.now();
    const m = watchingIn(w);
    if (!m) {
      this.candidate = null;
      if (this.current && t - this.lastSeen >= WATCH.stopAfter * 1000) {
        this.current = null;
        return 'stop';
      }
      return null;
    }
    this.lastSeen = t;
    if (this.current) {
      // Still watching (maybe something else, or on another screen).
      this.current = { ...this.current, name: m.name, title: showTitle(w.title, m.name) || (m.name === this.current.name ? this.current.title : null), screen: w.screen || null };
      return null;
    }
    if (!this.candidate || this.candidate.name !== m.name) this.candidate = { name: m.name, since: t };
    const wait = m.youtube ? WATCH.startYouTube : WATCH.start;
    if (t - this.candidate.since < wait * 1000) return null;
    this.candidate = null;
    this.current = { name: m.name, title: showTitle(w.title, m.name), screen: w.screen || null, since: t };
    return 'start';
  }
}

module.exports = { Watching, WATCH, watchingIn, showTitle };
