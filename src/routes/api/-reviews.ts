import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";

export const reviewImageUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { base64: string; fileName: string }) => data)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const buf = Buffer.from(data.base64, "base64");
    const path = `reviews/${Date.now()}-${data.fileName}`;
    const { error, data: uploaded } = await admin.storage.from("reviews")
      .upload(path, buf, { contentType: data.fileName.endsWith(".webp") ? "image/webp" : data.fileName.endsWith(".png") ? "image/png" : "image/jpeg", upsert: true });
    if (error) throw new Error(error.message);
    const { data: urlData } = admin.storage.from("reviews").getPublicUrl(path);
    return { url: urlData.publicUrl, path };
  });

export const reviewMutation = createServerFn({ method: "POST" })
  .inputValidator((input: { action: "insert" | "update" | "delete"; id?: string; data?: Record<string, unknown> }) => input)
  .handler(async ({ data }) => {
    const admin = getAdminSupabase();
    const { action, id, data: payload } = data;

    if (action === "insert") {
      const { error } = await admin.from("reviews").insert(payload);
      if (error) throw new Error(error.message);
    } else if (action === "update" && id) {
      const { error } = await admin.from("reviews").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else if (action === "delete" && id) {
      const { error } = await admin.from("reviews").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }

    return { success: true };
  });
