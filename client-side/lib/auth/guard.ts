import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { logAuth } from "@/lib/logger";

/**
 * Auth Guard — Centralized authentication wrapper for API routes.
 *
 * Wraps a handler function with authentication check using `requireAuth()`.
 * Returns 401 automatically if the user is not authenticated.
 *
 * Usage:
 * ```ts
 * import { withAuth } from "@/lib/auth/guard";
 *
 * export const GET = withAuth(async (request, { userId, businessId }) => {
 *   // userId and businessId are guaranteed to be present
 *   return NextResponse.json({ data: "protected" });
 * });
 * ```
 *
 * For routes with dynamic params:
 * ```ts
 * export const PATCH = withAuth(async (request, { userId, businessId }) => {
 *   const { id } = await (request as any).__params; // Use standard param parsing
 *   return NextResponse.json({ data: "ok" });
 * });
 * ```
 */

export interface AuthContext {
  userId: number;
  businessId: number;
}

type AuthenticatedHandler = (
  request: NextRequest,
  auth: AuthContext,
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with auth guard.
 *
 * - On success: calls the handler with `{ userId, businessId }`
 * - On AuthError: returns 401 with error message
 * - On unexpected error: returns 500
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, ..._args: unknown[]) => {
    try {
      const auth = await requireAuth();
      return await handler(request, auth);
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message || "Unauthorized" },
          { status: 401 },
        );
      }

      logAuth.error("Unexpected auth guard error", { error });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║              API ROUTES AUTH AUDIT — 2026-02-22              ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║                                                               ║
 * ║  ✅ PROTECTED (requireAuth / withAuth)                        ║
 * ║  ─────────────────────────────────────                        ║
 * ║  GET/POST  /api/categories                                    ║
 * ║  GET/POST  /api/products                                      ║
 * ║  PATCH/DEL /api/products/[id]                                 ║
 * ║  GET/PUT   /api/products/[id]/recipe                          ║
 * ║  POST      /api/products/generate/name                        ║
 * ║  POST      /api/products/generate/image                       ║
 * ║  POST      /api/products/generate/recipe-image                ║
 * ║  POST      /api/products/generate/recommend-price             ║
 * ║  GET/POST  /api/ingredients                                   ║
 * ║  PATCH/DEL /api/ingredients/[id]                               ║
 * ║  POST      /api/ingredients/[id]/restock                      ║
 * ║  POST      /api/ingredients/[id]/consume                      ║
 * ║  GET/POST  /api/sales                                         ║
 * ║  POST      /api/sales/midtrans-token                          ║
 * ║  GET       /api/sales/[saleId]/invoice                        ║
 * ║  GET       /api/analytics/dashboard                           ║
 * ║  GET       /api/analytics/monthly                             ║
 * ║  GET       /api/analytics/growth                              ║
 * ║  GET       /api/analytics/waste                               ║
 * ║  GET       /api/analytics/insight                             ║
 * ║  GET       /api/analytics/top-products                        ║
 * ║  GET       /api/analytics/products                            ║
 * ║  POST      /api/ai/chat                                       ║
 * ║  GET       /api/ai/chat (history)                             ║
 * ║  POST      /api/ai/insights                                   ║
 * ║  POST      /api/ai/rag/index                                  ║
 * ║  POST      /api/ai/rag/search                                 ║
 * ║  GET/POST  /api/ai/sessions                                   ║
 * ║  POST      /api/analyze-image              ← FIXED            ║
 * ║  POST/GET  /api/business-analytics          ← FIXED           ║
 * ║  GET/POST  /api/businesses                 (own JWT check)    ║
 * ║                                                               ║
 * ║  🔓 PUBLIC (intentionally unauthenticated)                    ║
 * ║  ─────────────────────────────────────────                    ║
 * ║  POST      /api/auth/login                                    ║
 * ║  POST      /api/auth/register                                 ║
 * ║  *         /api/auth/[...nextauth]                            ║
 * ║  GET       /api/analyze-image              (health check)     ║
 * ║  GET       /api/business-analytics         (health check)     ║
 * ║                                                               ║
 * ║  🔑 SPECIAL AUTH                                              ║
 * ║  ─────────────────────────────────────────                    ║
 * ║  POST      /api/sales/midtrans-notification (webhook sig)     ║
 * ║  POST/GET  /api/cleanup-images             (CRON_SECRET)      ║
 * ║                                                               ║
 * ║  ⚠️  MOCK/DEV ONLY (should disable in production)             ║
 * ║  ─────────────────────────────────────────                    ║
 * ║  GET       /api/mock-business                                 ║
 * ║  POST      /api/mock-business/create                          ║
 * ║  GET       /api/mock-ingredients                              ║
 * ║                                                               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */


