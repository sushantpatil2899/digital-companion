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

## Architecture (planned)

- **Engine:** `node-llama-cpp` (llama.cpp with Metal GPU) inside the app, no
  Ollama/server. Runs in an Electron utility process so animation never
  stalls.
- **Model:** ~8B instruct model (current Qwen or Llama class), GGUF Q4
  (~5 GB file, ~6 GB RAM). Swappable file; a 12-14B model can be tried later.
- **Bundling:** model is not committed to git (too big). A build script
  downloads it once into git-ignored `models/`; electron-builder copies it into
  `Togepi.app` (app ≈ 5 GB).
- **Code location:** new `src/main/mind/` directory.
- **Memory location:** `~/Library/Application Support/Togepi/memory/`.
- **Existing inputs to reuse:** `src/main/mac/front-app.js` (front app,
  visible windows, browser tab URLs), `src/main/mac/calendar.js`,
  `src/main/context.js`, `src/main/brain.js` (mood, needs), `src/main/nudges.js`
  (built-in phrases, used as fallback).

## Phases

Status values: `not started` → `questions` → `in progress` → `done` (merged
and tried by Sushant).

### Phase 1: his own voice — status: `questions`

Goal: he comments in his own words, in character, on what you're doing.

Planned scope:
- `personality.md`: trait levels (e.g. kind, sassy, protective, playful) and a
  short description of who he is.
- Speaking triggers decided by rules (candidates: switching to a new app/site,
  coming back after being away, games ending, petting, inviting you to play).
- Prompt = personality + mood + time of day + what you're doing → one line,
  ≤ 8 words, validated; fallback to built-in phrases.
- Read the active browser tab's **title**, not just its URL.
- Menu controls: mind on/off, chattiness level, privacy blocklist.
- Block all outgoing network requests in the app.
- Model bundling (build-time download, `extraResources`), utility process.
- Tests use a fake model.

Open questions: see DECISIONS.md, "Phase 1 questions".

Known limit: the GPU can't be tested in the dev container; reply quality is
checked there on CPU, speed is confirmed by Sushant on his Mac.

### Phase 2: memory — status: `not started`

Goal: he remembers what happened and refers back to it ("Third Amazon role
this week!").

Planned scope:
- `events.jsonl`: raw event log (apps/sites, games, petting, reactions).
- `journal/YYYY-MM-DD.md`: end-of-day diary written by the model.
- `about-sushant.md`: facts learned about you (e.g. job hunting, resume
  highlights, likes fetch).
- `about-me.md`: his opinions, running jokes.
- Relevant memories added to each prompt (keyword search first; small local
  embedding model later if needed).

### Phase 3: reading the screen — status: `not started`

Goal: he understands what's on screen (e.g. the job description you're
reading), not just app and tab names.

Planned scope:
- Small Swift helper using Apple's built-in Vision text recognition (OCR) on
  the front window when it changes / every 20-30 s in interesting apps. No
  continuous capture.
- Needs macOS Screen Recording permission.
- Privacy blocklist applies before anything reaches the model or memory.

### Phase 4: personality growth — status: `not started`

Goal: his personality changes with experience.

Planned scope:
- Traits stored as numbers; weekly "reflection" over the journal proposes
  small, capped changes (e.g. ignored all week → a bit sassier; played a lot
  → warmer). Same idea as Stanford's "Generative Agents" (observe → remember →
  reflect).

### Phase 5: polish — status: `not started`

Candidates: mood-based chirp sounds (Animal Crossing style), optional vision
model for screenshots, optional fine-tuning of his speaking style, bigger model.

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
