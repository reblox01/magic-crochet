import { getAdminSupabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";
import {
  canAccessTable,
  canUseTool,
  filterPII,
  isAllowedColumn,
  isKnownTable,
  pickAllowedColumns,
  TABLE_COLUMNS,
  WRITE_COLUMNS,
} from "@/lib/agent-security";
import { MemoryManager } from "@/lib/agent-memory";
import type { AgentTool } from "@/lib/ai-provider";
import type { ParsedFiles } from "@/lib/agent-file-parser";

const TABLES = Object.keys(TABLE_COLUMNS);
const WRITE_TABLES = Object.keys(WRITE_COLUMNS);
const MAX_QUERY_LIMIT = 100;
const MAX_IMPORT_ROWS = 100;
const MAX_DELETE_IDS = 50;

export function flushBackgroundJobs(): Promise<void[]> {
  return Promise.resolve([]);
}

export function getToolDefinitions(): AgentTool[] {
  return [
    {
      name: "query_data",
      description:
        "Read dashboard data from an allowlisted table. Supports exact filters, sorting, and a hard result limit.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: TABLES },
          filters: {
            type: "object",
            description:
              "Exact filters by valid column name. Use %prefix/suffix strings for ilike search.",
          },
          sort: { type: "string", description: "Valid column name. Prefix '-' for descending." },
          limit: { type: "number", description: `Max ${MAX_QUERY_LIMIT}. Default 50.` },
        },
        required: ["table"],
      },
    },
    {
      name: "get_stats",
      description:
        "Return dashboard analytics: revenue, orders, products, contacts, reservations, atelier totals, and recent activity.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "year", "all"] },
        },
      },
    },
    {
      name: "calculate_atelier",
      description:
        "Calculate atelier metrics by period/group/service: participants, revenue, average ticket, unpaid/unknown payment rows.",
      parameters: {
        type: "object",
        properties: {
          group_name: { type: "string" },
          service: { type: "string" },
          period: { type: "string", enum: ["week", "month", "year", "all"] },
        },
      },
    },
    {
      name: "mutate_data",
      description:
        "Create or update one record in a write-allowlisted dashboard table. Valid columns only; returns database errors immediately.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: WRITE_TABLES },
          action: { type: "string", enum: ["insert", "update"] },
          id: { type: "string", description: "Required for update." },
          data: { type: "object", description: "Column-value pairs." },
        },
        required: ["table", "action", "data"],
      },
    },
    {
      name: "import_data",
      description: `Bulk insert rows into products, orders, ateliers, contacts, reservations, reviews, avis, partnerships, gallery_images, or app_settings. Max ${MAX_IMPORT_ROWS} rows.`,
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: WRITE_TABLES },
          rows: { type: "array", items: { type: "object" } },
        },
        required: ["table", "rows"],
      },
    },
    {
      name: "upload_product_image",
      description:
        "Upload one image attached to the current chat to Supabase Storage and return a public URL. MUST be called before using mutate_data with an image URL. Returns {success:true, url:'https://...'}. Use the returned url exactly as-is in products.image or products.images. NEVER fabricate a URL.",
      parameters: {
        type: "object",
        properties: {
          file_name: { type: "string", description: "Exact attached image filename." },
        },
        required: ["file_name"],
      },
    },
    {
      name: "batch_delete",
      description:
        "Prepare deletion of up to 50 records. Returns a confirmation token. Do not call confirm_batch_delete until the user sends the token back with an explicit confirmation.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", enum: WRITE_TABLES },
          ids: { type: "array", items: { type: "string" } },
        },
        required: ["table", "ids"],
      },
    },
    {
      name: "confirm_batch_delete",
      description:
        "Execute a prepared deletion only when the current user message contains the token and an explicit confirmation phrase.",
      parameters: {
        type: "object",
        properties: {
          token: { type: "string" },
        },
        required: ["token"],
      },
    },
  ];
}

