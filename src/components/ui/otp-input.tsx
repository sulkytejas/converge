"use client";

import { useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from "react";

interface OtpInputProps {
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
  error?: boolean;
  verified?: boolean;
  disabled?: boolean;
}

export function OtpInput({
  length = 5,
  value,
  onChange,
  error,
  verified,
  disabled,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el;
    },
    [],
  );

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const handleInput = (index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, "");
    if (!digit) {
      const newValue = [...value];
      newValue[index] = "";
      onChange(newValue);
      return;
    }

    const newValue = [...value];
    newValue[index] = digit.charAt(digit.length - 1);
    onChange(newValue);

    if (index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        const newValue = [...value];
        newValue[index - 1] = "";
        onChange(newValue);
        focusInput(index - 1);
        e.preventDefault();
      } else {
        const newValue = [...value];
        newValue[index] = "";
        onChange(newValue);
      }
    }
    if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
      e.preventDefault();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1);
      e.preventDefault();
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    const newValue = [...value];
    pasteData.split("").forEach((char, i) => {
      if (index + i < length) {
        newValue[index + i] = char;
      }
    });
    onChange(newValue);
    const focusIdx = Math.min(index + pasteData.length, length - 1);
    focusInput(focusIdx);
  };

  return (
    <div className={`flex gap-2.5 ${verified ? "pointer-events-none opacity-50" : ""}`}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={setRef(i)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled ?? verified}
          className={`h-[54px] w-[52px] rounded-[10px] border-[1.5px] text-center font-[family-name:var(--font-inter)] text-[22px] font-semibold text-[#101828] caret-[#1570EF] outline-none transition-all focus:border-[#1570EF] focus:shadow-[0_0_0_3px_rgba(21,112,239,0.12)] ${
            error
              ? "border-[#F04438] bg-[#FEF3F2]"
              : value[i]
                ? "border-[#1570EF] bg-[#F0F7FF]"
                : "border-[#D0D5DD]"
          }`}
          value={value[i] ?? ""}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
