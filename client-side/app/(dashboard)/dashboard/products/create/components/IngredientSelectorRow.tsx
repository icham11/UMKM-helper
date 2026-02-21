"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, ChevronDown, Lock } from "lucide-react";
import type { DraftRecipeRow } from "@/types/product";
import type { IngredientOption } from "@/lib/api/products";

/**
 * Determines whether the row is "new" — either AI-generated (positive id, isNew true)
 * or typed-but-not-yet-saved (negative id).
 * New rows get full edit access; existing rows are qty-only.
 */
function isNewRow(row: DraftRecipeRow) {
  return row.isNew === true || row.ingredientId < 0;
}

interface Props {
  row: DraftRecipeRow;
  index: number;
  ingredientOptions: IngredientOption[];
  /** IDs of ingredients already used in OTHER rows — excluded from dropdown. */
  usedIngredientIds?: Set<number>;
  onChange: (updated: DraftRecipeRow) => void;
  /** Called when user clicks delete.
   *  ProductForm decides whether to also call the DELETE API. */
  onRemove: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function IngredientSelectorRow({
  row,
  index,
  ingredientOptions,
  usedIngredientIds,
  onChange,
  onRemove,
}: Props) {
  const isNew = isNewRow(row);

  // Name-search state — only used for new rows
  const [query, setQuery] = useState(row.ingredientName ?? "");
  const [open, setOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter by search query AND exclude ingredients already used in other rows
  const filtered = ingredientOptions.filter(
    (opt) => opt.name.toLowerCase().includes(query.toLowerCase()) && !usedIngredientIds?.has(opt.id),
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (opt: IngredientOption) => {
    // Block if already used in another row
    if (usedIngredientIds?.has(opt.id)) {
      setDuplicateWarning(true);
      setTimeout(() => setDuplicateWarning(false), 2000);
      setOpen(false);
      return;
    }
    setDuplicateWarning(false);
    onChange({
      ...row,
      ingredientId: opt.id,
      ingredientName: opt.name,
      unit: opt.unit,
      costPerUnit: opt.costPerUnit,
      isNew: false,
    });
    setQuery(opt.name);
    setOpen(false);
  };

  const handleNameBlur = () => {
    if (!isNew) return;
    const match = ingredientOptions.find((o) => o.name.toLowerCase() === query.toLowerCase());
    if (match) {
      handleSelect(match);
    } else if (query.trim()) {
      onChange({
        ...row,
        ingredientId: -(index + 1),
        ingredientName: query.trim(),
        isNew: true,
      });
    }
    setOpen(false);
  };

  const subtotal = row.quantity * (row.costPerUnit ?? 0);
  const willDeleteFromDB = isNew && row.ingredientId > 0;

  return (
    <div
      className={`grid grid-cols-12 gap-2 items-start py-3 px-3 rounded-xl border transition ${
        isNew
          ? "bg-amber-50/40 border-amber-200 hover:border-amber-300"
          : "bg-white border-gray-100 hover:border-indigo-200"
      }`}
    >
      {/* ── Name (col 4) ─────────────────────────────── */}
      <div className="col-span-4 relative" ref={containerRef}>
        {isNew ? (
          <>
            <div className="flex items-center gap-1">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                  onChange({ ...row, ingredientName: e.target.value });
                }}
                onFocus={() => setOpen(true)}
                onBlur={handleNameBlur}
                placeholder="Ingredient name"
                className="w-full border border-amber-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none bg-white"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen((v) => !v);
                }}
                className="p-1.5 text-gray-400 hover:text-amber-500 shrink-0"
              >
                <ChevronDown size={13} />
              </button>
            </div>
            {duplicateWarning ? (
              <span className="inline-flex items-center mt-1 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold leading-none">
                Already in recipe
              </span>
            ) : (
              <span className="inline-flex items-center mt-1 text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold leading-none">
                NEW
              </span>
            )}

            {open && (
              <ul className="absolute z-30 top-full mt-1 w-full bg-white border border-amber-100 rounded-xl shadow-xl max-h-48 overflow-y-auto text-sm">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-gray-400 italic">&quot;{query}&quot; — will be created as new</li>
                ) : (
                  filtered.map((opt) => (
                    <li
                      key={opt.id}
                      onMouseDown={() => handleSelect(opt)}
                      className="flex justify-between items-center px-3 py-2 hover:bg-amber-50 cursor-pointer"
                    >
                      <span className="font-medium">{opt.name}</span>
                      <span className="text-xs text-gray-400">{opt.unit}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </>
        ) : (
          /* Existing ingredient — read-only name with lock icon */
          <div className="flex items-center gap-1.5 py-1.5">
            <Lock size={11} className="text-gray-300 shrink-0" />
            <span className="text-sm font-semibold text-slate-700 truncate leading-tight">{row.ingredientName}</span>
          </div>
        )}
      </div>

      {/* ── Qty (col 2) ──────────────────────────────── */}
      <div className="col-span-2">
        <input
          type="number"
          min={0}
          step="any"
          value={row.quantity}
          onChange={(e) => onChange({ ...row, quantity: Number(e.target.value) })}
          placeholder="Qty"
          className="w-full border border-indigo-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
        />
      </div>

      {/* ── Unit (col 2) ─────────────────────────────── */}
      <div className="col-span-2">
        {isNew ? (
          <input
            value={row.unit}
            onChange={(e) => onChange({ ...row, unit: e.target.value })}
            placeholder="Unit"
            className="w-full border border-amber-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none bg-white"
          />
        ) : (
          <div className="py-1.5">
            <span className="text-sm text-gray-500 font-medium">{row.unit || "—"}</span>
          </div>
        )}
      </div>

      {/* ── Cost / unit (col 2) ──────────────────────── */}
      <div className="col-span-2">
        {isNew ? (
          <input
            type="number"
            min={0}
            value={row.costPerUnit ?? ""}
            onChange={(e) =>
              onChange({
                ...row,
                costPerUnit: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="Cost/unit"
            className="w-full border border-amber-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none bg-white"
          />
        ) : (
          /* Existing — display cost per unit as read-only */
          <div className="py-1.5">
            <span className="text-xs text-indigo-600 font-semibold">
              {row.costPerUnit != null && row.costPerUnit > 0 ? formatCurrency(row.costPerUnit) : "—"}
            </span>
          </div>
        )}
      </div>

      {/* ── Subtotal + delete (col 2) ─────────────────── */}
      <div className="col-span-2 flex items-center justify-between gap-1 py-1.5">
        <span className={`text-xs font-bold truncate ${subtotal > 0 ? "text-indigo-700" : "text-gray-300"}`}>
          {subtotal > 0 ? formatCurrency(subtotal) : "—"}
        </span>
        <button
          type="button"
          onClick={onRemove}
          title={willDeleteFromDB ? "Delete this AI-created ingredient from the database" : "Remove from recipe"}
          className={`p-1.5 rounded-full transition ${
            willDeleteFromDB
              ? "hover:bg-red-100 text-red-400 hover:text-red-600"
              : "hover:bg-red-50 text-red-300 hover:text-red-500"
          }`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
