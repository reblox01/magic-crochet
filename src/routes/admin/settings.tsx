import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { saveSettings } from "@/routes/api/-settings";
import { toast } from "sonner";
import { BusinessHoursPicker, parseBusinessHours, getDefaultHours, formatHoursSummary, type BusinessHours } from "@/components/BusinessHoursPicker";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

type CheckoutField = {
  id: string;
  type: "text" | "select" | "checkbox" | "textarea";
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
  order: number;
};

type Settings = {
  maintenance_mode: boolean;
  show_preloader: boolean;
  business_hours: BusinessHours;
  business_phone: string;
  business_email: string;
  location: string;
  instagram: string;
  tiktok: string;
  show_phone: boolean;
  show_email: boolean;
  show_location: boolean;
  show_instagram: boolean;
  show_tiktok: boolean;
  checkout_fields: CheckoutField[];
};

const DEFAULTS: Settings = {
  maintenance_mode: false,
  show_preloader: true,
  business_hours: getDefaultHours(),
  business_phone: "",
  business_email: "",
  location: "",
  instagram: "",
  tiktok: "",
  show_phone: true,
  show_email: true,
  show_location: true,
  show_instagram: true,
  show_tiktok: true,
  checkout_fields: [],
};

function AdminSettings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "site").single();
      if (!data?.value) return DEFAULTS;
      const raw = data.value as Partial<Settings>;
      return {
        ...DEFAULTS,
        ...raw,
        business_hours: parseBusinessHours(raw.business_hours),
      };
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const updateSettings = useMutation({
    mutationFn: async (settings: Settings) => {
      await saveSettings({ data: settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Paramètres enregistrés !");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    updateSettings.mutate(form, {
      onSettled: () => setSaving(false),
    });
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function Toggle({ label, field }: { label: string; field: keyof Settings }) {
    const active = !!form[field];
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-[#1c1917]/55">{label}</span>
        <button
          type="button"
          onClick={() => set(field, !active as never)}
          className={`relative w-10 h-6 rounded-full transition-colors duration-200 overflow-hidden shrink-0 ${
            active ? "bg-[#F506EA]" : "bg-[#1c1917]/15"
          }`}
        >
          <span
            className={`absolute top-[2px] left-0 size-[20px] rounded-full bg-white shadow-md transition-all duration-200 ${
              active ? "translate-x-[18px]" : "translate-x-[2px]"
            }`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#1c1917]">Paramètres</h1>
        <p className="text-sm text-[#1c1917]/50 mt-1">Configurez votre site.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Maintenance */}
          <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#1c1917]">Mode maintenance</p>
                <p className="text-xs text-[#1c1917]/40 mt-0.5">Désactive le site pour les visiteurs.</p>
              </div>
              <button
                type="button"
                onClick={() => set("maintenance_mode", !form.maintenance_mode)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 overflow-hidden ${
                  form.maintenance_mode ? "bg-[#F506EA]" : "bg-[#1c1917]/15"
                }`}
              >
                <span
                  className={`absolute top-[3px] left-0 size-[22px] rounded-full bg-white shadow-md transition-all duration-200 ${
                    form.maintenance_mode ? "translate-x-[22px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#1c1917]">Écran de chargement</p>
                <p className="text-xs text-[#1c1917]/40 mt-0.5">Affiche l'animation d'ouverture au chargement.</p>
              </div>
              <button
                type="button"
                onClick={() => set("show_preloader", !form.show_preloader)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 overflow-hidden ${
                  form.show_preloader ? "bg-[#F506EA]" : "bg-[#1c1917]/15"
                }`}
              >
                <span
                  className={`absolute top-[3px] left-0 size-[22px] rounded-full bg-white shadow-md transition-all duration-200 ${
                    form.show_preloader ? "translate-x-[22px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Business info */}
          <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4">
            <p className="font-medium text-[#1c1917]">Informations</p>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Heures d'ouverture</label>
              <p className="text-xs text-[#1c1917]/40 mb-3">{formatHoursSummary(form.business_hours)}</p>
              <BusinessHoursPicker
                value={form.business_hours}
                onChange={(v) => set("business_hours", v)}
              />
            </div>
            <Field label="Téléphone" value={form.business_phone} onChange={(v) => set("business_phone", v)} />
            <Field label="Email" value={form.business_email} onChange={(v) => set("business_email", v)} />
            <Field label="Localisation" value={form.location} onChange={(v) => set("location", v)} />
          </div>

          {/* Social */}
          <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4">
            <p className="font-medium text-[#1c1917]">Réseaux sociaux</p>
            <Field label="Instagram" value={form.instagram} onChange={(v) => set("instagram", v)} />
            <Field label="TikTok" value={form.tiktok} onChange={(v) => set("tiktok", v)} />
          </div>

          {/* Visibility */}
          <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4">
            <p className="font-medium text-[#1c1917]">Affichage contact</p>
            <p className="text-xs text-[#1c1917]/40">Choisissez quelles infos apparaissent sur la page Contact.</p>
            <Toggle label="Téléphone" field="show_phone" />
            <Toggle label="Email" field="show_email" />
            <Toggle label="Localisation" field="show_location" />
            <Toggle label="Instagram" field="show_instagram" />
            <Toggle label="TikTok" field="show_tiktok" />
          </div>

          {/* Checkout form customization */}
          <CheckoutFieldsSection
            fields={form.checkout_fields}
            onChange={(v) => set("checkout_fields", v)}
          />

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-95 disabled:opacity-50"
            >
              {saving ? "Sauvegarde…" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
      />
    </div>
  );
}

function CheckoutFieldsSection({
  fields,
  onChange,
}: {
  fields: CheckoutField[];
  onChange: (v: CheckoutField[]) => void;
}) {
  const [newOption, setNewOption] = useState("");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  function addField() {
    const id = `field_${Date.now()}`;
    onChange([
      ...fields,
      { id, type: "text", label: "", placeholder: "", required: false, options: [], order: fields.length },
    ]);
    setEditingFieldId(id);
  }

  function updateField(id: string, patch: Partial<CheckoutField>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  function moveField(id: string, dir: -1 | 1) {
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    sorted[idx] = { ...b, order: a.order };
    sorted[swapIdx] = { ...a, order: b.order };
    onChange(sorted);
  }

  function addOption(fieldId: string) {
    if (!newOption.trim()) return;
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { options: [...field.options, newOption.trim()] });
    setNewOption("");
  }

  function removeOption(fieldId: string, optIdx: number) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { options: field.options.filter((_, i) => i !== optIdx) });
  }

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);
  const editingField = sortedFields.find((f) => f.id === editingFieldId);

  return (
    <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-[#1c1917]">Personnalisation du formulaire de commande</p>
          <p className="text-xs text-[#1c1917]/40 mt-0.5">Ajoutez des champs personnalisés au formulaire de checkout.</p>
        </div>
      </div>

      {sortedFields.length === 0 && (
        <p className="text-xs text-[#1c1917]/35 italic">Aucun champ personnalisé pour l'instant.</p>
      )}

      <div className="space-y-2">
        {sortedFields.map((field, idx) => (
          <div
            key={field.id}
            className="flex items-center gap-2 p-3 rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/5"
          >
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => moveField(field.id, -1)}
                className="text-[#1c1917]/30 hover:text-[#1c1917] disabled:opacity-20 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                type="button"
                disabled={idx === sortedFields.length - 1}
                onClick={() => moveField(field.id, 1)}
                className="text-[#1c1917]/30 hover:text-[#1c1917] disabled:opacity-20 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1c1917] truncate">
                {field.label || "Sans titre"}
              </p>
              <p className="text-[10px] text-[#1c1917]/40 uppercase tracking-wider">
                {field.type}{field.required ? " · requis" : ""}
                {field.type === "select" && field.options.length > 0 ? ` · ${field.options.length} options` : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEditingFieldId(editingFieldId === field.id ? null : field.id)}
              className="text-xs text-[#1c1917]/40 hover:text-[#F506EA] transition-colors px-2 py-1"
            >
              {editingFieldId === field.id ? "Fermer" : "Modifier"}
            </button>
            <button
              type="button"
              onClick={() => removeField(field.id)}
              className="text-xs text-[#1c1917]/30 hover:text-red-500 transition-colors px-2 py-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Edit panel */}
      {editingField && (
        <div className="p-4 rounded-xl border border-[#F506EA]/20 bg-[#F506EA]/[0.02] space-y-3">
          <p className="text-xs font-medium text-[#1c1917]/60 uppercase tracking-wider">Modifier le champ</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40 mb-1">Type</label>
              <select
                value={editingField.type}
                onChange={(e) => updateField(editingField.id, { type: e.target.value as CheckoutField["type"], options: e.target.value === "select" ? editingField.options : [] })}
                className="w-full rounded-lg bg-white border border-[#1c1917]/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              >
                <option value="text">Texte</option>
                <option value="textarea">Zone de texte</option>
                <option value="select">Sélection</option>
                <option value="checkbox">Case à cocher</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40 mb-1">Libellé</label>
              <input
                type="text"
                value={editingField.label}
                onChange={(e) => updateField(editingField.id, { label: e.target.value })}
                placeholder="Ex: Allergies alimentaires"
                className="w-full rounded-lg bg-white border border-[#1c1917]/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              />
            </div>
          </div>

          {editingField.type !== "checkbox" && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40 mb-1">Placeholder</label>
              <input
                type="text"
                value={editingField.placeholder}
                onChange={(e) => updateField(editingField.id, { placeholder: e.target.value })}
                placeholder="Texte d'aide…"
                className="w-full rounded-lg bg-white border border-[#1c1917]/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#1c1917]/55">Champ requis</span>
            <button
              type="button"
              onClick={() => updateField(editingField.id, { required: !editingField.required })}
              className={`relative w-10 h-6 rounded-full transition-colors duration-200 overflow-hidden ${
                editingField.required ? "bg-[#F506EA]" : "bg-[#1c1917]/15"
              }`}
            >
              <span
                className={`absolute top-[2px] left-0 size-[20px] rounded-full bg-white shadow-md transition-all duration-200 ${
                  editingField.required ? "translate-x-[18px]" : "translate-x-[2px]"
                }`}
              />
            </button>
          </div>

          {/* Select options */}
          {editingField.type === "select" && (
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40">Options</label>
              {editingField.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-[#1c1917] flex-1">{opt}</span>
                  <button type="button" onClick={() => removeOption(editingField.id, i)} className="text-[#1c1917]/30 hover:text-red-500 text-xs">✕</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(editingField.id); } }}
                  placeholder="Nouvelle option…"
                  className="flex-1 rounded-lg bg-white border border-[#1c1917]/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => addOption(editingField.id)}
                  className="px-3 py-2 rounded-lg bg-[#1c1917]/5 text-sm text-[#1c1917]/60 hover:bg-[#1c1917]/10 transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="pt-2 border-t border-[#1c1917]/5">
            <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40 mb-1">Aperçu</label>
            <div className="p-3 rounded-lg bg-white border border-[#1c1917]/5">
              {editingField.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm text-[#1c1917]">
                  <input type="checkbox" disabled className="accent-[#F506EA]" />
                  {editingField.label || "Libellé"}{editingField.required && " *"}
                </label>
              ) : editingField.type === "select" ? (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-1">{editingField.label || "Libellé"}{editingField.required && " *"}</label>
                  <select disabled className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm">
                    <option>{editingField.placeholder || "Sélectionnez…"}</option>
                  </select>
                </div>
              ) : editingField.type === "textarea" ? (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-1">{editingField.label || "Libellé"}{editingField.required && " *"}</label>
                  <textarea disabled rows={2} placeholder={editingField.placeholder} className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm resize-none" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-1">{editingField.label || "Libellé"}{editingField.required && " *"}</label>
                  <input type="text" disabled placeholder={editingField.placeholder} className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={addField}
        className="w-full py-2.5 rounded-xl border border-dashed border-[#1c1917]/15 text-sm text-[#1c1917]/40 hover:border-[#F506EA] hover:text-[#F506EA] transition-colors"
      >
        + Ajouter un champ
      </button>
    </div>
  );
}
