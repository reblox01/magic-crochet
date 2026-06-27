import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";

export const productMutation = createServerFn({ method: "POST" })
  .inputValidator((input: { action: "insert" | "update" | "delete"; id?: string; data?: Record<string, unknown> }) => input)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const { action, id, data: payload } = data;

    if (action === "insert") {
      const { error } = await admin.from("products").insert(payload);
      if (error) throw new Error(error.message);
    } else if (action === "update" && id) {
      const { error } = await admin.from("products").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else if (action === "delete" && id) {
      const { error } = await admin.from("products").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });

export const productImageUpload = createServerFn({ method: "POST" })
  .validator((input: { path: string; fileBase64: string; contentType: string }) => input)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const bytes = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
    const { error } = await admin.storage.from("products").upload(data.path, bytes, {
      contentType: data.contentType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: urlData } = admin.storage.from("products").getPublicUrl(data.path);
    return { url: urlData.publicUrl };
  });
