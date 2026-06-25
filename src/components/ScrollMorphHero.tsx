import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const imageModules = import.meta.glob<{
  default: string;
}>("/public/ressources/atelier/gallery-*.jpg", { eager: true });

const allImages = Object.entries(imageModules)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, mod]) => mod.default);

// Start with 8 — easy to add more later
const images = allImages.slice(0, 8);

// Fixed scatter: spread around viewport, no overlap
const scatter = [
  { x: -340, y: -200, rot: -15 },
  { x: 300, y: -220, rot: 10 },
  { x: -380, y: 140, rot: 18 },
  { x: 340, y: 170, rot: -12 },
  { x: -170, y: -280, rot: 7 },
  { x: 200, y: 260, rot: -9 },
  { x: -300, y: -40, rot: 14 },
  { x: 350, y: -20, rot: -18 },
];

export function ScrollMorphHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".morph-card");
      const n = cards.length;
      if (!n) return;

      // ─── SCATTER ───
      gsap.set(cards, (i) => ({
        x: scatter[i]?.x ?? 0,
        y: scatter[i]?.y ?? 0,
        rotation: scatter[i]?.rot ?? 0,
        scale: 0.65,
        opacity: 0,
      }));

      gsap.to(cards, { opacity: 1, duration: 0.4, stagger: 0.04, delay: 0.15 });
      gsap.set(introRef.current, { opacity: 1 });
      gsap.set(contentRef.current, { opacity: 0 });

      // ─── MASTER TIMELINE ───
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
        },
      });

      // ── PHASE 1: Scatter → Line ──
      tl.to(
        cards,
        {
          x: (i) => (i - (n - 1) / 2) * 105,
          y: 0,
          rotation: 0,
          scale: 0.7,
          ease: "power2.inOut",
          stagger: 0.015,
        },
        0,
      );
      tl.to(introRef.current, { opacity: 0, y: -20, ease: "power2.in" }, 0);

      // ── PHASE 2: Line → Circle (large, cards rotate along tangent) ──
      const circleR = 280; // big circle like the reference
      tl.to(
        cards,
        {
          x: (i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            return Math.cos(a) * circleR;
          },
          y: (i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            return Math.sin(a) * circleR;
          },
          rotation: (i) => (i / n) * 360, // cards rotate to follow circle tangent
          scale: 0.75,
          ease: "power2.inOut",
        },
        0.3,
      );

      // ── PHASE 3: Circle → Arc (bottom rainbow) ──
      const arcR = 340;
      tl.to(
        cards,
        {
          x: (i) => {
            const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
            const angle = Math.PI + t * 0.85;
            return Math.cos(angle) * arcR;
          },
          y: (i) => {
            const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
            const angle = Math.PI + t * 0.85;
            return Math.sin(angle) * arcR * 0.45 + 80;
          },
          rotation: (i) => {
            const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
            return t * 20;
          },
          scale: 1,
          ease: "power2.inOut",
        },
        0.65,
      );

      // Fade in content text
      tl.to(contentRef.current, { opacity: 1, y: 0, ease: "power2.out" }, 0.8);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative h-[350vh]">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Intro text — centered inside circle */}
        <div
          ref={introRef}
          className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 pointer-events-none"
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            Nos ateliers
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-tight text-balance">
            La main rencontre{" "}
            <span className="italic text-brand-primary">la maille.</span>
          </h2>
          <p className="mt-8 text-xs uppercase tracking-[0.25em] text-brand-text/40">
            Scroll pour explorer
          </p>
        </div>

        {/* Content text — appears at arc */}
        <div
          ref={contentRef}
          className="absolute bottom-[10%] left-0 right-0 text-center z-10 pointer-events-none px-6"
        >
          <p className="font-serif text-2xl sm:text-3xl lg:text-4xl leading-tight text-balance">
            Trois heures de focus créatif à{" "}
            <span className="italic text-brand-primary">Casablanca.</span>
          </p>
          <p className="mt-3 text-sm text-brand-text/55">
            Tous matériaux inclus. Réservez votre place.
          </p>
        </div>

        {/* Cards */}
        <div className="relative" style={{ width: "700px", height: "600px", maxWidth: "95vw" }}>
          {images.map((src, i) => (
            <div
              key={i}
              className="morph-card absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden shadow-[0_10px_35px_-6px_rgba(28,25,23,0.25)] border border-white/20"
              style={{ willChange: "transform" }}
            >
              <img
                src={src}
                alt={`Atelier crochet ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
