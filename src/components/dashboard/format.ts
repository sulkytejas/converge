// Shared formatting helpers for the admin + partner dashboards.
// Pure functions only — safe to import into any client/server component.

import { UniApplicationStatusLabel } from "~/server/db/enums";

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function timeAgo(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(0, Math.floor((Date.now() - t.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function formatDate(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  return t.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Indian-style compact currency: ₹2.4 Cr, ₹3.5 L, ₹12K, ₹950.
export function formatINR(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function humanize(s: string): string {
  return s.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// UniApplicationStatusLabel is a Record over the enum; cast so a stray/unknown
// status code degrades gracefully instead of rendering "undefined".
export function stageLabel(status: number): string {
  const map = UniApplicationStatusLabel as Record<number, string | undefined>;
  return map[status] ?? `Stage ${status}`;
}

// student.country is stored ISO2 (destination of interest). Map the common
// study-abroad destinations to a display name + flag; fall back gracefully.
const COUNTRY: Record<string, { name: string; flag: string }> = {
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  UK: { name: "United Kingdom", flag: "🇬🇧" },
  US: { name: "United States", flag: "🇺🇸" },
  CA: { name: "Canada", flag: "🇨🇦" },
  AU: { name: "Australia", flag: "🇦🇺" },
  DE: { name: "Germany", flag: "🇩🇪" },
  IE: { name: "Ireland", flag: "🇮🇪" },
  NZ: { name: "New Zealand", flag: "🇳🇿" },
  FR: { name: "France", flag: "🇫🇷" },
  NL: { name: "Netherlands", flag: "🇳🇱" },
  SG: { name: "Singapore", flag: "🇸🇬" },
  IT: { name: "Italy", flag: "🇮🇹" },
  IN: { name: "India", flag: "🇮🇳" },
};

export function countryName(code: string): string {
  return COUNTRY[code.toUpperCase()]?.name ?? code;
}

export function countryFlag(code: string): string {
  return COUNTRY[code.toUpperCase()]?.flag ?? "🌍";
}
