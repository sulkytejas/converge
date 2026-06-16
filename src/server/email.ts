import "server-only";
import { env } from "~/env";

// Transactional email via MSG91 (same provider as OTP — see src/server/otp).
// Each email type maps to an MSG91 email template; pass its template_id and the
// variables the template expects.

export function emailConfigured(): boolean {
  return Boolean(
    env.MSG91_AUTH_KEY && env.MSG91_EMAIL_FROM && env.MSG91_EMAIL_DOMAIN,
  );
}

export async function sendTemplatedEmail(opts: {
  to: string;
  templateId: string;
  variables: Record<string, string>;
}): Promise<void> {
  if (!env.MSG91_AUTH_KEY || !env.MSG91_EMAIL_FROM || !env.MSG91_EMAIL_DOMAIN) {
    throw new Error("MSG91 email is not configured");
  }
  const res = await fetch("https://control.msg91.com/api/v5/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: env.MSG91_AUTH_KEY,
    },
    body: JSON.stringify({
      recipients: [{ to: [{ email: opts.to }], variables: opts.variables }],
      from: { email: env.MSG91_EMAIL_FROM },
      domain: env.MSG91_EMAIL_DOMAIN,
      template_id: opts.templateId,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    type?: string;
    message?: string;
  };
  if (!res.ok || data.type === "error") {
    throw new Error(data.message ?? `MSG91 email failed (${res.status})`);
  }
}
