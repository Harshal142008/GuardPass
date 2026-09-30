import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * The browser client is only created when both public Supabase values exist.
 * The anon key is safe to ship in a frontend; Row Level Security is what
 * protects the database. Never put a service-role key in VITE_* variables.
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export const hasSupabase = Boolean(supabase);
