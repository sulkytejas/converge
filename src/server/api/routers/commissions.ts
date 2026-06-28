import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  financeProcedure,
  operationsProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  CommissionStatus,
  PartnerInvoiceStatus,
  PayoutStatus,
  TrancheStatus,
  financialYearOf,
  toINR,
} from "~/server/db/enums";

type Decimalish = { toNumber: () => number } | null;
const num = (d: Decimalish): number => (d == null ? 0 : d.toNumber());
const round2 = (n: number) => Math.round(n * 100) / 100;

// The next action for a commission, given its derived stage. The ledger is
// read-only and routes money-moving steps into the screens that capture the
// real numbers (FX rate on collection, payment reference on release); steps
// that are the partner's move (claiming collected money) carry no link.
type NextStep = { label: string; href: string | null } | null;
function nextStep(status: number, hasPendingPartnerInvoice: boolean): NextStep {
  switch (status) {
    case CommissionStatus.NOT_INVOICED:
      return { label: "Bill the vendor", href: "/admin/university-billing" };
    case CommissionStatus.INVOICED:
      return { label: "Record collection", href: "/admin/university-billing" };
    case CommissionStatus.RECEIVED:
      return hasPendingPartnerInvoice
        ? { label: "Approve payout", href: "/admin/invoices" }
        : { label: "Awaiting partner claim", href: null };
    case CommissionStatus.READY_TO_DISBURSE:
      return { label: "Release payment", href: "/admin/reconciliation" };
    default:
      return null; // DISBURSED / CANCELLED
  }
}

