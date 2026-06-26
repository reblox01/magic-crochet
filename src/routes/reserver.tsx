import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { Calendar } from "@/components/ui/calendar";
import { getAvailability } from "@/routes/api/availability";
import { submitBooking } from "@/routes/api/bookings";

export const Route = createFileRoute("/reserver")({
  head: () => ({
    meta: [
      { title: "Réserver un atelier · Magic Crochet" },
      {
        name: "description",
        content:
          "Réservez votre place dans nos ateliers de crochet à Casablanca. Sessions individuelles ou en équipe, 3 heures de focus créatif.",
      },
      { property: "og:title", content: "Réserver un atelier · Magic Crochet" },
      {
        property: "og:description",
        content: "Choisissez votre date et l'horaire, recevez votre confirmation.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://magic-crochet.com/og.png" },
      { property: "og:url", content: "https://magic-crochet.com/reserver" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://magic-crochet.com/og.png" },
    ],
    links: [{ rel: "canonical", href: "https://magic-crochet.com/reserver" }],
  }),
  component: ReserverPage,
});

const SLOTS = ["10:00", "14:00", "17:00"] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80, "Nom trop long"),
  email: z.string().trim().email("E-mail invalide").max(160),
  phone: z
    .string()
    .trim()
    .min(6, "Téléphone invalide")
    .max(20)
    .regex(/^[0-9+\s().-]+$/, "Caractères invalides"),
  seats: z.number().int().min(1).max(10),
  format: z.enum(["individuel", "equipe"]),
  date: z.string().min(1, "Choisissez une date"),
  time: z.string().min(1, "Choisissez un horaire"),
  notes: z.string().max(500).optional(),
});

type FormState = z.infer<typeof schema>;

type SlotAvailability = {
  available: boolean;
  remaining: number;
};

function formatLongDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ReserverPage() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i + 1);
      return d;
    });
  }, [today]);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    seats: 1,
    format: "individuel",
    date: "",
    time: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [confirmed, setConfirmed] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, SlotAvailability>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Atelier de crochet Magic Crochet",
    description: "Session de 3 heures de focus créatif à Casablanca. Tous matériaux inclus.",
    provider: {
      "@type": "Organization",
      name: "Magic Crochet",
    },
    areaServed: {
      "@type": "City",
      name: "Casablanca",
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "250",
      highPrice: "800",
      priceCurrency: "MAD",
    },
  };

  const pricePerSeat = form.format === "individuel" ? 250 : 800;
  const total = pricePerSeat * form.seats;

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setServerError(null);
  }

  async function fetchAvailability(date: string) {
    if (!date) return;
    setLoadingAvailability(true);
    try {
      const data = await getAvailability({ data: date });
      setAvailability(data);
    } catch {
      // Silently fail; availability is advisory
    } finally {
      setLoadingAvailability(false);
    }
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    const iso = toISO(date);
    update("date", iso);
    update("time", "");
    fetchAvailability(iso);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = schema.safeParse(form);
    if (!res.success) {
      const fe: Partial<Record<keyof FormState, string>> = {};
      for (const issue of res.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!fe[key]) fe[key] = issue.message;
      }
      setErrors(fe);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const result = await submitBooking({ data: res.data });

      if (!result.success) {
        setServerError(result.error || "Erreur lors de la réservation. Réessayez.");
        return;
      }

      setConfirmed(res.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur réseau. Vérifiez votre connexion et réessayez.";
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
        <SiteNav />
        <section className="pt-40 pb-32 px-6">
          <div className="max-w-2xl mx-auto text-center animate-reveal">
            <div className="mx-auto size-20 rounded-full bg-brand-primary text-white grid place-items-center mb-8 shadow-[0_20px_50px_-15px_rgba(145,65,16,0.5)]">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l5 5 9-11" />
              </svg>
            </div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
              Confirmation
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight italic mb-6">
              Merci {confirmed.name.split(" ")[0]}, <br />à très vite à l'atelier.
            </h1>
            <p className="text-lg text-brand-text/65 mb-10">
              Un e-mail récapitulatif a été envoyé à{" "}
              <span className="font-medium text-brand-text">{confirmed.email}</span>. Notre équipe
              vous contactera sous 24h pour finaliser.
            </p>
            <div className="text-left p-8 rounded-[2.5rem] bg-brand-muted/60 border border-brand-text/5 space-y-3">
              <Row
                label="Format"
                value={
                  confirmed.format === "individuel" ? "Atelier personnel" : "Looping corporate"
                }
              />
              <Row label="Date" value={formatLongDate(new Date(confirmed.date))} />
              <Row label="Horaire" value={confirmed.time} />
              <Row label="Places" value={String(confirmed.seats)} />
              <Row label="Total" value={`${total} DH`} />
            </div>
            <button
              type="button"
              onClick={() => setConfirmed(null)}
              className="mt-10 inline-flex items-center gap-2 bg-brand-text text-white pl-6 pr-2 py-2 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors active:scale-95"
            >
              Réserver une autre session
              <span className="grid place-items-center size-9 rounded-full bg-brand-primary text-white">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <SiteNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="pt-36 sm:pt-44 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-5">
            Réserver
          </p>
          <h1 className="font-serif text-5xl sm:text-7xl leading-[0.9] tracking-tighter text-balance">
            Choisissez votre <span className="italic text-brand-primary">moment.</span>
          </h1>
          <p className="mt-6 text-lg text-brand-text/65 max-w-xl">
            Trois heures de focus créatif, tous matériaux inclus. À Casablanca, en petit groupe.
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="px-6 pb-32" noValidate>
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-8">
          {/* Left: choices */}
          <div className="lg:col-span-3 space-y-8">
            {/* Format */}
            <Block title="Format de l'atelier">
              <div className="grid sm:grid-cols-2 gap-3">
                <Choice
                  active={form.format === "individuel"}
                  onClick={() => update("format", "individuel")}
                  title="Atelier personnel"
                  sub="250 DH / personne · 3h"
                />
                <Choice
                  active={form.format === "equipe"}
                  onClick={() => update("format", "equipe")}
                  title="Looping corporate"
                  sub="800 DH / personne · Équipes"
                />
              </div>
            </Block>

            {/* Date - Suggested days quick scroll */}
            <Block title="Date" error={errors.date}>
              <p className="text-xs text-brand-text/50 mb-3">
                Sélectionnez une date dans le calendrier
              </p>
              <div className="grid grid-cols-7 gap-2 mb-6">
                {days.slice(0, 14).map((d) => {
                  const iso = toISO(d);
                  const active = form.date === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => handleDateSelect(d)}
                      className={`py-3 rounded-2xl border text-center transition-all active:scale-95 ${
                        active
                          ? "bg-brand-primary text-white border-brand-primary shadow-[0_10px_30px_-10px_rgba(145,65,16,0.5)]"
                          : "bg-white text-brand-text border-brand-text/10 hover:border-brand-primary"
                      }`}
                    >
                      <div className="text-[9px] uppercase tracking-widest opacity-70">
                        {new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d)}
                      </div>
                      <div className="font-serif text-xl mt-0.5">{d.getDate()}</div>
                      <div className="text-[9px] uppercase tracking-widest opacity-70">
                        {new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Calendar */}
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={form.date ? new Date(form.date + "T00:00:00") : undefined}
                  onSelect={handleDateSelect}
                  disabled={(date) => {
                    const d = new Date();
                    d.setHours(0, 0, 0, 0);
                    return date <= d || date.getDay() === 1; // Past or Monday
                  }}
                  className="rounded-[2rem] border border-brand-text/10 bg-white p-6 w-full max-w-md"
                />
              </div>
            </Block>

            {/* Time */}
            <Block title="Horaire" error={errors.time}>
              {loadingAvailability && (
                <p className="text-xs text-brand-text/40 mb-3">Vérification des disponibilités…</p>
              )}
              <div className="flex flex-wrap gap-3">
                {SLOTS.map((s) => {
                  const active = form.time === s;
                  const slotInfo = availability[s];
                  const isFull = slotInfo && !slotInfo.available;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={isFull}
                      onClick={() => update("time", s)}
                      className={`px-7 py-3.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                        isFull
                          ? "bg-brand-muted/50 text-brand-text/30 border-brand-text/5 cursor-not-allowed"
                          : active
                            ? "bg-brand-text text-white border-brand-text"
                            : "bg-white border-brand-text/10 hover:border-brand-primary"
                      }`}
                    >
                      <span>{s}</span>
                      {slotInfo && !isFull && (
                        <span
                          className={`ml-2 text-[10px] ${active ? "text-white/70" : "text-brand-text/40"}`}
                        >
                          {slotInfo.remaining} place{slotInfo.remaining > 1 ? "s" : ""}
                        </span>
                      )}
                      {isFull && (
                        <span className="ml-2 text-[10px] text-brand-text/30">Complet</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Block>

            {/* Seats */}
            <Block title="Nombre de places">
              <div className="inline-flex items-center bg-white rounded-full border border-brand-text/10 p-1">
                <button
                  type="button"
                  onClick={() => update("seats", Math.max(1, form.seats - 1))}
                  className="size-11 grid place-items-center rounded-full hover:bg-brand-muted active:scale-90"
                  aria-label="Moins"
                >
                  −
                </button>
                <span className="w-12 text-center font-serif text-2xl">{form.seats}</span>
                <button
                  type="button"
                  onClick={() => update("seats", Math.min(10, form.seats + 1))}
                  className="size-11 grid place-items-center rounded-full hover:bg-brand-muted active:scale-90"
                  aria-label="Plus"
                >
                  +
                </button>
              </div>
            </Block>

            {/* Contact */}
            <Block title="Vos coordonnées">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field
                  label="Nom complet"
                  value={form.name}
                  onChange={(v) => update("name", v)}
                  error={errors.name}
                  maxLength={80}
                />
                <Field
                  label="E-mail"
                  type="email"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                  error={errors.email}
                  maxLength={160}
                />
                <Field
                  label="Téléphone"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => update("phone", v)}
                  error={errors.phone}
                  maxLength={20}
                />
              </div>
              <label className="block mt-3">
                <span className="block text-xs uppercase tracking-widest text-brand-text/55 mb-2">
                  Notes (optionnel)
                </span>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) => update("notes", e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-[1.6rem] bg-white border border-brand-text/10 px-5 py-4 text-sm focus:outline-none focus:border-brand-primary resize-none"
                  placeholder="Allergies, niveau, demandes particulières…"
                />
              </label>
            </Block>
          </div>

          {/* Right: summary */}
          <aside className="lg:col-span-2">
            <div className="lg:sticky lg:top-32 p-8 rounded-[2.5rem] bg-brand-text text-white space-y-6 shadow-[0_30px_70px_-30px_rgba(28,25,23,0.4)]">
              <p className="text-[11px] uppercase tracking-[0.3em] text-brand-accent font-medium">
                Récapitulatif
              </p>
              <h3 className="font-serif text-3xl italic leading-tight">
                {form.format === "individuel" ? "Atelier personnel" : "Looping corporate"}
              </h3>
              <dl className="space-y-3 text-sm">
                <SumRow
                  label="Date"
                  value={form.date ? formatLongDate(new Date(form.date)) : "–"}
                />
                <SumRow label="Horaire" value={form.time || "–"} />
                <SumRow label="Places" value={String(form.seats)} />
                <SumRow label="Tarif unitaire" value={`${pricePerSeat} DH`} />
              </dl>
              <div className="border-t border-white/15 pt-5 flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-widest opacity-60">Total</span>
                <span className="font-serif text-4xl">{total} DH</span>
              </div>

              {serverError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-100">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-primary text-white py-4 rounded-full text-sm font-semibold hover:bg-brand-accent hover:text-brand-text transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Réservation en cours…" : "Confirmer ma réservation"}
              </button>
              <p className="text-[11px] opacity-50 leading-relaxed">
                Le paiement se fait sur place. Annulation gratuite jusqu'à 48h avant la session.
              </p>
            </div>
          </aside>
        </div>
      </form>

      <SiteFooter />
    </main>
  );
}

function Block({
  title,
  children,
  error,
}: {
  title: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="p-6 sm:p-8 rounded-[2.5rem] bg-white border border-brand-text/10">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-serif text-xl">{title}</h2>
        {error && <span className="text-xs text-brand-primary font-medium">{error}</span>}
      </div>
      {children}
    </div>
  );
}

function Choice({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-5 rounded-[1.8rem] border transition-all active:scale-[0.98] ${
        active
          ? "bg-brand-primary text-white border-brand-primary"
          : "bg-brand-muted/40 border-brand-text/10 hover:border-brand-primary"
      }`}
    >
      <div className="font-serif text-lg">{title}</div>
      <div className={`text-xs mt-1 ${active ? "text-white/75" : "text-brand-text/55"}`}>{sub}</div>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-brand-text/55 mb-2">
        {label}{" "}
        {error && <span className="text-brand-primary normal-case tracking-normal">· {error}</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className={`w-full rounded-full bg-brand-muted/50 border px-5 py-3.5 text-sm focus:outline-none focus:bg-white ${error ? "border-brand-primary" : "border-brand-text/10 focus:border-brand-primary"}`}
      />
    </label>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="opacity-60">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-brand-text/10 pb-3 last:border-0">
      <span className="text-xs uppercase tracking-widest text-brand-text/55">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
