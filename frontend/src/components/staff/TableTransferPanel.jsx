import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { approveTransfer, denyTransfer, listPendingTransfers } from '../../services/transferService'

// Cashier/Manager panel: approve or deny a customer's request to move tables while
// they still have an open (unpaid) tab. Alerts arrive over the staff-only socket room.
export default function TableTransferPanel({ branchId }) {
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const socketRef = useRef(null)

  const fetchTransfers = async () => {
    try {
      const data = await listPendingTransfers()
      setTransfers(data.transfers || [])
    } catch {
      // e.g. role without permission — ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchTransfers()
  }, [branchId])

  useEffect(() => {
    if (!branchId) return
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, { transports: ['websocket'] })
    socketRef.current = socket
    const onConnect = () => socket.emit('join-staff', { branchId: String(branchId) })
    socket.on('connect', onConnect)
    const onRequested = () => fetchTransfers()
    const onResolved = () => fetchTransfers()
    socket.on('table-transfer-requested', onRequested)
    socket.on('table-transfer-resolved', onResolved)
    return () => {
      socket.off('connect', onConnect)
      socket.off('table-transfer-requested', onRequested)
      socket.off('table-transfer-resolved', onResolved)
      socket.disconnect()
    }
  }, [branchId])

  async function handleApprove(id) {
    setBusyId(id)
    try { await approveTransfer(id) } catch (err) { alert(err.message) } finally { setBusyId(null); fetchTransfers() }
  }

  async function handleDeny(id) {
    setBusyId(id)
    try { await denyTransfer(id) } catch (err) { alert(err.message) } finally { setBusyId(null); fetchTransfers() }
  }

  return (
    <section className="neo-card rounded-2xl p-6">
      <div className="flex items-center justify-between border-b border-[#1E2435] pb-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-white">Table Move Requests</h2>
          <p className="text-xs text-[#9CA3AF]">Approve when a customer moves with an unpaid tab</p>
        </div>
        <span className="rounded-full bg-red-500/20 border border-red-500/40 px-3 py-0.5 text-xs font-bold text-red-300">
          {transfers.length} pending
        </span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-[#9CA3AF] animate-pulse">Loading requests…</div>
      ) : transfers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1F2937] p-5 text-center text-xs text-[#9CA3AF]">
          No pending table move requests.
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((t) => (
            <div key={t.id} className="rounded-xl border border-red-500/30 bg-red-950/20 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-red-300">Unpaid tab wants to move</p>
              <p className="mt-1 text-sm font-bold text-white">
                Table <span className="text-[#F5A623]">#{t.fromTableNumber ?? '?'}</span> →{' '}
                <span className="text-[#F5A623]">#{t.toTableNumber ?? '?'}</span>
              </p>
              <p className="mt-1 text-xs text-[#9CA3AF]">
                {t.fromLabel ? `${t.fromLabel} — ` : ''}moved at{' '}
                {t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => handleApprove(t.id)}
                  className="flex-1 rounded-xl bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-500 disabled:opacity-50"
                >
                  {busyId === t.id ? 'Moving…' : 'Approve Move'}
                </button>
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => handleDeny(t.id)}
                  className="flex-1 rounded-xl bg-red-700 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}