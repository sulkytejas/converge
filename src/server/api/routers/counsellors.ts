import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedAdminProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { UserStatus, UserType } from "~/server/db/enums";

// ---------------------------------------------------------------------------
// Counsellor approvals — agency counsellors (user.type = AGENCY_COUNSELLOR)
// added by partner owners. Admin approves (status → APPROVED, stamping
// approved_by) or rejects (status → REJECTED). The reject reason is captured
// in the audit log (no column for it on user yet).
// ---------------------------------------------------------------------------

// organization.num_counsellors is a declared range bucket (1–5); upper bound
// gives the "X / Y counsellors" cap shown under the partner. Code 5 (25+) =
// no fixed cap.
const CAP_UPPER: Record<number, number | null> = {
  1: 5,
  2: 10,
  3: 15,
  4: 25,
  5: null,
};

export const counsellorsRouter = createTRPCRouter({
  list: protectedAdminProcedure.query(async () => {
    const rows = await db.user.findMany({
      where: { type: UserType.AGENCY_COUNSELLOR },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        status: true,
        is_email_verified: true,
        is_phone_verified: true,
        created_at: true,
        org_id: true,
        approved_by_collegepond_user_id: true,
        organization: { select: { name: true, num_counsellors: true } },
      },
    });

    const approverIds = [
      ...new Set(
        rows
          .map((r) => r.approved_by_collegepond_user_id)
          .filter((v): v is number => v !== null),
      ),
    ];
    const approvers = approverIds.length
      ? await db.collegepond_user.findMany({
          where: { id: { in: approverIds } },
          select: { id: true, first_name: true, last_name: true },
        })
      : [];
    const approverName = new Map(
      approvers.map((a) => [a.id, `${a.first_name} ${a.last_name}`.trim()]),
    );

    return rows.map((r) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      email: r.email,
      phone: r.phone,
      status: r.status,
      orgId: r.org_id,
      partner: r.organization?.name ?? "—",
      partnerCap:
        r.organization?.num_counsellors != null
          ? (CAP_UPPER[r.organization.num_counsellors] ?? null)
          : null,
      emailVerified: r.is_email_verified === 1,
      phoneVerified: r.is_phone_verified === 1,
      createdAt: r.created_at,
      decidedBy:
        r.approved_by_collegepond_user_id !== null
          ? (approverName.get(r.approved_by_collegepond_user_id) ?? null)
          : null,
    }));
  }),

  setStatus: protectedAdminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        status: z.enum(["approved", "rejected"]),
        reason: z.string().trim().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, type: true },
      });
      if (user?.type !== UserType.AGENCY_COUNSELLOR) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Counsellor not found",
        });
      }
      const approved = input.status === "approved";
      await db.user.update({
        where: { id: user.id },
        data: {
          status: approved ? UserStatus.APPROVED : UserStatus.REJECTED,
          approved_by_collegepond_user_id: approved ? ctx.cpUser.id : null,
        },
      });
      await db.audit_log.create({
        data: {
          action: approved ? "counsellor.approved" : "counsellor.rejected",
          entity_type: "user",
          entity_id: user.id,
          metadata: { byCpUserId: ctx.cpUser.id, reason: input.reason ?? null },
        },
      });
      return { success: true as const };
    }),
});
