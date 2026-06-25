"use client";

import * as React from "react";
import { MotionValue, motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import clsx from "clsx";

const cn = (...args: any[]) => twMerge(clsx(args));

const digitHeight = 50;

interface CounterProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > {
  start?: number;
  end: number;
  duration?: number;
  className?: string;
  fontSize?: number;
}

const Counter = ({
  start = 0,
  end,
  duration = end,
  className,
  fontSize = 40,
  ...rest
}: CounterProps) => {
  const [value, setValue] = useState(start);

  useEffect(() => {
    const interval = setInterval(() => {
      setValue((prev) => (prev < end ? prev + 1 : prev));
    }, (duration / (end - start)) * 1000);
    return () => clearInterval(interval);
  }, [value, end, start, duration]);

  return (
    <div
      style={{ fontSize }}
      {...rest}
      className={cn(
        "flex overflow-hidden rounded px-2 leading-none text-brand-text font-bold tabular-nums",
        className
      )}
    >
      {value >= 100 && <Digit place={100} value={value} />}
      {value >= 10 && <Digit place={10} value={value} />}
      <Digit place={1} value={value} />
    </div>
  );
};

function Digit({ place, value }: { place: number; value: number }) {
  const valueRoundedToPlace = Math.floor(value / place);
  const animatedValue = useSpring(valueRoundedToPlace);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div style={{ height: digitHeight }} className="relative w-[1ch]">
      {[...Array(10)].map((_, i) => (
        <Number key={i} mv={animatedValue} number={i} />
      ))}
    </div>
  );
}

function Number({ mv, number }: { mv: MotionValue; number: number }) {
  const y = useTransform(mv, (latest) => {
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * digitHeight;
    if (offset > 5) memo -= 10 * digitHeight;
    return memo;
  });

  return (
    <motion.span
      style={{ y }}
      className="absolute inset-0 flex items-center justify-center"
    >
      {number}
    </motion.span>
  );
};

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= 99) {
          clearInterval(interval);
          // Start exit after reaching 99
          setTimeout(() => {
            const el = containerRef.current;
            if (el) {
              el.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
              el.style.transform = "translateY(-100%)";
              el.addEventListener("transitionend", () => onComplete(), {
                once: true,
              });
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
      {/* Sliding digit counter — bottom left */}
      <div className="absolute bottom-10 left-10 sm:bottom-14 sm:left-14">
        <Counter
          start={0}
          end={99}
          fontSize={80}
          className="text-brand-text/85"
        />
      </div>

      {/* Progress bar — bottom edge */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-brand-text/5">
        <div
          ref={barRef}
          className="h-full bg-brand-primary transition-[width] duration-100 ease-out"
          style={{ width: `${(count / 99) * 100}%` }}
        />
      </div>
    </div>
  );
}
