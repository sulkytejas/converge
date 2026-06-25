"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

// Re-mounts on every navigation within the admin shell, so each page
// crossfades + lifts in. The sidebar/topbar (in layout.tsx) stay put.
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The student profile is reached via a cross-page View-Transition morph;
  // skip the Framer entrance there so it doesn't fade the morph target out.
  if (/^\/admin\/students\/[^/]+$/.test(pathname)) {
    return <>{children}</>;
  }
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
