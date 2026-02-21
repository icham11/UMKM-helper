"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Calendar, DollarSign } from "lucide-react";
import { InvoiceViewer } from "../../components/InvoiceViewer";

interface Sale {
  id: number;
  transactionNumber: string;
  totalRevenue: number;
  totalCost: number;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  createdAt: string;
  saleItems: Array<{
    id: number;
    quantity: number;
    priceAtSale: number;
    product: {
      name: string;
    };
  }>;
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All");

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/sales");
      const data = await response.json();

      if (data.success && data.data) {
        // API returns: { success: true, data: { sales: [...], analytics: {...} } }
        if (Array.isArray(data.data.sales)) {
          setSales(data.data.sales);
        } else if (Array.isArray(data.data)) {
          // Fallback: if data.data is directly an array
          setSales(data.data);
        } else {
          console.warn("API returned unexpected data structure:", data.data);
          setSales([]);
          setError("Invalid data format received");
        }
      } else if (data.error) {
        setSales([]);
        setError(data.error);
      } else {
        setSales([]);
        setError("Failed to fetch sales");
      }
    } catch (err) {
      setSales([]); // Ensure sales is always an array
      setError(err instanceof Error ? err.message : "Failed to fetch sales");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    // Guard: Ensure sales is an array
    if (!Array.isArray(sales)) {
      setFilteredSales([]);
      return;
    }

    let filtered = [...sales];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (sale) =>
          sale.transactionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sale.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Payment method filter
    if (paymentMethodFilter !== "All") {
      filtered = filtered.filter((sale) => sale.paymentMethod === paymentMethodFilter);
    }

    // Payment status filter
    if (paymentStatusFilter !== "All") {
      filtered = filtered.filter((sale) => sale.paymentStatus === paymentStatusFilter);
    }

    // Date filter
    if (dateFilter !== "All") {
      const now = new Date();
      filtered = filtered.filter((sale) => {
        const saleDate = new Date(sale.createdAt);
        const diffTime = now.getTime() - saleDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        switch (dateFilter) {
          case "Today":
            return diffDays < 1;
          case "Week":
            return diffDays < 7;
          case "Month":
            return diffDays < 30;
          default:
            return true;
        }
      });
    }

    setFilteredSales(filtered);
  }, [sales, searchQuery, paymentMethodFilter, paymentStatusFilter, dateFilter]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Calculate statistics
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + Number(sale.totalRevenue), 0);
  const totalProfit = filteredSales.reduce(
    (sum, sale) => sum + (Number(sale.totalRevenue) - Number(sale.totalCost)),
    0
  );
  const paidSales = filteredSales.filter((sale) => sale.paymentStatus === "Paid").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sales history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 py-8 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
              <p className="text-gray-600 mt-1">Riwayat transaksi dan penjualan</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchSales}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-linear-to-br from-blue-500 to-blue-600 p-4 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Transaksi</p>
                  <p className="text-2xl font-bold">{filteredSales.length}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-50" />
              </div>
            </div>

            <div className="bg-linear-to-br from-green-500 to-green-600 p-4 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold">Rp {totalRevenue.toLocaleString("id-ID")}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-50" />
              </div>
            </div>

            <div className="bg-linear-to-br from-purple-500 to-purple-600 p-4 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Profit</p>
                  <p className="text-2xl font-bold">Rp {totalProfit.toLocaleString("id-ID")}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-50" />
              </div>
            </div>

            <div className="bg-linear-to-br from-orange-500 to-orange-600 p-4 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Lunas</p>
                  <p className="text-2xl font-bold">{paidSales} / {filteredSales.length}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-50" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by transaction, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Payment Method Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="All">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="Transfer">Transfer</option>
                <option value="Digital">Digital</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="Week">This Week</option>
                <option value="Month">This Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <p className="text-lg font-medium">No sales found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{sale.transactionNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {sale.customerName || "Guest"}
                          </div>
                          {sale.customerEmail && (
                            <div className="text-gray-500 text-xs">{sale.customerEmail}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {sale.saleItems.reduce((sum, item) => sum + item.quantity, 0)} items
                        </div>
                        <div className="text-xs text-gray-500">
                          {sale.saleItems.slice(0, 2).map((item) => item.product.name).join(", ")}
                          {sale.saleItems.length > 2 && "..."}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          Rp {Number(sale.totalRevenue).toLocaleString("id-ID")}
                        </div>
                        <div className="text-xs text-gray-500">
                          Profit: Rp{" "}
                          {(Number(sale.totalRevenue) - Number(sale.totalCost)).toLocaleString(
                            "id-ID"
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {sale.paymentStatus === "Paid" ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            ✓ Paid
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(sale.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {sale.paymentStatus === "Paid" && (
                          <InvoiceViewer
                            saleId={sale.id}
                            transactionNumber={sale.transactionNumber}
                          />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}







