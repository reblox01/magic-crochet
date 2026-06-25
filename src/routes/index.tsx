import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import heroLoopAsset from "@/assets/hero-loop.mp4.asset.json";
import crochetScrollAsset from "@/assets/crochet-scroll.mp4.asset.json";
import heroYarn from "@/assets/hero-yarn.jpg";
import productBag from "@/assets/product-bag.jpg";
import productHat from "@/assets/product-hat.jpg";
import productDecor from "@/assets/product-decor.jpg";
import processHands from "@/assets/process-hands.jpg";
import processStitches from "@/assets/process-stitches.jpg";
import atelier from "@/assets/atelier.jpg";

import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { useCart, formatMAD } from "@/lib/cart";
import { PRODUCTS } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Magic Crochet — Fil recyclé, gestes d'artisanes, impact réel" },
      {
        name: "description",
        content:
          "Magic Crochet transforme les textiles recyclés en pièces de crochet contemporaines et en ateliers émancipateurs au Maroc. Découvrez la collection, nos ateliers et les artisanes derrière chaque maille.",
      },
      { property: "og:title", content: "Magic Crochet — Histoires bouclées" },
      {
        property: "og:description",
        content:
          "Pièces de crochet faites main et ateliers nés du fil de t-shirts recyclés. Fabriqué à Casablanca.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-text font-sans overflow-x-clip">
      <SiteNav />
      <Hero />
      <Manifesto />
      <ImpactRibbon />
      <ScrollStory />
      <Process />
      <Collection />
      <Workshops />
      <Beneficiaries />
      <Community />
      <SiteFooter />
    </main>
  );
}

/* -------------------------------- HERO -------------------------------- */

function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
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
      gsap.from(".hero-chip", { opacity: 0, scale: 0.85, duration: 0.8, delay: 1, ease: "expo.out" });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="top" ref={sectionRef} className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-brand-bg">
      {/* Soft ambient looping video */}
      <video
        src={heroLoopAsset.url}
        autoPlay
        muted
        playsInline
        loop
        poster={heroYarn}
        className="absolute inset-0 w-full h-full object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/55 via-brand-bg/30 to-brand-bg/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(253,252,251,0.55)_75%)]" />

      {/* Floating soft shapes */}
      <div aria-hidden className="absolute -top-20 -left-20 size-72 rounded-full bg-brand-accent/30 blur-3xl animate-float-slow" />
      <div aria-hidden className="absolute bottom-10 -right-16 size-80 rounded-full bg-brand-primary/20 blur-3xl animate-float-slower" />

      <div className="relative z-10 px-6 text-center max-w-5xl pt-24">
        <p className="hero-chip mb-6 inline-flex items-center gap-3 rounded-full glass bg-white/60 border border-brand-text/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-brand-text/70">
          <span className="size-1.5 rounded-full bg-brand-primary animate-pulse" />
          Fabriqué à Casablanca · Enactus EMSI
        </p>
        <h1 className="font-serif leading-[0.88] tracking-tighter text-balance text-[clamp(3.25rem,11vw,9rem)]">
          <span className="block overflow-hidden"><span className="hero-line block">Histoires</span></span>
          <span className="block overflow-hidden"><span className="hero-line block italic text-brand-primary">bouclées,</span></span>
          <span className="block overflow-hidden"><span className="hero-line block">fil recyclé.</span></span>
        </h1>
        <p className="hero-sub mt-8 max-w-xl mx-auto text-base sm:text-lg text-brand-text/70 leading-relaxed">
          Magic Crochet boucle les textiles oubliés en objets contemporains et en ateliers émancipateurs —
          un mouvement artisanal marocain, une maille à la fois.
        </p>
        <div className="hero-sub mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/boutique"
            className="group inline-flex items-center gap-2 bg-brand-text text-white pl-6 pr-2 py-2 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors active:scale-[0.97]"
          >
            Explorer la collection
            <span className="grid place-items-center size-9 rounded-full bg-brand-primary text-white transition-transform group-hover:translate-x-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

    </section>
  );
}

/* ----------------------------- MANIFESTO ----------------------------- */