export function createToolExecutor(
  userRole: string,
  userEmail: string,
  userId: string,
  currentUserMessage = "",
  parsedFiles?: ParsedFiles,
) {
  const memory = new MemoryManager();

  return async (name: string, args: Record<string, unknown>): Promise<string> => {
    const toolName = name as Parameters<typeof canUseTool>[0];
    if (!canUseTool(toolName, userRole)) {
      return JSON.stringify({ error: `Outil non autorise: ${name}` });
    }

    try {
      let result: string;
      switch (name) {
        case "query_data":
          result = await executeQuery(args, userRole);
          break;
        case "get_stats":
          result = await executeGetStats(args);
          break;
        case "calculate_atelier":
          result = await executeCalculateAtelier(args);
          break;
        case "mutate_data":
          result = await executeMutate(args, userRole, userEmail, userId);
          break;
        case "import_data":
          result = await executeImport(args, userRole, userEmail, userId);
          break;
        case "upload_product_image":
          result = await executeProductImageUpload(args, parsedFiles);
          break;
        case "batch_delete":
          result = await executeBatchDelete(args, userRole, userId, memory);
          break;
        case "confirm_batch_delete":
          result = await executeConfirmBatchDelete(
            args,
            currentUserMessage,
            memory,
            userEmail,
            userId,
          );
          break;
        default:
          result = JSON.stringify({ error: `Outil inconnu: ${name}` });
      }
      await auditTool(userId, userEmail, name, args, result);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      const result = JSON.stringify({ error: msg });
      await auditTool(userId, userEmail, name, args, result);
      return result;
    }
  };
}

function assertTable(table: unknown, role: string, write = false): string {
  if (typeof table !== "string" || !isKnownTable(table)) throw new Error("Table invalide.");
  if (write && !(table in WRITE_COLUMNS)) throw new Error(`Table non modifiable: ${table}`);
  if (!canAccessTable(table, role)) throw new Error(`Acces refuse a la table ${table}`);
  return table;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Objet data invalide.");
  return value as Record<string, unknown>;
}

function normalizeRow(table: string, data: Record<string, unknown>): Record<string, unknown> {
  const picked = pickAllowedColumns(table, data);

  for (const [key, value] of Object.entries(picked)) {
    if (typeof value === "string") picked[key] = filterPII(value).trim().slice(0, 5000);
  }

  for (const key of [
    "price",
    "total_amount",
    "livraison_prix",
    "prix_total",
    "rating",
    "reviews_count",
    "seats",
    "personnes",
    "client_number",
    "sort_order",
  ]) {
    if (key in picked && picked[key] !== null && picked[key] !== "") {
      const number = Number(picked[key]);
      if (!Number.isFinite(number)) throw new Error(`${key}: nombre invalide.`);
      picked[key] = number;
    }
  }

  for (const key of ["in_stock", "is_active", "is_paid", "is_visible"]) {
    if (key in picked && typeof picked[key] === "string") {
      picked[key] = ["true", "1", "yes", "oui", "vrai"].includes(String(picked[key]).toLowerCase());
    }
  }

  if (table === "products") {
    if (!picked.name) throw new Error("products.name est requis.");
    if (picked.price === undefined || picked.price === null || picked.price === "")
      throw new Error("products.price est requis.");
  }
  if (table === "orders") {
    if (!picked.customer_name) throw new Error("orders.customer_name est requis.");
    if (!picked.customer_email) picked.customer_email = "admin@magic-crochet.local";
    if (
      picked.total_amount === undefined ||
      picked.total_amount === null ||
      picked.total_amount === ""
    )
      throw new Error("orders.total_amount est requis.");
  }
  if (table === "ateliers") {
    if (!picked.nom) throw new Error("ateliers.nom est requis.");
    if (picked.personnes === undefined) picked.personnes = 1;
    if (picked.prix_total === undefined) picked.prix_total = 0;
  }

  return picked;
}

