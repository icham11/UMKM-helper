type Props = {
  label: string
  active?: boolean
}

export default function SidebarItem({ label, active }: Props) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition ${
        active
          ? "bg-indigo-100 text-indigo-600 font-semibold"
          : "hover:bg-gray-100 text-gray-600"
      }`}
    >
      <div className="w-4 h-4 bg-gray-400 rounded-sm"></div>
      <span>{label}</span>
    </div>
  )
}