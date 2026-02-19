"use client";

import { Logo } from "./logo";

interface AuthLayoutProps {
  leftHeading: React.ReactNode;
  leftSubtext: string;
  leftBottomContent?: React.ReactNode;
  children: React.ReactNode;
  /** If true, show progress bar at top of right panel */
  progressPercent?: number;
}

export function AuthLayout({
  leftHeading,
  leftSubtext,
  leftBottomContent,
  children,
  progressPercent,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117] p-6">
      <div className="flex w-[1020px] min-h-[640px] max-h-[calc(100vh-48px)] overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
        {/* Left Panel */}
        <div className="relative flex w-[42%] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1570EF] via-[#0b4ea2] to-[#083b7a] p-10">
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full bg-white/[0.05]" />
          <div className="pointer-events-none absolute -bottom-15 -left-10 h-[200px] w-[200px] rounded-full bg-white/[0.03]" />

          <Logo className="relative z-[1]" />

          <div className="relative z-[1]">
            <h1 className="mb-3.5 text-[30px] leading-[1.2] font-extrabold text-white">
              {leftHeading}
            </h1>
            <p className="max-w-[320px] text-sm leading-relaxed text-white/70">
              {leftSubtext}
            </p>
          </div>

          {leftBottomContent}
        </div>

        {/* Right Panel */}
        <div className="flex w-[58%] flex-col bg-white relative">
          {progressPercent !== undefined && (
            <div className="h-1 w-full shrink-0 bg-[#E4E7EC]">
              <div
                className="h-full rounded-r bg-[#1570EF] transition-[width] duration-400 ease-in-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-center overflow-y-auto p-11">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
