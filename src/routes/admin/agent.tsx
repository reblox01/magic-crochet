import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { agentChat } from "@/routes/api/-agent";
import { Button } from "@/components/ui/button";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus, Bot, User, Sparkles, Loader2, Search, Database, Zap, Trash2,
  Clock, PanelLeftClose, PanelLeft, Send, FileText, Image, FileSpreadsheet, X, Eye,
  Pencil, RotateCw, Check, Copy,
} from "lucide-react";
import { AgentInput, useFileUpload, type PendingFile, getFileIcon } from "@/components/AgentInput";

export const Route = createFileRoute("/admin/agent")({
  component: AdminAgentPage,
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  files?: PendingFile[];
  toolCalls?: { name: string; args: Record<string, unknown>; result: string }[];
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

const STATUS_PHASES = [
  { delay: 0, text: "Envoi...", icon: Send },
  { delay: 800, text: "Réflexion...", icon: Loader2 },
  { delay: 2500, text: "Recherche en base...", icon: Database },
  { delay: 4000, text: "Exécution...", icon: Zap },
  { delay: 6000, text: "Analyse des résultats...", icon: Search },
  { delay: 8000, text: "Presque prêt...", icon: Sparkles },
] as const;

function formatDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return "a l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  if (diffH < 24) return `il y a ${diffH}h`;
  if (diffD < 7) return `il y a ${diffD}j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

function StatusIndicator({ status, icon: Icon }: { status: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F506EA]/[0.06] border border-[#F506EA]/10 w-fit">
      <Icon className="h-3 w-3 text-[#F506EA] animate-pulse" />
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

function ThoughtBlock({ text }: { text: string }) {
  // ponytail: collapsed by default — thinking only on demand (user request)
  return (
    <details className="my-2 group">
      <summary className="flex items-center gap-1.5 text-[11px] text-[#F506EA]/60 cursor-pointer select-none hover:text-[#F506EA]/80 transition-colors">
        <svg className="h-3 w-3 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        <Sparkles className="h-3 w-3" />
        Reflexion...
      </summary>
      <div className="mt-1.5 pl-4 border-l-2 border-[#F506EA]/20 text-[12px] leading-relaxed text-[#1c1917]/40 italic whitespace-pre-wrap">
        {text}
      </div>
    </details>
  );
}

// ponytail: Claude-style collapsible tool call display
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

function ToolCallSummary({ name, args }: { name: string; args: Record<string, unknown> }) {
  const label = TOOL_LABELS[name] ?? name;
  if (name === "query_data") return <>{label} — {String(args.table ?? "")}{args.filters ? ` (filtres)` : ""}</>;
  if (name === "mutate_data") return <>{label} — {String(args.table ?? "")} ({String(args.action ?? "")})</>;
  if (name === "upload_product_image") return <>{label} — {String(args.file_name ?? "")}</>;
  if (name === "get_stats") return <>{label}{args.period && args.period !== "all" ? ` (${args.period})` : ""}</>;
  if (name === "import_data") return <>{label} — {String(args.table ?? "")}</>;
  return <>{label}</>;
}

function ToolCallList({ toolCalls }: { toolCalls: { name: string; args: Record<string, unknown>; result: string }[] }) {
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

function MarkdownContent({ content }: { content: string }) {
  const parts = content.split(/(<thought>[\s\S]*?<\/thought>)/g);

  return (
    <>
      {parts.map((part, i) => {
        const thoughtMatch = part.match(/^<thought>([\s\S]*?)<\/thought>$/);
        if (thoughtMatch) {
          return <ThoughtBlock key={i} text={thoughtMatch[1].trim()} />;
        }
        // Handle incomplete thought block (still streaming)
        const incompleteMatch = part.match(/^<thought>([\s\S]*)$/);
        if (incompleteMatch && !part.includes("</thought>")) {
          return (
            <div key={i} className="my-2 flex items-center gap-2 text-[11px] text-[#F506EA]/60">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span className="italic">Reflexion en cours...</span>
            </div>
          );
        }
        // ponytail: drop stray thought tags the model sometimes leaves behind
        const text = part.replace(/<\/?thought>/g, "");
        if (!text.trim()) return null;
        return (
          <Markdown key={i} remarkPlugins={[remarkGfm]} components={{
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
          }}>
            {text}
          </Markdown>
        );
      })}
    </>
  );
}

function FileChipInline({ file, onClick }: { file: PendingFile; onClick?: () => void }) {
  const Icon = getFileIcon(file.type);
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/15 text-[10px] hover:bg-white/25 transition-colors cursor-pointer"
    >
      <Icon className="h-2.5 w-2.5" /> {file.name}
      <Eye className="h-2.5 w-2.5 opacity-50" />
    </button>
  );
}

function AdminAgentPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { pendingFiles, handleFiles, removeFile, clearFiles } = useFileUpload();
  const [status, setStatus] = useState<{ text: string; icon: React.ComponentType<{ className?: string }> } | null>(null);
  const [displayedContent, setDisplayedContent] = useState<Record<string, string>>({});
  const [isAnimating, setIsAnimating] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewFile, setPreviewFile] = useState<PendingFile | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgContent, setEditingMsgContent] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const typewriterTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const localFilesMapRef = useRef<Map<string, PendingFile[]>>(new Map());
  const skipDbSyncRef = useRef(false);

  const { data: profile } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("admin_users").select("role").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: convos } = useQuery({
    queryKey: ["agent-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_conversations").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
    staleTime: 5000,
  });

  useEffect(() => { if (convos) setConversations(convos); }, [convos]);

  // Sync conversation ID with URL search params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlConvoId = params.get("c");
    if (urlConvoId && urlConvoId !== activeConversationId) {
      setActiveConversationId(urlConvoId);
    } else if (!urlConvoId && activeConversationId) {
      navigate({ search: { c: activeConversationId }, replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeConversationId) {
      navigate({ search: { c: activeConversationId }, replace: true });
    } else {
      navigate({ search: {}, replace: true });
    }
  }, [activeConversationId, navigate]);

  const { data: dbMessages } = useQuery({
    queryKey: ["agent-messages", activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const { data, error } = await supabase
        .from("agent_messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!activeConversationId,
  });

  useEffect(() => {
    if (dbMessages && !skipDbSyncRef.current) {
      setMessages((prev) => {
        // Build a map of content -> files from existing local messages
        const localFilesByContent = new Map<string, PendingFile[]>();
        for (const m of prev) {
          if (m.files && m.files.length > 0) {
            localFilesByContent.set(m.content, m.files);
          }
        }
        return dbMessages.map((m: { id: string; role: string; content: string; created_at: string; metadata?: { files?: PendingFile[] } }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.created_at),
          files: m.metadata?.files ?? localFilesByContent.get(m.content),
        }));
      });
    }
  }, [dbMessages]);

  useEffect(() => {
    return () => {
      statusTimerRef.current.forEach(clearTimeout);
      typewriterTimerRef.current.forEach(clearTimeout);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom, pendingFiles]);

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
    statusTimerRef.current.forEach(clearTimeout);
    statusTimerRef.current = [];
    setStatus(null);
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

  const fullContentRef = useRef<Record<string, string>>({});

  const startTypewriter = useCallback((msgId: string, fullContent: string) => {
    setStatus(null);
    statusTimerRef.current.forEach(clearTimeout);
    statusTimerRef.current = [];
    fullContentRef.current[msgId] = fullContent;
    let idx = 0;
    setIsAnimating((prev) => ({ ...prev, [msgId]: true }));
    const tick = () => {
      idx = Math.min(idx + 3, fullContent.length);
      setDisplayedContent((prev) => ({ ...prev, [msgId]: fullContent.slice(0, idx) }));
      scrollToBottom();
      if (idx < fullContent.length) {
        typewriterTimerRef.current.push(setTimeout(tick, 16));
      } else {
        setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m)));
        setDisplayedContent((prev) => { const n = { ...prev }; delete n[msgId]; return n; });
        delete fullContentRef.current[msgId];
        setIsAnimating((prev) => ({ ...prev, [msgId]: false }));
        skipDbSyncRef.current = false;
      }
    };
    tick();
  }, [scrollToBottom]);

  const skipAnimation = useCallback((msgId: string) => {
    typewriterTimerRef.current.forEach(clearTimeout);
    typewriterTimerRef.current = [];
    const full = fullContentRef.current[msgId];
    if (full) {
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: full } : m)));
      delete fullContentRef.current[msgId];
    }
    setDisplayedContent((prev) => { const n = { ...prev }; delete n[msgId]; return n; });
    setIsAnimating((prev) => ({ ...prev, [msgId]: false }));
    skipDbSyncRef.current = false;
  }, []);

  const newConversation = useCallback(() => {
    setActiveConversationId(undefined);
    setMessages([]);
    setInput("");
    clearFiles();
    localFilesMapRef.current.clear();
    skipDbSyncRef.current = false;
  }, [clearFiles]);

  const deleteConversation = useCallback(async (id: string) => {
    await supabase.from("agent_messages").delete().eq("conversation_id", id);
    await supabase.from("agent_conversations").delete().eq("id", id);
    if (activeConversationId === id) newConversation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, [activeConversationId, newConversation]);

  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    await supabase.from("agent_conversations").update({ title }).eq("id", id);
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, title } : c));
  }, []);

  const editMessage = useCallback((msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || msg.role !== "user") return;
    setEditingMsgId(msgId);
    setEditingMsgContent(msg.content);
  }, [messages]);

  const confirmEditMessage = useCallback(() => {
    if (!editingMsgId) return;
    const idx = messages.findIndex((m) => m.id === editingMsgId);
    if (idx === -1) return;
    const kept = messages.slice(0, idx);
    setMessages(kept);
    setEditingMsgId(null);
    setEditingMsgContent("");
    setInput(editingMsgContent);
    setIsAnimating({});
    setDisplayedContent({});
    fullContentRef.current = {};
    typewriterTimerRef.current.forEach(clearTimeout);
    typewriterTimerRef.current = [];
    skipDbSyncRef.current = true;
    setTimeout(() => sendMessageRef.current?.(), 0);
  }, [editingMsgId, editingMsgContent, messages]);

  const cancelEditMessage = useCallback(() => {
    setEditingMsgId(null);
    setEditingMsgContent("");
  }, []);

  const retryMessage = useCallback(() => {
    if (isLoading) return;
    const lastAssistantIdx = messages.findLastIndex((m) => m.role === "assistant");
    const lastUserIdx = messages.findLastIndex((m) => m.role === "user");
    if (lastAssistantIdx === -1 || lastUserIdx === -1) return;
    const lastUser = messages[lastUserIdx];
    // Remove both the last assistant AND last user message
    const kept = messages.slice(0, Math.min(lastUserIdx, lastAssistantIdx));
    setMessages(kept);
    setIsAnimating({});
    setDisplayedContent({});
    fullContentRef.current = {};
    skipDbSyncRef.current = true;
    // Re-send directly
    setInput(lastUser.content);
    if (lastUser.files) {
      localFilesMapRef.current.set("retry-files", lastUser.files);
      setPendingFiles(lastUser.files);
    }
    setTimeout(() => sendMessageRef.current?.(), 0);
  }, [messages, isLoading]);

  const sendMessageRef = useRef<() => Promise<void>>(undefined!);
  sendMessageRef.current = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || isLoading || !user || !profile) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim() || (pendingFiles.length > 0 ? `Fichiers joints: ${pendingFiles.map((f) => f.name).join(", ")}` : ""),
      timestamp: new Date(),
      files: pendingFiles.length > 0 ? [...pendingFiles] : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (pendingFiles.length > 0) localFilesMapRef.current.set(userMsg.id, [...pendingFiles]);
    setInput("");
    clearFiles();
    setIsLoading(true);
    skipDbSyncRef.current = true;

    const assistantMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "", timestamp: new Date() }]);
    setTimeout(scrollToBottom, 50);

    abortRef.current = false;
    startStatus();

    try {
      const result = await agentChat({
        data: {
          message: userMsg.content,
          conversationId: activeConversationId,
          title: !activeConversationId ? userMsg.content.slice(0, 80) : undefined,
          callerEmail: user.email ?? "",
          callerId: user.id,
          userRole: profile.role,
          files: userMsg.files,
        },
      });

      if (abortRef.current) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
      } else {
        // Store toolCalls on the assistant message
        if (result.toolCalls && result.toolCalls.length > 0) {
          setMessages((prev) => prev.map((m) => m.id === assistantMsgId ? { ...m, toolCalls: result.toolCalls } : m));
        }
        startTypewriter(assistantMsgId, result.content);
        setActiveConversationId(result.conversationId);
        queryClient.invalidateQueries({ queryKey: ["agent-conversations"] });
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
  };

  const sendMessage = useCallback(() => { sendMessageRef.current?.(); }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar — fixed */}
      <div className={`${sidebarOpen ? "w-[260px] min-w-[260px]" : "w-0 min-w-0"} transition-all duration-200 border-r border-[#1c1917]/5 bg-white flex flex-col overflow-hidden shrink-0`}>
        <div className="px-3 pt-3 pb-2 border-b border-[#1c1917]/5 shrink-0">
          <Button
            onClick={newConversation}
            className="w-full justify-start gap-2 bg-[#F506EA] hover:bg-[#d405c9] text-white text-[13px] rounded-xl h-9"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5" data-lenis-prevent onWheel={(e) => e.stopPropagation()}>
          {conversations.map((convo) => (
            <div
              key={convo.id}
              className={`group flex items-center gap-2 mx-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                activeConversationId === convo.id
                  ? "bg-[#F506EA]/[0.06] border border-[#F506EA]/10"
                  : "hover:bg-[#1c1917]/[0.03] border border-transparent"
              }`}
              onClick={() => { if (editingTitleId !== convo.id) { setActiveConversationId(convo.id); clearFiles(); localFilesMapRef.current.clear(); } }}
            >
              <Bot className="h-3.5 w-3.5 text-[#1c1917]/25 shrink-0" />
              <div className="flex-1 min-w-0">
                {editingTitleId === convo.id ? (
                  <input
                    autoFocus
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onBlur={() => { if (editingTitleValue.trim()) updateConversationTitle(convo.id, editingTitleValue.trim()); setEditingTitleId(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } if (e.key === "Escape") setEditingTitleId(null); }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[12px] font-medium text-[#1c1917]/80 bg-white border border-[#F506EA]/30 rounded px-1.5 py-0.5 w-full outline-none"
                  />
                ) : (
                  <p
                    className="text-[12px] font-medium text-[#1c1917]/80 truncate hover:text-[#1c1917]/90"
                    onDoubleClick={(e) => { e.stopPropagation(); setEditingTitleId(convo.id); setEditingTitleValue(convo.title); }}
                  >
                    {convo.title}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-[#1c1917]/25" />
                  <span className="text-[10px] text-[#1c1917]/30">{formatDate(convo.updated_at)}</span>
                  <span className="text-[10px] text-[#1c1917]/20">{convo.message_count} msg</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id); }}
                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-[#1c1917]/20 transition-all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Bot className="h-8 w-8 text-[#1c1917]/10 mx-auto mb-2" />
              <p className="text-[11px] text-[#1c1917]/30">Aucune conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Main — flex column, fixed header + input, scrollable messages */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header — fixed */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1c1917]/5 bg-white shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-8 w-8 text-[#1c1917]/40 hover:text-[#1c1917]/60">
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#F506EA]/10 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-[#F506EA]" />
            </div>
            <span className="text-sm font-medium text-[#1c1917]">Assistant</span>
            <span className="text-[10px] text-[#1c1917]/30 bg-[#1c1917]/[0.04] px-2 py-0.5 rounded-full">Magic Crochet AI</span>
          </div>
        </div>

        {/* Messages — scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-lenis-prevent onWheel={(e) => e.stopPropagation()}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="h-14 w-14 rounded-2xl bg-[#F506EA]/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-[#F506EA]" />
              </div>
              <p className="text-base font-medium text-[#1c1917]/60 mb-1">Assistant Magic Crochet</p>
              <p className="text-sm text-[#1c1917]/35 leading-relaxed max-w-md">
                Posez une question, importez un fichier CSV/MD/image, ou demandez des statistiques sur votre boutique.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const animating = isAnimating[msg.id];
            const shown = displayedContent[msg.id] ?? msg.content;
            const isLastAssistant = msg.role === "assistant" && idx === messages.findLastIndex((m) => m.role === "assistant");
            const isLastUser = msg.role === "user" && idx === messages.findLastIndex((m) => m.role === "user");

            return (
              <div
                key={msg.id}
                className={`group/msg flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-agent-in`}
              >
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-xl bg-[#F506EA]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-[#F506EA]" />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === "user" ? "space-y-1" : ""}`}>
                  {msg.role === "user" && msg.files && msg.files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {msg.files.filter((f) => f.type.startsWith("image/")).map((f, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPreviewFile(f)}
                          className="w-16 h-16 rounded-xl overflow-hidden border border-white/20 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                        >
                          <img
                            src={`data:${f.type};base64,${f.base64}`}
                            alt={f.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                      {msg.files.filter((f) => !f.type.startsWith("image/")).map((f, i) => (
                        <FileChipInline key={i} file={f} onClick={() => setPreviewFile(f)} />
                      ))}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#F506EA] text-white rounded-br-md"
                        : "bg-[#1c1917]/[0.04] text-[#1c1917]/80 rounded-bl-md"
                    } ${animating ? "cursor-pointer" : ""}`}
                    onClick={animating ? () => skipAnimation(msg.id) : undefined}
                  >
                    {msg.role === "user" ? (
                      editingMsgId === msg.id ? (
                        <div className="flex flex-col gap-1.5">
                          <textarea
                            autoFocus
                            value={editingMsgContent}
                            onChange={(e) => setEditingMsgContent(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmEditMessage(); } if (e.key === "Escape") cancelEditMessage(); }}
                            className="bg-white/20 rounded-lg px-2 py-1.5 text-[13px] text-white resize-none outline-none border border-white/30 min-h-[60px]"
                            rows={3}
                          />
                          <div className="flex gap-1 justify-end">
                            <button onClick={cancelEditMessage} className="px-2 py-0.5 rounded-md text-[10px] text-white/60 hover:text-white/80 hover:bg-white/10 transition-colors">
                              Annuler
                            </button>
                            <button onClick={confirmEditMessage} className="px-2 py-0.5 rounded-md text-[10px] bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center gap-1">
                              <Check className="h-2.5 w-2.5" /> Envoyer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )
                    ) : shown ? (
                      <>
                        {msg.toolCalls && msg.toolCalls.length > 0 && <ToolCallList toolCalls={msg.toolCalls} />}
                        <MarkdownContent content={shown} />
                        {animating && (
                          <span className="inline-block w-0.5 h-3.5 bg-[#F506EA]/60 ml-0.5 animate-pulse align-text-bottom" />
                        )}
                      </>
                    ) : isLoading ? (
                      // Claude-style: shimmering skeleton + live phase while the agent thinks
                      <div className="min-w-[180px]">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-3 w-3 text-[#F506EA] animate-pulse" />
                          <span className="text-[11px] text-[#F506EA]/70 font-medium">
                            {status?.text ?? "Reflexion..."}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#1c1917]/[0.06] via-[#1c1917]/[0.12] to-[#1c1917]/[0.06] animate-agent-shimmer" />
                          <div
                            className="h-2 w-3/4 rounded-full bg-gradient-to-r from-[#1c1917]/[0.06] via-[#1c1917]/[0.12] to-[#1c1917]/[0.06] animate-agent-shimmer"
                            style={{ animationDelay: "200ms" }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {animating && (
                    <span className="text-[9px] text-[#1c1917]/25 ml-1">cliquez pour passer</span>
                  )}
                  {/* Action buttons — visible on hover */}
                  {!isLoading && !animating && (
                    <div className={`flex gap-1 mt-1 ${msg.role === "user" ? "justify-end" : "justify-start"} opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
                      {msg.role === "user" && isLastUser && editingMsgId !== msg.id && (
                        <button
                          onClick={() => editMessage(msg.id)}
                          className="p-1 rounded-md hover:bg-[#1c1917]/5 text-[#1c1917]/25 hover:text-[#1c1917]/50 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {msg.role === "assistant" && isLastAssistant && !isLastUser && (
                        <button
                          onClick={retryMessage}
                          className="p-1 rounded-md hover:bg-[#1c1917]/5 text-[#1c1917]/25 hover:text-[#1c1917]/50 transition-colors"
                          title="Ressayer"
                        >
                          <RotateCw className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-xl bg-[#1c1917]/5 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-[#1c1917]/30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Input — fixed */}
        <AgentInput
          isLoading={isLoading}
          canSend={input.trim().length > 0 || pendingFiles.length > 0}
          onSend={sendMessage}
          onStop={stopGeneration}
          input={input}
          onInputChange={setInput}
          pendingFiles={pendingFiles}
          onFilesAdd={handleFiles}
          onFileRemove={removeFile}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* File preview overlay */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewFile(null)}>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c1917]/10">
              <div className="flex items-center gap-2">
                {(() => { const I = getFileIcon(previewFile.type); return <I className="h-4 w-4 text-[#F506EA]" />; })()}
                <span className="text-sm font-medium text-[#1c1917]">{previewFile.name}</span>
                <span className="text-[11px] text-[#1c1917]/40">{formatSize(previewFile.size)}</span>
              </div>
              <button onClick={() => setPreviewFile(null)} className="p-1.5 rounded-lg hover:bg-[#1c1917]/5 text-[#1c1917]/40 hover:text-[#1c1917]/70 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewFile.type.startsWith("image/") ? (
                <img
                  src={`data:${previewFile.type};base64,${previewFile.base64}`}
                  alt={previewFile.name}
                  className="max-w-full max-h-[60vh] rounded-lg object-contain mx-auto"
                />
              ) : (
                <pre className="text-[12px] text-[#1c1917]/70 bg-[#1c1917]/[0.03] rounded-lg p-4 overflow-auto whitespace-pre-wrap break-words max-h-[60vh]">
                  {(() => { try { return atob(previewFile.base64); } catch { return "Aperçu non disponible"; } })()}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
