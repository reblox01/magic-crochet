import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { agentChat } from "@/routes/api/-agent";
import { Button } from "@/components/ui/button";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageSquare, Send, X, Bot, User, Sparkles, Loader2, Search, Database, Zap, Pencil, RefreshCw, Undo2, Check, ChevronDown, ChevronRight } from "lucide-react";
import { AgentInput, useFileUpload, type PendingFile, getFileIcon } from "@/components/AgentInput";

// ponytail: duplicated from agent.tsx — if more shared components appear, extract to agent-shared.tsx
const TOOL_LABELS: Record<string, string> = {
  query_data: "Recherche en base",
  get_stats: "Statistiques",
  calculate_atelier: "Calcul atelier",
  mutate_data: "Modification de donnees",
  import_data: "Import de donnees",
  upload_product_image: "Upload d'image",
  batch_delete: "Preparation suppression",
  confirm_batch_delete: "Confirmation suppression",
};

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  files?: PendingFile[];
  toolCalls?: { name: string; args: Record<string, unknown>; result: string }[];
}

function ThoughtBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="my-2 rounded-lg overflow-hidden border border-[#F506EA]/10 bg-[#F506EA]/[0.03]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F506EA]/[0.06] transition-colors"
      >
        <Sparkles className="h-3 w-3 text-[#F506EA] shrink-0" />
        <span className="text-[11px] font-medium text-[#F506EA]/70 flex-1">Reflexion</span>
        {isOpen ? <ChevronDown className="h-3 w-3 text-[#F506EA]/40" /> : <ChevronRight className="h-3 w-3 text-[#F506EA]/40" />}
      </button>
      {isOpen && (
        <div className="px-3 pb-2 text-[12px] leading-relaxed text-[#1c1917]/50 border-t border-[#F506EA]/5 pt-2">
          {content.trim()}
        </div>
      )}
    </div>
  );
}

function ToolCallSummary({ name, args }: { name: string; args: Record<string, unknown> }) {
  const label = TOOL_LABELS[name] ?? name;
  if (name === "query_data") return <>{label} — {String(args.table ?? "")}{args.filters ? ` (filtres)` : ""}</>;
  if (name === "mutate_data") return <>{label} — {String(args.table ?? "")} ({String(args.action ?? "")})</>;
  if (name === "upload_product_image") return <>{label} — {String(args.file_name ?? "")}</>;
  if (name === "get_stats") return <>{label}{args.period && args.period !== "all" ? ` (${args.period})` : ""}</>;
  if (name === "import_data") return <>{label} — {String(args.table ?? "")}</>;
  return <>{label}</>;
}

function ToolCallList({ toolCalls }: { toolCalls: ToolCall[] }) {
  return (
    <details className="mb-2 group/tc">
      <summary className="flex items-center gap-1.5 text-[11px] text-[#1c1917]/40 cursor-pointer select-none hover:text-[#1c1917]/60 transition-colors">
        <svg className="h-2.5 w-2.5 transition-transform group-open/tc:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        <Database className="h-2.5 w-2.5" />
        <span>{toolCalls.length} {toolCalls.length === 1 ? "outil utilise" : "outils utilises"}</span>
      </summary>
      <div className="mt-1.5 pl-3 space-y-1">
        {toolCalls.map((tc, i) => (
          <details key={i} className="group/tcitem">
            <summary className="flex items-center gap-1.5 text-[11px] text-[#1c1917]/50 cursor-pointer select-none hover:text-[#1c1917]/70 transition-colors">
              <svg className="h-2 w-2 transition-transform group-open/tcitem:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              <Zap className="h-2.5 w-2.5 text-[#F506EA]/50" />
              <ToolCallSummary name={tc.name} args={tc.args} />
            </summary>
            <div className="mt-1 ml-4 pl-3 border-l border-[#1c1917]/[0.06] text-[10px] text-[#1c1917]/35 whitespace-pre-wrap max-h-24 overflow-y-auto">
              {tc.result.replace(/\{.*\}/s, (m) => { try { const o = JSON.parse(m); return o.error ?? JSON.stringify(o, null, 2); } catch { return m; } }).slice(0, 300)}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}

const STATUS_PHASES = [
  { delay: 0, text: "Envoi...", icon: Send },
  { delay: 800, text: "Reflexion...", icon: Loader2 },
  { delay: 2500, text: "Recherche en base...", icon: Database },
  { delay: 4000, text: "Execution...", icon: Zap },
  { delay: 6000, text: "Analyse des resultats...", icon: Search },
  { delay: 8000, text: "Pret...", icon: Sparkles },
] as const;

function StatusIndicator({ status, icon: Icon }: { status: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F506EA]/[0.06] border border-[#F506EA]/10 w-fit">
      <Icon className="h-3 w-3 text-[#F506EA]" />
      <span className="text-[11px] text-[#F506EA]/70 font-medium">{status}</span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 px-1 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#F506EA]/40 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#F506EA]/40 animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[#F506EA]/40 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const parts = content.split(/(<thought>[\s\S]*?<\/thought>)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("<thought>")) {
          const thoughtContent = part.replace(/<\/?thought>/g, "");
          return <ThoughtBlock key={i} content={thoughtContent} />;
        }
        return (
          <Markdown
            key={i}
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto rounded-lg border border-[#1c1917]/10">
                  <table className="w-full text-[12px] border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-[#1c1917]/[0.04] border-b border-[#1c1917]/10">{children}</thead>
              ),
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => (
                <tr className="border-b border-[#1c1917]/5 last:border-0 hover:bg-[#F506EA]/[0.02] transition-colors">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 text-left font-semibold text-[#1c1917]/70 whitespace-nowrap">{children}</th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-[#1c1917]/60 whitespace-nowrap">{children}</td>
              ),
              p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-[#1c1917]/90">{children}</strong>,
              em: ({ children }) => <em className="italic text-[#1c1917]/60">{children}</em>,
              ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="text-[13px]">{children}</li>,
              code: ({ className, children }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <pre className="my-2 p-3 rounded-lg bg-[#1c1917]/[0.06] overflow-x-auto text-[12px] leading-relaxed">
                      <code className="text-[#1c1917]/70">{children}</code>
                    </pre>
                  );
                }
                return (
                  <code className="px-1.5 py-0.5 rounded bg-[#F506EA]/[0.08] text-[#F506EA] text-[12px] font-mono">{children}</code>
                );
              },
              hr: () => <hr className="my-3 border-[#1c1917]/10" />,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#F506EA] underline underline-offset-2 hover:text-[#d405c9] transition-colors">{children}</a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-2 pl-3 border-l-3 border-[#F506EA]/30 text-[#1c1917]/50 italic">{children}</blockquote>
              ),
            }}
          >
            {part}
          </Markdown>
        );
      })}
    </>
  );
}

