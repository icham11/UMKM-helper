"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { getIngredients, type Ingredient } from "../../../lib/api/ingredients"

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getIngredients()
        setIngredients(data)
      } catch (error) {
        console.error("Failed to fetch ingredients:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="p-6">Loading ingredients...</div>
  }

  return (
    <div className="min-h-screen bg-linear-to-br py-8 px-2 md:px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-100 via-white to-purple-100 p-6 rounded-xl shadow space-y-2 border border-indigo-200 w-full flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-700 mb-2 tracking-tight">Ingredients Management</h1>
            <p className="text-gray-500 text-base">Kelola bahan baku untuk bisnis Anda</p>
          </div>
          <button className="flex items-center gap-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold shadow-lg transition text-base">
            <Plus size={22} />
            Add Ingredient
          </button>
        </div>

        {/* Table Card */}
        <div className="rounded-xl shadow overflow-hidden border border-gray-200 w-full bg-linear-to-br from-indigo-50 via-white to-purple-50">
          <table className="w-full text-base">
            <thead className="bg-linear-to-r from-indigo-100 via-white to-purple-100 text-indigo-700 font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">Min Stock</th>
                <th className="px-4 py-3 text-left">Cost / Unit</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ingredient) => {
                const isLow = ingredient.stock < ingredient.minStock;
                return (
                  <tr
                    key={ingredient.id}
                    className="border-t bg-white/60 hover:bg-indigo-100 transition rounded-lg"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {ingredient.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ingredient.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ingredient.stock}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ingredient.minStock}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      Rp {ingredient.costPerUnit.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <span className="bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full shadow-sm border border-red-200">
                          Low Stock
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-600 text-xs font-semibold px-3 py-1 rounded-full shadow-sm border border-green-200">
                          Safe
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}