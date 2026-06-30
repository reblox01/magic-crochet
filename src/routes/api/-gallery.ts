import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

export const galleryMutation = createServerFn({ method: "POST" })
  .inputValidator((input: { action: "insert" | "update" | "delete"; id?: string; data?: Record<string, unknown>; callerEmail?: string; callerId?: string }) => input)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { action, id, data: raw } = data;

    const pickGallery = (d?: Record<string, unknown>) => {
      if (!d) return {};
      const ALLOW = ["image_url", "title", "category", "is_active", "sort_order"] as const;
      return Object.fromEntries(ALLOW.filter((k) => k in d).map((k) => [k, d[k]]));
    };

    if (action === "insert") {
      const { error } = await admin.from("gallery_images").insert(pickGallery(raw));
      if (error) throw new Error(error.message);
      await logActivity({ action: "create", entityType: "gallery", entityName: raw?.title as string, userEmail: data.callerEmail, userId: data.callerId }, request);
    } else if (action === "update" && id) {
      const { data: existing } = await admin.from("gallery_images").select("title").eq("id", id).single();
      const label = (raw?.title as string) || existing?.title || id;
      const { error } = await admin.from("gallery_images").update(pickGallery(raw)).eq("id", id);
      if (error) throw new Error(error.message);
      const keys = Object.keys(pickGallery(raw));
      let entityName = label + " → Modifiée";
      if (keys.length === 1 && "is_active" in raw!) entityName = label + (raw?.is_active ? " → Activée" : " → Désactivée");
      else if (keys.includes("sort_order")) entityName = label + " → Réordonnée";
      await logActivity({ action: "update", entityType: "gallery", entityId: id, entityName, userEmail: data.callerEmail, userId: data.callerId }, request);
    } else if (action === "delete" && id) {
      const { data: existing } = await admin.from("gallery_images").select("title").eq("id", id).single();
      const { error } = await admin.from("gallery_images").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity({ action: "delete", entityType: "gallery", entityId: id, entityName: existing?.title as string ?? id, userEmail: data.callerEmail, userId: data.callerId }, request);
    }

    return { success: true };
  });

export const galleryImageUpload = createServerFn({ method: "POST" })
  .inputValidator((input: { fileName: string; fileBase64: string; contentType: string }) => input)
  .handler(async ({ data }) => {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!ALLOWED.includes(data.contentType)) throw new Error("Format non supporté");
    const ext = data.fileName.split(".").pop()?.toLowerCase() ?? "jpg";
    if (!["jpg", "jpeg", "png", "webp", "avif"].includes(ext)) throw new Error("Extension non supportée");
    const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const admin = getAdminSupabase();
    const bytes = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
    if (bytes.length > 10 * 1024 * 1024) throw new Error("Fichier trop volumineux (max 10MB)");
    const { error } = await admin.storage.from("gallery").upload(safeName, bytes, {
      contentType: data.contentType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: urlData } = admin.storage.from("gallery").getPublicUrl(safeName);
    return { url: urlData.publicUrl };
  });
