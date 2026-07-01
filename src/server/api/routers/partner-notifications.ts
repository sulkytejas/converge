import { createTRPCRouter, protectedPartnerProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

// Partner-facing in-app notification feed, read from the persistent
// `notification` table (unlike the admin bell, which is derived from live
// state). Written by ~/server/notify on discrete events.

type Tone = "blue" | "green" | "orange" | "red" | "gray";
const TONES = new Set<Tone>(["blue", "green", "orange", "red", "gray"]);

function relTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export const partnerNotificationsRouter = createTRPCRouter({
  list: protectedPartnerProcedure.query(async ({ ctx }) => {
    const rows = await db.notification.findMany({
      where: { user_id: ctx.cpPartner.id },
      orderBy: { created_at: "desc" },
      take: 30,
    });
    const unread = rows.reduce((n, r) => n + (r.read_at == null ? 1 : 0), 0);
    return {
      unread,
      notifications: rows.map((r) => ({
        id: String(r.id),
        title: r.title,
        body: r.body ?? undefined,
        time: relTime(r.created_at),
        tone: (TONES.has(r.tone as Tone) ? r.tone : "blue") as Tone,
        unread: r.read_at == null,
        href: r.link ?? undefined,
      })),
    };
  }),

  markAllRead: protectedPartnerProcedure.mutation(async ({ ctx }) => {
    await db.notification.updateMany({
      where: { user_id: ctx.cpPartner.id, read_at: null },
      data: { read_at: new Date() },
    });
    return { ok: true as const };
  }),
});
