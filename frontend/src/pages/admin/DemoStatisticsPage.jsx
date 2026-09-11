import { useEffect, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import { getDemoStats } from '../../services/demoStatsService'

const STATUS_COLORS = {
  pending: { bg: 'bg-yellow-900/40', text: 'text-yellow-300', border: 'border-yellow-500/30' },
  accepted: { bg: 'bg-blue-900/40', text: 'text-blue-300', border: 'border-blue-500/30' },
  preparing: { bg: 'bg-orange-900/40', text: 'text-orange-300', border: 'border-orange-500/30' },
  ready: { bg: 'bg-emerald-900/40', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  completed: { bg: 'bg-green-900/40', text: 'text-green-300', border: 'border-green-500/30' },
  cancelled: { bg: 'bg-red-900/40', text: 'text-red-300', border: 'border-red-500/30' },
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className={`neo-card rounded-2xl p-6 border ${accent ? 'border-indigo-500/30 shadow-[0_0_18px_rgba(99,102,241,0.12)]' : 'border-white/5'} group hover:scale-[1.02] transition-all duration-300`}>
      <p className="text-xs font-bold uppercase tracking-wider text-[#8B93A7] group-hover:text-indigo-400 transition-colors">{label}</p>
      <p className="mt-3 text-3xl font-black text-[#F9FAFB] tracking-tight">{value}</p>
      {sub && <p className="mt-1.5 text-xs text-[#9CA3AF] font-medium">{sub}</p>}
    </div>
  )
}

function DemoBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-900/50 text-indigo-300 border border-indigo-500/30">

      {children}
    </span>
  )
}

