import OrderStatusBadge from './OrderStatusBadge'
import OrderTimer from './OrderTimer'

export default function OrderCard({ order, items = [], onCancel, cancelling }) {
  const canCancel = order.status === 'pending' && order.cancellationLockedAt
    ? new Date(order.cancellationLockedAt) > new Date()
    : order.status === 'pending'

  return (
    <article id={`order-${order.id}`} className="rounded-2xl border border-[#1F2937] bg-[#151B2B] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <span className="text-xs text-[#8B93A7]">#{order.id.slice(0, 8)}</span>
          </div>
          <OrderTimer createdAt={order.createdAt} canCancelUntil={order.cancellationLockedAt} />
        </div>
        {canCancel && (
          <button
            id={`cancel-order-${order.id}`}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            disabled={cancelling === order.id}
            onClick={() => onCancel && onCancel(order.id)}
          >
            {cancelling === order.id ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </div>
      {order.notes && <p className="mt-3 text-sm text-[#9CA3AF]">Note: {order.notes}</p>}
      {items.length > 0 && (
        <ul className="mt-4 grid gap-1">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm text-[#9CA3AF]">
              <span>{item.name ?? `Item #${item.itemId?.slice(0, 6)}`} × {item.quantity}</span>
              {item.price && <span>Rs {(item.price * item.quantity).toFixed(2)}</span>}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
