import Link from "next/link";
import { Search, Home, ArrowLeft, MapPin } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Big Number */}
        <div className="relative mb-6">
          <h1 className="text-[10rem] font-black text-transparent bg-clip-text bg-linear-to-b from-blue-200 to-blue-100 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 bg-white rounded-2xl shadow-xl border border-blue-100">
              <MapPin className="w-10 h-10 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 px-8 py-8 mx-auto">
          <h2 className="text-2xl font-bold text-gray-900">Halaman Tidak Ditemukan</h2>
          <p className="text-gray-500 mt-3 text-sm leading-relaxed max-w-sm mx-auto">
            Sepertinya halaman yang kamu cari sudah dipindahkan, dihapus,
            atau mungkin belum pernah ada. 🤔
          </p>

          {/* Search hint */}
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-xl mt-6 border border-blue-100">
            <Search className="w-4 h-4 text-blue-400 shrink-0" />
            <p className="text-xs text-blue-600">
              Cek URL-nya apakah sudah benar, atau navigasi menggunakan tombol di bawah
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md shadow-blue-100 active:scale-[0.98]"
            >
              <Home className="w-4 h-4" />
              Beranda
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 mt-6">
          UMKM Helper — Kembali ke jalan yang benar ✨
        </p>
      </div>
    </div>
  );
}


