import {
  createTRPCRouter,
  protectedAdminProcedure,
  protectedPartnerProcedure,
} from "~/server/api/trpc";
import { UniApplicationStatus, UserStatus, UserType } from "~/server/db/enums";

// ---------------------------------------------------------------------------
// Dashboard aggregations.
//   adminStats   — portal-wide overview (admin dashboard).
//   partnerStats — scoped to the signed-in partner's org (or, for independent
//                  counsellors with no org, the students they created).
//
// Milestone KPIs use the happy-path ordering of UniApplicationStatus
// (offer 4/5 → deposit 6 → visa 7). "Offers"/"Deposits" count apps at that
// stage OR beyond, so a deposit-paid app still counts as having an offer.
// Terminal outcomes (>=20: rejected/withdrawn/etc.) are intentionally excluded.
// ---------------------------------------------------------------------------

const OFFER_OR_BEYOND = [
  UniApplicationStatus.CONDITIONAL_OFFER,
  UniApplicationStatus.UNCONDITIONAL_OFFER,
  UniApplicationStatus.DEPOSIT_PAID,
  UniApplicationStatus.VISA_SECURED,
];
const DEPOSIT_OR_BEYOND = [
  UniApplicationStatus.DEPOSIT_PAID,
  UniApplicationStatus.VISA_SECURED,
];