export const commissionsRouter = createTRPCRouter({
  // Cross-org commission ledger — every commission with its derived 5-state
  // status, tranche progress, amounts, and the linked vendor-invoice /
  // partner-invoice / payout references. The page derives the pipeline stat
  // cards + filters client-side from this list.
  list: financeProcedure.query(async () => {
    const comms = await db.commission.findMany({
      orderBy: { id: "desc" },
      include: {
        organization: { select: { name: true } },
        application: {
          select: {
            university_app_id: true,
            student: { select: { id: true, first_name: true, last_name: true } },
            course: {
              select: {
                name: true,
                intake_month: true,
                intake_year: true,
                university: { select: { name: true, country: true } },
              },
            },
          },
        },
        vendor: { select: { name: true, type: true } },
        vendor_invoice_item: {
          select: { vendor_invoice: { select: { invoice_number: true, status: true } } },
        },
        // Per-tranche claim + payout chain (pay-as-collected).
        commission_tranche: {
          orderBy: { seq: "asc" },
          select: {
            seq: true,
            name: true,
            status: true,
            amount: true,
            amount_inr: true,
            invoice_item: {
              select: {
                invoice: {
                  select: {
                    invoice_number: true,
                    status: true,
                    invoice_date: true,
                    partner_payout: { select: { status: true } },
                  },
                },
              },
            },
          },
        },
        // Legacy (pre-tranche) partner-invoice link.
        invoice_item: {
          where: { commission_tranche_id: null },
          select: {
            invoice: {
              select: {
                invoice_number: true,
                status: true,
                invoice_date: true,
                partner_payout: { select: { status: true } },
              },
            },
          },
        },
      },
    });

    return comms.map((c) => {
      const partnerSharePct = c.partner_share_pct == null ? 100 : num(c.partner_share_pct);
      const share = (gross: number) => round2(gross * (partnerSharePct / 100));
      const tranches = c.commission_tranche;
      const hasVendorInvoice = c.vendor_invoice_item != null;

      // Distinct partner invoices covering this commission (tranche + legacy).
      type PInv = { invoice_number: string; status: number; invoice_date: Date | null; payoutStatus: number | null };
      const pInvoices: PInv[] = [];
      for (const t of tranches) {
        const inv = t.invoice_item?.invoice;
        if (inv) pInvoices.push({ invoice_number: inv.invoice_number, status: inv.status, invoice_date: inv.invoice_date, payoutStatus: inv.partner_payout?.status ?? null });
      }
      for (const ii of c.invoice_item) {
        const inv = ii.invoice;
        if (inv) pInvoices.push({ invoice_number: inv.invoice_number, status: inv.status, invoice_date: inv.invoice_date, payoutStatus: inv.partner_payout?.status ?? null });
      }
      const latestInvoice = pInvoices.length > 0 ? pInvoices[pInvoices.length - 1]! : null;

      // Tranche collection progress.
      const total = tranches.length > 0 ? tranches.length : 1;
      const collected =
        tranches.length > 0
          ? tranches.filter((t) => t.status === TrancheStatus.RECEIVED || t.status === TrancheStatus.PAID).length
          : c.collegepond_received_at != null
            ? 1
            : 0;
      const paid =
        tranches.length > 0
          ? tranches.filter((t) => t.status === TrancheStatus.PAID).length
          : c.partner_paid_at != null
            ? 1
            : 0;

      // Partner's claimable-now: received-but-unclaimed tranche share (realised INR).
      const claimableInr =
        tranches.length > 0
          ? share(
              tranches
                .filter((t) => t.status === TrancheStatus.RECEIVED && t.invoice_item == null)
                .reduce((s, t) => s + num(t.amount_inr), 0),
            )
          : c.collegepond_received_at != null && c.partner_paid_at == null && pInvoices.length === 0
            ? share(num(c.claimable_inr))
            : 0;

      // Derived CommissionStatus (furthest milestone with money still pending).
      const allPaid = tranches.length > 0 ? total > 0 && paid === total : c.partner_paid_at != null;
      const hasPendingPayout = pInvoices.some(
        (inv) => inv.payoutStatus != null && inv.payoutStatus !== PayoutStatus.RELEASED,
      );
      // A partner invoice exists and is awaiting CP approval (so the next move is
      // CP's, not the partner's).
      const hasPendingPartnerInvoice = pInvoices.some(
        (inv) =>
          inv.payoutStatus == null &&
          (inv.status === PartnerInvoiceStatus.SUBMITTED ||
            inv.status === PartnerInvoiceStatus.UNDER_REVIEW),
      );
      const collectedUnpaid =
        tranches.length > 0
          ? collected - paid > 0
          : c.collegepond_received_at != null && c.partner_paid_at == null;
      let status: number;
      if (allPaid) status = CommissionStatus.DISBURSED;
      else if (hasPendingPayout) status = CommissionStatus.READY_TO_DISBURSE;
      else if (collectedUnpaid) status = CommissionStatus.RECEIVED;
      else if (hasVendorInvoice) status = CommissionStatus.INVOICED;
      else status = CommissionStatus.NOT_INVOICED;

      const commissionInr = toINR(num(c.commision_amount), c.currency);
      const intake =
        [c.application.course.intake_month, c.application.course.intake_year].filter(Boolean).join(" ") || null;

      return {
        commissionId: c.id,
        partner: c.organization.name,
        studentId: c.application.student.id,
        cpStudentId: `CP-${String(c.application.student.id).padStart(5, "0")}`,
        studentName: `${c.application.student.first_name} ${c.application.student.last_name}`.trim(),
        universityStudentId: c.application.university_app_id,
        university: c.application.course.university.name,
        country: c.application.course.university.country,
        program: c.application.course.name,
        intake,
        vendorName: c.vendor?.name ?? "Direct",
        isDirect: c.vendor_id == null,
        currency: c.currency,
        tuition: num(c.tuition_fee),
        rate: num(c.commision_rate),
        commissionAmount: num(c.commision_amount),
        commissionInr,
        partnerSharePct,
        cpSharePct: c.cp_share_pct == null ? round2(100 - partnerSharePct) : num(c.cp_share_pct),
        partnerShareInr: share(commissionInr),
        status,
        tranche: { total, collected, paid },
        // Per-tranche detail for the slide-over (partner-share amounts).
        tranches: tranches.map((t) => ({
          seq: t.seq,
          name: t.name,
          status: t.status,
          amountInr: share(num(t.amount_inr)),
          plannedForeign: share(num(t.amount)),
          claimed: t.invoice_item != null,
        })),
        claimableInr,
        receivedAt: c.collegepond_received_at,
        paidAt: c.partner_paid_at,
        vendorInvoice: c.vendor_invoice_item?.vendor_invoice
          ? {
              number: c.vendor_invoice_item.vendor_invoice.invoice_number,
              status: c.vendor_invoice_item.vendor_invoice.status,
            }
          : null,
        partnerInvoice: latestInvoice
          ? { number: latestInvoice.invoice_number, status: latestInvoice.status }
          : null,
        payoutStatus: latestInvoice?.payoutStatus ?? null,
        fy: financialYearOf(c.created_at),
        next: nextStep(status, hasPendingPartnerInvoice),
      };
    });
  }),

  // Safe bulk action: approve the partner invoices covering the selected
  // commissions for payout. Only invoices whose claimed tranches are all
  // collected advance (server re-checks). The money-moving steps (record
  // collection / release payment) are NOT bulk-mutated here — they stay in
  // their own screens where the FX rate / payment reference is captured.
  bulkApprove: operationsProcedure
    .input(z.object({ commissionIds: z.array(z.number().int().positive()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Resolve selected commissions → their pending partner invoices.
      const items = await db.invoice_item.findMany({
        where: { commission_id: { in: input.commissionIds } },
        select: {
          invoice: {
            select: {
              id: true,
              status: true,
              total_amount: true,
              net_payable: true,
              partner_payout: { select: { id: true } },
              invoice_item: {
                include: {
                  commission: { select: { collegepond_received_at: true } },
                  commission_tranche: { select: { status: true } },
                },
              },
            },
          },
        },
      });
      const invoices = new Map<number, (typeof items)[number]["invoice"]>();
      for (const it of items) if (it.invoice) invoices.set(it.invoice.id, it.invoice);

      let approved = 0;
      let skipped = 0;
      for (const inv of invoices.values()) {
        if (inv.partner_payout) {
          skipped++;
          continue;
        }
        if (
          inv.status === PartnerInvoiceStatus.REJECTED ||
          inv.status === PartnerInvoiceStatus.PAID ||
          inv.status === PartnerInvoiceStatus.APPROVED ||
          inv.status === PartnerInvoiceStatus.PARTIAL_APPROVED
        ) {
          skipped++;
          continue;
        }
        // Every claimed line must be collected (tranche RECEIVED, or legacy stamp).
        const allCollected =
          inv.invoice_item.length > 0 &&
          inv.invoice_item.every((line) =>
            line.commission_tranche != null
              ? line.commission_tranche.status === TrancheStatus.RECEIVED
              : line.commission.collegepond_received_at != null,
          );
        if (!allCollected) {
          skipped++;
          continue;
        }
        const net = inv.net_payable == null ? num(inv.total_amount) : num(inv.net_payable);
        await db.$transaction([
          db.invoice.update({
            where: { id: inv.id },
            data: { status: PartnerInvoiceStatus.APPROVED },
          }),
          db.partner_payout.create({
            data: {
              invoice_id: inv.id,
              amount_inr: net,
              status: PayoutStatus.APPROVED,
              ops_approved_by_cp_user_id: ctx.cpUser.id,
              ops_approved_at: new Date(),
            },
          }),
        ]);
        approved++;
      }

      if (approved === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            skipped > 0
              ? "Nothing to approve — selected commissions have no fully-collected partner invoice awaiting approval."
              : "No partner invoice found for the selected commissions yet.",
        });
      }
      return { approved, skipped };
    }),
});
