'use client';
import { Complaint ,Area, ComplaintType,User} from '@/types/types';
import { Floor, Status,Building } from '@/utils/constants';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import React from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
// returns first date of the current month
function getCurrentMonth() {
  const date = new Date();
  date.setDate(1);
  return date;
}

const Reports = () => {
  const { data: session } = useSession();
  const [reports, setReports] = useState<Complaint[]>([]);
  const [filteredReports, setFilteredReports] = useState<Complaint[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [types, setTypes] = useState<ComplaintType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user_id:'',
    building: '',
    floor: '',
    area_id: '',
    complaint_type_id: '',
    status: '',
    from_date: getCurrentMonth(),
    to_date: new Date()
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports`);
      if (!response.ok) {
        throw new Error(`Error fetching reports: ${response.statusText}`);
      }
      const data = await response.json();
      setReports(data);
      setFilteredReports(data);
    } catch (error) {
      alert('Error fetching reports: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const fetchareas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/areas`);
      if (!response.ok) {
        throw new Error(`Error fetching areas: ${response.statusText}`);
      }
      const data = await response.json();
      setAreas(data);
    } catch (error) {
      alert('Error fetching areas: ' + error);
    } finally {
      setLoading(false);
    }
    }

    const fetchUsers = async () =>{
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

    const fetchtypes = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/complaint-types`);
          if (!response.ok) {
            throw new Error(`Error fetching types: ${response.statusText}`);
          }
          const data = await response.json();
          setTypes(data);
        } catch (error) {
          alert('Error fetching types: ' + error);
        } finally {
          setLoading(false);
        }
        }    


  useEffect(() => {
    fetchReports();
    fetchareas();
    fetchtypes();
    fetchUsers();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = useCallback(() => {
    let filtered = reports;

    if(filters.user_id){
      filtered = filtered.filter(report => report.user_id === parseInt(filters.user_id));
    }
    if (filters.building) {
      filtered = filtered.filter(report => report.building.includes(filters.building));
    }
    if (filters.floor) {
      filtered = filtered.filter(report => report.floor.includes(filters.floor));
    }
    if (filters.area_id) {
      filtered = filtered.filter(report => report.area_id === parseInt(filters.area_id));
    }
    if (filters.complaint_type_id) {
      filtered = filtered.filter(report => report.complaint_type_id === parseInt(filters.complaint_type_id));
    }
    if (filters.status) {
      filtered = filtered.filter(report => report.status.includes(filters.status));
    }
    if (filters.from_date) {
      filtered = filtered.filter(report => report.date >= filters.from_date.toISOString());
    }
    if (filters.to_date) {
      filtered = filtered.filter(report => report.date <= filters.to_date.toISOString());
    }

    setFilteredReports(filtered);
  },[filters, reports]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const exportToPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    // doc.text("Complaints Report", 10, 10);
    const autoTable = (await import("jspdf-autotable")).default as any;
    const head = [['Date','Submitted By', 'Building', 'Floor', 'Area', 'Type', 'Details', 'Status', 'Seen Date', 'Action','Resolution Date']];
    const body = filteredReports.map(report => [new Date(report.date).toDateString(), users.find(user => user.id === report.user_id)?.name, report.building, report.floor, report.area_name, report.complaint_type_name, report.details, report.status, report.seen ? new Date(report.seen_date as string).toDateString() : 'Not Seen', report.action?report.action:'No Action Taken', report.resolution_date ? new Date(report.resolution_date as string).toDateString() : 'Not Resolved']);
    autoTable(doc, {
      head,
      body,
      margin: 10,
      styles: { fontSize: 10, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
      columnStyles: { 5: { cellWidth: 150 }, 9: { cellWidth: 100 }, 10: { cellWidth: 100 } },
    });
    doc.save("complaints-report.pdf");
  };
 
  const exportToXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(filteredReports.map(report => ({Date: new Date(report.date).toDateString(), SubmittedBy: users.find(user => user.id === report.user_id)?.name, Building: report.building, Floor: report.floor, Area: report.area_name, Type: report.complaint_type_name, Details: report.details, Status: report.status, Seen: report.seen ? new Date(report.seen_date as string).toDateString() : 'Not Seen', Action: report.action?report.action:'No Action Taken', ResolutionDate: report.resolution_date ? new Date(report.resolution_date as string).toDateString() : 'Not Resolved'})));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Complaints Report");
    XLSX.writeFile(wb, "complaints-report.xlsx");
  };

  return (
    <div className="container mx-auto bg-white p-3 sm:p-4 md:p-6 shadow rounded mt-4 overflow-x-auto">
      <h3 className="text-xl md:text-2xl font-bold text-black mb-3 md:mb-4">All Complaints</h3>
      {/* Date Range Filter By default it will be current month */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="block text-black text-sm md:text-base">From Date:</label>
          <input type="date" className="border p-2 md:p-2.5 text-black w-full" value={filters.from_date.toISOString().split('T')[0]} onChange={(e) => setFilters(prev => ({ ...prev, from_date: new Date(e.target.value) }))} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="block text-black text-sm md:text-base">To Date:</label>
          <input type="date" className="border p-2 md:p-2.5 text-black w-full" value={filters.to_date.toISOString().split('T')[0]} onChange={(e) => setFilters(prev => ({ ...prev, to_date: new Date(e.target.value) }))} />
        </div>
        {/* Download buttons for the report in pdf or xlsx only for admin*/}
        {session?.user?.role === "admin" && (
          <div className="flex flex-row gap-1 items-end justify-end">
            <button className="bg-blue-500 hover:bg-blue-600 text-white p-2 md:p-2.5 rounded" onClick={exportToPDF}>Download PDF</button>
            <button className="bg-green-500 hover:bg-green-600 text-white p-2 md:p-2.5 rounded" onClick={exportToXLSX}>Download XLSX</button>
          </div>
        )}
      </div>
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="flex flex-col gap-1">
          <label className="block text-black text-sm md:text-base">Building:</label>
          <select name="building" value={filters.building} onChange={handleFilterChange} className="border p-2 md:p-2.5 text-black w-full">
            <option value="">All Buildings</option>
            {Building.map(building => (
                <option key={building.id} value={building.name}>{building.name}</option>
                ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="block text-black text-sm md:text-base">Submitted By:</label>
          <select name="user_id" value={filters.user_id} onChange={handleFilterChange} className="border p-2 md:p-2.5 text-black w-full">
              <option value="">All Users</option>
              {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                  ))} 
          </select>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="block text-black text-sm md:text-base">Floor:</label>
          <select name="floor" value={filters.floor} onChange={handleFilterChange} className="border p-2 md:p-2.5 text-black w-full">
              <option value="">All Floors</option>
              {Floor.map(floor => (
                  <option key={floor.id} value={floor.id}>{floor.name}</option>
                  ))} 
          </select>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="block text-black text-sm md:text-base">Area:</label>
          <select name="area_id" value={filters.area_id} onChange={handleFilterChange} className="border p-2 md:p-2.5 text-black w-full">
            <option value="">All Areas</option>
              {areas.map(area => (
                  <option key={area.id} value={area.id}>{area.area_name}</option>
                  ))}
          </select>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="block text-black text-sm md:text-base">Complaint Type:</label>
          <select name="complaint_type_id" value={filters.complaint_type_id} onChange={handleFilterChange} className="border p-2 md:p-2.5 text-black w-full">
            <option value="">All Types</option>
             {types.map(type => (
                  <option key={type.id} value={type.id}>{type.type_name}</option>
                  ))}
          </select>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="block text-black text-sm md:text-base">Status:</label>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="border p-2 md:p-2.5 text-black w-full">
            <option value="">All Statuses</option>
            {Status.map(status => (
                <option key={status.id} value={status.name}>{status.name}</option>
                ))}
          </select>
        </div>
      </div>

      <div className="block overflow-x-auto">
        <table className="w-full min-w-[900px] border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">Issue Date</th>
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">Submitted By</th>
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">Building</th>
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">Floor</th>
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">Area</th>
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">Type</th>
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm">Details</th>
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">Status</th>
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">Seen Date</th>
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">Actions</th>
              <th className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">Resolution Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((complaint: Complaint) => (
              <tr key={complaint.id} className="border">
                <td className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">{new Date(complaint.date).toDateString()}</td>
                <td className="border p-2 md:p-3 text-black text-xs md:text-sm">{complaint.user_id ? complaint.user_name : "Deleted User"}</td>
                <td className="border p-2 md:p-3 text-black text-xs md:text-sm">{complaint.building}</td>
                <td className="border p-2 md:p-3 text-black text-xs md:text-sm">{complaint.floor}</td>
                <td className="border p-2 md:p-3 text-black text-xs md:text-sm">{complaint.area_id ? complaint.area_name : "Deleted Area"}</td>
                <td className="border p-2 md:p-3 text-black text-xs md:text-sm">{complaint.complaint_type_id ? complaint.complaint_type_name : "Deleted Type"}</td>
                <td className="border p-2 md:p-3 text-black text-xs md:text-sm max-w-[12rem] md:max-w-xs break-words">{complaint.details}</td>
                <td className={`border text-black p-2 md:p-3 text-xs md:text-sm ${complaint.status === "Resolved" ? "bg-green-200" : complaint.status=== "In-Progress" ? "bg-red-200" : complaint.status=== "No Complaint" ? "bg-blue-200" : ""}`}>{complaint.status}</td>
                <td className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">{complaint.seen_date ? new Date(complaint.seen_date).toDateString().trim() : "N/A"}</td>
                <td className="border p-2 md:p-3 text-black text-xs md:text-sm">{complaint.action? complaint.action:"N/A"}</td>
                <td className="border p-2 md:p-3 text-black text-xs md:text-sm whitespace-nowrap">{complaint.resolution_date ? new Date(complaint.resolution_date).toDateString().trim() : "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;