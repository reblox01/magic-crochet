"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon, Star } from "lucide-react";

interface ReviewImage {
  id: string;
  customer_name: string;
  comment: string;
  rating: number;
  image_url: string | null;
}

function PhoneMockupCard({ review }: { review: ReviewImage }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgWidth, setImgWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);
  const isHorizontal = imgWidth > imgHeight && imgWidth > 0;

  return (
    <figure className="group relative overflow-hidden rounded-[2rem] bg-brand-bg">
      <div className="relative aspect-square md:aspect-[4/5] overflow-hidden">
        {review.image_url ? (
          <img
            src={review.image_url}
            alt={`Capture de conversation avec ${review.customer_name || "Client"}`}
            className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={(e) => {
              const target = e.target as HTMLImageElement;
              setImgWidth(target.naturalWidth);
              setImgHeight(target.naturalHeight);
              setImgLoaded(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-brand-text/20 p-6 text-center">
            <ImageIcon className="size-12 mb-3 opacity-40" />
            <p className="text-xs">Aucune capture</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {review.comment && (
          <figcaption className="absolute bottom-0 left-0 right-0 p-5 text-white text-sm leading-relaxed italic opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            "{review.comment}"
          </figcaption>
        )}
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4" fill={i < review.rating ? "#F506EA" : "none"} stroke={i < review.rating ? "#F506EA" : "rgba(255,255,255,0.6)"} strokeWidth={2} />
            ))}
          </div>
          <span className="text-white font-medium text-sm">{review.customer_name || "Client"}</span>
        </div>
      </div>
    </figure>
  );
}

export function ReviewsGallery({ items }: { items: ReviewImage[] }) {
  if (!items.length) return null;

  const visibleItems = items.slice(0, 12).filter((r) => r.image_url);

  if (!visibleItems.length) return null;

  return (
    <section className="py-24 sm:py-32 px-6 bg-brand-bg border-t border-brand-text/10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-medium mb-4">
            Vos retours
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight italic max-w-3xl mx-auto text-balance">
            Ce que disent nos clients.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {visibleItems.map((review, i) => (
            <PhoneMockupCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}