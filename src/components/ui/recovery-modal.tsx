"use client";

import { useState } from "react";

interface RecoveryOption {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  detail: React.ReactNode;
}

interface RecoveryModalProps {
  open: boolean;
  onClose: () => void;
  options?: RecoveryOption[];
}

const defaultOptions: RecoveryOption[] = [
  {
    id: "phone",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1570EF" strokeWidth="2" className="h-5 w-5">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
    title: "Changed my phone number",
    subtitle: "I no longer have access to my registered phone",
    detail: (
      <div className="rounded-[10px] bg-[#EFF8FF] p-4">
        <h4 className="mb-2 text-sm font-bold text-[#175CD3]">Changed Phone Number</h4>
        <p className="mb-2 text-[13px] leading-relaxed text-[#344054]">To update your registered phone number:</p>
        <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-[#344054]">
          <li>Contact your <strong>Super Admin</strong> or <strong>IT Support</strong></li>
          <li>They will verify your identity using your email and employee ID</li>
          <li>Your phone number will be updated in the <strong>Users</strong> page</li>
          <li>You can then login with your new phone number</li>
        </ol>
        <div className="mt-3 text-xs text-[#667085]">
          <strong>IT Support:</strong> it-support@collegepond.com
        </div>
      </div>
    ),
  },
  {
    id: "email",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1570EF" strokeWidth="2" className="h-5 w-5">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    title: "Can't access my email",
    subtitle: "My @collegepond.com email is not working",
    detail: (
      <div className="rounded-[10px] bg-[#FFFAEB] p-4">
        <h4 className="mb-2 text-sm font-bold text-[#B54708]">Email Access Issue</h4>
        <p className="mb-2 text-[13px] leading-relaxed text-[#344054]">If you cannot access your @collegepond.com email:</p>
        <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-[#344054]">
          <li>Contact your <strong>IT Support</strong> to reset your Google Workspace / email access</li>
          <li>Once email is restored, return here and login normally</li>
          <li>OTP will be sent to both your phone and restored email</li>
        </ol>
        <div className="mt-3 text-xs text-[#667085]">
          <strong>IT Support:</strong> it-support@collegepond.com
        </div>
      </div>
    ),
  },
  {
    id: "locked",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1570EF" strokeWidth="2" className="h-5 w-5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: "Account is locked",
    subtitle: "Too many failed attempts or account deactivated",
    detail: (
      <div className="rounded-[10px] bg-[#FEF3F2] p-4">
        <h4 className="mb-2 text-sm font-bold text-[#B42318]">Account Locked</h4>
        <p className="mb-2 text-[13px] leading-relaxed text-[#344054]">Your account may be locked due to:</p>
        <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-[#344054]">
          <li><strong>Too many failed login attempts</strong> — Wait 30 minutes and try again</li>
          <li><strong>Account deactivated</strong> — Contact Super Admin to reactivate</li>
        </ul>
        <p className="mt-2 text-[13px] leading-relaxed text-[#344054]">
          For immediate access, contact your Super Admin who can unlock your account from the <strong>Users</strong> page.
        </p>
        <div className="mt-3 text-xs text-[#667085]">
          <strong>Super Admin:</strong> services@collegepond.com
        </div>
      </div>
    ),
  },
  {
    id: "other",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1570EF" strokeWidth="2" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    title: "Other issue",
    subtitle: "I need help with something else",
    detail: (
      <div className="rounded-[10px] bg-[#F2F4F7] p-4">
        <h4 className="mb-2 text-sm font-bold text-[#344054]">Need Help?</h4>
        <p className="mb-3 text-[13px] leading-relaxed text-[#344054]">For any other login issues, please contact:</p>
        <div className="text-[13px] leading-loose text-[#344054]">
          <strong>IT Support:</strong> it-support@collegepond.com<br />
          <strong>Super Admin:</strong> services@collegepond.com<br />
          <strong>Hours:</strong> Mon-Fri, 9:00 AM - 6:00 PM IST
        </div>
      </div>
    ),
  },
];

export function RecoveryModal({ open, onClose, options = defaultOptions }: RecoveryModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!open) return null;

  const selectedOption = options.find((o) => o.id === selectedId);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[480px] rounded-2xl bg-white p-10 text-left shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#101828]">Account Recovery</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#E4E7EC] bg-white transition-colors hover:bg-[#F9FAFB]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {!selectedOption ? (
          <>
            <p className="mb-4 text-[13px] text-[#667085]">Select the issue you&apos;re experiencing:</p>
            <div className="flex flex-col gap-2">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedId(opt.id)}
                  className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-[#E4E7EC] bg-white px-4 py-3.5 text-left text-[13px] text-[#101828] transition-all hover:border-[#1570EF] hover:bg-[#F0F7FF]"
                >
                  <span className="mt-0.5 shrink-0">{opt.icon}</span>
                  <div>
                    <strong>{opt.title}</strong>
                    <br />
                    <span className="text-xs text-[#667085]">{opt.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {selectedOption.detail}
            <div className="mt-4">
              <button
                onClick={() => setSelectedId(null)}
                className="cursor-pointer rounded-lg border border-[#D0D5DD] bg-white px-4 py-2 text-[13px] font-semibold text-[#344054] transition-colors hover:bg-[#F9FAFB]"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
