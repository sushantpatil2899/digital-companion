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

/** "How should I think?": Gemma on this Mac or Gemini online, and your Gemini key. */
function renderBrain(brain) {
  if (!brain) return;
  for (const r of document.querySelectorAll('input[name="engine"]')) r.checked = r.value === brain.engine;
  $('local-help').textContent = `About 11 GB of memory while I run. Nothing leaves your Mac.${brain.memGB && brain.memGB < 24 ? ` This Mac has ${brain.memGB} GB, which is tight.` : ''}`;
  $('gemini').style.display = brain.engine === 'gemini' ? 'block' : 'none';
  $('geminikey').style.display = brain.keyFromEnv ? 'none' : 'block';
  $('key-status').textContent = brain.keyFromEnv
    ? 'Using the key from your shell (GEMINI_API_KEY).'
    : brain.hasKey
      ? 'Your key is saved in your Mac’s Keychain. Paste a new one to replace it.'
      : 'Get a free key at aistudio.google.com/apikey and paste it here. It’s kept in your Mac’s Keychain.';
}

function render({ mode, sections, whatsNew, switches, userName, userPronoun, brain }) {
  renderBrain(brain);
  // What he calls you and how he refers to you: asked on first run, and
  // whenever either isn't set yet.
  const pronouns = [...document.querySelectorAll('input[name="pronoun"]')];
  $('you').style.display = mode === 'welcome' || !userName || !userPronoun ? 'block' : 'none';
  if (document.activeElement !== $('username')) $('username').value = userName || '';
  for (const r of pronouns) r.checked = r.value === userPronoun;
  $('title').textContent = mode === 'new' ? 'What’s new in Filo' : 'Welcome to Filo!';
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
$('username').addEventListener('change', () => window.welcome.setName($('username').value));
for (const r of document.querySelectorAll('input[name="pronoun"]')) r.addEventListener('change', () => window.welcome.setPronoun(r.value));
for (const r of document.querySelectorAll('input[name="engine"]')) r.addEventListener('change', () => window.welcome.setEngine(r.value));
$('geminikey').addEventListener('change', () => {
  const key = $('geminikey').value.trim();
  if (!key) return;
  window.welcome.setGeminiKey(key);
  $('geminikey').value = '';
});
window.welcome.onKeySaved((ok) => {
  $('key-status').textContent = ok ? 'Saved in your Mac’s Keychain ✓' : 'Couldn’t save the key: this Mac’s Keychain isn’t available.';
});
$('done').addEventListener('click', () => {
  window.welcome.setName($('username').value);
  window.welcome.done();
});
