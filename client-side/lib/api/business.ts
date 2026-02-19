import { apiFetch } from "./client"

export type Business = {
  id: string
  name: string
  location: string
}

// 🔹 GET current business
export async function getCurrentBusiness(): Promise<Business | null> {
  try {
    const result = await apiFetch("/api/businesses")

    if (!result?.success) return null

    return result.data[0] ?? null
  } catch {
    return null
  }
}

// 🔹 CREATE business
export async function createBusiness(data: {
  name: string
  location: string
}) {
  return apiFetch("/api/businesses", {   // ✅ FIXED
    method: "POST",
    body: JSON.stringify(data),
  })
}