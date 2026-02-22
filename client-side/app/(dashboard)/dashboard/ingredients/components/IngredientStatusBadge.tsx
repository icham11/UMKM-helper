import React from "react";

interface Props {
  stock: number;
  minStock: number;
}

// Status: "Aman" | "Low" | "Belum di-set"
export default function IngredientStatusBadge({ stock, minStock }: Props) {
  let status = "Aman";
  let color = "bg-green-100 text-green-700";

  // Jika stock belum di-set, status harus Low (merah)
  if (stock === -1 || stock === 0) {
    status = "Low";
    color = "bg-red-100 text-red-700";
  } else if (minStock !== -1 && stock <= minStock) {
    status = "Low";
    color = "bg-red-100 text-red-700";
  }

  return (
    <span className={`px-3 py-1 rounded-full font-semibold text-xs ${color}`}>{status}</span>
  );
}
