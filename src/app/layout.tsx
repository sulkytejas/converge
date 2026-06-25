import "~/styles/globals.css";

import { type Metadata } from "next";
import { Dancing_Script, Inter } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ViewTransitions } from "next-view-transitions";

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
