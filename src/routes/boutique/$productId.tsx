import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { PRODUCTS } from "@/lib/products";
import { useCart, formatMAD } from "@/lib/cart";

export const Route = createFileRoute("/boutique/$productId")({
  head: ({ params }) => {
    const product = PRODUCTS.find((p) => p.id === params.productId);
    if (!product) return { meta: [] };
    const productImage = `https://magic-crochet.com/products/${product.id}.jpg`;
    return {
      meta: [
        { title: `${product.name} - Magic Crochet` },
        { name: "description", content: product.description },
        { property: "og:title", content: `${product.name} · Magic Crochet` },
        { property: "og:description", content: product.description },
        { property: "og:type", content: "product" },
        { property: "og:image", content: productImage },
        { property: "og:url", content: `https://magic-crochet.com/boutique/${product.id}` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: productImage },
      ],
      links: [{ rel: "canonical", href: `https://magic-crochet.com/boutique/${product.id}` }],
    };
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const product = PRODUCTS.find((p) => p.id === productId);
  const { add, setOpen } = useCart();
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
        <SiteNav />
        <section className="pt-40 pb-32 px-6 text-center">
          <h1 className="font-serif text-5xl sm:text-6xl italic">Produit introuvable</h1>
          <p className="mt-6 text-lg text-brand-text/65">
            Ce produit n'existe pas ou a été déplacé.
          </p>
          <Link
            to="/boutique"
            className="mt-8 inline-flex items-center gap-2 bg-brand-text text-white pl-6 pr-2 py-2 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors"
          >
            Retour à la boutique
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
          </Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const related = PRODUCTS.filter((p) => p.id !== product.id && p.tag === product.tag).slice(0, 3);
  const fallbackRelated =
    related.length > 0 ? related : PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);

  const tagToCategory: Record<string, string> = {
    "Maison": "Maison & Décoration",
    "Drop 01": "Mode Accessoire",
    "Édition limitée": "Mode Accessoire",
    "Nouveau": "Mode Accessoire",
    "Été": "Mode Accessoire",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: `https://magic-crochet.com/products/${product.id}.jpg`,
    url: `https://magic-crochet.com/boutique/${product.id}`,
    brand: { "@type": "Organization", name: "Magic Crochet" },
    category: tagToCategory[product.tag ?? ""] ?? "Artisanat",
    itemCondition: "https://schema.org/NewCondition",
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "MAD",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Magic Crochet" },
    },
  };

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <SiteNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="pt-36 sm:pt-44 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <nav className="text-xs uppercase tracking-widest text-brand-text/50 mb-8">
            <Link to="/boutique" className="hover:text-brand-primary transition-colors">
              Boutique
            </Link>
            <span className="mx-2">/</span>
            <span className="text-brand-text">{product.name}</span>
          </nav>
        </div>
      </header>

      <section className="px-6 pb-32">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Image */}
          <div className="relative rounded-[3rem] overflow-hidden aspect-[3/4] bg-brand-muted">
            <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
            {product.tag && (
              <div className="absolute top-6 left-6 glass bg-white/85 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest">
                {product.tag}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:py-8 space-y-8">
            <div>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[0.9] tracking-tight">
                {product.name}
              </h1>
              <p className="mt-4 text-lg text-brand-text/65">{product.sub}</p>
            </div>

            <div className="font-serif text-4xl text-brand-primary">{formatMAD(product.price)}</div>

            <p className="text-base text-brand-text/75 leading-relaxed max-w-lg">
              {product.description}
            </p>

            <div className="space-y-3">
              <DetailRow label="Matériaux" value={product.materials} />
              <DetailRow label="Dimensions" value={product.dimensions} />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  add(product);
                  setAdded(true);
                  window.setTimeout(() => setAdded(false), 1400);
                }}
                className={`inline-flex items-center gap-2 pl-6 pr-2 py-3 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                  added
                    ? "bg-brand-primary text-white"
                    : "bg-brand-text text-white hover:bg-brand-primary"
                }`}
              >
                {added ? "Ajouté au panier ✓" : "Ajouter au panier"}
                <span className="grid place-items-center size-9 rounded-full bg-brand-primary text-white">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
              <Link
                to="/demande"
                search={{ product: product.name, type: product.tag === "Maison" ? "deco" : product.tag === "Été" ? "chapeau" : "sac" }}
                className="inline-flex items-center gap-2 border border-brand-text/15 bg-white/40 px-6 py-3 rounded-full text-sm font-medium hover:bg-brand-text hover:text-white transition-colors"
              >
                Demander sur mesure
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Related products */}
      {fallbackRelated.length > 0 && (
        <section className="px-6 pb-32">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-3xl sm:text-4xl mb-10">Vous aimerez aussi</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {fallbackRelated.map((p) => (
                <Link key={p.id} to="/boutique/$productId" params={{ productId: p.id }}>
                  <article className="group">
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
                    </div>
                    <div className="flex justify-between items-start px-1 gap-4">
                      <div className="min-w-0">
                        <h3 className="font-serif text-2xl truncate">{p.name}</h3>
                        <p className="text-sm text-brand-text/55">{p.sub}</p>
                      </div>
                      <span className="font-medium text-base whitespace-nowrap">
                        {formatMAD(p.price)}
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-4 py-3 border-b border-brand-text/8">
      <span className="text-xs uppercase tracking-widest text-brand-text/45 w-28 shrink-0">
        {label}
      </span>
      <span className="text-sm text-brand-text/75">{value}</span>
    </div>
  );
}
