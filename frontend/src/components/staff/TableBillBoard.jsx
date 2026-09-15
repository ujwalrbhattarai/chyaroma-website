import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { listTables, forceReleaseTable } from '../../services/tableService'
import { completeCashPayment, getTableBill } from '../../services/billingService'

// Reusable table-floor board: shows every active table as a box. Each occupied table
// shows its CURRENT running bill total (even before the customer requests a bill), and
// clicking a box fetches the full bill so cashiers/managers can settle or release it.
export default function TableBillBoard({ branchId }) {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null) // { table, bill, notFound }
  const [billLoading, setBillLoading] = useState(null) // tableNumber being fetched
  const [settling, setSettling] = useState(false)
  const [settleMsg, setSettleMsg] = useState('')
  const [releasing, setReleasing] = useState(false)
  const [releaseMsg, setReleaseMsg] = useState('')

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

  // Real-time refresh so a table's running bill (and release status) updates instantly
  // when the customer orders, requests a bill, or when any staff member settles/releases.
  useEffect(() => {
    if (!branchId) return
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { transports: ['websocket'] })
    socket.on('connect', () => {
      socket.emit('join-branch', { branchId: String(branchId) })
      socket.emit('join-staff', { branchId: String(branchId) })
    })
    socket.on('table-updated', fetchTables)
    socket.on('bill-updated', fetchTables)
    return () => socket.disconnect()
  }, [branchId])

  const activeTables = tables.filter((t) => t.isActive)
  const occupiedTables = activeTables.filter((t) => t.isOccupied)

  async function openTable(table) {
    setBillLoading(table.tableNumber)
    setError('')
    setSettleMsg('')
    setReleaseMsg('')
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

  const isPaid = Boolean(selected?.bill?.checkoutApprovedAt || selected?.bill?.status === 'finalized')

  // Cashier/manager can settle a table's bill directly — useful when the customer's
  // phone is dead or they never initiated checkout from their side.
  async function handleSettle() {
    if (!selected?.bill?.id || settling) return
    setSettling(true)
    setSettleMsg('')
    try {
      await completeCashPayment(selected.bill.id)
      setSettleMsg(`Table #${selected.table.tableNumber} settled — table is now vacant.`)
      setSelected(null)
      fetchTables()
    } catch (err) {
      setSettleMsg(err.message || 'Failed to settle bill')
    } finally {
      setSettling(false)
    }
  }

  // Release the table WITHOUT requiring payment — clears the occupancy regardless of
  // whether the customer has paid (force-release cancels open orders and draft bills).
  async function handleForceRelease() {
    if (!selected?.table?.id || releasing) return
    setReleasing(true)
    setReleaseMsg('')
    try {
      await forceReleaseTable(selected.table.id, branchId)
      setReleaseMsg(`Table #${selected.table.tableNumber} released (no payment recorded).`)
      setSelected(null)
      fetchTables()
    } catch (err) {
      setReleaseMsg(err.message || 'Failed to release table')
    } finally {
      setReleasing(false)
    }
  }

  return (
    <section className="neo-card rounded-2xl p-6">
      <div className="flex items-center justify-between border-b border-[#1E2435] pb-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-white">Table Bills</h2>
          <p className="text-xs text-[#9CA3AF]">Running bill per table — no need to wait for the customer to request</p>
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
          {activeTables.map((table) => {
            const hasBill = table.isOccupied && Number(table.currentBillTotal) > 0
            return (
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
                {hasBill ? (
                  <p className="mt-2 text-base font-black text-[#F5A623]">
                    Rs {Number(table.currentBillTotal).toFixed(2)}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] font-bold tracking-wider text-[#8B93A7]">
                    {table.isOccupied ? 'No items yet' : 'Vacant'}
                  </p>
                )}
                <p className="mt-1 text-[10px] font-bold tracking-wider text-[#6B7280]">
                  {billLoading === table.tableNumber ? 'Checking…' : table.isOccupied ? 'View bill →' : '—'}
                </p>
              </article>
            )
          })}
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
                {Number(selected.table.currentBillTotal) > 0 && (
                  <p className="mt-3 text-sm font-black text-[#F5A623]">
                    Running total: Rs {Number(selected.table.currentBillTotal).toFixed(2)}
                  </p>
                )}
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

                {settleMsg && (
                  <p className={`rounded-xl p-3 text-xs ${settleMsg.toLowerCase().includes('settled') ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' : 'bg-red-950/40 border border-red-800/50 text-red-300'}`}>
                    {settleMsg}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSettle}
                  disabled={settling || isPaid}
                  className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {settling ? 'Settling payment…' : isPaid ? 'Already Paid' : 'Mark Paid & Clear Table'}
                </button>
              </>
            )}

            <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-3">
              <p className="text-[11px] font-bold text-red-300 mb-2">Customer hasn't paid? Release the table anyway (cancels open orders / draft bills, no payment recorded)</p>
              {releaseMsg && (
                <p className={`mb-2 rounded-lg p-2 text-xs ${releaseMsg.toLowerCase().includes('released') ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' : 'bg-red-950/40 border border-red-800/50 text-red-300'}`}>
                  {releaseMsg}
                </p>
              )}
              <button
                type="button"
                onClick={handleForceRelease}
                disabled={releasing}
                className="w-full rounded-xl border border-red-600/60 bg-red-900/40 py-2.5 text-sm font-bold text-red-100 hover:bg-red-800/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {releasing ? 'Releasing table…' : 'Force Release (no payment)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}