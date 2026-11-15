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
   - Since 2026-10-24 the work lives in the private repo
     `sushantpatil2899/dcapp`. Work on the branch `characters`, commit and
     push there. **Never merge into `main` or open a PR into it** unless
     Sushant says so (others work on `main`). (Before: PRs into
     `claude/desktop-companion-character-w5jvqm` in the old repo.)
   - After code changes run `graphify update .` (see `CLAUDE.md`).
   - SBU Hacks (2026-10-24): on `sbuhacks-dev`, commits are made under the
     contributor's own git account and PRs go into `main`; the rest of this
     rule is unchanged (DECISIONS.md, *SBU Hacks*).
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
  the model file once.) Opt-in exceptions you switch on yourself: the weekly
  song and Scribe (ElevenLabs, Phases 10-11) and his voice on Gemini (SBU
  Hacks, *Optional: his voice on Gemini* below).
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
  `Togepi.app` (`extraResources`), and `scripts/sign.js` signs the
  engine binaries and the app (with the "Companion Local Signing"
  certificate from `npm run make-cert` when it's there, ad hoc otherwise;
  2026-10-24).
- **Code location:** `src/main/mind/` (personality, events, privacy,
  thinker, mind, engine, sounds), `src/renderer/chirp.js`,
  `src/renderer/personality.*`.
- **Data location:** `~/Library/Application Support/Togepi/mind/`
  (`personality.md`, `events.jsonl`) and `…/Togepi/sounds/` (your clips).
  Since Phase 9: `~/Library/Application Support/Companion/characters/<id>/`
  (`mind/`, `sounds/`, `brain.json`), with `settings.json` shared.
  Since Phase 10: the TimescaleDB database in `…/Companion/database/`
  (shared, rows marked by character; `src/main/mind/store.js`).
  Since the app became **Filo** (2026-10-24) all of it lives in
  `…/Application Support/Filo/` (copied from `Companion/` on the first start,
  `src/main/migrate.js`).
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
2. **Chat window** (Phase 8): a window to have a conversation with him.
3. **Plug-in characters** (Phase 9, below; changed 2026-10-23: only we
   make characters, as code in the app, no packs from others).
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
  the show's name from the title, start after 30 s, stop after 30 s
  elsewhere (both changed on 2026-10-22; were YouTube 2 min and 60 s); not for private windows or anything on the
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

### Phase 8: chat window — status: `in progress` (built and tested here; Sushant to try it on his Mac)

Answers (2026-10-22, details in DECISIONS.md): all eight suggestions
agreed, plus Sushant's addition: a ✏️ on his questions to type your own
answer, which he uses to learn better answer choices.

Built:
- `src/renderer/chat.html` / `chat.js` / `src/chat-preload.js`: the chat
  window (today's messages, "Togepi is thinking…", your own answer to a
  question). Opened from *Chat with Togepi…* in his menu or by
  double-clicking him.
- `thinker.js`: a chat version of his instructions (answer what he wrote,
  one to three short sentences, baby words), `chatPrompt` (feelings, what
  you're doing, memories, the question you're answering, your message),
  `CHAT_SCHEMA` / `parseReply`. `engine.think` takes earlier turns
  (`history`) for the conversation.
- `mind.js`: `chat(text, { answering })` with today's chat in `chat.json`
  (fresh each day), chat lines in his log (his thoughts and diary see
  them), counts like a pat once per conversation (10 min apart);
  `answeredOwn` (memory if it's about you, kept in `own-answers.json`, the
  last 3 shown to him when he may ask).
- `main.js`: the window, double-click, ✏️ (the question waits while you
  write), wakes his models if they're resting, his reply in his bubble
  with a chirp except in meetings and while watching.
- Companion and renderer: ✏️ button in the question bubble (bubble 16 px
  wider).
- Watching timers both 30 s (Sushant, 2026-10-22; 5 s since 2026-10-25). Welcome version 9.

