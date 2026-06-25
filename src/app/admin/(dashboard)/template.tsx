"use client";

import { type ReactNode } from "react";
import { motion } from "motion/react";

// Re-mounts on every navigation within the admin shell, so each page
// crossfades + lifts in. The sidebar/topbar (in layout.tsx) stay put.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
