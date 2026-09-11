import AvailabilityToggle from './AvailabilityToggle'
import { imageUrl } from '../../services/menuService'

export default function MenuItemCard({ item, onEdit, onToggle, toggling }) {
	return (
		<article id={`menu-item-${item.id}`} className={`rounded-xl border p-4 transition-opacity ${item.isAvailable ? 'border-[#1F2937] bg-[#151B2B]' : 'border-[#1E2435] bg-[#0B0F1A] opacity-70'}`}>
			{item.imageUrl && (
				<div className="mb-3 h-32 w-full overflow-hidden rounded-lg bg-[#1B2233]">
					<img src={imageUrl(item.imageUrl)} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
				</div>
			)}
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="truncate font-semibold text-[#F9FAFB]">{item.name}</p>
					{item.description && <p className="mt-0.5 text-sm text-[#9CA3AF] line-clamp-2">{item.description}</p>}
					<div className="mt-2 flex flex-wrap gap-3 text-sm">
						<span className="font-medium text-[#F5A623]">Rs {Number(item.price).toFixed(2)}</span>
						{item.prepTimeMinutes > 0 && <span className="text-[#9CA3AF]">⏱ {item.prepTimeMinutes} min</span>}
					</div>
				</div>
				<div className="flex flex-col items-end gap-3">
					<AvailabilityToggle itemId={item.id} isAvailable={item.isAvailable} onToggle={onToggle} disabled={toggling === item.id} />
					<button
						id={`edit-item-${item.id}`}
						className="rounded-lg border border-[#374151] px-3 py-1 text-xs text-[#9CA3AF] hover:bg-[#0B0F1A]"
						onClick={() => onEdit(item)}
					>
						Edit
					</button>
				</div>
			</div>
		</article>
	)
}
