import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials strictly from Vite environment variables (Never from browser localStorage)
const getCredentials = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  return {
    url: envUrl.trim(),
    key: envKey.trim()
  };
};

let currentClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (currentClient) return currentClient;
  const { url, key } = getCredentials();
  if (url && key) {
    try {
      currentClient = createClient(url, key);
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }
  return currentClient;
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getCredentials();
  return Boolean(url && key);
}

export const supabase = getSupabase();
