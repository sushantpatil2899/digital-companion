'use strict';

// Debug view of Togepi's brain: needs, mood, context and his last decision.

const $ = (id) => document.getElementById(id);

const STATE_NAMES = {
  idle: 'Hanging out',
  walk: 'Walking',
  run: 'Running',
  sit: 'Sitting',
  sleep: 'Sleeping',
  jump: 'Jumping',
  grabbed: 'Being held',
  fall: 'Falling',
  land: 'Landing',
  confused: 'Confused',
  happy: 'Happy',
  hug: 'Getting a hug',
  surprised: 'Surprised',
  lookAround: 'Looking around',
  talk: 'Chattering',
  eat: 'Eating an apple',
  flower: 'Smelling a flower',
  play: 'Playing with his ball',
  adventure: 'On an adventure',
  backView: 'Watching your screen',
  sad: 'Sad',
  angry: 'Angry',
  shy: 'Shy',
  curious: 'Curious',
  wave: 'Waving',
  sign: 'Holding up a sign',
};

// [key, label, "good" end: 'high' or 'low']
const NEEDS = [
  ['energy', 'Energy', 'high'],
  ['hunger', 'Hunger', 'low'],
  ['boredom', 'Boredom', 'low'],
  ['affection', 'Affection', 'high'],
];

function color(goodness) {
  if (goodness > 0.6) return 'var(--good)';
  if (goodness > 0.3) return 'var(--warn)';
  return 'var(--bad)';
}

function bar(label, value, goodness, text) {
  return `<div class="row"><span>${label}</span><div class="bar"><i style="width:${Math.round(value * 100)}%;background:${color(goodness)}"></i></div><span class="num">${text}</span></div>`;
}

function moodBar(mood, band) {
  // Centred bar: left = sad, right = cheerful.
  const w = Math.abs(mood) * 50;
  const left = mood >= 0 ? 50 : 50 - w;
  const face = band || (mood > 0.45 ? 'cheerful' : mood > 0.1 ? 'content' : mood > -0.25 ? 'meh' : 'sad');
  return `<div class="row"><span>Mood</span><div class="bar"><i style="left:${left}%;width:${w}%;background:${color((mood + 1) / 2)}"></i></div><span class="num">${face}</span></div>`;
}

function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function render(b) {
  $('state').textContent = STATE_NAMES[b.state] || b.state;
  const sub = [];
  if (b.paused) sub.push(`Staying put (${Math.ceil(b.stayPutLeft / 60)} min left)`);
  if (b.context.quiet) sub.push(`Keeping quiet (${b.context.quietReason || 'busy'})`);
  $('sub').textContent = sub.join(' · ');

  $('needs').innerHTML =
    NEEDS.map(([k, label, good]) => {
      const v = b.needs[k];
      const goodness = good === 'high' ? v : 1 - v;
      return bar(label, v, goodness, `${Math.round(v * 100)}%`);
    }).join('') + moodBar(b.mood, b.band);

  const c = b.context;
  const rows = [
    ['Time', `${String(c.hour).padStart(2, '0')}:00${c.hour >= 22 || c.hour < 6 ? ' (night)' : ''}`],
    ['You', c.userAway ? `away for ${Math.round(c.awayFor / 60)} min` : 'here'],
    [
      'Battery',
      c.batteryLevel == null ? 'unknown' : `${Math.round(c.batteryLevel * 100)}% ${c.charging ? '(charging)' : c.onBattery ? '(on battery)' : ''}`,
    ],
  ];
  if (c.frontApp) rows.push(['Front app', c.frontApp]);
  if (c.visibleApps && c.visibleApps.length) rows.push(['On screen', c.visibleApps.slice(0, 8).join(', ')]);
  if (c.screens > 1) rows.push(['Screens', `${c.screens} (he's on #${(c.screenIndex || 0) + 1})`]);
  if (b.reminder) rows.push(['Reminder', `${b.reminder.title} (${b.reminder.kind === 'now' ? 'now' : `in ${b.reminder.kind} min`}${b.reminder.acknowledged ? ', seen' : ', waiting for a click'})`]);
  if (c.inEvent) rows.push(['In event', `${c.inEvent.title} (until ${fmtTime(c.inEvent.end)})`]);
  if (c.nextEvent) rows.push(['Next event', `${c.nextEvent.title} at ${fmtTime(c.nextEvent.start)}`]);
  if (c.error) rows.push(['Note', c.error]);
  $('context').innerHTML = rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');

  $('scores').innerHTML = b.scores.length
    ? b.scores
        .map((s) => `<tr class="score"><td>${esc(s.name)} <span class="num">${s.score.toFixed(2)}</span></td><td class="why">${esc(s.why)}</td></tr>`)
        .join('')
    : '<tr><td colspan="2" class="muted">He hasn\'t decided anything on his own yet.</td></tr>';
}

window.brain.onUpdate(render);
