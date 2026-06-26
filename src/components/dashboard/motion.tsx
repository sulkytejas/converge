"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { motion, type Variants } from "motion/react";

// useLayoutEffect on the client (so the count starts at 0 before paint — no
// flash of the final value), useEffect on the server (no-op, avoids warnings).
const useIsoLayout =
  typeof document !== "undefined" ? useLayoutEffect : useEffect;

// Shared motion vocabulary for the dashboards. Sections rise + fade in with a
// gentle stagger; pages crossfade on route change (see template.tsx).

const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const containerVariant: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.02 } },
};

// Stagger container — children wrapped in <FadeUp> cascade in on mount.
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={containerVariant}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// A single section/card that rises + fades in (use inside <Stagger>).
export function FadeUp({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUpVariant} className={className}>
      {children}
    </motion.div>
  );
}

// Counts a numeric value up from 0 on mount (and tweens between updates).
// Accepts the already-formatted string (e.g. "1,234", "₹1.2 Cr", "87%") and
// animates the number inside it, preserving any prefix/suffix. Non-string
// values render unchanged.
export function CountUp({ value }: { value: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  useIsoLayout(() => {
    if (typeof value !== "string") return;
    const el = ref.current;
    if (!el) return;
    const m = /-?[\d,]*\.?\d+/.exec(value);
    if (!m) {
      el.textContent = value;
      return;
    }
    const numStr = m[0];
    const target = parseFloat(numStr.replace(/,/g, ""));
    if (!Number.isFinite(target)) {
      el.textContent = value;
      return;
    }
    const decPart = numStr.split(".")[1];
    const decimals = decPart ? decPart.length : 0;
    const grouped = numStr.includes(",");
    const start = from.current;
    from.current = target;
    const fmt = (n: number) => {
      const r =
        decimals > 0
          ? n.toFixed(decimals)
          : grouped
            ? Math.round(n).toLocaleString("en-IN")
            : String(Math.round(n));
      return value.replace(numStr, r);
    };
    const t0 = performance.now();
    const dur = 650;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(start + (target - start) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    el.textContent = fmt(start);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  if (typeof value !== "string") return <>{value}</>;
  return <span ref={ref}>{value}</span>;
}
