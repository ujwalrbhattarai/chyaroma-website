import { useEffect, useRef, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import OrderCard from '../../components/orders/OrderCard'
import { getOrderStatus, cancelOrder } from '../../services/orderService'
import { releaseTable } from '../../services/tableService'
import { io } from 'socket.io-client'

function getToken() {
  const param = new URLSearchParams(window.location.search).get('token')
  if (param) {
    sessionStorage.setItem('cc_table_token', param)
    return param
  }
  return sessionStorage.getItem('cc_table_token') ?? ''
}

export default function CustomerOrderStatusPage({ navigate }) {
  const [token, setToken] = useState(getToken())
  const [status, setStatus] = useState({ table: null, orders: [], items: [] })
  const [message, setMessage] = useState('')
  const [cancelling, setCancelling] = useState(null)
  const [releasing, setReleasing] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) return
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { transports: ['websocket'] })
    socketRef.current = socket

    const refresh = () => getOrderStatus(token).then(setStatus).catch((err) => setMessage(err.message))
    refresh()
    const timer = setInterval(refresh, 8000)
    socket.on('order-updated', refresh)

    return () => {
      clearInterval(timer)
      socket.off('order-updated', refresh)
      socket.disconnect()
    }
  }, [token])

  async function handleCancel(orderId) {
    setCancelling(orderId)
    setMessage('')
    try {
      const result = await cancelOrder({ token, orderId })
      setMessage('Order cancelled.')
      setStatus((prev) => ({ ...prev, orders: prev.orders.map((o) => o.id === orderId ? { ...o, status: result.status } : o) }))
    } catch (err) {
      setMessage(err.message)
    } finally {
      setCancelling(null)
    }
  }

  async function handleRelease() {
    setReleasing(true)
    setMessage('')
    try {
      await releaseTable(token)
      sessionStorage.removeItem('cc_table_token')
      navigate('/')
    } catch (err) {
      setMessage(err.message || 'Failed to release table.')
      setReleasing(false)
    }
  }

  const itemsByOrder = {}
  for (const item of status.items ?? []) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = []
    itemsByOrder[item.orderId].push(item)
  }

  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : ''

  return (
    <PageShell area="customer" title="" description="" navigate={navigate}>
      <div className="mx-auto max-w-2xl pb-16">
        {status.table ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-900 p-5 text-white shadow-md">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Live Table Track</p>
              <h1 className="text-2xl font-black">Table #{status.table.tableNumber}</h1>
            </div>
            <button
              onClick={() => navigate(`/table/menu${tokenQuery}`)}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 transition hover:bg-amber-400"
            >
              + Order More Items
            </button>
          </div>
        ) : (
          !token && (
            <div className="mb-6 rounded-2xl border border-[#1F2937] bg-[#151B2B] p-4">
              <label className="block text-sm font-semibold text-[#E5E7EB] mb-1">Enter QR token to view order status</label>
              <input
                type="text"
                className="w-full rounded-xl border border-[#374151] p-3 text-sm"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from QR code link"
              />
            </div>
          )
        )}

        {message && <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm font-medium text-[#F5A623]">{message}</div>}

        <div className="space-y-4">
          {status.orders.length === 0 && token ? (
            <div className="rounded-2xl border border-dashed border-[#374151] bg-[#151B2B] p-12 text-center">
              <p className="text-lg font-bold text-[#9CA3AF]">No active orders right now</p>
              <p className="mt-1 text-sm text-[#9CA3AF]">Tap below to view the menu and place your first order.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => navigate(`/table/menu${tokenQuery}`)}
                  className="rounded-xl bg-amber-800 px-6 py-3 text-sm font-extrabold text-white hover:bg-amber-900 shadow-sm"
                >
                  View Menu & Order
                </button>
                <button
                  onClick={handleRelease}
                  disabled={releasing}
                  className="rounded-xl border border-[#374151] px-6 py-3 text-sm font-semrabold text-[#9CA3AF] hover:bg-[#0B0F1A] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {releasing ? 'Releasing…' : 'Cancel Table'}
                </button>
              </div>
            </div>
          ) : (
            status.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                items={itemsByOrder[order.id] ?? []}
                onCancel={handleCancel}
                cancelling={cancelling}
              />
            ))
          )}
        </div>
      </div>
    </PageShell>
  )
}
