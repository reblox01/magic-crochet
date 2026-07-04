import { detectInjection, sanitizeInput } from "@/lib/agent-security";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TEXT_BYTES = 512 * 1024;
const MAX_CSV_ROWS = 250;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_TEXT_TYPES = new Set(["text/csv", "text/markdown", "text/plain"]);

function extension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function decodeTextFile(file: UploadedFile) {
  const bytes = Buffer.from(file.base64, "base64");
  if (bytes.length > MAX_TEXT_BYTES) {
    throw new Error(`${file.name}: fichier texte trop volumineux (max 512KB)`);
  }
  return bytes.toString("utf-8");
}

function validateFile(file: UploadedFile) {
  if (!file.name || file.name.length > 180) throw new Error("Nom de fichier invalide.");
  if (file.size > MAX_FILE_SIZE)
    throw new Error(`${file.name}: fichier trop volumineux (max 10MB)`);

  const ext = extension(file.name);
  const isCsv = file.type === "text/csv" || ext === "csv";
  const isMarkdown = file.type === "text/markdown" || ext === "md";
  const isImage =
    file.type.startsWith("image/") && ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

  if (!isCsv && !isMarkdown && !isImage && !ALLOWED_TEXT_TYPES.has(file.type)) {
    throw new Error(`${file.name}: type de fichier non supporte.`);
  }
  if (isImage && !ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`${file.name}: format image non supporte.`);
  }
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          cells.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseRow(lines[0]).map((h) => sanitizeInput(h).slice(0, 80));
  return lines.slice(1, MAX_CSV_ROWS + 1).map((line) => {
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = sanitizeInput(values[i] ?? "").slice(0, 1000);
    });
    return row;
  });
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  base64: string; // raw base64 without data: prefix
}

export interface ParsedFiles {
  csvData: Record<string, string>[];
  csvText: string;
  mdText: string;
  images: { name: string; base64: string; mimeType: string }[];
}

export function parseFiles(files: UploadedFile[]): ParsedFiles {
  const result: ParsedFiles = { csvData: [], csvText: "", mdText: "", images: [] };

  for (const file of files) {
    validateFile(file);

    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      const content = decodeTextFile(file);
      const injection = detectInjection(content);
      if (!injection.safe)
        throw new Error(`${file.name}: contenu refuse pour raisons de securite.`);
      result.csvData = parseCSV(content);
      const preview = result.csvData.slice(0, 40);
      result.csvText = `CSV "${file.name}" (${result.csvData.length} lignes analysees, max ${MAX_CSV_ROWS}):\n${JSON.stringify(preview, null, 2)}`;
    } else if (file.type === "text/markdown" || file.name.endsWith(".md")) {
      const content = decodeTextFile(file);
      const injection = detectInjection(content);
      if (!injection.safe)
        throw new Error(`${file.name}: contenu refuse pour raisons de securite.`);
      result.mdText += `\n\n--- BEGIN_UPLOADED_MARKDOWN_DATA ${file.name} ---\n${sanitizeInput(content).slice(0, 12000)}\n--- END_UPLOADED_MARKDOWN_DATA ---`;
    } else if (file.type.startsWith("image/")) {
      result.images.push({ name: file.name, base64: file.base64, mimeType: file.type });
    }
  }

  return result;
}
