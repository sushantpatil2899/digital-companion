---
name: new-character
description: Design and add a new Filo character (like Togepi, Pip, Mori or Nomi) from a short description, filling in every part with suitable defaults, then refining it with the person reviewing live in the character creator (in Filo, or in a browser). Use when someone wants a new character, companion or creature in the app, or asks to change how an existing character looks, moves, sounds or what its personality is.
---

# A new character

Each character is a folder in `src/characters/<id>/` with four files. Read
`src/characters/README.md` first: it says what each file holds and what else
a new character needs. `test/characters.test.js` checks all of it.

Everything about a character lives in those files, nowhere else: its
personality is the `personality`, `self` and `concept` fields in its
`index.js`. Don't keep a separate document of it.

## 1. A short description

Ask for, in one short message:

- its name;
- its pronoun: he, she or they. Ask; never guess it from the name;
- what it is and how it looks: a sentence or two, its aesthetic, or a
  picture or sketch;
- anything else they already know (how it moves, what it loves doing, its
  humour). All optional.

## 2. Fill in the whole character with defaults

Decide every part yourself, choosing each default from the description and
aesthetic (a forest creature collects leaves and makes tea; a clockwork
bird winds itself up):

- its one-line concept, and how it looks: shape, colours, what it wears or
  carries, front and back;
- "Who I am": first person, a short paragraph, ending with one sentence
  about its humour. No tone instructions;
- its personality: every slider, 0–100 with 50 as average, picked from who
  the character is, not averages;
- how it moves: walks, hops, floats…;
- its activities: one for each need (hunger, energy, boredom, affection, the
  same four for everyone), a few more for boredom, night-only or
  music-only ones if they fit;
- how it acts when sleepy, bored, lonely, happy and thrown around;
- its tic-tac-toe pieces, its fetch item, how it watches with you;
- its voice: a chirp, sounds not words.

Sizes may differ per character, but none much bigger than Togepi.

Then tell the person what you came up with in a short summary they can
skim, in plain words: who it is, how it looks and moves, what it does, and
its strongest traits, each with a few words on why ("very curious: a
clockwork bird that takes things apart"). Say they're suggestions. Don't
list files, fields or every slider: they'll see all of it in the
character creator. Let them change anything, then build it.

## 3. Start from the closest character

Copy the folder of whichever existing character is nearest (walks or floats,
round or tall, similar props) to `src/characters/<id>/`, then rename
everything: the comments, `window.Characters.<id>`,
`window.CharacterLines.<id>`, `id`, `name`, `pronoun`, `concept`. Put in the
`self` and `personality` from step 2.

Wire it in, as the README lists:

- `src/characters/index.js`: add it to `CHARACTERS`;
- `src/renderer/index.html`: its `look.js`, `voice.js` and `lines.js` tags,
  after the others;
- `src/renderer/games/ball.html` and `src/renderer/picker.html`: its `look.js`;
- `src/renderer/games/board.js`: its pieces in `PIECES`, if it has its own.

Run `node --test test/characters.test.js` and fix what fails before going on.

## 4. Open the character creator

The character creator (`src/creator/`) shows the character through the
app's real renderer and simulation. Its tabs:

- **Scenes**: ready-made scenes for every state and activity;
- **Personality**: what its `index.js` says about who it is: concept, "Who
  I am", its strongest traits and values, and every slider with its
  explanation;
- **Simulation**: the app's real simulation in a bordered world: it
  decides what to do by itself, and the person can pick it up, throw it,
  pat and pet it, change its needs, ask for any activity, or make it night;
- **More → State** and **More → Raw pose**: any state, or any pose field,
  by hand. Only with **Debug** on (bottom right).

Open it where the person wants it; ask if you don't know:

- **In Filo**, if they run it from this repo (`npm start`):
  `npx electron . --creator=<id>`. A running Filo opens its creator on that
  character (the command hands it over and exits); if Filo isn't running,
  this starts it with the creator open. Filo doesn't reload the creator when
  files change: run the same command again after each change.
- **In a browser**, with no Filo needed. It reloads by itself when a file
  under `src/` changes, within a second.
  1. Is it running? `curl -s -o /dev/null -w '%{http_code}' http://localhost:5178/creator/env.json`
     prints `200` if so.
  2. If not, start it in the background: `npm run creator` (in Claude Code,
     a background Bash command; elsewhere
     `nohup npm run creator > /tmp/filo-creator.log 2>&1 &`).
  3. Open it on the new character: `open "http://localhost:5178/?character=<id>"`
     on macOS, `xdg-open` on Linux. Give the person the link too.

If you can drive a browser yourself (Claude in Chrome, the built-in browser
or similar), open the same link and look before the person does: step
through the scenes and check for clipping, parts drawn in the wrong place,
poses that jump between frames. Say what you checked.

## 5. Refine it with the person, one part at a time

For each part: make the change, say which tab and scene to look at, and ask
what to change. Talk about what they'll see, not the code. Repeat until they say it's right, then go on.

1. **The look** (`look.js`): `PALETTE`, the body and face, `draw(ctx, pose)`
   and `defaultPose()`. Everything is drawn relative to its feet at (0, 0),
   up is negative y. Check the idle, walk, sleep, happy and sad states and
   the basic poses (Debug, then More → Raw pose).
2. **Its movement and the shared states**: walking (or floating), being
   held and thrown, sleeping, eating, the item arm (`arms: 'item'`, copy
   `itemArm` / `drawItem` from the character you started from), `heldProp`
   and `drawFetchItem` for fetch, `watchPose`. Have the person try it in
   the Simulation tab: walking about, picked up, thrown, landing.
3. **Its own activities** (`activities` in `index.js`, `activityPose` in
   `look.js`): see `src/characters/togepi/index.js` and
   `src/characters/pip/index.js` for what each field means (`stay` or
   `move`, `effects`, `score`, `moods`, `variants`, `night`, `needs`).
   Each one shows up as a scene.
4. **Who it is**: the Personality tab. Change `self` and `personality` in
   `index.js` until the person is happy with it.
5. **Its voice** (`voice.js`): a synthesized chirp per mood band. Turn
   Sound on in the creator's toolbar to hear it.
6. **Its lines** (`lines.js`): every sign and `says` text the test lists,
   in its own voice, by mood band.

## 6. Finish

- Write down what the person approved in `docs/mind/DECISIONS.md`, like the
  entries for Pip, Mori and Nomi.
- In `src/main/welcome.js`, bump `WELCOME_VERSION` and add a "Meet <name>"
  entry to `WHATS_NEW`, like the earlier ones.
- Run `npm test`.
- Offer to try it in the real app: `npm start`, then pick it under
  Character in the companion's menu (Mind → Personality… shows its sliders
  there too).
- If `graphify-out/graph.json` exists, run `graphify update .`.
