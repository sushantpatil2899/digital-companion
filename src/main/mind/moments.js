'use strict';

// Phase 12: moments in your day he may respond to (celebrate, comfort,
// cheer on, study buddy). Only text for his prompt and the names of the
// actions it offers: no code decides when a moment happened or how he
// reacts. The model does, from his personality (DECISIONS.md, Phase 12).
// The text never names the character, so every character can use it. It
// writes {user}, {them} and {their} for your name and pronouns (names.js
// fill()), with {user} as the subject so the verbs fit any pronoun.
// No Electron imports, so it can be unit tested.

// Things his body can do in these moments (see Companion.mindAction).
// Study buddy is off (DECISIONS.md, 2026-10-25): it kept him too quiet.
const MOMENT_ACTIONS = ['celebrate', 'comfort' /* , 'studyBuddy' */];

// Added to his first message for thoughts and chat (not the diary or reflection).
const MOMENTS = [
  'Moments that can matter to {user}. Whether and how you react is up to you and your personality; you may also let a moment pass.',
  '- {user} finished or submitted something, or tells you "I did it". You can celebrate with {them} (action "celebrate": confetti and a hop).',
  '- Something went wrong for {user}: a rejection, a bad grade, a bad day. You can comfort {them} (action "comfort": a hug and hearts for {them}).',
  '- Something big is coming up for {user}, like an interview or an exam. You can cheer {them} on.',
  // Study buddy is off (see MOMENT_ACTIONS).
  // '- {user} is working or studying. You can be {their} study buddy (action "studyBuddy": you sit and watch {their} screen with {them}, without wandering off, for as long as the work goes on; choosing another action ends it).',
];

module.exports = { MOMENTS, MOMENT_ACTIONS };
