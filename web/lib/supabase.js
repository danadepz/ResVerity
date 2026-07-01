import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Prefer the new-style publishable key; fall back to the legacy anon key.
const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

export const useSupabase = bool(supabaseUrl && supabaseAnonKey);

export const supabase = useSupabase 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

function bool(val) {
  return !!val;
}
