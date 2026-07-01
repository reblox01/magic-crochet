import { getAdminSupabase } from "@/lib/supabase";
import { canAccessTable } from "@/lib/agent-security";
import { MemoryManager } from "@/lib/agent-memory";
import type { AgentTool } from "@/lib/ai-provider";

const TABLES = [
  "products", "orders", "contacts", "reservations", "ateliers",
  "reviews", "avis", "partnerships", "gallery_images", "app_settings",
  "activity_log", "admin_users",
] as const;

const WRITE_TABLES = [
  "products", "orders", "contacts", "reservations", "ateliers",
  "reviews", "avis", "partnerships", "gallery_images", "app_settings",
] as const;

export function getToolDefinitions(): AgentTool[] {
  return [
    {
      name: "query_data",
      description: "Query any database table with filters. Returns rows as JSON. Use for listing, searching, or getting specific records.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: [...TABLES], description: "Table name" },
          filters: { type: "object", description: "Column-value filters (e.g., {status: 'pending', is_active: true})" },
          sort: { type: "string", description: "Column to sort by, prefix '-' for desc (e.g., '-created_at')" },
          limit: { type: "number", description: "Max rows to return (default 50)" },
        },
        required: ["table"],
      },
    },
    {
      name: "get_stats",
      description: "Get dashboard statistics: total revenue, order counts, product counts, recent activity. Use period filter for time range.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "year"], description: "Time period (default: all time)" },
        },
      },
    },
    {
      name: "mutate_data",
      description: "Create or update a record in the database. Use for creating products, updating orders, changing settings, etc.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: [...WRITE_TABLES], description: "Table name" },
          action: { type: "string", enum: ["insert", "update"], description: "Action to perform" },
          id: { type: "string", description: "Record ID (required for update)" },
          data: { type: "object", description: "Column-value pairs to insert or update" },
        },
        required: ["table", "action", "data"],
      },
    },
    {
      name: "request_delete",
      description: "Request deletion of a record. Returns a confirmation token that must be passed to confirm_delete. NEVER call confirm_delete without showing the user the warning first.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: [...WRITE_TABLES], description: "Table name" },
          id: { type: "string", description: "ID of the record to delete" },
        },
        required: ["table", "id"],
      },
    },
    {
      name: "confirm_delete",
      description: "Confirm and execute a deletion using the token from request_delete. Only call this after the user explicitly confirms.",
      parameters: {
        type: "object",
        properties: {
          token: { type: "string", description: "Confirmation token from request_delete" },
        },
        required: ["token"],
      },
    },
  ];
}

export function createToolExecutor(userRole: string, _userEmail: string, userId: string) {
  const memory = new MemoryManager();

  return async (name: string, args: Record<string, unknown>): Promise<string> => {
    try {
      switch (name) {
        case "query_data": return await executeQuery(args, userRole);
        case "get_stats": return await executeGetStats(args);
        case "mutate_data": return await executeMutate(args, userRole);
        case "request_delete": return await executeRequestDelete(args, userId, memory);
        case "confirm_delete": return await executeConfirmDelete(args, memory);
        default: return JSON.stringify({ error: `Outil inconnu: ${name}` });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      return JSON.stringify({ error: msg });
    }
  };
}

async function executeQuery(args: Record<string, unknown>, userRole: string): Promise<string> {
  const table = args.table as string;
  if (!canAccessTable(table, userRole)) return JSON.stringify({ error: `Accès refusé à la table ${table}` });

  const supabase = getAdminSupabase();
  let query = supabase.from(table).select("*");

  const filters = args.filters as Record<string, unknown> | undefined;
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value === null) query = query.is(key, null);
      else if (typeof value === "string" && value.startsWith("%")) query = query.ilike(key, value);
      else query = query.eq(key, value);
    }
  }

  const sort = args.sort as string | undefined;
  if (sort) {
    const desc = sort.startsWith("-");
    query = query.order(desc ? sort.slice(1) : sort, { ascending: !desc });
  }

  query = query.limit((args.limit as number) ?? 50);
  const { data, error } = await query;
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ data, count: data?.length ?? 0 });
}

