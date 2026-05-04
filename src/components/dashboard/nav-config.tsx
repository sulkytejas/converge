import { type ReactNode } from "react";
import {
  ApprovalsIcon,
  AuditLogIcon,
  BarChartIcon,
  BillingIcon,
  CalendarIcon,
  ClockIcon,
  CommissionIcon,
  DashboardIcon,
  InvoiceIcon,
  PartnersIcon,
  PlacementsIcon,
  ReconciliationIcon,
  SearchIcon,
  SettingsIcon,
  StudentsIcon,
  UsersIcon,
} from "./nav-icons";

export type AdminRole =
  | "super_admin"
  | "bdm"
  | "ops_team_lead"
  | "ops_counselor"
  | "finance_mgr"
  | "finance_exec"
  | "content_mgr";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badgeKey?: string;
  disabled?: boolean;
  roles?: AdminRole[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface RoleOption {
  value: AdminRole;
  name: string;
  label: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: "super_admin", name: "Suraj Bajaj", label: "Super Admin" },
  { value: "bdm", name: "Aarav Kulkarni", label: "BDM" },
  { value: "ops_team_lead", name: "Priya Mehta", label: "Ops Team Lead" },
  { value: "ops_counselor", name: "Rahul Verma", label: "Ops Counselor" },
  { value: "finance_mgr", name: "Neha Sharma", label: "Finance Mgr" },
  { value: "finance_exec", name: "Amit Patel", label: "Finance Exec" },
  { value: "content_mgr", name: "Kavita Rao", label: "Content Mgr" },
];

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: <DashboardIcon /> },
      { label: "Partners", href: "/admin/partners", icon: <PartnersIcon /> },
      { label: "Students", href: "/admin/students", icon: <StudentsIcon /> },
      {
        label: "Student Placements",
        href: "/admin/student-placements",
        icon: <PlacementsIcon />,
      },
      {
        label: "Counselor Approvals",
        href: "/admin/counselor-approvals",
        icon: <ApprovalsIcon />,
        badgeKey: "approvals",
      },
      {
        label: "TAT Management",
        href: "/admin/tat-management",
        icon: <ClockIcon />,
      },
      { label: "Uni Assist", href: "/admin/uni-assist", icon: <SearchIcon /> },
    ],
  },
  {
    label: "Business Dev",
    items: [
      {
        label: "BDM Performance",
        href: "/admin/bdm-performance",
        icon: <BarChartIcon />,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Commission Rates",
        href: "/admin/commission-rates",
        icon: <CommissionIcon />,
      },
      {
        label: "University Billing",
        href: "/admin/university-billing",
        icon: <BillingIcon />,
      },
      {
        label: "Invoices & Payouts",
        href: "/admin/invoices",
        icon: <InvoiceIcon />,
      },
      {
        label: "Reconciliation",
        href: "/admin/reconciliation",
        icon: <ReconciliationIcon />,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Universities",
        href: "/admin/universities",
        icon: <StudentsIcon />,
      },
      { label: "Events", href: "/admin/events", icon: <CalendarIcon /> },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Reports",
        href: "/admin/reports",
        icon: <BarChartIcon />,
        disabled: true,
      },
      { label: "Users", href: "/admin/users", icon: <UsersIcon /> },
      { label: "Settings", href: "/admin/settings", icon: <SettingsIcon /> },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: <AuditLogIcon /> },
    ],
  },
];
