"use client";
import { useCallback, useEffect, useState } from "react";
import { Complaint, User } from "@/types/types";
import { useSession } from "next-auth/react";
import ComplaintForm from "./ComplaintForm";
import { Plus } from 'lucide-react';

export default function ComplaintTable() {
  const { data: session } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredcomplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    user_id: ''
  });

  const fetchComplaints = async () => {
    try {
      const response = await fetch(`/api/complaints`);
      const data = await response.json();
      setComplaints(data);
      setFilteredComplaints(data);
    } catch (error) {
      alert('Error fetching complaints' + error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users`);
      if (!response.ok) {
        throw new Error(`Error fetching users: ${response.statusText}`);
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      alert('Error fetching types: ' + error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchComplaints();
      fetchUsers();
    }

    const handleNewComplaint = () => {
      fetchComplaints();
      fetchUsers();
    };

    window.addEventListener('newComplaint', handleNewComplaint);
    return () => {
      window.removeEventListener('newComplaint', handleNewComplaint);
    };
  }, [session]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      try {
        const response = await fetch(`/api/complaints/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchComplaints();
        }
      } catch (error) {
        alert('Error deleting complaint' + error);
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
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = useCallback(() => {
    let filtered = complaints;

    if (filters.user_id) {
      filtered = filtered.filter(report => report.user_id === parseInt(filters.user_id));
    }
    setFilteredComplaints(filtered);
  }, [filters, complaints]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  if (loading) {
    return <div className="text-black">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">Complaints</h2>
        <div className="flex gap-2">
          <button
            onClick={handleAddClick}
            className="flex items-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            <Plus size={16} className="mr-1" />
            Add New Complaint
          </button>
        </div>
      </div>

      <ComplaintForm
        editingComplaint={editingComplaint}
        setEditingComplaint={setEditingComplaint}
        showModal={showModal}
        setShowModal={setShowModal}
        refreshComplaints={fetchComplaints}
      />

      <div className="bg-white p-4 shadow rounded overflow-x-auto">
        <h3 className="text-lg text-black font-bold mb-2">Your Complaints</h3>
        {session?.user?.role === "admin" && (
          <div className="flex flex-col gap-1">
            <label className="block text-black text-sm md:text-base">Submitted By:</label>
            <select name="user_id" value={filters.user_id} onChange={handleFilterChange} className="border p-2 md:p-2.5 text-black w-full">
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="min-w-full">
          {/* Desktop View */}
          <table className="w-full border hidden md:table">
            <thead>
              <tr className="bg-gray-200">
                <th className="border text-black p-2">Date</th>
                {session?.user?.role === "admin" && (
                  <th className="border text-black p-2">Submitted By</th>
                )}
                <th className="border text-black p-2">Building</th>
                <th className="border text-black p-2">Floor</th>
                <th className="border text-black p-2">Area</th>
                <th className="border text-black p-2">Type</th>
                <th className="border text-black p-2">Details</th>
                <th className="border text-black p-2">Status</th>
                <th className="border text-black p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredcomplaints.map((complaint) => (
                <tr key={complaint.id} className="border">
                  <td className="border text-black p-2">{new Date(complaint.date).toDateString()}</td>
                  {session?.user?.role === "admin" && (
                    <td className="border text-black p-2">{users.find(user => user.id === complaint.user_id)?.name}</td>
                  )}
                  <td className="border text-black p-2">{complaint.building}</td>
                  <td className="border text-black p-2">{complaint.floor}</td>
                  <td className="border text-black p-2">{complaint.area_name}</td>
                  <td className="border text-black p-2">{complaint.complaint_type_name}</td>
                  <td className="border text-black p-2">{complaint.details}</td>
                  <td className={`border text-black p-2 ${complaint.status === "Resolved" ? "bg-green-200" : complaint.status === "In-Progress" ? "bg-red-200" : complaint.status === "No Complaint" ? "bg-blue-200" : ""}`}>{complaint.status}</td>
                  <td className="border text-black p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(complaint)}
                        className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                      >
                        Edit
                      </button>
                      {session?.user.role === "admin" && (
                        <button
                          onClick={() => handleDelete(complaint.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {filteredcomplaints.map((complaint) => (
              <div key={complaint.id} className="border text-black rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-sm text-black">Date</p>
                    <p>{new Date(complaint.date).toDateString()}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-black">Building</p>
                    <p>{complaint.building}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-black">Floor</p>
                    <p>{complaint.floor}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-black">Area</p>
                    <p>{complaint.area_name}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-black">Type</p>
                    <p>{complaint.complaint_type_name}</p>
                  </div>
                </div>

                {session?.user?.role === "admin" && (
                  <div className="mb-3">
                    <p className="font-semibold text-sm text-black">Submitted By</p>
                    <p>{complaint.user_name}</p>
                  </div>
                )}

                <div className="mb-3">
                  <p className="font-semibold text-sm text-black">Details</p>
                  <p>{complaint.details}</p>
                </div>

                <div className="mb-3">
                  <p className="font-semibold text-sm text-black">Status</p>
                  <p>{complaint.status}</p>
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  <button
                    onClick={() => handleEditClick(complaint)}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm"
                  >
                    Edit
                  </button>
                  {/* Only visible to admins */}
                  {session?.user?.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(complaint.id)}
                      className="bg-red-500 text-white px-3 py-1.5 rounded text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}