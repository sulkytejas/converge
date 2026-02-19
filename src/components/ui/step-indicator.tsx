"use client";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="relative z-[1] mt-auto flex flex-col">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        const isLast = idx === steps.length - 1;

        return (
          <div
            key={step}
            className={`relative flex items-center gap-3.5 ${!isLast ? "pb-7" : ""}`}
          >
            {/* Connector line */}
            {!isLast && (
              <div
                className={`absolute left-[15px] top-[36px] h-[calc(100%-36px)] w-0.5 ${
                  isCompleted
                    ? "bg-white/60"
                    : "bg-white/20"
                }`}
              />
            )}
            {/* Circle */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-all ${
                isActive
                  ? "bg-white text-[#1570EF]"
                  : isCompleted
                    ? "bg-white/30 text-white"
                    : "bg-white/[0.12] text-white/50"
              }`}
            >
              {isCompleted ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M3 7l3 3 5-5"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            {/* Label */}
            <div
              className={`text-[13px] font-medium transition-all ${
                isActive
                  ? "font-semibold text-white"
                  : isCompleted
                    ? "text-white/75"
                    : "text-white/45"
              }`}
            >
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
}
