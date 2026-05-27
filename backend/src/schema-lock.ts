import { Pool } from 'pg';
import { listMigrationFiles, readMigration } from './migration-files';

export async function assertSchemaInSync(pool: Pool, dir: string): Promise<void> {
  const tableExists = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'schema_migrations'
     ) AS exists`
  );

  if (!tableExists.rows[0].exists) {
    throw new Error(
      'Schema mismatch: schema_migrations table does not exist.\n' +
        'The database has not been migrated yet. Run: npm run migrate'
    );
  }

  const files = listMigrationFiles(dir);
  const fileChecksums = new Map(files.map((f) => [f, readMigration(dir, f).checksum]));

  const { rows } = await pool.query<{ filename: string; checksum: string }>(
    'SELECT filename, checksum FROM schema_migrations'
  );
  const applied = new Map(rows.map((r) => [r.filename, r.checksum]));

  const pending: string[] = [];
  const unknown: string[] = [];
  const tampered: string[] = [];

  for (const file of files) {
    if (!applied.has(file)) {
      pending.push(file);
    } else if (applied.get(file) !== fileChecksums.get(file)) {
      tampered.push(file);
    }
  }
  for (const filename of applied.keys()) {
    if (!fileChecksums.has(filename)) {
      unknown.push(filename);
    }
  }

  const problems: string[] = [];
  if (pending.length > 0) {
    problems.push(
      `Pending migrations not yet applied:\n  - ${pending.join('\n  - ')}\n` +
        `Run: npm run migrate`
    );
  }
  if (unknown.length > 0) {
    problems.push(
      `Database has migrations not present in this code:\n  - ${unknown.join('\n  - ')}\n` +
        `Your code is older than the database. Check out the branch matching the DB, or restore the missing files.`
    );
  }
  if (tampered.length > 0) {
    problems.push(
      `Applied migrations were modified on disk:\n  - ${tampered.join('\n  - ')}\n` +
        `Applied migrations are immutable. Restore the original files (git checkout) or write a new migration that undoes/adjusts the change.`
    );
  }

  if (problems.length > 0) {
    throw new Error('Schema mismatch:\n\n' + problems.join('\n\n'));
  }
}
