"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Camera, Plus, Loader2, ChevronDown, CheckCircle2, AlertTriangle, DollarSign } from "lucide-react";
import {
  generateProductByName,
  recommendPrice,
  getIngredientOptions,
  getCategoryOptions,
  createProduct,
  deleteIngredient,
  patchIngredient,
  type IngredientOption,
} from "@/lib/api/products";
import type { DraftRecipeRow } from "@/types/product";
import IngredientSelectorRow from "./IngredientSelectorRow";
import RecipePhotoModal from "./RecipePhotoModal";

const emptyRow = (index: number): DraftRecipeRow => ({
  ingredientId: -(index + 1),
  ingredientName: "",
  unit: "",
  quantity: 1,
  costPerUnit: null,
  isNew: true, // blank rows are "new" — give full edit access
});

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(v);

interface Props {
  /** Pre-populated data from "Generate from name" on the drafts list */
  initialDraft?: {
    name?: string;
    categoryName?: string;
    sellingPrice?: number;
    recipe?: DraftRecipeRow[];
  };
  onSuccess?: () => void;
}

export default function ProductForm({ initialDraft, onSuccess }: Props) {
  const router = useRouter();

  // ── form state ─────────────────────────────────────────────────────────
  const [name, setName] = useState(initialDraft?.name ?? "");
  const [categoryName, setCategoryName] = useState(initialDraft?.categoryName ?? "");
  const [sellingPrice, setSellingPrice] = useState<number>(initialDraft?.sellingPrice ?? 0);
  const [recipe, setRecipe] = useState<DraftRecipeRow[]>(
    initialDraft?.recipe?.length ? initialDraft.recipe : [emptyRow(0)],
  );

  // ── option lists ────────────────────────────────────────────────────────
  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ id: number; name: string }[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    getIngredientOptions()
      .then(setIngredientOptions)
      .catch(() => {});
    getCategoryOptions()
      .then(setCategoryOptions)
      .catch(() => {});
  }, []);

  // ── loading / feedback states ───────────────────────────────────────────
  const [aiNameLoading, setAiNameLoading] = useState(false);
  const [aiPriceLoading, setAiPriceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [recipePhotoOpen, setRecipePhotoOpen] = useState(false);
  const [priceHint, setPriceHint] = useState<string | null>(null);

  // ── computed: recipe cost ───────────────────────────────────────────────
  const recipeCost = useMemo(() => recipe.reduce((s, r) => s + r.quantity * (r.costPerUnit ?? 0), 0), [recipe]);

  const margin = sellingPrice > 0 ? Math.round(((sellingPrice - recipeCost) / sellingPrice) * 100) : 0;

  // ── AI: generate from name ──────────────────────────────────────────────
  const handleGenerateFromName = async () => {
    if (!name.trim()) return;
    setAiNameLoading(true);
    setError(null);
    try {
      const result = await generateProductByName(name.trim());
      if (result.data) {
        const d = result.data;
        if (d.categoryName) setCategoryName(d.categoryName);
        if (d.sellingPrice) setSellingPrice(d.sellingPrice);
        if (d.recipe?.length) {
          setRecipe(
            d.recipe.map(
              (r: {
                ingredientId: number;
                ingredientName: string;
                unit: string;
                quantity: number;
                costPerUnit: number | null;
                isNew?: boolean;
              }) => ({
                ingredientId: r.ingredientId,
                ingredientName: r.ingredientName,
                unit: r.unit,
                quantity: r.quantity,
                costPerUnit: r.costPerUnit,
                isNew: r.isNew ?? false,
              }),
            ),
          );
        }
        // Refresh ingredient options (new ones may have been created)
        getIngredientOptions()
          .then(setIngredientOptions)
          .catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setAiNameLoading(false);
    }
  };

  // ── AI: recommend price ─────────────────────────────────────────────────
  const handleRecommendPrice = async () => {
    setAiPriceLoading(true);
    setError(null);
    setPriceHint(null);
    try {
      const result = await recommendPrice({
        recipeCost,
        categoryName: categoryName || undefined,
        productName: name || undefined,
      });
      setSellingPrice(result.recommendedPrice);
      setPriceHint(`${result.reasoning} (margin ~${result.margin.toFixed(0)}%)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Price recommendation failed");
    } finally {
      setAiPriceLoading(false);
    }
  };

  // ── Recipe helpers ──────────────────────────────────────────────────────
  const updateRow = useCallback(
    (index: number, updated: DraftRecipeRow) => setRecipe((prev) => prev.map((r, i) => (i === index ? updated : r))),
    [],
  );

  const removeRow = useCallback(
    async (index: number) => {
      const row = recipe[index];
      // If the row was AI-created (isNew + positive DB id), delete from DB
      if (row?.isNew && row.ingredientId > 0) {
        try {
          await deleteIngredient(row.ingredientId);
          // Refresh options since ingredient was deleted
          getIngredientOptions()
            .then(setIngredientOptions)
            .catch(() => {});
        } catch {
          // Non-critical — still remove from form even if API delete fails
        }
      }
      setRecipe((prev) => prev.filter((_, i) => i !== index));
    },
    [recipe],
  );

  const addRow = () => setRecipe((prev) => [...prev, emptyRow(prev.length)]);

  const handleRecipeFromPhoto = (rows: DraftRecipeRow[]) => {
    setRecipe(rows);
    setRecipePhotoOpen(false);
    // Re-fetch ingredients in case new ones were created
    getIngredientOptions()
      .then(setIngredientOptions)
      .catch(() => {});
  };

  // ── Validation ──────────────────────────────────────────────────────────
  const [submitted, setSubmitted] = useState(false);

  /** Returns true if the row is a new ingredient that still needs unit/cost filled in. */
  const rowNeedsUnit = (r: DraftRecipeRow) =>
    (r.isNew === true || r.ingredientId < 0) && !!r.ingredientName?.trim() && !r.unit?.trim();
  const rowNeedsCost = (r: DraftRecipeRow) =>
    (r.isNew === true || r.ingredientId < 0) && !!r.ingredientName?.trim() && r.costPerUnit == null;

  const validate = () => {
    if (!name.trim()) return "Product name is required.";
    if (!categoryName.trim()) return "Category is required.";
    if (!sellingPrice || sellingPrice <= 0) return "Selling price must be greater than 0.";
    const hasInvalid = recipe.some((r) => !r.ingredientName.trim() || r.quantity <= 0);
    if (recipe.length > 0 && hasInvalid) return "Each recipe row needs an ingredient name and a positive quantity.";
    if (recipe.some(rowNeedsUnit)) return "Some new ingredients are missing a unit.";
    if (recipe.some(rowNeedsCost)) return "Some new ingredients are missing a cost per unit.";
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // PATCH any AI-created new ingredients that have optional stock/expiry set
      const newWithExtras = recipe.filter(
        (r) => r.isNew && r.ingredientId > 0 && (r.initialStock !== undefined || r.expirationDate),
      );
      if (newWithExtras.length > 0) {
        await Promise.allSettled(
          newWithExtras.map((r) =>
            patchIngredient(r.ingredientId, {
              ...(r.initialStock !== undefined ? { initialStock: r.initialStock } : {}),
              ...(r.expirationDate ? { expirationDate: r.expirationDate } : {}),
            }),
          ),
        );
      }

      // Build recipe payload — skip rows with empty or negative (new-but-unresolved) ids
      const recipePayload = recipe
        .filter((r) => r.ingredientId > 0 && r.ingredientName.trim())
        .map((r) => ({ ingredientId: r.ingredientId, quantity: r.quantity }));

      await createProduct({
        name: name.trim(),
        categoryName: categoryName.trim(),
        sellingPrice,
        recipe: recipePayload,
      });

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => router.push("/dashboard/products"), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-green-600">
        <CheckCircle2 size={56} />
        <p className="text-xl font-bold">Product saved!</p>
        <p className="text-sm text-gray-500">Redirecting to products list…</p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 text-red-600 rounded-xl p-4 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Product name ─ */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 space-y-2">
        <label className="text-sm font-bold text-gray-700">Product Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Es Kopi Susu"
            className="flex-1 border border-indigo-200 rounded-xl px-4 py-2.5 text-base focus:ring-2 focus:ring-indigo-400 outline-none"
          />
          <button
            type="button"
            onClick={handleGenerateFromName}
            disabled={!name.trim() || aiNameLoading}
            title="Auto-generate category, price & recipe from name"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {aiNameLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            AI Fill
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Click &quot;AI Fill&quot; to auto-populate category, price and recipe using AI.
        </p>
      </div>

      {/* ── Category + Selling Price ─ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Category */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 space-y-2 relative">
          <label className="text-sm font-bold text-gray-700">Category</label>
          <div className="flex gap-2">
            <input
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                setCategoryOpen(true);
              }}
              onFocus={() => setCategoryOpen(true)}
              onBlur={() => setTimeout(() => setCategoryOpen(false), 150)}
              placeholder="e.g. Minuman"
              className="flex-1 border border-indigo-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setCategoryOpen((v) => !v);
              }}
              className="px-3 text-gray-400 hover:text-indigo-500"
            >
              <ChevronDown size={16} />
            </button>
          </div>
          {categoryOpen && categoryOptions.length > 0 && (
            <ul className="absolute z-30 mt-1 bg-white border border-indigo-100 rounded-xl shadow-xl max-h-36 overflow-y-auto text-sm w-[calc(100%-2rem)]">
              {categoryOptions
                .filter((c) => c.name.toLowerCase().includes(categoryName.toLowerCase()))
                .map((c) => (
                  <li
                    key={c.id}
                    onMouseDown={() => {
                      setCategoryName(c.name);
                      setCategoryOpen(false);
                    }}
                    className="px-4 py-2 hover:bg-indigo-50 cursor-pointer"
                  >
                    {c.name}
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* Selling price */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 space-y-2">
          <label className="text-sm font-bold text-gray-700">Selling Price (Rp)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={sellingPrice}
              onChange={(e) => {
                setSellingPrice(Number(e.target.value));
                setPriceHint(null);
              }}
              placeholder="0"
              className="flex-1 border border-indigo-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
            />
            <button
              type="button"
              onClick={handleRecommendPrice}
              disabled={aiPriceLoading}
              title="Get AI price recommendation based on recipe cost"
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-xs font-semibold rounded-xl hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiPriceLoading ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
              AI Price
            </button>
          </div>
          {priceHint && <p className="text-xs text-violet-600 mt-1">{priceHint}</p>}
          {sellingPrice > 0 && recipeCost > 0 && (
            <p className="text-xs text-gray-400">
              Cost: {formatCurrency(recipeCost)} — Margin:{" "}
              <span
                className={
                  margin >= 50
                    ? "text-green-600 font-semibold"
                    : margin >= 20
                      ? "text-yellow-600 font-semibold"
                      : "text-red-600 font-semibold"
                }
              >
                {margin}%
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ── Recipe section ─ */}
      <div className="bg-white rounded-2xl shadow border border-gray-100">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-linear-to-r from-indigo-50 to-violet-50 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-indigo-700">Recipe / Ingredients</h3>
            {recipeCost > 0 && <p className="text-xs text-gray-500 mt-0.5">Total cost: {formatCurrency(recipeCost)}</p>}
          </div>
          <button
            type="button"
            onClick={() => setRecipePhotoOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-indigo-300 text-indigo-600 text-xs font-semibold rounded-xl hover:bg-indigo-50 transition"
          >
            <Camera size={14} />
            From Photo
          </button>
        </div>

        {/* Column headers */}
        <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50/60 border-b border-gray-100">
          <div className="col-span-4">Ingredient</div>
          <div className="col-span-2">Qty</div>
          <div className="col-span-2">Unit</div>
          <div className="col-span-2">Cost / unit</div>
          <div className="col-span-2">Subtotal</div>
        </div>

        <div className="divide-y divide-gray-50 px-3 py-2 space-y-1">
          {recipe.map((row, i) => (
            <IngredientSelectorRow
              key={`${row.ingredientId}-${i}`}
              row={row}
              index={i}
              ingredientOptions={ingredientOptions}
              usedIngredientIds={
                new Set(recipe.filter((r, j) => j !== i && r.ingredientId > 0).map((r) => r.ingredientId))
              }
              unitError={submitted && rowNeedsUnit(row)}
              costError={submitted && rowNeedsCost(row)}
              onChange={(updated) => updateRow(i, updated)}
              onRemove={() => removeRow(i)}
            />
          ))}
        </div>

        <div className="px-6 pb-5 pt-3">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 text-indigo-600 text-sm font-semibold hover:text-indigo-800 transition"
          >
            <Plus size={16} />
            Add Ingredient
          </button>
        </div>
      </div>

      {/* ── Submit ─ */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold text-base rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving…
            </>
          ) : (
            "Confirm & Save"
          )}
        </button>
      </div>

      {recipePhotoOpen && (
        <RecipePhotoModal
          productName={name || undefined}
          onClose={() => setRecipePhotoOpen(false)}
          onSuccess={handleRecipeFromPhoto}
        />
      )}
    </form>
  );
}
