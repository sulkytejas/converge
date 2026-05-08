interface StatusBadgeProps {
  status: "active" | "inactive";
  /** Optional override — defaults to "Active" / "Inactive". */
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  if (status === "active") {
    return (
      <span className="inline-block rounded-[10px] bg-[#ECFDF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#067647]">
        {label ?? "Active"}
      </span>
    );
  }
  return (
    <span className="inline-block rounded-[10px] bg-[#F2F4F7] px-2.5 py-0.5 text-[11px] font-semibold text-[#667085]">
      {label ?? "Inactive"}
    </span>
  );
}
