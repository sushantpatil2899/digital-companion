# Characters

Each character lives in its own folder here (Phase 9, `docs/mind/PLAN.md`).
Everything not listed below is shared by all characters: the brain (needs,
mood, choosing what to do), movement and physics, games, nudges, watching
together, the mind (thoughts, chat, questions, memory, diary, growth) and
the windows.

| File | Runs in | What it has |
|---|---|---|
| `index.js` | main process | id, name, starting personality and "Who I am", its own activities (menu label, words for its mind, brain-view label, on the spot or moving, effects on needs, how appealing by needs and mood, `variants`, `night`), its own `states`, `soloPlay` (what it does when nobody plays), its lines, and optional reactions: `afterThrow`, `thrownTooMuch`, `fetchDistraction`, `speed` |
| `look.js` | companion window, fetch ball window | drawing code for all the basic poses (`draw(ctx, pose)`, `defaultPose()`), how its own activities look (`activityPose`), marks by its head (`overlays`), the fetch item (`drawFetchItem`), `heldProp`, `turned`, `BODY_CY`, `HEAD_TOP`; registers `window.Characters.<id>` |
| `voice.js` | companion window | its generated chirp (`chirp(...)`); registers on `window.Characters.<id>` |
| `lines.js` | both | fixed texts: `signs` (nudges, meetings, games, by mood band), `says` (after you answer a nudge or a game ends), `floats` (other little floating texts) |

A new character also needs:

- an entry in `index.js` in this folder;
- its `look.js`, `voice.js` and `lines.js` script tags in
  `src/renderer/index.html`, and its `look.js` in
  `src/renderer/games/ball.html` and `src/renderer/picker.html`;
- its tic-tac-toe pieces, if it has its own, in `src/renderer/games/board.js`.
- `arms: 'item'` in its `look.js`: the picture in `pose.item` (`{ img, w, h }`)
  held up in the hand on the left of its body and waved by `pose.itemWave`,
  for the shared `holdItem` / `playItem` states (copy `itemArm` / `drawItem`
  from another character).

`test/characters.test.js` checks all of this.

Each character keeps its own data in
`<app data>/characters/<id>/` (`brain.json`, `mind/`, `sounds/`); see
`src/main/migrate.js`.

To see a character, its personality and play with it, open the character
creator (`src/creator/`, served by `src/main/creator.js`): in Filo from
Character → Pick your companion… → More info, or `npx electron .
--creator=<id>` from the repo; or in a browser with `npm run creator`
and http://localhost:5178/?character=<id> (it reloads when you change a
file). Tabs: ready-made scenes, its personality (concept, "Who I am" and
every slider, explained) and the real simulation in a little world where
you can pick it up and throw it; with Debug on (bottom right), every frame
field by hand and a raw pose editor. To make a new character with Claude
Code or Codex, use the `new-character` skill
(`skills/new-character/`).
