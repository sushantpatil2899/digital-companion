# Graph Report - digital-companion  (2026-10-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 815 nodes · 1551 edges · 44 communities (37 shown, 7 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 136 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `86b15684`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Companion state machine and physics
- Togepi drawing code
- Nudges and reminder notes
- Needs, mood and activity scoring
- Electron main process and menus
- Packaging and preload bridges
- README sections
- Renderer poses and events
- Companion tests
- Front app and browser tab watcher
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
- Meeting classification and mac tests
- Calendar watcher
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
- Mind module wiring
- Event log
- Personality editor window
- Chirp synthesis
- Calendar reader and Join links
- Particles and meeting tracker
- Settings defaults and lists
- Event descriptions
- Settings file storage

## God Nodes (most connected - your core abstractions)
1. `Companion` - 105 edges
2. `MIND` - 22 edges
3. `ContextTracker` - 16 edges
4. `NudgeTracker` - 16 edges
5. `ellipse()` - 16 edges
6. `Research: how to represent, store and grow a personality` - 15 edges
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

## Communities (44 total, 7 thin omitted)

### Community 0 - "Companion state machine and physics"
Cohesion: 0.08
Nodes (4): clamp(), Companion, rand(), hardThrow()

### Community 1 - "Togepi drawing code"
Cohesion: 0.09
Nodes (50): armAngle(), bagSide(), bellyShadow(), bodyPath(), drawApple(), drawArm(), drawBackpackBag(), drawBackpackStraps() (+42 more)

### Community 2 - "Nudges and reminder notes"
Cohesion: 0.05
Nodes (36): { Ball, BALL }, BOARD_STATES, brain, BUSY_WHEN_QUIET, GAME_STATES, GAMES, HELD_BALL, HIT (+28 more)

### Community 3 - "Needs, mood and activity scoring"
Cohesion: 0.18
Nodes (14): Making him your own, ALL, apply(), catchUp(), clamp01(), drift(), EFFECTS, ENERGETIC (+6 more)

### Community 4 - "Electron main process and menus"
Cohesion: 0.05
Nodes (71): ACTIVITY_MENU, allDisplays(), { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, shell, session }, applyMind(), applyReadCalendar(), applyWatchApps(), { AppWatcher }, { BALL } (+63 more)

### Community 5 - "Packaging and preload bridges"
Cohesion: 0.04
Nodes (41): author, build, appId, asarUnpack, directories, extraResources, files, mac (+33 more)

### Community 6 - "README sections"
Cohesion: 0.18
Nodes (10): Desktop Companion, Games, His brain, His mind, How it works, Looking after you, Making Togepi.app (macOS), Platform notes (+2 more)

### Community 7 - "Renderer poses and events"
Cohesion: 0.16
Nodes (16): applyMoodFace(), canvas, clamp(), computePose(), ctx, handleEvent(), happyBand(), lastNow (+8 more)

### Community 8 - "Companion tests"
Cohesion: 0.22
Nodes (7): MENU_ACTIVITIES, TUNING, assert, bounds, { Companion, MENU_ACTIVITIES, TUNING }, run(), test

### Community 9 - "Front app and browser tab watcher"
Cohesion: 0.16
Nodes (13): AppWatcher, browserTabs(), browserTabsScript(), { classifyApp, classifyUrl }, frontAppName(), IGNORE, parseLsappinfoName(), parseTabs() (+5 more)

### Community 10 - "Model download script"
Cohesion: 0.13
Nodes (15): download(), ENGINE_ASSETS, ENGINE_DIR, { execFileSync }, fetchEngine(), fetchModels(), fs, mb() (+7 more)

### Community 11 - "Mind plan and decisions docs"
Cohesion: 0.05
Nodes (39): General, Phase 1 feedback (Sushant tried it on his Mac, 2026-10-20), Phase 1 implementation decisions, Phase 1 questions, Togepi's mind: decisions log, Architecture (as built in Phase 1), Ground rules (apply to every phase), Honest limits (agreed up front) (+31 more)

### Community 12 - "App signing and event-log helpers"
Cohesion: 0.29
Nodes (5): apps, dist, { execFileSync }, fs, path

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

### Community 22 - "Meeting classification and mac tests"
Cohesion: 0.16
Nodes (13): summarize(), classifyApp(), classifyUrl(), assert, { classifyUrl }, fs, os, { parseCalendarOutput } (+5 more)

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

### Community 34 - "Context and px tests"
Cohesion: 0.22
Nodes (6): assert, { ContextTracker }, test, assert, { px }, test

### Community 35 - "Mind module wiring"
Cohesion: 0.29
Nodes (6): { EventLog }, INTERACTIONS, P, privacy, REACTIONS, T

### Community 37 - "Personality editor window"
Cohesion: 0.33
Nodes (4): groups, inputs, NOTES, READ_ONLY

### Community 38 - "Chirp synthesis"
Cohesion: 0.70
Nodes (4): audio(), note(), play(), playClip()

### Community 39 - "Calendar reader and Join links"
Cohesion: 0.21
Nodes (10): findMeetingLink(), MEETING_LINKS, MESSAGES, parseCalendarOutput(), path, readEvents(), { run }, SCRIPT (+2 more)

### Community 40 - "Particles and meeting tracker"
Cohesion: 0.25
Nodes (7): drawOverlay(), drawParticles(), render(), updateParticles(), clock(), c, inMeetingTracker()

### Community 41 - "Settings defaults and lists"
Cohesion: 0.22
Nodes (8): BLOCK_KEYS, DEFAULTS, fs, LIST_KEYS, MEETING_BUNDLES, { NUDGE_DEFAULTS }, path, PRESENT_BUNDLES

### Community 42 - "Event descriptions"
Cohesion: 0.40
Nodes (4): ago(), describeEvent(), fs, path

## Knowledge Gaps
- **1 isolated node(s):** `electron-builder`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 347 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Companion` connect `Companion state machine and physics` to `Nudges and reminder notes`, `Electron main process and menus`, `Companion tests`, `Tic-tac-toe rules and game tests`, `Mind tests`, `Screen travel tests`, `Brain tests`?**
  _High betweenness centrality (0.249) - this node is a cross-community bridge._
- **What connects `electron-builder` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Companion state machine and physics` be split into smaller, more focused modules?**
  _Cohesion score 0.07620383356708742 - nodes in this community are weakly interconnected._
- **Why does `Making him your own` connect `Needs, mood and activity scoring` to `Togepi drawing code`, `README sections`, `Renderer poses and events`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Should `Togepi drawing code` be split into smaller, more focused modules?**
  _Cohesion score 0.08590441621294616 - nodes in this community are weakly interconnected._
- **Should `Nudges and reminder notes` be split into smaller, more focused modules?**
  _Cohesion score 0.05203619909502263 - nodes in this community are weakly interconnected._
- **Should `Electron main process and menus` be split into smaller, more focused modules?**
  _Cohesion score 0.05225225225225225 - nodes in this community are weakly interconnected._