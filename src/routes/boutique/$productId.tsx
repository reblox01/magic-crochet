import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { supabase } from "@/lib/supabase";
import { useCart, formatMAD } from "@/lib/cart";

export const Route = createFileRoute("/boutique/$productId")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const { add, setOpen } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      // Try slug first, fallback to id
      let { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", productId)
        .single();
      if (error || !data) {
        const result = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();
        data = result.data;
        error = result.error;
      }
      if (error || !data) throw error;
      return data as {
        id: string;
        name: string;
        description: string | null;
        price: number;
        image: string | null;
        images: string[];
        slug: string | null;
        category: string;
        materials: string | null;
        dimensions: string | null;
        in_stock: boolean;
        is_active: boolean;
      };
    },
  });

  const { data: related } = useQuery({
    queryKey: ["related-products", productId, product?.category],
    queryFn: async () => {
      if (!product?.category) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, description, price, image, category, in_stock")
        .eq("category", product.category)
        .neq("id", productId)
        .eq("is_active", true)
        .limit(3);
      return data ?? [];
    },
    enabled: !!product?.category,
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
        <SiteNav />
        <section className="pt-40 pb-32 px-6 text-center">
          <div className="size-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </section>
        <SiteFooter />
      </main>
    );
  }

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

  const allImages = [product.image, ...(product.images ?? [])].filter(Boolean) as string[];
  const displayImg = selectedImg ?? product.image ?? "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: allImages,
    url: `https://magic-crochet.com/boutique/${product.id}`,
    brand: { "@type": "Organization", name: "Magic Crochet" },
    category: product.category ?? "Artisanat",
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
          {/* Image gallery */}
          <div className="space-y-4">
            <div className="relative rounded-[3rem] overflow-hidden aspect-[3/4] bg-brand-muted">
              {displayImg ? (
                <img src={displayImg} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-brand-text/20 font-serif italic">Aucune image</div>
              )}
              {product.category && (
                <div className="absolute top-6 left-6 glass bg-white/85 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest">
                  {product.category}
                </div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(img)}
                    className={`shrink-0 size-20 rounded-xl overflow-hidden border-2 transition-all ${
                      (selectedImg ?? product.image) === img
                        ? "border-brand-primary scale-105"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:py-8 space-y-8">
            <div>
              <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[0.9] tracking-tight">
                {product.name}
              </h1>
              <p className="mt-4 text-lg text-brand-text/65">{product.category}</p>
            </div>

            <div className="font-serif text-4xl text-brand-primary">{formatMAD(product.price)}</div>

            {product.description && (
              <p className="text-base text-brand-text/75 leading-relaxed max-w-lg">
                {product.description}
              </p>
            )}

            {(product.materials || product.dimensions) && (
              <div className="space-y-0 border-t border-brand-text/10">
                {product.materials && (
                  <div className="flex gap-6 py-4 border-b border-brand-text/10">
                    <span className="text-xs uppercase tracking-widest text-brand-text/45 w-28 shrink-0 pt-0.5">Matériaux</span>
                    <span className="text-sm text-brand-text/75">{product.materials}</span>
                  </div>
                )}
                {product.dimensions && (
                  <div className="flex gap-6 py-4 border-b border-brand-text/10">
                    <span className="text-xs uppercase tracking-widest text-brand-text/45 w-28 shrink-0 pt-0.5">Dimensions</span>
                    <span className="text-sm text-brand-text/75">{product.dimensions}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  add({
                    id: product.id,
                    name: product.name,
                    sub: product.category ?? "",
                    description: product.description ?? "",
                    materials: product.materials ?? "",
                    dimensions: product.dimensions ?? "",
                    price: product.price,
                    img: product.image ?? "",
                    images: product.images ?? [],
                  });
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
              <Link
                to="/demande"
                search={{ product: product.name, type: product.category === "deco" ? "deco" : product.category === "chapeau" ? "chapeau" : "sac" }}
                className="inline-flex items-center gap-2 border border-brand-text/15 bg-white/40 px-6 py-3 rounded-full text-sm font-medium hover:bg-brand-text hover:text-white transition-colors"
              >
                Demander sur mesure
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Related products */}
      {related && related.length > 0 && (
        <section className="px-6 pb-32">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-3xl sm:text-4xl mb-10">Vous aimerez aussi</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {related.map((p) => (
                <Link key={p.id} to="/boutique/$productId" params={{ productId: p.slug || p.id }}>
                  <article className="group">
                    <div className="relative overflow-hidden rounded-[2.5rem] aspect-[3/4] mb-5 bg-brand-muted">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-brand-text/20 font-serif italic text-sm">Aucune image</div>
                      )}
                    </div>
                    <div className="flex justify-between items-start px-1 gap-4">
                      <div className="min-w-0">
                        <h3 className="font-serif text-2xl truncate">{p.name}</h3>
                        <p className="text-sm text-brand-text/55">{p.category}</p>
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
