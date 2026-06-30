import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { sendReply, getContactReplies, deleteContact } from "@/routes/api/-contact";
import { Mail, MailOpen, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCanWrite } from "@/lib/useCanWrite";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/contacts")({
  component: AdminContacts,
});

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "new", label: "Non lu", color: "bg-amber-50 text-amber-700" },
  { value: "read", label: "Lu", color: "bg-blue-50 text-blue-700" },
  { value: "replied", label: "Répondu", color: "bg-green-50 text-green-700" },
] as const;

async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function AdminContacts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = useCanWrite();
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Contact | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: fetchContacts,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ["contact-replies", expanded],
    queryFn: async () => {
      if (!expanded) return [];
      return getContactReplies({ data: { contactId: expanded } });
    },
    enabled: !!expanded,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("contacts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-contacts"] });
      const prev = queryClient.getQueryData<Contact[]>(["admin-contacts"]);
      queryClient.setQueryData<Contact[]>(["admin-contacts"], (old) => old?.map((c) => c.id === id ? { ...c, status } : c));
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(["admin-contacts"], ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-contacts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContact({ data: { id, callerEmail: user?.email, callerId: user?.id } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-contacts"] }),
    onSuccess: () => toast.success("Message supprimé"),
    onError: (e: Error) => toast.error(e.message),
  });

  const confirm = useConfirm();

  async function handleSendReply() {
    if (!replyTo || !replyBody.trim()) return;
    setReplySending(true);
    try {
      await sendReply({
        data: {
          contactId: replyTo.id,
          to: replyTo.email,
          subject: replyTo.subject,
          body: replyBody.trim(),
          callerEmail: user?.email,
          callerId: user?.id,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["admin-contacts"] });
      setReplyTo(null);
      setReplyBody("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setReplySending(false);
    }
  }

  const filtered = filter === "all" ? contacts : contacts?.filter((c) => c.status === filter);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#1c1917]">Messages</h1>
        <p className="text-sm text-[#1c1917]/50 mt-1">
          {contacts?.filter((c) => c.status === "new").length ?? 0} non lu(s) · {contacts?.length ?? 0} au total.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")} label="Tous" count={contacts?.length} />
        <FilterBtn active={filter === "new"} onClick={() => setFilter("new")} label="Non lus" count={contacts?.filter((c) => c.status === "new").length} />
        <FilterBtn active={filter === "read"} onClick={() => setFilter("read")} label="Lus" />
        <FilterBtn active={filter === "replied"} onClick={() => setFilter("replied")} label="Répondus" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 text-[#1c1917]/30">
          <p className="font-serif text-xl italic">Aucun message.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered?.map((c) => {
            const isExpanded = expanded === c.id;
            return (
              <div
                key={c.id}
                className={`rounded-2xl bg-white border transition-colors ${
                  c.status === "new" ? "border-[#F506EA]/30" : "border-[#1c1917]/5"
                }`}
              >
                <button
                  onClick={() => {
                    setExpanded(isExpanded ? null : c.id);
                    if (c.status === "new") updateStatus.mutate({ id: c.id, status: "read" });
                  }}
                  className="w-full p-5 text-left"
                >
                  <div className="flex items-center gap-3 mb-1">
                    {c.status === "new" && <div className="size-2 rounded-full bg-[#F506EA] shrink-0" />}
                    <p className="font-medium text-[#1c1917]">{c.name}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1c1917]/5 text-[#1c1917]/60">
                      {c.subject}
                    </span>
                    <span className="ml-auto text-xs text-[#1c1917]/30">
                      {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-sm text-[#1c1917]/70">{c.message}</p>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-[#1c1917]/5">
                    <div className="pt-4 space-y-3">
                      <p className="text-sm text-[#1c1917]/80 whitespace-pre-wrap">{c.message}</p>
                      <div className="flex items-center gap-4 text-xs text-[#1c1917]/40">
                        <span>{c.email}</span>
                        {c.phone && <span>{c.phone}</span>}
                      </div>

                      {/* Previous replies */}
                      {replies.length > 0 && (
                        <div className="space-y-2 pt-3 border-t border-[#1c1917]/5">
                          <p className="text-xs font-medium text-[#1c1917]/40 uppercase tracking-wider">Réponses précédentes</p>
                          {replies.map((r: { id: string; body: string; sent_by: string; created_at: string }) => (
                            <div key={r.id} className="p-3 rounded-lg bg-[#1c1917]/5 text-sm">
                              <p className="text-[#1c1917]/70 whitespace-pre-wrap">{r.body}</p>
                              <p className="text-[10px] text-[#1c1917]/30 mt-2">
                                {r.sent_by} · {new Date(r.created_at).toLocaleString("fr-FR")}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {canWrite ? (
                          <button
                            onClick={() => {
                              if (c.status !== "replied") updateStatus.mutate({ id: c.id, status: "replied" });
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs border border-[#1c1917]/10 text-[#1c1917]/50 hover:border-[#1c1917]/30 transition-colors"
                          >
                            Marquer répondu
                          </button>
                        ) : (
                          c.status === "replied" && (
                            <span className="px-3 py-1.5 rounded-lg text-xs border border-[#1c1917]/10 text-green-600">
                              Répondu
                            </span>
                          )
                        )}
                        {canWrite && (
                          <button
                            onClick={() => { setReplyTo(c); setReplyBody(""); }}
                            className="px-3 py-1.5 rounded-lg text-xs bg-[#1c1917] text-white hover:bg-[#F506EA] transition-colors"
                          >
                            Répondre
                          </button>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => {
                              confirm({
                                title: "Supprimer le message",
                                description: `Supprimer le message de ${c.name} ? Cette action est irréversible.`,
                                confirmLabel: "Supprimer",
                                danger: true,
                              }).then(({ ok }) => { if (ok) deleteMutation.mutate(c.id); });
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 border border-red-200 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 inline-block mr-1" />
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {replyTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setReplyTo(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-xl text-[#1c1917] mb-1">Répondre</h2>
            <p className="text-xs text-[#1c1917]/40 mb-4">À : {replyTo.email} · Re: {replyTo.subject}</p>
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={6}
              placeholder="Votre réponse..."
              className="w-full border border-[#d4d4d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setReplyTo(null)} className="px-4 py-2 rounded-full text-xs font-medium border border-[#1c1917]/10 hover:bg-[#1c1917]/5 transition-colors">
                Annuler
              </button>
              {canWrite && (
                <button
                  onClick={handleSendReply}
                  disabled={replySending || !replyBody.trim()}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#1c1917] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {replySending ? "Envoi..." : "Envoyer"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-[#1c1917] text-white border-[#1c1917]"
          : "bg-white text-[#1c1917]/60 border-[#1c1917]/10 hover:border-[#F506EA]"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1.5 ${active ? "text-white/70" : "text-[#1c1917]/30"}`}>{count}</span>
      )}
    </button>
  );
}
