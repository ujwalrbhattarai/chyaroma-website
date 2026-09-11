import { useEffect, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import { listTables } from '../../services/tableService'

export default function KitchenTablesPage({ navigate, session, setSession }) {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'vacant' | 'occupied'
  const [selectedTable, setSelectedTable] = useState(null)

  const [capacities] = useState(() => {
    try {
      const raw = localStorage.getItem('chyaroma_table_capacities')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  async function fetchTables() {
    try {
      setError('')
      const { tables: loaded } = await listTables(session?.branchId)
      setTables(loaded)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTables()
    const timer = setInterval(fetchTables, 10000)
    return () => clearInterval(timer)
  }, [session?.branchId])

  const activeTables = tables.filter((t) => t.isActive)
  const occupiedTables = activeTables.filter((t) => t.isOccupied)
  const vacantTables = activeTables.filter((t) => !t.isOccupied)

  const displayedTables = activeTables.filter((t) => {
    if (filter === 'vacant') return !t.isOccupied
    if (filter === 'occupied') return t.isOccupied
    return true
  })

  const area = session?.role === 'branch_manager' ? 'manager' : 'kitchen'

  return (
    <PageShell
      area={area}
      title="Table Status Overview"
      description="Live operational view of table seating and occupancy."
      navigate={navigate}
      setSession={setSession}
      session={session}
    >
      {/* Read-Only Table Details Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-neo-appear">
          <div className="neo-card rounded-2xl p-6 max-w-sm w-full border border-[#D4AF37]/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#374151]/50">
              <div>
                <h2 className="text-2xl font-black text-[#F9FAFB]">Table #{selectedTable.tableNumber}</h2>
                {selectedTable.label && <p className="text-xs text-[#9CA3AF] mt-0.5">{selectedTable.label}</p>}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold tracking-wider ${
                  selectedTable.isOccupied
                    ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                    : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${selectedTable.isOccupied ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} />
                {selectedTable.isOccupied ? 'OCCUPIED' : 'VACANT'}
              </span>
            </div>

            <div className="space-y-2 text-xs p-3 neo-inset rounded-xl">
              <div className="flex justify-between">
                <span className="text-[#8B93A7]">Seating Capacity:</span>
                <span className="font-bold text-[#F9FAFB]">{capacities[selectedTable.id] ?? 4} Seats</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8B93A7]">Current Status:</span>
                <span className="font-bold text-[#F9FAFB]">
                  {selectedTable.customerOccupied ? 'Active Customer Order' : selectedTable.manualOccupied ? 'Manual Reservation' : 'Vacant'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                id="modal-close-kitchen-table-info"
                className="neo-inset px-5 py-2 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-white cursor-pointer"
                onClick={() => setSelectedTable(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Filter Pills */}
      <div className="mb-6 neo-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="kitchen-filter-all"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              filter === 'all'
                ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 scale-105'
                : 'neo-inset text-[#9CA3AF] hover:text-white'
            }`}
          >
            <span>All Tables</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${filter === 'all' ? 'bg-black/20 text-black' : 'bg-black/40 text-[#F9FAFB]'}`}>
              {activeTables.length}
            </span>
          </button>

          <button
            id="kitchen-filter-vacant"
            onClick={() => setFilter('vacant')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              filter === 'vacant'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 scale-105'
                : 'neo-inset text-emerald-400 hover:bg-emerald-950/40'
            }`}
          >
            <span>🟢 Vacant</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${filter === 'vacant' ? 'bg-black/20 text-black' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'}`}>
              {vacantTables.length}
            </span>
          </button>

          <button
            id="kitchen-filter-occupied"
            onClick={() => setFilter('occupied')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              filter === 'occupied'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 scale-105'
                : 'neo-inset text-red-400 hover:bg-red-950/40'
            }`}
          >
            <span>🔴 Occupied</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${filter === 'occupied' ? 'bg-black/30 text-white' : 'bg-red-950 text-red-300 border border-red-500/30'}`}>
              {occupiedTables.length}
            </span>
          </button>
        </div>

        <span className="text-xs text-[#8B93A7] font-semibold">Read-Only View</span>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-950/50 border border-red-800/50 p-4 text-sm text-red-300" role="alert">{error}</p>}

      {loading ? (
        <div className="py-12 text-center text-[#9CA3AF] animate-pulse">Loading table statuses…</div>
      ) : displayedTables.length === 0 ? (
        <div className="neo-card rounded-2xl p-8 text-center text-sm text-[#9CA3AF]">
          No active tables found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayedTables.map((table) => (
            <article
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`neo-card cursor-pointer rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between min-h-[140px] select-none group ${
                table.isOccupied
                  ? 'bg-red-950/30 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.12)]'
                  : 'bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-black text-[#F9FAFB] group-hover:text-[#D4AF37] transition-colors">
                    TABLE {String(table.tableNumber).padStart(2, '0')}
                  </h3>
                  {table.label && <p className="text-xs text-[#9CA3AF] mt-0.5 font-medium">{table.label}</p>}
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider ${
                    table.isOccupied
                      ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${table.isOccupied ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} />
                  {table.isOccupied ? 'OCCUPIED' : 'VACANT'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#374151]/40 text-xs text-[#9CA3AF]">
                <span className="flex items-center gap-1 font-medium">
                  <svg className="w-4 h-4 text-[#8B93A7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {capacities[table.id] ?? 4} seats
                </span>
                <span className="text-[11px] font-semibold text-[#8B93A7] group-hover:text-[#D4AF37]">
                  View Details →
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  )
}
