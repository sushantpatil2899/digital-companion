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

### Phase 4: personality growth — status: `questions` (proposal below, asked 2026-10-21 while Sushant tests Phase 3)

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

### Phase 5: polish — status: `not started`

Candidates: optional fine-tuning of his speaking style, bigger model,
Togetic evolution artwork (if not in Phase 4), anything found while using
him.

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
