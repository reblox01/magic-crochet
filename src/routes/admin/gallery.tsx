import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { galleryMutation, galleryImageUpload } from "@/routes/api/-gallery";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/gallery")({
  component: AdminGallery,
});

type GalleryImage = {
  id: string;
  title: string | null;
  image_url: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

const CATEGORIES = ["general", "atelier", "products", "events", "team"];

async function fetchImages(): Promise<GalleryImage[]> {
  const { data, error } = await supabase.from("gallery_images").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function AdminGallery() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const confirm = useConfirm();

  const { data: images, isLoading } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: fetchImages,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await galleryMutation({ data: { action: "delete", id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
      toast.success("Image supprimée.");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await galleryMutation({ data: { action: "update", id, data: { is_active } } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-gallery"] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#1c1917]">Galerie</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">{images?.length ?? 0} image(s), {images?.filter((i) => i.is_active).length ?? 0} actives.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-full bg-[#F506EA] text-white text-sm font-semibold hover:bg-[#d405c0] transition-colors active:scale-95"
        >
          + Nouvelle image
        </button>
      </div>

      {showForm && (
        <GalleryForm
          image={editing}
          onDone={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["admin-gallery"] }); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : images?.length === 0 ? (
        <div className="text-center py-16 text-[#1c1917]/30">
          <p className="font-serif text-xl italic">Aucune image.</p>
          <p className="text-sm mt-2">Ajoutez des images de l'atelier pour les afficher sur le site.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images?.map((img) => (
            <div key={img.id} className={`group relative aspect-square rounded-2xl overflow-hidden border transition-colors ${img.is_active ? "border-[#1c1917]/5" : "border-[#1c1917]/10 opacity-60"}`}>
              <img src={img.image_url} alt={img.title ?? ""} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center p-3 opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive.mutate({ id: img.id, is_active: !img.is_active })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${img.is_active ? "bg-green-500 text-white" : "bg-white/80 text-gray-700"}`}
                  >
                    {img.is_active ? "Visible" : "Masqué"}
                  </button>
                  <button
                    onClick={() => { setEditing(img); setShowForm(true); }}
                    className="size-8 rounded-lg bg-white/80 grid place-items-center text-gray-700 hover:text-[#F506EA] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({ title: "Supprimer l'image", message: "Supprimer cette image ?", confirmLabel: "Supprimer", danger: true });
                      if (ok) deleteMutation.mutate(img.id);
                    }}
                    className="size-8 rounded-lg bg-white/80 grid place-items-center text-gray-700 hover:text-red-500 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>
              {img.title && (
                <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-white/80 text-[10px] font-medium text-gray-700 truncate max-w-[70%]">
                  {img.title}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryForm({
  image,
  onDone,
  onCancel,
}: {
  image: GalleryImage | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(image?.title ?? "");
  const [category, setCategory] = useState(image?.category ?? "general");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(image?.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile && !image?.image_url) { toast.error("Image requise."); return; }

    setSaving(true);
    try {
      let imageUrl = image?.image_url ?? null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const buffer = await imageFile.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        const result = await galleryImageUpload({ data: { path, fileBase64: base64, contentType: imageFile.type } });
        imageUrl = result.url;
      }

      const payload = {
        title: title.trim() || null,
        category,
        image_url: imageUrl,
      };

      if (image) {
        await galleryMutation({ data: { action: "update", id: image.id, data: payload } });
        toast.success("Image mise à jour !");
      } else {
        await galleryMutation({ data: { action: "insert", data: { ...payload, is_active: true, sort_order: 0 } } });
        toast.success("Image ajoutée !");
      }
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 p-6 rounded-2xl bg-white border border-[#F506EA]/20 shadow-sm">
      <h2 className="font-serif text-lg text-[#1c1917] mb-4">{image ? "Modifier l'image" : "Nouvelle image"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="Titre (optionnel)"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Catégorie</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${category === c ? "bg-[#1c1917] text-white border-[#1c1917]" : "bg-white text-[#1c1917]/60 border-[#1c1917]/10"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Image *</label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/webp,image/png" onChange={handleImageChange} className="hidden" />
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-xl border border-dashed border-[#1c1917]/20 text-sm text-[#1c1917]/50 hover:border-[#F506EA] hover:text-[#F506EA] transition-colors">
              {imagePreview ? "Changer l'image" : "Choisir une image"}
            </button>
            {imagePreview && (
              <div className="size-14 rounded-xl overflow-hidden border border-[#1c1917]/10">
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-95 disabled:opacity-50">
            {saving ? "Sauvegarde…" : image ? "Mettre à jour" : "Ajouter"}
          </button>
          <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-full border border-[#1c1917]/10 text-sm text-[#1c1917]/60 hover:border-[#1c1917]/30 transition-colors">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
