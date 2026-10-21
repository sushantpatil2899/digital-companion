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
  water: 'Bringing you water',
  drink: 'Cheers!',
  stretch: 'Stretching',
  eyeRest: 'Resting his eyes',
  bedtime: 'Yawning: bedtime?',
  note: 'Holding up your note',
  nod: 'Nodding',
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
  // Centred bar: left = sad, right = cheerful. The label is the face he shows
  // (grumpy after being thrown, whatever the bar says).
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
    }).join('') +
    moodBar(b.mood, b.band) +
    // Being thrown makes him grumpy for a few minutes; above 30% it shows on his face.
    (b.grumpiness > 0.01 ? bar('Grumpy', b.grumpiness, 1 - b.grumpiness, `${Math.round(b.grumpiness * 100)}%`) : '');

  const c = b.context;
  const rows = [
    ['Time', `${String(c.hour).padStart(2, '0')}:${String(c.minute || 0).padStart(2, '0')}${c.hour >= 22 || c.hour < 6 ? ' (night)' : ''}`],
    ['You', c.userAway ? `away for ${Math.round(c.awayFor / 60)} min` : 'here'],
    [
      'Battery',
      c.batteryLevel == null ? 'unknown' : `${Math.round(c.batteryLevel * 100)}% ${c.charging ? '(charging)' : c.onBattery ? '(on battery)' : ''}`,
    ],
  ];
  if (c.frontApp) {
    const kind = { meeting: 'meeting app', presenting: 'presenting' }[c.frontKind] || 'not a meeting';
    rows.push(['Front app', `${c.frontApp}${c.frontBundle ? ` (${c.frontBundle})` : ''} → ${kind}`]);
  }
  if (c.meetingCheck) rows.push(['Meeting check', c.meetingCheck]);
  if (c.visibleApps && c.visibleApps.length) rows.push(['On screen', c.visibleApps.slice(0, 8).join(', ')]);
  if (c.screens > 1) {
    const reach = (c.reachableScreens || []).map((i) => `#${i + 1}`).join(', ') || 'none';
    rows.push(['Screens', `${c.screens} (he's on #${(c.screenIndex || 0) + 1} for ${Math.floor((c.onThisScreenFor || 0) / 60)} min; can walk to ${reach})`]);
  }
  if (b.reminder) rows.push(['Reminder', `${b.reminder.title} (${b.reminder.kind === 'now' ? 'now' : `in ${b.reminder.kind} min`}${b.reminder.acknowledged ? ', seen' : ', waiting for a click'})`]);
  if (c.inEvent) rows.push(['In event', `${c.inEvent.title} (until ${fmtTime(c.inEvent.end)})`]);
  for (const e of c.alsoInEvents || []) rows.push(['Also in', `${e.title} (until ${fmtTime(e.end)})`]);
  if (c.nextEvent) rows.push(['Next event', `${c.nextEvent.title} at ${fmtTime(c.nextEvent.start)}`]);
  const w = b.nudges;
  if (w) {
    const next = (on, every, active) => (on ? `in ${Math.max(0, Math.round(every - active / 60))} min` : 'off');
    const s = w.settings;
    rows.push(['Water', `${w.water} today · next ${next(s.water, s.waterEvery, w.active.water)}`]);
    rows.push(['Stretch', `${Math.round(w.active.stretch / 60)} min since a break · next ${next(s.stretch, s.stretchEvery, w.active.stretch)}`]);
    rows.push(['Eye rest', `next ${next(s.eyes, s.eyesEvery, w.active.eyes)}`]);
    if (w.quietHold > 0) rows.push(['Nudges', `paused for ${Math.ceil(w.quietHold / 60)} min after your meeting`]);
    for (const n of w.notes) rows.push(['Remind me', `${fmtTime(n.at)}: ${n.text}`]);
  }
  if (b.nudge) rows.push(['Showing', b.nudge.kind === 'note' ? `note: ${b.nudge.text}` : b.nudge.kind]);
  if (b.game) rows.push(['Playing', `${b.game.kind === 'ttt' ? 'tic-tac-toe' : 'fetch'} (${b.game.step}, ${b.game.rounds} played)`]);
  const m = b.mind;
  if (m) {
    rows.push(['Mind', !m.enabled ? 'off' : m.rest ? `resting: ${m.rest.text} (models stopped to save memory and battery)` : `${m.engine}${m.thinking ? ' · thinking…' : ''}`]);
    const perf = [];
    if (m.speed) perf.push(`${m.speed.seconds.toFixed(1)} s per thought`);
    if (Number.isFinite(m.memoryMB)) perf.push(`models use about ${(m.memoryMB / 1024).toFixed(1)} GB`);
    if (perf.length) rows.push(['Speed', perf.join(' · ')]);
    const v = m.view;
    const win = (w) => (!w ? '' : w.private ? 'something private' : `${w.app}${w.title ? `: "${w.title}"` : ''}${w.screen ? ` (screen ${w.screen})` : ''}`);
    if (v && (v.typing || v.cursorOn)) {
      const parts = [];
      if (v.typing) parts.push(`typing in ${win(v.typing)}${v.via === 'typing' ? ' ← looking' : ''}`);
      if (v.cursorOn && win(v.cursorOn) !== win(v.typing)) parts.push(`cursor on ${win(v.cursorOn)}${v.via === 'cursor' ? ' ← looking' : ''}`);
      rows.push(['Attention', parts.join(' · ')]);
    }
    const l = m.looked;
    if (l) rows.push(['Read', l.skipped ? `${l.app}: didn't read it (${l.skipped})` : `${l.app}: ${l.chars} characters${l.picture ? ' + a picture' : ''}`]);
    const seen = m.sees;
    if (seen) rows.push(['He sees', seen.private ? 'something private (no details)' : `${seen.app}${seen.title ? `: "${seen.title}"` : ''}${seen.site ? ` (${seen.site})` : ''}`]);
    else rows.push(['He sees', 'nothing yet (turn on "Notice which app I\'m using" under Brain)']);
    if (m.recalled && m.recalled.length) rows.push(['Remembered', m.recalled.join(' · ')]);
    if (m.journal) rows.push(['Diary', m.journal === 'writing…' ? 'writing…' : m.journal.error ? `${m.journal.day}: couldn't write (${m.journal.error})` : `wrote ${m.journal.day} (${m.journal.facts} new facts, ${m.journal.opinions} opinions)`]);
    if (m.growth) rows.push(['Growth', m.growth.error ? `reflection failed (${m.growth.error})` : m.growth.note || `reflected: ${m.growth.changes} changes, ${m.growth.insights} insights`]);
    if (m.lastSaid) {
      const ls = m.lastSaid;
      rows.push([ls.answers ? 'Last asked' : 'Last said', `"${ls.text}"${ls.answers ? ` [${ls.answers.join(' | ')}]` : ''}${ls.reaction ? ` → ${ls.reaction}` : ''}`]);
    }
    if (m.askPausedMin) rows.push(['Questions', `paused for ${m.askPausedMin} min (you ignored two in a row)`]);
    const t = m.lastThought;
    if (t && t.error) rows.push(['Last thought', `(failed: ${t.error})`]);
    else if (t) rows.push(['Last thought', `"${t.thought}" (woke up for: ${t.trigger})`]);
    const d = m.lastDecision;
    if (d) {
      const said = d.rail ? `stayed quiet: ${d.rail}` : d.urge >= d.threshold ? (d.asked ? 'asked a question' : 'spoke') : 'stayed quiet: not worth saying';
      rows.push(['Decision', `urge ${d.urge.toFixed(2)} vs bar ${d.threshold.toFixed(2)} → ${said}`]);
    }
  }
  if (c.error) rows.push(['Note', c.error]);
  $('context').innerHTML = rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');

  $('scores').innerHTML = b.scores.length
    ? b.scores
        .map((s) => `<tr class="score"><td>${esc(s.name)} <span class="num">${s.score.toFixed(2)}</span></td><td class="why">${esc(s.why)}</td></tr>`)
        .join('')
    : '<tr><td colspan="2" class="muted">He hasn\'t decided anything on his own yet.</td></tr>';
}

window.brain.onUpdate(render);
