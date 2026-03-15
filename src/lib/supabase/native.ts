import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for Capacitor native builds.
 *
 * The SSR client (server.ts / client.ts) uses cookies via @supabase/ssr,
 * which doesn't persist reliably across Capacitor app kills. This client
 * uses localStorage instead — Capacitor's WebView preserves it across restarts.
 *
 * Usage:
 *   - In Capacitor builds, swap `createClient()` from client.ts for this.
 *   - detectSessionInUrl is false because Capacitor handles deep links via
 *     the App plugin, not the browser URL bar.
 *   - If you need hardware-backed secure storage later, swap `window.localStorage`
 *     for a @capacitor/preferences adapter here — one change, all callers updated.
 */
export function createNativeClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  );
}
