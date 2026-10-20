'use strict';

// Togepi's mind: decides for himself whether to say something, and what.
//
//   observe ──► event log ──► wake up? ──► think (language model) ──► decide ──► speak / stay quiet
//      ▲                                                                              │
//      └───────────── your reaction and his own decision, written back ◄──────────────┘
//
// Waking up only means he *thinks*. Whether he speaks comes from the model's
// urge and his personality (a talkative Togepi speaks up more), and from how
// recently he spoke and how you reacted. The only hard rules are the rails:
// quiet in meetings, nothing while you're away, privacy, and a spam ceiling.
// See docs/mind/research/personality.md §9 and docs/mind/DECISIONS.md.
// No Electron imports, so it can be unit tested.

const P = require('./personality');
const T = require('./thinker');
const privacy = require('./privacy');
const { EventLog } = require('./events');
const { readEvents, journalDue, MEMORY } = require('./memory');
const { writeDay } = require('./journal');

const MIND = {
  gapUnprompted: 60, // s: rail, at most one line a minute on his own
  gapInteractive: 6, // s: rail, when you're playing with him
  observeThinkGap: 30, // s between thinks about what you're doing
  heartbeatMin: 240, // s: he also thinks now and then on his own
  heartbeatMax: 480,
  reactionWindow: 25, // s after speaking to see how you react
  recentEvents: 14, // log entries in each prompt
  recentDecisions: 6,
  // Speaking threshold: base - talk * talkativeness, lower when you're
  // interacting, higher right after speaking and after being ignored.
  base: 0.8,
  talk: 0.4,
  interactiveBonus: 0.25,
  recencyPenalty: 0.3,
  recencyTau: 90, // s
  ignoredPenalty: 0.08, // per line in a row you ignored (max 3)
  journalCheckEvery: 600, // s between checks whether his diary is due
  endOfDayHour: 18, // from this hour, being away for a while ends his day
  endOfDayAway: 600, // s away
  privacyThreshold: 0.5, // decision model's "this is sensitive" probability that blocks (tested: normal pages ≈ 0.01, sensitive ≥ 0.69)
};

// What he says when he notices you changed his personality, if the language
// model isn't available.
const FEEL_DIFFERENT = 'Huh? I feel… different!';

// Companion events (src/main/companion.js) that mean you did something with
// him, as he'd describe them. Each one wakes him up to think.
const INTERACTIONS = {
  heart: 'Sushant petted you.',
  throw: 'Sushant picked you up and threw you!',
  drop: 'Sushant picked you up and put you down.',
  angry: "You got angry because Sushant keeps throwing you around.",
  wake: 'Sushant woke you up.',
  welcomeBack: 'Sushant came back after being away.',
  goodMorning: 'You see Sushant for the first time today.',
  hello: 'You see Sushant for the first time today.',
  waterDone: 'Sushant drank some water like you asked.',
  stretchDone: 'Sushant took a stretch break like you asked.',
  bedtimeDone: 'Sushant said he will go to bed.',
  nudgeLater: 'Sushant ignored your reminder.',
  gaveUp: 'You asked Sushant to play but he never answered, so you gave up.',
  thatWasFun: 'You just finished playing with Sushant.',
  tttYouWin: 'Sushant beat you at tic-tac-toe.',
  tttIWin: 'You beat Sushant at tic-tac-toe!',
  tttDraw: 'Your tic-tac-toe game with Sushant was a draw.',
  gotBall: 'You fetched the ball Sushant threw.',
};
// Interactions that are also a reaction to what he just said.
const REACTIONS = { heart: 'petted', throw: 'threw' };

/** A window title for his log and prompt: no email addresses, not too long. */
function cleanTitle(title) {
  const t = String(title || '')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '(email address)')
    .replace(/\s+/g, ' ')
    .trim();
  return t.slice(0, 120) || null;
}

