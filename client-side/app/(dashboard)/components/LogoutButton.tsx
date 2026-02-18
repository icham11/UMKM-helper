"use client"

import { signOut, useSession } from "next-auth/react"

export default function LogoutButton() {
  const { data: session } = useSession()

  const handleLogout = async () => {
    // If logged in via NextAuth (Google), sign out via NextAuth
    if (session) {
      await signOut({ callbackUrl: "/login" })
    } else {
      // If logged in via JWT (email/password), clear cookie
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
      window.location.href = "/login"
    }
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
