import { env } from "~/env";

const OTP_LENGTH = 5;
const OTP_EXPIRY_MINUTES = 5;
const EMAIL_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

interface Msg91Response {
  type?: string;
  message?: string;
}

function authkey(): string {
  if (!env.MSG91_AUTH_KEY) {
    throw new Error("MSG91_AUTH_KEY not configured");
  }
  return env.MSG91_AUTH_KEY;
}

async function msg91Fetch(url: string, body: unknown): Promise<Msg91Response> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: authkey(),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Msg91Response;
  if (!res.ok || data.type === "error") {
    throw new Error(data.message ?? `MSG91 request failed (${res.status})`);
  }
  return data;
}

// ─── SMS (MSG91 manages OTP state server-side) ──────────────────────────────

export async function sendPhoneOtp(phoneE164: string): Promise<void> {
  if (!env.MSG91_SMS_TEMPLATE_ID) {
    throw new Error("MSG91_SMS_TEMPLATE_ID not configured");
  }
  await msg91Fetch("https://control.msg91.com/api/v5/otp", {
    template_id: env.MSG91_SMS_TEMPLATE_ID,
    mobile: phoneE164,
    otp_length: OTP_LENGTH,
    otp_expiry: OTP_EXPIRY_MINUTES,
  });
}

export async function verifyPhoneOtp(phoneE164: string, code: string): Promise<boolean> {
  const res = await fetch(
    `https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(code)}&mobile=${encodeURIComponent(phoneE164)}`,
    { method: "POST", headers: { authkey: authkey() } },
  );
  const data = (await res.json().catch(() => ({}))) as Msg91Response;
  return res.ok && data.type === "success";
}

// ─── Email (we manage OTP ourselves, MSG91 just sends the mail) ─────────────

interface StoredEmailOtp {
  code: string;
  expiresAt: number;
}

const emailStore = new Map<string, StoredEmailOtp>();

function generateCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export async function sendEmailOtp(email: string): Promise<void> {
  if (!env.MSG91_EMAIL_TEMPLATE_ID || !env.MSG91_EMAIL_FROM || !env.MSG91_EMAIL_DOMAIN) {
    throw new Error("MSG91 email config incomplete");
  }

  const code = generateCode();
  emailStore.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + EMAIL_EXPIRY_MS,
  });

  await msg91Fetch("https://control.msg91.com/api/v5/email/send", {
    recipients: [{ to: [{ email }], variables: { otp: code } }],
    from: { email: env.MSG91_EMAIL_FROM },
    domain: env.MSG91_EMAIL_DOMAIN,
    template_id: env.MSG91_EMAIL_TEMPLATE_ID,
  });
}

export async function verifyEmailOtp(email: string, code: string): Promise<boolean> {
  const key = email.toLowerCase();
  const entry = emailStore.get(key);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    emailStore.delete(key);
    return false;
  }
  if (entry.code !== code) return false;
  emailStore.delete(key);
  return true;
}
