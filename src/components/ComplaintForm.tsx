"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Area, Complaint, ComplaintType } from "@/types/types";
import { Building, Floor } from "@/utils/constants";
import { X } from 'lucide-react';

function getTodayDate() {
  return new Date();
}

interface ComplaintFormProps {
  editingComplaint?: Complaint | null;
  setEditingComplaint?: (complaint: Complaint | null) => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  refreshComplaints: () => void;
}

export default function ComplaintForm({ 
  editingComplaint, 
  setEditingComplaint, 
  showModal, 
  setShowModal,
  refreshComplaints 
}: ComplaintFormProps) {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState<Date>(getTodayDate());
  const [areas, setAreas] = useState<Area[]>([]);
  const [complaintTypes, setComplaintTypes] = useState<ComplaintType[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isNoComplaint, setIsNoComplaint] = useState(false);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin';

  const [formData, setFormData] = useState({
    date: getTodayDate().toLocaleDateString('en-CA'),
    user_id: "",
    building: "",
    floor: "",
    area_id: "",
    complaint_type_id: "",
    details: "",
    status: "Pending"
  });

  // Set user_id when session is available
  useEffect(() => {
    if (session?.user?.id) {
      setFormData(prev => ({
        ...prev,
        user_id: String(session.user.id)
      }));
    }
  }, [session]);

  // Reset date to current date for non-admin users
  useEffect(() => {
    if (!isAdmin) {
      setSelectedDate(getTodayDate());
      setFormData(prev => ({
        ...prev,
        date: getTodayDate().toLocaleDateString('en-CA')
      }));
    }
  }, [isAdmin]);

  // Fetch areas and complaint types
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch areas
        const areasResponse = await fetch("/api/areas");
        const areasData = await areasResponse.json();
        setAreas(areasData);
  
        // Fetch complaint types
        const typesResponse = await fetch("/api/complaint-types");
        const typesData = await typesResponse.json();
        setComplaintTypes(typesData);
      } catch (error) {
        alert('Error fetching data: ' + error);
      }
    };
    fetchData();
    const storedDetails = JSON.parse(localStorage.getItem("complaintDetails") || "[]");
    setSuggestions(storedDetails);
  }, []);

  // Handle editing complaint
  useEffect(() => {
    if (editingComplaint) {
      const date = new Date(editingComplaint.date);
      setSelectedDate(date);
      
      // Find the area and complaint type objects
      // const selectedArea = areas.find(area => area.id === editingComplaint.area_id);
      // const selectedType = complaintTypes.find(type => type.id === editingComplaint.complaint_type_id);

      // Check if this is a "No Complaint" entry
      const noComplaint = editingComplaint.status === "No Complaint";
      setIsNoComplaint(noComplaint);

      setFormData({
        date: date.toLocaleDateString('en-CA'),
        user_id: editingComplaint.user_id?.toString() || "",
        building: editingComplaint.building || "",
        floor: editingComplaint.floor || "",
        area_id: editingComplaint.area_id?.toString() || "",
        complaint_type_id: editingComplaint.complaint_type_id?.toString() || "",
        details: editingComplaint.details || "",
        status: editingComplaint.status || "Pending"
      });
    }
  }, [editingComplaint, areas, complaintTypes]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
  
    if (name === 'area') {
      const selectedArea = areas.find(area => area.area_name === value);
      setFormData(prev => ({ ...prev, area_id: selectedArea?.id.toString() || '' }));
    } else if (name === 'complaintType') {
      const selectedType = complaintTypes.find(type => type.type_name === value);
      setFormData(prev => ({ ...prev, complaint_type_id: selectedType?.id.toString() || '' }));
    } else if (name === 'floor') {
      setFormData(prev => ({ ...prev, floor: value }));
    } else if (name === 'details') {
      if (value.length > 0) {
        const filteredSuggestions = suggestions.filter((item) =>
          item.toLowerCase().includes(value.toLowerCase())
        );
        setSuggestions(filteredSuggestions);
        setShowDropdown(filteredSuggestions.length > 0);
      } else {
        setShowDropdown(false);
      }
      setFormData(prev => ({ ...prev, details: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectSuggestion = (value: string) => {
    setFormData((prev) => ({ ...prev, details: value }));
    setShowDropdown(false);
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setFormData(prev => ({ ...prev, date: formattedDate }));
      setSelectedDate(date);
    } else {
      setFormData(prev => ({ ...prev, date: '' }));
    }
  };

  const handleNoComplaintToggle = () => {
    const newNoComplaintState = !isNoComplaint;
    setIsNoComplaint(newNoComplaintState);
    
    if (newNoComplaintState) {
      setFormData(prev => ({
        ...prev,
        status: "No Complaint",
        details: "No complaints to report for this area"
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        status: "Pending",
        details: ""
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      date: getTodayDate().toLocaleDateString('en-CA'),
      user_id: session?.user?.id ? String(session.user.id) : "",
      building: "",
      floor: "",
      area_id: "",
      complaint_type_id: "",
      details: "",
      status: "Pending"
    });
    setSelectedDate(getTodayDate());
    setShowDropdown(false);
    setIsNoComplaint(false);
    
    if (setEditingComplaint && editingComplaint) {
      setEditingComplaint(null);
    }
  };

  const handleCancel = () => {
    resetForm();
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!session?.user?.id) {
      alert("Please login to submit a complaint");
      setLoading(false);
      return;
    }

    // For "No Complaint", we need to ensure we have at least building
    if (isNoComplaint) {
      if (!formData.building) {
        alert("Please select building for 'No Complaint' report");
        setLoading(false);
        return;
      }
      const url = editingComplaint 
      ? `/api/no-complaint/${editingComplaint.id}`
      : "/api/no-complaint";
    
    const method = editingComplaint ? "PUT" : "POST";
      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: session.user.id,
            building: formData.building,
            date: formData.date
          }),
        });

        const result = await response.json();
    
      if (response.ok) {
        alert(editingComplaint ? "Complaint Updated!" : "Complaint Submitted!");
        
        // Save details to localStorage for suggestions (only for actual complaints)
        if (formData.details && !suggestions.includes(formData.details) && !isNoComplaint) {
          const updatedSuggestions = [...suggestions, formData.details];
          setSuggestions(updatedSuggestions);
          localStorage.setItem("complaintDetails", JSON.stringify(updatedSuggestions));
        }
        
        resetForm();
        setShowModal(false);
        refreshComplaints();
      } else {
        alert(`Error ${editingComplaint ? 'updating' : 'submitting'} complaint: ${result.error}`);
      }
      } catch (err) {
        alert("An error occurred while submitting");
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }

    if(!isNoComplaint){
    const url = editingComplaint 
      ? `/api/complaints/${editingComplaint.id}`
      : "/api/complaints";
    
    const method = editingComplaint ? "PUT" : "POST";
  
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
        }),
      });
    
      const result = await response.json();
    
      if (response.ok) {
        alert(editingComplaint ? "Complaint Updated!" : "Complaint Submitted!");
        
        // Save details to localStorage for suggestions (only for actual complaints)
        if (formData.details && !suggestions.includes(formData.details) && !isNoComplaint) {
          const updatedSuggestions = [...suggestions, formData.details];
          setSuggestions(updatedSuggestions);
          localStorage.setItem("complaintDetails", JSON.stringify(updatedSuggestions));
        }
        
        resetForm();
        setShowModal(false);
        refreshComplaints();
      } else {
        alert(`Error ${editingComplaint ? 'updating' : 'submitting'} complaint: ${result.error}`);
      }
    } catch (error) {
      alert(`Error ${editingComplaint ? 'updating' : 'submitting'} complaint: ${error}`);
    } finally {
      setLoading(false);
    }
  }
};

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-black">
            {editingComplaint ? 'Edit Complaint' : 'Submit Complaint'}
          </h3>
          <button 
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {/* No Complaint Toggle */}
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="noComplaint"
              checked={isNoComplaint}
              onChange={handleNoComplaintToggle}
              className="mr-2 h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="noComplaint" className="text-black font-medium">
              No Complaint to Report
            </label>
          </div>

          {/*Date Selection*/}
          <div className="mb-4">
            <label className="text-black block mb-1">Date:</label>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              dateFormat="dd-MM-yyyy"
              className="border p-2 rounded text-black w-full"
              placeholderText="Select date"
              disabled={!isAdmin}
            />
          </div>

          {/* Building Selection */}
          <div className="mb-4">
            <label className="text-black block mb-1">Building:</label>
            <select 
              name="building" 
              onChange={handleChange} 
              value={formData.building}
              className="w-full p-2 border rounded text-black"
              required={isNoComplaint}
              disabled={loading}
            >
              <option value="">Select Building</option>
              {Building.map(building => (
                <option key={building.id} value={building.name}>{building.name}</option>
              ))}
            </select>
          </div>

          {/* Only show these fields if it's not a "No Complaint" */}
          {!isNoComplaint && (
            <>
            {/* Floor Selection */}
          <div className="mb-4">
            <label className="text-black block mb-1">Floor:</label>
            <select 
              name="floor" 
              onChange={handleChange} 
              value={formData.floor}
              className="w-full p-2 border rounded text-black"
              required={isNoComplaint}
              disabled={loading}
            >
              <option value="">Select Floor</option>
                {Floor.map(floor => (
                  <option key={floor.id} value={floor.id}>{floor.name}</option>
                ))} 
            </select>
          </div>
              {/* Complaint Area Selection */}
              <div className="mb-4">
                <label className="text-black block mb-1">Complaint Area:</label>
                <select 
                  name="area" 
                  onChange={handleChange} 
                  className="w-full p-2 border rounded text-black"
                  value={areas.find(a => a.id.toString() === formData.area_id)?.area_name || ""}
                  disabled={loading}
                >
                  <option value="">Select Area</option>
                  {areas.map((area: Area) => (
                    <option key={area.id} value={area.area_name}>
                      {area.area_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Complaint Type Selection */}
              <div className="mb-4">
                <label className="text-black block mb-1">Complaint Type:</label>
                <select 
                  name="complaintType" 
                  onChange={handleChange} 
                  className="w-full p-2 border rounded text-black"
                  value={complaintTypes.find(t => t.id.toString() === formData.complaint_type_id)?.type_name || ""}
                  disabled={loading}
                >
                  <option value="">Select Complaint Type</option>
                  {complaintTypes.map((type: ComplaintType) => (
                    <option key={type.id} value={type.type_name}>
                      {type.type_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Complaint Details */}
              <div className="mb-4 relative">
                <label className="text-black block mb-1">Complaint Details:</label>
                <textarea
                  name="details"
                  value={formData.details}
                  onChange={handleChange}
                  className="w-full p-2 border rounded text-black"
                  placeholder="Describe your complaint"
                  rows={3}
                  disabled={loading}
                />
                {showDropdown && (
                  <div className="absolute z-10 border bg-white w-full max-h-32 overflow-y-auto shadow-md">
                    {suggestions.map((item, index) => (
                      <div
                        key={index}
                        className="p-2 hover:bg-gray-100 text-black cursor-pointer"
                        onClick={() => handleSelectSuggestion(item)}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end">
            <button 
              type="button" 
              onClick={handleCancel}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? 'Processing...' : (editingComplaint ? 'Update' : 'Submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}