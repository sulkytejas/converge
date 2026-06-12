"use client";

import { useEffect, useRef, useState } from "react";

// Dev-only login autopilot. The login flow runs for real end to end —
// sendLoginOtp → sandbox code → verifyLoginOtp → session cookie — but in
// `next dev` the server returns the sandbox code (`devOtp`) and this module
// visibly types it into the OTP boxes and submits. Everything here renders
// nothing and does nothing in production builds (devOtp is null there, and
// IS_DEV is compiled to false).

export const IS_DEV = process.env.NODE_ENV === "development";

export interface DevAccount {
  label: string;
  sub: string;
  email: string;
  phone: string; // local digits, +91 assumed
}

// Mirrors prisma/sql/seed.sql — keep in sync when seeding new logins.
export const DEV_ADMIN_ACCOUNTS: DevAccount[] = [
  { label: "Super Admin", sub: "admin@collegepond.com", email: "admin@collegepond.com", phone: "9876543210" },
  { label: "Finance Manager", sub: "finance.manager@collegepond.com", email: "finance.manager@collegepond.com", phone: "9876543211" },
  { label: "Finance Executive", sub: "finance.exec@collegepond.com", email: "finance.exec@collegepond.com", phone: "9876543212" },
  { label: "Counsellor Lead", sub: "counsellor.lead@collegepond.com", email: "counsellor.lead@collegepond.com", phone: "9876543213" },
  { label: "Counsellor", sub: "counsellor@collegepond.com", email: "counsellor@collegepond.com", phone: "9876543214" },
  { label: "Operations Lead", sub: "ops.lead@collegepond.com", email: "ops.lead@collegepond.com", phone: "9876543215" },
  { label: "Operations Executive", sub: "ops.exec@collegepond.com", email: "ops.exec@collegepond.com", phone: "9876543216" },
  { label: "Content Manager", sub: "content.manager@collegepond.com", email: "content.manager@collegepond.com", phone: "9876543217" },
  { label: "BDM", sub: "bdm@collegepond.com", email: "bdm@collegepond.com", phone: "9876543218" },
];

export const DEV_PARTNER_ACCOUNTS: DevAccount[] = [
  { label: "Agency Owner — test", sub: "test@college.pond", email: "test@college.pond", phone: "9111111111" },
  { label: "Agency Owner — GEC", sub: "gec.owner@example.com", email: "gec.owner@example.com", phone: "9822000111" },
  { label: "Agency Owner — EduBridge", sub: "edubridge.owner@example.com", email: "edubridge.owner@example.com", phone: "9822000222" },
  { label: "Agency Counsellor — Nisha", sub: "counsellor@college.pond", email: "counsellor@college.pond", phone: "9822000333" },
];

const TYPE_DELAY_MS = 160;
const START_DELAY_MS = 700;
const SUBMIT_DELAY_MS = 450;

// Types `code` into the OTP boxes digit by digit, then submits — only while
// `active`. Re-arms when `code` changes (e.g. resend).
export function useOtpAutopilot({
  code,
  active,
  length,
  onDigits,
  onSubmit,
}: {
  code: string | null;
  active: boolean;
  length: number;
  onDigits: (digits: string[]) => void;
  onSubmit: (code: string) => void;
}) {
  const [running, setRunning] = useState(false);
  const timers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (!IS_DEV || !active || code?.length !== length) return;
    setRunning(true);
    const ts: NodeJS.Timeout[] = [];
    for (let i = 0; i < length; i++) {
      ts.push(
        setTimeout(
          () => {
            const digits = Array.from({ length }, (_, j) =>
              j <= i ? (code[j] ?? "") : "",
            );
            onDigits(digits);
          },
          START_DELAY_MS + i * TYPE_DELAY_MS,
        ),
      );
    }
    ts.push(
      setTimeout(
        () => {
          setRunning(false);
          onSubmit(code);
        },
        START_DELAY_MS + length * TYPE_DELAY_MS + SUBMIT_DELAY_MS,
      ),
    );
    timers.current = ts;
    return () => {
      ts.forEach(clearTimeout);
      setRunning(false);
    };
    // onDigits/onSubmit are stable enough per render cycle; re-arming is
    // keyed off the code itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, active, length]);

  return running;
}

export function DevAutopilotBadge({ visible }: { visible: boolean }) {
  if (!IS_DEV || !visible) return null;
  return (
    <div className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium text-[#7F56D9]">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7F56D9]" />
      Dev autopilot — entering the code for you…
    </div>
  );
}

// Compact seed-account picker shown under the login form in dev. Picking an
// account fills the form and fires the real Send OTP path.
export function DevQuickLogin({
  accounts,
  onPick,
  busy,
}: {
  accounts: DevAccount[];
  onPick: (account: DevAccount) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!IS_DEV) return null;
  return (
    <div className="mt-6 rounded-xl border border-dashed border-[#D6BBFB] bg-[#FCFAFF] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold text-[#7F56D9]"
      >
        <span className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-3.5 w-3.5"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Dev quick login
        </span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="mt-2 grid max-h-[200px] grid-cols-1 gap-1 overflow-y-auto">
          {accounts.map((a) => (
            <button
              key={a.email}
              type="button"
              disabled={busy}
              onClick={() => onPick(a)}
              className="cursor-pointer rounded-lg border border-transparent px-2.5 py-1.5 text-left transition-colors hover:border-[#D6BBFB] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="block text-xs font-semibold text-[#344054]">
                {a.label}
              </span>
              <span className="block text-[11px] text-[#98A2B3]">{a.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
