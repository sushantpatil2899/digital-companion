# Togepi's mind: decisions log

Every product or technical decision for [PLAN.md](PLAN.md), confirmed with
Sushant. Newest at the bottom of each section. Never delete an entry; if a
decision changes, add a new one and mark the old one `superseded`.

## General

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-19 | Is this feasible, and how? | Yes: local LLM for the voice, rules keep the body, Markdown memories, phased plan in PLAN.md. | Discussed options; training a model from scratch is unrealistic and unnecessary. |
| 2026-10-19 | Online or offline? | Fully local, no internet at runtime. | Sushant's requirement (privacy). |
| 2026-10-19 | Target machine | Mac M5 Pro, 24 GB RAM, 1 TB. | Sushant's Mac. Fits an ~8B model comfortably. |
| 2026-10-19 | Separate Ollama install or bundled model? | Bundled inside the app. | Sushant's choice; one self-contained app. |
| 2026-10-19 | How to keep track across sessions | This file + PLAN.md in git; every phase starts with questions to Sushant and answers are recorded here. | Sushant's requirement. |

## Phase 1 questions

Status: asked 2026-10-19, waiting for answers.

1. Starting personality.
2. How often he may comment unprompted (default chattiness).
3. What should make him comment.
4. What the model may see in Phase 1, and the default privacy blocklist.

Answers:

| Date | Question | Decision | Why |
|---|---|---|---|
