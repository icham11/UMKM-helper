"use client"

import { useSession } from "next-auth/react"
import { useBusiness } from "@/context/BusinessContext"
import LogoutButton from "./LogoutButton"

type Props = {
  jwtUserName?: string
  jwtUserEmail?: string
}

export default function SidebarUserInfo({ jwtUserName, jwtUserEmail }: Props) {
  const { data: session, status } = useSession()
  const { business, loading } = useBusiness()

  const userName =
    session?.user?.name?.trim() ||
    jwtUserName?.trim() ||
    session?.user?.email?.trim() ||
    jwtUserEmail?.trim() ||
    "User"

  const businessName = loading ? "Loading business..." : business?.name ?? "No business"

  return (
    <div className="w-full flex flex-col items-center py-4">
      {/* Avatar/Icon */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-200 via-blue-100 to-white flex items-center justify-center mb-4 shadow-lg mx-auto">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto">
          <circle cx="12" cy="12" r="12" fill="#e0e7ff" />
          <path d="M12 13c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.66-5.33-4-8-4z" fill="#4f46e5" />
        </svg>
      </div>
      <div className="mb-1 text-xs text-gray-500 font-semibold">Logged In</div>
      <div className="text-base font-bold text-gray-800 truncate" title={userName}>
        {status === "loading" ? "Loading user..." : userName}
      </div>
      <div className="mt-0.5 text-xs text-blue-700 font-medium truncate" title={businessName}>
        {businessName}
      </div>
      {/* Logout button */}
      <div className="mt-3 w-full flex justify-center">
        <LogoutButton />
      </div>
    </div>
  )
}
