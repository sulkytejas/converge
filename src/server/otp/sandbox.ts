const OTP_EXPIRY_MS = 5 * 60 * 1000;

interface StoredOtp {
  code: string;
  expiresAt: number;
}

const store = new Map<string, StoredOtp>();

function generate(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function put(key: string, code: string) {
  store.set(key, { code, expiresAt: Date.now() + OTP_EXPIRY_MS });
}

function take(key: string, code: string): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return false;
  }
  if (entry.code !== code) return false;
  store.delete(key);
  return true;
}

export async function sendPhoneOtp(phoneE164: string): Promise<void> {
  const code = generate();
  put(`sms:${phoneE164}`, code);
  console.log(`[OTP:sandbox] SMS to ${phoneE164} => ${code}`);
}

export async function verifyPhoneOtp(phoneE164: string, code: string): Promise<boolean> {
  return take(`sms:${phoneE164}`, code);
}

export async function sendEmailOtp(email: string): Promise<void> {
  const code = generate();
  put(`email:${email.toLowerCase()}`, code);
  console.log(`[OTP:sandbox] email to ${email} => ${code}`);
}

export async function verifyEmailOtp(email: string, code: string): Promise<boolean> {
  return take(`email:${email.toLowerCase()}`, code);
}

// Dev-only peeks (see devPeek* in ./index.ts): read the live code without
// consuming it so the login UI can autopilot through the real verify flow.
function peek(key: string): string | null {
  const entry = store.get(key);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.code;
}

export function peekPhoneOtp(phoneE164: string): string | null {
  return peek(`sms:${phoneE164}`);
}

export function peekEmailOtp(email: string): string | null {
  return peek(`email:${email.toLowerCase()}`);
}
