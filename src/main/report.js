'use strict';

// Phase 5: "Mind → Copy a report". A short text to paste to whoever helps
// with Togepi: versions, how his models are doing, permissions, settings and
// recent problems. It never contains anything from your screen (apps,
// titles, addresses, what he read), what he said or thought, his memories,
// your notes or your lists. Only switches, numbers and error messages (which
// may name an app, e.g. a browser that refused a permission), scrubbed too.
// No Electron imports, so it can be unit tested.

const { scrub } = require('./mind/screen');

// Error text can quote what went wrong; keep it short and scrubbed.
function err(s) {
  if (!s) return null;
  return scrub(String(s)).replace(/\s+/g, ' ').slice(0, 160);
}

function count(list) {
  return Array.isArray(list) ? list.length : 0;
}

function onOff(v) {
  return v ? 'on' : 'off';
}

function ago(ms, now) {
  if (!Number.isFinite(ms)) return '';
  const min = Math.round((now - ms) / 60000);
  if (min < 1) return ' (just now)';
  if (min < 120) return ` (${min} min ago)`;
  return ` (${Math.round(min / 60)} h ago)`;
}

/**
 * @param {object} src raw state, picked from safely:
 *   app: { version, electron, platform, arch, osRelease, totalMemGB }
 *   settings: settings.values
 *   engine: { state, running, ready, canSee, canDecide, files: { voice, decide, vision, missing }, memoryMB } | null
 *   rest: { kind, text, since } | null
 *   mind: mind.status() | null
 *   context: companion.context
 *   permissions: { screen, calendar, apps } (status words / notes)
 *   counts: { facts, opinions, diaryDays, growthWeeks, locked }
 *   now: ms
 */
function buildReport(src) {
  const now = src.now || Date.now();
  const a = src.app || {};
  const s = src.settings || {};
  const e = src.engine;
  const m = src.mind;
  const c = src.context || {};
  const p = src.permissions || {};
  const n = src.counts || {};
  const lines = [`Togepi report, ${new Date(now).toISOString().slice(0, 16).replace('T', ' ')} UTC`, ''];

  lines.push('App');
  lines.push(`- version ${a.version || '?'}, Electron ${a.electron || '?'}, ${a.platform || '?'} ${a.osRelease || ''} ${a.arch || ''}`.trimEnd());
  if (a.totalMemGB) lines.push(`- memory: ${a.totalMemGB} GB`);
  lines.push('');

  lines.push('Mind');
  if (!e) {
    lines.push(`- models: off (Think and talk for himself is ${onOff(s.mind)})`);
  } else {
    const f = e.files || {};
    const name = (x) => (x ? String(x).split(/[\\/]/).pop() : 'none');
    lines.push(`- models: ${err(e.state)}${e.ready ? '' : ' (voice not ready)'}${e.canDecide ? '' : ' (decision model not ready)'}`);
    lines.push(`- files: voice ${name(f.voice)}, decide ${name(f.decide)}, vision ${name(f.vision)}${count(f.missing) ? `, missing ${f.missing.join(', ')}` : ''}`);
    if (Number.isFinite(e.memoryMB)) lines.push(`- memory used by the models: ${(e.memoryMB / 1024).toFixed(1)} GB`);
  }
  if (src.rest) lines.push(`- resting: ${src.rest.kind}${ago(src.rest.since, now)}`);
  if (m) {
    if (m.speed) lines.push(`- speed: ${m.speed.seconds.toFixed(1)} s per thought (last ${m.speed.n})`);
    lines.push(`- thinking now: ${m.thinking ? 'yes' : 'no'}, talkativeness ${Number(m.talkativeness || 0).toFixed(2)}`);
    const t = m.lastThought;
    if (t) lines.push(`- last thought${ago(t.at, now)}: ${t.error ? `failed: ${err(t.error)}` : 'ok'}${t.trigger ? ` (woke up for: ${String(t.trigger).replace(/[^a-z]/gi, '')})` : ''}`);
    const d = m.lastDecision;
    if (d) lines.push(`- last decision: urge ${Number(d.urge).toFixed(2)} vs bar ${Number(d.threshold).toFixed(2)}${d.rail ? `, quiet: ${err(d.rail)}` : ''}`);
    const j = m.journal;
    if (j === 'writing…') lines.push('- diary: writing now');
    else if (j) lines.push(`- diary: ${j.day}${j.error ? ` failed: ${err(j.error)}` : `, ${j.facts} facts, ${j.opinions} opinions`}`);
    const g = m.growth;
    if (g) lines.push(`- growth${ago(g.at, now)}: ${g.error ? `failed: ${err(g.error)}` : g.note ? err(g.note) : `${g.changes} changes, ${g.insights} insights`}`);
    const l = m.looked;
    if (l) lines.push(`- last screen look: ${l.skipped ? 'skipped' : `${l.chars} characters${l.picture ? ' + a picture' : ''}`}`);
  }
  lines.push(`- remembers: ${n.facts || 0} facts, ${n.opinions || 0} opinions, ${n.diaryDays || 0} diary days; ${n.growthWeeks || 0} growth weeks, ${n.locked || 0} locked sliders`);
  lines.push('');

  lines.push('Permissions');
  lines.push(`- notice which app I'm using: ${onOff(s.watchApps)}${p.apps ? ` (${err(p.apps)})` : ''}`);
  lines.push(`- read my screen: ${onOff(s.readScreen)}, Screen Recording: ${p.screen || 'unknown'}`);
  lines.push(`- read my calendar: ${onOff(s.readCalendar)}${p.calendar ? ` (${err(p.calendar)})` : ''}`);
  lines.push('');

  lines.push('Settings');
  lines.push(`- mind ${onOff(s.mind)}, chirps ${onOff(s.sounds)}, rest after away ${s.restAfterAway ? `${s.restAfterAway} min` : 'never'}, rest on battery below ${s.restBattery ? `${s.restBattery}%` : 'never'}`);
  const nu = s.nudges || {};
  lines.push(`- nudges: water ${onOff(nu.water)}, stretch ${onOff(nu.stretch)}, eyes ${onOff(nu.eyes)}, bedtime ${nu.bedtime || 'off'}`);
  const pb = s.privacyBlock || {};
  const sa = s.screenAllow || {};
  lines.push(`- your privacy blocklist: ${count(pb.apps)} apps, ${count(pb.sites)} sites, ${count(pb.words)} words; read anyway: ${count(sa.apps)} apps, ${count(sa.sites)} sites`);
  lines.push('');

  lines.push('Right now');
  const battery = Number.isFinite(c.batteryLevel) ? `${Math.round(c.batteryLevel * 100)}%${c.charging ? ' charging' : c.onBattery ? ' on battery' : ''}` : 'unknown';
  lines.push(`- hour ${c.hour}, you ${c.userAway ? `away ${Math.round((c.awayFor || 0) / 60)} min` : 'here'}, ${c.quiet ? 'keeping quiet' : 'not quiet'}, ${c.watching ? 'watching something together' : 'not watching anything'}, battery ${battery}, screens ${c.screens || 1}`);
  if (c.error) lines.push(`- problem: ${err(c.error)}`);
  return lines.join('\n');
}

module.exports = { buildReport };
