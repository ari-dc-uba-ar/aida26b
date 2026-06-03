// Schema diff: compares the declarative desired schema (schema-def.ts) against
// the live database and generates a DRAFT migration file for the difference.
//
// The generated file is a starting point, not a finished migration:
//   - destructive statements (DROP) are emitted commented-out
//   - NOT NULL additions are emitted as a 3-step skeleton with a TODO backfill
//   - renames cannot be detected (they appear as DROP + ADD — rewrite by hand)
//
// Scope: tables, columns (type / nullability / default) and primary keys
// (PK changes are reported as warnings only). FKs and indexes are out of scope.

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { DEFAULT_MIGRATIONS_DIR, listMigrationFiles } from './migration-files';
import { desiredSchema, TableDef } from './schema-def';

type DbColumn = { type: string; notnull: boolean; default: string | null };
type DbTable = { columns: Map<string, DbColumn>; pk: string[] };
type DbSchema = Map<string, DbTable>;

// Normalize a type name so 'VARCHAR(20)' (schema-def) and
// 'character varying(20)' (pg catalog) compare as equal.
function canonType(t: string): string {
  return t
    .trim()
    .toLowerCase()
    .replace(/^varchar/, 'character varying')
    .replace(/^char\(/, 'character(')
    .replace(/^(int|int4)\b/, 'integer')
    .replace(/^(bool)\b/, 'boolean')
    .replace(/^timestamptz\b/, 'timestamp with time zone')
    .replace(/^decimal/, 'numeric');
}

export async function introspect(pool: Pool): Promise<DbSchema> {
  const { rows: cols } = await pool.query<{
    table: string;
    column: string;
    type: string;
    notnull: boolean;
    default: string | null;
  }>(`
    SELECT c.relname AS "table", a.attname AS "column",
           format_type(a.atttypid, a.atttypmod) AS "type",
           a.attnotnull AS "notnull",
           pg_get_expr(d.adbin, d.adrelid) AS "default"
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> 'schema_migrations'
    ORDER BY c.relname, a.attnum
  `);

  const { rows: pks } = await pool.query<{ table: string; column: string }>(`
    SELECT c.relname AS "table", a.attname AS "column"
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
    WHERE i.indisprimary AND n.nspname = 'public'
  `);

  const schema: DbSchema = new Map();
  for (const r of cols) {
    if (!schema.has(r.table)) {
      schema.set(r.table, { columns: new Map(), pk: [] });
    }
    schema.get(r.table)!.columns.set(r.column, {
      type: r.type,
      notnull: r.notnull,
      default: r.default,
    });
  }
  for (const r of pks) {
    schema.get(r.table)?.pk.push(r.column);
  }
  return schema;
}

function columnSql(name: string, def: TableDef['columns'][string]): string {
  let sql = `${name} ${def.type}`;
  if (def.default !== undefined) sql += ` DEFAULT ${def.default}`;
  if (def.nullable === false) sql += ' NOT NULL';
  return sql;
}

export function diffSchemas(
  desired: Record<string, TableDef>,
  actual: DbSchema
): { statements: string[]; warnings: string[] } {
  const statements: string[] = [];
  const warnings: string[] = [];

  for (const [table, def] of Object.entries(desired)) {
    const dbTable = actual.get(table);

    if (!dbTable) {
      const cols = Object.entries(def.columns).map(([n, c]) => `    ${columnSql(n, c)}`);
      cols.push(`    PRIMARY KEY (${def.pk.join(', ')})`);
      statements.push(`CREATE TABLE ${table} (\n${cols.join(',\n')}\n);`);
      continue;
    }

    for (const [col, colDef] of Object.entries(def.columns)) {
      const dbCol = dbTable.columns.get(col);

      if (!dbCol) {
        if (colDef.nullable === false && colDef.default === undefined) {
          // NOT NULL without default cannot be applied in one step to a table
          // with rows — emit the add/backfill/enforce skeleton instead.
          statements.push(
            `ALTER TABLE ${table} ADD COLUMN ${col} ${colDef.type};\n` +
              `-- TODO: backfill before enforcing NOT NULL, e.g.:\n` +
              `-- UPDATE ${table} SET ${col} = ... WHERE ${col} IS NULL;\n` +
              `ALTER TABLE ${table} ALTER COLUMN ${col} SET NOT NULL;`
          );
        } else {
          statements.push(`ALTER TABLE ${table} ADD COLUMN ${columnSql(col, colDef)};`);
        }
        continue;
      }

      if (canonType(colDef.type) !== canonType(dbCol.type)) {
        statements.push(
          `-- type change ${dbCol.type} -> ${colDef.type}: may need USING to convert data\n` +
            `ALTER TABLE ${table} ALTER COLUMN ${col} TYPE ${colDef.type};`
        );
      }

      const wantNotNull = colDef.nullable === false;
      if (wantNotNull && !dbCol.notnull) {
        statements.push(
          `-- TODO: backfill NULLs first or this will fail on existing rows\n` +
            `ALTER TABLE ${table} ALTER COLUMN ${col} SET NOT NULL;`
        );
      } else if (!wantNotNull && dbCol.notnull && !dbTable.pk.includes(col)) {
        statements.push(`ALTER TABLE ${table} ALTER COLUMN ${col} DROP NOT NULL;`);
      }
    }

    for (const col of dbTable.columns.keys()) {
      if (!(col in def.columns)) {
        statements.push(
          `-- ⚠️ column exists in DB but not in schema-def. If this was a RENAME,\n` +
            `-- rewrite as: ALTER TABLE ${table} RENAME COLUMN ${col} TO <new_name>;\n` +
            `-- Uncomment only if you really want to destroy this data:\n` +
            `-- ALTER TABLE ${table} DROP COLUMN ${col};`
        );
      }
    }

    const desiredPk = [...def.pk].sort().join(',');
    const actualPk = [...dbTable.pk].sort().join(',');
    if (desiredPk !== actualPk) {
      warnings.push(
        `Primary key of "${table}" differs (DB: ${actualPk || 'none'}, desired: ${desiredPk}). ` +
          `PK changes are not auto-generated — write that migration by hand.`
      );
    }
  }

  for (const table of actual.keys()) {
    if (!(table in desired)) {
      statements.push(
        `-- ⚠️ table exists in DB but not in schema-def. If this was a RENAME,\n` +
          `-- rewrite as: ALTER TABLE ${table} RENAME TO <new_name>;\n` +
          `-- Uncomment only if you really want to destroy this data:\n` +
          `-- DROP TABLE ${table};`
      );
    }
  }

  return { statements, warnings };
}

export function writeDraft(dir: string, name: string, statements: string[]): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  const filename = `${stamp}_${name}.sql`;

  const header =
    `-- DRAFT generated by migrate:diff — review before applying.\n` +
    `-- The generator cannot detect renames or write data backfills; that part is yours.\n\n`;

  fs.writeFileSync(path.join(dir, filename), header + statements.join('\n\n') + '\n');
  return filename;
}

