import { useEffect, useState } from 'react'
import { getPublicBranding } from '../../services/settingsService'
import logo from '../../logo.png'

export default function TopNav({ navigate }) {
  const token = new URLSearchParams(window.location.search).get('token') || sessionStorage.getItem('cc_table_token') || ''
  const [branding, setBranding] = useState({ cafeName: '', logoUrl: '' })

  useEffect(() => {
    if (token) {
      sessionStorage.setItem('cc_table_token', token)
    }
    let cancelled = false
    getPublicBranding(token)
      .then((data) => {
        if (cancelled) return
        const b = data?.branding ?? {}
        const name = (b.cafeName || '').trim()
        setBranding({ cafeName: name, logoUrl: b.logoUrl ?? '' })
        document.title = name || 'Chyaroma - Menu'
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [token])

  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : ''
  const displayName = branding.cafeName || 'Chyaroma'
  const logoSrc = branding.logoUrl || logo

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-amber-500/20 bg-[#0E1322]/95 px-4 py-3 backdrop-blur-md shadow-lg neo-card">
      <button
        className="group flex items-center gap-2.5 text-lg font-extrabold transition-all hover:scale-105"
        onClick={() => navigate(`/table/menu${tokenQuery}`)}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 p-1 border border-amber-500/30 neo-inset">
          <img
            src={logoSrc}
            alt={displayName}
            className="h-full w-full object-contain"
            onError={(e) => { e.target.src = logo }}
          />
        </div>
        <span className="text-xl font-bold tracking-wide text-[#F5A623] drop-shadow-[0_0_8px_rgba(245,166,35,0.3)]">
          {displayName}
        </span>
      </button>
      <nav className="flex gap-1.5 text-xs font-semibold text-[#9CA3AF] sm:text-sm">
        <button
          className="rounded-xl px-3.5 py-2 transition-all neo-btn-secondary hover:text-[#F5A623]"
          onClick={() => navigate(`/table/menu${tokenQuery}`)}
        >
          Menu
        </button>
        <button
          className="rounded-xl px-3.5 py-2 transition-all neo-btn-secondary hover:text-[#F5A623]"
          onClick={() => navigate(`/table/order-status${tokenQuery}`)}
        >
          My Order
        </button>
        <button
          className="rounded-xl px-3.5 py-2 transition-all neo-btn-secondary hover:text-[#F5A623]"
          onClick={() => navigate(`/table/request-bill${tokenQuery}`)}
        >
          Request Bill
        </button>
      </nav>
    </header>
  )
}