function Manifesto() {
  return (
    <section className="relative py-28 sm:py-40 px-6 bg-brand-bg">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-20 items-end">
        <div className="lg:col-span-7 space-y-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium">01 — Manifeste</p>
          <h2 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-balance">
            Du <span className="italic">fil jeté</span> au design digne.
          </h2>
          <p className="text-lg sm:text-xl text-brand-text/65 max-w-xl leading-relaxed">
            Nous détournons les vieux t-shirts de la décharge, nous les filons à la main et nous les bouclons en
            sacs, décoration et accessoires. Chaque pièce finance un salaire juste pour des femmes qui reprennent
            leur indépendance.
          </p>
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-5">
          <Stat value="150 kg" label="Textile détourné" />
          <Stat value="6 000 DH" label="Redistribués" />
          <Stat value="3" label="Bénéficiaires directes" />
          <Stat value="300+" label="Vies touchées" />
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

function ImpactRibbon() {
  const items = [
    "ODD 1 · Réduire la pauvreté",
    "ODD 5 · Égalité des genres",
    "ODD 8 · Travail décent",
    "ODD 12 · Consommation responsable",
    "ODD 13 · Action climatique",
    "150 kg de textile détourné",
    "6 000 DH redistribués",
    "20+ ateliers pilotes",
  ];
  const row = [...items, ...items];
  return (
    <section id="impact" className="bg-brand-primary text-white py-7 overflow-hidden border-y border-brand-text/10">
      <div className="flex animate-marquee whitespace-nowrap font-medium uppercase tracking-[0.22em] text-xs">
        {row.map((t, i) => (
          <span key={i} className="mx-8 flex items-center gap-8">
            {t}
            <span className="text-brand-accent">✦</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* --------------------- SCROLL-SCRUBBED VIDEO STORY --------------------- */

function ScrollStory() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    // Throttle ScrollTrigger globally on weaker devices
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (isMobile) {
      // limit callbacks to ~30fps on mobile
      ScrollTrigger.normalizeScroll(false);
    }

    const ctx = gsap.context(() => {
      const video = videoRef.current;
      const section = sectionRef.current;
      if (!section) return;

      // Caption reveal animations are always created
      gsap.utils.toArray<HTMLElement>(".scroll-cap").forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            ease: "expo.out",
            duration: 0.8,
            scrollTrigger: {
              trigger: section,
              start: `top+=${i * 50}% top`,
              end: `top+=${(i + 1) * 50}% top`,
              scrub: 0.4,
            },
          },
        );
      });

      if (!video || reduce) return;

      let duration = 0;
      let scheduled = false;
      let pendingT = 0;

      const apply = () => {
        scheduled = false;
        if (!duration) return;
        try {
          video.currentTime = pendingT;
        } catch {
          /* ignore */
        }
      };

      const onMeta = () => {
        duration = video.duration || 0;
      };
      video.addEventListener("loadedmetadata", onMeta);
      if (video.readyState >= 1) onMeta();

      // Lazy-load when section approaches viewport
      const lazyLoader = ScrollTrigger.create({
        trigger: section,
        start: "top bottom+=200",
        once: true,
        onEnter: () => {
          if (!video.src) {
            video.src = crochetScrollAsset.url;
            video.load();
          }
        },
      });

      video.pause();

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: isMobile ? "+=120%" : "+=200%",
        scrub: isMobile ? 1 : 0.6,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (!duration) return;
          pendingT = Math.max(0, Math.min(duration - 0.05, duration * self.progress));
          if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(apply);
          }
        },
      });

      return () => {
        video.removeEventListener("loadedmetadata", onMeta);
        st.kill();
        lazyLoader.kill();
      };
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const caps = [
    { tag: "01 · Fil", title: "La pelote s'éveille." },
    { tag: "02 · Geste", title: "La main trouve le rythme." },
    { tag: "03 · Maille", title: "Et naît une pièce unique." },
  ];

  return (
    <section ref={sectionRef} className="relative h-screen w-full bg-brand-text overflow-hidden">
      <video
        ref={videoRef}
        muted
        playsInline
        preload="none"
        poster={heroYarn}
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover will-change-[currentTime] [transform:translateZ(0)]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-text/40 via-brand-text/10 to-brand-text/90" />

      <div className="relative z-10 h-full flex flex-col justify-between px-6 sm:px-10 py-24 sm:py-32 text-white max-w-7xl mx-auto">
        <p className="scroll-cap text-[11px] uppercase tracking-[0.3em] text-brand-accent font-medium">
          Du fil au geste
        </p>
        <div className="space-y-8">
          {caps.map((c) => (
            <div key={c.tag} className="scroll-cap">
              <p className="text-[10px] uppercase tracking-[0.3em] text-brand-accent/80 mb-2">{c.tag}</p>
              <h3 className="font-serif italic text-4xl sm:text-6xl lg:text-7xl leading-[0.95] text-balance max-w-3xl">
                {c.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ PROCESS ------------------------------ */

function Process() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".process-card").forEach((el) => {
        gsap.from(el, {
          y: 60,
          opacity: 0,
          duration: 1,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="process" ref={ref} className="relative py-28 sm:py-40 px-6 bg-brand-muted">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
        <div className="lg:sticky lg:top-32 space-y-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium">02 — Processus</p>
          <h2 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight italic">
            Du fil <br /> à la transcendance.
          </h2>
          <p className="text-lg text-brand-text/65 max-w-md leading-relaxed">
            Les vêtements anciens arrivent à notre atelier. Ils en repartent en objets de chaleur. Chaque maille
            est apprise, tracée et serrée à la main — un rituel méditatif que nos artisanes partagent avec vous.
          </p>
          <div className="space-y-4">
            {[
              { t: "Sourcing", d: "T-shirts pré-aimés coupés à la main en ruban continu (50 DH / 500 g)." },
              { t: "Bouclage", d: "Tension de maille calibrée selon l'archétype : sac, bob, déco." },
              { t: "Atelier", d: "Co-créé avec nos bénéficiaires Afaf, Fati et Manal." },
            ].map((row, i) => (
              <div key={row.t} className="process-card p-6 rounded-[2rem] border border-brand-text/10 bg-white/55">
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
          <ProcessImage src={processHands} caption="Détail · maille 080" alt="Mains d'artisane bouclant le fil recyclé" />
          <div className="lg:translate-x-12">
            <ProcessImage src={processStitches} caption="Macro · maille 120" alt="Macro de points de crochet" />
          </div>
          <div className="lg:-translate-x-6">
            <ProcessImage src={atelier} caption="L'atelier · Casablanca" alt="Un atelier Magic Crochet en session" wide />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessImage({ src, caption, alt, wide }: { src: string; caption: string; alt: string; wide?: boolean }) {
  return (
    <figure className="process-card">
      <div
        className={`w-full ${wide ? "aspect-[3/2]" : "aspect-[4/5]"} overflow-hidden rounded-[2.75rem] bg-white border border-brand-text/5 shadow-[0_30px_60px_-30px_rgba(28,25,23,0.18)]`}
      >
        <img src={src} alt={alt} className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.04]" loading="lazy" />
      </div>
      <figcaption className="mt-3 px-2 text-[10px] uppercase tracking-[0.25em] text-brand-text/45">{caption}</figcaption>
    </figure>
  );
}

/* ---------------------------- COLLECTION ---------------------------- */

function Collection() {
  const { add, setOpen } = useCart();
  const featured = PRODUCTS.slice(0, 3);

  return (
    <section id="collection" className="py-28 sm:py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-6 mb-16">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">03 — Collection</p>
            <h2 className="font-serif text-5xl sm:text-7xl tracking-tighter">Drops de saison.</h2>
          </div>
          <Link
            to="/boutique"
            className="text-sm font-medium underline underline-offset-8 decoration-brand-accent hover:text-brand-primary transition-colors"
          >
            Voir toute la boutique →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {featured.map((p, i) => (
            <article key={p.id} className={`group ${i === 1 ? "md:translate-y-12" : ""}`}>
              <div className="relative overflow-hidden rounded-[2.5rem] aspect-[3/4] mb-5 bg-brand-muted">
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                {p.tag && (
                  <div className="absolute top-5 left-5 glass bg-white/85 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-text">
                    {p.tag}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    add(p);
                    setOpen(true);
                  }}
                  className="absolute bottom-5 right-5 inline-flex items-center gap-2 pl-5 pr-2 py-2 rounded-full text-sm font-medium bg-brand-text text-white shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all active:scale-95"
                >
                  Ajouter
                  <span className="grid place-items-center size-7 rounded-full bg-brand-primary text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
              </div>
              <div className="flex justify-between items-start px-1">
                <div>
                  <h3 className="font-serif text-2xl">{p.name}</h3>
                  <p className="text-sm text-brand-text/55">{p.sub}</p>
                </div>
                <span className="font-medium text-base whitespace-nowrap">{formatMAD(p.price)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- WORKSHOPS ---------------------------- */

function Workshops() {
  return (
    <section id="workshops" className="py-28 sm:py-40 px-6 bg-brand-muted">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">04 — Ateliers</p>
          <h2 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight">
            Un artisanat <span className="italic">méditatif,</span> partagé en présentiel.
          </h2>
          <p className="text-lg text-brand-text/65 mt-6">
            Plus de 20 ateliers pilotes depuis octobre — 3 heures de focus tranquille,
            organisés chez Talia Art Studio, Bens Coffee Shop et Commons Work.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          <WorkshopCard
            kind="B2C · Particuliers"
            title="Atelier personnel"
            desc="Session de 3 heures, 6 à 10 makers, matériel inclus. Arrivez curieux, repartez avec votre première pièce."
            price="250 DH"
            cta="Réserver une place"
            dark={false}
          />
          <WorkshopCard
            kind="B2B · Équipes"
            title="Looping corporate"
            desc="Team-building créatif ancré dans le slow craft. Marge nette de 68% sur chaque session — pour un impact à l'échelle."
            price="800 DH+"
            cta="Demander un devis"
            dark
          />
        </div>
      </div>
    </section>
  );
}

function WorkshopCard({
  kind, title, desc, price, cta, dark,
}: { kind: string; title: string; desc: string; price: string; cta: string; dark: boolean }) {
  return (
    <div
      className={`p-10 sm:p-12 rounded-[3rem] flex flex-col gap-10 justify-between min-h-[420px] hover:-translate-y-1 transition-transform duration-500 ${
        dark ? "bg-brand-text text-white" : "bg-brand-bg text-brand-text border border-brand-text/10"
      }`}
    >
      <div>
        <p className={`text-[11px] uppercase tracking-[0.3em] font-medium ${dark ? "text-brand-accent" : "text-brand-primary"}`}>
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
            dark ? "bg-white text-brand-text hover:bg-brand-accent" : "bg-brand-text text-white hover:bg-brand-primary"
          }`}
        >
          {cta}
          <span className={`grid place-items-center size-8 rounded-full ${dark ? "bg-brand-primary text-white" : "bg-brand-accent text-brand-text"}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}

/* --------------------------- BENEFICIARIES --------------------------- */

function Beneficiaries() {
  const stories = [
    { name: "Afaf", role: "Étudiante · animatrice", quote: "Magic Crochet m'a donné un moyen de financer mes études sans peser sur ma famille." },
    { name: "Fati", role: "Étudiante · animatrice", quote: "Je suis arrivée hésitante. Je suis repartie avec une confiance, un métier et un revenu." },
    { name: "Manal", role: "Bénéficiaire · artisane", quote: "Chaque dirham gagné ici nous rapproche d'une stabilité pour ma famille." },
  ];
  return (
    <section className="py-28 sm:py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">05 — Bénéficiaires</p>
          <h2 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight italic">
            Un seul fil peut recoudre l'espoir.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {stories.map((s) => (
            <figure
              key={s.name}
              className="p-8 rounded-[2.5rem] bg-brand-muted/60 border border-brand-text/5 flex flex-col gap-8 min-h-[320px] hover:-translate-y-1 hover:bg-brand-muted/90 transition-all duration-500"
            >
              <blockquote className="font-serif text-2xl leading-snug text-balance">« {s.quote} »</blockquote>
              <figcaption className="mt-auto flex items-center gap-4 pt-6 border-t border-brand-text/10">
                <div className="size-12 rounded-full bg-brand-primary text-white grid place-items-center font-serif text-lg italic">
                  {s.name[0]}
                </div>
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-brand-text/55">{s.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- COMMUNITY ---------------------------- */

function Community() {
  return (
    <section className="py-24 px-6 border-t border-brand-text/10">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">06 — Communauté</p>
        <h2 className="font-serif text-4xl sm:text-6xl tracking-tight">
          Rejoignez 7 000+ sur{" "}
          <a
            href="https://www.instagram.com/magic.crochet_0/"
            target="_blank"
            rel="noreferrer noopener"
            className="italic text-brand-primary hover:underline underline-offset-8 decoration-brand-accent"
          >
            @magic.crochet_0
          </a>
        </h2>
        <p className="mt-6 text-lg text-brand-text/60 max-w-xl mx-auto">
          Nouveaux drops, coulisses d'ateliers et histoires de nos bénéficiaires.
        </p>
      </div>
    </section>
  );
}
