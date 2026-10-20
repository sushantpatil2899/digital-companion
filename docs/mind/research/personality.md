# Research: how to represent, store and grow a personality

Written 2026-10-19 for Phase 1 of [PLAN.md](../PLAN.md). Sushant asked for a
well-researched basis before choosing Togepi's personality: what published
work says about describing personality in numbers, which traits exist, and how
games and AI characters store personalities in files. Nothing here is decided
yet; decisions go in [DECISIONS.md](../DECISIONS.md).

## 1. Summary

- **One trait list is not enough.** Psychology and game AI agree that a
  personality has several layers that change at different speeds. Traits
  ("warm", "anxious") change over months. Values and motives ("cares about
  others", "loves excitement") change over years. Relationships, such as how
  he feels about *you*, change over days. Mood changes over hours, and emotions
  over seconds.
- **The standard way to put traits into numbers is the Big Five (OCEAN), with
  30 facets.** It is what almost all computational and LLM-personality research
  uses. HEXACO adds a sixth dimension, Honesty-Humility, which captures
  sincere/modest versus sly/arrogant. That is useful for "sassy".
- **The standard way to put mood into numbers is PAD:** Pleasure, Arousal,
  Dominance. There is a published formula that turns Big Five traits into a
  default mood (ALMA). Emotions use the OCC model of 22 emotion types.
- **Games go wide.** Dwarf Fortress rates every character on about 50 facets
  and 30 values, each 0–100. Memories shift those numbers over time, and only
  extreme values are put into words. That is the closest existing match to
  "cover as many traits as possible, and let experience change them".
- **The usual file format for LLM characters is text only.** Character Card V2
  and V3 store a description, personality, scenario and example dialogue as
  prose, with no numbers, so they can't grow in a controlled way. The best
  design combines both: numbers for the model to track, prose for the LLM to
  read.
- **LLMs can play a numeric personality.** Studies show instruction-tuned LLMs
  reliably express a Big Five profile when given trait descriptions at graded
  levels. Fine-tuning does it better than prompting. Small 8B models are less
  reliable than the large models those studies used, and this is a real limit.

## 2. Layers of a personality (the backbone)

Two well-known frameworks give the same shape:

- **McAdams' three levels of personality** ("A New Big Five", McAdams & Pals,
  2006):
  1. *Dispositional traits* (Big Five)
  2. *Characteristic adaptations*: goals, values, motives, coping
  3. *Narrative identity*: the story a person tells about themselves
- **ALMA**, a layered model of affect for virtual characters (Gebhard, 2005):
  personality is long-term, mood is medium-term and emotions are short-term.
  Personality sets the default mood, events cause emotions, emotions push the
  mood, and the mood drifts back to its default. ALMA's authors write
  personality profiles in an XML file (AffectML), which is prior art for
  storing personality in files.

Put together, with what a companion additionally needs (a relationship with
one specific person, and a speaking style):

| Layer | What it is | Changes over | Published basis |
|---|---|---|---|
| Traits | Who he is, e.g. warm, anxious, curious | months (slowly, capped) | Big Five, 30 facets; HEXACO |
| Values / motives | What he cares about | very slowly | Schwartz's 19 values |
| Voice / style | How he talks: humour, sass, length | rarely (set by you) | Humor Styles (Martin et al., 2003) + character cards |
| Relationship | How he feels about Sushant | days–weeks | Interpersonal circumplex (warmth × dominance); game relationship meters |
| Mood | Background feeling | hours | PAD (Mehrabian); ALMA |
| Emotions | Reactions to events | seconds–minutes | OCC (22 emotion types) |
| Self-story | His view of himself and his memories | grows daily | Narrative identity (McAdams); Generative Agents reflection |

Togepi already has the bottom of this stack: `src/main/brain.js` has needs and
moods. The plan is to add the layers above it.

## 3. Trait models compared

