"use client";

import { useRef, useState } from "react";
import { X, ImageIcon, AlertTriangle, Loader2, Upload } from "lucide-react";
import { generateRecipeFromImage } from "@/lib/api/products";
import type { DraftRecipeRow } from "@/types/product";

interface Props {
  productName?: string;
  onClose: () => void;
  onSuccess: (recipe: DraftRecipeRow[]) => void;
}

export default function RecipePhotoModal({ productName, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selected: File) => {
    if (!selected.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, WebP).");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10 MB.");
      return;
    }
    setFile(selected);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateRecipeFromImage(file, productName);
      if (!result.isValid) {
        setError(
          result.error ?? "The image doesn't appear to be a recipe. Try a clearer recipe card or ingredients photo.",
        );
        return;
      }
      const recipe: DraftRecipeRow[] = (result.data?.recipe ?? []).map(
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
          isNew: r.isNew,
        }),
      );
      onSuccess(recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process recipe image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition">
          <X size={20} className="text-gray-500" />
        </button>

        <h2 className="text-xl font-extrabold text-indigo-700 mb-1">Generate Recipe from Photo</h2>
        <p className="text-sm text-gray-500 mb-6">
          Upload a recipe card or ingredients photo — AI will extract the recipe.
        </p>

        {!preview ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-indigo-300 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-indigo-50 transition"
          >
            <ImageIcon size={40} className="text-indigo-300" />
            <p className="text-indigo-500 font-semibold text-sm">Drag & drop or click to upload</p>
            <p className="text-xs text-gray-400">JPEG, PNG, WebP — max 10 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden border border-indigo-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="w-full max-h-52 object-contain bg-gray-50" />
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-red-50 transition"
            >
              <X size={14} className="text-red-500" />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!file || loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Upload size={16} />
                Extract Recipe
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
