import test from 'node:test';
import assert from 'node:assert/strict';
import { diffSchemas, introspect } from '../src/schema-diff';
import { runMigrations } from '../src/migrate';
import { DesiredTable as TableDef } from '../src/structure-adapter';
import { resetTestDb, makeTestPool, makeTempMigrationsDir, cleanupDir } from './helpers';

// diffSchemas is pure — these tests build the "actual" DB state as plain maps.
type DbColumn = { type: string; notnull: boolean; default: string | null };

function dbTable(
  columns: Record<string, Partial<DbColumn> & { type: string }>,
  pk: string[] = []
) {
  const m = new Map<string, DbColumn>();
  for (const [name, c] of Object.entries(columns)) {
    m.set(name, { type: c.type, notnull: c.notnull ?? false, default: c.default ?? null });
  }
  return { columns: m, pk };
}

test('diff: identical schemas produce no statements', () => {
  const desired: Record<string, TableDef> = {
    foo: { columns: { id: { type: 'INTEGER', nullable: false } }, pk: ['id'] },
  };
  const actual = new Map([['foo', dbTable({ id: { type: 'integer', notnull: true } }, ['id'])]]);

  const { statements, warnings } = diffSchemas(desired, actual);
  assert.deepEqual(statements, []);
  assert.deepEqual(warnings, []);
});

test('diff: type names are compared canonically (VARCHAR vs character varying)', () => {
  const desired: Record<string, TableDef> = {
    foo: { columns: { name: { type: 'VARCHAR(50)' } }, pk: [] },
  };
  const actual = new Map([['foo', dbTable({ name: { type: 'character varying(50)' } })]]);

  const { statements } = diffSchemas(desired, actual);
  assert.deepEqual(statements, []);
});

test('diff: missing table generates CREATE TABLE with PK', () => {
  const desired: Record<string, TableDef> = {
    foo: {
      columns: { id: { type: 'INTEGER', nullable: false }, name: { type: 'TEXT' } },
      pk: ['id'],
    },
  };

  const { statements } = diffSchemas(desired, new Map());
  assert.equal(statements.length, 1);
  assert.match(statements[0], /CREATE TABLE foo/);
  assert.match(statements[0], /id INTEGER NOT NULL/);
  assert.match(statements[0], /PRIMARY KEY \(id\)/);
});

test('diff: new nullable column generates a plain ADD COLUMN', () => {
  const desired: Record<string, TableDef> = {
    foo: { columns: { id: { type: 'INTEGER' }, phone: { type: 'VARCHAR(30)' } }, pk: [] },
  };
  const actual = new Map([['foo', dbTable({ id: { type: 'integer' } })]]);

  const { statements } = diffSchemas(desired, actual);
  assert.deepEqual(statements, ['ALTER TABLE foo ADD COLUMN phone VARCHAR(30);']);
});

test('diff: new NOT NULL column without default generates the backfill skeleton', () => {
  const desired: Record<string, TableDef> = {
    foo: { columns: { id: { type: 'INTEGER' }, legajo: { type: 'VARCHAR(30)', nullable: false } }, pk: [] },
  };
  const actual = new Map([['foo', dbTable({ id: { type: 'integer' } })]]);

  const { statements } = diffSchemas(desired, actual);
  assert.equal(statements.length, 1);
  assert.match(statements[0], /ADD COLUMN legajo VARCHAR\(30\);/);
  assert.match(statements[0], /TODO: backfill/);
  assert.match(statements[0], /SET NOT NULL;/);
});

test('diff: new NOT NULL column WITH default is a single safe statement', () => {
  const desired: Record<string, TableDef> = {
    foo: {
      columns: { id: { type: 'INTEGER' }, status: { type: 'VARCHAR(20)', nullable: false, default: "'active'" } },
      pk: [],
    },
  };
  const actual = new Map([['foo', dbTable({ id: { type: 'integer' } })]]);

  const { statements } = diffSchemas(desired, actual);
  assert.deepEqual(statements, [
    "ALTER TABLE foo ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;",
  ]);
});

test('diff: column removed from desired schema emits a commented DROP with rename warning', () => {
  const desired: Record<string, TableDef> = {
    foo: { columns: { id: { type: 'INTEGER' } }, pk: [] },
  };
  const actual = new Map([['foo', dbTable({ id: { type: 'integer' }, old_col: { type: 'text' } })]]);

  const { statements } = diffSchemas(desired, actual);
  assert.equal(statements.length, 1);
  assert.match(statements[0], /RENAME/);
  assert.match(statements[0], /-- ALTER TABLE foo DROP COLUMN old_col;/);
  assert.doesNotMatch(statements[0], /^ALTER TABLE foo DROP COLUMN/m);
});

test('diff: tightening nullability emits SET NOT NULL with a backfill warning', () => {
  const desired: Record<string, TableDef> = {
    foo: { columns: { email: { type: 'TEXT', nullable: false } }, pk: [] },
  };
  const actual = new Map([['foo', dbTable({ email: { type: 'text', notnull: false } })]]);

  const { statements } = diffSchemas(desired, actual);
  assert.equal(statements.length, 1);
  assert.match(statements[0], /TODO: backfill/);
  assert.match(statements[0], /ALTER TABLE foo ALTER COLUMN email SET NOT NULL;/);
});

test('diff: PK difference is a warning, never a statement', () => {
  const desired: Record<string, TableDef> = {
    foo: { columns: { id: { type: 'INTEGER', nullable: false } }, pk: ['id'] },
  };
  const actual = new Map([['foo', dbTable({ id: { type: 'integer', notnull: true } }, [])]]);

  const { statements, warnings } = diffSchemas(desired, actual);
  assert.deepEqual(statements, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Primary key of "foo" differs/);
});

test('introspect: reads back what a migration created', async () => {
  await resetTestDb();
  const pool = makeTestPool();
  const dir = makeTempMigrationsDir({
    '20260101_120000_create_foo.sql':
      'CREATE TABLE foo (id INTEGER PRIMARY KEY, name VARCHAR(50) NOT NULL, note TEXT);',
  });
  try {
    await runMigrations(pool, dir);
    const schema = await introspect(pool);

    const foo = schema.get('foo');
    assert.ok(foo, 'table foo introspected');
    assert.deepEqual(foo.pk, ['id']);
    assert.equal(foo.columns.get('name')!.type, 'character varying(50)');
    assert.equal(foo.columns.get('name')!.notnull, true);
    assert.equal(foo.columns.get('note')!.notnull, false);
    assert.equal(schema.has('schema_migrations'), false, 'schema_migrations excluded');
  } finally {
    await pool.end();
    cleanupDir(dir);
  }
});