async function cli(): Promise<void> {
  const name = (process.argv[2] || 'auto_draft').toLowerCase();
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new Error(`Invalid migration name "${name}" — use lowercase_with_underscores.`);
  }

  const { pool } = await import('./db');
  try {
    // A draft diffed against a DB with pending migrations would conflict with
    // them once `migrate` replays everything in order — refuse, like Flyway/Atlas.
    const exists = await pool.query(`SELECT to_regclass('public.schema_migrations') AS t`);
    if (exists.rows[0].t === null) {
      throw new Error('Database has never been migrated. Run: npm run migrate');
    }
    const { rows } = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));
    const pendingFiles = listMigrationFiles(DEFAULT_MIGRATIONS_DIR).filter((f) => !applied.has(f));
    if (pendingFiles.length > 0) {
      throw new Error(
        `Pending migrations exist:\n  - ${pendingFiles.join('\n  - ')}\n` +
          `Apply them first (npm run migrate), then re-run the diff.`
      );
    }

    const actual = await introspect(pool);
    const { statements, warnings } = diffSchemas(desiredSchema, actual);

    for (const w of warnings) console.warn(`⚠️  ${w}`);

    if (statements.length === 0) {
      console.log('Schema in sync — no draft generated.');
      return;
    }

    const filename = writeDraft(DEFAULT_MIGRATIONS_DIR, name, statements);
    console.log(`Draft written: database/migrations/${filename}`);
    console.log('Review it (backfills, renames), then run: npm run migrate');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  cli().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
