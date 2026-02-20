export type Ingredient = {
  currentStock: number
  id: string
  name: string
  unit: string
  stock: number
  minStock: number
  costPerUnit: number
}

export async function getIngredients(): Promise<Ingredient[]> {
  const res = await fetch("/api/ingredients", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch ingredients");
  const data = await res.json();
  return data.data || [];
}
