import { createTRPCRouter, protectedAdminProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  PartnerInvoiceStatus,
  PayoutStatus,
  UserStatus,
  UserType,
} from "~/server/db/enums";

// Live admin notification feed. Rather than a separate event-log table, the bell
// is derived from real, current actionable state — the work actually sitting in
// the system right now. Each signal is included only when its count > 0, so a
// clean queue shows an empty bell instead of fabricated entries. This replaces
// the hardcoded DEFAULT_NOTIFICATIONS that previously rendered (synthetic) in
// prod. The same pending-approvals count also drives the sidebar badge, so the
// two can never disagree.

export type NotificationTone = "blue" | "green" | "orange" | "red" | "gray";

export interface AdminNotification {
  id: string;
  title: string;
  time: string;
  tone: NotificationTone;
  unread: boolean;
  href: string;
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

export const notificationsRouter = createTRPCRouter({
  list: protectedAdminProcedure.query(async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [pendingApprovals, payoutsReady, invoicesPending, newStudents] =
      await Promise.all([
        db.user.count({
          where: {
            type: UserType.AGENCY_COUNSELLOR,
            status: UserStatus.UNDER_REVIEW,
          },
        }),
        db.partner_payout.count({
          where: { status: PayoutStatus.READY_TO_PAY },
        }),
        db.invoice.count({
          where: {
            status: {
              in: [
                PartnerInvoiceStatus.SUBMITTED,
                PartnerInvoiceStatus.UNDER_REVIEW,
              ],
            },
          },
        }),
        db.student.count({ where: { created_at: { gte: weekAgo } } }),
      ]);

    const notifications: AdminNotification[] = [];

    if (pendingApprovals > 0) {
      notifications.push({
        id: "approvals",
        title: `${plural(pendingApprovals, "counselor approval")} awaiting review`,
        time: "Needs review",
        tone: "orange",
        unread: true,
        href: "/admin/counselor-approvals",
      });
    }
    if (payoutsReady > 0) {
      notifications.push({
        id: "payouts",
        title: `${plural(payoutsReady, "payout")} ready to release`,
        time: "Finance",
        tone: "blue",
        unread: true,
        href: "/admin/reconciliation",
      });
    }
    if (invoicesPending > 0) {
      notifications.push({
        id: "invoices",
        title: `${plural(invoicesPending, "partner invoice")} awaiting review`,
        time: "Finance",
        tone: "orange",
        unread: true,
        href: "/admin/invoices",
      });
    }
    if (newStudents > 0) {
      notifications.push({
        id: "students",
        title: `${plural(newStudents, "new student")} added this week`,
        time: "This week",
        tone: "green",
        unread: false,
        href: "/admin/students",
      });
    }

    return {
      notifications,
      badges: { approvals: pendingApprovals },
    };
  }),
});
