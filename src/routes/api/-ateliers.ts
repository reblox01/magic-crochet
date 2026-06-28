import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth-guard";

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
    await requireAdmin();
    const admin = getAdminSupabase();
    const { data, error } = await admin
      .from("ateliers")
      .select("*")
      .order("date_paiement", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AtelierEntry[];
  });

export const atelierCreate = createServerFn({ method: "POST" })
  .inputValidator((data: Omit<AtelierEntry, "id" | "created_at">) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const admin = getAdminSupabase();
    const { error } = await admin.from("ateliers").insert(data);
    if (error) throw new Error(error.message);
  });

export const atelierUpdate = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; updates: Partial<Omit<AtelierEntry, "id" | "created_at">> }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const admin = getAdminSupabase();
    const { error } = await admin.from("ateliers").update(data.updates).eq("id", data.id);
    if (error) throw new Error(error.message);
  });

export const atelierDelete = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const admin = getAdminSupabase();
    const { error } = await admin.from("ateliers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

export const atelierImport = createServerFn({ method: "POST" })
  .inputValidator((data: { rows: Omit<AtelierEntry, "id" | "created_at">[] }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const admin = getAdminSupabase();
    const { error } = await admin.from("ateliers").insert(data.rows);
    if (error) throw new Error(error.message);
  });

export const atelierBulkUpdate = createServerFn({ method: "POST" })
  .inputValidator((data: { ids: string[]; updates: Partial<Pick<AtelierEntry, "service" | "prix_total" | "personnes" | "group_name">> }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const admin = getAdminSupabase();
    const { error } = await admin.from("ateliers").update(data.updates).in("id", data.ids);
    if (error) throw new Error(error.message);
  });

export const atelierExport = createServerFn({ method: "GET" })
  .handler(async () => {
    await requireAdmin();
    const admin = getAdminSupabase();
    const { data, error } = await admin
      .from("ateliers")
      .select("*")
      .order("date_paiement", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AtelierEntry[];
  });
