'use strict';

// Sliders for every trait and value (src/main/mind/personality.js). Each
// change is sent to the main process, which saves it and lets him notice.

const groups = document.getElementById('groups');
const inputs = new Map(); // path -> { input, out }

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
    row.append(name, out, helpEl, input);
    sections.get(group).appendChild(row);
    inputs.set(path, { input, out });
  }
}

window.personality.onLoad(({ sliders, values }) => {
  if (inputs.size !== sliders.length) build(sliders);
  for (const [path, v] of Object.entries(values)) {
    const el = inputs.get(path);
    if (!el || document.activeElement === el.input) continue;
    el.input.value = String(v);
    el.out.textContent = String(v);
  }
});

document.getElementById('reset').addEventListener('click', () => window.personality.reset());
document.getElementById('file').addEventListener('click', () => window.personality.openFile());
