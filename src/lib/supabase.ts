import { createClient } from "@supabase/supabase-js";

// Browser client — safe to use in client components (anon key, RLS-scoped).
export const supabaseBrowser = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// Server client — used inside API routes only. Uses the service role key,
// so it bypasses RLS. Fine for a single-user MVP since the whole app sits
// behind the APP_PASSWORD gate in proxy.ts. Never import this into a
// client component.
export const supabaseServer = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );