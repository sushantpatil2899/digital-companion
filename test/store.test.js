'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store, eventRow, eventUid, minutesFromObserves, findPostgres, databaseDir } = require('../src/main/mind/store');
const { EventLog } = require('../src/main/mind/events');

require('../src/main/mind/names').setNames({ user: 'Sushant', pronoun: 'he' });

const MIN = 60 * 1000;

// ------------------------------------------------------------------ rows

test('an event becomes a row; the live write and the old log line get the same id', () => {
  const rows = [];
  const log = new EventLog({ now: () => 1000, onAdd: (e) => rows.push(eventRow(e)) });
  const e = log.add({ kind: 'interact', text: 'Sushant drank some water like you asked.' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'interact');
  assert.equal(rows[0].key, 'waterDone', 'old entries without a key get one from their text');
  assert.equal(rows[0].uid, eventUid(JSON.stringify(e)));
  assert.equal(rows[0].t.getTime(), 1000);

  const said = eventRow({ t: 5, kind: 'silent', thought: 'Still coding?', urge: 2 });
  assert.equal(said.text, 'Still coding?');
  assert.deepEqual(said.data, { urge: 2 });

  const watched = eventRow({ t: 5, kind: 'watched', what: 'Severance', scene: 'office', mood: 'calm' });
  assert.deepEqual(watched.data, { what: 'Severance', scene: 'office', mood: 'calm' });
});

test('a broken hook never breaks the event log', () => {
  const log = new EventLog({
    onAdd: () => {
      throw new Error('database down');
    },
  });
  const orig = console.error;
  console.error = () => {};
  try {
    assert.ok(log.add({ kind: 'interact', text: 'x' }));
  } finally {
    console.error = orig;
  }
  assert.equal(log.recent(5).length, 1);
});

test('old "you switched to" entries become minutes, at most 10 each, private ones without names', () => {
  const t0 = 1000 * MIN;
  const m = minutesFromObserves([
    { t: t0, kind: 'observe', app: 'Code', site: null },
    { t: t0 + 3 * MIN, kind: 'observe', app: 'Google Chrome', site: 'linkedin.com' },
    { t: t0 + 60 * MIN, kind: 'observe', private: true },
    { t: t0 + 30 * MIN, kind: 'interact', text: 'x' },
  ]);
  const by = (app) => m.filter((x) => x.app === app).length;
  assert.equal(by('Code'), 3);
  assert.equal(by('Google Chrome'), 10, 'capped: he can’t tell whether you were away');
  const priv = m.filter((x) => x.private);
  assert.equal(priv.length, 10);
  assert.ok(priv.every((x) => x.app === null && x.site === null));
  assert.ok(m.every((x) => x.t.getTime() % MIN === 0));
});

test('the database lives in the shared data folder, not a character’s', () => {
  assert.equal(databaseDir('/x/Companion'), path.join('/x/Companion', 'database'));
});

test('without Postgres he carries on: nothing is queued, nothing breaks', async () => {
  const s = new Store({ dir: path.join(os.tmpdir(), 'nope') });
  s.pgInfo = { bin: '/nowhere', timescale: false };
  assert.equal(await s.start(), false);
  assert.equal(s.state, 'missing');
  s.addEvent('togepi', { t: 1, kind: 'interact', text: 'x' });
  assert.equal(s.pending.length, 0);
  assert.equal(await s.week('togepi'), null);
  assert.match(s.status(), /^not installed/);
});

// ------------------------------------------------------------------ the real thing

// Runs where Postgres + TimescaleDB are installed (Postgres refuses to run as root).
test('TimescaleDB: tables, old logs loaded once, live writes, the week in numbers', async (t) => {
  const pg = await findPostgres();
  if (!pg || !pg.timescale || (process.getuid && process.getuid() === 0)) {
    t.skip('needs Postgres + TimescaleDB and a non-root user');
    return;
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'companion-db-'));
  const now = Date.now();
  const events = path.join(root, 'events.jsonl');
  const lines = [
    { t: now - 3 * 3600e3, kind: 'observe', app: 'Code', title: 'store.js' },
    { t: now - 3 * 3600e3 + 5 * MIN, kind: 'observe', app: 'Google Chrome', title: 'Jobs', site: 'linkedin.com' },
    { t: now - 2 * 3600e3, kind: 'interact', text: 'Sushant petted you.', key: 'heart' },
    { t: now - 2 * 3600e3 + 1000, kind: 'interact', text: 'Sushant drank some water like you asked.' },
    { t: now - 2 * 3600e3 + 2000, kind: 'watched', what: 'Severance', scene: 'office', mood: 'calm' },
    { t: now - 100 * 24 * 3600e3, kind: 'interact', text: 'too old', key: 'heart' },
  ];
  fs.writeFileSync(events, `${lines.map((l) => JSON.stringify(l)).join('\n')}\nnot json\n`);
  const s = new Store({ dir: path.join(root, 'database') });
  try {
    assert.equal(await s.start({ imports: [{ companion: 'togepi', files: [events, path.join(root, 'missing.jsonl')] }] }), true, s.error);
    assert.match(s.status(), /^running \(TimescaleDB \d/);
    assert.match(s.status(), /old activity loaded \(5 events\)/);
    const tables = (await s.pool.query('SELECT hypertable_name FROM timescaledb_information.hypertables ORDER BY 1')).rows.map((r) => r.hypertable_name);
    assert.deepEqual(tables, ['events', 'minutes']);
    const jobs = (await s.pool.query('SELECT proc_name FROM timescaledb_information.jobs WHERE job_id >= 1000 ORDER BY 1')).rows.map((r) => r.proc_name);
    assert.deepEqual(jobs, ['policy_compression', 'policy_compression', 'policy_refresh_continuous_aggregate', 'policy_refresh_continuous_aggregate', 'policy_retention', 'policy_retention']);

    s.addEvent('togepi', { t: now - MIN, kind: 'interact', text: 'Sushant picked you up and threw you!', key: 'throw' });
    s.addEvent('pip', { t: now - MIN, kind: 'interact', text: 'Sushant petted you.', key: 'heart' });
    s.addMinute('togepi', { t: now, mood: 'cheerful', needs: { energy: 0.8, hunger: 0.2, boredom: 0.1, affection: 0.9 }, app: 'Code' });
    await s.flush();

    const w = await s.week('togepi');
    assert.equal(w.together.pets, 1, 'Pip’s pat is Pip’s');
    assert.equal(w.together.throws, 1);
    assert.equal(w.care.water, 1);
    assert.deepEqual(w.shows, ['Severance']);
    assert.deepEqual(w.moods, { cheerful: 1 });
    assert.equal(w.apps[0].app, 'Google Chrome');
    assert.equal(w.sites[0].site, 'linkedin.com');
    assert.ok(w.hoursAtComputer > 0);
    assert.equal((await s.week('pip')).together.pets, 1);

    // Restarting loads nothing twice (and skips what's older than 90 days).
    await s.stop();
    const s2 = new Store({ dir: path.join(root, 'database') });
    assert.equal(await s2.start({ imports: [{ companion: 'togepi', files: [events] }] }), true, s2.error);
    const n = (await s2.pool.query("SELECT count(*)::int AS n FROM events WHERE companion = 'togepi'")).rows[0].n;
    assert.equal(n, 6);
    await s2.stop();
  } finally {
    await s.stop().catch(() => {});
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('memories by meaning: fingerprints kept in step with the memories, nearest first', async (t) => {
  const pg = await findPostgres();
  if (!pg || !pg.timescale || (process.getuid && process.getuid() === 0)) {
    t.skip('needs Postgres + TimescaleDB and a non-root user');
    return;
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'companion-db-'));
  const s = new Store({ dir: path.join(root, 'database') });
  try {
    assert.equal(await s.start(), true, s.error);
    if (!s.vectors) {
      t.skip('pgvector isn’t installed');
      return;
    }
    assert.match(s.status('togepi'), /recall by meaning starts when his models are awake/);
    // A fake embedding: each memory points along its own axis.
    const axis = (i) => Array.from({ length: 768 }, (_, j) => (j === i ? 1 : 0.01));
    const which = { 'Sushant is job hunting': 0, 'Sushant loves Rust': 1, 'Fetch on Saturday': 2 };
    let embedded = 0;
    const embed = async (texts) => {
      embedded += texts.length;
      return texts.map((x) => axis(which[x]));
    };
    const items = [
      { kind: 'fact', text: 'Sushant is job hunting', date: '2026-10-20', importance: 8 },
      { kind: 'fact', text: 'Sushant loves Rust', date: '2026-10-21', importance: 6 },
      { kind: 'journal', text: 'Fetch on Saturday', date: '2026-10-24', importance: 4 },
    ];
    assert.deepEqual(await s.syncMemories('togepi', items, embed), { added: 3, removed: 0 });
    assert.deepEqual(await s.syncMemories('togepi', items, embed), { added: 0, removed: 0 });
    assert.equal(embedded, 3, 'nothing is fingerprinted twice');
    const near = await s.nearest('togepi', axis(1), 3);
    assert.equal(near[0].text, 'Sushant loves Rust');
    assert.ok(near[0].similarity > 0.9 && near[1].similarity < 0.2);
    assert.deepEqual(await s.nearest('pip', axis(1)), [], 'Pip has his own memories');
    // You made him forget one.
    assert.deepEqual(await s.syncMemories('togepi', items.slice(1), embed), { added: 0, removed: 1 });
    assert.equal(s.memoryCount.togepi, 2);
    assert.match(s.status('togepi'), /2 memories ready for recall by meaning \((DiskANN|HNSW)\)/);
  } finally {
    await s.stop().catch(() => {});
    fs.rmSync(root, { recursive: true, force: true });
  }
});
