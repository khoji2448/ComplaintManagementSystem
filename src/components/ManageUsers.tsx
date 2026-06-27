"use client";
import { useEffect, useState } from "react";
import { User, UserRoleType, Role } from "@/types/types";

const prettyRole = (name: string) =>
  name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface NewUserForm {
  name: string;
  email: string;
  password: string;
  role: UserRoleType;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState<NewUserForm>({
    name: "",
    email: "",
    password: "",
    role: "employee"
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          setError("Failed to load users");
        }
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

  const handleEditClick = (user: User) => {
    setIsEditing(true);
    setEditingId(user.id);
    // Set the user data in the add user form
    setNewUser({
      name: user.name,
      email: user.email,
      password: "", 
      role: user.role
    });
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    // Reset the form
    setNewUser({
      name: "",
      email: "",
      password: "",
      role: "employee"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      await updateUser(editingId!, newUser);
    } else {
      await addUser();
    }
  };

  const updateUser = async (id: number, updatedData: NewUserForm) => {
    // Only include fields that are present
    const dataToUpdate = {
      name: updatedData.name,
      email: updatedData.email,
      role: updatedData.role,
      ...(updatedData.password ? { password: updatedData.password } : {})
    };

    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToUpdate),
    });

    if (res.ok) {
      const updatedUser = await res.json();
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...updatedUser } : user))
      );
      handleCancelEdit(); 
    } else {
      const errorData = await res.json();
      alert(`Failed to update user: ${errorData.error || 'Unknown error'}`);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
  
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  
    if (res.ok) {
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } else {
      alert("Failed to delete user");
    }
  };
  
  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("Name, email and password are required");
      return;
    }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });

    if (res.ok) {
      const addedUser = await res.json();
      setUsers((prev) => [...prev, { ...addedUser, }]);
      setNewUser({ name: "", email: "", password: "", role: "employee" });
    } else {
      alert("Failed to add user");
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white shadow-md rounded-md">
      {loading ? (
        <div className="text-center py-4">Loading users...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-4">{error}</div>
      ) : (
        <>
          <h2 className="text-xl text-black font-semibold mb-4">
            {isEditing ? 'Edit User' : 'Add New User'}
          </h2>

          {/* Add/Edit User Form */}
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              <input
                type="text"
                placeholder="Name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="border text-black border-gray-300 rounded-md p-2"
              />
              <input
                type="text"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="border text-black border-gray-300 rounded-md p-2"
              />
              <input
                type="text"
                placeholder={isEditing ? "New Password (optional)" : "Password"}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="border text-black border-gray-300 rounded-md p-2"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRoleType })}
                className="border text-black border-gray-300 rounded-md p-2"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {prettyRole(role.name)}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  {isEditing ? 'Update User' : 'Add User'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border text-black border-gray-300 px-4 py-2">Name</th>
                  <th className="border text-black border-gray-300 px-4 py-2">Username</th>
                  <th className="border text-black border-gray-300 px-4 py-2">Password</th>
                  <th className="border text-black border-gray-300 px-4 py-2">Role</th>
                  <th className="border text-black border-gray-300 px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="text-center">
                    <td className="border text-black border-gray-300 px-4 py-2">
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          value={editingUser.name}
                          onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                          className="w-full border rounded px-2 py-1"
                        />
                      ) : (
                        user.name
                      )}
                    </td>
                    <td className="border text-black border-gray-300 px-4 py-2">
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="w-full border rounded px-2 py-1"
                        />
                      ) : (
                        user.email
                      )}
                    </td>
                    <td className="border text-black border-gray-300 px-4 py-2">
                      {editingUser?.id === user.id ? (
                        <input
                          type="password"
                          value={editingUser.password}
                          onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                          className="w-full border rounded px-2 py-1"
                        />
                      ) : (
                        user.password
                      )}
                    </td>
                    <td className="border text-black border-gray-300 px-4 py-2">
                      {editingUser?.id === user.id ? (
                        <select
                          className="border text-black border-gray-300 rounded-md p-1 w-auto"
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRoleType })}
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.name}>
                              {prettyRole(role.name)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        // Convert role to capitalized text
                        user.role.charAt(0).toUpperCase() + user.role.slice(1)
                      )}
                    </td>
                    <td className="border text-black border-gray-300 px-4 py-2">
                      <div className="flex gap-2 justify-center">
                        {editingUser?.id === user.id ? (
                          <>
                            <button
                              className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                              onClick={() => updateUser(user.id, {
                                name: editingUser.name,
                                email: editingUser.email,
                                password: editingUser.password || "", // Provide empty string as fallback
                                role: editingUser.role
                              })}
                            >
                              Save
                            </button>
                            <button
                              className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                              onClick={() => handleEditClick(user)}
                            >
                              Edit
                            </button>
                            <button
                              className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                              onClick={() => deleteUser(user.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view for mobile */}
          <div className="md:hidden space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border text-black border-gray-300 rounded-lg p-4 space-y-3">
                {editingUser?.id === user.id ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <input
                        type="text"
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="w-full border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Username</label>
                      <input
                        type="text"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Password</label>
                      <input
                        type="text"
                        value={editingUser.password || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                        className="w-full border rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Role</label>
                      <select
                        className="w-full border rounded px-2 py-1"
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRoleType })}
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.name}>
                            {prettyRole(role.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 flex-1"
                        onClick={() => updateUser(user.id, {
                          name: editingUser.name,
                          email: editingUser.email,
                          password: editingUser.password || "", // Provide empty string as fallback
                          role: editingUser.role
                        })}
                      >
                        Save
                      </button>
                      <button
                        className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 flex-1"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-black">{user.name}</h3>
                      <div className="flex gap-2">
                        <button
                          className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                          onClick={() => handleEditClick(user)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                          onClick={() => deleteUser(user.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-black">Username: {user.email}</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-black">Role:</span>
                      <select
                        className="border text-black border-gray-300 rounded-md p-1 flex-grow"
                        value={user.role}
                        onChange={(e) => updateUser(user.id, {
                          name: user.name,
                          email: user.email,
                          password: "", // Add an empty password to trigger update
                          role: e.target.value as UserRoleType
                        })}
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.name}>
                            {prettyRole(role.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