| Model | Dimensions | Facets | Use for Togepi |
|---|---|---|---|
| **Big Five / OCEAN** (NEO-PI-R; public-domain version IPIP-NEO) | 5 | 30 (6 each) | Best-studied; used by nearly all LLM-personality papers. **Recommended base.** |
| **HEXACO** | 6 (adds Honesty-Humility) | 24 + altruism | Honesty-Humility covers sincere/modest vs. sly/boastful, which the Big Five blurs. |
| Eysenck PEN | 3 | – | Too coarse. |
| MBTI (16 types) | 4 either/or types | – | Popular, but puts people in boxes and is weak scientifically. Not suitable for gradual growth. |
| Dwarf Fortress | ~50 facets + ~30 values, 0–100 | – | Game prior art for breadth and change over time. |

**Big Five facets** (the NEO-PI-R names; IPIP-NEO has public-domain
equivalents):

- **Openness:** fantasy, aesthetics, feelings, actions (trying new things),
  ideas, values (open-mindedness)
- **Conscientiousness:** competence, order, dutifulness, achievement striving,
  self-discipline, deliberation
- **Extraversion:** warmth, gregariousness, assertiveness, activity,
  excitement-seeking, positive emotions
- **Agreeableness:** trust, straightforwardness, altruism, compliance, modesty,
  tender-mindedness
- **Neuroticism:** anxiety, angry hostility, depression, self-consciousness,
  impulsiveness, vulnerability

**HEXACO Honesty-Humility facets:** sincerity, fairness, greed avoidance,
modesty.

How your words map onto facets:

| Your word | Facets / layers |
|---|---|
| kind, sweet | altruism ↑, tender-mindedness ↑, warmth ↑ |
| nice | trust ↑, compliance ↑, straightforwardness ↑ |
| sassy | assertiveness ↑, compliance ↓, modesty ↓, plus **humour style** (teasing) in the voice layer |
| sassy yet kind | the above, with altruism and tender-mindedness kept high |
| rude | straightforwardness ↓, compliance ↓, angry hostility ↑ |
| protective | tender-mindedness ↑, assertiveness ↑, anxiety (on your behalf) ↑, plus the relationship layer |
| playful | excitement-seeking ↑, positive emotions ↑, fantasy ↑ |
| clingy | gregariousness ↑, vulnerability ↑, high attachment in the relationship layer |

Key point: words like "sassy" and "playful" are a **mix of traits and speaking
style**. That is why a voice layer is needed on top of the traits.

## 4. Values and motives: Schwartz's 19 values

From the refined theory (Schwartz et al., 2012). The values form a circle, so
neighbouring values agree and opposite values conflict:

self-direction (thought), self-direction (action), stimulation, hedonism,
achievement, power (dominance), power (resources), face, security (personal),
security (societal), tradition, conformity (rules), conformity
(interpersonal), humility, benevolence (dependability), benevolence (caring),
universalism (concern), universalism (nature), universalism (tolerance).

For Togepi this answers "what does he care about", e.g. benevolence-caring →
he worries when you overwork; stimulation/hedonism → he pushes for play. Values
also give him **opinions**, which make comments feel personal.

## 5. Mood and emotion in numbers

- **PAD** (Mehrabian): three axes from −1 to 1, Pleasure, Arousal and
  Dominance. Every mood is a point: "relaxed" is +P −A +D, "anxious" is −P +A
  −D, "bored" is −P −A −D.
- **Default mood from traits** (as ALMA uses it, from Mehrabian 1996, where
  S = emotional stability = −Neuroticism):
  - P = 0.21·E + 0.59·A + 0.19·S
  - A = 0.15·O + 0.30·A − 0.57·S
  - D = 0.25·O + 0.17·C + 0.60·E − 0.32·A

  Verify the coefficients against the paper before relying on them.
- **OCC** (Ortony, Clore & Collins): 22 emotion types (joy, distress, hope,
  fear, pride, shame, admiration, reproach, gratitude, anger, ...), each
  triggered by how an event bears on goals, standards or tastes. ALMA turns
  each OCC emotion into a push on PAD.
- **Inworld AI** (a commercial character engine) uses a free-text personality,
  about 10 personality/mood sliders and 18 emotion types. That is evidence that
  "prose + sliders + emotion state" is the industry pattern.

