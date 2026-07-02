import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

// Service-role client for server-only admin operations (e.g. listing auth users,
// or writing to tables without an authenticated user session). Never import this
// from a client component.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
