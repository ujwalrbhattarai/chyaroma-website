import { useEffect, useState } from 'react'
import { listTables } from '../../services/tableService'
import { getTableBill } from '../../services/billingService'

// Reusable table-floor board: shows every active table as a box. Clicking a box
// fetches that table's current bill and shows its TOTAL so cashiers/managers can
// read the amount at a glance without relying on the customer's phone.
export default function TableBillBoard({ branchId }) {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null) // { table, bill, notFound }
  const [billLoading, setBillLoading] = useState(null) // tableNumber being fetched

  const fetchTables = async () => {
    try {
      setError('')
      const { tables: loaded } = await listTables(branchId)
      setTables(loaded || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchTables()
  }, [branchId])

  useEffect(() => {
    const timer = setInterval(fetchTables, 10000)
    return () => clearInterval(timer)
  }, [branchId])

  const activeTables = tables.filter((t) => t.isActive)
  const occupiedTables = activeTables.filter((t) => t.isOccupied)

  async function openTable(table) {
    setBillLoading(table.tableNumber)
    setError('')
    try {
      const data = await getTableBill(table.tableNumber)
      setSelected({ table, bill: data.bill ?? null, notFound: false })
    } catch {
      // No active/unpaid bill on this table yet — still show the box with a friendly state.
      setSelected({ table, bill: null, notFound: true })
    } finally {
      setBillLoading(null)
    }
  }

  return (
    <section className="neo-card rounded-2xl p-6">
      <div className="flex items-center justify-between border-b border-[#1E2435] pb-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-white">Table Bills</h2>
          <p className="text-xs text-[#9CA3AF]">Tap a table to see its total bill</p>
        </div>
        <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-300">
          {occupiedTables.length} occupied
        </span>
      </div>

      {error && <p className="mb-3 rounded-xl bg-red-950/50 border border-red-800/50 p-3 text-xs text-red-300">{error}</p>}

      {loading ? (
        <div className="py-8 text-center text-sm text-[#9CA3AF] animate-pulse">Loading tables…</div>
      ) : activeTables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1F2937] p-6 text-center text-xs text-[#9CA3AF]">
          No active tables found.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {activeTables.map((table) => (
            <article
              key={table.id}
              onClick={() => openTable(table)}
              className={`cursor-pointer rounded-xl border p-4 transition-all hover:scale-[1.03] ${
                table.isOccupied
                  ? 'bg-red-950/30 border-red-500/40'
                  : 'bg-emerald-950/30 border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white">#{table.tableNumber}</h3>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${table.isOccupied ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`}
                />
              </div>
              {table.label && <p className="mt-0.5 truncate text-[11px] text-[#9CA3AF]">{table.label}</p>}
              <p className="mt-2 text-[11px] font-bold tracking-wider">
                {billLoading === table.tableNumber
                  ? 'Checking…'
                  : table.isOccupied
                    ? 'View bill →'
                    : 'Vacant'}
              </p>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-neo-appear" onClick={() => setSelected(null)}>
          <div className="neo-card rounded-2xl p-6 max-w-md w-full border border-[#D4AF37]/30 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#374151]/50 pb-3">
              <div>
                <h2 className="text-2xl font-black text-[#F9FAFB]">Table #{selected.table.tableNumber}</h2>
                {selected.table.label && <p className="text-xs text-[#9CA3AF] mt-0.5">{selected.table.label}</p>}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-[#9CA3AF] hover:text-white"
              >
                Close
              </button>
            </div>

            {selected.notFound || !selected.bill ? (
              <div className="rounded-xl border border-dashed border-[#1F2937] p-6 text-center">
                <p className="text-sm text-[#9CA3AF]">No active bill for this table yet.</p>
                <p className="mt-1 text-xs text-[#6B7280]">The bill appears once a customer orders.</p>
              </div>
            ) : (
              <>
                <div className="neo-inset rounded-xl p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8B93A7]">Total Bill</p>
                  <p className="text-3xl font-black text-[#F5A623]">Rs {Number(selected.bill.totalAmount).toFixed(2)}</p>
                  {Number(selected.bill.taxAmount) > 0 && (
                    <p className="mt-0.5 text-xs text-[#9CA3AF]">incl. tax Rs {Number(selected.bill.taxAmount).toFixed(2)}</p>
                  )}
                </div>

                {selected.bill.items?.length > 0 && (
                  <div className="space-y-2 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8B93A7]">Items</p>
                    {selected.bill.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[#E5E7EB]">
                        <span>{item.name} <span className="text-[#9CA3AF]">x{item.quantity}</span></span>
                        <span className="font-bold">Rs {(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl bg-black/30 border border-[#374151]/50 px-4 py-3 text-sm">
                  <span className="text-[#9CA3AF]">Status</span>
                  <span className="font-bold text-[#F9FAFB]">
                    {selected.bill.status === 'finalized' ? 'Finalized / Paid' : 'Open / Unpaid'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}