import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/businesses
 *
 * Success (200):
 *   {
 *     "success": true,
 *     "data": [{
 *       "id": 1, "name": "Warung Sari", "location": "Jakarta", "userId": 1,
 *       "user": { "id": 1, "name": "John", "email": "john@example.com" },
 *       "_count": { "products": 5, "ingredients": 12, "sales": 30, "categories": 3 }
 *     }]
 *   }
 *
 * Errors:
 *   401 — { "error": "Unauthorized" }
 *   500 — { "error": "Failed to fetch businesses" }
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const businesses = await prisma.business.findMany({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            products: true,
            ingredients: true,
            sales: true,
            categories: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: businesses });
  } catch (error: unknown) {
    console.error("GET /api/businesses error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch businesses" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/businesses
 *
 * Input (JSON):
 *   { "name": "Warung Sari", "location": "Jakarta" }  // location optional
 *
 * Success (201):
 *   {
 *     "success": true,
 *     "data": {
 *       "id": 1, "name": "Warung Sari", "location": "Jakarta", "userId": 1,
 *       "user": { "id": 1, "name": "John", "email": "john@example.com" }
 *     }
 *   }
 *
 * Errors:
 *   400 — { "error": "name is required" }
 *   401 — { "error": "Unauthorized" }
 *   500 — { "error": "Failed to create business" }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { name, location } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const business = await prisma.business.create({
      data: {
        name,
        userId,
        location: location || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: business }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/businesses error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create business" },
      { status: 500 },
    );
  }
}
