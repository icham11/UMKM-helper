"use client"

import { signIn } from "next-auth/react"

export default function LoginPage() {
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

        <p className="text-center text-gray-500 mb-8 text-sm">
          Platform cerdas untuk membantu UMKM berkembang lebih mudah dan efisien.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          className="flex items-center justify-center gap-3 w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg shadow hover:bg-gray-50 transition mb-4"
        >
          {/* Google Icon */}
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

        <div className="text-xs text-gray-400 mt-2 text-center">
          &copy; {new Date().getFullYear()} UMKM Helper. All rights reserved.
        </div>
      </div>
    </div>
  )
}