function FileChipInline({ file }: { file: PendingFile }) {
  const Icon = getFileIcon(file.type);
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/15 text-[10px]">
      <Icon className="h-2.5 w-2.5" /> {file.name}
    </span>
  );
}

interface AgentChatProps {
  embedded?: boolean;
}

export function AgentChat({ embedded }: AgentChatProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const { pendingFiles, handleFiles, removeFile, clearFiles } = useFileUpload();
  const [status, setStatus] = useState<{ text: string; icon: React.ComponentType<{ className?: string }> } | null>(null);
  const [displayedContent, setDisplayedContent] = useState<Record<string, string>>({});
  const [isAnimating, setIsAnimating] = useState<Record<string, boolean>>({});
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const typewriterTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const sendMessageRef = useRef<() => void>(() => {});

  const { data: profile } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("admin_users").select("role").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const canUseAgent = profile?.role === "owner" || profile?.role === "admin";

  useEffect(() => {
    if (!isOpen || embedded) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, embedded]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom, pendingFiles]);

  useEffect(() => {
    return () => {
      statusTimerRef.current.forEach(clearTimeout);
      typewriterTimerRef.current.forEach(clearTimeout);
    };
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
    statusTimerRef.current.forEach(clearTimeout);
    statusTimerRef.current = [];
    setStatus(null);
  }, []);

  const skipAnimation = useCallback((msgId: string) => {
    typewriterTimerRef.current.forEach(clearTimeout);
    typewriterTimerRef.current = [];
    setIsAnimating((prev) => ({ ...prev, [msgId]: false }));
  }, []);

  const startStatus = useCallback(() => {
    setStatus({ text: STATUS_PHASES[0].text, icon: STATUS_PHASES[0].icon });
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < STATUS_PHASES.length; i++) {
      const phase = STATUS_PHASES[i];
      timers.push(setTimeout(() => {
        if (!abortRef.current) setStatus({ text: phase.text, icon: phase.icon });
      }, phase.delay));
    }
    statusTimerRef.current = timers;
  }, []);

  const startTypewriter = useCallback((msgId: string, fullContent: string) => {
    setStatus(null);
    statusTimerRef.current.forEach(clearTimeout);
    statusTimerRef.current = [];
    let idx = 0;
    setIsAnimating((prev) => ({ ...prev, [msgId]: true }));
    const tick = () => {
      idx = Math.min(idx + 3, fullContent.length);
      setDisplayedContent((prev) => ({ ...prev, [msgId]: fullContent.slice(0, idx) }));
      scrollToBottom();
      if (idx < fullContent.length) {
        typewriterTimerRef.current.push(setTimeout(tick, 16));
      } else {
        setIsAnimating((prev) => ({ ...prev, [msgId]: false }));
      }
    };
    tick();
  }, [scrollToBottom]);

  const sendMessage = useCallback(async (retryMsg?: ChatMessage) => {
    if (!user || !profile) return;

    let userMsg: ChatMessage;
    let assistantMsgId: string;

    if (retryMsg) {
      userMsg = retryMsg;
      assistantMsgId = crypto.randomUUID();
      setMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id && m.id !== prev[prev.length - 1].id), userMsg, { id: assistantMsgId, role: "assistant", content: "", timestamp: new Date() }]);
    } else {
      if (!input.trim() && pendingFiles.length === 0) return;
      userMsg = {
        id: crypto.randomUUID(),
        role: "user",
        content: input.trim() || (pendingFiles.length > 0 ? `Fichiers joints: ${pendingFiles.map((f) => f.name).join(", ")}` : ""),
        timestamp: new Date(),
        files: pendingFiles.length > 0 ? [...pendingFiles] : undefined,
      };
      assistantMsgId = crypto.randomUUID();
      setMessages((prev) => [...prev, userMsg, { id: assistantMsgId, role: "assistant", content: "", timestamp: new Date() }]);
      setInput("");
      clearFiles();
    }

    setIsLoading(true);
    abortRef.current = false;
    startStatus();
    setTimeout(scrollToBottom, 50);

    const isFirstUserMessage = !messages.some((m) => m.role === "user");

    try {
      const result = await agentChat({
        data: {
          message: userMsg.content,
          conversationId,
          callerEmail: user.email ?? "",
          callerId: user.id,
          userRole: profile.role,
          files: userMsg.files,
          title: isFirstUserMessage ? userMsg.content.slice(0, 80) : undefined,
        },
      });

      if (abortRef.current) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
      } else {
        startTypewriter(assistantMsgId, result.content);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: result.content, toolCalls: result.toolCalls } : m)),
        );
        setConversationId(result.conversationId);
      }
    } catch (error) {
      if (!abortRef.current) {
        setStatus(null);
        statusTimerRef.current.forEach(clearTimeout);
        const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: `Erreur: ${errMsg}` } : m)),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, user, profile, conversationId, scrollToBottom, pendingFiles, clearFiles, startStatus, startTypewriter, messages]);

  sendMessageRef.current = () => sendMessage();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessageRef.current();
    }
  }, []);

  const handleRetry = useCallback((msg: ChatMessage) => {
    const idx = messages.findIndex((m) => m.id === msg.id);
    if (idx <= 0) return;
    const userMsg = messages[idx - 1];
    if (userMsg.role !== "user") return;
    setMessages(messages.slice(0, idx - 1));
    setTimeout(() => sendMessage(userMsg), 50);
  }, [messages, sendMessage]);

  const handleEditStart = useCallback((msg: ChatMessage) => {
    setEditingMsgId(msg.id);
    setEditingContent(msg.content);
  }, []);

  const handleEditConfirm = useCallback(() => {
    if (!editingMsgId || !editingContent.trim()) return;
    const editedIdx = messages.findIndex((m) => m.id === editingMsgId);
    if (editedIdx === -1) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: editingContent.trim(), timestamp: new Date() };
    setMessages([...messages.slice(0, editedIdx), userMsg]);
    setEditingMsgId(null);
    setEditingContent("");
    setTimeout(() => sendMessage(userMsg), 50);
  }, [editingMsgId, editingContent, messages, sendMessage]);

  const handleEditCancel = useCallback(() => {
    setEditingMsgId(null);
    setEditingContent("");
  }, []);

  if (!canUseAgent) return null;

  const chatContent = (
    <>
      {!embedded && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1c1917]/5 bg-gradient-to-r from-[#faf9f7] to-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#F506EA]/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-[#F506EA]" />
            </div>
            <div>
              <span className="text-sm font-semibold text-[#1c1917] block leading-tight">Assistant</span>
              <span className="text-[10px] text-[#1c1917]/40">Magic Crochet AI</span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-[#1c1917]/5 transition-colors">
            <X className="w-3.5 h-3.5 text-[#1c1917]/40" />
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-lenis-prevent onWheel={(e) => e.stopPropagation()}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="h-12 w-12 rounded-2xl bg-[#F506EA]/10 flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5 text-[#F506EA]" />
            </div>
            <p className="text-sm font-medium text-[#1c1917]/60 mb-1">Assistant Magic Crochet</p>
            <p className="text-xs text-[#1c1917]/35 leading-relaxed">
              Posez une question ou importez un fichier CSV/MD/image.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const animating = isAnimating[msg.id];
          const shown = displayedContent[msg.id] ?? msg.content;
          const isEditing = editingMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`group flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-1`}
              style={{ animationDuration: "200ms" }}
            >
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-xl bg-[#F506EA]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-[#F506EA]" />
                </div>
              )}
              <div className={`max-w-[82%] ${msg.role === "user" ? "space-y-1" : ""}`}>
                {msg.role === "user" && msg.files && msg.files.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {msg.files.map((f, i) => (
                      <FileChipInline key={i} file={f} />
                    ))}
                  </div>
                )}
                {isEditing ? (
                  <div className={`rounded-2xl overflow-hidden shadow-lg ${msg.role === "user" ? "bg-[#F506EA] border-2 border-white/30" : "bg-white border-2 border-[#F506EA]/30"}`}>
                    <textarea
                      ref={editInputRef}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditConfirm(); }
                        if (e.key === "Escape") handleEditCancel();
                      }}
                      className={`w-full px-3.5 py-2.5 text-[13px] leading-relaxed resize-none focus:outline-none min-h-[60px] bg-transparent ${msg.role === "user" ? "text-white placeholder-white/60" : "text-[#1c1917]/80"}`}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end px-3 pb-2">
                      <button onClick={handleEditCancel} className={`text-[11px] px-2 py-1 rounded transition-colors ${msg.role === "user" ? "text-white/60 hover:text-white hover:bg-white/10" : "text-[#1c1917]/40 hover:text-[#1c1917]/70 hover:bg-[#1c1917]/5"}`}>
                        Annuler
                      </button>
                      <button onClick={handleEditConfirm} className="text-[11px] text-white bg-[#d405c9] px-3 py-1 rounded-lg transition-colors hover:bg-[#b804af]">
                        Envoyer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#F506EA] text-white rounded-br-md"
                        : "bg-[#1c1917]/[0.04] text-[#1c1917]/80 rounded-bl-md"
                    } ${animating ? "cursor-pointer" : ""}`}
                    onClick={animating ? () => skipAnimation(msg.id) : undefined}
                  >
                    {msg.role === "user" ? (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    ) : shown ? (
                      <>
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <ToolCallList toolCalls={msg.toolCalls} />
                        )}
                        <MarkdownContent content={shown} />
                        {animating && (
                          <span className="inline-block w-0.5 h-3.5 bg-[#F506EA]/60 ml-0.5 animate-pulse align-text-bottom" />
                        )}
                      </>
                    ) : isLoading && status ? (
                      <StatusIndicator status={status.text} icon={status.icon} />
                    ) : null}
                  </div>
                )}
                {animating && !isEditing && (
                  <span className="text-[9px] text-[#1c1917]/25 ml-1">cliquez pour passer</span>
                )}
                {!isEditing && msg.role === "assistant" && !animating && !isLoading && msg.content && (
                  <div className="flex items-center gap-1 ml-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleRetry(msg)} className="p-1 rounded hover:bg-[#1c1917]/5 transition-colors" title="Re-envoyer">
                      <RefreshCw className="h-3 w-3 text-[#1c1917]/30 hover:text-[#F506EA]" />
                    </button>
                  </div>
                )}
                {!isEditing && msg.role === "user" && !isLoading && msg.id === messages.filter((m) => m.role === "user").pop()?.id && (
                  <div className="flex items-center gap-1 ml-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditStart(msg)} className="p-1 rounded hover:bg-[#1c1917]/5 transition-colors" title="Modifier">
                      <Pencil className="h-3 w-3 text-[#1c1917]/30 hover:text-[#F506EA]" />
                    </button>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-xl bg-[#1c1917]/5 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-[#1c1917]/30" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AgentInput
        compact
        isLoading={isLoading}
        canSend={input.trim().length > 0 || pendingFiles.length > 0}
        onSend={() => sendMessageRef.current()}
        onStop={stopGeneration}
        input={input}
        onInputChange={setInput}
        pendingFiles={pendingFiles}
        onFilesAdd={handleFiles}
        onFileRemove={removeFile}
        onKeyDown={handleKeyDown}
      />
    </>
  );

  if (embedded) {
    return <div className="flex flex-col h-full bg-white">{chatContent}</div>;
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg text-white transition-all duration-300 ${
          isOpen
            ? "bg-[#1c1917] hover:bg-[#1c1917]/80 rotate-0"
            : "bg-[#F506EA] hover:bg-[#d405c9] hover:shadow-[0_0_24px_rgba(245,6,234,0.4)]"
        } active:scale-95`}
        size="icon"
      >
        {isOpen ? <X className="h-5 w-5 transition-transform duration-200" /> : <MessageSquare className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 w-[400px] h-[560px] bg-white rounded-2xl border border-[#1c1917]/8 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden animate-agent-in"
          style={{ animationDuration: "280ms" }}
        >
          {chatContent}
        </div>
      )}
    </>
  );
}