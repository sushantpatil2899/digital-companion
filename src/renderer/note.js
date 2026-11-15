'use strict';

// "Remind me" window: write a note, pick when, and he brings it to you.

const $ = (id) => document.getElementById(id);
const text = $('text');

function fmt(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function setButtons() {
  const empty = !text.value.trim();
  for (const b of document.querySelectorAll('#quick button, #atBtn')) b.disabled = empty;
}

function add(at) {
  const t = text.value.trim();
  if (!t) return;
  window.notes.add(t, at);
  $('status').textContent = `Got it! I'll remind you at ${fmt(at)}.`;
  text.value = '';
  setButtons();
  text.focus();
}

for (const b of document.querySelectorAll('#quick button')) {
  b.addEventListener('click', () => add(Date.now() + Number(b.dataset.min) * 60 * 1000));
}

$('atBtn').addEventListener('click', () => {
  const v = $('time').value;
  if (!v) return;
  const [h, m] = v.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  // A time that's already passed today means tomorrow.
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  add(d.getTime());
});

text.addEventListener('input', setButtons);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.notes.close();
});
setButtons();

window.notes.onList((list) => {
  const ul = $('list');
  ul.textContent = '';
  if (!list.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'Nothing yet.';
    ul.appendChild(li);
    return;
  }
  for (const n of [...list].sort((a, b) => a.at - b.at)) {
    const li = document.createElement('li');
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = fmt(n.at);
    const t = document.createElement('span');
    t.className = 'text';
    t.textContent = n.text;
    const x = document.createElement('button');
    x.textContent = '✕';
    x.title = 'Cancel';
    x.addEventListener('click', () => window.notes.remove(n.id));
    li.append(time, t, x);
    ul.appendChild(li);
  }
});
