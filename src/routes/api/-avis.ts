import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

const AVIS_ALLOW = ["name", "role", "quote", "is_visible", "sort_order"] as const;

function filterAvis(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of AVIS_ALLOW) { if (k in obj) out[k] = obj[k]; }
  return out;
}

export const avisMutation = createServerFn({ method: "POST" })
  .inputValidator((input: { action: "insert" | "update" | "delete"; id?: string; data?: Record<string, unknown>; callerEmail?: string; callerId?: string }) => input)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { action, id, data: payload, callerEmail, callerId } = data;

    if (action === "insert") {
      if (!payload) throw new Error("Données manquantes");
      const { error } = await admin.from("avis").insert(filterAvis(payload));
      if (error) throw new Error(error.message);
      await logActivity({ action: "create", entityType: "avis", entityName: String(payload.name ?? ""), userEmail: callerEmail, userId: callerId }, request);
    } else if (action === "update" && id) {
      const fields = payload ? filterAvis(payload) : {};
      if (Object.keys(fields).length === 0) throw new Error("Aucun champ à mettre à jour");
      const { data: existing } = await admin.from("avis").select("name").eq("id", id).single();
      const label = (payload?.name as string) || existing?.name || id;
      const { error } = await admin.from("avis").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
      const keys = Object.keys(fields);
      let entityName = label + " → Modifié";
      if (keys.length === 1 && "is_visible" in fields) entityName = label + (payload?.is_visible ? " → Visible" : " → Masqué");
      else if (keys.includes("sort_order")) entityName = label + " → Réordonné";
      await logActivity({ action: "update", entityType: "avis", entityId: id, entityName, userEmail: callerEmail, userId: callerId }, request);
    } else if (action === "delete" && id) {
      const { data: existing } = await admin.from("avis").select("name").eq("id", id).single();
      const { error } = await admin.from("avis").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity({ action: "delete", entityType: "avis", entityId: id, entityName: existing?.name as string ?? id, userEmail: callerEmail, userId: callerId }, request);
    }

    return { success: true };
  });
