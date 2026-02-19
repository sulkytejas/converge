"use client";

import { type InputHTMLAttributes } from "react";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
}

export function FormInput({
  label,
  required,
  error,
  errorMessage,
  className = "",
  ...props
}: FormInputProps) {
  return (
    <div className="flex flex-1 flex-col">
      {label && (
        <label className="mb-1.5 text-[13px] font-medium text-[#344054]">
          {label} {required && <span className="text-[#F04438]">*</span>}
        </label>
      )}
      <input
        className={`h-[42px] w-full rounded-lg border px-3.5 font-[family-name:var(--font-inter)] text-sm text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1570EF] focus:shadow-[0_0_0_3px_rgba(21,112,239,0.12)] ${
          error
            ? "border-[#F04438] shadow-[0_0_0_3px_rgba(240,68,56,0.12)]"
            : "border-[#D0D5DD]"
        } ${className}`}
        {...props}
      />
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

interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
}

export function FormTextarea({
  label,
  required,
  error,
  errorMessage,
  className = "",
  ...props
}: FormTextareaProps) {
  return (
    <div className="flex flex-1 flex-col">
      {label && (
        <label className="mb-1.5 text-[13px] font-medium text-[#344054]">
          {label} {required && <span className="text-[#F04438]">*</span>}
        </label>
      )}
      <textarea
        className={`min-h-[78px] w-full resize-y rounded-lg border px-3.5 py-3 font-[family-name:var(--font-inter)] text-sm leading-relaxed text-[#101828] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#1570EF] focus:shadow-[0_0_0_3px_rgba(21,112,239,0.12)] ${
          error
            ? "border-[#F04438] shadow-[0_0_0_3px_rgba(240,68,56,0.12)]"
            : "border-[#D0D5DD]"
        } ${className}`}
        {...props}
      />
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
