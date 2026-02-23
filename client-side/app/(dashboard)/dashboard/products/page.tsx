"use client";
import { useState, useEffect } from "react";
import { Plus, ChevronUp, ChevronDown, Tag, Pencil, ChefHat, Eye, Trash2, Loader2, AlertTriangle } from "lucide-react";
import type { Product, ProductCategory } from "@/types/product";
import { getProducts } from "@/lib/api/products";
import formatCurrency from "./formatCurrency";
import { useRouter } from "next/navigation";
import EditProductModal from "./EditProductModal";
import RecipeModal from "./RecipeModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import BulkDeleteConfirmModal from "./BulkDeleteConfirmModal";

type SortByField = "name" | "sellingPrice" | "createdAt" | "recipeCost" | "margin";
type SortOrderType = "asc" | "desc";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortByField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrderType>("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [avgSellingPrice, setAvgSellingPrice] = useState(0);
  const [avgMargin, setAvgMargin] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<Product | null>(null);
  const [deleteModal, setDeleteModal] = useState<Product | null>(null);
  const [recipeModal, setRecipeModal] = useState<Product | null>(null);
  const router = useRouter();

  const fetchProducts = async (pageOverride?: number) => {
  setLoading(true);
  setError(null);
  try {
      const { data, meta } = await getProducts({
        search,
        categoryId: categoryFilter ?? undefined,
  sortBy,
  sortOrder,
  page: pageOverride ?? page,
  });
  setProducts(data);
  setTotalPages(meta.totalPages);
  setTotalCount(meta.total);
  setAvgSellingPrice(meta.avgSellingPrice);
  setAvgMargin(meta.avgMargin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, sortBy, sortOrder]);

  const handleSortClick = (col: SortByField) => {
    if (sortBy === col) setSortOrder((o: SortOrderType): SortOrderType => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortByField }) =>
    sortBy !== col ? (
      <ChevronUp size={12} className="ml-1 text-gray-300" />
    ) : sortOrder === "asc" ? (
      <ChevronUp size={12} className="ml-1 text-indigo-500" />
    ) : (
      <ChevronDown size={12} className="ml-1 text-indigo-500" />
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  };

  const handleBulkDelete = async () => {
    // TODO: Implement bulk delete logic here
  };

  // ...continue with correct component logic here (conditional rendering, table, modals, etc.)

  return (
    <>
      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-center bg-linear-to-r from-indigo-500 via-violet-500 to-indigo-400 rounded-2xl p-6 shadow-lg">
          <div>
            <h1 className="text-3xl font-bold text-white">Produk</h1>
            <p className="text-indigo-100">Kelola produk dan resep bisnis Anda.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/products/create")}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl shadow hover:bg-indigo-50 transition"
          >
            <Plus size={20} />
            Tambah Produk
          </button>
        </div>

        {/* FILTER, SORT, PAGINATION CONTROLS (like ingredients) */}
        <div className="flex flex-wrap gap-2 items-center justify-between mb-2 px-1">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Cari nama produk..."
              className="px-3 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {categories.length > 0 && (
              <select
                className="px-2 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                value={categoryFilter ?? ""}
                onChange={(e) => {
                  setCategoryFilter(e.target.value === "" ? null : Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-500">Urutkan:</label>
            <select
              className="px-2 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortByField);
                setPage(1);
              }}
            >
              <option value="createdAt">Terbaru</option>
            </select>
            <button
              className="px-2 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              onClick={() => setSortOrder((d: SortOrderType): SortOrderType => (d === "asc" ? "desc" : "asc"))}
              title="Urutan"
            >
              {sortOrder === "asc" ? "⬆️" : "⬇️"}
            </button>
          </div>
        </div>

        {/* BULK ACTION BAR */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3">
            <span className="text-sm font-semibold text-indigo-700">{selectedIds.size} produk terpilih</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-white border border-gray-200 transition"
              >
                Batalkan semua
              </button>
              <button
                onClick={() => {
                  setBulkDeleteError(null);
                  setBulkDeleteOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition"
              >
                <Trash2 size={13} />
                Hapus terpilih
              </button>
            </div>
          </div>
        )}

        {/* STATS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow border border-indigo-50">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Total Produk</p>
            <p className="text-3xl font-extrabold text-indigo-700 mt-1">{totalCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow border border-violet-50">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Rata-rata Harga Jual</p>
            <p className="text-2xl font-extrabold text-violet-700 mt-1">
              {totalCount > 0 ? formatCurrency(avgSellingPrice) : "—"}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow border border-green-50">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Rata-rata Margin</p>
            <p className="text-2xl font-extrabold text-green-700 mt-1">{totalCount > 0 ? `${avgMargin}%` : "—"}</p>
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow">
            <Loader2 size={40} className="animate-spin text-indigo-400" />
            <p className="mt-4 text-sm font-semibold text-gray-400">Memuat produk...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow text-red-500">
            <AlertTriangle size={40} />
            <p className="mt-4 text-sm font-semibold">{error}</p>
            <button
              onClick={() => fetchProducts()}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
            >
              Coba lagi
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-3xl shadow">
            <ChefHat size={56} className="mb-4 text-indigo-200" />
            <p className="text-lg font-semibold">Belum ada produk.</p>
            <p className="text-sm mt-1">
              Klik{" "}
              <button
                onClick={() => router.push("/dashboard/products/create")}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Tambah Produk
              </button>{" "}
              untuk mulai.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-3xl shadow-xl overflow-x-auto">
              <table className="w-full min-w-160 text-base">
                <thead className="bg-linear-to-r from-indigo-50 to-violet-50 text-indigo-800 text-xs uppercase tracking-wider">
                  <tr>
                    {/* Select-all checkbox */}
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
                    <th
                      className="px-4 py-4 text-left font-bold cursor-pointer select-none"
                      onClick={() => handleSortClick("name")}
                    >
                      <span className="inline-flex items-center">
                        Produk <SortIcon col="name" />
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left font-bold">Kategori</th>
                    <th
                      className="px-6 py-4 text-right font-bold cursor-pointer select-none"
                      onClick={() => handleSortClick("sellingPrice")}
                    >
                      <span className="inline-flex items-center justify-end w-full">
                        Harga Jual <SortIcon col="sellingPrice" />
                      </span>
                    </th>
                    <th
                      className="px-6 py-4 text-right font-bold cursor-pointer select-none"
                      onClick={() => handleSortClick("recipeCost")}
                    >
                      <span className="inline-flex items-center justify-end w-full">
                        Biaya <SortIcon col="recipeCost" />
                      </span>
                    </th>
                    <th
                      className="px-6 py-4 text-right font-bold cursor-pointer select-none"
                      onClick={() => handleSortClick("margin")}
                    >
                      <span className="inline-flex items-center justify-end w-full">
                        Margin <SortIcon col="margin" />
                      </span>
                    </th>
                    <th
                      className="px-6 py-4 text-left font-bold cursor-pointer select-none"
                      onClick={() => handleSortClick("createdAt")}
                    >
                      <span className="inline-flex items-center">
                        Ditambahkan <SortIcon col="createdAt" />
                      </span>
                    </th>
                    <th className="px-6 py-4 text-center font-bold">Resep</th>
                    <th className="px-6 py-4 text-center font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const sp = Number(product.sellingPrice);
                    const rc = Number(product.recipeCost);
                    const margin = sp > 0 ? Math.round(((sp - rc) / sp) * 100) : 0;
                    const isSelected = selectedIds.has(product.id);
                    return (
                      <tr
                        key={product.id}
                        className={`border-t transition-all ${
                          isSelected ? "bg-indigo-50" : "bg-white hover:bg-indigo-50/40"
                        }`}
                      >
                        <td className="pl-5 pr-2 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(product.id)}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800">{product.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          {product.category ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
                              <Tag size={12} />
                              {product.category.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setEditModal(product)}
                            title="Edit harga jual"
                            className="group inline-flex items-center gap-1.5 justify-end w-full font-bold text-indigo-700 hover:text-indigo-900 transition"
                          >
                            <span>{formatCurrency(sp)}</span>
                            <Pencil
                              size={12}
                              className="opacity-0 group-hover:opacity-80 transition text-green-600 group-hover:text-green-900 shrink-0"
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600 font-medium">
                          {rc > 0 ? formatCurrency(rc) : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${
                              margin >= 50
                                ? "bg-green-100 text-green-700"
                                : margin >= 20
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {margin}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left text-xs text-gray-400 whitespace-nowrap">
                          {product.createdAt
                            ? new Date(product.createdAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {product.recipes.length > 0 ? (
                            <button
                              onClick={() => setRecipeModal(product)}
                              title="Lihat resep"
                              className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-violet-200 transition"
                            >
                              <ChefHat size={12} />
                              {product.recipes.length} bahan
                            </button>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setRecipeModal(product)}
                              title="Lihat resep"
                              className="p-2 rounded-full hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => setEditModal(product)}
                              title="Edit produk"
                              className="p-2 rounded-full hover:bg-green-50 text-green-600 hover:text-green-900 transition"
                            >
                              <Pencil size={16} className="text-green-600 hover:text-green-900" />
                            </button>
                            <button
                              onClick={() => setDeleteModal(product)}
                              title="Hapus produk"
                              className="p-2 rounded-full hover:bg-red-50 text-red-300 hover:text-red-600 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION BAR (like ingredients) */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-center gap-2 px-2 py-6 border-t rounded-b-3xl">
                <div className="flex items-center gap-6">
                  <button
                    className="px-6 py-2 rounded-full border border-indigo-200 bg-white text-indigo-600 font-bold shadow transition hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40 text-base"
                    disabled={page === 1 || loading}
                    onClick={() => fetchProducts(page - 1)}
                  >
                    ‹ Sebelumnya
                  </button>
                  <span className="text-base font-semibold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-full shadow-sm">
                    Halaman {page} dari {totalPages}
                  </span>
                  <button
                    className="px-6 py-2 rounded-full border border-indigo-200 bg-white text-indigo-600 font-bold shadow transition hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40 text-base"
                    disabled={page === totalPages || loading}
                    onClick={() => fetchProducts(page + 1)}
                  >
                    Selanjutnya ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {recipeModal && <RecipeModal product={recipeModal} onClose={() => setRecipeModal(null)} />}


      {/* Modal edit produk lengkap */}
      {editModal && (
        <EditProductModal
          product={editModal}
          categories={categories}
          onClose={() => setEditModal(null)}
          onSaved={(updated) => {
            setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setEditModal(null);
          }}
        />
      )}


      {deleteModal && (
        <DeleteConfirmModal
          product={deleteModal}
          onClose={() => setDeleteModal(null)}
          onDeleted={() => {
            setDeleteModal(null);
            fetchProducts(page);
          }}
        />
      )}

      {bulkDeleteOpen && (
        <BulkDeleteConfirmModal
          count={selectedIds.size}
          deleting={bulkDeleting}
          error={bulkDeleteError}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={handleBulkDelete}
        />
      )}
    </>
  );
}
