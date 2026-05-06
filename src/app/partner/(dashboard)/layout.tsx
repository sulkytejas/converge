import { type ReactNode } from "react";
import { PartnerDashboardShell } from "~/components/dashboard";

export default function PartnerDashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PartnerDashboardShell>{children}</PartnerDashboardShell>;
}
