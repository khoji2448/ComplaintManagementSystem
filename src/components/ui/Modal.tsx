"use client";
import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

// Console modal: blurred backdrop, scale-in on the house easing, Escape to close.
export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`animate-modal-in relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden border border-[var(--hairline)] bg-[var(--card)] shadow-[0_24px_80px_-12px_rgba(14,17,22,0.3)] ${maxWidth}`}
      >
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-4">
          <h3 className="font-display text-base font-bold tracking-[-0.01em] text-[var(--ink)]">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--mute)] transition-colors hover:text-[var(--ink)]"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
