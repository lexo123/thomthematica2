import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim().replace(/^["']|["']$/g, '');
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    // Project URL should only be origin without trailing paths or slashes: https://xyz.supabase.co
    return parsed.origin;
  } catch {
    return url.replace(/\/+$/, '');
  }
}

function cleanAnonKey(rawKey: string): string {
  return (rawKey || '').trim().replace(/^["']|["']$/g, '');
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const cleanUrl = cleanSupabaseUrl(rawUrl);
export const cleanKey = cleanAnonKey(rawAnonKey);

export const isSupabaseConfigured = Boolean(
  cleanUrl && 
  cleanKey && 
  !cleanUrl.includes('your-project.supabase.co') && 
  cleanKey !== 'your-anon-key' &&
  cleanUrl.startsWith('http')
);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.error('Supabase initialization error:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export const supabase = isSupabaseConfigured ? getSupabase() : null;

