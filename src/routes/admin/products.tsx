import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { productMutation, productImageUpload } from "@/routes/api/-products";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  images: string[];
  slug: string | null;
  category: string;
  materials: string | null;
  dimensions: string | null;
  in_stock: boolean;
  is_active: boolean;
  rating: number;
  reviews_count: number;
  created_at: string;
};

const CATEGORIES = ["sac", "chapeau", "panier", "deco", "autre"];

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function AdminProducts() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const confirm = useConfirm();

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: fetchProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await productMutation({ data: { action: "delete", id } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await productMutation({ data: { action: "update", id, data: { is_active } } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const toggleStock = useMutation({
    mutationFn: async ({ id, in_stock }: { id: string; in_stock: boolean }) => {
      await productMutation({ data: { action: "update", id, data: { in_stock } } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#1c1917]">Produits</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">{products?.length ?? 0} produit(s).</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-full bg-[#F506EA] text-white text-sm font-semibold hover:bg-[#d405c0] transition-colors active:scale-95"
        >
          + Nouveau produit
        </button>
      </div>

      {showForm && (
        <ProductForm
          product={editing}
          onDone={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["admin-products"] }); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {products?.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-[#1c1917]/5 hover:border-[#1c1917]/10 transition-colors">
              {/* Image */}
              <div className="size-16 rounded-xl bg-[#1c1917]/5 overflow-hidden shrink-0">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-[#1c1917]/20 text-xs">?</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1c1917] truncate">{p.name}</p>
                <p className="text-xs text-[#1c1917]/40 mt-0.5">
                  {p.category} · {p.price.toLocaleString("fr-FR")} DH
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleStock.mutate({ id: p.id, in_stock: !p.in_stock })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    p.in_stock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                  }`}
                >
                  {p.in_stock ? "En stock" : "Rupture"}
                </button>
                <button
                  onClick={() => toggleActive.mutate({ id: p.id, is_active: !p.is_active })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    p.is_active ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.is_active ? "Actif" : "Inactif"}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditing(p); setShowForm(true); }}
                  className="size-9 rounded-lg grid place-items-center text-[#1c1917]/40 hover:text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Supprimer le produit",
                      message: "Supprimer ce produit ? Cette action est irréversible.",
                      confirmLabel: "Supprimer",
                      danger: true,
                    });
                    if (ok) deleteMutation.mutate(p.id);
                  }}
                  className="size-9 rounded-lg grid place-items-center text-[#1c1917]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {products?.length === 0 && (
            <div className="text-center py-16 text-[#1c1917]/30">
              <p className="font-serif text-xl italic">Aucun produit.</p>
              <p className="text-sm mt-2">Créez votre premier produit.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductForm({
  product,
  onDone,
  onCancel,
}: {
  product: Product | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!product?.slug);
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [category, setCategory] = useState(product?.category ?? "autre");
  const [customCategory, setCustomCategory] = useState(
    product?.category && !CATEGORIES.includes(product.category) ? product.category : ""
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(product?.image ?? "");
  const [extraImages, setExtraImages] = useState<string[]>(product?.images ?? []);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [extraPreviews, setExtraPreviews] = useState<string[]>([]);
  const [materials, setMaterials] = useState(product?.materials ?? "");
  const [dimensions, setDimensions] = useState(product?.dimensions ?? "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleExtraChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setExtraFiles((prev) => [...prev, ...files]);
    setExtraPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    if (extraRef.current) extraRef.current.value = "";
  }

  function removeExtraImage(idx: number) {
    if (idx < extraImages.length) {
      setExtraImages((prev) => prev.filter((_, i) => i !== idx));
    } else {
      const fileIdx = idx - extraImages.length;
      setExtraFiles((prev) => prev.filter((_, i) => i !== fileIdx));
      setExtraPreviews((prev) => prev.filter((_, i) => i !== fileIdx));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) {
      toast.error("Nom et prix requis.");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = product?.image ?? null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const base64 = await fileToBase64(imageFile);
        const result = await productImageUpload({ data: { path, fileBase64: base64, contentType: imageFile.type } });
        imageUrl = result.url;
      }

      const uploadedExtra: string[] = [...extraImages];
      for (const file of extraFiles) {
        const ext = file.name.split(".").pop();
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const base64 = await fileToBase64(file);
        const result = await productImageUpload({ data: { path, fileBase64: base64, contentType: file.type } });
        uploadedExtra.push(result.url);
      }

      const slugValue = slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      const payload = {
        name: name.trim(),
        slug: slugValue || null,
        description: description.trim() || null,
        price: Number(price),
        category: category === "autre" && customCategory.trim() ? customCategory.trim() : category,
        materials: materials.trim() || null,
        dimensions: dimensions.trim() || null,
        image: imageUrl,
        images: uploadedExtra,
      };

      if (product) {
        await productMutation({ data: { action: "update", id: product.id, data: payload } });
        toast.success("Produit mis à jour !");
      } else {
        await productMutation({ data: { action: "insert", data: { ...payload, in_stock: true, is_active: true } } });
        toast.success("Produit créé !");
      }
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  const allExtraPreviews = [...extraImages, ...extraPreviews];

  return (
    <div className="mb-6 p-6 rounded-2xl bg-white border border-[#F506EA]/20 shadow-sm">
      <h2 className="font-serif text-lg text-[#1c1917] mb-4">
        {product ? "Modifier le produit" : "Nouveau produit"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (!slugManual) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
              }}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="Nom du produit"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Prix (DH) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">URL (slug)</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#1c1917]/30 shrink-0">/boutique/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugManual(true); }}
              onBlur={() => { if (!slug.trim() && name.trim()) setSlug(name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }}
              className="flex-1 rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="auto-généré depuis le nom"
            />
          </div>
          <p className="text-[11px] text-[#1c1917]/30 mt-1">
            Laissez vide pour auto-générer depuis le nom. Uniqueness vérifiée à la sauvegarde.
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors resize-none"
            placeholder="Description du produit"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Matériaux</label>
            <input
              type="text"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="Ex: Fil recyclé de t-shirts, coton crème et terracotta"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Dimensions</label>
            <input
              type="text"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="Ex: 35 × 30 cm, anses de 60 cm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Catégorie</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                  category === c
                    ? "bg-[#1c1917] text-white border-[#1c1917]"
                    : "bg-white text-[#1c1917]/60 border-[#1c1917]/10 hover:border-[#F506EA]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {category === "autre" && (
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="mt-2 w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="Nom de la catégorie"
            />
          )}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Image principale</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/webp,image/png,image/avif"
            onChange={handleImageChange}
            className="hidden"
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 rounded-xl border border-dashed border-[#1c1917]/20 text-sm text-[#1c1917]/50 hover:border-[#F506EA] hover:text-[#F506EA] transition-colors"
            >
              {imagePreview ? "Changer l'image" : "Choisir une image"}
            </button>
            {imagePreview && (
              <div className="size-14 rounded-xl overflow-hidden border border-[#1c1917]/10">
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">
            Images supplémentaires
          </label>
          <input
            ref={extraRef}
            type="file"
            accept="image/jpeg,image/webp,image/png,image/avif"
            multiple
            onChange={handleExtraChange}
            className="hidden"
          />
          <div className="flex flex-wrap gap-3">
            {allExtraPreviews.map((src, idx) => (
              <div key={idx} className="relative size-20 rounded-xl overflow-hidden border border-[#1c1917]/10 group">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExtraImage(idx)}
                  className="absolute top-1 right-1 size-5 rounded-full bg-black/60 text-white text-xs grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => extraRef.current?.click()}
              className="size-20 rounded-xl border border-dashed border-[#1c1917]/20 text-[#1c1917]/30 hover:border-[#F506EA] hover:text-[#F506EA] transition-colors grid place-items-center text-2xl"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-95 disabled:opacity-50"
          >
            {saving ? "Sauvegarde…" : product ? "Mettre à jour" : "Créer"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-full border border-[#1c1917]/10 text-sm text-[#1c1917]/60 hover:border-[#1c1917]/30 transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
