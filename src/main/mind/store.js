'use strict';

// Phase 10, part 1: Tiger Data. Everything the characters notice and do also
// goes into a TimescaleDB database (Tiger Data's open-source Postgres
// extension) on this computer, so the week can be added up in an instant
// (the weekly song, his comments). Nothing here touches the network:
// - Filo runs its own Postgres (Homebrew's `postgresql@18` +
//   `timescaledb` on the Mac), with its data in `…/Filo/database/`
//   (shared by all characters, every row marked with its character).
// - It listens only on a socket file in that folder (no TCP port), so only
//   your user can reach it; TimescaleDB's telemetry is off.
// - Tables: `events` (each event-log entry, src/main/mind/events.js) and
//   `minutes` (once a minute: his mood and needs, what you're on). Both are
//   hypertables kept 90 days, moved to the columnstore after 7 days; hourly
//   totals are continuous aggregates (`events_hourly`, `minutes_hourly`).
// - On start, each character's old `events.jsonl` lines the database doesn't
//   have yet are loaded (they all carry their time).
// - Part 3: `memories` holds a meaning fingerprint (EmbeddingGemma, 768
//   numbers) of every memory (facts, opinions, diary lines, weekly
//   summaries), so he recalls what fits the moment by meaning, not just by
//   shared words. Needs pgvector (`brew install pgvector`); the index is
//   Tiger Data's StreamingDiskANN (pgvectorscale) when installed, otherwise
//   pgvector's HNSW. The Markdown files stay the real memory: this is a copy
//   kept in step with them.
// Without Postgres + TimescaleDB everything else works as before.
// No Electron imports, so it can be unit tested.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { interactionKey } = require('./interactions');

const STORE = {
  keepDays: 90, // raw rows (events.jsonl is kept as long)
  columnstoreAfterDays: 7,
  flushEvery: 2000, // ms between writes
  maxPending: 5000, // rows held while the database isn't ready
  observeCap: 10, // min: an old "you switched to X" counts as X for at most this long
  database: 'companion',
  role: 'companion',
  dims: 768, // EmbeddingGemma's fingerprint size
  embedBatch: 16,
};

// Where Postgres may be: Homebrew (Apple silicon, Intel), Postgres.app, Linux packages.
function candidateBins() {
  const list = [];
  if (process.env.COMPANION_PG_BIN) list.push(process.env.COMPANION_PG_BIN);
  for (const prefix of ['/opt/homebrew/opt', '/usr/local/opt']) {
    for (const v of ['postgresql@18', 'postgresql@17', 'postgresql@16', 'postgresql']) list.push(path.join(prefix, v, 'bin'));
  }
  list.push('/Applications/Postgres.app/Contents/Versions/latest/bin');
  try {
    const versions = fs.readdirSync('/usr/lib/postgresql').filter((v) => /^\d+$/.test(v)).sort((a, b) => b - a);
    for (const v of versions) list.push(path.join('/usr/lib/postgresql', v, 'bin'));
  } catch {
    // not Linux, or no packages
  }
  return list;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: opts.timeout || 60000, env: { ...process.env, LC_ALL: 'C' } }, (err, stdout, stderr) => {
      if (err) {
        err.message = `${path.basename(cmd)}: ${String(stderr || err.message).trim().split('\n').slice(-3).join(' ')}`;
        reject(err);
      } else {
        resolve(String(stdout));
      }
    });
  });
}

/**
 * The first Postgres with TimescaleDB installed: { bin, pkglibdir, timescale }.
 * If Postgres is there without TimescaleDB, that one (timescale: false); null
 * if there's none.
 */
