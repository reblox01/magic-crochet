import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import heroVideoAsset from "@/assets/hero-video.mp4.asset.json";
import heroYarn from "@/assets/hero-yarn.jpg";
import productBag from "@/assets/product-bag.jpg";
import productHat from "@/assets/product-hat.jpg";
import productDecor from "@/assets/product-decor.jpg";
import processHands from "@/assets/process-hands.jpg";
import processStitches from "@/assets/process-stitches.jpg";
import atelier from "@/assets/atelier.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Magic Crochet — Woven Stories, Recycled Yarn, Real Impact" },
      {
        name: "description",
        content:
          "Magic Crochet transforms recycled textiles into modern crochet artifacts and empowering workshops across Morocco. Discover the collection, our ateliers, and the women behind every loop.",
      },
      { property: "og:title", content: "Magic Crochet — Woven Stories" },
      {
        property: "og:description",
        content:
          "Handmade crochet artifacts and workshops born from recycled T-shirt yarn. Crafted in Casablanca.",
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
      <Nav />
      <Hero />
      <Manifesto />
      <ImpactRibbon />
      <Process />
      <Collection />
      <Workshops />
      <Beneficiaries />
      <Community />
      <Footer />
    </main>
  );
}

/* -------------------------------- NAV -------------------------------- */

function Nav() {
  return (
    <nav className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-5xl">
      <div className="glass bg-white/55 border border-brand-text/5 rounded-[2.5rem] px-5 sm:px-8 py-3 sm:py-4 flex items-center justify-between shadow-[0_8px_30px_-12px_rgba(28,25,23,0.12)]">
        <div className="flex items-center gap-8">
          <a href="#top" className="font-serif text-lg sm:text-xl font-semibold tracking-tight">
            Magic <span className="italic text-brand-primary">Crochet</span>
          </a>
          <div className="hidden md:flex gap-6 text-sm font-medium text-brand-text/60">
            <a href="#collection" className="hover:text-brand-text transition-colors">
              Collection
            </a>
            <a href="#process" className="hover:text-brand-text transition-colors">
              Process
            </a>
            <a href="#workshops" className="hover:text-brand-text transition-colors">
              Ateliers
            </a>
            <a href="#impact" className="hover:text-brand-text transition-colors">
              Impact
            </a>
          </div>
        </div>
        <a
          href="#workshops"
          className="bg-brand-text text-white px-5 sm:px-6 py-2.5 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors"
        >
          Book atelier
        </a>
      </div>
    </nav>
  );
}

/* -------------------------------- HERO -------------------------------- */

