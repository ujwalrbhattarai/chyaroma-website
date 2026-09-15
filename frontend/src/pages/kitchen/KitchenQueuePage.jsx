import { useEffect, useRef, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import KitchenOrderColumn from '../../components/kitchen/KitchenOrderColumn'
import { io } from 'socket.io-client'
import { getQueue, transitionOrder } from '../../services/kitchenService'

const COLUMNS = ['pending', 'accepted', 'preparing', 'ready']

function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12) // E5
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.45)
  } catch {
    // Web Audio may be blocked before interaction; ignore
  }
}

export default function KitchenQueuePage({ navigate, session, setSession }) {
	const area = session?.role === 'branch_manager' ? 'manager' : 'kitchen'
	const [orders, setOrders] = useState([])
	const [error, setError] = useState('')
	const [notification, setNotification] = useState('')
	const socketRef = useRef(null)
	const notifyTimerRef = useRef(null)

	useEffect(() => {
		const branchId = session?.branchId
		const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { transports: ['websocket'] })
		socketRef.current = socket

		const refresh = () => getQueue().then(({ orders: queue }) => setOrders(queue)).catch((err) => setError(err.message))
		refresh()

		const handleOrderUpdated = (payload) => {
			// A brand-new customer order arrives as a 'pending' order-updated event — notify
			// the kitchen visibly and audibly so staff know to start on it. Other order-updated
			// events are just status transitions made by the kitchen itself.
			if (payload?.order?.status === 'pending') {
				setNotification('🔔 New order received!')
				playNotificationChime()
				if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current)
				notifyTimerRef.current = setTimeout(() => setNotification(''), 6000)
			}
			refresh()
		}

		socket.on('connect', () => { if (branchId) socket.emit('join-branch', { branchId }) })
		socket.on('order-updated', handleOrderUpdated)
		const timer = setInterval(refresh, 8000)

		return () => { socket.off('order-updated', handleOrderUpdated); socket.disconnect(); clearInterval(timer); if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current) }
	}, [session?.branchId])

	async function advance(orderId, status) {
		try {
			setError('')
			await transitionOrder(orderId, status)
			const { orders: queue } = await getQueue()
			setOrders(queue)
		} catch (err) { setError(err.message) }
	}

	const byStatus = Object.fromEntries(COLUMNS.map((s) => [s, orders.filter((o) => o.status === s)]))
	const total = orders.length

	return (
		<PageShell area={area} title="Kitchen queue" description="Live order queue — accept, prepare, mark ready. Updates in real time." navigate={navigate} setSession={setSession}>
			{error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
			{notification && (
				<div id="kitchen-realtime-alert" className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-950/80 via-[#1C170E] to-amber-900/40 p-4 text-amber-100 shadow-xl backdrop-blur-md animate-neo-appear">
					<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-xl">🔔</span>
					<p className="text-sm font-extrabold text-white">{notification}</p>
				</div>
			)}
			<p className="mb-4 text-sm text-[#9CA3AF]">{total} open order{total !== 1 ? 's' : ''}</p>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{COLUMNS.map((status) => (
					<KitchenOrderColumn
						key={status}
						status={status}
						orders={byStatus[status]}
						onAdvance={advance}
					/>
				))}
			</div>
		</PageShell>
	)
}
