import { z } from "zod";

// ===================== CATEGORY =====================

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// ===================== INGREDIENT =====================

export const createIngredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required").max(200),
  unit: z.string().min(1, "Unit is required").max(50),
  minStock: z.number().int().min(0).default(0),
  initialBatch: z
    .object({
      quantity: z.number().positive("Quantity must be positive"),
      costPerUnit: z.number().min(0, "Cost must be non-negative"),
      expirationDate: z.string().datetime().optional(),
    })
    .optional(),
});

export const bulkCreateIngredientsSchema = z.object({
  ingredients: z.array(createIngredientSchema).min(1, "At least one ingredient is required"),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;

export const updateIngredientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  unit: z.string().min(1).max(50).optional(),
  minStock: z.number().int().min(0).optional(),
  batch: z
    .object({
      remainingQty: z.number().min(0, "Stock must be non-negative").optional(),
      costPerUnit: z.number().min(0, "Cost must be non-negative").optional(),
      expirationDate: z.string().datetime().nullable().optional(),
    })
    .optional(),
});

export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;

// ===================== RECIPE ITEM =====================

export const recipeItemSchema = z.object({
  ingredientId: z.number().int().positive(),
  quantity: z.number().positive("Quantity must be positive"),
});

export type RecipeItemInput = z.infer<typeof recipeItemSchema>;

// ===================== PRODUCT =====================

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  categoryName: z.string().min(1, "Category is required").max(100),
  sellingPrice: z.number().positive("Selling price must be positive"),
  recipe: z.array(recipeItemSchema).optional().default([]),
});

export const bulkCreateProductsSchema = z.object({
  products: z.array(createProductSchema).min(1, "At least one product is required"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// ===================== AI GENERATION =====================

export const generateProductByNameSchema = z.object({
  productName: z.string().min(1, "Product name is required").max(200),
});

export type GenerateProductByNameInput = z.infer<typeof generateProductByNameSchema>;

// ===================== API RESPONSE TYPES =====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface ProductWithRecipe {
  id: number;
  name: string;
  sellingPrice: number;
  isActive: boolean;
  categoryId: number | null;
  category: { id: number; name: string } | null;
  recipeCost: number; // computed: sum(quantity * costPerUnit)
  recipes: {
    id: number;
    quantity: number;
    ingredient: {
      id: number;
      name: string;
      unit: string;
      costPerUnit: number | null; // from latest batch
      currentStock: number; // sum of remaining batch quantities
    };
  }[];
}

export interface IngredientWithBatches {
  id: number;
  name: string;
  unit: string;
  minStock: number;
  inventoryBatches: {
    id: number;
    remainingQty: number;
    costPerUnit: number;
    expirationDate: string | null;
  }[];
}

// ===================== AI GENERATED SHAPES =====================

/** Shape the AI should return for a single generated product */
export interface AIGeneratedProduct {
  name: string;
  categoryName: string;
  sellingPrice: number;
  recipeCost?: number; // computed: sum(quantity * costPerUnit)
  recipe: {
    ingredientId?: number; // existing ingredient
    ingredientName: string; // for display / new ingredient creation
    unit: string;
    quantity: number;
    costPerUnit?: number; // from latest batch or AI estimate
    estimatedStockQty?: number; // AI-estimated initial stock for new ingredients
  }[];
}

/** Schema for recommend-price endpoint */
export const recommendPriceSchema = z.object({
  recipeCost: z.number().min(0, "Recipe cost must be non-negative"),
  categoryName: z.string().optional(),
  productName: z.string().optional(),
});

export type RecommendPriceInput = z.infer<typeof recommendPriceSchema>;
