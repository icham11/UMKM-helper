"use client"

import { useRouter } from "next/navigation"

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = () => {
    // Delete cookie with all security flags to ensure proper cleanup
    const secureFlag = window.location.protocol === "https:" ? " secure;" : ""
    document.cookie = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; sameSite=lax;${secureFlag}`
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
