import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  financeProcedure,
  financeManagerProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { VENDOR_TYPE_CODES, COMMISSION_TYPE_CODES } from "~/server/db/enums";

// Prisma Decimal -> number at the API boundary (the house convention; superjson
// also handles Decimal, but routers serialise explicitly).
type Decimalish = { toNumber: () => number } | null;
const num = (d: Decimalish): number | null => (d == null ? null : d.toNumber());
// Empty/whitespace strings collapse to null so we never persist "".
const orNull = (v: string | null | undefined): string | null => {
  const t = v?.trim();
  if (!t) return null;
  return t;
};

const vendorType = z
  .number()
  .int()
  .refine((v) => (VENDOR_TYPE_CODES as number[]).includes(v), "Invalid vendor type");
const commissionType = z
  .number()
  .int()
  .refine(
    (v) => (COMMISSION_TYPE_CODES as number[]).includes(v),
    "Invalid commission type",
  );

const idInput = z.object({ id: z.number().int().positive() });
const parseDate = (s?: string | null): Date | null =>
  s ? new Date(s) : null;

export const commissionRatesRouter = createTRPCRouter({
  // ========================================================================
  // Vendors
  // ========================================================================
  listVendors: financeProcedure.query(async () => {
    const rows = await db.vendor.findMany({ orderBy: { name: "asc" } });
    return rows.map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      contactName: v.contact_name,
      contactEmail: v.contact_email,
      contactPhone: v.contact_phone,
      address: v.address,
      isActive: v.is_active === 1,
    }));
  }),

  createVendor: financeManagerProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(150),
        type: vendorType,
        contactName: z.string().max(100).optional(),
        contactEmail: z.string().email().max(255).optional().or(z.literal("")),
        contactPhone: z.string().max(45).optional(),
        address: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const v = await db.vendor.create({
        data: {
          name: input.name,
          type: input.type,
          contact_name: orNull(input.contactName),
          contact_email: orNull(input.contactEmail),
          contact_phone: orNull(input.contactPhone),
          address: orNull(input.address),
        },
      });
      return { id: v.id };
    }),

  updateVendor: financeManagerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().trim().min(1).max(150),
        type: vendorType,
        contactName: z.string().max(100).optional(),
        contactEmail: z.string().email().max(255).optional().or(z.literal("")),
        contactPhone: z.string().max(45).optional(),
        address: z.string().max(255).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.vendor.update({
        where: { id: input.id },
        data: {
          name: input.name,
          type: input.type,
          contact_name: orNull(input.contactName),
          contact_email: orNull(input.contactEmail),
          contact_phone: orNull(input.contactPhone),
          address: orNull(input.address),
          ...(input.isActive === undefined
            ? {}
            : { is_active: input.isActive ? 1 : 0 }),
        },
      });
      return { success: true as const };
    }),

  removeVendor: financeManagerProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      const contracts = await db.commission_contract.count({
        where: { vendor_id: input.id },
      });
      if (contracts > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This vendor still has contracts. Remove them first.",
        });
      }
      await db.vendor.delete({ where: { id: input.id } });
      return { success: true as const };
    }),

  // ========================================================================
  // Lookups — universities + their courses, for the entry modals' dropdowns.
  // ========================================================================
  universitiesForPicker: financeProcedure.query(async () => {
    return db.university.findMany({
      select: { id: true, name: true, country: true },
      orderBy: { name: "asc" },
    });
  }),

  coursesForUniversity: financeProcedure
    .input(z.object({ universityId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return db.course.findMany({
        where: { university_id: input.universityId },
        select: { id: true, name: true, degree_level: true },
        orderBy: { name: "asc" },
      });
    }),

  // ========================================================================
  // Contracts (+ nested rates / bonus tiers / tranche templates)
  // ========================================================================
  // Full payload for the "Commission Entry" tab. The page splits direct
  // contracts (vendorId === null) from third-party vendors.
  listContracts: financeProcedure.query(async () => {
    const rows = await db.commission_contract.findMany({
      include: {
        vendor: true,
        university: { select: { id: true, name: true, country: true } },
        commission_rate: {
          include: { course: { select: { id: true, name: true } } },
          orderBy: { id: "asc" },
        },
        commission_bonus_tier: { orderBy: { min_students: "asc" } },
        commission_tranche_template: { orderBy: { seq: "asc" } },
      },
      orderBy: { university: { name: "asc" } },
    });
    return rows.map((c) => ({
      id: c.id,
      universityId: c.university_id,
      universityName: c.university.name,
      country: c.university.country,
      vendorId: c.vendor_id,
      vendorName: c.vendor?.name ?? null,
      vendorType: c.vendor?.type ?? null,
      cpSharePct: num(c.cp_share_pct),
      isDefault: c.is_default === 1,
      effectiveDate: c.effective_date,
      notes: c.notes,
      rates: c.commission_rate.map((r) => ({
        id: r.id,
        courseId: r.course_id,
        courseName: r.course?.name ?? null,
        level: r.level,
        commissionType: r.commission_type,
        rate: num(r.rate),
        currency: r.currency,
      })),
      bonusTiers: c.commission_bonus_tier.map((b) => ({
        id: b.id,
        minStudents: b.min_students,
        maxStudents: b.max_students,
        amountPerStudent: num(b.amount_per_student),
        currency: b.currency,
      })),
      tranches: c.commission_tranche_template.map((t) => ({
        id: t.id,
        seq: t.seq,
        name: t.name,
        amount: num(t.amount),
        pct: num(t.pct),
        timing: t.timing,
      })),
    }));
  }),

  createContract: financeManagerProcedure
    .input(
      z.object({
        universityId: z.number().int().positive(),
        vendorId: z.number().int().positive().nullable(),
        cpSharePct: z.number().min(0).max(100).nullable().optional(),
        effectiveDate: z.string().optional(),
        notes: z.string().max(500).optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const created = await db.$transaction(async (tx) => {
        if (input.isDefault) {
          await tx.commission_contract.updateMany({
            where: { university_id: input.universityId },
            data: { is_default: 0 },
          });
        }
        return tx.commission_contract.create({
          data: {
            university_id: input.universityId,
            vendor_id: input.vendorId,
            cp_share_pct: input.cpSharePct ?? null,
            effective_date: parseDate(input.effectiveDate),
            notes: orNull(input.notes),
            is_default: input.isDefault ? 1 : 0,
          },
        });
      });
      return { id: created.id };
    }),

  updateContract: financeManagerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        cpSharePct: z.number().min(0).max(100).nullable().optional(),
        effectiveDate: z.string().nullable().optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.commission_contract.update({
        where: { id: input.id },
        data: {
          ...(input.cpSharePct === undefined
            ? {}
            : { cp_share_pct: input.cpSharePct }),
          ...(input.effectiveDate === undefined
            ? {}
            : { effective_date: parseDate(input.effectiveDate) }),
          ...(input.notes === undefined ? {} : { notes: orNull(input.notes) }),
        },
      });
      return { success: true as const };
    }),

  removeContract: financeManagerProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      // rates / bonus tiers / tranche templates cascade with the contract.
      await db.commission_contract.delete({ where: { id: input.id } });
      return { success: true as const };
    }),

  // Exactly one default contract per university — clear the rest, set this one.
  setDefault: financeManagerProcedure
    .input(
      z.object({
        universityId: z.number().int().positive(),
        contractId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.$transaction([
        db.commission_contract.updateMany({
          where: { university_id: input.universityId },
          data: { is_default: 0 },
        }),
        db.commission_contract.update({
          where: { id: input.contractId },
          data: { is_default: 1 },
        }),
      ]);
      return { success: true as const };
    }),

  // ========================================================================
  // Rates (per contract; courseId null = university-wide rate)
  // ========================================================================
  upsertRate: financeManagerProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        contractId: z.number().int().positive(),
        courseId: z.number().int().positive().nullable(),
        level: z.number().int().min(0).max(255).nullable().optional(),
        commissionType: commissionType,
        rate: z.number().min(0),
        currency: z.string().length(3).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const data = {
        course_id: input.courseId,
        level: input.level ?? null,
        commission_type: input.commissionType,
        rate: input.rate,
        currency: orNull(input.currency),
      };
      if (input.id) {
        await db.commission_rate.update({ where: { id: input.id }, data });
        return { id: input.id };
      }
      const r = await db.commission_rate.create({
        data: { contract_id: input.contractId, ...data },
      });
      return { id: r.id };
    }),

  removeRate: financeManagerProcedure.input(idInput).mutation(async ({ input }) => {
    await db.commission_rate.delete({ where: { id: input.id } });
    return { success: true as const };
  }),

  // ========================================================================
  // Bonus tiers (direct contracts)
  // ========================================================================
  upsertBonusTier: financeManagerProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        contractId: z.number().int().positive(),
        minStudents: z.number().int().min(1).max(65535),
        maxStudents: z.number().int().min(1).max(65535).nullable().optional(),
        amountPerStudent: z.number().min(0),
        currency: z.string().length(3).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const data = {
        min_students: input.minStudents,
        max_students: input.maxStudents ?? null,
        amount_per_student: input.amountPerStudent,
        currency: orNull(input.currency),
      };
      if (input.id) {
        await db.commission_bonus_tier.update({ where: { id: input.id }, data });
        return { id: input.id };
      }
      const b = await db.commission_bonus_tier.create({
        data: { contract_id: input.contractId, ...data },
      });
      return { id: b.id };
    }),

  removeBonusTier: financeManagerProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      await db.commission_bonus_tier.delete({ where: { id: input.id } });
      return { success: true as const };
    }),

  // ========================================================================
  // Tranche templates (direct contracts; max 4 enforced here)
  // ========================================================================
  upsertTranche: financeManagerProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        contractId: z.number().int().positive(),
        seq: z.number().int().min(1).max(4),
        name: z.string().trim().min(1).max(100),
        amount: z.number().min(0).nullable().optional(),
        pct: z.number().min(0).max(100).nullable().optional(),
        timing: z.string().max(150).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const data = {
        seq: input.seq,
        name: input.name,
        amount: input.amount ?? null,
        pct: input.pct ?? null,
        timing: orNull(input.timing),
      };
      if (input.id) {
        await db.commission_tranche_template.update({
          where: { id: input.id },
          data,
        });
        return { id: input.id };
      }
      const count = await db.commission_tranche_template.count({
        where: { contract_id: input.contractId },
      });
      if (count >= 4) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A contract can have at most 4 tranches.",
        });
      }
      const t = await db.commission_tranche_template.create({
        data: { contract_id: input.contractId, ...data },
      });
      return { id: t.id };
    }),

  removeTranche: financeManagerProcedure
    .input(idInput)
    .mutation(async ({ input }) => {
      await db.commission_tranche_template.delete({ where: { id: input.id } });
      return { success: true as const };
    }),

  // ========================================================================
  // Commission Summary — group a university's sources, mark the default.
  // ========================================================================
  summary: financeProcedure
    .input(
      z.object({ universityId: z.number().int().positive().optional() }).optional(),
    )
    .query(async ({ input }) => {
      const rows = await db.commission_contract.findMany({
        where: input?.universityId
          ? { university_id: input.universityId }
          : undefined,
        include: {
          vendor: true,
          university: { select: { id: true, name: true, country: true } },
          // The university-wide rate (course_id null) is the headline default rate.
          commission_rate: { where: { course_id: null } },
        },
        orderBy: { university: { name: "asc" } },
      });

      const byUni = new Map<
        number,
        {
          universityId: number;
          universityName: string;
          country: string;
          sources: {
            contractId: number;
            vendorId: number | null;
            vendorName: string;
            vendorType: number | null;
            isDefault: boolean;
            cpSharePct: number | null;
            defaultRate: number | null;
            commissionType: number | null;
            notes: string | null;
          }[];
        }
      >();

      for (const c of rows) {
        let entry = byUni.get(c.university_id);
        if (!entry) {
          entry = {
            universityId: c.university_id,
            universityName: c.university.name,
            country: c.university.country,
            sources: [],
          };
          byUni.set(c.university_id, entry);
        }
        const headline = c.commission_rate[0] ?? null;
        entry.sources.push({
          contractId: c.id,
          vendorId: c.vendor_id,
          vendorName: c.vendor?.name ?? "Direct",
          vendorType: c.vendor?.type ?? null,
          isDefault: c.is_default === 1,
          cpSharePct: num(c.cp_share_pct),
          defaultRate: headline ? num(headline.rate) : null,
          commissionType: headline ? headline.commission_type : null,
          notes: c.notes,
        });
      }

      return Array.from(byUni.values());
    }),
});
