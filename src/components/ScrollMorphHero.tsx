import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const images = [
  { src: "/ressources/atelier/gallery-1.jpg", alt: "Atelier crochet 1" },
  { src: "/ressources/atelier/gallery-2.jpg", alt: "Atelier crochet 2" },
  { src: "/ressources/atelier/gallery-3.jpg", alt: "Atelier crochet 3" },
  { src: "/ressources/atelier/gallery-4.jpg", alt: "Atelier crochet 4" },
];

export function ScrollMorphHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Phase 1: Scattered grid -> circle arrangement
      const cards = gsap.utils.toArray<HTMLElement>(".morph-card");

      // Set initial scattered positions
      gsap.set(cards, {
        x: (i) => [120, -80, 100, -120][i] || 0,
        y: (i) => [-60, 80, -100, 60][i] || 0,
        rotation: (i) => [-8, 12, -5, 10][i] || 0,
        scale: 0.85,
      });

      // Scroll-driven morph: scattered -> circle
      const morphTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          end: "center center",
          scrub: 1,
        },
      });

      // Move cards into circle positions
      cards.forEach((card, i) => {
        const angle = (i / cards.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 140;
        morphTl.to(
          card,
          {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            rotation: 0,
            scale: 1,
            ease: "none",
          },
          0,
        );
      });

      // Phase 2: Circle -> arc spread
      const arcTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "center center",
          end: "bottom 20%",
          scrub: 1,
        },
      });

      cards.forEach((card, i) => {
        const angle = ((i - 1.5) / (cards.length + 1)) * Math.PI * 0.6 + Math.PI;
        const radius = 220;
        arcTl.to(
          card,
          {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * 0.4 - 20,
            scale: 0.9 + (i === 1 || i === 2 ? 0.15 : 0),
            ease: "none",
          },
          0,
        );
      });

      // Text fade in
      gsap.fromTo(
        textRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "expo.out",
          scrollTrigger: {
            trigger: textRef.current,
            start: "top 85%",
          },
        },
      );

      // Circle container fade in
      gsap.fromTo(
        circleRef.current,
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: "expo.out",
          scrollTrigger: {
            trigger: circleRef.current,
            start: "top 85%",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[120vh] flex flex-col items-center justify-center px-6 overflow-hidden"
    >
      <div ref={circleRef} className="relative w-[350px] h-[350px] sm:w-[450px] sm:h-[450px]">
        {images.map((img, i) => (
          <div
            key={i}
            className="morph-card absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-40 sm:w-40 sm:h-52 rounded-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(28,25,23,0.25)] border-2 border-white/20"
          >
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <div ref={textRef} className="mt-16 text-center max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
          Nos ateliers
        </p>
        <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-tight text-balance">
          La main rencontre{" "}
          <span className="italic text-brand-primary">la maille.</span>
        </h2>
        <p className="mt-6 text-lg text-brand-text/65 leading-relaxed max-w-lg mx-auto">
          Sessions collectives ou individuelles, trois heures de focus créatif
          à Casablanca. Tous matériaux inclus.
        </p>
      </div>
    </section>
  );
}
