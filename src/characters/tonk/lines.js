'use strict';

// Tonk's fixed lines (SBU Hacks, 2026-10-24): what's written on the signs
// and bubbles he holds up (nudges, meetings, games; by mood band) and the
// little floating texts. Used by the main process (require) and by the
// companion window (script tag, registers window.CharacterLines.tonk). His
// own words come from his mind.

(function (root) {
const LINES = {
  // Signs and bubbles (src/main/nudges.js say()), by mood band.
  signs: {
    water: { cheerful: 'Coolant time!', content: 'Water break?', meh: '…water.', sad: 'Drink some water…', grumpy: 'Water. Now.' },
    stretch: { cheerful: 'Loosen those bolts!', content: 'Stretch break?', meh: '…stretch.', sad: 'Please stretch…', grumpy: 'Stretch. Now.' },
    eyes: { cheerful: 'Rest your optics!', content: 'Rest your eyes', meh: '…eyes.', sad: 'Rest your eyes…', grumpy: 'Look away.' },
    bedtime: { cheerful: 'Time to power down?', content: 'Getting late…', meh: '…bed?', sad: 'Go to bed…', grumpy: 'Bed. Now.' },
    note: { cheerful: 'Reminder!', content: 'Reminder', meh: '…reminder', sad: "Don't forget…", grumpy: 'Remember this.' },
    meeting30: { cheerful: 'Meeting in 30 min', content: 'Meeting in 30 min', meh: '…meeting in 30', sad: 'Meeting in 30…', grumpy: 'Meeting. 30 min.' },
    meeting5: { cheerful: 'Meeting in 5!', content: 'Meeting in 5', meh: '…meeting in 5', sad: 'Meeting in 5…', grumpy: 'Meeting. 5 min.' },
    meetingNow: { cheerful: 'Meeting now!', content: 'Meeting now!', meh: '…meeting now', sad: 'Meeting now…', grumpy: 'Meeting. Now.' },
    fetch: { cheerful: 'Fetch? I have wheels!', content: 'Play fetch?', meh: '…fetch?', sad: 'Fetch…?', grumpy: 'Throw it.' },
    fetchAgain: { cheerful: 'Again! Full steam!', content: 'Again?', meh: '…again?', sad: 'One more…?', grumpy: 'Again.' },
    ttt: { cheerful: 'Tic-tac-toe?', content: 'Tic-tac-toe?', meh: '…tic-tac-toe?', sad: 'Play with me…?', grumpy: 'Tic-tac-toe. Now.' },
  },
  // Floating text after you answer a nudge or a game ends, by mood band.
  says: {
    reminderAck: { cheerful: 'Logged!', content: 'Logged', meh: 'logged.', sad: 'logged…', grumpy: 'Fine.' },
    noteDone: { cheerful: 'Checked off!', content: 'Checked off', meh: 'done.', sad: 'done…', grumpy: 'Fine.' },
    waterDone: { cheerful: 'Coolant topped up!', content: 'Topped up', meh: 'ok.', sad: 'thanks…', grumpy: 'Good.' },
    stretchDone: { cheerful: 'All loosened up!', content: 'Better?', meh: 'ok.', sad: 'thanks…', grumpy: 'There.' },
    eyesDone: { cheerful: 'Optics rested!', content: 'Better', meh: '…better', sad: '…better', grumpy: 'There.' },
    bedtimeDone: { cheerful: 'Powering down!', content: 'Night!', meh: 'night.', sad: 'night…', grumpy: 'Finally.' },
    nudgeLater: { cheerful: 'Back on the list!', content: 'Later then…', meh: '…later.', sad: 'later…', grumpy: 'Noted. Again.' },
    gaveUp: { cheerful: "I'll sort my screws then.", content: 'Never mind…', meh: '…never mind.', sad: 'ok… never mind', grumpy: 'Fine.' },
    thatWasFun: { cheerful: 'Task: fun. Done!', content: 'That was fun.', meh: 'that was ok.', sad: 'thanks…', grumpy: 'Hmph. Fun.' },
    tttYouWin: { cheerful: 'Good build!', content: 'You win!', meh: 'you win.', sad: 'you win…', grumpy: 'Recalibrating.' },
    tttIWin: { cheerful: 'Click! I win!', content: 'I win!', meh: 'I win.', sad: 'I won…', grumpy: 'I win.' },
  },
  // Floating text for other moments (src/renderer/renderer.js handleEvent).
  floats: {
    throw: 'Whoa!',
    grab: '!',
    goodMorning: 'Morning! Boilers on.',
    hello: 'Hi again!',
    welcomeBack: "You're back!",
    charging: 'Full steam!',
    lonely: '…',
    eventEnded: 'All done!',
    ballThrow: 'Rolling out!',
    gotBall: 'Got it!',
    tttDraw: 'A draw!',
    tttYouStart: 'You go first!',
    tttIStart: "I'll start!",
    wake: '!?',
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = LINES;
else (root.CharacterLines = root.CharacterLines || {}).tonk = LINES;
})(typeof window !== 'undefined' ? window : globalThis);
