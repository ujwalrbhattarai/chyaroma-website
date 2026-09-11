import OrderStatusBadge from '../orders/OrderStatusBadge'
import OrderTimer from '../orders/OrderTimer'

export default function KitchenOrderColumn({ status, orders, onAdvance }) {
	const colConfig = {
		pending:   { title: 'New orders',   headerClass: 'bg-[#2A3348] text-white' },
		accepted:  { title: 'Accepted',     headerClass: 'bg-amber-600 text-white' },
		preparing: { title: 'Preparing',    headerClass: 'bg-blue-600 text-white' },
		ready:     { title: 'Ready to serve', headerClass: 'bg-green-600 text-white' },
	}
	const nextStatus = { pending: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'completed' }
	const nextLabel  = { pending: 'Accept', accepted: 'Preparing', preparing: 'Mark Ready', ready: 'Complete' }

	const { title, headerClass } = colConfig[status] ?? { title: status, headerClass: 'bg-[#475569] text-white' }

	return (
		<section className="flex flex-col rounded-2xl border border-[#1F2937] bg-[#0B0F1A] overflow-hidden">
			<div className={`flex items-center justify-between px-4 py-3 ${headerClass}`}>
				<h2 className="font-semibold">{title}</h2>
				<span className="rounded-full bg-[#151B2B] px-2.5 py-0.5 text-sm font-bold">{orders.length}</span>
			</div>
			<div className="flex flex-col gap-3 overflow-y-auto p-3" style={{ maxHeight: '70vh' }}>
				{orders.length === 0
					? <p className="py-6 text-center text-sm text-[#8B93A7]">None</p>
					: orders.map((order) => (
						<article key={order.id} className="rounded-xl bg-[#151B2B] border border-[#1F2937] p-4 shadow-sm">
							<div className="flex items-center justify-between gap-2">
								<span className="font-semibold text-[#F9FAFB]">Table #{order.tableNumber ?? order.tableId?.slice(0, 6)}</span>
								<OrderStatusBadge status={order.status} />
							</div>
							<OrderTimer createdAt={order.createdAt} />
							{order.notes && <p className="mt-2 text-xs text-[#9CA3AF]">📝 {order.notes}</p>}
							{order.items && order.items.length > 0 && (
								<ul className="mt-3 grid gap-1 rounded-lg bg-[#0B0F1A] p-2.5">
									{order.items.map((item) => (
										<li key={item.id} className="flex items-center justify-between text-sm">
											<span className="text-[#E5E7EB] font-medium">
												{item.name ?? `Item #${item.itemId?.slice(0, 6)}`}
												<span className="ml-1.5 text-xs font-bold text-[#F5A623]">× {item.quantity}</span>
											</span>
											{item.unitPrice != null && (
												<span className="text-xs font-semibold text-[#9CA3AF]">Rs {(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
											)}
										</li>
									))}
								</ul>
							)}
							<button
								id={`kitchen-advance-${order.id}`}
								className="mt-3 w-full rounded-lg bg-[#0B0F1A] py-2 text-sm font-semibold text-white hover:bg-[#2A3348]"
								onClick={() => onAdvance(order.id, nextStatus[status])}
							>
								{nextLabel[status]}
							</button>
						</article>
					))}
			</div>
		</section>
	)
}
