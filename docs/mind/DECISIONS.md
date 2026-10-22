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
| 2026-10-20 | Vision test | Gemma 4 12B + its vision add-on, through llama-server, looking at a screenshot of an Amazon "Software Engineer II, Backend" posting with Sushant's notes ("I know Python, Java, React and AWS"): thought "Sushant looks at big Amazon job! He knows Python and Java! Toge!", lines "Big Amazon!", "Toge! Is it a fun job?". ~90 s on the dev container's CPU (a few seconds expected on the Mac's GPU). Found and fixed two bugs on the way: the chat template dropped the picture marker, and newer llama-servers use a random marker per run (now read from GET /props). | Verified. |

## Phase 4 questions

Asked 2026-10-20, while Sushant tests Phase 3. Proposal in PLAN.md, Phase 4.

1. Relationship grows daily by clear rules (familiarity, affection, trust), capped ±10 a week (recommended)?
2. Weekly reflection by Gemma for traits and values, clamped ±3 / ±1, needs 3+ diary days, also writes insights about Sushant (recommended)?
3. Sushant's slider changes always win; growth continues from there; lockable sliders (recommended)?
4. Long-term limit: at most ±15 from his starting value per trait (recommended)?
5. Growth history with reasons, and "undo this week" (recommended)?
6. He may say he feels different after a reflection (recommended)?
7. Resting mood from his personality (ALMA formula) (recommended)?
8. Evolution into Togetic at high friendship: Phase 4, Phase 5, or not at all?

Answers:

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-20 | 1. Relationship | **Yes:** grows daily by clear rules, at most ±10 a week per metric. | Sushant: "go with the recommendations". |
| 2026-10-20 | 2. Weekly reflection | **Yes:** Gemma, traits ±3, values ±1, needs 3+ diary days, also writes insights about Sushant. | Recommendation. |
| 2026-10-20 | 3. Your sliders | **Yes:** your changes always win, growth continues from there, any slider can be locked. | Recommendation. |
| 2026-10-20 | 4. Staying Togepi | **Yes:** at most ±15 from his starting value (or from where you last set it by hand). | Recommendation. |
| 2026-10-20 | 5. History and undo | **Yes:** growth.md and "How I've grown" in the Personality window, with "Undo this week". | Recommendation. |
| 2026-10-20 | 6. He notices | **Yes:** he may say he feels different, in his own words. | Recommendation. |
| 2026-10-20 | 7. Resting mood | **Yes:** from his personality (ALMA). | Recommendation. |
| 2026-10-20 | 8. Evolution | **Parked.** Not in Phase 4; don't build it until Sushant brings it up again. | Sushant: "park the evolution for now. I don't want to touch the evolution part just now, so let it be like that." |

**Phase 4 questions: all answered (2026-10-20).**

## Phase 4 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-20 | Relationship rules | Per day, each with a daily cap: petting affection +0.6 (max +3); a game finished, won, lost or drawn, or a fetched ball +0.3 to +0.7 (max +2 to +3); being thrown affection −0.7 (max −4) and trust −0.5 (max −3); getting angry trust −1 (max −2); an unanswered invitation affection −0.4; coming back after a break trust +0.5 (max +1.5); water/stretch/bedtime done trust +0.3 each (max +1); a reminder ignored trust −0.2 (max −1); his lines clicked or petted affection +0.3 each (max +1.5), ignored −0.1 each (max −1); familiarity +1 for a day with him around (10+ events). Counted for finished days only, whole points go into personality.md, the rest carries over. | Predictable and explainable (proposal point 1); tuned so a good day is about +3 and a week can't exceed the agreed ±10. |
| 2026-10-20 | When he reflects | Sunday from 18:00 while you've been away 10+ minutes; if a Sunday is missed, the next time he runs 8+ days after the last one. A week with too little diary is skipped, not retried. | "Sunday evening when you're away, or the next time he runs." |
| 2026-10-20 | Reflection limits | At most 6 changes; the model may only name trait and value sliders (not the relationship); code clamps every step and the ±15 limit; locked sliders are skipped. Up to 3 insights go into his facts (importance 7); emails and links are dropped. | Agreed limits, enforced in code rather than trusted to the model. |
| 2026-10-20 | Baseline for ±15 | Togepi's starting value, or the value you last set by hand (stored in growth.json). Reset to Togepi clears them. | "Growth continues from where you put them." |
| 2026-10-20 | Undo | Undoing a week takes back its trait/value changes and its relationship points; he notices like any slider change. | Proposal point 5. |
| 2026-10-20 | He notices | The reflection happens while you're away; he thinks about it when you're back (his own decision whether to say anything). Lock changes are silent. | Proposal point 6, without talking to an empty room. |
| 2026-10-20 | Resting mood | ALMA pleasure (0.21·E + 0.59·A + 0.19·(1−N), from the Big Five) relative to Togepi's own, so his mood is unchanged until he grows: shifts the mood he settles at by up to ±0.4. Positive emotions sets how fast his mood moves (×0.6 to ×1.5). | Proposal point 7; relative so Togepi as designed feels exactly as before. |
| 2026-10-20 | Real-model check | A simulated week (job applications, an interview with Stripe, fetch and tic-tac-toe, a day of being thrown and ignored reminders) through Gemma 4 12B, twice. Run 1: Anxiety 25→23 "Sushant's Stripe smile made me feel safe!", Self-discipline 20→21 "Watching him study Rust is very brave.", Security: personal 60→61; insights "Sushant gets very scared before Stripe interviews.", "Sushant likes learning hard things like Rust.". Run 2: Anxiety −2 again, Warmth 90→91 "More happy pettings made my heart big!", Security: personal +1; insights "Sushant works very hard until he is sleepy.", "Sushant likes playing games with me on Saturdays.". Small, consistent, in his voice; no clamping needed. 2-4 min each on the dev container's CPU (much faster on the Mac's GPU, and it runs while you're away). | Verified. |

## Phase 5 questions

Asked 2026-10-20, while Sushant tests Phases 3 and 4. Proposal in PLAN.md, Phase 5.

1. "Try it now" menu items: diary now, relationship now, reflect now; a hand-started reflection counts as that week's (recommended)?
2. Stop the models when away 30+ min, at night while he sleeps, and on battery below 20%; restart when you're back (recommended)? Different thresholds?
3. Style bank of example lines (hand-written set + lines you clicked or petted) instead of fine-tuning (recommended)?
4. No bigger model; measure speed and memory on the Mac and show them; optional "Lighter mind" switch with Gemma 4 E4B (recommended)?
5. *Copy a report* for diagnostics, with nothing private in it (recommended)?
6. A first-run welcome window that walks through the permissions: yes or no?
7. A Chattiness choice and *Shush for an hour*: yes or no?
8. Anything else that bothers you while using him, to fix in this phase?

Answers:

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-21 | 1. Try it now | **Yes**, in the main menu: diary now, relationship now, reflect now; a hand-started reflection counts as that week's. | Sushant: "I would love to have that right now in the main menu, but I'm not going to use that. I want it to take time." |
| 2026-10-21 | 2. Lighter on memory and battery | **Yes**: rest after **15 min** away (not 30), changeable in the menu; at night while he sleeps; on battery below 20%. Diary and reflection finish first; they start again when you're back. | Sushant: "very important"; "instead of 30 plus, make it 15 plus minutes… give some kind of an option in the settings". |
| 2026-10-21 | 3. Style bank | **Not now.** Not opposed, but his style is fine as it is. | Sushant: "right now it is working as fine… I'm right now not interested". |
| 2026-10-21 | 4. Bigger model | **No.** Speed and memory are measured and shown instead; no "Lighter mind" switch (not asked for). | Sushant agreed. |
| 2026-10-21 | 5. Copy a report | **Yes.** | Sushant: "that is very helpful". |
| 2026-10-21 | 6. First-run welcome | **Yes**, and whenever something changes the welcome covers it (a What's new page after an update). | Sushant: "make sure that you make a note that whenever some changes have been made, that first run welcome window covers that." |
| 2026-10-21 | 7. Chattiness / Shush | **No.** | Sushant: "No, I don't think so." |
| 2026-10-21 | 8. Fixes | **None needed.** | Sushant: "right now, it's all going good." |

**Phase 5 questions: all answered (2026-10-21).**

## Phase 5 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-21 | Rest settings | `restAfterAway` (minutes, 0 = never; menu Mind → Rest the models after I'm away: 5 / 15 / 30 / 60 / Never) and `restBattery` (%, 0 = never; settings.json only) in settings.json. Night = 22:00-06:00, as in the brain view. On battery they come back at 25% (or when plugged in) so they don't flap around 20%. | Sushant asked for an option; battery wasn't asked to be adjustable, so it's only in the file. |
| 2026-10-21 | Work before resting | If a diary or the weekly reflection is due while you're away or he sleeps, the models stay up (or start) to do it, then rest. Not on low battery: missed diary days are written later anyway. A diary that just failed isn't retried for an hour, so the models can rest. | "When you're away, the diary and reflection finish first." |
| 2026-10-21 | Try it now while resting | Keeps the models awake for 10 minutes (whatever the reason), then the usual rules apply a minute after it's done. Results show in a small message. "Count today" counts today so far; the rest of the day is counted when it's over, without counting anything twice. | So it always works when you want it. |
| 2026-10-21 | Reflection timing | Now by week: due Sunday evening unless that week's is done (by hand or skipped); caught up when last week's was missed. A hand-started reflection with too little diary isn't recorded as a skipped week. | Needed so a hand-started reflection counts as that week's. |
| 2026-10-21 | Report contents | Versions, model files and status, memory used, resting, speed, last thought/diary/growth outcome (not their text), counts of memories, permissions, switches and numbers from settings (list sizes only), current hour/away/battery and error messages (scrubbed, 160 characters). Never: app names or titles he saw, screen text, what he said or thought, memories, notes, your lists. | "Nothing private" with enough to diagnose. |
| 2026-10-21 | Welcome versions | `WELCOME_VERSION` = phase number (5 now) in `src/main/welcome.js`, with a What's new entry per version (a test checks every version has one). First run (or an install from before Phase 5) shows the full welcome; an update shows only what's new since the version you last saw; *Welcome and what's new…* in the menu opens it any time. | The rule for future changes (also in PLAN.md and CLAUDE.md). |

## Phase 5 feedback (Sushant tried it on his Mac, 2026-10-21)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-21 | Crash: "Cannot read properties of undefined (reading 'floor')" in `hopHeight` | Fixed. A screen was unplugged or moved while he walked towards a hop onto it; the planned hop still pointed at the old screen. Now a layout change forgets planned routes and hops, a crossing to a screen that's gone is skipped, and an error in one frame no longer shows a dialog: he drops his plan, lands on the floor and the error appears in the brain view and the report. | Bug (seen on the previous version). |
| 2026-10-21 | Screen Recording "denied" although switched on | Cause: the app is signed ad hoc, so macOS treats every rebuild as a new app and the switch in System Settings belongs to the old build. For now: remove Togepi from the list with −, reopen him and allow it again. His note now says this. Open question for Sushant: sign builds with a local certificate made once on his Mac, so permissions survive rebuilds (needs his password once). | Report showed "Screen Recording: denied". |
| 2026-10-21 | Sign builds with a local certificate so permissions survive rebuilds | **Not now, noted for the future.** Until then, after a rebuild: remove Togepi from Screen & System Audio Recording with −, reopen him and allow it again. | Sushant: "lets not do the certificate part yet, but note for future thing." |
| 2026-10-21 | Skip thinking / screen reading (or stop the models) during daytime naps | **No.** Keep it as it is: models stop only at night while he sleeps; during a daytime nap they stay loaded and he still thinks about what you do (silently). | Sushant: "No, lets not do this." |
| 2026-10-21 | Brain view time showed 22:00 at 22:15 | Fixed: it only ever showed the hour followed by ":00"; it now shows hours and minutes. | Display bug. |

## Where it's going (2026-10-21)

Sushant's ideas for after Phase 5, summarised in PLAN.md (*Where it's going*).

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-21 | Order of the next phases | 1 questions with two answers, 2 chat window, 3 plug-in characters, 4 several characters, 5 iPhone. | Proposed by dependency (packs before iPhone and several characters); Sushant went ahead with #1. |
| 2026-10-21 | iPhone without internet | Possible only partly: direct Wi-Fi/Bluetooth after pairing; no overlay over other apps (Dynamic Island / Live Activity instead); no app/screen/notification watching; Health/Fitness possible. To be planned as its own phase. | iOS limits, explained to Sushant. |
| 2026-10-21 | Extra suggestions (offline lock, export/import of his mind, signing certificate, talking out loud) | Not decided yet. | To ask when the matching phase comes up. |

## Phase 6 questions

Asked 2026-10-21. Proposal in PLAN.md, Phase 6.

1. How often should he ask?
2. What should he ask about?
3. What should the answers look like?
4. How should it look (bubble with buttons, or a sign)?
5. How long should he wait for an answer?
6. What happens after you pick?
7. A setting (Often / Sometimes / Rarely / Never)?
8. Anything off limits?
- A. Loosen the rules in his instructions that make his lines repetitive?
- B. Which answers become memories, now that the model invents the questions?

Answers:

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-21 | 1. How often | **The model decides** each time he thinks whether to say something, ask, or stay quiet. No frequency rule. (The usual rails still apply: not in meetings, not while away, a gap after speaking.) | Sushant: "Instead of putting it like a condition, I think it should be decided." |
| 2026-10-21 | 2. What about | **Anything; the model invents the question and the two answers.** No topics, no examples, no patterns in the prompt; only that the answers must not be yes or no. | Sushant: "Don't put any patterns… Let the model decide what kind of question and what kind of options should be." |
| 2026-10-21 | 3. Answers | Two short answers written fresh each time (1-3 words with an emoji), never yes/no; no third "skip" button, ignoring is skipping. | Agreed. |
| 2026-10-21 | 4. Look | His speech bubble with two clickable buttons. | Agreed (a). |
| 2026-10-21 | 5. Waiting | 30 s, then he shrugs and the question goes away. Two ignored in a row: no questions for an hour. | Agreed. |
| 2026-10-21 | 6. After you pick | He reacts right away (a nod, then his own line and action); answering counts a little like a pat; ignoring costs nothing. Answers about you are saved as memories (see B). | Agreed. |
| 2026-10-21 | 7. Setting | **No setting.** | Sushant: "No, there should not be any setting." |
| 2026-10-21 | 8. Off limits | **Only what's on the privacy blocklist** (no extra topics like health or money). | Sushant: "anything which is there on the privacy block list, there should be off limit for the questions asking as well." |
| 2026-10-21 | A. His instructions | Remove the example topics ("job hunting, coding, emails, videos, games") and every other example list; "name the actual thing" becomes "When it feels relevant, try to name the actual thing." (no examples, no pattern); remove the "Sometimes add a Togepi sound like 'Toge!' or 'Priii!'" line (sounds are his own choice); keep at most 8 words, one sentence (lines may now be 60 characters so 8 words fit; 50 was cutting him to about 5). | Sushant: "Let it do based on the data it receives… don't tell him that. Let him come up with that on its own." |
| 2026-10-21 | B. Remembering answers | **Option 1:** when he asks, the model also says whether the answer tells him something about Sushant; if so the answer is saved as a memory straight away (Mind → Memories). | Sushant chose option 1. |

**Phase 6 questions: all answered (2026-10-21).**

## Phase 6 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-21 | How the model decides | The answer schema gets an optional `question` ({ text, answers ×2, aboutSushant }); the model writes it only if it wants to ask, otherwise its answer is as before. It's only offered when he may ask (not during the hour-long pause). Asking still needs his urge to clear the usual bar. | "Decided by the model", not a rule. |
| 2026-10-21 | Checks on a question | Same checks as his lines (one sentence, 8 words, nothing about being an AI, no repeats); two different answers of up to 18 characters, neither just yes/no/sure/ok/maybe; nothing naming an app, site or word on your blocklist (then he says a line instead). | Agreed rules, enforced in code. |
| 2026-10-21 | While a question is up | He stands still and says nothing else until you answer or 30 s pass; petting him doesn't count as an answer; a press on the bubble is only a click (no pick-up). | So the buttons don't walk away and his bubble isn't replaced. |
| 2026-10-21 | Memory text | `Sushant picked "<answer>" when asked "<question>"` (importance 6). | Plain, and the diary and recall can use it. |
| 2026-10-21 | Relationship | An answer adds what a pat adds (affection 0.6, same daily cap of 3); an ignored question adds nothing and doesn't make him quieter. | "Counts a little like a pat; ignoring costs nothing." |
| 2026-10-21 | Real-model check (Gemma 4 12B, 12 situations) | He asked in 8 of 12 (ramen search: "Is it tasty?" So yummy! 🍜 / Too spicy! 🔥; Netflix: "Fun movie?" Action! 💥 / Funny! 😂); never yes/no. But every question was marked as about Sushant, and on a LinkedIn job page he didn't name the job. | Checked before merging. |
| 2026-10-21 | How often (after the check) | **Keep it: the model decides**, even if he asks a lot. | Sushant: "I'm okay with him asking questions a lot, so let's keep it the model decides." |
| 2026-10-21 | Which answers become memories | The prompt now says "aboutSushant": true **only if his answer tells you something lasting about him, worth remembering**. | Sushant: "If it is something which is lasting about me, worth remembering, then only." |
| 2026-10-21 | Naming things | Back to **"Try to name the actual thing."** (without "when it feels relevant"; still no examples). | Sushant: "go ahead and try to name the actual thing". |

## Phase 7 questions (watching together)

Sushant's idea, 2026-10-21: when he watches something, Togepi says something about it, goes to that screen's bottom-right corner, turns around and sits watching until he stops. Asked:

1. What counts as watching (and YouTube)?
2. When does he go, and when does he come back?
3. What does he say when it starts?
4. While you watch (quiet? reminders?)
5. In full screen?
6. When you stop?

Answers:

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-21 | 1. What counts | **Playback pages only**, by address: Netflix, YouTube, Prime Video, Disney+, Hulu, Max, Apple TV, Crunchyroll; plus VLC, IINA, QuickTime and TV. Browsing doesn't count. **YouTube only once he's stayed on it a while** (2 minutes). | Sushant: "yes, the solution is right. And for YouTube, only once I have stayed on for a while." |
| 2026-10-21 | 2. Timing | Goes after **30 s** on it; comes back after **1 min** somewhere else. A paused video can't be seen, so pausing doesn't end it. | Agreed. |
| 2026-10-21 | 3. What he says | **The model decides what to say**, after a fresh look at the window **with a picture** (needs *Let him read my screen*; otherwise the tab title). | Sushant: "let the model decide what to say, but just trigger the part where it captures an image and go to the model." |
| 2026-10-21 | 4. While watching | **Quiet: no lines, no chirps.** **Water and stretch reminders wait until it's over.** | Sushant: "make him quiet, let him not chirp or any reaction… hold them until we stop." |
| 2026-10-21 | 5. Full screen | **He sits in the corner in full screen too.** | Sushant: "I don't mind." |
| 2026-10-21 | 6. When you stop | He gets up and goes back to wandering; **he decides himself** whether to say something. | Agreed. |

**Phase 7 questions: all answered (2026-10-21).**

## Phase 7 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-21 | YouTube "a while" | 2 minutes on YouTube watch pages (other sites 30 s). Shorts don't count. | "Only once I have stayed on for a while." |
| 2026-10-21 | Being away during a movie | While watching, no mouse or keyboard for up to **3 hours** doesn't count as away (locking the screen or sleep still does). Otherwise after 3 minutes he'd think you left, greet you "back", and the models would rest after 15 minutes. | Needed for watching to work at all. |
| 2026-10-21 | Eye breaks and others | Eye breaks wait too (like water and stretch). Your own notes, bedtime and meeting reminders still come. | Eye breaks are the same kind of screen-break nudge; the others are time-critical. |
| 2026-10-21 | "No reaction" | No lines, no questions, no chirps and no cursor reactions while watching; petting still shows hearts (no sound), then he goes back to his spot. He doesn't think on his own meanwhile (saves the models' work). | "Make him quiet." |
| 2026-10-21 | His first line | Always said (even if his urge is low), never a question; still not in a meeting. Logged in his day as "You sat down to watch … with Sushant", so the diary can mention it. | "Tell me, oh, we are watching this today." |
| 2026-10-21 | Privacy | Private windows and anything on the blocklist never count as watching (he doesn't notice them). The report only says "watching something together", not what. | Same rules as everything else he sees. |
| 2026-10-21 | Real-model check of his first line (Gemma 4 12B) | Asked only to "watch quietly", his lines were vague ("Movie time!"). His trigger now says "Tell him in your own words what you two are watching today": Netflix (title unknown) → "Movie time with Sushant!"; YouTube lofi → "Cozy music for us, Sushant!"; Netflix after reading "Stranger Things" on screen → "Scary monsters today?". He refers to what's on, but the small model rarely says the exact name. | Sushant: "tell me, oh, we are watching this today". |

## Phase 6 and 7 feedback (Sushant tried them on his Mac, 2026-10-22)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-22 | Too many questions when he answers | Cause: answering wakes him to react, and the reaction could be another question. Now (no numbers): **his reaction to your answer is never a question**, and **one question per thing you're doing**: after asking, not again until you've moved on to a new window, page or video (with app watching off: something new you do with him, not answering). The model still decides whether to ask. | Sushant: "the questions are really fun but it becomes annoying… without making it specific to any number restricting too many questions would be better". Chose 1 and 2. |
| 2026-10-22 | Watching didn't start on Hotstar | Cause: Hotstar wasn't on the list. **Option b**: Hotstar/JioHotstar, Peacock, Paramount+, SonyLIV, ZEE5 and Twitch added, and any page not on the list is judged by the decision model ("Is Sushant watching a movie, a TV series, a show, a video or a live stream in this window right now?", yes at ≥ 0.6) from its title and address, once per page. Test pages: 11/11 right (Hotstar 0.98, Tubi 0.97, ESPN live 0.95; Google search 0.01, LinkedIn job 0.00, Grey's Anatomy on Wikipedia 0.28, Netflix home 0.08). | Sushant chose option b. |
| 2026-10-22 | Watching didn't start on YouTube | The whole chain works here with a Netflix tab (in the app, end to end), so the most likely cause is a browser that doesn't tell Togepi the tab's address (only Chrome, Arc, Brave, Edge and Safari do; Firefox can't). Now YouTube is also recognised by its title, other tabs without an address go to the decision model, a quick look elsewhere (under 15 s) doesn't reset the wait, and the brain view has a **Watching check** row saying why it is or isn't on (e.g. "YouTube for 60 s (he joins at 120 s)"). | So it works in any browser, and the reason is visible if it doesn't. |
| 2026-10-22 | Watching timers | **Both 30 s**: he joins after 30 s on a video (YouTube too, instead of 2 min) and gets up 30 s after you've left it (instead of 1 min). Supersedes the Phase 7 timing. | Sushant: "It worked for youtube… lets keep both as 30 sec." To ship with the next changes. |

## Phase 8 questions (chat window)

Asked 2026-10-22.

1. How to open it?
2. How does he write?
3. What does he know?
4. Memory: where do chats go, how long does the window keep them?
5. His reply in his speech bubble too?
6. Who starts a chat?
7. Does chatting count for the relationship?
8. While he's thinking?

Answers:

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-22 | 1. Opening | *Chat with Togepi…* in his menu, and double-clicking him (a single click is still a pat). | Agreed. |
| 2026-10-22 | 2. How he writes | Baby talk, one to three short sentences per reply. | Agreed. |
| 2026-10-22 | 3. What he knows | His personality, memories, your notes and what you're doing now, same privacy rules. | Agreed. |
| 2026-10-22 | 4. Memory | The chat goes into his day and the diary keeps what matters; the window shows today's chat and starts fresh the next day. | Agreed. |
| 2026-10-22 | 5. Bubble | His reply also in his speech bubble with a chirp; only in the window in meetings and while watching together. | Agreed. |
| 2026-10-22 | 6. Who starts | Only you, by opening it. | Agreed. |
| 2026-10-22 | 7. Relationship | Counts like a pat, once per conversation. | Agreed. |
| 2026-10-22 | 8. Thinking | "Togepi is thinking…" while he writes (about 5-10 s on the Mac). | Agreed. |
| 2026-10-22 | Addition: your own answer to his questions | A ✏️ button next to his two answers opens the chat with his question; what you write is your answer. He reacts to it in the chat (and his bubble), it counts like a clicked answer, it's remembered if it's about you, and your last few written answers are shown to him when he writes new answer choices, so he offers answers you'd really pick. | Sushant: "if I wish to reply but not from those 2 choices there must be some click option where I can type my answer which then it should use to learn the right phrasing of options." |

**Phase 8 questions: all answered (2026-10-22).**

## Phase 8 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-22 | A conversation | Messages less than 10 minutes apart; the first message of each counts like a pat. | "Once per conversation." |
| 2026-10-22 | Context of a reply | The last 16 messages of today's chat as the conversation, plus how he feels, the windows you're using, memories that fit your message and your notes. | So he follows the conversation. |
| 2026-10-22 | Resting models | Sending a message wakes them (like Try it now, 10 minutes); the window says "Waking up his mind…". | You're there and want an answer. |
| 2026-10-22 | Learning from your answers | The last 20 written answers are kept (`own-answers.json`); the last 3 go into his prompt when he may ask, as what you wrote when neither answer fit. They are your answers, not examples written by us. | Sushant's addition; consistent with "no patterns from us". |
| 2026-10-22 | ✏️ and the question | While the chat is open for your answer the question stays up (up to 10 minutes); closing the window without answering gives it the usual 30 s again. | So it doesn't disappear while you type. |
| 2026-10-22 | Real-model check (Gemma 4 12B, through the real mind code) | "hey Togepi, how are you?" → "Togepi happy! I feel all sparkly and bubbly today! What are we doing, Sushant?"; "I have an interview with Google tomorrow, I'm nervous" → "Oh no! Don't be scared, Sushant! You are super-duper smart and you can do it!"; "what should I eat for dinner?" → "Ramen! Ramen is yummy-yum! It will make your tummy happy for the big Google quest!" (remembers the conversation and that you love ramen); own answer "neither, I need to study tonight" → "Study? So many big words on the screen! Togepi hop!". About 40 s each on the dev container's CPU. *Stage directions* like "\*wiggles\*" are removed from replies (his body acts things out). | Checked before merging. |

## Phase 8 feedback (2026-10-22)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-22 | Chat replies too childish / fantasy-like: personality or instructions? | Both, but mostly fixed instructions in the code. **Removed every fixed tone instruction**: "a baby Pokémon" (his first line, line picking, diary scoring), "You talk like a baby", "Simple, cute baby words" (bubbles and chat), "in your own baby voice" (diary). His voice now comes only from his personality: "Who I am", the sliders and the relationship (all sent with every call, read fresh from personality.md). **Kept** (format and safety, not tone): 8 words for bubbles, 1-3 sentences in chat, never mention being an AI, don't repeat himself, he may stay quiet, act like his personality. | Sushant: "there should be no instructions, just driven by personality… it should come from its personality and not fixed instruction." |
| 2026-10-22 | Real-model check without the tone instructions (Gemma 4 12B) | Togepi's own personality: "how are you?" → "Togepi is so happy right now! I'm ready for a big adventure, let's go find something exciting together!"; Google interview → "Togepi feels your jitters! Don't be scared, you're going to be super-duper amazing! Let's do a happy dance to make your heart feel light!"; LinkedIn job lines: "Is this a new adventure?", "Amazon sounds like a big world!", "You can do it, Sushant!". Full sentences, no baby words, still cheerful and adventurous (his sliders). Same chat with calmer sliders (Fantasy 20, Ideas 85, cheerfulness 55, Deliberation 75…): "Togepi is here for you! You are going to be amazing because you work so hard on those scary coding puzzles!" (more grounded, still warm: "Who I am" and Warmth 90 stay). | Checked before merging. |

## Memory and speed (2026-10-22)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-22 | Send all diary lines, facts and opinions in every message? | **No** (4,096-token window; facts ~1,200 tokens at their cap of 80, opinions ~600 at 40, the diary ~22,000 a year; longer prompts are slower, use more memory and make a small model worse). Instead, all four suggestions: (1) a **core** of the 12 most important facts in message 1, refreshed after each diary and when you forget something, not repeated in the recall; (2) still 5 best-matching memories per thought; (3) a **weekly summary** of the diary on Sunday with the reflection, recalled like a fact; (4) **`--swa-full`** so the unchanged start of his prompt is reused. | Sushant: "Go ahead and do it first… implement all this." |
| 2026-10-22 | `--swa-full` memory | Turned on. Measured here: the whole fixed start of his prompt (487 tokens) is reused instead of 215, prompt time 24 s → 11 s on the dev container's CPU. Its extra memory couldn't be measured reliably here (expected a few hundred MB at 4,096 tokens); the brain view and *Copy a report* show his models' memory on the Mac. | Sushant agreed to measure on the Mac. |
| 2026-10-22 | Real-model check of the weekly summary (Gemma 4 12B) | A test week (chat code, Amazon and Stripe applications, LeetCode, tic-tac-toe, the Google interview, Grey's Anatomy together). First wording missed the big events ("Sushant worked hard on my code! I won at tic-tac-toe, yay!…"); now told to mention the most important real things, like the diary: "Sushant did big jobs at Amazon and Stripe! We played tic-tac-toe and I won! I loved the many head pats. My heart is full of joy!" / "Sushant worked on my chat code! We played tic-tac-toe and I won. He had a big Google interview. I feel so happy and full of joy!". With `--swa-full` the second run took 10 s instead of 44 s (his unchanged instructions reused). | Checked before merging. |

