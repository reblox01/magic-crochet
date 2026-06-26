import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";

export const inviteUser = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; display_name: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();

    const { data: result, error } = await supabase.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: { display_name: data.display_name },
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : "https://magic-crochet.vercel.app"}/admin/login`,
      }
    );

    if (error) throw new Error(error.message);

    if (result.user) {
      const { error: insertError } = await supabase.from("admin_users").insert({
        id: result.user.id,
        email: result.user.email!,
        role: "admin",
        display_name: data.display_name,
        invited_at: new Date().toISOString(),
        has_password: false,
      });
      if (insertError) throw new Error(insertError.message);
    }

    return { success: true };
  });

export const setInitialPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();

    // Get the current user from the session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Non authentifié.");

    // Set the password via admin API (works even without current password for invited users)
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
