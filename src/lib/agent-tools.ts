import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase";
import { canAccessTable, type ToolName } from "@/lib/agent-security";
import { MemoryManager } from "@/lib/agent-memory";

const TABLES = [
  "products", "orders", "contacts", "reservations", "ateliers",
  "reviews", "avis", "partnerships", "gallery_images", "app_settings",
  "activity_log", "admin_users",
] as const;

const WRITE_TABLES = [
  "products", "orders", "contacts", "reservations", "ateliers",
  "reviews", "avis", "partnerships", "gallery_images", "app_settings",
] as const;

export function buildToolDefinitions(userRole: string, userEmail: string, userId: string) {
  const memory = new MemoryManager();

  return {
    query_data: {
      description: "Query any database table with filters. Returns rows as JSON. Use for listing, searching, or getting specific records.",
      parameters: z.object({
        table: z.enum(TABLES as unknown as [string, ...string[]]),
        filters: z.record(z.unknown()).optional().describe("Column-value filters (e.g., {status: 'pending', is_active: true})"),
        sort: z.string().optional().describe("Column to sort by, prefix '-' for desc (e.g., '-created_at')"),
        limit: z.number().max(100).optional().describe("Max rows to return (default 50)"),
      }),
      execute: async (params: { table: string; filters?: Record<string, unknown>; sort?: string; limit?: number }) => {
        if (!canAccessTable(params.table, userRole)) {
          return { error: `Accès refusé à la table ${params.table}` };
        }

        const supabase = getAdminSupabase();
        let query = supabase.from(params.table).select("*");

        if (params.filters) {
          for (const [key, value] of Object.entries(params.filters)) {
            if (value === null) {
              query = query.is(key, null);
            } else if (typeof value === "string" && value.startsWith("%")) {
              query = query.ilike(key, value);
            } else {
              query = query.eq(key, value);
            }
          }
        }

        if (params.sort) {
          const desc = params.sort.startsWith("-");
          const col = desc ? params.sort.slice(1) : params.sort;
          query = query.order(col, { ascending: !desc });
        }

        query = query.limit(params.limit ?? 50);
        const { data, error } = await query;
        if (error) return { error: error.message };
        return { data, count: data?.length ?? 0 };
      },
    },

    get_stats: {
      description: "Get dashboard statistics: total revenue, order counts, product counts, recent activity. Use period filter for time range.",
      parameters: z.object({
        period: z.enum(["week", "month", "year"]).optional().describe("Time period (default: all time)"),
      }),
      execute: async (params: { period?: string }) => {
        const supabase = getAdminSupabase();
        const now = new Date();
        let since: string | undefined;

        if (params.period === "week") since = new Date(now.getTime() - 7 * 86400000).toISOString();
        else if (params.period === "month") since = new Date(now.getTime() - 30 * 86400000).toISOString();
        else if (params.period === "year") since = new Date(now.getTime() - 365 * 86400000).toISOString();

        const queries = [
          supabase.from("orders").select("id, total_amount, status, is_paid, created_at"),
          supabase.from("products").select("id, name").eq("is_active", true),
          supabase.from("contacts").select("id, status, created_at"),
          supabase.from("reservations").select("id, status, created_at"),
        ];

        const [orders, products, contacts, reservations] = await Promise.all(queries);

        const allOrders = orders.data ?? [];
        const filteredOrders = since ? allOrders.filter((o) => o.created_at >= since) : allOrders;

        return {
          orders: {
            total: filteredOrders.length,
            revenue: filteredOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0),
            paid: filteredOrders.filter((o) => o.is_paid).length,
            pending: filteredOrders.filter((o) => o.status === "pending").length,
          },
          products: { total: products.data?.length ?? 0 },
          contacts: { total: contacts.data?.length ?? 0, unread: (contacts.data ?? []).filter((c) => c.status === "new").length },
          reservations: { total: reservations.data?.length ?? 0, pending: (reservations.data ?? []).filter((r) => r.status === "pending").length },
        };
      },
    },

    mutate_data: {
      description: "Create or update a record in the database. Use for creating products, updating orders, changing settings, etc.",
      parameters: z.object({
        table: z.enum(WRITE_TABLES as unknown as [string, ...string[]]),
        action: z.enum(["insert", "update"]),
        id: z.string().optional().describe("Record ID (required for update)"),
        data: z.record(z.unknown()).describe("Column-value pairs to insert or update"),
      }),
      execute: async (params: { table: string; action: string; id?: string; data: Record<string, unknown> }) => {
        if (!canAccessTable(params.table, userRole)) {
          return { error: `Accès refusé à la table ${params.table}` };
        }

        const supabase = getAdminSupabase();

        if (params.action === "insert") {
          const { data: result, error } = await supabase.from(params.table).insert(params.data).select("id").single();
          if (error) return { error: error.message };
          return { success: true, id: result.id, message: `Créé dans ${params.table}` };
        }

        if (!params.id) return { error: "ID requis pour update" };
        const { error } = await supabase.from(params.table).update(params.data).eq("id", params.id);
        if (error) return { error: error.message };
        return { success: true, message: `Mis à jour dans ${params.table}` };
      },
    },

    request_delete: {
      description: "Request deletion of a record. Returns a confirmation token that must be passed to confirm_delete. NEVER call confirm_delete without showing the user the warning first.",
      parameters: z.object({
        table: z.enum(WRITE_TABLES as unknown as [string, ...string[]]),
        id: z.string().describe("ID of the record to delete"),
      }),
      execute: async (params: { table: string; id: string }) => {
        const supabase = getAdminSupabase();

        // Fetch entity name for confirmation display
        const { data: entity } = await supabase.from(params.table).select("name, title, customer_name").eq("id", params.id).single();
        const entityName = entity?.name ?? entity?.title ?? entity?.customer_name ?? params.id;

        const token = await memory.createDeleteToken(userId, params.table, params.id, entityName);
        return {
          warning: `⚠️ Suppression de "${entityName}" (${params.table}). Cette action est irréversible.`,
          token,
          entityName,
          table: params.table,
          message: "Dites à l'utilisateur qu'il doit confirmer la suppression.",
        };
      },
    },

    confirm_delete: {
      description: "Confirm and execute a deletion using the token from request_delete. Only call this after the user explicitly confirms.",
      parameters: z.object({
        token: z.string().describe("Confirmation token from request_delete"),
      }),
      execute: async (params: { token: string }) => {
        const validation = await memory.validateDeleteToken(params.token);
        if (!validation.valid) {
          return { error: "Token invalide ou expiré. Demandez une nouvelle demande de suppression." };
        }

        const supabase = getAdminSupabase();
        const { error } = await supabase.from(validation.entityType!).delete().eq("id", validation.entityId!);
        if (error) return { error: error.message };

        await memory.markDeleteTokenUsed(params.token);
        return { success: true, message: `"${validation.entityName}" supprimé avec succès.` };
      },
    },
  };
}
