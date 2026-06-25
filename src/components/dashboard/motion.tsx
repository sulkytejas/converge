"use client";

import { type ReactNode } from "react";
import { motion, type Variants } from "motion/react";

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