async function executeQuery(args: Record<string, unknown>, userRole: string): Promise<string> {
  const table = assertTable(args.table, userRole);
  const supabase = getAdminSupabase();
  let query = supabase.from(table).select("*");

  const filters =
    args.filters && typeof args.filters === "object" && !Array.isArray(args.filters)
      ? (args.filters as Record<string, unknown>)
      : undefined;

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (!isAllowedColumn(table, key)) throw new Error(`Colonne filtre interdite: ${key}`);
      if (value === null) query = query.is(key, null);
      else if (typeof value === "string" && value.includes("%"))
        query = query.ilike(key, value.slice(0, 120));
      else query = query.eq(key, value as never);
    }
  }

  const sort = typeof args.sort === "string" ? args.sort : undefined;
  if (sort) {
    const desc = sort.startsWith("-");
    const column = desc ? sort.slice(1) : sort;
    if (!isAllowedColumn(table, column)) throw new Error(`Colonne tri interdite: ${column}`);
    query = query.order(column, { ascending: !desc });
  }

  const limit = Math.min(Math.max(Number(args.limit ?? 50), 1), MAX_QUERY_LIMIT);
  const { data, error } = await query.limit(limit);
  if (error) throw new Error(error.message);
  return JSON.stringify({ data, count: data?.length ?? 0, limit });
}

