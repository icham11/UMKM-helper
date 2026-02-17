"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Password tidak sama");
      return;
    }
    setLoading(true);
    // TODO: Ganti dengan logic register API
    setTimeout(() => {
      setLoading(false);
      router.push("/login");
    }, 1200);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 px-4 py-8">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl flex flex-col items-center">
        <span className="bg-gradient-to-br from-yellow-200 to-orange-200 p-3 rounded-full mb-2 shadow">
          <UserPlus size={32} className="text-orange-600" />
        </span>
        <h1 className="text-3xl font-extrabold text-center mb-2 text-orange-600 tracking-tight">Buat Akun Baru</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">Daftar untuk mulai mengelola UMKM Anda</p>
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-orange-700 text-sm font-semibold mb-1">Nama Lengkap</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white/90 text-orange-900"
              placeholder="Nama Lengkap"
            />
          </div>
          <div>
            <label className="block text-orange-700 text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white/90 text-orange-900"
              placeholder="Email"
            />
          </div>
          <div className="relative">
            <label className="block text-orange-700 text-sm font-semibold mb-1">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white/90 text-orange-900 pr-10"
              placeholder="Password"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-8 text-orange-400 hover:text-orange-600"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <div className="relative">
            <label className="block text-orange-700 text-sm font-semibold mb-1">Konfirmasi Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-400 focus:outline-none bg-white/90 text-orange-900 pr-10"
              placeholder="Konfirmasi Password"
            />
          </div>
          {error && <div className="text-red-500 text-sm text-center font-semibold">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 mt-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-lg shadow hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>
        <div className="mt-6 text-center text-orange-600 text-sm">
          Sudah punya akun?{' '}
          <button
            className="font-bold underline hover:text-indigo-600 transition"
            onClick={() => router.push("/login")}
          >
            Login di sini
          </button>
        </div>
      </div>
    </div>
  );
}
