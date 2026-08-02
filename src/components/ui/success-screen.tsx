"use client";

interface SuccessScreenProps {
  title: string;
  message: string;
  details?: { label: string; value: React.ReactNode }[];
  note?: string;
  actionLabel?: string;
  actionHref?: string;
  /** If true, shows a progress bar with auto-redirect behavior */
  showProgressBar?: boolean;
}

export function SuccessScreen({
  title,
  message,
  details,
  note,
  actionLabel,
  actionHref,
  showProgressBar,
}: SuccessScreenProps) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0f1117]">
      <div className="w-[580px] max-w-[90vw] rounded-2xl bg-white p-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.4)] animate-[fadeSlide_0.4s_ease]">
        {/* Checkmark */}
        <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[rgba(18,183,106,0.1)] animate-[scaleIn_0.5s_ease]">
          <svg
            viewBox="0 0 36 36"
            fill="none"
            className="h-9 w-9"
          >
            <path
              d="M10 18l5 5 11-11"
              stroke="#12B76A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="mb-2.5 text-2xl font-bold text-[#101828]">{title}</h2>
        <p className="mx-auto mb-7 max-w-[420px] text-sm leading-relaxed text-[#667085]">
          {message}
        </p>

        {details && details.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-3.5 rounded-[10px] bg-[#F9FAFB] p-5 px-6 text-left">
            {details.map((d) => (
              // min-w-0 stops a long value (e.g. an email address) from forcing
              // its grid track wider and spilling over the neighbouring column.
              <div key={d.label} className="min-w-0">
                <div className="text-[11px] font-medium tracking-wide text-[#98A2B3] uppercase">
                  {d.label}
                </div>
                <div className="mt-0.5 text-sm font-semibold break-words text-[#101828]">
                  {d.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {note && (
          <p className="mb-7 text-[13px] text-[#98A2B3]">{note}</p>
        )}

        {showProgressBar && (
          <div className="mx-auto mb-5 h-1 w-[180px] overflow-hidden rounded bg-[#E4E7EC]">
            <div className="h-full rounded bg-[#1570EF] animate-[progressFill_2s_ease-in-out_forwards]" />
          </div>
        )}

        {actionLabel && actionHref && (
          <a
            href={actionHref}
            className="inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#1570EF] text-sm font-semibold text-white transition-colors hover:bg-[#1260d4]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M13 8H3m0 0l4-4M3 8l4 4"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {actionLabel}
          </a>
        )}
      </div>
    </div>
  );
}
