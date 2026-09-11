export default function OrderStatusBadge({ status }) {
  const config = {
    pending:    { label: 'Pending',    className: 'bg-[#1B2233] text-[#9CA3AF]' },
    accepted:   { label: 'Accepted',   className: 'bg-amber-100 text-[#F5A623]' },
    preparing:  { label: 'Preparing',  className: 'bg-blue-100 text-blue-800' },
    ready:      { label: 'Ready ✓',    className: 'bg-green-100 text-green-800' },
    completed:  { label: 'Completed',  className: 'bg-[#232C3D] text-[#9CA3AF]' },
    cancelled:  { label: 'Cancelled',  className: 'bg-red-100 text-red-700' },
  }
  const { label, className } = config[status] ?? { label: status, className: 'bg-[#1B2233] text-[#9CA3AF]' }
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${className}`}>
      {label}
    </span>
  )
}
