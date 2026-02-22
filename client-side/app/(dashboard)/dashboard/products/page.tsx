"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ShoppingBag,
  Search,
  AlertTriangle,
  Tag,
  ChefHat,
  Eye,
  Pencil,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Filter,
} from "lucide-react";
import {
  getProducts,
  getCategoryOptions,
  updateProductPrice,
  deleteProduct,
  bulkDeleteProducts,
} from "@/lib/api/products";
import { useBusiness } from "@/context/BusinessContext";
import type { Product } from "@/types/product";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

// Recipe modal

function RecipeModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const recipeCost = Number(product.recipeCost);
  const sellingPrice = Number(product.sellingPrice);
  const margin = sellingPrice > 0 ? Math.round(((sellingPrice - recipeCost) / sellingPrice) * 100) : 0;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-indigo-50 to-violet-50">
          <div>
            <div className="flex items-center gap-2">
              <ChefHat size={18} className="text-indigo-500" />
              <h2 className="text-lg font-extrabold text-indigo-700">{product.name}</h2>
            </div>
            {product.category && (
              <span className="inline-flex items-center gap-1 mt-1 bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                <Tag size={10} />
                {product.category.name}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition">
            <X size={18} />
          </button>
        </div>

        {/* Pricing summary */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 text-center">
          <div className="px-4 py-3">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Selling Price</p>
            <p className="text-sm font-extrabold text-indigo-700 mt-0.5">{formatCurrency(sellingPrice)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Recipe Cost</p>
            <p className="text-sm font-extrabold text-slate-700 mt-0.5">
              {recipeCost > 0 ? formatCurrency(recipeCost) : "—"}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Margin</p>
            <p
              className={`text-sm font-extrabold mt-0.5 ${
                margin >= 50 ? "text-green-600" : margin >= 20 ? "text-yellow-600" : "text-red-600"
              }`}
            >
              {sellingPrice > 0 ? `${margin}%` : "—"}
            </p>
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {product.recipes.length === 0 ? (
            <p className="text-center text-gray-400 italic py-8">No ingredients in this recipe.</p>
          ) : (
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                <div className="col-span-5">Ingredient</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-3 text-right">Cost</div>
              </div>
              {product.recipes.map((r) => {
                const costPerUnit = Number(r.ingredient.costPerUnit ?? 0);
                const rowCost = Number(r.quantity) * costPerUnit;
                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100"
                  >
                    <div className="col-span-5 font-medium text-slate-700 text-sm truncate">{r.ingredient.name}</div>
                    <div className="col-span-2 text-right text-sm text-gray-600">{Number(r.quantity)}</div>
                    <div className="col-span-2 text-sm text-gray-500">{r.ingredient.unit}</div>
                    <div className="col-span-3 text-right text-xs font-bold text-indigo-600">
                      {rowCost > 0 ? formatCurrency(rowCost) : "—"}
                    </div>
                  </div>
                );
              })}

              {/* Total */}
              {recipeCost > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-100 px-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Recipe Cost</span>
                  <span className="text-sm font-extrabold text-indigo-700">{formatCurrency(recipeCost)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Edit price modal

function EditPriceModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: (updated: Product) => void;
}) {
  const [price, setPrice] = useState(Number(product.sellingPrice));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const recipeCost = Number(product.recipeCost);
  const margin = price > 0 && recipeCost > 0 ? Math.round(((price - recipeCost) / price) * 100) : null;

  const handleSave = async () => {
    if (!price || price <= 0) {
      setError("Selling price must be greater than 0.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProductPrice(product.id, price);
      onSaved({ ...product, sellingPrice: Number(updated.sellingPrice) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update price");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-indigo-50 to-violet-50">
          <div>
            <h2 className="text-base font-extrabold text-indigo-700">Edit Selling Price</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-55">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-xl p-3 text-xs">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Selling Price (Rp)</label>
            <input
              type="number"
              min={1}
              autoFocus
              value={price}
              onChange={(e) => {
                setPrice(Number(e.target.value));
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="mt-1.5 w-full border border-indigo-200 rounded-xl px-4 py-2.5 text-base font-semibold focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            {recipeCost > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">
                Recipe cost: {formatCurrency(recipeCost)}
                {margin !== null && (
                  <>
                    {" — "}
                    <span
                      className={
                        margin >= 50
                          ? "text-green-600 font-semibold"
                          : margin >= 20
                            ? "text-yellow-600 font-semibold"
                            : "text-red-600 font-semibold"
                      }
                    >
                      {margin}% margin
                    </span>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Delete confirmation modal

function DeleteConfirmModal({
  product,
  onClose,
  onDeleted,
}: {
  product: Product;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteProduct(product.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
      setDeleting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">Delete Product?</h2>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-semibold text-slate-700">{product.name}</span> and its entire recipe will be
                permanently deleted. This cannot be undone.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-xl p-3 text-xs">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bulk delete confirmation modal

function BulkDeleteConfirmModal({
  count,
  deleting,
  error,
  onClose,
  onConfirm,
}: {
  count: number;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">
                Delete {count} Product{count !== 1 ? "s" : ""}?
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                All selected products and their recipes will be permanently deleted. This cannot be undone.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-xl p-3 text-xs">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition disabled:opacity-50"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete {count}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page

export default function ProductsPage() {
  const router = useRouter();
  const { business, loading: businessLoading } = useBusiness();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Filter / sort
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  // Default sort: latest created
  const [sortBy, setSortBy] = useState<"createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [avgSellingPrice, setAvgSellingPrice] = useState(0);
  const [avgMargin, setAvgMargin] = useState(0);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

  // Modal state
  const [recipeModal, setRecipeModal] = useState<Product | null>(null);
  const [editModal, setEditModal] = useState<Product | null>(null);
  const [deleteModal, setDeleteModal] = useState<Product | null>(null);

  const fetchProducts = async (pageNum = page) => {
    try {
      setLoading(true);
      setError(null);
      // recipeCost is a stored DB column; margin uses raw SQL on the server
      const apiSortBy =
        sortBy === "name" || sortBy === "sellingPrice" || sortBy === "recipeCost" || sortBy === "createdAt"
          ? sortBy
          : undefined;
      const apiSortArg = sortBy === "margin" ? "margin" : apiSortBy;
      const { data, meta } = await getProducts({
        search,
        categoryId: categoryFilter ?? undefined,
        sortBy: apiSortArg as "name" | "sellingPrice" | "createdAt" | undefined,
        sortOrder,
        page: pageNum,
        limit: 10,
      });
      setProducts(data);
      setPage(meta.page);
      setTotalPages(meta.totalPages);
      setTotalCount(meta.total);
      setAvgSellingPrice(meta.avgSellingPrice);
      setAvgMargin(meta.avgMargin);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  // Load category options once
  useEffect(() => {
    if (!business || businessLoading) return;
    getCategoryOptions()
      .then((cats) => setCategories(cats as { id: number; name: string }[]))
      .catch(() => {});
  }, [business, businessLoading]);

  // Debounced re-fetch on filter/sort/search changes — always resets to page 1
  useEffect(() => {
    if (!business) return;
    const timer = setTimeout(() => fetchProducts(1), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, sortBy, sortOrder, business]);

  const handleSortClick = (col: typeof sortBy) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
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
    setBulkDeleting(true);
    setBulkDeleteError(null);
    try {
      await bulkDeleteProducts(Array.from(selectedIds));
      setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch (err) {
      setBulkDeleteError(err instanceof Error ? err.message : "Failed to delete products");
    } finally {
      setBulkDeleting(false);
    }
  };

  if (businessLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-indigo-500 animate-pulse">
        <ShoppingBag size={48} />
        <span className="mt-4 text-lg font-semibold">Loading...</span>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-indigo-400">
        <ShoppingBag size={48} />
        <span className="mt-4 text-lg font-semibold">Anda belum memiliki bisnis.</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-center bg-linear-to-r from-indigo-500 via-violet-500 to-indigo-400 rounded-2xl p-6 shadow-lg">
          <div>
            <h1 className="text-3xl font-bold text-white">Products</h1>
            <p className="text-indigo-100">Kelola produk dan resep bisnis Anda.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/products/create")}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-semibold rounded-xl shadow hover:bg-indigo-50 transition"
          >
            <Plus size={20} />
            Add Product
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
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {categories.length > 0 && (
              <select
                className="px-2 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                value={categoryFilter ?? ""}
                onChange={e => { setCategoryFilter(e.target.value === "" ? null : Number(e.target.value)); setPage(1); }}
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-500">Sort:</label>
            <select
              className="px-2 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              value={sortBy}
              onChange={e => { setSortBy(e.target.value as "createdAt"); setPage(1); }}
            >
              <option value="createdAt">Terbaru</option>
            </select>
            <button
              className="px-2 py-2 rounded-xl border border-indigo-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
              onClick={() => setSortOrder(d => d === "asc" ? "desc" : "asc")}
              title="Urutan"
            >
              {sortOrder === "asc" ? "⬆️" : "⬇️"}
            </button>
          </div>
        </div>

        {/* BULK ACTION BAR */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3">
            <span className="text-sm font-semibold text-indigo-700">
              {selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""} selected
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
                  setBulkDeleteError(null);
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

        {/* STATS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow border border-indigo-50">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Total Products</p>
            <p className="text-3xl font-extrabold text-indigo-700 mt-1">{totalCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow border border-violet-50">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Avg Selling Price</p>
            <p className="text-2xl font-extrabold text-violet-700 mt-1">
              {totalCount > 0 ? formatCurrency(avgSellingPrice) : "—"}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow border border-green-50">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Avg Margin</p>
            <p className="text-2xl font-extrabold text-green-700 mt-1">{totalCount > 0 ? `${avgMargin}%` : "—"}</p>
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow">
            <Loader2 size={40} className="animate-spin text-indigo-400" />
            <p className="mt-4 text-sm font-semibold text-gray-400">Loading products...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow text-red-500">
            <AlertTriangle size={40} />
            <p className="mt-4 text-sm font-semibold">{error}</p>
            <button
              onClick={() => fetchProducts()}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
            >
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-3xl shadow">
            <ChefHat size={56} className="mb-4 text-indigo-200" />
            <p className="text-lg font-semibold">No products yet.</p>
            <p className="text-sm mt-1">
              Click{" "}
              <button
                onClick={() => router.push("/dashboard/products/create")}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Add Product
              </button>{" "}
              to get started.
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
                        Product <SortIcon col="name" />
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left font-bold">Category</th>
                    <th
                      className="px-6 py-4 text-right font-bold cursor-pointer select-none"
                      onClick={() => handleSortClick("sellingPrice")}
                    >
                      <span className="inline-flex items-center justify-end w-full">
                        Selling Price <SortIcon col="sellingPrice" />
                      </span>
                    </th>
                    <th
                      className="px-6 py-4 text-right font-bold cursor-pointer select-none"
                      onClick={() => handleSortClick("recipeCost")}
                    >
                      <span className="inline-flex items-center justify-end w-full">
                        Cost <SortIcon col="recipeCost" />
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
                        Added <SortIcon col="createdAt" />
                      </span>
                    </th>
                    <th className="px-6 py-4 text-center font-bold">Recipe</th>
                    <th className="px-6 py-4 text-center font-bold">Actions</th>
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
                            title="Edit selling price"
                            className="group inline-flex items-center gap-1.5 justify-end w-full font-bold text-indigo-700 hover:text-indigo-900 transition"
                          >
                            <span>{formatCurrency(sp)}</span>
                            <Pencil
                              size={12}
                              className="opacity-0 group-hover:opacity-60 transition text-indigo-400 shrink-0"
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
                              title="View recipe"
                              className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-violet-200 transition"
                            >
                              <ChefHat size={12} />
                              {product.recipes.length} items
                            </button>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setRecipeModal(product)}
                              title="View recipe"
                              className="p-2 rounded-full hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteModal(product)}
                              title="Delete product"
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
                    ‹ Previous
                  </button>
                  <span className="text-base font-semibold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-full shadow-sm">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="px-6 py-2 rounded-full border border-indigo-200 bg-white text-indigo-600 font-bold shadow transition hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40 text-base"
                    disabled={page === totalPages || loading}
                    onClick={() => fetchProducts(page + 1)}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {recipeModal && <RecipeModal product={recipeModal} onClose={() => setRecipeModal(null)} />}

      {editModal && (
        <EditPriceModal
          product={editModal}
          onClose={() => setEditModal(null)}
          onSaved={(updated) => {
            setProducts((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, sellingPrice: updated.sellingPrice } : p)),
            );
            setEditModal(null);
          }}
        />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          product={deleteModal}
          onClose={() => setDeleteModal(null)}
          onDeleted={() => {
            setProducts((prev) => prev.filter((p) => p.id !== deleteModal.id));
            setDeleteModal(null);
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
