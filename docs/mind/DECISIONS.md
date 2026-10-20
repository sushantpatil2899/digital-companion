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
| 2026-10-20 | Voice model | `superseded by the tested row below` **Gemma 4 12B instruct Q4_0** (~7 GB, Apache-2.0). *Proposed, untested.* | Fits 24 GB with room to spare; good quality for its size. |
| 2026-10-20 | Decision model | `superseded by the tested row below` **Laya Q8_0** (`ggml-org/Laya-GGUF`, ~0.5 GB). *Proposed, untested.* Fallback if its zero-shot answers are poor: vllm-d3-nano (2.2B, Apache-2.0); OpenJev is 27B and non-commercial, too big. Without a decision model he uses the first line and the privacy rules only. | Small and fast; officially converted by ggml-org. |
| 2026-10-20 | Speaking bar | urge must clear `0.8 − 0.4 × talkativeness` (talkativeness from gregariousness, cheerfulness, warmth, excitement-seeking, impulsiveness; ≈ 0.46 for Togepi), −0.25 when you're interacting, +0.3 right after speaking (fading over ~90 s), +0.08 per ignored line in a row. Rails: silent in meetings, while away and while asleep, no lines while holding up a sign, at most one unprompted line a minute. | Research §9; personality decides, rails only prevent spam and privacy problems. |
| 2026-10-20 | What he sees | Only what *Notice which app I'm using* already sees (opt-in): front app, and the front browser tab's title and site. No screen capture (Phase 3). | Reuses an existing permission; nothing new to grant. |
| 2026-10-20 | Private windows | Chrome-family incognito windows are detected (`mode`), Safari private windows can't be (no AppleScript property) and are only caught by the rules (payment, banking, sign-in, …). | macOS limitation. |
| 2026-10-20 | Relationship in Phase 1 | Stored and used in his prompt, but doesn't change yet (growth is Phase 4). Shown read-only in the editor. | Keep phases separate. |
| 2026-10-20 | Chirps | Also for his existing scripted lines ("You're back!", "I win!", invitations), not just his own words. Muted in meetings; a menu switch turns them off. | "He chirps when he talks." |
| 2026-10-20 | Voice model (tested) | **Gemma 4 12B instruct Q4_0.** Tested on Togepi's real prompts (petted, job hunting, long coding session, thrown, personality change, idle) against Gemma 4 E4B: both stay in character with short lines, but 12B understands what you're doing ("Is Amazon a big toy?", "Go find a job!", "Still coding?") and shows stronger feelings ("Why throw me?!"); E4B didn't get job hunting ("New shiny thing!"). On the Mac's GPU a thought should take ~3 s (CPU here: ~60 s). E4B stays the lighter alternative in `scripts/fetch-models.js`. | Quality of understanding matters most for comments on what you do. |
| 2026-10-20 | Decision model (tested) | **vLLM d3-nano Q8_0** (`ggml-org/vllm-d3-nano-GGUF`, 2.2B, 2.5 GB, Apache-2.0) instead of Laya. Privacy check on 12 window titles: d3-nano 12/12, confident (normal ≈ 0.00–0.01, sensitive 0.69–1.00); Laya 9/12 (missed a tax return, lab results, a password reset; normal pages up to 0.31). Picking his line: both 5/5, d3-nano far more confident. d3-nano also reads images, useful for Phase 3. Privacy cutoff 0.5. Memory with a 4k context: ~2.7 GB. | Privacy is Sushant's priority; d3-nano is much more reliable. |
| 2026-10-20 | Urge scale | The model rates its urge **0–10** with explicit anchors (0–3 most moments, 7–10 when you played with him or something big happened); first tests with 0–1 had it wanting to speak almost always. | Calibration. |
| 2026-10-20 | Asleep | He **never speaks while asleep**, whatever woke him up (in testing a slow thought finished after he'd dozed off). | Looked wrong. |
| 2026-10-20 | End-to-end test | In the real app with llama-server, d3-nano and Gemma 4 E4B (12B is too slow on this CPU for the test's timeout): petting him led to the thought "Sushant is so warm! More happy!", the line "Yay! Soft and warm!" and a jump, logged in events.jsonl. | Verified. |

## Phase 1 feedback (Sushant tried it on his Mac, 2026-10-20)

| Date | Feedback | Change | Why |
|---|---|---|---|
| 2026-10-20 | After being thrown his face looked cross but the brain view said "cheerful". | Brain view shows the face he actually makes (grumpy) and a Grumpy bar that fades over ~3 min. | Display bug; his face was right. |
| 2026-10-20 | He noticed Chrome late, and his thoughts were vague ("so many words"). | App check every 3 s (was 5); the prompt states what's on screen right now and asks him to name the actual thing (company, email subject, video). Retest on the Gmail tab: "Stony Brook sounds like a big adventure!" / "Toge! Big school trip?". Email addresses are removed from titles. | He had the title but no explicit "right now" and no push to be specific. |
| 2026-10-20 | His line arrives after you've already moved on. | A line about a screen you've left is dropped ("you already moved on"); answers are shorter (3 candidates, shorter thought) so they come quicker. | Better silent than late. |
| 2026-10-20 | He has never asked to play on his own. | He starts asking when boredom reaches 0.3 (was 0.5). Simulated: with petting every 10 min, 0 asks in 4 h before, about one every 2-3 h now; alone, about 2 an hour. A due wellbeing nudge replaces an invite you haven't taken up. | Attention kept his boredom below the old threshold, so he never asked. Not a fixed frequency: still driven by boredom. |
| 2026-10-20 | The brain window stays behind when switching apps. | Brain, personality and reminder windows float above other apps and follow you across desktops and full screen. | Requested. |
| 2026-10-20 | He knows Chrome is open but not what the tab shows. | Explained: he gets the front tab's title and site (now shown as "He sees" in the brain view); reading the page itself is Phase 3 (screen text). | Phase boundary. |
| 2026-10-20 | Copilot review emails on PRs. | PRs never request Copilot; it's requested automatically by a GitHub setting (repository ruleset or personal Copilot settings), which Sushant can turn off. | Not set by the PRs. |

## Phase 2 questions

Asked 2026-10-20. Phase 1 marked done (Sushant: no issues).

1. How long he keeps memories: raw event log, journals, facts.
2. His journal: when it's written, and in whose voice.
3. Facts about Sushant: learned only by watching, or also told by Sushant (resume, goals)? Ask before saving? How to correct or forget.
4. How often memories show up in what he says, and anything he must never bring up.
5. His own opinions and running jokes (about-me.md).
6. Anything else he must not remember (beyond private things).
7. A "Memories" window in the app, or just the folder.
8. Relationship growth: start in Phase 2 (from time together) or keep for Phase 4.

Answers:

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-20 | 1. How long he keeps memories | Raw event log **90 days**; journals and facts **forever**. | Default accepted. |
| 2026-10-20 | 2. Journal | Written when Sushant is away at the end of the day (or the next time the app runs if it was off), as a **short diary in his own baby voice**. | Default accepted. |
| 2026-10-20 | 3. Facts about Sushant | Learned **by watching**, saved **silently**. Sushant can add his own notes to `about-sushant.md` and edit or delete anything. | Default accepted. |
| 2026-10-20 | 4. How often memories come up | **His own decision**: memories are simply available when he thinks. | Default accepted. |
| 2026-10-20 | 5. Opinions and running jokes | **Yes**, he writes `about-me.md` himself. | Default accepted. |
| 2026-10-20 | 6. What not to remember | Besides private things: **no full email subjects in long-term memory**, only "read emails". | Default accepted. |
| 2026-10-20 | 7. Memories window | **Yes**: a simple window to read and delete memories, plus the folder. | Default accepted. |
| 2026-10-20 | 8. Relationship growth | **Phase 4**, as planned. | Default accepted. |
| 2026-10-20 | Night-time test failures | Fix them as part of this round. | Sushant asked. |

**Phase 2 questions: all answered (2026-10-20).**

## Phase 2 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-20 | When "end of day" is | From 18:00, once Sushant has been away 10 minutes; past days with 5+ new events are written the next time he runs. Later evening events are added to that day's diary afterwards. | Matches "when you're away at the end of the day". |
| 2026-10-20 | Recall formula | recency + importance + relevance, each 0..1 (Generative Agents); diary lines fade with a 7-day half-life, facts and opinions 60 days; top 5 per prompt; a memory unrelated to the moment needs a total score ≥ 1.5. | Research §6. |
| 2026-10-20 | Importance | Rated by d3-nano (`score` question, 5 levels → 1..10). It rates conservatively (mostly 1-5), which is fine for ranking. | Tested on a real day. |
| 2026-10-20 | Specific facts | The diary prompt asks for specific names (companies, sites, projects); vague facts ("looks at big jobs") can't be recalled later. | E4B test produced vague facts; 12B with the new prompt is specific. |
| 2026-10-20 | Limits | Up to 80 facts and 40 opinions; beyond that the least important, oldest go. Your notes are never trimmed in the file (the first 1,200 characters go into prompts). | Keeps prompts small and fast. |
| 2026-10-20 | Stray servers | Engine saves its process ids (`mind/engine.pids`) and stops leftovers from a crashed run on the next start. | A crash would otherwise leave ~11 GB in use. |

## Phase 3 questions

Asked 2026-10-20. Phase 2 marked done (Sushant: "improved a lot"). Proposal in PLAN.md, Phase 3.

1. How he sees: A text only (OCR), B vision model, C both (recommended).
2. When he looks: on window change + at most every 30 s while you stay (recommended).
3. Email and chat apps: not read by default, titles only (recommended)?
4. Nothing from the screen saved (recommended)?
5. Opt-in switch, off by default (recommended)?
6. Compare what he reads with Sushant's notes for smarter comments (recommended)?
7. Window titles for all apps with the same permission (recommended)?

Answers:

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-20 | 1. How he sees | **C: both** — OCR text every look, Gemma looks at the picture now and then. | Recommendation accepted. |
| 2026-10-20 | 2. When he looks | Recommendation accepted, **but with multiple screens in mind** (Sushant's feedback below). | |
| 2026-10-20 | 3. Email and chat apps | Not read by default, titles only. | Recommendation accepted. |
| 2026-10-20 | 4. Saving | Nothing from the screen saved. | Recommendation accepted. |
| 2026-10-20 | 5. Opt-in | "Let him read my screen" switch, off by default. | Recommendation accepted. |
| 2026-10-20 | 6. Notes | Compare what he reads with Sushant's notes. | Recommendation accepted. |
| 2026-10-20 | 7. Window titles | Titles of all apps with the same permission. | Recommendation accepted. |
| 2026-10-20 | Feedback: multiple screens | Sushant works on two screens (talking to an assistant on one, GitHub open on the other) and Togepi thought he was "looking at GitHub again". He should know where the cursor is, which window Sushant is in, and that several windows are in use; and screenshots must make sense with several screens. **Proposal in PLAN.md Phase 3 ("Multiple screens and attention"), waiting for Sushant's confirmation.** | Today he only knows the app with keyboard focus (and that browser's front tab), and his "on screen right now" only changes when that changes. |
| 2026-10-20 | Attention rule | **Accepted**: cursor moved in the last ~15 s → the window under the cursor; otherwise the focused window. He's told typing / cursor / also open. | Sushant agreed. |
| 2026-10-20 | Pictures | **Accepted**: one window per look, never a whole screen; alternating when the typing and cursor windows differ. | Sushant agreed. |
| 2026-10-20 | Follow you to the screen you're working on | **No.** He keeps roaming freely across screens and doesn't walk over to where you're working. | Sushant: it would disturb him, and Togepi would get stuck on one screen. |

**Phase 3 questions: all answered (2026-10-20).**

## Phase 3 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-20 | OCR without Swift | Apple Vision via an AppleScript-ObjC script run with `osascript` (like the existing JXA helpers). If it fails, he still gets a picture of the window for Gemma. | No compiler needed to build the app; a fallback if OCR misbehaves. |
| 2026-10-20 | Capture | `screencapture -l <window id>`: one window, whichever screen, even partly covered; file deleted right after. | Matches "one window per look". |
| 2026-10-20 | Timing | On settle, then at most every 30 s per window, at least 8 s between any looks; readings usable for 60 s. | Recommendation, light on the Mac. |
| 2026-10-20 | When he looks at the picture | When the text is under 200 characters, and every 4th look at the same window. | "Now and then, e.g. when there's little text." |
| 2026-10-20 | Email and chat | Not read unless listed in `screenAllow` (apps/sites) in settings.json. | Recommendation. |
| 2026-10-20 | Scrubbing | Email addresses, card/account numbers, SSNs, phone numbers, API keys and long tokens, and any line mentioning passwords, secrets, tokens, PINs or CVVs. | Built-in privacy. |

