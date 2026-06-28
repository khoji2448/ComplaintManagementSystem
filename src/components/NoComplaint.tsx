"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Building } from "@/utils/constants";
import Link from "next/link";
import { CheckCircle2, ArrowUpRight } from "lucide-react";
import Panel from "@/components/ui/Panel";
import { Field, SelectInput } from "@/components/ui/Field";
import { notify } from "@/lib/toast";

export default function NoComplaintForm() {
  const { data: session } = useSession();
  const [building, setBuilding] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id) {
      notify.error("Please log in to submit");
      return;
    }
    if (!building) {
      notify.error("Pick a building first");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/no-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session.user.id,
          building,
          date: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to submit");

      setBuilding("");
      notify.success("Marked: no complaints to report");
    } catch (err) {
      notify.error("Something went wrong while submitting");
      console.error("Error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[var(--mute)]">Daily report</div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em] md:text-3xl">All clear?</h1>
        </div>
        <Link
          href="/complaintentry"
          className="group inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
        >
          Log a complaint
          <ArrowUpRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ transitionTimingFunction: "var(--ease)" }} />
        </Link>
      </div>

      <Panel>
        <p className="mb-5 text-sm leading-[1.6] text-[var(--slate)]">
          Nothing to report today? Mark the building clear and you’re done.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Building" htmlFor="building">
            <SelectInput
              id="building"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select building</option>
              {Building.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </SelectInput>
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 bg-[var(--mint)] px-4 py-2.5 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
            style={{ transitionTimingFunction: "var(--ease)" }}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Submitting…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> No complaints to report
              </>
            )}
          </button>
        </form>
      </Panel>
    </div>
  );
}
