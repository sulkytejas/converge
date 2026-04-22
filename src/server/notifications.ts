import { env } from "~/env";
import type { Application } from "./applications/store";

export async function notifyAdminOfSignup(app: Application): Promise<void> {
  if (!env.ADMIN_EMAIL) {
    console.log("[Notification] ADMIN_EMAIL not set, skipping admin notification");
    return;
  }

  const lines = [
    `Application ID: ${app.applicationId}`,
    `Name: ${app.firstName} ${app.lastName}`,
    `Email: ${app.email}`,
    `Phone: ${app.countryCode} ${app.phone}`,
    `Role: ${app.role}`,
    app.companyName ? `Company: ${app.companyName}` : null,
    app.country ? `Location: ${[app.city, app.state, app.country].filter(Boolean).join(", ")}` : null,
    app.documents ? `Documents: ${Object.keys(app.documents).length} uploaded` : null,
    `Submitted: ${app.submittedAt}`,
  ].filter(Boolean);

  const subject = `New signup for review: ${app.firstName} ${app.lastName}`;
  const body = lines.join("\n");

  // Real email send requires MSG91 email config + a separate admin-notification template.
  // For now, log the notification — swap in a real send here once the template exists.
  console.log(`[Notification:sandbox] → ${env.ADMIN_EMAIL}`);
  console.log(`Subject: ${subject}`);
  console.log(body);
}
