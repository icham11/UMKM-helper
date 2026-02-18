"use client"

import { SessionProvider } from "next-auth/react"
import { BusinessProvider } from "./BusinessContext"

export default function AppProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <BusinessProvider>
        {children}
      </BusinessProvider>
    </SessionProvider>
  )
}