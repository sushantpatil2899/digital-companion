# Togepi's mind: plan

This is the long-running plan for giving Togepi a personality, memories and his
own voice. It exists so any future working session (or person) can pick up
where the last one stopped and understand **why** things were built the way
they were. Read this file and [DECISIONS.md](DECISIONS.md) before working on
anything in this plan.

## Working agreement (read first)

1. **Every phase starts with questions.** Before building a phase, list the
   open decisions for it and get Sushant's answers. Do not pick product
   behaviour (personality, how often he talks, what he may see, privacy) on
   your own. Purely technical choices may be proposed with a recommendation,
   but still get confirmed.
2. **Record every answer** in [DECISIONS.md](DECISIONS.md) (date, phase,
   question, answer, why). Update the phase status in this file.
3. **One phase at a time.** Finish, test and merge a phase before starting the
   next. Sushant tries each phase on his Mac before the next one begins.
4. **Plans can change.** If a decision changes, record the new decision (do
   not delete the old one; mark it superseded) and update this plan.
5. **Git conventions** (unchanged from the rest of the project):
   - Commit as `Sushant Patil <sushant.patil@stonybrook.edu>`; commit messages
     and PR descriptions must not mention the assistant or add assistant
     trailers/footers.
   - Work on the session branch, open a PR into
     `claude/desktop-companion-character-w5jvqm` and merge it.
   - After code changes run `graphify update .` (see `CLAUDE.md`).
6. **The welcome window covers every change** (Sushant, 2026-10-21). Any
   change that adds or changes what he does bumps `WELCOME_VERSION` in
   `src/main/welcome.js`, adds a `WHATS_NEW` entry in plain words (shown once
   after the update) and updates `WELCOME` (the first-run overview) if it
   changed. A test checks every version has an entry.

## Vision

Today everything Togepi does is scripted: rules in `src/main/brain.js` and
`src/main/companion.js` choose his moods, needs, movement, games and nudges.
The goal is for him to also have:

- **A personality** of his own (kind, sassy, protective, playful, ...), which
  slowly changes with his experiences.
- **Memories** of what you did, what he did and how you reacted, kept as
  Markdown files.
- **His own voice**: short, in-character comments on what you're doing,
  e.g. on JobRight: "Applying again? You've got this." Words in his speech
  bubble (max ~6-8 words, one sentence), optionally with animal-like chirps,
  never a human voice.

## Ground rules (apply to every phase)

- **Fully local.** No internet at runtime. The model ships inside the app and
  the app blocks all outgoing network requests. (Building the app may download
  the model file once.)
- **Rules keep the body, the model gives the voice.** Movement, animation,
  needs, moods and games stay rule-based (fast and reliable). The language
  model is only asked *what to say/think*, a few times a minute at most. The
  rules decide *when* he speaks.
- **Never train a model from scratch.** Personality comes from a personality
  file + memories + current mood in the prompt. Fine-tuning is at most an
  optional late extra.
- **Short lines, enforced in code.** Over-long or broken replies are cut or
  rejected; he falls back to his built-in phrases.
- **Not chatty by default.** Rate limits; quiet/meeting modes always win.
- **Privacy first.** A blocklist (banking, password managers, private browser
  windows, ...) is never shown to the model or stored. Memory files are
  readable, editable and deletable by Sushant. A pause switch.

## Target machine

