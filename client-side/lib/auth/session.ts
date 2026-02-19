import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth/jwt"

export class AuthError extends Error {}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError
}

export async function requireAuth() {
  // 1️⃣ Try NextAuth session
  const session = await getServerSession(authOptions)
  let userId = session?.user?.id

  // 2️⃣ If no session → check JWT cookie
  if (!userId) {
    const cookieStore = await cookies()   // ✅ WAJIB await
    const token = cookieStore.get("token")?.value

    if (token) {
      const decoded = verifyToken(token)

      if (
        decoded &&
        typeof decoded === "object" &&
        "userId" in decoded
      ) {
        userId = (decoded as { userId: string | number }).userId
      }
    }
  }

  if (!userId) {
    throw new AuthError("Unauthorized")
  }

  return { userId }
}