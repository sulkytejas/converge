"use client";

import { useEffect, useState, useCallback } from "react";

interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, open, onClose, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, handleClose]);

  if (!open && !visible) return null;

  return (
    <div
      className={`fixed top-6 right-6 z-[2000] flex items-center gap-2.5 rounded-[10px] bg-[#101828] px-5 py-3.5 text-sm font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-transform duration-300 ${
        visible ? "translate-x-0" : "translate-x-[120%]"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px] shrink-0 fill-none stroke-[#12B76A] stroke-2"
      >
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="10" />
      </svg>
      {message}
    </div>
  );
}
