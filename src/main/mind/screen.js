'use strict';

// "Let him read my screen" (Phase 3): he looks at one window at a time, the
// one your attention is on (attention.js), never a whole screen.
// - text: a picture of that window, read with Apple's on-device text
//   recognition (src/main/mac/ocr.applescript)
// - picture: now and then (when there's little text) the language model looks
//   at the picture itself
// Before: nothing private is captured (the privacy rules check the app, title
// and address first); email and chat apps are not read unless you allow them.
// After: card numbers, passwords, keys, phone numbers and email addresses are
// blanked out, and the decision model double-checks the text.
// Nothing is saved: the picture file is deleted right away, and the text only
// lives in memory for his next thought.
// The capture/OCR functions are passed in, so this can be unit tested.

const privacy = require('./privacy');

const SCREEN = {
  revisit: 30, // s: at most this often for the window you're staying on
  minGap: 8, // s between any two looks
  maxChars: 1500, // of screen text in one prompt
  pictureBelow: 200, // chars: less text than this and he looks at the picture too
  pictureEvery: 4, // and every 4th look at the same window anyway
  fresh: 60, // s a reading stays usable for his thoughts
};

// Email and chat: only the title, unless you allow them (settings.json, screenAllow).
const PERSONAL_APPS = [
  'mail', 'microsoft outlook', 'outlook', 'spark', 'airmail', 'mimestream', 'superhuman', 'thunderbird',
  'messages', 'slack', 'whatsapp', 'telegram', 'signal', 'discord', 'microsoft teams', 'messenger', 'wechat', 'line', 'skype', 'facetime',
];
const PERSONAL_SITES = [
  'mail.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com', 'mail.yahoo.com', 'mail.proton.me',
  'web.whatsapp.com', 'app.slack.com', 'discord.com', 'messenger.com', 'teams.microsoft.com', 'teams.live.com', 'web.telegram.org', 'messages.google.com', 'chat.google.com',
];

/** May he read this window? Returns null if yes, or why not. */
function whyNotRead(win, { block = {}, allow = {} } = {}) {
  if (!win || !win.id) return 'no window';
  if (win.private) return 'private window';
  const site = privacy.domainOf(win.url);
  const p = privacy.check({ app: win.app, title: win.title, url: win.url, private: win.private }, block);
  if (p.blocked) return p.reason;
  const app = String(win.app || '').toLowerCase();
  const allowed = (allow.apps || []).some((a) => a && app.includes(String(a).toLowerCase())) || (site && (allow.sites || []).some((s) => s && site.includes(String(s).toLowerCase())));
  if (!allowed && (PERSONAL_APPS.includes(app) || (site && PERSONAL_SITES.some((s) => site.endsWith(s))))) return 'email or chat';
  return null;
}