export default function DemoStatisticsPage({ navigate, session }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getDemoStats()
      .then(({ stats: s }) => { if (!cancelled) setStats(s) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <PageShell
      area="admin"
      title="Demo Statistics"
      description="Analytics for the public-facing demo environment. This data is fully isolated from real business operations."
      navigate={navigate}
    >
      {/* System notice banner */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-indigo-500/25 bg-indigo-950/30 px-5 py-4">

        <div>
          <p className="text-sm font-bold text-indigo-300">Demo Environment — Isolated System Branch</p>
          <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
            Statistics below reflect <strong className="text-indigo-300">demo visitor activity only</strong>.
            Demo orders, revenue, and sessions are <strong className="text-indigo-300">never mixed</strong> with real branch data.
            No real inventory, payments, or kitchen operations are affected by demo activity.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-xl bg-red-900/40 border border-red-500/50 p-4 text-sm text-red-200" role="alert">{error}</p>
      )}

      {loading ? (
        <div className="py-16 text-center text-[#9CA3AF] animate-pulse font-medium">Loading demo statistics…</div>
      ) : stats ? (
        <div className="space-y-8">

          {/* Sessions & Orders overview */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#8B93A7] mb-4 flex items-center gap-2">
              <DemoBadge>Sessions & Orders</DemoBadge>
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Demo Sessions"
                value={stats.sessions?.totalSessions ?? 0}
                sub="All-time visitors"
                accent
              />
              <StatCard
                label="Active Sessions"
                value={stats.sessions?.activeSessions ?? 0}
                sub="Currently valid (not expired)"
              />
              <StatCard
                label="Total Demo Orders"
                value={stats.orders?.total ?? 0}
                sub="Excluding cancelled"
                accent
              />
              <StatCard
                label="Completed Checkouts"
                value={stats.revenue?.billCount ?? 0}
                sub="Demo bills finalized"
              />
            </div>
          </div>

          {/* Revenue */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#8B93A7] mb-4 flex items-center gap-2">
              <DemoBadge>Simulated Revenue</DemoBadge>
            </h2>
            <p className="text-xs text-[#6B7280] mb-4 -mt-2">
              These amounts are <strong className="text-yellow-600">simulated</strong> — no real transactions occurred.
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <StatCard
                label="Simulated Revenue Today"
                value={`Rs ${(stats.revenue?.revenueToday ?? 0).toLocaleString()}`}
                sub="Demo checkouts today"
                accent
              />
              <StatCard
                label="All-Time Simulated Revenue"
                value={`Rs ${(stats.revenue?.revenueTotal ?? 0).toLocaleString()}`}
                sub="Total demo billing"
                accent
              />
              <StatCard
                label="Bills Today"
                value={stats.revenue?.billCountToday ?? 0}
                sub="Demo checkouts completed today"
              />
            </div>
          </div>

          {/* Order Status Breakdown */}
          {stats.orders?.byStatus?.length > 0 && (
            <div className="neo-card rounded-2xl p-6">
              <h2 className="text-lg font-bold text-[#F9FAFB] mb-4 flex items-center justify-between">
                <span>Demo Order Status Breakdown</span>
                <DemoBadge>Demo Only</DemoBadge>
              </h2>
              <div className="flex flex-wrap gap-3">
                {stats.orders.byStatus.map((s) => {
                  const colors = STATUS_COLORS[s.status] ?? { bg: 'bg-gray-900/40', text: 'text-gray-300', border: 'border-gray-500/30' }
                  return (
                    <div key={s.status} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${colors.bg} ${colors.border}`}>
                      <span className={`text-sm font-bold capitalize ${colors.text}`}>{s.status}</span>
                      <span className={`text-xl font-black ${colors.text}`}>{s.count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top Demo Items */}
          {stats.topItems?.length > 0 && (
            <div className="neo-card rounded-2xl p-6">
              <h2 className="text-lg font-bold text-[#F9FAFB] mb-4 flex items-center justify-between">
                <span>Most Popular Demo Menu Items</span>
                <DemoBadge>Demo Only</DemoBadge>
              </h2>
              <ul className="divide-y divide-[#1F2937]/80">
                {stats.topItems.map((item, i) => (
                  <li key={item.name} className="flex items-center justify-between py-3 text-sm hover:bg-[#0E1322]/50 px-3 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-[#6B7280] text-xs font-bold w-5 text-right">{i + 1}.</span>
                      <span className="text-[#E5E7EB] font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[#9CA3AF]">Rs {item.revenue.toLocaleString()}</span>
                      <span className="font-bold text-indigo-300 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-500/20 text-xs">
                        {item.qty} ordered
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent Demo Orders */}
          {stats.recentOrders?.length > 0 && (
            <div className="neo-card rounded-2xl p-6">
              <h2 className="text-lg font-bold text-[#F9FAFB] mb-4 flex items-center justify-between">
                <span>Recent Demo Orders</span>
                <DemoBadge>Live Feed</DemoBadge>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-[#8B93A7] border-b border-[#1F2937]/80">
                      <th className="pb-3 pr-4 font-bold">Order #</th>
                      <th className="pb-3 pr-4 font-bold">Status</th>
                      <th className="pb-3 pr-4 font-bold">Session</th>
                      <th className="pb-3 font-bold">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]/40">
                    {stats.recentOrders.map((order) => {
                      const colors = STATUS_COLORS[order.status] ?? { bg: '', text: 'text-gray-300', border: '' }
                      return (
                        <tr key={order.id} className="hover:bg-[#0E1322]/50 transition-colors">
                          <td className="py-3 pr-4">
                            <span className="font-mono text-xs text-indigo-300 font-bold">{order.demoOrderNumber}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${colors.text} bg-opacity-20`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-xs text-[#6B7280] font-mono">{order.demoSessionId?.slice(0, 8)}…</span>
                          </td>
                          <td className="py-3">
                            <span className="text-xs text-[#9CA3AF]">
                              {new Date(order.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Generated at */}
          <p className="text-xs text-[#6B7280] text-right">
            Generated at: {stats.generatedAt ? new Date(stats.generatedAt).toLocaleString() : '—'}
          </p>
        </div>
      ) : (
        <p className="text-[#9CA3AF] py-6 text-center">No demo statistics available yet.</p>
      )}
    </PageShell>
  )
}