function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Headline reveal
      gsap.from(".hero-line", {
        yPercent: 110,
        opacity: 0,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.08,
        delay: 0.1,
      });
      gsap.from(".hero-sub", { opacity: 0, y: 24, duration: 1, delay: 0.6, ease: "expo.out" });

      // Scroll-scrubbed video as a 3D-feel frame sequence
      const video = videoRef.current;
      if (!video) return;
      let duration = 0;
      const onMeta = () => {
        duration = video.duration || 0;
      };
      video.addEventListener("loadedmetadata", onMeta);
      if (video.readyState >= 1) onMeta();

      const st = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 0.4,
        onUpdate: (self) => {
          if (!duration) return;
          const t = duration * self.progress;
          try {
            video.currentTime = t;
          } catch {
            /* noop */
          }
        },
      });

      return () => {
        video.removeEventListener("loadedmetadata", onMeta);
        st.kill();
      };
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative h-[260vh] bg-brand-bg"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Scroll-scrubbed video frame sequence */}
        <video
          ref={videoRef}
          src={heroVideoAsset.url}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          // Fallback image visible until video buffers
          poster={heroYarn}
        />
        {/* Fallback floating yarn for atmosphere if video fails */}
        <img
          ref={fallbackRef}
          src={heroYarn}
          alt=""
          aria-hidden="true"
          className="hidden"
          width={1600}
          height={1600}
        />

        {/* Warm gradient veil for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/30 via-brand-bg/10 to-brand-bg/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(253,252,251,0.55)_70%)]" />

        {/* Copy */}
        <div className="relative z-10 px-6 text-center max-w-5xl">
          <p className="hero-sub mb-6 inline-flex items-center gap-3 rounded-full glass bg-white/50 border border-brand-text/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-brand-text/70">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            Crafted in Casablanca · Enactus EMSI
          </p>
          <h1 className="font-serif leading-[0.88] tracking-tighter text-balance text-[clamp(3.25rem,11vw,9rem)]">
            <span className="block overflow-hidden">
              <span className="hero-line block">Woven</span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block italic text-brand-primary">stories,</span>
            </span>
            <span className="block overflow-hidden">
              <span className="hero-line block">recycled yarn.</span>
            </span>
          </h1>
          <p className="hero-sub mt-8 max-w-xl mx-auto text-base sm:text-lg text-brand-text/65 leading-relaxed">
            Magic Crochet loops textile waste into modern artifacts and
            empowering ateliers — a Moroccan craft movement built one stitch at a time.
          </p>
          <div className="hero-sub mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#collection"
              className="group inline-flex items-center gap-2 bg-brand-text text-white pl-6 pr-2 py-2 rounded-full text-sm font-medium hover:bg-brand-primary transition-colors"
            >
              Explore the collection
              <span className="grid place-items-center size-9 rounded-full bg-brand-primary text-white transition-transform group-hover:translate-x-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
            <a
              href="#workshops"
              className="inline-flex items-center gap-2 border border-brand-text/15 px-6 py-3 rounded-full text-sm font-medium hover:bg-brand-text hover:text-white transition-colors"
            >
              Join an atelier
            </a>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-brand-text/50">
          <span>Scroll · unspool the story</span>
          <span className="w-px h-10 bg-brand-text/30 animate-pulse" />
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
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium">
            01 — Manifesto
          </p>
          <h2 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-balance">
            From <span className="italic">discarded thread</span> to dignified design.
          </h2>
          <p className="text-lg sm:text-xl text-brand-text/65 max-w-xl leading-relaxed">
            We divert old t-shirts from the landfill, hand-spin them into yarn,
            and loop them into bags, decor, and accessories. Every piece funds
            fair wages for women rebuilding their independence.
          </p>
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-5">
          <Stat value="150kg" label="Textile diverted" />
          <Stat value="6 000 DH" label="Redistributed" />
          <Stat value="3" label="Direct beneficiaries" />
          <Stat value="300+" label="Lives touched" />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-6 rounded-[2rem] border border-brand-text/10 bg-brand-muted/40">
      <div className="font-serif text-3xl sm:text-4xl text-brand-primary">{value}</div>
      <div className="mt-2 text-xs uppercase tracking-widest text-brand-text/55">{label}</div>
    </div>
  );
}

/* --------------------------- IMPACT RIBBON --------------------------- */

