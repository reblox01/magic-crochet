/**
 * Agent security layer — input sanitization, injection detection, output validation.
 */

// ---- Input Sanitization ----

const DANGEROUS_PATTERNS = [
  // SQL injection
  /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\b\s)/i,
  /(--|\/\*|\*\/|;)/,
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
  [/\u200B/g, ""],  // zero-width space
  [/\u200C/g, ""],  // zero-width non-joiner
  [/\u200D/g, ""],  // zero-width joiner
  [/\uFEFF/g, ""],  // BOM
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
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .trim()
    .slice(0, 4000); // hard length cap
}

// ---- PII Filtering ----

const PII_PATTERNS: [RegExp, string][] = [
  [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "[EMAIL]"],
  [/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, "[PHONE]"],
  [/\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln)\b/gi, "[ADDRESS]"],
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
  /Bearer\s+[A-Za-z0-9_\-\.]+/i,
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

type ToolName = "query_data" | "get_stats" | "mutate_data" | "request_delete" | "confirm_delete";

const TOOL_PERMISSIONS: Record<string, string[]> = {
  owner: ["query_data", "get_stats", "mutate_data", "request_delete", "confirm_delete"],
  admin: ["query_data", "get_stats", "mutate_data", "request_delete", "confirm_delete"],
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
