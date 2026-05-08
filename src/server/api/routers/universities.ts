import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedAdminProcedure,
} from "~/server/api/trpc";

// Two-letter ISO code for the university's country. We accept either an ISO2
// code or a longer name and normalize to ISO2 server-side, but the form is
// expected to send ISO2 directly.
const ISO2 = z.string().min(2).max(2).transform((v) => v.toUpperCase());

const universityInput = z.object({
  name: z.string().trim().min(1).max(150),
  city: z.string().trim().max(100).nullable().optional(),
  country: ISO2,
  // 0 = Public, 1 = Private. Defaults to public.
  type: z.number().int().min(0).max(1).default(0),
  ranking: z.number().int().nonnegative().max(65535).nullable().optional(),
  appSource: z.string().trim().max(50).nullable().optional(),
  website: z.string().trim().max(255).nullable().optional(),
  logoUrl: z.string().trim().max(255).nullable().optional(),
  isOpen: z.boolean().default(true),
});

const courseInput = z.object({
  universityId: z.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().max(50).nullable().optional(),
  degreeLevel: z.number().int().min(0).max(255).nullable().optional(),
  durationMonths: z.number().int().min(1).max(120).nullable().optional(),
  tuitionFee: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().length(3).nullable().optional(),
  isOpen: z.boolean().default(true),
  url: z.string().trim().max(500).nullable().optional(),
  toefl: z.number().nonnegative().nullable().optional(),
  ielts: z.number().nonnegative().nullable().optional(),
  det: z.number().int().nonnegative().nullable().optional(),
  isStem: z.boolean().default(false),
  intakeMonth: z.string().trim().max(50).nullable().optional(),
  intakeYear: z.number().int().min(2000).max(2099).nullable().optional(),
  isCoopAvailable: z.boolean().default(false),
  hasAppFeeWaiver: z.boolean().default(false),
  appFee: z.number().nonnegative().nullable().optional(),
  hasTuitionDeposit: z.boolean().default(false),
  hasScholarship: z.boolean().default(false),
  scholarshipAmount: z.number().nonnegative().nullable().optional(),
  minEntryRequirements: z.string().trim().max(50).nullable().optional(),
  minEntryRequirementsScale: z.string().trim().max(20).nullable().optional(),
  hasFasterTat: z.boolean().default(false),
});

function bool(v: boolean): number {
  return v ? 1 : 0;
}

function toUniversityApi(u: {
  id: number;
  name: string;
  city: string | null;
  country: string;
  type: number;
  ranking: number | null;
  app_source: string | null;
  website: string | null;
  logo_url: string | null;
  is_open: number;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: u.id,
    name: u.name,
    city: u.city,
    country: u.country,
    type: u.type === 1 ? ("private" as const) : ("public" as const),
    ranking: u.ranking,
    appSource: u.app_source,
    website: u.website,
    logoUrl: u.logo_url,
    isOpen: u.is_open === 1,
    createdAt: u.created_at.toISOString(),
    updatedAt: u.updated_at.toISOString(),
  };
}

function toCourseApi(c: {
  id: number;
  university_id: number;
  name: string;
  code: string | null;
  degree_level: number | null;
  duration_months: number | null;
  tuition_fee: { toNumber: () => number } | null;
  currency: string | null;
  is_open: number;
  url: string | null;
  toefl: { toNumber: () => number } | null;
  ielts: { toNumber: () => number } | null;
  det: number | null;
  is_stem: number;
  intake_month: string | null;
  intake_year: number | null;
  is_coop_available: number;
  has_app_fee_waiver: number;
  app_fee: { toNumber: () => number } | null;
  has_tuition_deposit: number;
  has_scholarship: number;
  scholarship_amount: { toNumber: () => number } | null;
  min_entry_requirements: string | null;
  min_entry_requirements_scale: string | null;
  has_faster_tat: number;
  university?: { id: number; name: string; country: string } | null;
}) {
  return {
    id: c.id,
    universityId: c.university_id,
    name: c.name,
    code: c.code,
    degreeLevel: c.degree_level,
    durationMonths: c.duration_months,
    tuitionFee: c.tuition_fee?.toNumber() ?? null,
    currency: c.currency,
    isOpen: c.is_open === 1,
    url: c.url,
    toefl: c.toefl?.toNumber() ?? null,
    ielts: c.ielts?.toNumber() ?? null,
    det: c.det,
    isStem: c.is_stem === 1,
    intakeMonth: c.intake_month,
    intakeYear: c.intake_year,
    isCoopAvailable: c.is_coop_available === 1,
    hasAppFeeWaiver: c.has_app_fee_waiver === 1,
    appFee: c.app_fee?.toNumber() ?? null,
    hasTuitionDeposit: c.has_tuition_deposit === 1,
    hasScholarship: c.has_scholarship === 1,
    scholarshipAmount: c.scholarship_amount?.toNumber() ?? null,
    minEntryRequirements: c.min_entry_requirements,
    minEntryRequirementsScale: c.min_entry_requirements_scale,
    hasFasterTat: c.has_faster_tat === 1,
    university: c.university
      ? { id: c.university.id, name: c.university.name, country: c.university.country }
      : null,
  };
}

