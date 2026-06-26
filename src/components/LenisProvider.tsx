import { useEffect, useRef, createContext, useContext, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

export function LenisProvider({ children }: { children: ReactNode }) {
  const rafRef = useRef<(time: number) => void>(null);
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const instance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
    });

    setLenis(instance);
    instance.on("scroll", ScrollTrigger.update);

    rafRef.current = (time) => {
      instance.raf(time * 1000);
    };
    gsap.ticker.add(rafRef.current);
    gsap.ticker.lagSmoothing(0);

    return () => {
      instance.destroy();
      if (rafRef.current) gsap.ticker.remove(rafRef.current);
    };
  }, []);

  return (
    <LenisContext.Provider value={lenis}>
      {children}
    </LenisContext.Provider>
  );
}
