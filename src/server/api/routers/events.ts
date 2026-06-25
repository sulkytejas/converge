import { z } from "zod";
import {
  createTRPCRouter,
  protectedAdminProcedure,
  protectedPartnerProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { EVENT_TYPE_CODES, type EventType } from "~/server/db/enums";

// ---------------------------------------------------------------------------
// Events — admin CRUD over the `event` table. start/end_time are MySQL TIME
// columns; we serialize them to "HH:MM" (UTC) over the wire. is_active maps to
// the mock's Published(1)/Draft(0). event_date is a DATE — exchanged as
// "YYYY-MM-DD" (UTC) to avoid timezone drift.
// ---------------------------------------------------------------------------

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToDate(hhmm: string | null | undefined): Date | null {
  if (!hhmm) return null;
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}
function dateToTime(d: Date | null): string | null {
  return d ? d.toISOString().slice(11, 16) : null;
}

const eventInput = z.object({
  title: z.string().trim().min(1).max(255),
  eventType: z
    .number()
    .int()
    .refine((v) => EVENT_TYPE_CODES.includes(v as EventType), "Invalid type"),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  startTime: z.string().regex(HHMM).nullable().optional(),
  endTime: z.string().regex(HHMM).nullable().optional(),
  isVirtual: z.boolean(),
  location: z.string().trim().max(255).nullable().optional(),
  meetingUrl: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  maxAttendees: z.number().int().positive().max(100000).nullable().optional(),
  isActive: z.boolean(),
});

function toData(input: z.infer<typeof eventInput>) {
  return {
    title: input.title,
    event_type: input.eventType,
    description: input.description ?? null,
    event_date: new Date(`${input.eventDate}T00:00:00.000Z`),
    start_time: timeToDate(input.startTime),
    end_time: timeToDate(input.endTime),
    location: input.isVirtual ? null : (input.location ?? null),
    is_virtual: input.isVirtual ? 1 : 0,
    meeting_url: input.isVirtual ? (input.meetingUrl ?? null) : null,
    max_attendees: input.maxAttendees ?? null,
    is_active: input.isActive ? 1 : 0,
  };
}

export const eventsRouter = createTRPCRouter({
  list: protectedAdminProcedure.query(async () => {
    const rows = await db.event.findMany({
      orderBy: { event_date: "desc" },
      select: {
        id: true,
        title: true,
        event_type: true,
        description: true,
        event_date: true,
        start_time: true,
        end_time: true,
        location: true,
        is_virtual: true,
        meeting_url: true,
        max_attendees: true,
        is_active: true,
        _count: { select: { event_registration: true } },
      },
    });
    return rows.map((e) => ({
      id: e.id,
      title: e.title,
      eventType: e.event_type,
      description: e.description,
      eventDate: e.event_date.toISOString().slice(0, 10),
      startTime: dateToTime(e.start_time),
      endTime: dateToTime(e.end_time),
      location: e.location,
      isVirtual: e.is_virtual === 1,
      meetingUrl: e.meeting_url,
      maxAttendees: e.max_attendees,
      isActive: e.is_active === 1,
      registrations: e._count.event_registration,
    }));
  }),

  create: protectedAdminProcedure
    .input(eventInput)
    .mutation(async ({ ctx, input }) => {
      const ev = await db.event.create({
        data: toData(input),
        select: { id: true },
      });
      await db.audit_log.create({
        data: {
          action: "event.created",
          entity_type: "event",
          entity_id: ev.id,
          metadata: { byCpUserId: ctx.cpUser.id },
        },
      });
      return { id: ev.id };
    }),

  update: protectedAdminProcedure
    .input(eventInput.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.event.update({
        where: { id: input.id },
        data: { ...toData(input), updated_at: new Date() },
      });
      await db.audit_log.create({
        data: {
          action: "event.updated",
          entity_type: "event",
          entity_id: input.id,
          metadata: { byCpUserId: ctx.cpUser.id },
        },
      });
      return { id: input.id };
    }),

  delete: protectedAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // event_registration cascades on delete (FK onDelete: Cascade).
      await db.event.delete({ where: { id: input.id } });
      await db.audit_log.create({
        data: {
          action: "event.deleted",
          entity_type: "event",
          entity_id: input.id,
          metadata: { byCpUserId: ctx.cpUser.id },
        },
      });
      return { success: true as const };
    }),

  // Published events visible to partners (upcoming + past), read-only.
  forPartners: protectedPartnerProcedure.query(async () => {
    const rows = await db.event.findMany({
      where: { is_active: 1 },
      orderBy: { event_date: "desc" },
      select: {
        id: true,
        title: true,
        event_type: true,
        description: true,
        event_date: true,
        start_time: true,
        end_time: true,
        location: true,
        is_virtual: true,
        meeting_url: true,
        max_attendees: true,
      },
    });
    return rows.map((e) => ({
      id: e.id,
      title: e.title,
      eventType: e.event_type,
      description: e.description,
      eventDate: e.event_date.toISOString().slice(0, 10),
      startTime: dateToTime(e.start_time),
      endTime: dateToTime(e.end_time),
      location: e.location,
      isVirtual: e.is_virtual === 1,
      meetingUrl: e.meeting_url,
      maxAttendees: e.max_attendees,
    }));
  }),
});
