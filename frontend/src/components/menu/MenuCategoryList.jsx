import MenuItemCard from './MenuItemCard'

export default function MenuCategoryList({ category, items, onEditCategory, onDeactivateCategory, onAddItem, onEditItem, onToggleAvailability, toggling }) {
	return (
		<section id={`category-${category.id}`} className={`rounded-2xl border bg-[#151B2B] shadow-sm ${category.isActive ? 'border-[#1F2937]' : 'border-[#1E2435] opacity-60'}`}>
			<div className="flex items-center justify-between gap-3 border-b border-[#1E2435] px-5 py-4">
				<div>
					<h2 className="font-semibold text-[#F9FAFB]">{category.name}</h2>
					<p className="text-xs text-[#9CA3AF]">{items.length} item{items.length !== 1 ? 's' : ''}</p>
				</div>
				<div className="flex gap-2">
					{category.isActive && (
						<button
							id={`add-item-${category.id}`}
							className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
							onClick={() => onAddItem(category)}
						>
							+ Item
						</button>
					)}
					<button
						id={`edit-category-${category.id}`}
						className="rounded-lg border border-[#374151] px-3 py-1.5 text-xs text-[#9CA3AF] hover:bg-[#0B0F1A]"
						onClick={() => onEditCategory(category)}
					>
						Edit
					</button>
					{category.isActive && (
						<button
							id={`deactivate-category-${category.id}`}
							className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
							onClick={() => onDeactivateCategory(category.id)}
						>
							Hide
						</button>
					)}
				</div>
			</div>
			{items.length === 0
				? <p className="px-5 py-6 text-sm text-[#8B93A7]">No items in this category yet.</p>
				: <div className="grid gap-3 p-5 sm:grid-cols-2">
					{items.map((item) => (
						<MenuItemCard
							key={item.id}
							item={item}
							onEdit={onEditItem}
							onToggle={onToggleAvailability}
							toggling={toggling}
						/>
					))}
				</div>}
		</section>
	)
}
