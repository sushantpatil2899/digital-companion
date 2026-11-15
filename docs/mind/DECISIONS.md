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
| 2026-10-22 | Watching timers | `superseded (2026-10-25: both 5 s)` **Both 30 s**: he joins after 30 s on a video (YouTube too, instead of 2 min) and gets up 30 s after you've left it (instead of 1 min). Supersedes the Phase 7 timing. | Sushant: "It worked for youtube… lets keep both as 30 sec." To ship with the next changes. |

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


## Phase 9 questions (characters)

Asked 2026-10-23 and 2026-10-24. The three new characters (Mori, Pip,
Nomi) were designed by Sushant with another assistant; their concept sheet
is the starting point (looks, "Who I am", traits, voice, activities, shared
behaviours, games, watching together). Summary in PLAN.md, Phase 9.

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-23 | Who makes characters | **Only we do.** A character is drawing code inside the app; no character packs installed by users and no code from anyone else. Supersedes the "standard character pack, anyone can make one" idea in *Where it's going*. | Sushant. |
| 2026-10-23 | Poses and activities | **Every character has all the basic poses** (idle, walk, run, sit, sleep, happy, sad, angry, shy, curious, wave, jump, picked up and swinging, falling and landing, hug, nod, confused, back view). **Activities belong to each character**, and the menu changes with the character. | Sushant. |
| 2026-10-23 | Your name | **A setting**, no longer "Sushant" in the code. | Sushant. |
| 2026-10-24 | Questionnaire | **Only "What should I call you?"** No other questions and no attached files: he learns about you over time (diary, your answers, chats, what he notices). "Notes about you" in Memories stays, optional. | Sushant: "Let the character learn bits about the user over the time." |
| 2026-10-23 | App name | **Companion** for now; a nicer name later. | Sushant. |
| 2026-10-23 | One or several at once | One character at a time in this phase; several on screen is the next phase. | Agreed. |
| 2026-10-24 | Togepi (Nintendo's character) | **Stays as one of the characters**, next to Mori, Pip and Nomi. Revisit if the app is ever shared or published. | Sushant: "the repo is private and I am not sharing it with anyone for now." |
| 2026-10-24 | Repository and branch | Work moves to the private repo **`sushantpatil2899/dcapp`** (a fresh copy of the old repo, one commit, branch `main`). We work on our own branch **`characters`** and **never merge into `main`** (or open a PR into it) unless Sushant says so; others work on `main` in parallel. Supersedes working agreement 5's PR-and-merge step. | Sushant. |
| 2026-10-24 | 1. Order | **First the character system with Togepi moved into it unchanged**; Sushant tests it on his Mac for differences. Then **Pip**, then Mori and Nomi, one at a time. | Sushant agreed. |
| 2026-10-24 | 2. Approving looks | For each character: front and back first (screenshots), then all poses on one sheet, then the activities; each approved by Sushant before the next. Drawn in code with simple shapes like Togepi, so flatter than the concept pictures; free to improve on the pictures where needed. | Sushant: "you have some liberty towards the look of it… verify each look with me for each character." |
| 2026-10-24 | 3. Sizes | Different sizes per character are fine (Mori ~160 px, Nomi ~180 px, Pip ~200 px), **as long as none is much bigger than Togepi**. | Sushant. |
| 2026-10-24 | 4. How each talks | No tone instructions (Phase 8 feedback still holds). Each character's traits become its slider values, and its "Who I am" is used as written **plus one sentence about its humour** (e.g. Mori: "My humour is dry and gentle"). Sliders shown to Sushant for approval. | Sushant agreed to the humour sentence. |
| 2026-10-24 | 5. Chirps | Each has its own synthesized sound: Mori a soft low "mm…", Pip a clicky "pip!" / "brrrp?", Nomi an airy "mmm…" with reverb. Sounds, not words. | Agreed. |
| 2026-10-24 | 6. Needs | **The same four needs for everyone** (hunger, energy, boredom, affection), each satisfied its own way. Hunger: Togepi apple, Mori tea, Pip "battery" (winding itself), Nomi catching stars. Boredom: Togepi ball and adventure; Mori leaves, mushrooms, skipping stones, planting a seed; Pip puzzle cube, investigating, newspaper, building; Nomi dream bubbles, painting a rainbow, reading a book. **Only at night**: Mori's fireflies, Nomi's moon watching. **Pip's conducting only while you play music** (Spotify, Apple Music, YouTube Music or another music app). | Agreed. |
| 2026-10-24 | 7. Activities | **All six per character.** The menu has an **Activities** submenu whose items change with the character. | Sushant. |
| 2026-10-24 | 8. Movement | Nomi floats (float, bob, drift, settle) instead of walking; when thrown it drifts off the screen and slowly comes back. Pip walks and hops, and flies only for a short happy "victory flight". Mori walks slowly. | Agreed. |
| 2026-10-24 | 9. Thrown around | Togepi angry after 3 throws (as now); Mori dizzy, slow blink, walks away, after repeated throws a little "please don't" sign; Pip checks itself and says "That was unnecessary."; Nomi briefly stormy, forgives quickly. All lower the relationship a little. | Agreed. |
| 2026-10-24 | 10. Lonely | **New for all four, Togepi too**: walks (or floats) to the window you're using, looks up, and sits beside it if ignored. | Agreed. |
| 2026-10-24 | 11. Mood on the body | Mori: flowers on its moss when happy. Pip: key and tail spin when happy. Nomi: brighter with stars when happy, a small rain cloud when sad, a rainbow once you pay attention. | Agreed. |
| 2026-10-24 | 12. Watching together | **Option (b), for all characters including Togepi**: while you watch, he glances at the screen now and then and reacts to what's on (each character in its own way: e.g. leaning in, hiding at scary scenes, ears drooping at sad ones, Pip's rating card). Each character also watches in its own way (Mori with its mug, Pip the critic, Nomi slightly see-through). Details still to settle (how often, whether he may speak). | Sushant: "let's go with B… integrate that with Togepi as well". |
| 2026-10-24 | 13. Games | As in the concept sheet: tic-tac-toe leaves vs mushrooms / gears vs bolts / stars vs moons, fetch with a pinecone / gear / dream bubble; their win and loss reactions too. Togepi unchanged. | Agreed. |
| 2026-10-24 | 14. Choosing a character | First run: "What should I call you?", then "Pick your companion". Switch later from the menu; **each character has its own mind** (diary, memories, growth). **The picker shows only the looks; hovering one opens a card with a simple animation.** | Sushant. |
| 2026-10-24 | 15. Fixed lines | Nudges, floating reaction texts and each character's welcome text are written in each character's voice; drafted by us, reviewed by Sushant. | Agreed. |
| 2026-10-24 | Step 1 contents | Character system with Togepi moved in unchanged, the *Activities* submenu, **your name as a setting** (first run asks "What should I call you?"; on Sushant's Mac it starts as "Sushant"), and the app renamed to **Companion** (his mind moves over; macOS asks for permissions once more). The picker comes with Pip. | Sushant agreed. |
| 2026-10-24 | Order of shared additions | Step 1 doesn't change how Togepi behaves (a clean comparison); step 1b adds the lonely walk to your window and watching (b) for Togepi; then Pip. | Sushant agreed. |
| 2026-10-24 | Watching (b): reactions and diary | **Body only** (no words, no chirps) while you watch. What he saw is **saved as text** in his day for the diary; **screenshots are never saved**. How often he glances: every ~2 minutes (proposed). On battery: open (proposed: same rule as his models, none below 20%). | Sushant: "just extract the text, save it, don't save the screenshot". |
| 2026-10-24 | Music (Pip's conducting) | Like watching: known music apps (Spotify and Apple Music say whether they're playing) and music sites by tab address or title (YouTube Music…); anything else judged by the decision model from title and address. No screenshots (they'd add little and cost more). | Sushant: "whatever you decide makes sense". |
| 2026-10-24 | Picker hover | Hovering a character makes it hop and wave, and a card slides up with its name, one-line concept and "Who I am"; click to pick. | Sushant agreed. |

## Phase 9 step 1 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Where characters live | `src/characters/<id>/` with `index.js` (main process: personality, activities as data, lines), `look.js` and `voice.js` (renderer, registering `window.Characters.<id>`) and `lines.js` (both). Everything else stays shared. | Only we make characters, as code (decision above); one folder per character keeps them apart. |
| 2026-10-24 | Activities as data | Each activity: menu label, words for his mind, brain-view label, `stay` (duration) or `move` (distance, speed), effects on needs, effort, `energetic`, `whilePaused`, appeal from needs, changes by mood band. His brain inserts them where Togepi's were, so his choices (and random draws) are the same as before. | Togepi unchanged; Pip, Mori and Nomi bring their own. |
| 2026-10-24 | Data folders | `Companion/settings.json` shared; `Companion/characters/<id>/` holds `brain.json`, `mind/` and `sounds/` (each character its own mind). Togepi's data is copied (not moved) on Companion's first start; the old model process ids aren't copied. | The old folder stays as a backup; one move instead of two. |
| 2026-10-24 | Your name before you've given it | "Friend" in prompts until you answer; the welcome window asks again whenever it's empty. A migrated install starts as "Sushant". | The old app only knew Sushant. |
| 2026-10-24 | Pronouns in prompts | ~~Unchanged for now~~ Superseded below: asked in the welcome window. | |
| 2026-10-24 | Schema key `aboutSushant` | Renamed `aboutUser` (the only change to any prompt). | A key with one person's name in it. |
| 2026-10-24 | Window titles | The character's name in window titles and text (Chat with Togepi, Togepi's memories…); "Companion" where macOS shows the app (permission messages, report). | Ready for other characters. |

## Phase 9 step 1 follow-ups (2026-10-24)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Watching (b) on battery | **Yes, he glances on battery too**, and stops below 20% (the same rule as his models resting). | Sushant chose the first option. |
| 2026-10-24 | How he refers to you | **A second question in the welcome window**, under "What should I call you?": he/him, she/her or they/them (plain choices, nothing fancy). Every prompt uses your pronouns. A migrated install starts with he/him; until you answer, they/them. | Sushant: "asking the addressing pronoun and give an option, he, his, she, her, and they, them. No fancy thing." |

## Phase 9 step 1b questions (lonely walk, watching with glances)

Asked and agreed 2026-10-24 (Sushant: "I agree with all of them, go ahead").

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | 1. Which window | The one you're working in (where you type, or under your cursor when you only use the mouse). Without *Notice which app I'm using*: under your cursor, as before. | Agreed. |
| 2026-10-24 | 2. Where he goes | Along the bottom of that window's screen to just below it, then looks up at it; a window filling the screen: its bottom middle. | He can't climb windows. |
| 2026-10-24 | 3. Ignored | After about a minute of looking up he sits down there for a while, quietly, facing your window. Any attention ends it (happy). The longer waits after each ignored ask stay. | Agreed. |
| 2026-10-24 | 4. How often he glances | Every 2 minutes while you watch: a picture of that window for his vision model. Needs *Let him read my screen*; without it he just sits and watches. | Agreed. |
| 2026-10-24 | 5. What the model decides | A short description of the scene and one mood from: exciting, funny, sad, scary, beautiful, boring, calm. | Agreed. |
| 2026-10-24 | 6. Togepi's reactions | A few seconds, body only (no words, no chirps), then back to sitting: exciting → leans in, little bounces; funny → happy wiggle and a heart; sad → droops, sad face turned to you briefly; scary → turns to you and hides (shy pose, sweat drop); beautiful → sparkles; boring → turns around and looks at you; calm → nothing. | Agreed. |
| 2026-10-24 | 7. Diary | Each description saved as text in his day ("While watching …: a scary chase in the woods (scary)"); never the picture. The diary sees at most the last 8 per show. | Agreed. |
| 2026-10-24 | 8. Privacy | Same rules: private windows and anything on the blocklist are never looked at. | Agreed. |
| 2026-10-24 | 9. Speed | A few seconds per glance; skipped while he's busy thinking or writing; on battery too, not below 20%. | Agreed. |

## Phase 9 step 1b implementation notes (2026-10-24)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Real-model check of glances (Gemma 4 12B with its vision add-on, six drawn test scenes with subtitles) | 6 of 6 moods right: dark forest and red eyes, "RUN! It's right behind you!" → "A scary shadow monster is chasing someone!" (scary); sunset over mountains → "Purple mountains under a big yellow sun" (beautiful); clown on a banana peel → "A funny character slips on a banana!" (funny); car chase and explosion → "Cars racing fast on a road!" (exciting); grave in the rain, "I miss you every day, Dad." → "A character mourns their father in rain" (sad); budget slides → "Looking at boring office budget spreadsheets" (boring). About 35 s each on the dev container's CPU (11 s with the prompt fully reused); seconds on the Mac. | Checked before pushing. |
| 2026-10-24 | Bug found by that check | Step 1's name setting broke every thought **with a picture**: in `engine.js` the message parameter `user` hid the new `user()` name function, so any request with a screen picture crashed (text-only thoughts were fine). Fixed (renamed), and a test now sends a picture through the real `Engine.think`. | The unit tests use a fake engine; Sushant may have seen fewer comments on what's on screen since step 1. |

## Phase 9 step 2 questions (Pip)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Pip's look (front, 3/4, back) | **Approved** after two drafts: round ivory body, muted yellow belly, big eyes in dark goggle rings, a big orange beak, dark teal wings and tail of three feather plates, small metal feet, a thick brass wind-up key on top of his head with a short stem (same from the back). | Sushant: "the beak could be bigger… why is there a gap between the top part and the stem… key body little thicker… from the back… it should be on top of his head and a short height stem", then "Yes the look is okay now." |
| 2026-10-24 | 1. How Pip is referred to | **he** | Sushant. |
| 2026-10-24 | 2. Winding himself | Sometimes he manages on his own after a few tries; sometimes he gives up and looks at you, and clicking him then winds him (fills him up, counts as attention). | Agreed. |
| 2026-10-24 | 3. Battery instead of hunger | **No: hunger stays hunger for everyone** (winding is how Pip fixes it). | Sushant: "lets keep hunger same as others". |
| 2026-10-24 | 4. His fixed lines | "That was unnecessary." after a throw, "Statistically improbable." after losing tic-tac-toe; signs and floating texts in his voice; full list for review. | Agreed. |
| 2026-10-24 | 5. "Who I am" | As in the concept sheet plus "My humour is dry and a little smug."; we may add a little more in the same spirit. | Sushant: "if you think something else could be added to make him more interesting on the same line as the initial description feel free." |
| 2026-10-24 | 6. Switching | A *Character* submenu, swapping on the spot with a little puff; the picker (looks only, a card with an animation on hover) on a new install. Sushant wants to try the picker too: a way to open it on his Mac is needed. | Sushant: "I would also like to see the picking menu so let me know how can I test that." |
| 2026-10-24 | Pip's "Who I am" and sliders | **Approved** as drafted (concept text + the key line + the humour line; sliders: very curious about ideas, confident, not modest, calm, warm but not gushy, independent). | Sushant: "I agree with the who I am text and personality sliders". |
| 2026-10-24 | Pip's poses | **Approved** after a second round: bigger wings spread outward like the reference, happy with wings up in a V, hug wrapped around his middle, forward wings shorter so his face stays visible, drooping when sad or asleep. | Sushant: "the winds should be little spread outwards… especially happy and hug", then "Lets move on next activities". |
| 2026-10-24 | Pip's fixed lines | Used as drafted (no changes asked); can be changed any time. | Sushant moved on without changes. |
| 2026-10-24 | Pip's six activities | **Approved** after a second round matched to the reference: winding (reaching for his key; gets it, or gives up and points at it: click to wind him), investigating (a big brown-rimmed magnifying glass held out at his side), newspaper (reads, then looks at you), puzzle cube (big, solved, smug), building (crates with his contraption, hammer; works or smokes), conducting (baton and notes, only while music plays). | Sushant: "the second spot and the building part is not the same", then "okay lets go ahead". |

## Phase 9 step 2 implementation decisions (Pip in the app)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Winding as data | `wind` has variants gotIt (60%, fed) and gaveUp (40%, not fed, then `windAsk` for 20 s: pointing at his key; a click feeds him and he's happy). | Decision 2 of the Pip questions. |
| 2026-10-24 | Pip's activity appeal | Like Togepi's by need: winding by hunger, the others by boredom; building is energetic; conducting only while music plays (and more when he's happy). | Same engine, his own activities. |
| 2026-10-24 | Music | Players (Spotify, Apple Music) via JXA (macOS asks once for Automation per app), music sites by address and title, other tabs by the decision model; checked every 10 s only while the character has an activity that needs music and app watching is on. | Decided earlier ("whatever you decide makes sense"). |
| 2026-10-24 | Switching keeps | Your settings, name, reminders, notes and water count; each character's needs, mood, mind, memories, diary and sounds are its own. The models keep running (no reload). Chat, brain, memories and personality windows close on a switch (they belong to the other character). | "Each character has its own mind." |
| 2026-10-24 | Trying the picker on an existing install | *Character → Pick your companion…* in the menu opens it any time. | Sushant asked how to test it. |
| 2026-10-24 | Pip after 3 throws | Still gets angry like Togepi (the shared rule); after any other throw he checks himself and says "That was unnecessary." | His own reaction added on top of the shared one. |

## Phase 9 step 3 questions (Mori)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Mori's look (front, 3/4, back) | **Approved** after a redraw from the reference: on **four short, thick legs** (no arms; he lifts a front paw to wave or to hold something), light warm tan with soft brown outlines, a plump pear-shaped body, a lumpy moss cap (lower on his left; a moss drop at the back), thick pointed ears with moss on the outer side, two pale yellow antler sprouts with a small second tip, big dark eyes, a ":3" mouth, rosy freckled cheeks, a curled tail with a big leaf. | Sushant: "Mori in the reference is on 4 legs… its color is little lighter… the ears are meaty and it has green on the outer side… the body is little more pluff", then "Look is okay now." |
| 2026-10-24 | 1. How Mori is referred to | **he** | Sushant. |
| 2026-10-24 | 2. Night, for watching fireflies | **6 pm to 5 am.** | Sushant. |
| 2026-10-24 | 3. Thrown around | After every throw: dizzy (spiral eyes, slow blink, a sway), then he walks away. **The 3rd throw within 10 minutes**: a little "Please don't." sign. **Mori never gets angry** (no angry state after throws, unlike Togepi's and Pip's 3 throws in a minute). | Sushant: "3rd throw in 10 min, never angry". |
| 2026-10-24 | 4. Flowers on his moss | When he's happy (full flowers) **and also while he's cheerful** (a few smaller ones). | Sushant: "flowers when cheerful too". |
| 2026-10-24 | Mori's six activities | Planting a seed, making tea and watching fireflies approved as drawn. **Collecting leaves**: a big heap of autumn leaves that he picks one from. **Mushroom hunting**: a short walk to a group of 2–3 mushrooms that appears at a **random** spot (random distance, either side); he walks over and picks one. **Skipping stones**: redrawn so the stones look like real stones. | Sushant: "make sure you make it look like pile of leaves… a big pile", "2 or 3 mushrooms together in a group… appears on random places… the distance should be randomly decided", "the stones are very stupid… do better". |
| 2026-10-24 | Chances | Leaf on his head 3 in 10, the seed sprouts 6 in 10, a red spotted mushroom 3 in 10. | Sushant agreed. |

## Phase 9 step 3 implementation decisions (Mori in the app)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | "Who I am", sliders and lines | Used as drafted (the concept text plus the moss-and-flowers line and the humour line; quiet, gentle, patient, very calm, loves nature and routines). | Sushant moved on without changes. |
| 2026-10-24 | Mushroom hunting | A walk of 140–420 px in a random direction (turns round near an edge); the mushrooms come into view as he gets close (his window moves with him) and the found state follows when he arrives. No basket: he has no arms to carry it, so he holds the one he picks. | "the distance should be randomly decided". |
| 2026-10-24 | After a throw | Dizzy for 3 s, then he walks away; the 3rd throw within 10 minutes: "Please don't." on a sign for 4 s, then he walks away. A hard landing still leaves him confused first, as for everyone. | Decision 3 of the Mori questions. |
| 2026-10-24 | Cross moods | He never looks angry: where Togepi would frown with angry eyes, Mori looks tired and a little sad. | "never angry". |
| 2026-10-24 | Fireflies by day | Not chosen by him by day; in the menu it reads "Watch the fireflies (at night)" and is greyed out. | Night only (6 pm to 5 am). |
| 2026-10-24 | Fetch, games, watching | A pinecone for fetch (a leaf distracts him halfway 3 times in 10 on longer throws); tic-tac-toe: your pieces are leaves 🍃 and his mushrooms 🍄 whoever starts; after he wins, a mushroom on his head for 10 s; watching with a mug of tea (its steam beside his head). | Concept sheet. |
| 2026-10-24 | Speed | He walks at three quarters of the others' speed. | "Mori walks slowly" (decision 8). |
| 2026-10-24 | Activities from the menu during a game | Picking an activity ends a game he's offering or playing (for every character). | Found while testing: he went mushroom hunting holding the pinecone. |

## Permissions and signing (2026-10-24)

Sushant: the Brain menu showed Screen Recording and Calendar ticked although
macOS hadn't allowed them (System Settings showed them off, he couldn't read
the screen), the app never asked at start, and a test event didn't show up
as the next event even after 5 minutes until he switched the calendar off
and on. "So you remember initially we had planned that we'll make some kind
of signature based things. I think it's the right time now to implement
that. So go ahead and implement that."

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Why the ticks lied | The ticks showed the setting (what you switched on), not what macOS allows. Ad hoc signing makes each rebuild a new app for macOS, so a switch in System Settings belongs to an older build and the new one is neither allowed nor asked. | Found in `main.js` (menu) and `scripts/adhoc-sign.js`. |
| 2026-10-24 | Signing | A self-signed "Companion Local Signing" certificate made once on his Mac (`npm run make-cert`, password once to trust it); `npm run dist` signs with it, ad hoc with a warning otherwise. `npm run reset-permissions` once to clear the old builds' answers. | The plan from Phase 5 (DECISIONS: Screen Recording "denied" although switched on). |
| 2026-10-24 | Showing permissions honestly | A switch that's on but not working reads "(not allowed by macOS)" with a *Fix in System Settings…* line that opens the right page (or shows the prompt if macOS hasn't asked yet). The brain view and the report say how the app is signed. | So a tick never means "working" when it isn't. |
| 2026-10-24 | How often the calendar is read | Every minute (was every 5 minutes), plus right away when you open his menu or the brain view (at most every 15 s) and when the Mac wakes up or unlocks. The brain view shows when it was last read. | "If it is too long, we need to reduce it." Reading takes a moment in a separate process, so once a minute is light. |

