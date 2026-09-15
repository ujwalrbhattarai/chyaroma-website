import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import PageShell from '../../components/shared/PageShell'
import { listTables } from '../../services/tableService'
import { getStaffMenu, getStaffReadyOrders, placeStaffOrder, serveOrder } from '../../services/orderService'

export default function WaiterPage({ navigate, session, setSession }) {
  const branchId = session?.branchId
  const [tab, setTab] = useState('takeOrder') // 'takeOrder' | 'serve'

  // ── Take Order state ─────────────────────────────────────────────────────
  const [tables, setTables] = useState([])
  const [loadingTables, setLoadingTables] = useState(true)
  const [menuData, setMenuData] = useState({ menu: [], categories: [] })
  const [selectedTable, setSelectedTable] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useState({}) // { itemId: qty }
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Serve state ──────────────────────────────────────────────────────────
  const [readyOrders, setReadyOrders] = useState([])
  const [servingId, setServingId] = useState(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function fetchTables() {
    try {
      setError('')
      const { tables: loaded } = await listTables(branchId)
      setTables(loaded || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingTables(false)
    }
  }

  async function loadMenu() {
    try {
      const data = await getStaffMenu()
      setMenuData({ menu: data.menu ?? [], categories: data.categories ?? [] })
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadReady() {
    try {
      const { orders } = await getStaffReadyOrders()
      setReadyOrders(orders || [])
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    fetchTables()
    loadMenu()
    loadReady()
  }, [branchId])

  // Refresh in real time: when the kitchen updates an order (e.g. marks it ready),
  // the serve screen and table occupancy update without a manual reload.
  useEffect(() => {
    if (!branchId) return
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { transports: ['websocket'] })
    socket.on('connect', () => {
      socket.emit('join-branch', { branchId: String(branchId) })
      socket.emit('join-staff', { branchId: String(branchId) })
    })
    socket.on('order-updated', () => { loadReady(); fetchTables() })
    return () => socket.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId])

  // ── Take Order handlers ──────────────────────────────────────────────────
  function openTable(table) {
    setSelectedTable(table)
    setSelectedCategory('all')
    setCart({})
    setNotes('')
    setSuccess('')
    setError('')
  }

  function changeQty(item, delta) {
    setCart((prev) => {
      const current = prev[item.id] || 0
      const next = Math.max(0, current + delta)
      const copy = { ...prev }
      if (next === 0) delete copy[item.id]
      else copy[item.id] = next
      return copy
    })
  }

  const cartEntries = Object.entries(cart)
    .map(([itemId, qty]) => ({ item: menuData.menu.find((m) => m.id === itemId), qty }))
    .filter((e) => e.item && e.qty > 0)
  const cartTotal = cartEntries.reduce((sum, e) => sum + Number(e.item.price) * e.qty, 0)
  const cartCount = cartEntries.reduce((sum, e) => sum + e.qty, 0)

  async function handlePlaceOrder() {
    if (!selectedTable || cartEntries.length === 0) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const items = cartEntries.map((e) => ({ itemId: e.item.id, quantity: e.qty, notes: '' }))
      await placeStaffOrder({ tableId: selectedTable.id, items, notes })
      setSuccess(`Order placed for Table #${selectedTable.tableNumber}. The kitchen has been notified.`)
      setSelectedTable(null)
      setCart({})
      setNotes('')
      fetchTables()
    } catch (err) {
      setError(err.message || 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Serve handlers ───────────────────────────────────────────────────────
  async function handleServe(orderId) {
    setServingId(orderId)
    setError('')
    setSuccess('')
    try {
      await serveOrder(orderId)
      setSuccess('Marked as served.')
      await loadReady()
      fetchTables()
    } catch (err) {
      setError(err.message || 'Failed to mark served')
    } finally {
      setServingId(null)
    }
  }

  const activeTables = tables.filter((t) => t.isActive)
  const filteredMenu = menuData.menu.filter((m) =>
    selectedCategory === 'all' ? true : m.categoryId === selectedCategory,
  )

  return (
    <PageShell area="waiter" title="Waiter" description="Take orders for a table, then see which tables are ready to serve from the kitchen." navigate={navigate} setSession={setSession} session={session}>
      {error && <p className="mb-4 rounded-xl bg-red-950/50 border border-red-800/50 p-4 text-sm text-red-300" role="alert">⚠️ {error}</p>}
      {success && <p className="mb-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 p-4 text-sm text-emerald-300" role="status">✅ {success}</p>}

      {/* Tab switcher */}
      <div className="mb-6 flex gap-2 neo-card rounded-2xl p-2 border border-white/10">
        <button
          onClick={() => { setTab('takeOrder'); setError(''); setSuccess('') }}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all cursor-pointer ${tab === 'takeOrder' ? 'bg-amber-600 text-white' : 'text-[#9CA3AF] hover:text-white hover:bg-[#151B2B]'}`}
        >
          🍽️ Take Order
        </button>
        <button
          onClick={() => { setTab('serve'); setError(''); setSuccess(''); loadReady() }}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all cursor-pointer ${tab === 'serve' ? 'bg-amber-600 text-white' : 'text-[#9CA3AF] hover:text-white hover:bg-[#151B2B]'}`}
        >
          🛎️ Ready to Serve ({readyOrders.length})
        </button>
      </div>

      {tab === 'takeOrder' && (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#9CA3AF]">{activeTables.filter((t) => t.isOccupied).length} occupied · {activeTables.length} tables</p>
          </div>

          {loadingTables ? (
            <p className="text-[#8B93A7] animate-pulse">Loading tables…</p>
          ) : activeTables.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#374151] p-8 text-center text-[#8B93A7]">No active tables found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeTables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => openTable(table)}
                  className={`neo-card cursor-pointer rounded-2xl p-5 text-left border transition-all duration-300 hover:scale-[1.02] ${table.isOccupied ? 'bg-red-950/30 border-red-500/40' : 'bg-emerald-950/30 border-emerald-500/40'}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-[#F9FAFB]">Table #{table.tableNumber}</h3>
                    <span className={`h-2.5 w-2.5 rounded-full ${table.isOccupied ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} />
                  </div>
                  {table.label && <p className="mt-0.5 text-xs text-[#9CA3AF]">{table.label}</p>}
                  <p className="mt-3 text-xs font-bold tracking-wider text-[#8B93A7]">Take order →</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'serve' && (
        <div className="grid gap-4">
          <p className="text-sm text-[#9CA3AF]">Orders the kitchen has finished — deliver them to the right table, then mark served.</p>
          {readyOrders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#374151] p-8 text-center text-[#8B93A7]">No ready orders right now.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {readyOrders.map((order) => (
                <article key={order.id} className="neo-card rounded-2xl border border-teal-500/30 bg-teal-950/10 p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div>
                      <p className="text-2xl font-black text-[#F9FAFB]">Table #{order.tableNumber ?? '—'}</p>
                      {order.tableLabel && <p className="text-xs text-[#9CA3AF]">{order.tableLabel}</p>}
                    </div>
                    <span className="rounded-full bg-teal-500/20 border border-teal-500/40 px-3 py-1 text-xs font-bold text-teal-300">READY</span>
                  </div>

                  <ul className="space-y-2 text-sm">
                    {order.items?.map((it, idx) => (
                      <li key={idx} className="flex items-center justify-between text-[#E5E7EB]">
                        <span>{it.name} <span className="text-[#9CA3AF]">x{it.quantity}</span></span>
                        <span className="font-semibold text-white">{it.notes ? `📝 ${it.notes}` : ''}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleServe(order.id)}
                    disabled={servingId === order.id}
                    className="mt-4 w-full rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    {servingId === order.id ? 'Marking served…' : '✅ Mark Served'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
{/* Take-order menu picker modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 animate-neo-appear">
          <div className="neo-card w-full max-w-2xl rounded-3xl border border-amber-500/30 p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <h2 className="text-2xl font-black text-[#F9FAFB]">Table #{selectedTable.tableNumber} — New Order</h2>
                {selectedTable.label && <p className="text-xs text-[#9CA3AF] mt-0.5">{selectedTable.label}</p>}
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="neo-btn-secondary rounded-xl px-3 py-1.5 text-xs font-bold text-[#9CA3AF] hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* Category chips */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap ${selectedCategory === 'all' ? 'bg-amber-600 text-white' : 'bg-[#151B2B] text-[#9CA3AF]'}`}
              >
                All
              </button>
              {menuData.categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap ${selectedCategory === c.id ? 'bg-amber-600 text-white' : 'bg-[#151B2B] text-[#9CA3AF]'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Menu items */}
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredMenu.map((item) => {
                const qty = cart[item.id] || 0
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#1F2937] bg-[#151B2B] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#F9FAFB]">{item.name}</p>
                      <p className="text-xs text-[#9CA3AF]">Rs {Number(item.price).toFixed(2)}</p>
                    </div>
                    {item.isAvailable ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => changeQty(item, -1)} className="neo-btn-secondary h-7 w-7 rounded-lg text-sm font-black">−</button>
                        <span className="w-6 text-center text-sm font-extrabold text-white">{qty}</span>
                        <button onClick={() => changeQty(item, 1)} className="neo-btn-primary h-7 w-7 rounded-lg text-sm font-black">+</button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-[#6B7280]">Unavailable</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Cart / place order */}
            {cartCount > 0 && (
              <div className="mt-5 rounded-2xl border border-[#1F2937] bg-[#101524] p-4">
                <p className="text-sm font-bold text-white mb-2">{cartCount} item{cartCount !== 1 ? 's' : ''} — Rs {cartTotal.toFixed(2)}</p>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for the kitchen (optional)"
                  className="w-full rounded-xl border border-[#374151] bg-[#0B0F1A] px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="mt-3 w-full rounded-xl bg-amber-600 py-3 text-sm font-extrabold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {submitting ? 'Sending to kitchen…' : 'Send Order to Kitchen'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}