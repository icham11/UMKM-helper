import { apiFetch } from "@/lib/api/client"

export type Ingredient = {
  id: number
  name: string
  unit: string
  stock: number
  minStock: number
  costPerUnit: number
}

export async function getIngredients(): Promise<Ingredient[]> {
  return apiFetch("/api/mock-ingredients")
}