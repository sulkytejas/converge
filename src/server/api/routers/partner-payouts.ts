import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  financeProcedure,
  operationsProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { PartnerInvoiceStatus, PayoutStatus } from "~/server/db/enums";

type Decimalish = { toNumber: () => number } | null;
const num = (d: Decimalish): number => (d == null ? 0 : d.toNumber());
// Net the partner is owed (incl. GST / less TDS); falls back to the subtotal.
const netOf = (inv: { net_payable: Decimalish; total_amount: Decimalish }) =>
  inv.net_payable == null ? num(inv.total_amount) : num(inv.net_payable);

export const partnerPayoutsRouter = createTRPCRouter({
  // Partner invoices with a per-student cross-reference (claim vs whether CP has
  // actually collected the vendor payment for that student).
  list: financeProcedure.query(async () => {
    const invoices = await db.invoice.findMany({
      orderBy: { invoice_date: "desc" },
      include: {
        organization: { select: { name: true } },
        partner_payout: { select: { id: true, status: true } },
        invoice_item: {
          include: {
            commission: {
              select: {
                collegepond_received_at: true,
                application: {
                  select: {
                    course: { select: { name: true, university: { select: { name: true } } } },
                    student: { select: { first_name: true, last_name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return invoices.map((inv) => {
      const items = inv.invoice_item.map((it) => {
        const received = it.commission.collegepond_received_at != null;
        return {
          student:
            `${it.commission.application.student.first_name} ${it.commission.application.student.last_name}`.trim(),
          university: it.commission.application.course.university.name,
          program: it.commission.application.course.name,
          claimed: num(it.amount),
          match: received ? ("verified" as const) : ("no-payment" as const),
        };
      });
      const allVerified = items.length > 0 && items.every((i) => i.match === "verified");
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        partner: inv.organization.name,
        invoiceDate: inv.invoice_date,
        students: inv.invoice_item.length,
        totalAmount: num(inv.total_amount),
        netPayable: netOf(inv),
        status: inv.status,
        gstin: inv.gstin,
        pan: inv.pan,
        allVerified,
        verifiedCount: items.filter((i) => i.match === "verified").length,
        hasPayout: inv.partner_payout != null,
        items,
      };
    });
  }),

  review: operationsProcedure
    .input(z.object({ invoiceId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.invoice.updateMany({
        where: { id: input.invoiceId, status: PartnerInvoiceStatus.SUBMITTED },
        data: { status: PartnerInvoiceStatus.UNDER_REVIEW },
      });
      return { success: true as const };
    }),

  // Approve for payment — only when every student is verified (CP has collected).
  // Creates the payout that Reconciliation (P6) will release.
  approve: operationsProcedure
    .input(z.object({ invoiceId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await db.invoice.findUnique({
        where: { id: input.invoiceId },
        include: {
          partner_payout: { select: { id: true } },
          invoice_item: { include: { commission: { select: { collegepond_received_at: true } } } },
        },
      });
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      if (inv.partner_payout) {
        throw new TRPCError({ code: "CONFLICT", message: "This invoice is already approved." });
      }
      if (inv.status === PartnerInvoiceStatus.REJECTED || inv.status === PartnerInvoiceStatus.PAID) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invoice can't be approved." });
      }
      const allVerified =
        inv.invoice_item.length > 0 &&
        inv.invoice_item.every((it) => it.commission.collegepond_received_at != null);
      if (!allVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Every student must be collected from the vendor before approving.",
        });
      }
      await db.$transaction([
        db.invoice.update({
          where: { id: inv.id },
          data: { status: PartnerInvoiceStatus.APPROVED },
        }),
        db.partner_payout.create({
          data: {
            invoice_id: inv.id,
            amount_inr: netOf(inv),
            status: PayoutStatus.APPROVED,
            ops_approved_by_cp_user_id: ctx.cpUser.id,
            ops_approved_at: new Date(),
          },
        }),
      ]);
      return { success: true as const };
    }),

  reject: operationsProcedure
    .input(
      z.object({
        invoiceId: z.number().int().positive(),
        reason: z.string().trim().min(1).max(500),
      }),
    )
    .mutation(async ({ input }) => {
      await db.invoice.update({
        where: { id: input.invoiceId },
        data: { status: PartnerInvoiceStatus.REJECTED, rejection_reason: input.reason },
      });
      return { success: true as const };
    }),

  paymentHistory: financeProcedure.query(async () => {
    const payouts = await db.partner_payout.findMany({
      where: { status: PayoutStatus.RELEASED },
      orderBy: { released_at: "desc" },
      include: { invoice: { select: { invoice_number: true, organization: { select: { name: true } } } } },
    });
    return payouts.map((p) => ({
      id: p.id,
      partner: p.invoice.organization.name,
      invoiceNumber: p.invoice.invoice_number,
      amountInr: num(p.amount_inr),
      method: p.method,
      reference: p.reference_number,
      paymentDate: p.payment_date,
    }));
  }),

  stats: financeProcedure.query(async () => {
    const invoices = await db.invoice.findMany({ select: { status: true, total_amount: true, net_payable: true } });
    const total = invoices.length;
    const pendingReview = invoices.filter(
      (i) => i.status === PartnerInvoiceStatus.SUBMITTED || i.status === PartnerInvoiceStatus.UNDER_REVIEW,
    ).length;
    const approved = invoices.filter((i) => i.status === PartnerInvoiceStatus.APPROVED).length;
    const amountPending = invoices
      .filter((i) => i.status !== PartnerInvoiceStatus.PAID && i.status !== PartnerInvoiceStatus.REJECTED)
      .reduce((s, i) => s + netOf(i), 0);
    return { total, pendingReview, approved, amountPending: Math.round(amountPending * 100) / 100 };
  }),
});
