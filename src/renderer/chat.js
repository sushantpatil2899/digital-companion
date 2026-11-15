'use strict';

// Chat window (Phase 8): today's conversation with him. When he's waiting
// on an answer to one of his questions, what you write is your own answer.

const $ = (id) => document.getElementById(id);
let busy = false;

function render(data) {
  const list = $('messages');
  list.textContent = '';
  if (!data.messages.length) {
    const p = document.createElement('div');
    p.className = 'note';
    p.textContent = 'Say hi! He answers in his own words (it takes a few seconds).';
    list.appendChild(p);
  }
  for (const m of data.messages) {
    const div = document.createElement('div');
    div.className = `msg ${m.from === 'you' ? 'you' : 'him'}`;
    div.textContent = m.text;
    list.appendChild(div);
  }
  list.scrollTop = list.scrollHeight;

  const q = $('question');
  if (data.question) {
    q.style.display = 'block';
    q.textContent = '';
    const small = document.createElement('small');
    small.textContent = 'He asked you (type your own answer):';
    q.appendChild(small);
    q.appendChild(document.createTextNode(`${data.question.text}  (${data.question.answers.join(' / ')})`));
    $('text').placeholder = 'Your own answer…';
  } else {
    q.style.display = 'none';
    $('text').placeholder = `Say something to ${window.CHARACTER_NAME}…`;
  }

  busy = !!data.busy;
  $('status').textContent = data.status || '';
  // Phase 11: 🎤 to say it instead (when "Talk to me" is on).
  $('mic').hidden = !data.canListen;
  $('mic').classList.toggle('on', !!data.listening);
  $('mic').disabled = busy && !data.listening;
  $('send').disabled = busy;
  $('text').disabled = busy;
  if (!busy) $('text').focus();
}

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('text').value.trim();
  if (!text || busy) return;
  $('text').value = '';
  window.chat.send(text);
});

$('mic').addEventListener('click', () => window.chat.listen());

window.chat.onLoad(render);
