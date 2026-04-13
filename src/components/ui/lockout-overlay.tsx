"use client";

interface LockoutOverlayProps {
  open: boolean;
}

export function LockoutOverlay({ open }: LockoutOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-[400px] rounded-2xl bg-white p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF3F2]">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8 fill-none stroke-[#F04438] stroke-2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <div className="mb-2 text-lg font-bold text-[#101828]">Account Locked</div>
        <div className="text-sm leading-relaxed text-[#667085]">
          Too many failed login attempts. Your account has been temporarily locked for security.
          <br /><br />
          Please contact your IT administrator to unlock your account.
        </div>
      </div>
    </div>
  );
}
