import { env } from "~/env";

// RazorpayX REST client for partner payouts + bank-account verification.
// All money movement is gated by the caller (the reconciliation release flow).
// When keys are unset the integration is "not configured" and callers fall back
// to manual recording — see razorpayConfigured().
const BASE = "https://api.razorpay.com/v1";

export function razorpayConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAYX_ACCOUNT_NUMBER);
}
// "test" for rzp_test_* (sandbox — no real money), "live" for rzp_live_*.
export function razorpayMode(): "test" | "live" | null {
  if (!env.RAZORPAY_KEY_ID) return null;
  return env.RAZORPAY_KEY_ID.startsWith("rzp_live") ? "live" : "test";
}

function authHeader(): string {
  const token = Buffer.from(`${env.RAZORPAY_KEY_ID ?? ""}:${env.RAZORPAY_KEY_SECRET ?? ""}`).toString("base64");
  return `Basic ${token}`;
}

async function rzp<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (!razorpayConfigured()) throw new Error("RazorpayX is not configured");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const desc = (data as { error?: { description?: string } })?.error?.description;
    throw new Error(desc ?? `RazorpayX request failed (${res.status})`);
  }
  return data as T;
}

export interface RzpValidation { id: string; status: string; results?: { account_status?: string; registered_name?: string } }
export interface RzpPayout { id: string; status: string; utr?: string | null }

export function createContact(input: { name: string; email?: string | null; contact?: string | null; referenceId?: string }) {
  return rzp<{ id: string }>("POST", "/contacts", {
    name: input.name,
    email: input.email ?? undefined,
    contact: input.contact ?? undefined,
    type: "vendor",
    reference_id: input.referenceId,
  });
}

export function createBankFundAccount(input: { contactId: string; name: string; ifsc: string; accountNumber: string }) {
  return rzp<{ id: string }>("POST", "/fund_accounts", {
    contact_id: input.contactId,
    account_type: "bank_account",
    bank_account: { name: input.name, ifsc: input.ifsc, account_number: input.accountNumber },
  });
}

// Penny-drop validation (₹1, refunded). status: created → completed; on completion
// results.account_status is "active" (valid) or "invalid".
export function createValidation(fundAccountId: string) {
  return rzp<RzpValidation>("POST", "/fund_accounts/validations", {
    account_number: env.RAZORPAYX_ACCOUNT_NUMBER,
    fund_account: { id: fundAccountId },
    amount: 100,
    currency: "INR",
  });
}
export function getValidation(id: string) {
  return rzp<RzpValidation>("GET", `/fund_accounts/validations/${id}`);
}

export function createPayout(input: { fundAccountId: string; amountInr: number; mode: string; referenceId?: string; narration?: string }) {
  return rzp<RzpPayout>("POST", "/payouts", {
    account_number: env.RAZORPAYX_ACCOUNT_NUMBER,
    fund_account_id: input.fundAccountId,
    amount: Math.round(input.amountInr * 100), // paise
    currency: "INR",
    mode: input.mode, // IMPS | NEFT | RTGS | UPI
    purpose: "payout",
    queue_if_low_balance: true,
    reference_id: input.referenceId,
    narration: input.narration?.slice(0, 30),
  });
}
