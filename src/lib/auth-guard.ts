import { getServerSupabase } from "@/lib/supabase";

/**
 * Verify the request comes from an authenticated admin user.
 * Returns the admin profile or throws if unauthorized.
 *
 * ponytail: server-side auth gate — blocks unauthenticated callers from
 * reaching getAdminSupabase() (which bypasses RLS with service role key).
 */
export async function requireAdmin(cookieHeader?: string) {
  const supabase = getServerSupabase(cookieHeader);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("admin_users")
    .select("role, custom_permissions, permissions_expires_at")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Forbidden");

  // Check custom role expiry
  if (
    profile.role === "custom" &&
    profile.permissions_expires_at &&
    new Date(profile.permissions_expires_at) < new Date()
  ) {
    throw new Error("Access expired");
  }

  return { user, profile, supabase };
}

/**
 * Verify the request comes from an authenticated admin with write access to a page.
 * ponytail: extended version of requireAdmin — checks custom_permissions for write access.
 */
export async function requireWriteAccess(
  pagePath: string,
  cookieHeader?: string,
) {
  const { user, profile, supabase } = await requireAdmin(cookieHeader);

  // Owner and admin have write access everywhere
  if (profile.role === "owner" || profile.role === "admin") {
    return { user, profile, supabase };
  }

  // Custom role: check permissions array for write access
  if (profile.role === "custom" && profile.custom_permissions) {
    const perms = profile.custom_permissions as Array<{
      path: string;
      access: "read" | "write";
    }>;
    const match = perms.find((p) => p.path === pagePath);
    if (match && match.access === "write") {
      return { user, profile, supabase };
    }
  }

  throw new Error("Write access denied");
}