## 6. How games and AI characters store personality

- **Dwarf Fortress** (Tarn Adams, design paper):
  - A few distinct traits "would not work" for characters who must respond to
    many situations, so it uses about 50 facets and about 30 values on a 0–100
    scale.
  - Species set the baselines.
  - Memories can shift facets over time.
  - Only values outside 40–60 are mentioned in text, using 7 levels of
    descriptions such as "quick to love" or "slow to love".

  Lesson: broad, numeric, experience-driven, and **only extremes are put into
  words**, which keeps prompts short for a small model.
- **The Sims:**
  - The Sims 1–2 used point sliders (neat, outgoing, active, playful, nice).
  - The Sims 3–4 switched to picking about 5 traits from a list of 60 or more.
  - Players felt trait-only Sims were too similar.

  Lesson: use continuous numbers, with labels derived from them.
- **Character Card V2/V3** (the community format used by SillyTavern and
  others):
  - JSON with a name, description, personality, scenario, first message,
    example dialogue, system prompt, tags and a "character book" (lorebook).
  - The JSON is embedded in a PNG.

  Lesson: the de-facto file format for LLM characters is prose plus example
  lines. Example lines are very effective at fixing a voice.
- **Generative Agents** (Park et al., 2023, Stanford):
  - Memory stream: every observation is stored.
  - Retrieval scores each memory by recency, importance (rated 1–10 by the
    LLM) and relevance.
  - Reflection is triggered when the summed importance of recent events passes
    a threshold (150), about 2–3 times a day. The agent asks itself questions
    about recent memories and stores the answers as higher-level memories.
  - This is the template for our memory (Phase 2) and growth (Phase 4).

## 7. What the LLM research says (and the honest limits)

- **Serapio-García, Safdari et al., 2023, "Personality Traits in Large Language
  Models":** large instruction-tuned models show reliable, valid Big Five
  profiles. These can be **shaped** by describing each trait at graded levels
  (e.g. "extremely", "very", "a bit") and change the model's generated text
  accordingly.
- **PersonaLLM** (Jiang et al., NAACL 2024 Findings): LLM personas given a Big
  Five profile write text with the linguistic markers humans show, e.g.
  extraverts use more social words.
- **Big5-Chat** (Li et al., ACL 2025): **fine-tuning** on personality-grounded
  dialogue expresses traits better than prompting. This is a possible Phase 5
  upgrade.
- **Limits:**
  - Those results come mostly from large models. An 8B model follows a profile
    less reliably, so his personality will be more consistent when the prompt
    is short and concrete: extremes only, plus example lines.
  - "Identity drift" over long conversations is a known open problem. It is
    countered by restating the core identity in every prompt and by memory
    (Tan et al., ACL 2025, on reflective memory for consistent personas).

## 8. Recommendation: Togepi's personality file

A layered file that a person can read and the model can track. Numbers live in
YAML front matter; prose lives below it. Example (values are placeholders, not
his personality):

```markdown
---
version: 1
traits:            # 0-100, 50 = average. Big Five facets + HEXACO Honesty-Humility
  openness:          { fantasy: 80, aesthetics: 60, feelings: 70, actions: 75, ideas: 55, values: 60 }
  conscientiousness: { competence: 45, order: 30, dutifulness: 55, achievement: 40, self_discipline: 30, deliberation: 35 }
  extraversion:      { warmth: 85, gregariousness: 80, assertiveness: 60, activity: 75, excitement_seeking: 80, positive_emotions: 85 }
  agreeableness:     { trust: 70, straightforwardness: 65, altruism: 85, compliance: 40, modesty: 45, tender_mindedness: 85 }
  neuroticism:       { anxiety: 45, angry_hostility: 25, depression: 20, self_consciousness: 30, impulsiveness: 70, vulnerability: 40 }
  honesty_humility:  { sincerity: 80, fairness: 75, greed_avoidance: 60, modesty: 45 }
values:            # Schwartz 19, 0-100
  benevolence_caring: 90
  stimulation: 80
  hedonism: 75
  # ...
voice:
  humour: { affiliative: 80, self_enhancing: 50, aggressive: 30, self_defeating: 20 }  # Humor Styles
  sass: 55
  max_words: 8
  examples:
    - "Applying again? You've got this."
    - "Three hours of code. Snack break?"
relationship:      # changes fastest of the stored layers
  affection: 60
  trust: 50
  familiarity: 10
change:            # how much each layer may move per weekly reflection
  traits: 3        # points per facet, max
  values: 1
  relationship: 10
---

# Who I am
(short prose self-description, written by Sushant at first and later grown by
reflection: his narrative identity)
```

