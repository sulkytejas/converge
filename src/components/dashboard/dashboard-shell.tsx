"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar, type NotificationItem } from "./topbar";
import { MobileGate } from "./mobile-gate";
import { NAV_SECTIONS, navRoleFromCode } from "./nav-config";
import { AdminRoleLabel, isAdminRole } from "~/server/db/enums";
import { api } from "~/trpc/react";

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    title: "3 partner approvals awaiting review",
    time: "15 min ago",
    tone: "orange",
    unread: true,
  },
  {
    id: "2",
    title: "TAT breach: 5 applications exceed 48h SLA",
    time: "1 hour ago",
    tone: "red",
    unread: true,
  },
  {
    id: "3",
    title: "New partner signup: Pacific Study Abroad (Mumbai)",
    time: "2 hours ago",
    tone: "green",
    unread: true,
  },
  {
    id: "4",
    title: "University of Leeds updated commission rates",
    time: "5 hours ago",
    tone: "blue",
  },
  {
    id: "5",
    title: "Monthly morning report generated successfully",
    time: "1 day ago",
    tone: "gray",
  },
];

export interface DashboardShellProps {
  children: ReactNode;
  badges?: Record<string, number | string | undefined>;
  notifications?: NotificationItem[];
  taskCount?: number;
}

export function DashboardShell({
  children,
  badges = { approvals: 7 },
  notifications = DEFAULT_NOTIFICATIONS,
  taskCount = 0,
}: DashboardShellProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const logout = api.authSession.logout.useMutation();
  // Real signed-in admin (collegepond_user) — drives the profile name/role.
  const me = api.authSession.me.useQuery().data;

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } catch {
      // Cookie may already be gone — keep going.
    }
    await utils.invalidate();
    router.replace("/admin/login");
  }

  const userName = me ? `${me.firstName} ${me.lastName}`.trim() : "";
  const roleLabel = me && isAdminRole(me.role) ? AdminRoleLabel[me.role] : "";
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <MobileGate>
    <div className="min-h-screen bg-[#F5F6FA] text-[#1D2939]">
      <Sidebar
        sections={NAV_SECTIONS}
        logoSubtitle="Admin Portal"
        badges={badges}
        role={me && isAdminRole(me.role) ? navRoleFromCode(me.role) : null}
      />
      <Topbar
        userName={userName}
        userInitials={initials}
        roleLabel={roleLabel}
        notifications={notifications}
        taskCount={taskCount}
        onLogout={handleLogout}
      />
      <main className="ml-16 min-h-screen pt-[60px]">
        <div className="p-6">{children}</div>
      </main>
    </div>
    </MobileGate>
  );
}
