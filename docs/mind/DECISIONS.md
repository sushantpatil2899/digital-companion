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

Asked 2026-10-19. Research for these: [research/personality.md](research/personality.md).

1. Starting personality.
2. How often he may comment unprompted (default chattiness).
3. What should make him comment.
4. What the model may see in Phase 1, and the default privacy blocklist.
5. Mind on by default?
6. Which kinds of activity he comments on.

Answers:

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-19 | 1. Starting personality | **Deferred.** First research how personality is represented, stored and maintained (published work, games, AI characters), covering as many traits as possible; agree on the structure, then choose his personality. Research in research/personality.md, waiting for review. | Sushant doesn't want a superficial choice; the structure must support every trait. |
| 2026-10-19 | 2. How often he comments | **He decides himself.** No fixed frequency. The model gets his personality, recent events, his previous decisions (what he said or didn't say, when) and your reactions, and decides whether to speak and what to say. Every decision is fed into the next one (a loop). Once a conversation has started it continues. Not being annoying comes from his personality and past reactions, not a fixed rule. | Sushant wants him to have his own decision power. |
| 2026-10-19 | 3. What makes him comment | **No hard-coded comment triggers.** Triggers only wake him up to *think*; whether and what he says is his decision. Your interactions (petting, clicking, game events, invitations, replies) always wake him. Switching apps/sites is an observation he may or may not react to. | Same as above. |
| 2026-10-19 | 4. What the model sees + blocklist | What he sees in Phase 1 is up to the implementation. Privacy must be **built in and automatic**, not just a list of sites: private/incognito windows, password managers and anything payment-related are blocked automatically. Plus a **configurable blocklist** Sushant can extend with his own apps, websites, or anything else. | Sushant's requirement. |
| 2026-10-19 | 5. On by default | Yes, on by default, with an off switch. | Agreed. |
| 2026-10-19 | 6. Which activities he comments on | **His own decision**, not a hard-coded list; different personalities react to different things. | Same as 2. |
| 2026-10-19 | Idea: candidates + fast classifier | Under consideration. Sushant suggested the LLM writes ~4 candidate lines and a fast open-source classifier scores them. Assessment and recommendation in research/personality.md §10, waiting for review. | Sushant's idea. |