function ImpactRibbon() {
  const items = [
    "SDG 1 · Reducing poverty",
    "SDG 5 · Gender equality",
    "SDG 8 · Decent work",
    "SDG 12 · Responsible consumption",
    "SDG 13 · Climate action",
    "150kg textile diverted",
    "6 000 DH redistributed",
    "20+ pilot ateliers",
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
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium">
            02 — Process
          </p>
          <h2 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight italic">
            From thread <br />
            to transcendence.
          </h2>
          <p className="text-lg text-brand-text/65 max-w-md leading-relaxed">
            Old garments arrive at our atelier. They leave as objects of warmth.
            Every loop is taught, traced, and tightened by hand — a meditative
            ritual our artisans share with you.
          </p>
          <div className="space-y-4">
            {[
              { t: "Sourcing", d: "Pre-loved t-shirts hand-cut into continuous yarn ribbon (50 DH / 500g)." },
              { t: "Looping", d: "Stitch tension calibrated to garment archetypes — bag, hat, decor." },
              { t: "Atelier", d: "Co-created with our beneficiaries Afaf, Fati and Manal." },
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
          <ProcessImage src={processHands} caption="Détail · loop 080" alt="Artisan hands looping recycled yarn" />
          <div className="lg:translate-x-12">
            <ProcessImage src={processStitches} caption="Macro · stitch 120" alt="Macro of crochet stitches" />
          </div>
          <div className="lg:-translate-x-6">
            <ProcessImage src={atelier} caption="L'atelier · Casablanca" alt="A Magic Crochet workshop in session" wide />
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
        <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <figcaption className="mt-3 px-2 text-[10px] uppercase tracking-[0.25em] text-brand-text/45">
        {caption}
      </figcaption>
    </figure>
  );
}

/* ---------------------------- COLLECTION ---------------------------- */

function Collection() {
  const products = [
    {
      img: productBag,
      tag: "Limited Edition",
      name: "Sahara Carrier",
      sub: "Cream + terracotta cotton",
      price: "450 DH",
    },
    {
      img: productHat,
      tag: "Drop 01",
      name: "Atlas Bucket",
      sub: "Burnt sienna recycled yarn",
      price: "320 DH",
    },
    {
      img: productDecor,
      tag: "Maison",
      name: "Riad Basket & Cushion",
      sub: "Hand-looped home set",
      price: "780 DH",
    },
  ];
  return (
    <section id="collection" className="py-28 sm:py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-end gap-6 mb-16">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
              03 — Collection
            </p>
            <h2 className="font-serif text-5xl sm:text-7xl tracking-tighter">Seasonal drops.</h2>
          </div>
          <a
            href="https://www.instagram.com/magic.crochet_0/"
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm font-medium underline underline-offset-8 decoration-brand-accent hover:text-brand-primary transition-colors"
          >
            View archive on Instagram
          </a>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {products.map((p, i) => (
            <article key={p.name} className={`group cursor-pointer ${i === 1 ? "md:translate-y-12" : ""}`}>
              <div className="relative overflow-hidden rounded-[2.5rem] aspect-[3/4] mb-5 bg-brand-muted">
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute top-5 left-5 glass bg-white/85 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-text">
                  {p.tag}
                </div>
              </div>
              <div className="flex justify-between items-start px-1">
                <div>
                  <h3 className="font-serif text-2xl">{p.name}</h3>
                  <p className="text-sm text-brand-text/55">{p.sub}</p>
                </div>
                <span className="font-medium text-base whitespace-nowrap">{p.price}</span>
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
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            04 — Ateliers
          </p>
          <h2 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight">
            A <span className="italic">meditative</span> craft, shared in person.
          </h2>
          <p className="text-lg text-brand-text/65 mt-6">
            More than 20 pilot workshops since October — 3 hours of quiet focus,
            hosted at Talia Art Studio, Bens Coffee Shop and Commons Work.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          <WorkshopCard
            kind="B2C · Individuals"
            title="Personal atelier"
            desc="3-hour session, 6 to 10 makers, all materials included. Walk in with curiosity, leave with your first piece."
            price="250 DH"
            cta="Reserve a seat"
            dark={false}
          />
          <WorkshopCard
            kind="B2B · Teams"
            title="Corporate looping"
            desc="Creative team-building grounded in slow craft. Margin nette of 68% on every session — for impact at scale."
            price="800 DH+"
            cta="Request a proposal"
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
      className={`p-10 sm:p-12 rounded-[3rem] flex flex-col gap-10 justify-between min-h-[420px] ${
        dark
          ? "bg-brand-text text-white"
          : "bg-brand-bg text-brand-text border border-brand-text/10"
      }`}
    >
      <div>
        <p
          className={`text-[11px] uppercase tracking-[0.3em] font-medium ${
            dark ? "text-brand-accent" : "text-brand-primary"
          }`}
        >
          {kind}
        </p>
        <h3 className="mt-4 font-serif text-4xl sm:text-5xl leading-tight italic">{title}</h3>
        <p className={`mt-5 max-w-md ${dark ? "text-white/65" : "text-brand-text/65"}`}>{desc}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-serif text-3xl">{price}</span>
        <button
          type="button"
          className={`group inline-flex items-center gap-2 pl-5 pr-2 py-2 rounded-full text-sm font-medium transition-colors ${
            dark
              ? "bg-white text-brand-text hover:bg-brand-accent"
              : "bg-brand-text text-white hover:bg-brand-primary"
          }`}
        >
          {cta}
          <span
            className={`grid place-items-center size-8 rounded-full ${
              dark ? "bg-brand-primary text-white" : "bg-brand-accent text-brand-text"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}

/* --------------------------- BENEFICIARIES --------------------------- */

function Beneficiaries() {
  const stories = [
    {
      name: "Afaf",
      role: "Étudiante · animatrice",
      quote:
        "Magic Crochet gave me a way to fund my studies without leaning on my family.",
    },
    {
      name: "Fati",
      role: "Étudiante · animatrice",
      quote:
        "I walked in unsure. I left with confidence, a new craft, and a paycheck.",
    },
    {
      name: "Manal",
      role: "Bénéficiaire · artisane",
      quote:
        "Every dirham I earn here is a step closer to stability for my family.",
    },
  ];
  return (
    <section className="py-28 sm:py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            05 — Beneficiaries
          </p>
          <h2 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight italic">
            A single thread can re-stitch hope.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {stories.map((s) => (
            <figure
              key={s.name}
              className="p-8 rounded-[2.5rem] bg-brand-muted/60 border border-brand-text/5 flex flex-col gap-8 min-h-[320px]"
            >
              <blockquote className="font-serif text-2xl leading-snug text-balance">
                “{s.quote}”
              </blockquote>
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
        <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
          06 — Community
        </p>
        <h2 className="font-serif text-4xl sm:text-6xl tracking-tight">
          Join 7 000+ on{" "}
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
          New drops, behind-the-loop workshops, and our beneficiaries' stories.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------ FOOTER ------------------------------ */

function Footer() {
  return (
    <footer className="pt-28 pb-12 bg-brand-text text-white rounded-t-[3rem] sm:rounded-t-[4rem] px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 mb-24">
          <div>
            <h2 className="font-serif text-5xl sm:text-6xl leading-[0.95] tracking-tight italic">
              Join the Magic
              <br />
              atelier.
            </h2>
            <p className="opacity-50 text-lg mt-6 max-w-sm">
              Drops, ateliers, and impact reports — once a month. No spam.
            </p>
            <form
              className="mt-10 flex gap-2 p-2 bg-white/[0.06] rounded-full border border-white/10 max-w-md"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                maxLength={120}
                placeholder="Your email address"
                className="bg-transparent flex-1 px-5 text-sm focus:outline-none placeholder:text-white/30"
              />
              <button
                type="submit"
                className="bg-white text-brand-text px-6 py-3 rounded-full text-sm font-semibold hover:bg-brand-accent transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.25em] opacity-40 mb-4">Connect</p>
              <a
                href="https://www.instagram.com/magic.crochet_0/"
                target="_blank"
                rel="noreferrer noopener"
                className="block hover:text-brand-accent transition-colors"
              >
                Instagram
              </a>
              <a href="#" className="block hover:text-brand-accent transition-colors">
                Facebook
              </a>
              <a href="#" className="block hover:text-brand-accent transition-colors">
                TikTok
              </a>
            </div>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.25em] opacity-40 mb-4">Studio</p>
              <a href="#process" className="block hover:text-brand-accent transition-colors">
                Process
              </a>
              <a href="#workshops" className="block hover:text-brand-accent transition-colors">
                Ateliers
              </a>
              <a href="#impact" className="block hover:text-brand-accent transition-colors">
                Impact
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-white/10 gap-4">
          <span className="font-serif text-2xl italic">Magic Crochet</span>
          <div className="flex flex-wrap gap-6 justify-center text-[10px] uppercase tracking-[0.25em] opacity-40">
            <span>© 2026 — Enactus EMSI Casablanca</span>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
