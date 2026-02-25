"use client";

import { useState, useEffect, useCallback } from "react";
import { Factory, Package, Plus, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface ReadyStockProduct {
  productId: number;
  productName: string;
  sellingPrice: string | number;
  recipeCost: string | number;
  availableStock: number;
}

interface ProductionBatch {
  id: number;
  productId: number;
  quantity: number;
  remainingQty: number;
  costPerUnit: string | number;
  producedAt: string;
  product: { id: number; name: string; sellingPrice: string | number };
}

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(val);

export default function ProductionPage() {
  const [summary, setSummary] = useState<ReadyStockProduct[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [producing, setProducing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Produce modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ReadyStockProduct | null>(null);
  const [produceQty, setProduceQty] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production?limit=50", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary ?? []);
        setBatches(data.data ?? []);
      }
    } catch {
      setError("Gagal memuat data produksi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProduce = async () => {
    if (!selectedProduct || produceQty <= 0) return;
    setProducing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: selectedProduct.productId,
          quantity: produceQty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal produksi");
      setSuccess(
        `Berhasil produksi ${produceQty}x ${selectedProduct.productName}. Biaya: ${formatRupiah(data.data.totalCost)}`,
      );
      setShowModal(false);
      setProduceQty(1);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses produksi");
    } finally {
      setProducing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header — matches indigo/purple theme */}
      <div className="bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-2xl p-4 sm:p-5 md:p-8 shadow-lg shadow-indigo-200/30">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <Factory className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
              Produksi
            </h1>
            <p className="text-indigo-200 mt-1 text-xs sm:text-sm">
              Kelola produksi produk Ready Stock. Bahan baku dikurangi saat diproduksi.
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/20 backdrop-blur-sm rounded-xl text-xs sm:text-sm font-medium text-white transition shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-xl p-4 text-sm border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 rounded-xl p-4 text-sm border border-indigo-100">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Ready Stock Products Summary */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Produk Ready Stock</h2>
            {summary.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-indigo-100">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Belum ada produk Ready Stock.</p>
                <p className="text-xs mt-1">Ubah tipe produk ke &quot;Ready Stock&quot; di halaman Products.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {summary.map((p) => (
                  <div
                    key={p.productId}
                    className="bg-white rounded-2xl border border-indigo-100 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition"
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{p.productName}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Harga jual: {formatRupiah(Number(p.sellingPrice))}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                          p.availableStock <= 0
                            ? "bg-red-100 text-red-600"
                            : p.availableStock <= 5
                              ? "bg-amber-100 text-amber-700"
                              : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {p.availableStock}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-400 truncate">
                        Biaya resep: {formatRupiah(Number(p.recipeCost))}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setProduceQty(1);
                          setShowModal(true);
                          setError(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Produksi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Production History */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Riwayat Produksi</h2>
            {batches.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-indigo-100">
                <p className="text-sm">Belum ada riwayat produksi.</p>
              </div>
            ) : (
              <>
                {/* ═══ MOBILE CARD VIEW ═══ */}
                <div className="md:hidden space-y-3">
                  {batches.map((b) => (
                    <div key={b.id} className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 space-y-2.5">
                      {/* Product name + date */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-900 text-sm leading-tight">{b.product.name}</h3>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                          {new Date(b.producedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex-1">
                          <span className="text-gray-400 block">Qty</span>
                          <span className="font-bold text-gray-700 text-sm">{b.quantity}</span>
                        </div>
                        <div className="flex-1">
                          <span className="text-gray-400 block">Sisa</span>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              b.remainingQty <= 0 ? "bg-gray-100 text-gray-400" : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {b.remainingQty}
                          </span>
                        </div>
                        <div className="flex-1">
                          <span className="text-gray-400 block">Biaya/unit</span>
                          <span className="font-bold text-indigo-700 text-sm">
                            {formatRupiah(Number(b.costPerUnit))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ═══ DESKTOP TABLE ═══ */}
                <div className="hidden md:block bg-white rounded-2xl border border-indigo-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-indigo-50/50 text-xs font-bold text-indigo-400 uppercase">
                        <th className="px-5 py-3 text-left">Produk</th>
                        <th className="px-5 py-3 text-center">Qty Produksi</th>
                        <th className="px-5 py-3 text-center">Sisa</th>
                        <th className="px-5 py-3 text-right">Biaya/unit</th>
                        <th className="px-5 py-3 text-right">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-50">
                      {batches.map((b) => (
                        <tr key={b.id} className="hover:bg-indigo-50/30 transition">
                          <td className="px-5 py-3 font-medium text-gray-900">{b.product.name}</td>
                          <td className="px-5 py-3 text-center">{b.quantity}</td>
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                b.remainingQty <= 0 ? "bg-gray-100 text-gray-400" : "bg-indigo-100 text-indigo-700"
                              }`}
                            >
                              {b.remainingQty}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-gray-600">{formatRupiah(Number(b.costPerUnit))}</td>
                          <td className="px-5 py-3 text-right text-gray-500">
                            {new Date(b.producedAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Produce Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900 mb-1">
              Produksi: {selectedProduct.productName}
            </h3>
            <p className="text-xs text-gray-500 mb-5">Bahan baku akan dikurangi otomatis sesuai resep produk.</p>

            <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Jumlah Produksi</label>
            <input
              type="number"
              min={1}
              max={999}
              value={produceQty}
              onChange={(e) => setProduceQty(Math.max(1, Number(e.target.value)))}
              className="w-full border border-indigo-200 rounded-xl px-4 py-3 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-indigo-400 outline-none mb-2"
            />
            <p className="text-xs text-gray-400 mb-5">
              Estimasi biaya: {formatRupiah(Number(selectedProduct.recipeCost) * produceQty)}
            </p>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-lg p-3 mb-4 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleProduce}
                disabled={producing || produceQty <= 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {producing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Factory className="w-4 h-4" />}
                Produksi {produceQty}x
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