MacBook with **M5 Pro, 24 GB RAM, 1 TB storage** (Sushant's). The model is
**bundled inside the app** (decided 2026-10-19).

## Architecture (as built in Phase 1)

- **Engine:** llama.cpp's `llama-server` (Metal GPU on the Mac), bundled in
  the app, started as two background processes on 127.0.0.1 (one per model),
  so animation never stalls. Chosen over `node-llama-cpp` because llama-server
  natively serves decision models (`/v1/systemone`: Laya, OpenJev, Clef, …) as
  well as language models. Code: `src/main/mind/engine.js`.
- **Voice model:** Gemma 4 12B instruct, GGUF Q4_0 (~7 GB file), Apache-2.0,
  chosen by testing (DECISIONS.md). Swappable in `scripts/fetch-models.js`.
- **Decision model:** vLLM d3-nano, GGUF Q8_0 (`ggml-org/vllm-d3-nano-GGUF`,
  2.5 GB), Apache-2.0, chosen over Laya by testing. It also reads images
  (Phase 3).
- **Bundling:** `scripts/fetch-models.js` downloads llama-server
  (llama.cpp release `b11748`) into `engine/` and the models into `models/`
  (both git-ignored); `npm run dist` runs it, electron-builder copies both into
  `Togepi.app` (`extraResources`), and `scripts/adhoc-sign.js` signs the
  engine binaries.
- **Code location:** `src/main/mind/` (personality, events, privacy,
  thinker, mind, engine, sounds), `src/renderer/chirp.js`,
  `src/renderer/personality.*`.
- **Data location:** `~/Library/Application Support/Togepi/mind/`
  (`personality.md`, `events.jsonl`) and `…/Togepi/sounds/` (your clips).
- **Existing inputs reused:** `src/main/mac/front-app.js` (front app, browser
  tabs, now with the front tab's title and private mode),
  `src/main/brain.js` (mood, needs), companion events (petting, games, …).

## Phases

Status values: `not started` → `questions` → `in progress` → `done` (merged
and tried by Sushant).

### Phase 1: his own voice — status: `done` (merged; tried and accepted by Sushant on 2026-10-20)

Goal: he comments in his own words, in character, on what you're doing.

Planned scope (updated 2026-10-19 after Sushant's answers):
- **Personality file**: layered, numeric + prose
  ([research/personality.md](research/personality.md) §8). Agreed
  2026-10-20: 34 traits (Big Five facets + Honesty-Humility) and 19 Schwartz
  values, each 0-100.
- **Personality editor**: Sushant sets the sliders himself.
- **Starting personality**: based on Togepi from Pokémon
  ([togepi-personality.md](togepi-personality.md)); relationship starts at
  "just met". He notices when you change him in the editor.
- **Decision layer**: Laya (open decision model, research §12) behind
  `decide(question, options) → probabilities`. Uses: privacy gate, wake-up,
  picking among ~4 LLM candidate lines, picking an action. Phase 1 starts with
  a spike to run Laya in Node (ONNX); fallback is LLM self-rating.
- **Voice = sound**: Togepi chirps when he speaks, never words read aloud.
  Generated chirps by default; Sushant's own clips from
  `~/Library/Application Support/Togepi/sounds/` (`<mood>-<anything>.<ext>`)
  when present. See DECISIONS.md.
- **Decision loop** (research §9): observe → event log → wake-up → think
  (LLM) → decide → act or stay silent → write the decision and your reaction
  back so the next think step sees it. Wake-ups only decide *whether he
  thinks*; whether and what he says is his decision, driven by personality.
  Your interactions always wake him; conversations continue.
- Only hard rules: quiet/meeting modes, privacy, a spam ceiling.
- **Privacy**: automatic blocking of private/incognito windows, password
  managers and payment pages, plus a user-configurable blocklist (apps,
  websites, anything). A fast local classifier for this is being evaluated
  (research §10).
- Read the active browser tab's **title**, not just its URL.
- Menu controls: mind on/off (on by default), blocklist settings.
- Block all outgoing network requests in the app.
- Model bundling (build-time download, `extraResources`), utility process.
- Fallback to built-in phrases if the model isn't ready.
- Tests use a fake model.

Open questions: see DECISIONS.md, "Phase 1 questions".

Built (2026-10-20): everything above. Tested: unit tests for all of it with a
fake model; the real app in Electron (speech bubble, clicking it, he notices
personality changes, editor, network blocked); llama-server end to end with a
tiny throwaway model (start, JSON-constrained think, the decision loop).
Then (2026-10-20) tested with the real models: Gemma 4 12B / E4B on his real
prompts, Laya vs. d3-nano on privacy and line picking, and the whole app end
to end (he answered a pat with "Yay! Soft and warm!"). Results and choices in
DECISIONS.md. Remaining before `done`: Sushant builds the app and tries it on
his Mac (speed, chirps, how he feels).

Known limit: the GPU can't be tested in the dev container; reply quality is
checked there on CPU, speed is confirmed by Sushant on his Mac.

### Phase 2: memory — status: `done` (merged; tried and accepted by Sushant on 2026-10-20: "improved a lot")

Goal: he remembers what happened and refers back to it ("Third Amazon role
this week!").

Already there from Phase 1: `events.jsonl` (what you were doing, what you
did with him, what he said or kept to himself, how you reacted; private
things only as "something private"), and the last ~14 entries in each prompt.

Planned scope:
- `events.jsonl`: raw event log (apps/sites, games, petting, reactions).
- `journal/YYYY-MM-DD.md`: end-of-day diary written by the model.
- `about-sushant.md`: facts learned about you (e.g. job hunting, resume
  highlights, likes fetch).
- `about-me.md`: his opinions, running jokes.
- Relevant memories added to each prompt (keyword search first; small local
  embedding model later if needed).
- Proposed technique (Generative Agents): each memory scored by recency,
  importance and relevance; importance rated by the decision model (d3-nano,
  a `score` question), journals and facts written by the voice model.

Built (2026-10-20), code in `src/main/mind/memory.js` and `journal.js`:
- Files in the mind folder: `journal/YYYY-MM-DD.md`, `about-sushant.md` (his
  facts + "Notes from Sushant", read but never changed), `about-me.md`. Each
  line keeps its date and importance in a hidden comment.
- Diary written when you're away at the end of the day (from 18:00, after
  10 min away) or for missed days the next time he runs; needs at least 5
  events that day. One voice-model call writes the diary, new facts and
  opinions; the decision model rates each for importance (1-10).
- Recall: score = recency (half-life 7 days for diary lines, 60 for facts) +
  importance/10 + keyword relevance; top 5 go into each prompt; unrelated
  memories need a high score. Your notes go into every prompt (1,200 chars).
- Email is only "read emails" in the diary digest; lines with email
  addresses or links are dropped. Event log pruned to 90 days daily.
- Memories window (read, forget, write your notes); brain view shows what
  came to mind and the last diary.
- Also: stray llama-server processes from a crashed run are stopped on the
  next start (`engine.pids`).
Tested: unit tests; the Memories window in Electron; a realistic day through
the real models (12B diary: "He looked at Notion and Stripe.", fact "Sushant
looked at Amazon, Stripe, and Notion on JobRight.", recalled when he opens
an Amazon job).
Remaining before `done`: Sushant tries it (it needs a day of use before the
first diary appears).

### Phase 3: reading the screen — status: `in progress` (built and tested here; screen capture and OCR need testing on Sushant's Mac)

Goal: he understands what's on screen (e.g. the job description you're
reading), not just app and tab names.

Original plan: a small Swift helper using Apple's Vision text recognition
(OCR) on the front window when it changes / every 20-30 s, no continuous
capture, Screen Recording permission, privacy blocklist first.

What changed since (2026-10-20):
- Both models already in the app can look at images: Gemma 4 12B with its
  vision add-on (`mmproj`, 0.16 GB) and d3-nano (0.36 GB add-on). llama-server
  takes images directly. So "looking" doesn't have to be text only.
- Apple's Vision OCR can be called from a JXA/AppleScript-ObjC script (like
  the existing `windows.jxa.js`), so no Swift compiler is needed to build.
- The same Screen Recording permission also gives window titles of every app
  (VS Code file, Slack channel, Notes document), not just browser tabs.

Proposal (each point is a question for Sushant, see DECISIONS.md):
1. How he sees, three options:
   - A. Text only (OCR): screenshot of the front window → Apple Vision text
     recognition, on the Mac, ~0.1-0.5 s. Exact text (job descriptions,
     code, articles), very light. Blind to pictures, videos, games.
   - B. Vision model: Gemma looks at the screenshot itself. Understands
     pictures, videos, layout. A few seconds per look and a little more
     memory.
   - C. Both (recommended): OCR text every time he looks (cheap), and Gemma
     looks at the picture now and then, e.g. when there's little text.
2. When he looks: when the front window changes (after you've stayed ~2 s),
   then at most every 30 s while you stay; only the front window, never the
   whole screen; only while his mind is on and you're there.
3. Privacy, built in: nothing private is captured (the existing rules run on
   app/title before taking the picture); the text is checked again after
   reading (card numbers, passwords, keys, phone numbers, email addresses
   scrubbed; d3-nano double-checks); email and chat apps (Mail, Gmail,
   Slack, Messages, WhatsApp, …) are not read by default (titles only).
4. Nothing from the screen is saved: screenshots and screen text are used
   for that one thought and then discarded; only his own thoughts, lines and
   diary (which may mention what he understood) are kept.
5. Opt-in: a new "Let him read my screen" switch under Brain, off by
   default; macOS asks for Screen Recording permission once.
6. Smarter comments: he compares what he reads with your notes (e.g. a job
   description vs. your skills: "Python! You know Python!").

Multiple screens and attention (Sushant's feedback, 2026-10-20; proposal):
- Today: he only knows the app with keyboard focus (plus that browser's front
  tab), from `lsappinfo`; the window list (`windows.jxa.js`) is used only for
  meeting detection; the cursor isn't used. His "on screen right now" changes
  only when the focused app changes, so a window without a title (e.g. a
  chat app) leaves him leaning on the last interesting one (GitHub).
- Proposal: track **attention**, not just focus. Inputs he already has or
  can get: the focused app; every visible window in front-to-back order with
  its screen position (CoreGraphics, already read every 3 s; titles too once
  Screen Recording is allowed); the cursor position (main process, 60x/s);
  the display layout.
  - Window under the cursor = the frontmost window containing the cursor.
  - Attention: if the cursor moved in the last ~15 s, the window under it
    (you're reading or scrolling there); otherwise the focused window
    (you're typing there).
  - He's told all three: "typing in: Claude (screen 1)", "cursor on: Chrome
    — PR #14 · GitHub (screen 2)", "also open: …", so he can understand
    multitasking ("talking to Claude while GitHub is open").
  - Switching attention between windows counts as "something new on screen"
    only after ~5 s there, so moving the cursor across doesn't wake him.
- Pictures with several screens: always **one window**, never a whole
  screen. `screencapture -l <window id>` captures just that window, whichever
  screen it's on (even partly covered). One picture per look, of the window
  you're paying attention to; other windows only by title. If the focused and
  the cursor windows differ, they alternate between looks.

Built (2026-10-20):
- `src/main/mind/attention.js`: typing window vs. window under the cursor
  (front-to-back window list from `windows.jxa.js`, now with window ids and,
  with permission, titles), 15 s cursor rule, 5 s settle, screen numbers.
  Togepi's own windows are ignored. Runs every second in the main process.
- `src/main/mind/screen.js`: one window per look (attention window, taking
  turns with the other when typing and cursor windows differ), on settle and
  then at most every 30 s (8 s between any looks); `whyNotRead` (privacy
  rules, email/chat apps and sites unless in `screenAllow`); `scrub` (emails,
  card/account numbers, SSN, phone numbers, API keys and long tokens, lines
  mentioning passwords/secrets); d3-nano double-check; a picture for Gemma
  when there's < 200 characters of text and every 4th look; readings stay
  usable 60 s; picture files deleted immediately; nothing written to disk.
- `src/main/mac/screen-capture.js` + `ocr.applescript`: `screencapture -x -o
  -l <window id>`, Apple Vision text recognition via AppleScript-ObjC (no
  Swift compiler), `sips` for a 1280 px JPEG.
- Engine: Gemma's vision add-on (`mmproj-gemma-4-12B-it-Q8_0.gguf`,
  downloaded by `fetch-models.js`) with `--mmproj`; images go to
  `/completion` as `multimodal_data` at the `<__media__>` marker.
- Prompt: "typing in … / cursor on … ← he is looking here / also open …",
  the text he read, "you can also see a picture"; he's asked to notice links
  with Sushant's notes. Brain view: Attention and Read rows.
- "Let him read my screen" switch (turns on app watching, triggers the
  macOS permission prompt once); permission status shown in the brain view.
Tested: unit tests (attention across two screens, settling, scrubbing,
what he may read, one window per look and taking turns, picture when little
text, nothing saved); the app starts and quits cleanly; Gemma 12B looked at
a job-posting screenshot and linked it to Sushant's notes ("He knows Python
and Java!"). Not testable here: screencapture, Vision OCR and the Screen
Recording permission (macOS only).
Remaining before `done`: Sushant tries it on his Mac.

Honest limits: Screen Recording, Vision OCR and window capture only exist on
the Mac, so that part can't be run in the dev container (it will be tested
on Sushant's Mac; the vision-model part can be tested here). Ad-hoc signed
builds may make macOS ask for the permission again after each rebuild.

### Phase 4: personality growth — status: `in progress` (built and tested here; Sushant to try it on his Mac. Evolution parked.)

Goal: his personality changes with experience.

Original plan: traits stored as numbers; a weekly "reflection" over the
journal proposes small, capped changes (e.g. ignored all week → a bit
sassier; played a lot → warmer), like Stanford's "Generative Agents"
(observe → remember → reflect).

Already agreed (DECISIONS.md, 2026-10-20): growth limits per weekly
reflection: traits ±3, values ±1, relationship ±10. Relationship growth was
deferred to this phase.

What's there to build on: 34 traits + 19 values + relationship in
personality.md; a diary and facts every day (Phase 2); everything you did
with him in events.jsonl (petting, throwing, games, answered/ignored lines
and nudges).

Proposal (each point is a question for Sushant, see DECISIONS.md):
1. Relationship grows daily, by clear rules, from what happened that day
   (capped ±10 a week in total):
   - familiarity: time together (days you used the Mac with him around);
     only goes up, slowly.
   - affection: petting, playing, clicking his bubbles, answering his
     invitations → up; throwing him, ignoring him for days → down.
   - trust: coming back after breaks, answering his nudges and reminders,
     few throws → up; lots of throwing → down.
   Rules rather than the model, so it's predictable and explainable.
2. Weekly reflection for traits and values: once a week (Sunday evening when
   you're away, or the next time he runs), Gemma reads the week's diary,
   facts and a summary of what you did together, and proposes a few changes
   with a reason each ("played fetch every day → warmth +2"). Code clamps
   them (±3 a trait, ±1 a value) and needs at least 3 diary days that week.
   The same reflection also writes 1-3 "insights" about you into his memory
   ("Sushant works late when job hunting"), as in Generative Agents.
3. Who wins over your sliders: your changes always win; growth continues
   from where you put them. Option to lock any slider so growth never moves
   it.
4. Staying Togepi: a long-term limit so he can't drift too far from who he
   is, e.g. at most ±15 from his starting value per trait (you can still
   set anything by hand).
5. You can see and undo it: a "How I've grown" history (growth.md and a
   section in the Personality window) with each change, its reason and the
   week; "undo this week" puts it back.
6. He notices: after a reflection he may say so in his own words ("I feel
   braver this week!"), using the existing "he notices when he's changed".
7. Mood from personality (from the research, not built yet): his resting
   mood comes from his traits (the ALMA formula), so a gloomier personality
   is gloomier by default, a cheerful one bounces back faster.
8. Optional, fun: evolution. In the games Togepi evolves into Togetic through
   high friendship. When affection and trust stay very high for a while he
   could evolve (needs new Togetic artwork, so it may fit Phase 5 better).

Testing: rules and reflection with a fake model in unit tests; a simulated
week of diary entries through the real models here.

Answers (2026-10-20): points 1-7 as recommended; evolution (8) parked, not
to be built until Sushant brings it up. Details in DECISIONS.md.

Built:
- `src/main/mind/growth.js`: daily relationship rules (per-event daily caps,
  ±10 a week per metric, whole points with carry-over, finished days only),
  when the weekly reflection is due, clamping and applying a reflection
  (±3 / ±1 / ±15 from the baseline / at most 6 / locks), undo a week,
  baselines from your hand-set values; state in `growth.json`, readable
  history in `growth.md` (both in his mind folder).
- `src/main/mind/reflect.js`: the weekly reflection prompt (the week's
  diary, what you did together, facts, every trait/value score) with a JSON
  schema that only allows trait and value sliders; up to 3 insights.
- Mind: after the diary check, counts finished days and reflects when due;
  saves personality.md, adds insights to his facts, and thinks about the
  change when you're back. Brain view: Growth row.
- `personality.js`: `locked:` list in personality.md; `temperament()`
  (ALMA pleasure relative to Togepi → resting-mood offset and mood speed),
  used by `brain.js` mood drift.
- Personality window: a 🔒 per slider, "How I've grown" with each week's
  changes, reasons and insights, and "Undo this week".
Tested: unit tests (rules and caps, carry-over, weekly cap, locks,
reflection clamping and baselines, undo, when it's due, the mind growing
with a fake model and noticing only when you're back, locks round-trip,
temperament); the suite at 01:00, 07:00, 18:00 and 23:00; the Personality
window rendered with history and locks; a simulated week through Gemma 12B
(see DECISIONS.md).
Remaining before `done`: Sushant tries it on his Mac (growth shows after a
day of use; the first reflection on a Sunday evening with 3+ diary days).

### Phase 5: polish — status: `in progress` (built and tested here; Sushant to try it on his Mac)

Goal: make what's built pleasant to live with day to day: see results
without waiting days, light on memory and battery, his lines more like him,
and easy to diagnose from a distance.

Original candidates: optional fine-tuning of his speaking style, a bigger
model, anything found while using him. Togetic evolution stays parked
(Sushant, 2026-10-20) and is not part of this phase.

Where things stand: the two models take about 10 GB on disk and about
11 GB of memory while running (Gemma 12B 7.2 GB + vision 0.2 GB + d3-nano
2.6 GB + their working memory) out of 24 GB, all the time he's running. The
diary and growth only show up after a day or a week. Problems on the Mac
can only be described to me in words and screenshots.

Proposal (each point is a question for Sushant, see DECISIONS.md):
1. "Try it now" (Mind menu): *Write today's diary now*, *Count today
   towards our relationship now* and *Reflect on this week now*, so you can
   see Phases 2 and 4 working in minutes instead of days. The results are
   real: undo from the Personality window, forget from Memories. A
   reflection started by hand counts as that week's one (no second one on
   Sunday).
2. Lighter on memory and battery: stop the models when you've been away
   30+ minutes (after the diary and reflection are done), at night while he
   sleeps, and on battery below 20%; start them again when you're back
   (~10-20 s on the Mac, he behaves as he did before Phase 1 meanwhile).
   The brain view shows why they're off.
3. His speaking style without fine-tuning: a "style bank" of example
   Togepi lines in his prompt, starting from a hand-written set, plus the
   lines you clicked or petted. Lines you ignored are not used as examples.
   Fine-tuning (training the model itself) needs hundreds of good examples
   and a long training run, and would have to be redone for every model
   update; it stays an option if the style bank isn't enough.
4. No bigger model: a bigger one wouldn't leave enough of the 24 GB for your
   own work. Instead, measure on your Mac (seconds per thought, memory used)
   and show it in the brain view. Optional "Lighter mind" switch using Gemma
   4 E4B (4.6 GB instead of 7.2 GB; less specific diary, tested in Phase 2,
   picture reading not tried with it yet).
5. Diagnostics: *Mind → Copy a report* puts a short report on the
   clipboard to paste to me: app and model versions, model status and
   timings, permissions, settings, recent errors, counts of memories and
   growth weeks. No screen text, titles, memories or notes.
6. First-run welcome: one window the first time he runs that explains what
   he can do and asks for each permission in turn (app/tab titles, screen
   reading, calendar), with the same switches as the menus.
7. How chatty he is: a *Chattiness* choice (quieter / as he is / chattier)
   on top of his personality, and *Shush for an hour* in the menu.
8. Fixes for anything Sushant finds while testing Phases 3 and 4.

Testing: unit tests for each part (power rules with a fake clock and
battery, style bank selection, report contents leaking nothing private,
try-it-now paths with a fake model); the models stopping and starting in the
app here; real-model check of the style bank.

Answers (2026-10-21): 1 yes (in the main menu); 2 yes with 15 minutes,
adjustable; 3 not now; 4 no bigger model; 5 yes; 6 yes, and every change
must be covered by it; 7 no; 8 nothing to fix. Details in DECISIONS.md.

Built:
- `src/main/mind/rest.js`: why the models should rest (away, night while
  asleep, low battery with a 5% margin) and what to do (start, stop, do the
  diary/reflection first). `main.js` checks every second, stops and starts
  the engine (now restartable), and shows the reason in the Mind menu and
  the brain view. Settings `restAfterAway` (menu: 5 / 15 / 30 / 60 min /
  Never) and `restBattery`.
- Mind: `workDue()` / `doWork()` for the work before resting (a failed diary
  isn't retried for an hour); `writeDiaryNow()`, `countDays({ today })`,
  `reflectNow()` for *Try it now* (main menu); seconds per thought.
- Growth: today can be counted early without double counting; reflection
  timing by week, so a hand-started one counts as that week's.
- Engine: restart-safe start/stop, memory used (`ps`), shown in the brain
  view with seconds per thought.
- `src/main/report.js`: *Mind → Copy a report* (nothing private).
- `src/main/welcome.js` + welcome window: first-run overview with the
  permission switches, What's new once after an update, *Welcome and
  what's new…* in the menu.

### Where it's going (Sushant, 2026-10-21)

After Phase 5 Sushant described what he wants Togepi to become. Each item
becomes its own phase, planned questions first. Order proposed and accepted
(Sushant went ahead with #1):

1. **Questions with two answers** (Phase 6, below): sometimes he asks you
   something and you click one of two answers (never yes/no).
   (Added after it: **watching together**, Phase 7.)
2. **Chat window**: a window to have a conversation with him.
3. **Plug-in characters**: a standard character pack (required files for
   looks, movement, personality; clearly separated basic and add-on parts)
   so anyone can make their own character. Togepi becomes pack #1. Basic
   packs are data only; custom code is an add-on (privacy).
4. **Several characters** in one app, each with its own personality and
   memory, isolated from each other, sharing one set of models. Whether
   more than one can be on screen at once is open.
5. **iPhone**: he hops to the iPhone when the Mac closes and back, with no
   internet involved (direct Wi-Fi/Bluetooth after a one-time pairing).
   iOS limits, explained to Sushant: no floating over other apps (closest:
   Dynamic Island / Lock Screen Live Activity and widgets); no seeing other
   apps, the screen or other apps' notifications; Health/Fitness, calendar,
   Focus and motion are possible; on-device model (Apple's or a small
   Gemma); background hopping only partly reliable. A separate Swift app,
   built in Xcode on his Mac, needs the $99/year developer account.

Also suggested (not yet decided): an offline lock on the Mac (block every
connection except his own models, shown in the report and welcome);
export/import of his mind (needed for the iPhone and several characters;
also a backup); the signing certificate (needed to publish); later, talking
to him out loud with local speech.

### Phase 6: questions with two answers — status: `in progress` (built and tested here; Sushant to try it on his Mac)

Goal: make him more interactive. Sometimes, instead of a line, he asks you
something and shows two answers to click.

Answers (2026-10-21, details in DECISIONS.md): the model decides when to
ask, what to ask and what the answers are (no frequency rule, no topics, no
examples; only "never yes or no"); a bubble with two buttons; 30 s to
answer, two ignored in a row pause questions for an hour; he reacts to your
pick; answering counts like a pat, ignoring costs nothing; the model marks
whether your answer tells him about you, and if so it's saved as a memory;
no setting; only the privacy blocklist is off limits. Also: his
instructions lose the example topics, the "Toge!/Priii!" example and the
"name the actual thing (examples)" pattern.

Built:
- `thinker.js`: optional `question` in the answer schema ({ text, two
  answers of up to 18 characters, aboutSushant }), offered only when he may
  ask; `cleanQuestion` (two different answers, no yes/no). Lines up to 60
  characters so 8 words fit.
- `mind.js`: asks instead of speaking when the model wrote a question;
  waits 30 s (no other lines meanwhile); `answered(i)` logs your answer,
  saves a memory if it's about you and wakes him to react (even right after
  asking); two ignored in a row pause questions for an hour; never asks
  anything that names something on your blocklist.
- `companion.js` + renderer: the question bubble with two buttons (he
  stands still while asking), nod on an answer, shrug after 30 s; presses on
  the bubble are clicks only (no pick-up). His window is 16 px taller.
- Growth: an answer counts like a pat (same daily cap).
- Brain view: "Last asked" with the answers and your reaction; when
  questions are paused.

### Phase 7: watching together — status: `in progress` (built and tested here; Sushant to try it on his Mac)

Sushant's idea (2026-10-21, after Phase 6): when he watches a movie, a
series or a video, Togepi notices, says something about it ("we're watching
this today"), goes to the screen it's on (with several screens), turns
around and sits in its bottom-right corner watching it too, until he stops.
Added before the chat window, which becomes the next phase.

Answers (2026-10-21, details in DECISIONS.md): playback pages of Netflix,
YouTube, Prime Video, Disney+, Hulu, Max, Apple TV and Crunchyroll (by
address, not browsing) plus VLC, IINA, QuickTime and TV; starts after 30 s
(YouTube after he's stayed a while), ends 1 min after he's somewhere else;
the model says the line, after a fresh look at the window (picture); quiet
while watching (no lines, no chirps); water and stretch breaks wait until
it's over; full screen is fine; when it ends he decides himself whether to
say something.

Built:
- `src/main/mind/watching.js`: what counts (sites by address, player apps),
  the show's name from the title, start after 30 s (YouTube 2 min), stop
  after 60 s elsewhere; not for private windows or anything on the
  blocklist.
- `main.js`: checks every second; at the start a forced look at the window
  with a picture (if *Let him read my screen* is on), then his line; no
  other screen reading and no chirps while watching.
- `companion.js`: `startWatching(screen)` / `watchOn` / `stopWatching`; he
  walks (across screens if needed) to the bottom-right corner and sits with
  his back to you, comes back to the spot if moved, no cursor reactions or
  wandering meanwhile.
- `mind.js`: `startedWatching` (always says one line, never a question),
  then 'watching with you' blocks everything else and he doesn't think on
  his own; `stoppedWatching` (his own decision whether to speak).
- Context: while watching, no mouse or keyboard for up to 3 hours doesn't
  make you away (so he doesn't think you left or rest the models mid-movie).
- Nudges: water, stretch and eye breaks wait while watching.
- Brain view and report show that you're watching (the report doesn't name
  what).

Feedback (2026-10-22, Sushant tried both phases): questions were fun but too
frequent when answered (his reaction to an answer could be another
question); watching didn't start on Hotstar (not on the list) or on YouTube
(most likely a browser that doesn't tell us the tab's address). Fixed:
- Questions: his reaction to your answer is never a question; one question
  per thing you're doing (not again until a new window, page or video, or
  with app watching off something new you do with him).
- Watching: Hotstar/JioHotstar, Peacock, Paramount+, SonyLIV, ZEE5, Twitch
  added; YouTube recognised by its title; any other page (and tabs whose
  address the browser doesn't give) judged once per page by the decision
  model from title and address (11/11 right on test pages); a quick look
  elsewhere no longer resets the wait; a *Watching check* row in the brain
  view says why it is or isn't on. Welcome version 8.

## Later

Noted for the future (not scheduled; ask Sushant before starting):
- Sign builds with a certificate made once on his Mac, so macOS permissions
  (Screen Recording, Calendar, Automation) survive rebuilds. Today the app is
  signed ad hoc and each rebuild counts as a new app (DECISIONS.md, Phase 5
  feedback). Needs his password once; can't be tested in the Linux
  container.
- Togetic evolution (parked 2026-10-20).
- Style bank of example lines (not now, 2026-10-21).

## Honest limits (agreed up front)

- Small models sometimes say generic or wrong things; good comments need
  context (e.g. your resume in memory).
- Long-term personality consistency is an effect of prompts + memory, not a
  real mind; occasional slips are expected.
- Chattiness is the biggest risk to the experience; keep strict limits.
- Commenting while you type is realistic only on pauses/field changes, not
  live.
- macOS permission prompts (Automation, Screen Recording) are needed for
  richer observation.