Feedback (2026-10-22): chat replies felt childish and fantasy-like. Cause:
fixed tone instructions in the code ("a baby Pokémon", "talk like a baby",
"simple, cute baby words", "baby voice" in the diary). Removed everywhere:
his voice now comes only from his personality ("Who I am", the sliders and
the relationship). Kept: length limits (8 words for bubbles, 1-3 sentences
in chat), never mention being an AI, don't repeat, may stay quiet, act like
his personality. Welcome version 10.

### Memory and speed (2026-10-22)

Sushant asked whether all memories could go into every prompt. Not as
they grow (4,096-token window; the diary alone grows ~60 tokens a day),
so, agreed:
1. **Core**: the 12 most important facts (importance, newest first among
   equals) in message 1 under "What you know best about Sushant", picked
   again after each diary (and when you forget something), so message 1
   stays the same all day; left out of the per-moment recall.
2. Still the 5 best-matching memories per thought.
3. **Weekly summary**: on Sunday, with the reflection, 3-4 sentences about
   the week from his diary (`weeks.md`, *His weeks* in Memories), recalled
   like a fact (two-month half-life).
4. `--swa-full` on the voice model so the unchanged start of his prompt is
   reused (487 of ~700 tokens instead of 215; prompt time here 24 s → 11 s).
Welcome version 11.

### Phase 9: characters — status: `in progress` (steps 1 and 1b tried by Sushant; steps 2 and 3, Pip and Mori, built and being tried; step 4, Nomi, built and tested here)

Goal: more characters than Togepi, each with its own looks, personality,
voice, activities and mind, on the same engine. Characters: **Togepi**,
**Pip** (a tiny clockwork bird, clever and a bit smug), **Mori** (a quiet
moss-capped forest creature, calm, dry gentle humour) and **Nomi** (a
floating dream cloud, comforting and imaginative). Their concept sheet
(Sushant, 2026-10-24) is the reference for looks, "Who I am", traits,
voice, activities, shared behaviours, games and watching together.

Answers (2026-10-23/24, details in DECISIONS.md):
- Only we make characters; each is code in the app. All share the basic
  poses; activities (six each), lines, chirps and movement are their own.
  The same four needs for all, satisfied their own way.
- One character at a time; picked on first run ("What should I call you?",
  then "Pick your companion": looks only, a card with a small animation on
  hover) and switchable from the menu. Each has its own mind.
- The app becomes **Companion**; your name becomes a setting.
- New for all, Togepi too: walking to your window when lonely; glancing at
  what you watch and reacting to it.
- Togepi stays (the repo is private).

Steps (each approved by Sushant before the next):
1. **Character system, Togepi moved into it unchanged** (plus an
   *Activities* submenu). Sushant tests it on his Mac.
2. **Pip**: looks (front/back → poses → activities, each approved),
   personality and sliders, chirp, lines, games, then the picker.
3. **Mori**, 4. **Nomi**, the same way.
- Shared additions (lonely → your window, watching option b, mood on the
  body) fitted in between, details asked first. Step 1b: the lonely walk
  and watching (b) for Togepi (on battery too, not below 20%).

Step 1 built (2026-10-24), Togepi unchanged:
- `src/characters/`: one folder per character (README there). Togepi's
  `index.js` (personality and "Who I am", his four activities as data:
  menu label, words for his mind, brain-view label, on the spot or moving,
  effects, appeal by needs and mood), `look.js` (his drawing, moved from
  `src/renderer/character.js`, plus how his activities look), `voice.js`
  (his chirp, moved from `src/renderer/chirp.js`), `lines.js` (sign texts
  from `nudges.js`, floating texts from `renderer.js`).
- Shared code reads the active character: `brain.js` scores and drifts
  with its activities, `companion.js` starts them, `renderer.js` /
  `ui.js` draw it, `chirp.js` plays its voice, the menu has an
  **Activities** submenu with its activities (the rest stays in *Do
  something…*).
- Your name and pronouns: `settings.userName` and `settings.userPronoun`
  (he/she/they), asked in the welcome window ("What should I call you?",
  "How should I refer to you?", on first run and whenever one is missing);
  every prompt uses them (`src/main/mind/names.js`; `{user}`, `{they}` in
  fixed texts; verbs agree, e.g. "they are looking"). The question's
  `aboutSushant` became `aboutUser`. `about-sushant.md` became
  `about-you.md` ("Your notes"), renamed on load.
