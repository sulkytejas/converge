import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  financeProcedure,
  financeManagerProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  PartnerInvoiceStatus,
  PayoutStatus,
  PAYOUT_METHOD_CODES,
  financialYearOf,
} from "~/server/db/enums";

type Decimalish = { toNumber: () => number } | null;
const num = (d: Decimalish): number => (d == null ? 0 : d.toNumber());
const orNull = (v: string | null | undefined): string | null => {
  const t = v?.trim();
  if (!t) return null;
  return t;
};
const payoutMethod = z
  .number()
  .int()
  .refine((v) => (PAYOUT_METHOD_CODES as number[]).includes(v), "Invalid method");

// The open states finance acts on (everything not yet released).
const PENDING_STATES = [
  PayoutStatus.APPROVED,
  PayoutStatus.READY_TO_PAY,
  PayoutStatus.ON_HOLD,
  PayoutStatus.SENT_BACK,
];

export const reconciliationRouter = createTRPCRouter({
  listPending: financeProcedure.query(async () => {
    const payouts = await db.partner_payout.findMany({
      where: { status: { in: PENDING_STATES } },
      orderBy: { ops_approved_at: "asc" },
      include: {
        invoice: {
          select: {
            invoice_number: true,
            gstin: true,
            pan: true,
            net_payable: true,
            total_amount: true,
            organization: { select: { name: true } },
            bank_account: {
              select: {
                account_holder: true,
                account_number_last4: true,
                ifsc: true,
                bank_name: true,
              },
            },
          },
        },
      },
    });
    return payouts.map((p) => ({
      id: p.id,
      partner: p.invoice.organization.name,
      invoiceNumber: p.invoice.invoice_number,
      amountInr: num(p.amount_inr),
      status: p.status,
      opsApprovedAt: p.ops_approved_at,
      gstin: p.invoice.gstin,
      pan: p.invoice.pan,
      bank: p.invoice.bank_account
        ? {
            accountHolder: p.invoice.bank_account.account_holder,
            last4: p.invoice.bank_account.account_number_last4,
            ifsc: p.invoice.bank_account.ifsc,
            bankName: p.invoice.bank_account.bank_name,
          }
        : null,
      checks: {
        bankConfirmed: p.verify_bank_confirmed === 1,
        invoiceVerified: p.verify_invoice_verified === 1,
        commissionVerified: p.verify_commission_verified === 1,
        duplicateCheck: p.verify_duplicate_check === 1,
      },
      holdReason: p.hold_reason,
      sentBackReason: p.sent_back_reason,
    }));
  }),

  // Save the 4-point checklist; all four ticked promotes it to Ready to Pay.
  verify: financeProcedure
    .input(
      z.object({
        payoutId: z.number().int().positive(),
        bankConfirmed: z.boolean(),
        invoiceVerified: z.boolean(),
        commissionVerified: z.boolean(),
        duplicateCheck: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const all =
        input.bankConfirmed && input.invoiceVerified && input.commissionVerified && input.duplicateCheck;
      await db.partner_payout.update({
        where: { id: input.payoutId },
        data: {
          verify_bank_confirmed: input.bankConfirmed ? 1 : 0,
          verify_invoice_verified: input.invoiceVerified ? 1 : 0,
          verify_commission_verified: input.commissionVerified ? 1 : 0,
          verify_duplicate_check: input.duplicateCheck ? 1 : 0,
          verified_by_cp_user_id: ctx.cpUser.id,
          verified_at: all ? new Date() : null,
          status: all ? PayoutStatus.READY_TO_PAY : PayoutStatus.APPROVED,
        },
      });
      return { readyToPay: all };
    }),

  // Release the payment (Finance Manager only). Marks the invoice PAID and every
  // student on it partner-paid -> the commission spine reaches DISBURSED.
  release: financeManagerProcedure
    .input(
      z.object({
        payoutId: z.number().int().positive(),
        method: payoutMethod,
        bankName: z.string().max(150).optional(),
        ifsc: z.string().max(15).optional(),
        swift: z.string().max(15).optional(),
        referenceNumber: z.string().trim().min(1).max(100),
        paymentDate: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const payout = await db.partner_payout.findUnique({
        where: { id: input.payoutId },
        include: { invoice: { include: { invoice_item: { select: { commission_id: true } } } } },
      });
      if (!payout) throw new TRPCError({ code: "NOT_FOUND", message: "Payout not found" });
      if (payout.status !== PayoutStatus.READY_TO_PAY) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Complete the verification checklist before releasing payment.",
        });
      }
      const now = new Date();
      await db.$transaction([
        db.partner_payout.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.RELEASED,
            method: input.method,
            bank_name: orNull(input.bankName),
            ifsc: orNull(input.ifsc),
            swift: orNull(input.swift),
            reference_number: input.referenceNumber.trim(),
            payment_date: new Date(input.paymentDate),
            released_by_cp_user_id: ctx.cpUser.id,
            released_at: now,
            fy: financialYearOf(new Date(input.paymentDate)),
          },
        }),
        db.invoice.update({
          where: { id: payout.invoice_id },
          data: { status: PartnerInvoiceStatus.PAID },
        }),
        db.commission.updateMany({
          where: { id: { in: payout.invoice.invoice_item.map((it) => it.commission_id) } },
          data: { partner_paid_at: now },
        }),
      ]);
      return { success: true as const };
    }),

  hold: financeProcedure
    .input(z.object({ payoutId: z.number().int().positive(), reason: z.string().trim().min(1).max(500) }))
    .mutation(async ({ input }) => {
      await db.partner_payout.update({
        where: { id: input.payoutId },
        data: { status: PayoutStatus.ON_HOLD, hold_reason: input.reason },
      });
      return { success: true as const };
    }),

  sendBack: financeProcedure
    .input(z.object({ payoutId: z.number().int().positive(), reason: z.string().trim().min(1).max(500) }))
    .mutation(async ({ input }) => {
      await db.partner_payout.update({
        where: { id: input.payoutId },
        data: { status: PayoutStatus.SENT_BACK, sent_back_reason: input.reason },
      });
      return { success: true as const };
    }),

  completed: financeProcedure.query(async () => {
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
      releasedAt: p.released_at,
    }));
  }),

  stats: financeProcedure.query(async () => {
    const pending = await db.partner_payout.findMany({
      where: { status: { in: PENDING_STATES } },
      select: { status: true, amount_inr: true },
    });
    const released = await db.partner_payout.count({ where: { status: PayoutStatus.RELEASED } });
    return {
      pendingVerification: pending.filter((p) => p.status === PayoutStatus.APPROVED).length,
      readyToPay: pending.filter((p) => p.status === PayoutStatus.READY_TO_PAY).length,
      amountPending: Math.round(pending.reduce((s, p) => s + num(p.amount_inr), 0) * 100) / 100,
      released,
    };
  }),
});
