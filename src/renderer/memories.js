'use strict';

// What Togepi remembers (src/main/mind/memory.js), with a × to forget each.

const $ = (id) => document.getElementById(id);

function forgetButton(id, label) {
  const b = document.createElement('button');
  b.className = 'forget';
  b.textContent = '×';
  b.title = label;
  b.setAttribute('aria-label', label);
  b.addEventListener('click', () => window.memories.forget(id));
  return b;
}

function empty(text) {
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = text;
  return p;
}

function list(el, items, none, starred = new Set()) {
  el.textContent = '';
  if (!items.length) {
    el.appendChild(empty(none));
    return;
  }
  for (const it of items) {
    const li = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = `${starred.has(it.text) ? '⭐ ' : ''}${it.text}`;
    if (it.date) {
      const when = document.createElement('span');
      when.className = 'when';
      when.textContent = it.date;
      text.appendChild(when);
    }
    li.append(text, forgetButton(it.id, 'Forget this'));
    el.appendChild(li);
  }
}

window.memories.onLoad((m) => {
  $('notes').textContent = m.notes || 'Nothing yet. Use "Tell him about you…" to add your goals, your resume or what you like.';
  list($('facts'), [...m.facts].reverse(), 'Nothing yet. He learns about you from what you do, and writes it down at the end of the day.', new Set(m.core || []));
  list($('opinions'), [...m.opinions].reverse(), 'No opinions yet.');
  const w = $('weeks');
  w.textContent = '';
  if (!(m.weeks || []).length) w.appendChild(empty('No weeks yet. He sums up his week on Sunday evening, with his weekly reflection.'));
  for (const wk of m.weeks || []) {
    const div = document.createElement('div');
    div.className = 'day';
    const h = document.createElement('h3');
    h.textContent = `Week of ${wk.week}`;
    h.appendChild(forgetButton(wk.id, 'Forget this week'));
    div.appendChild(h);
    const p = document.createElement('p');
    p.textContent = wk.text;
    div.appendChild(p);
    w.appendChild(div);
  }
  const j = $('journal');
  j.textContent = '';
  const days = m.journal.filter((d) => d.lines.length);
  if (!days.length) j.appendChild(empty('No diary yet. He writes it when you are away at the end of the day.'));
  for (const d of days) {
    const div = document.createElement('div');
    div.className = 'day';
    const h = document.createElement('h3');
    h.textContent = d.day;
    h.appendChild(forgetButton(d.id, 'Forget this day'));
    div.appendChild(h);
    const p = document.createElement('p');
    p.textContent = d.lines.join(' ');
    div.appendChild(p);
    j.appendChild(div);
  }
});

$('folder').addEventListener('click', () => window.memories.openFolder());
$('notes-edit').addEventListener('click', () => window.memories.editNotes());
