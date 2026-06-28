"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Area, Complaint, ComplaintType } from "@/types/types";
import { Building, Floor } from "@/utils/constants";
import Modal from "@/components/ui/Modal";
import { Field, SelectInput, Textarea, fieldClass } from "@/components/ui/Field";
import { notify } from "@/lib/toast";

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
  refreshComplaints,
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
  const isAdmin = session?.user?.role === "admin";

  const [formData, setFormData] = useState({
    date: getTodayDate().toLocaleDateString("en-CA"),
    user_id: "",
    building: "",
    floor: "",
    area_id: "",
    complaint_type_id: "",
    details: "",
    status: "Pending",
  });

  // Set user_id when session is available
  useEffect(() => {
    if (session?.user?.id) {
      setFormData((prev) => ({ ...prev, user_id: String(session.user.id) }));
    }
  }, [session]);

  // Reset date to current date for non-admin users
  useEffect(() => {
    if (!isAdmin) {
      setSelectedDate(getTodayDate());
      setFormData((prev) => ({ ...prev, date: getTodayDate().toLocaleDateString("en-CA") }));
    }
  }, [isAdmin]);

  // Fetch areas and complaint types
  useEffect(() => {
    const fetchData = async () => {
      try {
        const areasResponse = await fetch("/api/areas");
        const areasData = await areasResponse.json();
        setAreas(areasData);

        const typesResponse = await fetch("/api/complaint-types");
        const typesData = await typesResponse.json();
        setComplaintTypes(typesData);
      } catch (error) {
        notify.error("Couldn’t load areas and types: " + error);
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

      const noComplaint = editingComplaint.status === "No Complaint";
      setIsNoComplaint(noComplaint);

      setFormData({
        date: date.toLocaleDateString("en-CA"),
        user_id: editingComplaint.user_id?.toString() || "",
        building: editingComplaint.building || "",
        floor: editingComplaint.floor || "",
        area_id: editingComplaint.area_id?.toString() || "",
        complaint_type_id: editingComplaint.complaint_type_id?.toString() || "",
        details: editingComplaint.details || "",
        status: editingComplaint.status || "Pending",
      });
    }
  }, [editingComplaint, areas, complaintTypes]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "area") {
      const selectedArea = areas.find((area) => area.area_name === value);
      setFormData((prev) => ({ ...prev, area_id: selectedArea?.id.toString() || "" }));
    } else if (name === "complaintType") {
      const selectedType = complaintTypes.find((type) => type.type_name === value);
      setFormData((prev) => ({ ...prev, complaint_type_id: selectedType?.id.toString() || "" }));
    } else if (name === "floor") {
      setFormData((prev) => ({ ...prev, floor: value }));
    } else if (name === "details") {
      if (value.length > 0) {
        const filteredSuggestions = suggestions.filter((item) =>
          item.toLowerCase().includes(value.toLowerCase())
        );
        setSuggestions(filteredSuggestions);
        setShowDropdown(filteredSuggestions.length > 0);
      } else {
        setShowDropdown(false);
      }
      setFormData((prev) => ({ ...prev, details: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectSuggestion = (value: string) => {
    setFormData((prev) => ({ ...prev, details: value }));
    setShowDropdown(false);
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      setFormData((prev) => ({ ...prev, date: `${year}-${month}-${day}` }));
      setSelectedDate(date);
    } else {
      setFormData((prev) => ({ ...prev, date: "" }));
    }
  };

  const handleNoComplaintToggle = () => {
    const newNoComplaintState = !isNoComplaint;
    setIsNoComplaint(newNoComplaintState);

    if (newNoComplaintState) {
      setFormData((prev) => ({
        ...prev,
        status: "No Complaint",
        details: "No complaints to report for this area",
      }));
    } else {
      setFormData((prev) => ({ ...prev, status: "Pending", details: "" }));
    }
  };

  const resetForm = () => {
    setFormData({
      date: getTodayDate().toLocaleDateString("en-CA"),
      user_id: session?.user?.id ? String(session.user.id) : "",
      building: "",
      floor: "",
      area_id: "",
      complaint_type_id: "",
      details: "",
      status: "Pending",
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
      notify.error("Please log in to submit a complaint");
      setLoading(false);
      return;
    }

    // For "No Complaint", we need to ensure we have at least building
    if (isNoComplaint) {
      if (!formData.building) {
        notify.error("Pick a building for the 'No complaint' report");
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
            date: formData.date,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          notify.success(editingComplaint ? "Complaint updated" : "Complaint submitted");

          if (formData.details && !suggestions.includes(formData.details) && !isNoComplaint) {
            const updatedSuggestions = [...suggestions, formData.details];
            setSuggestions(updatedSuggestions);
            localStorage.setItem("complaintDetails", JSON.stringify(updatedSuggestions));
          }

          resetForm();
          setShowModal(false);
          refreshComplaints();
        } else {
          notify.error(`Couldn’t ${editingComplaint ? "update" : "submit"}: ${result.error}`);
        }
      } catch (err) {
        notify.error("Something went wrong while submitting");
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!isNoComplaint) {
      const url = editingComplaint
        ? `/api/complaints/${editingComplaint.id}`
        : "/api/complaints";

      const method = editingComplaint ? "PUT" : "POST";

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData }),
        });

        const result = await response.json();

        if (response.ok) {
          notify.success(editingComplaint ? "Complaint updated" : "Complaint submitted");

          if (formData.details && !suggestions.includes(formData.details) && !isNoComplaint) {
            const updatedSuggestions = [...suggestions, formData.details];
            setSuggestions(updatedSuggestions);
            localStorage.setItem("complaintDetails", JSON.stringify(updatedSuggestions));
          }

          resetForm();
          setShowModal(false);
          refreshComplaints();
        } else {
          notify.error(`Couldn’t ${editingComplaint ? "update" : "submit"}: ${result.error}`);
        }
      } catch (error) {
        notify.error(`Couldn’t ${editingComplaint ? "update" : "submit"}: ${error}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      open={showModal}
      onClose={handleCancel}
      title={editingComplaint ? "Edit complaint" : "New complaint"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* No Complaint toggle as a switch */}
        <button
          type="button"
          onClick={handleNoComplaintToggle}
          className="flex w-full items-center justify-between border border-[var(--hairline)] bg-[var(--paper)] px-3 py-2.5 text-left transition-colors hover:border-[var(--slate)]"
        >
          <span className="text-sm text-[var(--ink)]">No complaint to report</span>
          <span
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
              isNoComplaint ? "bg-[var(--mint)]" : "bg-[var(--hairline)]"
            }`}
            style={{ transitionTimingFunction: "var(--ease)" }}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${
                isNoComplaint ? "left-[18px]" : "left-0.5"
              }`}
              style={{ transitionTimingFunction: "var(--ease)" }}
            />
          </span>
        </button>

        {/* Date */}
        <Field label="Date" htmlFor="date">
          <DatePicker
            id="date"
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="dd-MM-yyyy"
            className={fieldClass}
            placeholderText="Select date"
            disabled={!isAdmin}
            wrapperClassName="w-full"
          />
        </Field>

        {/* Building */}
        <Field label="Building" htmlFor="building">
          <SelectInput
            id="building"
            name="building"
            onChange={handleChange}
            value={formData.building}
            required={isNoComplaint}
            disabled={loading}
          >
            <option value="">Select building</option>
            {Building.map((building) => (
              <option key={building.id} value={building.name}>
                {building.name}
              </option>
            ))}
          </SelectInput>
        </Field>

        {!isNoComplaint && (
          <>
            <Field label="Floor" htmlFor="floor">
              <SelectInput
                id="floor"
                name="floor"
                onChange={handleChange}
                value={formData.floor}
                disabled={loading}
              >
                <option value="">Select floor</option>
                {Floor.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Complaint area" htmlFor="area">
              <SelectInput
                id="area"
                name="area"
                onChange={handleChange}
                value={areas.find((a) => a.id.toString() === formData.area_id)?.area_name || ""}
                disabled={loading}
              >
                <option value="">Select area</option>
                {areas.map((area: Area) => (
                  <option key={area.id} value={area.area_name}>
                    {area.area_name}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Complaint type" htmlFor="complaintType">
              <SelectInput
                id="complaintType"
                name="complaintType"
                onChange={handleChange}
                value={
                  complaintTypes.find((t) => t.id.toString() === formData.complaint_type_id)
                    ?.type_name || ""
                }
                disabled={loading}
              >
                <option value="">Select complaint type</option>
                {complaintTypes.map((type: ComplaintType) => (
                  <option key={type.id} value={type.type_name}>
                    {type.type_name}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Details" htmlFor="details" className="relative">
              <Textarea
                id="details"
                name="details"
                value={formData.details}
                onChange={handleChange}
                placeholder="Describe the complaint"
                rows={3}
                disabled={loading}
              />
              {showDropdown && (
                <div className="absolute z-10 max-h-32 w-full overflow-y-auto border border-[var(--hairline)] bg-[var(--card)] shadow-[0_8px_24px_rgba(14,17,22,0.12)]">
                  {suggestions.map((item, index) => (
                    <div
                      key={index}
                      className="cursor-pointer px-3 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--paper)]"
                      onClick={() => handleSelectSuggestion(item)}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </Field>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="border border-[var(--hairline)] px-4 py-2 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.02] disabled:opacity-50"
            style={{ transitionTimingFunction: "var(--ease)" }}
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {loading ? "Working…" : editingComplaint ? "Update" : "Submit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
