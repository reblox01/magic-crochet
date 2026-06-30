import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { saveSettings } from "@/routes/api/-settings";
import { toast } from "sonner";
import { BusinessHoursPicker, parseBusinessHours, getDefaultHours, formatHoursSummary, type BusinessHours } from "@/components/BusinessHoursPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCanWrite } from "@/lib/useCanWrite";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

type CheckoutField = {
  id: string;
  type: "text" | "number" | "email" | "select" | "checkbox" | "textarea";
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
  order: number;
  inline: boolean;
};

type HeroStat = { label: string; value: string; subtitle: string };
type ManifesteStat = { value: string; label: string };

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
  hero_stats: HeroStat[];
  manifeste_stats: ManifesteStat[];
  impact_ribbon: string[];
  workshop_intro: string;
  workshop_b2c_kind: string;
  workshop_b2c_title: string;
  workshop_b2c_desc: string;
  workshop_b2c_price: string;
  workshop_b2c_cta: string;
  workshop_b2b_kind: string;
  workshop_b2b_title: string;
  workshop_b2b_desc: string;
  workshop_b2b_price: string;
  workshop_b2b_cta: string;
  price_individual: number;
  price_corporate: number;
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
  checkout_fields: [
    { id: "default_name", type: "text", label: "Nom complet", placeholder: "Votre nom", required: true, options: [], order: 0, inline: false },
    { id: "default_email", type: "email", label: "Email", placeholder: "vous@email.com", required: true, options: [], order: 1, inline: true },
    { id: "default_phone", type: "text", label: "Téléphone", placeholder: "+212 ...", required: false, options: [], order: 2, inline: true },
    { id: "default_address", type: "textarea", label: "Adresse", placeholder: "Votre adresse", required: true, options: [], order: 3, inline: false },
  ],
  hero_stats: [
    { label: "Impact", value: "150 kg", subtitle: "de textile détourné" },
    { label: "Ateliers", value: "20+", subtitle: "sessions pilotes" },
    { label: "Communauté", value: "7 000+", subtitle: "sur Instagram" },
  ],
  manifeste_stats: [
    { value: "150 kg", label: "Textile détourné" },
    { value: "6 000 DH", label: "Redistribués" },
    { value: "3", label: "Bénéficiaires directes" },
    { value: "300+", label: "Vies touchées" },
  ],
  impact_ribbon: [
    "150 kg de textile détourné",
    "6 000 DH redistribués",
    "20+ ateliers pilotes",
    "7 000+ Instagram",
    "3 bénéficiaires directes",
  ],
  workshop_intro: "Plus de 20 ateliers pilotes depuis octobre, 3 heures de focus tranquille, organisés chez Talia Art Studio, Bens Coffee Shop et Commons Work.",
  workshop_b2c_kind: "B2C · Particuliers",
  workshop_b2c_title: "Atelier personnel",
  workshop_b2c_desc: "Session de 3 heures, 6 à 10 makers, matériel inclus. Arrivez curieux, repartez avec votre première pièce.",
  workshop_b2c_price: "250 DH",
  workshop_b2c_cta: "Réserver une place",
  workshop_b2b_kind: "B2B · Équipes",
  workshop_b2b_title: "Looping corporate",
  workshop_b2b_desc: "Team-building créatif ancré dans le slow craft. Marge nette de 68% sur chaque session, pour un impact à l'échelle.",
  workshop_b2b_price: "800 DH+",
  workshop_b2b_cta: "Demander un devis",
  price_individual: 250,
  price_corporate: 800,
};

function AdminSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = useCanWrite();
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
      await saveSettings({ data: { ...settings, callerEmail: user?.email, callerId: user?.id } });
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
          disabled={!canWrite}
          onClick={() => set(field, !active as never)}
          className={`relative w-10 h-6 rounded-full transition-colors duration-200 overflow-hidden shrink-0 ${
            active ? "bg-[#F506EA]" : "bg-[#1c1917]/15"
          } ${!canWrite ? "opacity-50 pointer-events-none" : ""}`}
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
    <div className="p-4 sm:p-8">
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
          {/* Two-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left column */}
            <div className="flex flex-col gap-6">
              {/* Maintenance */}
              <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#1c1917]">Mode maintenance</p>
                    <p className="text-xs text-[#1c1917]/40 mt-0.5">Désactive le site pour les visiteurs.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!canWrite}
                    onClick={() => set("maintenance_mode", !form.maintenance_mode)}
                    className={`relative w-12 h-7 rounded-full transition-colors duration-200 overflow-hidden ${
                      form.maintenance_mode ? "bg-[#F506EA]" : "bg-[#1c1917]/15"
                    } ${!canWrite ? "opacity-50 pointer-events-none" : ""}`}
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
                    disabled={!canWrite}
                    onClick={() => set("show_preloader", !form.show_preloader)}
                    className={`relative w-12 h-7 rounded-full transition-colors duration-200 overflow-hidden ${
                      form.show_preloader ? "bg-[#F506EA]" : "bg-[#1c1917]/15"
                    } ${!canWrite ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <span
                      className={`absolute top-[3px] left-0 size-[22px] rounded-full bg-white shadow-md transition-all duration-200 ${
                        form.show_preloader ? "translate-x-[22px]" : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Business info — flex-1 to stretch with right column */}
              <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4 flex-1">
                <p className="font-medium text-[#1c1917]">Informations</p>
                <div className="flex-1">
                  <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Heures d'ouverture</label>
                  <p className="text-xs text-[#1c1917]/40 mb-3">{formatHoursSummary(form.business_hours)}</p>
                  <BusinessHoursPicker
                    value={form.business_hours}
                    onChange={(v) => set("business_hours", v)}
                  />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-6">
              {/* Social */}
              <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4">
                <p className="font-medium text-[#1c1917]">Réseaux sociaux</p>
                <Field label="Instagram" value={form.instagram} onChange={(v) => set("instagram", v)} disabled={!canWrite} />
                <Field label="TikTok" value={form.tiktok} onChange={(v) => set("tiktok", v)} disabled={!canWrite} />
              </div>

              {/* Visibility — flex-1 to stretch with left column */}
              <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4 flex-1">
                <p className="font-medium text-[#1c1917]">Affichage contact</p>
                <p className="text-xs text-[#1c1917]/40">Choisissez quelles infos apparaissent sur la page Contact.</p>
                <Field label="Téléphone" value={form.business_phone} onChange={(v) => set("business_phone", v)} disabled={!canWrite} />
                <Field label="Email" value={form.business_email} onChange={(v) => set("business_email", v)} disabled={!canWrite} />
                <Field label="Localisation" value={form.location} onChange={(v) => set("location", v)} disabled={!canWrite} />
                <div className="pt-2 border-t border-[#1c1917]/5 space-y-3">
                  <p className="text-xs text-[#1c1917]/40">Visibilité sur la page Contact</p>
                  <Toggle label="Téléphone" field="show_phone" />
                  <Toggle label="Email" field="show_email" />
                  <Toggle label="Localisation" field="show_location" />
                  <Toggle label="Instagram" field="show_instagram" />
                  <Toggle label="TikTok" field="show_tiktok" />
                </div>
              </div>
            </div>
          </div>

          {/* Prix des ateliers — full width */}
          <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4">
            <p className="font-medium text-[#1c1917]">Prix des ateliers</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Individuel (DH)</label>
                <input type="number" value={form.price_individual} onChange={(e) => set("price_individual", Number(e.target.value))} disabled={!canWrite} className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors disabled:opacity-50 disabled:pointer-events-none" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Corporate (DH)</label>
                <input type="number" value={form.price_corporate} onChange={(e) => set("price_corporate", Number(e.target.value))} disabled={!canWrite} className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors disabled:opacity-50 disabled:pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Full-width: Homepage stats */}
          <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-6">
            <p className="font-medium text-[#1c1917]">Statistiques de la page d'accueil</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hero badges */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-[#1c1917]/55 uppercase tracking-wider">Badges flottants du hero</p>
                {form.hero_stats.map((stat, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40 mb-1">Label</label>
                      <input type="text" value={stat.label} onChange={(e) => {
                        const next = [...form.hero_stats]; next[i] = { ...next[i], label: e.target.value }; set("hero_stats", next);
                      }} disabled={!canWrite} className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] transition-colors disabled:opacity-50 disabled:pointer-events-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40 mb-1">Valeur</label>
                      <input type="text" value={stat.value} onChange={(e) => {
                        const next = [...form.hero_stats]; next[i] = { ...next[i], value: e.target.value }; set("hero_stats", next);
                      }} disabled={!canWrite} className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] transition-colors disabled:opacity-50 disabled:pointer-events-none" />
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40 mb-1">Sous-titre</label>
                        <input type="text" value={stat.subtitle} onChange={(e) => {
                          const next = [...form.hero_stats]; next[i] = { ...next[i], subtitle: e.target.value }; set("hero_stats", next);
                        }} disabled={!canWrite} className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] transition-colors disabled:opacity-50 disabled:pointer-events-none" />
                      </div>
                      {canWrite && (
                        <button type="button" onClick={() => set("hero_stats", form.hero_stats.filter((_, j) => j !== i))} className="self-end mb-1 px-2 py-2 rounded-lg text-[#1c1917]/30 hover:text-red-500 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {canWrite && form.hero_stats.length < 5 && (
                  <button type="button" onClick={() => set("hero_stats", [...form.hero_stats, { label: "", value: "", subtitle: "" }])} className="text-xs text-[#1c1917]/35 hover:text-[#F506EA] transition-colors">+ Ajouter un badge</button>
                )}
              </div>

              {/* Manifeste stats */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-[#1c1917]/55 uppercase tracking-wider">Statistiques du manifeste</p>
                {form.manifeste_stats.map((stat, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40 mb-1">Valeur</label>
                      <input type="text" value={stat.value} onChange={(e) => {
                        const next = [...form.manifeste_stats]; next[i] = { ...next[i], value: e.target.value }; set("manifeste_stats", next);
                      }} disabled={!canWrite} className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] transition-colors disabled:opacity-50 disabled:pointer-events-none" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40 mb-1">Label</label>
                      <input type="text" value={stat.label} onChange={(e) => {
                        const next = [...form.manifeste_stats]; next[i] = { ...next[i], label: e.target.value }; set("manifeste_stats", next);
                      }} disabled={!canWrite} className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] transition-colors disabled:opacity-50 disabled:pointer-events-none" />
                    </div>
                    {canWrite && (
                      <button type="button" onClick={() => set("manifeste_stats", form.manifeste_stats.filter((_, j) => j !== i))} className="mb-1 px-2 py-2 rounded-lg text-[#1c1917]/30 hover:text-red-500 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    )}
                  </div>
                ))}
                {canWrite && form.manifeste_stats.length < 6 && (
                  <button type="button" onClick={() => set("manifeste_stats", [...form.manifeste_stats, { value: "", label: "" }])} className="text-xs text-[#1c1917]/35 hover:text-[#F506EA] transition-colors">+ Ajouter une stat</button>
                )}
              </div>
            </div>

            {/* Impact ribbon — full width */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-[#1c1917]/55 uppercase tracking-wider">Ruban d'impact</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {form.impact_ribbon.map((item, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <input type="text" value={item} onChange={(e) => {
                        const next = [...form.impact_ribbon]; next[i] = e.target.value; set("impact_ribbon", next);
                      }} disabled={!canWrite} className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA] transition-colors disabled:opacity-50 disabled:pointer-events-none" />
                    </div>
                    {canWrite && (
                      <button type="button" onClick={() => set("impact_ribbon", form.impact_ribbon.filter((_, j) => j !== i))} className="mb-1 px-2 py-2 rounded-lg text-[#1c1917]/30 hover:text-red-500 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {canWrite && <button type="button" onClick={() => set("impact_ribbon", [...form.impact_ribbon, ""])} className="text-xs text-[#1c1917]/35 hover:text-[#F506EA] transition-colors">+ Ajouter un élément</button>}
            </div>
          </div>

          {/* Full-width sections */}
          {/* Checkout form customization */}
          <CheckoutFieldsSection
            fields={form.checkout_fields}
            onChange={(v) => set("checkout_fields", v)}
          />

          {/* Workshop section */}
          <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4">
            <p className="font-medium text-[#1c1917]">Section Ateliers</p>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Introduction</label>
              <textarea value={form.workshop_intro} onChange={(e) => set("workshop_intro", e.target.value)} rows={3} disabled={!canWrite} className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors resize-none disabled:opacity-50 disabled:pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* B2C */}
              <div className="space-y-3 p-4 rounded-xl bg-[#f3f0ec]/40">
                <p className="text-xs font-medium text-[#1c1917]/55 uppercase tracking-wider">B2C · Particuliers</p>
                <Field label="Titre" value={form.workshop_b2c_title} onChange={(v) => set("workshop_b2c_title", v)} disabled={!canWrite} />
                <Field label="Description" value={form.workshop_b2c_desc} onChange={(v) => set("workshop_b2c_desc", v)} disabled={!canWrite} />
                <Field label="Prix" value={form.workshop_b2c_price} onChange={(v) => set("workshop_b2c_price", v)} disabled={!canWrite} />
                <Field label="CTA" value={form.workshop_b2c_cta} onChange={(v) => set("workshop_b2c_cta", v)} disabled={!canWrite} />
              </div>
              {/* B2B */}
              <div className="space-y-3 p-4 rounded-xl bg-[#f3f0ec]/40">
                <p className="text-xs font-medium text-[#1c1917]/55 uppercase tracking-wider">B2B · Équipes</p>
                <Field label="Titre" value={form.workshop_b2b_title} onChange={(v) => set("workshop_b2b_title", v)} disabled={!canWrite} />
                <Field label="Description" value={form.workshop_b2b_desc} onChange={(v) => set("workshop_b2b_desc", v)} disabled={!canWrite} />
                <Field label="Prix" value={form.workshop_b2b_price} onChange={(v) => set("workshop_b2b_price", v)} disabled={!canWrite} />
                <Field label="CTA" value={form.workshop_b2b_cta} onChange={(v) => set("workshop_b2b_cta", v)} disabled={!canWrite} />
              </div>
            </div>
          </div>

          {/* Save */}
          {canWrite && (
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-95 disabled:opacity-50"
              >
                {saving ? "Sauvegarde…" : "Enregistrer"}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors disabled:opacity-50 disabled:pointer-events-none"
      />
    </div>
  );
}

function FieldCard({
  field,
  dragId,
  dropTarget,
  editingFieldId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEdit,
  onRemove,
  onToggleInline,
}: {
  field: CheckoutField;
  dragId: string | null;
  dropTarget: { id: string; side: "left" | "right" | "before" } | null;
  editingFieldId: string | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (side: "left" | "right" | "before") => void;
  onDrop: (side: "left" | "right" | "before") => void;
  onEdit: () => void;
  onRemove: () => void;
  onToggleInline?: () => void;
}) {
  const isDragging = dragId === field.id;
  const isDropHere = dropTarget?.id === field.id;

  function handleMouseOver(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragId || dragId === field.id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const side = x < rect.width / 2 ? "left" : "right";
    onDragOver(side);
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", field.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onMouseOver={handleMouseOver}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        handleMouseOver(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const side = dropTarget?.id === field.id ? dropTarget.side : "before";
        onDrop(side);
      }}
      className={`flex items-center gap-2 p-3 rounded-xl border transition-all duration-150 ${
        isDragging
          ? "opacity-40 bg-[#f3f0ec]/60 border-dashed border-[#F506EA]/40"
          : isDropHere
            ? "bg-[#F506EA]/[0.04] border-[#F506EA]/30 scale-[1.01]"
            : "bg-[#f3f0ec]/60 border-[#1c1917]/5 hover:border-[#1c1917]/10"
      }`}
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing text-[#1c1917]/20 hover:text-[#1c1917]/50 transition-colors shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="4" r="1.5" /><circle cx="16" cy="4" r="1.5" /><circle cx="8" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /><circle cx="8" cy="16" r="1.5" /><circle cx="16" cy="16" r="1.5" /><circle cx="8" cy="22" r="1.5" /><circle cx="16" cy="22" r="1.5" /></svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1c1917] truncate">
          {field.label || "Sans titre"}
        </p>
        <p className="text-[10px] text-[#1c1917]/40 uppercase tracking-wider">
          {field.type}{field.required ? " · requis" : ""}
          {field.inline ? " · en ligne" : ""}
        </p>
      </div>

      {onToggleInline && (
        <button
          type="button"
          onClick={onToggleInline}
          title="Séparer"
          className="text-[#1c1917]/30 hover:text-[#F506EA] transition-colors px-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h8M8 18h8M12 6v12" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-[#1c1917]/40 hover:text-[#F506EA] transition-colors px-2 py-1"
      >
        {editingFieldId === field.id ? "Fermer" : "Modifier"}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-[#1c1917]/30 hover:text-red-500 transition-colors px-2 py-1"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
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
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; side: "left" | "right" | "before" } | null>(null);

  function addField() {
    const id = `field_${Date.now()}`;
    onChange([
      ...fields,
      { id, type: "text", label: "", placeholder: "", required: false, options: [], order: fields.length, inline: false },
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

  function handleDrop(targetId: string, side: "left" | "right" | "before") {
    if (!dragId || dragId === targetId) return;
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    const dragIdx = sorted.findIndex((f) => f.id === dragId);
    const targetIdx = sorted.findIndex((f) => f.id === targetId);
    if (dragIdx === -1 || targetIdx === -1) return;

    const dragField = sorted[dragIdx];
    const targetField = sorted[targetIdx];

    // Remove dragged field
    sorted.splice(dragIdx, 1);
    // Find new target index after removal
    const newTargetIdx = sorted.findIndex((f) => f.id === targetId);

    if (side === "before") {
      sorted.splice(newTargetIdx, 0, dragField);
      // Not inline — standalone
      const patch: Partial<CheckoutField> = { inline: false };
      if (dragField.inline) {
        sorted[newTargetIdx] = { ...sorted[newTargetIdx], ...patch };
      }
    } else {
      // Insert after target
      sorted.splice(newTargetIdx + 1, 0, dragField);
      // Make both inline
      const targetPos = sorted.findIndex((f) => f.id === targetId);
      const dragPos = sorted.findIndex((f) => f.id === dragId);
      sorted[targetPos] = { ...sorted[targetPos], inline: true };
      sorted[dragPos] = { ...sorted[dragPos], inline: true };
    }

    // Reassign orders
    const reordered = sorted.map((f, i) => ({ ...f, order: i }));
    onChange(reordered);
    setDragId(null);
    setDropTarget(null);
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

  // Group consecutive inline fields into rows for display
  type FieldGroup = { type: "row"; fields: CheckoutField[] } | { type: "single"; field: CheckoutField };
  const displayGroups: FieldGroup[] = [];
  let gi = 0;
  while (gi < sortedFields.length) {
    const f = sortedFields[gi];
    if (f.inline && f.type !== "textarea" && f.type !== "checkbox") {
      const row: CheckoutField[] = [f];
      let j = gi + 1;
      while (j < sortedFields.length && sortedFields[j].inline && sortedFields[j].type !== "textarea" && sortedFields[j].type !== "checkbox" && row.length < 2) {
        row.push(sortedFields[j]);
        j++;
      }
      displayGroups.push(row.length > 1 ? { type: "row", fields: row } : { type: "single", field: row[0] });
      gi = j;
    } else {
      displayGroups.push({ type: "single", field: f });
      gi++;
    }
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-[#1c1917]/5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-[#1c1917]">Personnalisation du formulaire de commande</p>
          <p className="text-xs text-[#1c1917]/40 mt-0.5">Glissez les champs pour les réordonner. Glissez un champ sur un autre pour les mettre côte à côte.</p>
        </div>
      </div>

      {sortedFields.length === 0 && (
        <p className="text-xs text-[#1c1917]/35 italic">Aucun champ personnalisé pour l'instant.</p>
      )}

      <div className="space-y-2">
        {displayGroups.map((group, gIdx) => {
          if (group.type === "row") {
            return (
              <div key={`row-${gIdx}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.fields.map((field) => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    dragId={dragId}
                    dropTarget={dropTarget}
                    editingFieldId={editingFieldId}
                    onDragStart={() => setDragId(field.id)}
                    onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                    onDragOver={(side) => setDropTarget({ id: field.id, side })}
                    onDrop={(side) => handleDrop(field.id, side)}
                    onEdit={() => setEditingFieldId(editingFieldId === field.id ? null : field.id)}
                    onRemove={() => removeField(field.id)}
                    onToggleInline={() => updateField(field.id, { inline: false })}
                  />
                ))}
              </div>
            );
          }
          const field = group.field;
          return (
            <FieldCard
              key={field.id}
              field={field}
              dragId={dragId}
              dropTarget={dropTarget}
              editingFieldId={editingFieldId}
              onDragStart={() => setDragId(field.id)}
              onDragEnd={() => { setDragId(null); setDropTarget(null); }}
              onDragOver={(side) => setDropTarget({ id: field.id, side })}
              onDrop={(side) => handleDrop(field.id, side)}
              onEdit={() => setEditingFieldId(editingFieldId === field.id ? null : field.id)}
              onRemove={() => removeField(field.id)}
              onToggleInline={field.inline ? () => updateField(field.id, { inline: false }) : undefined}
            />
          );
        })}
      </div>

      {/* Edit panel */}
      {editingField && (
        <div className="p-4 rounded-xl border border-[#F506EA]/20 bg-[#F506EA]/[0.02] space-y-3">
          <p className="text-xs font-medium text-[#1c1917]/60 uppercase tracking-wider">Modifier le champ</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#1c1917]/40 mb-1">Type</label>
              <Select value={editingField.type} onValueChange={(v) => updateField(editingField.id, { type: v as CheckoutField["type"], options: v === "select" ? editingField.options : [] })}>
                <SelectTrigger className="w-full rounded-lg bg-white border border-[#1c1917]/10 px-3 py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texte</SelectItem>
                  <SelectItem value="number">Numéro</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="textarea">Zone de texte</SelectItem>
                  <SelectItem value="select">Sélection</SelectItem>
                  <SelectItem value="checkbox">Case à cocher</SelectItem>
                </SelectContent>
              </Select>
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

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#1c1917]/55">Sur la même ligne</span>
            <button
              type="button"
              onClick={() => updateField(editingField.id, { inline: !editingField.inline })}
              className={`relative w-10 h-6 rounded-full transition-colors duration-200 overflow-hidden ${
                editingField.inline ? "bg-[#F506EA]" : "bg-[#1c1917]/15"
              }`}
            >
              <span
                className={`absolute top-[2px] left-0 size-[20px] rounded-full bg-white shadow-md transition-all duration-200 ${
                  editingField.inline ? "translate-x-[18px]" : "translate-x-[2px]"
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
                  <Select disabled>
                    <SelectTrigger className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm">
                      <SelectValue placeholder={editingField.placeholder || "Sélectionnez…"} />
                    </SelectTrigger>
                  </Select>
                </div>
              ) : editingField.type === "textarea" ? (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-1">{editingField.label || "Libellé"}{editingField.required && " *"}</label>
                  <textarea disabled rows={2} placeholder={editingField.placeholder} className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm resize-none" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-1">{editingField.label || "Libellé"}{editingField.required && " *"}</label>
                  <input type={editingField.type === "number" ? "number" : editingField.type === "email" ? "email" : "text"} disabled placeholder={editingField.placeholder} className="w-full rounded-lg bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-3 py-2 text-sm" />
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
