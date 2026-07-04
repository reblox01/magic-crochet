import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square, Paperclip, X, FileText, Image, FileSpreadsheet } from "lucide-react";

export interface PendingFile {
  name: string;
  type: string;
  size: number;
  base64: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_BASE64 = 4 * 1024 * 1024; // ~3MB raw after base64, safe for server body limit
const ACCEPTED = ".csv,.md,.jpg,.jpeg,.png,.webp,.gif";

// ponytail: strip phone anonymization from filenames (e.g. "agent-[PHONE]-abc.jpg" → "image-abc.jpg")
function cleanFileName(name: string): string {
  return name.replace(/\[PHONE\]/gi, "image").replace(/^agent-image-/, "image-");
}

export function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type === "text/csv" || type.includes("csv")) return FileSpreadsheet;
  return FileText;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function FileChip({ file, onRemove }: { file: PendingFile; onRemove: () => void }) {
  const Icon = getFileIcon(file.type);
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-[#F506EA]/[0.06] border border-[#F506EA]/10 text-[11px] text-[#1c1917]/60 animate-in fade-in slide-in-from-bottom-1" style={{ animationDuration: "150ms" }}>
      <Icon className="h-3 w-3 text-[#F506EA]/60 shrink-0 ml-1.5" />
      <span className="truncate max-w-[120px]">{file.name}</span>
      <span className="text-[#1c1917]/30">{formatSize(file.size)}</span>
      <button onClick={onRemove} className="ml-0.5 mr-1.5 p-0.5 rounded hover:bg-[#F506EA]/10 hover:text-[#F506EA] transition-colors">
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function AutoTextarea({ value, onChange, placeholder, disabled, onKeyDown, maxLength, onPaste }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  maxLength?: number;
  onPaste?: (e: React.ClipboardEvent) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      rows={1}
      className="w-full resize-none bg-transparent text-[14px] leading-[1.5] placeholder:text-[#1c1917]/25 focus-visible:outline-none disabled:opacity-50 min-h-[24px] max-h-[140px] overflow-y-auto text-[#1c1917] py-[2px]"
    />
  );
}

interface AgentInputProps {
  isLoading: boolean;
  canSend: boolean;
  onSend: () => void;
  onStop: () => void;
  input: string;
  onInputChange: (v: string) => void;
  pendingFiles: PendingFile[];
  onFilesAdd: (files: FileList | null) => void;
  onFileRemove: (idx: number) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  maxLength?: number;
  compact?: boolean;
}

export function AgentInput({
  isLoading,
  canSend,
  onSend,
  onStop,
  input,
  onInputChange,
  pendingFiles,
  onFilesAdd,
  onFileRemove,
  onKeyDown,
  maxLength = 4000,
  compact,
}: AgentInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = input.length;
  const showCounter = charCount > maxLength * 0.8;

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      imageFiles.forEach((f) => dt.items.add(f));
      onFilesAdd(dt.files);
    }
  }, [onFilesAdd]);

  return (
    <div className={`shrink-0 border-t border-[#1c1917]/[0.06] bg-white ${compact ? "px-3 pb-2 pt-2" : "px-4 pb-3 pt-2"}`}>
      {/* File chips */}
      {pendingFiles.length > 0 && (
        <div className="mb-2">
          <div className="flex flex-wrap gap-1.5">
            {pendingFiles.map((f, i) => (
              <FileChip key={`${f.name}-${i}`} file={f} onRemove={() => onFileRemove(i)} />
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="relative flex items-end gap-1 rounded-2xl border border-[#1c1917]/[0.08] bg-[#f4f3f0] focus-within:bg-white focus-within:border-[#1c1917]/[0.12] focus-within:ring-1 focus-within:ring-[#1c1917]/[0.05] transition-all duration-200">
        {/* Attach */}
        <div className="flex items-center pl-2 pb-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => { onFilesAdd(e.target.files); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[#1c1917]/25 hover:text-[#1c1917]/50 hover:bg-[#1c1917]/[0.04] transition-colors"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </div>

        {/* Textarea */}
        <div className="flex-1 py-2.5 min-w-0">
          <AutoTextarea
            value={input}
            onChange={onInputChange}
            placeholder="Envoyer un message..."
            disabled={isLoading}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
            maxLength={maxLength}
          />
        </div>

        {/* Send / Stop + counter */}
        <div className="flex items-center gap-1.5 pr-2 pb-2">
          {showCounter && (
            <span className={`text-[10px] font-mono ${charCount >= maxLength ? "text-red-400" : "text-[#1c1917]/20"}`}>
              {charCount}
            </span>
          )}
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="h-8 w-8 rounded-full bg-[#1c1917]/10 hover:bg-[#1c1917]/15 flex items-center justify-center text-[#1c1917]/50 transition-colors"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className="h-8 w-8 rounded-full bg-[#1c1917] hover:bg-[#1c1917]/80 flex items-center justify-center text-white disabled:opacity-20 disabled:bg-[#1c1917]/20 transition-all duration-200"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Hint */}
      <div className="flex items-center justify-center px-1 mt-1.5">
        <p className="text-[10px] text-[#1c1917]/20 select-none">
          <kbd className="px-1 py-0.5 rounded bg-[#1c1917]/[0.04] text-[#1c1917]/25 font-mono text-[9px]">Entrée</kbd>
          {" "}pour envoyer ·{" "}
          <kbd className="px-1 py-0.5 rounded bg-[#1c1917]/[0.04] text-[#1c1917]/25 font-mono text-[9px]">Shift+Entrée</kbd>
          {" "}saut de ligne
        </p>
      </div>
    </div>
  );
}

export function useFileUpload() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: PendingFile[] = [];
    let loaded = 0;
    let totalBase64 = 0;
    const total = fileList.length;
    const checkDone = () => {
      loaded++;
      if (loaded === total) setPendingFiles((prev) => [...prev, ...newFiles]);
    };
    Array.from(fileList).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) { checkDone(); return; }
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();
      reader.onload = () => {
        const raw = (reader.result as string).split(",")[1] ?? "";
        if (!raw) { checkDone(); return; }
        if (isImage && raw.length > MAX_TOTAL_BASE64) {
          // Compress large images via canvas
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDim = 1200;
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const compressed = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
              if (compressed) {
                totalBase64 += compressed.length;
                newFiles.push({ name: cleanFileName(file.name), type: "image/jpeg", size: compressed.length * 0.75, base64: compressed });
              }
            }
            checkDone();
          };
          img.onerror = () => { checkDone(); };
          img.src = reader.result as string;
        } else {
          totalBase64 += raw.length;
          newFiles.push({ name: cleanFileName(file.name), type: file.type, size: file.size, base64: raw });
          checkDone();
        }
      };
      reader.onerror = () => { checkDone(); };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = useCallback((idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const clearFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);

  return { pendingFiles, handleFiles, removeFile, clearFiles };
}
