import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState("00");

  useEffect(() => {
    const ctx = gsap.context(() => {
      const obj = { val: 0 };

      const tl = gsap.timeline({
        onUpdate: () => {
          const v = Math.round(obj.val);
          setCount(v < 10 ? `0${v}` : `${v}`);
        },
        onComplete: () => {
          // Exit: counter slides up + fades, progress bar fills, container wipes
          const exit = gsap.timeline({
            onComplete: () => onComplete(),
          });

          exit.to(counterRef.current, {
            y: -40,
            opacity: 0,
            duration: 0.5,
            ease: "power3.in",
          });

          exit.to(
            barRef.current,
            { scaleX: 1, duration: 0.4, ease: "power2.inOut" },
            "<",
          );

          exit.to(
            containerRef.current,
            {
              yPercent: -100,
              duration: 0.7,
              ease: "power4.inOut",
            },
            "-=0.15",
          );
        },
      });

      // Count 00 → 99
      tl.to(obj, {
        val: 99,
        duration: 2.2,
        ease: "power1.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-end justify-start bg-brand-bg overflow-hidden"
    >
      {/* Counter — bottom left */}
      <div ref={counterRef} className="relative z-10 p-8 sm:p-12">
        <span className="font-serif text-[100px] sm:text-[140px] leading-none tabular-nums text-brand-text/90 tracking-tighter">
          {count}
        </span>
      </div>

      {/* Progress bar — bottom, synced */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-brand-text/5">
        <div
          ref={barRef}
          className="h-full bg-brand-primary origin-left"
          style={{
            width: "100%",
            transform: `scaleX(${parseInt(count || "0", 10) / 99})`,
            transition: "transform 0.08s linear",
          }}
        />
      </div>
    </div>
  );
}
