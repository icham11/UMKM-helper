"use client"

import { useRouter } from "next/navigation"

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
    router.push("/login")
  }

  return (
    <button
      onClick={handleLogout}
      className="mt-2 text-red-500 text-sm font-semibold"
    >
      Logout
    </button>
  )
}
