import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth/jwt"

export async function GET() {
  const token = (await cookies()).get("token")?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const decoded = verifyToken(token) as {
    userId: number
    businessId: number
  } | null

  if (!decoded?.businessId) {
    return NextResponse.json({ error: "No business found" }, { status: 403 })
  }

  const ingredients = await prisma.ingredient.findMany({
    where: {
      businessId: decoded.businessId,
    },
    include: {
      inventoryBatches: true,
    },
  })

  const result = ingredients.map((ingredient) => {
    const stock = ingredient.inventoryBatches.reduce(
      (total, batch) => total + Number(batch.remainingQty),
      0
    )

    return {
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      minStock: ingredient.minStock,
      stock,
    }
  })

  return NextResponse.json(result)
}