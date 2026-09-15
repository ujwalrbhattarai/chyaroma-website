/**
 * DemoEntryPage.jsx
 *
 * The demo landing screen. Visitor chooses:
 *   A) Scan QR Code — opens DemoQRScanner
 *   B) Try Demo Table — creates a session and navigates to /demo/menu
 */
import { useState } from 'react'
import DemoQRScanner from '../../components/demo/DemoQRScanner'
import { createDemoSession } from '../../services/demoService'
import logo from '../../logo.png'

function saveDemoSession(sessionId) {
  localStorage.setItem('cc_demo_session_id', sessionId)
}

export default function DemoEntryPage({ navigate }) {
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleTryDemoTable() {
    setLoading(true)
    setError('')
    try {
      const session = await createDemoSession()
      saveDemoSession(session.sessionId)
      navigate(`/demo/menu?sessionId=${encodeURIComponent(session.sessionId)}`)
    } catch (err) {
      setError(err.message || 'Unable to start demo. Please try again.')
      setLoading(false)
    }
  }

  function handleScanSuccess(text) {
    // Attempt to extract a token from the scanned/manually-pasted value (URL or bare token)
    setShowScanner(false)
    const raw = String(text || '').trim()
    if (raw) {
      try {
        const url = new URL(raw)
        const token = url.searchParams.get('token')
        if (token) {
          navigate(`/table/menu?token=${encodeURIComponent(token)}`)
          return
        }
      } catch { /* not a full URL */ }
      // If it's not a URL but a bare table token, use it directly
      if (!raw.includes('://') && /^[A-Za-z0-9-]+$/.test(raw)) {
        navigate(`/table/menu?token=${encodeURIComponent(raw)}`)
        return
      }
    }
    setError("We couldn't read that QR code. Please try again or use the Demo Table.")
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center px-4 py-16">
      {showScanner && (
        <DemoQRScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
          onUseDemoTable={() => { setShowScanner(false); handleTryDemoTable() }}
        />
      )}

      <div className="w-full max-w-md animate-neo-appear">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 shadow-lg shadow-amber-500/10 p-3 overflow-hidden">
            <img src={logo} alt="Chyaroma Logo" className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Try <span className="text-[#D4AF37]">Chyaroma</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
            Experience the customer ordering system without visiting a cafe.
          </p>
        </div>

        {/* Card Section with Side Back Button */}
        <div className="relative">
          {/* Back button: beside cards on desktop, stacked above on smaller screens */}
          <div className="mb-4 md:mb-0 md:absolute md:right-full md:mr-6 md:top-0 md:whitespace-nowrap">
            <button
              onClick={() => navigate('/')}
              className="group neo-btn-secondary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold text-[#9CA3AF] transition-all hover:text-amber-400 active:scale-95 cursor-pointer"
            >
              <svg className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to home page</span>
            </button>
          </div>

          {/* Demo entry card */}
          <div className="neo-card rounded-3xl border border-white/10 p-6 space-y-4">
            {/* Demo Mode badge */}
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                Demo Mode — No real order or payment will be made
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
                ⚠️ {error}
              </div>
            )}

            {/* Primary Action: Try Demo Table */}
            <button
              id="demo-try-table-btn"
              onClick={handleTryDemoTable}
              disabled={loading}
              className="neo-btn-primary w-full rounded-2xl py-4 text-sm font-extrabold tracking-wide transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Setting up demo…
                </>
              ) : (
                <>
                  🪑 Try Demo Table
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500 font-semibold">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Secondary Action: Scan QR */}
            <button
              id="demo-scan-qr-btn"
              onClick={() => { setError(''); setShowScanner(true) }}
              className="neo-btn-secondary w-full rounded-2xl py-3.5 text-sm font-bold text-gray-300 hover:text-white flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h4.5v4.5h-4.5v-4.5zM3.75 15.75h4.5v4.5h-4.5v-4.5zM15.75 3.75h4.5v4.5h-4.5v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6zM6 18h.008v.008H6V18zM18 6h.008v.008H18V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75h.008v.008h-.008v-.008zM15.75 19.5h4.5M19.5 15.75v4.5M15.75 15.75V12M12 15.75h-.008V12H12" />
              </svg>
              Scan QR Code
            </button>

            <p className="text-center text-[10px] text-gray-500 pt-1">
              Scanning a real Chyaroma QR will open the live table menu
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
