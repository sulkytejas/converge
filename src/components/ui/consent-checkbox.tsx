"use client";

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: boolean;
  errorMessage?: string;
}

export function ConsentCheckbox({
  checked,
  onChange,
  error,
  errorMessage,
}: ConsentCheckboxProps) {
  return (
    <div>
      <div className="mt-5 flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#1570EF]"
        />
        <label className="cursor-pointer text-[13px] leading-relaxed text-[#667085]">
          I confirm that the information provided is accurate and agree to the{" "}
          <a href="#" className="font-medium text-[#1570EF] hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="font-medium text-[#1570EF] hover:underline">
            Privacy Policy
          </a>{" "}
          of Collegepond.
        </label>
      </div>
      {error && errorMessage && (
        <div className="mt-1.5 ml-7 text-[13px] text-[#F04438]">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