async function findPostgres(bins = candidateBins()) {
  let without = null;
  for (const bin of bins) {
    if (!['postgres', 'pg_ctl', 'initdb', 'pg_config'].every((f) => fs.existsSync(path.join(bin, f)))) continue;
    let pkglibdir;
    try {
      pkglibdir = (await run(path.join(bin, 'pg_config'), ['--pkglibdir'], { timeout: 5000 })).trim();
    } catch {
      continue;
    }
    let files = [];
    try {
      files = fs.readdirSync(pkglibdir);
    } catch {
      // unreadable
    }
    const found = { bin, pkglibdir, timescale: files.some((f) => /^timescaledb\.(so|dylib)$/.test(f)) };
    if (found.timescale) return found;
    if (!without) without = found;
  }
  return without;
}

/** The id an event gets in the database: the same for the live write and the line in events.jsonl. */
function eventUid(line) {
  return crypto.createHash('sha1').update(line).digest('hex').slice(0, 20);
}

/** An event-log entry as a database row (without its character). */
function eventRow(e, line = JSON.stringify(e)) {
  const { t, kind, key, app, site, title, text, ...rest } = e;
  const data = { ...rest };
  if (e.thought && !text) delete data.thought;
  return {
    t: new Date(t),
    kind: String(kind || 'unknown'),
    key: key || (kind === 'interact' ? interactionKey(text) : null),
    app: app || null,
    site: site || null,
    title: title || null,
    text: text || e.thought || null,
    data,
    uid: eventUid(line),
  };
}

/**
 * Minutes of what you were on, from old "you switched to …" entries (for
 * the time before the database ran): each one until the next, for at most
 * STORE.observeCap minutes (he can't tell any more whether you were away).
 */
function minutesFromObserves(events, until = Infinity) {
  const obs = events.filter((e) => e.kind === 'observe').sort((a, b) => a.t - b.t);
  const out = [];
  for (let i = 0; i < obs.length; i++) {
    const e = obs[i];
    const end = Math.min(i + 1 < obs.length ? obs[i + 1].t : e.t + STORE.observeCap * 60000, e.t + STORE.observeCap * 60000, until);
    for (let m = Math.ceil(e.t / 60000) * 60000; m < end; m += 60000) {
      out.push({ t: new Date(m), app: e.private ? null : e.app || null, site: e.private ? null : e.site || null, private: !!e.private });
    }
  }
  return out;
}

// The tables, policies and hourly totals (run on every start; changes nothing
// once it's all there).
const SCHEMA = [
  'CREATE EXTENSION IF NOT EXISTS timescaledb',
  `CREATE TABLE IF NOT EXISTS events (
    t timestamptz NOT NULL,
    companion text NOT NULL,
    kind text NOT NULL,
    key text,
    app text,
    site text,
    title text,
    text text,
    data jsonb NOT NULL DEFAULT '{}',
    uid text NOT NULL
  )`,
  "SELECT create_hypertable('events', by_range('t', INTERVAL '1 day'), if_not_exists => TRUE)",
  'CREATE UNIQUE INDEX IF NOT EXISTS events_uid ON events (companion, uid, t)',
  'CREATE INDEX IF NOT EXISTS events_kind ON events (companion, kind, t DESC)',
  `CREATE TABLE IF NOT EXISTS minutes (
    t timestamptz NOT NULL,
    companion text NOT NULL,
    mood text,
    energy real,
    hunger real,
    boredom real,
    affection real,
    app text,
    site text,
    private boolean NOT NULL DEFAULT false,
    away boolean,
    quiet boolean,
    source text NOT NULL DEFAULT 'live'
  )`,
  "SELECT create_hypertable('minutes', by_range('t', INTERVAL '7 days'), if_not_exists => TRUE)",
  'CREATE UNIQUE INDEX IF NOT EXISTS minutes_at ON minutes (companion, t)',
  // Older chunks move to the columnstore (smaller, faster to add up).
  "ALTER TABLE events SET (timescaledb.enable_columnstore = true, timescaledb.segmentby = 'companion', timescaledb.orderby = 't DESC')",
  "ALTER TABLE minutes SET (timescaledb.enable_columnstore = true, timescaledb.segmentby = 'companion', timescaledb.orderby = 't DESC')",
  `CALL add_columnstore_policy('events', after => INTERVAL '${STORE.columnstoreAfterDays} days', if_not_exists => true)`,
  `CALL add_columnstore_policy('minutes', after => INTERVAL '${STORE.columnstoreAfterDays} days', if_not_exists => true)`,
  `SELECT add_retention_policy('events', INTERVAL '${STORE.keepDays} days', if_not_exists => true)`,
  `SELECT add_retention_policy('minutes', INTERVAL '${STORE.keepDays} days', if_not_exists => true)`,
  // Hourly totals, kept up to date by TimescaleDB (and including the newest
  // rows when read). Hours are UTC hours: a week adds up the same.
  `CREATE MATERIALIZED VIEW IF NOT EXISTS events_hourly
    WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
    SELECT time_bucket('1 hour', t) AS hour, companion, kind, coalesce(key, '') AS key, count(*) AS n
    FROM events GROUP BY 1, 2, 3, 4 WITH NO DATA`,
  `CREATE MATERIALIZED VIEW IF NOT EXISTS minutes_hourly
    WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
    SELECT time_bucket('1 hour', t) AS hour, companion, app, site, mood, private, coalesce(away, false) AS away, count(*) AS minutes,
      avg(energy) AS energy, avg(hunger) AS hunger, avg(boredom) AS boredom, avg(affection) AS affection
    FROM minutes GROUP BY 1, 2, 3, 4, 5, 6, 7 WITH NO DATA`,
  "SELECT add_continuous_aggregate_policy('events_hourly', start_offset => INTERVAL '30 days', end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '30 minutes', if_not_exists => true)",
  "SELECT add_continuous_aggregate_policy('minutes_hourly', start_offset => INTERVAL '30 days', end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '30 minutes', if_not_exists => true)",
];

