import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

/**
 * Get a Supabase client, optionally with a user's access token
 * If no access token is provided, uses the service key
 */
export function getSupabaseClient(accessToken?: string): SupabaseClient {
  if (accessToken) {
    // Create client with user's access token for RLS
    return createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  // Return service client with full access
  return createClient(supabaseUrl, supabaseServiceKey);
}
