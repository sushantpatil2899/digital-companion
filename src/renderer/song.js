'use strict';

// The weekly song window (Phase 10): the song, its words lit up as they're
// sung, the week in numbers from the database, older songs and settings.

const $ = (id) => document.getElementById(id);
const audio = new Audio();
let data = null;
let lines = []; // [{ el, from, to }] seconds
let url = null;

function fmt(s) {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function dateText(ms) {
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Verse in the first half, chorus in the second; each line gets an even share of its half. */
function layLyrics(song) {
  const box = $('lyrics');
  box.textContent = '';
  lines = [];
  const half = (song.seconds || 30) / 2;
  [
    ['Verse', song.verse, 0],
    ['Chorus', song.chorus, half],
  ].forEach(([name, part, start]) => {
    const h = document.createElement('div');
    h.className = 'part';
    h.textContent = name;
    box.appendChild(h);
    part.forEach((text, i) => {
      const el = document.createElement('div');
      el.className = 'line';
      el.textContent = text;
      box.appendChild(el);
      const each = half / part.length;
      lines.push({ el, from: start + i * each, to: start + (i + 1) * each });
    });
  });
}

function render() {
  const song = data.songs.find((s) => s.id === data.current) || null;
  $('song').hidden = !song;
  $('empty').hidden = !!song;
  $('empty').textContent = data.keySet
    ? `No song yet. ${data.name} makes one every Sunday evening, or right now with the button below.`
    : `No song yet. Add your ElevenLabs key under Settings, then ${data.name} can make one.`;
  if (song) {
    $('title').textContent = `🎵 ${song.title}`;
    $('by').textContent = `${data.name} · ${dateText(song.at)}`;
    layLyrics(song);
    $('week').innerHTML = '';
    const b = document.createElement('b');
    b.textContent = 'This week: ';
    $('week').appendChild(b);
    $('week').appendChild(document.createTextNode(song.week || 'not counted yet (the database wasn’t running)'));
    $('week').hidden = false;
  }
  $('status').textContent = data.status || '';
  $('status').className = data.error ? 'error' : '';
  $('make').disabled = !!data.busy || !data.keySet;
  $('make').textContent = data.busy ? 'Making the song…' : 'Make this week’s song now';
  $('weekly').checked = !!data.weekly;
  $('keyHelp').textContent = data.keyFromEnv
    ? 'Using the key from ELEVENLABS_API_KEY.'
    : data.keySet
      ? 'A key is saved (in your Mac’s Keychain).'
      : 'Create a key on elevenlabs.io (Developers → API Keys) with only “Music Generation” allowed.';
  const older = $('older');
  older.textContent = '';
  if (data.songs.length > 1) {
    const h = document.createElement('div');
    h.className = 'part';
    h.textContent = 'Our songs';
    older.appendChild(h);
    for (const s of data.songs) {
      const a = document.createElement('a');
      a.className = s.id === data.current ? 'sel' : '';
      a.textContent = `${s.title} `;
      const d = document.createElement('span');
      d.textContent = dateText(s.at);
      a.appendChild(d);
      a.onclick = () => window.song.select(s.id);
      older.appendChild(a);
    }
  }
}

function tick() {
  const t = audio.currentTime;
  const d = audio.duration || 30;
  $('fill').style.width = `${Math.min(100, (t / d) * 100)}%`;
  $('time').textContent = `${fmt(t)} / ${fmt(d)}`;
  for (const l of lines) l.el.classList.toggle('now', !audio.paused && t >= l.from && t < l.to);
}

audio.addEventListener('timeupdate', tick);
audio.addEventListener('play', () => {
  $('play').textContent = '❚❚';
  window.song.playing(true);
});
audio.addEventListener('pause', () => {
  $('play').textContent = '▶';
  window.song.playing(false);
  tick();
});
audio.addEventListener('ended', () => {
  audio.currentTime = 0;
  tick();
});

$('play').onclick = () => (audio.paused ? audio.play() : audio.pause());
$('bar').onclick = (e) => {
  if (!audio.duration) return;
  const r = $('bar').getBoundingClientRect();
  audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
};
$('make').onclick = () => window.song.make();
$('weekly').onchange = (e) => window.song.setWeekly(e.target.checked);
$('saveKey').onclick = () => {
  const k = $('key').value.trim();
  if (k) window.song.setKey(k);
  $('key').value = '';
};
$('removeKey').onclick = () => window.song.setKey('');

window.song.onLoad((d) => {
  data = d;
  render();
});

window.song.onAudio(({ id, audio: bytes, autoplay }) => {
  if (!data || id !== data.current) return;
  audio.pause();
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
  audio.src = url;
  $('play').disabled = false;
  tick();
  if (autoplay) audio.play().catch(() => {});
});

window.addEventListener('beforeunload', () => window.song.playing(false));
