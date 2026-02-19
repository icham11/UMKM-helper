import { apiFetch } from "@/lib/api/client"

export type Ingredient = {
  id: number
  name: string
  unit: string
  minStock: number
  stock: number
}

export async function getIngredients(): Promise<Ingredient[]> {
  return apiFetch("/api/ingredients")
}