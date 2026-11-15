'use strict';

// Where your attention is, across windows and screens (Phase 3, Sushant's
// multi-screen feedback in docs/mind/DECISIONS.md):
// - the window you're typing in: the front window of the app with keyboard focus
// - the window under your cursor: the frontmost window containing the cursor
// - attention: if you moved the cursor in the last ~15 s, the window under it
//   (you're reading or scrolling there); otherwise the one you type in
// A new place only counts once your attention has stayed there ~5 s, so
// sweeping the cursor across screens doesn't wake him.
// No Electron imports, so it can be unit tested.

const ATTENTION = {
  cursorRecent: 15, // s: a cursor this recently moved shows where you're looking
  settle: 5, // s your attention must stay on a window before it counts
  moved: 3, // px of cursor movement that count as moving it
};

// His own windows aren't something you're working in.
const OWN_APPS = ['companion', 'togepi', 'electron'];

function own(w) {
  return OWN_APPS.includes(String(w.app || '').toLowerCase());
}

function contains(w, p) {
  return p.x >= w.x && p.x < w.x + w.width && p.y >= w.y && p.y < w.y + w.height;
}

/** Which screen (1-based, in display order) a window is mostly on, or null. */
function screenOf(w, displays) {
  if (!displays || displays.length < 2) return null;
  const cx = w.x + w.width / 2;
  const cy = w.y + w.height / 2;
  const i = displays.findIndex((d) => cx >= d.x && cx < d.x + d.width && cy >= d.y && cy < d.y + d.height);
  return i >= 0 ? i + 1 : null;
}

/** A stable key for "the same window". */
function windowKey(w) {
  return w ? `${w.id || ''}|${w.app}|${w.title || ''}` : '';
}

class Attention {
  /** @param {() => number} [now] ms */
  constructor(now = () => Date.now()) {
    this.now = now;
    this.cursor = null;
    this.cursorMovedAt = -Infinity;
    this.candidate = null; // { key, since }
    this.current = null; // the window your attention has settled on
  }

  /**
   * Start over: the window you're on counts as new again once it settles. A
   * new mind (another character) learns what you're doing without you first
   * having to move to another window.
   */
  forget() {
    this.candidate = null;
    this.current = null;
  }

  /** Call often (every frame is fine) with the cursor position. */
  cursorAt(p) {
    if (!p) return;
    if (!this.cursor || Math.abs(p.x - this.cursor.x) + Math.abs(p.y - this.cursor.y) >= ATTENTION.moved) {
      this.cursorMovedAt = this.now();
    }
    this.cursor = { x: p.x, y: p.y };
  }

  /**
   * Work out where you are from the window list (front to back) and the app
   * with keyboard focus. `frontTab` adds the title of a focused browser's tab.
   * Returns { typing, cursorOn, attention, others, settled } where each window
   * is { id, app, title, screen } (or null), and `settled` is true when your
   * attention has just settled on a new window.
   */
  update({ windows = [], frontApp = null, frontTab = null, displays = [] }) {
    const list = windows.filter((w) => !own(w));
    const describe = (w) => (w ? { id: w.id || null, app: w.app, title: w.title || null, screen: screenOf(w, displays), x: w.x, y: w.y, width: w.width, height: w.height } : null);
    let typing = frontApp ? list.find((w) => w.app === frontApp) || null : null;
    if (!typing && frontApp) typing = { id: null, app: frontApp, title: null, x: 0, y: 0, width: 0, height: 0 };
    let typingD = describe(typing);
    // A focused browser: its front tab says more than (or replaces a missing) window title.
    if (typingD && frontTab && frontTab.title) typingD = { ...typingD, title: frontTab.title, url: frontTab.url || null, private: !!frontTab.private };
    else if (typingD && frontTab && frontTab.private) typingD = { ...typingD, private: true };
    const under = this.cursor ? list.find((w) => contains(w, this.cursor)) || null : null;
    const cursorD = under && typing && under.id && under.id === typing.id ? typingD : describe(under);
    const lookingWithCursor = this.now() - this.cursorMovedAt <= ATTENTION.cursorRecent * 1000 && !!cursorD;
    const attention = lookingWithCursor ? cursorD : typingD;
    const others = list
      .filter((w) => w !== typing && w !== under)
      .slice(0, 5)
      .map(describe);
    // Settle: the same window for a few seconds before it counts as "new".
    const key = windowKey(attention);
    let settled = false;
    if (!this.candidate || this.candidate.key !== key) this.candidate = { key, since: this.now() };
    if (key && windowKey(this.current) !== key && this.now() - this.candidate.since >= ATTENTION.settle * 1000) {
      this.current = attention;
      settled = true;
    } else if (key && windowKey(this.current) === key) {
      this.current = attention; // same window: keep its latest title
    }
    const onCursorWindow = !!cursorD && windowKey(this.current) === windowKey(cursorD) && windowKey(cursorD) !== windowKey(typingD);
    return { typing: typingD, cursorOn: cursorD, attention: this.current, via: onCursorWindow ? 'cursor' : 'typing', others, settled };
  }
}

module.exports = { Attention, ATTENTION, screenOf, windowKey };
