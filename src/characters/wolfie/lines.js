'use strict';

// Wolfie's fixed lines (SBU Hacks, 2026-10-24): what's written on the signs
// and bubbles he holds up (nudges, meetings, games; by mood band) and the
// little floating texts, with a "Go Seawolves!" where it fits. Used by the
// main process (require) and by the companion window (script tag, registers
// window.CharacterLines.wolfie). His own words come from his mind.

(function (root) {
const LINES = {
  // Signs and bubbles (src/main/nudges.js say()), by mood band.
  signs: {
    water: { cheerful: 'Hydrate, Seawolf!', content: 'Water break?', meh: '…water.', sad: 'Drink some water…', grumpy: 'Water. Now.' },
    stretch: { cheerful: 'Stretch it out!', content: 'Stretch break?', meh: '…stretch.', sad: 'Please stretch…', grumpy: 'Stretch. Now.' },
    eyes: { cheerful: 'Eyes off the screen!', content: 'Rest your eyes', meh: '…eyes.', sad: 'Rest your eyes…', grumpy: 'Look away.' },
    bedtime: { cheerful: 'No all-nighter tonight?', content: 'Getting late…', meh: '…bed?', sad: 'Go to bed…', grumpy: 'Bed. Now.' },
    note: { cheerful: 'Reminder!', content: 'Reminder', meh: '…reminder', sad: "Don't forget…", grumpy: 'Remember this.' },
    meeting30: { cheerful: 'Meeting in 30 min', content: 'Meeting in 30 min', meh: '…meeting in 30', sad: 'Meeting in 30…', grumpy: 'Meeting. 30 min.' },
    meeting5: { cheerful: 'Meeting in 5!', content: 'Meeting in 5', meh: '…meeting in 5', sad: 'Meeting in 5…', grumpy: 'Meeting. 5 min.' },
    meetingNow: { cheerful: 'Meeting now!', content: 'Meeting now!', meh: '…meeting now', sad: 'Meeting now…', grumpy: 'Meeting. Now.' },
    fetch: { cheerful: 'Go Seawolves! Fetch?', content: 'Play fetch?', meh: '…fetch?', sad: 'Fetch…?', grumpy: 'Throw it.' },
    fetchAgain: { cheerful: 'Again! Go long!', content: 'Again?', meh: '…again?', sad: 'One more…?', grumpy: 'Again.' },
    ttt: { cheerful: 'Tic-tac-toe, rookie?', content: 'Tic-tac-toe?', meh: '…tic-tac-toe?', sad: 'Play with me…?', grumpy: 'Tic-tac-toe. Now.' },
  },
  // Floating text after you answer a nudge or a game ends, by mood band.
  says: {
    reminderAck: { cheerful: 'Got it!', content: 'Got it', meh: 'ok.', sad: 'ok…', grumpy: 'Fine.' },
    noteDone: { cheerful: 'Crushed it!', content: 'Done', meh: 'done.', sad: 'done…', grumpy: 'Fine.' },
    waterDone: { cheerful: 'Hydrated!', content: 'Nice', meh: 'ok.', sad: 'thanks…', grumpy: 'Good.' },
    stretchDone: { cheerful: 'Game-ready!', content: 'Better?', meh: 'ok.', sad: 'thanks…', grumpy: 'There.' },
    eyesDone: { cheerful: 'Fresh eyes!', content: 'Better', meh: '…better', sad: '…better', grumpy: 'There.' },
    bedtimeDone: { cheerful: 'Night, Seawolf!', content: 'Night!', meh: 'night.', sad: 'night…', grumpy: 'Finally.' },
    nudgeLater: { cheerful: 'Later then!', content: 'Later then…', meh: '…later.', sad: 'later…', grumpy: 'Noted. Again.' },
    gaveUp: { cheerful: "I'll practise my moves then.", content: 'Never mind…', meh: '…never mind.', sad: 'ok… never mind', grumpy: 'Your loss.' },
    thatWasFun: { cheerful: 'Go Seawolves!', content: 'That was fun.', meh: 'that was ok.', sad: 'thanks…', grumpy: 'Hmph. Fun.' },
    tttYouWin: { cheerful: 'Great play!', content: 'You win!', meh: 'you win.', sad: 'you win…', grumpy: 'Rematch.' },
    tttIWin: { cheerful: 'Go Seawolves!', content: 'I win!', meh: 'I win.', sad: 'I won…', grumpy: 'I win.' },
  },
  // Floating text for other moments (src/renderer/renderer.js handleEvent).
  floats: {
    throw: 'Whoa!',
    grab: '!',
    goodMorning: 'Morning! Go Seawolves!',
    hello: 'Hey again!',
    welcomeBack: "You're back! Go Seawolves!",
    charging: 'Powered up!',
    lonely: '…',
    eventEnded: 'All done!',
    ballThrow: 'Go long!',
    gotBall: 'Touchdown!',
    tttDraw: 'A tie game!',
    tttYouStart: 'You kick off!',
    tttIStart: "I'll kick off!",
    wake: '!?',
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = LINES;
else (root.CharacterLines = root.CharacterLines || {}).wolfie = LINES;
})(typeof window !== 'undefined' ? window : globalThis);
