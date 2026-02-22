import { snap } from "./config";
import type { MidtransParameter, MidtransSnapResponse } from "./types";
import { logPayment } from "@/lib/logger";

/**
 * Create Midtrans Snap transaction token
 */
export async function createSnapTransaction(
  parameter: MidtransParameter,
): Promise<MidtransSnapResponse> {
  try {
    const transaction = await snap.createTransaction(parameter);
    return {
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logPayment.error("Midtrans Snap error", { error: errorMsg });

    // Extract error details if available
    const errorDetails = (error as Record<string, unknown> & { ApiResponse?: { error_messages?: string[] } })?.ApiResponse?.error_messages || [];
    if (errorDetails.length > 0) {
      logPayment.error("Midtrans validation details", { details: errorDetails });
      throw new Error(`Midtrans validation failed: ${errorDetails.join(", ")}`);
    }

    throw new Error(`Failed to create Midtrans transaction: ${errorMsg}`);
  }
}

/**
 * Get transaction status from Midtrans
 * @internal Used by middleware and webhooks
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getTransactionStatus(orderId: string) {
  try {
    return await snap.transaction.status(orderId);
  } catch (error) {
    logPayment.error("Midtrans status check error", { orderId, error });
    throw new Error("Failed to check transaction status");
  }
}
