import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { signToken } from "@/lib/auth/jwt"

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10

type RateLimitEntry = {
  count: number
  firstRequestAt: number
}

const loginRateLimitStore = new Map<string, RateLimitEntry>()

function recordRequest(ip: string) {
  const now = Date.now()
  const entry = loginRateLimitStore.get(ip)

  if (!entry) {
    loginRateLimitStore.set(ip, { count: 1, firstRequestAt: now })
    return
  }

  if (now - entry.firstRequestAt > RATE_LIMIT_WINDOW_MS) {
    // Reset window
    loginRateLimitStore.set(ip, { count: 1, firstRequestAt: now })
    return
  }

  entry.count += 1
  loginRateLimitStore.set(ip, entry)
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = loginRateLimitStore.get(ip)

  if (!entry) {
    return false
  }

  if (now - entry.firstRequestAt > RATE_LIMIT_WINDOW_MS) {
    // Window expired; treat as not limited (will reset on next recordRequest)
    return false
  }

  return entry.count > RATE_LIMIT_MAX_REQUESTS
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  recordRequest(ip)

  if (isRateLimited(ip)) {
    return new NextResponse("Too many requests", { status: 429 })
  }

  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return new NextResponse("Missing credentials", { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return new NextResponse("Invalid credentials", { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return new NextResponse("Invalid credentials", { status: 401 })
    }

    const token = signToken({ userId: user.id })

    const response = NextResponse.json({ success: true })

    response.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    })

    return response
  } catch (error) {
    console.error("Error during login:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}