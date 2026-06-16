import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Public (anon) client — safe to use in the browser and in public route handlers.
 * Respects Row Level Security policies.
 */
export const supabaseAnon: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

/**
 * Admin (service role) client — bypasses RLS.
 * Must ONLY be used in Server Components, Server Actions, and Route Handlers.
 * Never import this in Client Components.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
