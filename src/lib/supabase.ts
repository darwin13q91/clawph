/**
 * Supabase server-side client for ClawPH.
 *
 * Used in Vercel serverless API routes (api/*) where env vars are available.
 * All DB operations go through here — no raw SQL in API handlers.
 *
 * Required env vars:
 *   SUPABASE_URL          — e.g. https://your-project.supabase.co
 *   SUPABASE_SERVICE_KEY  — service_role key (bypasses RLS, used for write operations)
 *                            Keep this secret server-side only — never exposed to browser.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env'
    );
  }

  _client = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}
