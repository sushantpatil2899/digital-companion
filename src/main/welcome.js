'use strict';

// Phase 5: the welcome window. The first time he runs it explains what he
// can do, asks what to call you and asks for each permission in turn; after
// an update it shows once what's new since the version you last saw.
// {character} is the character's name (filled in by src/main/main.js).
//
// RULE (docs/mind/PLAN.md, working agreement): every change that adds or
// changes what he does bumps WELCOME_VERSION, adds a WHATS_NEW entry for it
// and updates WELCOME if the overview changed.
// No Electron imports, so it can be unit tested.

const WELCOME_VERSION = 37;

// What he can do (the first-run welcome).
const WELCOME = [
  {
    title: 'Hi, I’m {character}!',
    text: 'I live on your screen, wander between your monitors and keep you company. Right-click me (or use the menu bar icon) for everything below.',
  },
  {
    title: 'Playing with me',
    text: 'Click me for a pat, hold the mouse on me to pet me, or pick me up and throw me (I don’t love that). Play → Fetch or Tic-tac-toe; sometimes I’ll ask you to play. Come here calls me over; Stay put keeps me still for a while; Character lets you pick another companion. When you watch a movie or a video, I sit in the corner of that screen and watch it with you, quietly, reacting to what happens.',
  },
  {
    title: 'Looking after you',
    text: 'Under Wellbeing I remind you to drink water, take stretch breaks, rest your eyes and go to bed, only while you’re at the computer, never in a meeting. Remind me… holds up a note at the time you pick.',
  },
  {
    title: 'My own mind',
    text: 'I think for myself with models that run on your Mac (nothing leaves it), or on Google’s Gemini if you choose that under How should I think? above, and sometimes say something short, with a chirp. Sometimes I ask you something instead: click one of my two answers, or ✏️ to write your own. Double-click me (or Chat with {character}… in my menu) to chat. Show his brain… (under Brain) shows what I’m thinking and why I spoke or kept quiet.',
  },
  {
    title: 'Memory and growing up',
    text: 'I keep a diary, remember what I learn about you (Mind → Memories…, where you can also write notes for me) and grow a little with you every week (Mind → Personality…, where you can lock sliders or undo a week).',
  },
  {
    title: 'Talking to me',
    text: 'Switch on Talk to me below, then press ⌥ Space (or 🎤 in the chat) and talk: ask me to come here, play, nap, remind you of something, or just chat (the chat window opens with my answer). The microphone is only on while you talk.',
  },
  {
    title: 'Our weeks and our songs',
    text: 'What we do together goes into a small Tiger Data (TimescaleDB) database on your Mac, so I can add up our week. If you switch on Make our week’s song below and add your ElevenLabs key, I write a song about our week every Sunday evening and it gets sung: only the song’s words leave your Mac. Mind → Our songs… plays them.',
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
    title: 'Let’s chat!',
    items: [
      'Double-click me (or Chat with {character}… in my menu) to chat with me. I answer in a few seconds, in my own words, and my reply pops up over my head too.',
      'The chat shows today’s conversation and starts fresh tomorrow; what matters goes into my diary.',
      'When neither of my two answers fits, click ✏️ and write your own. I remember it and use it to offer better answers next time.',
      'When you watch something (YouTube too), I join you after 30 seconds and get up 30 seconds after you stop.',
    ],
  },
  {
    version: 10,
    title: 'My voice is my personality',
    items: ['How I talk now comes only from my personality: who I am, my sliders and how well we know each other. Change them in Mind → Personality… and my voice changes too.'],
  },
  {
    version: 11,
    title: 'I remember better',
    items: [
      'The 12 most important things I know about you are always on my mind now (⭐ in Mind → Memories…).',
      'Every Sunday I sum up my week in a few sentences, so I remember it for months. Read them under His weeks in Mind → Memories….',
      'I think a little faster: I don’t re-read who I am every time.',
    ],
  },
  {
    version: 12,
    title: 'Same me, new home',
    items: [
      'The app is called Companion now, and I’m its first character (more are coming). My memories, diary and personality came with me.',
      'macOS sees a new app, so it asks once more for Screen Recording, Calendar and app access. You can delete the old Togepi app.',
      'My own things (apple, flower, ball, adventure) are under Activities in my menu.',
      'I call you by the name you give me, and refer to you as he, she or they, as you choose: change them in Welcome and what’s new… in my menu.',
    ],
  },
  {
    version: 13,
    title: 'Watching with you, really',
    items: [
      'While we watch something, I glance at the screen every 2 minutes and react to what’s happening: I lean in when it’s exciting, wiggle when it’s funny, droop when it’s sad, hide when it’s scary. Still no words and no chirps. (Needs Let him read my screen.)',
      'What I saw goes into my diary as words; the pictures are never kept.',
      'When I feel lonely, I walk over to the window you’re working in and look up at it. If you’re busy, I sit down there quietly for a bit.',
    ],
  },
  {
    version: 14,
    title: 'Meet Pip',
    items: [
      'Pip is here: a tiny clockwork bird who thinks he’s much smarter than everyone. Pick him under Character in my menu, or open Character → Pick your companion… to meet everyone.',
      'Each of us has our own mind, memories and diary; your reminders, water count and settings stay when you switch.',
      'Pip winds himself up when he runs down (if he can’t reach his key, click him to wind him), investigates things, reads the paper, solves his puzzle cube, builds contraptions and conducts the music you play. macOS may ask once to let Companion see whether Spotify or Music is playing.',
    ],
  },
  {
    version: 15,
    title: 'Meet Mori',
    items: [
      'Mori is here: a small, quiet forest creature on four stubby legs, with a moss cap that grows flowers when he’s happy. Pick him under Character in my menu.',
      'Mori collects leaves from his heap, plants seeds, goes mushroom hunting, makes tea when he’s hungry, skips stones (plop.) and, at night (6 pm to 5 am), watches fireflies.',
      'He never gets angry: thrown, he gets dizzy and wanders off; throw him three times in ten minutes and he holds up a “Please don’t.” sign.',
      'Fetch with a pinecone (a leaf may distract him on the way), tic-tac-toe with your leaves against his mushrooms, and he watches with you with a mug of tea.',
      'Choosing an activity from my menu now ends a game I was offering.',
    ],
  },
  {
    version: 16,
    title: 'Honest permissions',
    items: [
      'Under Brain in my menu, a switch you turned on that macOS hasn’t allowed now says “(not allowed by macOS)”, with Fix in System Settings… under it.',
      'I check your calendar every minute (and right away when you open my menu), so a new event shows up quickly. The brain view says when I last checked.',
      'Builds signed with your own certificate keep their permissions from one build to the next: run npm run make-cert once (see the README).',
    ],
  },
  {
    version: 17,
    title: 'Meet Nomi',
    items: [
      'Nomi is here: a little floating dream cloud with a crescent moon on her head. Pick her under Character in my menu.',
      'She catches stars when she’s hungry, blows dream bubbles, makes a tiny rain cloud when she’s sad (pat her for a rainbow), paints a rainbow bridge, reads a big book, watches the moon at night (6 pm to 5 am) and sometimes wanders around the top of your screen.',
      'Thrown hard, she floats off the screen and comes back dizzy and a little stormy; she never gets angry. Fetch with a dream bubble, tic-tac-toe with stars and moons.',
      'Fixed: thoughts that failed with “400 … invalid string” when there was an emoji on screen.',
    ],
  },
  {
    version: 18,
    title: 'We keep track of our weeks',
    items: [
      'What we do together, what you’re on and how I feel now go into a small Tiger Data (TimescaleDB) database on your Mac, for every character. It never goes online.',
      'Your older days are added automatically. It needs Postgres and TimescaleDB from Homebrew (brew install timescaledb); without them I work as before. Show his brain… says whether it’s running.',
    ],
  },
  {
    version: 19,
    title: 'A song about our week',
    items: [
      'Every Sunday evening I write a 30-second song about our week, my way, and ElevenLabs sings it. I hold up “I made us a song! 🎵”: click me and it plays while I dance.',
      'Mind → Our songs… shows the words as they’re sung, the week in numbers and all our songs. Turn it on and add your ElevenLabs key there (it’s kept in your Mac’s Keychain).',
      'Only the song’s words go to ElevenLabs, after my privacy checks. Try it now → Make this week’s song now makes one right away.',
    ],
  },
  {
    version: 20,
    title: 'I remember by meaning',
    items: [
      'Every memory gets a meaning fingerprint (a small model on your Mac, EmbeddingGemma) kept in our database, so what comes to mind fits the moment even without the same words: a job post can remind me that interviews make you nervous.',
      'My older memories are fingerprinted automatically. It needs pgvector (brew install pgvector) and the small model (npm run fetch-models); without them I remember by words as before. Show his brain… says how I remembered.',
    ],
  },
  {
    version: 21,
    title: 'Talk to me',
    items: [
      'Turn on Mind → Talk to me, then press ⌥ Space (or 🎤 in the chat) and just talk; I stop listening when you stop. The microphone is never on otherwise, and never in meetings.',
      'Say “come here”, “let’s play fetch”, “tic-tac-toe”, “take a nap”, “wake up”, “stay put”, “remind me in 20 minutes to call mom”, “make our song”, “done”, or one of my activities. Anything else is a chat: I answer in my bubble. When I ask you something, say one of the answers.',
      'Mind → Listen with: Apple, on this Mac (nothing leaves it), or ElevenLabs Scribe (online). The recording is deleted as soon as it’s turned into text.',
    ],
  },
  {
    version: 22,
    title: 'I think about your day',
    items: [
      'With Read my calendar on, from an hour until half an hour before your next event it’s on my mind, and I may say something about it or ask you once, in my own way.',
      'When I’m talking about something you have coming up, my bubble has a little 📅.',
      'In that half hour I know about it when we chat, too.',
    ],
  },
  {
    version: 23,
    title: 'I’m there for your moments',
    items: [
      'When you finish or submit something, or tell me “I did it” in the chat, I may celebrate with you, with confetti and a hop.',
      'Had a bad day or a rejection? Tell me in the chat and I may comfort you with a hug and hearts.',
      'Before an interview or an exam I may cheer you on, and while you work or study I may sit and watch your screen with you as your study buddy.',
      'Whether and how I react is up to my personality.',
    ],
  },
  {
    version: 24,
    title: 'My mind can run online, if you want',
    items: [
      'For a Mac without room for my models (about 11 GB): give me a GEMINI_API_KEY and choose Mind → Think with → Gemini, and I think and chat with Google’s Gemini instead (Gemma, on this Mac takes you back). Everything else about me stays the same.',
      'It’s off unless you turn it on. When it’s on, what I think about (what you’re doing, what I read on your screen, my memories, our chat) goes to Google. Private things are still never shown to me.',
    ],
  },
  {
    version: 25,
    title: 'Holding still for my menu',
    items: ['When you right-click me, I stop what I’m doing and stand still until the menu closes, so the menu doesn’t move away from your mouse. Then I carry on (if I’m asleep or holding something up for you, I stay like that).'],
  },
  {
    version: 26,
    title: 'Choose how I think',
    items: [
      'How should I think? (in this window) lets you pick Gemma, on this Mac, or Gemini, online, and paste your Gemini key. The key is kept in your Mac’s Keychain.',
      'The first time I run, my models wait until you’ve chosen, so a Mac with less memory doesn’t start loading 11 GB first.',
    ],
  },
  {
    version: 27,
    title: 'Two small fixes',
    items: [
      'Things I only do at night (Mori’s fireflies, Nomi’s moon) wait for the night when you ask out loud too, like in my menu. Asked by day, I just answer you.',
      'With Gemini, a cut-off emoji in what I’m thinking about no longer breaks a thought.',
    ],
  },
  {
    version: 28,
    title: 'The app is called Filo now',
    items: [
      'Filo comes from the Greek φίλος: friend. The app was called Companion; it has a new name and a new icon (a friend sitting on your screen).',
      'Everything came with me: your settings, my memories, diary and personality, every character and our weeks. Your ElevenLabs and Gemini keys stay behind (macOS locks them to the old app’s name), so paste them again in Mind → Our songs… and in this window.',
      'macOS sees Filo as a new app: allow Screen Recording, Calendar, the microphone and the rest again when it asks. You can delete the old Companion.app.',
    ],
  },
  {
    version: 29,
    title: 'Meet Tonk',
    items: [
      'Tonk is here: a pocket-sized brass-and-steel robot who loves helping you get things done. Pick him under Character in my menu.',
      'He recharges beside a little steam boiler, rolls off with his toolbox, checks off his to-do list, studies a blueprint, sorts screws and fixes himself with a tiny wrench. Thrown, his eyes go dizzy for a moment.',
      'Fetch with a ball bearing, tic-tac-toe with plugs against his batteries, and he watches with you, his antenna bulb glowing.',
    ],
  },
  {
    version: 30,
    title: 'Meet Wolfie',
    items: [
      'Wolfie, the Stony Brook Seawolf, is here, facing whichever way he walks: your campus buddy who studies with you, eats with you and cheers every win. Pick him under Character in my menu. Go Seawolves!',
      'He grabs pizza at the dining hall, heads to class with his backpack, studies with a highlighter, pulls an all-nighter (only at night), cheers for the Seawolves with a megaphone and busts his game-day moves. Thrown, he shakes himself off and fixes his cap.',
      'Fetch with a mini football, tic-tac-toe with paw prints against waves, and a dorm watch party with a foam finger.',
    ],
  },
  {
    version: 31,
    title: 'No study buddy for now',
    items: ['I no longer sit with my back to you watching your screen while you work: it kept me too quiet. I still celebrate with you, comfort you and cheer you on.'],
  },
  {
    version: 32,
    title: 'Talking out loud opens the chat, and my bubbles fit what I say',
    items: [
      'When you say something out loud that isn’t one of my commands (a question, or anything else), the chat window opens with what you said, and I answer you there.',
      'My bubbles now fit everything I say: a short line gets a small bubble, a longer one gets wider and then taller. Nothing is cut off with “…” anymore, and that goes for my questions and my reminders to drink water or stretch too.',
    ],
  },
  {
    version: 33,
    title: 'I listen whatever I’m doing',
    items: [
      'Press ⌥ Space and I stop what I’m doing and listen, even in the middle of a question, a game invite, a reminder or an activity (never in meetings). What I was showing you comes back when I’m done, so you can still answer my question out loud.',
      'If you talk to me while I’m still answering your last message, I answer the new one right after.',
      'I join you watching something after 5 seconds, and get up 5 seconds after you stop.',
      'Just using a browser (Brave, a new tab) no longer counts as watching something.',
      'After you switch characters, the new one notices which app you’re using straight away.',
    ],
  },
  {
    version: 34,
    title: 'Reminders you say out loud',
    items: ['If you ask me out loud to remind you while I’m holding something up (a water break, a game invite), my 📝 with the time shows as soon as I put it down.'],
  },
  {
    version: 35,
    title: 'Fewer mix-ups about watching',
    items: ['A website that only might be a video no longer counts as watching: the SBU Hacks site and Spotify’s web player did. Real videos, shows and streams still do.'],
  },
  {
    version: 36,
    title: 'My brain, tidied up',
    items: ['Show his brain… now keeps what I’m doing and how I feel at the top, with three tabs below: Feelings, Noticing and Decisions. Noticing is split into You, Screen, Day, Mind and System, each showing how many things it has.'],
  },
  {
    version: 37,
    title: 'Get to know us',
    items: [
      'In Character → Pick your companion…, hover over one of us and click More info: who we are (our personality, slider by slider), everything we do, and a little world where you can play with us: pick us up, throw us, pat us, change how hungry or tired we are.',
    ],
  },
];

// The permission switches the welcome window offers (same as the menus).
const SWITCHES = [
  ['watchApps', 'Notice which app I’m using', 'App names and window and browser tab titles, so I know what you’re doing. macOS asks once per browser.'],
  ['readScreen', 'Let him read my screen', 'I read the window you’re looking at (text, sometimes a picture). Nothing is saved. macOS asks for Screen Recording.'],
  ['readCalendar', 'Read my calendar', 'I keep quiet in meetings, remind you before they start and think about what you have coming up. macOS asks for Calendar access.'],
  ['voiceCommands', 'Talk to me', 'Press ⌥ Space (or 🎤 in the chat) and talk: “come here”, “let’s play fetch”, “remind me in 20 minutes to…”, or just chat. The microphone is only on while you talk. macOS asks for the microphone and Speech Recognition.'],
  ['weeklySong', 'Make our week’s song', 'Every Sunday evening I write a song about our week and ElevenLabs sings it. Only the song’s words are sent. Needs your ElevenLabs key (asked next).'],
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
