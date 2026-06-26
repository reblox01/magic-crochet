import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

import atelier from "@/assets/atelier.jpg";
import processHands from "@/assets/process-hands.jpg";
import processStitches from "@/assets/process-stitches.jpg";
import productBag from "@/assets/product-bag.jpg";
import productHat from "@/assets/product-hat.jpg";
import productDecor from "@/assets/product-decor.jpg";
import heroYarn from "@/assets/hero-yarn.jpg";

/**
 * Inspired by 21st.dev "Scroll Morph Hero" by prashantsom75.
 * Scattered tiles → converge to a circle → fan out as a rainbow arc,
 * all driven by the section's scroll progress.
 */

const IMAGES = [
  atelier,
  processHands,
  processStitches,
  productBag,
  productHat,
  productDecor,
  heroYarn,
  atelier,
  processHands,
  productBag,
  processStitches,
  productHat,
];

// Random-ish but stable scatter positions (vw / vh based, deterministic)
const SCATTER = [
  { x: -38, y: -28, r: -8 },
  { x: 32, y: -34, r: 6 },
  { x: -18, y: 30, r: 12 },
  { x: 40, y: 22, r: -10 },
  { x: -42, y: 6, r: 4 },
  { x: 18, y: -10, r: -6 },
  { x: 8, y: 34, r: 8 },
  { x: -30, y: -8, r: -4 },
  { x: 28, y: 8, r: 10 },
  { x: -8, y: -36, r: -12 },
  { x: 44, y: -6, r: 8 },
  { x: -22, y: 22, r: -8 },
];

function MorphTile({
  src,
  index,
  total,
  progress,
}: {
  src: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const scatter = SCATTER[index % SCATTER.length];

  // Circle position
  const circleAngle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const cx = Math.cos(circleAngle) * 26;
  const cy = Math.sin(circleAngle) * 26;

  // Arc position (rainbow fan along the bottom)
  const arcSpread = Math.PI * 0.95;
  const arcAngle = -Math.PI / 2 - arcSpread / 2 + (index / (total - 1)) * arcSpread;
  const ax = Math.cos(arcAngle) * 38;
  const ay = Math.sin(arcAngle) * 38 + 18;
  const arcRot = (arcAngle + Math.PI / 2) * (180 / Math.PI);

  // Three-phase interpolation: 0 → 0.4 scatter→circle, 0.4 → 0.8 circle→arc
  const x = useTransform(progress, [0, 0.4, 0.8, 1], [scatter.x, cx, ax, ax]);
  const y = useTransform(progress, [0, 0.4, 0.8, 1], [scatter.y, cy, ay, ay]);
  const rotate = useTransform(progress, [0, 0.4, 0.8, 1], [scatter.r, 0, arcRot, arcRot]);
  const scale = useTransform(progress, [0, 0.4, 0.8, 1], [0.95, 0.55, 0.7, 0.7]);
  const opacity = useTransform(progress, [0, 0.05, 0.95, 1], [0, 1, 1, 0.9]);

  return (
    <motion.div
      style={{
        x: useTransform(x, (v) => `${v}vw`),
        y: useTransform(y, (v) => `${v}vh`),
        rotate,
        scale,
        opacity,
      }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <div className="w-[28vw] h-[34vw] sm:w-[18vw] sm:h-[22vw] max-w-[260px] max-h-[320px] min-w-[110px] min-h-[140px] rounded-[1.5rem] overflow-hidden bg-brand-muted shadow-[0_30px_60px_-30px_rgba(28,25,23,0.5)] border border-white/20">
        <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
      </div>
    </motion.div>
  );
}

export function ScrollMorphGallery() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const headingOpacity = useTransform(scrollYProgress, [0, 0.1, 0.7, 0.85], [0, 1, 1, 0]);
  const subOpacity = useTransform(scrollYProgress, [0.75, 0.9], [0, 1]);
  const ringOpacity = useTransform(scrollYProgress, [0.3, 0.45, 0.75, 0.85], [0, 0.4, 0.4, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[320vh] bg-brand-text text-white"
      aria-label="Atelier en mouvement"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(212,163,115,0.18),transparent_60%)]" />

        {/* Center ring guide */}
        <motion.div
          style={{ opacity: ringOpacity }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[52vh] h-[52vh] rounded-full border border-brand-accent/40"
        />

        {/* Heading */}
        <motion.div
          style={{ opacity: headingOpacity }}
          className="absolute top-[12%] left-0 right-0 px-6 text-center z-10 pointer-events-none"
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-accent mb-4">
            L'atelier en mouvement
          </p>
          <h2 className="font-serif text-4xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight italic max-w-3xl mx-auto text-balance">
            Du chaos du fil <br /> à la maille parfaite.
          </h2>
        </motion.div>

        {/* Final caption */}
        <motion.div
          style={{ opacity: subOpacity }}
          className="absolute bottom-[10%] left-0 right-0 px-6 text-center z-10 pointer-events-none"
        >
          <p className="font-serif text-2xl sm:text-3xl italic text-balance max-w-2xl mx-auto">
            « Chaque pièce est un arc-en-ciel de mains, de gestes et d'histoires. »
          </p>
        </motion.div>

        {/* Tiles */}
        <div className="absolute inset-0">
          {IMAGES.map((src, i) => (
            <MorphTile
              key={i}
              src={src}
              index={i}
              total={IMAGES.length}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
