"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronLeft, Image as ImageIcon, Plus, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { useBusiness } from "@/context/BusinessContext";
import PhotoUploadModal from "./components/PhotoUploadModal";
import ProductForm from "./components/ProductForm";
import ProductDraftCard from "./components/ProductDraftCard";
import { createBulkProducts, getIngredientOptions } from "@/lib/api/products";
import type { IngredientOption } from "@/lib/api/products";
import type { ProductDraft } from "@/types/product";

type Mode = "idle" | "bulk-drafts" | "manual";

export default function CreateProductsPage() {
  const router = useRouter();
  const { business, loading: bizLoading } = useBusiness();

  const [mode, setMode] = useState<Mode>("idle");
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([]);

  useEffect(() => {
    getIngredientOptions()
      .then(setIngredientOptions)
      .catch(() => {});
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Bulk submit (from photo-generated drafts) ──────────────────────────
  const handleBulkConfirm = async () => {
    if (!drafts.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = drafts.map((d) => ({
        name: d.name,
        categoryName: d.categoryName,
        sellingPrice: d.sellingPrice,
        recipe: d.recipe
          .filter((r) => r.ingredientId > 0)
          .map((r) => ({ ingredientId: r.ingredientId, quantity: r.quantity })),
      }));
      await createBulkProducts(payload);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/products"), 1400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save products";
      setError(msg);
      // Tampilkan toast error berbeda jika ada kata 'duplicate' atau 'sebagian'
      if (msg.toLowerCase().includes("semua")) {
        toast.error("Semua produk yang diupload sudah ada di database (duplikat semua). Tidak ada produk baru yang disimpan.");
      } else if (msg.toLowerCase().includes("sebagian")) {
        toast.error("Beberapa produk sudah ada di database (duplikat sebagian). Produk lain tetap disimpan.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handle draft updates ────────────────────────────────────────────────
  const updateDraft = (index: number, updated: ProductDraft) =>
    setDrafts((prev) => prev.map((d, i) => (i === index ? updated : d)));

  const removeDraft = (index: number) => setDrafts((prev) => prev.filter((_, i) => i !== index));

  const addEmptyDraft = () =>
    setDrafts((prev) => [
      ...prev,
      {
        _clientId: `manual-${Date.now()}`,
        name: "",
        categoryName: "",
        sellingPrice: 0,
        recipe: [],
        aiGenerated: false,
      },
    ]);

  if (bizLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-indigo-500 animate-pulse">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  if (!business) {
    return <div className="flex items-center justify-center h-[60vh] text-gray-400 text-lg">No business found.</div>;
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-green-600">
        <CheckCircle2 size={60} />
        <p className="text-2xl font-extrabold">Products saved!</p>
        <p className="text-sm text-gray-500">Redirecting to products list…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/products")}
          className="p-2 rounded-full hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-indigo-700">Add Products</h1>
          <p className="text-sm text-gray-400 mt-0.5">Choose how you want to add new products.</p>
        </div>
      </div>

      {/* ── IDLE: Mode selector ─────────────────────────────────────────── */}
      {mode === "idle" && (
        <div className="space-y-4">
          {/* Option 1: Generate from photo */}
          <button
            onClick={() => setPhotoModalOpen(true)}
            className="w-full flex items-center gap-5 p-6 bg-linear-to-r from-indigo-50 via-white to-violet-50 rounded-2xl border-2 border-indigo-200 hover:border-indigo-400 shadow hover:shadow-md transition text-left group"
          >
            <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 transition">
              <ImageIcon size={28} />
            </span>
            <div>
              <p className="text-lg font-bold text-indigo-700">Generate Products using Photo</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Upload a menu or price list — AI will extract all products at once.
              </p>
            </div>
            <Sparkles size={20} className="ml-auto text-indigo-300 group-hover:text-indigo-500 transition" />
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-gray-300 text-sm font-medium">
            <span className="flex-1 border-t border-gray-200" />
            or
            <span className="flex-1 border-t border-gray-200" />
          </div>

          {/* Option 2: Manual */}
          <button
            onClick={() => setMode("manual")}
            className="w-full flex items-center gap-5 p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-300 shadow hover:shadow-md transition text-left group"
          >
            <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 text-gray-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition">
              <Plus size={28} />
            </span>
            <div>
              <p className="text-lg font-bold text-gray-700 group-hover:text-indigo-700 transition">
                Add Product Individually
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                Fill in a product form with AI assist options for name, price, and recipe.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* ── BULK DRAFTS: Photo-generated product list ───────────────────── */}
      {mode === "bulk-drafts" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {drafts.length} product{drafts.length !== 1 ? "s" : ""} generated
              </h2>
              <p className="text-sm text-gray-400">Review and edit each product before saving.</p>
            </div>
            <button
              onClick={() => {
                setMode("idle");
                setDrafts([]);
              }}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Start over
            </button>
          </div>

          <div className="space-y-3">
            {drafts.map((draft, i) => (
              <ProductDraftCard
                key={draft._clientId}
                draft={draft}
                index={i}
                ingredientOptions={ingredientOptions}
                onChange={(updated) => updateDraft(i, updated)}
                onRemove={() => removeDraft(i)}
              />
            ))}
          </div>

          <button
            onClick={addEmptyDraft}
            className="flex items-center gap-2 text-sm text-indigo-600 font-semibold hover:text-indigo-800 transition"
          >
            <Plus size={16} />
            Add another product manually
          </button>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-xl p-4 text-sm">
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setMode("idle");
                setDrafts([]);
              }}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkConfirm}
              disabled={submitting || drafts.length === 0}
              className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving…
                </>
              ) : (
                `Confirm & Save ${drafts.length} Product${drafts.length !== 1 ? "s" : ""}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── MANUAL: Single product form ────────────────────────────────── */}
      {mode === "manual" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMode("idle")} className="text-sm text-indigo-600 font-semibold hover:underline">
              ← Back
            </button>
            <h2 className="text-lg font-bold text-slate-700">New Product</h2>
          </div>
          <ProductForm
            onSuccess={() => {
              setSuccess(true);
              setTimeout(() => router.push("/dashboard/products"), 1400);
            }}
          />
        </div>
      )}

      {/* Photo upload modal (transitions to bulk-drafts mode on success) */}
      {photoModalOpen && (
        <PhotoUploadModal
          onClose={() => setPhotoModalOpen(false)}
          onSuccess={(generatedDrafts) => {
            setPhotoModalOpen(false);
            setDrafts(generatedDrafts);
            setMode("bulk-drafts");
          }}
        />
      )}
    </div>
  );
}
