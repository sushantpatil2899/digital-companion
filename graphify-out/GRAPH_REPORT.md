# Graph Report - digital-companion  (2026-10-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 569 nodes · 1150 edges · 30 communities (24 shown, 6 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2eea980b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Companion state machine and physics
- Togepi drawing code
- Companion constants and game config
- Context tracking and brain tests
- Electron main process and menus
- Packaging and preload bridges
- README sections
- Renderer poses and particles
- Screen links and tests
- Front app and browser tab watcher
- Meeting app and URL classification
- Calendar reader and Join links
- Command runner and app signing
- macOS JXA helper scripts
- Brain debug view
- Settings defaults and lists
- Settings file storage
- Remind-me window
- graphify usage rules
- graphify skill registration
- Tic-tac-toe rules and game tests
- Ball physics and screen links
- Nudge tests
- NudgeTracker
- Nudge timing and phrases
- .board
- Fetch ball window
- Tic-tac-toe board window
- session-start.sh
- Companion tests

## God Nodes (most connected - your core abstractions)
1. `Companion` - 100 edges
2. `ContextTracker` - 16 edges
3. `NudgeTracker` - 16 edges
4. `ellipse()` - 16 edges
5. `BALL` - 13 edges
6. `drawCharacter()` - 13 edges
7. `clamp()` - 11 edges
8. `drawLying()` - 11 edges
9. `fillStroke()` - 11 edges
10. `createWindow()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Making him your own` --references--> `zigzag()`  [INFERRED]
  README.md → src/renderer/character.js
- `Making him your own` --references--> `computePose()`  [INFERRED]
  README.md → src/renderer/renderer.js
- `Making him your own` --references--> `scoreActivities()`  [INFERRED]
  README.md → src/main/brain.js
- `render()` --indirect_call--> `clock()`  [INFERRED]
  src/renderer/renderer.js → test/context.test.js
- `{ Companion }` --calls--> `Companion`  [EXTRACTED]
  test/brain.test.js → src/main/companion.js

## Import Cycles
- None detected.

## Communities (30 total, 6 thin omitted)

### Community 0 - "Companion state machine and physics"
Cohesion: 0.08
Nodes (4): clamp(), Companion, rand(), hardThrow()

### Community 1 - "Togepi drawing code"
Cohesion: 0.09
Nodes (49): armAngle(), bagSide(), bellyShadow(), bodyPath(), drawApple(), drawArm(), drawBackpackBag(), drawBackpackStraps() (+41 more)

### Community 2 - "Companion constants and game config"
Cohesion: 0.12
Nodes (16): { Ball, BALL }, BOARD_STATES, brain, BUSY_WHEN_QUIET, GAME_STATES, GAMES, HELD_BALL, INTERRUPTIBLE (+8 more)

### Community 3 - "Context tracking and brain tests"
Cohesion: 0.06
Nodes (23): defaultContext(), ContextTracker, dayString(), { defaultContext }, drawOverlay(), assert, bounds, brain (+15 more)

### Community 4 - "Electron main process and menus"
Cohesion: 0.08
Nodes (49): ACTIVITY_MENU, allDisplays(), { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, shell }, applyReadCalendar(), applyWatchApps(), { AppWatcher }, { BALL }, BEDTIMES (+41 more)

### Community 5 - "Packaging and preload bridges"
Cohesion: 0.05
Nodes (38): author, build, appId, asarUnpack, directories, files, mac, productName (+30 more)

### Community 6 - "README sections"
Cohesion: 0.10
Nodes (23): Desktop Companion, Games, His brain, How it works, Looking after you, Making him your own, Making Togepi.app (macOS), Platform notes (+15 more)

### Community 7 - "Renderer poses and particles"
Cohesion: 0.15
Nodes (19): applyMoodFace(), canvas, clamp(), computePose(), ctx, drawParticles(), handleEvent(), happyBand() (+11 more)

### Community 8 - "Screen links and tests"
Cohesion: 0.13
Nodes (13): link(), linksFrom(), makeScreens(), overlap(), route(), toScreen(), assert, { Companion } (+5 more)

