import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { recipeItemSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

// ================= GET =================

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAuth();
    const { id } = await context.params;

    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
      include: {
        recipes: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product.recipes });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 });
  }
}

// ================= POST =================

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { businessId } = await requireAuth();
    const { id } = await context.params;

    const productId = Number(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const body = await request.json();

    const parsed = recipeItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Validate product belongs to business
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { ingredientId, quantity } = parsed.data;

    const recipe = await prisma.recipe.upsert({
      where: {
        productId_ingredientId: {
          productId,
          ingredientId,
        },
      },
      update: { quantity },
      create: {
        productId,
        ingredientId,
        quantity,
      },
    });

    return NextResponse.json({ success: true, data: recipe }, { status: 201 });
  } catch (error) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Recipe error:", error);

    return NextResponse.json(
      { error: "Failed to create/update recipe" },
      { status: 500 }
    );
  }
}