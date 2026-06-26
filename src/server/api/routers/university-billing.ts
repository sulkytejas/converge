import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  financeProcedure,
  financeManagerProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  UniApplicationStatus,
  VendorInvoiceStatus,
  CommissionType,
  VARIANCE_REASON_CODES,
  financialYearOf,
  toINR,
} from "~/server/db/enums";

type Decimalish = { toNumber: () => number } | null;
const num = (d: Decimalish): number => (d == null ? 0 : d.toNumber());
const orNull = (v: string | null | undefined): string | null => {
  const t = v?.trim();
  if (!t) return null;
  return t;
};

const BILLING_CURRENCIES = [
  "USD", "GBP", "AUD", "CAD", "EUR", "INR", "NZD", "SGD",
] as const;
const currency = z.enum(BILLING_CURRENCIES);
const varianceReason = z
  .number()
  .int()
  .refine((v) => (VARIANCE_REASON_CODES as number[]).includes(v), "Invalid reason");

// Resolve the default contract + applicable rate for a (university, course).
// course-specific rate wins over the university-wide rate (course_id null).
// Returns the gross commission for the given tuition.
async function resolveDefaultRate(universityId: number, courseId: number) {
  const contract = await db.commission_contract.findFirst({
    where: { university_id: universityId, is_default: 1 },
    include: { commission_rate: true, vendor: true },
  });
  if (!contract) return null;
  const courseRate = contract.commission_rate.find((r) => r.course_id === courseId);
  const rate =
    courseRate ??
    contract.commission_rate.find((r) => r.course_id === null) ??
    null;
  if (!rate) return null;
  return {
    contractId: contract.id,
    vendorId: contract.vendor_id,
    vendorName: contract.vendor?.name ?? "Direct",
    vendorType: contract.vendor?.type ?? null,
    commissionType: rate.commission_type,
    rate: num(rate.rate),
    // A course-specific rate overrides the university-wide one.
    isProgramSpecific: courseRate != null,
  };
}

// Gross commission for a tuition under a rate (percentage of tuition, or flat).
function grossCommission(
  tuition: number,
  rate: number,
  commissionType: number,
): number {
  const v =
    commissionType === CommissionType.FLAT ? rate : (tuition * rate) / 100;
  return Math.round(v * 100) / 100;
}

