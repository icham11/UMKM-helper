type CardProps = {
  title: string;
  value: number | string;
};

export function Card({ title, value }: CardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="text-3xl font-semibold mt-3 text-gray-900">
        {typeof value === "number"
          ? `Rp ${value.toLocaleString("id-ID")}`
          : value}
      </h3>
    </div>
  );
}