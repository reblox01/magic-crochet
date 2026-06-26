import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/reservations")({
  component: AdminReservations,
});

type Reservation = {
  id: string;
  name: string;
  email: string;
  phone: string;
  seats: number;
  format: string;
  date: string;
  time: string;
  notes: string | null;
  status: string;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "En attente", color: "bg-amber-50 text-amber-700" },
  { value: "confirmed", label: "Confirmée", color: "bg-green-50 text-green-700" },
  { value: "cancelled", label: "Annulée", color: "bg-red-50 text-red-600" },
] as const;

async function fetchReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase.from("reservations").select("*").order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function AdminReservations() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("upcoming");

  const { data: reservations, isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: fetchReservations,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reservations"] }),
  });

  const today = new Date().toISOString().split("T")[0];

  const filtered = reservations?.filter((r) => {
    if (filter === "all") return true;
    if (filter === "upcoming") return r.date >= today && r.status !== "cancelled";
    if (filter === "past") return r.date < today;
    return r.status === filter;
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#1c1917]">Réservations</h1>
        <p className="text-sm text-[#1c1917]/50 mt-1">{reservations?.length ?? 0} réservation(s) au total.</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterBtn active={filter === "upcoming"} onClick={() => setFilter("upcoming")} label="À venir" />
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")} label="Toutes" count={reservations?.length} />
        <FilterBtn active={filter === "past"} onClick={() => setFilter("past")} label="Passées" />
        <FilterBtn active={filter === "pending"} onClick={() => setFilter("pending")} label="En attente" />
        <FilterBtn active={filter === "confirmed"} onClick={() => setFilter("confirmed")} label="Confirmées" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 text-[#1c1917]/30">
          <p className="font-serif text-xl italic">Aucune réservation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered?.map((r) => (
            <div key={r.id} className="p-5 rounded-2xl bg-white border border-[#1c1917]/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-[#1c1917]">{r.name}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_OPTIONS.find((s) => s.value === r.status)?.color ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_OPTIONS.find((s) => s.value === r.status)?.label ?? r.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#1c1917]/40">
                    {r.email} · {r.phone}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#1c1917]/60">
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                      {new Date(r.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                      {r.time}
                    </span>
                    <span>{r.seats} place{r.seats > 1 ? "s" : ""}</span>
                    <span className="px-2 py-0.5 rounded bg-[#1c1917]/5 text-[10px] font-medium uppercase">{r.format}</span>
                  </div>
                  {r.notes && (
                    <p className="text-xs text-[#1c1917]/50 mt-2 line-clamp-2">{r.notes}</p>
                  )}
                </div>

                <div className="shrink-0">
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus.mutate({ id: r.id, status: e.target.value })}
                    className="text-xs border border-[#1c1917]/10 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-[#F506EA]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
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
