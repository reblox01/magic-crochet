import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";

const SITE_URL = import.meta.env.VITE_SITE_URL as string;

export const inviteUser = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; display_name: string }) => data)
  .handler(async ({ data }) => {
    if (!SITE_URL) {
      throw new Error("VITE_SITE_URL environment variable is not configured");
    }
    const supabase = getAdminSupabase();

    const { data: result, error } = await supabase.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: { display_name: data.display_name },
        redirectTo: `${SITE_URL}/admin/login`,
      }
    );

    if (error) {
      console.error("Supabase invite error full:", JSON.stringify(error, null, 2));
      throw new Error(`Supabase invite error: ${error.message || JSON.stringify(error)}`);
    }

    if (result.user) {
      const { error: insertError } = await supabase.from("admin_users").insert({
        id: result.user.id,
        email: result.user.email!,
        role: "admin",
        display_name: data.display_name,
        invited_at: new Date().toISOString(),
        has_password: false,
      });
      if (insertError) throw new Error(`DB insert error: ${insertError.message}`);
    }

    return { success: true };
  });

export const setInitialPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();

    // Look up user by email via admin API (no session needed)
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw new Error(listError.message);

    const user = users.users.find((u) => u.email === data.email);
    if (!user) throw new Error("Aucun compte trouvé pour cet email.");

    // Set the password via admin API
    const { error: pwError } = await supabase.auth.admin.updateUserById(user.id, {
      password: data.password,
    });
    if (pwError) throw new Error(pwError.message);

    // Mark password as set + mark invite accepted
    const { error: dbError } = await supabase
      .from("admin_users")
      .update({
        has_password: true,
        invited_accepted_at: new Date().toISOString(),
      })
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
  .inputValidator((data: { id: string; role: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("admin_users")
      .update({ role: data.role })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateUserName = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; display_name: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from("admin_users")
      .update({ display_name: data.display_name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateUserEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; email: string }) => data)
  .handler(async ({ data }) => {
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

    return { success: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; password: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error } = await supabase.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();

    const { error: authError } = await supabase.auth.admin.deleteUser(data.id);
    if (authError) throw new Error(authError.message);

    const { error } = await supabase.from("admin_users").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    return { success: true };
  });
