import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { reviewMutation } from "@/routes/api/-reviews";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
});

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  is_visible: boolean;
  created_at: string;
};

async function fetchReviews(): Promise<Review[]> {
  const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function AdminReviews() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Review | null>(null);
  const [showForm, setShowForm] = useState(false);
  const confirm = useConfirm();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: fetchReviews,
  });

  const toggleVisible = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      await reviewMutation({ data: { action: "update", id, data: { is_visible } } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await reviewMutation({ data: { action: "delete", id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Avis supprimé.");
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#1c1917]">Avis clients</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">{reviews?.length ?? 0} avis, {reviews?.filter((r) => r.is_visible).length ?? 0} visibles.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-full bg-[#F506EA] text-white text-sm font-semibold hover:bg-[#d405c0] transition-colors active:scale-95"
        >
          + Nouvel avis
        </button>
      </div>

      {showForm && (
        <ReviewForm
          review={editing}
          onDone={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : reviews?.length === 0 ? (
        <div className="text-center py-16 text-[#1c1917]/30">
          <p className="font-serif text-xl italic">Aucun avis.</p>
          <p className="text-sm mt-2">Ajoutez des avis clients pour les afficher sur le site.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews?.map((r) => (
            <div key={r.id} className={`p-5 rounded-2xl bg-white border transition-colors ${r.is_visible ? "border-[#1c1917]/5" : "border-[#1c1917]/10 opacity-60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-[#1c1917]">{r.customer_name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={i < r.rating ? "#F506EA" : "none"}
                          stroke={i < r.rating ? "#F506EA" : "#d6d3d1"}
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-[#1c1917]/30">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-[#1c1917]/70">{r.comment}</p>}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleVisible.mutate({ id: r.id, is_visible: !r.is_visible })}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      r.is_visible ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {r.is_visible ? "Visible" : "Masqué"}
                  </button>
                  <button
                    onClick={() => { setEditing(r); setShowForm(true); }}
                    className="size-9 rounded-lg grid place-items-center text-[#1c1917]/40 hover:text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Supprimer l'avis",
                        message: `Supprimer l'avis de ${r.customer_name} ? Cette action est irréversible.`,
                        confirmLabel: "Supprimer",
                        danger: true,
                      });
                      if (ok) deleteMutation.mutate(r.id);
                    }}
                    className="size-9 rounded-lg grid place-items-center text-[#1c1917]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({
  review,
  onDone,
  onCancel,
}: {
  review: Review | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(review?.customer_name ?? "");
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nom requis."); return; }
    if (!comment.trim()) { toast.error("Commentaire requis."); return; }

    setSaving(true);
    try {
      const payload = {
        customer_name: name.trim(),
        rating,
        comment: comment.trim(),
      };

      if (review) {
        await reviewMutation({ data: { action: "update", id: review.id, data: payload } });
        toast.success("Avis mis à jour !");
      } else {
        await reviewMutation({ data: { action: "insert", data: { ...payload, is_visible: true } } });
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
      <h2 className="font-serif text-lg text-[#1c1917] mb-4">{review ? "Modifier l'avis" : "Nouvel avis client"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Nom du client *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="Prénom"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Note *</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill={s <= rating ? "#F506EA" : "none"}
                    stroke={s <= rating ? "#F506EA" : "#d6d3d1"}
                    strokeWidth="2"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Commentaire *</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors resize-none"
            placeholder="Le commentaire du client..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-95 disabled:opacity-50">
            {saving ? "Sauvegarde…" : review ? "Mettre à jour" : "Créer"}
          </button>
          <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-full border border-[#1c1917]/10 text-sm text-[#1c1917]/60 hover:border-[#1c1917]/30 transition-colors">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
