'use strict';

// Screen layout for multi-monitor travel. Pure functions, no Electron.
//
// Input: Electron displays as { bounds, workArea }, each {x, y, width, height}.
// Each screen becomes:
//   { index, left, right, top, floor }       where he lives: walls and floor are the
//                                            display's real edges (he walks along the very
//                                            bottom, in front of the Dock), the ceiling is
//                                            below the menu bar (workArea top)
//   { b: { left, right, top, bottom } }      whole display (bounds): for adjacency / lookups
//
// Links are the places he can cross from one screen to another:
//   side    'left' / 'right': the two displays touch side by side
//   stacked 'up' / 'down':    one display sits directly above the other
// Each link says how to cross: walk across, drop down, hop up or spring up.

const TOUCH = 3; // px: displays closer than this count as touching
const MAX_SIDE_HOP = 700; // px: highest step up he'll hop at a side edge ...
const HOP_HEADROOM = 200; // ... or higher, as long as the target floor is this far below the ceiling

function toScreen(d, index) {
  const wa = d.workArea || d.bounds;
  const b = d.bounds || d.workArea;
  return {
    index,
    left: b.x,
    right: b.x + b.width,
    top: wa.y,
    floor: b.y + b.height,
    b: { left: b.x, right: b.x + b.width, top: b.y, bottom: b.y + b.height },
  };
}

function makeScreens(displays) {
  return (displays || []).map(toScreen);
}

/** Index of the screen containing the point (by whole display), or the nearest one. */
function screenAt(screens, x, y) {
  let best = 0;
  let bestDist = Infinity;
  for (const s of screens) {
    const dx = x < s.b.left ? s.b.left - x : x > s.b.right ? x - s.b.right : 0;
    const dy = y < s.b.top ? s.b.top - y : y > s.b.bottom ? y - s.b.bottom : 0;
    const d = dx * dx + dy * dy;
    if (d === 0) return s.index;
    if (d < bestDist) {
      bestDist = d;
      best = s.index;
    }
  }
  return best;
}

function overlap(a1, a2, b1, b2) {
  return Math.min(a2, b2) - Math.max(a1, b1);
}

/**
 * Ways to get from screen `a` to screen `b` directly (none if they don't touch).
 * @param {number} halfWidth his half width, so he fits through a stacked gap
 * @returns {object|null} { from, to, dir, kind, edgeX?, rangeLeft?, rangeRight?, rise? }
 *   kind: 'walk' (same floor), 'drop' (lower floor), 'hop' (higher floor),
 *         'fall' (stacked, going down), 'spring' (stacked, going up)
 */
function link(a, b, halfWidth = 40) {
  if (a.index === b.index) return null;
  // Side by side.
  const sideRight = Math.abs(a.b.right - b.b.left) <= TOUCH;
  const sideLeft = Math.abs(a.b.left - b.b.right) <= TOUCH;
  if ((sideRight || sideLeft) && overlap(a.b.top, a.b.bottom, b.b.top, b.b.bottom) > 0) {
    const dir = sideRight ? 'right' : 'left';
    const edgeX = sideRight ? a.b.right : a.b.left;
    const rise = a.floor - b.floor; // > 0: the next floor is higher
    // He walks off at his floor height; the other display must be there for
    // him to walk or drop into it, otherwise he has to hop up to its floor.
    const reachesFloor = b.b.top <= a.floor - 30 && b.b.bottom >= a.floor - 30;
    if (Math.abs(rise) <= 8 && reachesFloor) return { from: a.index, to: b.index, dir, kind: 'walk', edgeX };
    if (rise < -8 && reachesFloor) return { from: a.index, to: b.index, dir, kind: 'drop', edgeX };
    if (rise > 8 && rise <= Math.max(MAX_SIDE_HOP, a.floor - a.top - HOP_HEADROOM)) return { from: a.index, to: b.index, dir, kind: 'hop', edgeX, rise };
    return null;
  }
  // Stacked: through a shared horizontal edge, wide enough for him.
  const below = Math.abs(a.b.bottom - b.b.top) <= TOUCH; // b is under a
  const above = Math.abs(a.b.top - b.b.bottom) <= TOUCH; // b is over a
  if (below || above) {
    const left = Math.max(a.left, b.left) + halfWidth + 10;
    const right = Math.min(a.right, b.right) - halfWidth - 10;
    if (right - left < 20) return null;
    return {
      from: a.index,
      to: b.index,
      dir: below ? 'down' : 'up',
      kind: below ? 'fall' : 'spring',
      rangeLeft: left,
      rangeRight: right,
      rise: a.floor - b.floor,
    };
  }
  return null;
}

/** All direct links out of screen `i`. */
function linksFrom(screens, i, halfWidth) {
  const out = [];
  for (const s of screens) {
    const l = link(screens[i], s, halfWidth);
    if (l) out.push(l);
  }
  return out;
}

/** Shortest list of links from screen `from` to screen `to` (breadth-first), or null. */
function route(screens, from, to, halfWidth) {
  if (from === to) return [];
  const prev = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const i = queue.shift();
    for (const l of linksFrom(screens, i, halfWidth)) {
      if (prev.has(l.to)) continue;
      prev.set(l.to, l);
      if (l.to === to) {
        const path = [];
        for (let x = l; x; x = prev.get(x.from)) path.unshift(x);
        return path;
      }
      queue.push(l.to);
    }
  }
  return null;
}

module.exports = { toScreen, makeScreens, screenAt, link, linksFrom, route, MAX_SIDE_HOP };