class Store {
  /**
   * @param {object} opts
   * @param {string} opts.dir   the database folder (…/Filo/database)
   * @param {object} [opts.pg]  findPostgres() result (looked up if missing)
   * @param {() => number} [opts.now]
   */
  constructor(opts) {
    this.dir = opts.dir;
    this.dataDir = path.join(this.dir, 'data');
    this.logFile = path.join(this.dir, 'postgres.log');
    this.socketDir = this.dir;
    this.pgInfo = opts.pg || null;
    this.now = opts.now || (() => Date.now());
    this.pool = null;
    this.state = 'off'; // off | starting | ready | missing | error
    this.error = null;
    this.version = null;
    this.pending = [];
    this.flushing = false;
    this.timer = null;
    this.importing = false;
    this.vectors = false; // pgvector is there and the memories table is ready
    this.vectorIndex = null; // 'diskann' (pgvectorscale) or 'hnsw' (pgvector)
    this.vectorNote = null;
    this.memoryCount = {}; // companion -> fingerprinted memories
    this.loaded = null; // old event-log lines loaded on this start (null: not yet)
    this.fingerprinting = {}; // companion -> { done, total } while new memories are fingerprinted
  }

  get ready() {
    return this.state === 'ready';
  }

  /** Start (making the database the first time), set up the tables, load old event logs. */
  async start({ imports = [] } = {}) {
    this.state = 'starting';
    try {
      if (!this.pgInfo) this.pgInfo = await findPostgres();
      if (!this.pgInfo || !this.pgInfo.timescale) {
        this.state = 'missing';
        this.error = this.pgInfo ? 'TimescaleDB isn’t installed for this Postgres' : 'Postgres isn’t installed';
        return false;
      }
      await this.startServer();
      await this.connect();
      for (const sql of SCHEMA) await this.pool.query(sql);
      const v = await this.pool.query("SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'");
      this.version = v.rows[0] ? v.rows[0].extversion : null;
      await this.setupVectors();
      this.state = 'ready';
      this.error = null;
      // Old event logs first: then nothing written live is counted twice.
      this.importing = true;
      this.loaded = null;
      let loaded = 0;
      for (const im of imports) {
        try {
          loaded += await this.importEvents(im.companion, im.files);
        } catch (e) {
          console.error(`Database: could not load ${im.companion}'s old events:`, e.message);
        }
      }
      this.importing = false;
      this.loaded = loaded;
      if (loaded) console.log(`Database: loaded ${loaded} old events`);
      this.timer = setInterval(() => this.flush(), STORE.flushEvery);
      this.flush();
      return true;
    } catch (e) {
      this.state = 'error';
      this.error = e.message;
      this.importing = false;
      console.error('Database:', e.message);
      return false;
    }
  }

