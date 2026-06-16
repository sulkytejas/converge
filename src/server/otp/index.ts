import { env } from "~/env";
import * as sandbox from "./sandbox";
import * as msg91 from "./msg91";

// Provider is chosen at call time (not import time, so `next build` never trips
// the production guard below). In production we REFUSE to fall back to the
// sandbox provider — otherwise a missing MSG91 config would silently log OTP
// codes to stdout and never deliver them.

function smsConfigured(): boolean {
  return Boolean(env.MSG91_AUTH_KEY && env.MSG91_SMS_TEMPLATE_ID);
}

function emailConfigured(): boolean {
  return Boolean(
    env.MSG91_AUTH_KEY &&
      env.MSG91_EMAIL_TEMPLATE_ID &&
      env.MSG91_EMAIL_FROM &&
      env.MSG91_EMAIL_DOMAIN,
  );
}

function assertProvider(configured: boolean, what: string) {
  if (env.NODE_ENV === "production" && !configured) {
    throw new Error(
      `${what} OTP is not configured (MSG91_*). Refusing to use the sandbox provider in production.`,
    );
  }
}

function smsProvider() {
  assertProvider(smsConfigured(), "SMS");
  return smsConfigured() ? msg91 : sandbox;
}

function emailProvider() {
  assertProvider(emailConfigured(), "Email");
  return emailConfigured() ? msg91 : sandbox;
}

export function toE164(phone: string, countryCode: string): string {
  const digits = phone.replace(/\D/g, "");
  const cc = countryCode.replace(/\D/g, "");
  return `${cc}${digits}`;
}

export function sendPhoneOtp(phoneE164: string): Promise<void> {
  return smsProvider().sendPhoneOtp(phoneE164);
}
export function verifyPhoneOtp(phoneE164: string, code: string): Promise<boolean> {
  return smsProvider().verifyPhoneOtp(phoneE164, code);
}
export function sendEmailOtp(email: string): Promise<void> {
  return emailProvider().sendEmailOtp(email);
}
export function verifyEmailOtp(email: string, code: string): Promise<boolean> {
  return emailProvider().verifyEmailOtp(email, code);
}

// Dev autopilot: the login pages auto-fill and submit the just-sent code so
// the full OTP flow stays visible without manual code entry. Returns null
// outside `next dev` or when a real provider (MSG91) is configured, so
// nothing ever leaks in production.
export function devPeekPhoneOtp(phoneE164: string): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (smsConfigured()) return null;
  return sandbox.peekPhoneOtp(phoneE164);
}

export function devPeekEmailOtp(email: string): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (emailConfigured()) return null;
  return sandbox.peekEmailOtp(email);
}
