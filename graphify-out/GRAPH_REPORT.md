# Graph Report - digital-companion  (2026-10-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 895 nodes · 1725 edges · 48 communities (41 shown, 7 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 148 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc239040`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Companion state machine and physics
- Togepi drawing code
- Companion constants and game config
- Needs, mood and activity scoring
- Electron main process setup
- Packaging and preload bridges
- README sections
- Renderer poses and events
- Companion tests
- Front app and calendar watchers
- Model download script
- Mind plan and decisions docs
- App signing and event-log helpers
- macOS JXA helper scripts
- Brain debug view
- Mind engine (llama-server)
- Personality model and file
- Remind-me window
- graphify usage rules
- graphify skill registration
- Tic-tac-toe rules and game tests
- Mind tests
- Mind menu and data folders
- Main loop and window placement
- Screen travel tests
- Mind decision loop
- Fetch ball window
- Tic-tac-toe board window
- session-start.sh
- Think prompt and line checks
- Context tracker
- Brain tests
- Privacy gate
- Sound clip library
- Context and px tests
- Memory, diary and recall
- Event log
- Personality editor window
- Chirp synthesis
- NudgeTracker
- Nudge tests
- Settings defaults and lists
- Nudge timing and phrases
- Settings file storage
- Context watchers and brain saving
- Small windows that follow you
- Screen layout and routes
- Memories window

## God Nodes (most connected - your core abstractions)
1. `Companion` - 105 edges
2. `MIND` - 25 edges
3. `MEMORY` - 17 edges
4. `ContextTracker` - 16 edges
5. `NudgeTracker` - 16 edges
6. `ellipse()` - 16 edges
7. `Research: how to represent, store and grow a personality` - 15 edges
8. `Engine` - 13 edges
9. `BALL` - 13 edges
10. `drawCharacter()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Making him your own` --references--> `scoreActivities()`  [INFERRED]
  README.md → src/main/brain.js
- `Making him your own` --references--> `computePose()`  [INFERRED]
  README.md → src/renderer/renderer.js
- `Making him your own` --references--> `zigzag()`  [INFERRED]
  README.md → src/renderer/character.js
- `inMeetingTracker()` --calls--> `ContextTracker`  [EXTRACTED]
  test/context.test.js → src/main/context.js
- `{ Companion }` --calls--> `Companion`  [EXTRACTED]
  test/brain.test.js → src/main/companion.js

## Import Cycles
- None detected.

## Communities (48 total, 7 thin omitted)

### Community 0 - "Companion state machine and physics"
Cohesion: 0.08
Nodes (4): clamp(), Companion, rand(), hardThrow()

### Community 1 - "Togepi drawing code"
Cohesion: 0.08
Nodes (51): Making him your own, armAngle(), bagSide(), bellyShadow(), bodyPath(), drawApple(), drawArm(), drawBackpackBag() (+43 more)

### Community 2 - "Companion constants and game config"
Cohesion: 0.11
Nodes (17): { Ball, BALL }, BOARD_STATES, brain, BUSY_WHEN_QUIET, GAME_STATES, GAMES, HELD_BALL, INTERRUPTIBLE (+9 more)

### Community 3 - "Needs, mood and activity scoring"
Cohesion: 0.19
Nodes (13): ALL, apply(), catchUp(), clamp01(), drift(), EFFECTS, ENERGETIC, moodBand() (+5 more)

### Community 4 - "Electron main process setup"
Cohesion: 0.08
Nodes (28): ACTIVITY_MENU, { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, shell, session }, { AppWatcher }, { BALL }, BEDTIMES, { CalendarWatcher }, closeBoard(), { Companion, TUNING } (+20 more)

### Community 5 - "Packaging and preload bridges"
Cohesion: 0.04
Nodes (42): author, build, appId, asarUnpack, directories, extraResources, files, mac (+34 more)

### Community 6 - "README sections"
Cohesion: 0.18
Nodes (10): Desktop Companion, Games, His brain, His mind, How it works, Looking after you, Making Togepi.app (macOS), Platform notes (+2 more)

