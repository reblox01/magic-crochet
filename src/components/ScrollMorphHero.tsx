import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const imageModules = import.meta.glob<{
  default: string;
}>("/public/ressources/atelier/gallery-*.jpg", { eager: true });

const images = Object.entries(imageModules)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, mod], i) => ({
    src: mod.default,
    alt: `Atelier crochet ${i + 1}`,
  }));

// Pre-compute scatter positions (seeded random for consistency)
const scatterPos = images.map(() => ({
  x: (Math.random() - 0.5) * 800,
  y: (Math.random() - 0.5) * 600,
  rot: (Math.random() - 0.5) * 40,
  scale: 0.6 + Math.random() * 0.3,
}));

export function ScrollMorphHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const introTextRef = useRef<HTMLDivElement>(null);
  const contentTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".morph-card");
      const n = cards.length;
      if (!n) return;

      // Stage dimensions
      const stageW = 900;
      const stageH = 600;

      // ─── PHASE 0: Scatter ───
      // Cards start at random scattered positions
      gsap.set(cards, (i) => ({
        x: scatterPos[i].x,
        y: scatterPos[i].y,
        rotation: scatterPos[i].rot,
        scale: scatterPos[i].scale,
        opacity: 0.85,
      }));

      // Intro text visible at start
      gsap.set(introTextRef.current, { opacity: 1 });
      gsap.set(contentTextRef.current, { opacity: 0 });

      // ─── MASTER TIMELINE (scrubbed by scroll) ───
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.5,
          pin: false,
        },
      });

      // Phase 0→1: Scatter → Line (horizontal row across center)
      tl.to(
        cards,
        {
          x: (i) => ((i - (n - 1) / 2) * (stageW * 0.7)) / n,
          y: 0,
          rotation: 0,
          scale: 0.85,
          opacity: 1,
          stagger: 0.02,
          ease: "power2.inOut",
        },
        0,
      );

      // Fade out intro text during scatter→line
      tl.to(
        introTextRef.current,
        { opacity: 0, y: -30, ease: "power2.in" },
        0,
      );

      // Phase 1→2: Line → Circle
      const circleRadius = Math.min(160, stageW * 0.18);
      tl.to(
        cards,
        {
          x: (i) => {
            const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
            return Math.cos(angle) * circleRadius;
          },
          y: (i) => {
            const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
            return Math.sin(angle) * circleRadius;
          },
          scale: 0.9,
          rotation: 0,
          ease: "power2.inOut",
        },
        0.3,
      );

      // Phase 2→3: Circle → Arc (rainbow arch at bottom)
      const arcRadius = Math.min(320, stageW * 0.38);
      const arcSpread = Math.PI * 0.85; // how much of the circle to use
      tl.to(
        cards,
        {
          x: (i) => {
            const t = (i - (n - 1) / 2) / ((n - 1) / 2 || 1);
            const angle = Math.PI + t * (arcSpread / 2);
            return Math.cos(angle) * arcRadius;
          },
          y: (i) => {
            const t = (i - (n - 1) / 2) / ((n - 1) / 2 || 1);
            const angle = Math.PI + t * (arcSpread / 2);
            return Math.sin(angle) * arcRadius * 0.5 + stageH * 0.12;
          },
          scale: 1,
          rotation: (i) => {
            const t = (i - (n - 1) / 2) / ((n - 1) / 2 || 1);
            return t * 15;
          },
          ease: "power2.inOut",
        },
        0.6,
      );

      // Fade in content text when arc forms
      tl.to(
        contentTextRef.current,
        { opacity: 1, y: 0, ease: "power2.out" },
        0.75,
      );

      // Animate progress bar
      const progressEl = containerRef.current?.querySelector(".morph-progress") as HTMLElement;
      if (progressEl) {
        tl.to(
          progressEl,
          { width: "100%", ease: "none" },
          0,
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative h-[400vh]"
    >
      {/* Pinned stage */}
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Intro text (fades out on scroll) */}
        <div
          ref={introTextRef}
          className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 pointer-events-none"
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            Nos ateliers
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-tight text-balance">
            La main rencontre{" "}
            <span className="italic text-brand-primary">la maille.</span>
          </h2>
          <p className="mt-8 text-xs uppercase tracking-[0.25em] text-brand-text/40 animate-pulse">
            Scroll pour explorer
          </p>
        </div>

        {/* Content text (fades in when arc forms) */}
        <div
          ref={contentTextRef}
          className="absolute bottom-[12%] left-0 right-0 text-center z-10 pointer-events-none px-6"
        >
          <p className="font-serif text-2xl sm:text-3xl lg:text-4xl leading-tight text-balance">
            Sessions collectives ou individuelles, trois heures de focus créatif
            à <span className="italic text-brand-primary">Casablanca.</span>
          </p>
          <p className="mt-4 text-sm text-brand-text/55">
            Tous matériaux inclus. Réservez votre place.
          </p>
        </div>

        {/* Morph stage */}
        <div
          ref={stageRef}
          className="relative"
          style={{ width: "900px", height: "600px", maxWidth: "95vw" }}
        >
          {images.map((img, i) => (
            <div
              key={i}
              className="morph-card absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-28 sm:w-28 sm:h-36 rounded-xl overflow-hidden shadow-[0_15px_50px_-10px_rgba(28,25,23,0.3)] border border-white/15"
              style={{ willChange: "transform" }}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                <span className="text-[9px] uppercase tracking-widest text-white/80 font-medium">
                  View Details
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Scroll progress indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-brand-text/10 rounded-full overflow-hidden">
          <div className="h-full bg-brand-primary/40 rounded-full morph-progress" />
        </div>
      </div>
    </section>
  );
}
