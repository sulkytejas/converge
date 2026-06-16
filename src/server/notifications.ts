import { env } from "~/env";
import { emailConfigured, sendTemplatedEmail } from "./email";
import type { Application } from "./applications/store";

export async function notifyAdminOfSignup(app: Application): Promise<void> {
  if (!env.ADMIN_EMAIL) return;

  // Email the admin via MSG91 when a notification template is configured.
  if (env.MSG91_ADMIN_NOTIFY_TEMPLATE_ID && emailConfigured()) {
    try {
      await sendTemplatedEmail({
        to: env.ADMIN_EMAIL,
        templateId: env.MSG91_ADMIN_NOTIFY_TEMPLATE_ID,
        variables: {
          application_id: app.applicationId,
          name: `${app.firstName} ${app.lastName}`,
          email: app.email,
          phone: `${app.countryCode} ${app.phone}`,
          role: app.role,
          company: app.companyName ?? "—",
        },
      });
      return;
    } catch (e) {
      console.error(
        "[Notification] admin signup email failed:",
        e instanceof Error ? e.message : e,
      );
      return;
    }
  }

  // No template configured yet — minimal, non-PII log (never the applicant's
  // name/email/phone).
  console.log(
    `[Notification] New partner signup ${app.applicationId} pending review (set MSG91_ADMIN_NOTIFY_TEMPLATE_ID to email ${env.ADMIN_EMAIL}).`,
  );
}