How it's used:

1. **Prompting:**
   - Turn the numbers into words with Dwarf Fortress-style bands.
   - Only facets far from 50 are mentioned ("very warm, quick to tease, easily
     excited, not tidy").
   - Add the voice examples, current PAD mood, relationship and recent memories.
2. **Default mood:** derived from traits with the ALMA/Mehrabian formula and
   fed into `brain.js`.
3. **Growth (Phase 4):**
   - Weekly reflection proposes changes.
   - Code clamps them to the `change` limits.
   - Each change is logged with the reason, so you can see why he changed.
4. **History:** old versions are kept so a personality can be rolled back.

Open choices for Sushant:

- Trait base:
  - **A)** Big Five 30 facets + 4 Honesty-Humility facets = 34 facets
    (recommended).
  - **B)** HEXACO only (25).
  - **C)** Big Five 5 domains only (simple, but shallow).
- Include Schwartz values? (recommended: yes)
- 0–100 scale like Dwarf Fortress? (recommended: yes)
- Who sets the starting numbers:
  - you set sliders,
  - you describe him and the model proposes numbers for you to adjust, or
  - you pick a preset.

## 9. The decision loop: he decides when and what to speak

Sushant's requirement: no hard-coded "app changed → comment". He decides
himself, based on personality, what he observes and everything he decided
before. Closest published work: **"Proactive Conversational Agents with Inner
Thoughts"** (Liu et al., CHI 2025):

- The agent keeps a hidden stream of thoughts running alongside the
  conversation.
- It speaks only when its motivation to share a thought passes a threshold.
- Motivation is scored on factors like relevance, urgency and coherence.
- Users rated it more human-like and better at turn-taking than reactive or
  always-on agents.

Proposed loop:

```
observe ──► event log ──► wake-up? ──► think (LLM) ──► decide ──► act / stay silent
   ▲                                                                   │
   └────────── your reaction + his own decision, written back ◄─────────┘
```

1. **Observe** (always, cheap, no model): app/site/tab title changes, idle and
   away, petting, games, calendar, time of day. Everything goes into the event
   log.
2. **Wake-up** decides only *whether he thinks*, never what he says:
   - Always wake when you interact with him: pet, click, game events, a reply
     to something he said. Conversations continue.
   - Wake when something notable changes, such as a new site, coming back, or
     a long session.
   - A slow heartbeat (every few minutes) lets him think even when nothing
     happened.
3. **Think:** the LLM gets his personality, mood, relationship, recent events,
   his **last decisions** (what he said or chose not to say, and when) and
   **your reactions** to them (petted him, ignored the bubble, closed it,
   replied). It returns structured output:
   `{ thought, urge_to_speak (0-1), lines: [up to 4 candidates], action }`.
4. **Decide** (code):
   - Pick the best line and compare the urge with a threshold.
   - The threshold comes from **his personality**: a gregarious, impulsive
     Togepi talks more; a reserved one less.
   - It is raised by how recently he spoke and how you reacted last time.
5. **Act or stay silent.** Both are written to the log as a decision. The next
   think step sees them. This is the feedback loop.
6. **Safety rails (the only hard rules):**
   - Quiet and meeting modes.
   - The privacy blocklist.
   - A hard ceiling so a bug can never make him spam (e.g. at most one
     unprompted line a minute).

   Inside the rails, everything is his decision.

His thoughts can also be logged (not shown), which makes his behaviour
explainable, and will feed Phase 2's journal.

