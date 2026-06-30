import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

export const avatarUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { fileBase64: string; fileName: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();
    const { error: bucketErr } = await supabase.storage.createBucket("avatars", { public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"] });
    if (bucketErr && !bucketErr.message.includes("already exists")) throw new Error(bucketErr.message);
    const ext = data.fileName.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const base64Data = data.fileBase64.includes(",") ? data.fileBase64.split(",")[1] : data.fileBase64;
    const buf = Buffer.from(base64Data, "base64");
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, buf, { contentType: `image/${ext}`, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return { url: `${urlData.publicUrl}?t=${Date.now()}` };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { display_name?: string; avatar_url?: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    if (!data.callerId) throw new Error("Non autorisé");

    const admin = getAdminSupabase();
    const updates: Record<string, unknown> = {};
    if (data.display_name !== undefined) updates.display_name = data.display_name;
    if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;

    if (Object.keys(updates).length === 0) throw new Error("Aucun champ à mettre à jour");

    const { error } = await admin.from("admin_users").update(updates).eq("id", data.callerId);
    if (error) throw new Error(error.message);

    await logActivity({ action: "update", entityType: "profile", entityName: "Profil", userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((data: { newPassword: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    if (!data.callerId) throw new Error("Non autorisé");

    const pw = data.newPassword;
    if (pw.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères");
    if (!/[A-Z]/.test(pw)) throw new Error("Le mot de passe doit contenir au moins une majuscule");
    if (!/[a-z]/.test(pw)) throw new Error("Le mot de passe doit contenir au moins une minuscule");
    if (!/[0-9]/.test(pw)) throw new Error("Le mot de passe doit contenir au moins un chiffre");
    if (!/[^A-Za-z0-9]/.test(pw)) throw new Error("Le mot de passe doit contenir au moins un caractère spécial");

    const admin = getAdminSupabase();
    const { error } = await admin.auth.admin.updateUserById(data.callerId, { password: data.newPassword });
    if (error) throw new Error(error.message);

    await logActivity({ action: "update", entityType: "profile", entityName: "Mot de passe", userEmail: data.callerEmail, userId: data.callerId }, request);
    return { success: true };
  });
