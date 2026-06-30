import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

const ATELIER_ALLOW = ["client_number", "nom", "telephone", "service", "personnes", "prix_total", "date_paiement", "remarque", "group_name"] as const;

function filterAtelier(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of ATELIER_ALLOW) { if (k in obj) out[k] = obj[k]; }
  return out;
}

export interface AtelierEntry {
  id: string;
  client_number: number | null;
  nom: string;
  telephone: string | null;
  service: string | null;
  personnes: number;
  prix_total: number;
  date_paiement: string | null;
  remarque: string | null;
  group_name: string | null;
  created_at: string;
}

export const atelierList = createServerFn({ method: "GET" })
  .handler(async () => {
    const admin = getAdminSupabase();
    const { data, error } = await admin
      .from("ateliers")
      .select("*")
      .order("date_paiement", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AtelierEntry[];
  });

export const atelierCreate = createServerFn({ method: "POST" })
  .inputValidator((data: Omit<AtelierEntry, "id" | "created_at"> & { callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { error } = await admin.from("ateliers").insert(filterAtelier(data as Record<string, unknown>));
    if (error) throw new Error(error.message);
    await logActivity({ action: "create", entityType: "atelier", entityName: data.nom, userEmail: data.callerEmail, userId: data.callerId }, request);
  });

export const atelierUpdate = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; updates: Partial<Omit<AtelierEntry, "id" | "created_at">>; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { data: existing } = await admin.from("ateliers").select("nom").eq("id", data.id).single();
    const { error } = await admin.from("ateliers").update(filterAtelier(data.updates as Record<string, unknown>)).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity({ action: "update", entityType: "atelier", entityId: data.id, entityName: existing?.nom ?? data.id, userEmail: data.callerEmail, userId: data.callerId }, request);
  });

export const atelierDelete = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { data: existing } = await admin.from("ateliers").select("nom").eq("id", data.id).single();
    const { error } = await admin.from("ateliers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity({ action: "delete", entityType: "atelier", entityId: data.id, entityName: existing?.nom ?? data.id, userEmail: data.callerEmail, userId: data.callerId }, request);
  });

export const atelierImport = createServerFn({ method: "POST" })
  .inputValidator((data: { rows: Omit<AtelierEntry, "id" | "created_at">[]; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { error } = await admin.from("ateliers").insert(data.rows.map(r => filterAtelier(r as Record<string, unknown>)));
    if (error) throw new Error(error.message);
    await logActivity({ action: "create", entityType: "atelier", entityName: `Import CSV (${data.rows.length} entrées)`, userEmail: data.callerEmail, userId: data.callerId }, request);
  });

export const atelierBulkUpdate = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[]; updates: Partial<Pick<AtelierEntry, "service" | "prix_total" | "personnes" | "group_name">>; callerEmail?: string; callerId?: string }) => data)
  .handler(async ({ data, request }) => {
    const admin = getAdminSupabase();
    const { error } = await admin.from("ateliers").update(filterAtelier(data.updates as Record<string, unknown>)).in("id", data.ids);
    if (error) throw new Error(error.message);
    await logActivity({ action: "update", entityType: "atelier", entityName: `Mise à jour groupée (${data.ids.length} éléments)`, userEmail: data.callerEmail, userId: data.callerId }, request);
  });

export const atelierExport = createServerFn({ method: "GET" })
  .handler(async () => {
    const admin = getAdminSupabase();
    const { data, error } = await admin
      .from("ateliers")
      .select("*")
      .order("date_paiement", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AtelierEntry[];
  });