### Community 7 - "Renderer poses and events"
Cohesion: 0.14
Nodes (21): clock(), applyMoodFace(), canvas, clamp(), computePose(), ctx, drawOverlay(), drawParticles() (+13 more)

### Community 8 - "Companion tests"
Cohesion: 0.22
Nodes (7): MENU_ACTIVITIES, TUNING, assert, bounds, { Companion, MENU_ACTIVITIES, TUNING }, run(), test

### Community 9 - "Front app and calendar watchers"
Cohesion: 0.06
Nodes (38): CalendarWatcher, findMeetingLink(), MEETING_LINKS, MESSAGES, parseCalendarOutput(), path, readEvents(), { run } (+30 more)

### Community 10 - "Model download script"
Cohesion: 0.13
Nodes (15): download(), ENGINE_ASSETS, ENGINE_DIR, { execFileSync }, fetchEngine(), fetchModels(), fs, mb() (+7 more)

### Community 11 - "Mind plan and decisions docs"
Cohesion: 0.05
Nodes (41): General, Phase 1 feedback (Sushant tried it on his Mac, 2026-10-20), Phase 1 implementation decisions, Phase 1 questions, Phase 2 implementation decisions, Phase 2 questions, Togepi's mind: decisions log, Architecture (as built in Phase 1) (+33 more)

### Community 12 - "App signing and event-log helpers"
Cohesion: 0.18
Nodes (9): apps, dist, { execFileSync }, fs, path, ago(), describeEvent(), fs (+1 more)

### Community 13 - "macOS JXA helper scripts"
Cohesion: 0.27
Nodes (4): authStatus(), isMissing(), requestAccess(), run()

### Community 14 - "Brain debug view"
Cohesion: 0.39
Nodes (8): bar(), color(), esc(), fmtTime(), moodBar(), NEEDS, render(), STATE_NAMES

### Community 15 - "Mind engine (llama-server)"
Cohesion: 0.11
Nodes (10): Engine, fetchJson(), freePort(), fs, isOurServer(), locate(), net, path (+2 more)

### Community 16 - "Personality model and file"
Cohesion: 0.15
Nodes (22): band(), clampScore(), clone(), defaultPersonality(), describe(), diff(), fs, getPath() (+14 more)

### Community 17 - "Remind-me window"
Cohesion: 0.60
Nodes (4): add(), fmt(), setButtons(), text

### Community 20 - "Tic-tac-toe rules and game tests"
Cohesion: 0.07
Nodes (26): GAME, BALL, inAnyDisplay(), screensLib, bestMoves(), chooseMove(), completes(), freeSquares() (+18 more)

### Community 21 - "Mind tests"
Cohesion: 0.11
Nodes (14): assert, { Companion }, { EventLog, describeEvent }, fs, { groupClips, pickClip }, { locate }, { Mind, MIND, FEEL_DIFFERENT }, os (+6 more)

### Community 22 - "Mind menu and data folders"
Cohesion: 0.24
Nodes (14): applyMind(), buildMenu(), eventsFile(), mindDir(), mindMenu(), personalityFile(), playMenu(), refreshTrayMenu() (+6 more)

### Community 23 - "Main loop and window placement"
Cohesion: 0.19
Nodes (12): allDisplays(), boundsForPoint(), callHere(), chirp(), createWindow(), startLoop(), stopLoop(), tick() (+4 more)

### Community 24 - "Screen travel tests"
Cohesion: 0.20
Nodes (7): assert, { Companion }, companionOn(), LAYOUTS, screens, seeded(), test

### Community 26 - "Fetch ball window"
Cohesion: 0.33
Nodes (3): ball, canvas, ctx

### Community 27 - "Tic-tac-toe board window"
Cohesion: 0.33
Nodes (4): again, cells, grid, status

### Community 29 - "Think prompt and line checks"
Cohesion: 0.17
Nodes (15): ACTIONS, BAND_WORDS, cleanLine(), daysAgo(), { describeEvent }, needsWords(), norm(), P (+7 more)

