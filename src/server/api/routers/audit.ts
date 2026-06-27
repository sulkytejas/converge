import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedAdminProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { AdminRole } from "~/server/db/enums";

// Audit logs are a compliance surface — restricted to Super Admin + Finance.
const VIEW_ROLES: number[] = [AdminRole.SUPER_ADMIN, AdminRole.FINANCE_MANAGER, AdminRole.FINANCE_EXECUTIVE];
function assertCanView(role: number) {
  if (!VIEW_ROLES.includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Audit logs are restricted to Super Admins and Finance." });
  }
}

const PAGE_SIZE = 15;

// entity_type → module label (shown in the table + Module filter).
const MODULE_BY_ENTITY: Record<string, string> = {
  student: "Students",
  application: "Applications",
  event: "Events",
  user: "Partners",
};
const ENTITY_BY_MODULE: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_BY_ENTITY).map(([k, v]) => [v, k]),
);

// Every action string the app writes today (entity.verb). Used to back the
// Action-type filter (category → action IN (...)).
const ACTION_STRINGS = [
  "application.credential_saved", "application.credential_viewed", "application.removed", "application.status_updated", "application.uni_id_saved", "application.vendor_selected",
  "counsellor.approved", "counsellor.invited", "counsellor.rejected",
  "event.created", "event.deleted", "event.updated",
  "student.academics_updated", "student.application_created", "student.cp_counsellor_assigned", "student.document_removed", "student.document_uploaded", "student.profile_updated", "student.shortlist_removed", "student.shortlisted", "student.status_updated", "student.tests_updated", "student.work_experience_updated",
];

function categoryOf(action: string): string {
  if (action.includes("status")) return "Status Change";
  if (action.includes("approved")) return "Approval";
  if (action.includes("rejected")) return "Rejection";
  if (action.includes("invited")) return "Invite";
  if (action.includes("removed") || action.includes("deleted")) return "Delete";
  if (action.includes("viewed")) return "View";
  if (action.includes("created") || action.includes("uploaded") || action.includes("shortlisted") || action.includes("saved")) return "Create";
  if (action.includes("updated")) return "Update";
  return "Action";
}
const CATEGORIES = Array.from(new Set(ACTION_STRINGS.map(categoryOf))).sort();
const actionsForCategory = (cat: string) => ACTION_STRINGS.filter((a) => categoryOf(a) === cat);

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function actorIdOf(metadata: unknown): number | null {
  const v = asRecord(metadata).byCpUserId;
  return typeof v === "number" ? v : null;
}
function s(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v == null) return "";
  return JSON.stringify(v);
}
function humanize(action: string, entityId: number | null, metadata: unknown): string {
  const words = action.replace(/\./g, " ").replace(/_/g, " ");
  const base = words.charAt(0).toUpperCase() + words.slice(1);
  const meta = asRecord(metadata);
  const idPart = entityId ? ` (#${entityId})` : "";
  if (action.includes("status") && meta.from != null && meta.to != null) {
    return `${base}: ${s(meta.from)} → ${s(meta.to)}${idPart}`;
  }
  const extra =
    typeof meta.fileName === "string" ? ` — ${meta.fileName}` :
    typeof meta.reason === "string" && meta.reason ? ` — ${meta.reason}` : "";
  return `${base}${idPart}${extra}`;
}

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

