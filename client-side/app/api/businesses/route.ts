import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { verifyToken } from "@/lib/auth/jwt"

// 🔹 GET: Ambil semua business milik user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  let userId = session?.user?.id

  // Fallback ke JWT (login email/password)
  if (!userId) {
    const token = req.cookies.get("token")?.value
    if (token) {
      const decoded = verifyToken(token)
      if (
        decoded &&
        typeof decoded === "object" &&
        "userId" in decoded
      ) {
        userId = (decoded as { userId: number }).userId
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const businesses = await prisma.business.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: businesses })
}

// 🔹 POST: Buat business baru
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  let userId = session?.user?.id

  // Fallback ke JWT
  if (!userId) {
    const token = req.cookies.get("token")?.value
    if (token) {
      const decoded = verifyToken(token)
      if (
        decoded &&
        typeof decoded === "object" &&
        "userId" in decoded
      ) {
        userId = (decoded as { userId: number }).userId
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name, location } = body

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 })
  }

  const business = await prisma.business.create({
    data: {
      name,
      location: location || null,
      userId,
    },
  })

  return NextResponse.json({ success: true, data: business })
}