async function executeGetStats(args: Record<string, unknown>): Promise<string> {
  const period = typeof args.period === "string" ? args.period : "all";
  const since = periodToDate(period);
  const supabase = getAdminSupabase();

  const [orders, products, contacts, reservations, ateliers, activity] = await Promise.all([
    supabase.from("orders").select("id, total_amount, status, is_paid, created_at"),
    supabase.from("products").select("id, name, is_active, in_stock, created_at"),
    supabase.from("contacts").select("id, status, created_at"),
    supabase.from("reservations").select("id, status, seats, created_at"),
    supabase
      .from("ateliers")
      .select("id, personnes, prix_total, date_paiement, group_name, service, created_at"),
    supabase
      .from("activity_log")
      .select("action, entity_type, entity_name, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const filteredOrders = filterByDate(orders.data ?? [], "created_at", since);
  const filteredAteliers = filterByDate(ateliers.data ?? [], "date_paiement", since);

  return JSON.stringify({
    period,
    orders: {
      total: filteredOrders.length,
      revenue: sum(filteredOrders, "total_amount"),
      paid: filteredOrders.filter((o) => o.is_paid).length,
      pending: filteredOrders.filter((o) => o.status === "pending").length,
    },
    products: {
      active: (products.data ?? []).filter((p) => p.is_active).length,
      out_of_stock: (products.data ?? []).filter((p) => !p.in_stock).length,
    },
    contacts: {
      total: filterByDate(contacts.data ?? [], "created_at", since).length,
      unread: (contacts.data ?? []).filter((c) => c.status === "new").length,
    },
    reservations: {
      total: filterByDate(reservations.data ?? [], "created_at", since).length,
      pending: (reservations.data ?? []).filter((r) => r.status === "pending").length,
      seats: sum(filterByDate(reservations.data ?? [], "created_at", since), "seats"),
    },
    ateliers: {
      total: filteredAteliers.length,
      participants: sum(filteredAteliers, "personnes"),
      revenue: sum(filteredAteliers, "prix_total"),
    },
    recent_activity: activity.data ?? [],
  });
}

async function executeCalculateAtelier(args: Record<string, unknown>): Promise<string> {
  const supabase = getAdminSupabase();
  const period = typeof args.period === "string" ? args.period : "all";
  const since = periodToDate(period);
  let query = supabase.from("ateliers").select("*");

  if (typeof args.group_name === "string" && args.group_name.trim())
    query = query.eq("group_name", args.group_name.trim());
  if (typeof args.service === "string" && args.service.trim())
    query = query.eq("service", args.service.trim());

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = filterByDate(data ?? [], "date_paiement", since);
  const revenue = sum(rows, "prix_total");
  const participants = sum(rows, "personnes");

  return JSON.stringify({
    period,
    filters: { group_name: args.group_name ?? null, service: args.service ?? null },
    rows: rows.length,
    participants,
    revenue,
    average_ticket: participants > 0 ? revenue / participants : 0,
    missing_payment_date: rows.filter((r) => !r.date_paiement).length,
    by_group: groupSum(rows, "group_name", "prix_total"),
    by_service: groupSum(rows, "service", "prix_total"),
  });
}

async function executeMutate(
  args: Record<string, unknown>,
  userRole: string,
  userEmail: string,
  userId: string,
): Promise<string> {
  const table = assertTable(args.table, userRole, true);
  const action = args.action;
  const data = normalizeRow(table, requireRecord(args.data));
  if (Object.keys(data).length === 0) throw new Error("Aucune colonne autorisee fournie.");

  const supabase = getAdminSupabase();
  if (action === "insert") {
    const { data: inserted, error } = await supabase.from(table).insert(data).select("*").single();
    if (error) throw new Error(error.message);
    await logActivity({
      action: "create",
      entityType: table,
      entityId: inserted?.id ?? inserted?.key,
      entityName: displayName(inserted),
      details: { source: "agent" },
      userEmail,
      userId,
    });
    return JSON.stringify({ success: true, action, table, record: inserted });
  }

  if (action === "update") {
    if (typeof args.id !== "string" || !args.id) throw new Error("id requis pour update.");
    const { data: updated, error } = await supabase
      .from(table)
      .update(data)
      .eq(idColumn(table), args.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logActivity({
      action: "update",
      entityType: table,
      entityId: args.id,
      entityName: displayName(updated),
      details: { source: "agent", fields: Object.keys(data) },
      userEmail,
      userId,
    });
    return JSON.stringify({ success: true, action, table, record: updated });
  }

  throw new Error("Action invalide.");
}

async function executeImport(
  args: Record<string, unknown>,
  userRole: string,
  userEmail: string,
  userId: string,
): Promise<string> {
  const table = assertTable(args.table, userRole, true);
  if (!Array.isArray(args.rows)) throw new Error("rows doit etre un tableau.");
  if (args.rows.length === 0) throw new Error("Aucune ligne fournie.");
  if (args.rows.length > MAX_IMPORT_ROWS)
    throw new Error(`Import limite a ${MAX_IMPORT_ROWS} lignes.`);

  const rows = args.rows.map((row) => normalizeRow(table, requireRecord(row)));
  const supabase = getAdminSupabase();
  const { data, error } = await supabase.from(table).insert(rows).select("*");
  if (error) throw new Error(error.message);

  await logActivity({
    action: "create",
    entityType: table,
    entityName: `Import agent (${rows.length} lignes)`,
    details: { source: "agent", count: rows.length },
    userEmail,
    userId,
  });

  return JSON.stringify({
    success: true,
    table,
    inserted: data?.length ?? rows.length,
    records: data?.slice(0, 20) ?? [],
  });
}

async function executeProductImageUpload(
  args: Record<string, unknown>,
  parsedFiles?: ParsedFiles,
): Promise<string> {
  const rawName = typeof args.file_name === "string" ? args.file_name : "";
  // ponytail: strip phone anonymization from filename
  const fileName = rawName.replace(/\[PHONE\]/gi, "image").replace(/^agent-image-/, "image-");
  const image = parsedFiles?.images.find((img) => img.name === fileName || img.name === rawName);
  if (!image) throw new Error("Image introuvable dans les fichiers joints.");

  const ext = image.name.split(".").pop()?.toLowerCase() ?? "jpg";
  if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext))
    throw new Error("Extension image non supportee.");

  const safeName = `agent-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const bytes = Uint8Array.from(Buffer.from(image.base64, "base64"));
  if (bytes.length > 10 * 1024 * 1024) throw new Error("Image trop volumineuse.");

  const admin = getAdminSupabase();
  const { error } = await admin.storage.from("products").upload(safeName, bytes, {
    contentType: image.mimeType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = admin.storage.from("products").getPublicUrl(safeName);
  return JSON.stringify({ success: true, url: data.publicUrl, file_name: fileName });
}

async function executeBatchDelete(
  args: Record<string, unknown>,
  userRole: string,
  userId: string,
  memory: MemoryManager,
): Promise<string> {
  const table = assertTable(args.table, userRole, true);
  const ids = Array.isArray(args.ids)
    ? args.ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  if (ids.length === 0) throw new Error("Aucun ID fourni.");
  if (ids.length > MAX_DELETE_IDS)
    throw new Error(`Suppression limitee a ${MAX_DELETE_IDS} lignes.`);

  const supabase = getAdminSupabase();
  const { data: entities, error } = await supabase
    .from(table)
    .select(displaySelect(table))
    .in(idColumn(table), ids);
  if (error) throw new Error(error.message);

  const items = (entities ?? []).map((e) => ({
    id: String(e[idColumn(table)]),
    name: displayName(e),
  }));

  const token = await memory.createDeleteToken(
    userId,
    table,
    ids.join(","),
    `${items.length} elements`,
  );
  return JSON.stringify({
    requires_confirmation: true,
    warning: `Suppression irreversible de ${items.length} element(s) dans "${table}".`,
    items,
    token,
    instruction: `L'utilisateur doit repondre avec le token ${token} et une confirmation explicite avant execution.`,
  });
}

