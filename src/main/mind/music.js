'use strict';

// Is music playing? (Phase 9: Pip conducts only while you play music.)
// - Spotify and Apple Music say themselves whether they're playing
//   (src/main/mac/music.jxa.js)
// - music sites in a browser: by the tab's address, when its title shows a
//   song rather than just the site's name (YouTube Music, Spotify's web
//   player, SoundCloud…)
// - anything else in a browser tab: the decision model judges it from the
//   title and address, once per page (main.js passes its answer in)
// No Electron imports, so it can be unit tested.

const privacy = require('./privacy');
const { user } = require('./names');

// Music sites, by address (host, without "www."), and the titles they show
// when nothing in particular is playing.
const SITES = [
  { name: 'YouTube Music', re: /^music\.youtube\.com$/i, idle: /^YouTube Music$/i },
  { name: 'Spotify', re: /^open\.spotify\.com$/i, idle: /^Spotify( – Web Player.*)?$/i },
  { name: 'Apple Music', re: /^music\.apple\.com$/i, idle: /^(Apple Music|Music)( - Web Player)?$/i },
  { name: 'SoundCloud', re: /(^|\.)soundcloud\.com$/i, idle: /^SoundCloud\b/i },
  { name: 'Amazon Music', re: /^music\.amazon\.[a-z.]+$/i, idle: /^Amazon Music/i },
  { name: 'Tidal', re: /(^|\.)tidal\.com$/i, idle: /^TIDAL/i },
  { name: 'Deezer', re: /(^|\.)deezer\.com$/i, idle: /^Deezer/i },
  { name: 'Pandora', re: /(^|\.)pandora\.com$/i, idle: /^Pandora/i },
  { name: 'JioSaavn', re: /(^|\.)jiosaavn\.com$/i, idle: /^JioSaavn/i },
  { name: 'Gaana', re: /(^|\.)gaana\.com$/i, idle: /^Gaana/i },
  { name: 'Wynk', re: /(^|\.)wynk\.in$/i, idle: /^Wynk/i },
  { name: 'Bandcamp', re: /(^|\.)bandcamp\.com$/i, idle: /^Bandcamp$/i },
];

// Window titles of music sites (with "Let him read my screen", other
// windows' titles are known too): "Song - YouTube Music".
const TITLE = /\s[-–—|]\s*(YouTube Music|Spotify|SoundCloud)\s*$/i;

// The decision model's question for a tab not on the list.
const guessQuestion = () => ({
  type: 'choice',
  instructions: `Is ${user()} listening to music in this browser tab right now?`,
  criteria: {
    A: 'yes: a song, an album, a playlist, a music video or a radio station is playing',
    B: 'no: anything else',
  },
});
const GUESS_YES = 0.6;

const PLAYERS = { Spotify: 'Spotify', Music: 'Apple Music' };

/** A known music site's entry for `tab` ({ url, title }) when it shows a song, or null. */
function siteFor(tab) {
  if (!tab || !tab.url || tab.private) return null;
  const host = privacy.domainOf(tab.url);
  const site = host && SITES.find((s) => s.re.test(host));
  if (!site) return null;
  const title = String(tab.title || '').trim();
  return title && !site.idle.test(title) ? site : null;
}

/**
 * What music is playing, or null: 'Spotify', 'YouTube Music'…
 * `players`: { Spotify: 'playing' } from music.jxa.js; `windows`: visible
 * windows ({ app, title }); `frontTab`: the browser tab you're looking at;
 * `guess`: the decision model's answer for that tab ({ music }), if asked.
 */
function musicPlaying({ players = {}, windows = [], frontTab = null, guess = null } = {}) {
  for (const [app, name] of Object.entries(PLAYERS)) if (players[app] === 'playing') return name;
  const site = siteFor(frontTab);
  if (site) return site.name;
  for (const w of windows) {
    const m = String(w.title || '').match(TITLE);
    if (m) return m[1];
  }
  if (guess && guess.music && frontTab && !frontTab.private) return privacy.domainOf(frontTab.url) || 'music';
  return null;
}

/** The key to ask the decision model about for `tab`, or null when not needed (known, private, no address). */
function needsGuess(tab) {
  if (!tab || tab.private || !tab.url || !tab.title) return null;
  const host = privacy.domainOf(tab.url);
  if (host && SITES.some((s) => s.re.test(host))) return null;
  return `${host}|${tab.title}`;
}

/** The decision model's state text for `tab`. */
function guessState(tab) {
  return `Browser tab title: ${tab.title}. Address: ${privacy.domainOf(tab.url) || tab.url}.`;
}

module.exports = { musicPlaying, needsGuess, guessState, guessQuestion, GUESS_YES, SITES };
