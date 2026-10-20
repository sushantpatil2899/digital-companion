'use strict';

// Sliders for every trait and value (src/main/mind/personality.js). Each
// change is sent to the main process, which saves it and lets him notice.
// A lock keeps growth (Phase 4) from moving a slider; "How I've grown" lists
// each week's changes with their reasons, and can undo a week.

const groups = document.getElementById('groups');
const history = document.getElementById('history');
const inputs = new Map(); // path -> { input, out, lock }
let locked = new Set();

// The relationship grows by itself (docs/mind/DECISIONS.md), so it's shown, not edited.
const READ_ONLY = ['Relationship'];
const NOTES = {
  Values: 'what he cares about',
  Relationship: 'not set by hand',
};

function build(sliders) {
  groups.textContent = '';
  inputs.clear();
  const sections = new Map();
  for (const [path, label, help, group] of sliders) {
    if (!sections.has(group)) {
      const s = document.createElement('section');
      if (READ_ONLY.includes(group)) s.classList.add('readonly');
      const h = document.createElement('h2');
      h.textContent = group;
      if (NOTES[group]) {
        const small = document.createElement('small');
        small.textContent = NOTES[group];
        h.appendChild(small);
      }
      s.appendChild(h);
      groups.appendChild(s);
      sections.set(group, s);
    }
    const row = document.createElement('div');
    row.className = 'row';
    const name = document.createElement('label');
    name.className = 'name';
    name.textContent = label;
    name.htmlFor = path;
    const out = document.createElement('span');
    out.className = 'value';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.id = path;
    input.disabled = READ_ONLY.includes(group);
    input.addEventListener('input', () => {
      out.textContent = input.value;
    });
    input.addEventListener('change', () => window.personality.set(path, Number(input.value)));
    const helpEl = document.createElement('div');
    helpEl.className = 'help';
    helpEl.textContent = help;
    const lock = document.createElement('button');
    lock.className = 'lock';
    lock.addEventListener('click', () => window.personality.lock(path, !locked.has(path)));
    row.append(name, out, lock, helpEl, input);
    sections.get(group).appendChild(row);
    inputs.set(path, { input, out, lock });
  }
}

function showLock(path) {
  const el = inputs.get(path);
  const on = locked.has(path);
  el.lock.textContent = on ? '🔒' : '🔓';
  el.lock.classList.toggle('on', on);
  el.lock.title = on ? 'Locked: growth never changes this. Click to unlock.' : 'Click to lock: growth will never change this.';
  el.lock.setAttribute('aria-label', el.lock.title);
}

function showHistory(weeks) {
  history.textContent = '';
  const shown = weeks.filter((w) => w.changes.length || w.insights.length || Object.values(w.relationship).some(Boolean));
  if (!shown.length) {
    const p = document.createElement('p');
    p.className = 'help';
    p.textContent = 'Nothing yet. His relationship with you grows a little every day, and once a week he looks back and may change a little.';
    history.appendChild(p);
    return;
  }
  for (const w of shown) {
    const div = document.createElement('div');
    div.className = `week${w.undone ? ' undone' : ''}`;
    const h = document.createElement('h3');
    h.textContent = `Week of ${w.week}${w.undone ? ' (undone)' : ''}`;
    if (!w.undone) {
      const b = document.createElement('button');
      b.textContent = 'Undo this week';
      b.addEventListener('click', () => window.personality.undoWeek(w.week));
      h.appendChild(b);
    }
    div.appendChild(h);
    const ul = document.createElement('ul');
    const r = w.relationship;
    const rel = ['affection', 'trust', 'familiarity'].filter((m) => r[m]).map((m) => `${m} ${r[m] > 0 ? '+' : ''}${r[m]}`);
    const items = [...(rel.length ? [`Relationship: ${rel.join(', ')}`] : []), ...w.changes.map((c) => `${c.label} ${c.from} → ${c.to}: ${c.reason}`), ...w.insights.map((i) => `Learned: ${i}`)];
    for (const text of items) {
      const li = document.createElement('li');
      li.textContent = text;
      ul.appendChild(li);
    }
    div.appendChild(ul);
    history.appendChild(div);
  }
}

window.personality.onLoad(({ sliders, values, locked: lockedPaths = [], history: weeks = [] }) => {
  if (inputs.size !== sliders.length) build(sliders);
  locked = new Set(lockedPaths);
  for (const [path, v] of Object.entries(values)) {
    const el = inputs.get(path);
    if (!el) continue;
    showLock(path);
    if (document.activeElement === el.input) continue;
    el.input.value = String(v);
    el.out.textContent = String(v);
  }
  showHistory(weeks);
});

document.getElementById('reset').addEventListener('click', () => window.personality.reset());
document.getElementById('file').addEventListener('click', () => window.personality.openFile());
