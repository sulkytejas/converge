"use client";

interface ReviewItem {
  label: string;
  value: React.ReactNode;
}

interface ReviewCardProps {
  title: string;
  onEdit?: () => void;
  items?: ReviewItem[];
  children?: React.ReactNode;
}

export function ReviewCard({ title, onEdit, items, children }: ReviewCardProps) {
  return (
    <div className="mb-4 rounded-[10px] border border-[#E4E7EC] p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#101828]">{title}</h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="cursor-pointer font-[family-name:var(--font-inter)] text-[13px] font-medium text-[#1570EF] hover:underline border-none bg-transparent"
          >
            Edit
          </button>
        )}
      </div>
      {items && items.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          {items.map((item) => (
            <div key={item.label}>
              <div className="text-[11px] font-medium tracking-wide text-[#98A2B3] uppercase">
                {item.label}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm font-medium text-[#101828]">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

interface DocBadgeProps {
  name: string;
  status: "uploaded" | "pending" | "skipped";
}

export function DocBadge({ name, status }: DocBadgeProps) {
  const styles = {
    uploaded: "bg-[rgba(18,183,106,0.08)] text-[#12B76A]",
    pending: "bg-[rgba(247,144,9,0.08)] text-[#F79009]",
    skipped: "bg-[#F2F4F7] text-[#98A2B3]",
  };
  const icons = {
    uploaded: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M3 6l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    pending: (
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <circle cx="4" cy="4" r="3" fill="currentColor" />
      </svg>
    ),
    skipped: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M3 6h6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${styles[status]}`}
    >
      {icons[status]}
      {name}
    </span>
  );
}
