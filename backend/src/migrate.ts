import { Pool } from 'pg';
import { DEFAULT_MIGRATIONS_DIR, listMigrationFiles, readMigration } from './migration-files';

export async function runMigrations(pool: Pool, dir: string): Promise<number> {
  const client = await pool.connect();
  let appliedCount = 0;
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum   TEXT NOT NULL
      );
    `);

    const files = listMigrationFiles(dir);
    const { rows } = await client.query<{ filename: string; checksum: string }>(
      'SELECT filename, checksum FROM schema_migrations'
    );
    const applied = new Map(rows.map((r) => [r.filename, r.checksum]));

    for (const file of files) {
      const { sql, checksum } = readMigration(dir, file);
      const recorded = applied.get(file);

      if (recorded !== undefined) {
        if (recorded !== checksum) {
          throw new Error(
            `Migration "${file}" was modified after being applied.\n` +
              `Applied migrations are immutable — write a new migration that undoes/adjusts the change instead.`
          );
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [file, checksum]
        );
        await client.query('COMMIT');
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration "${file}" failed: ${(err as Error).message}`);
      }
    }

    return appliedCount;
  } finally {
    client.release();
  }
}

async function cli(): Promise<void> {
  const { pool } = await import('./db');
  try {
    const applied = await runMigrations(pool, DEFAULT_MIGRATIONS_DIR);
    if (applied === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`Applied ${applied} migration${applied === 1 ? '' : 's'}.`);
    }
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
