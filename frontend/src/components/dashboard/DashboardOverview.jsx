import { useEffect, useState } from 'react'
import { getOverview } from '../../services/reportsService'
import { listBranches } from '../../services/branchService'

function Card({ label, value, sub, highlight = false, alert = false }) {
  let accentBorder = 'border-white/5'
  if (highlight) accentBorder = 'border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
  if (alert) accentBorder = 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'

  return (
    <div className={`neo-card rounded-2xl p-6 ${accentBorder} group cursor-pointer hover:scale-[1.02] transition-all duration-300`}>
      <p className="text-xs font-bold uppercase tracking-wider text-[#8B93A7] group-hover:text-[#D4AF37] transition-colors">{label}</p>
      <p className="mt-3 text-3xl font-black text-[#F9FAFB] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-[#D1D5DB]">{value}</p>
      {sub && <p className="mt-1.5 text-xs text-[#9CA3AF] font-medium">{sub}</p>}
    </div>
  )
}

export default function DashboardOverview({ session }) {
  const isSuperAdmin = session?.role === 'super_admin'
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const targetBranch = isSuperAdmin ? (branchId || undefined) : (session?.branchId || undefined)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setError('')
      if (isSuperAdmin) {
        try { const { branches: loaded } = await listBranches(); if (!cancelled) setBranches(loaded.filter((b) => b.isActive && !b.isDemo && !b.name?.toLowerCase().includes('demo'))) } catch {}
      }
      try {
        const d = await getOverview(targetBranch)
        if (!cancelled) setData(d.overview)
      } catch (e) { if (!cancelled) setError(e.message) } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [targetBranch, isSuperAdmin])

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-red-900/40 border border-red-500/50 p-4 text-sm text-red-200" role="alert">{error}</p>}
      
      {isSuperAdmin && (
        <div className="neo-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#F9FAFB]">Branch Overview</h3>
            <p className="text-xs text-[#9CA3AF]">Filter performance metrics by cafe branch</p>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-[#D4AF37]">
            Select Branch:
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="neo-inset rounded-xl px-4 py-2.5 text-sm text-[#F9FAFB] border border-[#374151] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[#9CA3AF] animate-pulse font-medium">Loading metrics overview…</div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Today's Revenue" value={data.revenueToday ? `Rs ${data.revenueToday.toLocaleString()}` : 'Rs 0'} sub="Finalized & approved" highlight />
            <Card label="Customers Today" value={data.customersToday} sub="Bills settled" />
            <Card label="Orders Today" value={data.ordersToday} sub="Completed orders" />
            <Card label="Avg / Customer" value={data.avgPerCustomerToday ? `Rs ${data.avgPerCustomerToday.toLocaleString()}` : 'Rs 0'} sub="Today's average spend" />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Card label="Total Revenue" value={`Rs ${(data.totalRevenue ?? 0).toLocaleString()}`} sub="All-time accumulated" highlight />
            <Card label="Active Orders" value={data.activeOrders} sub="In kitchen / pending" alert={Boolean(data.activeOrders)} />
            <Card label="Low Stock Items" value={data.lowStock} sub="Need restocking" alert={Boolean(data.lowStock)} />
          </div>

          <div className="neo-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#F9FAFB] mb-4 flex items-center justify-between">
              <span>Top Items Sold Today</span>
              <span className="text-xs font-semibold text-[#D4AF37] neo-inset px-3 py-1 rounded-full">Live Stats</span>
            </h3>
            {data.topItemsToday?.length ? (
              <ul className="divide-y divide-[#1F2937]/80">
                {data.topItemsToday.map((item) => (
                  <li key={item.name} className="flex items-center justify-between py-3 text-sm hover:bg-[#0E1322]/50 px-3 rounded-lg transition-colors">
                    <span className="text-[#E5E7EB] font-medium">{item.name}</span>
                    <span className="font-bold text-[#F5A623] bg-[#0E1322] px-3 py-1 rounded-full border border-[#D4AF37]/20">{item.qty} sold</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-[#8B93A7]">No sales recorded today yet.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[#9CA3AF] py-6 text-center">No overview data available.</p>
      )}
    </div>
  )
}

