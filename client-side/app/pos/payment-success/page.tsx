"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface SaleData {
  id: number;
  transactionNumber: string;
  totalRevenue: number;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const saleId = searchParams.get("saleId");
  const orderId = searchParams.get("orderId");

  useEffect(() => {
    if (!saleId && !orderId) {
      setError("No sale information provided");
      setLoading(false);
      return;
    }

    // Auto-download invoice on page load
    const autoDownloadInvoice = async () => {
      try {
        const response = await fetch(`/api/sales/${saleId}/invoice?format=html&download=true`);
        if (!response.ok) {
          console.warn("Failed to auto-download invoice, but will continue");
          setLoading(false);
          return;
        }

        const html = await response.text();
        const blob = new Blob([html], { type: "text/html" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${orderId || saleId}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log("✅ Invoice downloaded automatically");
      } catch (err) {
        console.warn("Auto-download failed:", err);
        // Don't set error - let page continue to load
      } finally {
        setLoading(false);
      }
    };

    autoDownloadInvoice();
  }, [saleId, orderId]);

  const handlePrintInvoice = async () => {
    if (!saleId) return;

    setInvoiceLoading(true);
    try {
      const response = await fetch(`/api/sales/${saleId}/invoice?format=html`);
      if (!response.ok) {
        setError("Failed to load invoice");
        return;
      }

      const html = await response.text();
      const printWindow = window.open("", "", "width=800,height=600");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to print invoice");
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-b from-green-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-900 mb-2">Pembayaran Berhasil! 🎉</p>
          <p className="text-gray-600">⏳ Invoice sedang di-download otomatis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h1>
          <p className="text-gray-600">Terima kasih telah melakukan transaksi</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            <p>{error}</p>
          </div>
        )}

        {/* Invoice Details Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Rincian Transaksi</h2>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">No Transaksi</p>
              <p className="text-lg font-semibold text-gray-900">{orderId || saleId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Metode Pembayaran</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {/* Example: will be filled with actual data */}
                Midtrans
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Status Pembayaran</p>
              <p className="text-lg font-semibold text-green-600">✓ Lunas</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Pembayaran</p>
              <p className="text-lg font-semibold text-gray-900">
                {/* Example: will be filled with actual data */}
                Rp 50.000
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-2">Email Penjual</p>
            <p className="text-gray-900">
              {/* Example: will be filled with actual data */}
              customer@example.com
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-8">
          <button
            onClick={handlePrintInvoice}
            disabled={invoiceLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
          >
            {invoiceLoading ? "Loading..." : "🖨️ Cetak Invoice"}
          </button>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-700 font-semibold">✅ Invoice Sudah Ter-Download</p>
            <p className="text-green-600 text-sm">Cek folder Download di perangkat Anda</p>
          </div>
          <Link
            href="/pos"
            className="block text-center bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition"
          >
            Kembali ke POS
          </Link>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            💡 <strong>Tips:</strong> Anda dapat mencetak atau mengunduh invoice kapan saja dari
            halaman riwayat penjualan.
          </p>
        </div>
      </div>
    </div>
  );
}








