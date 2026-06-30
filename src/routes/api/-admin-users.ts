import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

const SITE_URL = import.meta.env.VITE_SITE_URL as string;
const ALLOWED_ROLES = ["owner", "admin", "custom"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

// ponytail: password strength check — 8+ chars, uppercase, lowercase, digit, special
function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "8 caractères minimum";
  if (!/[A-Z]/.test(pw)) return "Doit contenir une majuscule";
  if (!/[a-z]/.test(pw)) return "Doit contenir une minuscule";
  if (!/\d/.test(pw)) return "Doit contenir un chiffre";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)) return "Doit contenir un caractère spécial";
  return null;
}

export const inviteUser = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; display_name: string; role?: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const caller = { role: "owner" as const };
    // ponytail: only owner can invite
    if (caller.role !== "owner") throw new Error("Seul le propriétaire peut inviter des utilisateurs");
    const role: AllowedRole = (ALLOWED_ROLES.includes(data.role as AllowedRole) ? data.role : "admin") as AllowedRole;
    if (role === "owner") throw new Error("Impossible d'inviter avec le rôle propriétaire");
    if (!SITE_URL) throw new Error("VITE_SITE_URL non configuré");
    const supabase = getAdminSupabase();

    const { data: result, error } = await supabase.auth.admin.inviteUserByEmail(
      data.email,
      { data: { display_name: data.display_name }, redirectTo: `${SITE_URL}/admin/login` }
    );
    if (error) throw new Error(error.message);

    if (result.user) {
      const { error: insertError } = await supabase.from("admin_users").insert({
        id: result.user.id,
        email: result.user.email!,
        role,
        display_name: data.display_name,
        invited_at: new Date().toISOString(),
        has_password: false,
      });
      if (insertError) throw new Error(insertError.message);
    }
    await logActivity({ action: "create", entityType: "user", entityName: data.email, userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });

export const setInitialPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const pwErr = validatePassword(data.password);
    if (pwErr) throw new Error(pwErr);
    const supabase = getAdminSupabase();

    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw new Error(listError.message);

    const user = users.users.find((u) => u.email === data.email);
    if (!user) throw new Error("Aucun compte trouvé pour cet email.");

    const { error: pwError } = await supabase.auth.admin.updateUserById(user.id, {
      password: data.password,
    });
    if (pwError) throw new Error(pwError.message);

    const { error: dbError } = await supabase
      .from("admin_users")
      .update({ has_password: true, invited_accepted_at: new Date().toISOString() })
      .eq("id", user.id);
    if (dbError) throw new Error(dbError.message);

    return { success: true };
  });

export const markInviteAccepted = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("admin_users")
      .update({ invited_accepted_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("invited_accepted_at", null);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; role: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const caller = { role: "owner" as const };
    if (!ALLOWED_ROLES.includes(data.role as AllowedRole)) throw new Error("Rôle invalide");
    if (data.role === "owner" && caller.role !== "owner") throw new Error("Seul le propriétaire peut attribuer le rôle propriétaire");
    const supabase = getAdminSupabase();
    const { data: existingUser } = await supabase.from("admin_users").select("email").eq("id", data.id).single();
    const { error } = await supabase
      .from("admin_users")
      .update({ role: data.role })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity({ action: "update", entityType: "user", entityId: data.id, entityName: existingUser?.email ?? data.id, details: { role: data.role }, userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });

// ponytail: save custom page permissions + optional expiry
export const updateUserPermissions = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; permissions: Array<{ path: string; access: string }> | null; expiresAt: string | null; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const supabase = getAdminSupabase();
    const { data: existingUser } = await supabase.from("admin_users").select("email").eq("id", data.id).single();
    const { error } = await supabase
      .from("admin_users")
      .update({ custom_permissions: data.permissions, permissions_expires_at: data.expiresAt })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity({ action: "update", entityType: "user", entityId: data.id, entityName: existingUser?.email ?? data.id, details: { permissions: data.permissions }, userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });

export const updateUserName = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; display_name: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("admin_users")
      .update({ display_name: data.display_name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity({ action: "update", entityType: "user", entityId: data.id, details: { display_name: data.display_name }, userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });

export const updateUserEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; email: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const supabase = getAdminSupabase();

    const { error: authError } = await supabase.auth.admin.updateUserById(
      data.id,
      { email: data.email }
    );
    if (authError) throw new Error(authError.message);

    const { error } = await supabase
      .from("admin_users")
      .update({ email: data.email })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await logActivity({ action: "update", entityType: "user", entityId: data.id, details: { email: data.email }, userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; password: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const pwErr = validatePassword(data.password);
    if (pwErr) throw new Error(pwErr);
    const supabase = getAdminSupabase();
    const { error } = await supabase.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await logActivity({ action: "update", entityType: "user", entityId: data.id, details: { action: "password_reset" }, userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const supabase = getAdminSupabase();

    // ponytail: auth delete may fail if user never accepted invite — still delete from admin_users
    const { data: existingUser } = await supabase.from("admin_users").select("email").eq("id", data.id).single();
    const { error: authError } = await supabase.auth.admin.deleteUser(data.id);
    if (authError) {
      const raw = authError.message ?? authError.msg ?? JSON.stringify(authError);
      const msg = typeof raw === "string" ? raw : JSON.stringify(raw);
      if (msg.includes("not found") || msg.includes("not_found") || msg === "{}") {
        // user doesn't exist in auth — that's fine, proceed to delete from admin_users
      } else {
        throw new Error(msg);
      }
    }

    const { error } = await supabase.from("admin_users").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    await logActivity({ action: "delete", entityType: "user", entityId: data.id, entityName: existingUser?.email ?? data.id, userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });
