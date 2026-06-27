import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { supabase } from "@/lib/supabase";

gsap.registerPlugin(ScrollTrigger);

import heroLoopAsset from "@/assets/hero-loop.mp4.asset.json";
import heroYarn from "@/assets/hero-yarn.jpg";
import productBag from "@/assets/product-bag.jpg";
import productHat from "@/assets/product-hat.jpg";
import productDecor from "@/assets/product-decor.jpg";
import processHands from "@/assets/process-hands.jpg";
import processStitches from "@/assets/process-stitches.jpg";
import atelier from "@/assets/atelier.jpg";

import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { useCart, formatMAD } from "@/lib/cart";
import { TextReveal } from "@/components/TextReveal";
import { ScrollMorphHero } from "@/components/ScrollMorphHero";
import { ReviewsMorphGallery } from "@/components/ReviewsMorphGallery";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Magic Crochet - Fil recyclé, art crocheté" },
      {
        name: "description",
        content:
          "Magic Crochet transforme les textiles recyclés en pièces de crochet contemporaines et en ateliers émancipateurs au Maroc. Découvrez la collection, nos ateliers et les artisanes derrière chaque maille.",
      },
      { property: "og:title", content: "Magic Crochet, histoires bouclées" },
      {
        property: "og:description",
        content:
          "Pièces de crochet faites main et ateliers nés du fil de t-shirts recyclés. Fabriqué à Casablanca.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://magic-crochet.com/og.png" },
      { property: "og:url", content: "https://magic-crochet.com/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://magic-crochet.com/og.png" },
    ],
    links: [{ rel: "canonical", href: "https://magic-crochet.com/" }],
  }),
  component: Index,
});

function Index() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value").eq("key", "site").single();
      if (error || !data?.value) return null;
      return (data.value as Record<string, unknown>) ?? {};
    },
  });

  const { data: galleryImages } = useQuery({
    queryKey: ["homepage-gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("image_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(12);
      if (error) return [];
      return (data ?? []).map((img) => img.image_url);
    },
  });

  const location = (settings?.location as string) ?? "";
  const instagram = (settings?.instagram as string) ?? "";
  const instagramHandle = instagram.replace("@", "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Magic Crochet",
    url: "https://magic-crochet.com",
    description:
      "Magic Crochet transforme les textiles recyclés en pièces de crochet contemporaines et en ateliers émancipateurs au Maroc.",
    address: {
      "@type": "PostalAddress",
      addressLocality: location || "Casablanca",
      addressCountry: "MA",
    },
    sameAs: instagramHandle ? [`https://www.instagram.com/${instagramHandle}/`] : [],
  };

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text font-sans overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav />
      <Hero settings={settings} />
      <Manifesto settings={settings} />
      <ImpactRibbon settings={settings} />
      <ScrollMorphHero images={galleryImages ?? []} />
      <ScrollStory />
      <Process />
      <Collection />
      <Workshops settings={settings} />
      <Partners />
      <Beneficiaries />
      <Reviews />
      <Community settings={settings} />
      <SiteFooter />
    </main>
  );
}

/* -------------------------------- HERO -------------------------------- */

function Hero({ settings }: { settings?: Record<string, unknown> | null }) {
  const heroStats = (settings?.hero_stats as Array<{ label: string; value: string; subtitle: string }>) ?? [
    { label: "Impact", value: "150 kg", subtitle: "de textile détourné" },
    { label: "Ateliers", value: "20+", subtitle: "sessions pilotes" },
    { label: "Communauté", value: "7 000+", subtitle: "sur Instagram" },
  ];
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.from(".hero-line", {
        yPercent: 110,
        opacity: 0,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.08,
        delay: 0.1,
      });
      gsap.from(".hero-sub", { opacity: 0, y: 24, duration: 1, delay: 0.6, ease: "expo.out" });
      gsap.from(".hero-chip", {
        opacity: 0,
        scale: 0.85,
        duration: 0.8,
        delay: 1,
        ease: "expo.out",
      });

      // Floating cards parallax (subtle upward drift, max 20px)
      gsap.utils.toArray<HTMLElement>(".floating-card").forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 40 + i * 10 },
          {
            opacity: 1,
            y: 0,
            ease: "expo.out",
            duration: 1,
            delay: 1.2 + i * 0.15,
          },
        );
        gsap.to(card, {
          y: -10 - i * 5,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // Hero video ping-pong (forward ↔ reverse ↔ forward) — seamless, no gap
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let direction = 1; // 1 = forward, -1 = reverse
    let lastTime = performance.now();
    let raf: number;

    const tick = (now: number) => {
      if (!video.duration) {
        lastTime = now;
        raf = requestAnimationFrame(tick);
        return;
      }

      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (direction === 1) {
        // Forward: let native playback handle it
        if (video.currentTime >= video.duration - 0.05) {
          direction = -1;
          video.pause();
        }
      } else {
        // Reverse: manually step backward for smooth rewind
        video.currentTime = Math.max(0, video.currentTime - dt * 1.5);
        if (video.currentTime <= 0.05) {
          direction = 1;
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      }

      raf = requestAnimationFrame(tick);
    };

    video.playbackRate = 1;
    video.play().catch(() => {});
    raf = requestAnimationFrame(tick);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (direction === 1) video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(video);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-brand-bg"
    >
      <img
        src={heroYarn}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      <video
        ref={videoRef}
        src="/ressources/hero.mp4"
        muted
        playsInline
        onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/55 via-brand-bg/30 to-brand-bg/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(253,252,251,0.55)_75%)]" />

      {/* Floating soft shapes */}
      <div
        aria-hidden
        className="absolute -top-20 -left-20 size-72 rounded-full bg-brand-accent/30 blur-3xl animate-float-slow"
      />
      <div
        aria-hidden
        className="absolute bottom-10 -right-16 size-80 rounded-full bg-brand-primary/20 blur-3xl animate-float-slower"
      />

      <div className="relative z-10 px-6 text-center max-w-5xl pt-24">
        <h1 className="font-serif leading-[0.88] tracking-tighter text-balance text-[clamp(3.75rem,12vw,9rem)]">
          <span className="block overflow-hidden">
            <span className="hero-line block">Histoires</span>
          </span>
          <span className="block overflow-hidden">
            <span className="hero-line block italic text-brand-primary">bouclées,</span>
          </span>
          <span className="block overflow-hidden">
            <span className="hero-line block">fil recyclé.</span>
          </span>
        </h1>
        <p className="hero-sub mt-8 max-w-xl mx-auto text-lg sm:text-xl text-brand-text/70 leading-relaxed">
          Magic Crochet boucle les textiles oubliés en objets contemporains et en ateliers
          émancipateurs, un mouvement artisanal marocain, une maille à la fois.
        </p>
        <div className="hero-sub mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/boutique"
            className="group inline-flex items-center gap-2 bg-brand-text text-white pl-6 pr-2 py-2 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors active:scale-[0.97]"
          >
            Explorer la collection
            <span className="grid place-items-center size-9 rounded-full bg-brand-primary text-white transition-transform group-hover:translate-x-0.5">
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
          <Link
            to="/reserver"
            className="inline-flex items-center gap-2 border border-brand-text/15 bg-white/40 backdrop-blur px-6 py-3 rounded-full text-sm font-medium hover:bg-brand-text hover:text-white transition-colors active:scale-[0.97]"
          >
            Rejoindre un atelier
          </Link>
        </div>
      </div>

      {/* Floating content cards, parallax over video */}
      <div ref={cardsRef} className="absolute inset-0 pointer-events-none z-20 hidden lg:block">
        {heroStats.map((stat, i) => (
          <div key={i} className={`floating-card absolute max-w-[220px] p-5 rounded-[1.8rem] bg-white/80 backdrop-blur-md border border-brand-text/5 shadow-[0_20px_50px_-15px_rgba(28,25,23,0.15)] ${i === 0 ? "top-[15%] left-[5%]" : i === 1 ? "top-[25%] right-[8%]" : "bottom-[20%] left-[8%]"}`}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-primary font-medium mb-1">{stat.label}</p>
            <p className="font-serif text-2xl text-brand-text">{stat.value}</p>
            <p className="text-xs text-brand-text/55">{stat.subtitle}</p>
          </div>
        ))}
      </div>

    </section>
  );
}

/* ----------------------------- MANIFESTO ----------------------------- */

function Manifesto({ settings }: { settings?: Record<string, unknown> | null }) {
  const manifesteStats = (settings?.manifeste_stats as Array<{ value: string; label: string }>) ?? [
    { value: "150 kg", label: "Textile détourné" },
    { value: "6 000 DH", label: "Redistribués" },
    { value: "3", label: "Bénéficiaires directes" },
    { value: "300+", label: "Vies touchées" },
  ];
  return (
    <section className="relative py-28 sm:py-40 px-6 bg-brand-bg">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-20 items-end">
        <div className="lg:col-span-7 space-y-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium">
            01. Manifeste
          </p>
          <TextReveal>
            <h2 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-balance">
              Du <span className="italic">fil jeté</span> au design digne.
            </h2>
          </TextReveal>
          <p className="text-lg sm:text-xl text-brand-text/65 max-w-xl leading-relaxed">
            Nous détournons les vieux t-shirts de la décharge, nous les filons à la main et nous les
            bouclons en sacs, décoration et accessoires. Chaque pièce finance un salaire juste pour
            des femmes qui reprennent leur indépendance.
          </p>
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-5">
          {manifesteStats.map((stat, i) => (
            <Stat key={i} value={stat.value} label={stat.label} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-6 rounded-[2rem] border border-brand-text/10 bg-brand-muted/40 hover:bg-brand-muted/70 hover:-translate-y-1 transition-all duration-500">
      <div className="font-serif text-3xl sm:text-4xl text-brand-primary">{value}</div>
      <div className="mt-2 text-xs uppercase tracking-widest text-brand-text/55">{label}</div>
    </div>
  );
}

/* --------------------------- IMPACT RIBBON --------------------------- */

function ImpactRibbon({ settings }: { settings?: Record<string, unknown> | null }) {
  const topRow = [
    "ODD 1 · Réduire la pauvreté",
    "ODD 5 · Égalité des genres",
    "ODD 8 · Travail décent",
    "ODD 12 · Consommation responsable",
    "ODD 13 · Action climatique",
  ];
  const bottomRow = (settings?.impact_ribbon as string[]) ?? [
    "150 kg de textile détourné",
    "6 000 DH redistribués",
    "20+ ateliers pilotes",
    "7 000+ Instagram",
    "3 bénéficiaires directes",
  ];
  // Duplicate for seamless loop
  const rowA = [...topRow, ...topRow, ...topRow];
  const rowB = [...bottomRow, ...bottomRow, ...bottomRow];

  return (
    <section className="bg-brand-primary text-white py-5 overflow-hidden border-y border-brand-text/10">
      {/* Top row: scrolls LEFT */}
      <div className="flex animate-marquee-left whitespace-nowrap font-medium uppercase tracking-[0.22em] text-[10px] mb-2">
        {rowA.map((t, i) => (
          <span key={i} className="mx-6 flex items-center gap-6">
            {t}
            <span className="text-brand-accent/60">+</span>
          </span>
        ))}
      </div>
      {/* Bottom row: scrolls RIGHT (X crossing) */}
      <div className="flex animate-marquee-right whitespace-nowrap font-medium uppercase tracking-[0.22em] text-[10px] opacity-70">
        {rowB.map((t, i) => (
          <span key={i} className="mx-6 flex items-center gap-6">
            {t}
            <span className="text-brand-accent/60">+</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* --------------------- CINEMATIC VIDEO STORY --------------------- */

function ScrollStory() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { tag: "01 · Fil", title: "La pelote s'éveille." },
    { tag: "02 · Geste", title: "La main trouve le rythme." },
    { tag: "03 · Maille", title: "Et naît une pièce unique." },
  ];

  // Cycle through steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <section className="relative min-h-[70dvh] w-full overflow-hidden">
      <img
        src={processStitches}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
      />
      <video
        src="/ressources/scrolling.mp4"
        muted
        playsInline
        loop
        onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/80" />

      <div className="relative z-10 h-full flex flex-col justify-center items-center px-6 py-24 text-center text-white max-w-4xl mx-auto">
        <div className="space-y-6">
          {steps.map((s, i) => (
            <div
              key={s.tag}
              className={`transition-all duration-700 ${
                i === activeStep
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 absolute inset-0 pointer-events-none"
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.3em] text-brand-accent font-medium mb-3">
                {s.tag}
              </p>
              <h3 className="font-serif italic text-4xl sm:text-6xl lg:text-7xl leading-[0.95] text-balance">
                {s.title}
              </h3>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-10">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveStep(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === activeStep ? "bg-brand-accent" : "bg-white/30"
              }`}
              aria-label={`Étape ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ PROCESS ------------------------------ */

function Process() {
  const ref = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.batch(".process-card", {
        onEnter: (batch) => {
          gsap.from(batch, {
            y: 60,
            opacity: 0,
            duration: 1,
            ease: "expo.out",
            stagger: 0.1,
          });
        },
        start: "top 85%",
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="process" ref={ref} className="relative py-28 sm:py-40 px-6 bg-brand-muted">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
        <div className="lg:sticky lg:top-32 space-y-10">
          <TextReveal>
            <h2 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight italic">
              Du fil <br /> à la transcendance.
            </h2>
          </TextReveal>
          <p className="text-lg text-brand-text/65 max-w-md leading-relaxed">
            Les vêtements anciens arrivent à notre atelier. Ils en repartent en objets de chaleur.
            Chaque maille est apprise, tracée et serrée à la main, un rituel méditatif que nos
            artisanes partagent avec vous.
          </p>
          <div className="space-y-4">
            {[
              {
                t: "Sourcing",
                d: "T-shirts pré-aimés coupés à la main en ruban continu (50 DH / 500 g).",
              },
              {
                t: "Bouclage",
                d: "Tension de maille calibrée selon l'archétype : sac, bob, déco.",
              },
              { t: "Atelier", d: "Co-créé avec nos bénéficiaires Afaf, Fati et Manal." },
            ].map((row, i) => (
              <div
                key={row.t}
                className="process-card p-6 rounded-[2rem] border border-brand-text/10 bg-white/55"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-serif text-xl">{row.t}</h3>
                  <span className="text-xs text-brand-text/40 font-mono">0{i + 1}</span>
                </div>
                <p className="text-sm text-brand-text/60">{row.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          <ProcessImage
            src={processHands}
            caption="Détail · maille 080"
            alt="Mains d'artisane bouclant le fil recyclé"
          />
          <div className="lg:translate-x-12">
            <ProcessImage
              src={processStitches}
              caption="Macro · maille 120"
              alt="Macro de points de crochet"
            />
          </div>
          <div className="lg:-translate-x-6">
            <ProcessImage
              src={atelier}
              caption="L'atelier · Casablanca"
              alt="Un atelier Magic Crochet en session"
              wide
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessImage({
  src,
  caption,
  alt,
  wide,
}: {
  src: string;
  caption: string;
  alt: string;
  wide?: boolean;
}) {
  return (
    <figure className="process-card">
      <div
        className={`w-full ${wide ? "aspect-[3/2]" : "aspect-[4/5]"} overflow-hidden rounded-[2.75rem] bg-white border border-brand-text/5 shadow-[0_30px_60px_-30px_rgba(28,25,23,0.18)]`}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.04]"
          loading="lazy"
        />
      </div>
      <figcaption className="mt-3 px-2 text-[10px] uppercase tracking-[0.25em] text-brand-text/45">
        {caption}
      </figcaption>
    </figure>
  );
}

/* ---------------------------- COLLECTION ---------------------------- */

function Collection() {
  const { add, setOpen } = useCart();
  const { data: products } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, description, price, image, images, category")
        .eq("is_active", true)
        .eq("in_stock", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <section id="collection" className="py-28 sm:py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-6 mb-16">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
              03. Collection
            </p>
            <TextReveal>
              <h2 className="font-serif text-5xl sm:text-7xl tracking-tighter">Drops de saison.</h2>
            </TextReveal>
          </div>
          <Link
            to="/boutique"
            className="text-sm font-medium underline underline-offset-8 decoration-brand-accent hover:text-brand-primary transition-colors"
          >
            Voir toute la boutique →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {products?.map((p, i) => (
            <article key={p.id} className={`group ${i === 1 ? "md:translate-y-12" : ""}`}>
              <Link to="/boutique/$productId" params={{ productId: p.slug || p.id }}>
                <div className="relative overflow-hidden rounded-[2.5rem] aspect-[3/4] mb-5 bg-brand-muted">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-brand-text/20 font-serif italic">
                      {p.name}
                    </div>
                  )}
                  {p.category && (
                    <div className="absolute top-5 left-5 glass bg-white/85 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-text">
                      {p.category}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      add({ id: p.id, name: p.name, sub: p.category ?? "", description: p.description ?? "", materials: "", dimensions: "", price: p.price, img: p.image ?? "", images: p.images ?? [], tag: p.category ?? undefined });
                      setOpen(true);
                    }}
                    className="absolute bottom-5 right-5 inline-flex items-center gap-2 pl-5 pr-2 py-2 rounded-full text-sm font-medium bg-brand-text text-white shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all active:scale-95"
                  >
                    Ajouter
                    <span className="grid place-items-center size-7 rounded-full bg-brand-primary text-white">
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
                  </button>
                </div>
              </Link>
              <div className="flex justify-between items-start px-1">
                <div>
                  <h3 className="font-serif text-2xl">{p.name}</h3>
                  <p className="text-sm text-brand-text/55">{p.category}</p>
                </div>
                <span className="font-medium text-base whitespace-nowrap">
                  {formatMAD(p.price)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- WORKSHOPS ---------------------------- */

function Workshops({ settings }: { settings?: Record<string, unknown> | null }) {
  return (
    <section id="workshops" className="py-28 sm:py-40 px-6 bg-brand-muted">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            04. Ateliers
          </p>
          <TextReveal>
            <h2 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight">
              Un artisanat <span className="italic">méditatif,</span> partagé en présentiel.
            </h2>
          </TextReveal>
          <p className="text-lg text-brand-text/65 mt-6">
            {(settings?.workshop_intro as string) ?? "Plus de 20 ateliers pilotes depuis octobre, 3 heures de focus tranquille, organisés chez Talia Art Studio, Bens Coffee Shop et Commons Work."}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          <WorkshopCard
            kind={(settings?.workshop_b2c_kind as string) ?? "B2C · Particuliers"}
            title={(settings?.workshop_b2c_title as string) ?? "Atelier personnel"}
            desc={(settings?.workshop_b2c_desc as string) ?? "Session de 3 heures, 6 à 10 makers, matériel inclus. Arrivez curieux, repartez avec votre première pièce."}
            price={(settings?.workshop_b2c_price as string) ?? "250 DH"}
            cta={(settings?.workshop_b2c_cta as string) ?? "Réserver une place"}
            dark={false}
          />
          <WorkshopCard
            kind={(settings?.workshop_b2b_kind as string) ?? "B2B · Équipes"}
            title={(settings?.workshop_b2b_title as string) ?? "Looping corporate"}
            desc={(settings?.workshop_b2b_desc as string) ?? "Team-building créatif ancré dans le slow craft. Marge nette de 68% sur chaque session, pour un impact à l'échelle."}
            price={(settings?.workshop_b2b_price as string) ?? "800 DH+"}
            cta={(settings?.workshop_b2b_cta as string) ?? "Demander un devis"}
            dark
          />
        </div>
      </div>
    </section>
  );
}

function WorkshopCard({
  kind,
  title,
  desc,
  price,
  cta,
  dark,
}: {
  kind: string;
  title: string;
  desc: string;
  price: string;
  cta: string;
  dark: boolean;
}) {
  return (
    <div
      className={`p-10 sm:p-12 rounded-[3rem] flex flex-col gap-10 justify-between min-h-[420px] hover:-translate-y-1 transition-transform duration-500 ${
        dark
          ? "bg-brand-text text-white"
          : "bg-brand-bg text-brand-text border border-brand-text/10"
      }`}
    >
      <div>
        <p
          className={`text-[11px] uppercase tracking-[0.3em] font-medium ${dark ? "text-brand-accent" : "text-brand-primary"}`}
        >
          {kind}
        </p>
        <h3 className="mt-4 font-serif text-4xl sm:text-5xl leading-tight italic">{title}</h3>
        <p className={`mt-5 max-w-md ${dark ? "text-white/65" : "text-brand-text/65"}`}>{desc}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-serif text-3xl">{price}</span>
        <Link
          to="/reserver"
          className={`group inline-flex items-center gap-2 pl-5 pr-2 py-2 rounded-full text-sm font-medium transition-colors active:scale-95 ${
            dark
              ? "bg-white text-brand-text hover:bg-brand-accent"
              : "bg-brand-text text-white hover:bg-brand-primary"
          }`}
        >
          {cta}
          <span
            className={`grid place-items-center size-8 rounded-full ${dark ? "bg-brand-primary text-white" : "bg-brand-accent text-brand-text"}`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------- PARTNERS ---------------------------- */

const SIZE_PRESETS: Record<string, number> = { sm: 35, md: 55, lg: 75 };
function partnerLogoSize(size: string) {
  const n = parseInt(size, 10);
  const pct = isNaN(n) ? (SIZE_PRESETS[size] ?? 55) : n;
  return { maxHeight: `${pct}%`, maxWidth: `${Math.min(pct + 20, 100)}%` };
}

function Partners() {
  const { data: partners, isLoading } = useQuery({
    queryKey: ["homepage-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partnerships")
        .select("id, name, logo_url, url, size")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <section
      id="partenaires"
      className="py-24 sm:py-32 px-6 bg-brand-bg border-t border-brand-text/10"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            07 — Partenaires
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl leading-tight italic max-w-2xl mx-auto text-balance">
            Ils boucle la maille avec nous.
          </h2>
          <p className="mt-5 text-brand-text/60 max-w-xl mx-auto">
            Des lieux et collectifs qui accueillent nos ateliers, soutiennent nos
            artisanes et croient à un artisanat plus juste.
          </p>
        </div>

        {isLoading ? (
          <div className="col-span-full text-center py-12 text-brand-text/30 font-serif italic">Chargement...</div>
        ) : partners && partners.length > 0 ? (
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {partners.map((p) => (
              <li key={p.id}>
                <a
                  href={p.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group aspect-[5/3] rounded-[2rem] border border-brand-text/10 bg-brand-muted/40 hover:bg-white hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(28,25,23,0.18)] transition-all duration-500 grid place-items-center p-6 block"
                  title={p.name}
                >
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.name}
                      loading="lazy"
                      style={partnerLogoSize(p.size)}
                      className="object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span className="text-brand-text/30 font-serif italic text-sm">{p.name}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

/* --------------------------- BENEFICIARIES --------------------------- */

function Beneficiaries() {
  const [offset, setOffset] = useState(0);
  const { data: avis, isLoading } = useQuery({
    queryKey: ["homepage-avis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avis")
        .select("id, name, role, quote")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const showCarousel = (avis?.length ?? 0) > 3;
  const count = avis?.length ?? 0;

  useEffect(() => {
    if (!showCarousel) return;
    const timer = setInterval(() => setOffset((o) => (o + 1) % count), 3500);
    return () => clearInterval(timer);
  }, [showCarousel, count]);

  const slideAvis = showCarousel && avis
    ? [...avis, ...avis.slice(0, 3)]
    : avis;

  return (
    <section className="py-28 sm:py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <TextReveal>
            <h2 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight italic">
              Un seul fil peut recoudre l'espoir.
            </h2>
          </TextReveal>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-brand-text/30 font-serif italic">Chargement...</div>
        ) : avis?.length === 0 ? (
          <div className="text-center py-12 text-brand-text/30 font-serif italic">Aucun avis.</div>
        ) : showCarousel ? (
          <div className="overflow-hidden">
            <div
              className="flex gap-6 transition-transform duration-700 ease-[cubic-bezier(0.33,1,0.68,1)]"
              style={{ transform: `translateX(calc(-${offset} * (100% + 1.5rem) / 3))` }}
            >
              {slideAvis?.map((a, i) => (
                <figure
                  key={`${a.id}-${i}`}
                  className="w-[calc(33.333%-1rem)] shrink-0 p-8 rounded-[2.5rem] bg-brand-muted/60 border border-brand-text/5 flex flex-col gap-8 min-h-[320px] hover:-translate-y-1 hover:bg-brand-muted/90 transition-colors duration-500"
                >
                  <blockquote className="font-serif text-2xl leading-snug text-balance">
                    « {a.quote} »
                  </blockquote>
                  <figcaption className="mt-auto flex items-center gap-4 pt-6 border-t border-brand-text/10">
                    <div className="size-12 rounded-full bg-brand-primary text-white grid place-items-center font-serif text-lg italic shrink-0">
                      {a.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs text-brand-text/55">{a.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {avis?.map((a) => (
              <figure
                key={a.id}
                className="p-8 rounded-[2.5rem] bg-brand-muted/60 border border-brand-text/5 flex flex-col gap-8 min-h-[320px] hover:-translate-y-1 hover:bg-brand-muted/90 transition-all duration-500"
              >
                <blockquote className="font-serif text-2xl leading-snug text-balance">
                  « {a.quote} »
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-4 pt-6 border-t border-brand-text/10">
                  <div className="size-12 rounded-full bg-brand-primary text-white grid place-items-center font-serif text-lg italic shrink-0">
                    {a.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-xs text-brand-text/55">{a.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {showCarousel && (
          <div className="flex justify-center gap-2 mt-8">
            {avis?.map((a, i) => (
              <button
                key={a.id}
                onClick={() => setOffset(i)}
                className={`size-2 rounded-full transition-colors ${offset === i ? "bg-brand-primary" : "bg-brand-text/20"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ----------------------------- REVIEWS ----------------------------- */

function Reviews() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["homepage-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, customer_name, rating, comment, image_url")
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading || !reviews || reviews.length === 0) return null;

  const hasImages = reviews.some((r) => r.image_url);

  if (hasImages) {
    return <PhoneMockupCarousel items={reviews} />;
  }

  return (
    <section className="py-24 sm:py-32 px-6 bg-brand-bg border-t border-brand-text/10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            Avis clients
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl leading-tight italic max-w-2xl mx-auto text-balance">
            Ce que disent nos clients.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <figure
              key={r.id}
              className="p-8 rounded-[2rem] bg-white border border-brand-text/5 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(28,25,23,0.12)] transition-all duration-500"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < r.rating ? "#F506EA" : "none"} stroke={i < r.rating ? "#F506EA" : "#d6d3d1"} strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              {r.comment && (
                <blockquote className="text-sm text-brand-text/70 leading-relaxed mb-6">
                  "{r.comment}"
                </blockquote>
              )}
              <figcaption className="flex items-center gap-3 pt-4 border-t border-brand-text/10">
                <div className="size-9 rounded-full bg-brand-primary/10 text-brand-primary grid place-items-center font-serif text-sm font-bold">
                  {r.customer_name[0]}
                </div>
                <p className="text-sm font-medium">{r.customer_name}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- COMMUNITY ---------------------------- */

function Community({ settings }: { settings?: Record<string, unknown> | null }) {
  const heroStats = (settings?.hero_stats as Array<{ label: string; value: string; subtitle: string }>) ?? [];
  const communityStat = heroStats.find((s) => s.label === "Communauté")?.value ?? "7 000+";
  const instagram = (settings?.instagram as string) ?? "";
  const instagramHandle = instagram.replace("@", "");

  return (
    <section className="py-24 px-6 border-t border-brand-text/10">
      <div className="max-w-5xl mx-auto text-center">
        <TextReveal>
          <h2 className="font-serif text-4xl sm:text-6xl tracking-tight">
            Rejoignez {communityStat} sur{" "}
            {instagramHandle ? (
              <a
                href={`https://www.instagram.com/${instagramHandle}/`}
                target="_blank"
                rel="noreferrer noopener"
                className="italic text-brand-primary hover:underline underline-offset-8 decoration-brand-accent"
              >
                {instagram}
              </a>
            ) : (
              <span className="italic text-brand-primary">notre communauté</span>
            )}
          </h2>
        </TextReveal>
        <p className="mt-6 text-lg text-brand-text/60 max-w-xl mx-auto">
          Nouveaux drops, coulisses d'ateliers et histoires de nos bénéficiaires.
        </p>
      </div>
    </section>
  );
}
