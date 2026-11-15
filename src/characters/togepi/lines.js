'use strict';

// Togepi's fixed lines: what's written on the signs and bubbles he holds up
// (nudges, meetings, games; by mood band) and the little floating texts. Used
// by the main process (require) and by the companion window (script tag,
// registers window.CharacterLines.togepi). His own words come from his mind.

(function (root) {
const LINES = {
  // Signs and bubbles (src/main/nudges.js say()), by mood band.
  signs: {
    water: {
      cheerful: 'Water time! 💧',
      content: 'Water break?',
      meh: '…water.',
      sad: 'Drink some water…',
      grumpy: 'Drink. Water.',
    },
    stretch: {
      cheerful: 'Stretch time!',
      content: 'Stretch break?',
      meh: '…stretch?',
      sad: 'Please stretch…',
      grumpy: 'Up. Stretch.',
    },
    eyes: {
      cheerful: 'Look far away!',
      content: 'Rest your eyes',
      meh: '…eyes.',
      sad: 'Rest your eyes…',
      grumpy: 'Eyes. Away.',
    },
    bedtime: {
      cheerful: 'Bedtime soon?',
      content: 'Getting late…',
      meh: '…bed?',
      sad: 'Go to bed…',
      grumpy: 'Bed. Now.',
    },
    note: {
      cheerful: 'Reminder!',
      content: 'Reminder',
      meh: '…reminder',
      sad: "Don't forget…",
      grumpy: 'Remember this.',
    },
    meeting30: {
      cheerful: 'Meeting in 30 min',
      content: 'Meeting in 30 min',
      meh: '…meeting in 30',
      sad: 'Meeting in 30…',
      grumpy: 'Meeting. 30 min.',
    },
    meeting5: {
      cheerful: 'Meeting in 5!',
      content: 'Meeting in 5',
      meh: '…meeting in 5',
      sad: 'Meeting in 5…',
      grumpy: 'Meeting. 5 min.',
    },
    meetingNow: {
      cheerful: 'Meeting now!',
      content: 'Meeting now!',
      meh: '…meeting now',
      sad: 'Meeting now…',
      grumpy: 'Meeting. Now.',
    },  // Games (src/main/games/).
    fetch: {
      cheerful: 'Play fetch?!',
      content: 'Play fetch?',
      meh: '…fetch?',
      sad: 'Play with me…?',
      grumpy: 'Throw it. Now.',
    },
    fetchAgain: {
      cheerful: 'Again! Again!',
      content: 'Again?',
      meh: '…again?',
      sad: 'One more…?',
      grumpy: 'Again.',
    },
    ttt: {
      cheerful: 'Tic-tac-toe?!',
      content: 'Tic-tac-toe?',
      meh: '…tic-tac-toe?',
      sad: 'Play with me…?',
      grumpy: 'Tic-tac-toe. Now.',
    },
  },
  // Floating text after you answer a nudge or a game ends, by mood band.
  says: {
    reminderAck: { cheerful: 'Got it!', content: 'Got it', meh: 'ok.', sad: 'ok…', grumpy: 'Fine.' },
    noteDone: { cheerful: 'Got it!', content: 'Got it', meh: 'ok.', sad: 'ok…', grumpy: 'Fine.' },
    waterDone: { cheerful: 'Cheers!', content: 'Good job', meh: 'ok.', sad: 'thanks…', grumpy: 'Hmph. Good.' },
    stretchDone: { cheerful: 'Ahh, nice!', content: 'Better?', meh: 'ok.', sad: 'thanks…', grumpy: 'Fine.' },
    eyesDone: { cheerful: 'Ahh, better!', content: 'Better', meh: 'ok.', sad: '…better', grumpy: 'There.' },
    bedtimeDone: { cheerful: 'Night night!', content: 'Night!', meh: 'night.', sad: 'night…', grumpy: 'Finally.' },
    nudgeLater: { cheerful: 'Later then!', content: 'Later then…', meh: '…later.', sad: 'later…', grumpy: 'Ugh. Later.' },
    // Games.
    gaveUp: { cheerful: "I'll play alone then!", content: 'Never mind…', meh: '…never mind.', sad: 'ok… never mind', grumpy: 'Fine. Whatever.' },
    thatWasFun: { cheerful: 'That was fun!', content: 'That was fun!', meh: 'that was ok.', sad: 'thanks…', grumpy: 'Hmph. Fun.' },
    tttYouWin: { cheerful: 'You win! Again?', content: 'You win!', meh: 'you win.', sad: 'you win…', grumpy: 'Lucky.' },
    tttIWin: { cheerful: 'I win! Yay!', content: 'I win!', meh: 'I win.', sad: 'I won…', grumpy: 'Ha. Mine.' },
  },
  // Floating text for other moments (src/renderer/renderer.js handleEvent).
  floats: {
    throw: 'Wheee!',
    grab: '!',
    goodMorning: 'Good morning!',
    hello: 'Hi again!',
    welcomeBack: "You're back!",
    charging: 'Yum, power!',
    lonely: '…',
    eventEnded: 'All done!',
    ballThrow: "I'll get it!",
    gotBall: 'Got it!',
    tttDraw: 'A draw!',
    tttYouStart: 'You go first!',
    tttIStart: 'Me first!',
    wake: '!?',
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = LINES;
else (root.CharacterLines = root.CharacterLines || {}).togepi = LINES;
})(typeof window !== 'undefined' ? window : globalThis);