- The app is **Companion** (`productName`, `appId
  com.sushantpatil.companion`, permission texts, `Companion.app`). On its
  first start `src/main/migrate.js` copies Togepi's data from
  `…/Togepi/` (or `…/digital-companion/`) into
  `…/Companion/characters/togepi/` and sets the name to Sushant (he/him); the old
  folder is left alone.
- Checked against the original code: brain scores and need drift
  identical on 20,000 random situations, six 90-minute simulations of him
  identical step by step, every prompt identical (except `aboutUser`), and
  129 renders of every pose, mood, sign and floating text pixel-identical.
  Welcome version 12.

Step 1b built (2026-10-24):
- Watching with glances: every 2 minutes while you watch (`WATCH.glance`),
  `main.js` takes a picture of that window with the screen reader (same
  privacy rules) and `mind.glance()` asks the vision model for `{ scene,
  mood }` (`thinker.js`: `glancePrompt`, `GLANCE_SCHEMA`, `parseGlance`;
  moods exciting, funny, sad, scary, beautiful, boring, calm). Skipped while
  he's busy, while the models rest (battery below 20%…) or without *Let him
  read my screen*. The moment goes into his day as text (`watched` events:
  his thoughts after the show, and the diary with the last 8 per show);
  never the picture. Brain view: *Last glance*.
- His body: `companion.watchReact(mood)` (a few seconds in `watchReact`,
  then back to sitting); each character draws it (`look.js` `watchPose`;
  Togepi: leaning in, a wiggle and a heart, drooping, hiding with a sweat
  drop, sparkles, turning round to look at you).
- Lonely: `seek` goes to the window you work in (`setWorkWindow`, from
  attention), looks up at it for 60 s (`lookUp`), then sits there 90 s
  looking up; without app watching, under your cursor as before.
- Welcome version 13.

