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
      { label: "Dashboard", href: "/cp-dashboard", icon: <DashboardIcon /> },
      { label: "Partners", href: "/cp-partners", icon: <PartnersIcon /> },
      { label: "Students", href: "/cp-students", icon: <StudentsIcon /> },
      {
        label: "Student Placements",
        href: "/cp-student-placements",
        icon: <PlacementsIcon />,
      },
      {
        label: "Counselor Approvals",
        href: "/cp-counselor-approvals",
        icon: <ApprovalsIcon />,
        badgeKey: "approvals",
      },
      {
        label: "TAT Management",
        href: "/cp-tat-management",
        icon: <ClockIcon />,
      },
      { label: "Uni Assist", href: "/cp-uni-assist", icon: <SearchIcon /> },
    ],
  },
  {
    label: "Business Dev",
    items: [
      {
        label: "BDM Performance",
        href: "/cp-bdm-performance",
        icon: <BarChartIcon />,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Commission Rates",
        href: "/cp-commission-rates",
        icon: <CommissionIcon />,
      },
      {
        label: "University Billing",
        href: "/cp-university-billing",
        icon: <BillingIcon />,
      },
      {
        label: "Invoices & Payouts",
        href: "/cp-invoices",
        icon: <InvoiceIcon />,
      },
      {
        label: "Reconciliation",
        href: "/cp-reconciliation",
        icon: <ReconciliationIcon />,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Universities",
        href: "/cp-universities",
        icon: <StudentsIcon />,
      },
      { label: "Events", href: "/cp-events", icon: <CalendarIcon /> },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Reports",
        href: "/cp-reports",
        icon: <BarChartIcon />,
        disabled: true,
      },
      { label: "Users", href: "/cp-users", icon: <UsersIcon /> },
      { label: "Settings", href: "/cp-settings", icon: <SettingsIcon /> },
      { label: "Audit Logs", href: "/cp-audit-logs", icon: <AuditLogIcon /> },
    ],
  },
];
