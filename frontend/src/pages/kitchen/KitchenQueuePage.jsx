import { useEffect, useRef, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import KitchenOrderColumn from '../../components/kitchen/KitchenOrderColumn'
import { io } from 'socket.io-client'
import { getQueue, transitionOrder } from '../../services/kitchenService'

const COLUMNS = ['pending', 'accepted', 'preparing', 'ready']

export default function KitchenQueuePage({ navigate, session, setSession }) {
	const area = session?.role === 'branch_manager' ? 'manager' : 'kitchen'
	const [orders, setOrders] = useState([])
	const [error, setError] = useState('')
	const socketRef = useRef(null)

	useEffect(() => {
		const branchId = session?.branchId
		const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { transports: ['websocket'] })
		socketRef.current = socket

		const refresh = () => getQueue().then(({ orders: queue }) => setOrders(queue)).catch((err) => setError(err.message))
		refresh()

		socket.on('connect', () => { if (branchId) socket.emit('join-branch', { branchId }) })
		socket.on('order-updated', refresh)
		const timer = setInterval(refresh, 8000)

		return () => { socket.off('order-updated', refresh); socket.disconnect(); clearInterval(timer) }
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