Step 2 built (2026-10-24): **Pip**.
- `src/characters/pip/`: `look.js` (approved look, all poses, his six
  activities and props, his own reactions), `index.js` (approved "Who I
  am" and sliders, activities as data), `lines.js` (reviewed lines),
  `voice.js` (clicky "pip"s and a rolling "brrrp").
- New shared machinery: activity `variants` (winding: got it / gave up;
  building: works / smokes) with a `then` state; a character's own
  `states` with a click reaction (`tap`: winding him) and an `endEvent`;
  `afterThrow` (Pip lands, checks himself, "That was unnecessary.");
  `restyle` for shared states (his victory flight when happy); activity
  scores get the context (`conduct` only while music plays).
- Music (`src/main/mind/music.js`, `mac/music.jxa.js`): Spotify and Apple
  Music say whether they're playing; music sites by address and title;
  other tabs judged by the decision model once per page. Checked every
  10 s, only for a character with an activity that needs it.
- Switching (`switchCharacter` in `main.js`): *Character* submenu and
  *Pick your companion…* (the picker: looks only; hovering one makes it
  hop and wave and slides up a card with its name, concept and "Who I
  am"). The models keep running; the other character's mind, memories and
  brain are loaded from its folder; your reminders and water stay; a puff
  when he appears. A new install shows the picker after the welcome.
- Tic-tac-toe pieces per character (Pip: ⚙️ vs 🔩), Pip's gear for fetch,
  his critic poses while watching (leans in, hides, "3/10" when boring).
- Checked: Togepi still identical to the original (brain, simulation,
  prompts, 129 renders); switching and the picker in the real app.
  Welcome version 14.

Step 3 built (2026-10-24): **Mori**.
- `src/characters/mori/`: `look.js` (approved look on four legs: raised
  paws instead of arms, sitting on his haunches, asleep curled under his
  moss; his six activities and their props; flowers on his moss when
  cheerful or happy, ears hanging when sad), `index.js` ("Who I am",
  sliders, activities as data), `lines.js`, `voice.js` (soft low "mm…"
  hums).
- His activities: collecting leaves (from a big heap; hugs it, or 3 in 10
  wears it), planting a seed (sprouts 6 in 10, otherwise he stares at it,
  then at you), mushroom hunting (a walk of a random length either way to a
  group of mushrooms that comes into view as he gets close; picks one and
  dances, or backs off from red spotted ones, 3 in 10), making tea (fixes
  hunger), skipping stones (plop.), watching fireflies (only 6 pm to 5 am;
  greyed out in the menu by day).
- New shared machinery: a moving activity's `then` state when he arrives
  (`mushroomFound`); own states with `then: { activity }` (walks away after
  being dizzy) and `resumeFetch`; `thrownTooMuch` (Mori: 3 throws in 10
  minutes → a "Please don't." sign, never angry); `fetchDistraction` (a leaf
  on the way to the pinecone, 3 in 10); a character `speed` (Mori walks at
  three quarters); the frame says how far ahead a walk ends (`ahead`) and
  when he just won tic-tac-toe (`wonGame`).
- Games and watching: fetch with a pinecone; tic-tac-toe with your leaves
  against his mushrooms, a mushroom on his head when he wins; watching with
  his mug of tea (leans in, ears droop, flowers, ducks under his moss at
  scary scenes, sips his tea when bored).
- Shared fix: choosing an activity from the menu ends a game he was offering
  (he went mushroom hunting with the pinecone in his paws).
- Checked: Togepi still identical (brain, simulation, prompts, 129
  renders); Mori in the real app (switching, the menu, mushroom hunting,
  the picker). Welcome version 15.

Fix (2026-10-24, Sushant: "I think it's the right time now to implement
that"): **permissions and signing**.
- `npm run make-cert` (`scripts/make-signing-cert.sh`) makes a self-signed
  "Companion Local Signing" certificate in his login keychain once;
  `scripts/sign.js` signs every build with it (ad hoc, with a warning,
  without it), so macOS keeps Screen Recording, Calendar and Automation
  across rebuilds. `npm run reset-permissions` forgets the answers kept for
  old ad hoc builds (Companion and Togepi). The keychain and signing steps
  can't be run in the Linux container; the certificate itself was checked
  with openssl here.
- The Brain menu no longer ticks a switch as if it worked: one that's on
  but not allowed says "(not allowed by macOS)" with *⚠ Fix in System
  Settings…* (`src/main/permissions.js`). The brain view and the report say
  how the app is signed and when the calendar was last read.
- The calendar is read every minute (was 5 minutes), and right away when
  the menu or the brain view opens (at most every 15 s) and when the Mac
  wakes or unlocks. Welcome version 16.

Step 4 built (2026-10-24): **Nomi**.
- `src/characters/nomi/`: `look.js` (approved look, poses and activities),
  `index.js` ("Who I am", sliders, activities), `lines.js`, `voice.js`
  (soft dreamy hums through a gentle reverb).
- Her activities: catching stars (fixes hunger; the jar glows at night),
  dream bubbles (3 in 10 silly; silly ones when nobody plays with her),
  making rain (mostly when sad; a pat stops it and a rainbow appears),
  painting a rainbow bridge, reading a big book, moon watching (only 6 pm
  to 5 am), wandering the sky (30–60 s up near the top of the screen, legs
  tucked in, then back down).
- She floats just above the floor like the others walk; dropped, she
  drifts down gently; thrown hard she's carried off the screen and floats
  back a little later, dizzy and stormy; never angry. Fetch with a dream
  bubble that pops 2 throws in 10 (she's surprised, then blows a new one);
  tic-tac-toe with your stars against her moons, a constellation of the
  board when she wins; watching together slightly see-through (giggle
  bubbles, stars, a darker cloud, peeking round the edge at scary scenes).
- Shared machinery, only for characters that ask for it: `fly`, `float`,
  `neverAngry`, `fetchPop`, an activity's `tap`, `soloVariant`, a
  `returning` own state; the frame carries the board she won (`wonBoard`).
- Fix: requests to the models drop half-emoji (an emoji cut in two when
  screen text is shortened made llama-server answer 400 "invalid string:
  surrogate"; Sushant's report while testing Mori), in `engine.js`.
- Checked: Togepi identical (brain, simulation, prompts, 129 renders); Nomi
  in the real app (switching, the menu, wandering the sky). Welcome
  version 17.

### Phase 10: Tiger Data, the weekly song and memory search — status: `in progress` (for the hackathon demo on 2026-10-25; the song tried by Sushant: "works great")

Answers (2026-10-24, details in DECISIONS.md): TimescaleDB on the Mac (no
cloud), in `…/Companion/database/`, shared by all characters; old event
logs loaded automatically; a 30-second weekly song with lyrics sung by a
sweet female voice, lyrics and style only from the character's personality;
the ElevenLabs key asked in the app and kept in the Keychain; memory search
by meaning as part 3.

Parts (in this order, each tested before the next):
1. **Tiger Data**: Companion runs its own Postgres + TimescaleDB on the Mac
   (Homebrew's, found by path; listening only on a socket in its own
   folder, no network, telemetry off). Tables: `events` (every event-log
   entry, all characters) and `minutes` (once a minute: mood, needs, what
   you're on), both hypertables kept 90 days and moved to the columnstore
   after 7 days; hourly totals as continuous aggregates. Old `events.jsonl`
   files are loaded on start. Without Postgres he works as before.
2. **The weekly song**: the week's totals → the character's language model
   writes title, lyrics and style → privacy check → ElevenLabs Music (30 s)
   → `characters/<id>/mind/songs/` → sign, song window, dance.
3. **Memory search by meaning**: embedding model + pgvector.

Part 1 built (2026-10-24): `src/main/mind/store.js` (finds Homebrew's
Postgres, `initdb` once in `…/Companion/database/data`, its own server on a
socket in that folder only, TimescaleDB telemetry off; `events` and
`minutes` hypertables, columnstore after 7 days, retention 90 days,
`events_hourly` / `minutes_hourly` continuous aggregates; `week()` adds up
a week). `EventLog` has an `onAdd` hook; `main.js` starts it, samples a
minute, stops the server on quit; brain view and report show its status.
Old `events.jsonl` lines newer than the database's last row are loaded on
start (old "you switched to" entries give at most 10 minutes each). Tested
against TimescaleDB 2.31.0 (the Mac's version). Welcome version 18.

Part 2 built (2026-10-24): `src/main/mind/song.js` (prompt: the week's
numbers and his diary, format only; `systemPrompt(..., { format })` swaps
the 8-word rule for the song's; `parseSong` drops lines with emails,
numbers or keys; your blocklist and the decision model check the words;
ElevenLabs `POST /v1/music` with a `music_v2_5` composition plan, verse
15 s + chorus 15 s, his style tags plus `songSinger`; saved as
`songs/<day>.mp3` + `.json`; due from Sunday 6 pm). `main.js`: the key in
the Keychain (`safeStorage`, file `elevenlabs.key`), *Mind → Our songs…*,
*Try it now → Make this week's song now*, the weekly check every 5 min,
his bubble "I made us a song! 🎵 Click me", the song window
(`song.html` / `song.js` / `song-preload.js`: words lit up as they're
sung, "This week", older songs, settings) and dancing while it plays; a
welcome switch. A 6-second test clip with Sushant's key worked (2 s).
Welcome version 19.

Part 3 built (2026-10-24): `engine.js` runs an optional third
`llama-server` with EmbeddingGemma 300M (`--embeddings`;
`scripts/fetch-models.js` role `embed`) and `engine.embed(texts, { query })`
with its prompt formats. `store.js`: `memories` table (pgvector,
`vector(768)`), index `diskann` when pgvectorscale is installed, else
`hnsw`; `syncMemories` (new memories fingerprinted, forgotten ones
removed; every minute and when a mind starts), `nearest`. `Memory.recall`
takes similarities (`meaningRelevance`: 0.28 → 0, 0.5 → 1, measured
with the real model; your name is left out of fingerprints, since it made
every memory look alike);
`Mind.recall` is async and asks `meaning(query)` first, falling back to
words. Long socket paths fall back to a private `/tmp/companion-db-<uid>`.
Tested with pgvector 0.6 + pgvectorscale 0.9.1 (DiskANN). Welcome version 20.

### Phase 11: voice commands — status: `done` (merged; tried and accepted by Sushant on 2026-10-24: "works fine")

Answers (2026-10-24, details in DECISIONS.md): ⌥ Space or the 🎤 in the
chat window starts listening (never otherwise); speech to text is
configurable: Apple's on-device recognition (default, local) or
ElevenLabs Scribe (online); menu commands run directly, anything else is
chat, an answer picks his question's answer; replies stay bubble +
chirp; what you say is kept like chat, audio never; never in meetings,
locked or away; the same commands for every character.

Built (2026-10-24):
- `src/main/mind/commands.js`: what you said → a command (`parseCommand`:
  come here, play fetch / tic-tac-toe / any, stop playing, nap, wake, stay
  put / move again, remind me in … / at … to …, make our song, open the
  chat, done (only while he holds something up), his activities by their
  menu names, an answer to his question by the words only that answer
  has) or null (chat). `hints()`: names and commands for the recognizers.
- `src/main/mind/hearing.js`: `transcribe()` with Apple's helper or
  ElevenLabs Scribe (`scribe_v2`, keyterms), deleting the recording after.
- `src/main/mac/listen.swift` + `scripts/build-helpers.js`: the helper
  (SFSpeechRecognizer, `requiresOnDeviceRecognition`, contextual
  strings, an Info.plist with the usage description inside the binary),
  built by `npm start` / `npm run dist` when missing or out of date,
  bundled as `Resources/helpers`, signed by `scripts/sign.js`.
- `src/renderer/listen.*` + `src/listen-preload.js`: a hidden window that
  opens the microphone only when asked, `Talk` (wav.js) ends it 1.2 s after
  you stop talking (6 s without a word: nothing; 12 s at most), WAV at
  16 kHz. Tested in Chromium with a fake microphone playing speech.
- `main.js`: `voiceCommands` (off), `speechEngine`, `listenShortcut`
  (Alt+Space), `speechLocale`; the shortcut, 🎤 in the chat,
  *Mind → Talk to me* and *Listen with*, a welcome switch; 👂 / … bubble
  without a chirp (`companion.listening`), chirps muted while listening,
  stops in meetings / away / switching; commands run like the menu;
  chat otherwise (`chatSend`); spoken commands go into his day; brain
  view and report rows. `package.json`: NSMicrophoneUsageDescription,
  NSSpeechRecognitionUsageDescription. Welcome version 21.
- Not testable here: the Swift helper and macOS permissions (Sushant on
  his Mac). Scribe reached ElevenLabs but the key needs Speech to Text.

### Phase 12: moments — status: `in progress` (SBU Hacks, 2026-10-24; built and tested here, to be tried on Sushant's Mac)

Goal: he responds to moments in your day: he celebrates when you finish or
submit something (or tell him "I did it"), comforts you after a bad day or a
rejection, cheers you on before an interview or an exam, and keeps you
company as a study buddy while you work.

Answers (2026-10-24, details in DECISIONS.md): decided by the model through
his prompt, not by conditions in the code; his personality decides whether
and how he reacts; nothing may depend on a particular character (Phase 9)
and the calendar features are not touched (a calendar branch is in
progress); study buddy lasts as long as the work goes on; confetti around
him only, as a shared effect; "I did it" only when you type it to him; as
little code as possible. Built as "Phase 9" on `sbuhacks-dev` before the
characters phase reached `main`; renumbered 12 when `main` was merged in.

Built:
- `src/main/mind/moments.js`: the text added to his first message (thoughts
  and chat, not the diary, reflection or song) and the new actions:
  `celebrate` (confetti and a hop), `comfort` (a hug and hearts),
  `studyBuddy` (sits with his back to you watching your screen). The text
  never names the character and writes {user} / {them} / {their} for your
  name and pronouns (names.js).
- `thinker.js`: includes that text and the new actions; tells him when he's
  being a study buddy, so he can decide when to stop.
- `companion.js`: the three actions, built from poses every character draws
  (hug, back view) and the shared hop; study buddy holds until another
  action, until you're away or until you start watching something together.
- `renderer.js`: confetti and comfort hearts as particle effects at the
  active character's head, outside any character's drawing.
- Welcome version 23 (22 at first; main's calendar work took 22). Manual test plan: [phase12-testing.md](phase12-testing.md).
- 2026-10-25: **study buddy switched off**: it kept him too quiet. Commented
  out in `moments.js` (the prompt line and the action) and in
  `companion.js` (he never starts it, even if asked); its two tests are
  skipped and one checks that it stays off. Welcome version 31.

### Tonk, a fifth character — status: `in progress` (SBU Hacks, 2026-10-24; built and tested here, to be tried on a Mac)

The team's "steam and steel" character (DECISIONS.md, *Tonk*): a pocket-sized
brass-and-steel robot with a red visor, an antenna bulb and wheels for feet.
Built like Pip, Mori and Nomi: `src/characters/tonk/` (`index.js`
personality, "Who I am", six activities, a `dizzy` state after a throw;
`look.js` every basic pose, his activities, watching reactions and the ball
bearing; `lines.js`; a placeholder `voice.js`), registered in
`src/characters/index.js` and loaded by the companion, ball and picker windows;
tic-tac-toe 🔌 vs 🔋. Tests: `test/tonk.test.js` (his parts, activities,
dizzy after a throw, and every pose drawn without errors). Welcome version 27.

### Wolfie, a sixth character — status: `in progress` (SBU Hacks, 2026-10-24; built and tested here, to be tried on a Mac)

Stony Brook's mascot as a classic, college-themed companion (DECISIONS.md,
*Wolfie*): a little taller than the others, "Go Seawolves!" in his cheer and
lines, six college activities (pizza, class, studying, a night-only
all-nighter, cheering, his game-day dance), a shake-off after a throw.
`src/characters/wolfie/` like Tonk's; tic-tac-toe 🐾 vs 🌊; fetch with a
mini football. Tests: `test/wolfie.test.js`. Welcome version 28. Only for the
demo until Stony Brook says otherwise (trademark).

### Optional: his voice on Gemini — status: `in progress` (SBU Hacks, 2026-10-24; Sushant to confirm before `main`)

Goal: a Mac without room for the local models (about 11 GB; a 16 GB laptop
froze loading them) can still run his mind: the voice model's work goes to
Google's Gemini API, everything else stays the same. Off by default.

Built:
- `src/main/mind/gemini.js`: `GeminiEngine`, same interface as `Engine`
  (think, decide, embed, ready, status, start/stop, files, memoryMB), so the
  mind, diary, reflection, song and chat don't change. Gemini's
  `generateContent` with his system prompt, the chat so far, the picture of
  the window (optional) and his answer schema (converted; lengths are still
  checked in code; plain JSON if Gemini refuses the schema). Thought parts
  skipped; errors (rate limit, blocked) shown in the brain view, never the
  key. The decision and embedding models can keep running on the Mac
  (`localDecider`).
- `engine.js`: `voice: false` runs only the decision and embedding models.
- `settings.js`: `mindEngine` ('local' | 'gemini') and `gemini` { model,
  images, localDecider, generationConfig, timeoutMs }; `MIND_ENGINE`,
  `GEMINI_MODEL` and the key (`GEMINI_API_KEY` / `GOOGLE_API_KEY`) from the
  environment. `main.js` picks the engine in one place.
- *Mind → Think with*: Gemma, on this Mac / Gemini (online), radio items
  like *Listen with*; switching stops the models in use and starts the
  other kind. `MIND_ENGINE` sets the choice at start and it's kept.
- Welcome version 24.
- Welcome window *How should I think?*: Gemma, on this Mac / Gemini,
  online, and a field for your Gemini key, kept in the Keychain (`gemini.key`,
  safeStorage, like the ElevenLabs key; `GOOGLE_API_KEY`/`GEMINI_API_KEY`
  win). On a new install the models wait until the welcome window closes or
  you pick. Welcome version 26.

### The app becomes Filo — status: `built` (2026-10-24; to be tried on Sushant's Mac)

Answers (details in DECISIONS.md): Filo, from the Greek φίλος ("friend"), is
the app's name, not a character; the logo is direction B (a friend sitting on
a screen that shows a chat bubble), made from the picture Sushant liked
(a friend carrying a screen); a new bundle id is fine (permissions are
granted again).

Built:
- `build/icon.png` (1024 px) and its source `build/icon.svg`; the lockup
  (icon and word) in `docs/brand/`; the icon in the welcome window's header
  (`src/renderer/filo-icon.png`). The letters of "Filo" are drawn from
  strokes, so no font is involved.
- `package.json`: `productName` Filo, `appId` com.sushantpatil.filo,
  permission texts say Filo; the speech helper is com.sushantpatil.filo.listen;
  `sign.js` signs `Filo.app` (still with the "Companion Local Signing"
  certificate, so `make-cert` isn't run again); `reset-permissions.sh` also
  forgets Filo.
- `migrate.js`: the first start copies the Companion folder (settings, every
  character, the database unless the old app is still running) into
  `…/Filo/`; Togepi's older folder still works. The ElevenLabs and Gemini
  keys stay behind (the Keychain entry is named after the app).
- Welcome version 28.

### Talking opens the chat; bubbles fit their text — status: `built` (2026-10-25; to be tried on Sushant's Mac)

Answers (2026-10-25, details in DECISIONS.md): anything you say out loud
that isn't a command opens the chat window, and his reply goes only there;
bubbles fit their whole text (wider up to 272, then taller, no shrinking or
"…"), for speech, question and nudge bubbles.

Built:
- `main.js`: `heard()` opens the chat (`showChat`) and sends the message
  with `chatSend(text, { bubble: false })`; typed chat still answers in the
  bubble too. `winSize()`: his window grows upward and wider while the bubble
  needs it (`setBounds` only when the size changes); the `bubble` message.
- `src/renderer/ui.js`: `wrapAll` (every line, long words broken),
  `speechLayout` / `questionLayout` / `bubbleLayout`; the draw functions
  return their size. `renderer.js` reports it (`reportBubble`, only on
  change) through `preload.js`.
- `companion.js`: `setBubble(box)`; clicks on a big speech, question or
  nudge bubble land (the answer buttons stay where they were).
- `test/bubbles.test.js`. Welcome version 32. Checked in the real renderer
  (Togepi, Wolfie, Pip): short, long, question and nudge bubbles.

### Voice first, app watching after a switch, Brave, 5 s watching — status: `built` (2026-10-25; to be tried on Sushant's Mac)

Answers (2026-10-25, details in DECISIONS.md): listening comes before
whatever he's doing except in meetings, and what he was showing comes back
after; "He sees" works right after switching character; a browser by
itself never counts as watching; watching timers 5 s each way.

Built:
- `companion.js`: `listening()` holds him like the right-click menu
  (standing pose, timers wait, question's wait paused), the snapshot shows
  only the 👂 bubble, hidden boards can't be clicked (`'listening'` part).
- `main.js`: `sendWhenFree` for spoken chat; `attention.forget()` in
  `startMind`; `watchingApps` for the brain view. `attention.js`: `forget()`.
- `watching.js`: `blankTitle`; `WATCH.start` / `stopAfter` 5.
- Tests: `test/listening.test.js`, watching and attention tests. Welcome
  version 33.
- The 📝 after a spoken reminder waits until he puts down a nudge, sign or
  game invite (`Companion.sayLater`). Welcome version 34.
- Watching guesses: the decision model's "yes" must be at least 0.85 (was
  0.6; the SBU Hacks site scored 0.48, Spotify's web player 0.72, real
  videos 0.89-0.99). Welcome version 35.

### The brain window in tabs — status: `built` (2026-10-25; to be tried on Sushant's Mac)

`src/renderer/brain.html` / `brain.js`: header card (state and mood face,
plus staying put, quiet, playing, showing), tabs Feelings / Noticing /
Decisions, Noticing's sub-tabs from `GROUPS` (You, Screen, Day, Mind,
System) with counts; the open tab and group kept in localStorage. Names
for the game states. `test/brain-view.test.js`. Welcome version 36.

## Later

Noted for the future (not scheduled; ask Sushant before starting):
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
