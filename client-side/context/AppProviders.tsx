"use client"

import { BusinessProvider } from "./BusinessContext"

export default function AppProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BusinessProvider>
      {children}
    </BusinessProvider>
  )
}