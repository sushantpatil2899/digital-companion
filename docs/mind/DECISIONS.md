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
| 2026-10-19 | 1. Starting personality | `superseded by the 2026-10-20 rows` **Deferred.** First research how personality is represented, stored and maintained (published work, games, AI characters), covering as many traits as possible; agree on the structure, then choose his personality. Research in research/personality.md, waiting for review. | Sushant doesn't want a superficial choice; the structure must support every trait. |
| 2026-10-19 | 2. How often he comments | **He decides himself.** No fixed frequency. The model gets his personality, recent events, his previous decisions (what he said or didn't say, when) and your reactions, and decides whether to speak and what to say. Every decision is fed into the next one (a loop). Once a conversation has started it continues. Not being annoying comes from his personality and past reactions, not a fixed rule. | Sushant wants him to have his own decision power. |
| 2026-10-19 | 3. What makes him comment | **No hard-coded comment triggers.** Triggers only wake him up to *think*; whether and what he says is his decision. Your interactions (petting, clicking, game events, invitations, replies) always wake him. Switching apps/sites is an observation he may or may not react to. | Same as above. |
| 2026-10-19 | 4. What the model sees + blocklist | What he sees in Phase 1 is up to the implementation. Privacy must be **built in and automatic**, not just a list of sites: private/incognito windows, password managers and anything payment-related are blocked automatically. Plus a **configurable blocklist** Sushant can extend with his own apps, websites, or anything else. | Sushant's requirement. |
| 2026-10-19 | 5. On by default | Yes, on by default, with an off switch. | Agreed. |
| 2026-10-19 | 6. Which activities he comments on | **His own decision**, not a hard-coded list; different personalities react to different things. | Same as 2. |
| 2026-10-19 | Idea: candidates + fast classifier | `superseded` Under consideration. Sushant suggested the LLM writes ~4 candidate lines and a fast open-source classifier scores them. Assessment and recommendation in research/personality.md §10, waiting for review. | Sushant's idea. |
| 2026-10-20 | Trait base | **Option A: Big Five 30 facets + 4 HEXACO Honesty-Humility facets (34 traits).** | Sushant chose A after reviewing research/personality.md. |
| 2026-10-20 | Include values? | **Yes, all 19 Schwartz values.** | Sushant agreed. |
| 2026-10-20 | Scale | **0-100 per trait/value, Dwarf Fortress style** (50 = average; only extremes put into words). | Sushant agreed. |
| 2026-10-20 | Who sets the starting numbers | **Sushant sets sliders himself.** Needs a slider editor in the app. | Sushant's choice. |
| 2026-10-20 | Fast classifier | `superseded` Sushant meant **JEPA**-type models, not GLiClass. Research §11: no open text JEPA classifier exists yet. Plan: build a pluggable `score(context, options)` step. Phase 1 uses LLM self-rating + embedding similarity; swap in a JEPA model later (VL-JEPA fits Phase 3). Waiting for Sushant's confirmation and links to the other models he named. | Keeps his idea without blocking Phase 1. |
| 2026-10-20 | Voice | **Voice means sound, not words or a text style.** Togepi's chirps ("toge-priii"), like the Pokémon, never a human or text-to-speech voice. Words stay in the speech bubble. The planned humour/sass "voice" sliders are dropped: speaking style comes from the traits. | Sushant's clarification. |
| 2026-10-20 | Relationship layer | **Yes.** Starts low ("just met": affection 25, trust 25, familiarity 5) and grows. | Sushant agreed. |
| 2026-10-20 | Growth limits | **Yes** (proposed: traits ±3, values ±1, relationship ±10 per weekly reflection). | Sushant agreed. |
| 2026-10-20 | Slider editor | **"Personality…" window from the tray and right-click menus**, sliders grouped by dimension with a one-line explanation, live changes. **He notices when he's changed.** | Sushant agreed. |
| 2026-10-20 | Starting values | **Not average: based on who Togepi is in Pokémon.** Draft in [togepi-personality.md](togepi-personality.md). **Approved 2026-10-20** (see below). | Sushant's requirement. |
| 2026-10-20 | Decision model | Sushant meant **Jev** (TypeSafe; paid, closed), and its open alternative **Laya** (Apache-2.0, 421M), not JEPA. Plan in research §12: Laya as the fast decision layer (privacy gate, wake-up, pick among ~4 LLM candidates, pick an action) behind `decide(question, options)`. Phase 1 starts with a spike to run it in Node; LLM self-rating is the fallback. | Sushant's idea, confirmed. |
| 2026-10-20 | Starting personality values | **Approved as drafted** in togepi-personality.md (34 traits, 19 values, relationship 25/25/5, growth limits ±3/±1/±10). | Sushant agreed. |
| 2026-10-20 | Where chirps come from | **Both.** Generated Togepi-like chirps by default (original audio, pitch and speed follow his mood). If Sushant puts his own clips in the sounds folder, those are used instead. Folder: `~/Library/Application Support/Togepi/sounds/` (not in git). File names: `<mood>-<anything>.<ext>` with mood `cheerful`, `content`, `meh`, `sad` or `grumpy` (the moods in `src/main/brain.js`); files without a mood prefix play for any mood. Formats: .wav, .mp3, .m4a, .aac, .ogg; short clips (under ~2 s) work best. A menu item opens the folder. | Real Pokémon cries are copyrighted, so they can't be in the repo; user-supplied clips stay local. |
| 2026-10-20 | When chirps are built | **Phase 1** (moved from Phase 5). | Sushant: nothing to wait for. |
| 2026-10-20 | Hugging Face access for the dev container | Sushant will allow `huggingface.co` in the environment's network settings and confirm. **The Phase 1 Laya spike waits for this.** | Needed to download Laya and the LLM for testing. |

**Phase 1 questions: all answered (2026-10-20).** Next step: Laya spike once Hugging Face access is confirmed, then build Phase 1.

## Phase 1 implementation decisions

Technical choices made while building Phase 1, for Sushant to confirm.

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-20 | Engine | **llama.cpp `llama-server`** (two local processes on 127.0.0.1) instead of `node-llama-cpp`/ONNX. *Proposed.* | llama-server natively supports decision models (`/v1/systemone`: Laya, OpenJev, Clef, vllm-d3, …) and language models, with Metal on the Mac; one engine for both. |
| 2026-10-20 | Voice model | **Gemma 4 12B instruct Q4_0** (~7 GB, Apache-2.0). *Proposed, untested:* model downloads are blocked in the dev container. Alternative if it's too slow: Gemma 4 E4B (~4.6 GB). | Fits 24 GB with room to spare; good quality for its size. |
| 2026-10-20 | Decision model | **Laya Q8_0** (`ggml-org/Laya-GGUF`, ~0.5 GB). *Proposed, untested.* Fallback if its zero-shot answers are poor: vllm-d3-nano (2.2B, Apache-2.0); OpenJev is 27B and non-commercial, too big. Without a decision model he uses the first line and the privacy rules only. | Small and fast; officially converted by ggml-org. |
| 2026-10-20 | Speaking bar | urge must clear `0.8 − 0.4 × talkativeness` (talkativeness from gregariousness, cheerfulness, warmth, excitement-seeking, impulsiveness; ≈ 0.46 for Togepi), −0.25 when you're interacting, +0.3 right after speaking (fading over ~90 s), +0.08 per ignored line in a row. Rails: silent in meetings and while away, no unprompted lines while asleep or holding up a sign, at most one unprompted line a minute. | Research §9; personality decides, rails only prevent spam and privacy problems. |
| 2026-10-20 | What he sees | Only what *Notice which app I'm using* already sees (opt-in): front app, and the front browser tab's title and site. No screen capture (Phase 3). | Reuses an existing permission; nothing new to grant. |
| 2026-10-20 | Private windows | Chrome-family incognito windows are detected (`mode`), Safari private windows can't be (no AppleScript property) and are only caught by the rules (payment, banking, sign-in, …). | macOS limitation. |
| 2026-10-20 | Relationship in Phase 1 | Stored and used in his prompt, but doesn't change yet (growth is Phase 4). Shown read-only in the editor. | Keep phases separate. |
| 2026-10-20 | Chirps | Also for his existing scripted lines ("You're back!", "I win!", invitations), not just his own words. Muted in meetings; a menu switch turns them off. | "He chirps when he talks." |

