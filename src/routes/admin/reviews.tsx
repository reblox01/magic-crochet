"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { reviewMutation, reviewImageUpload } from "@/routes/api/-reviews";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { Upload, X, Check, Image, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
});

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  is_visible: boolean;
  image_url: string | null;
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
  const [showImport, setShowImport] = useState(false);
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#1c1917]">Avis clients</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">{reviews?.length ?? 0} avis, {reviews?.filter((r) => r.is_visible).length ?? 0} visibles.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-5 py-2.5 rounded-full bg-[#F506EA] text-white text-sm font-semibold hover:bg-[#d405c0] transition-colors active:scale-95"
          >
            + Nouvel avis
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-5 py-2.5 rounded-full border border-[#1c1917]/10 text-sm font-semibold text-[#1c1917] hover:bg-[#1c1917]/5 transition-colors active:scale-95 flex items-center gap-2"
          >
            <Image className="h-4 w-4" />
            Importer capture
          </button>
        </div>
      </div>

      {showForm && (
        <ReviewForm
          review={editing}
          onDone={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {showImport && (
        <ImportReviewModal
          onDone={() => { setShowImport(false); queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }); }}
          onCancel={() => setShowImport(false)}
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
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                    {r.image_url && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#F506EA]/10 text-[#F506EA] font-medium">
                        <Image className="h-3 w-3" />
                        Capture
                      </span>
                    )}
                    <span className="text-xs text-[#1c1917]/30">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-[#1c1917]/70">{r.comment}</p>}
                  {r.image_url && (
                    <div className="mt-2">
                      <img
                        src={r.image_url}
                        alt={`Capture avec ${r.customer_name}`}
                        className="max-h-32 rounded-xl border border-[#1c1917]/10 cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </div>
                  )}
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
                    aria-label="Modifier"
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
                    aria-label="Supprimer"
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
    <div className="mb-6 p-6 rounded-2xl bg-white border border-[#F506EA]/20">
      <h2 className="font-serif text-lg text-[#1c1917] mb-4">{review ? "Modifier l'avis" : "Nouvel avis client"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
<div>
                <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Nom du client</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
                  placeholder="Prénom (optionnel)"
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

function ImportReviewModal({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"upload" | "details">("upload");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragActive = useRef(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      dragActive.current = true;
    } else if (e.type === "dragleave") {
      dragActive.current = false;
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragActive.current = false;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  }, []);

  const processFile = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error("Format non supporté. Utilisez JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 MB).");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const uploadImage = async () => {
    if (!imageBase64 || !imageFile) return;
    setUploading(true);
    try {
      const result = await reviewImageUpload({ data: { base64: imageBase64.split(",")[1], fileName: imageFile.name } });
      setUploadedUrl(result.url);
      setStep("details");
      toast.success("Image uploadée !");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur d'upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!uploadedUrl) { toast.error("Aucune image."); return; }

    setSaving(true);
    try {
      await reviewMutation({
        data: {
          action: "insert",
          data: {
            customer_name: name.trim() || "Client",
            rating,
            comment: comment.trim(),
            image_url: uploadedUrl,
            is_visible: true,
          },
        },
      });
      toast.success("Capture importée !");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 animate-in zoom-in-95 duration-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 size-8 rounded-full grid place-items-center text-[#1c1917]/40 hover:text-[#1c1917] hover:bg-[#1c1917]/5 transition-colors"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </button>

        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1c1917]/5 text-[#1c1917] text-sm font-medium mb-4">
              <span className={step === "upload" ? "font-bold" : ""}>1. Image</span>
              <span className="text-[#1c1917]/30">/</span>
              <span className={step === "details" ? "font-bold" : ""}>2. Détails</span>
            </div>
            <h2 className="font-serif text-2xl text-[#1c1917]">{step === "upload" ? "Importer une capture" : "Finaliser l'avis"}</h2>
            <p className="text-sm text-[#1c1917]/50 mt-1">
              {step === "upload"
                ? "Glissez-déposez une capture d'écran de conversation Instagram/WhatsApp"
                : "Ajoutez un nom/note si vous voulez (optionnel — la capture parle d'elle-même)"}
            </p>
          </div>

          {step === "upload" ? (
            <div className="space-y-4">
              <div
                className={`relative border-2 rounded-2xl p-8 text-center transition-colors ${
                  dragActive.current
                    ? "border-[#F506EA] bg-[#F506EA]/5"
                    : "border-[#1c1917]/10 hover:border-[#F506EA]/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                {imageBase64 ? (
                  <div className="relative max-w-md mx-auto">
                    <div className="rounded-xl overflow-hidden border border-[#1c1917]/10 shadow-lg">
                      <img src={imageBase64} alt="Aperçu" className="w-full max-h-64 object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setImageBase64(null); setImageFile(null); fileRef.current && (fileRef.current.value = ""); }}
                      className="absolute -top-2 -right-2 size-8 rounded-full bg-red-500 text-white grid place-items-center hover:bg-red-600 transition-colors"
                      aria-label="Supprimer l'image"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="size-12 rounded-full bg-[#1c1917]/10 grid place-items-center mx-auto mb-4">
                      <Upload className="size-6 text-[#1c1917]/50" />
                    </div>
                    <p className="text-[#1c1917]/60">Glissez une capture ici ou cliquez pour choisir</p>
                    <p className="text-xs text-[#1c1917]/30 mt-1">JPG, PNG, WebP · Max 5 MB</p>
                  </>
                )}
                {!imageBase64 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-4 px-6 py-2.5 rounded-full bg-[#1c1917] text-white text-sm font-medium hover:bg-[#F506EA] transition-colors active:scale-95"
                  >
                    Choisir un fichier
                  </button>
                )}
              </div>

              {imageBase64 && (
                <button
                  type="button"
                  onClick={uploadImage}
                  disabled={uploading}
                  className="w-full px-6 py-3 rounded-xl bg-[#F506EA] text-white text-sm font-semibold hover:bg-[#d405c0] transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      Continuer vers les détails
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 border-t border-[#1c1917]/10 pt-6">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep("upload"); setUploadedUrl(null); }}
                  className="text-sm text-[#1c1917]/50 hover:text-[#F506EA] flex items-center gap-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Changer l'image
                </button>
                {uploadedUrl && (
                  <div className="relative size-20 rounded-xl overflow-hidden border border-[#1c1917]/10 shadow-md flex-shrink-0">
                    <img src={uploadedUrl} alt="Uploadée" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

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
                <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Commentaire</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors resize-none"
                  placeholder="Commentaire (optionnel)"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancel} className="flex-1 px-6 py-2.5 rounded-full border border-[#1c1917]/10 text-sm text-[#1c1917]/60 hover:border-[#1c1917]/30 transition-colors">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-2.5 rounded-full bg-[#F506EA] text-white text-sm font-semibold hover:bg-[#d405c0] transition-colors active:scale-95 disabled:opacity-50"
                >
                  {saving ? "Sauvegarde…" : "Publier l'avis"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}