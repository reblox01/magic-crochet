import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: fetchContacts,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("contacts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-contacts"] }),
  });

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
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            if (c.status !== "replied") updateStatus.mutate({ id: c.id, status: "replied" });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs border border-[#1c1917]/10 text-[#1c1917]/50 hover:border-[#1c1917]/30 transition-colors"
                        >
                          Marquer répondu
                        </button>
                        <a
                          href={`mailto:${c.email}?subject=Re: ${c.subject}`}
                          className="px-3 py-1.5 rounded-lg text-xs bg-[#1c1917] text-white hover:bg-[#F506EA] transition-colors"
                        >
                          Répondre
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
