import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { PRODUCTS } from "@/lib/products";
import { useCart, formatMAD } from "@/lib/cart";

export const Route = createFileRoute("/boutique/")({
  component: BoutiqueIndexPage,
});

const FILTERS = ["Tout", "Maison", "Été", "Nouveau", "Édition limitée"] as const;

function BoutiqueIndexPage() {
  const { add, setOpen } = useCart();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Tout");
  const [added, setAdded] = useState<string | null>(null);

  const list = filter === "Tout" ? PRODUCTS : PRODUCTS.filter((p) => p.tag === filter);

  const jsonLdItems = list.map((p) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.img,
    brand: { "@type": "Organization", name: "Magic Crochet" },
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "MAD",
      availability: "https://schema.org/InStock",
    },
  }));

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <SiteNav />
      {jsonLdItems.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
      <header className="pt-36 sm:pt-44 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-5">
            La Boutique
          </p>
          <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl leading-[0.9] tracking-tighter text-balance">
            Chaque maille, <span className="italic text-brand-primary">une histoire.</span>
          </h1>
          <p className="mt-6 text-lg text-brand-text/65 max-w-xl">
            Pièces bouclées main au Maroc, à partir de t-shirts pré-aimés transformés en fil
            continu.
          </p>
          <div className="mt-10 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                  filter === f
                    ? "bg-brand-text text-white border-brand-text"
                    : "bg-white text-brand-text/70 border-brand-text/10 hover:border-brand-primary hover:text-brand-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="px-6 pb-32">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {list.length === 0 && (
            <div className="col-span-full py-24 text-center">
              <p className="font-serif text-3xl italic text-brand-text/40 mb-3">
                Aucune pièce dans cette catégorie
              </p>
              <p className="text-sm text-brand-text/50">
                Explorez notre collection complète ou demandez une création sur mesure.
              </p>
              <button
                type="button"
                onClick={() => setFilter("Tout")}
                className="mt-6 px-6 py-3 rounded-full bg-brand-text text-white text-sm font-medium hover:bg-brand-primary transition-colors active:scale-95"
              >
                Voir tout
              </button>
            </div>
          )}
          {list.map((p, i) => (
            <article key={p.id} className={`group ${i % 3 === 1 ? "lg:translate-y-10" : ""}`}>
              <Link to="/boutique/$productId" params={{ productId: p.id }}>
                <div className="relative overflow-hidden rounded-[2.5rem] aspect-[3/4] mb-5 bg-brand-muted">
                  <img
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  {p.tag && (
                    <div className="absolute top-5 left-5 glass bg-white/85 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {p.tag}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      add(p);
                      setAdded(p.id);
                      window.setTimeout(() => setAdded((c) => (c === p.id ? null : c)), 1400);
                    }}
                    className={`absolute bottom-5 right-5 flex items-center gap-2 pl-5 pr-2 py-2 rounded-full text-sm font-medium shadow-lg transition-all active:scale-95 ${
                      added === p.id
                        ? "bg-brand-primary text-white"
                        : "bg-brand-text text-white hover:bg-brand-primary opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                    }`}
                  >
                    {added === p.id ? "Ajouté ✓" : "Ajouter"}
                    {added !== p.id && (
                      <span className="grid place-items-center size-7 rounded-full bg-brand-accent text-brand-text">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
              </Link>
              <div className="flex justify-between items-start px-1 gap-4">
                <div className="min-w-0">
                  <h3 className="font-serif text-2xl truncate">{p.name}</h3>
                  <p className="text-sm text-brand-text/55">{p.sub}</p>
                </div>
                <span className="font-medium text-base whitespace-nowrap">
                  {formatMAD(p.price)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  add(p);
                  setOpen(true);
                }}
                className="sm:hidden mt-3 w-full bg-brand-muted text-brand-text py-3 rounded-full text-sm font-medium active:scale-[0.98]"
              >
                Ajouter au panier
              </button>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
