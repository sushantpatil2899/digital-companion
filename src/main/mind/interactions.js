'use strict';

// Companion events (src/main/companion.js) that mean you did something with
// him, as he'd describe them. Each one wakes him up to think. {user} is your
// name and {they} your pronoun (see names.js).
const { fill } = require('./names');

const INTERACTIONS = {
  heart: '{user} petted you.',
  throw: '{user} picked you up and threw you!',
  drop: '{user} picked you up and put you down.',
  angry: 'You got angry because {user} keeps throwing you around.',
  pleaseDont: 'You held up a "Please don\'t." sign because {user} keeps throwing you around.',
  wake: '{user} woke you up.',
  welcomeBack: '{user} came back after being away.',
  goodMorning: 'You see {user} for the first time today.',
  hello: 'You see {user} for the first time today.',
  waterDone: '{user} drank some water like you asked.',
  stretchDone: '{user} took a stretch break like you asked.',
  bedtimeDone: '{user} said {they} will go to bed.',
  nudgeLater: '{user} ignored your reminder.',
  gaveUp: 'You asked {user} to play but {they} never answered, so you gave up.',
  thatWasFun: 'You just finished playing with {user}.',
  tttYouWin: '{user} beat you at tic-tac-toe.',
  tttIWin: 'You beat {user} at tic-tac-toe!',
  tttDraw: 'Your tic-tac-toe game with {user} was a draw.',
  gotBall: 'You fetched the ball {user} threw.',
  chatted: '{user} chatted with you in the chat window.',
};

/** What interaction `key` says, with your name. */
function interaction(key) {
  return INTERACTIONS[key] ? fill(INTERACTIONS[key]) : null;
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Any name and pronoun: so entries logged before a change still count.
const MATCH = Object.entries(INTERACTIONS).map(([k, t]) => [k, new RegExp(`^${t.split(/\{user\}|\{they\}/).map(escape).join('.+?')}$`)]);

/** The interaction a logged `text` describes (for entries without a key), or null. */
function interactionKey(text) {
  const hit = MATCH.find(([, re]) => re.test(text || ''));
  return hit ? hit[0] : null;
}

module.exports = { INTERACTIONS, interaction, interactionKey };
