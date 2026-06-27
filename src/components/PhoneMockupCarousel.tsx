"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ReviewImage {
  id: string;
  customer_name: string;
  comment: string;
  rating: number;
  image_url: string | null;
}

export function PhoneMockupCarousel({ items }: { items: ReviewImage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [items]);

  function scroll(dir: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  }

  if (!items.length) return null;

  return (
    <section className="py-24 sm:py-32 px-6 bg-brand-bg border-t border-brand-text/10 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            Vos retours
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl leading-tight italic max-w-2xl mx-auto text-balance">
            Ce que disent nos clients.
          </h2>
        </div>

        <div className="relative">
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-white/90 border border-brand-text/10 shadow-sm grid place-items-center hover:bg-white transition-colors"
              aria-label="Défiler vers la gauche"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-none pb-4 -mx-6 px-6 snap-x snap-mandatory"
          >
            {items.map((item, i) => (
              <div
                key={item.id}
                className="shrink-0 snap-center"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <PhoneMockup review={item} />
              </div>
            ))}
          </div>

          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full bg-white/90 border border-brand-text/10 shadow-sm grid place-items-center hover:bg-white transition-colors"
              aria-label="Défiler vers la droite"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function PhoneMockup({ review }: { review: ReviewImage }) {
  const [imgWidth, setImgWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);
  const isHorizontal = imgWidth > imgHeight;

  return (
    <figure className="flex flex-col items-center gap-4 animate-fade-in-up">
      <div className="relative" style={isHorizontal ? { width: "480px", height: "320px" } : { width: "280px", height: "560px" }}>
        <div className="absolute inset-0 rounded-[2rem] border-[3px] border-[#F506EA]/30 bg-[#1c1917] overflow-hidden shadow-[0_24px_60px_-12px_rgba(245,6,234,0.12)]">
          {review.image_url ? (
            <img
              src={review.image_url}
              alt={`Capture de conversation avec ${review.customer_name}`}
              className={`w-full h-full object-contain ${isHorizontal ? "p-2" : "p-1"}`}
              loading="lazy"
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                setImgWidth(target.naturalWidth);
                setImgHeight(target.naturalHeight);
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/20 p-6 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
                <rect x="2" y="2" width="20" height="20" rx="4" />
                <circle cx="8.5" cy="10.5" r="1.5" />
                <circle cx="15.5" cy="10.5" r="1.5" />
                <path d="M8 15c1.5 2 4.5 2 8 0" />
              </svg>
              <p className="text-xs">Aucune capture</p>
            </div>
          )}
          {!isHorizontal && (
            <>
              <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
                <div className="w-20 h-5 rounded-full bg-[#1c1917] border border-white/10" />
              </div>
              <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
                <div className="w-28 h-1 rounded-full bg-white/20" />
              </div>
            </>
          )}
        </div>
        <div
          className="absolute -inset-[3px] pointer-events-none"
          style={{
            borderRadius: isHorizontal ? "1.5rem" : "2.7rem",
            background: "linear-gradient(135deg, rgba(245,6,234,0.2) 0%, transparent 40%, transparent 60%, rgba(245,6,234,0.15) 100%)",
          }}
        />
      </div>

      <figcaption className="text-center max-w-[460px]">
        <p className="font-medium text-sm text-brand-text">{review.customer_name || "Client"}</p>
        <div className="flex justify-center gap-0.5 my-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < review.rating ? "#F506EA" : "none"} stroke={i < review.rating ? "#F506EA" : "#d6d3d1"} strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
        </div>
        {review.comment && (
          <p className="text-xs text-brand-text/50 line-clamp-2 italic">"{review.comment}"</p>
        )}
      </figcaption>
    </figure>
  );
}