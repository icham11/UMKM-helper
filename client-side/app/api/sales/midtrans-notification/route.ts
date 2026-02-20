import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySignature, mapTransactionStatus } from "@/lib/midtrans/notification";
import type { MidtransNotification } from "@/lib/midtrans/types";
import { createXenditInvoice } from "@/lib/xendit/invoices";

export const runtime = "nodejs";

/**
 * Helper: Calculate recipe cost for a product based on FIFO inventory batches
 */
async function calculateProductCost(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  productId: number,
  quantity: number,
): Promise<number> {
  const recipes = await tx.recipe.findMany({
    where: { productId },
    include: {
      ingredient: {
        select: {
          id: true,
          inventoryBatches: {
            where: { remainingQty: { gt: 0 } },
            orderBy: { receivedAt: "asc" },
            select: { costPerUnit: true, remainingQty: true },
          },
        },
      },
    },
  });

  let totalCost = 0;

  for (const recipe of recipes) {
    const batches = recipe.ingredient.inventoryBatches;
    if (batches.length === 0) continue;

    const totalQty = batches.reduce((sum, b) => sum + Number(b.remainingQty), 0);
    const totalValue = batches.reduce(
      (sum, b) => sum + Number(b.remainingQty) * Number(b.costPerUnit),
      0,
    );
    const avgCost = totalQty > 0 ? totalValue / totalQty : 0;

    totalCost += Number(recipe.quantity) * avgCost * quantity;
  }

  return totalCost;
}

/**
 * Helper: Deduct ingredients from inventory using FIFO method
 */
async function deductInventory(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  productId: number,
  quantity: number,
): Promise<void> {
  const recipes = await tx.recipe.findMany({
    where: { productId },
    include: {
      ingredient: {
        select: {
          id: true,
          inventoryBatches: {
            where: { remainingQty: { gt: 0 } },
            orderBy: { receivedAt: "asc" },
          },
        },
      },
    },
  });

  for (const recipe of recipes) {
    let remainingToDeduct = Number(recipe.quantity) * quantity;
    const batches = recipe.ingredient.inventoryBatches;

    for (const batch of batches) {
      if (remainingToDeduct <= 0) break;

      const batchQty = Number(batch.remainingQty);
      const deduction = Math.min(batchQty, remainingToDeduct);

      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: { remainingQty: batchQty - deduction },
      });

      remainingToDeduct -= deduction;
    }
  }
}

/**
 * POST /api/sales/midtrans-notification
 *
 * Webhook endpoint for Midtrans payment notifications
 * This endpoint is called by Midtrans server when payment status changes
 *
 * Midtrans will send notification with POST body containing:
 *   {
 *     "transaction_id": "xxx",
 *     "order_id": "TRX-1234567890-001",
 *     "gross_amount": "50000.00",
 *     "payment_type": "gopay",
 *     "transaction_status": "settlement" | "pending" | "deny" | "expire" | "cancel",
 *     "fraud_status": "accept" | "challenge" | "deny",
 *     "transaction_time": "2026-02-20 10:00:00",
 *     "signature_key": "xxx"
 *   }
 *
 * Success (200):
 *   { "success": true, "message": "Payment processed" }
 *
 * Errors:
 *   400 — { "error": "Invalid signature" }
 *   404 — { "error": "Sale not found" }
 *   500 — { "error": "Failed to process payment" }
 */
export async function POST(request: NextRequest) {
  try {
    const notification: MidtransNotification = await request.json();

    console.log("Midtrans notification received:", notification);

    // 1. Verify signature
    if (!verifySignature(notification)) {
      console.error("Invalid Midtrans signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const { order_id, transaction_status, fraud_status } = notification;

    // 2. Find sale by transaction number
    const sale = await prisma.sale.findUnique({
      where: { transactionNumber: order_id },
      include: {
        saleItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      console.error(`Sale not found for order_id: ${order_id}`);
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // 3. Map transaction status
    const paymentStatus = mapTransactionStatus(transaction_status, fraud_status);

    // 4. Update sale and process inventory if paid
    await prisma.$transaction(async (tx) => {
      if (paymentStatus === "Paid" && sale.paymentStatus !== "Paid") {
        // Payment successful - calculate costs and deduct inventory

        let totalCost = 0;

        // Calculate cost for each item
        for (const item of sale.saleItems) {
          const cost = await calculateProductCost(tx, item.productId, item.quantity);
          totalCost += cost;

          // Update sale item with actual cost
          await tx.saleItem.update({
            where: { id: item.id },
            data: { costAtSale: cost / item.quantity },
          });

          // Deduct inventory
          await deductInventory(tx, item.productId, item.quantity);
        }

        // Update sale with cost and status
        await tx.sale.update({
          where: { id: sale.id },
          data: {
            totalCost,
            paymentStatus: "Paid",
          },
        });

        console.log(`Payment successful for order ${order_id}, inventory deducted`);
      } else {
        // Just update status for other cases (pending, failed, etc.)
        await tx.sale.update({
          where: { id: sale.id },
          data: { paymentStatus },
        });

        console.log(`Payment status updated to ${paymentStatus} for order ${order_id}`);
      }
    });

    if (paymentStatus === "Paid" && !sale.invoiceId) {
      try {
        if (sale.customerEmail) {
          const invoice = await createXenditInvoice({
            externalId: sale.transactionNumber,
            amount: Number(sale.totalRevenue),
            payerEmail: sale.customerEmail,
            description: `Invoice for ${sale.transactionNumber}`,
            customer: {
              givenNames: sale.customerName || undefined,
              email: sale.customerEmail || undefined,
              mobileNumber: sale.customerPhone || undefined,
            },
          });

          // Only update if invoice was successfully created
          if (invoice) {
            await prisma.sale.update({
              where: { id: sale.id },
              data: {
                invoiceId: invoice.id,
                invoiceUrl: invoice.invoiceUrl,
                invoiceStatus: invoice.status,
              },
            });
          }
        }
      } catch (invoiceError) {
        console.error("Xendit invoice error:", invoiceError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment notification processed",
    });
  } catch (error: unknown) {
    console.error("POST /api/sales/midtrans-notification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process payment" },
      { status: 500 },
    );
  }
}