"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getCurrentBusiness } from "@/lib/api/business"

type Business = {
  id: string
  name: string
}

type BusinessContextType = {
  business: Business | null
  loading: boolean
  refreshBusiness: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchBusiness = useCallback(async () => {
    try {
      const data = await getCurrentBusiness()

      if (!data) {
        setBusiness(null)
        router.push("/onboarding")
        return
      }

      setBusiness(data)
    } catch (error) {
      console.error("Failed to fetch business:", error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchBusiness()
  }, [fetchBusiness])

  return (
    <BusinessContext.Provider
      value={{
        business,
        loading,
        refreshBusiness: fetchBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  const context = useContext(BusinessContext)
  if (!context) {
    throw new Error("useBusiness must be used inside BusinessProvider")
  }
  return context
}