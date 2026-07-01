import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { agentChat } from "@/routes/api/-agent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, X, Loader2, Bot, User, Sparkles } from "lucide-react";

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

  const { data: profile } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("admin_users")
        .select("role")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const canUseAgent = profile?.role === "owner" || profile?.role === "admin";

  // Click-outside-to-close
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !user || !profile) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantMsgId = crypto.randomUUID();

    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "", timestamp: new Date() }]);

    // Scroll immediately after adding messages
    setTimeout(scrollToBottom, 50);

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

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, content: result.content } : m,
        ),
      );
      setConversationId(result.conversationId);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Erreur inconnue";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, content: `Erreur: ${errMsg}` } : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, user, profile, conversationId, scrollToBottom]);

  if (!canUseAgent) return null;

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg text-white transition-all duration-300 ${
          isOpen
            ? "bg-[#1c1917] hover:bg-[#1c1917]/80 rotate-0"
            : "bg-[#F506EA] hover:bg-[#d405c9] hover:shadow-[0_0_24px_rgba(245,6,234,0.4)]"
        } active:scale-95`}
        size="icon"
      >
        {isOpen ? (
          <X className="h-5 w-5 transition-transform duration-200" />
        ) : (
          <MessageSquare className="h-5 w-5" />
        )}
      </Button>

      {/* Chat panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-white rounded-2xl border border-[#1c1917]/8 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden animate-agent-in"
          style={{ animationDuration: "280ms" }}
        >
          {/* Header */}
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
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[#1c1917]/5 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#1c1917]/40" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            data-lenis-prevent
            onWheel={(e) => e.stopPropagation()}
          >
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
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#F506EA] text-white rounded-br-md"
                      : "bg-[#1c1917]/[0.04] text-[#1c1917]/80 rounded-bl-md"
                  }`}
                >
                  {msg.content ? (
                    msg.content
                  ) : isLoading && msg.role === "assistant" ? (
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

          {/* Input */}
          <div className="border-t border-[#1c1917]/5 p-3 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tapez votre message..."
                disabled={isLoading}
                className="flex-1 h-10 rounded-xl border-[#1c1917]/10 text-[13px] focus-visible:ring-[#F506EA]/30 focus-visible:border-[#F506EA]/40"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-10 w-10 rounded-xl bg-[#F506EA] hover:bg-[#d405c9] text-white disabled:opacity-30 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
