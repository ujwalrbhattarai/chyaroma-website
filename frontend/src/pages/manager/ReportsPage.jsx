import { useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import PageShell from '../../components/shared/PageShell'
import { getReport } from '../../services/reportsService'
import { listBranches } from '../../services/branchService'
import { useBranding } from '../../context/BrandingContext'

const today = new Date().toISOString().slice(0, 10)

function Metric({ label, value }) {
  return (
    <div className="neo-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300">
      <p className="text-xs font-bold uppercase tracking-wider text-[#8B93A7]">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#F9FAFB] tracking-tight">{value}</p>
    </div>
  )
}

function VerticalBars({ data, color = 'bg-[#D4AF37]', formatter = (v) => v }) {
  if (!data || data.length === 0) return <p className="text-sm text-[#8B93A7]">No data for this period.</p>
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-2" style={{ height: '190px' }}>
      {data.map((d) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] font-semibold text-[#9CA3AF]">{formatter(d.value)}</span>
          <div className={`w-full ${color} rounded-t-md shadow-lg transition-all duration-300 hover:brightness-125`} style={{ height: `${Math.round((d.value / max) * 130)}px` }} title={`${d.label}: ${formatter(d.value)}`} />
          <span className="text-[10px] text-[#8B93A7] truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function Rows({ data, currency = false, color = 'bg-[#D4AF37]' }) {
  if (!data || data.length === 0) return <p className="text-sm text-[#8B93A7]">No data for this period.</p>
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#9CA3AF] font-medium">{d.label}</span>
            <span className="font-bold text-[#F9FAFB]">{currency ? `Rs ${Number(d.value).toLocaleString()}` : d.value}</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full neo-inset">
            <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.round((d.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="neo-card rounded-2xl p-6">
      <h3 className="mb-4 text-base font-bold text-[#F9FAFB] border-b border-[#1F2937]/60 pb-3">{title}</h3>
      {children}
    </div>
  )
}


function toSeries(obj) { return Object.entries(obj || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value })) }

export default function ReportsPage({ navigate, session }) {
  const isSuperAdmin = session?.role === 'super_admin'
  const { cafeName } = useBranding()
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [mode, setMode] = useState('day')
  const [day, setDay] = useState(today)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const targetBranch = isSuperAdmin ? (branchId || undefined) : (session?.branchId || undefined)

  async function load(overrides = {}) {
    setLoading(true); setError('')
    const params = mode === 'day'
      ? { from: overrides.day ?? day, to: overrides.day ?? day }
      : { from: overrides.from ?? from, to: overrides.to ?? to }
    try { setData(await getReport({ branchId: targetBranch, ...params })) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let cancelled = false
    if (isSuperAdmin) { (async () => { try { const { branches: loaded } = await listBranches(); if (!cancelled) setBranches(loaded.filter((b) => b.isActive && !b.isDemo && !b.name?.toLowerCase().includes('demo'))) } catch {} })() }
    return () => { cancelled = true }
  }, [isSuperAdmin])

  useEffect(() => { load() }, [targetBranch, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  function downloadCsv() {
    if (!data) return
    const rows = [['Date', 'Amount (Rs)', 'Payment']]
    for (const t of data.transactions || []) rows.push([t.date, t.amount, t.method])
    rows.push([])
    rows.push(['Metric', 'Value'])
    rows.push(['Total revenue', data.summary?.revenue ?? 0])
    rows.push(['Customers', data.summary?.customers ?? 0])
    rows.push(['Orders', data.summary?.orders ?? 0])
    rows.push(['Avg per customer', data.summary?.avgPerCustomer ?? 0])
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const label = mode === 'day' ? day : `${from || 'all'}_to_${to || 'all'}`
    a.download = `report-${label || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadPdf() {
    if (!data) return
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const M = 14
    const AMBER = [245, 166, 35]
    const DARK = [11, 15, 26]
    const SLATE = [51, 65, 85]
    let y = 34

    const s = data.summary || {}
    const branchLabel = isSuperAdmin
      ? (branches.find((b) => b.id === branchId)?.name || 'All branches')
      : (session?.branchId ? 'Branch report' : '')
    const titleLine = mode === 'day' ? `Report for ${day}` : `Report ${from} to ${to}`
    const generated = new Date().toLocaleString()

    const brand = (typeof cafeName === 'string' && cafeName) ? cafeName : 'Chyaroma'

    function addHeader() {
      doc.setFillColor(DARK[0], DARK[1], DARK[2])
      doc.rect(0, 0, W, 28, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
      doc.text('DAILY PERFORMANCE REPORT', M, 12)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(AMBER[0], AMBER[1], AMBER[2])
      doc.text(titleLine, M, 20)
      doc.setTextColor(255, 255, 255)
      doc.text(brand, W - M, 12, { align: 'right' })
      doc.text(`${branchLabel}  ·  ${generated}`, W - M, 20, { align: 'right' })
    }

    function heading(text) {
      if (y > 262) { doc.addPage(); y = 20; addHeader() }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(DARK[0], DARK[1], DARK[2])
      doc.text(text.toUpperCase(), M, y)
      doc.setDrawColor(AMBER[0], AMBER[1], AMBER[2]); doc.setLineWidth(0.8)
      doc.line(M, y + 1.5, M + 40, y + 1.5)
      y += 6
    }

    function label(name, value) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(DARK[0], DARK[1], DARK[2])
      doc.text(name, M, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(75, 85, 99)
      doc.text(String(value), W - M, y, { align: 'right' })
      y += 5
    }

    function tab(columns, rows) {
      autoTable(doc, {
        startY: y,
        head: [columns],
        body: rows,
        margin: { left: M, right: M },
        theme: 'grid',
        headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        didDrawPage: (d) => { y = (d.cursor ? d.cursor.y : y) + 6 },
      })
    }

    function footer() {
      const pages = doc.getNumberOfPages()
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(SLATE[0], SLATE[1], SLATE[2])
        doc.text(`Generated ${generated}  ·  Page ${i} of ${pages}`, W - M, 292, { align: 'right' })
        doc.text(brand, M, 292)
      }
    }

    addHeader()
    heading('Summary')
    label('Total revenue', `Rs ${(s.revenue ?? 0).toLocaleString()}`)
    label('Customers (settled bills)', s.customers ?? 0)
    label('Total orders completed', s.orders ?? 0)
    label('Average spend per customer', `Rs ${(s.avgPerCustomer ?? 0).toLocaleString()}`)
    label('Bills settled', s.bills ?? 0)
    y += 2

    const days = toSeries(data.revenueByDay)
    if (days.length) {
      heading('Daily breakdown')
      tab(['Date', 'Revenue (Rs)', 'Customers'], days.map((d) => [d.label, (d.value).toLocaleString(), data.customersByDay?.[d.label] ?? 0]))
    }

    heading('Payment methods')
    tab(['Method', 'Payments', 'Amount (Rs)'], (data.paymentMethods || []).map((p) => [p.method, p.count, p.amount.toLocaleString()]))

    heading('Top selling items')
    tab(['Item', 'Qty sold', 'Revenue (Rs)'], (data.topItems || []).map((i) => [i.name, i.qty, i.revenue.toLocaleString()]))

    heading('Order status')
    tab(['Status', 'Count'], (data.statusCounts || []).map((st) => [st.status, st.count]))

    heading('Transactions')
    tab(['Date', 'Amount (Rs)', 'Payment'], (data.transactions || []).map((t) => [t.date, Number(t.amount).toLocaleString(), t.method]))

    heading('Notes')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(75, 85, 99)
    const notes = [
      `Period: ${titleLine} · Branch: ${branchLabel}`,
      'Revenue is based on settled (finalized & approved) bills.',
      'Customers are counted as settled bills (one bill per table visit); avg spend = total revenue / bills.',
      'The report was generated live from cafe records.',
    ]
    notes.forEach((n) => { doc.text(n, M, y); y += 5 })

    // Owner summary page — guarantees a 3+-page report
    if (doc.getNumberOfPages() < 3) doc.addPage()
    addHeader()
    heading('Owner summary')
    y += 4
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(DARK[0], DARK[1], DARK[2])
    doc.text(`Total revenue: Rs ${(s.revenue ?? 0).toLocaleString()}`, M, y); y += 7
    doc.text(`Customers served: ${s.customers ?? 0}`, M, y); y += 7
    doc.text(`Average spend per customer: Rs ${(s.avgPerCustomer ?? 0).toLocaleString()}`, M, y); y += 7
    doc.text(`Orders completed: ${s.orders ?? 0}`, M, y); y += 24
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(75, 85, 99)
    doc.text('Approved by: ________________________________', M, y); y += 8
    doc.text('Date: ________________________________', M, y)

    footer()
    doc.save(`report-${titleLine.replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <PageShell area={isSuperAdmin ? 'admin' : 'manager'} title="Reports & Analytics" description="Daily performance insights: revenue, customer volume, average spend, payment distribution, and exportable reports." navigate={navigate}>
      <div className="space-y-6">
        {error && <p className="rounded-xl bg-red-950/50 border border-red-800/50 p-4 text-sm text-red-300" role="alert">{error}</p>}
        
        <div className="flex flex-wrap items-end justify-between gap-4 neo-card rounded-2xl p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex overflow-hidden rounded-xl neo-inset p-1 border border-[#374151]">
              <button type="button" onClick={() => setMode('day')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'day' ? 'neo-gold-active text-[#F5A623]' : 'text-[#9CA3AF] hover:text-white'}`}>Single Day</button>
              <button type="button" onClick={() => setMode('range')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'range' ? 'neo-gold-active text-[#F5A623]' : 'text-[#9CA3AF] hover:text-white'}`}>Date Range</button>
            </div>
            {mode === 'day' ? (
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">Calendar Date
                <input type="date" className="neo-inset rounded-xl border border-[#374151] px-4 py-2 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" value={day} onChange={(e) => { setDay(e.target.value); load({ day: e.target.value }) }} />
              </label>
            ) : (
              <>
                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">From
                  <input type="date" className="neo-inset rounded-xl border border-[#374151] px-4 py-2 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" value={from} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">To
                  <input type="date" className="neo-inset rounded-xl border border-[#374151] px-4 py-2 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]" value={to} onChange={(e) => setTo(e.target.value)} />
                </label>
              </>
            )}
            {isSuperAdmin && (
              <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B93A7]">Filter Branch
                <select className="neo-inset rounded-xl border border-[#374151] px-4 py-2 text-sm text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] cursor-pointer" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  <option value="">All Branches</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            )}
            {mode === 'range' && <button onClick={() => load()} className="neo-btn-gold px-5 py-2.5 rounded-xl text-xs font-bold">Apply Filter</button>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={downloadPdf} disabled={!data} className="neo-btn-green px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
              <span>⬇</span> Download PDF
            </button>
            <button onClick={downloadCsv} disabled={!data} className="neo-btn-green px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
              <span>⬇</span> Download CSV
            </button>
            <button onClick={() => window.print()} disabled={!data} className="neo-btn-green px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none">
              <span>🖨</span> Print Report
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#9CA3AF] animate-pulse font-medium">Generating performance report…</div>
        ) : data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              <Metric label="Total Revenue" value={`Rs ${(data.summary?.revenue ?? 0).toLocaleString()}`} />
              <Metric label="Customers Served" value={data.summary?.customers ?? 0} />
              <Metric label="Orders Completed" value={data.summary?.orders ?? 0} />
              <Metric label="Avg / Customer" value={`Rs ${(data.summary?.avgPerCustomer ?? 0).toLocaleString()}`} />
            </div>
            
            {/* CHARTS */}
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="Revenue Trend Per Day"><VerticalBars data={toSeries(data.revenueByDay)} color="bg-gradient-to-t from-[#D4AF37] to-[#F5A623]" formatter={() => ''} /></ChartCard>
              <ChartCard title="Customer Volume Per Day"><VerticalBars data={toSeries(data.customersByDay)} color="bg-gradient-to-t from-emerald-600 to-emerald-400" formatter={() => ''} /></ChartCard>
              <ChartCard title="Payment Method Distribution"><Rows data={(data.paymentMethods || []).map((p) => ({ label: p.method, value: p.amount }))} currency /></ChartCard>
              <ChartCard title="Top Selling Items"><Rows data={(data.topItems || []).map((i) => ({ label: i.name, value: i.qty }))} color="bg-gradient-to-r from-amber-600 to-[#D4AF37]" /></ChartCard>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartCard title="Order Status Breakdown"><Rows data={(data.statusCounts || []).map((s) => ({ label: s.status, value: s.count }))} color="bg-gradient-to-r from-slate-600 to-slate-400" /></ChartCard>
              <ChartCard title="Transactions Log">
                {(data.transactions || []).length === 0
                  ? <p className="py-6 text-center text-sm text-[#8B93A7]">No settled transactions recorded in this period.</p>
                  : <div className="max-h-72 overflow-auto neo-inset rounded-xl p-2">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase tracking-wider text-[#8B93A7] sticky top-0 bg-[#0E1322] border-b border-[#1F2937]">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2435]">
                          {data.transactions.map((t, idx) => (
                            <tr key={idx} className="hover:bg-[#151B2B]/60 transition-colors">
                              <td className="py-2.5 px-3 text-[#9CA3AF] text-xs">{t.date}</td>
                              <td className="py-2.5 px-3 text-[#F9FAFB] font-bold">Rs {Number(t.amount).toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-[#D4AF37] text-xs font-semibold">{t.method}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>}
              </ChartCard>
            </div>
            {/* END CHARTS */}
          </div>
        )}
      </div>
    </PageShell>
  )
}