class Mind {
  /**
   * @param {object} opts
   * @param {object} [opts.engine]      { ready, canDecide, think({system,user,schema}), decide(state, questions) }
   * @param {object} opts.personality   see personality.js
   * @param {EventLog} [opts.log]
   * @param {() => object} opts.getSelf { band, needs, state, hour, quiet, away, asleep, busy }
   * @param {(s: {text, action, band}) => void} opts.onSpeak
   * @param {() => object} [opts.getBlocklist] { apps, sites, words }
   * @param {() => number} [opts.now] ms epoch
   * @param {() => number} [opts.rng]
   * @param {object} [opts.memory]      long-term memory (memory.js), Phase 2
   * @param {string} [opts.eventsFile]  events.jsonl, read when his diary is due
   */
  constructor(opts) {
    this.engine = opts.engine || null;
    this.personality = opts.personality || P.defaultPersonality();
    this.now = opts.now || (() => Date.now());
    this.rng = opts.rng || Math.random;
    this.log = opts.log || new EventLog({ now: this.now });
    this.getSelf = opts.getSelf;
    this.onSpeak = opts.onSpeak;
    this.getBlocklist = opts.getBlocklist || (() => ({}));
    this.enabled = true;
    this.thinking = false;
    this.pending = null; // the trigger waiting for the current think to finish
    this.lastSpokeAt = -Infinity;
    this.lastObserveThink = -Infinity;
    this.nextHeartbeat = this.now() + this.heartbeatDelay();
    this.awaiting = null; // { entry, until } the line whose reaction we're waiting for
    this.ignoredStreak = 0;
    this.lastObservation = null;
    this.privacyCache = new Map();
    this.lastThought = null; // for the brain view
    this.lastDecision = null;
    this.memory = opts.memory || null;
    this.eventsFile = opts.eventsFile || null;
    this.lastRecalled = [];
    this.writingJournal = false;
    this.lastJournal = null; // { day, at } or { error }
    this.nextJournalCheck = this.now() + 60 * 1000; // a minute after starting (models loading)
    this.view = null; // windows in use (Phase 3)
    this.reading = null; // what he last read on the window you're looking at
    this.lastLook = null;
  }

  heartbeatDelay() {
    return (MIND.heartbeatMin + (MIND.heartbeatMax - MIND.heartbeatMin) * this.rng()) * 1000;
  }

  setEnabled(on) {
    this.enabled = !!on;
  }

  // ------------------------------------------------------------ inputs

  /**
   * What's on your screen: { app, bundle, title, url, private }. Recorded when
   * it changes; private things only as "something private".
   */
  async observe(o) {
    if (!o || !o.app) return;
    // Phase 3: the other windows in use (typing / cursor / also open), and
    // what he read on the one you're looking at. Kept in memory only.
    if (o.view) this.view = this.cleanView(o.view);
    if (o.reading !== undefined) this.reading = o.reading;
    const key = `${o.app}|${o.title || ''}|${o.url || ''}|${o.private ? 1 : 0}`;
    if (this.lastObservation === key) return;
    this.lastObservation = key;
    let blocked = privacy.check(o, this.getBlocklist()).blocked;
    if (!blocked) blocked = await this.modelSaysPrivate(o);
    if (this.lastObservation !== key) return; // something newer arrived while checking
    const prev = this.log.last(['observe']);
    const entry = blocked
      ? { kind: 'observe', private: true }
      : { kind: 'observe', app: o.app, title: cleanTitle(o.title), site: privacy.domainOf(o.url), ...(o.screen ? { screen: o.screen } : {}), ...(o.via ? { via: o.via } : {}) };
    if (blocked) this.reading = null;
    if (prev && prev.private && entry.private) return; // still private: nothing new to note
    const added = this.log.add(entry);
    if (blocked) return;
    // Something new on your screen: a chance to think (not necessarily speak).
    const t = this.now();
    if (t - this.lastObserveThink >= MIND.observeThinkGap * 1000) {
      this.lastObserveThink = t;
      this.wake({ kind: 'observe', text: `Sushant switched to ${entry.app}${entry.title ? `: "${entry.title}"` : ''}.`, interactive: false, seen: added });
    }
  }