export const universitiesRouter = createTRPCRouter({
  // -------------------------------------------------------------------------
  // Universities
  // -------------------------------------------------------------------------
  listUniversities: protectedAdminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.university.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { course: true } } },
    });
    return rows.map((u) => ({
      ...toUniversityApi(u),
      courseCount: u._count.course,
    }));
  }),

  createUniversity: protectedAdminProcedure
    .input(universityInput)
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.db.university.create({
        data: {
          name: input.name,
          city: input.city ?? null,
          country: input.country,
          type: input.type,
          ranking: input.ranking ?? null,
          app_source: input.appSource ?? null,
          website: input.website ?? null,
          logo_url: input.logoUrl ?? null,
          is_open: bool(input.isOpen),
        },
      });
      return toUniversityApi(created);
    }),

  updateUniversity: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }).merge(universityInput))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.university.update({
        where: { id: input.id },
        data: {
          name: input.name,
          city: input.city ?? null,
          country: input.country,
          type: input.type,
          ranking: input.ranking ?? null,
          app_source: input.appSource ?? null,
          website: input.website ?? null,
          logo_url: input.logoUrl ?? null,
          is_open: bool(input.isOpen),
        },
      });
      return toUniversityApi(updated);
    }),

  // Lightweight status flip used by the Activate / Deactivate buttons.
  setUniversityOpen: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive(), isOpen: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.university.update({
        where: { id: input.id },
        data: { is_open: bool(input.isOpen) },
      });
      return toUniversityApi(updated);
    }),

  deleteUniversity: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Course FK is ON DELETE RESTRICT; the DB will refuse if any course
      // points at this university. Surface that as a clean error.
      const count = await ctx.db.course.count({
        where: { university_id: input.id },
      });
      if (count > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot delete — ${count} program${count === 1 ? "" : "s"} reference this university.`,
        });
      }
      await ctx.db.university.delete({ where: { id: input.id } });
      return { success: true as const };
    }),

  // -------------------------------------------------------------------------
  // Courses (a.k.a. "Programs")
  // -------------------------------------------------------------------------
  listCourses: protectedAdminProcedure
    .input(
      z
        .object({
          universityId: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.course.findMany({
        where: input?.universityId
          ? { university_id: input.universityId }
          : undefined,
        orderBy: [{ university_id: "asc" }, { name: "asc" }],
        include: {
          university: { select: { id: true, name: true, country: true } },
        },
      });
      return rows.map(toCourseApi);
    }),

  createCourse: protectedAdminProcedure
    .input(courseInput)
    .mutation(async ({ ctx, input }) => {
      const uni = await ctx.db.university.findUnique({
        where: { id: input.universityId },
        select: { id: true },
      });
      if (!uni) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "University not found",
        });
      }
      const created = await ctx.db.course.create({
        data: {
          university_id: input.universityId,
          name: input.name,
          code: input.code ?? null,
          degree_level: input.degreeLevel ?? null,
          duration_months: input.durationMonths ?? null,
          tuition_fee: input.tuitionFee ?? null,
          currency: input.currency ?? null,
          is_open: bool(input.isOpen),
          url: input.url ?? null,
          toefl: input.toefl ?? null,
          ielts: input.ielts ?? null,
          det: input.det ?? null,
          is_stem: bool(input.isStem),
          intake_month: input.intakeMonth ?? null,
          intake_year: input.intakeYear ?? null,
          is_coop_available: bool(input.isCoopAvailable),
          has_app_fee_waiver: bool(input.hasAppFeeWaiver),
          app_fee: input.appFee ?? null,
          has_tuition_deposit: bool(input.hasTuitionDeposit),
          has_scholarship: bool(input.hasScholarship),
          scholarship_amount: input.scholarshipAmount ?? null,
          min_entry_requirements: input.minEntryRequirements ?? null,
          min_entry_requirements_scale: input.minEntryRequirementsScale ?? null,
          has_faster_tat: bool(input.hasFasterTat),
        },
        include: {
          university: { select: { id: true, name: true, country: true } },
        },
      });
      return toCourseApi(created);
    }),

  deleteCourse: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Restrict if applications point at this course.
      const count = await ctx.db.application.count({
        where: { course_id: input.id },
      });
      if (count > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot delete — ${count} application${count === 1 ? "" : "s"} reference this program.`,
        });
      }
      await ctx.db.course.delete({ where: { id: input.id } });
      return { success: true as const };
    }),
});
