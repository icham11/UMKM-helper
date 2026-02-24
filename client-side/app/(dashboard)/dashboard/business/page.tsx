"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBusiness } from "@/context/BusinessContext";
import { apiFetch } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  Percent,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
  BarChart3,
  Boxes,
  Loader2,
  RefreshCw,
  Star,
  ArrowRightLeft,
  AlertTriangle,
  Smile,
// Greeting logic (copied from dashboard)

} from "lucide-react";
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Pagi";
  if (hour < 18) return "Siang";
  return "Malam";
}
// InventoryAlertModal component for displaying inventory alerts
function InventoryAlertModal({
  alerts,
  onClose,
}: {
  alerts: {
    expired: { name: string; expirationDate?: string }[];
    expiring3: { name: string; expirationDate?: string }[];
    expiring7: { name: string; expirationDate?: string }[];
    lowStock: { name: string; currentStock?: number; minStock?: number }[];
  };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-amber-700">
          <AlertTriangle className="w-5 h-5" /> Peringatan Stok
        </h2>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {alerts.expired.length > 0 && (
            <div>
              <p className="font-semibold text-red-600 mb-1">Kadaluarsa:</p>
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {alerts.expired.map((item, idx) => (
                  <li key={`expired-${idx}`}>
                    {item.name} {item.expirationDate && <span className="text-xs text-gray-400">({formatDate(item.expirationDate)})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {alerts.expiring3.length > 0 && (
            <div>
              <p className="font-semibold text-orange-500 mb-1">Kadaluarsa 3 hari lagi:</p>
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {alerts.expiring3.map((item, idx) => (
                  <li key={`exp3-${idx}`}>
                    {item.name} {item.expirationDate && <span className="text-xs text-gray-400">({formatDate(item.expirationDate)})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {alerts.expiring7.length > 0 && (
            <div>
              <p className="font-semibold text-yellow-500 mb-1">Kadaluarsa 7 hari lagi:</p>
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {alerts.expiring7.map((item, idx) => (
                  <li key={`exp7-${idx}`}>
                    {item.name} {item.expirationDate && <span className="text-xs text-gray-400">({formatDate(item.expirationDate)})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {alerts.lowStock.length > 0 && (
            <div>
              <p className="font-semibold text-pink-600 mb-1">Stok Rendah:</p>
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {alerts.lowStock.map((item, idx) => (
                  <li key={`lowstock-${idx}`}>
                    {item.name}{" "}
                    <span className="text-xs text-gray-400">
                      (Stock: {item.currentStock ?? "-"} / Min: {item.minStock ?? "-"})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {alerts.expired.length === 0 &&
            alerts.expiring3.length === 0 &&
            alerts.expiring7.length === 0 &&
            alerts.lowStock.length === 0 && (
              <div className="text-center text-green-600 font-semibold py-6">
                Semua stok aman 👍
              </div>
            )}
        </div>
      </div>
    </div>
  );

  // Modal harus dipanggil di luar return utama agar tidak tertutup elemen lain
  return (
    <>
      {/* ...existing return content... */}
    </>
  );
}

interface BusinessData {
  id: number;
  name: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    products: number;
    ingredients: number;
    categories: number;
    sales: number;
  };
  stats: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    paidSalesCount: number;
    marginAvg: number | null;
  };
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function BusinessPage() {
  const { business, refreshBusiness, switchBusiness } = useBusiness();
  const [data, setData] = useState<BusinessData | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<BusinessData[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<number | null>(null);
  interface AlertItem {
    name: string;
    expirationDate?: string;
    currentStock?: number;
    minStock?: number;
  }

  interface InventoryBatch {
    expirationDate?: string;
  }

  interface Ingredient {
    name: string;
    currentStock: number;
    minStock: number;
    inventoryBatches?: InventoryBatch[];
  }

  const [alerts, setAlerts] = useState({
    expired: [] as AlertItem[],
    expiring3: [] as AlertItem[],
    expiring7: [] as AlertItem[],
    lowStock: [] as AlertItem[],
  });
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [locationVal, setLocationVal] = useState("");
  const [saving, setSaving] = useState(false);

  // New business form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchBusiness = useCallback(async () => {
    if (!business?.id) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/businesses/${business.id}`);
      if (res.success) {
        setData(res.data);
        setNameVal(res.data.name);
        setLocationVal(res.data.location || "");
      }
    } catch {
      toast.error("Gagal memuat data bisnis");
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  const fetchInventoryAlerts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/ingredients?withBatches=true");
      if (!res.success) return;

      const today = new Date();
      const expired: AlertItem[] = [];
      const expiring3: AlertItem[] = [];
      const expiring7: AlertItem[] = [];
      const lowStock: AlertItem[] = [];

      res.data.forEach((ingredient: Ingredient) => {
        if (ingredient.currentStock < ingredient.minStock) {
          lowStock.push({
            name: ingredient.name,
            currentStock: ingredient.currentStock,
            minStock: ingredient.minStock,
          });
        }

        ingredient.inventoryBatches?.forEach((batch: InventoryBatch) => {
          if (!batch.expirationDate) return;

          const expDate = new Date(batch.expirationDate);
          const diffDays = (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

          if (diffDays < 0)
            expired.push({
              name: ingredient.name,
              expirationDate: batch.expirationDate,
            });
          else if (diffDays <= 3)
            expiring3.push({
              name: ingredient.name,
              expirationDate: batch.expirationDate,
            });
          else if (diffDays <= 7)
            expiring7.push({
              name: ingredient.name,
              expirationDate: batch.expirationDate,
            });
        });
      });

      setAlerts({ expired, expiring3, expiring7, lowStock });
    } catch {}
  }, []);

  const fetchAllBusinesses = useCallback(async () => {
    try {
      const res = await apiFetch("/api/businesses");
      if (res.success) setAllBusinesses(res.data);
    } catch { /* silent */ }
  }, []);

  const totalAlertCount =
    alerts.expired.length + alerts.expiring3.length + alerts.expiring7.length + alerts.lowStock.length;
  const alertPulse = totalAlertCount > 0 ? "animate-pulse" : "";

  useEffect(() => {
    fetchBusiness();
    fetchAllBusinesses();
    fetchInventoryAlerts();
  }, [fetchBusiness, fetchAllBusinesses, fetchInventoryAlerts]);

  async function handleSave(field: "name" | "location") {
    if (!data) return;
    setSaving(true);
    try {
      const body = field === "name" ? { name: nameVal } : { location: locationVal };
      const res = await apiFetch(`/api/businesses/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (res.success) {
        toast.success(`${field === "name" ? "Nama" : "Lokasi"} bisnis berhasil diperbarui`);
        setEditingName(false);
        setEditingLocation(false);
        await fetchBusiness();
        await refreshBusiness();
      }
    } catch {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return toast.error("Nama bisnis wajib diisi");
    setCreating(true);
    try {
      const res = await apiFetch("/api/businesses", {
        method: "POST",
        body: JSON.stringify({ name: newName, location: newLocation || null }),
      });
      if (res.success) {
        toast.success("Bisnis baru berhasil ditambahkan!");
        setShowNewForm(false);
        setNewName("");
        setNewLocation("");
        await fetchAllBusinesses();
        await refreshBusiness();
      }
    } catch {
      toast.error("Gagal membuat bisnis");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Hapus bisnis "${name}"? Semua data akan hilang.`)) return;
    try {
      const res = await apiFetch(`/api/businesses/${id}`, { method: "DELETE" });
      if (res.success) {
        toast.success("Bisnis berhasil dihapus");
        await fetchAllBusinesses();
        await refreshBusiness();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus bisnis");
    }
  }

  async function handleSwitch(id: number, name: string) {
    setSwitching(id);
    try {
      await switchBusiness(id);
      toast.success(`Beralih ke "${name}"`);
      // Re-fetch active business detail
      await fetchBusiness();
      await fetchAllBusinesses();
    } catch {
      toast.error("Gagal beralih bisnis");
    } finally {
      setSwitching(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const stats = data?.stats;
  const counts = data?._count;

  return (
    <div className="space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2.5 bg-linear-to-br from-indigo-500 to-purple-500 rounded-xl text-white">
              <Building2 className="w-7 h-7" />
            </div>
            Bisnis Saya
          </h1>
          <p className="text-gray-500 mt-1">Kelola informasi dan performa bisnis Anda</p>
        </div>
        <button
          onClick={() => { fetchBusiness(); fetchAllBusinesses(); }}
          className="self-start flex items-center gap-2 px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </motion.div>
      {/* Greeting Banner */}
        <div className="bg-linear-to-r from-indigo-500 via-violet-500 to-indigo-400 rounded-3xl p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Smile className="text-yellow-300" size={30} />
              Selamat {getGreeting()}, Semangat untuk mengelola bisnis Anda hari ini!
          </h1>
        </div>
      {/* Active Business Card */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100"
        >
          {/* Decorative gradient bar */}
          <div className="h-2 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500" />

          <div className="p-6 sm:p-8">
            {/* Business badge */}
            {/* Top Row */}
              <div className="flex items-start justify-between mb-6 gap-8 flex-col md:flex-row">
                {/* LEFT: Info bisnis */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                      <Star className="w-3 h-3" /> Bisnis Aktif
                    </span>
                    <span className="text-xs text-gray-400">ID: #{data.id}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
                    {editingName ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          value={nameVal}
                          onChange={(e) => setNameVal(e.target.value)}
                          className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleSave("name")}
                        />
                        <button onClick={() => handleSave("name")} disabled={saving} className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 cursor-pointer disabled:opacity-50">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingName(false); setNameVal(data.name); }} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 group">
                        <h2 className="text-2xl font-bold text-gray-900">{data.name}</h2>
                        <button onClick={() => setEditingName(true)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-pink-400 shrink-0" />
                    {editingLocation ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          value={locationVal}
                          onChange={(e) => setLocationVal(e.target.value)}
                          placeholder="Masukkan lokasi bisnis..."
                          className="flex-1 px-3 py-2 border border-pink-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-300"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleSave("location")}
                        />
                        <button onClick={() => handleSave("location")} disabled={saving} className="p-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 cursor-pointer disabled:opacity-50">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingLocation(false); setLocationVal(data.location || ""); }} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 group">
                        <span className="text-gray-600">{data.location || "Belum diatur"}</span>
                        <button onClick={() => setEditingLocation(true)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all cursor-pointer">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <Calendar className="w-5 h-5 shrink-0" />
                    Bergabung sejak {formatDate(data.createdAt)}
                  </div>
                </div>
                {/* RIGHT: Inventory Alert Card */}
                <div className="flex gap-6 mt-6 md:mt-0">
                  <div
                    className="relative group bg-linear-to-r from-amber-100 via-amber-50 to-white border border-amber-200 rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-amber-300/40 transition flex items-center justify-between w-90"
                    onClick={() => setIsAlertOpen(true)}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`rounded-full bg-amber-200 p-3 shadow-md ${alertPulse}`}> 
                        <AlertTriangle className="text-amber-600" size={28} />
                      </span>
                      <div>
                        <p className="font-semibold text-amber-700 text-lg flex items-center gap-2">
                          Peringatan Stok
                          {totalAlertCount > 0 && (
                            <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">
                              {totalAlertCount}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-amber-600 mt-1">
                          {totalAlertCount > 0 ? `${totalAlertCount} stok bahan baku perlu dicek` : "Semua stok aman 👍"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Financial Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatTile icon={DollarSign} label="Total Pendapatan" value={formatRupiah(stats.totalRevenue)} color="emerald" />
                <StatTile icon={TrendingUp} label="Total Profit" value={formatRupiah(stats.totalProfit)} color="blue" />
                <StatTile icon={ShoppingCart} label="Transaksi Lunas" value={String(stats.paidSalesCount)} color="purple" />
                <StatTile icon={Percent} label="Margin Rata-rata" value={stats.marginAvg != null ? `${stats.marginAvg.toFixed(1)}%` : "—"} color="amber" />
              </div>
            )}

            {/* Operational Stats */}
            {counts && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat icon={Package} label="Produk" value={counts.products} />
                <MiniStat icon={Boxes} label="Bahan" value={counts.ingredients} />
                <MiniStat icon={BarChart3} label="Kategori" value={counts.categories} />
                <MiniStat icon={ShoppingCart} label="Total Penjualan" value={counts.sales} />
              </div>
            )}
          </div>
        </motion.div>
      )}
            {isAlertOpen && (
        <InventoryAlertModal
          alerts={alerts}
          onClose={() => setIsAlertOpen(false)}
        />
      )}

      {/* All Businesses List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Daftar Bisnis</h3>
            <p className="text-sm text-gray-500">{allBusinesses.length} bisnis terdaftar</p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 transition shadow-md shadow-indigo-100 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Bisnis
          </button>
        </div>

        {/* New Business Form */}
        <AnimatePresence>
          {showNewForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="p-6 bg-indigo-50/50 border-b border-indigo-100">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nama bisnis *"
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Lokasi (opsional)"
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newName.trim()}
                    className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Simpan"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Business List */}
        <div className="divide-y divide-gray-50">
          {allBusinesses.map((biz, i) => (
            <motion.div
              key={biz.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className={`flex items-center justify-between p-5 hover:bg-gray-50/50 transition ${
                String(biz.id) === String(business?.id) ? "bg-indigo-50/30" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                  String(biz.id) === String(business?.id)
                    ? "bg-linear-to-br from-indigo-500 to-purple-500"
                    : "bg-gray-300"
                }`}>
                  {biz.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{biz.name}</p>
                    {String(biz.id) === String(business?.id) && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">AKTIF</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{biz.location || "Tidak ada lokasi"}</p>
                </div>
              </div>
              {allBusinesses.length > 1 && String(biz.id) !== String(business?.id) && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSwitch(biz.id, biz.name)}
                    disabled={switching === biz.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer disabled:opacity-50"
                    title="Beralih ke bisnis ini"
                  >
                    {switching === biz.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    )}
                    Switch
                  </button>
                  <button
                    onClick={() => handleDelete(biz.id, biz.name)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Hapus bisnis"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StatTile({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "from-emerald-50 to-emerald-100/50 border-emerald-100 text-emerald-700",
    blue: "from-blue-50 to-blue-100/50 border-blue-100 text-blue-700",
    purple: "from-purple-50 to-purple-100/50 border-purple-100 text-purple-700",
    amber: "from-amber-50 to-amber-100/50 border-amber-100 text-amber-700",
  };
  const iconColorMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <div className={`p-4 rounded-xl bg-linear-to-br border ${colorMap[color]}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${iconColorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