  /** The windows you're using, for his prompt: private ones without details. */
  cleanView(view) {
    const clean = (w) => {
      if (!w) return null;
      if (w.private || privacy.check({ app: w.app, title: w.title, url: w.url }, this.getBlocklist()).blocked) return { private: true, screen: w.screen || null };
      return { app: w.app, title: cleanTitle(w.title), site: privacy.domainOf(w.url), screen: w.screen || null };
    };
    return { typing: clean(view.typing), cursorOn: clean(view.cursorOn), via: view.via || 'typing', others: (view.others || []).map(clean).filter(Boolean) };
  }

  /** The windows in use changed but your attention didn't move (no new thought). */
  setView(view) {
    this.view = this.cleanView(view);
  }

  /** A newer reading of the window you're still looking at (no new thought for it). */
  setReading(reading) {
    this.reading = reading;
  }

  /** Ask the decision model about anything the privacy rules let through (cached per window). */
  async modelSaysPrivate(o) {
    if (!this.engine || !this.engine.canDecide) return false;
    const key = `${o.app}|${o.title || ''}|${privacy.urlKey(o.url)}`;
    if (this.privacyCache.has(key)) return this.privacyCache.get(key);
    let blocked = false;
    try {
      const state = `App: ${o.app}. Window: ${o.title || '(no title)'}. Site: ${privacy.domainOf(o.url) || '(none)'}.`;
      const a = await this.engine.decide(state, { sensitive: privacy.MODEL_QUESTION });
      const p = a && a.sensitive && a.sensitive.probabilities;
      blocked = !!p && Number(p.A) >= MIND.privacyThreshold;
    } catch {
      blocked = false; // the rules already passed it
    }
    if (this.privacyCache.size > 500) this.privacyCache.clear();
    this.privacyCache.set(key, blocked);
    return blocked;
  }

  /** You did something with him (petted, threw, played…). Always wakes him. */
  interact(text) {
    this.log.add({ kind: 'interact', text });
    this.wake({ kind: 'interact', text, interactive: true });
  }

  /** Companion events from one frame: the ones that are interactions wake him (petting only once a while). */
  companionEvents(events) {
    for (const e of events) {
      if (REACTIONS[e]) this.reacted(REACTIONS[e]);
      if (!INTERACTIONS[e]) continue;
      if (e === 'heart') {
        const t = this.now();
        if (t - (this.lastPetNoted || -Infinity) < 15000) continue; // one long pet, not twenty
        this.lastPetNoted = t;
      }
      this.interact(INTERACTIONS[e]);
    }
  }

  /** How you reacted to what he just said: 'clicked' | 'petted' | 'threw'. */
  reacted(kind) {
    const a = this.awaiting;
    if (!a) return;
    this.awaiting = null;
    const words = { clicked: 'clicked the bubble', petted: 'petted you', threw: 'threw you' };
    a.entry.reaction = words[kind] || kind;
    this.ignoredStreak = 0;
    this.log.add({ kind: 'reaction', to: a.entry.text, reaction: a.entry.reaction });
  }

  /** You changed his personality in the editor: he notices. */
  setPersonality(p) {
    const changes = P.diff(this.personality, p);
    this.personality = p;
    if (!changes.length) return;
    const text = changes
      .slice(0, 4)
      .map((c) => `${c.label} ${c.to > c.from ? 'up' : 'down'} (${c.from} → ${c.to})`)
      .join(', ');
    this.log.add({ kind: 'changed', text });
    if (!this.engine || !this.engine.ready) {
      const trigger = { kind: 'changed', interactive: true };
      if (!this.blockedBy(trigger)) this.speak({ text: FEEL_DIFFERENT, action: 'curious' }, trigger);
      return;
    }
    this.wake({ kind: 'changed', text: `Something inside you just changed: ${text}. You notice you feel different.`, interactive: true });
  }

  // ------------------------------------------------------------ loop

  /** Call about once a second. */
  tick() {
    const t = this.now();
    if (t >= this.nextJournalCheck) {
      this.nextJournalCheck = t + MIND.journalCheckEvery * 1000;
      this.maybeWriteJournal();
    }
    if (this.awaiting && t >= this.awaiting.until) {
      this.awaiting.entry.reaction = 'ignored it';
      this.log.add({ kind: 'reaction', to: this.awaiting.entry.text, reaction: 'ignored it' });
      if (!this.awaiting.interactive) this.ignoredStreak = Math.min(3, this.ignoredStreak + 1);
      this.awaiting = null;
    }
    if (t >= this.nextHeartbeat) {
      this.nextHeartbeat = t + this.heartbeatDelay();
      const self = this.getSelf();
      if (!self.away && !self.quiet && !self.asleep) this.wake({ kind: 'heartbeat', text: 'Nothing special. You are just hanging around on the screen.', interactive: false });
    }
  }

