import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cookies, headers } from "next/headers"
import { verifyToken } from "@/lib/auth/jwt"
import prisma from "@/lib/prisma"

export class AuthError extends Error {}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

export async function requireAuth() {
  // 1️⃣ Try NextAuth session
  const session = await getServerSession(authOptions)
  let userId: number | undefined = session?.user?.id

  const cookieStore = await cookies()

  // 2️⃣ Try JWT from cookie
  if (!userId) {
    const token = cookieStore.get("token")?.value

    if (token) {
      const decoded = verifyToken(token)
      if (decoded && typeof decoded === "object" && "userId" in decoded) {
        const rawUserId = (decoded as { userId: string | number }).userId
        userId = typeof rawUserId === "string" ? Number(rawUserId) : rawUserId
      }
    }
  }

  // 3️⃣ Try Bearer token from header (POSTMAN SUPPORT)
  if (!userId) {
    const headerList = await headers()
    const authHeader = headerList.get("authorization")

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "")
      const decoded = verifyToken(token)

      if (decoded && typeof decoded === "object" && "userId" in decoded) {
        const rawUserId = (decoded as { userId: string | number }).userId
        userId = typeof rawUserId === "string" ? Number(rawUserId) : rawUserId
      }
    }
  }

  if (!userId) {
    throw new AuthError("Unauthorized")
  }

  // 4️⃣ Resolve active business — respect cookie preference for multi-business switch
  const preferredId = cookieStore.get("active_business_id")?.value

  let business = null

  if (preferredId) {
    // Try to find the preferred business — must belong to this user
    business = await prisma.business.findFirst({
      where: { id: Number(preferredId), userId: Number(userId) },
    })
  }

  // Fallback: pick the first business for this user
  if (!business) {
    business = await prisma.business.findFirst({
      where: { userId: Number(userId) },
      orderBy: { createdAt: "asc" },
    })
  }

  if (!business) {
    throw new AuthError("Business not found for this user")
  }

  return {
    userId: Number(userId),
    businessId: business.id,
  }
}