export default function StockLevelRow({ ingredient, onAdjust }) {
  const pct = ingredient.lowStockThreshold > 0
    ? Math.min(100, Math.round((ingredient.stockQuantity / ingredient.lowStockThreshold) * 100))
    : 100
  const barColor = pct <= 50 ? 'bg-red-500' : pct <= 100 ? 'bg-amber-400' : 'bg-green-500'
  const isLow = ingredient.stockQuantity <= ingredient.lowStockThreshold

  return (
    <tr id={`ingredient-row-${ingredient.id}`} className={`border-b border-[#1E2435] ${isLow ? 'bg-amber-50' : ''}`}>
      <td className="py-3 pl-4 pr-2 font-medium text-[#F9FAFB]">{ingredient.name}</td>
      <td className="px-2 py-3 text-[#9CA3AF]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-[#232C3D]">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <span className="text-sm tabular-nums">{ingredient.stockQuantity} {ingredient.unit}</span>
          {isLow && <span className="text-xs text-[#F5A623] font-semibold">LOW</span>}
        </div>
      </td>
      <td className="px-2 py-3 text-sm text-[#9CA3AF]">≤ {ingredient.lowStockThreshold} {ingredient.unit}</td>
      <td className="py-3 pl-2 pr-4 text-right">
        <button
          id={`adjust-stock-${ingredient.id}`}
          className="rounded-lg border border-[#374151] px-3 py-1.5 text-xs text-[#9CA3AF] hover:bg-[#0B0F1A]"
          onClick={() => onAdjust(ingredient)}
        >
          Adjust
        </button>
      </td>
    </tr>
  )
}
