/**
 * Shared Supabase environment and configuration helper.
 * Normalizes URL (strips accidental /rest/v1 suffixes and trailing slashes).
 */
export function getSupabaseConfig() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (url) {
    // Strip accidental REST path or trailing slashes
    url = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  }

  const isConfigured = Boolean(url && anonKey);

  if (!isConfigured) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '⚠️ Missing Supabase configuration.\n' +
        'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local\n' +
        'and restart your Next.js development server (Ctrl+C then npm run dev).'
      );
    }
    // Fallback placeholder during build/SSR to avoid throwing unhandled initialization crashes
    url = url || 'https://placeholder.supabase.co';
    anonKey = anonKey || 'placeholder-anon-key';
  }

  return { url, anonKey, isConfigured };
}
