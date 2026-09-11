import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { login } from '../../services/authService'
import { useBranding } from '../../context/BrandingContext'
import logo from '../../logo.png'

const destinationByRole = { super_admin: '/admin', branch_manager: '/manager', kitchen_staff: '/kitchen', cashier: '/cashier' }

const FOODS = ['☕', '🍔', '🍕', '🥐', '🍰', '🍜', '🥗', '🍩', '🥤', '🍟', '🍣', '🧁']
const DRINKS = ['🧋', '🍵', '☕', '🍷', '🍹', '🍧', '🍦', '🥞', '🥐', '🧇', '🥨', '🍪']

function extractTokenFromUrl(text) {
  try {
    const url = new URL(text)
    const token = url.searchParams.get('token')
    if (token) return token
  } catch {
    // not a full URL — try raw token
  }
  return text.trim() || null
}

export default function LoginPage({ navigate, setSession }) {
  const branding = useBranding()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const scannerRef = useRef(null)
  const scannerDivId = 'customer-qr-scanner'

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const { user } = await login({ email, password })
      setSession(user)
      navigate(destinationByRole[user.role] || '/')
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Start the scanner only after the scanner div is mounted in the DOM.
  useEffect(() => {
    if (!scanning) return
    let cancelled = false
    const scanner = new Html5Qrcode(scannerDivId)
    scannerRef.current = scanner
    setScanError('')

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          const token = extractTokenFromUrl(decodedText)
          if (token) {
            stopScanner()
            sessionStorage.setItem('cc_table_token', token)
            navigate(`/table/menu?token=${encodeURIComponent(token)}`)
          } else {
            setScanError('No table token found in the scanned QR code.')
          }
        },
        () => { },
      )
      .catch(() => {
        if (cancelled) return
        setScanError('Unable to access the camera. Please allow camera permission or enter the token manually.')
        setScanning(false)
      })

    return () => {
      cancelled = true
      if (scannerRef.current) {
        try {
          scannerRef.current.stop()
          scannerRef.current.clear()
        } catch {
          // ignore cleanup errors
        }
        scannerRef.current = null
      }
    }
  }, [scanning, navigate])

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // ignore cleanup errors
      }
      scannerRef.current = null
    }
    setScanning(false)
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#090C15] p-4 sm:p-6 select-none">
      {/* Dynamic Animated Ambient Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Glow Orb 1 - Golden Amber */}
        <div className="animate-pulse-slow absolute -top-32 -left-32 h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-amber-600/20 to-yellow-500/10 blur-[120px]" />
        {/* Glow Orb 2 - Deep Indigo/Blue */}
        <div className="animate-pulse-slow absolute -bottom-40 -right-40 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-indigo-900/30 to-amber-950/20 blur-[140px]" style={{ animationDelay: '3.5s' }} />
        {/* Glow Orb 3 - Center subtle light */}
        <div className="absolute top-1/2 left-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/5 blur-[100px]" />

        {/* Subtle Radial Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* 3D Rotating Showcase Background */}
      <div className="carousel-3d" aria-hidden="true">
        <div className="carousel-3d__ring">
          {FOODS.map((emoji, i) => (
            <span
              key={i}
              className="carousel-3d__item"
              style={{ transform: `rotateY(${(360 / FOODS.length) * i}deg) translateZ(280px)` }}
            >
              {emoji}
            </span>
          ))}
        </div>
        <div className="carousel-3d__ring carousel-3d__ring--reverse">
          {DRINKS.map((emoji, i) => (
            <span
              key={`r${i}`}
              className="carousel-3d__item carousel-3d__item--faint"
              style={{ transform: `rotateY(${(360 / DRINKS.length) * i}deg) translateZ(180px)` }}
            >
              {emoji}
            </span>
          ))}
        </div>
        <div className="carousel-3d__ring carousel-3d__ring--outer">
          {FOODS.slice(0, 8).map((emoji, i) => (
            <span
              key={`o${i}`}
              className="carousel-3d__item carousel-3d__item--outer"
              style={{ transform: `rotateY(${(360 / 8) * i}deg) translateZ(360px)` }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>

      {/* Floating Micro Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-float-slow absolute top-1/4 left-1/5 text-amber-300/30 text-xl">✨</div>
        <div className="animate-float-slow absolute bottom-1/3 right-1/6 text-yellow-500/20 text-2xl" style={{ animationDelay: '2s' }}>☕</div>
        <div className="animate-float-slow absolute top-2/3 left-1/6 text-amber-400/20 text-lg" style={{ animationDelay: '4s' }}>✨</div>
        <div className="animate-float-slow absolute top-1/6 right-1/4 text-yellow-300/25 text-xl" style={{ animationDelay: '1.5s' }}>🍃</div>
      </div>

      {/* Top Floating Back Button */}
      <nav className="absolute top-5 left-5 z-20">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="group neo-btn-secondary flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] transition-all hover:text-amber-400 active:scale-95"
        >
          <svg
            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Home Page</span>
        </button>
      </nav>

      {/* Main Neumorphic Card Container */}
      <section className="animate-neo-appear relative z-10 w-full max-w-md rounded-3xl neo-card p-7 sm:p-9 border border-white/10 backdrop-blur-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 p-2 neo-inset border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <img src={branding?.logoUrl || logo} alt="Chyaroma Logo" className="h-10 w-10 object-contain" />
          </div>
          <span className="text-xs font-extrabold tracking-widest uppercase text-amber-400">
            {branding?.cafeName || 'Chyaroma'}
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Staff Portal</h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#9CA3AF]">
            Super Admin, Branch Manager, Cashier & Kitchen Staff login
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <div className="grid gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Email Address</label>
            <input
              className="neo-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#6B7280]"
              type="email"
              placeholder="name@chyaroma.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Password</label>
            <input
              className="neo-input w-full rounded-xl px-4 py-3 text-sm text-white placeholder-[#6B7280]"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-400" role="alert">
              ⚠️ {error}
            </div>
          )}

          <button
            className="group neo-btn-primary mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold tracking-wide transition-all disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            <span>{submitting ? 'Signing in…' : 'Sign In'}</span>
            <svg
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10"></div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">or</span>
          <div className="h-px flex-1 bg-white/10"></div>
        </div>

        {/* QR Scan Button */}
        <button
          type="button"
          onClick={() => setScanning(true)}
          disabled={scanning}
          className="group neo-btn-amber flex w-full items-center justify-center gap-3 rounded-xl p-3.5 transition-all disabled:opacity-60"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-[#F5A623] transition-transform duration-300 group-hover:scale-110">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h.01M12 12h.01M17 12h.01M7 16h.01M17 16h.01M12 16h.01M12 8h.01M7 8h.01M17 8h.01" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">Customer Table Menu</div>
            <div className="text-xs font-medium text-amber-200/80">{scanning ? 'Opening camera…' : 'Scan Table QR Code'}</div>
          </div>
        </button>

        {scanError && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400" role="alert">
            ⚠️ {scanError}
          </div>
        )}

        {scanning && (
          <div className="mt-4 animate-neo-appear">
            <div id={scannerDivId} className="overflow-hidden rounded-2xl border border-amber-500/30 neo-inset" />
            <button
              type="button"
              onClick={stopScanner}
              className="neo-btn-secondary mt-3 w-full rounded-xl py-2.5 text-xs font-semibold text-[#9CA3AF] transition-all"
            >
              Cancel Scan
            </button>
          </div>
        )}
      </section>
    </main>
  )
}