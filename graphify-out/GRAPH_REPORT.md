# Graph Report - digital-companion  (2026-10-20)

## Corpus Check
- 66 files · ~83,678 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .applescript 1)

## Summary
- 963 nodes · 1846 edges · 49 communities (42 shown, 7 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 161 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a423be4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Companion state machine and physics
- Togepi drawing code
- Companion constants and game config
- Needs, mood and context tracker
- Electron main process setup
- Packaging and preload bridges
- events.js
- Renderer poses and events
- Companion tests
- Front app and browser tab watcher
- Model download script
- Mind plan and decisions docs
- ref_path
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
- Window capture and text recognition
- screen.test.js
- Sound clip library
- Calendar watcher and reader
- memory.test.js
- Event log
- Personality editor window
- Chirp synthesis
- NudgeTracker
- Nudge tests
- Nudge timing and phrases
- Settings file storage
- App startup and brain saving
- Small windows that follow you
- Screen layout and routes
- Memories window
- mac-context.test.js
- App watching, attention and screen reading setup
- Privacy gate

## God Nodes (most connected - your core abstractions)
1. `Companion` - 105 edges
2. `MIND` - 29 edges
3. `MEMORY` - 17 edges
4. `ContextTracker` - 16 edges
5. `NudgeTracker` - 16 edges
6. `ellipse()` - 16 edges
7. `Engine` - 15 edges
8. `Research: how to represent, store and grow a personality` - 15 edges
9. `BALL` - 13 edges
10. `startMind()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Making him your own` --references--> `scoreActivities()`  [INFERRED]
  README.md → src/main/brain.js
- `Making him your own` --references--> `zigzag()`  [INFERRED]
  README.md → src/renderer/character.js
- `Phase 3: reading the screen — status: `in progress` (built and tested here; screen capture and OCR need testing on Sushant's Mac)` --references--> `whyNotRead()`  [INFERRED]
  docs/mind/PLAN.md → src/main/mind/screen.js
- `Phase 3: reading the screen — status: `in progress` (built and tested here; screen capture and OCR need testing on Sushant's Mac)` --references--> `scrub()`  [INFERRED]
  docs/mind/PLAN.md → src/main/mind/screen.js
- `Making him your own` --references--> `computePose()`  [INFERRED]
  README.md → src/renderer/renderer.js

## Import Cycles
- None detected.

## Communities (49 total, 7 thin omitted)

### Community 0 - "Companion state machine and physics"
Cohesion: 0.08
Nodes (4): clamp(), Companion, rand(), hardThrow()

### Community 1 - "Togepi drawing code"
Cohesion: 0.09
Nodes (50): armAngle(), bagSide(), bellyShadow(), bodyPath(), drawApple(), drawArm(), drawBackpackBag(), drawBackpackStraps() (+42 more)

### Community 2 - "Companion constants and game config"
Cohesion: 0.11
Nodes (17): { Ball, BALL }, BOARD_STATES, brain, BUSY_WHEN_QUIET, GAME_STATES, GAMES, HELD_BALL, INTERRUPTIBLE (+9 more)

### Community 3 - "Needs, mood and context tracker"
Cohesion: 0.05
Nodes (33): ALL, apply(), catchUp(), clamp01(), defaultContext(), drift(), EFFECTS, ENERGETIC (+25 more)

### Community 4 - "Electron main process setup"
Cohesion: 0.07
Nodes (28): ACTIVITY_MENU, { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, shell, session, systemPreferences, desktopCapturer }, { AppWatcher }, { Attention }, { BALL }, BEDTIMES, { CalendarWatcher }, { Companion, TUNING } (+20 more)

### Community 5 - "Packaging and preload bridges"
Cohesion: 0.04
Nodes (42): author, build, appId, asarUnpack, directories, extraResources, files, mac (+34 more)

### Community 6 - "events.js"
Cohesion: 0.50
Nodes (4): ago(), describeEvent(), fs, path

### Community 7 - "Renderer poses and events"
Cohesion: 0.08
Nodes (32): Desktop Companion, Games, His brain, His mind, How it works, Looking after you, Making him your own, Making Togepi.app (macOS) (+24 more)

### Community 8 - "Companion tests"
Cohesion: 0.20
Nodes (7): MENU_ACTIVITIES, TUNING, assert, bounds, { Companion, MENU_ACTIVITIES, TUNING }, run(), test

### Community 9 - "Front app and browser tab watcher"
Cohesion: 0.16
Nodes (13): AppWatcher, browserTabs(), browserTabsScript(), { classifyApp, classifyUrl }, frontAppName(), IGNORE, parseLsappinfoName(), parseTabs() (+5 more)

### Community 10 - "Model download script"
Cohesion: 0.14
Nodes (15): download(), ENGINE_ASSETS, ENGINE_DIR, { execFileSync }, fetchEngine(), fetchModels(), fs, mb() (+7 more)

### Community 11 - "Mind plan and decisions docs"
Cohesion: 0.05
Nodes (37): General, Phase 1 feedback (Sushant tried it on his Mac, 2026-10-20), Phase 1 implementation decisions, Phase 1 questions, Phase 2 implementation decisions, Phase 2 questions, Phase 3 implementation decisions, Phase 3 questions (+29 more)

### Community 12 - "ref_path"
Cohesion: 0.14
Nodes (10): apps, dist, { execFileSync }, fs, path, dist, { execFileSync }, fs (+2 more)

### Community 13 - "macOS JXA helper scripts"
Cohesion: 0.27
Nodes (4): authStatus(), isMissing(), requestAccess(), run()

### Community 14 - "Brain debug view"
Cohesion: 0.39
Nodes (8): bar(), color(), esc(), fmtTime(), moodBar(), NEEDS, render(), STATE_NAMES

### Community 15 - "Mind engine (llama-server)"
Cohesion: 0.10
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
Cohesion: 0.18
Nodes (11): chirp(), closeBoard(), tick(), updateBallWindow(), updateBoardWindow(), updateClickThrough(), px(), screenAt() (+3 more)

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
Cohesion: 0.16
Nodes (17): ACTIONS, BAND_WORDS, cleanLine(), daysAgo(), { describeEvent }, describeView(), needsWords(), norm() (+9 more)

### Community 31 - "Window capture and text recognition"
Cohesion: 0.21
Nodes (9): run(), capture(), fs, ocr(), OCR_SCRIPT, os, path, picture() (+1 more)

### Community 32 - "screen.test.js"
Cohesion: 0.06
Nodes (30): Phase 1: his own voice — status: `done` (merged; tried and accepted by Sushant on 2026-10-20), Phase 2: memory — status: `done` (merged; tried and accepted by Sushant on 2026-10-20: "improved a lot"), Phase 3: reading the screen — status: `in progress` (built and tested here; screen capture and OCR need testing on Sushant's Mac), Phase 4: personality growth — status: `not started`, Phase 5: polish — status: `not started`, Phases, ATTENTION, contains() (+22 more)

### Community 33 - "Sound clip library"
Cohesion: 0.25
Nodes (7): EXTS, fs, groupClips(), MOODS, path, pickClip(), SoundLibrary

### Community 34 - "Calendar watcher and reader"
Cohesion: 0.19
Nodes (9): CalendarWatcher, findMeetingLink(), MEETING_LINKS, MESSAGES, parseCalendarOutput(), path, readEvents(), { run } (+1 more)

### Community 35 - "memory.test.js"
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

### Community 42 - "Nudge timing and phrases"
Cohesion: 0.20
Nodes (9): clockTime(), dayString(), minutesOf(), NUDGE_DEFAULTS, pastBedtime(), PRIORITY, say(), TEXT (+1 more)

### Community 44 - "App startup and brain saving"
Cohesion: 0.25
Nodes (9): allDisplays(), applyReadCalendar(), brainFile(), createWindow(), loadBrain(), saveBrain(), startContext(), startLoop() (+1 more)

### Community 45 - "Small windows that follow you"
Cohesion: 0.29
Nodes (7): followYou(), sendNotes(), sendPersonality(), showBrain(), showNotes(), showPersonality(), updatePersonality()

### Community 46 - "Screen layout and routes"
Cohesion: 0.33
Nodes (8): boundsForPoint(), callHere(), link(), linksFrom(), makeScreens(), overlap(), route(), toScreen()

### Community 47 - "Memories window"
Cohesion: 0.83
Nodes (3): empty(), forgetButton(), list()

### Community 50 - "mac-context.test.js"
Cohesion: 0.11
Nodes (20): summarize(), classifyApp(), classifyUrl(), DEFAULTS, fs, LIST_KEYS, MEETING_BUNDLES, { NUDGE_DEFAULTS } (+12 more)

### Community 53 - "App watching, attention and screen reading setup"
Cohesion: 0.33
Nodes (7): applyReadScreen(), applyWatchApps(), canReadScreen(), hideForPresenting(), screenPermission(), showAfterPresenting(), updateAttention()

### Community 55 - "Privacy gate"
Cohesion: 0.24
Nodes (9): check(), lower(), MODEL_QUESTION, MONEY_APPS, PASSWORD_APPS, PASSWORD_BUNDLES, SENSITIVE_TITLE, SENSITIVE_URL (+1 more)

## Knowledge Gaps
- **1 isolated node(s):** `electron-builder`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 409 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Companion` connect `Companion state machine and physics` to `Companion constants and game config`, `Needs, mood and context tracker`, `Electron main process setup`, `NudgeTracker`, `Companion tests`, `Nudge tests`, `App startup and brain saving`, `Tic-tac-toe rules and game tests`, `Mind tests`, `Screen travel tests`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **What connects `electron-builder` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Companion state machine and physics` be split into smaller, more focused modules?**
  _Cohesion score 0.07620383356708742 - nodes in this community are weakly interconnected._
- **Why does `Making him your own` connect `Renderer poses and events` to `Togepi drawing code`, `Needs, mood and context tracker`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Should `Togepi drawing code` be split into smaller, more focused modules?**
  _Cohesion score 0.08590441621294616 - nodes in this community are weakly interconnected._
- **Why does `scoreActivities()` connect `Needs, mood and context tracker` to `Renderer poses and events`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Should `Companion constants and game config` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._