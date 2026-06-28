"use client";
import { useEffect, useState } from "react";
import { Role, Permission } from "@/types/types";
import { Plus, Check, Pencil, Trash2, ShieldCheck } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Skeleton from "@/components/ui/Skeleton";
import { Field, TextInput } from "@/components/ui/Field";
import { notify } from "@/lib/toast";

const prettyRole = (name: string) =>
  name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Selectable permission chip
function PermChip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-xs transition-colors duration-150 ${
        active
          ? "border-[var(--ink)] bg-[var(--ink)] text-white"
          : "border-[var(--hairline)] text-[var(--slate)] hover:border-[var(--slate)]"
      }`}
    >
      {active && <Check size={12} />}
      {label}
    </button>
  );
}

export default function ManageRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error("Failed to load roles");
      const data = await res.json();
      setRoles(data.roles ?? []);
      setCatalog(data.catalog ?? []);
    } catch (e) {
      notify.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (list: string[], key: string) =>
    list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      notify.error("Role name is required");
      return;
    }
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDescription, permissions: newPerms }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify.error(data.error ?? "Couldn’t create role");
      return;
    }
    setNewName("");
    setNewDescription("");
    setNewPerms([]);
    notify.success("Role created");
    load();
  };

  const startEdit = (role: Role) => {
    setEditingId(role.id);
    setEditPerms(role.permissions ?? []);
    setEditDescription(role.description ?? "");
  };

  const saveEdit = async (id: number) => {
    const res = await fetch(`/api/roles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: editDescription, permissions: editPerms }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify.error(data.error ?? "Couldn’t update role");
      return;
    }
    setEditingId(null);
    notify.success("Role updated");
    load();
  };

  const deleteRole = async (id: number, name: string) => {
    if (!confirm(`Delete role "${prettyRole(name)}"? This can’t be undone.`)) return;
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      notify.error(data.error ?? "Couldn’t delete role");
      return;
    }
    notify.success("Role deleted");
    load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[var(--mute)]">Manage roles</div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] md:text-3xl">Roles &amp; permissions</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        {/* left: create */}
        <div className="lg:sticky lg:top-8">
          <Panel title="Create a role">
            <form onSubmit={createRole} className="space-y-4">
              <Field label="Role name" htmlFor="r_name">
                <TextInput id="r_name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Supervisor" />
              </Field>
              <Field label="Description" htmlFor="r_desc">
                <TextInput id="r_desc" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Optional" />
              </Field>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {catalog.map((p) => (
                    <PermChip
                      key={p.key}
                      label={p.label}
                      active={newPerms.includes(p.key)}
                      onToggle={() => setNewPerms((l) => toggle(l, p.key))}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.02]"
                style={{ transitionTimingFunction: "var(--ease)" }}
              >
                <Plus size={15} /> Create role
              </button>
            </form>
          </Panel>
        </div>

        {/* right: existing roles */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : roles.length === 0 ? (
          <Panel title="Roles">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldCheck size={32} strokeWidth={1.25} className="text-[var(--mute)]" />
              <p className="mt-3 text-sm text-[var(--slate)]">No roles yet.</p>
            </div>
          </Panel>
        ) : (
          <div className="space-y-3">
            {roles.map((role) => {
            const isEditing = editingId === role.id;
            return (
              <Panel key={role.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="flex items-center gap-2 font-display text-base font-semibold text-[var(--ink)]">
                      {prettyRole(role.name)}
                      {role.is_system && (
                        <span className="border border-[var(--hairline)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--mute)]">
                          system
                        </span>
                      )}
                    </h3>
                    {!isEditing && role.description && (
                      <p className="mt-1 text-sm text-[var(--slate)]">{role.description}</p>
                    )}
                  </div>
                  {!isEditing && !role.is_system && (
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => startEdit(role)} aria-label="Edit" className="p-1.5 text-[var(--slate)] transition-colors hover:text-[var(--ink)]">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => deleteRole(role.id, role.name)} aria-label="Delete" className="p-1.5 text-[var(--slate)] transition-colors hover:text-[var(--signal)]">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-4">
                    <Field label="Description" htmlFor={`desc_${role.id}`}>
                      <TextInput id={`desc_${role.id}`} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      {catalog.map((p) => (
                        <PermChip
                          key={p.key}
                          label={p.label}
                          active={editPerms.includes(p.key)}
                          onToggle={() => setEditPerms((l) => toggle(l, p.key))}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(role.id)}
                        className="inline-flex items-center gap-1.5 bg-[var(--mint)] px-4 py-2 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.02]"
                        style={{ transitionTimingFunction: "var(--ease)" }}
                      >
                        <Check size={15} /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="border border-[var(--hairline)] px-4 py-2 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {role.permissions.length === 0 && (
                      <span className="text-sm text-[var(--mute)]">No permissions</span>
                    )}
                    {role.permissions.map((key) => {
                      const label = catalog.find((c) => c.key === key)?.label ?? key;
                      return (
                        <span key={key} className="border border-[var(--hairline)] bg-[var(--paper)] px-2 py-0.5 text-xs text-[var(--slate)]">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </Panel>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}
