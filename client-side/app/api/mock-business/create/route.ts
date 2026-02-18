import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const body = await req.json()

  if (!body.name || !body.location) {
    return new NextResponse("Invalid data", { status: 400 })
  }

  const business = {
    id: "biz_123",
    name: body.name,
    location: body.location,
  }

  ;(await cookies()).set("mock_business", JSON.stringify(business))

  return NextResponse.json({ success: true })
}