export const dashboardRouter = createTRPCRouter({
  // ===== Admin overview =====
  adminStats: protectedAdminProcedure.query(async ({ ctx }) => {
    const { db } = ctx;
    const partnerWhere = { type: { not: UserType.ADMIN } };

    const [
      partners,
      students,
      applications,
      pendingApprovals,
      pipelineRaw,
      queueRaw,
      topOrgsRaw,
      appByCourse,
      byCountryRaw,
      recent,
    ] = await Promise.all([
      db.user.count({ where: partnerWhere }),
      db.student.count(),
      db.application.count(),
      db.user.count({
        where: { ...partnerWhere, status: UserStatus.UNDER_REVIEW },
      }),
      db.user.groupBy({ by: ["status"], where: partnerWhere, _count: true }),
      db.application.groupBy({ by: ["status"], _count: true }),
      db.student.groupBy({
        by: ["org_id"],
        where: { org_id: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      db.application.groupBy({ by: ["course_id"], _count: { course_id: true } }),
      db.student.groupBy({
        by: ["country"],
        _count: { country: true },
        orderBy: { _count: { country: "desc" } },
        take: 6,
      }),
      db.audit_log.findMany({
        orderBy: { created_at: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          entity_type: true,
          created_at: true,
        },
      }),
    ]);

    // Partner pipeline by status
    const pipeline = { underReview: 0, approved: 0, rejected: 0, inactive: 0 };
    for (const g of pipelineRaw) {
      if (g.status === UserStatus.UNDER_REVIEW) pipeline.underReview = g._count;
      else if (g.status === UserStatus.APPROVED) pipeline.approved = g._count;
      else if (g.status === UserStatus.REJECTED) pipeline.rejected = g._count;
      else if (g.status === UserStatus.INACTIVE) pipeline.inactive = g._count;
    }

    // Application queue — count per stage, ascending
    const applicationQueue = queueRaw
      .map((g) => ({ status: g.status, count: g._count }))
      .sort((a, b) => a.status - b.status);

    // Top partners — resolve org names
    const topOrgs = topOrgsRaw.filter(
      (g): g is typeof g & { org_id: number } => g.org_id !== null,
    );
    const orgs = topOrgs.length
      ? await db.organization.findMany({
          where: { id: { in: topOrgs.map((g) => g.org_id) } },
          select: { id: true, name: true },
        })
      : [];
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const topPartners = topOrgs.map((g) => ({
      orgId: g.org_id,
      name: orgName.get(g.org_id) ?? "—",
      students: g._count.id,
    }));

    // Top universities — applications grouped by course, rolled up to university
    const courses = appByCourse.length
      ? await db.course.findMany({
          where: { id: { in: appByCourse.map((g) => g.course_id) } },
          select: { id: true, university_id: true },
        })
      : [];
    const courseUni = new Map(courses.map((c) => [c.id, c.university_id]));
    const uniCount = new Map<number, number>();
    for (const g of appByCourse) {
      const uid = courseUni.get(g.course_id);
      if (uid == null) continue;
      uniCount.set(uid, (uniCount.get(uid) ?? 0) + g._count.course_id);
    }
    const unis = uniCount.size
      ? await db.university.findMany({
          where: { id: { in: [...uniCount.keys()] } },
          select: { id: true, name: true },
        })
      : [];
    const uniName = new Map(unis.map((u) => [u.id, u.name]));
    const topUniversities = [...uniCount.entries()]
      .map(([id, count]) => ({ id, name: uniName.get(id) ?? "—", applications: count }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 5);

    const applicationsByCountry = byCountryRaw.map((g) => ({
      country: g.country,
      count: g._count.country,
    }));

    const recentActivity = recent.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entity_type,
      at: r.created_at,
    }));

    return {
      kpis: { partners, students, applications, pendingApprovals },
      pipeline,
      applicationQueue,
      topPartners,
      topUniversities,
      applicationsByCountry,
      recentActivity,
    };
  }),

  // ===== Partner overview =====
  partnerStats: protectedPartnerProcedure.query(async ({ ctx }) => {
    const { db } = ctx;
    const me = await db.user.findUnique({
      where: { id: ctx.cpPartner.id },
      select: { id: true, org_id: true, bdm_id: true },
    });
    if (!me) return null;

    // Agency partners scope by org; independents by the students they created.
    const appWhere = me.org_id
      ? { org_id: me.org_id }
      : { student: { created_by_user_id: me.id } };
    const studentWhere = me.org_id
      ? { org_id: me.org_id }
      : { created_by_user_id: me.id };

    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const [
      applications,
      offers,
      deposits,
      visas,
      studentsThisYear,
      recentRaw,
      eventsRaw,
      bdm,
    ] = await Promise.all([
      db.application.count({ where: appWhere }),
      db.application.count({
        where: { ...appWhere, status: { in: OFFER_OR_BEYOND } },
      }),
      db.application.count({
        where: { ...appWhere, status: { in: DEPOSIT_OR_BEYOND } },
      }),
      db.application.count({
        where: { ...appWhere, status: UniApplicationStatus.VISA_SECURED },
      }),
      db.student.count({
        where: { ...studentWhere, created_at: { gte: yearStart } },
      }),
      db.application.findMany({
        where: appWhere,
        orderBy: { created_at: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          created_at: true,
          student: { select: { first_name: true, last_name: true } },
          course: { select: { university: { select: { name: true } } } },
        },
      }),
      db.event.findMany({
        where: { is_active: 1, event_date: { gte: todayStart } },
        orderBy: { event_date: "asc" },
        take: 4,
        select: {
          id: true,
          title: true,
          event_date: true,
          location: true,
          is_virtual: true,
        },
      }),
      me.bdm_id
        ? db.collegepond_user.findUnique({
            where: { id: me.bdm_id },
            select: {
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      kpis: { applications, offers, deposits, visas },
      recentApplications: recentRaw.map((a) => ({
        id: a.id,
        status: a.status,
        at: a.created_at,
        student: `${a.student.first_name} ${a.student.last_name}`.trim(),
        university: a.course.university.name,
      })),
      events: eventsRaw.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        location: e.location,
        isVirtual: e.is_virtual === 1,
      })),
      relationshipManager: bdm
        ? {
            name: `${bdm.first_name} ${bdm.last_name}`.trim(),
            email: bdm.email,
            phone: bdm.phone,
          }
        : null,
      studentsThisYear,
    };
  }),
});
