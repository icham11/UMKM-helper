"use client"


import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"

// Helper to read cookie value
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : undefined;
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Redirect if already authenticated — role-aware
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = getCookie("token");
      if (token) {
        // Hard redirect via post-login route — handles role detection server-side
        window.location.replace("/api/auth/post-login");
      }
    }
  }, []);

  const handleEmailLogin = async () => {
    setError("")

    if (!email || !password) {
      setError("Email dan password wajib diisi")
      return
    }

    try {
      setLoading(true)

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }

      // Login success — redirect through server-side post-login route
      // which checks role (Cashier → /pos, Owner → /dashboard, no business → /onboarding)
      await new Promise((r) => setTimeout(r, 200)); // wait for cookie to set
      window.location.replace("/api/auth/post-login");
    } catch (err: any) {
      setError(err.message || "Login gagal")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-yellow-100 via-orange-100 to-pink-100">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl flex flex-col items-center">

        <img
          src="/globe.svg"
          alt="UMKM Helper Logo"
          className="w-16 h-16 mb-4 drop-shadow-md"
        />

        <h1 className="text-3xl font-extrabold text-center mb-2 text-orange-600 tracking-tight">
          Selamat Datang di UMKM Helper
        </h1>

        <p className="text-center text-gray-500 mb-6 text-sm">
          Platform cerdas untuk membantu UMKM berkembang lebih mudah dan efisien.
        </p>

        {/* Error message */}
        {error && (
          <div className="w-full mb-4 text-sm text-red-600 bg-red-100 p-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Email Login Form */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-orange-200 transition"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-orange-200 transition"
        />

        <button
          onClick={handleEmailLogin}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition mb-4"
        >
          {loading ? "Logging in..." : "Login dengan Email"}
        </button>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-xs text-gray-400">atau</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        {/* Google Login */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/api/auth/post-login" })}
          className="flex items-center justify-center gap-3 w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg shadow hover:bg-gray-50 transition mb-4"
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_17_40)">
              <path d="M47.532 24.552c0-1.636-.146-3.192-.418-4.667H24.48v8.844h12.98c-.56 3.016-2.24 5.57-4.77 7.29v6.06h7.72c4.52-4.164 7.12-10.3 7.12-17.527z" fill="#4285F4"/>
              <path d="M24.48 48c6.48 0 11.93-2.15 15.91-5.85l-7.72-6.06c-2.14 1.44-4.88 2.3-8.19 2.3-6.3 0-11.63-4.26-13.54-9.98H2.01v6.25C5.97 43.14 14.48 48 24.48 48z" fill="#34A853"/>
              <path d="M10.94 28.41a14.77 14.77 0 0 1 0-9.42v-6.25H2.01a24.01 24.01 0 0 0 0 21.92l8.93-6.25z" fill="#FBBC05"/>
              <path d="M24.48 9.5c3.53 0 6.67 1.22 9.15 3.62l6.84-6.84C36.41 2.15 30.96 0 24.48 0 14.48 0 5.97 4.86 2.01 12.34l8.93 6.25c1.91-5.72 7.24-9.98 13.54-9.98z" fill="#EA4335"/>
            </g>
            <defs>
              <clipPath id="clip0_17_40">
                <path fill="#fff" d="M0 0h48v48H0z"/>
              </clipPath>
            </defs>
          </svg>
          <span>Masuk dengan Google</span>
        </button>

        {/* Register Link */}
        <button
          onClick={() => router.push("/register")}
          className="w-full py-2 rounded-lg bg-linear-to-r from-blue-500 to-indigo-500 text-white font-bold text-base shadow hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
        >
          Belum punya akun? Daftar di sini
        </button>

        <div className="text-xs text-gray-400 mt-2 text-center">
          &copy; {new Date().getFullYear()} UMKM Helper. All rights reserved.
        </div>
      </div>
    </div>
  )
}