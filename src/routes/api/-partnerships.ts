import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth-guard";

export const partnershipMutation = createServerFn({ method: "POST" })
  .inputValidator((input: { action: "insert" | "update" | "delete"; id?: string; data?: Record<string, unknown> }) => input)
  .handler(async ({ data }) => {
    await requireAdmin();
    const admin = getAdminSupabase();
    const { action, id, data: payload } = data;

    if (action === "insert") {
      const { error } = await admin.from("partnerships").insert(payload);
      if (error) throw new Error(error.message);
    } else if (action === "update" && id) {
      const { error } = await admin.from("partnerships").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else if (action === "delete" && id) {
      const { error } = await admin.from("partnerships").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });

export const partnershipImageUpload = createServerFn({ method: "POST" })
  .inputValidator((input: { path: string; fileBase64: string; contentType: string }) => input)
  .handler(async ({ data }) => {
    await requireAdmin();
    const admin = getAdminSupabase();
    const bytes = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
    const { error } = await admin.storage.from("partners").upload(data.path, bytes, {
      contentType: data.contentType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: urlData } = admin.storage.from("partners").getPublicUrl(data.path);
    return { url: urlData.publicUrl };
  });