  /**
   * Write his diary if a day is due: past days he hasn't written about yet, or
   * today once you've been away for a while in the evening.
   */
  async maybeWriteJournal() {
    if (!this.memory || !this.enabled || !this.engine || !this.engine.ready || this.writingJournal || this.thinking) return null;
    const self = this.getSelf();
    const endOfDay = !!self.away && (self.awayFor || 0) >= MIND.endOfDayAway && (self.hour == null || self.hour >= MIND.endOfDayHour);
    const events = this.eventsFile ? readEvents(this.eventsFile) : this.log.items;
    const due = journalDue(events, this.memory, { now: this.now(), endOfDay });
    if (!due) return null;
    this.writingJournal = true;
    try {
      const done = await writeDay(this.engine, this.memory, this.personality, due);
      this.lastJournal = done ? { day: due.day, at: this.now(), facts: done.facts.length, opinions: done.opinions.length } : { day: due.day, error: 'nothing usable' };
      return done;
    } catch (e) {
      this.lastJournal = { day: due.day, error: e.message };
      return null;
    } finally {
      this.writingJournal = false;
    }
  }

  /** Something worth thinking about. Only one think runs at a time; the newest waits. */
  wake(trigger) {
    if (!this.enabled || !this.engine || !this.engine.ready) return;
    const self = this.getSelf();
    if (self.away || self.quiet) return;
    if (this.thinking || this.writingJournal) {
      // Keep an interactive trigger over a passive one.
      if (!this.pending || trigger.interactive || !this.pending.interactive) this.pending = trigger;
      return;
    }
    this.think(trigger);
  }

  async think(trigger) {
    this.thinking = true;
    try {
      const t = this.now();
      const events = this.log.recent(MIND.recentEvents, ['observe', 'interact', 'changed']);
      const decisions = this.log.recent(MIND.recentDecisions, ['said', 'silent']);
      const self = this.getSelf();
      const screen = this.log.last(['observe']);
      const reading = screen && !screen.private && this.reading && this.reading.app === screen.app ? this.reading : null;
      const memories = this.recall(trigger, screen, reading);
      const user = T.situationPrompt({ trigger, self, screen, view: this.view, reading, memories, events: [...events, ...decisions], now: t });
      const recentLines = this.log.recent(10, ['said']).map((e) => e.text);
      const notes = this.memory ? this.memory.notes.slice(0, MEMORY.notesChars) : '';
      const image = reading && reading.picture && this.engine.canSee ? reading.picture : null;
      this.lastLook = reading ? { app: reading.app, chars: reading.text ? reading.text.length : 0, picture: !!image, skipped: reading.skipped || null, at: reading.at } : null;
      const raw = await this.engine.think({ system: T.systemPrompt(this.personality, notes), user, schema: T.SCHEMA, image });
      const thought = T.parseThought(raw, recentLines);
      if (!thought) return;
      this.lastThought = { ...thought, trigger: trigger.kind, at: this.now() };
      await this.decide(thought, trigger);
    } catch (e) {
      this.lastThought = { error: e.message, trigger: trigger.kind, at: this.now() };
    } finally {
      this.thinking = false;
      const next = this.pending;
      this.pending = null;
      if (next) this.wake(next);
    }
  }

  /** Long-term memories that fit what's going on (Phase 2). */
  recall(trigger, screen, reading = null) {
    if (!this.memory) return [];
    const query = [
      trigger.text,
      screen && !screen.private ? `${screen.app} ${screen.title || ''} ${screen.site || ''}` : '',
      reading && reading.text ? reading.text.slice(0, 300) : '',
    ].join(' ');
    this.lastRecalled = this.memory.recall(query);
    return this.lastRecalled;
  }

