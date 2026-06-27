import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { useCart, formatMAD } from "@/lib/cart";
import { orderCreate } from "@/routes/api/-orders";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
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

function CheckoutPage() {
  const { items, total, count, clear } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const { data: checkoutFields = [] } = useQuery({
    queryKey: ["checkout-fields"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "site")
        .single();
      const raw = data?.value as { checkout_fields?: CheckoutField[] } | null;
      return (raw?.checkout_fields ?? []).sort((a, b) => a.order - b.order);
    },
  });

  function setCustom(fieldId: string, value: string) {
    setCustomValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  if (count === 0 && !done) {
    return (
      <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
        <SiteNav />
        <section className="pt-40 pb-32 px-6 text-center">
          <h1 className="font-serif text-5xl sm:text-6xl italic">Votre panier est vide</h1>
          <p className="mt-6 text-lg text-brand-text/65">Ajoutez des produits avant de commander.</p>
          <Link
            to="/boutique"
            className="mt-8 inline-flex items-center gap-2 bg-brand-text text-white pl-6 pr-2 py-2 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors"
          >
            Voir la boutique
            <span className="grid place-items-center size-9 rounded-full bg-brand-primary text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
        <SiteNav />
        <section className="pt-40 pb-32 px-6 text-center">
          <div className="size-20 rounded-full bg-brand-primary text-white grid place-items-center mx-auto mb-8">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl italic">Commande envoyée !</h1>
          <p className="mt-6 text-lg text-brand-text/65 max-w-xl mx-auto">
            Merci {name.split(" ")[0]} ! Nous avons bien reçu votre commande. Nous vous recontacterons très vite par email pour confirmer les détails.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 bg-brand-text text-white pl-6 pr-2 py-2 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors"
          >
            Retour à l'accueil
            <span className="grid place-items-center size-9 rounded-full bg-brand-primary text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Nom et email requis.");
      return;
    }
    // Validate required custom fields
    for (const field of checkoutFields) {
      if (field.required) {
        const val = customValues[field.id] ?? "";
        if (field.type === "checkbox") {
          if (val !== "true") {
            toast.error(`Le champ "${field.label}" est requis.`);
            return;
          }
        } else if (!val.trim()) {
          toast.error(`Le champ "${field.label}" est requis.`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      // Append custom fields to notes
      let allNotes = notes.trim();
      const customParts: string[] = [];
      for (const field of checkoutFields) {
        const val = customValues[field.id];
        if (val !== undefined && val !== "") {
          const display = field.type === "checkbox" ? (val === "true" ? "Oui" : "Non") : val;
          customParts.push(`${field.label}: ${display}`);
        }
      }
      if (customParts.length > 0) {
        allNotes = allNotes ? allNotes + "\n\n" + customParts.join("\n") : customParts.join("\n");
      }
      await orderCreate({
        data: {
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim() || null,
          items: items.map((it) => ({ id: it.id, name: it.name, price: it.price, qty: it.qty })),
          notes: allNotes || null,
          total_amount: total,
        },
      });
      clear();
      setDone(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-xl bg-white border border-brand-text/10 px-4 py-3 text-sm focus:outline-none focus:border-brand-primary transition-colors";

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <SiteNav />

      <header className="pt-36 sm:pt-44 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <nav className="text-xs uppercase tracking-widest text-brand-text/50 mb-8">
            <Link to="/boutique" className="hover:text-brand-primary transition-colors">Boutique</Link>
            <span className="mx-2">/</span>
            <span className="text-brand-text">Commande</span>
          </nav>
          <h1 className="font-serif text-5xl sm:text-7xl tracking-tighter">Finaliser la commande</h1>
        </div>
      </header>

      <section className="px-6 pb-32">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-brand-text/55 mb-2">Nom complet *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Votre nom"
                required
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-brand-text/55 mb-2">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="vous@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-brand-text/55 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+212 ..."
                />
              </div>
            </div>

            {/* Custom fields */}
            {checkoutFields.map((field) => (
              <div key={field.id}>
                {field.type === "checkbox" ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customValues[field.id] === "true"}
                      onChange={(e) => setCustom(field.id, e.target.checked ? "true" : "false")}
                      className="accent-brand-primary size-4"
                    />
                    <span className="text-sm text-brand-text">{field.label}{field.required && " *"}</span>
                  </label>
                ) : (
                  <>
                    <label className="block text-xs uppercase tracking-widest text-brand-text/55 mb-2">
                      {field.label}{field.required && " *"}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        value={customValues[field.id] ?? ""}
                        onChange={(e) => setCustom(field.id, e.target.value)}
                        rows={3}
                        placeholder={field.placeholder}
                        required={field.required}
                        className={`${inputClass} resize-none`}
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={customValues[field.id] ?? ""}
                        onChange={(e) => setCustom(field.id, e.target.value)}
                        required={field.required}
                        className={inputClass}
                      >
                        <option value="">{field.placeholder || "Sélectionnez…"}</option>
                        {field.options.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={customValues[field.id] ?? ""}
                        onChange={(e) => setCustom(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className={inputClass}
                      />
                    )}
                  </>
                )}
              </div>
            ))}

            <div>
              <label className="block text-xs uppercase tracking-widest text-brand-text/55 mb-2">Notes (optionnel)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Précisions sur la commande, couleur souhaitée, taille..."
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-brand-text text-white py-4 rounded-full text-sm font-semibold hover:bg-brand-primary transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Envoi en cours…" : `Envoyer la commande · ${formatMAD(total)}`}
            </button>
            <p className="text-xs text-center text-brand-text/40">
              Paiement à la livraison. Nous vous recontacterons pour confirmer.
            </p>
          </form>

          {/* Order summary */}
          <div className="lg:py-8">
            <div className="p-6 sm:p-8 rounded-[2.5rem] bg-brand-muted/60 border border-brand-text/5 space-y-4">
              <h2 className="font-serif text-2xl italic mb-4">Récapitulatif</h2>
              {items.map((it) => (
                <div key={it.id} className="flex gap-4 items-center">
                  <img src={it.img} alt={it.name} className="size-16 rounded-2xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{it.name}</p>
                    <p className="text-xs text-brand-text/55">Qté {it.qty} × {formatMAD(it.price)}</p>
                  </div>
                  <span className="font-medium shrink-0">{formatMAD(it.price * it.qty)}</span>
                </div>
              ))}
              <div className="border-t border-brand-text/10 pt-4 mt-4 flex justify-between items-baseline">
                <span className="text-sm uppercase tracking-widest text-brand-text/55">Total</span>
                <span className="font-serif text-3xl">{formatMAD(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
