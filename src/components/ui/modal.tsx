"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Footer slot — usually action buttons. Rendered with a divider above. */
  footer?: ReactNode;
  /** Tailwind width class (default: w-[520px]). */
  width?: string;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = "w-[520px]",
}: ModalProps) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-[rgba(16,24,40,0.55)]"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] ${width} max-w-[calc(100vw-32px)] overflow-y-auto rounded-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E4E7EC] px-6 py-5">
          <h3 className="text-base font-bold text-[#101828]">{title}</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#E4E7EC] bg-white hover:bg-[#F9FAFB]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#667085"
              strokeWidth={2}
              className="h-4 w-4"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-[#E4E7EC] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
