# Graph Report - digital-companion  (2026-10-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 472 nodes · 914 edges · 20 communities (17 shown, 3 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2695adcb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Companion state machine and physics
- Togepi drawing code
- Nudges and remind-me notes
- Context tracking and brain tests
- Electron main process and menus
- Packaging and preload bridges
- Needs, mood and activity scoring
- Renderer poses and particles
- Multi-monitor screen links
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

## God Nodes (most connected - your core abstractions)
1. `Companion` - 76 edges
2. `ContextTracker` - 16 edges
3. `NudgeTracker` - 16 edges
4. `ellipse()` - 16 edges
5. `drawCharacter()` - 13 edges
6. `drawLying()` - 11 edges
7. `fillStroke()` - 11 edges
8. `clamp()` - 10 edges
9. `createWindow()` - 10 edges
10. `drawBodyAndShell()` - 9 edges

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

## Communities (20 total, 3 thin omitted)

### Community 0 - "Companion state machine and physics"
Cohesion: 0.10
Nodes (4): clamp(), Companion, rand(), hardThrow()

### Community 1 - "Togepi drawing code"
Cohesion: 0.09
Nodes (49): armAngle(), bagSide(), bellyShadow(), bodyPath(), drawApple(), drawArm(), drawBackpackBag(), drawBackpackStraps() (+41 more)

### Community 2 - "Nudges and remind-me notes"
Cohesion: 0.06
Nodes (30): BOARD_STATES, brain, BUSY_WHEN_QUIET, HIT, INTERRUPTIBLE, MOVING_ACTIVITIES, NUDGE, NUDGE_STATES (+22 more)

### Community 3 - "Context tracking and brain tests"
Cohesion: 0.06
Nodes (27): defaultContext(), MENU_ACTIVITIES, TUNING, ContextTracker, dayString(), { defaultContext }, drawOverlay(), assert (+19 more)

### Community 4 - "Electron main process and menus"
Cohesion: 0.08
Nodes (41): ACTIVITY_MENU, allDisplays(), { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, shell }, applyReadCalendar(), applyWatchApps(), { AppWatcher }, BEDTIMES, boundsForPoint() (+33 more)

### Community 5 - "Packaging and preload bridges"
Cohesion: 0.05
Nodes (37): author, build, appId, asarUnpack, directories, files, mac, productName (+29 more)

### Community 6 - "Needs, mood and activity scoring"
Cohesion: 0.10
Nodes (22): Desktop Companion, His brain, How it works, Looking after you, Making him your own, Making Togepi.app (macOS), Platform notes, Playing with him (+14 more)

### Community 7 - "Renderer poses and particles"
Cohesion: 0.15
Nodes (19): applyMoodFace(), canvas, clamp(), computePose(), ctx, drawParticles(), handleEvent(), happyBand() (+11 more)

### Community 8 - "Multi-monitor screen links"
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

## Knowledge Gaps
- **1 isolated node(s):** `electron-builder`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 180 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Companion` connect `Companion state machine and physics` to `Multi-monitor screen links`, `Nudges and remind-me notes`, `Context tracking and brain tests`, `Electron main process and menus`?**
  _High betweenness centrality (0.265) - this node is a cross-community bridge._
- **What connects `electron-builder` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Companion state machine and physics` be split into smaller, more focused modules?**
  _Cohesion score 0.10069444444444445 - nodes in this community are weakly interconnected._
- **Why does `Making him your own` connect `Needs, mood and activity scoring` to `Togepi drawing code`, `Renderer poses and particles`?**
  _High betweenness centrality (0.245) - this node is a cross-community bridge._
- **Should `Togepi drawing code` be split into smaller, more focused modules?**
  _Cohesion score 0.08709273182957393 - nodes in this community are weakly interconnected._
- **Should `Nudges and remind-me notes` be split into smaller, more focused modules?**
  _Cohesion score 0.05580693815987934 - nodes in this community are weakly interconnected._
- **Should `Context tracking and brain tests` be split into smaller, more focused modules?**
  _Cohesion score 0.056429232192414434 - nodes in this community are weakly interconnected._