"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar, type NotificationItem } from "./topbar";
import { NAV_SECTIONS, ROLE_OPTIONS, type AdminRole } from "./nav-config";

const STORAGE_KEY = "cp-sidebar-collapsed";

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
  initialRole?: AdminRole;
  badges?: Record<string, number | string | undefined>;
  notifications?: NotificationItem[];
  taskCount?: number;
}

export function DashboardShell({
  children,
  initialRole = "super_admin",
  badges = { approvals: 7 },
  notifications = DEFAULT_NOTIFICATIONS,
  taskCount = 0,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<AdminRole>(initialRole);

  // Hydrate collapsed state from localStorage on mount
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

  const activeRole = ROLE_OPTIONS.find((r) => r.value === role) ?? ROLE_OPTIONS[0]!;
  const initials = activeRole.name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1D2939]">
      <Sidebar
        collapsed={collapsed}
        sections={NAV_SECTIONS}
        logoSubtitle="Admin Portal"
        badges={badges}
        footer={
          <>
            <label
              htmlFor="role-switcher"
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-[#98A2B3] uppercase"
            >
              Demo as
            </label>
            <select
              id="role-switcher"
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="w-full cursor-pointer rounded-md border border-[#D0D5DD] bg-white px-2.5 py-1.5 text-[13px] text-[#344054] outline-none transition-colors focus:border-[#1570EF] focus:shadow-[0_0_0_3px_rgba(21,112,239,0.12)]"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.name}
                </option>
              ))}
            </select>
          </>
        }
      />
      <Topbar
        collapsed={collapsed}
        onToggleSidebar={toggleSidebar}
        userName={activeRole.name}
        userInitials={initials}
        roleLabel={activeRole.label}
        notifications={notifications}
        taskCount={taskCount}
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
