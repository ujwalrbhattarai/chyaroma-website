import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import PageShell from '../../components/shared/PageShell'
import { checkoutBillRequest, requestBill } from '../../services/billingService'

function getToken() {
  const param = new URLSearchParams(window.location.search).get('token')
  if (param) {
    sessionStorage.setItem('cc_table_token', param)
    return param
  }
  return sessionStorage.getItem('cc_table_token') ?? ''
}

export default function CustomerBillRequestPage({ navigate }) {
  const [token, setToken] = useState(getToken())
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [awaitingCheckoutApproval, setAwaitingCheckoutApproval] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const socketRef = useRef(null)
  const checkoutLockRef = useRef(false)

  useEffect(() => {
    if (!token) return
    fetchBill(token)
  }, [token])

  useEffect(() => {
    if (!token || bill?.checkoutApprovedAt) return
    if (!bill?.branchId || !bill?.id) return

    const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { transports: ['websocket'] })
    socketRef.current = socket

    const handleUpdate = (payload) => {
      const updatedBill = payload?.bill
      if (!updatedBill || updatedBill.id !== bill.id) return
      if (updatedBill.checkoutApprovedAt) {
        setAwaitingCheckoutApproval(false)
        setBill(updatedBill)
        setMessage('Thank you for visiting! Please visit again!')
      }
    }

    socket.on('connect', () => {
      if (bill.branchId !== undefined && bill.branchId !== null) {
        socket.emit('join-branch', { branchId: String(bill.branchId) })
      }
    })
    socket.on('bill-updated', handleUpdate)

    return () => {
      socket.off('bill-updated', handleUpdate)
      socket.disconnect()
    }
  }, [token, bill?.branchId, bill?.id, bill?.checkoutApprovedAt])

  useEffect(() => {
    if (!token || !awaitingCheckoutApproval) return
    const interval = setInterval(() => fetchBill(token), 3000)
    return () => clearInterval(interval)
  }, [token, awaitingCheckoutApproval])

  const checkoutRequested = !!bill?.checkoutRequestedAt && !bill?.checkoutApprovedAt
  const checkoutApproved = !!bill?.checkoutApprovedAt

  async function fetchBill(tokenToFetch) {
    setLoading(true)
    setError('')
    if (!awaitingCheckoutApproval) setMessage('')
    try {
      const result = await requestBill(tokenToFetch)
      const fetchedBill = result.bill
      setBill(fetchedBill)
      if (fetchedBill?.checkoutRequestedAt && !fetchedBill?.checkoutApprovedAt) {
        setAwaitingCheckoutApproval(true)
      }
      if (fetchedBill?.checkoutApprovedAt) {
        setAwaitingCheckoutApproval(false)
        setMessage('Thank you for visiting! Please visit again!')
      }
    } catch (err) {
      if (err.message.includes('404') || err.message.toLowerCase().includes('no billable')) {
        if (awaitingCheckoutApproval) {
          // Keep polling: the bill page still shows the customer's total until the
          // cashier actually approves. Never show "thank you" before approval.
          setError('')
          setMessage('Waiting for cashier to approve your checkout…')
        } else {
          setError('No active orders found for this table to calculate a bill.')
          setBill(null)
        }
      } else {
        setError(err.message || 'Failed to fetch bill.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout() {
    if (!bill?.id || checkoutRequested || checkoutApproved || checkoutLoading || checkoutLockRef.current) return
    checkoutLockRef.current = true
    setCheckoutLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await checkoutBillRequest({ token, billId: bill.id })
      setBill(result.bill)
      setMessage('Checkout completed. Please hand this to the cashier so they can approve and clear the table.')
      setAwaitingCheckoutApproval(true)
    } catch (err) {
      setError(err.message || 'Failed to complete checkout.')
    } finally {
      setCheckoutLoading(false)
      checkoutLockRef.current = false
    }
  }

  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : ''

  if (checkoutApproved) {
    return (
      <PageShell area="customer" title="" description="" navigate={navigate}>
        <div className="mx-auto max-w-xl pb-16">
          <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-[#151B2B] text-center shadow-xl">
            <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 p-8 text-white">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-lg">
                ✓
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight">Thank you for visiting!</h1>
              <p className="mt-2 text-sm text-emerald-200">Please visit again!</p>
            </div>
            <div className="p-8">
              <p className="text-sm text-[#9CA3AF]">
                Your checkout has been approved. This table is now free for other customers.
              </p>
              <button
                onClick={() => navigate(`/table/menu${tokenQuery}`)}
                className="mt-6 w-full rounded-xl bg-amber-800 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-900"
              >
                Order for new guests
              </button>
            </div>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell area="customer" title="" description="" navigate={navigate}>
      <div className="mx-auto max-w-xl pb-16">
        {!token && (
          <div className="mb-6 rounded-2xl border border-[#1F2937] bg-[#151B2B] p-5 shadow-sm">
            <label className="block text-sm font-semibold text-[#E5E7EB] mb-2">Enter Table Token</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-xl border border-[#374151] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Paste token from table QR link"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <button
                onClick={() => fetchBill(token)}
                className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-bold text-white hover:bg-amber-900"
              >
                Get Bill
              </button>
            </div>
          </div>
        )}

        {message && !loading && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm font-semibold text-emerald-900">
            {message}
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-600 border-t-transparent"></div>
            <p className="mt-4 text-sm font-medium text-[#9CA3AF]">Calculating your table bill…</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-dashed border-[#374151] bg-[#151B2B] p-8 text-center">
            <p className="text-base font-bold text-[#9CA3AF]">{error}</p>
            <p className="mt-2 text-sm text-[#9CA3AF]">Place an order first from the menu screen.</p>
            <button
              onClick={() => navigate(`/table/menu${tokenQuery}`)}
              className="mt-5 inline-block rounded-xl bg-amber-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-900"
            >
              Go to Menu & Order
            </button>
          </div>
        )}

        {bill && !loading && (
          <div className="overflow-hidden rounded-3xl border border-[#1F2937] bg-[#151B2B] shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-br from-amber-900 to-amber-950 p-6 text-center text-white">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-xl font-black text-stone-950 shadow-md">
                CC
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight">Your Bill</h1>
              <p className="text-xs text-amber-200/80">Digital Bill Receipt</p>
            </div>

            {/* Bill Details */}
            <div className="p-6">
              <div className="mb-6 flex justify-between border-b border-[#1E2435] pb-4 text-xs font-medium text-[#9CA3AF]">
                <span>Date: {new Date(bill.createdAt || Date.now()).toLocaleDateString()}</span>
                <span>Bill #: {bill.id ? bill.id.slice(0, 8).toUpperCase() : 'SUMMARY'}</span>
              </div>

              {/* Items List */}
              {bill.items && bill.items.length > 0 ? (
                <div className="mb-6 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8B93A7]">Order Summary</p>
                  {bill.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold text-[#F9FAFB]">{item.name}</span>
                        <span className="ml-2 text-xs font-semibold text-[#9CA3AF]">x{item.quantity}</span>
                      </div>
                      <span className="font-bold text-[#E5E7EB]">
                        Rs {(Number(item.unitPrice) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Math Totals */}
              <div className="space-y-2 border-t border-[#1E2435] pt-4 text-sm">
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#E5E7EB]">Rs {Number(bill.subtotal).toFixed(2)}</span>
                </div>
                {Number(bill.taxAmount) > 0 && (
                  <div className="flex justify-between text-[#9CA3AF]">
                    <span>Tax ({bill.taxRate}%)</span>
                    <span className="font-semibold text-[#E5E7EB]">Rs {Number(bill.taxAmount).toFixed(2)}</span>
                  </div>
                )}
                {Number(bill.discountAmount) > 0 && (
                  <div className="flex justify-between text-[#F5A623]">
                    <span>Discount</span>
                    <span className="font-semibold">- Rs {Number(bill.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#1F2937] pt-3 text-lg font-black text-[#F9FAFB]">
                  <span>Total Amount</span>
                  <span className="text-[#F5A623]">Rs {Number(bill.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="mt-8 rounded-2xl bg-amber-50 p-4 text-center border border-amber-200/60">
                <p className="text-xs font-bold uppercase tracking-wider text-[#F5A623]">Payment Notice</p>
                <p className="mt-1 text-xs text-[#F5A623]">
                  Please show this digital bill to staff at the counter or when requesting cash/card collection.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => window.print()}
                  className="w-full rounded-xl bg-[#0B0F1A] py-3 text-sm font-bold text-white hover:bg-stone-800 shadow-md"
                >
                  Print / Save Receipt
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || checkoutRequested}
                  className="w-full rounded-xl bg-amber-800 py-3 text-sm font-bold text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60 shadow-md"
                >
                  {checkoutLoading ? 'Processing checkout…' : checkoutRequested ? 'Checkout requested, waiting for approval' : 'Checkout with cashier'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}