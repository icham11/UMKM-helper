import { NextResponse } from "next/server"

export async function GET() {
  // ubah ini untuk testing
  const hasBusiness = true

  if (!hasBusiness) {
    return new NextResponse("No business", { status: 404 })
  }

  return NextResponse.json({
    id: "biz_123",
    name: "Warung Halim",
  })
}