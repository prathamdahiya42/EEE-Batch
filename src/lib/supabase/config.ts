/**
 * Shared Supabase environment and configuration helper.
 * Normalizes URL (strips accidental /rest/v1 suffixes and trailing slashes).
 */
export function getSupabaseConfig() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (url) {
    // Strip accidental REST path or trailing slashes
    url = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }

  if (!url || !anonKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '⚠️ Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local or your deployment environment variables.'
      );
    }
  }

  return { url, anonKey };
}
