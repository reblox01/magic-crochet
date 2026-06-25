import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onUpdate: () => {
          setProgress(Math.round(tl.progress() * 100));
        },
        onComplete: () => {
          // Exit animation
          const exitTl = gsap.timeline({
            onComplete: () => {
              onComplete();
            },
          });

          // Ball rises and fades
          exitTl.to(ballRef.current, {
            y: -120,
            scale: 1.3,
            opacity: 0,
            duration: 0.6,
            ease: "power3.in",
          });

          // Counter slides out
          exitTl.to(
            progressRef.current,
            {
              x: -60,
              opacity: 0,
              duration: 0.4,
              ease: "power2.in",
            },
            "<",
          );

          // Container wipes up
          exitTl.to(
            containerRef.current,
            {
              yPercent: -100,
              duration: 0.8,
              ease: "power4.inOut",
            },
            "-=0.2",
          );
        },
      });

      // Phase 1: Ball drops in with bounce
      tl.fromTo(
        ballRef.current,
        { y: -250, scale: 0.2, opacity: 0, rotation: -30 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          rotation: 0,
          duration: 1.2,
          ease: "bounce.out",
        },
      );

      // Phase 2: Ball pulses while "loading"
      tl.to(ballRef.current, {
        scale: 1.08,
        duration: 0.5,
        yoyo: true,
        repeat: 3,
        ease: "sine.inOut",
      });

      // Phase 3: Ball shrinks slightly before exit
      tl.to(ballRef.current, {
        scale: 0.9,
        duration: 0.3,
        ease: "power2.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-brand-bg overflow-hidden"
    >
      {/* Yarn ball */}
      <div
        ref={ballRef}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        {/* Gradient ball simulating yarn texture */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#e8c9a0] via-[#d4a373] to-[#914110] shadow-[0_10px_40px_rgba(145,65,16,0.35)]" />
          {/* Yarn strand detail */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute top-3 left-4 w-12 h-px bg-white/25 rotate-[25deg] rounded-full" />
            <div className="absolute top-6 left-3 w-14 h-px bg-white/15 rotate-[-15deg] rounded-full" />
            <div className="absolute top-9 left-5 w-10 h-px bg-white/20 rotate-[40deg] rounded-full" />
            <div className="absolute bottom-5 left-4 w-11 h-px bg-white/10 rotate-[-30deg] rounded-full" />
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-brand-text/40 font-medium">
          Magic Crochet
        </p>
      </div>

      {/* Progress counter — bottom left */}
      <div
        ref={progressRef}
        className="absolute bottom-8 left-8 flex items-baseline gap-1"
      >
        <span className="font-serif text-5xl sm:text-6xl tabular-nums text-brand-text/80">
          {progress}
        </span>
        <span className="text-xs text-brand-text/40 font-medium">%</span>
      </div>

      {/* Thin progress bar at bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-text/5">
        <div
          className="h-full bg-brand-primary transition-[width] duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
