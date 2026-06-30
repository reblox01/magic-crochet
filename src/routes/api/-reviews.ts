import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

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
  .inputValidator((input: { action: "insert" | "update" | "delete"; id?: string; data?: Record<string, unknown>; callerEmail?: string; callerId?: string }) => input)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { action, id, data: raw } = data;

    const pickReview = (d?: Record<string, unknown>) => {
      if (!d) return {};
      const ALLOW = ["customer_name", "rating", "comment", "is_visible", "position", "image_url"] as const;
      return Object.fromEntries(ALLOW.filter((k) => k in d).map((k) => [k, d[k]]));
    };

    if (action === "insert") {
      const { error } = await admin.from("reviews").insert(pickReview(raw));
      if (error) throw new Error(error.message);
      await logActivity({ action: "create", entityType: "review", entityName: raw?.customer_name as string, userEmail: data.callerEmail, userId: data.callerId }, request);
    } else if (action === "update" && id) {
      const { data: existing } = await admin.from("reviews").select("customer_name").eq("id", id).single();
      const label = (raw?.customer_name as string) || existing?.customer_name || id;
      const { error } = await admin.from("reviews").update(pickReview(raw)).eq("id", id);
      if (error) throw new Error(error.message);
      const keys = Object.keys(pickReview(raw));
      let entityName = label + " → Modifié";
      if (keys.length === 1 && "is_visible" in raw!) entityName = label + (raw?.is_visible ? " → Visible" : " → Masqué");
      await logActivity({ action: "update", entityType: "review", entityId: id, entityName, userEmail: data.callerEmail, userId: data.callerId }, request);
    } else if (action === "delete" && id) {
      const { data: existing } = await admin.from("reviews").select("customer_name").eq("id", id).single();
      const { error } = await admin.from("reviews").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity({ action: "delete", entityType: "review", entityId: id, entityName: existing?.customer_name as string ?? id, userEmail: data.callerEmail, userId: data.callerId }, request);
    }

    return { success: true };
  });
