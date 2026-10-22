'use strict';

// Companion events (src/main/companion.js) that mean you did something with
// him, as he'd describe them. Each one wakes him up to think.
const INTERACTIONS = {
  heart: 'Sushant petted you.',
  throw: 'Sushant picked you up and threw you!',
  drop: 'Sushant picked you up and put you down.',
  angry: "You got angry because Sushant keeps throwing you around.",
  wake: 'Sushant woke you up.',
  welcomeBack: 'Sushant came back after being away.',
  goodMorning: 'You see Sushant for the first time today.',
  hello: 'You see Sushant for the first time today.',
  waterDone: 'Sushant drank some water like you asked.',
  stretchDone: 'Sushant took a stretch break like you asked.',
  bedtimeDone: 'Sushant said he will go to bed.',
  nudgeLater: 'Sushant ignored your reminder.',
  gaveUp: 'You asked Sushant to play but he never answered, so you gave up.',
  thatWasFun: 'You just finished playing with Sushant.',
  tttYouWin: 'Sushant beat you at tic-tac-toe.',
  tttIWin: 'You beat Sushant at tic-tac-toe!',
  tttDraw: 'Your tic-tac-toe game with Sushant was a draw.',
  gotBall: 'You fetched the ball Sushant threw.',
  chatted: 'Sushant chatted with you in the chat window.',
};

module.exports = { INTERACTIONS };