/** Blank out anything sensitive in screen text. */
function scrub(text) {
  return String(text || '')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[number]') // card and account numbers
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[number]') // SSN
    .replace(/(\+?\d{1,3}[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, '[phone]')
    .replace(/\b(sk|pk|rk)[-_][A-Za-z0-9_-]{16,}\b/g, '[key]')
    .replace(/\b(ghp|gho|ghu|ghs|github_pat|xox[abprs]|AKIA|AIza)[A-Za-z0-9_-]{10,}\b/g, '[key]')
    .replace(/\b[A-Za-z0-9+/_-]{32,}={0,2}\b/g, '[key]') // long tokens
    .replace(/^.*\b(password|passcode|passwd|secret|api key|token|otp|pin|cvv|cvc)\b.*$/gim, '[hidden line]')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

class ScreenReader {
  /**
   * @param {object} io
   * @param {(id: number) => Promise<string>} io.capture   picture file of window `id`
   * @param {(file: string) => Promise<string>} io.ocr     its text
   * @param {(file: string) => Promise<string>} io.picture its picture as base64 (small JPEG)
   * @param {(file: string) => void} io.remove             delete the picture file
   * @param {object} [opts] { now, decide, getRules }
   *   decide(state, questions): the decision model, for the privacy double-check
   *   getRules(): { block, allow } from settings
   */
  constructor(io, opts = {}) {
    this.io = io;
    this.now = opts.now || (() => Date.now());
    this.decide = opts.decide || null;
    this.getRules = opts.getRules || (() => ({}));
    this.lastLookAt = -Infinity;
    this.looks = new Map(); // window key -> { at, count }
    this.reading = null; // the latest usable reading
    this.busy = false;
    this.error = null;
    this.alternate = 0;
  }

  /** Which window to look at now, or null: the one you're paying attention to; alternating with the other when you type in one and point at another. */
  pick(view) {
    if (!view || !view.attention) return null;
    const a = view.attention;
    const other = view.via === 'cursor' ? view.typing : view.cursorOn;
    const candidates = [a, other && other.id && other.id !== a.id ? other : null].filter(Boolean);
    const due = candidates.filter((w) => {
      const seen = this.looks.get(key(w));
      return !seen || this.now() - seen.at >= SCREEN.revisit * 1000;
    });
    if (!due.length) return null;
    // A window not looked at yet goes first; otherwise take turns.
    const fresh = due.find((w) => !this.looks.has(key(w)));
    if (fresh) return fresh;
    this.alternate++;
    return due[this.alternate % due.length];
  }

  /**
   * Look at a window now if it's time (`force`: now, at the one you're paying
   * attention to; `picture`: always with a picture). Returns the reading
   * ({ key, app, title, text, picture, at }) or null.
   */
  async look(view, { force = false, picture: wantsPicture = false } = {}) {
    if (this.busy) return null;
    if (!force && this.now() - this.lastLookAt < SCREEN.minGap * 1000) return null;
    const win = force && view && view.attention ? view.attention : this.pick(view);
    if (!win) return null;
    const rules = this.getRules();
    const why = whyNotRead(win, rules);
    const k = key(win);
    const seen = this.looks.get(k) || { at: 0, count: 0 };
    this.looks.set(k, { at: this.now(), count: seen.count + 1 });
    this.lastLookAt = this.now();
    if (why) {
      this.reading = { key: k, app: win.app, title: win.title, text: null, picture: null, skipped: why, at: this.now() };
      return this.reading;
    }
    this.busy = true;
    let file = null;
    try {
      file = await this.io.capture(win.id);
      let text = '';
      try {
        text = scrub(await this.io.ocr(file));
      } catch (e) {
        this.error = `couldn't read the text: ${e.message}`;
      }
      if (text && (await this.looksSensitive(win, text))) {
        this.reading = { key: k, app: win.app, title: win.title, text: null, picture: null, skipped: 'sensitive', at: this.now() };
        return this.reading;
      }
      const wantPicture = wantsPicture || text.length < SCREEN.pictureBelow || (seen.count + 1) % SCREEN.pictureEvery === 0;
      const picture = wantPicture ? await this.io.picture(file).catch(() => null) : null;
      this.reading = { key: k, app: win.app, title: win.title, text: text.slice(0, SCREEN.maxChars) || null, picture, at: this.now() };
      if (text) this.error = null;
      return this.reading;
    } catch (e) {
      this.error = e.message;
      return null;
    } finally {
      if (file) this.io.remove(file);
      this.busy = false;
    }
  }

  /** The decision model's second look at what was read. */
  async looksSensitive(win, text) {
    if (!this.decide) return false;
    try {
      const state = `App: ${win.app}. Window: ${win.title || '(no title)'}. Text on screen: ${text.slice(0, 800)}`;
      const a = await this.decide(state, { sensitive: privacy.MODEL_QUESTION });
      const p = a && a.sensitive && a.sensitive.probabilities;
      return !!p && Number(p.A) >= 0.5;
    } catch {
      return false;
    }
  }

  /** The reading of window `k` if it's recent enough to think about, else null. */
  readingFor(k) {
    const r = this.reading;
    return r && r.key === k && this.now() - r.at <= SCREEN.fresh * 1000 ? r : null;
  }
}

function key(w) {
  return w ? `${w.id || ''}|${w.app}` : '';
}

module.exports = { ScreenReader, SCREEN, scrub, whyNotRead, screenKey: key };
