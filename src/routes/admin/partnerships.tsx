import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { partnershipMutation, partnershipImageUpload } from "@/routes/api/-partnerships";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { useCanWrite } from "@/lib/useCanWrite";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/partnerships")({
  component: AdminPartnerships,
});

type Partnership = {
  id: string;
  name: string;
  logo_url: string | null;
  url: string | null;
  size: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

const SIZE_PRESETS: Record<string, { label: string; value: number }> = {
  sm: { label: "S", value: 35 },
  md: { label: "M", value: 55 },
  lg: { label: "L", value: 75 },
};
const SIZE_LABELS: Record<string, string> = { sm: "Petit", md: "Moyen", lg: "Grand" };
function sizeToStyle(size: string) {
  const n = parseInt(size, 10);
  const pct = isNaN(n) ? (SIZE_PRESETS[size]?.value ?? 55) : n;
  return { maxHeight: `${pct}%`, maxWidth: `${Math.min(pct + 15, 100)}%` };
}
function sizeToPercent(size: string): number {
  const n = parseInt(size, 10);
  return isNaN(n) ? (SIZE_PRESETS[size]?.value ?? 55) : n;
}
function percentToSize(pct: number): string {
  if (pct === 35) return "sm";
  if (pct === 55) return "md";
  if (pct === 75) return "lg";
  return String(pct);
}

async function fetchPartnerships(): Promise<Partnership[]> {
  const { data, error } = await supabase.from("partnerships").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadLogo(file: File): Promise<string> {
  const b64 = await fileToBase64(file);
  const { url } = await partnershipImageUpload({ data: { fileName: file.name, fileBase64: b64, contentType: file.type } });
  return url;
}


function AdminPartnerships() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = useCanWrite();
  const [editing, setEditing] = useState<Partnership | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const scrollRef = useRef<NodeJS.Timeout | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (dragIdx === null) { stopScroll(); return; }
      const EDGE = 80;
      const SPEED = 12;
      if (e.clientY < EDGE) startScroll(-SPEED);
      else if (e.clientY > window.innerHeight - EDGE) startScroll(SPEED);
      else stopScroll();
    }
    function startScroll(speed: number) {
      if (scrollRef.current) return;
      scrollRef.current = setInterval(() => window.scrollBy(0, speed), 16);
    }
    function stopScroll() {
      if (scrollRef.current) { clearInterval(scrollRef.current); scrollRef.current = null; }
    }
    if (dragIdx !== null) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("dragend", stopScroll);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("dragend", stopScroll);
      stopScroll();
    };
  }, [dragIdx]);

  const { data: partners, isLoading } = useQuery({
    queryKey: ["admin-partnerships"],
    queryFn: fetchPartnerships,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await partnershipMutation({ data: { action: "delete", id, callerEmail: user?.email, callerId: user?.id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partnerships"] });
      toast.success("Partenaire supprimé.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await partnershipMutation({ data: { action: "update", id, data: { is_active }, callerEmail: user?.email, callerId: user?.id } });
    },
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-partnerships"] });
      const prev = queryClient.getQueryData<Partnership[]>(["admin-partnerships"]);
      queryClient.setQueryData<Partnership[]>(["admin-partnerships"], (old) => old?.map((p) => p.id === id ? { ...p, is_active } : p));
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(["admin-partnerships"], ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-partnerships"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const u of updates) {
        await partnershipMutation({ data: { action: "update", id: u.id, data: { sort_order: u.sort_order }, callerEmail: user?.email, callerId: user?.id } });
      }
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ["admin-partnerships"] }),
  });

  function handleDragStart(e: React.DragEvent, idx: number) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOverItem(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIdx(idx);
  }

  function handleDropReorder(e: React.DragEvent) {
    e.preventDefault();
    if (dragIdx === null || dropIdx === null || dragIdx === dropIdx || !partners) { setDragIdx(null); setDropIdx(null); return; }
    const reordered = [...partners];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    queryClient.setQueryData<Partnership[]>(["admin-partnerships"], reordered);
    const updates = reordered.map((p, i) => ({ id: p.id, sort_order: i }));
    reorderMutation.mutate(updates);
    setDragIdx(null);
    setDropIdx(null);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#1c1917]">Partenaires</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">{partners?.length ?? 0} partenaire(s).</p>
        </div>
        {canWrite && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-5 py-2.5 rounded-full bg-[#F506EA] text-white text-sm font-semibold hover:bg-[#d405c0] transition-colors active:scale-95"
          >
            + Nouveau partenaire
          </button>
        )}
      </div>

      {showForm && (
        <PartnershipForm
          partnership={editing}
          nextSortOrder={partners?.length ?? 0}
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
          {partners?.map((p, idx) => (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOverItem(e, idx)}
              onDrop={handleDropReorder}
              onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
              className={`flex items-center gap-4 p-4 rounded-2xl bg-white border-2 transition-all cursor-grab active:cursor-grabbing ${
                dropIdx === idx ? "border-[#F506EA] scale-[1.02]" : dragIdx === idx ? "opacity-50 border-[#1c1917]/20" : "border-[#1c1917]/5 hover:border-[#1c1917]/10"
              }`}
            >
              <div className="shrink-0 size-7 rounded-full bg-[#F506EA] text-white text-[11px] font-bold grid place-items-center tabular-nums">
                {idx + 1}
              </div>
              <div className="size-14 rounded-xl bg-[#1c1917]/5 overflow-hidden shrink-0 grid place-items-center">
                {p.logo_url ? (
                  <img src={p.logo_url} alt={p.name} className="w-full h-full object-contain p-1" style={sizeToStyle(p.size)} />
                ) : (
                  <span className="text-xs text-[#1c1917]/20">?</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1c1917]">{p.name}</p>
                <p className="text-xs text-[#1c1917]/40 mt-0.5">
                  {SIZE_LABELS[p.size]} · {p.url ?? "pas de lien"}
                </p>
              </div>

              {canWrite ? (
                <button
                  onClick={() => toggleActive.mutate({ id: p.id, is_active: !p.is_active })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    p.is_active ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.is_active ? "Actif" : "Inactif"}
                </button>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  p.is_active ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {p.is_active ? "Actif" : "Inactif"}
                </span>
              )}

              <div className="flex items-center gap-1">
                {canWrite && (
                  <button
                    onClick={() => { setEditing(p); setShowForm(true); }}
                    className="size-9 rounded-lg grid place-items-center text-[#1c1917]/40 hover:text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                )}
                {canWrite && (
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Supprimer le partenaire",
                        message: `Supprimer ${p.name} ? Cette action est irréversible.`,
                        confirmLabel: "Supprimer",
                        danger: true,
                      });
                      if (ok.ok) deleteMutation.mutate(p.id);
                    }}
                    className="size-9 rounded-lg grid place-items-center text-[#1c1917]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                )}
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
  nextSortOrder,
  onDone,
  onCancel,
}: {
  partnership: Partnership | null;
  nextSortOrder: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(partnership?.name ?? "");
  const [url, setUrl] = useState(partnership?.url ?? "");
  const [size, setSize] = useState(partnership?.size ?? "md");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(partnership?.logo_url ?? "");
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
      let logoUrl = partnership?.logo_url ?? null;
      if (logoFile) logoUrl = await uploadLogo(logoFile);

      const payload = {
        name: name.trim(),
        url: url.trim() || null,
        logo_url: logoUrl,
        size,
      };

      if (partnership) {
        await partnershipMutation({ data: { action: "update", id: partnership.id, data: payload, callerEmail: user?.email, callerId: user?.id } });
        toast.success("Partenaire mis à jour !");
      } else {
        await partnershipMutation({ data: { action: "insert", data: { ...payload, is_active: true, sort_order: nextSortOrder }, callerEmail: user?.email, callerId: user?.id } });
        toast.success("Partenaire créé !");
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
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Taille du logo</label>
          <div className="flex gap-3 mb-3">
            {Object.entries(SIZE_PRESETS).map(([key, { label }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSize(key)}
                className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                  size === key
                    ? "border-[#F506EA] bg-[#F506EA]/5 text-[#F506EA]"
                    : "border-[#1c1917]/10 bg-[#f3f0ec]/60 text-[#1c1917]/50 hover:border-[#1c1917]/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative px-1">
            <input
              type="range"
              min={15}
              max={100}
              step={1}
              value={sizeToPercent(size)}
              onChange={(e) => setSize(percentToSize(Number(e.target.value)))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-[#F506EA]/20 via-[#F506EA]/50 to-[#F506EA] accent-[#F506EA]"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-[#1c1917]/30">15%</span>
              <span className="text-[11px] font-medium text-[#F506EA] tabular-nums">{sizeToPercent(size)}%</span>
              <span className="text-[10px] text-[#1c1917]/30">100%</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Logo</label>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={handleLogoChange} className="hidden" />
          <div className="flex items-start gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-xl border border-dashed border-[#1c1917]/20 text-sm text-[#1c1917]/50 hover:border-[#F506EA] hover:text-[#F506EA] transition-colors shrink-0">
              {logoPreview ? "Changer le logo" : "Choisir un logo"}
            </button>
            {logoPreview && (
              <div className="aspect-[5/3] w-40 rounded-xl overflow-hidden border border-[#1c1917]/10 grid place-items-center bg-[#1c1917]/5">
                <img src={logoPreview} alt="" className="object-contain" style={sizeToStyle(size)} />
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
