'use strict';

// Watching together (Sushant, 2026-10-21): when you watch a movie, a series
// or a video, he notices, says something about it, goes to the screen it's
// on and sits in its bottom-right corner with his back to you, watching too,
// quiet, until you stop. Only real playback counts: the playback pages of
// streaming sites (by their address) and video player apps, not browsing.
// It starts once you've stayed on it 5 s and ends once you've been
// somewhere else for 5 s (Sushant, 2026-10-25; it was 30 s). A paused video
// can't be told apart from a playing one.
//
// Sites not on the list (and browsers that can't tell us the tab's address,
// like Firefox) are judged by the decision model from the tab's title and
// address: main.js asks it once per page (see `needsGuess` / guessQuestion)
// and passes the answer in. YouTube is also recognised by its title.
// No Electron imports, so it can be unit tested.

const { user } = require('./names');

const WATCH = {
  start: 5, // s on a playback page or player before it counts
  stopAfter: 5, // s somewhere else before it's over
  gap: 15, // s away from it (a quick look elsewhere) that don't reset the wait before it starts
  maxIdle: 3 * 3600, // s without mouse or keyboard while watching before you count as away
  glance: 120, // s between his glances at the screen while you watch (Phase 9)
};

// Playback pages, by address (host and path, without "www.").
const SITES = [
  { name: 'Netflix', re: /^netflix\.com\/watch\//i },
  { name: 'YouTube', re: /^(m\.)?youtube\.com\/(watch|live\/)|^youtu\.be\//i },
  { name: 'Prime Video', re: /^primevideo\.com\/(.*\/)?detail\/|^amazon\.[a-z.]+\/gp\/video\/detail\//i },
  { name: 'Disney+', re: /^disneyplus\.com\/(.*\/)?(video|play)\//i },
  { name: 'Hulu', re: /^hulu\.com\/watch\//i },
  { name: 'Max', re: /^(play\.)?max\.com\/(video|movie|episode)\//i },
  { name: 'Apple TV', re: /^tv\.apple\.com\/(.*\/)?(episode|movie)\//i },
  { name: 'Crunchyroll', re: /^crunchyroll\.com\/(.*\/)?watch\//i },
  { name: 'Hotstar', re: /^(jio)?hotstar\.com\/(.*\/)?watch\b/i },
  { name: 'Peacock', re: /^peacocktv\.com\/watch\//i },
  { name: 'Paramount+', re: /^paramountplus\.com\/(.*\/)?video\//i },
  { name: 'SonyLIV', re: /^sonyliv\.com\/(shows|movies|sports)\/[^/]+\/[^/]+/i },
  { name: 'ZEE5', re: /^zee5\.com\/(.*\/)?(details|watch)\//i },
  { name: 'Twitch', re: /^twitch\.tv\/(videos\/\d+|(?!directory|search|settings|downloads|subscriptions|inventory|wallet|drops|p\/)[^/]+\/?$)/i },
];

// Browsers (by app name), for windows whose tab address we may not know.
const BROWSER = /chrome|chromium|safari|firefox|\barc\b|brave|edge|opera|vivaldi|browser|comet|^dia$|^zen$|orion|duckduckgo/i;

// The decision model's question for a page not on the list.
const guessQuestion = () => ({
  type: 'choice',
  instructions: `Is ${user()} watching a movie, a TV series, a show, a video or a live stream in this window right now?`,
  criteria: {
    A: 'yes: watching a movie, series, show, video or stream',
    B: 'no: browsing, searching, reading, shopping, working or anything else',
  },
});
// Probability of "yes" that counts. The decision model says about 0.9-0.99
// for real playback pages and about 0.5 when the title says nothing either
// way, so 0.6 let unsure guesses through: the SBU Hacks site ("SBUHacks
// 2026", 0.48 measured here, over 0.6 on a Mac) and Spotify's web player
// (0.72) counted as watching (2026-10-25).
const GUESS_YES = 0.85;

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

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

// Tab titles that say nothing about the page: a new or empty tab, the
// browser's own pages, or just the browser's name ("Brave Browser"). Never
// playback, and never asked about: the decision model once took Brave itself
// for something being watched (2026-10-25).
const BLANK_TITLE = /^(new tab|new private tab|new incognito tab|private browsing|start page|untitled|blank page|about:blank|favorites|favourites|top sites|speed dial|settings|history|downloads|bookmarks|extensions|wallet|rewards)$/i;

function blankTitle(w) {
  const t = withoutBrowser(w.title).trim();
  if (!t || t.toLowerCase() === String(w.app || '').trim().toLowerCase()) return true;
  if (BROWSER.test(t) && t.split(/\s+/).length <= 2) return true;
  return BLANK_TITLE.test(t);
}

/** By address, player app or (YouTube) title, without the model; or null. */
function known(w) {
  if (w.url) {
    const u = urlPart(w.url);
    const site = SITES.find((s) => s.re.test(u));
    if (site) return { name: site.name };
  }
  const app = APPS[String(w.app || '').toLowerCase()];
  if (app) return { name: app };
  // A browser that didn't tell us the address: YouTube says so in its title.
  if (!w.url && BROWSER.test(w.app || '') && /\s[-–—]\s*YouTube\s*$/i.test(withoutBrowser(w.title))) return { name: 'YouTube' };
  return null;
}

/**
 * What you're watching in window `w` ({ app, title, url }), or null:
 * { name: 'Netflix' }. `guess`: the decision model's answer
 * for this page ({ video: true/false }), if it was asked.
 */
function watchingIn(w, guess = null) {
  if (!w || w.private) return null;
  const k = known(w);
  if (k) return k;
  if (guess && guess.video && !blankTitle(w)) return { name: hostOf(w.url) || w.app };
  return null;
}

/**
 * The key to ask the decision model about for window `w`, or null when it
 * isn't needed: a browser tab (or a page with an address) not already known
 * as playback. One answer per page (address and title).
 */
function needsGuess(w) {
  if (!w || w.private || !w.title || known(w) || blankTitle(w)) return null;
  if (!w.url && !BROWSER.test(w.app || '')) return null;
  return `${w.url ? urlPart(w.url) : w.app}|${w.title}`;
}

/** The decision model's state text for window `w`. */
function guessState(w) {
  return `App: ${w.app}. Window title: ${w.title}.${w.url ? ` Address: ${urlPart(w.url)}.` : ''}`;
}

/** A window title without the browser's name some browsers add ("… — Mozilla Firefox"). */
function withoutBrowser(title) {
  return String(title || '').replace(/\s[-–—]\s*(Mozilla Firefox|Google Chrome|Brave( Browser)?|Microsoft\u200b? Edge|Opera|Vivaldi|Chromium|Safari)\s*$/i, '');
}

/** The show or video's name from a window title, if it says more than the site's name. */
function showTitle(title, name) {
  const t = withoutBrowser(title)
    .replace(/^\(\d+\)\s*/, '') // "(3) " unread count on YouTube
    .replace(/\s+[-–—|]\s+(YouTube|Netflix|Prime Video|Disney\+|Hulu|Max|Apple TV\+?|Crunchyroll|(Disney\+ |Jio)?Hotstar|Twitch)\s*$/i, '')
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
    this.check = 'nothing to look at yet'; // why it is or isn't on, for the brain view
  }

  /**
   * Call about once a second with the window your attention is on (null if
   * none, or if it's private or on your blocklist). Returns 'start', 'stop'
   * or null.
   */
  update(w, guess = null) {
    const t = this.now();
    const m = watchingIn(w, guess);
    if (!m) {
      // A quick look elsewhere doesn't reset the wait.
      if (this.candidate && t - this.candidate.lastSeen > WATCH.gap * 1000) this.candidate = null;
      if (this.current && t - this.lastSeen >= WATCH.stopAfter * 1000) {
        this.current = null;
        this.check = 'you stopped watching';
        return 'stop';
      }
      if (this.current) this.check = `watching ${this.current.name}; you've been elsewhere ${Math.round((t - this.lastSeen) / 1000)} s (ends at ${WATCH.stopAfter} s)`;
      else this.check = explain(w, guess);
      return null;
    }
    this.lastSeen = t;
    if (this.current) {
      // Still watching (maybe something else, or on another screen).
      this.current = { ...this.current, name: m.name, title: showTitle(w.title, m.name) || (m.name === this.current.name ? this.current.title : null), screen: w.screen || null };
      this.check = `watching ${m.name}`;
      return null;
    }
    if (!this.candidate || this.candidate.name !== m.name) this.candidate = { name: m.name, since: t, lastSeen: t };
    this.candidate.lastSeen = t;
    const wait = WATCH.start;
    const waited = t - this.candidate.since;
    if (waited < wait * 1000) {
      this.check = `${m.name} for ${Math.round(waited / 1000)} s (he joins at ${wait} s)`;
      return null;
    }
    this.candidate = null;
    this.current = { name: m.name, title: showTitle(w.title, m.name), screen: w.screen || null, since: t };
    this.check = `watching ${m.name}`;
    return 'start';
  }
}

/** Why window `w` doesn't count as watching, in words. */
function explain(w, guess) {
  if (!w) return 'no window to look at (needs "Notice which app I\'m using")';
  if (w.private) return 'a private window (he never looks)';
  if (!known(w) && (w.url || BROWSER.test(w.app || '')) && blankTitle(w)) return `${w.app}: a new or empty tab, not a video`;
  if (BROWSER.test(w.app || '') && !w.url) {
    return guess ? `${w.app} doesn't show him the tab's address; the decision model says it isn't a video` : `${w.app} doesn't show him the tab's address; waiting for the decision model`;
  }
  if (needsGuess(w)) return guess ? `${hostOf(w.url) || w.app}: the decision model says it isn't a video` : `${hostOf(w.url) || w.app}: waiting for the decision model`;
  return `${w.app} isn't a video page or player`;
}

module.exports = { Watching, WATCH, guessQuestion, GUESS_YES, watchingIn, needsGuess, guessState, showTitle };
