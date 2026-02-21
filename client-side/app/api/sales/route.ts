import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/session";
import { createSaleSchema } from "@/lib/validations/sale";
import { PaymentMethod } from "@prisma/client";
import { createXenditInvoice } from "@/lib/xendit/invoices";
import {
  generateTransactionNumber,
  calculateProductCost,
  updateBusinessMetrics,
  updateProductMetrics,
  recomputeRecipeCost,
} from "@/lib/services/saleHelpers";
import { deductFIFO } from "@/lib/inventory/engine";

export const runtime = "nodejs";

// ---------- GET ----------

/**
 * GET /api/sales
 *
 * Query params: ?startDate=2026-01-01&endDate=2026-01-31&paymentMethod=Cash
 *
 * Success (200):
 *   {
 *     "success": true,
 *     "data": {
 *       "sales": [{
 *         "id": 1,
 *         "transactionNumber": "TRX-1234567890-001",
 *         "totalRevenue": 50000,
 *         "totalCost": 20000,
 *         "paymentMethod": "Cash",
 *         "paymentStatus": "Paid",
 *         "createdAt": "2026-02-20T10:00:00Z",
 *         "saleItems": [{
 *           "id": 1, "productId": 1, "quantity": 2,
 *           "priceAtSale": 25000, "costAtSale": 10000,
 *           "product": { "id": 1, "name": "Kopi Susu", "categoryId": 1 }
 *         }]
 *       }],
 *       "analytics": {
 *         "totalRevenue": 500000,
 *         "totalCost": 200000,
 *         "totalProfit": 300000,
 *         "avgMargin": 60.0,
 *         "transactionCount": 10,
 *         "byPaymentMethod": [
 *           { "method": "Cash", "count": 5, "revenue": 250000 },
 *           { "method": "QRIS", "count": 5, "revenue": 250000 }
 *         ]
 *       }
 *     }
 *   }
 *
 * Errors:
 *   401 — { "error": "Unauthorized" }
 *   500 — { "error": "Failed to fetch sales" }
 */
export async function GET(request: NextRequest) {
  try {
    const { businessId } = await requireAuth();

    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const paymentMethod = url.searchParams.get("paymentMethod");

    const where = {
      businessId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(paymentMethod ? { paymentMethod: paymentMethod as PaymentMethod } : {}),
    };

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            },
          },
        },
      },
    });

    // Calculate analytics
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalRevenue), 0);
    const totalCost = sales.reduce((sum, s) => sum + Number(s.totalCost), 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Group by payment method
    const paymentMethodStats = sales.reduce(
      (acc, sale) => {
        const method = sale.paymentMethod;
        if (!acc[method]) {
          acc[method] = { method, count: 0, revenue: 0 };
        }
        acc[method].count += 1;
        acc[method].revenue += Number(sale.totalRevenue);
        return acc;
      },
      {} as Record<string, { method: PaymentMethod; count: number; revenue: number }>,
    );

    const analytics = {
      totalRevenue,
      totalCost,
      totalProfit,
      avgMargin: Math.round(avgMargin * 100) / 100,
      transactionCount: sales.length,
      byPaymentMethod: Object.values(paymentMethodStats),
    };

    return NextResponse.json({
      success: true,
      data: { sales, analytics, totalRevenue, totalCost },
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/sales error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch sales" },
      { status: 500 },
    );
  }
}

// ---------- POST ----------

