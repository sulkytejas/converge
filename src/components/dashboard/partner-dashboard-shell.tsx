"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileGate } from "./mobile-gate";
import { PARTNER_NAV_SECTIONS } from "./partner-nav-config";
import { api } from "~/trpc/react";

export function PartnerDashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const me = api.auth.me.useQuery(undefined, { retry: false });
  const utils = api.useUtils();
  const logout = api.auth.logout.useMutation();

  // Persistent partner notification feed (counsellor decisions, etc.).
  const feed = api.partnerNotifications.list.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const markAllRead = api.partnerNotifications.markAllRead.useMutation({
    onSuccess: () => void utils.partnerNotifications.list.invalidate(),
  });

  const userName =
    `${me.data?.firstName ?? ""} ${me.data?.lastName ?? ""}`.trim() ||
    (me.data?.email ?? "Partner");

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } catch {
      // Even if the server call fails (e.g. cookie already gone), continue
      // with the bounce — clearing the client cache + navigating to /login is
      // the user-visible part.
    }
    await utils.invalidate();
    router.replace("/login");
  }

  return (
    <MobileGate>
    <div className="min-h-screen bg-[#F5F6FA] text-[#1D2939]">
      <Sidebar
        sections={PARTNER_NAV_SECTIONS}
        logoSubtitle="Partner Portal"
        onLogout={handleLogout}
      />
      <Topbar
        userName={userName}
        userInitials={initials}
        roleLabel="Partner"
        searchPlaceholder="Search students, applications…"
        accountHref="/partner/account"
        notifications={feed.data?.notifications ?? []}
        onMarkAllRead={() => {
          if ((feed.data?.unread ?? 0) > 0) markAllRead.mutate();
        }}
        onLogout={handleLogout}
      />
      <main className="ml-16 min-h-screen pt-[60px]">
        <div className="p-6">{children}</div>
      </main>
    </div>
    </MobileGate>
  );
}
