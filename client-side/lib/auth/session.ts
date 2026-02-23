import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cookies, headers } from "next/headers"
import { verifyToken } from "@/lib/auth/jwt"
import prisma from "@/lib/prisma"
import type { UserRole } from "@prisma/client"

export class AuthError extends Error {}
export class ForbiddenError extends Error {}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError
}

export type AuthResult = {
  userId: number
  businessId: number
  role: UserRole // "Owner" | "Cashier"
}

export async function requireAuth(): Promise<AuthResult> {
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
    // Try to find the preferred business — must belong to this user (as owner)
    business = await prisma.business.findFirst({
      where: { id: Number(preferredId), userId: Number(userId) },
    })

    // Or as a member (cashier)
    if (!business) {
      const membership = await prisma.businessMember.findFirst({
        where: { userId: Number(userId), businessId: Number(preferredId) },
        include: { business: true },
      })
      if (membership) {
        return {
          userId: Number(userId),
          businessId: membership.businessId,
          role: membership.role,
        }
      }
    }
  }

  // Fallback: pick the first business owned by this user
  if (!business) {
    business = await prisma.business.findFirst({
      where: { userId: Number(userId) },
      orderBy: { createdAt: "asc" },
    })
  }

  // 5️⃣ If not an owner, check if they're a member (Cashier) of any business
  if (!business) {
    const membership = await prisma.businessMember.findFirst({
      where: { userId: Number(userId) },
      include: { business: true },
      orderBy: { createdAt: "asc" },
    })

    if (membership) {
      return {
        userId: Number(userId),
        businessId: membership.businessId,
        role: membership.role,
      }
    }
  }

  if (!business) {
    throw new AuthError("Business not found for this user")
  }

  // Owner of the business
  return {
    userId: Number(userId),
    businessId: business.id,
    role: "Owner" as UserRole,
  }
}

/**
 * Require a specific role. Call AFTER requireAuth().
 * Usage:
 *   const auth = await requireAuth();
 *   requireRole(auth, "Owner");
 */
export function requireRole(auth: AuthResult, ...allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(auth.role)) {
    throw new ForbiddenError(
      `Akses ditolak. Hanya ${allowedRoles.join("/")} yang bisa mengakses fitur ini.`
    )
  }
}