import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

type Phase = "hidden" | "loading" | "done";

const MIN_VISIBLE_MS = 300;
const FADE_MS = 250;
const START_WIDTH = 8;

/** Fake progress: quick jump, then a slowing creep (Twitter/X style). */
const CREEP_STEPS: Array<[delayMs: number, percent: number]> = [
  [150, 45],
  [500, 65],
  [1200, 80],
  [3000, 88],
  [6000, 93],
];

/**
 * Thin progress line pinned to the top of the screen while a route
 * transition is loading. Gives tap feedback on slow connections, where
 * client-side navigation would otherwise look frozen until loaders resolve.
 *
 * Driven by the router's own `status` ("pending" while loaders run), renders
 * nothing while idle, and never blocks pointer events.
 */
export function RouteProgress() {
  const status = useRouterState({ select: (state) => state.status });
  const [phase, setPhase] = useState<Phase>("hidden");
  const [progress, setProgress] = useState(0);
  const [smooth, setSmooth] = useState(true);

  const timersRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const armedRef = useRef(false);
  const phaseRef = useRef<Phase>("hidden");
  const reducedRef = useRef(false);

  // Track prefers-reduced-motion without re-running the navigation effect.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = query.matches;
    const onChange = (event: MediaQueryListEvent) => {
      reducedRef.current = event.matches;
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const clearTimers = () => {
      for (const timer of timersRef.current) window.clearTimeout(timer);
      timersRef.current = [];
    };
    const later = (callback: () => void, delayMs: number) => {
      timersRef.current.push(window.setTimeout(callback, delayMs));
    };
    const changePhase = (next: Phase) => {
      phaseRef.current = next;
      setPhase(next);
    };

    if (status === "pending") {
      // The very first pending is the document/hydration load — the browser
      // already draws its own line for that one.
      if (!armedRef.current) {
        armedRef.current = true;
        return clearTimers;
      }

      clearTimers();
      startedAtRef.current = Date.now();
      changePhase("loading");

      if (reducedRef.current) {
        setSmooth(false);
        setProgress(100);
        return clearTimers;
      }

      // Snap back to the start without animating the retreat when a
      // previous run was still on screen.
      setSmooth(false);
      setProgress(START_WIDTH);
      for (const [delayMs, percent] of CREEP_STEPS) {
        later(() => {
          setSmooth(true);
          setProgress(percent);
        }, delayMs);
      }
      return clearTimers;
    }

    armedRef.current = true;
    if (phaseRef.current !== "loading") return clearTimers;

    // Settle: finish at 100% (or hide statically), but keep the bar visible
    // for at least MIN_VISIBLE_MS so fast navigations read as feedback.
    clearTimers();
    const waitMs = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAtRef.current));

    if (reducedRef.current) {
      later(() => {
        changePhase("hidden");
        setProgress(0);
      }, waitMs);
      return clearTimers;
    }

    later(() => {
      // Rush to 100%, then fade once the fill has caught up.
      setSmooth(true);
      setProgress(100);
      later(() => {
        changePhase("done");
        later(() => {
          changePhase("hidden");
          setProgress(0);
        }, FADE_MS);
      }, 180);
    }, waitMs);

    return clearTimers;
  }, [status]);

  if (phase === "hidden") return null;

  return (
    <div
      role="progressbar"
      aria-label="Chargement de la page"
      className={`pointer-events-none fixed inset-x-0 z-[100] h-[3px] transition-opacity duration-[250ms] motion-reduce:transition-none ${
        phase === "done" ? "opacity-0" : "opacity-100"
      }`}
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <div
        className={`h-full bg-brand-primary shadow-[0_0_8px_rgba(245,6,234,0.6)] ${
          smooth ? "transition-[width] duration-300 ease-out motion-reduce:transition-none" : ""
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