## 10. The "fast classifier" idea (GLiClass; see §11 for JEPA)

Sushant recalled a newer, much faster model type that scores a set of options
with confidence. The best match is **GLiClass** (Knowledgator, 2025):

- A small zero-shot classifier: about 150M parameters for the base model, with
  Apache-2.0 models.
- It scores any list of labels against a text in **one pass**.
- Its paper reports almost no slowdown as the label count grows, unlike
  cross-encoders.

A related type is the **listwise reranker**: Jina Reranker v3, 0.6B
parameters, scores up to 64 candidates at once. Its licence is
non-commercial-only.

Assessment:

- **Generate 4 candidates, then score them** is a valid, known pattern
  (best-of-N reranking).
  - The catch: zero-shot classifiers are good at topic and sentiment, and
    weaker at nuanced judgements like "does this sound like Togepi?".
  - For that, the LLM rating its own candidates is likely better.
  - A small embedding model cheaply rejects lines too similar to recent ones,
    so he doesn't repeat himself.
- **Where a fast classifier fits best is the privacy gate and the wake-up
  step:**
  - Classify each window/tab title (and later OCR text) into labels like
    *payment/checkout, banking, password/login, medical, private chat, job
    hunting, coding, entertainment*.
  - These run in milliseconds, before anything reaches the LLM.
  - This is exactly the "block itself automatically as soon as it sees a
    payment thing" behaviour, without a hand-made list of websites.
- **Feasibility caveat:** GLiClass is published for Python. Running it inside
  the Electron app needs an ONNX export and `onnxruntime-node`. This needs a
  spike before committing to it. Fallback: the same 8B LLM does the
  classification with a short prompt (slower, still local).

Recommendation:

- **Phase 1:** the LLM produces candidates and rates them, plus a repetition
  filter. Spike GLiClass for the privacy gate.
- **Later:** if it works, also use it to pre-filter which events are worth a
  think step.

## 11. JEPA-style models (wrong guess: Sushant meant Jev, see §12)

Added 2026-10-20. Sushant clarified that he meant **JEPA**-type models, not
GLiClass. He mentioned the paid one and open-source names he recalled ("Laya",
"Kev", "NanoJEV", "OpenJEV", "SEMIF"). Of those, **LeJEPA** is confirmed to
exist. The others could not be found yet and need a link from Sushant.

**What JEPA is:**
- JEPA stands for Joint Embedding Predictive Architecture. It comes from Yann
  LeCun and Meta FAIR.
- It does **not** generate text token by token. It predicts an *embedding*: a
  vector that stands for the meaning of the answer.
- To choose among options, each option is embedded too, and they are scored by
  how close they are to the prediction. That gives a confidence per option in
  one step. This is exactly Sushant's idea.

Relevant models:

| Model | What it is | Usable for Togepi now? |
|---|---|---|
| **VL-JEPA** (Meta, Dec 2025; ICLR 2026) | Vision-language model, 1.6B parameters. Predicts text embeddings from video or images. Supports open-vocabulary classification, retrieval and multiple-choice question answering without generating text. Its "selective decoding" needs about 2.85× fewer decoding operations on streams. | No official weights or licence found. When available, it fits **Phase 3 (understanding the screen)** better than Phase 1. |
| **LLM-JEPA** (Huang, LeCun, Balestriero; ICLR 2026) | A JEPA *training objective* for normal text LLMs (Llama, Gemma, ...). Improves fine-tuning quality. | Not a fast classifier: it makes training slower and doesn't speed up running the model. Possibly relevant to Phase 5 fine-tuning. |
| **LeJEPA** (galilai-group/lejepa) | Theory and a simpler training recipe (SIGReg) for JEPAs. | A research method, not a ready model. |
| I-JEPA, V-JEPA 2 / 2.1 (Meta) | Image and video encoders with released weights. | Vision only, no text options. |

**Honest assessment:**
- There is no ready-made, open, *text* JEPA classifier today that could score
  Togepi's candidate lines or classify window titles.