async function executeConfirmBatchDelete(
  args: Record<string, unknown>,
  currentUserMessage: string,
  memory: MemoryManager,
  userEmail: string,
  userId: string,
): Promise<string> {
  const token = typeof args.token === "string" ? args.token.trim() : "";
  if (!token || !currentUserMessage.includes(token)) {
    throw new Error(
      "Confirmation utilisateur manquante: le message courant doit contenir le token.",
    );
  }

  const lower = currentUserMessage.toLowerCase();
  const confirmed = ["confirme", "supprimer", "delete", "oui"].some((word) => lower.includes(word));
  if (!confirmed) throw new Error("Confirmation explicite manquante.");

  const validation = await memory.validateDeleteToken(token);
  if (!validation.valid) throw new Error("Token invalide ou expire.");

  const table = validation.entityType!;
  const ids = validation.entityId!.split(",");
  const supabase = getAdminSupabase();
  const { error } = await supabase.from(table).delete().in(idColumn(table), ids);
  if (error) throw new Error(error.message);

  await memory.markDeleteTokenUsed(token);
  await logActivity({
    action: "delete",
    entityType: table,
    entityName: `Suppression agent (${ids.length} lignes)`,
    details: { source: "agent", count: ids.length },
    userEmail,
    userId,
  });

  return JSON.stringify({ success: true, table, deleted: ids.length });
}

async function auditTool(
  userId: string,
  userEmail: string,
  tool: string,
  args: Record<string, unknown>,
  result: string,
) {
  await logActivity({
    action: "status_change",
    entityType: "agent_tool",
    entityName: tool,
    details: {
      args: redactArgs(args),
      result: result.slice(0, 1200),
    },
    userEmail,
    userId,
  });
}

function redactArgs(args: Record<string, unknown>) {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (/token|password|secret|key|base64/i.test(key)) copy[key] = "[REDACTED]";
    else copy[key] = value;
  }
  return copy;
}

function idColumn(table: string) {
  return table === "app_settings" ? "key" : "id";
}

function displaySelect(table: string) {
  const desired = ["id", "key", "name", "title", "customer_name", "nom", "email"];
  return desired.filter((column) => TABLE_COLUMNS[table]?.includes(column)).join(", ");
}

function displayName(row: Record<string, unknown> | null | undefined) {
  if (!row) return "element";
  return String(
    row.name ??
      row.title ??
      row.customer_name ??
      row.nom ??
      row.email ??
      row.key ??
      row.id ??
      "element",
  );
}

function periodToDate(period: string) {
  if (period === "week") return new Date(Date.now() - 7 * 86400000).toISOString();
  if (period === "month") return new Date(Date.now() - 30 * 86400000).toISOString();
  if (period === "year") return new Date(Date.now() - 365 * 86400000).toISOString();
  return undefined;
}

function filterByDate<T extends Record<string, unknown>>(rows: T[], key: string, since?: string) {
  if (!since) return rows;
  return rows.filter((row) => typeof row[key] === "string" && row[key] >= since);
}

function sum(rows: Record<string, unknown>[], key: string) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function groupSum(rows: Record<string, unknown>[], groupKey: string, amountKey: string) {
  const out: Record<string, { count: number; total: number }> = {};
  for (const row of rows) {
    const key = String(row[groupKey] ?? "non_classe");
    out[key] ??= { count: 0, total: 0 };
    out[key].count += 1;
    out[key].total += Number(row[amountKey]) || 0;
  }
  return out;
}
