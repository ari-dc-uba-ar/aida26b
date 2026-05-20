import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const DEFAULT_MIGRATIONS_DIR = path.resolve(__dirname, '../../database/migrations');

const FILENAME_PATTERN = /^\d{8}_\d{6}_[a-z0-9_]+\.sql$/;

export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function listMigrationFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const all = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));
  const invalid = all.filter((f) => !FILENAME_PATTERN.test(f));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid migration filename(s):\n  - ${invalid.join('\n  - ')}\n` +
        `Expected format: YYYYMMDD_HHMMSS_lowercase_with_underscores.sql\n` +
        `Example: 20260520_120000_initial_schema.sql`
    );
  }
  return all.sort();
}

export function readMigration(dir: string, filename: string): { sql: string; checksum: string } {
  const sql = fs.readFileSync(path.join(dir, filename), 'utf8');
  return { sql, checksum: sha256(sql) };
}
