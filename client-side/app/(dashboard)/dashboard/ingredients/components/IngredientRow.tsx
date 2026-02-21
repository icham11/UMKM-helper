import { Ingredient } from "../type";
import LowStockBadge from "./LowStockBadge";

interface Props {
  ingredient: Ingredient;
}

export default function IngredientRow({ ingredient }: Props) {
  return (
    <tr className="border-b text-sm">
      <td className="p-4 font-medium">{ingredient.name}</td>
      <td className="p-4">{ingredient.unit}</td>
      <td className="p-4">
        {(ingredient.stock === -1 || ingredient.stock === 0) ? (
          <span className="text-gray-400 italic">Belum di-set</span>
        ) : (
          <>
            {ingredient.stock}{" "}
            <LowStockBadge
              stock={ingredient.stock}
              minStock={ingredient.minStock}
            />
          </>
        )}
      </td>
      <td className="p-4">
        {(ingredient.minStock === -1 || ingredient.minStock === 0) ? (
          <span className="text-gray-400 italic">Belum di-set</span>
        ) : (
          ingredient.minStock
        )}
      </td>
      <td className="p-4">
        Rp {ingredient.costPerUnit.toLocaleString("id-ID")}
      </td>
    </tr>
  );
}