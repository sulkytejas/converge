"use client";

import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
  iconLeft?: boolean;
  iconRight?: boolean;
}

function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="inline-flex"
    >
      <path
        d="M3 8h10m0 0L9 4m4 4L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeft() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="inline-flex"
    >
      <path
        d="M13 8H3m0 0l4-4M3 8l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Button({
  variant = "primary",
  loading,
  iconLeft,
  iconRight,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "h-[44px] rounded-lg font-[family-name:var(--font-inter)] text-sm font-semibold cursor-pointer inline-flex items-center justify-center gap-2 px-6 transition-all relative";
  const variants = {
    primary:
      "bg-[#1570EF] text-white hover:bg-[#1260d4] disabled:opacity-50 disabled:cursor-not-allowed",
    secondary:
      "bg-white text-[#344054] border border-[#D0D5DD] hover:bg-[#F9FAFB]",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${loading ? "pointer-events-none text-transparent" : ""} ${className ?? ""}`}
      disabled={disabled ?? loading}
      {...props}
    >
      {iconLeft && <ArrowLeft />}
      {children}
      {iconRight && <ArrowRight />}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </span>
      )}
    </button>
  );
}
