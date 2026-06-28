import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { avisMutation } from "@/routes/api/-avis";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/avis")({
  component: AdminAvis,
});

type Avis = {
  id: string;
  name: string;
  role: string;
  quote: string;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
};

async function fetchAvis(): Promise<Avis[]> {
  const { data, error } = await supabase.from("avis").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function AdminAvis() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Avis | null>(null);
  const [showForm, setShowForm] = useState(false);
  const confirm = useConfirm();

  const { data: avisList, isLoading } = useQuery({
    queryKey: ["admin-avis"],
    queryFn: fetchAvis,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await avisMutation({ data: { action: "delete", id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-avis"] });
      toast.success("Avis supprimé.");
    },
  });

  const toggleVisible = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      await avisMutation({ data: { action: "update", id, data: { is_visible } } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-avis"] }),
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      await avisMutation({ data: { action: "update", id, data: { sort_order: newOrder } } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-avis"] }),
  });

  function handleMove(id: string, currentOrder: number, direction: "up" | "down") {
    if (!avisList) return;
    const idx = avisList.findIndex((a) => a.id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === avisList.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const currentId = avisList[idx].id;
    const swapId = avisList[swapIdx].id;
    moveMutation.mutate({ id: currentId, newOrder: avisList[swapIdx].sort_order });
    moveMutation.mutate({ id: swapId, newOrder: avisList[idx].sort_order });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#1c1917]">Témoignages</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">{avisList?.length ?? 0} avis, {avisList?.filter((a) => a.is_visible).length ?? 0} visibles sur la homepage.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-full bg-[#F506EA] text-white text-sm font-semibold hover:bg-[#d405c0] transition-colors active:scale-95"
        >
          + Nouvel avis
        </button>
      </div>

      {showForm && (
        <AvisForm
          avis={editing}
          onDone={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["admin-avis"] }); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {avisList?.map((a, idx) => (
            <div key={a.id} className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 hover:border-[#1c1917]/10 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => handleMove(a.id, a.sort_order, "up")}
                    disabled={idx === 0}
                    className="size-7 rounded-md grid place-items-center text-[#1c1917]/30 hover:text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors disabled:opacity-20"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                  </button>
                  <button
                    onClick={() => handleMove(a.id, a.sort_order, "down")}
                    disabled={idx === (avisList?.length ?? 0) - 1}
                    className="size-7 rounded-md grid place-items-center text-[#1c1917]/30 hover:text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors disabled:opacity-20"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>

                <div className="size-12 rounded-full bg-gradient-to-br from-[#F506EA]/10 to-[#F506EA]/5 border border-[#F506EA]/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[#F506EA]">{a.name.charAt(0)}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#1c1917]">{a.name}</p>
                    <span className="text-xs text-[#1c1917]/40 bg-[#1c1917]/5 px-2 py-0.5 rounded-full">{a.role}</span>
                  </div>
                  <p className="text-sm text-[#1c1917]/60 mt-1.5 italic leading-relaxed line-clamp-2">"{a.quote}"</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleVisible.mutate({ id: a.id, is_visible: !a.is_visible })}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      a.is_visible ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {a.is_visible ? "Visible" : "Masqué"}
                  </button>
                  <button
                    onClick={() => { setEditing(a); setShowForm(true); }}
                    className="size-9 rounded-lg grid place-items-center text-[#1c1917]/40 hover:text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Supprimer l'avis",
                        message: `Supprimer l'avis de ${a.name} ? Cette action est irréversible.`,
                        confirmLabel: "Supprimer",
                        danger: true,
                      });
                      if (ok.ok) deleteMutation.mutate(a.id);
                    }}
                    className="size-9 rounded-lg grid place-items-center text-[#1c1917]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {avisList?.length === 0 && (
            <div className="text-center py-16 text-[#1c1917]/30">
              <p className="font-serif text-xl italic">Aucun avis.</p>
              <p className="text-sm mt-2">Ajoutez des avis de bénéficiaires pour les afficher sur la homepage.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AvisForm({
  avis,
  onDone,
  onCancel,
}: {
  avis: Avis | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(avis?.name ?? "");
  const [role, setRole] = useState(avis?.role ?? "Beneficiaire");
  const [quote, setQuote] = useState(avis?.quote ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nom requis."); return; }
    if (!quote.trim()) { toast.error("Témoignage requis."); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        role: role.trim() || "Beneficiaire",
        quote: quote.trim(),
      };

      if (avis) {
        await avisMutation({ data: { action: "update", id: avis.id, data: payload } });
        toast.success("Avis mis à jour !");
      } else {
        await avisMutation({ data: { action: "insert", data: { ...payload, is_visible: true, sort_order: 0 } } });
        toast.success("Avis créé !");
      }
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 p-6 rounded-2xl bg-white border border-[#F506EA]/20 shadow-sm">
      <h2 className="font-serif text-lg text-[#1c1917] mb-4">{avis ? "Modifier l'avis" : "Nouvel avis"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="Prénom"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Rôle</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="Bénéficiaire"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Témoignage *</label>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={4}
            className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors resize-none"
            placeholder="Le témoignage de la personne..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-95 disabled:opacity-50">
            {saving ? "Sauvegarde…" : avis ? "Mettre à jour" : "Créer"}
          </button>
          <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-full border border-[#1c1917]/10 text-sm text-[#1c1917]/60 hover:border-[#1c1917]/30 transition-colors">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
