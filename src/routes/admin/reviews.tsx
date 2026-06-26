import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
  const confirm = useConfirm();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: fetchReviews,
  });

  const toggleVisible = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_visible }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#1c1917]">Avis</h1>
        <p className="text-sm text-[#1c1917]/50 mt-1">{reviews?.length ?? 0} avis au total.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : reviews?.length === 0 ? (
        <div className="text-center py-16 text-[#1c1917]/30">
          <p className="font-serif text-xl italic">Aucun avis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews?.map((r) => (
            <div key={r.id} className={`p-5 rounded-2xl bg-white border transition-colors ${r.is_visible ? "border-[#1c1917]/5" : "border-[#1c1917]/10 opacity-60"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-[#1c1917]">{r.customer_name}</p>
                    {/* Stars */}
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
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Supprimer l'avis",
                        message: "Supprimer cet avis ? Cette action est irréversible.",
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
