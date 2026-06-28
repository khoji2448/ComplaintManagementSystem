"use client";
import NameCrud from "@/components/NameCrud";

export default function ManageComplaintTypes() {
  return (
    <NameCrud
      endpoint="/api/complaint-types"
      eyebrow="Manage complaint types"
      title="Complaint types"
      noun="complaint type"
      nameKey="type_name"
    />
  );
}
