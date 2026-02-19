"use client";

import { countryCodes } from "~/lib/constants/location-data";

const chevronBg = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2398A2B3' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

interface PhoneInputProps {
  label?: string;
  required?: boolean;
  countryCode: string;
  phone: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneChange: (phone: string) => void;
  error?: boolean;
  errorMessage?: string;
}

export function PhoneInput({
  label,
  required,
  countryCode,
  phone,
  onCountryCodeChange,
  onPhoneChange,
  error,
  errorMessage,
}: PhoneInputProps) {
  return (
    <div className="flex flex-1 flex-col">
      {label && (
        <label className="mb-1.5 text-[13px] font-medium text-[#344054]">
          {label} {required && <span className="text-[#F04438]">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <select
          className="h-[42px] w-[90px] shrink-0 cursor-pointer appearance-none rounded-lg border border-[#D0D5DD] bg-[#F9FAFB] bg-[right_8px_center] bg-no-repeat pr-7 pl-3 font-[family-name:var(--font-inter)] text-sm text-[#101828] outline-none transition-all focus:border-[#1570EF] focus:shadow-[0_0_0_3px_rgba(21,112,239,0.12)]"
          style={{ backgroundImage: chevronBg }}
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
        >
          {countryCodes.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          className={`h-[42px] flex-1 rounded-lg border px-3.5 font-[family-name:var(--font-inter)] text-sm text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1570EF] focus:shadow-[0_0_0_3px_rgba(21,112,239,0.12)] ${
            error
              ? "border-[#F04438] shadow-[0_0_0_3px_rgba(240,68,56,0.12)]"
              : "border-[#D0D5DD]"
          }`}
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^0-9\s]/g, "");
            onPhoneChange(cleaned);
          }}
        />
      </div>
      {error && errorMessage && (
        <div className="mt-1 flex items-center gap-1 text-xs text-[#F04438]">
          <svg
            viewBox="0 0 16 16"
            fill="#F04438"
            className="h-[13px] w-[13px] shrink-0"
          >
            <circle cx="8" cy="8" r="7" />
            <path
              d="M8 4v4M8 10.5v.5"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {errorMessage}
        </div>
      )}
    </div>
  );
}