### Community 9 - "Front app and browser tab watcher"
Cohesion: 0.18
Nodes (13): AppWatcher, browserTabs(), browserTabsScript(), { classifyApp, classifyUrl }, frontAppName(), IGNORE, parseLsappinfoName(), parseWindowsOutput() (+5 more)

### Community 10 - "Meeting app and URL classification"
Cohesion: 0.15
Nodes (13): summarize(), classifyApp(), classifyUrl(), assert, { classifyUrl }, fs, os, { parseCalendarOutput } (+5 more)

### Community 11 - "Calendar reader and Join links"
Cohesion: 0.19
Nodes (9): CalendarWatcher, findMeetingLink(), MEETING_LINKS, MESSAGES, parseCalendarOutput(), path, readEvents(), { run } (+1 more)

### Community 12 - "Command runner and app signing"
Cohesion: 0.18
Nodes (6): apps, dist, { execFileSync }, fs, path, { execFile }

### Community 13 - "macOS JXA helper scripts"
Cohesion: 0.27
Nodes (4): authStatus(), isMissing(), requestAccess(), run()

### Community 14 - "Brain debug view"
Cohesion: 0.39
Nodes (8): bar(), color(), esc(), fmtTime(), moodBar(), NEEDS, render(), STATE_NAMES

### Community 15 - "Settings defaults and lists"
Cohesion: 0.25
Nodes (7): DEFAULTS, fs, LIST_KEYS, MEETING_BUNDLES, { NUDGE_DEFAULTS }, path, PRESENT_BUNDLES

### Community 17 - "Remind-me window"
Cohesion: 0.60
Nodes (4): add(), fmt(), setButtons(), text

### Community 20 - "Tic-tac-toe rules and game tests"
Cohesion: 0.12
Nodes (22): GAME, bestMoves(), chooseMove(), completes(), freeSquares(), LINES, minimax(), other() (+14 more)

### Community 21 - "Ball physics and screen links"
Cohesion: 0.15
Nodes (3): BALL, inAnyDisplay(), screensLib

### Community 22 - "Nudge tests"
Cohesion: 0.20
Nodes (9): HIT, assert, { Companion, HIT }, { NudgeTracker, pastBedtime, say, TIMING }, seeded(), setup(), sim, START (+1 more)

### Community 24 - "Nudge timing and phrases"
Cohesion: 0.24
Nodes (7): dayString(), minutesOf(), NUDGE_DEFAULTS, pastBedtime(), PRIORITY, TEXT, TIMING

### Community 26 - "Fetch ball window"
Cohesion: 0.33
Nodes (3): ball, canvas, ctx

### Community 27 - "Tic-tac-toe board window"
Cohesion: 0.33
Nodes (4): again, cells, grid, status

### Community 29 - "Companion tests"
Cohesion: 0.22
Nodes (7): MENU_ACTIVITIES, TUNING, assert, bounds, { Companion, MENU_ACTIVITIES, TUNING }, run(), test

## Knowledge Gaps
- **1 isolated node(s):** `electron-builder`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 218 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Companion` connect `Companion state machine and physics` to `Companion constants and game config`, `Context tracking and brain tests`, `Electron main process and menus`, `Screen links and tests`, `Tic-tac-toe rules and game tests`, `Ball physics and screen links`, `Nudge tests`, `NudgeTracker`, `.board`, `Companion tests`?**
  _High betweenness centrality (0.279) - this node is a cross-community bridge._
- **What connects `electron-builder` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Companion state machine and physics` be split into smaller, more focused modules?**
  _Cohesion score 0.08126169473402833 - nodes in this community are weakly interconnected._
- **Why does `Making him your own` connect `README sections` to `Togepi drawing code`, `Renderer poses and particles`?**
  _High betweenness centrality (0.210) - this node is a cross-community bridge._
- **Should `Togepi drawing code` be split into smaller, more focused modules?**
  _Cohesion score 0.08709273182957393 - nodes in this community are weakly interconnected._
- **Should `Companion constants and game config` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Context tracking and brain tests` be split into smaller, more focused modules?**
  _Cohesion score 0.06342494714587738 - nodes in this community are weakly interconnected._