import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";

export const Route = createFileRoute("/demande")({
  head: () => ({
    meta: [
      { title: "Demande sur mesure · Magic Crochet" },
      {
        name: "description",
        content:
          "Commandez une pièce crochet personnalisée chez Magic Crochet. Décrivez votre idée, nous la créons à la main à Casablanca.",
      },
      { property: "og:title", content: "Demande sur mesure · Magic Crochet" },
      { property: "og:description", content: "Votre pièce unique, crochetée à la main au Maroc." },
    ],
    links: [{ rel: "canonical", href: "https://magic-crochet.com/demande" }],
  }),
  component: DemandePage,
});

const PRODUCT_TYPES = [
  { value: "sac", label: "Sac / Cabas" },
  { value: "chapeau", label: "Chapeau / Bob" },
  { value: "panier", label: "Panier / Rangement" },
  { value: "deco", label: "Décoration" },
  { value: "autre", label: "Autre" },
] as const;

const SIZES = [
  { value: "petit", label: "Petit" },
  { value: "moyen", label: "Moyen" },
  { value: "grand", label: "Grand" },
] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80),
  email: z.string().trim().email("E-mail invalide").max(160),
  phone: z
    .string()
    .trim()
    .min(6, "Téléphone invalide")
    .max(20)
    .regex(/^[0-9+\s().-]+$/, "Caractères invalides"),
  productType: z.string().min(1, "Choisissez un type de produit"),
  size: z.string().min(1, "Choisissez une taille"),
  color: z.string().trim().max(100).optional(),
  quantity: z.number().int().min(1).max(20),
  description: z.string().trim().min(10, "Décrivez votre projet (min. 10 caractères)").max(1000),
  budget: z.string().max(50).optional(),
});

type FormState = z.infer<typeof schema>;