export const universityBillingRouter = createTRPCRouter({
  // ========================================================================
  // Tab 1 — Confirmed Students: enrolled applications not yet confirmed for
  // billing (no commission row yet).
  // ========================================================================
  confirmedStudents: financeProcedure.query(async () => {
    const apps = await db.application.findMany({
      where: { status: UniApplicationStatus.ENROLLED, commission: { is: null } },
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        university_app_id: true,
        updated_at: true,
        student: { select: { id: true, first_name: true, last_name: true } },
        course: {
          select: {
            id: true,
            name: true,
            tuition_fee: true,
            currency: true,
            intake_month: true,
            intake_year: true,
            university: { select: { id: true, name: true, country: true } },
          },
        },
      },
    });
    // Already-confirmed (billed) enrolled students drive the progress bar.
    const confirmedCount = await db.application.count({
      where: { status: UniApplicationStatus.ENROLLED, commission: { isNot: null } },
    });

    const students = await Promise.all(
      apps.map(async (a) => {
        const resolved = await resolveDefaultRate(a.course.university.id, a.course.id);
        const intake = [a.course.intake_month, a.course.intake_year]
          .filter(Boolean)
          .join(" ");
        return {
          applicationId: a.id,
          studentName: `${a.student.first_name} ${a.student.last_name}`.trim(),
          cpStudentId: `CP-${a.student.id}`,
          universityStudentId: a.university_app_id,
          program: a.course.name,
          university: a.course.university.name,
          universityId: a.course.university.id,
          country: a.course.university.country,
          intake: intake || null,
          tuition: num(a.course.tuition_fee),
          currency: a.course.currency,
          rate: resolved?.rate ?? null,
          vendorId: resolved?.vendorId ?? null,
          vendorName: resolved?.vendorName ?? "Direct",
          vendorType: resolved?.vendorType ?? null,
          rateType: resolved
            ? resolved.isProgramSpecific
              ? "Program-specific"
              : "Unified"
            : null,
          hasDefaultRate: resolved != null,
        };
      }),
    );
    return { students, confirmedCount, attendedCount: students.length };
  }),

  // Confirm a student for billing — creates the commission from the
  // university's default rate. Requires a default contract for that university.
  confirmBilling: financeManagerProcedure
    .input(z.object({ applicationId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const app = await db.application.findUnique({
        where: { id: input.applicationId },
        select: {
          id: true,
          org_id: true,
          status: true,
          commission: { select: { id: true } },
          course: {
            select: {
              id: true,
              tuition_fee: true,
              currency: true,
              university: { select: { id: true, name: true } },
            },
          },
        },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      if (app.commission) {
        throw new TRPCError({ code: "CONFLICT", message: "Already confirmed for billing." });
      }
      if (app.status !== UniApplicationStatus.ENROLLED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only enrolled (attended) students can be billed.",
        });
      }
      const resolved = await resolveDefaultRate(app.course.university.id, app.course.id);
      if (!resolved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Set a default commission rate for ${app.course.university.name} in Commission Rates first.`,
        });
      }
      const tuition = num(app.course.tuition_fee);
      const amount = grossCommission(tuition, resolved.rate, resolved.commissionType);
      const created = await db.commission.create({
        data: {
          application_id: app.id,
          org_id: app.org_id,
          tuition_fee: tuition,
          currency: app.course.currency,
          // Flat deals store rate 0; the gross amount carries the value.
          commision_rate:
            resolved.commissionType === CommissionType.FLAT ? 0 : resolved.rate,
          commision_amount: amount,
          vendor_id: resolved.vendorId,
        },
      });
      return { commissionId: created.id };
    }),

  // ========================================================================
  // Tab 2 — Vendor Billing: confirmed commissions not yet on an invoice,
  // grouped by vendor.
  // ========================================================================
  vendorBillingStudents: financeProcedure.query(async () => {
    const comms = await db.commission.findMany({
      orderBy: { id: "asc" },
      include: {
        vendor: true,
        application: {
          select: {
            university_app_id: true,
            student: { select: { id: true, first_name: true, last_name: true } },
            course: {
              select: {
                id: true,
                name: true,
                university: { select: { id: true, name: true } },
              },
            },
          },
        },
        organization: { select: { name: true } },
        vendor_invoice_item: {
          select: {
            vendor_invoice: {
              select: { id: true, invoice_number: true, status: true },
            },
          },
        },
      },
    });

    // Batch which (university, course) pairs have a program-specific rate under
    // the university's default contract, to label Program-specific vs Unified.
    const uniIds = Array.from(
      new Set(comms.map((c) => c.application.course.university.id)),
    );
    const contracts = await db.commission_contract.findMany({
      where: { university_id: { in: uniIds }, is_default: 1 },
      include: { commission_rate: { select: { course_id: true } } },
    });
    const specificByUni = new Map<number, Set<number>>();
    for (const ct of contracts) {
      const set = new Set<number>();
      for (const r of ct.commission_rate) if (r.course_id != null) set.add(r.course_id);
      specificByUni.set(ct.university_id, set);
    }

    return comms.map((c) => {
      const inv = c.vendor_invoice_item?.vendor_invoice ?? null;
      const uniId = c.application.course.university.id;
      const courseId = c.application.course.id;
      return {
        commissionId: c.id,
        vendorId: c.vendor_id,
        vendorName: c.vendor?.name ?? "Direct",
        vendorType: c.vendor?.type ?? null,
        university: c.application.course.university.name,
        universityId: uniId,
        studentName:
          `${c.application.student.first_name} ${c.application.student.last_name}`.trim(),
        cpStudentId: `CP-${c.application.student.id}`,
        universityStudentId: c.application.university_app_id,
        program: c.application.course.name,
        partner: c.organization.name,
        tuition: num(c.tuition_fee),
        currency: c.currency,
        rate: num(c.commision_rate),
        calcAmount: num(c.commision_amount),
        rateType: specificByUni.get(uniId)?.has(courseId)
          ? "Program-specific"
          : "Unified",
        invoice: inv
          ? { id: inv.id, number: inv.invoice_number, status: inv.status }
          : null,
      };
    });
  }),

  createVendorInvoice: financeManagerProcedure
    .input(
      z.object({
        vendorId: z.number().int().positive().nullable(),
        invoiceNumber: z.string().trim().min(1).max(40),
        currency,
        invoiceDate: z.string(),
        dueDate: z.string().optional(),
        notes: z.string().max(1000).optional(),
        lines: z
          .array(
            z.object({
              commissionId: z.number().int().positive(),
              tuitionAmount: z.number().min(0),
              expectedAmount: z.number().min(0),
              varianceReason: varianceReason,
              varianceNote: z.string().max(255).optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const ids = input.lines.map((l) => l.commissionId);
      const comms = await db.commission.findMany({
        where: { id: { in: ids } },
        include: { vendor_invoice_item: { select: { id: true } } },
      });
      if (comms.length !== ids.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Some students no longer exist." });
      }
      for (const c of comms) {
        if (c.vendor_invoice_item) {
          throw new TRPCError({ code: "CONFLICT", message: "A student is already invoiced." });
        }
        if (c.vendor_id !== input.vendorId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "All students on an invoice must share the same vendor.",
          });
        }
      }
      const byId = new Map(comms.map((c) => [c.id, c]));
      const fy = financialYearOf(new Date(input.invoiceDate));

      const items = input.lines.map((l) => {
        const c = byId.get(l.commissionId)!;
        const rate = num(c.commision_rate);
        // Percentage deals recompute from the entered tuition; flat deals keep
        // the stored gross commission.
        const calc =
          rate > 0
            ? grossCommission(l.tuitionAmount, rate, CommissionType.PERCENTAGE)
            : num(c.commision_amount);
        const variance = Math.round((l.expectedAmount - calc) * 100) / 100;
        if (variance !== 0 && l.varianceReason === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A variance reason is required when expected ≠ calculated.",
          });
        }
        return {
          commission_id: l.commissionId,
          tuition_amount: l.tuitionAmount,
          calculated_commission: calc,
          expected_amount: l.expectedAmount,
          variance,
          variance_reason: l.varianceReason,
          variance_note: orNull(l.varianceNote),
        };
      });
      const totalExpected =
        Math.round(items.reduce((s, i) => s + i.expected_amount, 0) * 100) / 100;

      const invoice = await db.$transaction(async (tx) => {
        const inv = await tx.vendor_invoice.create({
          data: {
            invoice_number: input.invoiceNumber,
            vendor_id: input.vendorId,
            currency: input.currency,
            invoice_date: new Date(input.invoiceDate),
            due_date: input.dueDate ? new Date(input.dueDate) : null,
            status: VendorInvoiceStatus.SENT,
            total_expected_amount: totalExpected,
            notes: orNull(input.notes),
            fy,
            created_by_cp_user_id: ctx.cpUser.id,
          },
        });
        await tx.vendor_invoice_item.createMany({
          data: items.map((i) => ({ ...i, vendor_invoice_id: inv.id })),
        });
        return inv;
      });
      return { vendorInvoiceId: invoice.id };
    }),

  // ========================================================================
  // Invoices view + Ageing both read vendor invoices.
  // ========================================================================
  listVendorInvoices: financeProcedure.query(async () => {
    const invoices = await db.vendor_invoice.findMany({
      orderBy: { invoice_date: "desc" },
      include: {
        vendor: true,
        vendor_invoice_item: {
          include: {
            commission: {
              include: {
                application: {
                  select: {
                    university_app_id: true,
                    course: { select: { name: true, university: { select: { name: true } } } },
                    student: { select: { first_name: true, last_name: true } },
                  },
                },
              },
            },
          },
        },
        vendor_payment: { orderBy: { payment_date: "asc" } },
      },
    });

    return invoices.map((inv) => {
      const paidInr = inv.vendor_payment.reduce((s, p) => s + num(p.amount_inr), 0);
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        vendorName: inv.vendor?.name ?? "Direct",
        currency: inv.currency,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        status: inv.status,
        totalExpected: num(inv.total_expected_amount),
        paidInr: Math.round(paidInr * 100) / 100,
        notes: inv.notes,
        items: inv.vendor_invoice_item.map((it) => ({
          id: it.id,
          student:
            `${it.commission.application.student.first_name} ${it.commission.application.student.last_name}`.trim(),
          universityStudentId: it.commission.application.university_app_id,
          university: it.commission.application.course.university.name,
          program: it.commission.application.course.name,
          tuition: num(it.tuition_amount),
          calculated: num(it.calculated_commission),
          expected: num(it.expected_amount),
          variance: num(it.variance),
          varianceReason: it.variance_reason,
          varianceNote: it.variance_note,
        })),
        payments: inv.vendor_payment.map((p) => ({
          id: p.id,
          date: p.payment_date,
          amountInr: num(p.amount_inr),
          exchangeRate: num(p.exchange_rate),
          amountForeign: num(p.amount_foreign),
          reference: p.payment_reference,
          isTranche: p.is_tranche === 1,
          trancheNumber: p.tranche_number,
          totalTranches: p.total_tranches,
          isFinal: p.is_final === 1,
          notes: p.notes,
        })),
      };
    });
  }),

  recordVendorPayment: financeManagerProcedure
    .input(
      z.object({
        vendorInvoiceId: z.number().int().positive(),
        amountInr: z.number().positive(),
        exchangeRate: z.number().positive(),
        paymentDate: z.string(),
        reference: z.string().max(100).optional(),
        isTranche: z.boolean().optional(),
        trancheNumber: z.number().int().min(1).max(255).optional(),
        totalTranches: z.number().int().min(1).max(255).optional(),
        isFinal: z.boolean(),
        notes: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const inv = await db.vendor_invoice.findUnique({
        where: { id: input.vendorInvoiceId },
        include: { vendor_invoice_item: { select: { commission_id: true, expected_amount: true } } },
      });
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      if (inv.status === VendorInvoiceStatus.FULLY_PAID) {
        throw new TRPCError({ code: "CONFLICT", message: "Invoice is already fully paid." });
      }
      const amountForeign =
        Math.round((input.amountInr / input.exchangeRate) * 100) / 100;
      const fy = financialYearOf(new Date(input.paymentDate));

      await db.$transaction(async (tx) => {
        await tx.vendor_payment.create({
          data: {
            vendor_invoice_id: inv.id,
            amount_inr: input.amountInr,
            exchange_rate: input.exchangeRate,
            amount_foreign: amountForeign,
            payment_date: new Date(input.paymentDate),
            payment_reference: orNull(input.reference),
            is_tranche: input.isTranche ? 1 : 0,
            tranche_number: input.trancheNumber ?? null,
            total_tranches: input.totalTranches ?? null,
            is_final: input.isFinal ? 1 : 0,
            notes: orNull(input.notes),
            fy,
            created_by_cp_user_id: ctx.cpUser.id,
          },
        });
        await tx.vendor_invoice.update({
          where: { id: inv.id },
          data: {
            status: input.isFinal
              ? VendorInvoiceStatus.FULLY_PAID
              : VendorInvoiceStatus.PARTIAL_PAYMENT,
          },
        });
        // The final payment flips every student on the invoice to RECEIVED —
        // CP has the money, so the partner can now claim. claimable_inr is the
        // gross commission in INR; the partner/CP split is applied in P4.
        if (input.isFinal) {
          const now = new Date();
          for (const item of inv.vendor_invoice_item) {
            // Claimable tracks what CP actually expects to collect for that student
            // (the line's expected amount, net of variance) — not the gross
            // commission. The partner/CP split is applied later in the payout phase.
            await tx.commission.update({
              where: { id: item.commission_id },
              data: {
                collegepond_received_at: now,
                received_fx_rate: input.exchangeRate,
                claimable_inr:
                  Math.round(num(item.expected_amount) * input.exchangeRate * 100) / 100,
              },
            });
          }
        }
      });
      return { success: true as const };
    }),

  // Ageing — unpaid (SENT/PARTIAL) invoices bucketed by days overdue.
  ageing: financeProcedure
    .input(z.object({ vendorId: z.number().int().positive().nullable().optional() }).optional())
    .query(async ({ input }) => {
      const invoices = await db.vendor_invoice.findMany({
        where: {
          status: { in: [VendorInvoiceStatus.SENT, VendorInvoiceStatus.PARTIAL_PAYMENT] },
          ...(input?.vendorId ? { vendor_id: input.vendorId } : {}),
        },
        include: {
          vendor: true,
          vendor_invoice_item: {
            select: {
              commission: {
                select: {
                  application: {
                    select: {
                      course: { select: { university: { select: { name: true } } } },
                    },
                  },
                },
              },
            },
          },
          vendor_payment: { select: { amount_foreign: true } },
        },
      });
      const today = new Date();
      const rows = invoices.map((inv) => {
        const daysOverdue = inv.due_date
          ? Math.floor((today.getTime() - inv.due_date.getTime()) / 86_400_000)
          : 0;
        const paidForeign = inv.vendor_payment.reduce(
          (s, p) => s + num(p.amount_foreign),
          0,
        );
        const outstanding =
          Math.round((num(inv.total_expected_amount) - paidForeign) * 100) / 100;
        const unis = Array.from(
          new Set(
            inv.vendor_invoice_item.map(
              (it) => it.commission.application.course.university.name,
            ),
          ),
        );
        return {
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          vendorName: inv.vendor?.name ?? "Direct",
          university: unis.length === 0 ? "—" : unis.length === 1 ? unis[0]! : "Multiple",
          currency: inv.currency,
          students: inv.vendor_invoice_item.length,
          outstanding,
          outstandingInr: toINR(outstanding, inv.currency),
          dueDate: inv.due_date,
          daysOverdue: Math.max(0, daysOverdue),
          bucket:
            daysOverdue <= 30 ? 0 : daysOverdue <= 60 ? 1 : daysOverdue <= 90 ? 2 : 3,
          status: inv.status,
        };
      });
      const buckets = [0, 1, 2, 3].map((b) => {
        const inBucket = rows.filter((r) => r.bucket === b);
        return {
          bucket: b,
          count: inBucket.length,
          inrTotal:
            Math.round(inBucket.reduce((s, r) => s + r.outstandingInr, 0) * 100) / 100,
        };
      });
      return { rows, buckets };
    }),

  // KPI cards — counts + exact INR received (cross-currency expected isn't
  // convertible to INR until paid, so we report counts there honestly).
  stats: financeProcedure
    .input(z.object({ fy: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      const where = input?.fy ? { fy: input.fy } : {};
      const invoices = await db.vendor_invoice.findMany({
        where,
        select: {
          status: true,
          currency: true,
          total_expected_amount: true,
          due_date: true,
        },
      });
      const payments = await db.vendor_payment.findMany({
        where: input?.fy ? { fy: input.fy } : {},
        select: { amount_inr: true },
      });
      const today = new Date();
      const expectedInr =
        Math.round(
          invoices.reduce(
            (s, i) => s + toINR(num(i.total_expected_amount), i.currency),
            0,
          ) * 100,
        ) / 100;
      const receivedInr =
        Math.round(payments.reduce((s, p) => s + num(p.amount_inr), 0) * 100) / 100;
      const outstandingInr = Math.max(
        0,
        Math.round((expectedInr - receivedInr) * 100) / 100,
      );
      const overdueCount = invoices.filter(
        (i) =>
          (i.status === VendorInvoiceStatus.SENT ||
            i.status === VendorInvoiceStatus.PARTIAL_PAYMENT) &&
          i.due_date != null &&
          i.due_date.getTime() < today.getTime(),
      ).length;
      const collectionRate =
        expectedInr > 0
          ? Math.min(100, Math.round((receivedInr / expectedInr) * 100))
          : 0;
      return { expectedInr, receivedInr, outstandingInr, overdueCount, collectionRate };
    }),

  // Financial years present in the data, for the stats dropdown.
  financialYears: financeProcedure.query(async () => {
    const rows = await db.vendor_invoice.findMany({
      where: { fy: { not: null } },
      distinct: ["fy"],
      select: { fy: true },
      orderBy: { fy: "desc" },
    });
    return rows.map((r) => r.fy!).filter((fy): fy is number => fy != null);
  }),
});