  bin(name) {
    return path.join(this.pgInfo.bin, name);
  }

  /**
   * Where the socket file goes: our own folder, unless that path is too long
   * for a socket (about 104 bytes on macOS); then a private folder in /tmp.
   */
  pickSocketDir() {
    if (Buffer.byteLength(path.join(this.dir, '.s.PGSQL.5432.lock')) <= 100) return this.dir;
    const dir = path.join('/tmp', `companion-db-${process.getuid ? process.getuid() : 'user'}`);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const st = fs.statSync(dir);
    if (process.getuid && st.uid !== process.getuid()) throw new Error(`${dir} belongs to someone else`);
    fs.chmodSync(dir, 0o700);
    return dir;
  }

  /** Make the database folder the first time; start our own server unless it's already running. */
  async startServer() {
    fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    this.socketDir = this.pickSocketDir();
    if (!fs.existsSync(path.join(this.dataDir, 'PG_VERSION'))) {
      await run(this.bin('initdb'), ['-D', this.dataDir, '-U', STORE.role, '--auth=trust', '--encoding=UTF8', '--locale=C'], { timeout: 120000 });
      fs.appendFileSync(path.join(this.dataDir, 'postgresql.conf'), "\ninclude_if_exists = 'companion.conf'\n");
    }
    // Rewritten every start (the folder may have moved). No TCP at all: only
    // the socket in our own folder.
    const conf = [
      "listen_addresses = ''",
      `unix_socket_directories = '${this.socketDir.replace(/'/g, "''")}'`,
      'unix_socket_permissions = 0700',
      "shared_preload_libraries = 'timescaledb'",
      "timescaledb.telemetry_level = 'off'",
      'max_connections = 20',
      'shared_buffers = 64MB',
      'max_worker_processes = 16',
      'timescaledb.max_background_workers = 8',
      "log_min_messages = 'warning'",
    ];
    fs.writeFileSync(path.join(this.dataDir, 'companion.conf'), `${conf.join('\n')}\n`);
    try {
      await run(this.bin('pg_ctl'), ['status', '-D', this.dataDir], { timeout: 10000 });
      return; // still running (the app didn't quit cleanly last time)
    } catch {
      // not running
    }
    await run(this.bin('pg_ctl'), ['start', '-w', '-t', '60', '-D', this.dataDir, '-l', this.logFile], { timeout: 90000 });
  }

