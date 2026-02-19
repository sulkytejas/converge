"use client";

import { useRef } from "react";

interface FileUploadProps {
  label: string;
  hint?: string;
  required?: boolean;
  accept?: string;
  maxSize?: number;
  fileName?: string;
  error?: boolean;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
}

function UploadIcon({ uploaded }: { uploaded: boolean }) {
  return (
    <div
      className={`mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg ${
        uploaded ? "bg-[rgba(18,183,106,0.1)]" : "bg-[#F2F4F7]"
      }`}
    >
      {uploaded ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 10l3.5 3.5L15 7"
            stroke="#12B76A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 4v12m0-12L6 8m4-4l4 4"
            stroke="#667085"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2"
            stroke="#667085"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

export function FileUpload({
  label,
  hint = "PDF, JPG or PNG (max 5MB)",
  required,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSize = 5,
  fileName,
  error,
  onFileSelect,
  onFileRemove,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploaded = !!fileName;

  const handleClick = () => {
    if (!uploaded) {
      inputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File size must be less than ${maxSize}MB`);
        return;
      }
      onFileSelect(file);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileRemove();
  };

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer rounded-lg border-[1.5px] border-dashed p-5 text-center transition-all hover:border-[#1570EF] hover:bg-[rgba(21,112,239,0.02)] ${
        uploaded
          ? "border-solid border-[#12B76A] bg-[rgba(18,183,106,0.04)]"
          : error
            ? "border-[#F04438] bg-[#FEF3F2]"
            : "border-[#D0D5DD]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <UploadIcon uploaded={uploaded} />
      <div
        className={`mb-1 text-[13px] font-semibold ${
          uploaded ? "text-[#12B76A]" : "text-[#344054]"
        }`}
      >
        {label}{" "}
        {required ? (
          <span className="text-[#F04438]">*</span>
        ) : (
          <span className="text-[#98A2B3]">(Optional)</span>
        )}
      </div>
      <div
        className={`text-[11px] ${uploaded ? "text-[#12B76A]" : "text-[#98A2B3]"}`}
      >
        {hint}
      </div>
      {uploaded && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="max-w-[180px] truncate text-xs font-medium text-[#12B76A]">
            {fileName}
          </span>
          <button
            onClick={handleRemove}
            className="rounded px-1.5 py-0.5 font-[family-name:var(--font-inter)] text-xs font-semibold text-[#F04438] transition-all hover:bg-[#FEF3F2]"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
