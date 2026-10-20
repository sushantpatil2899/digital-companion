# Graph Report - digital-companion  (2026-10-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 810 nodes · 1538 edges · 40 communities (33 shown, 7 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 136 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3fc5b5e9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Companion state machine and physics
- Togepi drawing code
- Companion constants and game config
- Needs, mood and activity scoring
- Electron main process and menus
- Packaging and preload bridges
- README sections
- Renderer poses and particles
- Companion tests
- Front app, calendar and settings watchers
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
- Nudge tests
- NudgeTracker
- Nudge timing and phrases
- Mind decision loop
- Fetch ball window
- Tic-tac-toe board window
- session-start.sh
- Think prompt and line checks
- Context tracker
- Brain tests
- Privacy gate
- Sound clip library
- Mind phases and note removal
- Mind module wiring
- Event log
- Personality editor window
- Chirp synthesis

## God Nodes (most connected - your core abstractions)
1. `Companion` - 105 edges
2. `MIND` - 21 edges
3. `ContextTracker` - 16 edges
4. `NudgeTracker` - 16 edges
5. `ellipse()` - 16 edges
6. `Research: how to represent, store and grow a personality` - 14 edges
7. `BALL` - 13 edges
8. `drawCharacter()` - 13 edges
9. `createWindow()` - 12 edges
10. `Engine` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Making him your own` --references--> `zigzag()`  [INFERRED]
  README.md → src/renderer/character.js
- `Making him your own` --references--> `computePose()`  [INFERRED]
  README.md → src/renderer/renderer.js
- `Making him your own` --references--> `scoreActivities()`  [INFERRED]
  README.md → src/main/brain.js
- `inMeetingTracker()` --calls--> `ContextTracker`  [EXTRACTED]
  test/context.test.js → src/main/context.js
- `{ Companion }` --calls--> `Companion`  [EXTRACTED]
  test/brain.test.js → src/main/companion.js

## Import Cycles
- None detected.

## Communities (40 total, 7 thin omitted)

### Community 0 - "Companion state machine and physics"
Cohesion: 0.08
Nodes (4): clamp(), Companion, rand(), hardThrow()

### Community 1 - "Togepi drawing code"
Cohesion: 0.09
Nodes (50): armAngle(), bagSide(), bellyShadow(), bodyPath(), drawApple(), drawArm(), drawBackpackBag(), drawBackpackStraps() (+42 more)

### Community 2 - "Companion constants and game config"
Cohesion: 0.11
Nodes (17): { Ball, BALL }, BOARD_STATES, brain, BUSY_WHEN_QUIET, GAME_STATES, GAMES, HELD_BALL, INTERRUPTIBLE (+9 more)

### Community 3 - "Needs, mood and activity scoring"
Cohesion: 0.18
Nodes (14): Making him your own, ALL, apply(), catchUp(), clamp01(), drift(), EFFECTS, ENERGETIC (+6 more)

### Community 4 - "Electron main process and menus"
Cohesion: 0.05
Nodes (70): ACTIVITY_MENU, allDisplays(), { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, shell, session }, applyMind(), applyReadCalendar(), applyWatchApps(), { AppWatcher }, { BALL } (+62 more)

### Community 5 - "Packaging and preload bridges"
Cohesion: 0.04
Nodes (41): author, build, appId, asarUnpack, directories, extraResources, files, mac (+33 more)

### Community 6 - "README sections"
Cohesion: 0.18
Nodes (10): Desktop Companion, Games, His brain, His mind, How it works, Looking after you, Making Togepi.app (macOS), Platform notes (+2 more)

### Community 7 - "Renderer poses and particles"
Cohesion: 0.06
Nodes (36): applyMoodFace(), canvas, clamp(), computePose(), ctx, drawOverlay(), drawParticles(), handleEvent() (+28 more)

### Community 8 - "Companion tests"
Cohesion: 0.22
Nodes (7): MENU_ACTIVITIES, TUNING, assert, bounds, { Companion, MENU_ACTIVITIES, TUNING }, run(), test

### Community 9 - "Front app, calendar and settings watchers"
Cohesion: 0.05
Nodes (46): CalendarWatcher, findMeetingLink(), MEETING_LINKS, MESSAGES, parseCalendarOutput(), path, readEvents(), { run } (+38 more)

### Community 10 - "Model download script"
Cohesion: 0.13
Nodes (15): download(), ENGINE_ASSETS, ENGINE_DIR, { execFileSync }, fetchEngine(), fetchModels(), fs, mb() (+7 more)

### Community 11 - "Mind plan and decisions docs"
Cohesion: 0.06
Nodes (31): General, Phase 1 implementation decisions, Phase 1 questions, Togepi's mind: decisions log, Architecture (as built in Phase 1), Ground rules (apply to every phase), Honest limits (agreed up front), Target machine (+23 more)

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
Nodes (9): Engine, fetchJson(), freePort(), fs, locate(), net, path, Server (+1 more)

### Community 16 - "Personality model and file"
Cohesion: 0.15
Nodes (22): band(), clampScore(), clone(), defaultPersonality(), describe(), diff(), fs, getPath() (+14 more)

### Community 17 - "Remind-me window"
Cohesion: 0.60
Nodes (4): add(), fmt(), setButtons(), text

### Community 20 - "Tic-tac-toe rules and game tests"
Cohesion: 0.07
Nodes (25): GAME, BALL, inAnyDisplay(), screensLib, bestMoves(), chooseMove(), completes(), freeSquares() (+17 more)

### Community 21 - "Mind tests"
Cohesion: 0.11
Nodes (14): assert, { Companion }, { EventLog, describeEvent }, fs, { groupClips, pickClip }, { locate }, { Mind, MIND, FEEL_DIFFERENT }, os (+6 more)

### Community 22 - "Nudge tests"
Cohesion: 0.20
Nodes (9): HIT, assert, { Companion, HIT }, { NudgeTracker, pastBedtime, say, TIMING }, seeded(), setup(), sim, START (+1 more)

### Community 24 - "Nudge timing and phrases"
Cohesion: 0.20
Nodes (9): clockTime(), dayString(), minutesOf(), NUDGE_DEFAULTS, pastBedtime(), PRIORITY, say(), TEXT (+1 more)

### Community 26 - "Fetch ball window"
Cohesion: 0.33
Nodes (3): ball, canvas, ctx

### Community 27 - "Tic-tac-toe board window"
Cohesion: 0.33
Nodes (4): again, cells, grid, status

### Community 29 - "Think prompt and line checks"
Cohesion: 0.17
Nodes (14): ACTIONS, BAND_WORDS, cleanLine(), { describeEvent }, needsWords(), norm(), P, parseThought() (+6 more)

### Community 30 - "Context tracker"
Cohesion: 0.17
Nodes (4): defaultContext(), ContextTracker, dayString(), { defaultContext }

### Community 31 - "Brain tests"
Cohesion: 0.24
Nodes (9): assert, bounds, brain, { Companion }, grounded(), meetingSetup(), seeded(), test (+1 more)

### Community 32 - "Privacy gate"
Cohesion: 0.24
Nodes (9): check(), lower(), MODEL_QUESTION, MONEY_APPS, PASSWORD_APPS, PASSWORD_BUNDLES, SENSITIVE_TITLE, SENSITIVE_URL (+1 more)

### Community 33 - "Sound clip library"
Cohesion: 0.25
Nodes (7): EXTS, fs, groupClips(), MOODS, path, pickClip(), SoundLibrary

### Community 34 - "Mind phases and note removal"
Cohesion: 0.29
Nodes (6): Phase 1: his own voice — status: `in progress` (built and tested without the real models; model testing waits for model downloads in the dev container), Phase 2: memory — status: `not started`, Phase 3: reading the screen — status: `not started`, Phase 4: personality growth — status: `not started`, Phase 5: polish — status: `not started`, Phases

### Community 35 - "Mind module wiring"
Cohesion: 0.29
Nodes (6): { EventLog }, INTERACTIONS, P, privacy, REACTIONS, T

### Community 37 - "Personality editor window"
Cohesion: 0.33
Nodes (4): groups, inputs, NOTES, READ_ONLY

### Community 38 - "Chirp synthesis"
Cohesion: 0.70
Nodes (4): audio(), note(), play(), playClip()

## Knowledge Gaps
- **1 isolated node(s):** `electron-builder`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 345 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Companion` connect `Companion state machine and physics` to `Companion constants and game config`, `Electron main process and menus`, `Brain restore and catch-up`, `Companion tests`, `Renderer poses and particles`, `Tic-tac-toe rules and game tests`, `Mind tests`, `Nudge tests`, `NudgeTracker`, `Brain tests`?**
  _High betweenness centrality (0.251) - this node is a cross-community bridge._
- **What connects `electron-builder` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Companion state machine and physics` be split into smaller, more focused modules?**
  _Cohesion score 0.07965043695380775 - nodes in this community are weakly interconnected._
- **Why does `Making him your own` connect `Needs, mood and activity scoring` to `Togepi drawing code`, `README sections`, `Renderer poses and particles`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Should `Togepi drawing code` be split into smaller, more focused modules?**
  _Cohesion score 0.08590441621294616 - nodes in this community are weakly interconnected._
- **Should `Companion constants and game config` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Electron main process and menus` be split into smaller, more focused modules?**
  _Cohesion score 0.05220288781932617 - nodes in this community are weakly interconnected._