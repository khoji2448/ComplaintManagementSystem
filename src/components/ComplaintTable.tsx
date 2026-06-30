"use client";
import { useCallback, useEffect, useState } from "react";
import { Complaint, User } from "@/types/types";
import { useSession } from "next-auth/react";
import ComplaintForm from "./ComplaintForm";
import { Plus, Pencil, Trash2, ClipboardCheck } from "lucide-react";
import Panel from "@/components/ui/Panel";
import StatusPill from "@/components/ui/StatusPill";
import Skeleton from "@/components/ui/Skeleton";
import { Field, SelectInput } from "@/components/ui/Field";
import { notify } from "@/lib/toast";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

export default function ComplaintTable() {
  const { data: session } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredcomplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ user_id: "" });

  const isAdmin = session?.user?.role === "admin";

  const fetchComplaints = async () => {
    try {
      // Only open complaints are shown here — filter server-side instead of
      // downloading every complaint and discarding the rest in the browser.
      const response = await fetch(`/api/complaints?status=In-Progress`);
      const data = await response.json();
      setComplaints(data);
      setFilteredComplaints(data);
    } catch (error) {
      notify.error("Couldn’t load complaints: " + error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users`);
      if (!response.ok) throw new Error(`Error fetching users: ${response.statusText}`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      notify.error("Couldn’t load users: " + error);
    } finally {
      setLoading(false);
    }
  };

  // Depend on the primitive user id, not the whole session object. next-auth
  // hands back a new session reference on mount, window-focus refetch, and
  // provider re-renders; keying off `session` re-fired both fetches each time
  // (the double-hit on /api/complaints and /api/users). The id only changes on
  // login/logout, so this runs exactly once per session.
  const userId = session?.user?.id;
  useEffect(() => {
    if (userId) {
      fetchComplaints();
      fetchUsers();
    }

    const handleNewComplaint = () => {
      fetchComplaints();
      fetchUsers();
    };

    window.addEventListener("newComplaint", handleNewComplaint);
    return () => window.removeEventListener("newComplaint", handleNewComplaint);
  }, [userId]);

  const handleDelete = async (id: number) => {
    if (window.confirm("Delete this complaint? This can’t be undone.")) {
      try {
        const response = await fetch(`/api/complaints/${id}`, { method: "DELETE" });
        if (response.ok) {
          notify.success("Complaint deleted");
          fetchComplaints();
        }
      } catch (error) {
        notify.error("Couldn’t delete complaint: " + error);
      }
    }
  };

  const handleEditClick = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setShowModal(true);
  };

  const handleAddClick = () => {
    setEditingComplaint(null);
    setShowModal(true);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = useCallback(() => {
    // Status is already filtered server-side; only the admin user filter remains.
    let filtered = complaints;
    if (filters.user_id) {
      filtered = filtered.filter((report) => report.user_id === parseInt(filters.user_id));
    }
    setFilteredComplaints(filtered);
  }, [filters, complaints]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[var(--mute)]">
            Complaint entry
          </div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em] md:text-3xl">
            Open complaints
          </h1>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center gap-1.5 bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.02]"
          style={{ transitionTimingFunction: "var(--ease)" }}
        >
          <Plus size={16} /> New complaint
        </button>
      </div>

      <ComplaintForm
        editingComplaint={editingComplaint}
        setEditingComplaint={setEditingComplaint}
        showModal={showModal}
        setShowModal={setShowModal}
        refreshComplaints={fetchComplaints}
      />

      <Panel title="Your complaints">
        {isAdmin && (
          <div className="mb-5 max-w-xs">
            <Field label="Submitted by" htmlFor="user_id">
              <SelectInput id="user_id" name="user_id" value={filters.user_id} onChange={handleFilterChange}>
                <option value="">All users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredcomplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardCheck size={40} strokeWidth={1.25} className="text-[var(--mute)]" />
            <p className="mt-4 font-display text-lg font-semibold">All clear.</p>
            <p className="mt-1 text-sm text-[var(--slate)]">No open complaints right now.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--hairline)] text-left">
                    {[
                      "Date",
                      ...(isAdmin ? ["Submitted by"] : []),
                      "Building",
                      "Floor",
                      "Area",
                      "Type",
                      "Details",
                      "Status",
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="pb-2.5 pr-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredcomplaints.map((complaint, i) => (
                    <tr
                      key={complaint.id}
                      className="animate-rise border-b border-[var(--hairline)] align-top transition-colors duration-150 hover:bg-[var(--paper)]"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <td className="py-3 pr-4 font-mono-num text-xs whitespace-nowrap text-[var(--slate)]">
                        {fmtDate(complaint.date)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 pr-4 text-sm">
                          {complaint.user_name}
                        </td>
                      )}
                      <td className="py-3 pr-4 text-sm">{complaint.building}</td>
                      <td className="py-3 pr-4 text-sm">{complaint.floor}</td>
                      <td className="py-3 pr-4 text-sm">{complaint.area_name}</td>
                      <td className="py-3 pr-4 text-sm">{complaint.complaint_type_name}</td>
                      <td className="max-w-[240px] py-3 pr-4 text-sm text-[var(--slate)]">{complaint.details}</td>
                      <td className="py-3 pr-4">
                        <StatusPill status={complaint.status} />
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditClick(complaint)}
                            aria-label="Edit"
                            className="p-1.5 text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
                          >
                            <Pencil size={16} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(complaint.id)}
                              aria-label="Delete"
                              className="p-1.5 text-[var(--slate)] transition-colors hover:text-[var(--signal)]"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filteredcomplaints.map((complaint, i) => (
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
                  </div>
                  {isAdmin && (
                    <div className="mt-3 text-sm">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">Submitted by</p>
                      <p>{complaint.user_name}</p>
                    </div>
                  )}
                  <div className="mt-3 text-sm">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">Details</p>
                    <p className="text-[var(--slate)]">{complaint.details}</p>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => handleEditClick(complaint)}
                      className="inline-flex items-center gap-1.5 border border-[var(--hairline)] px-3 py-1.5 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(complaint.id)}
                        className="inline-flex items-center gap-1.5 border border-[var(--hairline)] px-3 py-1.5 text-sm text-[var(--slate)] transition-colors hover:text-[var(--signal)]"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