  /** The bar his urge has to clear to speak right now. */
  threshold(trigger) {
    const since = (this.now() - this.lastSpokeAt) / 1000;
    let th = MIND.base - MIND.talk * P.talkativeness(this.personality);
    if (trigger.interactive) th -= MIND.interactiveBonus;
    th += MIND.recencyPenalty * Math.exp(-since / MIND.recencyTau);
    th += MIND.ignoredPenalty * this.ignoredStreak;
    return Math.max(0.05, Math.min(0.95, th));
  }

  /** A thought about something on your screen that you've already left: too late to say it. */
  stale(trigger) {
    return trigger.seen && this.log.last(['observe']) !== trigger.seen ? 'you already moved on' : null;
  }

  /** The rails: reasons he must not speak right now, or null. */
  blockedBy(trigger) {
    const self = this.getSelf();
    if (!this.enabled) return 'mind off';
    if (self.quiet) return 'quiet (meeting)';
    if (self.away) return 'you are away';
    if (self.asleep) return 'asleep';
    if (self.busy) return 'busy showing something';
    const since = (this.now() - this.lastSpokeAt) / 1000;
    if (since < (trigger.interactive ? MIND.gapInteractive : MIND.gapUnprompted)) return 'spoke too recently';
    return null;
  }

  async decide(thought, trigger) {
    const th = this.threshold(trigger);
    const rail = this.blockedBy(trigger) || this.stale(trigger);
    const wants = thought.urge >= th && thought.lines.length > 0;
    this.lastDecision = { urge: thought.urge, threshold: th, rail, at: this.now() };
    if (!wants || rail) {
      this.log.add({ kind: 'silent', thought: thought.thought, urge: thought.urge, why: rail || 'not worth saying' });
      return;
    }
    const text = await this.pickLine(thought, trigger);
    // The world may have changed while choosing (you joined a meeting, moved on…).
    if (this.blockedBy(trigger) || this.stale(trigger)) return;
    this.speak({ text, action: thought.action }, trigger, thought);
  }

  /** The decision model picks the line that fits him best; without it, the first one. */
  async pickLine(thought, trigger) {
    if (thought.lines.length < 2 || !this.engine.canDecide) return thought.lines[0];
    const keys = 'ABCD';
    const criteria = {};
    thought.lines.forEach((l, i) => {
      criteria[keys[i]] = l;
    });
    const traits = P.describe(this.personality, 6).join(', ');
    const state = `Togepi is a baby Pokémon companion on Sushant's screen. He is ${traits}. ${trigger.text} He is thinking: "${thought.thought}"`;
    try {
      const a = await this.engine.decide(state, {
        line: { type: 'choice', instructions: 'Which line would Togepi most likely say right now?', criteria },
      });
      const k = a && a.line && a.line.choice;
      const i = keys.indexOf(k);
      return i >= 0 && thought.lines[i] ? thought.lines[i] : thought.lines[0];
    } catch {
      return thought.lines[0];
    }
  }

  speak({ text, action }, trigger, thought = null) {
    this.lastSpokeAt = this.now();
    const entry = this.log.add({ kind: 'said', text, action: action || 'none', trigger: trigger.kind, thought: thought ? thought.thought : null });
    this.awaiting = { entry, until: this.now() + MIND.reactionWindow * 1000, interactive: !!trigger.interactive };
    this.onSpeak({ text, action: action || 'none', band: this.getSelf().band });
  }

  /** For the brain view. */
  status() {
    const said = this.log.last(['said']);
    return {
      enabled: this.enabled,
      engine: this.engine ? this.engine.status() : 'no engine',
      sees: this.log.last(['observe']),
      view: this.view || null,
      looked: this.lastLook || null,
      recalled: this.lastRecalled.map((m) => m.text),
      journal: this.writingJournal ? 'writing…' : this.lastJournal,
      lastSaid: said ? { text: said.text, reaction: said.reaction || null } : null,
      thinking: this.thinking,
      lastThought: this.lastThought,
      lastDecision: this.lastDecision,
      talkativeness: P.talkativeness(this.personality),
    };
  }
}

module.exports = { Mind, MIND, FEEL_DIFFERENT, INTERACTIONS };
