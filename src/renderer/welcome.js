'use strict';

// The welcome window (src/main/welcome.js has the words): what he can do on
// first run, or what's new after an update, plus the permission switches.

const $ = (id) => document.getElementById(id);

function section(title, body) {
  const s = document.createElement('section');
  const h = document.createElement('h2');
  h.textContent = title;
  s.appendChild(h);
  s.appendChild(body);
  return s;
}

function render({ mode, sections, whatsNew, switches }) {
  $('title').textContent = mode === 'new' ? 'What’s new with Togepi' : 'Welcome to Togepi!';
  $('intro').textContent = mode === 'new' ? 'Since you last looked:' : 'A quick look at what I can do.';
  const box = $('sections');
  box.textContent = '';
  for (const s of sections) {
    const p = document.createElement('p');
    p.textContent = s.text;
    box.appendChild(section(s.title, p));
  }
  for (const w of whatsNew) {
    const ul = document.createElement('ul');
    for (const item of w.items) {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    }
    box.appendChild(section(w.title, ul));
  }
  const list = $('switches');
  list.textContent = '';
  for (const sw of switches) {
    const row = document.createElement('div');
    row.className = 'switch';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `sw-${sw.key}`;
    input.checked = !!sw.on;
    input.disabled = !sw.enabled;
    input.addEventListener('change', () => window.welcome.set(sw.key, input.checked));
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = sw.label;
    const help = document.createElement('small');
    help.textContent = sw.enabled ? sw.help : `${sw.help} (macOS only)`;
    row.append(input, label, help);
    list.appendChild(row);
  }
}

window.welcome.onLoad(render);
$('done').addEventListener('click', () => window.welcome.done());
