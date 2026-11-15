'use strict';

// Mori's fixed lines (reviewed by Sushant, 2026-10-24): what's written on the
// signs and bubbles he holds up (nudges, meetings, games; by mood band) and
// the little floating texts. Used by the main process (require) and by the
// companion window (script tag, registers window.CharacterLines.mori). His
// own words come from his mind.

(function (root) {
const LINES = {
  // Signs and bubbles (src/main/nudges.js say()), by mood band.
  signs: {
    water: { cheerful: 'Tea? Or water.', content: 'Water break?', meh: '…water?', sad: 'Drink some water…', grumpy: 'Water. Please.' },
    stretch: { cheerful: 'Stretch with me?', content: 'Stretch a little?', meh: '…stretch?', sad: 'Please stretch…', grumpy: 'Up. Stretch.' },
    eyes: { cheerful: 'Look at a tree?', content: 'Rest your eyes', meh: '…eyes?', sad: 'Rest your eyes…', grumpy: 'Look away. Please.' },
    bedtime: { cheerful: 'Bed soon?', content: "It's getting late…", meh: '…bed?', sad: 'Go to sleep…', grumpy: 'Bed. Please.' },
    note: { cheerful: 'A reminder', content: 'Reminder', meh: '…reminder', sad: "Don't forget…", grumpy: 'Remember this.' },
    meeting30: { cheerful: 'Meeting in 30 min', content: 'Meeting in 30 min', meh: '…meeting in 30', sad: 'Meeting in 30…', grumpy: 'Meeting. 30 min.' },
    meeting5: { cheerful: 'Meeting in 5', content: 'Meeting in 5', meh: '…meeting in 5', sad: 'Meeting in 5…', grumpy: 'Meeting. 5 min.' },
    meetingNow: { cheerful: 'Meeting now', content: 'Meeting now', meh: '…meeting now', sad: 'Meeting now…', grumpy: 'Meeting. Now.' },
    fetch: { cheerful: 'Pinecone?', content: 'Play fetch?', meh: '…fetch?', sad: 'Fetch…?', grumpy: 'Throw it, then.' },
    fetchAgain: { cheerful: 'Once more?', content: 'Again?', meh: '…again?', sad: 'One more…?', grumpy: 'Again.' },
    ttt: { cheerful: 'Leaves or mushrooms?', content: 'Tic-tac-toe?', meh: '…tic-tac-toe?', sad: 'Play with me…?', grumpy: 'Tic-tac-toe.' },
    // His own: the 3rd throw in 10 minutes.
    pleaseDont: { cheerful: "Please don't.", content: "Please don't.", meh: "Please don't.", sad: "Please don't…", grumpy: "Please don't." },
  },
  // Floating text after you answer a nudge or a game ends, by mood band.
  says: {
    reminderAck: { cheerful: 'Good.', content: 'Okay', meh: 'mm.', sad: 'okay…', grumpy: 'Fine.' },
    noteDone: { cheerful: 'Good.', content: 'Okay', meh: 'mm.', sad: 'okay…', grumpy: 'Fine.' },
    waterDone: { cheerful: 'Good. Very good.', content: 'Good', meh: 'mm.', sad: 'thank you…', grumpy: 'Good.' },
    stretchDone: { cheerful: 'Better, right?', content: 'Better?', meh: 'mm.', sad: 'thank you…', grumpy: 'Better.' },
    eyesDone: { cheerful: 'Nice and soft.', content: 'Better', meh: '…better', sad: '…better', grumpy: 'There.' },
    bedtimeDone: { cheerful: 'Sleep well.', content: 'Night', meh: 'night.', sad: 'night…', grumpy: 'Finally.' },
    nudgeLater: { cheerful: 'Later, then.', content: 'Later then…', meh: '…later.', sad: 'later…', grumpy: 'Later. Again.' },
    gaveUp: { cheerful: "I'll find a leaf.", content: 'Never mind…', meh: '…never mind.', sad: 'okay… never mind', grumpy: 'Hm.' },
    thatWasFun: { cheerful: 'That was nice.', content: 'That was nice.', meh: 'that was okay.', sad: 'thank you…', grumpy: 'Hm. Nice.' },
    tttYouWin: { cheerful: 'Well played.', content: 'Well played.', meh: 'you win.', sad: 'you win…', grumpy: 'Hm. Well played.' },
    tttIWin: { cheerful: 'Mushrooms win.', content: 'I win.', meh: 'I win.', sad: 'I won…', grumpy: 'Mushrooms.' },
  },
  // Floating text for other moments (src/renderer/renderer.js handleEvent).
  floats: {
    throw: 'Oh…',
    grab: 'mm?',
    goodMorning: 'Morning.',
    hello: 'Hello again.',
    welcomeBack: "You're back. Good.",
    charging: 'Warm.',
    lonely: '…',
    eventEnded: "That's done.",
    ballThrow: "I'll get it… slowly.",
    gotBall: 'Got it.',
    tttDraw: 'A draw. Nice.',
    tttYouStart: 'You first.',
    tttIStart: "I'll start.",
    wake: 'mm…?',
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = LINES;
else (root.CharacterLines = root.CharacterLines || {}).mori = LINES;
})(typeof window !== 'undefined' ? window : globalThis);
