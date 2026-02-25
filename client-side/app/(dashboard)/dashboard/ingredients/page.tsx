"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  PackageOpen,
  X,
  History,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Loader2,
  Pencil,
  Flame,
  PackagePlus,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import IngredientStatusBadge from "./components/IngredientStatusBadge";
import { getIngredients, deleteIngredient, bulkDeleteIngredients, type Ingredient } from "@/lib/api/ingredients";
import { INGREDIENT_UNITS } from "@/lib/validations/product";

import { useBusiness } from "@/context/BusinessContext";

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  // Sort
  const [sortBy, setSortBy] = useState<"name" | "currentStock" | "minStock" | "costPerUnit">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "habis" | "perlu-restock" | "bahaya" | "aman">("all");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Delete / bulk-delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isWasteOpen, setIsWasteOpen] = useState(false);
  const [isInitialStockOpen, setIsInitialStockOpen] = useState(false);

  const { business, loading: businessLoading } = useBusiness();

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getIngredients();
      setIngredients(data);
      setSelectedIds(new Set()); // clear selection on refresh
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteIngredient(deleteTarget.id);
      setIngredients((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(deleteTarget.id as string);
        return n;
      });
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    setDeleteError(null);
    try {
      await bulkDeleteIngredients(Array.from(selectedIds));
      setIngredients((prev) => prev.filter((i) => !selectedIds.has(i.id as string)));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBulkDeleting(false);
    }
  };

  useEffect(() => {
    if (!business || businessLoading) return;
    fetchData();
  }, [business, businessLoading]);

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (businessLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-indigo-500 animate-pulse">
        <PackageOpen size={48} />
        <span className="mt-4 text-lg font-semibold">Loading ingredients...</span>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-indigo-400">
        <PackageOpen size={48} />
        <span className="mt-4 text-lg font-semibold">Anda belum memiliki bisnis.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-red-500">
        <AlertTriangle size={48} />
        <span className="mt-4 text-lg font-semibold">{error}</span>
      </div>
    );
  }

  // Filtering
  const filtered = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(search.toLowerCase());
    const s = ing.currentStock;
    const m = ing.minStock;
    let matchesStatus = true;
    if (statusFilter === "habis") {
      matchesStatus = s === 0;
    } else if (statusFilter === "perlu-restock") {
      matchesStatus = s > 0 && m >= 0 && s <= m;
    } else if (statusFilter === "bahaya") {
      matchesStatus = m >= 0 && s > m && s <= m * 2;
    } else if (statusFilter === "aman") {
      matchesStatus = s > 0 && (m < 0 || s > m * 2);
    }
    return matchesSearch && matchesStatus;
  });
  // Sorting
  // NOTE: Default urutan dari backend adalah latest created (createdAt desc)
  // Jika sortBy bukan 'name', tetap lakukan sorting sesuai pilihan user
  let sorted = [...filtered];
  if (sortBy !== "name") {
    sorted = sorted.sort((a, b) => {
      const cmp = (a[sortBy] ?? 0) - (b[sortBy] ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }
  // Pagination
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Selection helpers
  const allSelected = paged.length > 0 && paged.every((i) => selectedIds.has(i.id as string));
  const someSelected = paged.some((i) => selectedIds.has(i.id as string)) && !allSelected;
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleSelectAll = () => {
    if (allSelected)
      setSelectedIds((prev) => {
        const n = new Set(prev);
        paged.forEach((i) => n.delete(i.id as string));
        return n;
      });
    else
      setSelectedIds((prev) => {
        const n = new Set(prev);
        paged.forEach((i) => n.add(i.id as string));
        return n;
      });
  };

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-linear-to-r from-indigo-500 via-violet-500 to-indigo-400 rounded-2xl p-4 sm:p-6 shadow-lg">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
            <PackageOpen className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
            Bahan Baku
          </h1>
          <p className="text-indigo-100 text-sm mt-1">Kelola stok bahan baku dengan visual & batch tracking.</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl shadow text-sm sm:text-base"
        >
          <Plus size={20} />
          Tambah
        </button>
      </div>

      {/* FILTER, SORT, PAGINATION CONTROLS */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-2 px-1">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Cari nama bahan..."
            className="px-3 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="px-2 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "habis" | "perlu-restock" | "bahaya" | "aman");
              setPage(1);
            }}
          >
            <option value="all">Semua Status</option>
            <option value="habis">Habis</option>
            <option value="perlu-restock">Perlu Restock</option>
            <option value="bahaya">Bahaya</option>
            <option value="aman">Aman</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-gray-500">Sort:</label>
          <select
            className="px-2 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as "name" | "currentStock" | "minStock" | "costPerUnit");
              setPage(1);
            }}
          >
            <option value="name">Nama</option>
            <option value="currentStock">Stok</option>
            <option value="minStock">Min</option>
            <option value="costPerUnit">Harga</option>
          </select>
          <button
            className="px-2 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 flex items-center justify-center"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title="Urutan"
          >
            {sortDir === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      {/* BULK ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3">
          <span className="text-sm font-semibold text-indigo-700">
            {selectedIds.size} ingredient{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-white border border-gray-200 transition"
            >
              Deselect all
            </button>
            <button
              onClick={() => {
                setDeleteError(null);
                setBulkDeleteOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition"
            >
              <Trash2 size={13} />
              Delete selected
            </button>
          </div>
        </div>
      )}

      {/* ═══ MOBILE CARD VIEW ═══ */}
      <div className="md:hidden space-y-3">
        {paged.map((ingredient) => {
          return (
            <div key={ingredient.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2.5">
              {/* Top row: name + status */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-800 text-sm leading-tight min-w-0">{ingredient.name}</h3>
                <div className="shrink-0">
                  <IngredientStatusBadge stock={ingredient.currentStock} minStock={ingredient.minStock} />
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex-1">
                  <span className="text-gray-400 block">Stok</span>
                  {ingredient.currentStock === -1 ? (
                    <span className="text-gray-400 italic text-sm">Belum di-set</span>
                  ) : (
                    <span className="font-bold text-slate-700 text-sm">
                      {ingredient.currentStock} <span className="text-gray-400 font-normal">{ingredient.unit}</span>
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-gray-400 block">Min</span>
                  {ingredient.minStock === -1 ? (
                    <span className="text-gray-400 italic text-sm">Belum di-set</span>
                  ) : (
                    <span className="font-semibold text-slate-600 text-sm">{ingredient.minStock}</span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-gray-400 block">Harga/Unit</span>
                  <span className="font-bold text-indigo-700 text-sm">{formatCurrency(ingredient.costPerUnit)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-gray-50">
                <button
                  onClick={() => {
                    setSelectedIngredient(ingredient);
                    setIsRestockOpen(true);
                  }}
                  className="flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <RefreshCw size={13} /> Restock
                </button>
                <button
                  onClick={() => {
                    setSelectedIngredient(ingredient);
                    setIsWasteOpen(true);
                  }}
                  className="flex items-center gap-1 text-orange-600 hover:bg-orange-50 px-2 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <Flame size={13} /> Waste
                </button>
                {ingredient.currentStock === -1 && (
                  <button
                    onClick={() => {
                      setSelectedIngredient(ingredient);
                      setIsInitialStockOpen(true);
                    }}
                    className="flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 px-2 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    <PackagePlus size={13} /> Stok Awal
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedIngredient(ingredient);
                    setIsHistoryOpen(true);
                  }}
                  className="flex items-center gap-1 text-violet-600 hover:bg-violet-50 px-2 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <History size={13} /> Riwayat
                </button>
                <button
                  onClick={() => {
                    setSelectedIngredient(ingredient);
                    setIsEditOpen(true);
                  }}
                  className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(ingredient);
                  }}
                  className="flex items-center gap-1 text-red-400 hover:bg-red-50 px-2 py-1.5 rounded-lg text-xs font-semibold transition ml-auto"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ DESKTOP TABLE ═══ */}
      <div className="hidden md:block bg-white rounded-3xl shadow-xl overflow-x-auto custom-scroll">
        <table className="w-full min-w-150 text-base">
          <thead className="bg-linear-to-r from-indigo-50 to-violet-50 text-indigo-800 text-xs uppercase tracking-wider">
            <tr>
              <th className="pl-5 pr-2 py-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
              </th>
              <th className="px-6 py-4 text-left font-bold">Nama</th>
              <th className="px-6 py-4 text-left font-bold">Stok</th>
              <th className="px-6 py-4 text-left font-bold">Min</th>
              <th className="px-6 py-4 text-left font-bold">Harga / Unit</th>
              <th className="px-6 py-4 text-left font-bold">Status</th>
              <th className="px-6 py-4 text-left font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((ingredient) => {
              const isSelected = selectedIds.has(ingredient.id as string);
              return (
                <tr
                  key={ingredient.id}
                  className={`border-t transition-all ${isSelected ? "bg-indigo-50" : "bg-white hover:bg-indigo-50"}`}
                >
                  <td className="pl-5 pr-2 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(ingredient.id as string)}
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800 group-hover:text-indigo-700">{ingredient.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {ingredient.currentStock === -1 ? (
                      <span className="text-gray-400 italic">Belum di-set</span>
                    ) : (
                      <>
                        <span className="font-semibold">{ingredient.currentStock}</span>{" "}
                        <span className="text-xs text-slate-500">{ingredient.unit}</span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {ingredient.minStock === -1 ? (
                      <span className="text-gray-400 italic">Belum di-set</span>
                    ) : (
                      <span className="font-semibold">{ingredient.minStock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-indigo-700 font-bold">
                    <span className="font-semibold">{formatCurrency(ingredient.costPerUnit)}</span>{" "}
                    <span className="text-xs text-slate-500">/ {ingredient.unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <IngredientStatusBadge stock={ingredient.currentStock} minStock={ingredient.minStock} />
                  </td>
                  <td className="px-4 py-3 flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedIngredient(ingredient);
                        setIsRestockOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1.5 rounded-lg transition"
                      title="Restock"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIngredient(ingredient);
                        setIsWasteOpen(true);
                      }}
                      className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 p-1.5 rounded-lg transition"
                      title="Waste / Buang"
                    >
                      <Flame size={16} />
                    </button>
                    {ingredient.currentStock === -1 && (
                      <button
                        onClick={() => {
                          setSelectedIngredient(ingredient);
                          setIsInitialStockOpen(true);
                        }}
                        className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 p-1.5 rounded-lg transition"
                        title="Set Stok Awal"
                      >
                        <PackagePlus size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedIngredient(ingredient);
                        setIsHistoryOpen(true);
                      }}
                      className="text-violet-600 hover:text-violet-900 hover:bg-violet-50 p-1.5 rounded-lg transition"
                      title="History"
                    >
                      <History size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIngredient(ingredient);
                        setIsEditOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(ingredient);
                      }}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal (must be outside hidden wrapper) */}
      {isEditOpen && selectedIngredient && (
        <EditIngredientModal
          ingredient={selectedIngredient}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => {
            setIsEditOpen(false);
            fetchData();
          }}
        />
      )}

      {/* PAGINATION BAR */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 sm:gap-6 px-2 py-4 sm:py-6">
          <button
            className="px-3 sm:px-6 py-2 rounded-full border border-indigo-200 bg-white text-indigo-600 font-bold shadow transition hover:bg-indigo-50 disabled:opacity-40 text-xs sm:text-base"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ‹ Prev
          </button>
          <span className="text-xs sm:text-base font-semibold text-indigo-700 bg-indigo-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-sm whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <button
            className="px-3 sm:px-6 py-2 rounded-full border border-indigo-200 bg-white text-indigo-600 font-bold shadow transition hover:bg-indigo-50 disabled:opacity-40 text-xs sm:text-base"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next ›
          </button>
        </div>
      )}

      {isAddOpen && (
        <AddIngredientModal
          onClose={() => setIsAddOpen(false)}
          onSuccess={() => {
            setIsAddOpen(false);
            fetchData();
          }}
        />
      )}
      {isRestockOpen && selectedIngredient && (
        <RestockModal
          ingredient={selectedIngredient}
          onClose={() => setIsRestockOpen(false)}
          onSuccess={() => {
            setIsRestockOpen(false);
            fetchData();
          }}
        />
      )}
      {isWasteOpen && selectedIngredient && (
        <WasteModal
          ingredient={selectedIngredient}
          onClose={() => setIsWasteOpen(false)}
          onSuccess={() => {
            setIsWasteOpen(false);
            fetchData();
          }}
        />
      )}
      {isInitialStockOpen && selectedIngredient && (
        <InitialStockModal
          ingredient={selectedIngredient}
          onClose={() => setIsInitialStockOpen(false)}
          onSuccess={() => {
            setIsInitialStockOpen(false);
            fetchData();
          }}
        />
      )}
      {isHistoryOpen && selectedIngredient && (
        <BatchHistoryModal ingredient={selectedIngredient} onClose={() => setIsHistoryOpen(false)} />
      )}

      {/* Single delete confirm */}
      {deleteTarget && (
        <ModalWrapper
          onClose={() => {
            if (!deleting) setDeleteTarget(null);
          }}
          title=""
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600">
                <Trash2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800">Delete Ingredient?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold text-slate-700">{deleteTarget.name}</span> and all its inventory
                  batches will be permanently deleted.
                </p>
              </div>
            </div>
            {deleteError && (
              <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-xl p-3 text-xs">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Bulk delete confirm */}
      {bulkDeleteOpen && (
        <ModalWrapper
          onClose={() => {
            if (!bulkDeleting) setBulkDeleteOpen(false);
          }}
          title=""
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600">
                <Trash2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800">
                  Delete {selectedIds.size} Ingredient
                  {selectedIds.size !== 1 ? "s" : ""}?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  All selected ingredients and their batches will be permanently deleted.
                </p>
              </div>
            </div>
            {deleteError && (
              <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-xl p-3 text-xs">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setBulkDeleteOpen(false)}
                disabled={bulkDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition disabled:opacity-50"
              >
                {bulkDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete {selectedIds.size}
              </button>
            </div>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
}

/* =======================
   RESTOCK MODAL
======================= */

interface RestockModalProps {
  ingredient: Ingredient;
  onClose: () => void;
  onSuccess: () => void;
}

function RestockModal({ ingredient, onClose, onSuccess }: RestockModalProps) {
  const [quantity, setQuantity] = useState(0);
  const [cost, setCost] = useState(0);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRestock = async () => {
    setLoading(true);

    await fetch(`/api/ingredients/${ingredient.id}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity,
        costPerUnit: cost,
        expirationDate: date ? new Date(date).toISOString() : undefined,
      }),
    });

    setLoading(false);
    onSuccess();
  };

  return (
    <ModalWrapper
      onClose={onClose}
      title={<span className="text-indigo-700 font-bold text-lg">Restock {ingredient.name}</span>}
    >
      <form
        className="space-y-5 px-1 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleRestock();
        }}
      >
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
          className="w-full bg-linear-to-r from-indigo-500 to-violet-500 text-white py-2 rounded-lg font-semibold shadow hover:from-indigo-600 hover:to-violet-600 transition disabled:opacity-60"
        >
          {loading ? "Processing..." : "Restock"}
        </button>
      </form>
    </ModalWrapper>
  );
}

/* =======================
   WASTE MODAL
======================= */

interface WasteModalProps {
  ingredient: Ingredient;
  onClose: () => void;
  onSuccess: () => void;
}

function WasteModal({ ingredient, onClose, onSuccess }: WasteModalProps) {
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleWaste = async () => {
    if (quantity <= 0) {
      setError("Jumlah harus lebih dari 0");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          notes: notes || `Waste: ${ingredient.name}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mencatat waste");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper
      onClose={onClose}
      title={
        <span className="text-orange-700 font-bold text-lg flex items-center gap-2">
          <Flame size={20} /> Catat Waste
        </span>
      }
    >
      <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3">
        <p className="text-sm text-orange-700">
          <span className="font-bold">{ingredient.name}</span> — Stok saat ini:{" "}
          <span className="font-bold">
            {ingredient.currentStock === -1 ? "Belum di-set" : `${ingredient.currentStock} ${ingredient.unit}`}
          </span>
        </p>
        <p className="text-xs text-orange-500 mt-1">
          Waste akan mengurangi stok dan tercatat sebagai pengeluaran bahan baku. Data ini digunakan untuk analisis
          forecast dan RAG.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleWaste();
        }}
      >
        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-xl p-3 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-orange-700">Jumlah yang dibuang ({ingredient.unit})</label>
          <input
            type="number"
            min={0}
            step="any"
            className="w-full border border-orange-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400"
            placeholder={`Jumlah (${ingredient.unit})`}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-orange-700">Alasan / Catatan</label>
          <textarea
            className="w-full border border-orange-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-400 resize-none"
            rows={2}
            placeholder="Misal: expired, tumpah, rusak, dll."
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-linear-to-r from-orange-500 to-red-500 text-white py-2.5 rounded-xl font-semibold shadow hover:from-orange-600 hover:to-red-600 transition disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Catat Waste"}
        </button>
      </form>
    </ModalWrapper>
  );
}

/* =======================
   INITIAL STOCK MODAL
======================= */

interface InitialStockModalProps {
  ingredient: Ingredient;
  onClose: () => void;
  onSuccess: () => void;
}

function InitialStockModal({ ingredient, onClose, onSuccess }: InitialStockModalProps) {
  const [quantity, setQuantity] = useState(0);
  const [cost, setCost] = useState(0);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSetInitialStock = async () => {
    if (quantity <= 0) {
      setError("Jumlah harus lebih dari 0");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          costPerUnit: cost || 0,
          expirationDate: date ? new Date(date).toISOString() : undefined,
          notes: `Stok Awal: ${ingredient.name}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal set stok awal");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper
      onClose={onClose}
      title={
        <span className="text-emerald-700 font-bold text-lg flex items-center gap-2">
          <PackagePlus size={20} /> Set Stok Awal
        </span>
      }
    >
      <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <p className="text-sm text-emerald-700">
          <span className="font-bold">{ingredient.name}</span> — Belum memiliki stok. Set stok awal untuk mulai
          tracking.
        </p>
        <p className="text-xs text-emerald-500 mt-1">
          Stok awal akan tercatat sebagai pembelian pertama dan masuk ke data forecast serta RAG.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSetInitialStock();
        }}
      >
        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-xl p-3 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-emerald-700">Jumlah Stok Awal ({ingredient.unit})</label>
          <input
            type="number"
            min={0}
            step="any"
            className="w-full border border-emerald-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
            placeholder={`Jumlah (${ingredient.unit})`}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-emerald-700">Harga per {ingredient.unit}</label>
          <input
            type="number"
            min={0}
            step="any"
            className="w-full border border-emerald-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
            placeholder="Harga per satuan"
            onChange={(e) => setCost(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-emerald-700">Tanggal Expired (opsional)</label>
          <input
            type="date"
            className="w-full border border-emerald-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-400"
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-linear-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl font-semibold shadow hover:from-emerald-600 hover:to-teal-600 transition disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Set Stok Awal"}
        </button>
      </form>
    </ModalWrapper>
  );
}

/* =======================
   BATCH HISTORY
======================= */

interface Batch {
  expirationDate: string | number | Date;
  id: string;
  remainingQty: number;
  costPerUnit: number;
  // Add other fields as needed
}

interface BatchHistoryModalProps {
  ingredient: Ingredient;
  onClose: () => void;
}

function BatchHistoryModal({ ingredient, onClose }: BatchHistoryModalProps) {
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch(`/api/ingredients?withBatches=true`);
      const data = await res.json();
      const item = data.data.find((i: Ingredient) => i.id === ingredient.id);
      setBatches(item?.inventoryBatches || []);
    };
    fetchHistory();
  }, [ingredient.id]);

  // Helper to determine batch status
  const getBatchStatus = (batch: Batch) => {
    const today = new Date();
    const expDate = new Date(batch.expirationDate);
    if (expDate < today) return { label: "Expired", color: "bg-red-100 text-red-700" };
    if (batch.remainingQty < 50) return { label: "Hampir Habis", color: "bg-orange-100 text-orange-700" };
    return { label: "Aktif", color: "bg-green-100 text-green-700" };
  };

  return (
    <ModalWrapper onClose={onClose} title={<span className="text-indigo-700 font-bold text-lg">Batch History</span>}>
      <div className="mb-4">
        <span className="font-semibold text-indigo-700 text-base">Ingredient: {ingredient.name}</span>
      </div>
      <div className="space-y-4">
        {batches.length === 0 ? (
          <div className="text-center text-slate-400 py-6">Belum ada batch untuk bahan baku ini.</div>
        ) : (
          batches.map((batch, idx) => {
            const status = getBatchStatus(batch);
            return (
              <div
                key={batch.id}
                className="rounded-xl border border-indigo-100 bg-linear-to-r from-indigo-50 to-violet-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <span className="font-semibold text-indigo-800">Batch #{idx + 1}</span>
                  <span className="text-xs text-slate-500">ID: {batch.id}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm mt-2 md:mt-0">
                  <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold">
                    Qty: {batch.remainingQty}
                  </span>
                  <span className="inline-block bg-violet-100 text-violet-700 px-3 py-1 rounded-full font-semibold">
                    Cost: Rp {batch.costPerUnit?.toLocaleString("id-ID")}
                  </span>
                  {batch.expirationDate && (
                    <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-semibold">
                      Exp: {new Date(batch.expirationDate).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}
                    </span>
                  )}
                  <span className={`inline-block px-3 py-1 rounded-full font-semibold ${status.color}`}>
                    Status: {status.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ModalWrapper>
  );
}

/* =======================
   ADD MODAL (SIMPLE)
======================= */

interface AddIngredientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AddIngredientModal({ onClose, onSuccess }: AddIngredientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    unit: "",
    minStock: -1,
    quantity: -1,
    costPerUnit: 0,
    expirationDate: "",
  });

  const handleSubmit = async () => {
    if (!form.name || !form.unit) {
      setError("Nama dan satuan wajib diisi");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const expirationDateISO = form.expirationDate ? new Date(form.expirationDate).toISOString() : undefined;

      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          unit: form.unit,
          minStock: form.minStock === -1 || form.minStock === undefined ? 0 : Number(form.minStock),
          initialBatch:
            form.quantity > 0
              ? {
                  quantity: Number(form.quantity),
                  costPerUnit: Number(form.costPerUnit),
                  expirationDate: expirationDateISO,
                }
              : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create ingredient");
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose} title="Tambah Bahan Baku">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        {error && <div className="text-red-600 text-sm">{error}</div>}

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
          <select
            className="w-full border border-indigo-200 rounded-xl px-4 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            required
          >
            <option value="" disabled>
              -- Pilih satuan --
            </option>
            {INGREDIENT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
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
            className="bg-linear-to-r from-indigo-500 to-violet-500 text-white px-7 py-2 rounded-lg font-semibold shadow hover:from-indigo-600 hover:to-violet-600 transition disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

interface EditIngredientModalProps {
  ingredient: Ingredient;
  onClose: () => void;
  onSuccess: () => void;
}

function EditIngredientModal({ ingredient, onClose, onSuccess }: EditIngredientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: ingredient.name,
    unit: ingredient.unit,
    minStock: ingredient.minStock,
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      // Only send fields that are supported by PATCH endpoint
      const payload = {
        name: form.name,
        unit: form.unit,
        minStock: form.minStock,
      };

      const res = await fetch(`/api/ingredients/${ingredient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Try to parse JSON only if response has content
      let data = null;
      const text = await res.text();
      if (text) {
        data = JSON.parse(text);
      }

      if (!res.ok) {
        throw new Error((data && data.error) || "Failed to update ingredient");
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper
      onClose={onClose}
      title={
        <span className="flex items-center gap-2 text-indigo-700">
          <Pencil size={20} />
          <span className="font-bold">Edit Bahan Baku</span>
        </span>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-6"
      >
        {error && (
          <div className="text-red-600 text-sm font-semibold px-2 py-1 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-semibold text-indigo-700 mb-0.5">Nama</label>
          <input
            className="w-full border-2 border-indigo-300 rounded-xl px-4 py-2 text-base text-black focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition placeholder:text-gray-400 bg-white shadow-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Nama bahan baku"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold text-indigo-700 mb-0.5">Satuan</label>
          <select
            className="w-full border-2 border-indigo-300 rounded-xl px-4 py-2 text-base text-black focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition bg-white shadow-sm"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            required
          >
            {INGREDIENT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-semibold text-indigo-700 mb-0.5">Minimum Stock</label>
          <input
            type="number"
            min={0}
            className="w-full border-2 border-indigo-300 rounded-xl px-4 py-2 text-base text-black focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition placeholder:text-gray-400 bg-white shadow-sm"
            value={form.minStock}
            onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
            placeholder="Masukkan stok minimum"
          />
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-base hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-bold text-base rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Pencil size={18} />}
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

/* =======================
   MODAL WRAPPER
======================= */

interface ModalWrapperProps {
  children: React.ReactNode;
  onClose: () => void;
  title: React.ReactNode;
}

function ModalWrapper({ children, onClose, title }: ModalWrapperProps) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