## Phase 9 step 4 questions (Nomi)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Nomi's look (front, 3/4, back) | **Approved** after three drafts measured against the reference: a wide cloud head with big puffs, long cheeks rising a little at the tips and a flatter scalloped bottom, cream on top fading to pale blue, soft light-blue outlines; eyes low and wide apart, a tiny cat smile, pink cheeks; a glossy yellow crescent moon (gradient, no blue outline); a small fluffy body under the cloud with two soft tapered legs (one out to the side, one hanging); tiny floating hands; from the back a rounder cloud with a swirl, a tucked-in arm, a cloud bubble on the shoulder, the moon peeking over and two longer legs. | Sushant: "the body is not like circular, it is like a cloud…", "elongate the cheek part little more… make the part where the legs connect… fluffy", then "I'm okay with the look now." |
| 2026-10-24 | 1. How Nomi is referred to | **she** ("for now") | Sushant. |
| 2026-10-24 | 2. Night, for moon watching | 6 pm to 5 am (like Mori's fireflies). | Sushant. |
| 2026-10-24 | 3. Where she floats | **At the top of the screen**: her normal floating and drifting happen near the top, not along the bottom. | Sushant: "it should float higher up the screen… keep its normal movement at the top of the screen only." |
| 2026-10-24 | 4. Thrown | Carried off the edge of the screen by the throw, floats back slowly, dizzy, her cloud stormy for a few seconds, then forgives you. **Never angry**, however many throws. | Agreed. |
| 2026-10-24 | 5. Her six activities | Catching stars (fixes hunger), dream bubbles, making rain (mostly when sad; a pat stops the rain and a rainbow appears), painting a rainbow, reading a book, moon watching (night only). | Agreed. |
| 2026-10-24 | 6. Bored | Sillier and sillier dream bubbles: a tree, a frog, a frog in a spaceship, a frog commanding a spaceship. | Agreed. |
| 2026-10-24 | 7. Fetch | A dream bubble; 2 throws in 10 it pops, she looks genuinely surprised, then blows a new one for you. | Agreed. |
| 2026-10-24 | 8. Tic-tac-toe | Your ⭐ against her 🌙; when she wins, a little constellation of the finished board appears above her for a few seconds. | Agreed. |
| 2026-10-24 | 9. "Who I am" | The concept text plus "My humour is soft and a little whimsical." | Agreed. |
| 2026-10-24 | Thoughts failing with a 400 | Sushant's report while testing Mori: "last thought failed: 400 … [json.exception.parse_error.101] … invalid string: surr…" (after a look at the screen). To fix as part of the Nomi work, not before. | Sushant: "We'll make change it as part of Nomi." |
| 2026-10-24 | 3. Where she floats (changed) | **Like the others**: her normal life is along the bottom of the screen, hovering just above it with her legs, drifting instead of walking (sleeping there too, and lonely, watching, games and other screens as for the others). **Plus a seventh activity**: now and then she tucks her legs in and wanders around the top of the screen like a cloud, then comes back down. | Sushant: "let it work on the normal thing like how we used to do before for other characters, since it has like legs… meanwhile… close like legs in and you just wander around like cloud at the top of my screen… add some kind of an activity here, like wandering, but flying." |
| 2026-10-24 | Nomi's poses | **Approved** as drawn (floating hands, legs that settle, dangle and trail, asleep curled as a little cloud, stars and glow when happy or cheerful, a little darker when sad, dizzy and stormy after a throw, never angry). | Sushant: "I am okay with the looks." |
| 2026-10-24 | Nomi's seven activities | **Approved** as drawn: catching stars (jar glows at night), dream bubbles, making rain (a pat → rainbow), painting a rainbow bridge, reading a big book, moon watching (night), wandering the sky. | Sushant: "Looks fine". |
| 2026-10-24 | Wandering the sky | A trip of 30–60 s: up to the top of the screen, drifting back and forth there, then back down. | Sushant agreed. |
| 2026-10-24 | Silly bubbles | Her solo play when nobody plays with her, and 3 in 10 of her normal dream bubbles. | Sushant agreed. |

## Phase 9 step 4 implementation decisions (Nomi in the app)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | "Who I am", sliders, lines | The concept text plus the agreed humour line; sliders: very imaginative and feeling, very tender-minded and tolerant, almost never cross, warm, gently sociable, not competitive. Lines soft and dreamy, comforting rather than advising (drafted, not reviewed separately). | Concept sheet; Sushant agreed to the humour line. |
| 2026-10-24 | Floating | Drawn hovering just above the floor; movement like the others (drifting instead of walking). Dropped, she falls at 30% of normal gravity with more air drag; a throw that carries her past the edge of the screen takes her out of sight for 2.5 s, then she floats back in to 120 px from the edge, dizzy and stormy for 3 s. | Decisions 3 and 4. |
| 2026-10-24 | Wandering the sky | She rises to just below the top of the screen (70 px/s) and drifts to random spots along it (35 px/s) for 30–60 s; afterwards, or if something calls her away, she drifts down (160 px/s). | "wander around like cloud at the top of my screen". |
| 2026-10-24 | Making rain | Chosen mostly when her mood is low (not when cheerful); a pat during the rain: a rainbow for 3 s and a little affection. | Decision 5. |
| 2026-10-24 | The 400 error | Every string sent to the models has half-characters removed (deeply, in the request body), so a cut emoji can't break a thought. | Sushant's report; fixed "as part of Nomi". |
| 2026-10-24 | Files touched outside her folder | As agreed before starting: the four registration places (`src/characters/index.js`, `index.html`, `ball.html`, `picker.html`), `board.js` (pieces), `companion.js` (floating, the sky, throws, fetch pop, taps, solo variant, the board she won), `engine.js` (the 400 fix), docs, README, welcome, code map. | Sushant wants to work on other things in parallel. |


## Phase 10 questions (Tiger Data, the weekly song, memory search; 2026-10-24)

For a hackathon ("Best Use of Tiger Data", MLH); the demo is on 2026-10-25.

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Tiger Data: cloud or on the Mac? | **TimescaleDB on the Mac** (Tiger Data's open-source Postgres extension, Homebrew: `timescaledb`, Postgres 18). No Tiger Cloud. The MLH page sets no cloud condition. | Keeps "nothing leaves your Mac"; the page only pushes a cloud sign-up. |
| 2026-10-24 | What goes into it | The event log (what you're doing, time together, what he said or kept to himself, reactions, shows, chat) for every character, plus once a minute his mood, needs and what you're on. Kept 90 days; hourly totals kept by the database itself. Memories stay Markdown files. | Agreed plan. |
| 2026-10-24 | Old files | Loaded automatically on start (`events.jsonl` and `events.1.jsonl`, each line has its time), for every character, without duplicates. Mood and needs over time only from go-live (`brain.json` only has *now*). | Sushant asked whether the old files sync up. |
| 2026-10-24 | Where the database lives | `…/Companion/database/`, next to the shared `settings.json`: one database for all characters, every row marked with its character. | My pick; Sushant: "I'm okay with your pick." |
| 2026-10-24 | The weekly song | Every week each character makes **a 30-second song about your week** with ElevenLabs Music: the week's totals come from the database, the character's own language model writes the title, the lyrics and the music style. A sign ("a song!") when you're back; click it: a small song window with the lyrics and "This week" numbers, and he dances. *Try it now → Make this week's song now*. | Sushant: combines Tiger Data and ElevenLabs. |
| 2026-10-24 | Lyrics | **With lyrics.** An instrumental "postcard" was "boring". | Sushant. |
| 2026-10-24 | Who sings | **A sweet female singing voice**, the same for every character, not the character's own voice (his chirps stay his only voice). An exception to "never a human voice" for songs only. Letting each personality choose its singer: later, not now. | Sushant: "let's not add voice from the character's perspective… The voice will be like a female, sweet voice." |
| 2026-10-24 | How the lyrics and music sound | **Only from the personality**, nothing fixed in the prompt: Pip's snarky, Togepi's sweet and dreamy, Mori's calm, Nomi's soft, all because of their "Who I am", sliders and relationship (as decided 2026-10-22). The prompt only gives the format (title, style, a few short lines for 30 s) and the week's facts. | Sushant: "can we do it without hard coding anything in the prompt? We should be driven by personalities." |
| 2026-10-24 | What may be sent to ElevenLabs | The title, lyrics and style he writes, which may name apps and sites; never private things (the privacy rules and the decision model's check run first). | Sushant: "whatever it has in memory that doesn't concern my private, like app names, site names, I don't mind." |
| 2026-10-24 | The API key | Asked **in the app** (welcome window, and *Mind → ElevenLabs key…*), kept in the macOS Keychain (Electron `safeStorage`), never in the build; `ELEVENLABS_API_KEY` wins when set (testing). Key restricted to Music Generation. | Sushant wanted it asked at first launch or install, not baked in. |
| 2026-10-24 | Meaning-based memory search | Added as part 3: a small embedding model in llama-server, fingerprints in the database (pgvector), old memories fingerprinted automatically; today's word matching stays as the fallback. | Sushant: "Can we also include that in the plan?" |
| 2026-10-24 | Commits | As Sushant, no assistant lines (unchanged). | Sushant. |

## Phase 10 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | How Companion runs the database | Its own Postgres server (Homebrew's binaries, found by path), data in `…/Companion/database/data`, a socket file in that folder only (no TCP port; a private `/tmp/companion-db-<uid>` if the path is too long for a socket), TimescaleDB telemetry off, started with the app and stopped when it quits. | Fully local, nothing to set up beyond `brew install timescaledb`. |
| 2026-10-24 | Old "you switched to" lines | Count as that app for at most 10 minutes each (the old log can't tell whether you were away). Live minutes replace them. | Honest totals for the week before go-live. |
| 2026-10-24 | The song's model and plan | ElevenLabs `music_v2_5` with a composition plan: verse (15 s) and chorus (15 s), his own style tags plus `songSinger`. | The plan carries exact lyrics and length; tested with Sushant's key (a 6 s clip in 2 s). |
| 2026-10-24 | Recall thresholds | Similarity 0.28 counts as unrelated, 0.5 as fully relevant, measured with EmbeddingGemma on real memories; the user's name is left out of fingerprints because it made every memory look alike (0.3–0.45 for unrelated ones). | Measured. |
| 2026-10-24 | Vector index | Tiger Data's StreamingDiskANN (pgvectorscale) when installed, otherwise pgvector's HNSW. | Tiger Data's own index where available, no hard dependency. |

## Phase 10 feedback

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | The weekly song, tried on the Mac | **Works.** | Sushant: "this feature works great! this song thing." |

## Phase 11 questions (voice commands, 2026-10-24)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | 1. How he starts listening | A keyboard shortcut (⌥ Space) and a 🎤 button in the chat window; the microphone is never on otherwise. A 👂 bubble while he listens. No wake word for now. | Default agreed. |
| 2026-10-24 | 2. Speech to text | **Configurable, two engines**: Apple's on-device recognition (default, stays on the Mac) and **ElevenLabs Scribe** (online; your voice goes to ElevenLabs, only when you pick it). Not whisper.cpp for now. Sushant tests the Apple one on his Mac (it can't be tested in the Linux container). | Sushant: "it should be configurable… let's do Apple's on device recognition and I will test it on mine… I want to do 11 labs anyway, 11 labs scribe." |
| 2026-10-24 | 3. What you can say | Both: his menu's commands run directly (come here, play fetch / tic-tac-toe, stop playing, nap, wake up, stay put, remind me…, make our song, done, his activities); anything else is a chat message he answers in his bubble; while he asks a question, saying an answer picks it. | Default agreed. |
| 2026-10-24 | 4. How he answers | Bubble and chirp, never a spoken voice (unchanged). | Default agreed. |
| 2026-10-24 | 5. Memory | What you say is kept like typed chat; the audio is never saved (deleted right after it's turned into text). | Default agreed. |
| 2026-10-24 | 6. When he won't listen | Never in meetings, while the screen is locked or while you're away; while you watch something together the shortcut still works. | Default agreed. |
| 2026-10-24 | 7. Characters | The same commands for every character; each reacts in its own way. | Default agreed. |

## Phase 11 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Hold ⌥ Space to talk? | **Press** ⌥ Space (or 🎤) to start; listening stops by itself 1.2 s after you stop talking (or press again). Electron's global shortcuts only report the key going down, so holding it would need a native keyboard hook and the Input Monitoring permission. | Technical limit; to confirm with Sushant. |
| 2026-10-24 | The Apple engine | A small Swift helper (SFSpeechRecognizer with on-device recognition only, the commands and character names as contextual strings) run on a short WAV; built from source on the Mac. | Speech framework needs a usage description in the binary; JXA can't provide one. |
| 2026-10-24 | Feedback while listening | A 👂 bubble (… while it's turned into text), no chirp, chirps muted until he's done; a "📝 17:00" bubble after a spoken reminder. | So the microphone doesn't hear him, and you see it worked. |

## Phase 11 feedback

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Voice commands, tried on the Mac | **Works.** Press-to-talk (instead of holding the key) accepted as built. | Sushant: "I've tested this and it works fine now." |
| 2026-10-24 | Merging | The work branch is merged into `characters`, then `characters` into `main`. | Sushant: "let's merge the update branch to the character branch and then merge the character branch to the main branch." |

## SBU Hacks (2026-10-24)

The project is being extended for the SBU Hacks hackathon on the branch `sbuhacks-dev`, by the team working with Sushant on it. These answers come from that team.

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Git conventions on `sbuhacks-dev` | Every rule in PLAN.md's working agreement still applies, **except who commits**: commits are made under the contributor's own git account, not as Sushant. Still no assistant trailers in commits or PRs. Work happens on `sbuhacks-dev`; a finished feature goes into `main` through a PR that is then merged. | "Make sure all the rules are followed apart from the commit as Sushant, commit under my git account." |
| 2026-10-24 | Other work going on at the same time | Two other branches are in progress: **characters** (more characters, each with its own personality, kept separate from each other) and **calendar** (reading events such as assignment deadlines and interviews so reminders are more specific). Changes here must not depend on a particular character and must not touch the calendar features; conflicts in shared files (the prompt, the welcome version) are fine and will be resolved when merging. | So the branches can be merged without one breaking the other. |
| 2026-10-24 | `main` merged into `sbuhacks-dev` (characters, Phases 9-11) | The characters work took the number Phase 9 on `main`, so the moments built here as "Phase 9" are **Phase 12**. Its text now uses your name and pronouns (`names.js`) instead of "Sushant" and "he", and the welcome entry is version 22. | Keeps the phase numbers and the names rule from `main`. |
| 2026-10-24 | Run his voice model online (Gemini) on a Mac without the memory for the local models | **Optional, off by default.** `mindEngine: "gemini"` in settings.json (*Mind → Think with*, or `MIND_ENGINE=gemini` at start) sends the voice model's work (thoughts, chat, diary, weekly reflection, song lyrics) to Google's Gemini API; `local` stays the default, so nothing changes unless you switch. In its own file, `src/main/mind/gemini.js`, with the same interface as the local engine; `main.js` only picks one. Key from `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), never in the repo, settings or build. The decision model can stay on the Mac (`gemini.localDecider`, on by default, about 3 GB) for the privacy double-check and picking lines. Default model `gemini-3.5-flash-lite` (fast, free of charge), changeable in settings (`gemini.model`) or with `GEMINI_MODEL`. | The team's 16 GB laptop froze while loading the local models (a kernel panic with a watchdog reset, 2026-10-24); SBU Hacks has a Gemini API track. "A separate flag… the code is modular so nothing is hardcoded." |
| 2026-10-24 | What goes to Google with Gemini on | Everything in his prompt: his personality, what you're doing (window titles; screen text and pictures if *Let him read my screen* is on), memories, your notes and the chat. The privacy rules run first, as always. On Gemini's free tier Google says content is "used to improve our products" (not on the paid tier). **Sushant to confirm before this goes into `main`**: "fully local" was his requirement (2026-10-19). | Honest about the trade-off. |
| 2026-10-24 | Switching between Gemma and Gemini | **Mind → Think with** in his menu (right-click and menu bar): *Gemma, on this Mac (about 11 GB of memory; nothing leaves it)* or *Gemini (online: what he thinks about goes to Google)*, radio items like *Listen with*. Switching stops the models in use and starts the other kind. `MIND_ENGINE` no longer overrides the menu: it sets the choice when he starts, and the choice is kept. | "Make switching between Gemini and Gemma an option in the character's right-click menu, like Listen with." Kept, so a plain `npm start` on a 16 GB Mac stays on Gemini. |
| 2026-10-24 | `main` merged in again (PR #3, upcoming event thoughts) | Main's calendar work took welcome version 22, so the moments entry is **23** and the Gemini entry **24**. Main's "Coming up: … at hh:mm (in N minutes)" line now tells him about your next calendar event, so the moments text's "something big is coming up for {user}, like an interview or an exam" also covers the calendar. Its new required `about` field goes through the Gemini schema converter unchanged. | Keeps main's numbers; the two features fit together. |
| 2026-10-24 | The right-click menu moved with him while he walked | **He holds still while his right-click menu is open** (`Companion.holdForMenu`, released by the menu's close callback, at most a minute): just wandering, he stops and stands; walking somewhere for a reason (a nudge, a reminder, another screen, watching, a game), he pauses and carries on afterwards; in the air he still lands; his mind's actions wait. The menu bar menu is unchanged. Welcome version 25. | "When I right click on the character it stays in one place and the menu does not shift." The menu is a native menu anchored to his window, which moves with him. |
| 2026-10-24 | Feedback: right-click during an activity (Togepi running after the ball in fetch) stopped him but kept the running animation | **While the menu is open he shows his standing pose**, whatever he was doing (fetch, wandering, his own activities, sitting, watching), and the activity's timer waits; when the menu closes he carries on. Asleep, in the air, or holding something up for you (a sign, a nudge, an invitation) he keeps that pose. Tested: every own activity of all four characters in unit tests, and the real renderer drawing real before/during frames for Togepi (fetch), Pip (investigating), Mori (mushroom hunting) and Nomi (wandering the sky). | "The character needs to use the stand animation when I right click." The first fix only stopped the movement. |
| 2026-10-24 | Choosing how he thinks, and the Gemini key, at startup | The welcome window (first run, and *Welcome and what's new…* any time) has **How should I think?**: *Gemma, on this Mac* (with "This Mac has N GB, which is tight" under 24 GB) or *Gemini, online*, and a field for the Gemini key, kept encrypted in the Keychain like the ElevenLabs key (`gemini.key` in the app's data folder). `GOOGLE_API_KEY`/`GEMINI_API_KEY` still win when set. On a **new install** his models wait until the welcome window closes or you pick (Gemma if you just close it), so a 16 GB Mac doesn't start loading 11 GB before you can choose. The default stays Gemma. Welcome version 26. | "If someone else wants to run Gemini they can just add their key at the startup… selecting what runs the brain is an option at the startup." |

## Phase 12 questions (moments)

Asked 2026-10-24. The direction: he responds to moments in your day, not only celebrating wins. Around 30 scenarios were listed (celebrate, comfort, cheer you on, calm you down, keep you company, steer you back, look after you, wind down).

1. Which moments go into the first version?
2. How should they be decided: rules in the code, or the model?
3. The calendar: add upcoming events to his prompt?
4. How long does study buddy last?
5. Confetti across the whole screen, or around him?
6. The models (about 10 GB): download them for testing?
7. "I did it!": a menu button? What happens without the models?

Answers:

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | 1. Which moments | **Four:** keep you company (**study buddy**), **celebrate** a submission and "I did it", **comfort** after a bad day or a rejection you tell him about in chat, **cheer you on** before an interview or an exam. | "This looks good to me." |
| 2026-10-24 | 2. Rules or the model | **The model, through his prompt.** No condition in the code decides when a moment happened or how he reacts. His prompt is sent the same way as before; it only gains a short description of these moments and the new things his body can do, and **his personality decides** whether and how he reacts (he may also let a moment pass). The text never names the character, so every character uses it with its own personality. | "This should not be like a condition in the code… this has to be an addition in the prompt to the Gemma… still configured according to its personality." Characters are being made pluggable, so it must depend on the personality, not on Togepi. |
| 2026-10-24 | 2a. Topics in his prompt | The new text names situations (finishing or submitting something, a setback, something big coming up, working or studying). It says nothing about how he should sound, so it keeps the 2026-10-22 rule (no fixed tone instructions). It is a list of topics, which Phase 6 removed from his instructions; this is a deliberate exception for these moments. | The team's decision for this phase. |
| 2026-10-24 | 3. Calendar | **Don't touch the calendar features; only improve the prompt.** Upcoming events are not added to his prompt in this phase. He cheers you on from what he already knows: what you tell him in chat, his memories and what's on your screen. When the calendar branch puts events into his prompt, the same text covers them. | "Do not touch the calendar features, just improve the prompt." |
| 2026-10-24 | 4. Study buddy | **As long as the work goes on**, with as little code as possible. He sits with his back to you, watching your screen, and doesn't wander. The model ends it by choosing something else when he next speaks; it also ends when you're away or start watching something together. | "Study buddy can last as long as the work goes on… we are trying to keep code changes to a minimum." |
| 2026-10-24 | 5. Confetti | **Around him only**, as a shared animation that works for every character (drawn as a particle effect, not part of any character's drawing). | "Confetti around just the companion makes sense… make sure this is like a shared animation that just adds on to all of the characters." |
| 2026-10-24 | 6. Models | Already downloaded into `models/` and `engine/`; the app is started with `npm start`. | The team had downloaded them. |
| 2026-10-24 | 7. "I did it!" | **No button and no other trigger.** It happens only when you type "I did it" to him (in the chat window); the model reads it and decides how to react. | "The I did it part should only be triggered if I did it is typed and no other trigger for that." |

**Phase 12 questions: all answered (2026-10-24).**

## Phase 12 implementation decisions

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Real-model check (Gemini `gemini-3.5-flash-lite`, his real prompts with the moments text, made-up situations, user "Alex", they/them) | All 7 answers in the right format; Gemini took the converted answer schema (no fallback); 3.4-5.1 s each. A Gradescope "Submission received" page (a thought) → **celebrate**, "Yay, you did it, Alex!"; chat "I did it" → **celebrate**; "I had a really bad day" and "I got rejected from Google" → **comfort** ("Sending you the biggest shell hug right now, Alex!"); a Stripe interview in 30 minutes → a hop and "You're going to do amazing!"; "Let's study together for the next hour" → **studyBuddy**; "what should I eat for dinner?" → no celebrate or comfort. With a cold, grumpy personality (Warmth, Gregariousness, Cheerfulness, Altruism 15, Anger 80) the same chats changed tone: "You actually finished it!", "Ugh, bad days are so boring and gray! Let's smash something or go explore instead.", "Go make them pay attention to you right now!". | Checked before merging; the local models weren't run on the 16 GB laptop. |
| 2026-10-24 | Real-model check after merging main's calendar work (Gemini, made-up situations) | Heartbeat with "Interview with Stripe" in 40 minutes → `about: upcoming` (📅), a hop and "You are going to totally rock your Interview…"; "CSE 214 Midterm" in 50 minutes → "Crush that CSE 214 Midterm, Alex!"; a Devpost "Your submission is complete" page → **celebrate**, "Yay, Devpost submission is done!"; 50 minutes writing in VS Code → **studyBuddy**, "Let's write essay.md together now!". About 1 s each; one call timed out once (free tier) and worked on retry: a failed thought shows in the brain view and he carries on. | The moments and main's calendar lines work together. |
| 2026-10-25 | Study buddy | **Switched off.** Commented out, not deleted, so it can come back: the prompt line and the `studyBuddy` action in `moments.js` (the model is no longer offered it) and the action in `Companion.mindAction` (even if it's asked for, he never sits down to study). Its two behaviour tests are skipped; a new one checks it stays off. Celebrate, comfort and cheer you on stay. | "It makes him really quiet… you just have to take it off, nothing else." |

## Review of main after SBU Hacks (2026-10-24)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Voice commands could start night-only activities by day ("watch the moon" at noon started Nomi's moon watching; the menu greys them out) | Night-only activities are left out of what voice commands match while it isn't night (`notYet()` in `main.js`, shared with the menu), so by day it's a chat message he answers. Welcome version 27. | Found reviewing `main`; Sushant: "fix 1 and 2". |
| 2026-10-24 | The 400 "half an emoji" fix didn't cover Gemini | `GeminiEngine.post` cleans the request with the same `wellFormed()` as the local engine. | Same review. |
| 2026-10-24 | Where the fixes go | `characters` brought up to `main` (a fast-forward), the fixes committed on `characters`; `main` untouched. | `main` is only changed when Sushant says so. |

## Filo: the app's new name and logo (2026-10-24)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | What is Filo? | **The app's name** (Greek φίλος, "friend"), not a character. The picture Sushant attached (a friend carrying a screen, the word Filo under it) was a starting point; the logo may be improved. | Sushant: "filo means friend in greek and thats the idea, its not like filo is the character". |
| 2026-10-24 | The logo | **Direction B**: a friend sitting on top of a screen that shows a chat bubble, cream and coral on a coral tile, plum outlines. The other two were A (the friend carrying the screen, refined) and C (a φ drawn as a smiling face). The word "Filo" is drawn from rounded strokes with a coral dot on the i. | Sushant: "Go with B". |
| 2026-10-24 | The rename and the bundle id | The app is renamed everywhere (`productName`, `appId` com.sushantpatil.filo, permission texts, `Filo.app`, the data folder `…/Filo/`). A new bundle id means macOS asks for every permission again. | Sushant: "I dnt mind re-granting every permission and sign off again". |
| 2026-10-24 | The signing certificate | Keeps its name, "Companion Local Signing" (it never shows to users; renaming it would only make everyone run `make-cert` again). My pick. | Less to redo. |
| 2026-10-24 | Data | The first start copies everything from `…/Companion/` (settings, all characters, the database; not the database when the old app is still running). The ElevenLabs and Gemini keys can't be moved (encrypted with a Keychain entry named after the old app): asked for again, and the welcome entry says so. | My pick; nothing else is lost. |
| 2026-10-24 | The code | The `Companion` class (the simulation of the character on screen), the folder names under `src/` and the npm package name are unchanged: they're not what anyone sees. | Keeps the rename small and the other branches mergeable. |
| 2026-10-24 | Branch | Done on `filo`, from `characters` (PR #5 stays as it is); not merged into `main` until Sushant says so. | Working agreement. |

## Tonk, a fifth character (SBU Hacks, 2026-10-24)

The team's character for the hackathon's **steam and steel** theme, from their concept sheet ("Tonk, the Tiny Workshop Robot": a pocket-sized brass-and-steel robot who loves helping you get things done). Added like Pip, Mori and Nomi (Phase 9).

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Look | As on the sheet: a boxy rounded body of brushed steel with brass panels and copper rivets, steam vents on the shoulders, a red glass visor with two round glowing eyes, a tiny antenna with a glowing bulb, wheels for feet; back: a pressure gauge and a wind-up key. Drawn in code like the others, so a simplified version of the art. | The team's concept sheet. |
| 2026-10-24 | Personality | From the sheet: high dutifulness, activity, achievement-striving and agreeableness, low anxiety; values helpfulness, achievement, security; "Who I am" from the sheet. Fine-tune in the Personality window. | "Personality also works." |
| 2026-10-24 | Activities | The sheet's six: carrying a tiny toolbox (he rolls along with it), checking off a to-do list, reading a tiny blueprint, recharging beside a small steam boiler (fixes hunger), sorting screws (what he does when nobody plays), fixing himself with a tiny wrench. | "Six activities too." |
| 2026-10-24 | Thrown | **Only his eyes react**: his visor eyes go dizzy (swirls) for a moment, then he's back to normal. Not falling into pieces. | "Falling into pieces and then snapping back will be harder to animate and just invites more bugs… maybe just animate his eyes." |
| 2026-10-24 | Watching together | He sits with his back to you facing the screen, his antenna bulb glowing; his reactions to moments are his own (the bulb flashes when it's exciting, dims when it's sad). | The sheet's "Watching Together" (no blanket: that was a mistake in the proposal). |
| 2026-10-24 | Games | Tic-tac-toe with plugs vs batteries (🔌 / 🔋: there's no socket emoji); fetch with a ball bearing. | "Game is fine." Plugs vs sockets on the sheet. |
| 2026-10-24 | Voice | **Skipped for now**: a plain short beep as a placeholder; a whirr-and-click voice later. | "Skip the voice part for now." |

## Wolfie, a sixth character (SBU Hacks, 2026-10-24)

Stony Brook's mascot, Wolfie the Seawolf (since 1995; named after the Tlingit sea-wolf, said to bring luck to whoever sees it), from the team's concept sheet and a photo of the current Wolfie.

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-24 | Classic or steam-and-steel? | `superseded (look) by the profile row below` **Classic**, as in the photo: charcoal and light-grey fur, white muzzle with a toothy grin, red-and-black eyes, red Stony Brook cap, red "STONY BROOK 1" jersey, red shorts with a white drawstring, fluffy grey tail. | "Keep it classic." |
| 2026-10-24 | Personality | **College**: a spirited Stony Brook student (double major in marine biology and cheerleading, his official lore), knows every shortcut across the Academic Mall, never misses a game day, crams but pulls through, cheers your wins like a championship. Very high gregariousness, high activity, excitement-seeking, positive emotion, warmth and assertiveness; moderate self-discipline; low anxiety; values school spirit (tradition), loyalty, achievement, stimulation. | "His activities should also be college related and so is the personality." |
| 2026-10-24 | Activities | **College life**: a slice of pizza at the dining hall (fixes hunger), heading to class with his backpack (walks), studying with a textbook and a highlighter, an all-nighter with coffee and a laptop (only at night, 6 pm to 5 am), cheering for the Seawolves with a megaphone, his game-day dance. | The team's sheet. |
| 2026-10-24 | Size | **A little taller** than the others (his ears top out about 15% higher), still under his speech bubble and inside the click area. | "Try to make him a little taller." |
| 2026-10-24 | "Go Seawolves!" | In his megaphone cheer, his good-morning and welcome-back lines, the end of a game and the fetch sign. | "Try to integrate go seawolves in there somewhere." |
| 2026-10-24 | Thrown | He shakes himself off like a wet dog and smooths his fur (was: straightens his cap) (simple, like Tonk's eyes). | Keep throw reactions simple (Tonk decision). |
| 2026-10-24 | Games, watching | Tic-tac-toe with 🐾 vs 🌊; fetch with a mini football; watching together like a dorm watch party (a foam finger when it's exciting). | The team's sheet. |
| 2026-10-24 | Voice | A short placeholder "awoo" until a real one. | Same as Tonk. |
| 2026-10-24 | Feedback: facing front loses what makes him recognisable | `superseded (colours, cap, head style) by the grey side-view row below; facing the way he walks stays` **In profile, facing the way he walks** (mirrored when he turns; he keeps the last direction when he stops). His head in the **style of the Seawolves logo**: blue with grey streaks on the cheek, jaw and swept-back fur, the logo's thick white outline, a red eye, a toothy grin; blue fur on his arms, legs and tail. **No cap** (it hid the ears and swept fur that make the logo recognisable). The red "STONY BROOK 1" jersey and shorts stay. Supersedes the look in the first row (cap, charcoal fur, facing front). Drawn in code in the logo's style, not traced. | "He does not to face in front, that basically gives up all his recognition… face to a side and then he faces whichever side he is walking towards. This is the logo I kinda want on each side." |
| 2026-10-24 | Feedback: the blue logo-style profile looked bad | **Grey, seen from the side like the sheet's side views**: charcoal and light-grey fur (grey arms, legs and tail), a round head with a snout to the front, a white muzzle with a big open toothy grin (tongue, teeth top and bottom), a red-and-black eye with a dark brow, a black nose, light-grey cheek fluff, two pointed ears poking up behind his **red Stony Brook cap** (back again, brim pointing the way he faces, logo on the side). Still faces whichever way he walks (mirrored). After a throw the cap gets knocked askew and he fixes it. | "This profile is really bad… keep it grey ofc not blue, and the profile should be like this image." |
| 2026-10-24 | Feedback: thin arms and legs | **Muscular and full, like the photo**: thick furry arms with a bicep bulge, an elbow crease, fur tufts and big light-grey paws with three finger bumps; red sleeve caps on the jersey; thick legs with a calf bulge, ankle tufts and big black sneakers; wider shorts. The resting arms hang a little out from his sides so "STONY BROOK" stays readable. `jersey superseded by the row below` | "His arms and legs feel pretty small and like pipes… make them more muscular and fuller so that it matches with the photo." |
| 2026-10-24 | Feedback: the jersey didn't fit the new arms; the shorts, face and ears | **A broad T-shirt jersey** (round shoulders, wider body) with **short sleeves that ride on each upper arm** (a white cuff stripe; they move with the arm, so a raised arm raises its sleeve); bigger "STONY BROOK" lettering and a bigger 1 with a dark-red edge; arms raised beside his head (waving, cheering, dancing, picked up…) go behind his snout instead of across it; the backpack straps and paws sit outside the lettering. **No white circle on his shorts.** **His head 15% bigger**, sitting a little lower so his ears stay under the speech bubble's line. **Bigger ears**: the near one pokes up through the cap, the far one behind it; the cap's logo moved forward, clear of the ear. | "You need to change the tshirt too, also remove the white circle from his shorts, make his face a little bigger too please and his ears more visible." |
| 2026-10-24 | The real mascot | Wolfie and the Seawolves name and logo are Stony Brook's. Fine for the SBU Hacks demo; **publishing the app with him needs the university's permission** (like the Togepi note in the README). | Trademark. |

## Talking opens the chat; bubbles fit their text (2026-10-25)

Asked: which spoken things open the chat, where his reply goes then, how big a bubble may grow, and whether the question bubble resizes too.

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-25 | Voice: what opens the chat window | **Anything you say that isn't one of his commands** (questions and statements alike) opens the chat window with your words; commands still run directly. Supersedes Phase 11 question 3's "a chat message he answers in his bubble" for spoken messages. | Sushant: "if it is an open-ended question, it should automatically open the chat window." Picked "anything not a command". |
| 2026-10-25 | Where his reply to a spoken message goes | **Only the chat window**, no bubble or chirp. Typed chat is unchanged (chat and bubble). | Sushant's choice. |
| 2026-10-25 | How big a bubble may grow | **It fits the whole text**: a short line gets a small bubble; it widens up to about twice the old width (272), then adds as many lines as needed. The font never shrinks and nothing is cut off with "…" (a word too long for a line is broken inside it). His window grows upward and to the sides while a big bubble needs the room; his feet stay put. | "The bubble… should change its size based on text and entire text should be displayed." Picked "wider, then taller". |
| 2026-10-25 | Which bubbles | **All bubbles**: his speech bubble, his question bubble (which widens and grows upward; the answer buttons stay where they are) and the nudge bubbles ("Water break?"). The meeting sign and the sticky note are boards, not bubbles, and are unchanged. | Picked "all bubbles". |
| 2026-10-25 | How the main process knows the size | The renderer measures the bubble as it draws it and sends its size (`bubble` message, only when it changes); the main process grows his window from it (`winSize`) and the click areas for the bubble use it (`Companion.setBubble`). | Text is measured where it's drawn (the canvas); technical. |

## Voice first, app watching after a switch, Brave, 5 s watching (2026-10-25)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-25 | Talking to him while he's busy | **Listening comes before whatever he's doing**: ⌥ Space (or 🎤) always starts listening, except in meetings (and, unchanged, while the screen is locked or you're away). He stops talking, stands still in his standing pose with the 👂 bubble, even asleep or holding something up. A question, a sign, a reminder, a nudge or a game invite waits underneath (its timers too) and comes back when he's done; what he was doing carries on afterwards. A spoken answer to his question still picks it; anything else is a command or a chat. | Sushant: "whenever I run the voice command, it should automatically supersede whatever it is doing." Meetings stay off: "the voice command should not get activated if I'm in a meeting." Reminders and the meeting sign come back after: agreed. |
| 2026-10-25 | What blocked listening before | No 👂 while he asked a question (his `listening()` returned early); the 👂 hidden behind any sign, nudge or game invite; no reaction during a game or a nudge (his "curious" look was refused); a spoken chat message dropped while he was still answering the last one. Now: the 👂 always shows, and a spoken message waits for the answer before it (`sendWhenFree`, at most 2 min). | Found while fixing the above. |
| 2026-10-25 | "He sees: turn on Notice which app I'm using" after switching character | The setting was already one for all characters; the new character's mind only learned what you were looking at once you moved to another window (attention only reports a *new* window), so the brain view showed the "turn on" hint. Now attention starts over for a new mind (`Attention.forget`), and with the setting on the brain view says "nothing yet (in a few seconds)". | Sushant: "it is already ticked. Then I untick it and then tick it again." |
| 2026-10-25 | Brave taken for watching ("watching Brave Browser") | Without the tab's address (Brave without the Automation permission, or Firefox) the decision model judges the tab's title; a title that says nothing (just the browser's name, a new or empty tab, the browser's own pages) is now never asked about and never counts. Pages with real titles are still asked about, and YouTube is still recognised by its title. | A teammate's Brave: he turned around and went to the corner. |
| 2026-10-25 | Watching timers | **Both 5 s**: he joins after 5 s on a video and gets up 5 s after you've left it. Supersedes 2026-10-22 (both 30 s). The short look-away allowance before he joins (15 s) is unchanged. | Sushant: "Make it to 5 seconds." Trade-off told: a brief visit starts it, a glance elsewhere ends it. |
| 2026-10-25 | The 📝 after a spoken reminder while he holds something up | **Shown as soon as he puts it down** (`Companion.sayLater`, dropped after 10 minutes); before, it never showed (a bubble can't go over a nudge, a sign or a game invite). The reminder itself was always saved. Welcome version 34. | Sushant: "yes, show the reminder confirmation after the nudge." |
| 2026-10-25 | The SBU Hacks site (hack.sbcs.io, "SBUHacks 2026") taken for watching | No video on it; not a known site, so the decision model judges the title and address. Measured with the real decision model: real playback pages 0.89-0.99; "SBUHacks 2026" **0.48** (unsure: the title says nothing), "Spotify - Web Player" 0.72, everyday pages 0.00-0.10. The bar was 0.6, so an unsure 0.5 could tip over it (a Mac's GPU gives slightly different numbers). **The bar is now 0.85** (`GUESS_YES`). Welcome version 35. | Sushant: "If I open it, every character thinks of that as a watching thing… please look into it." |

## The brain window in tabs (2026-10-25)

| Date | Question | Decision | Why |
|---|---|---|---|
| 2026-10-25 | Layout | **A header that always shows** what he's doing and his mood face (plus staying put, keeping quiet, the game he's playing and the nudge he's holding up), then **three tabs: Feelings** (needs and mood), **Noticing** and **Decisions** (last decision, top choices). The open tab is remembered. | Sushant: "I want to make it look more easy for understanding." Picked "header + 3 tabs" over one row of seven tabs or folding sections. |
| 2026-10-25 | Groups under Noticing | **Five sub-tabs**, each with a count: **You** (time, here/away, battery, meeting check, watching, watching check), **Screen** (front app, on screen, screens, attention, he sees, read, last glance), **Day** (calendar, events, reminder, on his mind, water, stretch, eye rest, nudges, remind me), **Mind** (mind, last thought, decision, last said/asked, questions, remembered, diary, growth), **System** (speed, database, talk to me, notes). | Picked "5 groups" over three. |
