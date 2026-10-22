# Graph Report - digital-companion  (2026-10-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1190 nodes · 2341 edges · 70 communities (61 shown, 9 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 197 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `66edc6a7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Companion state machine and physics
- Togepi drawing code
- Companion constants and game config
- Needs and mood (brain.js)
- Electron main process setup
- Preload bridges
- Prompt text helpers (events, lines, questions)
- Diary writing and mood faces
- Companion tests
- Front app and browser tab watcher
- Model download script
- Mind plan phases
- Build and run scripts
- macOS JXA helper scripts
- Brain debug view
- Mind engine (llama-server)
- Personality model and file
- Remind-me window
- graphify usage rules
- graphify skill registration
- Ball and tic-tac-toe objects
- Mind tests
- Menus and opt-in switches
- Main loop and windows
- Screen travel tests
- Mind decision loop and big jobs
- Fetch ball window
- Tic-tac-toe board window
- session-start.sh
- Context tracker
- Memory store (facts, opinions, diary)
- Window capture and text recognition
- Attention and screen reader
- Decisions log
- Calendar watcher and reader
- Memory recall and event files
- Mind plan
- Personality editor window
- Chirp synthesis
- NudgeTracker
- Nudge tests
- Context tracker
- Nudge timing and phrases
- Settings file storage
- App startup and brain saving
- Mind startup and personality window
- Memories window
- Growth tests
- Welcome window content and Phase 5 tests
- Settings and app classification
- Growth state, reflection and undo
- Mind module wiring
- Try it now, report and permissions in main
- Brain tests
- Watching together detector
- Daily relationship rules and reflection timing
- Growth timing and reflection
- Context tests
- macOS app permissions (Info.plist)
- Small windows (brain, memories, notes, welcome)
- package.json metadata
- Build configuration
- npm scripts
- Resting the models
- Dev dependencies
- Welcome window renderer
- Question tests
- Chirp sound library
- Event log
- Event descriptions

## God Nodes (most connected - your core abstractions)
1. `Companion` - 119 edges
2. `MIND` - 53 edges
3. `GROWTH` - 20 edges
4. `Togepi's mind: decisions log` - 20 edges
5. `MEMORY` - 19 edges
6. `ContextTracker` - 18 edges
7. `Engine` - 18 edges
8. `NudgeTracker` - 17 edges
9. `ellipse()` - 16 edges
10. `startMind()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Making him your own` --references--> `zigzag()`  [INFERRED]
  README.md → src/renderer/character.js
- `Making him your own` --references--> `scoreActivities()`  [INFERRED]
  README.md → src/main/brain.js
- `Phase 3: reading the screen — status: `in progress` (built and tested here; screen capture and OCR need testing on Sushant's Mac)` --references--> `scrub()`  [INFERRED]
  docs/mind/PLAN.md → src/main/mind/screen.js
- `Phase 3: reading the screen — status: `in progress` (built and tested here; screen capture and OCR need testing on Sushant's Mac)` --references--> `whyNotRead()`  [INFERRED]
  docs/mind/PLAN.md → src/main/mind/screen.js
- `Phase 6: questions with two answers — status: `in progress` (built and tested here; Sushant to try it on his Mac)` --references--> `cleanQuestion()`  [INFERRED]
  docs/mind/PLAN.md → src/main/mind/thinker.js

## Import Cycles
- None detected.

## Communities (70 total, 9 thin omitted)

### Community 0 - "Companion state machine and physics"
Cohesion: 0.07
Nodes (6): clamp(), Companion, rand(), hardThrow(), setup(), settled()

### Community 1 - "Togepi drawing code"
Cohesion: 0.08
Nodes (52): armAngle(), bagSide(), bellyShadow(), bodyPath(), drawApple(), drawArm(), drawBackpackBag(), drawBackpackStraps() (+44 more)

### Community 2 - "Companion constants and game config"
Cohesion: 0.11
Nodes (18): { Ball, BALL }, BOARD_STATES, brain, BUSY_WHEN_QUIET, GAME_STATES, GAMES, HELD_BALL, INTERRUPTIBLE (+10 more)

### Community 3 - "Needs and mood (brain.js)"
Cohesion: 0.19
Nodes (13): ALL, apply(), catchUp(), clamp01(), drift(), EFFECTS, ENERGETIC, moodBand() (+5 more)

