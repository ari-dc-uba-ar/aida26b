import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../src/migrate';
import { assertSchemaInSync } from '../src/schema-lock';
import { resetTestDb, makeTestPool, makeTempMigrationsDir, cleanupDir } from './helpers';

test('schema-lock: passes when DB matches the on-disk migrations', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    '20260101_120000_create_foo.sql': 'CREATE TABLE foo (id INTEGER);',
  });
  try {
    await runMigrations(pool, dir);
    await assert.doesNotReject(() => assertSchemaInSync(pool, dir));
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});

test('schema-lock: fails when there are migration files not yet applied', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    '20260101_120000_a.sql': 'CREATE TABLE a (id INTEGER);',
    '20260102_120000_b.sql': 'CREATE TABLE b (id INTEGER);',
  });
  try {
    await runMigrations(pool, dir);
    fs.writeFileSync(
      path.join(dir, '20260103_120000_c.sql'),
      'CREATE TABLE c (id INTEGER);'
    );

    await assert.rejects(
      () => assertSchemaInSync(pool, dir),
      /Pending migrations not yet applied[\s\S]*20260103_120000_c\.sql/
    );
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});

test('schema-lock: fails when the DB has applied a migration not present on disk', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    '20260101_120000_a.sql': 'CREATE TABLE a (id INTEGER);',
  });
  try {
    await runMigrations(pool, dir);
    await pool.query(
      `INSERT INTO schema_migrations (filename, checksum)
       VALUES ('20260102_120000_phantom.sql', 'deadbeef')`
    );

    await assert.rejects(
      () => assertSchemaInSync(pool, dir),
      /Database has migrations not present in this code[\s\S]*20260102_120000_phantom\.sql/
    );
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});

test('schema-lock: fails when an applied migration file has been modified', async () => {
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
      () => assertSchemaInSync(pool, dir),
      /Applied migrations were modified on disk[\s\S]*20260101_120000_create_foo\.sql/
    );
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});

test('schema-lock: fails when the schema_migrations table does not exist', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({});
  try {
    await assert.rejects(
      () => assertSchemaInSync(pool, dir),
      /schema_migrations table does not exist[\s\S]*not been migrated yet/
    );
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});

test('schema-lock: reports pending and tampered problems together when both happen', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    '20260101_120000_a.sql': 'CREATE TABLE a (id INTEGER);',
  });
  try {
    await runMigrations(pool, dir);
    fs.writeFileSync(path.join(dir, '20260101_120000_a.sql'), 'CREATE TABLE a (id BIGINT);');
    fs.writeFileSync(path.join(dir, '20260102_120000_b.sql'), 'CREATE TABLE b (id INTEGER);');

    let err: Error | undefined;
    try {
      await assertSchemaInSync(pool, dir);
    } catch (e) {
      err = e as Error;
    }
    assert.ok(err, 'expected assertSchemaInSync to throw');
    assert.match(err.message, /Pending migrations not yet applied[\s\S]*20260102_120000_b\.sql/);
    assert.match(err.message, /Applied migrations were modified on disk[\s\S]*20260101_120000_a\.sql/);
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});
