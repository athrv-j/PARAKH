import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient.js';
import { ClauseRecord, FactRecord, TermRecord, DraftRecord } from './vaultDb.js';

export class CrossClientRlsViolationError extends Error {
  constructor(message = 'CrossClientRlsViolationError: Row Level Security blocked cross-client read') {
    super(message);
    this.name = 'CrossClientRlsViolationError';
  }
}

/**
 * SupabaseVaultDb
 * Interacts with PostgreSQL under Row-Level Security (RLS).
 * When instantiated with an authenticated client, PostgreSQL evaluates
 * `auth.uid()` and filters out any rows that do not belong to the user's `client_access`.
 */
export class SupabaseVaultDb {
  private client: SupabaseClient | null;

  constructor(client?: SupabaseClient | null) {
    this.client = client || getSupabaseClient();
  }

  /**
   * Reads clauses enforced by Postgres Row-Level Security.
   * If RLS blocks access to the requested client_id, an empty list or error is returned.
   */
  async getClauses(clientId: string, userAllowedClients?: string[]): Promise<ClauseRecord[]> {
    // If running in mocked / local RLS simulation without a live Supabase instance:
    if (!this.client) {
      if (userAllowedClients && !userAllowedClients.includes(clientId)) {
        // Simulates PostgreSQL RLS filter: rows outside tenant boundary are invisible
        return [];
      }
      return [];
    }

    const { data, error } = await this.client
      .from('clauses')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', 1);

    if (error) {
      throw new Error(`Supabase RLS Error: ${error.message}`);
    }

    return (data || []) as unknown as ClauseRecord[];
  }

  /**
   * Reads drafts enforced by Postgres Row-Level Security.
   */
  async getDrafts(clientId: string, userAllowedClients?: string[]): Promise<DraftRecord[]> {
    if (!this.client) {
      if (userAllowedClients && !userAllowedClients.includes(clientId)) {
        return [];
      }
      return [];
    }

    const { data, error } = await this.client
      .from('drafts')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      throw new Error(`Supabase RLS Error: ${error.message}`);
    }

    return (data || []) as unknown as DraftRecord[];
  }
}
