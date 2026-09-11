import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import PageShell from '../../components/shared/PageShell'
import { completeCashPayment, getTableBill, listBranchBills } from '../../services/billingService'

function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12) // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch {
    // Web Audio may be blocked before interaction; ignore
  }
}

export default function CashierDashboardPage({ navigate, session, setSession }) {
  const branchId = session?.branchId
  const [tableNumberInput, setTableNumberInput] = useState('')
  const [selectedData, setSelectedData] = useState(null)
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [notification, setNotification] = useState(null)
  const socketRef = useRef(null)

  // Fetch pending bills list
  async function fetchBills() {
    try {
      const data = await listBranchBills()
      setBills(data.bills || [])
    } catch (err) {
      console.error('Failed to list branch bills:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBills()
  }, [branchId])

  // Real-time Socket.IO connection
  useEffect(() => {
    if (!branchId) return
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, {
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join-branch', { branchId: String(branchId) })
    })

    const handleBillUpdated = (payload) => {
      const updated = payload?.bill
      fetchBills()

      if (updated) {
        // If the customer requested checkout, display real-time notification
        if (updated.checkoutRequestedAt && !updated.checkoutApprovedAt) {
          const tableNum = updated.tableNumber || 'Unknown'
          setNotification({
            tableNumber: tableNum,
            amount: updated.totalAmount,
            time: new Date().toLocaleTimeString(),
            billId: updated.id,
          })
          playNotificationChime()
        }

        // If currently viewing this bill, refresh it
        setSelectedData((prev) => {
          if (prev && prev.bill && prev.bill.id === updated.id) {
            return {
              ...prev,
              bill: {
                ...prev.bill,
                ...updated,
                items: updated.items || prev.bill.items,
              },
            }
          }
          return prev
        })
      }
    }

    socket.on('bill-updated', handleBillUpdated)

    return () => {
      socket.off('bill-updated', handleBillUpdated)
      socket.disconnect()
    }
  }, [branchId])

  // Table Lookup by table number
  async function handleLookup(numToSearch) {
    const num = numToSearch || tableNumberInput
    if (!num) {
      setError('Please enter a table number.')
      return
    }
    setError('')
    setSuccess('')
    setSearching(true)
    try {
      const data = await getTableBill(num)
      setSelectedData(data)
      setTableNumberInput(String(num))
    } catch (err) {
      setSelectedData(null)
      setError(err.message || `No active bill found for Table ${num}`)
    } finally {
      setSearching(false)
    }
  }

  // Complete Cash Payment
  async function handleCompletePayment() {
    if (!selectedData?.bill?.id || paying) return
    const billId = selectedData.bill.id
    setPaying(true)
    setError('')
    setSuccess('')
    try {
      const res = await completeCashPayment(billId)
      setSuccess(`Payment for Table #${selectedData.table.tableNumber} completed! Table is now vacant.`)
      setSelectedData((prev) => ({
        ...prev,
        bill: {
          ...prev.bill,
          ...res.bill,
          status: 'finalized',
          checkoutApprovedAt: res.bill.checkoutApprovedAt || new Date().toISOString(),
          paymentMethod: 'cash',
        },
      }))
      fetchBills()
    } catch (err) {
      setError(err.message || 'Failed to complete cash payment')
    } finally {
      setPaying(false)
    }
  }

  const pendingBills = bills.filter((b) => b.checkoutRequestedAt && !b.checkoutApprovedAt)
  const isPaid = Boolean(selectedData?.bill?.checkoutApprovedAt || selectedData?.bill?.status === 'finalized')

  return (
    <PageShell
      area="cashier"
      title="Cashier Dashboard"
      description="Manage table billing, receive customer checkout requests in real-time, and process cash payments."
      navigate={navigate}
      setSession={setSession}
    >
      <div className="space-y-6">
        {/* Real-time Customer Bill Notification Banner */}
        {notification && (
          <div
            id="cashier-realtime-alert"
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/80 via-[#1C170E] to-amber-900/40 p-5 text-amber-200 shadow-xl backdrop-blur-md animate-neo-appear"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-2xl">
                🛎️
              </span>
              <div>
                <p className="font-extrabold text-white text-base">
                  Table #{notification.tableNumber} has requested a bill!
                </p>
                <p className="text-xs text-amber-300/80">
                  Amount: Rs {Number(notification.amount || 0).toFixed(2)} · Requested at {notification.time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleLookup(notification.tableNumber)
                  setNotification(null)
                }}
                className="neo-btn-primary px-4 py-2 text-xs font-bold"
              >
                View Table #{notification.tableNumber} Bill
              </button>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="rounded-lg px-2.5 py-2 text-xs text-[#9CA3AF] hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Global Feedback Messages */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm font-medium text-red-300" role="alert">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm font-medium text-emerald-300" role="alert">
            ✓ {success}
          </div>
        )}

        {/* Main Grid: Lookup & Bill Details on Left, Pending Queue on Right */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Column: Table Number Lookup & Bill Viewer */}
          <div className="space-y-6">
            {/* Table Lookup Bar */}
            <section className="neo-card rounded-2xl p-6">
              <h2 className="text-base font-bold uppercase tracking-wider text-[#F5A623]">
                Table Number Lookup
              </h2>
              <p className="mt-1 text-xs text-[#9CA3AF]">
                Enter customer table number to retrieve the active bill and ordered items.
              </p>

              <form
                className="mt-4 flex flex-wrap gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleLookup()
                }}
              >
                <div className="flex-1 min-w-[140px]">
                  <input
                    id="table-number-input"
                    type="number"
                    min="1"
                    placeholder="Enter Table Number (e.g. 12)"
                    value={tableNumberInput}
                    onChange={(e) => setTableNumberInput(e.target.value)}
                    className="neo-inset w-full rounded-xl border border-[#374151] px-4 py-3 text-sm text-[#F9FAFB] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    required
                  />
                </div>
                <button
                  id="find-table-btn"
                  type="submit"
                  disabled={searching}
                  className="neo-btn-primary flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>{searching ? 'Searching…' : 'Find Table / View Bill'}</span>
                </button>
              </form>
            </section>

            {/* Selected Bill Display */}
            {selectedData ? (
              <section id="bill-details-section" className="neo-card rounded-2xl p-6 border border-white/10 animate-neo-appear">
                {/* Header with Table Number & Payment Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2435] pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#8B93A7]">
                      Table Information
                    </span>
                    <h3 className="text-2xl font-black text-white">
                      Table #{selectedData.table.tableNumber}
                      {selectedData.table.label ? ` · ${selectedData.table.label}` : ''}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-xs uppercase tracking-wider text-[#8B93A7] block">Payment Status</span>
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-400">
                        ✓ PAID (CASH)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/60 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-400">
                        ● PAYMENT PENDING
                      </span>
                    )}
                  </div>
                </div>

                {/* Ordered Items List (Read-Only: cashier cannot modify order) */}
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8B93A7]">
                    Ordered Items
                  </p>

                  {selectedData.bill.items && selectedData.bill.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-[#1E2435] text-[11px] font-bold uppercase tracking-wider text-[#8B93A7]">
                          <tr>
                            <th className="py-2.5">Menu Item</th>
                            <th className="py-2.5 text-center">Qty</th>
                            <th className="py-2.5 text-right">Price</th>
                            <th className="py-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2435]/60">
                          {selectedData.bill.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.02]">
                              <td className="py-3 font-medium text-white">{item.name}</td>
                              <td className="py-3 text-center text-[#9CA3AF]">
                                <span className="rounded-lg bg-[#1E293B] px-2 py-0.5 text-xs font-bold text-white">
                                  × {item.quantity}
                                </span>
                              </td>
                              <td className="py-3 text-right text-[#9CA3AF]">
                                Rs {Number(item.unitPrice).toFixed(2)}
                              </td>
                              <td className="py-3 text-right font-bold text-[#F9FAFB]">
                                Rs {(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-[#9CA3AF]">No item details available.</p>
                  )}
                </div>

                {/* Totals Breakdown */}
                <div className="mt-6 rounded-xl bg-[#090C15]/70 p-4 border border-white/5 space-y-2 text-sm">
                  <div className="flex justify-between text-[#9CA3AF]">
                    <span>Subtotal</span>
                    <span className="font-semibold text-white">
                      Rs {Number(selectedData.bill.subtotal || 0).toFixed(2)}
                    </span>
                  </div>

                  {Number(selectedData.bill.taxAmount || 0) > 0 && (
                    <div className="flex justify-between text-[#9CA3AF]">
                      <span>Tax ({selectedData.bill.taxRate}%)</span>
                      <span className="font-semibold text-white">
                        Rs {Number(selectedData.bill.taxAmount).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {Number(selectedData.bill.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-[#F5A623]">
                      <span>Discount</span>
                      <span className="font-semibold">
                        - Rs {Number(selectedData.bill.discountAmount).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-[#1F2937] pt-3 text-lg font-black text-white">
                    <span>Final Bill Amount</span>
                    <span className="text-[#F5A623] text-xl">
                      Rs {Number(selectedData.bill.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action: Complete Cash Payment */}
                <div className="mt-6">
                  {isPaid ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
                      <p className="text-sm font-bold text-emerald-400">
                        ✓ Payment completed with CASH. Table #{selectedData.table.tableNumber} is vacant.
                      </p>
                      <p className="text-xs text-[#9CA3AF] mt-1">
                        Processed at {new Date(selectedData.bill.checkoutApprovedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  ) : (
                    <button
                      id="complete-cash-payment-btn"
                      type="button"
                      onClick={handleCompletePayment}
                      disabled={paying}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-emerald-600 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{paying ? 'Processing Payment…' : 'Complete Cash Payment'}</span>
                    </button>
                  )}
                </div>
              </section>
            ) : (
              !searching && (
                <div className="rounded-2xl border border-dashed border-[#1F2937] p-10 text-center text-[#9CA3AF]">
                  <p className="text-base font-semibold text-white">No Table Selected</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">
                    Enter a table number above or select from the Pending Requests queue.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Right Column: Pending Checkout Requests Queue */}
          <div className="space-y-6">
            <section className="neo-card rounded-2xl p-6">
              <div className="flex items-center justify-between border-b border-[#1E2435] pb-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Pending Bill Requests</h2>
                  <p className="text-xs text-[#9CA3AF]">Tables waiting for payment collection</p>
                </div>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-300">
                  {pendingBills.length} pending
                </span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-sm text-[#9CA3AF] animate-pulse">
                  Loading requests…
                </div>
              ) : pendingBills.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#1F2937] p-6 text-center text-xs text-[#9CA3AF]">
                  No pending checkout requests right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 transition-all hover:bg-amber-950/40 hover:border-amber-500/60 cursor-pointer"
                      onClick={() => handleLookup(bill.tableNumber)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-amber-400">Table</span>
                          <span className="text-lg font-black text-white">
                            #{bill.tableNumber ?? '—'}
                          </span>
                        </div>
                        <p className="text-xs text-[#9CA3AF]">
                          {new Date(bill.checkoutRequestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-[#F5A623]">
                          Rs {Number(bill.totalAmount).toFixed(2)}
                        </p>
                        <button
                          type="button"
                          className="mt-1 neo-btn-primary px-3 py-1 text-[11px] font-bold"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLookup(bill.tableNumber)
                          }}
                        >
                          Open Bill →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
