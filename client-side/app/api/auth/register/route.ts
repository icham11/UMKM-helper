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

const registerRateLimitStore = new Map<string, RateLimitEntry>()

function recordRequest(ip: string) {
  const now = Date.now()
  const entry = registerRateLimitStore.get(ip)

  if (!entry) {
    registerRateLimitStore.set(ip, { count: 1, firstRequestAt: now })
    return
  }

  if (now - entry.firstRequestAt > RATE_LIMIT_WINDOW_MS) {
    // Reset window
    registerRateLimitStore.set(ip, { count: 1, firstRequestAt: now })
    return
  }

  entry.count += 1
  registerRateLimitStore.set(ip, entry)
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = registerRateLimitStore.get(ip)

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
    const { name, email, password } = body

    if (!name || !email || !password) {
      return new NextResponse("Missing fields", { status: 400 })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new NextResponse("Invalid email format", { status: 400 })
    }

    // Password strength validation
    const passwordIsValid =
      typeof password === "string" &&
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)

    if (!passwordIsValid) {
      return new NextResponse(
        "Password must be at least 8 characters long and include upper and lower case letters and a number",
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return new NextResponse("User already exists", { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

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
    console.error("Error during user registration:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}