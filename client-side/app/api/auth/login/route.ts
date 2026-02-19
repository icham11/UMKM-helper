import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { signToken } from "@/lib/auth/jwt"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return new NextResponse("Missing credentials", { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        businesses: true,
      },
    })

    if (!user) {
      return new NextResponse("Invalid credentials", { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return new NextResponse("Invalid credentials", { status: 401 })
    }

    // Ambil business pertama milik user
    const business = user.businesses[0] ?? null

    const token = signToken({
      userId: user.id,
      businessId: business?.id ?? null,
    })

    const response = NextResponse.json({
      success: true,
      hasBusiness: !!business,
    })

    response.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}