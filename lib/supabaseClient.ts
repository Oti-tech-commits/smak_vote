import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabasePublishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // In test/CI, env vars might be intentionally absent.
    // Fail-soft so the app can render pages that don't require Supabase.
    if (!supabaseUrl || !supabasePublishableKey) {
      cachedClient = createClient('https://example.invalid', 'public-anon-key', {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      return cachedClient;
    }


    cachedClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }

  return cachedClient;
}

export const supabaseClient: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