  async connect() {
    const { Pool } = require('pg');
    const base = { host: this.socketDir, port: 5432, user: STORE.role, max: 4 };
    const admin = new Pool({ ...base, database: 'postgres', max: 1 });
    try {
      const has = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [STORE.database]);
      if (!has.rowCount) await admin.query(`CREATE DATABASE ${STORE.database}`);
    } finally {
      await admin.end();
    }
    this.pool = new Pool({ ...base, database: STORE.database });
    this.pool.on('error', (e) => console.error('Database:', e.message));
  }

  /** Stop our server (when the app quits). */
  async stop() {
    clearInterval(this.timer);
    this.timer = null;
    await this.flush().catch(() => {});
    if (this.pool) await this.pool.end().catch(() => {});
    this.pool = null;
    if (this.pgInfo && this.pgInfo.timescale && fs.existsSync(path.join(this.dataDir, 'postmaster.pid'))) {
      await run(this.bin('pg_ctl'), ['stop', '-m', 'fast', '-w', '-D', this.dataDir], { timeout: 20000 }).catch(() => {});
    }
    if (this.state === 'ready') this.state = 'off';
  }

  // ------------------------------------------------------------ writing

  /** An event-log entry of character `companion` (written within a few seconds). */
  addEvent(companion, e) {
    this.queue({ table: 'events', companion, row: eventRow(e) });
  }

  /** Once a minute: his mood and needs, and what you're on. */
  addMinute(companion, m) {
    const t = new Date(Math.floor((m.t || this.now()) / 60000) * 60000);
    const n = m.needs || {};
    this.queue({
      table: 'minutes',
      companion,
      row: {
        t,
        mood: m.mood || null,
        energy: num(n.energy),
        hunger: num(n.hunger),
        boredom: num(n.boredom),
        affection: num(n.affection),
        app: m.private ? null : m.app || null,
        site: m.private ? null : m.site || null,
        private: !!m.private,
        away: !!m.away,
        quiet: !!m.quiet,
      },
    });
  }

  queue(item) {
    if (this.state === 'missing' || this.state === 'error') return;
    this.pending.push(item);
    if (this.pending.length > STORE.maxPending) this.pending.splice(0, this.pending.length - STORE.maxPending);
  }

  /** Write what's waiting (skipped while old logs are being loaded). */
  async flush() {
    if (!this.ready || this.importing || this.flushing || !this.pending.length) return;
    this.flushing = true;
    const batch = this.pending.splice(0, this.pending.length);
    try {
      const byTable = { events: [], minutes: [] };
      for (const b of batch) byTable[b.table].push(b);
      await this.insertEvents(byTable.events.map((b) => ({ companion: b.companion, ...b.row })));
      await this.insertMinutes(byTable.minutes.map((b) => ({ companion: b.companion, ...b.row })), 'live');
    } catch (e) {
      console.error('Database write:', e.message);
    } finally {
      this.flushing = false;
    }
  }

  async insertEvents(rows) {
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      if (!chunk.length) continue;
      const cols = ['t', 'companion', 'kind', 'key', 'app', 'site', 'title', 'text', 'data', 'uid'];
      const { sql, params } = values(chunk, cols, (r) => [r.t, r.companion, r.kind, r.key, r.app, r.site, r.title, r.text, JSON.stringify(r.data || {}), r.uid]);
      await this.pool.query(`INSERT INTO events (${cols.join(', ')}) VALUES ${sql} ON CONFLICT DO NOTHING`, params);
    }
  }

  /** Live minutes replace what an old log guessed for the same minute; guesses never replace live ones. */
  async insertMinutes(rows, source) {
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      if (!chunk.length) continue;
      const cols = ['t', 'companion', 'mood', 'energy', 'hunger', 'boredom', 'affection', 'app', 'site', 'private', 'away', 'quiet', 'source'];
      const { sql, params } = values(chunk, cols, (r) => [r.t, r.companion, r.mood || null, r.energy ?? null, r.hunger ?? null, r.boredom ?? null, r.affection ?? null, r.app || null, r.site || null, !!r.private, r.away ?? null, r.quiet ?? null, source]);
      const onConflict =
        source === 'live'
          ? 'ON CONFLICT (companion, t) DO UPDATE SET mood = EXCLUDED.mood, energy = EXCLUDED.energy, hunger = EXCLUDED.hunger, boredom = EXCLUDED.boredom, affection = EXCLUDED.affection, app = EXCLUDED.app, site = EXCLUDED.site, private = EXCLUDED.private, away = EXCLUDED.away, quiet = EXCLUDED.quiet, source = EXCLUDED.source'
          : 'ON CONFLICT DO NOTHING';
      await this.pool.query(`INSERT INTO minutes (${cols.join(', ')}) VALUES ${sql} ${onConflict}`, params);
    }
  }

  /**
   * Load character `companion`'s old event-log lines (oldest file first) that
   * are newer than anything the database already has from it, within the
   * last 90 days. Returns how many entries were loaded.
   */
  async importEvents(companion, files) {
    const r = await this.pool.query('SELECT extract(epoch FROM max(t)) * 1000 AS last FROM events WHERE companion = $1', [companion]);
    const last = r.rows[0] && r.rows[0].last != null ? Number(r.rows[0].last) : -Infinity;
    const since = Math.max(last, this.now() - STORE.keepDays * 24 * 3600 * 1000);
    const rows = [];
    const entries = [];
    for (const file of files) {
      let text;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        let e;
        try {
          e = JSON.parse(line);
        } catch {
          continue;
        }
        if (!Number.isFinite(e.t) || e.t <= since) continue;
        entries.push(e);
        rows.push({ companion, ...eventRow(e, line) });
      }
    }
    if (!rows.length) return 0;
    await this.insertEvents(rows);
    const minutes = minutesFromObserves(entries, this.now()).map((m) => ({ companion, ...m }));
    await this.insertMinutes(minutes, 'old log');
    return rows.length;
  }

  // ------------------------------------------------------------ meaning (part 3)

  /** The memories table and its index, if pgvector is installed. */
  async setupVectors() {
    try {
      await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    } catch {
      this.vectors = false;
      this.vectorNote = 'pgvector isn’t installed (brew install pgvector), so he recalls by words';
      return;
    }
    await this.pool.query(`CREATE TABLE IF NOT EXISTS memories (
      companion text NOT NULL,
      hash text NOT NULL,
      kind text NOT NULL,
      text text NOT NULL,
      day date,
      importance smallint,
      embedding vector(${STORE.dims}) NOT NULL,
      PRIMARY KEY (companion, hash)
    )`);
    const has = await this.pool.query("SELECT indexdef FROM pg_indexes WHERE tablename = 'memories' AND indexname = 'memories_meaning'");
    if (has.rowCount) {
      this.vectorIndex = /diskann/i.test(has.rows[0].indexdef) ? 'diskann' : 'hnsw';
    } else {
      try {
        await this.pool.query('CREATE EXTENSION IF NOT EXISTS vectorscale CASCADE');
        await this.pool.query('CREATE INDEX memories_meaning ON memories USING diskann (embedding vector_cosine_ops)');
        this.vectorIndex = 'diskann';
      } catch {
        await this.pool.query('CREATE INDEX IF NOT EXISTS memories_meaning ON memories USING hnsw (embedding vector_cosine_ops)');
        this.vectorIndex = 'hnsw';
      }
    }
    this.vectors = true;
    this.vectorNote = null;
  }

  /**
   * Keep character `companion`'s fingerprints in step with its memories
   * ([{ kind, text, date, importance }]): new ones are fingerprinted with
   * `embed(texts)`, forgotten ones removed. Returns { added, removed }.
   */
  async syncMemories(companion, items, embed) {
    if (!this.ready || !this.vectors) return null;
    const want = new Map();
    for (const it of items) if (it && it.text && it.text.trim()) want.set(memoryHash(it), it);
    const have = new Set((await this.pool.query('SELECT hash FROM memories WHERE companion = $1', [companion])).rows.map((r) => r.hash));
    const gone = [...have].filter((h) => !want.has(h));
    if (gone.length) await this.pool.query('DELETE FROM memories WHERE companion = $1 AND hash = ANY($2)', [companion, gone]);
    const add = [...want].filter(([h]) => !have.has(h));
    let added = 0;
    if (add.length) this.fingerprinting[companion] = { done: 0, total: add.length };
    for (let i = 0; i < add.length; i += STORE.embedBatch) {
      const batch = add.slice(i, i + STORE.embedBatch);
      const vecs = await embed(batch.map(([, it]) => it.text));
      const rows = batch.map(([h, it], j) => ({ h, it, v: vecs[j] })).filter((r) => Array.isArray(r.v) && r.v.length === STORE.dims);
      if (!rows.length) continue;
      const { sql, params } = values(rows, ['c', 'h', 'k', 't', 'd', 'i', 'e'], (r) => [companion, r.h, r.it.kind, r.it.text, r.it.date || null, Number.isFinite(r.it.importance) ? r.it.importance : null, vectorText(r.v)]);
      await this.pool.query(`INSERT INTO memories (companion, hash, kind, text, day, importance, embedding) VALUES ${sql} ON CONFLICT DO NOTHING`, params);
      added += rows.length;
      this.fingerprinting[companion] = { done: Math.min(i + STORE.embedBatch, add.length), total: add.length };
    }
    delete this.fingerprinting[companion];
    this.memoryCount[companion] = want.size;
    return { added, removed: gone.length };
  }

  /** The memories closest in meaning to `vector`: [{ text, kind, similarity }] (cosine, -1..1). */
  async nearest(companion, vector, k = 30) {
    if (!this.ready || !this.vectors || !Array.isArray(vector)) return [];
    const r = await this.pool.query(
      'SELECT text, kind, 1 - (embedding <=> $2::vector) AS similarity FROM memories WHERE companion = $1 ORDER BY embedding <=> $2::vector LIMIT $3',
      [companion, vectorText(vector), k],
    );
    return r.rows.map((x) => ({ text: x.text, kind: x.kind, similarity: Number(x.similarity) }));
  }

  // ------------------------------------------------------------ reading

  /**
   * The week in numbers for character `companion` (`from`..`to`, ms), from the
   * hourly totals. `tz`: your time zone, for late nights and days.
   */
  async week(companion, { from, to, tz = Intl.DateTimeFormat().resolvedOptions().timeZone } = {}) {
    if (!this.ready) return null;
    to = to || this.now();
    from = from || to - 7 * 24 * 3600 * 1000;
    const span = [companion, new Date(from), new Date(to)];
    const q = (sql, params = span) => this.pool.query(sql, params).then((r) => r.rows);
    const at = 'companion = $1 AND hour >= $2 AND hour < $3';
    const [apps, sites, moods, totals, late, counts, shows] = await Promise.all([
      q(`SELECT app, sum(minutes)::int AS minutes FROM minutes_hourly WHERE ${at} AND NOT private AND NOT away AND app IS NOT NULL GROUP BY app ORDER BY 2 DESC LIMIT 6`),
      q(`SELECT site, sum(minutes)::int AS minutes FROM minutes_hourly WHERE ${at} AND NOT private AND NOT away AND site IS NOT NULL GROUP BY site ORDER BY 2 DESC LIMIT 6`),
      q(`SELECT mood, sum(minutes)::int AS minutes FROM minutes_hourly WHERE ${at} AND mood IS NOT NULL GROUP BY mood ORDER BY 2 DESC`),
      q(
        `SELECT coalesce(sum(minutes) FILTER (WHERE NOT away AND (app IS NOT NULL OR private)), 0)::int AS at_computer,
          count(DISTINCT date_trunc('day', hour AT TIME ZONE $4)) FILTER (WHERE NOT away AND (app IS NOT NULL OR private))::int AS days
         FROM minutes_hourly WHERE ${at}`,
        [...span, tz],
      ),
      // Late nights: days you were still at the computer between midnight and 4 am.
      q(
        `SELECT count(DISTINCT date_trunc('day', hour AT TIME ZONE $4))::int AS nights FROM minutes_hourly
         WHERE ${at} AND NOT away AND (app IS NOT NULL OR private) AND extract(hour FROM hour AT TIME ZONE $4) < 4`,
        [...span, tz],
      ),
      q(`SELECT kind, key, sum(n)::int AS n FROM events_hourly WHERE ${at} GROUP BY kind, key`),
      q("SELECT DISTINCT data->>'what' AS what FROM events WHERE companion = $1 AND t >= $2 AND t < $3 AND kind = 'watched' AND data ? 'what' LIMIT 8"),
    ]);
    const count = (kind, key = '') => counts.filter((c) => c.kind === kind && (key === null || c.key === key)).reduce((s, c) => s + c.n, 0);
    const key = (k) => count('interact', k);
    return {
      from,
      to,
      days: totals[0] ? totals[0].days : 0,
      hoursAtComputer: totals[0] ? Math.round(totals[0].at_computer / 6) / 10 : 0,
      lateNights: late[0] ? late[0].nights : 0,
      apps: apps.map((a) => ({ app: a.app, hours: Math.round(a.minutes / 6) / 10 })),
      sites: sites.map((s) => ({ site: s.site, hours: Math.round(s.minutes / 6) / 10 })),
      moods: Object.fromEntries(moods.map((m) => [m.mood, m.minutes])),
      together: {
        pets: key('heart'),
        throws: key('throw'),
        fetches: key('gotBall'),
        ticTacToe: key('tttYouWin') + key('tttIWin') + key('tttDraw'),
        youWonTicTacToe: key('tttYouWin'),
        chats: count('chat', null),
        backAfterBreaks: key('welcomeBack'),
      },
      care: {
        water: key('waterDone'),
        stretches: key('stretchDone'),
        bedtimes: key('bedtimeDone'),
        ignoredReminders: key('nudgeLater'),
      },
      said: count('said', ''),
      keptQuiet: count('silent', ''),
      shows: shows.map((s) => s.what).filter(Boolean),
    };
  }

  /** "running (TimescaleDB 2.31.0)", "not installed: …" (brain view, report). */
  /**
   * "running (TimescaleDB 2.31.0) · old activity loaded (1234 events) ·
   * 150 memories ready for recall by meaning (HNSW)", with progress while
   * loading and fingerprinting (brain view, report).
   */
  status(companion = null) {
    if (this.state === 'ready') {
      const parts = [`running (TimescaleDB ${this.version || '?'})`];
      if (this.importing) parts.push('loading your old activity…');
      else if (this.loaded) parts.push(`old activity loaded (${this.loaded} events)`);
      const index = this.vectorIndex === 'diskann' ? 'DiskANN' : 'HNSW';
      const f = companion != null ? this.fingerprinting[companion] : null;
      const n = companion != null ? this.memoryCount[companion] : null;
      if (!this.vectors) {
        if (this.vectorNote) parts.push(this.vectorNote);
      } else if (f) {
        parts.push(`fingerprinting memories ${f.done}/${f.total}…`);
      } else if (Number.isFinite(n)) {
        parts.push(`${n} memories ready for recall by meaning (${index})`);
      } else {
        parts.push('recall by meaning starts when his models are awake');
      }
      return parts.join(' · ');
    }
    if (this.state === 'missing') return `not installed: ${this.error}`;
    if (this.state === 'error') return `error: ${this.error}`;
    return this.state;
  }
}

function num(x) {
  return Number.isFinite(x) ? x : null;
}

/** "($1, $2, …), (…)" and the parameters for a multi-row insert. */
function values(rows, cols, pick) {
  const params = [];
  const groups = rows.map((r) => {
    const v = pick(r);
    const start = params.length;
    params.push(...v);
    return `(${cols.map((_, i) => `$${start + i + 1}`).join(', ')})`;
  });
  return { sql: groups.join(', '), params };
}

/** Which memory a row is (the same text of the same kind is the same memory). */
function memoryHash(it) {
  return crypto.createHash('sha1').update(`${it.kind}\n${it.text}`).digest('hex').slice(0, 20);
}

/** pgvector's text form: [0.1,0.2,…] */
function vectorText(v) {
  return `[${v.map((x) => (Number.isFinite(x) ? x : 0)).join(',')}]`;
}

/** Where the shared database lives inside the app's data folder. */
function databaseDir(userData) {
  return path.join(userData, 'database');
}

module.exports = { Store, STORE, findPostgres, candidateBins, eventRow, eventUid, minutesFromObserves, databaseDir, memoryHash, vectorText, SCHEMA };
