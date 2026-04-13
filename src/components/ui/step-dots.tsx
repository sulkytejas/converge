"use client";

interface StepDotsProps {
  total: number;
  current: number; // 0-indexed
}

export function StepDots({ total, current }: StepDotsProps) {
  return (
    <div className="mb-7 flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 w-8 rounded transition-all duration-300 ${
            i < current
              ? "bg-[#12B76A]"
              : i === current
                ? "bg-[#1570EF]"
                : "bg-[#E4E7EC]"
          }`}
        />
      ))}
    </div>
  );
}
