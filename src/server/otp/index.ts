import { env } from "~/env";
import * as sandbox from "./sandbox";
import * as msg91 from "./msg91";

const smsProvider = env.MSG91_AUTH_KEY && env.MSG91_SMS_TEMPLATE_ID ? msg91 : sandbox;

const emailProvider =
  env.MSG91_AUTH_KEY &&
  env.MSG91_EMAIL_TEMPLATE_ID &&
  env.MSG91_EMAIL_FROM &&
  env.MSG91_EMAIL_DOMAIN
    ? msg91
    : sandbox;

export function toE164(phone: string, countryCode: string): string {
  const digits = phone.replace(/\D/g, "");
  const cc = countryCode.replace(/\D/g, "");
  return `${cc}${digits}`;
}

export const sendPhoneOtp = smsProvider.sendPhoneOtp;
export const verifyPhoneOtp = smsProvider.verifyPhoneOtp;
export const sendEmailOtp = emailProvider.sendEmailOtp;
export const verifyEmailOtp = emailProvider.verifyEmailOtp;
