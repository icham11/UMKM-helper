"use client"

import { useSession } from "next-auth/react"
import { useBusiness } from "@/context/BusinessContext"

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
    <div className="w-full text-center">
      <p className="text-xs text-gray-500 font-semibold">Logged In</p>

      <p className="mt-1 text-sm font-bold text-gray-800 truncate" title={userName}>
        {status === "loading" ? "Loading user..." : userName}
      </p>

      <p className="mt-0.5 text-xs text-gray-600 truncate" title={businessName}>
        {businessName}
      </p>
    </div>
  )
}