interface AuditFilter { module?: string; category?: string; actorId?: number; from?: string; to?: string; search?: string }
function buildWhere(input: AuditFilter) {
  const search = input.search?.trim().toLowerCase();
  // Collapse the Action-type + free-text filters into one `action` condition.
  let actionCond: { in: string[] } | { contains: string } | undefined;
  if (input.category && search) {
    actionCond = { in: actionsForCategory(input.category).filter((a) => a.includes(search)) };
  } else if (input.category) {
    actionCond = { in: actionsForCategory(input.category) };
  } else if (search) {
    actionCond = { contains: search };
  }
  const createdAt =
    input.from || input.to
      ? {
          ...(input.from ? { gte: new Date(`${input.from}T00:00:00`) } : {}),
          ...(input.to ? { lte: new Date(`${input.to}T23:59:59`) } : {}),
        }
      : undefined;
  return {
    ...(input.module && ENTITY_BY_MODULE[input.module] ? { entity_type: ENTITY_BY_MODULE[input.module] } : {}),
    ...(actionCond ? { action: actionCond } : {}),
    ...(input.actorId != null ? { metadata: { path: "$.byCpUserId", equals: input.actorId } } : {}),
    ...(createdAt ? { created_at: createdAt } : {}),
  };
}

async function resolveActors(metas: unknown[]) {
  const ids = Array.from(new Set(metas.map(actorIdOf).filter((x): x is number => x != null)));
  const actors = ids.length
    ? await db.collegepond_user.findMany({ where: { id: { in: ids } }, select: { id: true, first_name: true, last_name: true } })
    : [];
  return new Map(actors.map((a) => [a.id, `${a.first_name} ${a.last_name}`.trim()]));
}
function mapRow(r: { id: number; created_at: Date; action: string; entity_type: string | null; entity_id: number | null; metadata: unknown }, actorMap: Map<number, string>) {
  const actorId = actorIdOf(r.metadata);
  return {
    id: r.id,
    timestamp: r.created_at.toISOString(),
    actorId,
    actor: actorId != null ? (actorMap.get(actorId) ?? `Admin #${actorId}`) : "System",
    action: r.action,
    category: categoryOf(r.action),
    module: r.entity_type ? (MODULE_BY_ENTITY[r.entity_type] ?? r.entity_type) : "—",
    description: humanize(r.action, r.entity_id, r.metadata),
    entityId: r.entity_id,
    metadata: asRecord(r.metadata),
  };
}

export const auditRouter = createTRPCRouter({
  // Static-ish filter options for the dropdowns.
  filters: protectedAdminProcedure.query(async ({ ctx }) => {
    assertCanView(ctx.cpUser.role);
    const admins = await db.collegepond_user.findMany({
      orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
      select: { id: true, first_name: true, last_name: true },
    });
    return {
      admins: admins.map((a) => ({ id: a.id, name: `${a.first_name} ${a.last_name}`.trim() })),
      modules: Object.values(MODULE_BY_ENTITY),
      categories: CATEGORIES,
    };
  }),

  list: protectedAdminProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      module: z.string().optional(),
      category: z.string().optional(),
      actorId: z.number().int().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      assertCanView(ctx.cpUser.role);
      const where = buildWhere(input);

      const [total, rows, today, week, month, allTime] = await Promise.all([
        db.audit_log.count({ where }),
        db.audit_log.findMany({ where, orderBy: { created_at: "desc" }, skip: (input.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
        db.audit_log.count({ where: { created_at: { gte: startOfToday() } } }),
        db.audit_log.count({ where: { created_at: { gte: daysAgo(7) } } }),
        db.audit_log.count({ where: { created_at: { gte: daysAgo(30) } } }),
        db.audit_log.count(),
      ]);

      const actorMap = await resolveActors(rows.map((r) => r.metadata));
      return {
        page: input.page,
        pageSize: PAGE_SIZE,
        total,
        stats: { today, week, month, total: allTime },
        rows: rows.map((r) => mapRow(r, actorMap)),
      };
    }),

  // All matching rows (capped) for CSV export.
  export: protectedAdminProcedure
    .input(z.object({ module: z.string().optional(), category: z.string().optional(), actorId: z.number().int().optional(), from: z.string().optional(), to: z.string().optional(), search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      assertCanView(ctx.cpUser.role);
      const rows = await db.audit_log.findMany({ where: buildWhere(input), orderBy: { created_at: "desc" }, take: 5000 });
      const actorMap = await resolveActors(rows.map((r) => r.metadata));
      return rows.map((r) => mapRow(r, actorMap));
    }),
});
