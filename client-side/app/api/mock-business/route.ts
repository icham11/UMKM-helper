import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = cookies()
  const business = (await cookieStore).get("mock_business")

  if (!business) {
    return new NextResponse("No business", { status: 404 })
  }

  return NextResponse.json(JSON.parse(business.value))
}