import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";

export const galleryMutation = createServerFn({ method: "POST" })
  .validator((input: { action: "insert" | "update" | "delete"; id?: string; data?: Record<string, unknown> }) => input)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const { action, id, data: payload } = data;

    if (action === "insert") {
      const { error } = await admin.from("gallery_images").insert(payload);
      if (error) throw new Error(error.message);
    } else if (action === "update" && id) {
      const { error } = await admin.from("gallery_images").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else if (action === "delete" && id) {
      const { error } = await admin.from("gallery_images").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });

export const galleryImageUpload = createServerFn({ method: "POST" })
  .validator((input: { path: string; fileBase64: string; contentType: string }) => input)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const bytes = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
    const { error } = await admin.storage.from("atelier").upload(data.path, bytes, {
      contentType: data.contentType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: urlData } = admin.storage.from("atelier").getPublicUrl(data.path);
    return { url: urlData.publicUrl };
  });