### Community 4 - "Electron main process setup"
Cohesion: 0.05
Nodes (34): ACTIVITY_MENU, { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, shell, session, systemPreferences, desktopCapturer, clipboard, dialog }, { AppWatcher }, { Attention }, { BALL }, BEDTIMES, { buildReport }, { CalendarWatcher } (+26 more)

### Community 5 - "Preload bridges"
Cohesion: 0.13
Nodes (8): electron, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }

### Community 6 - "Prompt text helpers (events, lines, questions)"
Cohesion: 0.13
Nodes (21): Phase 6: questions with two answers — status: `in progress` (built and tested here; Sushant to try it on his Mac), ACTIONS, BAND_WORDS, cleanLine(), cleanQuestion(), daysAgo(), { describeEvent }, describeView() (+13 more)

### Community 7 - "Diary writing and mood faces"
Cohesion: 0.06
Nodes (43): Desktop Companion, Games, His brain, His mind, How it works, Looking after you, Making him your own, Making Togepi.app (macOS) (+35 more)

### Community 8 - "Companion tests"
Cohesion: 0.22
Nodes (7): MENU_ACTIVITIES, TUNING, assert, bounds, { Companion, MENU_ACTIVITIES, TUNING }, run(), test

### Community 9 - "Front app and browser tab watcher"
Cohesion: 0.16
Nodes (13): AppWatcher, browserTabs(), browserTabsScript(), { classifyApp, classifyUrl }, frontAppName(), IGNORE, parseLsappinfoName(), parseTabs() (+5 more)

### Community 10 - "Model download script"
Cohesion: 0.14
Nodes (15): download(), ENGINE_ASSETS, ENGINE_DIR, { execFileSync }, fetchEngine(), fetchModels(), fs, mb() (+7 more)

