/**
 * Synthetic / illustrative seed data must never render on the production server.
 * Gate every demo-only section behind this flag — it is true only in local dev
 * (`next dev`), and false in any production build (`next build` → NODE_ENV=production).
 *
 * Use for features whose UI is built ahead of their real backend (e.g. the BDM CRM
 * sub-sections and TAT Management), so prod shows only real data, never mock records.
 */
export const SHOW_DEMO_DATA = process.env.NODE_ENV === "development";
