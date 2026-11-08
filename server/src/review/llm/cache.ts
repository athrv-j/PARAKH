import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../../db/index.js';
import { LlmFinding } from './client.js';

export interface CachedLlmResult {
  findings: LlmFinding[];
  cached: true;
  cachedAt: string;
}

export class LlmResultCache {
  private memoryCache = new Map<string, { findings: LlmFinding[]; expiresAt: number; cachedAt: string }>();
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
    // Ensure table exists
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS llm_cache (
          key TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          findings TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME
        );
      `);
    } catch {}
  }

  /**
   * Generates a deterministic SHA-256 cache key based on clientId, draft text, and active clause versions.
   */
  generateKey(
    clientId: string,
    draftText: string,
    clauses: Array<{ id: string; version?: number; text: string }>
  ): string {
    const normText = draftText.trim().replace(/\s+/g, ' ');
    const clauseSignatures = clauses
      .map(c => `${c.id}@v${c.version ?? 1}:${c.text.trim()}`)
      .sort()
      .join('||');

    const raw = `${clientId}::${normText}::${clauseSignatures}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Retrieves findings from memory or SQLite cache if valid and not expired.
   */
  get(key: string): CachedLlmResult | null {
    const now = Date.now();

    // 1. Check in-memory Map
    const mem = this.memoryCache.get(key);
    if (mem) {
      if (mem.expiresAt > now) {
        return {
          findings: mem.findings,
          cached: true,
          cachedAt: mem.cachedAt
        };
      }
      this.memoryCache.delete(key);
    }

    // 2. Check SQLite persistent store
    try {
      const row = this.db
        .prepare('SELECT findings, created_at, expires_at FROM llm_cache WHERE key = ?')
        .get(key) as { findings: string; created_at: string; expires_at: string | null } | undefined;

      if (row) {
        if (row.expires_at && new Date(row.expires_at).getTime() < now) {
          this.db.prepare('DELETE FROM llm_cache WHERE key = ?').run(key);
          return null;
        }

        const parsed = JSON.parse(row.findings) as LlmFinding[];
        // Populate memory cache
        this.memoryCache.set(key, {
          findings: parsed,
          expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : now + 3600000,
          cachedAt: row.created_at
        });

        return {
          findings: parsed,
          cached: true,
          cachedAt: row.created_at
        };
      }
    } catch (err) {
      // Non-fatal cache lookup failure
    }

    return null;
  }

  /**
   * Stores findings into cache with a default 24-hour TTL.
   */
  set(key: string, clientId: string, findings: LlmFinding[], ttlMs = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const expiresAt = new Date(now + ttlMs).toISOString();
    const cachedAt = new Date(now).toISOString();

    // 1. Update in-memory cache
    this.memoryCache.set(key, {
      findings,
      expiresAt: now + ttlMs,
      cachedAt
    });

    // 2. Update SQLite persistent cache
    try {
      this.db
        .prepare(`
          INSERT OR REPLACE INTO llm_cache (key, client_id, findings, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(key, clientId, JSON.stringify(findings), cachedAt, expiresAt);
    } catch (err) {
      // Non-fatal cache store failure
    }
  }

  clear(): void {
    this.memoryCache.clear();
    try {
      this.db.exec('DELETE FROM llm_cache;');
    } catch {}
  }
}

export const llmCache = new LlmResultCache();
