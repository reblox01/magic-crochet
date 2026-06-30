import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, X, Loader2, Bot, User } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AgentChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming || !user || !profile) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            message: userMsg.content,
            conversationId,
            callerEmail: user.email ?? "",
            callerId: user.id,
            userRole: profile.role,
          },
        }),
      });

      if (!response.ok) throw new Error("Erreur serveur");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Pas de stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "token") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: m.content + event.content } : m,
                  ),
                );
              } else if (event.type === "done") {
                setConversationId(event.conversationId);
              } else if (event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: `Erreur: ${event.error}` } : m,
                  ),
                );
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: "Erreur de connexion. Réessayez." } : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, user, profile, conversationId]);

  if (!canUseAgent) return null;

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-[#F506EA] hover:bg-[#d405c9] text-white"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[500px] bg-white rounded-xl shadow-2xl border border-[#1c1917]/10 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1c1917]/5 bg-[#faf9f7]">
            <Bot className="h-5 w-5 text-[#F506EA]" />
            <span className="font-medium text-sm">Assistant Magic Crochet</span>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" data-lenis-prevent>
            <div ref={scrollRef} className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-sm text-[#1c1917]/40 py-8">
                  Posez une question sur vos données...
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-[#F506EA]/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-[#F506EA]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#F506EA] text-white"
                        : "bg-[#1c1917]/5 text-[#1c1917]"
                    }`}
                  >
                    {msg.content || (isStreaming && msg.role === "assistant" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null)}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-7 w-7 rounded-full bg-[#1c1917]/5 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-[#1c1917]/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-[#1c1917]/5 p-3">
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
                disabled={isStreaming}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="bg-[#F506EA] hover:bg-[#d405c9] text-white"
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
