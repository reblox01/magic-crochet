import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

export function getServerSupabase(cookieHeader?: string) {
  return createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
    global: {
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getAdminSupabase() {
  // ponytail: SUPABASE_SERVICE_ROLE_KEY (no VITE_ prefix) — server-only, never bundled to client
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for admin operations");
  }
  return createClient(supabaseUrl ?? "", serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
