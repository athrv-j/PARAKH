import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get credentials from env or localStorage
const getSavedCredentials = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('parakh_supabase_url') || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('parakh_supabase_key') || '' : '';

  return {
    url: storedUrl || envUrl,
    key: storedKey || envKey
  };
};

let currentClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (currentClient) return currentClient;
  const { url, key } = getSavedCredentials();
  if (url && key) {
    try {
      currentClient = createClient(url, key);
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }
  return currentClient;
}

export function configureSupabase(url: string, key: string): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    localStorage.setItem('parakh_supabase_url', url);
    localStorage.setItem('parakh_supabase_key', key);
  }
  try {
    currentClient = createClient(url, key);
    return currentClient;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSavedCredentials();
  return Boolean(url && key);
}

export const supabase = getSupabase();
