"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface ReviewImage {
  id: string;
  customer_name: string;
  comment: string;
  rating: number;
  image_url: string | null;
}

const SCATTER_H = [
  { x: -40, y: 15, r: -12, s: 0.3 },
  { x: 35, y: -20, r: 8, s: 0.35 },
  { x: -30, y: 10, r: -5, s: 0.4 },
  { x: 45, y: 5, r: 10, s: 0.25 },
  { x: -25, y: -15, r: -8, s: 0.45 },
  { x: 30, y: 20, r: 6, s: 0.3 },
  { x: -42, y: -5, r: -10, s: 0.2 },
  { x: 38, y: 12, r: 7, s: 0.35 },
  { x: -18, y: -25, r: -4, s: 0.5 },
  { x: 50, y: -10, r: 12, s: 0.2 },
  { x: -35, y: 8, r: -9, s: 0.3 },
  { x: 28, y: -18, r: 5, s: 0.4 },
];

function PhoneMockupTile({
  review,
  index,
  total,
  progress,
  isActive,
}: {
  review: ReviewImage;
  index: number;
  total: number;
  progress: ReturnType<typeof useMotionValue<number>>;
  isActive: boolean;
}) {
  const scatter = SCATTER_H[index % SCATTER_H.length];
  const itemProgress = index / Math.max(total - 1, 1);

  const x = useTransform(progress, [itemProgress - 0.15, itemProgress, itemProgress + 0.15], [scatter.x, 0, scatter.x]);
  const y = useTransform(progress, [itemProgress - 0.15, itemProgress, itemProgress + 0.15], [scatter.y, 0, scatter.y]);
  const rotate = useTransform(progress, [itemProgress - 0.15, itemProgress, itemProgress + 0.15], [scatter.r, 0, scatter.r]);
  const scale = useTransform(progress, [itemProgress - 0.15, itemProgress, itemProgress + 0.15], [scatter.s, 1, scatter.s]);
  const opacity = useTransform(progress, [itemProgress - 0.2, itemProgress - 0.05, itemProgress + 0.05, itemProgress + 0.2], [0, 1, 1, 0]);

  const sprungScale = useSpring(scale, { stiffness: 300, damping: 30 });
  const sprungRotate = useSpring(rotate, { stiffness: 300, damping: 30 });
  const sprungX = useSpring(x, { stiffness: 300, damping: 30 });
  const sprungY = useSpring(y, { stiffness: 300, damping: 30 });
  const sprungOpacity = useSpring(opacity, { stiffness: 300, damping: 30 });

  return (
    <motion.div
      style={{
        x: useTransform(sprungX, (v) => `${v}vw`),
        y: useTransform(sprungY, (v) => `${v}vh`),
        rotate: sprungRotate,
        scale: sprungScale,
        opacity: sprungOpacity,
      }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
    >
      <PhoneMockupCard review={review} isActive={isActive} />
    </motion.div>
  );
}

function PhoneMockupCard({ review, isActive }: { review: ReviewImage; isActive: boolean }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgWidth, setImgWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);
  const isHorizontal = imgWidth > imgHeight && imgWidth > 0;

  return (
    <div className={`relative ${isHorizontal ? "w-[480px] h-[320px]" : "w-[280px] h-[560px]"} transition-all duration-300`}>
      <div className="absolute inset-0 rounded-[2rem] border-[3px] border-[#F506EA]/30 bg-[#1c1917] overflow-hidden shadow-[0_24px_60px_-12px_rgba(245,6,234,0.12)] transition-all duration-500 group-hover:border-[#F506EA]/60 group-hover:shadow-[0_30px_60px_-15px_rgba(245,6,234,0.18)]">
        {review.image_url ? (
          <img
            src={review.image_url}
            alt={`Capture de conversation avec ${review.customer_name || "Client"}`}
            className={`w-full h-full object-contain ${isHorizontal ? "p-2" : "p-1"} transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={(e) => {
              const target = e.target as HTMLImageElement;
              setImgWidth(target.naturalWidth);
              setImgHeight(target.naturalHeight);
              setImgLoaded(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/20 p-6 text-center">
            <ImageIcon className="size-10 mb-3 opacity-40" />
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
        className="absolute -inset-[3px] pointer-events-none transition-all duration-300"
        style={{
          borderRadius: isHorizontal ? "1.5rem" : "2.7rem",
          background: "linear-gradient(135deg, rgba(245,6,234,0.2) 0%, transparent 40%, transparent 60%, rgba(245,6,234,0.15) 100%)",
          opacity: isActive ? 1 : 0.5,
        }}
      />
      <figcaption className="absolute bottom-[-80px] left-1/2 -translate-x-1/2 text-center max-w-[460px] w-full px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
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
    </div>
  );
}

export function ReviewsMorphGallery({ items }: { items: ReviewImage[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { scrollXProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
    axis: "x",
  });

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [items]);

  const scroll = (dir: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  if (!items.length) return null;

  const total = Math.min(items.length, 12);

  return (
    <section className="py-24 sm:py-32 px-6 bg-brand-bg border-t border-brand-text/10 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            Vos retours
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight italic max-w-3xl mx-auto text-balance">
            Ce que disent nos clients.
          </h2>
        </div>

        <div className="relative">
          <div
            ref={containerRef}
            className="relative h-[60vh] min-h-[480px] max-h-[700px] overflow-hidden"
            onWheel={handleWheel}
          >
            <motion.div
              style={{ x: useTransform(scrollXProgress, [0, 1], ["0%", "-100%"]) }}
              className="flex gap-8 h-full items-center"
            >
              {items.slice(0, total).map((review, i) => (
                <div key={review.id} className="flex-shrink-0 group relative z-10">
                  <PhoneMockupTile
                    review={review}
                    index={i}
                    total={total}
                    progress={scrollXProgress}
                    isActive={i === activeIndex}
                  />
                </div>
              ))}
            </motion.div>

            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20 pointer-events-none"
              aria-hidden="true"
            >
              {items.slice(0, total).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-brand-text/20 transition-colors"
                  style={{ backgroundColor: i === activeIndex ? "#F506EA" : "rgba(28,25,23,0.2)" }}
                  animate={{ scale: i === activeIndex ? 1.3 : 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              ))}
            </div>
          </div>

          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 size-12 rounded-full bg-white/90 border border-brand-text/10 shadow-sm grid place-items-center hover:bg-white transition-colors"
              aria-label="Défiler vers la gauche"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 size-12 rounded-full bg-white/90 border border-brand-text/10 shadow-sm grid place-items-center hover:bg-white transition-colors"
              aria-label="Défiler vers la droite"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>

        <div className="mt-12 text-center">
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-brand-text text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors active:scale-[0.97]"
          >
            Laisser votre capture
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}