async function executeGetStats(args: Record<string, unknown>): Promise<string> {
  const supabase = getAdminSupabase();
  const period = args.period as string | undefined;
  let since: string | undefined;

  if (period === "week") since = new Date(Date.now() - 7 * 86400000).toISOString();
  else if (period === "month") since = new Date(Date.now() - 30 * 86400000).toISOString();
  else if (period === "year") since = new Date(Date.now() - 365 * 86400000).toISOString();

  const [orders, products, contacts, reservations] = await Promise.all([
    supabase.from("orders").select("id, total_amount, status, is_paid, created_at"),
    supabase.from("products").select("id, name").eq("is_active", true),
    supabase.from("contacts").select("id, status, created_at"),
    supabase.from("reservations").select("id, status, created_at"),
  ]);

  const allOrders = orders.data ?? [];
  const filtered = since ? allOrders.filter((o) => o.created_at >= since) : allOrders;

  return JSON.stringify({
    orders: {
      total: filtered.length,
      revenue: filtered.reduce((s, o) => s + (o.total_amount ?? 0), 0),
      paid: filtered.filter((o) => o.is_paid).length,
      pending: filtered.filter((o) => o.status === "pending").length,
    },
    products: { total: products.data?.length ?? 0 },
    contacts: { total: contacts.data?.length ?? 0, unread: (contacts.data ?? []).filter((c) => c.status === "new").length },
    reservations: { total: reservations.data?.length ?? 0, pending: (reservations.data ?? []).filter((r) => r.status === "pending").length },
  });
}

async function executeMutate(args: Record<string, unknown>, userRole: string): Promise<string> {
  const table = args.table as string;
  if (!canAccessTable(table, userRole)) return JSON.stringify({ error: `Accès refusé à la table ${table}` });

  const supabase = getAdminSupabase();
  const action = args.action as string;
  const data = args.data as Record<string, unknown>;

  if (action === "insert") {
    const { data: result, error } = await supabase.from(table).insert(data).select("id").single();
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify({ success: true, id: result.id, message: `Créé dans ${table}` });
  }

  const id = args.id as string;
  if (!id) return JSON.stringify({ error: "ID requis pour update" });
  const { error } = await supabase.from(table).update(data).eq("id", id);
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ success: true, message: `Mis à jour dans ${table}` });
}

async function executeRequestDelete(args: Record<string, unknown>, userId: string, memory: MemoryManager): Promise<string> {
  const supabase = getAdminSupabase();
  const table = args.table as string;
  const id = args.id as string;

  const { data: entity } = await supabase.from(table).select("name, title, customer_name").eq("id", id).single();
  const entityName = entity?.name ?? entity?.title ?? entity?.customer_name ?? id;

  const token = await memory.createDeleteToken(userId, table, id, entityName);
  return JSON.stringify({
    warning: `⚠️ Suppression de "${entityName}" (${table}). Cette action est irréversible.`,
    token,
    entityName,
    table,
    message: "Dites à l'utilisateur qu'il doit confirmer la suppression.",
  });
}

async function executeConfirmDelete(args: Record<string, unknown>, memory: MemoryManager): Promise<string> {
  const validation = await memory.validateDeleteToken(args.token as string);
  if (!validation.valid) return JSON.stringify({ error: "Token invalide ou expiré." });

  const supabase = getAdminSupabase();
  const { error } = await supabase.from(validation.entityType!).delete().eq("id", validation.entityId!);
  if (error) return JSON.stringify({ error: error.message });

  await memory.markDeleteTokenUsed(args.token as string);
  return JSON.stringify({ success: true, message: `"${validation.entityName}" supprimé avec succès.` });
}
