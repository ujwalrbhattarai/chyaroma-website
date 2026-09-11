export default function ReceiptView({ bill, payments = [] }) {
  if (!bill) return null
  const receiptFooter = bill.receiptFooter || 'Thank you for visiting!'
  return (
    <div id="receipt-print-area" className="rounded-xl border border-[#1F2937] bg-[#151B2B] p-6 font-mono text-sm shadow-sm">
      <div className="mb-4 text-center">
        <p className="text-base font-bold">RECEIPT</p>
        <p className="text-xs text-[#9CA3AF]">Receipt</p>
        <p className="mt-1 text-xs text-[#8B93A7]">Bill #{bill.id?.slice(0, 8)}</p>
      </div>
      <hr className="my-3 border-dashed border-[#374151]" />
      <dl className="grid gap-1">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>Rs {Number(bill.subtotal ?? 0).toFixed(2)}</dd></div>
        {bill.taxRate > 0 && <div className="flex justify-between"><dt>Tax ({bill.taxRate}%)</dt><dd>Rs {Number(bill.taxAmount ?? 0).toFixed(2)}</dd></div>}
        {bill.discountAmount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>- Rs {Number(bill.discountAmount).toFixed(2)}</dd></div>}
      </dl>
      <hr className="my-3 border-dashed border-[#374151]" />
      <div className="flex justify-between text-base font-bold"><span>TOTAL</span><span>Rs {Number(bill.totalAmount ?? 0).toFixed(2)}</span></div>
      {payments.length > 0 && (
        <>
          <hr className="my-3 border-dashed border-[#374151]" />
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase">Payments</p>
          {payments.map((p, i) => (
            <div key={p.id ?? i} className="flex justify-between text-xs mt-1">
              <span>{p.method}</span><span>Rs {Number(p.amount).toFixed(2)}</span>
            </div>
          ))}
        </>
      )}
      <hr className="my-3 border-dashed border-[#374151]" />
      <p className="text-center text-xs text-[#8B93A7]">{receiptFooter}</p>
    </div>
  )
}
