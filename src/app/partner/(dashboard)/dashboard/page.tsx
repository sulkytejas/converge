"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function PartnerDashboardPage() {
  const router = useRouter();
  const me = api.auth.me.useQuery(undefined, { retry: false });
  const recordVisit = api.auth.recordDashboardVisit.useMutation();

  // Bounce away if state has shifted (e.g. unsigned MOU, or status no longer
  // approved). Middleware enforces the cookie; this enforces the "approved +
  // signed" precondition for the dashboard page itself.
  useEffect(() => {
    const target = me.data?.redirectUrl;
    if (target && target !== "/partner/dashboard") {
      router.replace(target);
    }
  }, [me.data?.redirectUrl, router]);

  // Stamp last_login_at on every dashboard mount. useRef guards StrictMode
  // double-invocation in dev so we don't fire twice.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current) return;
    if (me.data?.redirectUrl !== "/partner/dashboard") return;
    recordedRef.current = true;
    recordVisit.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data?.redirectUrl]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#101828]">
          Welcome{me.data?.firstName ? `, ${me.data.firstName}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-[#667085]">
          Here&apos;s an overview of your partnership with Collegepond.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-[#D0D5DD] bg-white p-12 text-center">
        <p className="text-sm text-[#667085]">
          Partner dashboard placeholder — KPIs, recent activity, and quick
          actions will live here.
        </p>
      </div>
    </>
  );
}
