"use client";

import { api } from "~/trpc/react";

export default function DashboardPage() {
  const me = api.authSession.me.useQuery().data;
  const firstName = me?.firstName ?? "";

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#101828]">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[#667085]">
            Here&apos;s what&apos;s happening across Collegepond today.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-[#D0D5DD] bg-white p-12 text-center">
        <p className="text-sm text-[#667085]">
          Dashboard content goes here. The shell (sidebar + topbar) is provided
          by the route-group layout at{" "}
          <code className="rounded bg-[#F2F4F7] px-1.5 py-0.5 text-[12px] text-[#101828]">
            src/app/(dashboard)/layout.tsx
          </code>
          .
        </p>
      </div>
    </>
  );
}
