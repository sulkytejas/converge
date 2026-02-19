export function maskEmail(email: string): string {
  if (!email?.includes("@")) return "y***@example.com";
  const [user, domain] = email.split("@");
  if (!user || !domain) return "y***@example.com";
  return user.substring(0, 2) + "***@" + domain;
}

export function maskPhone(phone: string, countryCode: string): string {
  const digits = phone.replace(/\s/g, "");
  if (digits.length < 4) return countryCode + " ****";
  return countryCode + " ****" + digits.slice(-5);
}
