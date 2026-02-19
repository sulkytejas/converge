"use client";

import { type SelectHTMLAttributes } from "react";

const chevronBg = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2398A2B3' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function FormSelect({
  label,
  required,
  error,
  errorMessage,
  options,
  placeholder,
  className = "",
  ...props
}: FormSelectProps) {
  return (
    <div className="flex flex-1 flex-col">
      {label && (
        <label className="mb-1.5 text-[13px] font-medium text-[#344054]">
          {label} {required && <span className="text-[#F04438]">*</span>}
        </label>
      )}
      <select
        className={`h-[42px] w-full cursor-pointer appearance-none rounded-lg border bg-white bg-[right_14px_center] bg-no-repeat pr-9 pl-3.5 font-[family-name:var(--font-inter)] text-sm text-[#101828] outline-none transition-all focus:border-[#1570EF] focus:shadow-[0_0_0_3px_rgba(21,112,239,0.12)] ${
          error
            ? "border-[#F04438] shadow-[0_0_0_3px_rgba(240,68,56,0.12)]"
            : "border-[#D0D5DD]"
        } ${props.disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
        style={{ backgroundImage: chevronBg }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
