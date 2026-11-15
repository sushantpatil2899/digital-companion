# Graph Report - digital-companion  (2026-11-15)

## Corpus Check
- 194 files · ~304,386 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .applescript 1, .css 1)

## Summary
- 2550 nodes · 5546 edges · 141 communities (105 shown, 36 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 514 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d7a3fa72`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Companion
- togepi/look.js
- .enter
- screen.test.js
- main/main.js
- electron
- thinker.js
- main/brain.js
- creator/creator.js
- front-app.js
- Store
- Research: how to represent, store and grow a personality
- mindMenu
- macOS JXA helper scripts
- renderer/brain.js
- Engine
- mind/personality.js
- Remind-me window
- graphify usage rules
- graphify skill registration
- memory.js
- server.js
- buildMenu
- Growth
- .startServers
- Mind
- Fetch ball window
- Tic-tac-toe board window
- session-start.sh
- commands.js
- nomi/look.js
- GeminiEngine
- Togepi's mind: plan
- Togepi's mind: decisions log
- sign.js
- createWindow
- wolfie/look.js
- mind/song.js
- Chirp synthesis
- build-helpers.js
- permissions.test.js
- mori/look.js
- Nomi's character data
- icons.js
- Filo website
- CalendarWatcher
- .syncMemories
- Memories window
- tonk/look.js
- store.js
- pip.test.js
- deploy.sh
- renderer/song.js
- live/characters/mori/look.js
- watching.js
- ContextTracker
- Nomi's voice
- live/characters/nomi/look.js
- live/characters/togepi/look.js
- upload-dmg.sh
- package.json
- screens.test.js
- live/characters/wolfie/look.js
- src/renderer/renderer.js
- Welcome window renderer
- live/characters/pip/look.js
- nudges.test.js
- migrate.js
- live/characters/tonk/look.js
- games.test.js
- tonk/index.js
- brain.test.js
- fetch-models.js
- mind.js
- make-signing-cert.sh
- engine.js
- pip/look.js
- Pip's personality and activities
- Mori's character data
- Pick your companion window
- characters/README.md
- reset-permissions.sh
- startListening
- src/renderer/ui.js
- makeSong
- live/renderer/ui.js
- phase5.test.js
- listen.js
- tick
- tonk.test.js
- wolfie/index.js
- startMind
- mac-context.test.js
- mind.test.js
- ref_child_process
- bubbles.test.js
- run
- ref_path
- Phases
- menu-hold.test.js
- .update
- Filo
- listening.test.js
- .chooseNext
- scenes.js
- make-assets.js
- item.js
- build
- sounds.js
- Phase 12 (moments): manual test plan
- scripts
- A new character
- renderer/personality.js
- calendar.js
- Togepi's starting personality (draft for Sushant's review)
- live/renderer/chirp.js
- live/renderer/item.js
- live/characters/nomi/voice.js
- downloads/README.md

## God Nodes (most connected - your core abstractions)
1. `Companion` - 162 edges
2. `Mind` - 70 edges
3. `Togepi's mind: decisions log` - 52 edges
4. `user()` - 40 edges
5. `Engine` - 25 edges
6. `startMind()` - 24 edges
7. `Store` - 23 edges
8. `buildMenu()` - 22 edges
9. `GeminiEngine` - 22 edges
10. `Memory` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Filo: the app's new name and logo (2026-10-24)` --references--> `Companion`  [INFERRED]
  docs/mind/DECISIONS.md → src/main/companion.js
- `Phase 6: questions with two answers — status: `in progress` (built and tested here; Sushant to try it on his Mac)` --references--> `cleanQuestion()`  [INFERRED]
  docs/mind/PLAN.md → src/main/mind/thinker.js
- `Making him your own` --references--> `scoreActivities()`  [INFERRED]
  README.md → src/main/brain.js
- `Voice first, app watching after a switch, Brave, 5 s watching — status: `built` (2026-10-25; to be tried on Sushant's Mac)` --references--> `startMind()`  [INFERRED]
  docs/mind/PLAN.md → src/main/main.js
- `Phase 11: voice commands — status: `done` (merged; tried and accepted by Sushant on 2026-10-24: "works fine")` --references--> `chatSend()`  [INFERRED]
  docs/mind/PLAN.md → src/main/main.js

## Import Cycles
- None detected.

## Communities (141 total, 36 thin omitted)

### Community 0 - "Companion"
Cohesion: 0.07
Nodes (5): BOARD_STATES, Companion, INTERRUPTIBLE, clockTime(), watchingCompanion()

### Community 1 - "togepi/look.js"
Cohesion: 0.10
Nodes (43): armAngle(), bagSide(), bellyShadow(), bodyPath(), drawApple(), drawArm(), drawBackpackBag(), drawBackpackStraps() (+35 more)

### Community 2 - ".enter"
Cohesion: 0.13
Nodes (4): rand(), REACTING, pipCompanion(), wolfieCompanion()

### Community 3 - "screen.test.js"
Cohesion: 0.08
Nodes (26): Phase 3: reading the screen — status: `in progress` (built and tested here; screen capture and OCR need testing on Sushant's Mac), ATTENTION, Attention, contains(), own(), OWN_APPS, screenOf(), windowKey() (+18 more)

### Community 4 - "main/main.js"
Cohesion: 0.07
Nodes (33): { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, powerMonitor, shell, session, systemPreferences, desktopCapturer, clipboard, dialog, safeStorage, globalShortcut, protocol }, attention, BEDTIMES, character, chatState, createBallWindow(), CREATOR_ARG, { execFile } (+25 more)

### Community 5 - "electron"
Cohesion: 0.09
Nodes (12): electron, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer }, { contextBridge, ipcRenderer } (+4 more)

### Community 6 - "thinker.js"
Cohesion: 0.08
Nodes (55): Phase 8: chat window — status: `in progress` (built and tested here; Sushant to try it on his Mac), cleanList(), clock(), dayDigest(), importance(), isMail(), MAIL_APPS, MAIL_SITES (+47 more)

### Community 7 - "main/brain.js"
Cohesion: 0.18
Nodes (15): Making him your own, allOf(), apply(), catchUp(), clamp01(), drift(), EFFECTS, ENERGETIC (+7 more)

### Community 8 - "creator/creator.js"
Cohesion: 0.07
Nodes (75): asked, backdrop(), bindCheck(), bindSelect(), box, buildItems(), buildPersonality(), buildPose() (+67 more)

### Community 9 - "front-app.js"
Cohesion: 0.20
Nodes (11): AppWatcher, browserTabs(), browserTabsScript(), frontAppName(), IGNORE, parseLsappinfoName(), parseTabs(), parseWindowsOutput() (+3 more)

### Community 10 - "Store"
Cohesion: 0.18
Nodes (3): minutesFromObserves(), Store, values()

### Community 11 - "Research: how to represent, store and grow a personality"
Cohesion: 0.13
Nodes (15): 10. The "fast classifier" idea (GLiClass; see §11 for JEPA), 11. JEPA-style models (wrong guess: Sushant meant Jev, see §12), 12. Decision models: Jev and Laya (what Sushant meant, confirmed), 13. Test results (2026-10-20), 1. Summary, 2. Layers of a personality (the backbone), 3. Trait models compared, 4. Values and motives: Schwartz's 19 values (+7 more)

### Community 12 - "mindMenu"
Cohesion: 0.14
Nodes (20): applyMind(), geminiEnvKey(), geminiKey(), geminiKeyFile(), mindMenu(), playMenu(), refreshTrayMenu(), restartEngine() (+12 more)

### Community 13 - "macOS JXA helper scripts"
Cohesion: 0.16
Nodes (6): Speech, authStatus(), isMissing(), requestAccess(), run(), reply()

### Community 14 - "renderer/brain.js"
Cohesion: 0.15
Nodes (13): EventLog, bar(), color(), esc(), fmtTime(), groupOf(), GROUPS, moodBar() (+5 more)

### Community 15 - "Engine"
Cohesion: 0.17
Nodes (4): Phase 9 step 1b implementation notes (2026-10-24), Optional: his voice on Gemini — status: `in progress` (SBU Hacks, 2026-10-24; Sushant to confirm before `main`), Engine, fetchJson()

### Community 16 - "mind/personality.js"
Cohesion: 0.17
Nodes (21): band(), clampScore(), clone(), defaultPersonality(), describe(), diff(), fs, getPath() (+13 more)

### Community 17 - "Remind-me window"
Cohesion: 0.60
Nodes (4): add(), fmt(), setButtons(), text

### Community 20 - "memory.js"
Cohesion: 0.13
Nodes (15): Phase 10: Tiger Data, the weekly song and memory search — status: `in progress` (for the hackathon demo on 2026-10-25; the song tried by Sushant: "works great"), fs, itemLine(), meaningRelevance(), Memory, parseItems(), path, pruneEvents() (+7 more)

### Community 21 - "server.js"
Cohesion: 0.11
Nodes (28): body(), envVar(), fs, geminiKey(), http, itemList(), items(), ITEMS_DIR (+20 more)

### Community 22 - "buildMenu"
Cohesion: 0.11
Nodes (26): Talking opens the chat; bubbles fit their text (2026-10-25), Talking opens the chat; bubbles fit their text — status: `built` (2026-10-25; to be tried on Sushant's Mac), ACTIVITY_MENU, answerInOwnWords(), applyReadScreen(), applyWatchApps(), buildMenu(), commandActivities() (+18 more)

### Community 25 - "Mind"
Cohesion: 0.06
Nodes (10): Phase 5: polish — status: `in progress` (built and tested here; Sushant to try it on his Mac), cleanTitle(), Mind, makeMind(), makeMind(), enter(), lines(), next() (+2 more)

### Community 26 - "Fetch ball window"
Cohesion: 0.33
Nodes (3): ball, canvas, ctx

### Community 27 - "Tic-tac-toe board window"
Cohesion: 0.33
Nodes (6): again, cells, grid, piece(), status, statusText()

### Community 29 - "commands.js"
Cohesion: 0.10
Nodes (23): Phase 11: voice commands — status: `done` (merged; tried and accepted by Sushant on 2026-10-24: "works fine"), amount(), COMMANDS, hints(), keywords(), matchActivity(), matchAnswer(), normalize() (+15 more)

### Community 30 - "nomi/look.js"
Cohesion: 0.09
Nodes (36): crescent(), drawBackFeet(), drawBody(), drawBolt(), drawBook(), drawBrush(), drawBubble(), drawCharacter() (+28 more)

### Community 31 - "GeminiEngine"
Cohesion: 0.12
Nodes (4): Review of main after SBU Hacks (2026-10-24), wellFormed(), GeminiEngine, toGeminiSchema()

### Community 32 - "Togepi's mind: plan"
Cohesion: 0.25
Nodes (8): Architecture (as built in Phase 1), Ground rules (apply to every phase), Honest limits (agreed up front), Later, Target machine, Togepi's mind: plan, Vision, Working agreement (read first)

### Community 33 - "Togepi's mind: decisions log"
Cohesion: 0.04
Nodes (48): Filo: the app's new name and logo (2026-10-24), General, Memory and speed (2026-10-22), Permissions and signing (2026-10-24), Phase 10 feedback, Phase 10 implementation decisions, Phase 10 questions (Tiger Data, the weekly song, memory search; 2026-10-24), Phase 11 feedback (+40 more)

### Community 34 - "sign.js"
Cohesion: 0.25
Nodes (5): apps, dist, { execFileSync }, fs, path

### Community 35 - "createWindow"
Cohesion: 0.13
Nodes (18): allDisplays(), boundsForPoint(), callHere(), chirp(), closeBoard(), createWindow(), loadBrain(), startLoop() (+10 more)

### Community 36 - "wolfie/look.js"
Cohesion: 0.12
Nodes (30): circle(), drawArm(), drawBackpack(), drawBook(), drawCap(), drawCharacter(), drawEar(), drawEye() (+22 more)

### Community 37 - "mind/song.js"
Cohesion: 0.13
Nodes (20): blockedWords(), cap(), cleanSung(), dayName(), fs, hours(), listSongs(), parseSong() (+12 more)

### Community 38 - "Chirp synthesis"
Cohesion: 0.70
Nodes (4): audio(), note(), play(), playClip()

### Community 39 - "build-helpers.js"
Cohesion: 0.29
Nodes (4): { execFileSync }, fs, path, ROOT

### Community 40 - "permissions.test.js"
Cohesion: 0.15
Nodes (16): canReadScreen(), checkSigning(), currentPermissionProblems(), fixPermission(), glanceAtShow(), permissionSwitch(), screenPermission(), startWatching() (+8 more)

### Community 41 - "mori/look.js"
Cohesion: 0.09
Nodes (44): bodyPath(), drawCan(), drawCharacter(), drawEar(), drawEye(), drawFace(), drawFireflies(), drawFlower() (+36 more)

### Community 42 - "Nomi's character data"
Cohesion: 0.29
Nodes (4): activities, personality, rainTap, states

### Community 43 - "icons.js"
Cohesion: 0.06
Nodes (43): fs, path, applyColours(), buildIndex(), COLOUR_MAP, colourPrompt(), COLOURS, defaultIndexFile() (+35 more)

### Community 44 - "Filo website"
Cohesion: 0.33
Nodes (5): Filo website, Hosting on Vultr, Notes before launch, Regenerating from the app, What's here

### Community 45 - "CalendarWatcher"
Cohesion: 0.27
Nodes (5): CalendarWatcher, applyReadCalendar(), checkMusic(), musicGuess(), startContext()

### Community 47 - "Memories window"
Cohesion: 0.83
Nodes (3): empty(), forgetButton(), list()

### Community 48 - "tonk/look.js"
Cohesion: 0.15
Nodes (27): circle(), drawAntenna(), drawArm(), drawBearing(), drawBlueprint(), drawBody(), drawBoiler(), drawCharacter() (+19 more)

### Community 49 - "store.js"
Cohesion: 0.13
Nodes (16): crypto, eventRow(), eventUid(), { execFile }, findPostgres(), fs, num(), path (+8 more)

### Community 50 - "pip.test.js"
Cohesion: 0.12
Nodes (19): guessQuestion(), musicPlaying(), needsGuess(), PLAYERS, siteFor(), SITES, check(), lower() (+11 more)

### Community 52 - "renderer/song.js"
Cohesion: 0.36
Nodes (7): audio, dateText(), fmt(), layLyrics(), lines, render(), tick()

### Community 53 - "live/characters/mori/look.js"
Cohesion: 0.09
Nodes (44): bodyPath(), drawCan(), drawCharacter(), drawEar(), drawEye(), drawFace(), drawFireflies(), drawFlower() (+36 more)

### Community 55 - "watching.js"
Cohesion: 0.14
Nodes (21): watchGuess(), APPS, blankTitle(), explain(), guessQuestion(), guessState(), hostOf(), known() (+13 more)

### Community 56 - "ContextTracker"
Cohesion: 0.13
Nodes (8): defaultContext(), middayToday(), ContextTracker, dayString(), assert, clock(), inMeetingTracker(), test

### Community 57 - "Nomi's voice"
Cohesion: 0.83
Nodes (3): chirp(), hum(), room()

### Community 58 - "live/characters/nomi/look.js"
Cohesion: 0.09
Nodes (36): crescent(), drawBackFeet(), drawBody(), drawBolt(), drawBook(), drawBrush(), drawBubble(), drawCharacter() (+28 more)

### Community 59 - "live/characters/togepi/look.js"
Cohesion: 0.10
Nodes (43): armAngle(), bagSide(), bellyShadow(), bodyPath(), drawApple(), drawArm(), drawBackpackBag(), drawBackpackStraps() (+35 more)

### Community 61 - "package.json"
Cohesion: 0.13
Nodes (15): author, dependencies, pg@^8.23.1, description, devDependencies, electron@^44.5.1, electron-builder@^26.15.3, keywords (+7 more)

### Community 62 - "screens.test.js"
Cohesion: 0.15
Nodes (7): assert, companionOn(), LAYOUTS, seeded(), test, travel(), settled()

### Community 63 - "live/characters/wolfie/look.js"
Cohesion: 0.12
Nodes (30): circle(), drawArm(), drawBackpack(), drawBook(), drawCap(), drawCharacter(), drawEar(), drawEye() (+22 more)

### Community 65 - "src/renderer/renderer.js"
Cohesion: 0.06
Nodes (46): applyMoodFace(), canvas, clamp(), computePose(), CONFETTI, ctx, drawOverlay(), drawParticles() (+38 more)

### Community 66 - "Welcome window renderer"
Cohesion: 0.83
Nodes (3): render(), renderBrain(), section()

### Community 68 - "live/characters/pip/look.js"
Cohesion: 0.12
Nodes (27): bodyPath(), drawBaton(), drawBeak(), drawBody(), drawCharacter(), drawCrate(), drawCube(), drawEye() (+19 more)

### Community 69 - "nudges.test.js"
Cohesion: 0.06
Nodes (29): activities, personality, BUSY_WHEN_QUIET, GAME_STATES, GAMES, HELD_BALL, HIT, LONELY (+21 more)

### Community 70 - "migrate.js"
Cohesion: 0.33
Nodes (10): characterDir(), copyable(), copyAll(), copyTogepi(), fs, migrate(), notPids(), OLD_FOLDERS (+2 more)

### Community 71 - "live/characters/tonk/look.js"
Cohesion: 0.15
Nodes (27): circle(), drawAntenna(), drawArm(), drawBearing(), drawBlueprint(), drawBody(), drawBoiler(), drawCharacter() (+19 more)

### Community 72 - "games.test.js"
Cohesion: 0.07
Nodes (27): GAME, BALL, Ball, inAnyDisplay(), bestMoves(), chooseMove(), completes(), freeSquares() (+19 more)

### Community 73 - "tonk/index.js"
Cohesion: 0.40
Nodes (3): activities, personality, states

### Community 74 - "brain.test.js"
Cohesion: 0.24
Nodes (9): assert, bounds, companion(), grounded(), meetingSetup(), OWN, seeded(), test (+1 more)

### Community 76 - "fetch-models.js"
Cohesion: 0.15
Nodes (15): download(), ENGINE_ASSETS, ENGINE_DIR, { execFileSync }, fetchEngine(), fetchModels(), fs, mb() (+7 more)

### Community 77 - "mind.js"
Cohesion: 0.07
Nodes (42): dayRelationship(), fs, GROWTH, path, RULES, weekOf(), escape(), interaction() (+34 more)

### Community 81 - "engine.js"
Cohesion: 0.18
Nodes (6): fs, isOurServer(), locate(), net, path, { spawn, execFile, execFileSync }

### Community 82 - "pip/look.js"
Cohesion: 0.12
Nodes (27): bodyPath(), drawBaton(), drawBeak(), drawBody(), drawCharacter(), drawCrate(), drawCube(), drawEye() (+19 more)

### Community 86 - "Pip's personality and activities"
Cohesion: 0.40
Nodes (3): activities, personality, states

### Community 87 - "Mori's character data"
Cohesion: 0.33
Nodes (3): activities, personality, states

### Community 88 - "Pick your companion window"
Cohesion: 0.67
Nodes (3): poseFor(), render(), tiles

### Community 94 - "startListening"
Cohesion: 0.27
Nodes (10): applyVoice(), cantListen(), chatSend(), hearSays(), listenHelper(), listenWindow(), sendChat(), startListening() (+2 more)

### Community 95 - "src/renderer/ui.js"
Cohesion: 0.15
Nodes (18): bubbleLayout(), drawBadge(), drawBubble(), drawPuff(), drawQuestion(), drawSign(), drawSpeech(), drawSticks() (+10 more)

### Community 97 - "makeSong"
Cohesion: 0.29
Nodes (12): checkWeeklySong(), copyReport(), dance(), elevenKey(), makeSong(), sendSong(), showSong(), songsDir() (+4 more)

### Community 98 - "live/renderer/ui.js"
Cohesion: 0.15
Nodes (18): bubbleLayout(), drawBadge(), drawBubble(), drawPuff(), drawQuestion(), drawSign(), drawSpeech(), drawSticks() (+10 more)

### Community 99 - "phase5.test.js"
Cohesion: 0.17
Nodes (11): updateRest(), REST, restPlan(), restReason(), WELCOME, welcomeFor(), WHATS_NEW, assert (+3 more)

### Community 101 - "tick"
Cohesion: 0.67
Nodes (6): post(), sceneStep(), send(), startStep(), status(), tick()

### Community 102 - "tonk.test.js"
Cohesion: 0.05
Nodes (28): CHARACTERS, MENU_ACTIVITIES, assert, test, vm, assert, BOUNDS, fs (+20 more)

### Community 103 - "wolfie/index.js"
Cohesion: 0.33
Nodes (3): activities, personality, states

### Community 105 - "startMind"
Cohesion: 0.27
Nodes (12): brainFile(), characterData(), eventsFile(), mindDir(), personalityFile(), saveBrain(), sendPersonality(), showPersonality() (+4 more)

### Community 107 - "mac-context.test.js"
Cohesion: 0.14
Nodes (16): summarize(), NUDGE_DEFAULTS, classifyApp(), classifyUrl(), DEFAULTS, fs, LIST_KEYS, MEETING_BUNDLES (+8 more)

### Community 109 - "mind.test.js"
Cohesion: 0.06
Nodes (31): ago(), describeEvent(), fs, path, MIND, ASK, assert, fs (+23 more)

### Community 111 - "ref_child_process"
Cohesion: 0.25
Nodes (5): dist, { execFileSync }, fs, path, { execFile }

### Community 112 - "bubbles.test.js"
Cohesion: 0.20
Nodes (9): assert, fs, loadUI(), path, SIZE, src(), test, UI (+1 more)

### Community 113 - "run"
Cohesion: 0.27
Nodes (8): run(), capture(), fs, ocr(), OCR_SCRIPT, os, path, picture()

### Community 115 - "ref_path"
Cohesion: 0.04
Nodes (41): MOMENT_ACTIONS, MOMENTS, assert, fs, path, test, assert, fs (+33 more)

### Community 116 - "Phases"
Cohesion: 0.12
Nodes (15): Memory and speed (2026-10-22), Phase 12: moments — status: `in progress` (SBU Hacks, 2026-10-24; built and tested here, to be tried on Sushant's Mac), Phase 1: his own voice — status: `done` (merged; tried and accepted by Sushant on 2026-10-20), Phase 2: memory — status: `done` (merged; tried and accepted by Sushant on 2026-10-20: "improved a lot"), Phase 4: personality growth — status: `in progress` (built and tested here; Sushant to try it on his Mac. Evolution parked.), Phase 6: questions with two answers — status: `in progress` (built and tested here; Sushant to try it on his Mac), Phase 7: watching together — status: `in progress` (built and tested here; Sushant to try it on his Mac), Phase 9: characters — status: `in progress` (steps 1 and 1b tried by Sushant; steps 2 and 3, Pip and Mori, built and being tried; step 4, Nomi, built and tested here) (+7 more)

### Community 117 - "menu-hold.test.js"
Cohesion: 0.28
Nodes (8): assert, bounds, run(), runUntil(), seeded(), settled(), shown(), test

### Community 118 - ".update"
Cohesion: 0.08
Nodes (27): TUNING, assert, bounds, hardThrow(), run(), test, settled(), assert (+19 more)

### Community 119 - "Filo"
Cohesion: 0.15
Nodes (13): Characters, Filo, Games, His brain, His mind, How it works, Looking after you, Making a new character (+5 more)

### Community 120 - "listening.test.js"
Cohesion: 0.20
Nodes (8): assert, bounds, cursor, fs, path, run(), settled(), test

### Community 123 - "scenes.js"
Cohesion: 0.60
Nodes (4): mid(), ownScenes(), shared(), sign()

### Community 124 - "make-assets.js"
Cohesion: 0.14
Nodes (13): Voice first, app watching after a switch, Brave, 5 s watching (2026-10-25), Voice first, app watching after a switch, Brave, 5 s watching — status: `built` (2026-10-25; to be tried on Sushant's Mac), sendWhenFree(), BOUNDS, { chromium }, frame(), OUT, path (+5 more)

### Community 125 - "item.js"
Cohesion: 0.70
Nodes (4): load(), ownSize(), sizeOf(), srcOf()

### Community 128 - "build"
Cohesion: 0.10
Nodes (21): build, appId, asarUnpack, directories, extraResources, files, mac, productName (+13 more)

### Community 130 - "sounds.js"
Cohesion: 0.27
Nodes (7): EXTS, fs, groupClips(), MOODS, path, pickClip(), SoundLibrary

### Community 132 - "Phase 12 (moments): manual test plan"
Cohesion: 0.20
Nodes (10): A. Chat (`npm start` is fine), B. Other apps and your screen (packaged app), C. Calendar (packaged app), D+. Every character, your name and pronouns, D. His personality decides, E. Nothing else broke, F. Think with: Gemini or Gemma, Notes from testing (+2 more)

### Community 133 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build-helpers, creator, dist, fetch-icons, fetch-models, make-cert, reset-permissions (+2 more)

### Community 134 - "A new character"
Cohesion: 0.20
Nodes (8): 1. A short description, 2. Fill in the whole character with defaults, 3. Start from the closest character, 4. Open the character creator, 5. Refine it with the person, one part at a time, 6. Finish, A new character, needs()

### Community 135 - "renderer/personality.js"
Cohesion: 0.22
Nodes (7): build(), groups, history, inputs, locked, NOTES, READ_ONLY

### Community 137 - "calendar.js"
Cohesion: 0.32
Nodes (7): findMeetingLink(), MEETING_LINKS, MESSAGES, parseCalendarOutput(), path, readEvents(), SCRIPT

### Community 139 - "Togepi's starting personality (draft for Sushant's review)"
Cohesion: 0.33
Nodes (6): Growth limits (per weekly reflection, Phase 4), Relationship with Sushant (starts at "just met"), Togepi's starting personality (draft for Sushant's review), Traits (0–100), Values (0–100), Who Togepi is (sources)

### Community 143 - "live/renderer/chirp.js"
Cohesion: 0.70
Nodes (4): audio(), note(), play(), playClip()

### Community 144 - "live/renderer/item.js"
Cohesion: 0.70
Nodes (4): load(), ownSize(), sizeOf(), srcOf()

### Community 145 - "live/characters/nomi/voice.js"
Cohesion: 0.83
Nodes (3): chirp(), hum(), room()

## Knowledge Gaps
- **1 isolated node(s):** `Speech`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 919 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Companion` connect `Companion` to `.enter`, `main/main.js`, `buildMenu`, `Togepi's mind: decisions log`, `createWindow`, `pip.test.js`, `watching.js`, `screens.test.js`, `nudges.test.js`, `games.test.js`, `brain.test.js`, `mind.js`, `tonk.test.js`, `mind.test.js`, `bubbles.test.js`, `ref_path`, `menu-hold.test.js`, `.update`, `listening.test.js`, `.chooseNext`, `make-assets.js`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `Speech` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Companion` be split into smaller, more focused modules?**
  _Cohesion score 0.07312925170068027 - nodes in this community are weakly interconnected._
- **Why does `Togepi's mind: decisions log` connect `Togepi's mind: decisions log` to `PLAN.md`, `Engine`, `buildMenu`, `make-assets.js`, `GeminiEngine`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `togepi/look.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1036734693877551 - nodes in this community are weakly interconnected._
- **Why does `GeminiEngine` connect `GeminiEngine` to `main/main.js`, `icons.js`, `mindMenu`, `Engine`, `ref_path`, `server.js`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `.enter` be split into smaller, more focused modules?**
  _Cohesion score 0.1332099907493062 - nodes in this community are weakly interconnected._