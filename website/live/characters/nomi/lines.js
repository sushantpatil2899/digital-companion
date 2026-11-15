'use strict';

// Nomi's fixed lines: what's written on the signs and bubbles she holds up
// (nudges, meetings, games; by mood band) and the little floating texts.
// Soft and dreamy, comforting rather than advising. Used by the main process
// (require) and by the companion window (script tag, registers
// window.CharacterLines.nomi). Her own words come from her mind.

(function (root) {
const LINES = {
  // Signs and bubbles (src/main/nudges.js say()), by mood band.
  signs: {
    water: { cheerful: 'A little water?', content: 'Water break?', meh: '…water?', sad: 'Some water… for me?', grumpy: 'Water, please.' },
    stretch: { cheerful: 'Stretch like a cloud?', content: 'Stretch a little?', meh: '…stretch?', sad: 'A small stretch…', grumpy: 'Stretch, please.' },
    eyes: { cheerful: 'Look at the sky?', content: 'Rest your eyes', meh: '…eyes?', sad: 'Rest your eyes…', grumpy: 'Look away.' },
    bedtime: { cheerful: 'Time to dream?', content: 'Getting late…', meh: '…bed?', sad: 'Sleep soon…', grumpy: 'Bed, please.' },
    note: { cheerful: 'A little reminder', content: 'Reminder', meh: '…reminder', sad: "Don't forget…", grumpy: 'Remember this.' },
    meeting30: { cheerful: 'Meeting in 30 min', content: 'Meeting in 30 min', meh: '…meeting in 30', sad: 'Meeting in 30…', grumpy: 'Meeting. 30 min.' },
    meeting5: { cheerful: 'Meeting in 5', content: 'Meeting in 5', meh: '…meeting in 5', sad: 'Meeting in 5…', grumpy: 'Meeting. 5 min.' },
    meetingNow: { cheerful: 'Meeting now', content: 'Meeting now', meh: '…meeting now', sad: 'Meeting now…', grumpy: 'Meeting. Now.' },
    fetch: { cheerful: 'Catch my bubble?', content: 'Play fetch?', meh: '…fetch?', sad: 'Fetch…?', grumpy: 'Throw it, then.' },
    fetchAgain: { cheerful: 'Another bubble?', content: 'Again?', meh: '…again?', sad: 'One more…?', grumpy: 'Again.' },
    ttt: { cheerful: 'Stars or moons?', content: 'Tic-tac-toe?', meh: '…tic-tac-toe?', sad: 'Play with me…?', grumpy: 'Tic-tac-toe.' },
  },
  // Floating text after you answer a nudge or a game ends, by mood band.
  says: {
    reminderAck: { cheerful: 'Okay!', content: 'Okay', meh: 'mm.', sad: 'okay…', grumpy: 'Fine.' },
    noteDone: { cheerful: 'Okay!', content: 'Okay', meh: 'mm.', sad: 'okay…', grumpy: 'Fine.' },
    waterDone: { cheerful: 'Like rain inside!', content: 'Good', meh: 'mm.', sad: 'thank you…', grumpy: 'Good.' },
    stretchDone: { cheerful: 'Floaty?', content: 'Better?', meh: 'mm.', sad: 'thank you…', grumpy: 'Better.' },
    eyesDone: { cheerful: 'Softer now.', content: 'Better', meh: '…better', sad: '…better', grumpy: 'There.' },
    bedtimeDone: { cheerful: 'Sweet dreams.', content: 'Night', meh: 'night.', sad: 'night…', grumpy: 'Finally.' },
    nudgeLater: { cheerful: 'Later, then.', content: 'Later then…', meh: '…later.', sad: 'later…', grumpy: 'Later. Again.' },
    gaveUp: { cheerful: "I'll dream something up.", content: 'Never mind…', meh: '…never mind.', sad: 'okay… never mind', grumpy: 'Hm.' },
    thatWasFun: { cheerful: 'That was lovely.', content: 'That was nice.', meh: 'that was okay.', sad: 'thank you…', grumpy: 'Hm. Nice.' },
    tttYouWin: { cheerful: 'You win! Pretty.', content: 'You win.', meh: 'you win.', sad: 'you win…', grumpy: 'You win.' },
    tttIWin: { cheerful: 'A little constellation.', content: 'I win.', meh: 'I win.', sad: 'I won…', grumpy: 'Mine.' },
  },
  // Floating text for other moments (src/renderer/renderer.js handleEvent).
  floats: {
    throw: 'Whoosh…',
    grab: 'oh?',
    goodMorning: 'Morning…',
    hello: 'Hello again.',
    welcomeBack: "You're back.",
    charging: 'Warm…',
    lonely: '…',
    eventEnded: "That's done.",
    ballThrow: 'Wait for me!',
    gotBall: 'Got it.',
    tttDraw: 'A draw. Nice.',
    tttYouStart: 'You first.',
    tttIStart: "I'll start.",
    wake: 'mmm…?',
    // Her own: the dream bubble popped.
    bubblePop: 'Oh!',
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = LINES;
else (root.CharacterLines = root.CharacterLines || {}).nomi = LINES;
})(typeof window !== 'undefined' ? window : globalThis);
