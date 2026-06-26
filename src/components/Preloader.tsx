"use client";

import * as React from "react";
import { useEffect, useState } from "react";

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= 99) {
          clearInterval(interval);
          setTimeout(() => {
            const el = containerRef.current;
            if (el) {
              el.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
              el.style.transform = "translateY(-100%)";
              el.addEventListener("transitionend", () => onComplete(), { once: true });
            } else {
              onComplete();
            }
          }, 300);
          return 99;
        }
        return prev + 1;
      });
    }, 22);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-end justify-start bg-brand-bg overflow-hidden"
    >
      {/* Brand name — top left */}
      <div className="absolute top-10 left-10 sm:top-14 sm:left-14 z-10">
        <span className="font-serif text-2xl italic text-brand-text">Magic</span>
        <span className="font-serif text-2xl italic text-brand-primary"> Crochet</span>
      </div>

      {/* Counter — bottom left */}
      <div className="relative z-10 flex flex-col items-start p-10 sm:p-14">
        <span className="font-serif text-7xl sm:text-8xl font-bold tabular-nums text-brand-text">
          {count}
        </span>
      </div>

      {/* Progress bar — bottom edge */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-brand-text/5">
        <div
          className="h-full bg-brand-primary transition-[width] duration-100 ease-out"
          style={{ width: `${(count / 99) * 100}%` }}
        />
      </div>
    </div>
  );
}
