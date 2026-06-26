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