function DemandePage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    productType: "",
    size: "",
    color: "",
    quantity: 1,
    description: "",
    budget: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [sent, setSent] = useState(false);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Création sur mesure · Magic Crochet",
    description:
      "Commandez une pièce crochet personnalisée. Décrivez votre idée, nous la créons à la main à Casablanca.",
    provider: {
      "@type": "Organization",
      name: "Magic Crochet",
    },
    areaServed: {
      "@type": "City",
      name: "Casablanca",
    },
  };

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function onSubmit(e: React.FormEvent) {
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
    setSent(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (sent) {
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
              Demande reçue
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight italic mb-6">
              Merci {form.name.split(" ")[0]},<br />
              on prépare votre devis.
            </h1>
            <p className="text-lg text-brand-text/65 mb-10">
              Votre demande a été enregistrée. Notre équipe vous contactera sous 48h avec un devis
              personnalisé à <span className="font-medium text-brand-text">{form.email}</span>.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setForm({
                  name: "",
                  email: "",
                  phone: "",
                  productType: "",
                  size: "",
                  color: "",
                  quantity: 1,
                  description: "",
                  budget: "",
                });
              }}
              className="mt-6 inline-flex items-center gap-2 bg-brand-text text-white pl-6 pr-2 py-2 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors active:scale-95"
            >
              Nouvelle demande
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
            Sur mesure
          </p>
          <h1 className="font-serif text-5xl sm:text-7xl leading-[0.9] tracking-tighter text-balance">
            Votre pièce <span className="italic text-brand-primary">idéale.</span>
          </h1>
          <p className="mt-6 text-lg text-brand-text/65 max-w-xl">
            Décrivez votre projet, choisissez vos préférences, nous le créerons à la main dans
            notre atelier de Casablanca.
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="px-6 pb-32" noValidate>
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-8">
          {/* Left: form */}
          <div className="lg:col-span-3 space-y-8">
            {/* Product type */}
            <Block title="Type de produit" error={errors.productType}>
              <div className="flex flex-wrap gap-3">
                {PRODUCT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update("productType", t.value)}
                    className={`px-5 py-3 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                      form.productType === t.value
                        ? "bg-brand-primary text-white border-brand-primary"
                        : "bg-white border-brand-text/10 hover:border-brand-primary"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Block>

            {/* Size + Color */}
            <Block title="Dimensions & couleur">
              <div className="space-y-4">
                <div>
                  <span className="block text-xs uppercase tracking-widest text-brand-text/55 mb-3">
                    Taille
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {SIZES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => update("size", s.value)}
                        className={`px-7 py-3 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                          form.size === s.value
                            ? "bg-brand-text text-white border-brand-text"
                            : "bg-white border-brand-text/10 hover:border-brand-primary"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="block text-xs uppercase tracking-widest text-brand-text/55 mb-2">
                    Couleur(s) souhaitée(s)
                  </span>
                  <input
                    type="text"
                    value={form.color ?? ""}
                    onChange={(e) => update("color", e.target.value)}
                    maxLength={100}
                    className="w-full rounded-full bg-brand-muted/50 border border-brand-text/10 px-5 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-brand-primary"
                    placeholder="Ex : terracotta, crème, mélange rose et bordeaux…"
                  />
                </label>
              </div>
            </Block>

            {/* Quantity */}
            <Block title="Quantité">
              <div className="inline-flex items-center bg-white rounded-full border border-brand-text/10 p-1">
                <button
                  type="button"
                  onClick={() => update("quantity", Math.max(1, form.quantity - 1))}
                  className="size-11 grid place-items-center rounded-full hover:bg-brand-muted active:scale-90"
                  aria-label="Moins"
                >
                  −
                </button>
                <span className="w-12 text-center font-serif text-2xl">{form.quantity}</span>
                <button
                  type="button"
                  onClick={() => update("quantity", Math.min(20, form.quantity + 1))}
                  className="size-11 grid place-items-center rounded-full hover:bg-brand-muted active:scale-90"
                  aria-label="Plus"
                >
                  +
                </button>
              </div>
            </Block>

            {/* Description */}
            <Block title="Décrivez votre projet" error={errors.description}>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                maxLength={1000}
                rows={5}
                className="w-full rounded-[1.6rem] bg-brand-muted/50 border border-brand-text/10 px-5 py-4 text-sm focus:outline-none focus:bg-white focus:border-brand-primary resize-none"
                placeholder="Décrivez la pièce que vous imaginez, forme, motifs, usage, inspiration…"
              />
              <div className="flex justify-between mt-1">
                {errors.description && (
                  <span className="text-xs text-brand-primary">{errors.description}</span>
                )}
                <span className="text-[10px] text-brand-text/40 ml-auto">
                  {form.description.length}/1000
                </span>
              </div>
            </Block>

            {/* Budget */}
            <Block title="Budget estimé (optionnel)">
              <input
                type="text"
                value={form.budget ?? ""}
                onChange={(e) => update("budget", e.target.value)}
                maxLength={50}
                className="w-full rounded-full bg-brand-muted/50 border border-brand-text/10 px-5 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-brand-primary"
                placeholder="Ex : 500 - 800 DH"
              />
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
            </Block>
          </div>

          {/* Right: summary */}
          <aside className="lg:col-span-2">
            <div className="lg:sticky lg:top-32 p-8 rounded-[2.5rem] bg-brand-text text-white space-y-6 shadow-[0_30px_70px_-30px_rgba(28,25,23,0.4)]">
              <p className="text-[11px] uppercase tracking-[0.3em] text-brand-accent font-medium">
                Récapitulatif
              </p>
              <h3 className="font-serif text-3xl italic leading-tight">
                {form.productType
                  ? PRODUCT_TYPES.find((t) => t.value === form.productType)?.label
                  : "Votre projet"}
              </h3>
              <dl className="space-y-3 text-sm">
                <SumRow
                  label="Taille"
                  value={form.size ? SIZES.find((s) => s.value === form.size)?.label || "" : "–"}
                />
                <SumRow label="Couleur" value={form.color || "–"} />
                <SumRow label="Quantité" value={String(form.quantity)} />
                <SumRow label="Budget" value={form.budget || "–"} />
              </dl>
              <button
                type="submit"
                className="w-full bg-brand-primary text-white py-4 rounded-full text-sm font-semibold hover:bg-brand-accent hover:text-brand-text transition-colors active:scale-[0.98]"
              >
                Envoyer ma demande
              </button>
              <p className="text-[11px] opacity-50 leading-relaxed">
                Devis gratuit sous 48h. Paiement à la livraison.
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
