"use client"

import { useEffect, useState } from "react"
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  PackageOpen,
  X,
  History,
  RefreshCw,
} from "lucide-react"
import { getIngredients, type Ingredient } from "@/lib/api/ingredients"
import { useBusiness } from "@/context/BusinessContext"

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null)
  const [isRestockOpen, setIsRestockOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const { business, loading: businessLoading } = useBusiness()

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await getIngredients()
      setIngredients(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!business || businessLoading) return
    fetchData()
  }, [business, businessLoading])

  const formatCurrency = (value: number | null) => {
    if (!value) return "—"
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (businessLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-indigo-500 animate-pulse">
        <PackageOpen size={48} />
        <span className="mt-4 text-lg font-semibold">
          Loading ingredients...
        </span>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-indigo-400">
        <PackageOpen size={48} />
        <span className="mt-4 text-lg font-semibold">
          Anda belum memiliki bisnis.
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-red-500">
        <AlertTriangle size={48} />
        <span className="mt-4 text-lg font-semibold">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div className="flex justify-between items-center bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400 rounded-2xl p-6 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-white">Ingredients</h1>
          <p className="text-indigo-100">
            Kelola stok bahan baku dengan visual & batch tracking.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl shadow"
        >
          <Plus size={20} />
          Tambah
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-3xl shadow-xl overflow-x-auto custom-scroll">
        <table className="w-full min-w-[600px] text-base">
          <thead className="bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-800 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 text-left font-bold">Nama</th>
              <th className="px-6 py-4 text-left font-bold">Stok</th>
              <th className="px-6 py-4 text-left font-bold">Min</th>
              <th className="px-6 py-4 text-left font-bold">Harga</th>
              <th className="px-6 py-4 text-left font-bold">Status</th>
              <th className="px-6 py-4 text-left font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient) => {
              const isLow = ingredient.currentStock < ingredient.minStock
              return (
                <tr
                  key={ingredient.id}
                  className="border-t bg-white hover:bg-indigo-50 transition-all"
                >
                  <td className="px-4 py-3 font-bold text-slate-800 group-hover:text-indigo-700">
                    {ingredient.name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="font-semibold">{ingredient.currentStock}</span> <span className="text-xs text-slate-500">{ingredient.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-semibold">
                    {ingredient.minStock}
                  </td>
                  <td className="px-4 py-3 text-indigo-700 font-bold">
                    {formatCurrency(ingredient.costPerUnit)}
                  </td>
                  <td className="px-4 py-3">
                    {isLow ? (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                        <AlertTriangle size={14} /> Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-600 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                        <CheckCircle size={14} /> Aman
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedIngredient(ingredient)
                        setIsRestockOpen(true)
                      }}
                      className="text-indigo-600 hover:text-indigo-800 p-1 rounded-full transition"
                      title="Restock"
                    >
                      <RefreshCw size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIngredient(ingredient)
                        setIsHistoryOpen(true)
                      }}
                      className="text-violet-600 hover:text-violet-900 p-1 rounded-full transition"
                      title="History"
                    >
                      <History size={18} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <AddIngredientModal
          onClose={() => setIsAddOpen(false)}
          onSuccess={() => {
            setIsAddOpen(false)
            fetchData()
          }}
        />
      )}

      {isRestockOpen && selectedIngredient && (
        <RestockModal
          ingredient={selectedIngredient}
          onClose={() => setIsRestockOpen(false)}
          onSuccess={() => {
            setIsRestockOpen(false)
            fetchData()
          }}
        />
      )}

      {isHistoryOpen && selectedIngredient && (
        <BatchHistoryModal
          ingredient={selectedIngredient}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </div>
  )
}

/* =======================
   RESTOCK MODAL
======================= */

interface RestockModalProps {
  ingredient: Ingredient
  onClose: () => void
  onSuccess: () => void
}

function RestockModal({
  ingredient,
  onClose,
  onSuccess,
}: RestockModalProps) {
  const [quantity, setQuantity] = useState(0)
  const [cost, setCost] = useState(0)
  const [date, setDate] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRestock = async () => {
    setLoading(true)

    await fetch(`/api/ingredients/${ingredient.id}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity,
        costPerUnit: cost,
        expirationDate: date ? new Date(date).toISOString() : undefined,
      }),
    })

    setLoading(false)
    onSuccess()
  }

  return (
    <ModalWrapper onClose={onClose} title={<span className="text-indigo-700 font-bold text-lg">Restock {ingredient.name}</span>}>
      <form className="space-y-5 px-1 py-2" onSubmit={e => { e.preventDefault(); handleRestock(); }}>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-indigo-700">Quantity</label>
          <input
            type="number"
            min={0}
            className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
            placeholder="Jumlah restock"
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-indigo-700">Cost per Unit</label>
          <input
            type="number"
            min={0}
            className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
            placeholder="Harga per satuan"
            onChange={(e) => setCost(Number(e.target.value))}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-indigo-700">Tanggal Expired</label>
          <input
            type="date"
            className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white py-2 rounded-lg font-semibold shadow hover:from-indigo-600 hover:to-violet-600 transition disabled:opacity-60"
        >
          {loading ? "Processing..." : "Restock"}
        </button>
      </form>
    </ModalWrapper>
  )
}

/* =======================
   BATCH HISTORY
======================= */

interface Batch {
  expirationDate: string | number | Date
  id: string
  remainingQty: number
  costPerUnit: number
  // Add other fields as needed
}

interface BatchHistoryModalProps {
  ingredient: Ingredient
  onClose: () => void
}

function BatchHistoryModal({ ingredient, onClose }: BatchHistoryModalProps) {
  const [batches, setBatches] = useState<Batch[]>([])

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch(`/api/ingredients?withBatches=true`)
      const data = await res.json()
      const item = data.data.find((i: Ingredient) => i.id === ingredient.id)
      setBatches(item?.inventoryBatches || [])
    }
    fetchHistory()
  }, [ingredient.id])

  return (
    <ModalWrapper onClose={onClose} title={<span className="text-indigo-700 font-bold text-lg">Batch History</span>}>
      <div className="space-y-4">
        {batches.length === 0 ? (
          <div className="text-center text-slate-400 py-6">Belum ada batch untuk bahan baku ini.</div>
        ) : (
          batches.map((batch, idx) => (
            <div
              key={batch.id}
              className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <span className="font-semibold text-indigo-800">Batch #{idx + 1}</span>
                <span className="text-xs text-slate-500">ID: {batch.id}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm mt-2 md:mt-0">
                <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold">Qty: {batch.remainingQty}</span>
                <span className="inline-block bg-violet-100 text-violet-700 px-3 py-1 rounded-full font-semibold">Cost: Rp {batch.costPerUnit?.toLocaleString("id-ID")}</span>
                {batch.expirationDate && (
                  <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-semibold">
                    Exp: {new Date(batch.expirationDate).toLocaleDateString("id-ID")}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </ModalWrapper>
  )
}

/* =======================
   ADD MODAL (SIMPLE)
======================= */

interface AddIngredientModalProps {
  onClose: () => void
  onSuccess: () => void
}

function AddIngredientModal({
  onClose,
  onSuccess,
}: AddIngredientModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    unit: "",
    minStock: 0,
    quantity: 0,
    costPerUnit: 0,
    expirationDate: "",
  })

  const handleSubmit = async () => {
    if (!form.name || !form.unit) {
      setError("Nama dan satuan wajib diisi")
      return
    }

    try {
      setLoading(true)
      setError("")

      const expirationDateISO = form.expirationDate
        ? new Date(form.expirationDate).toISOString()
        : undefined

      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          unit: form.unit,
          minStock: Number(form.minStock),
          initialBatch:
            form.quantity > 0
              ? {
                  quantity: Number(form.quantity),
                  costPerUnit: Number(form.costPerUnit),
                  expirationDate: expirationDateISO,
                }
              : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create ingredient")
      }

      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalWrapper onClose={onClose} title="Tambah Bahan Baku">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="space-y-4"
      >
        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}


        <div>
          <label className="block text-sm font-semibold text-indigo-700 mb-1">Nama</label>
          <input
            className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
            placeholder="Nama bahan baku"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-indigo-700 mb-1">Satuan</label>
          <input
            className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
            placeholder="gram / kg / ml / pcs"
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-indigo-700 mb-1">Minimum Stock</label>
          <input
            type="number"
            min={0}
            className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
            placeholder="Minimum stok sebelum warning"
            onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-indigo-700 mb-1">Initial Quantity</label>
          <input
            type="number"
            min={0}
            className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
            placeholder="Jumlah awal (opsional)"
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-indigo-700 mb-1">Cost per Unit</label>
          <input
            type="number"
            min={0}
            className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
            placeholder="Harga per satuan (opsional)"
            onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-indigo-700 mb-1">Tanggal Expired</label>
          <input
            type="date"
            className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
            onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-indigo-600 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-7 py-2 rounded-lg font-semibold shadow hover:from-indigo-600 hover:to-violet-600 transition disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  )
}

/* =======================
   MODAL WRAPPER
======================= */

interface ModalWrapperProps {
  children: React.ReactNode
  onClose: () => void
  title: React.ReactNode
}

function ModalWrapper({
  children,
  onClose,
  title,
}: ModalWrapperProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}