"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBusiness } from "@/lib/api/business"
import { useBusiness } from "@/context/BusinessContext"

export default function OnboardingPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState("")
  const [location, setLocation] = useState("")
  const { refreshBusiness } = useBusiness()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
  if (!businessName || !location) {
    alert("Please fill all fields")
    return
  }

  try {
    setLoading(true)

    await createBusiness({
      name: businessName,
      location,
    })

    await refreshBusiness()

    router.push("/home")

  } catch (error) {
    console.error(error)
    alert("Failed to create business")
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-yellow-100 via-orange-100 to-pink-100">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl flex flex-col items-center">
        <img
          src="/window.svg"
          alt="Onboarding Illustration"
          className="w-20 h-20 mb-4 drop-shadow-md"
        />
        <h1 className="text-2xl font-extrabold text-center mb-2 text-orange-600 tracking-tight">
          Lengkapi Profil Usaha Anda
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Data ini akan membantu UMKM Helper memberikan insight dan fitur terbaik untuk bisnis Anda.
        </p>

        <input
          type="text"
          placeholder="Nama Usaha"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-orange-200 transition"
        />

        <input
          type="text"
          placeholder="Lokasi Usaha"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-orange-200 transition"
        />

        <button
          onClick={handleSubmit}
          className="w-full bg-linear-to-r from-orange-400 to-pink-400 text-white font-bold py-3 rounded-lg shadow hover:opacity-90 transition"
        >
          Lanjutkan
        </button>
        <div className="text-xs text-gray-400 mt-6 text-center">
          &copy; {new Date().getFullYear()} UMKM Helper
        </div>
      </div>
    </div>
  )
}