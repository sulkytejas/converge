"use client";

interface VerifiedCardProps {
  name: string;
  email: string;
  roleLabel: string;
  roles?: { value: string; label: string }[];
  selectedRole?: string;
  onRoleChange?: (role: string) => void;
}

export function VerifiedCard({
  name,
  email,
  roleLabel,
  roles,
  selectedRole,
  onRoleChange,
}: VerifiedCardProps) {
  const showRoleSelector = roles && roles.length > 1;

  return (
    <div className="pt-6 pb-2 text-center">
      {/* Verified icon */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF3]">
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8 fill-none stroke-[#12B76A] stroke-2"
        >
          <path d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>

      <div className="mb-1 text-xl font-bold text-[#101828]">{name}</div>
      <div className="mb-5 text-sm text-[#667085]">{email}</div>

      {/* Role badge */}
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-[#B2CCFF] bg-[#F0F7FF] px-4 py-2 text-sm font-semibold text-[#1570EF]">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-none stroke-[#1570EF] stroke-2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        {roleLabel}
      </div>

      {/* Role selector (for multi-role users) */}
      {showRoleSelector && (
        <div className="mt-4 text-left">
          <label className="mb-1.5 block text-[13px] font-semibold text-[#344054]">
            Select a role to continue
          </label>
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange?.(e.target.value)}
            className="w-full rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-sm text-[#101828] outline-none transition-all focus:border-[#1570EF] focus:shadow-[0_0_0_3px_rgba(21,112,239,0.12)]"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
