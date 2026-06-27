import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";

export const Route = createFileRoute("/atelier")({
  head: () => ({
    meta: [
      { title: "Atelier - Magic Crochet" },
      { name: "description", content: "Découvrez l'univers de l'atelier Magic Crochet : nos créations, nos artisanes et nos coulisses à Casablanca." },
      { property: "og:title", content: "Atelier · Magic Crochet" },
      { property: "og:description", content: "Coulisses de l'atelier Magic Crochet à Casablanca." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://magic-crochet.com/og.png" },
      { property: "og:url", content: "https://magic-crochet.com/atelier" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://magic-crochet.com/og.png" },
    ],
    links: [{ rel: "canonical", href: "https://magic-crochet.com/atelier" }],
  }),
  component: AtelierPage,
});

type GalleryImage = {
  id: string;
  title: string | null;
  image_url: string;
  category: string;
};

const CATEGORIES = ["all", "general", "atelier", "products", "events", "team"] as const;

function AtelierPage() {
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>("all");

  const { data: images, isLoading } = useQuery({
    queryKey: ["gallery", filter],
    queryFn: async () => {
      let q = supabase.from("gallery_images").select("id, title, image_url, category").eq("is_active", true).order("sort_order", { ascending: true }).limit(12);
      if (filter !== "all") q = q.eq("category", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <SiteNav />

      <header className="pt-36 sm:pt-44 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-5">
            L'atelier
          </p>
          <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl leading-[0.9] tracking-tighter text-balance">
            Derrière <span className="italic text-brand-primary">chaque maille.</span>
          </h1>
          <p className="mt-6 text-lg text-brand-text/65 max-w-xl">
            Coulisses de notre atelier à Casablanca : nos créations, nos artisanes et nos moments forts.
          </p>

          <div className="mt-10 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                  filter === c
                    ? "bg-brand-text text-white border-brand-text"
                    : "bg-white text-brand-text/70 border-brand-text/10 hover:border-brand-primary hover:text-brand-primary"
                }`}
              >
                {c === "all" ? "Tout" : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="px-6 pb-32">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-[2rem] bg-brand-muted animate-pulse" />
              ))}
            </div>
          ) : images?.length === 0 ? (
            <div className="text-center py-24 text-brand-text/30">
              <p className="font-serif text-3xl italic">Aucune image pour le moment.</p>
              <p className="text-sm mt-2">Nos coulisses arrivent bientôt.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images?.map((img, i) => (
                <figure
                  key={img.id}
                  className={`group relative overflow-hidden rounded-[2rem] ${
                    i % 5 === 0 ? "md:col-span-2 md:row-span-2 aspect-[4/3]" : "aspect-square"
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt={img.title ?? ""}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  {img.title && (
                    <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-serif text-xl italic">{img.title}</p>
                    </div>
                  )}
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
