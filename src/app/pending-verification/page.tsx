"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PendingVerificationPage() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const applicationId = params.get("applicationId") ?? "";
  const name = params.get("name") ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] p-6">
      <div className="w-full max-w-[560px] rounded-2xl bg-white p-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(247,144,9,0.1)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 8v4l3 2M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"
              stroke="#F79009"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-[#101828]">
          {name ? `Hi ${name}, ` : ""}Your Application is Under Review
        </h1>
        <p className="mx-auto mb-8 max-w-[420px] text-center text-sm leading-relaxed text-[#667085]">
          Thanks for signing up with Collegepond. Our team is reviewing your
          details and documents. You&apos;ll get an email as soon as it&apos;s approved —
          typically within 24–48 hours.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3.5 rounded-[10px] bg-[#F9FAFB] p-5 text-left">
          {applicationId && (
            <div>
              <div className="text-[11px] font-medium tracking-wide text-[#98A2B3] uppercase">
                Application ID
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[#101828]">
                {applicationId}
              </div>
            </div>
          )}
          <div>
            <div className="text-[11px] font-medium tracking-wide text-[#98A2B3] uppercase">
              Status
            </div>
            <div className="mt-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[rgba(247,144,9,0.1)] px-2.5 py-0.5 text-xs font-semibold text-[#F79009]">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <circle cx="4" cy="4" r="3" fill="#F79009" />
                </svg>
                Under Review
              </span>
            </div>
          </div>
          {email && (
            <div className="col-span-2">
              <div className="text-[11px] font-medium tracking-wide text-[#98A2B3] uppercase">
                Email
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[#101828]">
                {email}
              </div>
            </div>
          )}
        </div>

        <p className="mb-6 text-center text-[13px] text-[#98A2B3]">
          You&apos;ll receive an email at <strong>{email || "your registered address"}</strong> when
          the review is complete.
        </p>

        <Link
          href="/login"
          className="flex h-[42px] w-full items-center justify-center rounded-lg border border-[#D0D5DD] bg-white text-sm font-semibold text-[#344054] transition-colors hover:bg-[#F9FAFB]"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
