'use strict';

// Pip's fixed lines (reviewed by Sushant, 2026-10-24): what's written on the
// signs and bubbles he holds up (nudges, meetings, games; by mood band) and
// the little floating texts. Used by the main process (require) and by the
// companion window (script tag, registers window.CharacterLines.pip). His
// own words come from his mind.

(function (root) {
const LINES = {
  // Signs and bubbles (src/main/nudges.js say()), by mood band.
  signs: {
    water: { cheerful: 'Hydration time!', content: 'Water break?', meh: '…water.', sad: 'Drink water…', grumpy: 'Water. Now.' },
    stretch: { cheerful: 'Stretch protocol!', content: 'Stretch break?', meh: '…stretch.', sad: 'Please stretch…', grumpy: 'Stand. Stretch.' },
    eyes: { cheerful: 'Eyes off screen!', content: 'Rest your eyes', meh: '…eyes.', sad: 'Rest your eyes…', grumpy: 'Look away.' },
    bedtime: { cheerful: 'Sleep mode soon?', content: 'Getting late…', meh: '…bed?', sad: 'Go to bed…', grumpy: 'Bed. Now.' },
    note: { cheerful: 'Reminder!', content: 'Reminder', meh: '…reminder', sad: "Don't forget…", grumpy: 'Remember this.' },
    meeting30: { cheerful: 'Meeting in 30 min', content: 'Meeting in 30 min', meh: '…meeting in 30', sad: 'Meeting in 30…', grumpy: 'Meeting. 30 min.' },
    meeting5: { cheerful: 'Meeting in 5!', content: 'Meeting in 5', meh: '…meeting in 5', sad: 'Meeting in 5…', grumpy: 'Meeting. 5 min.' },
    meetingNow: { cheerful: 'Meeting now!', content: 'Meeting now!', meh: '…meeting now', sad: 'Meeting now…', grumpy: 'Meeting. Now.' },
    fetch: { cheerful: "Fetch? I'm fast.", content: 'Play fetch?', meh: '…fetch?', sad: 'Fetch…?', grumpy: 'Throw it.' },
    fetchAgain: { cheerful: 'Again. Faster.', content: 'Again?', meh: '…again?', sad: 'One more…?', grumpy: 'Again.' },
    ttt: { cheerful: 'Tic-tac-toe, rookie?', content: 'Tic-tac-toe?', meh: '…tic-tac-toe?', sad: 'Play with me…?', grumpy: 'Tic-tac-toe. Now.' },
  },
  // Floating text after you answer a nudge or a game ends, by mood band.
  says: {
    reminderAck: { cheerful: 'Noted!', content: 'Noted', meh: 'noted.', sad: 'noted…', grumpy: 'Fine.' },
    noteDone: { cheerful: 'Noted!', content: 'Noted', meh: 'noted.', sad: 'noted…', grumpy: 'Fine.' },
    waterDone: { cheerful: 'Hydration logged!', content: 'Logged', meh: 'ok.', sad: 'thanks…', grumpy: 'Adequate.' },
    stretchDone: { cheerful: 'Systems loosened!', content: 'Better?', meh: 'ok.', sad: 'thanks…', grumpy: 'Acceptable.' },
    eyesDone: { cheerful: 'Eyes recalibrated!', content: 'Better', meh: '…better', sad: '…better', grumpy: 'There.' },
    bedtimeDone: { cheerful: 'Powering down!', content: 'Night!', meh: 'night.', sad: 'night…', grumpy: 'Finally.' },
    nudgeLater: { cheerful: 'Rescheduled!', content: 'Later then…', meh: '…later.', sad: 'later…', grumpy: 'Noted. Again.' },
    gaveUp: { cheerful: "I'll play myself then.", content: 'Never mind…', meh: '…never mind.', sad: 'ok… never mind', grumpy: 'Your loss.' },
    thatWasFun: { cheerful: 'Fun: confirmed.', content: 'That was fun.', meh: 'that was ok.', sad: 'thanks…', grumpy: 'Hmph. Fun.' },
    tttYouWin: { cheerful: 'Statistically improbable.', content: 'Statistically improbable.', meh: 'you win.', sad: 'you win…', grumpy: 'Statistically improbable.' },
    tttIWin: { cheerful: 'As calculated.', content: 'I win.', meh: 'I win.', sad: 'I won…', grumpy: 'Obviously.' },
  },
  // Floating text for other moments (src/renderer/renderer.js handleEvent).
  floats: {
    throw: 'Hey!',
    grab: '!',
    goodMorning: 'Morning. Systems on.',
    hello: 'Hello again.',
    welcomeBack: "You're back. Noted.",
    charging: 'Power. Excellent.',
    lonely: '…',
    eventEnded: 'Meeting concluded.',
    ballThrow: 'Tracking it!',
    gotBall: 'Retrieved.',
    tttDraw: 'A draw. Hm.',
    tttYouStart: 'You go first.',
    tttIStart: "I'll start.",
    wake: '!?',
    // His own: after a throw, once he's checked himself.
    unnecessary: 'That was unnecessary.',
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = LINES;
else (root.CharacterLines = root.CharacterLines || {}).pip = LINES;
})(typeof window !== 'undefined' ? window : globalThis);
