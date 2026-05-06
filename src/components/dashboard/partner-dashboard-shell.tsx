"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { PARTNER_NAV_SECTIONS } from "./partner-nav-config";
import { api } from "~/trpc/react";

const STORAGE_KEY = "cp-partner-sidebar-collapsed";

export function PartnerDashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const me = api.auth.me.useQuery(undefined, { retry: false });

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const userName =
    `${me.data?.firstName ?? ""} ${me.data?.lastName ?? ""}`.trim() ||
    me.data?.email ||
    "Partner";

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleLogout() {
    // Clearing the cookie cleanly will need a backend endpoint; for now we
    // just bounce to /login and rely on TTL expiry.
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1D2939]">
      <Sidebar
        collapsed={collapsed}
        sections={PARTNER_NAV_SECTIONS}
        logoSubtitle="Partner Portal"
        onLogout={handleLogout}
      />
      <Topbar
        collapsed={collapsed}
        onToggleSidebar={toggleSidebar}
        userName={userName}
        userInitials={initials}
        roleLabel="Partner"
        searchPlaceholder="Search students, applications…"
        onLogout={handleLogout}
      />
      <main
        className={`min-h-screen pt-[60px] transition-[margin] duration-250 ${
          collapsed ? "ml-16" : "ml-60"
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
