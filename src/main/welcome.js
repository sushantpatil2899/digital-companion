'use strict';

// Phase 5: the welcome window. The first time he runs it explains what he
// can do and asks for each permission in turn; after an update it shows
// once what's new since the version you last saw.
//
// RULE (docs/mind/PLAN.md, working agreement): every change that adds or
// changes what he does bumps WELCOME_VERSION, adds a WHATS_NEW entry for it
// and updates WELCOME if the overview changed.
// No Electron imports, so it can be unit tested.

const WELCOME_VERSION = 9;

// What he can do (the first-run welcome).
const WELCOME = [
  {
    title: 'Hi, I’m Togepi!',
    text: 'I live on your screen, wander between your monitors and keep you company. Right-click me (or use the menu bar icon) for everything below.',
  },
  {
    title: 'Playing with me',
    text: 'Click me for a pat, hold the mouse on me to pet me, or pick me up and throw me (I don’t love that). Play → Fetch or Tic-tac-toe; sometimes I’ll ask you to play. Come here calls me over; Stay put keeps me still for a while. When you watch a movie or a video, I sit in the corner of that screen and watch it with you, quietly.',
  },
  {
    title: 'Looking after you',
    text: 'Under Wellbeing I remind you to drink water, take stretch breaks, rest your eyes and go to bed, only while you’re at the computer, never in a meeting. Remind me… holds up a note at the time you pick.',
  },
  {
    title: 'My own mind',
    text: 'I think for myself with models that run on your Mac (nothing leaves it) and sometimes say something short, with a chirp. Sometimes I ask you something instead: click one of my two answers. Show his brain… (under Brain) shows what I’m thinking and why I spoke or kept quiet.',
  },
  {
    title: 'Memory and growing up',
    text: 'I keep a diary, remember what I learn about you (Mind → Memories…, where you can also write notes for me) and grow a little with you every week (Mind → Personality…, where you can lock sliders or undo a week).',
  },
  {
    title: 'Privacy',
    text: 'Private windows, password managers, payments, banking and sign-in pages are never shown to me. You can add your own under Mind → Privacy blocklist….',
  },
  {
    title: 'Light on your Mac',
    text: 'My models take about 11 GB of memory, so they rest when you’ve been away 15 minutes (Mind → Rest the models after I’m away), at night while I sleep and on battery below 20%. They start again when you’re back.',
  },
];

// What's new in each version, newest last. Shown once after an update.
const WHATS_NEW = [
  { version: 1, title: 'My own mind', items: ['I think and talk for myself with local models, in short lines with chirps.', 'Mind → Personality… has sliders for all my traits and values.'] },
  { version: 2, title: 'I remember', items: ['I write a diary in the evening and remember what I learn about you.', 'Mind → Memories… shows it all; you can make me forget things and write notes for me.'] },
  { version: 3, title: 'I follow your attention', items: ['I know which window you’re typing in and which one you’re looking at, across screens.', 'Brain → Let him read my screen lets me read the window you’re looking at (nothing is saved).'] },
  { version: 4, title: 'I grow with you', items: ['Our relationship changes a little every day, and once a week I look back and may change a little.', 'Mind → Personality… shows how I’ve grown, with a 🔒 to lock a slider and Undo this week.'] },
  {
    version: 5,
    title: 'Lighter, and easier to check',
    items: [
      'My models rest when you’ve been away 15 minutes (change it under Mind → Rest the models after I’m away), at night while I sleep and on battery below 20%.',
      'Try it now (in my menu) writes today’s diary, counts today towards our relationship or makes me reflect on the week, right away.',
      'Mind → Copy a report copies a short report about how I’m doing, with nothing private in it.',
      'Show his brain… shows how many seconds a thought takes and how much memory my models use.',
    ],
  },
  {
    version: 6,
    title: 'I ask you things',
    items: [
      'Sometimes I ask you a question instead of saying something: click one of my two answers. If you don’t, I shrug after 30 seconds (that’s fine).',
      'I remember answers that tell me about you (Mind → Memories), and answering makes me happy like a pat.',
      'I come up with my own things to say now, without examples to copy, and my lines can be a little longer.',
    ],
  },
  {
    version: 7,
    title: 'Movie time together',
    items: [
      'When you watch something (Netflix, YouTube, Prime Video, Disney+, Hulu, Max, Apple TV, Crunchyroll, VLC, IINA, QuickTime), I say something about it and sit in the bottom-right corner of that screen with my back to you, watching too.',
      'I start after 30 seconds (2 minutes on YouTube) and get up a minute after you stop.',
      'While we watch I’m quiet (no chirps), and water, stretch and eye breaks wait until we’re done.',
    ],
  },
  {
    version: 8,
    title: 'Fewer questions, more to watch',
    items: [
      'I ask one question about what you’re doing, then wait until you’ve moved on to something else. When you answer, I just react.',
      'I join you on Hotstar, Peacock, Paramount+, SonyLIV, ZEE5 and Twitch too, and on any other site where you’re watching something (I work it out from the page).',
      'It works in Firefox and other browsers now. Show his brain… has a Watching check that says why I have or haven’t joined you.',
    ],
  },
  {
    version: 9,
    title: 'Quicker to join you',
    items: ['When you watch something (YouTube too), I join you after 30 seconds and get up 30 seconds after you stop.'],
  },
];

// The permission switches the welcome window offers (same as the menus).
const SWITCHES = [
  ['watchApps', 'Notice which app I’m using', 'App names and window and browser tab titles, so I know what you’re doing. macOS asks once per browser.'],
  ['readScreen', 'Let him read my screen', 'I read the window you’re looking at (text, sometimes a picture). Nothing is saved. macOS asks for Screen Recording.'],
  ['readCalendar', 'Read my calendar', 'I keep quiet in meetings and remind you before they start. macOS asks for Calendar access.'],
  ['openAtLogin', 'Start at login', 'I’m there when you start your Mac.'],
];

/**
 * What the welcome window should show for the version you last saw, or null.
 * `manual` (opened from the menu): the welcome plus the latest news.
 */
function welcomeFor(seen, { manual = false } = {}) {
  const v = Number.isFinite(seen) ? seen : 0;
  if (v >= WELCOME_VERSION) return manual ? { mode: 'welcome', version: WELCOME_VERSION, sections: WELCOME, whatsNew: WHATS_NEW.slice(-1) } : null;
  if (v <= 0) return { mode: 'welcome', version: WELCOME_VERSION, sections: WELCOME, whatsNew: [] };
  return { mode: 'new', version: WELCOME_VERSION, sections: [], whatsNew: WHATS_NEW.filter((w) => w.version > v) };
}

module.exports = { WELCOME_VERSION, WELCOME, WHATS_NEW, SWITCHES, welcomeFor };