/**
 * POST /api/sales
 *
 * Input (JSON):
 *   {
 *     "items": [{ "productId": 1, "quantity": 2 }],
 *     "paymentMethod": "Cash" | "QRIS" | "Transfer" | "Digital",
 *     "paymentStatus": "Paid" | "Pending" (optional, defaults to "Paid")
 *   }
 *
 * Success (201):
 *   {
 *     "success": true,
 *     "data": {
 *       "id": 1,
 *       "transactionNumber": "TRX-1234567890-001",
 *       "totalRevenue": 50000,
 *       "totalCost": 20000,
 *       "paymentMethod": "Cash",
 *       "paymentStatus": "Paid",
 *       "createdAt": "2026-02-20T10:00:00Z",
 *       "saleItems": [...]
 *     }
 *   }
 *
 * Errors:
 *   400 — { "error": "Validation failed", "details": { ... } }
 *   400 — { "error": "Product with ID 99 not found" }
 *   400 — { "error": "Insufficient stock for ingredient: Kopi Bubuk" }
 *   401 — { "error": "Unauthorized" }
 *   500 — { "error": "Failed to create sale" }
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireAuth();
    const body = await request.json();

    const parsed = createSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { items, paymentMethod, paymentStatus, customerName, customerEmail, customerPhone } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate all products exist and belong to business
      const productIds = [...new Set(items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, businessId },
        select: { id: true, sellingPrice: true },
      });

      if (products.length !== productIds.length) {
        const foundIds = new Set(products.map((p) => p.id));
        const missing = productIds.filter((id) => !foundIds.has(id));
        throw new Error(`Product with ID ${missing[0]} not found`);
      }

      const productPriceMap = new Map(products.map((p) => [p.id, Number(p.sellingPrice)]));

      // 2. Check inventory availability for all items
      for (const item of items) {
        const recipes = await tx.recipe.findMany({
          where: { productId: item.productId },
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                inventoryBatches: {
                  where: { remainingQty: { gt: 0 } },
                  select: { remainingQty: true },
                },
              },
            },
          },
        });

        for (const recipe of recipes) {
          const requiredQty = Number(recipe.quantity) * item.quantity;
          const availableQty = recipe.ingredient.inventoryBatches.reduce(
            (sum, b) => sum + Number(b.remainingQty),
            0,
          );

          if (availableQty < requiredQty) {
            throw new Error(`Insufficient stock for ingredient: ${recipe.ingredient.name}`);
          }
        }
      }

      // 3. Calculate costs and create sale
      let totalRevenue = 0;
      let totalCost = 0;

      const saleItemsData = [];

      const allIngredientBreakdowns = [];

      for (const item of items) {
        const price = productPriceMap.get(item.productId)!;

        type CostResult =
          | number
          | {
              cost: number;
              ingredientBreakdowns: { ingredientId: number; breakdown: { batchId: number; quantity: number }[] }[];
            };

        const costResult = await calculateProductCost(
          tx,
          item.productId,
          item.quantity
        ) as CostResult;

        let cost: number;
        let ingredientBreakdowns: { ingredientId: number; breakdown: { batchId: number; quantity: number }[] }[] = [];

        if (typeof costResult === "number") {
          cost = costResult;
        } else if (
          costResult &&
          typeof costResult === "object" &&
          "cost" in costResult &&
          "ingredientBreakdowns" in costResult
        ) {
          cost = costResult.cost;
          ingredientBreakdowns = costResult.ingredientBreakdowns;
        } else {
          throw new Error("Unexpected return value from calculateProductCost");
        }

        totalRevenue += price * item.quantity;
        totalCost += cost;

        saleItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtSale: price,
          costAtSale: cost / item.quantity,
        });

        allIngredientBreakdowns.push(...ingredientBreakdowns);
      }

      // 4. Create stock document for this sale
      const stockDocument = await tx.stockDocument.create({
        data: {
          businessId,
          type: "Sale",
          notes: `Sale transaction`,
        },
      });

      // 5. Create sale record
      const sale = await tx.sale.create({
        data: {
          businessId,
          stockDocumentId: stockDocument.id,
          transactionNumber: generateTransactionNumber(),
          totalRevenue,
          totalCost,
          paymentMethod,
          paymentStatus,
          customerName,
          customerEmail,
          customerPhone,
        },
      });

      // 6. Create sale items
      await tx.saleItem.createMany({
        data: saleItemsData.map((item) => ({
          saleId: sale.id,
          ...item,
        })),
      });
      
      for (const ingredient of allIngredientBreakdowns) {
        // Fetch costPerUnit for each batch in the breakdown
        const batchIds = ingredient.breakdown.map(b => b.batchId);
        const batches = await tx.inventoryBatch.findMany({
          where: { id: { in: batchIds } },
          select: { id: true, costPerUnit: true },
        });
        const batchCostMap = new Map(batches.map(b => [b.id, Number(b.costPerUnit)]));
        const breakdownWithCost = ingredient.breakdown.map(b => ({
          ...b,
          costPerUnit: batchCostMap.get(b.batchId) ?? 0,
        }));
        await deductFIFO(
          tx,
          ingredient.ingredientId,
          breakdownWithCost,
          stockDocument.id
        );
      }

      // 7. Recompute recipeCost on each sold product (keeps margin data fresh)
      const soldProductIds = [...new Set(items.map((i) => i.productId))];
      for (const pid of soldProductIds) {
        await recomputeRecipeCost(tx, pid);
      }

      await updateBusinessMetrics(
        tx,
        businessId,
        totalRevenue,
        totalCost
      );

      for (const item of saleItemsData) {
        await updateProductMetrics(
          tx,
          item.productId,
          item.quantity,
          item.priceAtSale * item.quantity,
          item.costAtSale * item.quantity
        );
      }

      // 8. Return full sale with items
      return tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  categoryId: true,
                },
              },
            },
          },
        },
      });
    }, { timeout: 30000 });

    if (result && result.paymentStatus === "Paid") {
      try {
        if (result.invoiceId) {
          return NextResponse.json({ success: true, data: result }, { status: 201 });
        }

        const payerEmail = result.customerEmail;
        if (!payerEmail) {
          return NextResponse.json({ success: true, data: result }, { status: 201 });
        }

        const invoice = await createXenditInvoice({
          externalId: result.transactionNumber,
          amount: Number(result.totalRevenue),
          payerEmail,
          description: `Invoice for ${result.transactionNumber}`,
          customer: {
            givenNames: result.customerName || undefined,
            email: result.customerEmail || undefined,
            mobileNumber: result.customerPhone || undefined,
          },
        });

        // If Xendit invoice creation fails or is disabled, just return the sale result
        if (!invoice) {
          return NextResponse.json({ success: true, data: result }, { status: 201 });
        }

        const updated = await prisma.sale.update({
          where: { id: result.id },
          data: {
            invoiceId: invoice.id,
            invoiceUrl: invoice.invoiceUrl,
            invoiceStatus: invoice.status,
          },
          include: {
            saleItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    categoryId: true,
                  },
                },
              },
            },
          },
        });

        return NextResponse.json({ success: true, data: updated }, { status: 201 });
      } catch (invoiceError) {
        console.error("Xendit invoice error:", invoiceError);
      }
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Business logic errors
    if (
      error instanceof Error &&
      (error.message.includes("not found") || error.message.includes("Insufficient stock"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("POST /api/sales error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create sale" },
      { status: 500 },
    );
  }
}
