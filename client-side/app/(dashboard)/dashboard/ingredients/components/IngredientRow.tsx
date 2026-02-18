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
        {ingredient.stock}{" "}
        <LowStockBadge
          stock={ingredient.stock}
          minStock={ingredient.minStock}
        />
      </td>
      <td className="p-4">{ingredient.minStock}</td>
      <td className="p-4">
        Rp {ingredient.costPerUnit.toLocaleString("id-ID")}
      </td>
    </tr>
  );
}