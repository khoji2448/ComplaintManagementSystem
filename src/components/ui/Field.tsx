"use client";
import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const base =
  "w-full bg-[var(--paper)] border border-[var(--hairline)] px-3 py-2.5 text-sm text-[var(--ink)] " +
  "placeholder:text-[var(--mute)] outline-none transition-colors duration-200 " +
  "focus:border-[var(--signal)] focus:shadow-[0_1px_0_0_var(--signal)] " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

// Labelled field wrapper — eyebrow label above any control.
export function Field({
  label,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--slate)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${base} ${className}`} {...rest} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select className={`${base} appearance-none cursor-pointer ${className}`} {...rest} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea className={`${base} resize-none ${className}`} {...rest} />;
}

// Class string exported for controls owned by 3rd-party widgets (e.g. datepicker).
export const fieldClass = base;