### Community 30 - "Context tracker"
Cohesion: 0.16
Nodes (5): defaultContext(), middayToday(), ContextTracker, dayString(), { defaultContext }

### Community 31 - "Brain tests"
Cohesion: 0.22
Nodes (9): assert, bounds, brain, { Companion }, grounded(), meetingSetup(), seeded(), test (+1 more)

### Community 32 - "Privacy gate"
Cohesion: 0.24
Nodes (9): check(), lower(), MODEL_QUESTION, MONEY_APPS, PASSWORD_APPS, PASSWORD_BUNDLES, SENSITIVE_TITLE, SENSITIVE_URL (+1 more)

### Community 33 - "Sound clip library"
Cohesion: 0.25
Nodes (7): EXTS, fs, groupClips(), MOODS, path, pickClip(), SoundLibrary

### Community 34 - "Context and px tests"
Cohesion: 0.16
Nodes (9): assert, clock(), c, { ContextTracker }, inMeetingTracker(), test, assert, { px } (+1 more)

### Community 35 - "Memory, diary and recall"
Cohesion: 0.06
Nodes (46): cleanList(), dayDigest(), IMPORTANCE, isMail(), MAIL_APPS, MAIL_SITES, rateImportance(), SCHEMA (+38 more)

### Community 37 - "Personality editor window"
Cohesion: 0.33
Nodes (4): groups, inputs, NOTES, READ_ONLY

### Community 38 - "Chirp synthesis"
Cohesion: 0.70
Nodes (4): audio(), note(), play(), playClip()

### Community 40 - "Nudge tests"
Cohesion: 0.20
Nodes (9): HIT, assert, { Companion, HIT }, { NudgeTracker, pastBedtime, say, TIMING }, seeded(), setup(), sim, START (+1 more)

### Community 41 - "Settings defaults and lists"
Cohesion: 0.22
Nodes (8): NUDGE_DEFAULTS, BLOCK_KEYS, fs, LIST_KEYS, MEETING_BUNDLES, { NUDGE_DEFAULTS }, path, PRESENT_BUNDLES

### Community 42 - "Nudge timing and phrases"
Cohesion: 0.28
Nodes (8): clockTime(), dayString(), minutesOf(), pastBedtime(), PRIORITY, say(), TEXT, TIMING

### Community 44 - "Context watchers and brain saving"
Cohesion: 0.25
Nodes (8): applyReadCalendar(), applyWatchApps(), brainFile(), hideForPresenting(), loadBrain(), saveBrain(), showAfterPresenting(), startContext()

### Community 45 - "Small windows that follow you"
Cohesion: 0.29
Nodes (7): followYou(), sendNotes(), sendPersonality(), showBrain(), showNotes(), showPersonality(), updatePersonality()

### Community 46 - "Screen layout and routes"
Cohesion: 0.48
Nodes (6): link(), linksFrom(), makeScreens(), overlap(), route(), toScreen()

### Community 47 - "Memories window"
Cohesion: 0.83
Nodes (3): empty(), forgetButton(), list()

## Knowledge Gaps
- **1 isolated node(s):** `electron-builder`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 374 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Companion` connect `Companion state machine and physics` to `Companion constants and game config`, `Electron main process setup`, `NudgeTracker`, `Companion tests`, `Nudge tests`, `Tic-tac-toe rules and game tests`, `Mind tests`, `Main loop and window placement`, `Screen travel tests`, `Brain tests`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **What connects `electron-builder` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Companion state machine and physics` be split into smaller, more focused modules?**
  _Cohesion score 0.07620383356708742 - nodes in this community are weakly interconnected._
- **Why does `Making him your own` connect `Togepi drawing code` to `Needs, mood and activity scoring`, `README sections`, `Renderer poses and events`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Should `Togepi drawing code` be split into smaller, more focused modules?**
  _Cohesion score 0.08357685563997662 - nodes in this community are weakly interconnected._
- **Why does `scoreActivities()` connect `Needs, mood and activity scoring` to `Togepi drawing code`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Should `Companion constants and game config` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._