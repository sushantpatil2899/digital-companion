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

const fs = require('fs');
const P = require('./personality');
const T = require('./thinker');
const privacy = require('./privacy');
const { EventLog } = require('./events');
const { readEvents, journalDue, MEMORY, dayString: memoryDay } = require('./memory');
const { writeDay } = require('./journal');
const { reflect } = require('./reflect');
const { weekOf } = require('./growth');

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
  questionWait: 30, // s he waits for you to click an answer to his question
  questionPauseAfter: 2, // questions ignored in a row…
  conversationGap: 10 * 60, // s between chat messages that start a new conversation
  chatHistory: 16, // earlier chat messages in each chat prompt
  ownAnswersKept: 20, // answers you wrote yourself, kept to learn from
  ownAnswersShown: 3, // of them, in his prompt when he may ask
  questionPause: 3600, // …and he stops asking for this long (s)
  privacyThreshold: 0.5, // decision model's "this is sensitive" probability that blocks (tested: normal pages ≈ 0.01, sensitive ≥ 0.69)
};

// What he says when he notices you changed his personality, if the language
// model isn't available.
const FEEL_DIFFERENT = 'Huh? I feel… different!';

const { INTERACTIONS } = require('./interactions');
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
   * @param {() => object} opts.getSelf { band, needs, state, hour, quiet, away, asleep, busy, watching }
   * @param {(s: {text, action, band}) => void} opts.onSpeak
   * @param {(q: {text, answers, action, band}) => void} [opts.onAsk] show a question with two answers
   * @param {() => object} [opts.getBlocklist] { apps, sites, words }
   * @param {() => number} [opts.now] ms epoch
   * @param {() => number} [opts.rng]
   * @param {object} [opts.memory]      long-term memory (memory.js), Phase 2
   * @param {string} [opts.eventsFile]  events.jsonl, read when his diary is due
   * @param {object} [opts.growth]      personality growth (growth.js), Phase 4
   * @param {(p: object) => void} [opts.onPersonality] his personality grew: save and show it
   * @param {string} [opts.chatFile]    today's chat (chat.json), Phase 8
   * @param {string} [opts.ownAnswersFile] answers you typed yourself (own-answers.json)
   */
  constructor(opts) {
    this.engine = opts.engine || null;
    this.personality = opts.personality || P.defaultPersonality();
    this.now = opts.now || (() => Date.now());
    this.rng = opts.rng || Math.random;
    this.log = opts.log || new EventLog({ now: this.now });
    this.getSelf = opts.getSelf;
    this.onSpeak = opts.onSpeak;
    this.onAsk = opts.onAsk || null;
    this.getBlocklist = opts.getBlocklist || (() => ({}));
    this.enabled = true;
    this.thinking = false;
    this.pending = null; // the trigger waiting for the current think to finish
    this.lastSpokeAt = -Infinity;
    this.lastObserveThink = -Infinity;
    this.nextHeartbeat = this.now() + this.heartbeatDelay();
    this.awaiting = null; // { entry, until } the line whose reaction we're waiting for
    this.ignoredStreak = 0;
    this.questionsIgnored = 0; // in a row
    this.askPausedUntil = -Infinity;
    this.askedAbout = undefined; // what you were doing (see currentThing) when he last asked
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
    this.growth = opts.growth || null;
    this.onPersonality = opts.onPersonality || (() => {});
    this.lastGrowth = null; // for the brain view
    this.toNotice = null; // he grew while you were away: think about it when you're back
    this.view = null; // windows in use (Phase 3)
    this.reading = null; // what he last read on the window you're looking at
    this.lastLook = null;
    this.chatFile = opts.chatFile || null;
    this.chatLog = this.readJson(this.chatFile, { day: null, messages: [] }); // today's chat
    this.lastChatAt = -Infinity;
    this.ownAnswersFile = opts.ownAnswersFile || null;
    this.ownAnswers = this.readJson(this.ownAnswersFile, []);
  }

  readJson(file, fallback) {
    if (!file) return fallback;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return fallback;
    }
  }

  writeJson(file, data) {
    if (!file) return;
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch {
      // not worth failing a chat over
    }
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
    // A question waits for one of its answers.
    if (!a || a.question) return;
    this.awaiting = null;
    const words = { clicked: 'clicked the bubble', petted: 'petted you', threw: 'threw you' };
    a.entry.reaction = words[kind] || kind;
    this.ignoredStreak = 0;
    this.log.add({ kind: 'reaction', to: a.entry.text, reaction: a.entry.reaction });
  }

  /**
   * You clicked answer `i` (0 or 1) of the question he's waiting on. He
   * remembers it if he said the answer tells him about you, and it wakes him
   * to react. Returns false if there's no such question (any more).
   */
  answered(i) {
    const a = this.awaiting;
    if (!a || !a.question || ![0, 1].includes(i)) return false;
    this.awaiting = null;
    const q = a.entry;
    const answer = q.answers[i];
    q.reaction = `answered "${answer}"`;
    this.ignoredStreak = 0;
    this.questionsIgnored = 0;
    this.log.add({ kind: 'reaction', to: q.text, reaction: q.reaction });
    if (q.aboutSushant && this.memory) this.memory.addFacts([{ text: `Sushant picked "${answer}" when asked "${q.text}"`, importance: 6 }]);
    // He reacts even if you answered within seconds of the question.
    const text = `Sushant answered your question "${q.text}" with "${answer}".`;
    this.log.add({ kind: 'interact', text, answer: true });
    this.wake({ kind: 'interact', text, interactive: true, answered: true });
    return true;
  }

  /**
   * You started watching something together (see watching.js): he says
   * something about it in his own words (always, it's his only line until
   * you stop), then watches quietly. `reading`: what he read on that window.
   */
  startedWatching({ name, title }) {
    const what = title ? `"${title}" on ${name}` : name;
    const text = `Sushant started watching ${what}. Tell him in your own words what you two are watching today. Then you go and sit in the corner of his screen with your back to him to watch it together.`;
    this.log.add({ kind: 'interact', text: `You sat down to watch ${what} with Sushant.` });
    this.wake({ kind: 'watching', text, interactive: true, watching: true });
  }

  /** You stopped watching: he gets up (and decides himself whether to say anything). */
  stoppedWatching({ name, title }) {
    const what = title ? `"${title}" on ${name}` : name;
    const text = `Sushant stopped watching ${what}. You get up from your spot in the corner.`;
    this.log.add({ kind: 'interact', text: `You and Sushant stopped watching ${what}.` });
    this.wake({ kind: 'watching', text, interactive: true });
  }

  // ------------------------------------------------------------ chat (Phase 8)

  /** Today's chat messages ([{ from: 'you'|'him', text, at }]); a new day starts empty. */
  todaysChat() {
    const day = memoryDay(this.now());
    if (this.chatLog.day !== day) this.chatLog = { day, messages: [] };
    return this.chatLog.messages;
  }

  /** The question he's waiting on an answer to, or null: { text, answers }. */
  pendingQuestion() {
    const a = this.awaiting;
    return a && a.question ? { text: a.entry.text, answers: a.entry.answers } : null;
  }

  /** You're writing your own answer to his question: it waits (up to `seconds`). */
  holdQuestion(seconds = 600) {
    if (this.awaiting && this.awaiting.question) this.awaiting.until = Math.max(this.awaiting.until, this.now() + seconds * 1000);
  }

  /**
   * You wrote `text` in the chat window. Returns { reply, action } or
   * { error }. `answering`: it's your own answer to the question he's waiting
   * on (neither of his answers fit); he remembers it like a clicked answer
   * and learns from it for his next answers.
   */
  async chat(text, { answering = false } = {}) {
    text = String(text || '').trim().slice(0, 1000);
    if (!text) return { error: 'nothing to send' };
    if (!this.engine || !this.engine.ready) return { error: 'his mind is not running' };
    const t = this.now();
    const messages = this.todaysChat();
    const history = messages.slice(-MIND.chatHistory).map((m) => ({ role: m.from === 'you' ? 'user' : 'assistant', content: m.text }));
    // Once per conversation it counts like a pat.
    if (t - this.lastChatAt > MIND.conversationGap * 1000) this.log.add({ kind: 'interact', text: INTERACTIONS.chatted });
    this.lastChatAt = t;
    const question = answering ? this.pendingQuestion() : null;
    if (question) this.answeredOwn(text);
    messages.push({ from: 'you', text, at: t });
    this.log.add({ kind: 'chat', from: 'you', text });
    this.writeJson(this.chatFile, this.chatLog);
    const self = this.getSelf();
    const memories = this.recall({ text }, this.log.last(['observe']));
    const notes = this.memory ? this.memory.notes.slice(0, MEMORY.notesChars) : '';
    const user = T.chatPrompt({ self, view: this.view, memories, answering: question, text, now: t });
    try {
      const raw = await this.engine.think({ system: T.systemPrompt(this.personality, notes, { chat: true }), user, schema: T.CHAT_SCHEMA, history });
      const r = T.parseReply(raw);
      if (!r) return { error: "he couldn't find the words" };
      this.lastSpokeAt = this.now();
      this.todaysChat().push({ from: 'him', text: r.reply, at: this.now() });
      this.log.add({ kind: 'chat', from: 'him', text: r.reply });
      this.writeJson(this.chatFile, this.chatLog);
      return r;
    } catch (e) {
      return { error: e.message };
    }
  }

  /** Your own answer to the question he's waiting on: like a clicked one, and kept to learn from. */
  answeredOwn(text) {
    const a = this.awaiting;
    if (!a || !a.question) return false;
    this.awaiting = null;
    const q = a.entry;
    q.reaction = `answered in his own words "${text}"`;
    this.ignoredStreak = 0;
    this.questionsIgnored = 0;
    this.log.add({ kind: 'reaction', to: q.text, reaction: q.reaction });
    if (q.aboutSushant && this.memory) this.memory.addFacts([{ text: `Asked "${q.text}", Sushant answered "${text}"`, importance: 6 }]);
    this.ownAnswers = [...this.ownAnswers, { question: q.text, offered: q.answers, answer: text.slice(0, 120), day: memoryDay(this.now()) }].slice(-MIND.ownAnswersKept);
    this.writeJson(this.ownAnswersFile, this.ownAnswers);
    return true;
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
      this.maybeWriteJournal().then(() => this.maybeGrow());
    }
    if (this.toNotice && this.engine && this.engine.ready && !this.thinking && !this.writingJournal) {
      const self = this.getSelf();
      if (!self.away && !self.quiet && !self.asleep) {
        const trigger = this.toNotice;
        this.toNotice = null;
        this.wake(trigger);
      }
    }
    if (this.awaiting && t >= this.awaiting.until) {
      const a = this.awaiting;
      this.awaiting = null;
      if (a.question) {
        // Ignoring a question costs nothing, but after a few he stops asking for a while.
        a.entry.reaction = 'ignored the question';
        this.log.add({ kind: 'reaction', to: a.entry.text, reaction: a.entry.reaction });
        if (++this.questionsIgnored >= MIND.questionPauseAfter) {
          this.questionsIgnored = 0;
          this.askPausedUntil = t + MIND.questionPause * 1000;
        }
      } else {
        a.entry.reaction = 'ignored it';
        this.log.add({ kind: 'reaction', to: a.entry.text, reaction: 'ignored it' });
        if (!a.interactive) this.ignoredStreak = Math.min(3, this.ignoredStreak + 1);
      }
    }
    if (t >= this.nextHeartbeat) {
      this.nextHeartbeat = t + this.heartbeatDelay();
      const self = this.getSelf();
      if (!self.away && !self.quiet && !self.asleep && !self.watching) this.wake({ kind: 'heartbeat', text: 'Nothing special. You are just hanging around on the screen.', interactive: false });
    }
  }

  /**
   * Write his diary if a day is due: past days he hasn't written about yet, or
   * today once you've been away for a while in the evening.
   */
  async maybeWriteJournal() {
    if (!this.memory || !this.enabled || !this.engine || !this.engine.ready || this.writingJournal || this.thinking) return null;
    const due = this.diaryDue();
    return due ? this.writeOne(due) : null;
  }

  /** The diary day that's due now, or null. */
  diaryDue() {
    const self = this.getSelf();
    const endOfDay = !!self.away && (self.awayFor || 0) >= MIND.endOfDayAway && (self.hour == null || self.hour >= MIND.endOfDayHour);
    return journalDue(this.events(), this.memory, { now: this.now(), endOfDay });
  }

  events() {
    return this.eventsFile ? readEvents(this.eventsFile) : this.log.items;
  }

  async writeOne(due) {
    this.writingJournal = true;
    try {
      const done = await writeDay(this.engine, this.memory, this.personality, due);
      this.lastJournal = done ? { day: due.day, at: this.now(), facts: done.facts.length, opinions: done.opinions.length } : { day: due.day, error: 'nothing usable' };
      if (!done) this.journalFailed = { day: due.day, at: this.now() };
      return done;
    } catch (e) {
      this.lastJournal = { day: due.day, error: e.message };
      this.journalFailed = { day: due.day, at: this.now() };
      return null;
    } finally {
      this.writingJournal = false;
    }
  }

  /**
   * Phase 5: before the models rest, is there a diary or reflection to do?
   * 'diary' | 'reflection' | null. Checked at most once a minute (it reads the
   * event log); a diary that just failed isn't retried for an hour.
   */
  workDue() {
    if (!this.memory || !this.enabled) return null;
    const t = this.now();
    if (this.workCheck && t - this.workCheck.at < 60 * 1000) return this.workCheck.due;
    let due = null;
    const diary = this.diaryDue();
    const failed = diary && this.journalFailed && this.journalFailed.day === diary.day && t - this.journalFailed.at < 3600 * 1000;
    if (diary && !failed) due = 'diary';
    else if (this.growth) {
      const self = this.getSelf();
      if (this.growth.reflectionDue({ away: !!self.away, awayFor: self.awayFor || 0 })) due = 'reflection';
    }
    this.workCheck = { at: t, due };
    return due;
  }

  /** Do what's due (diary, then growth). */
  async doWork() {
    this.workCheck = null;
    await this.maybeWriteJournal();
    await this.maybeGrow();
    this.workCheck = null;
  }

  /** Phase 4: count finished days towards your relationship (quietly), and reflect when it's time. */
  async maybeGrow() {
    if (!this.growth || !this.enabled) return null;
    this.countDays();
    const self = this.getSelf();
    if (!this.memory || !this.engine || !this.engine.ready || this.writingJournal || this.thinking) return null;
    if (!this.growth.reflectionDue({ away: !!self.away, awayFor: self.awayFor || 0 })) return null;
    return this.reflectWeek();
  }

  /** Relationship points for finished days (and today so far with `today`). Returns what was added. */
  countDays({ today = false } = {}) {
    if (!this.growth) return null;
    const withDays = this.growth.applyDays(this.personality, this.events(), { today });
    if (P.diff(this.personality, withDays).length) {
      this.personality = withDays;
      this.onPersonality(withDays);
    }
    return this.growth.lastDays;
  }

  /**
   * Reflect on the week and grow a little (he notices when you're back).
   * `manual` ("Try it now"): too little diary isn't recorded as a skipped week.
   * Returns { applied, insights } or { note } or { error }.
   */
  async reflectWeek({ manual = false } = {}) {
    this.writingJournal = true; // one big job at a time
    try {
      const week = this.growth.week(weekOf(memoryDay(this.now())));
      const r = week.relationship;
      const together = ['affection', 'trust', 'familiarity'].filter((m) => r[m]).map((m) => `${m} ${r[m] > 0 ? 'grew' : 'fell'} by ${Math.abs(r[m])}`).join(', ');
      const proposal = await reflect(this.engine, this.personality, this.memory, { now: this.now(), together });
      if (!proposal) {
        const note = 'not enough diary this week to reflect';
        if (!manual) this.growth.skipReflection(note);
        this.lastGrowth = { at: this.now(), note };
        return { note };
      }
      const { personality, applied } = this.growth.applyReflection(this.personality, proposal);
      this.memory.addFacts(proposal.insights.slice(0, 3).map((text) => ({ text, importance: 7 })));
      this.lastGrowth = { at: this.now(), changes: applied.length, insights: proposal.insights.length };
      if (applied.length) {
        this.personality = personality;
        this.onPersonality(personality);
        this.grew(applied);
      }
      return { applied, insights: proposal.insights.slice(0, 3) };
    } catch (e) {
      this.lastGrowth = { at: this.now(), error: e.message };
      return { error: e.message };
    } finally {
      this.writingJournal = false;
    }
  }

  // ------------------------------------------------------------ "Try it now" (Phase 5)

  /** Why a big job can't run right now, or null. */
  cantWork() {
    if (!this.enabled) return 'his mind is off (Mind → Think and talk for himself)';
    if (!this.engine || !this.engine.ready) return "his models aren't running yet";
    if (this.writingJournal) return "he's busy writing already";
    return null;
  }

  /** Wait (up to `ms`) for a think in progress to finish. */
  async idle(ms = 120 * 1000) {
    const until = Date.now() + ms;
    while (this.thinking && Date.now() < until) await new Promise((r) => setTimeout(r, 250));
  }

  /** Write his diary now, today so far included (missed days first). Returns [{ day, lines } | { day, error }] or { error }. */
  async writeDiaryNow() {
    const why = this.cantWork();
    if (why) return { error: why };
    await this.idle();
    const out = [];
    for (let i = 0; i < 5; i++) {
      const due = journalDue(this.events(), this.memory, { now: this.now(), endOfDay: true, minEvents: 1 });
      if (!due) break;
      const done = await this.writeOne(due);
      if (!done) {
        out.push({ day: due.day, error: (this.lastJournal && this.lastJournal.error) || 'nothing usable' });
        break;
      }
      out.push({ day: due.day, lines: done.diary.length, facts: done.facts.length, opinions: done.opinions.length });
    }
    return out;
  }

  /** Reflect on this week now; it counts as this week's reflection. */
  async reflectNow() {
    if (!this.growth) return { error: 'growth is not set up' };
    const why = this.cantWork();
    if (why) return { error: why };
    await this.idle();
    this.countDays();
    return this.reflectWeek({ manual: true });
  }

  /** After a reflection he may say he feels different (his own decision, like any thought). */
  grew(applied) {
    const text = applied.map((c) => `${c.label} ${c.to > c.from ? 'up' : 'down'} (${c.reason})`).join('; ');
    this.log.add({ kind: 'changed', text: `you grew this week: ${text}` });
    this.toNotice = { kind: 'changed', text: `Looking back on your week, you changed a little: ${text}. You notice you feel different.`, interactive: true };
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
      const events = this.log.recent(MIND.recentEvents, ['observe', 'interact', 'changed', 'chat']);
      const decisions = this.log.recent(MIND.recentDecisions, ['said', 'silent']);
      const self = this.getSelf();
      const screen = this.log.last(['observe']);
      const reading = screen && !screen.private && this.reading && this.reading.app === screen.app ? this.reading : null;
      const memories = this.recall(trigger, screen, reading);
      // No questions while you watch something together.
      // No questions while you watch something together, and his reaction
      // to your answer is never another question.
      const canAsk = this.canAsk() && !self.watching && !trigger.answered;
      const ownAnswers = canAsk ? this.ownAnswers.slice(-MIND.ownAnswersShown) : [];
      const user = T.situationPrompt({ trigger, self, screen, view: this.view, reading, memories, events: [...events, ...decisions], now: t, canAsk, ownAnswers });
      const recentLines = this.log.recent(10, ['said']).map((e) => e.text);
      const notes = this.memory ? this.memory.notes.slice(0, MEMORY.notesChars) : '';
      const image = reading && reading.picture && this.engine.canSee ? reading.picture : null;
      this.lastLook = reading ? { app: reading.app, chars: reading.text ? reading.text.length : 0, picture: !!image, skipped: reading.skipped || null, at: reading.at } : null;
      const started = this.now();
      const raw = await this.engine.think({ system: T.systemPrompt(this.personality, notes), user, schema: canAsk ? T.SCHEMA_WITH_QUESTION : T.SCHEMA, image });
      this.thinkTimes = [...(this.thinkTimes || []).slice(-9), (this.now() - started) / 1000];
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
    if (this.awaiting && this.awaiting.question) return 'waiting for your answer';
    if (trigger.watching) return null; // his one line when you start watching
    if (self.watching) return 'watching with you';
    const since = (this.now() - this.lastSpokeAt) / 1000;
    if (!trigger.answered && since < (trigger.interactive ? MIND.gapInteractive : MIND.gapUnprompted)) return 'spoke too recently';
    return null;
  }

  async decide(thought, trigger) {
    const th = this.threshold(trigger);
    const rail = this.blockedBy(trigger) || this.stale(trigger);
    // He wrote a question and may ask one: he asks instead of saying a line.
    const question = thought.question && this.canAsk() && !trigger.answered && !this.getSelf().watching && !this.mentionsBlocked([thought.question.text, ...thought.question.answers]) ? thought.question : null;
    // Starting to watch something together: he always says something about it.
    const wants = (thought.urge >= th || !!trigger.watching) && (thought.lines.length > 0 || !!question);
    this.lastDecision = { urge: thought.urge, threshold: th, rail, asked: !!question, at: this.now() };
    if (!wants || rail) {
      this.log.add({ kind: 'silent', thought: thought.thought, urge: thought.urge, why: rail || 'not worth saying' });
      return;
    }
    if (question && this.onAsk) {
      this.ask(question, thought.action, trigger, thought);
      return;
    }
    if (!thought.lines.length) return;
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
    const state = `Togepi is Sushant's companion on his screen. He is ${traits}. ${trigger.text} He is thinking: "${thought.thought}"`;
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

  /** He may ask a question now (not about the same thing twice, not while he's stopped asking for a while). */
  canAsk() {
    // One question per thing you're doing: after asking, not again until
    // you've moved on to something else (a new window, page or video).
    if (this.askedAbout !== undefined && this.currentThing() === this.askedAbout) return false;
    return !!this.onAsk && this.now() >= this.askPausedUntil;
  }

  /**
   * What you're doing right now, as a log entry: the latest thing on your
   * screen, or (with app watching off) the latest thing you did with him
   * other than answering him.
   */
  currentThing() {
    const seen = this.log.last(['observe']);
    if (seen) return seen;
    for (let i = this.log.items.length - 1; i >= 0; i--) {
      const e = this.log.items[i];
      if (e.kind === 'interact' && !e.answer) return e;
    }
    return null;
  }

  /** Text that names something on your privacy blocklist (apps, sites, words). */
  mentionsBlocked(texts) {
    const b = this.getBlocklist() || {};
    const all = texts.join(' ').toLowerCase();
    return [...(b.apps || []), ...(b.sites || []), ...(b.words || [])].some((x) => x && all.includes(String(x).toLowerCase()));
  }

  /** Ask `q` ({ text, answers, aboutSushant }) and wait for you to click an answer. */
  ask(q, action, trigger, thought = null) {
    this.lastSpokeAt = this.now();
    this.askedAbout = this.currentThing();
    const entry = this.log.add({ kind: 'said', text: q.text, answers: q.answers, aboutSushant: q.aboutSushant, action: action || 'none', trigger: trigger.kind, thought: thought ? thought.thought : null });
    this.awaiting = { entry, until: this.now() + MIND.questionWait * 1000, interactive: !!trigger.interactive, question: true };
    const shown = this.onAsk({ text: q.text, answers: q.answers, action: action || 'none', band: this.getSelf().band });
    // He couldn't hold it up (busy with something else): nothing to wait for.
    if (shown === false) {
      this.awaiting = null;
      entry.reaction = "couldn't show it";
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
      growth: this.lastGrowth,
      // Seconds per thought (average of the last 10), for the brain view and the report.
      speed: this.thinkTimes && this.thinkTimes.length ? { seconds: this.thinkTimes.reduce((x, y) => x + y, 0) / this.thinkTimes.length, n: this.thinkTimes.length } : null,
      lastSaid: said ? { text: said.text, answers: said.answers || null, reaction: said.reaction || null } : null,
      askPausedMin: this.askPausedUntil > this.now() ? Math.ceil((this.askPausedUntil - this.now()) / 60000) : 0,
      thinking: this.thinking,
      lastThought: this.lastThought,
      lastDecision: this.lastDecision,
      talkativeness: P.talkativeness(this.personality),
    };
  }
}

module.exports = { Mind, MIND, FEEL_DIFFERENT, INTERACTIONS };
