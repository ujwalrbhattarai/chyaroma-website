import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import PageShell from '../../components/shared/PageShell'
import DemoBanner from '../../components/demo/DemoBanner'
import { requestDemoBill, checkoutDemo, getSessionId } from '../../services/demoService'

export default function DemoBillPage({ navigate }) {
  const [sessionId] = useState(getSessionId)
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const socketRef = useRef(null)

  useEffect(() => {
    if (!sessionId) {
      navigate('/demo')
      return
    }
    fetchBill()
  }, [sessionId, navigate])

  useEffect(() => {
    if (!sessionId || bill?.checkoutApprovedAt) return

    const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join-demo', { sessionId })
    })

    socket.on('demo-bill-updated', (payload) => {
      if (payload?.bill) {
        setBill(payload.bill)
        if (payload.bill.checkoutApprovedAt) {
          setMessage('Demo checkout complete! Thank you for testing Chyaroma demo mode!')
        }
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [sessionId, bill?.checkoutApprovedAt])

  async function fetchBill() {
    setLoading(true)
    setError('')
    try {
      const result = await requestDemoBill({ sessionId })
      setBill(result.bill)
      if (result.bill?.checkoutApprovedAt) {
        setMessage('Demo checkout complete! Thank you for testing Chyaroma demo mode!')
      }
    } catch (err) {
      if (err.message.includes('404') || err.message.toLowerCase().includes('no active orders')) {
        setError('No active demo orders found to calculate a bill.')
        setBill(null)
      } else {
        setError(err.message || 'Failed to fetch demo bill.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout() {
    if (!bill?.id || checkoutLoading) return
    setCheckoutLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await checkoutDemo({ sessionId, billId: bill.id })
      setBill(result.bill)
      setMessage('Demo checkout completed! Simulated payment received and table cleared automatically.')
    } catch (err) {
      setError(err.message || 'Failed to complete demo checkout.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const checkoutApproved = !!bill?.checkoutApprovedAt

  if (checkoutApproved) {
    return (
      <PageShell area="customer" title="" description="" navigate={navigate}>
        <div className="mx-auto max-w-xl pb-16">
          <DemoBanner onExit={() => navigate('/demo')} />
          <div className="overflow-hidden rounded-3xl border border-emerald-500/40 bg-[#151B2B] text-center shadow-2xl">
            <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 p-8 text-white">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white shadow-lg">
                ✓
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight">Demo Checkout Completed!</h1>
              <p className="mt-2 text-sm text-emerald-200">Simulated payment processed cleanly</p>
            </div>
            <div className="p-8">
              <p className="text-sm text-[#9CA3AF]">
                Thank you for experiencing Chyaroma&apos;s digital ordering & checkout flow in demo mode!
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => navigate('/demo/menu')}
                  className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-stone-950 shadow-lg hover:bg-amber-400 cursor-pointer"
                >
                  Try Demo Menu Again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10 cursor-pointer"
                >
                  Return to Home Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell area="customer" title="" description="" navigate={navigate}>
      <div className="mx-auto max-w-xl pb-16">
        <DemoBanner onExit={() => navigate('/demo')} />

        {message && !loading && (
          <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/60 p-5 text-center text-sm font-semibold text-emerald-300">
            {message}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
            <p className="mt-4 text-sm font-medium text-[#9CA3AF]">Calculating demo bill…</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-dashed border-[#374151] bg-[#151B2B] p-8 text-center shadow-lg">
            <p className="text-base font-bold text-[#9CA3AF]">{error}</p>
            <p className="mt-2 text-sm text-[#9CA3AF]">Place a demo order first from the menu screen.</p>
            <button
              onClick={() => navigate('/demo/menu')}
              className="mt-5 inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 shadow-md hover:bg-amber-400 cursor-pointer"
            >
              Go to Demo Menu & Order
            </button>
          </div>
        )}

        {bill && !loading && (
          <div className="overflow-hidden rounded-3xl border border-[#1F2937] bg-[#151B2B] shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-br from-amber-900 to-amber-950 p-6 text-center text-white relative">
              <span className="absolute top-4 right-4 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Demo Session
              </span>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-xl font-black text-stone-950 shadow-md">
                CC
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight">Demo Table #99 Bill</h1>
              <p className="text-xs text-amber-200/80">Simulated Digital Bill Receipt</p>
            </div>

            {/* Bill Details */}
            <div className="p-6">
              <div className="mb-6 flex justify-between border-b border-[#1E2435] pb-4 text-xs font-medium text-[#9CA3AF]">
                <span>Date: {new Date(bill.createdAt || Date.now()).toLocaleDateString()}</span>
                <span>Bill #: {bill.id ? bill.id.slice(0, 8).toUpperCase() : 'DEMO-BILL'}</span>
              </div>

              {/* Items List */}
              {bill.items && bill.items.length > 0 ? (
                <div className="mb-6 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8B93A7]">Ordered Items</p>
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

              {/* Totals */}
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

              {/* Demo Notice */}
              <div className="mt-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Simulated Payment</p>
                <p className="mt-1 text-xs text-amber-200/80">
                  Clicking checkout below will instantly simulate payment verification and approve your bill.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-extrabold text-stone-950 hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg cursor-pointer transition-all"
                >
                  {checkoutLoading ? 'Simulating Checkout…' : 'Simulate Checkout & Complete Demo'}
                </button>
                <button
                  onClick={() => navigate('/demo/order-status')}
                  className="w-full rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10 cursor-pointer"
                >
                  Back to Order Status
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
