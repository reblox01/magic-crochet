import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { submitContact } from "@/routes/api/-contact";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact - Magic Crochet" },
      {
        name: "description",
        content:
          "Contactez Magic Crochet pour vos commandes, ateliers ou partenariats. Atelier basé à Casablanca, Maroc.",
      },
      { property: "og:title", content: "Contact · Magic Crochet" },
      { property: "og:description", content: "Écrivez-nous, atelier à Casablanca." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://magic-crochet.com/og.png" },
      { property: "og:url", content: "https://magic-crochet.com/contact" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://magic-crochet.com/og.png" },
    ],
    links: [{ rel: "canonical", href: "https://magic-crochet.com/contact" }],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80),
  email: z.string().trim().email("E-mail invalide").max(160),
  subject: z.enum(["commande", "atelier", "partenariat", "autre"]),
  message: z.string().trim().min(10, "Message trop court").max(1000),
});

type FormState = z.infer<typeof schema>;

const SUBJECTS: { value: FormState["subject"]; label: string }[] = [
  { value: "commande", label: "Une commande" },
  { value: "atelier", label: "Un atelier" },
  { value: "partenariat", label: "Un partenariat" },
  { value: "autre", label: "Autre" },
];

function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: "commande",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value").eq("key", "site").single();
      if (error || !data?.value) return null;
      return data.value as Record<string, string>;
    },
  });

  const location = settings?.location ?? "";
  const email = settings?.business_email ?? "";
  const phone = settings?.business_phone ?? "";
  const instagram = settings?.instagram ?? "";
  const instagramHandle = instagram.replace("@", "");

  const showLocation = String(settings?.show_location) !== "false";
  const showEmail = String(settings?.show_email) !== "false";
  const showPhone = String(settings?.show_phone) !== "false";
  const showInstagram = String(settings?.show_instagram) !== "false";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Magic Crochet",
    description:
      "Magic Crochet transforme les textiles recyclés en pièces de crochet contemporaines et en ateliers émancipateurs au Maroc.",
    address: {
      "@type": "PostalAddress",
      addressLocality: location || "Casablanca",
      addressCountry: "MA",
    },
    email: email || undefined,
    url: "https://magic-crochet.com",
    sameAs: instagramHandle ? [`https://www.instagram.com/${instagramHandle}/`] : [],
  };

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
      await submitContact({ data: res.data });
      setSent(true);
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

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <SiteNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="pt-36 sm:pt-44 pb-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16">
          <div className="space-y-10">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-5">
                Contact
              </p>
              <h1 className="font-serif text-5xl sm:text-6xl leading-[0.9] tracking-tighter text-balance">
                Disons <span className="italic text-brand-primary">bonjour.</span>
              </h1>
              <p className="mt-6 text-lg text-brand-text/65">
                Pour une commande, un atelier privé ou simplement nous saluer, on répond toujours.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {showLocation && location && (
                <InfoCard
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  }
                  label="Atelier"
                  value={location}
                />
              )}
              {showEmail && email && (
                <InfoCard
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 5h16v14H4z" />
                      <path d="M4 7l8 6 8-6" />
                    </svg>
                  }
                  label="E-mail"
                  value={email}
                  href={`mailto:${email}`}
                />
              )}
              {showPhone && phone && (
                <InfoCard
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  }
                  label="Téléphone"
                  value={phone}
                  href={`tel:${phone.replace(/\s/g, "")}`}
                />
              )}
              {showInstagram && instagram && (
                <InfoCard
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                    </svg>
                  }
                  label="Instagram"
                  value={instagram}
                  href={`https://www.instagram.com/${instagramHandle}/`}
                />
              )}
            </div>
          </div>

          <div>
            {sent ? (
              <div className="p-10 sm:p-12 rounded-[2.5rem] bg-brand-text text-white animate-reveal">
                <div className="size-16 rounded-full bg-brand-primary grid place-items-center mb-6">
                  <svg
                    width="26"
                    height="26"
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
                <h2 className="font-serif text-4xl italic mb-4">Message envoyé.</h2>
                <p className="text-white/70 text-lg">
                  Merci {form.name.split(" ")[0]}, nous reviendrons vers vous à{" "}
                  <span className="text-brand-accent">{form.email}</span> sous 24h.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setForm({ name: "", email: "", subject: "commande", message: "" });
                  }}
                  className="mt-8 bg-white text-brand-text px-6 py-3 rounded-full text-sm font-semibold hover:bg-brand-accent transition-colors active:scale-95"
                >
                  Écrire à nouveau
                </button>
              </div>
            ) : (
              <form
                onSubmit={onSubmit}
                noValidate
                className="p-6 sm:p-10 rounded-[2.5rem] bg-white border border-brand-text/10 space-y-6"
              >
                <div>
                  <span className="block text-xs uppercase tracking-widest text-brand-text/55 mb-3">
                    Je veux parler de…
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, subject: s.value }))}
                        className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                          form.subject === s.value
                            ? "bg-brand-primary text-white border-brand-primary"
                            : "bg-brand-muted/40 border-brand-text/10 hover:border-brand-primary"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    label="Nom"
                    value={form.name}
                    onChange={(v) => {
                      setForm((f) => ({ ...f, name: v }));
                      setErrors((e) => ({ ...e, name: undefined }));
                    }}
                    maxLength={80}
                    error={errors.name}
                  />
                  <FormField
                    label="E-mail"
                    type="email"
                    value={form.email}
                    onChange={(v) => {
                      setForm((f) => ({ ...f, email: v }));
                      setErrors((e) => ({ ...e, email: undefined }));
                    }}
                    maxLength={160}
                    error={errors.email}
                  />
                </div>

                <label className="block">
                  <span className="block text-xs uppercase tracking-widest text-brand-text/55 mb-2">
                    Message{" "}
                    {errors.message && (
                      <span className="text-brand-primary normal-case tracking-normal">
                        · {errors.message}
                      </span>
                    )}
                  </span>
                  <textarea
                    value={form.message}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({ ...f, message: v }));
                      setErrors((er) => ({ ...er, message: undefined }));
                    }}
                    maxLength={1000}
                    rows={6}
                    className={`w-full rounded-[1.6rem] bg-brand-muted/40 border px-5 py-4 text-sm focus:outline-none focus:bg-white resize-none ${errors.message ? "border-brand-primary" : "border-brand-text/10 focus:border-brand-primary"}`}
                    placeholder="Dites-nous tout…"
                  />
                  <span className="block mt-1 text-[10px] text-brand-text/40 text-right">
                    {form.message.length}/1000
                  </span>
                </label>

                {serverError && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-600">
                    {serverError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center bg-brand-text text-white py-4 rounded-full text-sm font-semibold hover:bg-brand-primary transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Envoi…" : "Envoyer le message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-4 p-5 rounded-[1.8rem] bg-brand-muted/60 border border-brand-text/5 hover:border-brand-primary/40 transition-colors">
      <span className="size-11 rounded-full bg-brand-primary text-white grid place-items-center shrink-0">
        {icon}
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-brand-text/50">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
  if (href)
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel="noreferrer noopener"
      >
        {inner}
      </a>
    );
  return inner;
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
  error?: string;
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
        className={`w-full rounded-full bg-brand-muted/40 border px-5 py-3.5 text-sm focus:outline-none focus:bg-white ${error ? "border-brand-primary" : "border-brand-text/10 focus:border-brand-primary"}`}
      />
    </label>
  );
}
