import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { indexBusinessDocuments, getIndexStatus } from "@/lib/ai/rag-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/rag/index — Index/re-index business documents into vector store
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const targetId = body.businessId || businessId;

    console.log(`[RAG API] Indexing business ${targetId}...`);
    const result = await indexBusinessDocuments(targetId);

    return NextResponse.json({
      success: true,
      indexed: result.indexed,
      elapsed: result.elapsed,
      message: `Berhasil mengindeks ${result.indexed} dokumen dalam ${(result.elapsed / 1000).toFixed(1)} detik`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[RAG Index] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Indexing failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/rag/index — Check vector store index status
 */
export async function GET() {
  try {
    const { businessId } = await requireAuth();
    const status = await getIndexStatus(businessId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[RAG Status] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}

