export default function BillSummary({ bill }) {
  if (!bill) return null
  const statusColor = {
    draft: 'text-[#9CA3AF]',
    finalized: 'text-green-700',
    paid: 'text-blue-700',
    adjustment: 'text-[#F5A623]',
  }
  return (
    <div className="rounded-xl border border-[#1F2937] bg-[#151B2B] p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[#F9FAFB]">Bill #{bill.id?.slice(0, 8)}</h3>
        <span className={`text-sm font-semibold ${statusColor[bill.status] ?? 'text-[#9CA3AF]'}`}>
          {bill.status?.toUpperCase()}
        </span>
      </div>
      <dl className="mt-4 grid gap-2">
        <div className="flex justify-between text-sm">
          <dt className="text-[#9CA3AF]">Subtotal</dt>
          <dd className="font-medium text-[#F9FAFB]">Rs {Number(bill.subtotal ?? 0).toFixed(2)}</dd>
        </div>
        {bill.taxRate > 0 && (
          <div className="flex justify-between text-sm">
            <dt className="text-[#9CA3AF]">Tax ({bill.taxRate}%)</dt>
            <dd className="font-medium text-[#F9FAFB]">Rs {Number(bill.taxAmount ?? 0).toFixed(2)}</dd>
          </div>
        )}
        {bill.discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <dt className="text-[#9CA3AF]">Discount</dt>
            <dd className="font-medium text-red-700">− Rs {Number(bill.discountAmount).toFixed(2)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-[#1F2937] pt-2 text-base">
          <dt className="font-bold text-[#F9FAFB]">Total</dt>
          <dd className="font-bold text-[#F9FAFB]">Rs {Number(bill.totalAmount ?? 0).toFixed(2)}</dd>
        </div>
      </dl>
      {bill.notes && <p className="mt-3 text-sm text-[#9CA3AF]">{bill.notes}</p>}
    </div>
  )
}
