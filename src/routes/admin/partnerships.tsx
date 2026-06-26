import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/partnerships")({
  component: AdminPartnerships,
});

type Partnership = {
  id: string;
  name: string;
  logo: string | null;
  website: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

async function fetchPartnerships(): Promise<Partnership[]> {
  const { data, error } = await supabase.from("partnerships").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function uploadLogo(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `partners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("partners").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("partners").getPublicUrl(path);
  return data.publicUrl;
}

function AdminPartnerships() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Partnership | null>(null);
  const [showForm, setShowForm] = useState(false);
  const confirm = useConfirm();

  const { data: partners, isLoading } = useQuery({
    queryKey: ["admin-partnerships"],
    queryFn: fetchPartnerships,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partnerships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-partnerships"] }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("partnerships").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-partnerships"] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#1c1917]">Partenaires</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">{partners?.length ?? 0} partenaire(s).</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-full bg-[#F506EA] text-white text-sm font-semibold hover:bg-[#d405c0] transition-colors active:scale-95"
        >
          + Nouveau partenaire
        </button>
      </div>

      {showForm && (
        <PartnershipForm
          partnership={editing}
          onDone={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["admin-partnerships"] }); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {partners?.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-[#1c1917]/5 hover:border-[#1c1917]/10 transition-colors">
              {/* Logo */}
              <div className="size-14 rounded-xl bg-[#1c1917]/5 overflow-hidden shrink-0 grid place-items-center">
                {p.logo ? (
                  <img src={p.logo} alt={p.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-xs text-[#1c1917]/20">?</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1c1917]">{p.name}</p>
                {p.website && <p className="text-xs text-[#1c1917]/40 mt-0.5 truncate">{p.website}</p>}
              </div>

              <button
                onClick={() => toggleActive.mutate({ id: p.id, is_active: !p.is_active })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  p.is_active ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {p.is_active ? "Actif" : "Inactif"}
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditing(p); setShowForm(true); }}
                  className="size-9 rounded-lg grid place-items-center text-[#1c1917]/40 hover:text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Supprimer le partenaire",
                      message: "Supprimer ce partenaire ? Cette action est irréversible.",
                      confirmLabel: "Supprimer",
                      danger: true,
                    });
                    if (ok) deleteMutation.mutate(p.id);
                  }}
                  className="size-9 rounded-lg grid place-items-center text-[#1c1917]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            </div>
          ))}
          {partners?.length === 0 && (
            <div className="text-center py-16 text-[#1c1917]/30">
              <p className="font-serif text-xl italic">Aucun partenaire.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PartnershipForm({
  partnership,
  onDone,
  onCancel,
}: {
  partnership: Partnership | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(partnership?.name ?? "");
  const [website, setWebsite] = useState(partnership?.website ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(partnership?.logo ?? "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nom requis."); return; }

    setSaving(true);

    try {
      let logoUrl = partnership?.logo ?? null;
      if (logoFile) logoUrl = await uploadLogo(logoFile);

      const payload = {
        name: name.trim(),
        website: website.trim() || null,
        logo: logoUrl,
      };

      if (partnership) {
        const { error } = await supabase.from("partnerships").update(payload).eq("id", partnership.id);
        if (error) throw error;
        toast.success("Partenariat mis à jour !");
      } else {
        const { error } = await supabase.from("partnerships").insert({ ...payload, is_active: true });
        if (error) throw error;
        toast.success("Partenariat créé !");
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
      <h2 className="font-serif text-lg text-[#1c1917] mb-4">{partnership ? "Modifier le partenaire" : "Nouveau partenaire"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="Nom du partenaire"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Site web</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Logo</label>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} className="hidden" />
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-xl border border-dashed border-[#1c1917]/20 text-sm text-[#1c1917]/50 hover:border-[#F506EA] hover:text-[#F506EA] transition-colors">
              {logoPreview ? "Changer le logo" : "Choisir un logo"}
            </button>
            {logoPreview && (
              <div className="size-14 rounded-xl overflow-hidden border border-[#1c1917]/10 grid place-items-center bg-[#1c1917]/5">
                <img src={logoPreview} alt="" className="w-full h-full object-contain p-1" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-95 disabled:opacity-50">
            {saving ? "Sauvegarde…" : partnership ? "Mettre à jour" : "Créer"}
          </button>
          <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-full border border-[#1c1917]/10 text-sm text-[#1c1917]/60 hover:border-[#1c1917]/30 transition-colors">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
