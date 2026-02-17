"use client"

import { signOut } from "next-auth/react"

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="mt-6 bg-white text-black px-3 py-1 rounded text-sm"
    >
      Logout
    </button>
  )
}