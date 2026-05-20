import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../src/migrate';
import { sha256 } from '../src/migration-files';
import { resetTestDb, makeTestPool, makeTempMigrationsDir, cleanupDir } from './helpers';

async function tableExists(pool: ReturnType<typeof makeTestPool>, name: string): Promise<boolean> {
  const r = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [name]
  );
  return r.rows[0].exists;
}

test('migrate: applies a single migration to an empty DB and records checksum', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    '20260101_120000_create_foo.sql': 'CREATE TABLE foo (id INTEGER PRIMARY KEY);',
  });
  try {
    const applied = await runMigrations(pool, dir);
    assert.equal(applied, 1);
    assert.equal(await tableExists(pool, 'foo'), true);

    const { rows } = await pool.query<{ filename: string; checksum: string }>(
      'SELECT filename, checksum FROM schema_migrations'
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].filename, '20260101_120000_create_foo.sql');
    assert.equal(rows[0].checksum, sha256('CREATE TABLE foo (id INTEGER PRIMARY KEY);'));
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});

test('migrate: second run is a no-op (idempotent)', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    '20260101_120000_create_foo.sql': 'CREATE TABLE foo (id INTEGER);',
  });
  try {
    await runMigrations(pool, dir);
    const applied2 = await runMigrations(pool, dir);
    assert.equal(applied2, 0);

    const { rows } = await pool.query('SELECT count(*)::int AS n FROM schema_migrations');
    assert.equal(rows[0].n, 1);
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});

test('migrate: applies multiple pending migrations in alphabetical order', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    '20260101_120000_a.sql': 'CREATE TABLE a (id INTEGER);',
    '20260102_120000_b.sql': 'CREATE TABLE b (id INTEGER);',
    '20260103_120000_c.sql': 'CREATE TABLE c (id INTEGER);',
  });
  try {
    const applied = await runMigrations(pool, dir);
    assert.equal(applied, 3);

    const { rows } = await pool.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY applied_at'
    );
    assert.deepEqual(
      rows.map((r) => r.filename),
      ['20260101_120000_a.sql', '20260102_120000_b.sql', '20260103_120000_c.sql']
    );
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});

test('migrate: a failing migration rolls back; nothing is recorded and partial DDL is undone', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    '20260101_120000_bad.sql': 'CREATE TABLE good (id INTEGER); NOT_VALID_SQL;',
  });
  try {
    await assert.rejects(
      () => runMigrations(pool, dir),
      /Migration "20260101_120000_bad\.sql" failed/
    );

    assert.equal(await tableExists(pool, 'good'), false);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM schema_migrations');
    assert.equal(rows[0].n, 0);
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});

test('migrate: modifying an applied migration causes the next run to fail', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    '20260101_120000_create_foo.sql': 'CREATE TABLE foo (id INTEGER);',
  });
  try {
    await runMigrations(pool, dir);
    fs.writeFileSync(
      path.join(dir, '20260101_120000_create_foo.sql'),
      'CREATE TABLE foo (id INTEGER, extra TEXT);'
    );

    await assert.rejects(
      () => runMigrations(pool, dir),
      /was modified after being applied/
    );
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});

test('migrate: rejects a file that does not match the filename convention', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    'bad-name.sql': 'CREATE TABLE foo (id INTEGER);',
  });
  try {
    await assert.rejects(
      () => runMigrations(pool, dir),
      /Invalid migration filename/
    );
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});
