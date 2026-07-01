import { db } from "~/server/db";

export type NotificationTone = "blue" | "green" | "orange" | "red" | "gray";

// Persist an in-app notification for each recipient (partner user). One row per
// user so read state is per-recipient. Deduped + guarded against empty/invalid
// ids so callers can pass a raw owner list. Keep this the single write path for
// the notification feed — future events (invoices, payouts, applications) call
// here too.
export async function createNotifications(
  userIds: number[],
  n: {
    type: string;
    title: string;
    body?: string | null;
    link?: string | null;
    tone?: NotificationTone;
  },
): Promise<void> {
  const ids = Array.from(new Set(userIds)).filter((id) => id > 0);
  if (ids.length === 0) return;
  await db.notification.createMany({
    data: ids.map((user_id) => ({
      user_id,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
      tone: n.tone ?? "blue",
    })),
  });
}
