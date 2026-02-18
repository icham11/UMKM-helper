import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const business = (await cookies()).get("mock_business")

  if (!business) {
    return new NextResponse("No business", { status: 401 })
  }

  return NextResponse.json([
    {
      id: 1,
      name: "Tepung Terigu",
      unit: "kg",
      stock: 10,
      minStock: 5,
      costPerUnit: 12000,
    },
    {
      id: 2,
      name: "Gula Pasir",
      unit: "kg",
      stock: 3,
      minStock: 5,
      costPerUnit: 14000,
    },
  ])
}