- The **mechanism** can be reproduced now with a small open text embedding
  model:
  1. Embed the situation (or "lines that sound like Togepi in this mood").
  2. Embed each candidate line or label.
  3. Score them by cosine similarity, in milliseconds.

  It's JEPA-style scoring without JEPA training. It also covers the repetition
  filter (§10).

**Recommendation:**
- Build the "score a set of options" step as a **pluggable scorer** with one
  interface, `score(context, options) → confidences`.
- Phase 1 implementations:
  - (a) the LLM rates its own candidates;
  - (b) embedding similarity, for repetition and quick label checks.
- Swap in a JEPA model (VL-JEPA for screenshots in Phase 3, or a text JEPA if
  one is released openly) without changing the rest of the decision loop.

Extra sources:
- VL-JEPA paper: https://arxiv.org/abs/2512.10942
- VL-JEPA overview (TechTalks): https://bdtechtalks.com/2026/01/03/meta-vl-jepa-vision-language-model/
- LLM-JEPA paper: https://arxiv.org/abs/2509.14252
- awesome-jepa list (LeJEPA, V-JEPA 2, I-JEPA and others): https://github.com/AbdelStark/awesome-jepa

## 12. Decision models: Jev and Laya (what Sushant meant, confirmed)

Added 2026-10-20, after Sushant sent the link to Laya (laya-ai.com). "JEV" is
**Jev**, not JEPA. §11 was a wrong guess and is kept only for the record.

**Jev (TypeSafe AI)**
- A closed, paid "System One" **decision model**. It never generates text.
- You give it a typed question (a choice, a score or yes/no) plus context. It
  returns calibrated probabilities in about 70–500 ms.
- Price: about $0.042 per million input tokens, through an API only. No
  downloadable weights.
- It went viral in September and October 2026.

Not usable for Togepi: it's paid, online only, and has no local weights.

**Laya (Convai Innovations): the open alternative**
- `convaiinnovations/laya` on Hugging Face, **Apache-2.0**.
- 421M parameters: a ModernBERT-large encoder plus a small decision head.
  Context of 512 tokens (1024 for the `laya-typed-decisions` variant).
- A 322M multilingual checkpoint (mmBERT) also exists.
- Question types:
  - **choice**: pick one of N options;
  - **score**: place the input on an ordered scale;
  - **noul**: yes/no, with one calibrated probability.
- Answers in one forward pass (claimed ~33 ms). It can't hallucinate text
  because it only outputs probabilities over the options it is given.
- Reported runtimes:
  - ONNX export with INT8 quantisation and a TypeScript SDK that runs in the
    browser, per a third-party listing;
  - a community GGUF, `mys/laya-GGUF`.

  Both still need verifying.
- **Caveats** (from independent write-ups):
  - All benchmark numbers come from the vendor, with no paper.
  - On one benchmark the base checkpoint was near chance without fine-tuning.
  - Choices with many options (e.g. 77 labels) perform poorly.
  - **score** is its weakest question type.

  So use it for **few-option choices and yes/no questions**.

**Where Laya fits Togepi's decision loop (§9):**

| Step | Laya question | Type |
|---|---|---|
| Privacy gate | "Is this window/page about payment, banking, passwords or private chat?" | noul (yes/no), before anything reaches the LLM |
| Wake-up | "Would Togepi, with this personality and mood, want to react to this?" | noul. Cheap, so the 8B LLM only runs when it matters. |
| Pick a line | "Which of these 4 lines fits Togepi best right now?" | choice (4 options) |
| Pick an action | "Speak, do something (wave, sulk, invite), or stay quiet?" | choice |

This is the classic System 1 / System 2 split: Laya decides fast, and the LLM
thinks and writes only when needed. It also directly answers Sushant's idea of
the LLM writing ~4 candidates and a fast model scoring them.

**Risks and plan:**
- Laya's reference code is Python. Running it inside the Electron app needs
  the ONNX/INT8 export with `onnxruntime-node` (or the TypeScript SDK).
- Its zero-shot quality on our questions is unproven.
- **Phase 1 starts with a spike:** load Laya in Node, measure speed, and test
  it on a set of real Togepi decisions.
