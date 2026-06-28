import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { createAdminBooking } from "@/routes/api/-admin-bookings";
import { toast } from "sonner";
import { CalendarDays, List, Plus, Clock, Users, X, ChevronLeft, ChevronRight } from "lucide-react";

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

const TIME_SLOTS = ["10:00", "14:00", "17:00"] as const;

async function fetchReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase.from("reservations").select("*").order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ── Calendar helpers ──────────────────────────────────────────────

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// ── Main component ───────────────────────────────────────────────

function AdminReservations() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("upcoming");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  const [creating, setCreating] = useState(false);

  async function handleCreateBooking(input: { name: string; email: string; phone: string; seats: number; format: "individuel" | "equipe"; date: string; time: "10:00" | "14:00" | "17:00"; notes?: string | undefined; status: "pending" | "confirmed" }) {
    setCreating(true);
    try {
      const res = await createAdminBooking({ data: input });
      if (res?.success === false) {
        toast.error(res.error);
        return;
      }
      toast.success("Réservation créée avec succès !");
      queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
      setShowForm(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  const filtered = reservations?.filter((r) => {
    if (selectedDay) return r.date === selectedDay;
    if (filter === "all") return true;
    if (filter === "upcoming") return r.date >= today && r.status !== "cancelled";
    if (filter === "past") return r.date < today;
    return r.status === filter;
  });

  // Group reservations by date for calendar badges
  const byDate = useMemo(() => {
    if (!reservations) return new Map<string, Reservation[]>();
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const arr = map.get(r.date) ?? [];
      arr.push(r);
      map.set(r.date, arr);
    }
    return map;
  }, [reservations]);

  const calDays = getMonthDays(calYear, calMonth);

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#1c1917]">Réservations</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">
            {selectedDay
              ? `${new Date(selectedDay + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`
              : `${reservations?.length ?? 0} réservation(s) au total.`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="px-3 py-2 rounded-full text-xs font-medium bg-[#1c1917]/5 text-[#1c1917]/60 hover:bg-[#1c1917]/10"
            >
              <CalendarDays className="w-3.5 h-3.5 inline-block mr-1" />
              Retour au calendrier
            </button>
          )}
          <button
            onClick={() => setView(view === "list" ? "calendar" : "list")}
            className="px-4 py-2 rounded-full text-xs font-medium border border-[#1c1917]/10 hover:border-[#F506EA] bg-white text-[#1c1917]/60"
          >
            {view === "list"
              ? <CalendarDays className="w-3.5 h-3.5 inline-block mr-1" />
              : <List className="w-3.5 h-3.5 inline-block mr-1" />
            }
            {view === "list" ? "Calendrier" : "Liste"}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-full text-xs font-medium bg-[#F506EA] text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5 inline-block mr-1" />
            Nouvelle réservation
          </button>
        </div>
      </div>

      {/* Filter bar (list view only) */}
      {view === "list" && !selectedDay && (
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterBtn active={filter === "upcoming"} onClick={() => setFilter("upcoming")} label="À venir" />
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")} label="Toutes" count={reservations?.length} />
          <FilterBtn active={filter === "past"} onClick={() => setFilter("past")} label="Passées" />
          <FilterBtn active={filter === "pending"} onClick={() => setFilter("pending")} label="En attente" />
          <FilterBtn active={filter === "confirmed"} onClick={() => setFilter("confirmed")} label="Confirmées" />
        </div>
      )}

      {/* Calendar view */}
      {view === "calendar" && !selectedDay && (
        <div className="mb-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-[#1c1917]/5 text-[#1c1917]/60">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-serif text-lg text-[#1c1917]">
              {MONTH_NAMES[calMonth]} {calYear}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-[#1c1917]/5 text-[#1c1917]/60">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 border border-[#1c1917]/5 rounded-2xl overflow-hidden bg-white">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#1c1917]/40 border-b border-[#1c1917]/5">
                {d}
              </div>
            ))}
            {calDays.map((day, i) => {
              if (day === null) return <div key={`pad-${i}`} className="bg-[#1c1917]/[0.02] min-h-[72px]" />;
              const key = formatDateKey(calYear, calMonth, day);
              const dayRes = byDate.get(key) ?? [];
              const has = dayRes.length > 0;
              const hasConfirmed = dayRes.some((r) => r.status === "confirmed");
              const hasPending = dayRes.some((r) => r.status === "pending");
              const hasCancelled = dayRes.some((r) => r.status === "cancelled");
              const isToday = key === today;
              const isSelected = key === selectedDay;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className={`relative min-h-[72px] p-2 text-left border-b border-r border-[#1c1917]/5 transition-colors hover:bg-[#F506EA]/[0.04] ${isSelected ? "bg-[#F506EA]/[0.06]" : ""}`}
                >
                  <span className={`text-xs font-medium ${isToday ? "bg-[#F506EA] text-white w-5 h-5 rounded-full flex items-center justify-center" : "text-[#1c1917]/60"}`}>
                    {day}
                  </span>
                  {has && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {hasConfirmed && <span className="inline-block w-2 h-2 rounded-full bg-green-500" />}
                      {hasPending && <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />}
                      {hasCancelled && <span className="inline-block w-2 h-2 rounded-full bg-red-400" />}
                      <span className="text-[9px] text-[#1c1917]/40 ml-0.5">{dayRes.length}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-[#1c1917]/40">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Confirmée</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> En attente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Annulée</span>
          </div>
        </div>
      )}

      {/* Reservation list */}
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
                      <CalendarDays className="w-3 h-3" />
                      {new Date(r.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {r.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {r.seats} place{r.seats > 1 ? "s" : ""}
                    </span>
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

      {/* Admin booking modal */}
      {showForm && <AdminBookingModal defaultDate={selectedDay ?? ""} onClose={() => setShowForm(false)} onSubmit={handleCreateBooking} isPending={creating} />}
    </div>
  );
}

// ── Filter button ────────────────────────────────────────────────

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

// ── Admin booking modal ──────────────────────────────────────────

function AdminBookingModal({
  defaultDate,
  onClose,
  onSubmit,
  isPending,
}: {
  defaultDate?: string;
  onClose: () => void;
  onSubmit: (input: { name: string; email: string; phone: string; seats: number; format: "individuel" | "equipe"; date: string; time: "10:00" | "14:00" | "17:00"; notes?: string | undefined; status: "pending" | "confirmed" }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState(1);
  const [format, setFormat] = useState<"individuel" | "equipe">("individuel");
  const [date, setDate] = useState(defaultDate ?? "");
  const [time, setTime] = useState<"10:00" | "14:00" | "17:00">("10:00");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"pending" | "confirmed">("confirmed");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, email, phone, seats, format, date, time, notes: notes || undefined, status });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl text-[#1c1917]">Nouvelle réservation</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#1c1917]/5 text-[#1c1917]/40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom" required>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border border-[#1c1917]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
            </Field>
            <Field label="Email" required>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-[#1c1917]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Téléphone" required>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full border border-[#1c1917]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
            </Field>
            <Field label="Places" required>
              <input type="number" min={1} max={10} value={seats} onChange={(e) => setSeats(Number(e.target.value))} required className="w-full border border-[#1c1917]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
            </Field>
          </div>

          <Field label="Format" required>
            <div className="flex gap-4 mt-1">
              {(["individuel", "equipe"] as const).map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm text-[#1c1917]/70 cursor-pointer">
                  <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="accent-[#F506EA]" />
                  {f === "individuel" ? "Individuel" : "Équipe"}
                </label>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full border border-[#1c1917]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
            </Field>
            <Field label="Créneau horaire" required>
              <select value={time} onChange={(e) => setTime(e.target.value as "10:00" | "14:00" | "17:00")} className="w-full border border-[#1c1917]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]">
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value as "pending" | "confirmed")} className="w-full border border-[#1c1917]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]">
              <option value="confirmed">Confirmée</option>
              <option value="pending">En attente</option>
            </select>
          </Field>

          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-[#1c1917]/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] resize-none" placeholder="Optionnel..." />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-xs font-medium border border-[#1c1917]/10 text-[#1c1917]/60 hover:bg-[#1c1917]/5">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-full text-xs font-medium bg-[#F506EA] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? "Création..." : "Créer la réservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reusable form field ──────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#1c1917]/60 mb-1">
        {label}
        {required && <span className="text-[#F506EA] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
