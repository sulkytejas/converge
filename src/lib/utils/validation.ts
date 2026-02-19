export const phoneDigitsByCode: Record<string, number> = {
  "+91": 10,
  "+1": 10,
  "+44": 10,
  "+971": 9,
  "+61": 9,
  "+65": 8,
  "+977": 10,
  "+880": 10,
  "+94": 9,
  "+234": 10,
  "+233": 9,
  "+254": 9,
};

export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

export function getExpectedPhoneDigits(countryCode: string): number {
  return phoneDigitsByCode[countryCode] ?? 10;
}

export function isValidPhone(phone: string, countryCode: string): boolean {
  const digits = phone.replace(/\s/g, "").replace(/[^0-9]/g, "");
  const expected = getExpectedPhoneDigits(countryCode);
  return digits.length === expected;
}

export function cleanPhoneDigits(phone: string): string {
  return phone.replace(/[^0-9\s]/g, "");
}
