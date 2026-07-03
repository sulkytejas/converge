import "~/styles/globals.css";

import { type Metadata } from "next";
import { Dancing_Script, Inter } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ViewTransitions } from "next-view-transitions";

// Force every route dynamic (Cache-Control: no-store) so the CDN never caches a
// page's HTML/RSC response. Our pages are auth-gated shells that fetch their real
// data client-side via tRPC, so static prerendering caches nothing useful — but
// it DID let a router RSC prefetch (content-type: text/x-component) get cached
// under a bare page URL and served as raw text to real navigations (the
// /admin/login outage, 2026-07-03). Applying this at the root immunises the whole
// app, including pages added later. See memory: rsc-cdn-cache-poisoning.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collegepond",
  description: "Collegepond — Counselor Portal",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-dancing-script",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${dancingScript.variable}`}>
      <body>
        <ViewTransitions>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ViewTransitions>
      </body>
    </html>
  );
}
