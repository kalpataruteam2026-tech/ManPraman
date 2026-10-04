import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for public / client-side user operations
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

// Admin client for backend operations
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
