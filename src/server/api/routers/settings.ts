import { createTRPCRouter, protectedAdminProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const settingsRouter = createTRPCRouter({
  // Real DB counts for the Settings → Data Management "Data Statistics" panel.
  dataStats: protectedAdminProcedure.query(async () => {
    const [universities, programs, students, invoices, events] = await Promise.all([
      db.university.count(),
      db.course.count(),
      db.student.count(),
      db.invoice.count(),
      db.event.count(),
    ]);
    return { universities, programs, students, invoices, events };
  }),
});