### Community 11 - "Mind plan phases"
Cohesion: 0.39
Nodes (7): Phase 1: his own voice — status: `done` (merged; tried and accepted by Sushant on 2026-10-20), Phase 2: memory — status: `done` (merged; tried and accepted by Sushant on 2026-10-20: "improved a lot"), Phase 3: reading the screen — status: `in progress` (built and tested here; screen capture and OCR need testing on Sushant's Mac), Phase 4: personality growth — status: `in progress` (built and tested here; Sushant to try it on his Mac. Evolution parked.), Phases, Where it's going (Sushant, 2026-10-21), temperament()

### Community 12 - "Build and run scripts"
Cohesion: 0.17
Nodes (9): apps, dist, { execFileSync }, fs, path, dist, { execFileSync }, fs (+1 more)

### Community 13 - "macOS JXA helper scripts"
Cohesion: 0.27
Nodes (4): authStatus(), isMissing(), requestAccess(), run()

### Community 14 - "Brain debug view"
Cohesion: 0.39
Nodes (8): bar(), color(), esc(), fmtTime(), moodBar(), NEEDS, render(), STATE_NAMES

### Community 15 - "Mind engine (llama-server)"
Cohesion: 0.09
Nodes (10): Engine, fetchJson(), freePort(), fs, isOurServer(), locate(), net, path (+2 more)

### Community 16 - "Personality model and file"
Cohesion: 0.15
Nodes (22): band(), clampScore(), clone(), defaultPersonality(), describe(), diff(), fs, getPath() (+14 more)

### Community 17 - "Remind-me window"
Cohesion: 0.60
Nodes (4): add(), fmt(), setButtons(), text

### Community 20 - "Ball and tic-tac-toe objects"
Cohesion: 0.07
Nodes (26): GAME, BALL, inAnyDisplay(), screensLib, bestMoves(), chooseMove(), completes(), freeSquares() (+18 more)

### Community 21 - "Mind tests"
Cohesion: 0.11
Nodes (14): assert, { Companion }, { EventLog, describeEvent }, fs, { groupClips, pickClip }, { locate }, { Mind, MIND, FEEL_DIFFERENT }, os (+6 more)

### Community 22 - "Menus and opt-in switches"
Cohesion: 0.25
Nodes (11): applyReadScreen(), applyWatchApps(), buildMenu(), hideForPresenting(), mindMenu(), playMenu(), refreshTrayMenu(), setNudge() (+3 more)

### Community 23 - "Main loop and windows"
Cohesion: 0.22
Nodes (10): chirp(), closeBoard(), startLoop(), tick(), tickOnce(), updateBallWindow(), updateBoardWindow(), updateClickThrough() (+2 more)

### Community 24 - "Screen travel tests"
Cohesion: 0.15
Nodes (13): link(), linksFrom(), makeScreens(), overlap(), route(), toScreen(), assert, { Companion } (+5 more)

### Community 25 - "Mind decision loop and big jobs"
Cohesion: 0.09
Nodes (5): Phase 5: polish — status: `in progress` (built and tested here; Sushant to try it on his Mac), Phase 7: watching together — status: `in progress` (built and tested here; Sushant to try it on his Mac), journalDue(), cleanTitle(), MIND

### Community 26 - "Fetch ball window"
Cohesion: 0.33
Nodes (3): ball, canvas, ctx

### Community 27 - "Tic-tac-toe board window"
Cohesion: 0.33
Nodes (4): again, cells, grid, status

### Community 29 - "Context tracker"
Cohesion: 0.40
Nodes (4): defaultContext(), middayToday(), dayString(), { defaultContext }

### Community 30 - "Memory store (facts, opinions, diary)"
Cohesion: 0.26
Nodes (5): itemLine(), MEMORY, parseItems(), sections(), write()

### Community 31 - "Window capture and text recognition"
Cohesion: 0.17
Nodes (10): { execFile }, run(), capture(), fs, ocr(), OCR_SCRIPT, os, path (+2 more)

### Community 32 - "Attention and screen reader"
Cohesion: 0.05
Nodes (39): ATTENTION, contains(), own(), OWN_APPS, screenOf(), windowKey(), check(), lower() (+31 more)

### Community 33 - "Decisions log"
Cohesion: 0.05
Nodes (41): General, Phase 1 feedback (Sushant tried it on his Mac, 2026-10-20), Phase 1 implementation decisions, Phase 1 questions, Phase 2 implementation decisions, Phase 2 questions, Phase 3 implementation decisions, Phase 3 questions (+33 more)

### Community 34 - "Calendar watcher and reader"
Cohesion: 0.19
Nodes (9): CalendarWatcher, findMeetingLink(), MEETING_LINKS, MESSAGES, parseCalendarOutput(), path, readEvents(), { run } (+1 more)

### Community 35 - "Memory recall and event files"
Cohesion: 0.10
Nodes (21): dayStart(), fs, path, pruneEvents(), read(), readEvents(), relevance(), { similar } (+13 more)

### Community 36 - "Mind plan"
Cohesion: 0.25
Nodes (8): Architecture (as built in Phase 1), Ground rules (apply to every phase), Honest limits (agreed up front), Later, Target machine, Togepi's mind: plan, Vision, Working agreement (read first)

### Community 37 - "Personality editor window"
Cohesion: 0.20
Nodes (6): groups, history, inputs, locked, NOTES, READ_ONLY

### Community 38 - "Chirp synthesis"
Cohesion: 0.70
Nodes (4): audio(), note(), play(), playClip()

### Community 40 - "Nudge tests"
Cohesion: 0.18
Nodes (8): HIT, assert, { Companion, HIT }, { NudgeTracker, pastBedtime, say, TIMING }, seeded(), sim, START, test

### Community 42 - "Nudge timing and phrases"
Cohesion: 0.20
Nodes (9): clockTime(), dayString(), minutesOf(), NUDGE_DEFAULTS, pastBedtime(), PRIORITY, say(), TEXT (+1 more)

### Community 44 - "App startup and brain saving"
Cohesion: 0.17
Nodes (13): allDisplays(), applyReadCalendar(), boundsForPoint(), brainFile(), callHere(), createBallWindow(), createWindow(), loadBrain() (+5 more)

### Community 45 - "Mind startup and personality window"
Cohesion: 0.39
Nodes (8): applyMind(), eventsFile(), mindDir(), personalityFile(), sendPersonality(), showPersonality(), startMind(), updatePersonality()

### Community 47 - "Memories window"
Cohesion: 0.83
Nodes (3): empty(), forgetButton(), list()

### Community 48 - "Growth tests"
Cohesion: 0.13
Nodes (13): assert, at(), ev(), fs, { Growth, GROWTH, dayRelationship, weekOf }, { INTERACTIONS }, { Memory, dayStart }, { Mind } (+5 more)

### Community 49 - "Welcome window content and Phase 5 tests"
Cohesion: 0.10
Nodes (16): SWITCHES, WELCOME, WHATS_NEW, assert, { buildReport }, { DEFAULTS }, { Growth }, here (+8 more)

### Community 50 - "Settings and app classification"
Cohesion: 0.11
Nodes (20): summarize(), classifyApp(), classifyUrl(), DEFAULTS, fs, LIST_KEYS, MEETING_BUNDLES, { NUDGE_DEFAULTS } (+12 more)

### Community 52 - "Mind module wiring"
Cohesion: 0.17
Nodes (11): INTERACTIONS, { EventLog }, { INTERACTIONS }, P, privacy, REACTIONS, { readEvents, journalDue, MEMORY, dayString: memoryDay }, { reflect } (+3 more)

### Community 53 - "Try it now, report and permissions in main"
Cohesion: 0.29
Nodes (8): canReadScreen(), copyReport(), screenPermission(), startWatching(), tell(), tryMenu(), tryNow(), updateAttention()

### Community 54 - "Brain tests"
Cohesion: 0.22
Nodes (9): assert, bounds, brain, { Companion }, grounded(), meetingSetup(), seeded(), test (+1 more)

### Community 55 - "Watching together detector"
Cohesion: 0.10
Nodes (26): updateWatching(), watchGuess(), APPS, explain(), GUESS_QUESTION, guessState(), hostOf(), known() (+18 more)

### Community 56 - "Daily relationship rules and reflection timing"
Cohesion: 0.18
Nodes (11): dayRelationship(), { dayString, dayStart }, fs, { INTERACTIONS }, KEY_BY_TEXT, P, path, round1() (+3 more)

### Community 57 - "Growth timing and reflection"
Cohesion: 0.31
Nodes (8): { dayString, dayStart }, { GROWTH }, P, reflect(), schema(), T, userPrompt(), weekDiary()

### Community 58 - "Context tests"
Cohesion: 0.16
Nodes (9): assert, clock(), c, { ContextTracker }, inMeetingTracker(), test, assert, { px } (+1 more)

### Community 59 - "macOS app permissions (Info.plist)"
Cohesion: 0.20
Nodes (10): mac, LSUIElement, NSAppleEventsUsageDescription, NSCalendarsFullAccessUsageDescription, NSCalendarsUsageDescription, category, extendInfo, icon (+2 more)

### Community 60 - "Small windows (brain, memories, notes, welcome)"
Cohesion: 0.20
Nodes (10): followYou(), sendMemories(), sendNotes(), sendWelcome(), showBrain(), showMemories(), showNotes(), showWelcome() (+2 more)

### Community 61 - "package.json metadata"
Cohesion: 0.22
Nodes (8): author, description, keywords, license, main, name, version, electron-builder

### Community 62 - "Build configuration"
Cohesion: 0.22
Nodes (9): build, appId, asarUnpack, directories, extraResources, files, productName, buildResources (+1 more)

### Community 63 - "npm scripts"
Cohesion: 0.40
Nodes (5): scripts, dist, fetch-models, start, test

### Community 64 - "Resting the models"
Cohesion: 0.50
Nodes (4): updateRest(), REST, restPlan(), restReason()

### Community 65 - "Dev dependencies"
Cohesion: 0.67
Nodes (3): devDependencies, electron, electron-builder

### Community 68 - "Question tests"
Cohesion: 0.12
Nodes (12): ASKING, assert, bounds, { Companion, HIT }, { dayRelationship }, { describeEvent }, fs, { Mind, MIND } (+4 more)

### Community 70 - "Chirp sound library"
Cohesion: 0.25
Nodes (7): EXTS, fs, groupClips(), MOODS, path, pickClip(), SoundLibrary

### Community 72 - "Event descriptions"
Cohesion: 0.50
Nodes (4): ago(), describeEvent(), fs, path

## Knowledge Gaps
- **1 isolated node(s):** `electron-builder`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 516 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Companion` connect `Companion state machine and physics` to `Companion constants and game config`, `Electron main process setup`, `Question tests`, `NudgeTracker`, `Companion tests`, `Nudge tests`, `App startup and brain saving`, `Ball and tic-tac-toe objects`, `Mind tests`, `Brain tests`, `Watching together detector`, `Screen travel tests`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **What connects `electron-builder` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Companion state machine and physics` be split into smaller, more focused modules?**
  _Cohesion score 0.06776556776556776 - nodes in this community are weakly interconnected._
- **Why does `Making him your own` connect `Diary writing and mood faces` to `Togepi drawing code`, `Needs and mood (brain.js)`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Should `Togepi drawing code` be split into smaller, more focused modules?**
  _Cohesion score 0.08305084745762711 - nodes in this community are weakly interconnected._
- **Why does `scoreActivities()` connect `Needs and mood (brain.js)` to `Diary writing and mood faces`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Should `Companion constants and game config` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._