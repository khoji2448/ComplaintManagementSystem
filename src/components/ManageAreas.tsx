"use client";
import NameCrud from "@/components/NameCrud";

export default function ManageAreas() {
  return (
    <NameCrud
      endpoint="/api/areas"
      eyebrow="Manage areas"
      title="Areas"
      noun="area"
      nameKey="area_name"
    />
  );
}
