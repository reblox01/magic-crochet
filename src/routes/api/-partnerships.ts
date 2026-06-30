import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

export const partnershipMutation = createServerFn({ method: "POST" })
  .inputValidator((input: { action: "insert" | "update" | "delete"; id?: string; data?: Record<string, unknown>; callerEmail?: string; callerId?: string }) => input)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { action, id, data: raw } = data;

    const pickPartnership = (d?: Record<string, unknown>) => {
      if (!d) return {};
      const ALLOW = ["name", "url", "logo_url", "sort_order", "is_active", "size"] as const;
      return Object.fromEntries(ALLOW.filter((k) => k in d).map((k) => [k, d[k]]));
    };

    if (action === "insert") {
      const { error } = await admin.from("partnerships").insert(pickPartnership(raw));
      if (error) throw new Error(error.message);
      await logActivity({ action: "create", entityType: "partnership", entityName: raw?.name as string, userEmail: data.callerEmail, userId: data.callerId }, request);
    } else if (action === "update" && id) {
      const { data: existing } = await admin.from("partnerships").select("name").eq("id", id).single();
      const name = (raw?.name as string) || existing?.name || id;
      const { error } = await admin.from("partnerships").update(pickPartnership(raw)).eq("id", id);
      if (error) throw new Error(error.message);
      const keys = Object.keys(pickPartnership(raw));
      let entityName = name + " → Modifié";
      if (keys.length === 1 && "is_active" in raw!) entityName = name + (raw?.is_active ? " → Activé" : " → Désactivé");
      else if (keys.includes("name")) entityName = existing?.name + " → " + name;
      else if (keys.includes("size")) entityName = name + " → Taille modifiée";
      await logActivity({ action: "update", entityType: "partnership", entityId: id, entityName, userEmail: data.callerEmail, userId: data.callerId }, request);
    } else if (action === "delete" && id) {
      const { data: existing } = await admin.from("partnerships").select("name").eq("id", id).single();
      const { error } = await admin.from("partnerships").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity({ action: "delete", entityType: "partnership", entityId: id, entityName: existing?.name as string ?? id, userEmail: data.callerEmail, userId: data.callerId }, request);
    }

    return { success: true };
  });

export const partnershipImageUpload = createServerFn({ method: "POST" })
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
    const { error } = await admin.storage.from("partners").upload(safeName, bytes, {
      contentType: data.contentType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: urlData } = admin.storage.from("partners").getPublicUrl(safeName);
    return { url: urlData.publicUrl };
  });
