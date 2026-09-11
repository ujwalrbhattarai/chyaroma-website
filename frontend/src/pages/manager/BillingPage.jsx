import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import PageShell from '../../components/shared/PageShell'
import { approveCheckout, listBranchBills } from '../../services/billingService'

function formatDate(value) {
	return value ? new Date(value).toLocaleString() : '—'
}

function sortBills(bills) {
	return [...bills].sort((a, b) => {
		const aRequested = !!a.checkoutRequestedAt
		const bRequested = !!b.checkoutRequestedAt
		if (aRequested !== bRequested) return aRequested ? -1 : 1
		const aTime = new Date(a.checkoutRequestedAt || a.createdAt).getTime()
		const bTime = new Date(b.checkoutRequestedAt || b.createdAt).getTime()
		return bTime - aTime
	})
}

export default function BillingPage({ navigate, session }) {
	const [bills, setBills] = useState([])
	const [loading, setLoading] = useState(true)
	const [actionLoading, setActionLoading] = useState('')
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')
	const socketRef = useRef(null)

	useEffect(() => {
		async function loadBills() {
			setLoading(true)
			setError('')
			try {
				const result = await listBranchBills()
				setBills(sortBills(result.bills || []))
			} catch (err) {
				setError(err.message || 'Unable to load bills')
			} finally {
				setLoading(false)
			}
		}

		loadBills()
	}, [])

	useEffect(() => {
		if (!session?.branchId) return
		const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { transports: ['websocket'] })
		socketRef.current = socket

		const refreshBills = () => listBranchBills().then((result) => setBills(sortBills(result.bills || []))).catch(() => {})
		socket.on('connect', () => {
			if (session.branchId) socket.emit('join-branch', { branchId: session.branchId })
		})
		socket.on('bill-updated', refreshBills)

		return () => {
			socket.off('bill-updated', refreshBills)
			socket.disconnect()
		}
	}, [session?.branchId])

	async function handleApprove(billId) {
		const previousBills = bills
		setActionLoading(billId)
		setError('')
		setMessage('')
		setBills((prev) => prev.map((bill) => (bill.id === billId ? { ...bill, checkoutApprovedAt: new Date().toISOString() } : bill)))
		try {
			const result = await approveCheckout(billId)
			setBills((prev) => sortBills(prev.map((bill) => (bill.id === result.bill.id ? result.bill : bill))))
			setMessage('Checkout approved and order table cleared.')
		} catch (err) {
			setBills(previousBills)
			setError(err.message || 'Unable to approve checkout')
		} finally {
			setActionLoading('')
		}
	}

	return (
		<PageShell area="manager" title="Billing" description="Review table orders, see checkout requests, and approve bills." navigate={navigate}>
			<div className="space-y-4">
				{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
				{message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}

				<div className="rounded-3xl border border-[#1F2937] bg-[#151B2B] p-6 shadow-sm">
					<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h1 className="text-xl font-bold text-[#F9FAFB]">Branch Billing</h1>
							<p className="text-sm text-[#9CA3AF]">Live checkout requests are shown at the top.</p>
						</div>
						<p className="text-sm text-[#9CA3AF]">{bills.length} bill{bills.length === 1 ? '' : 's'}</p>
					</div>

					{loading ? (
						<div className="rounded-2xl border border-dashed border-[#1F2937] p-8 text-center text-[#9CA3AF]">Loading bills…</div>
					) : bills.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-[#1F2937] p-8 text-center text-[#9CA3AF]">No bills available yet.</div>
					) : (
						<div className="space-y-4">
							{bills.map((bill) => {
								const isRequested = !!bill.checkoutRequestedAt && !bill.checkoutApprovedAt
								const isApproved = !!bill.checkoutApprovedAt
								return (
									<div key={bill.id} className={`rounded-3xl border p-5 ${isRequested ? 'border-amber-300 bg-amber-50' : isApproved ? 'border-emerald-300 bg-emerald-50' : 'border-[#1F2937] bg-[#151B2B]'}`}>
									<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p className="text-xs uppercase tracking-[0.2em] text-[#8B93A7]">Table</p>
											<h2 className="text-lg font-semibold text-[#F9FAFB]">#{bill.tableNumber ?? '—'} {bill.tableLabel ? `· ${bill.tableLabel}` : ''}</h2>
										</div>
										<div className="space-y-1 text-right text-sm text-[#9CA3AF]">
											<p>Bill ID: {bill.id.slice(0, 8).toUpperCase()}</p>
											<p>Status: {bill.status}</p>
											<p>Total: Rs {Number(bill.totalAmount).toFixed(2)}</p>
										</div>
									</div>

									<div className="grid gap-3 sm:grid-cols-3">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B93A7]">Requested</p>
											<p className="mt-1 text-sm text-[#9CA3AF]">{formatDate(bill.checkoutRequestedAt)}</p>
										</div>
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B93A7]">Approved</p>
											<p className="mt-1 text-sm text-[#9CA3AF]">{formatDate(bill.checkoutApprovedAt)}</p>
										</div>
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B93A7]">Method</p>
											<p className="mt-1 text-sm text-[#9CA3AF]">{bill.checkoutRequestMethod || '—'}</p>
										</div>
									</div>

								{isRequested ? (
									<div className="mt-5 flex flex-wrap gap-3">
										<button
											className="rounded-xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
											onClick={() => handleApprove(bill.id)}
											disabled={actionLoading === bill.id}
										>
											{actionLoading === bill.id ? 'Approving…' : 'Approve checkout'}
										</button>
									</div>
								) : bill.checkoutApprovedAt ? (
									<div className="mt-5 flex flex-wrap gap-3">
										<button
											className="rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 cursor-default"
											type="button"
											disabled
										>
											Approved
										</button>
									</div>
								) : null}
								</div>
							)
							})}
						</div>
					)}
				</div>
			</div>
		</PageShell>
	)
}
