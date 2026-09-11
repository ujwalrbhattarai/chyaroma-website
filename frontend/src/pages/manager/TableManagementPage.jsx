import { useEffect, useState } from 'react'
import PageShell from '../../components/shared/PageShell'
import { listTables, createTable, deactivateTable, forceReleaseTable, getTableQr, setTableOccupied } from '../../services/tableService'
import { listBranches } from '../../services/branchService'

export default function TableManagementPage({ navigate, session }) {
  const [tables, setTables] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState(session?.branchId || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ tableNumber: '', label: '', capacity: '4' })
  const [qrModal, setQrModal] = useState(null) // { tableNumber, qrCodeDataUrl }
  const [qrLoading, setQrLoading] = useState(null) // tableId being fetched
  const [confirmRelease, setConfirmRelease] = useState(null) // table awaiting force-release confirmation
  const [selectedTable, setSelectedTable] = useState(null) // table open in management/details modal
  const [filter, setFilter] = useState('all') // 'all' | 'vacant' | 'occupied'
  const [sort, setSort] = useState('num-asc') // 'num-asc' | 'num-desc' | 'status'

  // Persistent seat capacities state
  const [capacities, setCapacities] = useState(() => {
    try {
      const raw = localStorage.getItem('chyaroma_table_capacities')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  function handleUpdateSeats(tableId, newSeats) {
    const updated = { ...capacities, [tableId]: newSeats }
    setCapacities(updated)
    try {
      localStorage.setItem('chyaroma_table_capacities', JSON.stringify(updated))
    } catch {
      // ignore storage errors
    }
  }

  const isSuperAdmin = session?.role === 'super_admin'

  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        if (isSuperAdmin) {
          const { branches: loadedBranches } = await listBranches()
          const activeBranches = loadedBranches.filter((b) => b.isActive && !b.isDemo && !b.name?.toLowerCase().includes('demo'))
          setBranches(activeBranches)
          if (activeBranches.length > 0 && !selectedBranchId) {
            setSelectedBranchId(activeBranches[0].id)
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [isSuperAdmin])

  const targetBranchId = isSuperAdmin ? selectedBranchId : session?.branchId

  async function reload(bId) {
    const bToFetch = bId || targetBranchId
    if (!bToFetch) return
    try {
      setError('')
      const { tables: loaded } = await listTables(bToFetch)
      setTables(loaded)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (targetBranchId) {
      reload(targetBranchId)
    }
  }, [targetBranchId])

  // Periodic polling to keep table status updated in real-time
  useEffect(() => {
    if (!targetBranchId) return
    const interval = setInterval(() => {
      reload(targetBranchId)
    }, 15000)
    return () => clearInterval(interval)
  }, [targetBranchId])

  async function handleCreate(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!targetBranchId) {
      setError('Please select a branch first.')
      return
    }
    try {
      const { table, qrCodeDataUrl } = await createTable({ tableNumber: Number(form.tableNumber), label: form.label }, targetBranchId)
      setTables((current) => [...current, table])
      if (form.capacity) {
        handleUpdateSeats(table.id, Number(form.capacity) || 4)
      }
      setForm({ tableNumber: '', label: '', capacity: '4' })
      setSuccess(`Table #${table.tableNumber} created successfully.`)
      setQrModal({ tableNumber: table.tableNumber, qrCodeDataUrl })
    } catch (err) { setError(err.message) }
  }

  async function handleShowQr(table) {
    setQrLoading(table.id)
    setError('')
    try {
      const { qrCodeDataUrl } = await getTableQr(table.id, targetBranchId)
      setQrModal({ tableNumber: table.tableNumber, qrCodeDataUrl })
    } catch (err) { setError(err.message) }
    finally { setQrLoading(null) }
  }

  async function handleDeactivate(tableId) {
    setError('')
    setSuccess('')
    try {
      const { table } = await deactivateTable(tableId, targetBranchId)
      setTables((current) => current.map((t) => (t.id === table.id ? table : t)))
      setSuccess(`Table #${table.tableNumber} deactivated.`)
    } catch (err) { setError(err.message) }
  }

  async function handleToggleOccupied(table) {
    setError('')
    setSuccess('')
    try {
      if (table.isOccupied) {
        try {
          const { table: updated } = await setTableOccupied(table.id, false, targetBranchId)
          setTables((current) => current.map((t) => (t.id === updated.id ? { ...t, ...updated, isOccupied: false, autoOccupied: false } : t)))
          setSuccess(`Table #${updated.tableNumber} marked as vacant.`)
        } catch (releaseErr) {
          if (releaseErr.statusCode === 409) {
            setConfirmRelease(table)
          } else {
            setError(releaseErr.message)
          }
        }
      } else {
        const { table: updated } = await setTableOccupied(table.id, true, targetBranchId)
        setTables((current) => current.map((t) => (t.id === updated.id ? { ...t, manualOccupied: updated.manualOccupied, isOccupied: t.autoOccupied || updated.manualOccupied, autoOccupied: t.autoOccupied } : t)))
        setSuccess(`Table #${updated.tableNumber} marked as occupied.`)
      }
    } catch (err) { setError(err.message) }
  }

  async function handleForceRelease(table) {
    setError('')
    setSuccess('')
    try {
      const { table: updated } = await forceReleaseTable(table.id, targetBranchId)
      setTables((current) => current.map((t) => (t.id === updated.id ? { ...t, ...updated, isOccupied: false, autoOccupied: false } : t)))
      setSuccess(`Table #${table.tableNumber} force-released.`)
      setConfirmRelease(null)
    } catch (err) { setError(err.message) }
  }

  function cancelForceRelease() { setConfirmRelease(null) }

  const activeTables = tables.filter((t) => t.isActive)
  const inactiveTables = tables.filter((t) => !t.isActive)
  const occupiedTables = activeTables.filter((t) => t.isOccupied)
  const vacantTables = activeTables.filter((t) => !t.isOccupied)

  // Filter tables
  const filteredTables = activeTables.filter((t) => {
    if (filter === 'vacant') return !t.isOccupied
    if (filter === 'occupied') return t.isOccupied
    return true
  })

  // Sort tables
  const displayedTables = [...filteredTables].sort((a, b) => {
    if (sort === 'num-asc') return a.tableNumber - b.tableNumber
    if (sort === 'num-desc') return b.tableNumber - a.tableNumber
    if (sort === 'status') {
      const statusA = a.isOccupied ? 1 : 0
      const statusB = b.isOccupied ? 1 : 0
      if (statusA !== statusB) return statusA - statusB
      return a.tableNumber - b.tableNumber
    }
    return 0
  })

  // Sync selectedTable with updated state if modal is open
  const activeSelectedTable = selectedTable ? (tables.find((t) => t.id === selectedTable.id) || selectedTable) : null

  const area = isSuperAdmin ? 'admin' : 'manager'

  return (
    <PageShell area={area} title="Table & QR Management" description="Manage seating layout, track live occupancy, and inspect instant QR codes." navigate={navigate}>
      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-neo-appear">
          <div className="neo-card rounded-2xl p-6 max-w-sm w-full text-center border border-[#D4AF37]/30 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-[#F9FAFB]">Table #{qrModal.tableNumber} QR Code</h2>
            <p className="text-xs text-[#9CA3AF]">Scan to view digital menu and place instant table orders.</p>
            <div className="neo-inset p-4 rounded-xl inline-block bg-white shadow-inner">
              <img src={qrModal.qrCodeDataUrl} alt={`QR code for table ${qrModal.tableNumber}`} className="mx-auto rounded-lg h-48 w-48 object-contain" />
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button id="qr-print-btn" className="neo-btn-green px-5 py-2.5 rounded-xl text-xs font-bold" onClick={() => window.print()}>Print Code</button>
              <button id="qr-close-btn" className="neo-inset px-5 py-2.5 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-white" onClick={() => setQrModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Table Details & Actions Modal */}
      {activeSelectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-neo-appear">
          <div className="neo-card rounded-2xl p-6 max-w-md w-full border border-[#D4AF37]/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#374151]/50">
              <div>
                <h2 className="text-2xl font-black text-[#F9FAFB]">Table #{activeSelectedTable.tableNumber}</h2>
                {activeSelectedTable.label && <p className="text-xs text-[#9CA3AF] mt-0.5">{activeSelectedTable.label}</p>}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold tracking-wider transition-all duration-300 ${
                  activeSelectedTable.isOccupied
                    ? 'bg-red-950/80 text-red-400 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                    : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${activeSelectedTable.isOccupied ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'}`} />
                {activeSelectedTable.isOccupied ? 'OCCUPIED' : 'VACANT'}
              </span>
            </div>

            {/* Editable Seats & Info */}
            <div className="p-3.5 neo-inset rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[#8B93A7] uppercase font-bold text-[10px] tracking-wider">Number of Seats / Capacity</p>
                <span className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-wider">Editable</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id={`decrement-seats-${activeSelectedTable.id}`}
                  onClick={() => handleUpdateSeats(activeSelectedTable.id, Math.max(1, (capacities[activeSelectedTable.id] ?? 4) - 1))}
                  className="neo-inset h-9 w-9 rounded-xl font-black text-lg text-[#F9FAFB] flex items-center justify-center hover:bg-white/10 cursor-pointer"
                >
                  -
                </button>
                <input
                  id={`input-seats-${activeSelectedTable.id}`}
                  type="number"
                  min="1"
                  max="50"
                  value={capacities[activeSelectedTable.id] ?? 4}
                  onChange={(e) => handleUpdateSeats(activeSelectedTable.id, Math.max(1, Number(e.target.value) || 1))}
                  className="neo-inset w-20 py-1.5 px-3 text-center text-sm font-bold text-[#F9FAFB] rounded-xl border border-[#374151] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
                <button
                  type="button"
                  id={`increment-seats-${activeSelectedTable.id}`}
                  onClick={() => handleUpdateSeats(activeSelectedTable.id, (capacities[activeSelectedTable.id] ?? 4) + 1)}
                  className="neo-inset h-9 w-9 rounded-xl font-black text-lg text-[#F9FAFB] flex items-center justify-center hover:bg-white/10 cursor-pointer"
                >
                  +
                </button>
                <span className="text-xs font-semibold text-[#9CA3AF]">Seats</span>
              </div>
              <div className="pt-1 text-xs border-t border-[#374151]/30">
                <span className="text-[#8B93A7]">Occupancy Mode: </span>
                <span className="font-bold text-[#F9FAFB]">
                  {activeSelectedTable.customerOccupied ? 'Active Order' : activeSelectedTable.manualOccupied ? 'Manual Reservation' : 'Vacant'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                id={`show-qr-${activeSelectedTable.id}`}
                className="w-full neo-btn-gold py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                disabled={qrLoading === activeSelectedTable.id}
                onClick={() => {
                  const tbl = activeSelectedTable
                  setSelectedTable(null)
                  handleShowQr(tbl)
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                {qrLoading === activeSelectedTable.id ? 'Loading QR Code…' : 'Show Table QR Code'}
              </button>

              <button
                id={`toggle-occupied-${activeSelectedTable.id}`}
                className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeSelectedTable.isOccupied ? 'neo-btn-green' : 'neo-btn-red'
                }`}
                onClick={async () => {
                  const tbl = activeSelectedTable
                  await handleToggleOccupied(tbl)
                }}
              >
                {activeSelectedTable.isOccupied ? 'Mark as Vacant' : 'Mark as Occupied'}
              </button>

              <button
                id={`deactivate-table-${activeSelectedTable.id}`}
                className="w-full neo-btn-red py-2.5 rounded-xl text-xs font-bold opacity-80 hover:opacity-100 flex items-center justify-center gap-2 cursor-pointer"
                onClick={async () => {
                  const tblId = activeSelectedTable.id
                  setSelectedTable(null)
                  await handleDeactivate(tblId)
                }}
              >
                Deactivate / Delete Table
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                id="modal-close-details"
                className="neo-inset px-5 py-2 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-white cursor-pointer"
                onClick={() => setSelectedTable(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Branch selector */}
      {isSuperAdmin && (
        <div className="mb-6 neo-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#F9FAFB]">Branch Table Filter</h3>
            <p className="text-xs text-[#9CA3AF]">Select branch to inspect and manage tables</p>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-[#D4AF37]">
            Select Branch:
            <select
              id="admin-branch-selector"
              className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] cursor-pointer"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              {branches.length === 0 && <option value="">No active branches</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Toolbar: Status Summary & Quick Filters + Filter & Sort Selectors */}
      <div className="mb-6 neo-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Quick Filter Summary Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="filter-pill-all"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              filter === 'all'
                ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 scale-105'
                : 'neo-inset text-[#9CA3AF] hover:text-white'
            }`}
          >
            <span>All</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${filter === 'all' ? 'bg-black/20 text-black' : 'bg-black/40 text-[#F9FAFB]'}`}>
              {activeTables.length}
            </span>
          </button>

          <button
            id="filter-pill-vacant"
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
            id="filter-pill-occupied"
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

        {/* Filter and Sort Dropdowns */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {/* Dropdown Filter */}
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] w-full sm:w-auto">
            <select
              id="table-filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="neo-inset rounded-xl border border-[#374151] px-3.5 py-2 text-xs text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] cursor-pointer w-full sm:w-auto font-medium"
            >
              <option value="all">All Tables</option>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
            </select>
          </div>

          {/* Dropdown Sort */}
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] w-full sm:w-auto">
            <select
              id="table-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="neo-inset rounded-xl border border-[#374151] px-3.5 py-2 text-xs text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] cursor-pointer w-full sm:w-auto font-medium"
            >
              <option value="num-asc">Sort: Table Number (Low → High)</option>
              <option value="num-desc">Sort: Table Number (High → Low)</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Table list grid */}
        <section className="space-y-4">
          {error && <p className="rounded-xl bg-red-950/50 border border-red-800/50 p-4 text-sm text-red-300" role="alert">{error}</p>}
          {success && <p className="rounded-xl bg-emerald-950/50 border border-emerald-800/50 p-4 text-sm text-emerald-300">{success}</p>}
          
          {confirmRelease && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-5" role="alert">
              <p className="text-sm font-bold text-[#F5A623]">Table #{confirmRelease.tableNumber} has unpaid orders.</p>
              <p className="mt-1 text-xs text-[#9CA3AF]">Force-releasing will cancel active orders and reset status to vacant.</p>
              <div className="mt-4 flex gap-3">
                <button
                  id="confirm-force-release"
                  className="neo-btn-red px-4 py-2 text-xs rounded-xl font-bold"
                  onClick={() => handleForceRelease(confirmRelease)}
                >
                  Force-Release Table
                </button>
                <button
                  id="cancel-force-release"
                  className="neo-inset px-4 py-2 text-xs rounded-xl font-semibold text-[#9CA3AF]"
                  onClick={cancelForceRelease}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#F9FAFB]">
              Tables ({displayedTables.length} of {activeTables.length})
            </h2>
            <span className="text-xs text-[#9CA3AF]">Click any card to manage</span>
          </div>
          
          {loading ? (
            <div className="py-12 text-center text-[#9CA3AF] animate-pulse">Loading tables…</div>
          ) : displayedTables.length === 0 ? (
            <div className="neo-card rounded-2xl p-8 text-center text-sm text-[#9CA3AF]">
              {activeTables.length === 0
                ? 'No active tables registered for this branch yet.'
                : `No ${filter} tables found.`}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedTables.map((table) => (
                <article
                  key={table.id}
                  id={`table-card-${table.id}`}
                  onClick={() => setSelectedTable(table)}
                  className={`neo-card cursor-pointer rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between min-h-[150px] select-none group ${
                    table.isOccupied
                      ? 'bg-red-950/30 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.12)] hover:shadow-[0_0_22px_rgba(239,68,68,0.25)]'
                      : 'bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:shadow-[0_0_22px_rgba(16,185,129,0.25)]'
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
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider transition-all duration-300 ${
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
                    <span className="text-[11px] font-semibold text-[#D4AF37] group-hover:translate-x-0.5 transition-transform">
                      Manage →
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {inactiveTables.length > 0 && (
            <details className="mt-6 neo-card rounded-2xl p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#9CA3AF] hover:text-[#F5A623]">Show {inactiveTables.length} removed table{inactiveTables.length !== 1 ? 's' : ''}</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {inactiveTables.map((table) => (
                  <article key={table.id} className="neo-inset rounded-xl p-4 opacity-60">
                    <p className="font-medium text-[#9CA3AF]">Table #{table.tableNumber}</p>
                    {table.label && <p className="text-xs text-[#8B93A7]">{table.label}</p>}
                  </article>
                ))}
              </div>
            </details>
          )}
        </section>

        {/* Create form */}
        <section className="neo-card rounded-2xl p-6 self-start">
          <h2 className="mb-1 text-lg font-bold text-[#F9FAFB]">Add Table</h2>
          <p className="mb-5 text-xs text-[#9CA3AF]">A scannable QR code will be generated instantly upon creation.</p>
          
          <form id="create-table-form" className="grid gap-4" onSubmit={handleCreate}>
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
              Table Number
              <input id="table-number" type="number" min="1" className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" value={form.tableNumber} onChange={(e) => setForm((f) => ({ ...f, tableNumber: e.target.value }))} required />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
              Number of Seats (Capacity)
              <input id="table-capacity" type="number" min="1" max="50" className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} required />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">
              Label (Optional)
              <input id="table-label" className="neo-inset rounded-xl border border-[#374151] px-4 py-2.5 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Balcony Window 2" />
            </label>
            <button id="submit-table" type="submit" className="neo-btn-green py-3.5 px-5 rounded-xl font-bold text-sm tracking-wide mt-2 cursor-pointer" disabled={!targetBranchId}>
              Create Table + Generate QR
            </button>
          </form>
        </section>
      </div>
    </PageShell>
  )
}