- If it's good, it becomes the decision layer. If not, the LLM rates its own
  candidates (slower). The interface `decide(question, options) →
  probabilities` stays the same either way.
- The dev container currently can't reach huggingface.co (network policy).
  Sushant needs to allow that host for the spike.

Extra sources:
- Laya model card: https://huggingface.co/convaiinnovations/laya
- Laya typed decisions: https://huggingface.co/convaiinnovations/laya-typed-decisions
- Laya GGUF (community): https://huggingface.co/mys/laya-GGUF
- Laya specs and caveats: https://systemonemodels.org/models/laya/
- Laya overview: https://innfactory.ai/en/ai-models/laya/
- Laya vs. Jev: https://medium.com/@visrow/what-is-laya-laya-vs-jev-with-live-demo-42c2ab494e02
- Jev explained: https://www.layer3labs.io/guides/jev-explained
- Jev pricing: https://openrouter.ai/typesafe/jev-1.13
- Jev funding (Tech Times): https://www.techtimes.com/articles/328875/20261013/typesafe-ai-raises-870m-jev-decision-model-that-never-generates-text.htm

## Sources

- ALMA, a layered model of affect (Gebhard, AAMAS 2005): https://alma.dfki.de/papers/aamas05.pdf
- A Survey and Computational Atlas of Personality Models (ACM): https://doi.org/10.1145/3828667
- Computational models of emotion for game NPCs: https://arxiv.org/pdf/2307.10031
- OCEAN personality in character motion (Neff et al.): https://www.cs.ucdavis.edu/~neff/papers/PERFORM_TOG.pdf
- Big Five vs. MBTI/Eysenck/HEXACO for personality-aware systems: https://arxiv.org/pdf/2106.03060
- Big Five vs. HEXACO facet structure (2023): https://econtent.hogrefe.com/doi/10.1027/1614-0001/a000305
- Refining the Theory of Basic Individual Values (Schwartz et al., 2012): https://avesis.tedu.edu.tr/yayin/5030e84d-d374-42d4-a46c-b6f7b2d08457/refining-the-theory-of-basic-individual-values
- Characterization and Emergent Narrative in Dwarf Fortress (Adams): https://wileywiggins.com//documents/dorf/Adams%20-%20Characterization%20and%20Emergent%20Narrative%20in%20Dwarf%20F.pdf
- Dwarf Fortress personality traits (wiki): https://dwarffortresswiki.org/index.php/Personality_Trait
- Personality generation in games (AIIDE): https://ojs.aaai.org/index.php/AIIDE/article/download/12973/12821
- Character Card V2 spec: https://github.com/malfoyslastname/character-card-spec-v2
- Character Card V3 export guide: https://blog.meganova.ai/how-to-export-your-character-as-a-ccv3-card-sillytavern-compatible
- Inworld personality and emotion docs: https://docs.inworld.ai/docs/tutorial-basics/personality-emotion/
- Generative Agents (Park et al., 2023): https://arxiv.org/pdf/2304.03442
- Personality Traits in Large Language Models (2023): https://arxiv.org/abs/2307.00184v1
- PersonaLLM (Jiang et al., NAACL 2024 Findings): https://ar5iv.labs.arxiv.org/html/2305.02547
- Big5-Chat (Li et al., ACL 2025): https://arxiv.org/html/2410.16491v2
- IPIP-NEO administered to LLMs (2024): https://www.arxiv.org/pdf/2402.01765
- Reflective memory for consistent personas (Tan et al., ACL 2025): https://arxiv.org/pdf/2503.08026
- Proactive Conversational Agents with Inner Thoughts (Liu et al., CHI 2025): https://arxiv.org/abs/2501.00383v2
- DiscussLLM: Teaching LLMs When to Speak (2025): https://arxiv.org/pdf/2508.18167
- GLiClass paper: https://arxiv.org/html/2508.07662v1
- GLiClass models: https://huggingface.co/knowledgator/gliclass-modern-base-v3.0
- Jina Reranker v3: https://arxiv.org/html/2509.25085v4
