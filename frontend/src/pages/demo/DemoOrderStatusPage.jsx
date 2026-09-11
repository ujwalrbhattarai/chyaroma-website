import { useEffect, useRef, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import OrderCard from '../../components/orders/OrderCard'
import DemoBanner from '../../components/demo/DemoBanner'
import { getDemoOrderStatus, cancelDemoOrder, getSessionId } from '../../services/demoService'
import { io } from 'socket.io-client'

export default function DemoOrderStatusPage({ navigate }) {
  const [sessionId] = useState(getSessionId)
  const [status, setStatus] = useState({ table: null, orders: [], items: [] })
  const [message, setMessage] = useState('')
  const [cancelling, setCancelling] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!sessionId) {
      navigate('/demo')
      return
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join-demo', { sessionId })
    })

    const refresh = () =>
      getDemoOrderStatus(sessionId)
        .then(setStatus)
        .catch((err) => setMessage(err.message))

    refresh()
    const timer = setInterval(refresh, 3000)
    socket.on('demo-order-updated', refresh)

    return () => {
      clearInterval(timer)
      socket.off('demo-order-updated', refresh)
      socket.disconnect()
    }
  }, [sessionId, navigate])

  async function handleCancel(orderId) {
    setCancelling(orderId)
    setMessage('')
    try {
      const result = await cancelDemoOrder({ sessionId, orderId })
      setMessage('Demo order cancelled.')
      setStatus((prev) => ({
        ...prev,
        orders: prev.orders.map((o) => (o.id === orderId ? { ...o, status: result.status } : o)),
      }))
    } catch (err) {
      setMessage(err.message)
    } finally {
      setCancelling(null)
    }
  }

  const itemsByOrder = {}
  for (const item of status.items ?? []) {
    if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = []
    itemsByOrder[item.orderId].push(item)
  }

  return (
    <PageShell area="customer" title="" description="" navigate={navigate}>
      <div className="mx-auto max-w-2xl pb-16">
        <DemoBanner onExit={() => navigate('/demo')} />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-900/80 border border-amber-500/30 p-5 text-white shadow-lg backdrop-blur-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Live Demo Order Tracker</p>
            <h1 className="text-2xl font-black">Table #99 (Demo)</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/demo/menu')}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 transition hover:bg-amber-400 cursor-pointer shadow-md"
            >
              + Add More Items
            </button>
            <button
              onClick={() => navigate('/demo/bill')}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 cursor-pointer shadow-md"
            >
              Request Bill & Checkout
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/60 p-4 text-sm font-medium text-amber-300">
            {message}
          </div>
        )}

        <div className="space-y-4">
          {status.orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#374151] bg-[#151B2B] p-12 text-center shadow-lg">
              <p className="text-lg font-bold text-[#9CA3AF]">No active demo orders right now</p>
              <p className="mt-1 text-sm text-[#9CA3AF]">Tap below to view the demo menu and place your test order.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => navigate('/demo/menu')}
                  className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-extrabold text-stone-950 hover:bg-amber-400 shadow-lg cursor-pointer"
                >
                  View Demo Menu & Order
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
