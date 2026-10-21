'use strict';

// Everything Togepi's mind notices and decides, in order: what you're doing,
// how you play with him, what he said (or chose not to say) and how you
// reacted. Recent entries feed his next decision; all of them are appended to
// events.jsonl (the start of his memory, see Phase 2 in docs/mind/PLAN.md).
// No Electron imports, so it can be unit tested.

const fs = require('fs');
const path = require('path');

const KEEP = 200; // recent entries held in memory
const MAX_FILE = 5 * 1024 * 1024; // events.jsonl is rotated to events.1.jsonl past this size

class EventLog {
  /**
   * @param {object} [opts]
   * @param {string} [opts.file] events.jsonl path (none = memory only, for tests)
   * @param {() => number} [opts.now] clock (ms epoch)
   */
  constructor(opts = {}) {
    this.file = opts.file || null;
    this.now = opts.now || (() => Date.now());
    this.items = [];
  }

  /** Record an entry: { kind, ... }. Returns it (with its time `t`). */
  add(entry) {
    const e = { t: this.now(), ...entry };
    this.items.push(e);
    if (this.items.length > KEEP) this.items.splice(0, this.items.length - KEEP);
    this.append(e);
    return e;
  }

  append(e) {
    if (!this.file) return;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      try {
        if (fs.statSync(this.file).size > MAX_FILE) fs.renameSync(this.file, this.file.replace(/\.jsonl$/, '.1.jsonl'));
      } catch {
        // no file yet
      }
      fs.appendFileSync(this.file, `${JSON.stringify(e)}\n`);
    } catch (err) {
      console.error('Could not write event log:', err.message);
    }
  }

  /** The last `n` entries, optionally only these kinds. */
  recent(n, kinds = null) {
    const list = kinds ? this.items.filter((e) => kinds.includes(e.kind)) : this.items;
    return list.slice(-n);
  }

  /** The most recent entry of one of these kinds, or null. */
  last(kinds) {
    for (let i = this.items.length - 1; i >= 0; i--) if (kinds.includes(this.items[i].kind)) return this.items[i];
    return null;
  }
}

/** "2 min ago", for prompts. */
function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

/** One entry as a line of text for his prompt. */
function describeEvent(e, now) {
  const when = ago(now - e.t);
  switch (e.kind) {
    case 'observe':
      if (e.private) return `${when}: Sushant switched to something private (you can't see it)`;
      return `${when}: Sushant is in ${e.app || 'an app'}${e.title ? `: "${e.title}"` : ''}${e.site ? ` (${e.site})` : ''}`;
    case 'interact':
      return `${when}: ${e.text}`;
    case 'said':
      if (e.answers) return `${when}: you asked "${e.text}" (answers: "${e.answers.join('" or "')}")${e.reaction ? ` (Sushant ${e.reaction})` : ''}`;
      return `${when}: you said "${e.text}"${e.reaction ? ` (Sushant ${e.reaction})` : ''}`;
    case 'silent':
      return `${when}: you thought "${e.thought}" but stayed quiet`;
    case 'changed':
      return `${when}: you felt different: ${e.text}`;
    default:
      return `${when}: ${e.text || e.kind}`;
  }
}

module.exports = { EventLog, ago, describeEvent };
