import React from "react";

interface Product {
  name: string;
  // Add other fields as needed
}

export default function DeleteConfirmModal({ product, onClose, onDeleted }: {
  product: Product;
  onClose: () => void;
  onDeleted: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full flex flex-col items-center">
        <h2 className="text-lg font-bold mb-2 text-red-600">Hapus produk?</h2>
        <div className="mb-4">Yakin ingin menghapus produk <b>{product?.name}</b>?</div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 text-gray-700 font-semibold">Batal</button>
          <button onClick={onDeleted} className="px-4 py-2 rounded bg-red-600 text-white font-bold">Hapus</button>
        </div>
      </div>
    </div>
  );
}
