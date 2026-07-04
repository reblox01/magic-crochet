/**
 * Agent security layer — input sanitization, injection detection, output validation.
 */

// ---- Input Sanitization ----

const DANGEROUS_PATTERNS = [
  // SQL injection — multi-word patterns only (not single keywords in natural language)
  /\b(UNION\s+ALL\s+SELECT|INSERT\s+INTO|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|CREATE\s+TABLE|EXEC\s*\(|EXECUTE\s*\()\b/i,
  /(--|\/\*|\*\/|;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)\b)/i,
  // Script injection
  /<\s*(script|iframe|object|embed|form|input|textarea|button|link|meta|base)\b/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  // Prompt injection
  /(ignore|forget|disregard)\s+(all\s+)?(previous|above|prior|earlier|your)\s+(instructions|rules|prompts|context)/i,
  /(you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as)\s+/i,
  /\bDAN\b/,
  /\bjailbreak\b/i,
  /\bdeveloper\s+mode\b/i,
  /\boverride\s+(your|all|the|system)\b/i,
  // Path traversal
  /\.\.\/|\.\.\\\\/,
  // Command injection
  /\$\(|`[^`]+`/,
];

const UNICODE_OBFUSCATION: [RegExp, string][] = [
  [/\u0410/g, "A"], // Cyrillic A
  [/\u0415/g, "E"], // Cyrillic Ye
  [/\u041E/g, "O"], // Cyrillic O
  [/\u0420/g, "P"], // Cyrillic Er (looks like P)
  [/\u0421/g, "C"], // Cyrillic Es (looks like C)
  [/\u0423/g, "Y"], // Cyrillic U (looks like Y)
  [/\u0425/g, "X"], // Cyrillic Kha (looks like X)
  [/\u200B/g, ""], // zero-width space
  [/\u200C/g, ""], // zero-width non-joiner
  [/\u200D/g, ""], // zero-width joiner
  [/\uFEFF/g, ""], // BOM
];

export function detectInjection(input: string): { safe: boolean; reason?: string } {
  let normalized = input;
  for (const [pattern, replacement] of UNICODE_OBFUSCATION) {
    normalized = normalized.replace(pattern, replacement);
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(normalized)) {
      return { safe: false, reason: `Blocked pattern: ${pattern.source.slice(0, 60)}` };
    }
  }

  return { safe: true };
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // strip angle brackets
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("")
    .trim()
    .slice(0, 4000); // hard length cap
}

// ---- PII Filtering ----

const PII_PATTERNS: [RegExp, string][] = [
  [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "[EMAIL]"],
  [/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, "[PHONE]"],
  [
    /\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln)\b/gi,
    "[ADDRESS]",
  ],
];

export function filterPII(text: string): string {
  let filtered = text;
  for (const [pattern, replacement] of PII_PATTERNS) {
    filtered = filtered.replace(pattern, replacement);
  }
  return filtered;
}

// ---- Output Validation ----

const FORBIDDEN_OUTPUT = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /SUPABASE_URL.*?[A-Za-z0-9_-]{20,}/i,
  /Bearer\s+[A-Za-z0-9_.-]+/i,
  /password\s*[:=]\s*["']?[^\s"']+/i,
  /secret\s*[:=]\s*["']?[^\s"']+/i,
  /api[_-]?key\s*[:=]\s*["']?[^\s"']+/i,
];

export function validateOutput(text: string): { safe: boolean; cleaned: string } {
  let cleaned = text;
  for (const pattern of FORBIDDEN_OUTPUT) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, "[REDACTED]");
    }
  }
  return { safe: true, cleaned };
}

// ---- Tool Permission Matrix ----

type ToolName =
  | "query_data"
  | "get_stats"
  | "mutate_data"
  | "import_data"
  | "upload_product_image"
  | "calculate_atelier"
  | "batch_delete"
  | "confirm_batch_delete";

const TOOL_PERMISSIONS: Record<string, string[]> = {
  owner: [
    "query_data",
    "get_stats",
    "mutate_data",
    "import_data",
    "upload_product_image",
    "calculate_atelier",
    "batch_delete",
    "confirm_batch_delete",
  ],
  admin: [
    "query_data",
    "get_stats",
    "mutate_data",
    "import_data",
    "upload_product_image",
    "calculate_atelier",
    "batch_delete",
    "confirm_batch_delete",
  ],
  custom: [], // custom users don't have agent access
};

export function canUseTool(tool: ToolName, role: string): boolean {
  return TOOL_PERMISSIONS[role]?.includes(tool) ?? false;
}

// Tables that require owner role
const OWNER_ONLY_TABLES = ["activity_log", "admin_users"];

export function canAccessTable(table: string, role: string): boolean {
  if (OWNER_ONLY_TABLES.includes(table) && role !== "owner") return false;
  return true;
}

export const TABLE_COLUMNS: Record<string, readonly string[]> = {
  products: [
    "id",
    "name",
    "slug",
    "description",
    "price",
    "image",
    "images",
    "category",
    "in_stock",
    "is_active",
    "rating",
    "reviews_count",
    "materials",
    "dimensions",
    "sub",
    "tag",
    "created_at",
  ],
  orders: [
    "id",
    "customer_name",
    "customer_email",
    "customer_phone",
    "customer_address",
    "total_amount",
    "status",
    "items",
    "notes",
    "is_paid",
    "livraison_prix",
    "qr_image_url",
    "qr_text",
    "created_at",
  ],
  contacts: ["id", "name", "email", "subject", "message", "status", "created_at"],
  reservations: [
    "id",
    "name",
    "email",
    "phone",
    "seats",
    "format",
    "date",
    "time",
    "notes",
    "status",
    "created_at",
  ],
  ateliers: [
    "id",
    "client_number",
    "nom",
    "telephone",
    "service",
    "personnes",
    "prix_total",
    "date_paiement",
    "remarque",
    "group_name",
    "created_at",
  ],
  reviews: ["id", "customer_name", "rating", "comment", "is_visible", "created_at"],
  avis: ["id", "quote", "author_name", "author_role", "is_visible", "sort_order", "created_at"],
  partnerships: ["id", "name", "url", "logo_url", "size", "is_active", "sort_order", "created_at"],
  gallery_images: [
    "id",
    "image_url",
    "caption",
    "alt_text",
    "is_active",
    "sort_order",
    "created_at",
  ],
  app_settings: ["key", "value", "updated_at"],
  activity_log: [
    "id",
    "user_id",
    "user_email",
    "action",
    "entity_type",
    "entity_id",
    "entity_name",
    "details",
    "created_at",
  ],
  admin_users: ["id", "email", "role", "display_name", "created_at"],
};

export const WRITE_COLUMNS: Record<string, readonly string[]> = {
  products: [
    "name",
    "slug",
    "description",
    "price",
    "image",
    "images",
    "category",
    "in_stock",
    "is_active",
    "materials",
    "dimensions",
    "sub",
    "tag",
  ],
  orders: [
    "customer_name",
    "customer_email",
    "customer_phone",
    "customer_address",
    "total_amount",
    "status",
    "items",
    "notes",
    "is_paid",
    "livraison_prix",
    "qr_image_url",
    "qr_text",
  ],
  contacts: ["name", "email", "subject", "message", "status"],
  reservations: ["name", "email", "phone", "seats", "format", "date", "time", "notes", "status"],
  ateliers: [
    "client_number",
    "nom",
    "telephone",
    "service",
    "personnes",
    "prix_total",
    "date_paiement",
    "remarque",
    "group_name",
  ],
  reviews: ["customer_name", "rating", "comment", "is_visible"],
  avis: ["quote", "author_name", "author_role", "is_visible", "sort_order"],
  partnerships: ["name", "url", "logo_url", "size", "is_active", "sort_order"],
  gallery_images: ["image_url", "caption", "alt_text", "is_active", "sort_order"],
  app_settings: ["key", "value"],
};

export function isKnownTable(table: string): boolean {
  return table in TABLE_COLUMNS;
}

export function isAllowedColumn(table: string, column: string, write = false): boolean {
  const allowed = write ? WRITE_COLUMNS[table] : TABLE_COLUMNS[table];
  return allowed?.includes(column) ?? false;
}

export function pickAllowedColumns(
  table: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = WRITE_COLUMNS[table] ?? [];
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in data) out[key] = data[key];
  }
  return out;
}
