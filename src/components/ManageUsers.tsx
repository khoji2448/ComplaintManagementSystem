"use client";
import { useEffect, useState } from "react";
import { User, UserRoleType, Role } from "@/types/types";
import { Plus, Check, Pencil, Trash2, Users as UsersIcon } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Skeleton from "@/components/ui/Skeleton";
import { Field, TextInput, SelectInput } from "@/components/ui/Field";
import { notify } from "@/lib/toast";

const prettyRole = (name: string) =>
  name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface NewUserForm {
  name: string;
  email: string;
  password: string;
  role: UserRoleType;
}

const emptyForm: NewUserForm = { name: "", email: "", password: "", role: "employee" };

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<NewUserForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const isEditing = editingId !== null;

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
        else setError("Failed to load users");
        setLoading(false);
      })
      .catch(() => {
        setError("Error fetching users");
        setLoading(false);
      });

    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.roles)) setRoles(data.roles);
      })
      .catch(() => {});
  }, []);

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) await updateUser(editingId!, form);
    else await addUser();
  };

  const updateUser = async (id: number, data: NewUserForm) => {
    const payload = {
      name: data.name,
      email: data.email,
      role: data.role,
      ...(data.password ? { password: data.password } : {}),
    };
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...updated } : u)));
      notify.success("User updated");
      cancelEdit();
    } else {
      const err = await res.json();
      notify.error(`Couldn’t update user: ${err.error || "unknown error"}`);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Delete this user? This can’t be undone.")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (editingId === id) cancelEdit();
      notify.success("User deleted");
    } else {
      notify.error("Couldn’t delete user");
    }
  };

  const addUser = async () => {
    if (!form.name || !form.email || !form.password) {
      notify.error("Name, email and password are required");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const added = await res.json();
      setUsers((prev) => [...prev, { ...added }]);
      setForm(emptyForm);
      notify.success("User added");
    } else {
      notify.error("Couldn’t add user");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="font-mono-num text-[10px] uppercase tracking-[0.22em] text-[var(--mute)]">Manage users</div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.02em] md:text-3xl">Users</h1>
      </div>

      {error && (
        <div className="border border-[var(--signal)] bg-[var(--signal-soft)] p-4 text-sm text-[var(--ink)]">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        {/* left: add / edit form */}
        <div className="lg:sticky lg:top-8">
          <Panel title={isEditing ? "Edit user" : "Add user"}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-3">
            <Field label="Name" htmlFor="u_name">
              <TextInput id="u_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </Field>
            <Field label="Email" htmlFor="u_email">
              <TextInput id="u_email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
            </Field>
            <Field label="Password" htmlFor="u_pass">
              <TextInput
                id="u_pass"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEditing ? "New password (optional)" : "Password"}
              />
            </Field>
            <Field label="Role" htmlFor="u_role">
              <SelectInput id="u_role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRoleType })}>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {prettyRole(role.name)}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.02]"
              style={{ transitionTimingFunction: "var(--ease)" }}
            >
              {isEditing ? <Check size={15} /> : <Plus size={15} />}
              {isEditing ? "Update user" : "Add user"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="border border-[var(--hairline)] px-4 py-2 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
              >
                Cancel
              </button>
            )}
          </div>
            </form>
          </Panel>
        </div>

        {/* right: list */}
        <Panel title="All users" action={!loading ? <span className="font-mono-num text-xs text-[var(--slate)]">{users.length}</span> : undefined}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <UsersIcon size={32} strokeWidth={1.25} className="text-[var(--mute)]" />
            <p className="mt-3 text-sm text-[var(--slate)]">No users yet.</p>
          </div>
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--hairline)] text-left">
                    {["Name", "Email", "Password", "Role", "Actions"].map((h, i) => (
                      <th key={i} className="pb-2.5 pr-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr
                      key={user.id}
                      className="animate-rise border-b border-[var(--hairline)] transition-colors duration-150 hover:bg-[var(--paper)]"
                      style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                    >
                      <td className="py-3 pr-4 text-sm font-medium">{user.name}</td>
                      <td className="py-3 pr-4 text-sm text-[var(--slate)]">{user.email}</td>
                      <td className="py-3 pr-4 font-mono-num text-xs text-[var(--slate)]">{user.password}</td>
                      <td className="py-3 pr-4 text-sm">{prettyRole(user.role)}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(user)} aria-label="Edit" className="p-1.5 text-[var(--slate)] transition-colors hover:text-[var(--ink)]">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => deleteUser(user.id)} aria-label="Delete" className="p-1.5 text-[var(--slate)] transition-colors hover:text-[var(--signal)]">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="space-y-3 md:hidden">
              {users.map((user, i) => (
                <div
                  key={user.id}
                  className="animate-rise border border-[var(--hairline)] bg-[var(--paper)] p-4"
                  style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-[var(--ink)]">{user.name}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(user)} aria-label="Edit" className="p-1.5 text-[var(--slate)] hover:text-[var(--ink)]">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => deleteUser(user.id)} aria-label="Delete" className="p-1.5 text-[var(--slate)] hover:text-[var(--signal)]">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-[var(--slate)]">{user.email}</p>
                  <p className="mt-1 font-mono-num text-xs text-[var(--slate)]">
                    <span className="text-[var(--mute)]">Password: </span>{user.password}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--mute)]">{prettyRole(user.role)}</p>
                </div>
              ))}
            </div>
          </>
        )}
        </Panel>
      </div>
    </div>
  );
}
