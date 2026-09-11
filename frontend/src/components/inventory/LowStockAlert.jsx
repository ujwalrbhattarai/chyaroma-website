export default function LowStockAlert({ ingredients }) {
  if (!ingredients || ingredients.length === 0) return null
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="mb-2 font-semibold text-[#F5A623]">⚠ Low stock ({ingredients.length} item{ingredients.length !== 1 ? 's' : ''})</p>
      <ul className="grid gap-1">
        {ingredients.map((item) => (
          <li key={item.id} className="flex items-center justify-between text-sm text-[#F5A623]">
            <span>{item.name}</span>
            <span className="font-mono font-medium">{item.stockQuantity} {item.unit} <span className="text-[#F5A623] text-xs">(threshold: {item.lowStockThreshold})</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}
