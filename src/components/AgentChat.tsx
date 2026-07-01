import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { agentChat } from "@/routes/api/-agent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageSquare, Send, X, Bot, User, Sparkles, Square } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  return (
    <Markdown
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
          <tr className="border-b border-[#1c1917]/5 last:border-0 hover:bg-[#F506EA]/[0.02] transition-colors">
            {children}
          </tr>
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
            <code className="px-1.5 py-0.5 rounded bg-[#F506EA]/[0.08] text-[#F506EA] text-[12px] font-mono">
              {children}
            </code>
          );
        },
        hr: () => <hr className="my-3 border-[#1c1917]/10" />,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#F506EA] underline underline-offset-2 hover:text-[#d405c9] transition-colors">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2 pl-3 border-l-3 border-[#F506EA]/30 text-[#1c1917]/50 italic">{children}</blockquote>
        ),
      }}
    >
      {content}
    </Markdown>
  );
}

export function AgentChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

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
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 150); }, [isOpen]);

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !user || !profile) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "", timestamp: new Date() }]);
    setTimeout(scrollToBottom, 50);

    abortRef.current = false;

    try {
      const result = await agentChat({
        data: {
          message: userMsg.content,
          conversationId,
          callerEmail: user.email ?? "",
          callerId: user.id,
          userRole: profile.role,
        },
      });

      if (abortRef.current) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: result.content } : m)),
        );
        setConversationId(result.conversationId);
      }
    } catch (error) {
      if (!abortRef.current) {
        const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: `Erreur: ${errMsg}` } : m)),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, user, profile, conversationId, scrollToBottom]);

  if (!canUseAgent) return null;

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
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1c1917]/5 bg-gradient-to-r from-[#faf9f7] to-white">
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

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-lenis-prevent onWheel={(e) => e.stopPropagation()}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="h-12 w-12 rounded-2xl bg-[#F506EA]/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-5 w-5 text-[#F506EA]" />
                </div>
                <p className="text-sm font-medium text-[#1c1917]/60 mb-1">Assistant Magic Crochet</p>
                <p className="text-xs text-[#1c1917]/35 leading-relaxed">
                  Posez une question sur vos commandes, produits, réservations ou statistiques.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-msg-in`}
                style={{ animationDuration: "200ms" }}
              >
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-xl bg-[#F506EA]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-[#F506EA]" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#F506EA] text-white rounded-br-md"
                      : "bg-[#1c1917]/[0.04] text-[#1c1917]/80 rounded-bl-md"
                  }`}
                >
                  {msg.role === "user" ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : msg.content ? (
                    <MarkdownContent content={msg.content} />
                  ) : isLoading ? (
                    <TypingIndicator />
                  ) : null}
                </div>
                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-xl bg-[#1c1917]/5 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-[#1c1917]/30" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-[#1c1917]/5 p-3 bg-white">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tapez votre message..."
                disabled={isLoading}
                className="flex-1 h-10 rounded-xl border-[#1c1917]/10 text-[13px] focus-visible:ring-[#F506EA]/30 focus-visible:border-[#F506EA]/40"
              />
              {isLoading ? (
                <Button
                  type="button"
                  onClick={stopGeneration}
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-[#1c1917]/10 hover:bg-[#1c1917]/15 text-[#1c1917]/60 shrink-0 transition-colors"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!input.trim()}
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-[#F506EA] hover:bg-[#d405c9] text-white disabled:opacity-30 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
