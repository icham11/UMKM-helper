import React from "react";

type Ingredient = {
  name: string;
  unit: string;
};

type Recipe = {
  ingredient: Ingredient;
  quantity: number;
};

type Product = {
  name: string;
  recipes: Recipe[];
};

export default function RecipeModal({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full flex flex-col items-center animate-fadeIn animate-scaleUp">
        <h2 className="text-2xl font-extrabold mb-2 text-indigo-700">Resep Produk</h2>
        <div className="mb-4 text-gray-500 text-lg font-medium">Resep untuk <span className="font-semibold text-indigo-700">{product?.name}</span></div>
        <ul className="w-full mb-6">
          {product?.recipes?.map((r: Recipe, idx: number) => (
            <li key={idx} className="flex items-center gap-2 py-1 text-green-700 font-bold text-base">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
              {r.ingredient?.name}
              <span className="text-gray-400 font-normal">— {r.quantity} {r.ingredient?.unit}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-2 px-6 py-2 rounded-full bg-indigo-100 text-indigo-700 font-bold shadow hover:bg-indigo-200 hover:text-indigo-900 transition"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
