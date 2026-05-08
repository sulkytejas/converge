import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Small grey caption shown under the value. */
  sub?: string;
  /** Optional Tailwind class for the value (e.g. accent color). */
  valueClassName?: string;
}

export function StatCard({ label, value, sub, valueClassName }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white p-5">
      <div className="mb-2 text-sm font-medium text-[#667085]">{label}</div>
      <div className={`text-[28px] font-bold text-[#101828] ${valueClassName ?? ""}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-[#98A2B3]">{sub}</div>}
    </div>
  );
}
