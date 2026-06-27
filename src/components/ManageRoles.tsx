"use client";
import { useEffect, useState } from "react";
import { Role, Permission } from "@/types/types";

const prettyRole = (name: string) =>
  name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ManageRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Create form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>([]);

  // Edit state
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
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

  const toggle = (list: string[], key: string) =>
    list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newName.trim()) {
      setError("Role name is required");
      return;
    }
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDescription, permissions: newPerms }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create role");
      return;
    }
    setNewName("");
    setNewDescription("");
    setNewPerms([]);
    flash("Role created");
    load();
  };

  const startEdit = (role: Role) => {
    setEditingId(role.id);
    setEditPerms(role.permissions ?? []);
    setEditDescription(role.description ?? "");
  };

  const saveEdit = async (id: number) => {
    setError("");
    const res = await fetch(`/api/roles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: editDescription, permissions: editPerms }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update role");
      return;
    }
    setEditingId(null);
    flash("Role updated");
    load();
  };

  const deleteRole = async (id: number, name: string) => {
    if (!confirm(`Delete role "${prettyRole(name)}"? This cannot be undone.`)) return;
    setError("");
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to delete role");
      return;
    }
    flash("Role deleted");
    load();
  };

  if (loading) return <p className="text-gray-600">Loading roles...</p>;

  return (
    <div className="max-w-4xl mx-auto text-black">
      <h1 className="text-2xl font-bold mb-4">Manage Roles &amp; Permissions</h1>

      {error && <div className="mb-3 rounded bg-red-100 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {notice && <div className="mb-3 rounded bg-green-100 text-green-700 px-3 py-2 text-sm">{notice}</div>}

      {/* Create role */}
      <form onSubmit={createRole} className="mb-8 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-lg mb-3">Create a new role</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input
            className="border border-gray-300 rounded-md p-2"
            placeholder="Role name (e.g. Supervisor)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="border border-gray-300 rounded-md p-2"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </div>
        <p className="text-sm text-gray-600 mb-2">Permissions</p>
        <div className="grid sm:grid-cols-2 gap-2 mb-4">
          {catalog.map((p) => (
            <label key={p.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newPerms.includes(p.key)}
                onChange={() => setNewPerms((l) => toggle(l, p.key))}
              />
              {p.label}
            </label>
          ))}
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Create Role
        </button>
      </form>

      {/* Existing roles */}
      <div className="space-y-4">
        {roles.map((role) => {
          const isEditing = editingId === role.id;
          return (
            <div key={role.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {prettyRole(role.name)}
                    {role.is_system && (
                      <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">system</span>
                    )}
                  </h3>
                  {!isEditing && <p className="text-sm text-gray-600">{role.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!isEditing && !role.is_system && (
                    <button
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      onClick={() => startEdit(role)}
                    >
                      Edit
                    </button>
                  )}
                  {!isEditing && !role.is_system && (
                    <button
                      className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      onClick={() => deleteRole(role.id, role.name)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="mt-3">
                  <input
                    className="border border-gray-300 rounded-md p-2 w-full mb-3"
                    placeholder="Description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <div className="grid sm:grid-cols-2 gap-2 mb-3">
                    {catalog.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editPerms.includes(p.key)}
                          onChange={() => setEditPerms((l) => toggle(l, p.key))}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      onClick={() => saveEdit(role.id)}
                    >
                      Save
                    </button>
                    <button
                      className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1">
                  {role.permissions.length === 0 && (
                    <span className="text-sm text-gray-400">No permissions</span>
                  )}
                  {role.permissions.map((key) => {
                    const label = catalog.find((c) => c.key === key)?.label ?? key;
                    return (
                      <span key={key} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded">
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
