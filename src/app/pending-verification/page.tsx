"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "~/trpc/react";

export default function PendingVerificationPage() {
  const router = useRouter();
  const me = api.auth.me.useQuery(undefined, { retry: false });

  // Bounce away if state has shifted under us.
  useEffect(() => {
    const target = me.data?.redirectUrl;
    if (target && target !== "/pending-verification") {
      router.replace(target);
    }
  }, [me.data?.redirectUrl, router]);

  if (me.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] text-sm text-[#667085]">
        Loading…
      </div>
    );
  }

  if (me.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] p-6">
        <div className="w-full max-w-[460px] rounded-2xl bg-white p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <h1 className="mb-2 text-xl font-bold text-[#101828]">
            Session Expired
          </h1>
          <p className="mb-6 text-sm text-[#667085]">
            Please sign in again to view your application status.
          </p>
          <Link
            href="/login"
            className="inline-flex h-[42px] w-full items-center justify-center rounded-lg bg-[#1570EF] text-sm font-semibold text-white hover:bg-[#1260d4]"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  const data = me.data!;
  const heading =
    data.status === "rejected"
      ? "Your Application was not Approved"
      : data.status === "inactive"
        ? "Your Account is Inactive"
        : "Your Application is Under Review";

  const blurb =
    data.status === "rejected"
      ? "Our team reviewed your application and was unable to approve it. Please reach out to support@collegepond.com if you'd like to discuss next steps."
      : data.status === "inactive"
        ? "Your account is currently inactive. Contact support@collegepond.com to reactivate."
        : "Thanks for signing up with Collegepond. Our team is reviewing your details and documents. You'll get an email as soon as it's approved — typically within 24-48 hours.";

  const statusLabel =
    data.status === "rejected"
      ? "Rejected"
      : data.status === "inactive"
        ? "Inactive"
        : "Under Review";

  const accentBg =
    data.status === "rejected" || data.status === "inactive"
      ? "bg-[rgba(240,68,56,0.1)]"
      : "bg-[rgba(247,144,9,0.1)]";
  const accentFg =
    data.status === "rejected" || data.status === "inactive"
      ? "text-[#F04438]"
      : "text-[#F79009]";
  const accentDot =
    data.status === "rejected" || data.status === "inactive"
      ? "#F04438"
      : "#F79009";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] p-6">
      <div className="w-full max-w-[560px] rounded-2xl bg-white p-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${accentBg}`}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 8v4l3 2M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"
              stroke={accentDot}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-[#101828]">
          {data.firstName ? `Hi ${data.firstName}, ` : ""}{heading}
        </h1>
        <p className="mx-auto mb-8 max-w-[420px] text-center text-sm leading-relaxed text-[#667085]">
          {blurb}
        </p>

        <div className="mb-6 grid grid-cols-2 gap-3.5 rounded-[10px] bg-[#F9FAFB] p-5 text-left">
          {data.applicationId && (
            <div>
              <div className="text-[11px] font-medium tracking-wide text-[#98A2B3] uppercase">
                Application ID
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[#101828]">
                {data.applicationId}
              </div>
            </div>
          )}
          <div>
            <div className="text-[11px] font-medium tracking-wide text-[#98A2B3] uppercase">
              Status
            </div>
            <div className="mt-0.5">
              <span className={`inline-flex items-center gap-1.5 rounded-[10px] ${accentBg} px-2.5 py-0.5 text-xs font-semibold ${accentFg}`}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <circle cx="4" cy="4" r="3" fill={accentDot} />
                </svg>
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-[11px] font-medium tracking-wide text-[#98A2B3] uppercase">
              Email
            </div>
            <div className="mt-0.5 text-sm font-semibold text-[#101828]">
              {data.email}
            </div>
          </div>
        </div>

        <p className="mb-6 text-center text-[13px] text-[#98A2B3]">
          You&apos;ll receive an email at <strong>{data.email}</strong> when the
          review is complete.
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
