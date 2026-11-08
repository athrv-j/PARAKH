import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseSync | null = null;

export function getDatabase(dbPath?: string): DatabaseSync {
  if (!dbInstance) {
    const resolvedPath = dbPath || process.env.DATABASE_URL || path.resolve(process.cwd(), 'parakh.db');
    dbInstance = new DatabaseSync(resolvedPath);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA busy_timeout = 5000;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function runMigrations(db?: DatabaseSync): void {
  const targetDb = db || getDatabase();
  const candidates = [
    path.resolve(__dirname, 'schema.sql'),
    path.resolve(__dirname, '../../src/db/schema.sql'),
    path.resolve(process.cwd(), 'server/src/db/schema.sql'),
    path.resolve(process.cwd(), 'src/db/schema.sql')
  ];
  const schemaPath = candidates.find(p => fs.existsSync(p));
  if (!schemaPath) {
    throw new Error(`schema.sql not found in any of: ${candidates.join(', ')}`);
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  targetDb.exec(schemaSql);

  // Safe schema migrations for existing SQLite databases
  try {
    targetDb.exec('ALTER TABLE users ADD COLUMN email TEXT;');
  } catch {}
  try {
    targetDb.exec('ALTER TABLE users ADD COLUMN password_hash TEXT;');
  } catch {}
}
