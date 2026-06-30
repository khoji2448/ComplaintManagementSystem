"use client";
import { useEffect, useState } from "react";
import { Complaint } from "@/types/types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSession } from "next-auth/react";
import { CircleCheck, Eye, EyeOff, Download, Inbox } from "lucide-react";
import Panel from "@/components/ui/Panel";
import StatusPill from "@/components/ui/StatusPill";
import Skeleton from "@/components/ui/Skeleton";
import Modal from "@/components/ui/Modal";
import { Field, TextInput, fieldClass } from "@/components/ui/Field";
import { notify } from "@/lib/toast";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

export default function ComplaintActionTable() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [complaintToResolve, setComplaintToResolve] = useState<number | null>(null);
  const [actionTaken, setActionTaken] = useState<string>("");

  const { data: session } = useSession();

  useEffect(() => {
    fetch("/api/complaintaction")
      .then((res) => res.json())
      .then((data) => setComplaints(data))
      .catch((err) => notify.error("Couldn’t load complaints: " + err))
      .finally(() => setLoading(false));
  }, []);

  const closeResolve = () => {
    setComplaintToResolve(null);
    setSelectedDate(null);
    setActionTaken("");
  };

  const markAsResolved = async (id: number) => {
    if (!selectedDate || !actionTaken) return;
    try {
      const response = await fetch(`/api/complaints/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ resolution_date: selectedDate.toISOString(), action: actionTaken }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to mark complaint as resolved");

      // The queue only shows open complaints, so drop the resolved one locally.
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      notify.success("Complaint resolved");
      closeResolve();
    } catch (error) {
      notify.error("Couldn’t resolve complaint: " + error);
    }
  };

  const markAsSeen = async (id: number) => {
    try {
      const response = await fetch(`/api/complaint-seen/`, {
        method: "POST",
        body: JSON.stringify({
          seen_by: session?.user?.id,
          seen_date: new Date().toISOString(),
          complaint_id: id,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to mark complaint as seen");

      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, seen: true } : c)));
      notify.success("Marked as seen");
    } catch (error) {
      notify.error("Couldn’t mark as seen: " + error);
    }
  };

  // The API already returns exactly this role's open complaints (status +
  // type filtering happens in SQL), so no further client-side filtering needed.
  const visibleComplaints: Complaint[] = complaints;

  const exportToPDF = async () => {
    try {
      const jspdfModule = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default as any;
      const doc = new jspdfModule.jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      const head = [["Date", "Building", "Floor", "Area", "Type", "Details", "Status"]];
      const body = visibleComplaints.map((c) => [
        new Date(c.date).toDateString(),
        c.building,
        c.floor,
        c.area_name,
        c.complaint_type_name,
        c.details,
        c.status,
      ]);

      autoTable(doc, {
        head,
        body,
        styles: { fontSize: 10, cellPadding: 4, overflow: "linebreak" },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
        columnStyles: { 5: { cellWidth: 150 } },
        margin: 20,
      });

      doc.save(`complaints_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      notify.error("Couldn’t generate the PDF.");
    }
  };

  const resolvingComplaint = visibleComplaints.find((c) => c.id === complaintToResolve);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[var(--mute)]">
            Complaints actions
          </div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em] md:text-3xl">Action queue</h1>
        </div>
        <button
          onClick={exportToPDF}
          disabled={visibleComplaints.length === 0}
          className="inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)] disabled:opacity-40"
        >
          <Download size={15} /> Export PDF
        </button>
      </div>

      <Panel title="In progress">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : visibleComplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={40} strokeWidth={1.25} className="text-[var(--mute)]" />
            <p className="mt-4 font-display text-lg font-semibold">Queue’s empty.</p>
            <p className="mt-1 text-sm text-[var(--slate)]">Nothing waiting on you right now.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[880px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--hairline)] text-left">
                    {["Date", "Building", "Floor", "Area", "Type", "Details", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="pb-2.5 pr-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleComplaints.map((complaint, i) => (
                    <tr
                      key={complaint.id}
                      className="animate-rise border-b border-[var(--hairline)] align-top transition-colors duration-150 hover:bg-[var(--paper)]"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="py-3 pr-4 font-mono-num text-xs whitespace-nowrap text-[var(--slate)]">
                        {fmtDate(complaint.date)}
                      </td>
                      <td className="py-3 pr-4 text-sm">{complaint.building}</td>
                      <td className="py-3 pr-4 text-sm">{complaint.floor}</td>
                      <td className="py-3 pr-4 text-sm">{complaint.area_name}</td>
                      <td className="py-3 pr-4 text-sm">{complaint.complaint_type_name}</td>
                      <td className="max-w-[240px] py-3 pr-4 text-sm text-[var(--slate)]">{complaint.details}</td>
                      <td className="py-3 pr-4">
                        <StatusPill status={complaint.status} />
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          {complaint.seen ? (
                            <span
                              className="inline-flex items-center justify-center p-1.5 text-[var(--mint)]"
                              title="Seen"
                            >
                              <Eye size={16} />
                            </span>
                          ) : (
                            <button
                              onClick={() => markAsSeen(complaint.id)}
                              title="Mark as seen"
                              aria-label="Mark as seen"
                              className="p-1.5 text-[var(--signal)] transition-colors hover:text-[var(--ink)]"
                            >
                              <EyeOff size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => setComplaintToResolve(complaint.id)}
                            title="Resolve"
                            aria-label="Resolve"
                            className="inline-flex items-center gap-1 border border-[var(--hairline)] px-2 py-1 text-xs text-[var(--slate)] transition-colors hover:border-[var(--mint)] hover:text-[var(--mint)]"
                          >
                            <CircleCheck size={14} /> Resolve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {visibleComplaints.map((complaint, i) => (
                <div
                  key={complaint.id}
                  className="animate-rise border border-[var(--hairline)] bg-[var(--paper)] p-4"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono-num text-xs text-[var(--slate)]">{fmtDate(complaint.date)}</span>
                    <StatusPill status={complaint.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">Building</p>
                      <p>{complaint.building}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">Floor</p>
                      <p>{complaint.floor}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">Area</p>
                      <p>{complaint.area_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">Type</p>
                      <p>{complaint.complaint_type_name}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">Details</p>
                      <p className="break-words text-[var(--slate)]">{complaint.details}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {complaint.seen ? (
                      <span className="inline-flex items-center gap-1.5 border border-[var(--hairline)] px-3 py-1.5 text-sm text-[var(--mint)]">
                        <Eye size={14} /> Seen
                      </span>
                    ) : (
                      <button
                        onClick={() => markAsSeen(complaint.id)}
                        className="inline-flex items-center gap-1.5 border border-[var(--hairline)] px-3 py-1.5 text-sm text-[var(--signal)]"
                      >
                        <EyeOff size={14} /> Mark seen
                      </button>
                    )}
                    <button
                      onClick={() => setComplaintToResolve(complaint.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-white"
                    >
                      <CircleCheck size={14} /> Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>

      {/* Resolve modal */}
      <Modal open={complaintToResolve !== null} onClose={closeResolve} title="Resolve complaint">
        {resolvingComplaint && (
          <p className="mb-4 text-sm text-[var(--slate)]">
            {resolvingComplaint.complaint_type_name} · {resolvingComplaint.building} · {resolvingComplaint.area_name}
          </p>
        )}
        <div className="space-y-4">
          <Field label="Resolution date" htmlFor="resolution_date">
            <DatePicker
              id="resolution_date"
              selected={selectedDate}
              onChange={(date: Date | null) => setSelectedDate(date)}
              dateFormat="dd-MM-yyyy"
              className={fieldClass}
              placeholderText="Select date"
              wrapperClassName="w-full"
            />
          </Field>
          <Field label="Action taken" htmlFor="action">
            <TextInput
              id="action"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="What was done to resolve it?"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeResolve}
              className="border border-[var(--hairline)] px-4 py-2 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => complaintToResolve !== null && markAsResolved(complaintToResolve)}
              disabled={!selectedDate || !actionTaken}
              className="inline-flex items-center gap-1.5 bg-[var(--mint)] px-4 py-2 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              style={{ transitionTimingFunction: "var(--ease)" }}
            >
              <CircleCheck size={15} /> Confirm resolution
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
